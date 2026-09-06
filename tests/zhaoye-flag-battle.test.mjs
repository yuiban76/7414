import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { BattleSystem,makeEnemy,makeNpcCompanion } from "../src/systems/battle-system.js";
import { createFlagScenario } from "../src/systems/zhaoye-flag-battle.js";
import { packBattle,restoreBattle } from "../src/persistence/battle-snapshot.js";
import { SeededRng } from "../src/core/rng.js";
const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
const skills=read("skills"),enemies=read("enemies");
function setup(evidenceReady=false){
 const hero=makeNpcCompanion({id:"npc_001",name:"護橋者",role:"防禦"},skills);
 hero.hp=hero.maxHp=9999;hero.posture=hero.maxPosture=9999;hero.stats.agility=200;
 const enemy=makeEnemy(enemies[0],skills,1);enemy.hp=enemy.maxHp=9999;enemy.name="韓烈";
 const battle=new BattleSystem({party:[hero],enemies:[enemy],rng:new SeededRng("flag"),scenario:createFlagScenario(0,evidenceReady)});
 battle.onScenarioAction=()=>{};return battle;
}
test("flag battle has three readable phases and two non-free objective actions",()=>{
 const b=setup(true);let actions=0;b.onScenarioAction=()=>actions++;
 assert.equal(b.enemies[0].intent.charge,true);
 b.submit({type:"objective"});
 assert.equal(b.scenario.phase,2);assert.equal(b.scenario.winch,true);assert.equal(actions,1);
 b.submit({type:"objective"});
 assert.equal(b.scenario.phase,3);assert.equal(b.scenario.ordersRead,true);assert.equal(actions,2);
 assert.equal(b.finished,null);assert.ok(b.enemies[0].hp>0);
});
test("unverified flag orders do not falsely stop ordinary soldiers",()=>{
 const b=setup(false);b.submit({type:"objective"});b.submit({type:"objective"});
 assert.equal(b.scenario.evidenceReady,false);
 assert.ok(b.log.some(line=>line.includes("核驗仍不足")));
 assert.match(b.enemies[0].intent.label,/仍在護送戰/);
});
test("breaking or controlling the cavalry opens a winch window but does not skip it",()=>{
 const b=setup();const control=skills.find(s=>s.type==="control");
 b.party[0].skills=[control];b.party[0].inner=b.party[0].maxInner=999;
 b.submit({type:"skill",skillId:control.id,targetId:b.enemies[0].id});
 assert.equal(b.scenario.winch,true);assert.equal(b.scenario.phase,2);assert.equal(b.scenario.ordersRead,false);
 assert.equal(b.finished,null);
});
test("defeating Han Lie cannot erase the bridge objective",()=>{
 const b=setup();b.enemies[0].hp=1;b.submit({type:"attack",targetId:b.enemies[0].id});
 assert.equal(b.finished,null);assert.equal(b.enemies[0].hp,1);assert.equal(b.scenario.subdued,true);
 b.submit({type:"objective"});b.submit({type:"objective"});
 assert.equal(b.finished,null);assert.equal(b.scenario.ordersRead,true);
 b.submit({type:"attack",targetId:b.enemies[0].id});
 assert.equal(b.finished,"victory");assert.equal(b.enemies[0].hp,1);
});
test("flag phase, evidence readiness and interruption survive reload",()=>{
 const b=setup(true);b.submit({type:"objective"});
 const restored=restoreBattle(JSON.parse(JSON.stringify(packBattle(b,{eventId:"7-3"})))).battle;
 restored.onScenarioAction=()=>{};
 assert.deepEqual(restored.snapshot(),b.snapshot());
 restored.submit({type:"objective"});b.submit({type:"objective"});
 assert.deepEqual(restored.snapshot(),b.snapshot());
 const bad=packBattle(b,{});bad.scenario.phase=4;
 assert.throws(()=>restoreBattle(bad),/假旗階段/);
});
