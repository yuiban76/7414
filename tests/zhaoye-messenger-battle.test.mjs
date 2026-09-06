import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { BattleSystem,makeEnemy,makeNpcCompanion } from "../src/systems/battle-system.js";
import { createMessengerScenario } from "../src/systems/zhaoye-messenger-battle.js";
import { packBattle,restoreBattle } from "../src/persistence/battle-snapshot.js";
import { SeededRng } from "../src/core/rng.js";
const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
const skills=read("skills"),enemies=read("enemies");
function setup(){
 const hero=makeNpcCompanion({id:"npc_001",name:"護送者",role:"防禦"},skills);
 hero.hp=hero.maxHp=9999;hero.posture=hero.maxPosture=9999;hero.stats.agility=200;
 const enemy=makeEnemy(enemies[0],skills,1);enemy.hp=enemy.maxHp=9999;enemy.name="魏沉沙";
 const battle=new BattleSystem({party:[hero],enemies:[enemy],rng:new SeededRng("messenger"),scenario:createMessengerScenario()});
 battle.onScenarioAction=()=>{};return battle;
}
test("protecting the messenger consumes a real action and allows nonfatal restraint",()=>{
 const b=setup();let actions=0;b.onScenarioAction=()=>actions++;
 b.submit({type:"objective"});
 assert.equal(actions,1);assert.equal(b.scenario.messengerSafe,true);assert.equal(b.scenario.phase,2);
 b.enemies[0].hp=1;b.submit({type:"attack",targetId:b.enemies[0].id});
 assert.equal(b.finished,"victory");assert.equal(b.enemies[0].hp,1);assert.equal(b.scenario.subdued,true);
 assert.ok(b.log.some(line=>line.includes("信使由見證人護送")));
});
test("an unprotected messenger can die while the sealed packet remains in the scene",()=>{
 const b=setup();
 b.round=1;b.prepareIntents();assert.equal(b.enemies[0].intent.killShot,false);
 b.submit({type:"attack",targetId:b.enemies[0].id});
 assert.equal(b.scenario.messengerDead,false);
 b.submit({type:"attack",targetId:b.enemies[0].id});
 assert.equal(b.scenario.messengerDead,true);
 assert.ok(b.log.some(line=>line.includes("封袋仍在")));
 b.enemies[0].hp=1;b.submit({type:"attack",targetId:b.enemies[0].id});
 assert.equal(b.finished,"victory");assert.equal(b.scenario.messengerSafe,false);
});
test("control interrupts the announced shot before it kills the messenger",()=>{
 const b=setup();b.scenario.phase=2;b.round=2;b.prepareIntents();assert.equal(b.enemies[0].intent.killShot,true);
 const control=skills.find(s=>s.type==="control");b.party[0].skills=[control];b.party[0].inner=b.party[0].maxInner=999;
 b.submit({type:"skill",skillId:control.id,targetId:b.enemies[0].id});
 assert.equal(b.scenario.messengerDead,false);assert.ok(b.log.some(line=>line.includes("被打斷")));
});
test("messenger phase and sealed-packet outcome survive reload",()=>{
 const b=setup();b.submit({type:"objective"});b.enemies[0].hp=1;b.submit({type:"attack"});
 const restored=restoreBattle(JSON.parse(JSON.stringify(packBattle(b,{eventId:"8-3"})))).battle;
 restored.onScenarioAction=()=>{};
 assert.deepEqual(restored.snapshot(),b.snapshot());
 const bad=packBattle(b,{});bad.scenario.limit=4;
 assert.throws(()=>restoreBattle(bad),/信使階段/);
});
