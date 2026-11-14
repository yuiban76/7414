import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { createRoomServer } from '../server/room-server.mjs';
import { RemoteRoomClient, ROOM_SESSION_KEY } from '../src/multiplayer/remote-room-client.js';
import { normalizeRoomServer, roomInvitation, invitationSettings, commandContext } from '../src/multiplayer/network-config.js';
import { roomSetupView, roomConnectionHeader } from '../src/ui/room-view.js';

const ORIGIN='http://localhost:4173';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};};
async function waitFor(predicate,message='condition',timeout=3000){const end=Date.now()+timeout;while(!predicate()){if(Date.now()>end)throw new Error('Timed out: '+message);await sleep(10);}}
async function fixture(t,options={}) {
  const service=createRoomServer({origins:[ORIGIN],sweepMs:20,heartbeatMs:10000,...options});
  const address=await service.listen(0,'127.0.0.1'),url=`ws://127.0.0.1:${address.port}/rooms`,clients=[];
  t.after(async()=>{for(const client of clients)await client.close();await service.close();});
  const client=(extra={})=>{const c=new RemoteRoomClient({url,storage:storage(),transportOptions:{socketFactory:value=>new WebSocket(value,{origin:ORIGIN}),retryBaseMs:10,connectTimeoutMs:300,requestTimeoutMs:1500,heartbeatMs:10000,...extra}});clients.push(c);return c;};
  return {service,url,client};
}
async function readyAndStart(host,guests){for(const c of [host,...guests])await c.command('ready',{ready:true});await host.command('start');}

test('real sockets synchronize four isolated clients, profiles, chat, voting and battle',async t=>{
  const {client,service}=await fixture(t),host=client();await host.create({worldName:'四人江湖',profile:{name:'房主'}});
  const guests=[];for(const name of ['一','二','三']){const c=client();await c.join(host.state.roomId,{name});guests.push(c);}
  assert.equal(Object.keys(host.state.players).length,4);assert.equal(host.isHost,true);assert.ok(guests.every(c=>!c.isHost));
  await assert.rejects(()=>host.command('start'),/必須準備/);
  await readyAndStart(host,guests);await waitFor(()=>guests.every(c=>c.state.status==='playing'));
  await guests[0].command('chat',{text:'<script>也是文字</script>'});await waitFor(()=>host.state.chat.length===1);
  assert.equal(host.state.chat[0].playerId,guests[0].playerId);
  await guests[1].command('split',{lineId:'escort'});assert.ok(guests[1].state.actionLines.escort.includes(guests[1].playerId));
  await guests[1].command('reunite');
  await host.command('vote-start',{choices:['injected'],flagKey:'injected'});
  assert.ok(!host.state.vote.choices.includes('injected'));const choice=host.state.vote.choices[0];
  for(const c of [host,...guests])await c.command('vote',{choiceId:choice});
  await host.command('vote-resolve');assert.equal(host.state.vote.result,choice);assert.equal(host.state.authoritativeState.flags.injected,undefined);
  await host.command('battle-open',{enemyHp:1,enemyName:'fake'});assert.equal(host.state.battle.maxEnemyHp,120);assert.notEqual(host.state.battle.enemyName,'fake');
  for(const c of [host,...guests])await c.command('battle-action',{action:'skill'});
  await host.command('battle-resolve');await waitFor(()=>guests.every(c=>c.state.battle?.status==='victory'));
  for(const c of guests)assert.deepEqual(c.state.battle,host.state.battle);
  assert.equal(service.rooms.get(host.state.roomId).controller.state.battle.enemyHp,0);
});

test('room errors, role spoofing, stale rounds, duplicate requests and invalid packets fail safely',async t=>{
  const {client,service}=await fixture(t),host=client(),guest=client();await host.create();
  await assert.rejects(()=>client().join('ZZZZZZ'),/找不到房間/);
  await guest.join(host.state.roomId);
  await assert.rejects(()=>guest.command('start'),/只有房主/);
  await assert.rejects(()=>guest.transport.request('command',{type:'start',playerId:host.playerId,payload:{}}),/只有房主/);
  await assert.rejects(()=>guest.transport.request('state',{payload:{status:'playing'}}),/不支援/);
  await assert.rejects(()=>guest.command('ready',{ready:'false'}),/準備狀態無效/);
  await readyAndStart(host,[guest]);
  await assert.rejects(()=>client().join(host.state.roomId),/已出發/);
  await assert.rejects(()=>guest.command('split',{lineId:'__proto__'}),/行動線無效/);
  await host.command('battle-open');
  await waitFor(()=>guest.state.battle?.status==='active');
  const packet={type:'battle-action',payload:{action:'skill'},context:commandContext(guest.state,'battle-action')};
  await guest.transport.request('command',packet,{id:'same_command'});
  const revision=guest.state.revision;
  const duplicate=await guest.transport.request('command',packet,{id:'same_command'});assert.equal(duplicate.duplicate,true);assert.equal(guest.state.revision,revision);
  await assert.rejects(()=>guest.command('battle-action',{action:'attack'}),/已提交/);
  await host.command('battle-action',{action:'attack'});await host.command('battle-resolve');
  await assert.rejects(()=>guest.transport.request('command',packet,{id:'late_command'}),/回合已更新/);
  const live=service.rooms.get(host.state.roomId).controller.state;
  assert.equal(live.battle.round,2);assert.equal(live.battle.enemyHp,70);
  assert.equal(Object.keys(live.players).length,2);
});

test('fifth player is rejected, explicit departure frees a slot, and host leave ends every client',async t=>{
  const {client,service}=await fixture(t),host=client();await host.create();const guests=[];
  for(let i=0;i<3;i++){const c=client();await c.join(host.state.roomId);guests.push(c);}
  await assert.rejects(()=>client().join(host.state.roomId),/房間已滿/);
  await guests[0].leave();await waitFor(()=>Object.keys(host.state.players).length===3);
  await client().join(host.state.roomId);const code=host.state.roomId;
  await host.leave();await waitFor(()=>guests[1].state.status==='closed');
  assert.equal(service.rooms.has(code),false);assert.equal(guests[1].storage.getItem(ROOM_SESSION_KEY),null);
});

test('network loss reconnects with identity and pending state, and forged tokens cannot steal a player',async t=>{
  const {client,service}=await fixture(t),host=client(),guest=client();await host.create();await guest.join(host.state.roomId);await readyAndStart(host,[guest]);
  const id=host.playerId,session=RemoteRoomClient.savedSession(host.storage);
  const forged={...session,token:'A'.repeat(43)};await assert.rejects(()=>client().resume(forged),/憑證無效/);
  service.rooms.get(host.state.roomId).peers.get(id).terminate();
  await waitFor(()=>host.connectionStatus==='reconnecting');
  await waitFor(()=>host.connectionStatus==='connected'&&host.state.status==='playing');
  assert.equal(host.playerId,id);assert.equal(Object.keys(host.state.players).length,2);
  await guest.command('chat',{text:'重連成功'});await waitFor(()=>host.state.chat.length===1);assert.equal(host.state.chat.at(-1).text,'重連成功');
});

test('refresh restores the original session and replaces the old socket without a reconnect loop',async t=>{
  const {client}=await fixture(t),host=client();await host.create();const session=RemoteRoomClient.savedSession(host.storage),copy=client();
  await copy.resume(session);assert.equal(copy.playerId,host.playerId);assert.equal(copy.isHost,true);
  await waitFor(()=>host.connectionStatus==='disconnected');assert.match(host.connectionMessage,/另一個分頁/);
  assert.equal(copy.connectionStatus,'connected');assert.equal(Object.keys(copy.state.players).length,1);
});

test('an acknowledgement lost after commit is replayed once after reconnect',async t=>{
  const {client,service}=await fixture(t),host=client(),guest=client();await host.create();await guest.join(host.state.roomId);
  const peer=service.rooms.get(host.state.roomId).peers.get(guest.playerId),send=peer.send.bind(peer);
  peer.send=(raw,...args)=>{const message=JSON.parse(raw);if(message.kind==='response'&&message.id==='lost_ack'){peer.terminate();return;}return send(raw,...args);};
  const result=await guest.transport.request('command',{type:'chat',payload:{text:'只送一次'},context:{}},{id:'lost_ack'});
  assert.equal(result.duplicate,true);assert.equal(guest.connectionStatus,'connected');
  assert.equal(service.rooms.get(host.state.roomId).controller.state.chat.length,1);
});

test('unreachable service stops reconnecting at the deadline instead of waiting forever',async t=>{
  const {client}=await fixture(t),host=client(),guest=client({reconnectWindowMs:80,connectTimeoutMs:30});await host.create();await guest.join(host.state.roomId);
  guest.transport.socketFactory=()=>new WebSocket('ws://127.0.0.1:1/rooms',{origin:ORIGIN});
  guest.transport.socket.terminate();await waitFor(()=>guest.connectionStatus==='disconnected');
  assert.match(guest.connectionMessage,/重連等待已結束/);
});

test('initial connection waits for a cold service before creating a room, and remains cancellable',async t=>{
  const {client}=await fixture(t);let attempts=0;
  const host=client({initialWindowMs:500,retryBaseMs:10,socketFactory:value=>new WebSocket(++attempts<=2?'ws://127.0.0.1:1/rooms':value,{origin:ORIGIN})});
  await host.create();assert.equal(attempts,3);assert.equal(host.state.status,'lobby');
  const cancelled=client({initialWindowMs:500,retryBaseMs:100,socketFactory:()=>new WebSocket('ws://127.0.0.1:1/rooms',{origin:ORIGIN})});
  const pending=assert.rejects(()=>cancelled.create(),/取消|離開/);
  await waitFor(()=>cancelled.connectionMessage.includes('正在重試'));await cancelled.close();await pending;
  assert.equal(cancelled.connectionStatus,'disconnected');
});

test('host disconnect pauses world commands and expiry closes the room',async t=>{
  let time=1000;const {client,service}=await fixture(t,{now:()=>time}),host=client(),guest=client();await host.create();await guest.join(host.state.roomId);await readyAndStart(host,[guest]);
  await host.close();await waitFor(()=>guest.state.status==='paused');
  await assert.rejects(()=>guest.command('split',{lineId:'escort'}),/房主斷線/);
  const code=guest.state.roomId;time+=60001;await waitFor(()=>guest.state.status==='closed');assert.equal(service.rooms.has(code),false);
});

test('disconnected guest cannot deadlock a battle after its reconnect deadline',async t=>{
  let time=1000;const {client}=await fixture(t,{now:()=>time}),host=client(),guest=client();await host.create();await guest.join(host.state.roomId);await readyAndStart(host,[guest]);await host.command('battle-open');
  await guest.close();await waitFor(()=>!host.state.players[guest.playerId].connected);
  await host.command('battle-action',{action:'skill'});await assert.rejects(()=>host.command('battle-resolve'),/等待斷線/);
  time+=60001;await host.command('battle-resolve');assert.equal(host.state.battle.round,2);assert.equal(host.state.battle.partyHp[guest.playerId],92);
});

test('disk snapshots contain hashed sessions and restore a running battle after service restart',async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zhaoye-rooms-'));
  const {client,service,url}=await fixture(t,{dataDirectory:directory}),host=client();await host.create();await readyAndStart(host,[]);await host.command('battle-open');await host.command('battle-action',{action:'skill'});
  const session=RemoteRoomClient.savedSession(host.storage),code=host.state.roomId;
  const raw=fs.readFileSync(path.join(directory,code+'.json'),'utf8');assert.ok(!raw.includes(session.token));
  await host.close();await waitFor(()=>service.rooms.get(code).controller.state.status==='paused');
  const restoredService=createRoomServer({origins:[ORIGIN],dataDirectory:directory});await restoredService.listen(0,'127.0.0.1');t.after(()=>restoredService.close());
  const restored=new RemoteRoomClient({url:`ws://127.0.0.1:${restoredService.server.address().port}/rooms`,storage:storage(),transportOptions:{socketFactory:value=>new WebSocket(value,{origin:ORIGIN})}});t.after(()=>restored.close());
  await restored.resume(session);assert.equal(restored.state.battle.round,1);assert.equal(restored.state.battle.submissions[restored.playerId],'skill');
  await restored.command('battle-resolve');assert.equal(restored.state.battle.enemyHp,90);assert.equal(restored.state.status,'playing');
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
});

test('origin restrictions, unauthenticated commands and old protocols are rejected',async t=>{
  const {url,service,client}=await fixture(t);
  const bad=new WebSocket(url,{origin:'https://evil.example'});await new Promise(resolve=>bad.once('error',resolve));assert.equal(service.rooms.size,0);
  const c=client();await c.transport.connect();await assert.rejects(()=>c.transport.request('command',{type:'start',payload:{}}),/請先/);
  const old=new WebSocket(url,{origin:ORIGIN});await new Promise(resolve=>old.once('open',resolve));t.after(()=>old.close());
  const response=new Promise(resolve=>old.once('message',raw=>resolve(JSON.parse(raw))));
  old.send(JSON.stringify({kind:'create',id:'old_protocol',protocolVersion:1}));assert.match((await response).error,/版本不同/);
  const invalid=new Promise(resolve=>old.once('message',raw=>resolve(JSON.parse(raw))));
  old.send('{"id":"pollution","protocolVersion":2,"kind":"create","profile":{"__proto__":{"polluted":true}}}');assert.match((await invalid).error,/不安全欄位/);assert.equal({}.polluted,undefined);
  assert.equal(service.rooms.size,0);
  const health=await fetch(url.replace('ws:','http:').replace('/rooms','/healthz'));assert.deepEqual(await health.json(),{ok:true,protocolVersion:2});
});

test('connection setup and invitations validate URLs, preserve names and never include reconnect tokens',()=>{
  assert.equal(normalizeRoomServer('https://rooms.example.com/'),'wss://rooms.example.com/rooms');
  assert.equal(normalizeRoomServer('http://localhost:8787'),'ws://localhost:8787/rooms');
  for(const url of ['javascript:alert(1)','http://public.example','https://name:password@example.com','wss://example.com/rooms?token=secret'])assert.throws(()=>normalizeRoomServer(url));
  const link=roomInvitation('https://yuiban76.github.io/7414/?old=1#x','https://rooms.example.com','ABC234');
  assert.deepEqual(invitationSettings(link),{code:'ABC234',server:'wss://rooms.example.com/rooms'});assert.ok(!link.includes('token'));
  const html=roomSetupView({draft:{mode:'online',server:'',name:'<script>',code:''},busy:true,error:'連線失敗',canResume:false});
  assert.match(html,/role="alert"/);assert.match(html,/disabled/);assert.ok(!html.includes('value="<script>"'));
});
