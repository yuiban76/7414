import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import { PeerRoomClient, PEER_SESSION_KEY } from '../src/multiplayer/peer-room-client.js';
import { commandContext,roomInvitation,invitationSettings } from '../src/multiplayer/network-config.js';
import { RoomJournal } from '../src/ai/room-story.js';
import { roomJournalView } from '../src/ui/room-view.js';

const catalog=Object.fromEntries(['chapters','enemies'].map(name=>[name,JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8')).data]));
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};};
async function waitFor(predicate,timeout=1500){const end=Date.now()+timeout;while(!predicate()){if(Date.now()>end)throw new Error('P2P state timed out');await sleep(5);}}
class Link extends EventEmitter {
  constructor(peer){super();this.peer=peer;this.open=false;this.bufferSize=0;}
  send(packet){if(!this.open)throw new Error('closed');queueMicrotask(()=>{if(this.other.open)this.other.emit('data',structuredClone(packet));});}
  close(){if(!this.open)return;this.open=false;this.other.open=false;queueMicrotask(()=>{this.emit('close');this.other.emit('close');});}
}
function fixture(t){
  const peers=new Map(),clients=[];
  class FakePeer extends EventEmitter {
    constructor(id){super();this.id=id??crypto.randomUUID();this.destroyed=false;this.links=new Set();
      queueMicrotask(()=>{if(this.destroyed)return;if(peers.has(this.id))this.emit('error',{type:'unavailable-id'});else{peers.set(this.id,this);this.emit('open',this.id);}});
    }
    connect(id){const link=new Link(id);this.links.add(link);queueMicrotask(()=>{
      const target=peers.get(id);if(!target){this.emit('error',{type:'peer-unavailable'});return;}
      const remote=new Link(this.id);link.other=remote;remote.other=link;target.links.add(remote);target.emit('connection',remote);link.open=remote.open=true;link.emit('open');remote.emit('open');
    });return link;}
    reconnect(){this.disconnected=false;queueMicrotask(()=>this.emit('open',this.id));}
    destroy(){if(this.destroyed)return;this.destroyed=true;if(peers.get(this.id)===this)peers.delete(this.id);for(const link of this.links)link.close();this.emit('close');}
  }
  const client=(extra={})=>{const c=new PeerRoomClient({Peer:FakePeer,catalog,storage:storage(),timeoutMs:300,retryBaseMs:10,heartbeatMs:10000,...extra});clients.push(c);return c;};
  t.after(async()=>{for(const c of clients)await c.close();});return {client,peers};
}
async function start(host,guests=[]){for(const c of [host,...guests])await c.command('ready',{ready:true});await host.command('start');await waitFor(()=>guests.every(g=>g.state.status==='playing'));}

test('PeerJS protocol supports four players, host authority, chat, voting and shared victory',async t=>{
  const {client}=fixture(t),host=client();await host.create({profile:{name:'房主'}});const guests=[];
  for(const name of ['甲','乙','丙']){const g=client();await g.join(host.code,{name});guests.push(g);}
  assert.equal(Object.keys(host.state.players).length,4);await start(host,guests);
  await guests[0].command('chat',{text:'WebRTC 測試'});assert.equal(host.state.chat.at(-1).playerId,guests[0].playerId);
  await assert.rejects(()=>guests[0].command('battle-open'),/只有房主/);
  await host.command('vote-start');await waitFor(()=>guests.every(g=>g.state.vote));const choice=host.state.vote.choices[0];
  for(const g of [host,...guests])await g.command('vote',{choiceId:choice});await host.command('vote-resolve');assert.equal(host.state.vote.result,choice);
  await host.command('battle-open',{enemyHp:1});await waitFor(()=>guests.every(g=>g.state.battle));assert.equal(host.state.battle.maxEnemyHp,120);
  for(const g of [host,...guests])await g.command('battle-action',{action:'skill'});await host.command('battle-resolve');
  await waitFor(()=>guests.every(g=>g.state.battle.status==='victory'));for(const g of guests)assert.deepEqual(g.state.battle,host.state.battle);
});
test('P2P rejects unknown rooms, capacity overflow, forged identities and stale commands',async t=>{
  const {client}=fixture(t),host=client();await host.create();await assert.rejects(()=>client().join('ZZZZZZ'),/找不到房間/);
  const guests=[];for(let i=0;i<3;i++){const g=client();await g.join(host.code);guests.push(g);}
  await assert.rejects(()=>client().join(host.code),/房間已滿/);const g=guests[0];
  await assert.rejects(()=>g.request('command',{type:'start',playerId:host.playerId,payload:{}}),/只有房主/);
  await assert.rejects(()=>g.request('state',{room:{status:'playing'}}),/不支援/);
  await start(host,guests);await host.command('battle-open');await waitFor(()=>g.state.battle);
  const values={type:'battle-action',payload:{action:'skill'},context:commandContext(g.state,'battle-action')};
  await g.request('command',values,'duplicate');const revision=host.state.revision;assert.equal((await g.request('command',values,'duplicate')).duplicate,true);assert.equal(host.state.revision,revision);
  await assert.rejects(()=>g.command('battle-action',{action:'attack'}),/已提交/);
  await host.command('battle-action',{action:'attack'});for(const other of guests.slice(1))await other.command('battle-action',{action:'defend'});await host.command('battle-resolve');
  await assert.rejects(()=>g.request('command',values,'late'),/回合已更新/);
});
test('guest reconnect keeps identity while an invalid session cannot take over a player',async t=>{
  const {client}=fixture(t),host=client(),guest=client();await host.create();await guest.join(host.code);const id=guest.playerId,saved=PeerRoomClient.savedSession(guest.storage);
  assert.ok(!host.storage.getItem(PEER_SESSION_KEY).includes(guest.token));
  const fake=client();await assert.rejects(()=>fake.resume({...saved,token:'a'.repeat(64)}),/憑證無效/);
  guest.connection.close();await waitFor(()=>guest.connectionStatus==='reconnecting');await waitFor(()=>guest.connectionStatus==='connected');assert.equal(guest.playerId,id);
  assert.equal(Object.keys(host.state.players).length,2);await guest.command('chat',{text:'回來了'});assert.equal(host.state.chat.length,1);
});
test('host refresh restores snapshot and guests reconnect into the same battle',async t=>{
  const {client}=fixture(t),host=client(),guest=client();await host.create();await guest.join(host.code);await start(host,[guest]);await host.command('battle-open');
  await waitFor(()=>guest.state.battle);await guest.command('battle-action',{action:'skill'});const saved=PeerRoomClient.savedSession(host.storage);host.suspend();
  const replacement=client();await replacement.resume(saved);await waitFor(()=>guest.connectionStatus==='connected'&&replacement.state.players[guest.playerId].connected);
  assert.equal(replacement.playerId,host.playerId);assert.equal(replacement.state.battle.submissions[guest.playerId],'skill');
  await replacement.command('battle-action',{action:'skill'});await replacement.command('battle-resolve');assert.equal(replacement.state.battle.enemyHp,60);
});
test('ack loss replays committed P2P commands only once',async t=>{
  const {client}=fixture(t),host=client(),guest=client();await host.create();await guest.join(host.code);
  const channel=host.channels.get(guest.playerId),send=channel.send.bind(channel);
  channel.send=packet=>{if(packet.kind==='response'&&packet.id==='lost'){channel.close();return;}return send(packet);};
  const result=await guest.request('command',{type:'chat',payload:{text:'一次就好'},context:{}},'lost');
  assert.equal(result.duplicate,true);assert.equal(host.state.chat.length,1);
});
test('guest departure frees a slot and host closure reaches all remaining peers',async t=>{
  const {client}=fixture(t),host=client(),a=client(),b=client();await host.create();await a.join(host.code);await b.join(host.code);await a.leave();
  assert.equal(host.state.players[a.playerId],undefined);await host.leave();await waitFor(()=>b.state.status==='closed');assert.equal(b.storage.getItem(PEER_SESSION_KEY),null);
});
test('peer invitations contain only mode and room code, with no session token or paid server',()=>{
  const link=roomInvitation('https://yuiban76.github.io/7414/',null,'ABC234','peer');
  assert.deepEqual(invitationSettings(link),{code:'ABC234',mode:'peer'});assert.ok(!link.includes('token'));assert.ok(!link.includes('server'));
});

test('one shared journal records text, votes and original battle rounds without waiting for AI',async t=>{
  const {client}=fixture(t), archiveStorage=storage(), calls=[];
  let finishFirst;
  const firstReply=new Promise(resolve=>{finishFirst=resolve;});
  const host=client({journalStorage:archiveStorage,generateStory:async context=>{
    calls.push(context);
    if(calls.length===1)await firstReply;
    const sourceIds=context.events.map(event=>event.id);
    return JSON.stringify({story:'掌櫃放下水壺，請大家先坐。',notes:[{category:'待辦',text:'再問掌櫃一件事',sourceIds},{category:'線索',text:'沒有來源',sourceIds:[999]}]});
  }}), guest=client();
  await host.create({profile:{name:'房主'}});await guest.join(host.code,{name:'訪客'});await start(host,[guest]);
  await assert.rejects(()=>guest.command('story-action',{action:'找掌櫃'}),/尚未開啟/);
  assert.throws(()=>guest.enableStory(true),/只有在線房主/);
  host.enableStory(true);
  await guest.command('chat',{text:'private-team-chat'});
  await guest.request('command',{type:'story-action',payload:{action:'我問掌櫃昨晚有誰來過。'}},'story-duplicate');
  const duplicate=await guest.request('command',{type:'story-action',payload:{action:'替我重複'}},'story-duplicate');
  assert.equal(duplicate.duplicate,true);
  await waitFor(()=>guest.state.journal.writing);
  await host.command('battle-open');await waitFor(()=>guest.state.battle);
  await assert.rejects(()=>guest.command('story-action',{action:'用文字戰鬥'}),/戰鬥以外/);
  for(let i=0;i<2;i++){
    await guest.command('battle-action',{action:'skill'});await host.command('battle-action',{action:'skill'});
    await host.command('battle-resolve');await waitFor(()=>guest.state.battle.presentationSequence===i+1);
  }
  assert.equal(host.state.battle.status,'victory');
  await host.command('vote-start');await waitFor(()=>guest.state.vote);
  const choiceId=host.state.vote.choices[0];
  await guest.command('vote',{choiceId});await host.command('vote',{choiceId});await host.command('vote-resolve');
  assert.equal(host.state.vote.result,choiceId);
  assert.equal(calls.length,1,'model jobs should serialize and gameplay should continue');
  finishFirst();await waitFor(()=>!guest.state.journal.pending);
  const archive=await guest.exportJournal();
  assert.deepEqual(archive.entries,(await host.exportJournal()).entries);
  assert.equal(archive.entries.filter(event=>event.kind==='action').length,1);
  assert.equal(archive.entries.filter(event=>event.kind==='battle-action').length,4);
  assert.equal(archive.entries.filter(event=>event.kind==='battle-round').length,2);
  assert.equal(archive.entries.filter(event=>event.kind==='vote-result').length,1);
  assert.equal(calls.length,4);
  assert.equal(calls[1].events.filter(event=>event.kind==='battle-action').length,2);
  assert.doesNotMatch(JSON.stringify([calls,archive]),/private-team-chat|沒有來源|用文字戰鬥|替我重複/);
  const html=roomJournalView({client:guest});
  assert.match(html,/掌櫃放下水壺/);
  assert.match(html,/data-journal-source="\d+"/);
  assert.doesNotMatch(html,/data-action="room-story-toggle"/);
  assert.deepEqual(RoomJournal.latest(archiveStorage).entries,archive.entries);
});

test('a model failure preserves inputs, survives host reload and retries in source order',async t=>{
  const {client}=fixture(t), archiveStorage=storage();
  const host=client({journalStorage:archiveStorage,generateStory:async()=>{throw Error('private-key-like-error');}}),guest=client();
  await host.create();await guest.join(host.code);await start(host,[guest]);host.enableStory(true);
  await guest.command('story-action',{action:'先等天亮'});await waitFor(()=>guest.state.journal.failed);
  assert.doesNotMatch(JSON.stringify(guest.state),/private-key-like-error/);
  await host.command('story-action',{action:'整理包裹'});
  const saved=PeerRoomClient.savedSession(host.storage);host.suspend();
  const generated=[];
  const replacement=client({journalStorage:archiveStorage,generateStory:async context=>{generated.push(context.events.at(-1).text);return '{"story":"天色亮了。","notes":[]}';}});
  await replacement.resume(saved);
  await waitFor(()=>guest.connectionStatus==='connected'&&guest.state.journal.failed);
  replacement.retryStory();await waitFor(()=>!guest.state.journal.pending);
  assert.deepEqual(generated,['先等天亮','整理包裹']);
  assert.equal((await guest.exportJournal()).entries.filter(entry=>entry.kind==='narration').length,2);
});
