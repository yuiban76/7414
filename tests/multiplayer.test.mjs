import test from "node:test";
import assert from "node:assert/strict";
import { RoomController } from "../src/multiplayer/room-controller.js";

class MemoryHub {
  constructor(){this.rooms=new Map();}
  transport(){return new MemoryTransport(this);}
}

class MemoryTransport {
  constructor(hub){this.hub=hub;this.roomId=null;this.listener=null;}
  async connect(roomId,listener){this.roomId=roomId;this.listener=listener;const room=this.hub.rooms.get(roomId)??new Set();room.add(this);this.hub.rooms.set(roomId,room);}
  async send(message){for(const peer of this.hub.rooms.get(this.roomId)??[]){if(peer!==this)await peer.listener(structuredClone(message));}return message;}
  async close(){this.hub.rooms.get(this.roomId)?.delete(this);}
}

function controller(hub,playerId,isHost=false){return new RoomController({transport:hub.transport(),playerId,isHost,now:()=>1_000});}

test("host-authoritative lobby supports join, ready and start",async()=>{
  const hub=new MemoryHub();
  const host=controller(hub,"host",true);
  const room=await host.create({worldId:"world_1",worldName:"測試江湖",country:"dasheng"});
  const guest=controller(hub,"guest");
  await guest.join(room.roomId,{name:"訪客",characterId:"char_2"});
  assert.equal(Object.keys(host.state.players).length,2);
  assert.equal(guest.state.players.guest.name,"訪客");
  await assert.rejects(()=>host.command("start"),/必須準備/);
  await host.command("ready",{ready:true});
  await guest.command("ready",{ready:true});
  await host.command("start");
  assert.equal(host.state.status,"playing");
  assert.equal(guest.state.status,"playing");
});

test("chat, split lines and reunion remain authoritative",async()=>{
  const hub=new MemoryHub();const host=controller(hub,"host",true);const room=await host.create({worldId:"world_1"});
  const guest=controller(hub,"guest");await guest.join(room.roomId,{name:"訪客"});
  await host.command("ready",{ready:true});await guest.command("ready",{ready:true});await host.command("start");
  await guest.command("chat",{text:"  我查官府。  "});
  assert.equal(host.state.chat.at(-1).text,"我查官府。");
  await guest.command("split",{lineId:"magistrate"});
  assert.deepEqual(host.state.actionLines.magistrate,["guest"]);
  assert.ok(!host.state.actionLines.together.includes("guest"));
  await guest.command("reunite");
  assert.ok(host.state.actionLines.together.includes("guest"));
});

test("major vote resolves ties only through an explicit host choice",async()=>{
  const hub=new MemoryHub();const host=controller(hub,"host",true);const room=await host.create({worldId:"world_1"});
  const guest=controller(hub,"guest");await guest.join(room.roomId);
  await host.command("vote-start",{id:"ledger",choices:["court","publish"],flagKey:"ledger_choice"});
  await host.command("vote",{choiceId:"court"});await guest.command("vote",{choiceId:"publish"});
  await host.command("vote-resolve",{});
  assert.equal(host.state.vote.status,"open");
  await host.command("vote-resolve",{hostTieChoice:"publish"});
  assert.equal(host.state.authoritativeState.flags.ledger_choice,"publish");
  assert.equal(guest.state.vote.result,"publish");
});

test("disconnect creates a reconnect window and reconnect restores control",async()=>{
  const hub=new MemoryHub();const host=controller(hub,"host",true);const room=await host.create({worldId:"world_1"});
  const guest=controller(hub,"guest");await guest.join(room.roomId);
  await guest.command("disconnect");
  assert.equal(host.state.players.guest.connected,false);
  assert.equal(host.state.players.guest.reconnectDeadline,61_000);
  await guest.command("reconnect");
  assert.equal(host.state.players.guest.connected,true);
  assert.equal(guest.state.players.guest.reconnectDeadline,null);
});

test("room capacity never exceeds four players",async()=>{
  const hub=new MemoryHub();const host=controller(hub,"p1",true);const room=await host.create({worldId:"world_1"});
  for(const id of ["p2","p3","p4","p5"]){await controller(hub,id).join(room.roomId,{name:id});}
  assert.equal(Object.keys(host.state.players).length,4);
  assert.equal(host.state.players.p5,undefined);
});
test("host resolves one submitted action per living player",async()=>{const hub=new MemoryHub();const host=controller(hub,"host",true);const room=await host.create({worldId:"world_1"});const guest=controller(hub,"guest");await guest.join(room.roomId);await host.command("ready",{ready:true});await guest.command("ready",{ready:true});await host.command("start");await host.command("battle-open",{enemyName:"嚴震",enemyHp:70});await host.command("battle-action",{action:"skill"});await assert.rejects(()=>host.command("battle-resolve"),/尚未提交/);await guest.command("battle-action",{action:"attack"});await host.command("battle-resolve");assert.equal(host.state.battle.enemyHp,20);assert.equal(guest.state.battle.round,2);await host.command("battle-action",{action:"attack"});await guest.command("battle-action",{action:"attack"});await host.command("battle-resolve");assert.equal(host.state.battle.status,"victory");assert.equal(guest.state.battle.enemyHp,0);});
