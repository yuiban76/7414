import test from "node:test";
import assert from "node:assert/strict";
import { createVote,castVote,resolveVote } from "../src/systems/vote-system.js";
import { RoomController } from "../src/multiplayer/room-controller.js";

const ballot=(players=["h","a","b","c"])=>createVote({id:"branch",choices:["x","y","z"],playerIds:players,hostPlayerId:"h"});
test("vote waits for every eligible player even if a majority already voted",()=>{
  const v=ballot();for(const id of ["h","a","b"])castVote(v,id,"x");
  assert.equal(resolveVote(v).status,"waiting");
  castVote(v,"c","y");assert.equal(resolveVote(v).result,"x");
  assert.equal(resolveVote(v,"y").result,"x");
  assert.throws(()=>castVote(v,"c","x"),/已結束/);
});
test("2-1-1 plurality is not majority and voters may change before resolution",()=>{
  const v=ballot();for(const [id,choice] of [["h","x"],["a","x"],["b","y"],["c","z"]])castVote(v,id,choice);
  assert.equal(resolveVote(v,"x").status,"no-majority");
  assert.equal(v.status,"open");
  castVote(v,"b","x");assert.equal(resolveVote(v).result,"x");
});
test("first tie clears ballots and second tie allows only tied host choice",()=>{
  const v=ballot(["h","a"]);castVote(v,"h","x");castVote(v,"a","y");
  assert.equal(resolveVote(v,"x").status,"revote");assert.deepEqual(v.choices,["x","y"]);
  assert.equal(v.history.length,1);assert.deepEqual(v.ballots,{});
  castVote(v,"h","x");castVote(v,"a","y");
  assert.equal(resolveVote(v,"z").status,"tie");
  assert.equal(resolveVote(v,"y").result,"y");
});
test("single player decides directly and malformed electorates are rejected",()=>{
  const v=ballot(["h"]);castVote(v,"h","z");assert.equal(resolveVote(v).result,"z");
  assert.throws(()=>ballot(["h","h"]),/名單/);
  assert.throws(()=>createVote({id:"x",choices:["a","a"],playerIds:["h"],hostPlayerId:"h"}),/不重複/);
});
async function room(){
  let time=1000;
  const host=new RoomController({transport:{connect:async()=>{},send:async()=>{}},playerId:"h",isHost:true,now:()=>time});
  await host.create({worldId:"world"});
  host.acceptJoin({playerId:"a",payload:{}});
  host.startVote("h",{id:"branch",choices:["x","y"],flagKey:"decision"});
  return {host,advance:()=>{time+=60001;}};
}
test("disconnected votes wait then are excluded rather than counted as consent",async()=>{
  const {host,advance}=await room();
  host.vote("h","x");host.vote("a","y");host.disconnect("a");
  assert.equal(host.resolveCurrentVote("h").status,"waiting-reconnect");
  assert.equal(host.state.authoritativeState.flags,undefined);
  advance();assert.equal(host.resolveCurrentVote("h").result,"x");
  assert.deepEqual(host.state.vote.eligiblePlayerIds,["h"]);
  assert.equal(host.state.vote.ballots.a,undefined);
});
test("reconnection within grace keeps the player's ballot and voting rights",async()=>{
  const {host}=await room();host.vote("h","x");host.vote("a","y");host.disconnect("a");
  assert.throws(()=>host.apply({type:"vote",playerId:"a",payload:{choiceId:"x"}}),/先重連/);
  host.acceptReconnect({playerId:"a"});
  assert.equal(host.resolveCurrentVote("h").status,"revote");
});
test("host disconnect pauses world mutations until host reconnects",async()=>{
  const {host}=await room();host.state.status="playing";host.disconnect("h");
  assert.throws(()=>host.apply({type:"vote",playerId:"a",payload:{choiceId:"x"}}),/暫停/);
  assert.throws(()=>host.apply({type:"battle-action",playerId:"a",payload:{action:"attack"}}),/暫停/);
  host.apply({type:"reconnect",playerId:"h",payload:{}});
  assert.equal(host.state.status,"playing");
  host.apply({type:"vote",playerId:"a",payload:{choiceId:"x"}});
  assert.equal(host.state.vote.ballots.a,"x");
});
