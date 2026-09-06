import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { BattleSystem, makeEnemy, makeNpcCompanion } from "../src/systems/battle-system.js";
import { createScrollScenario, scrollDamageReduction, scrollHit } from "../src/systems/zhaoye-scroll-battle.js";
import { packBattle, restoreBattle } from "../src/persistence/battle-snapshot.js";
import { SeededRng } from "../src/core/rng.js";
import { createWorld } from "../src/core/game-engine.js";
import { createZhaoyeState, ZhaoyeEngine } from "../src/core/zhaoye-engine.js";

const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
const skills=read("skills"), enemies=read("enemies");

function setup(){
 const hero=makeNpcCompanion({id:"npc_001",name:"護卷者",role:"防禦／控制"},skills);
 hero.hp=hero.maxHp=9999;hero.posture=hero.maxPosture=9999;hero.inner=hero.maxInner=9999;hero.stats.agility=200;
 const enemy=makeEnemy(enemies[0],skills,1);enemy.hp=enemy.maxHp=9999;enemy.name="程岳";
 const battle=new BattleSystem({party:[hero],enemies:[enemy],rng:new SeededRng("scroll"),scenario:createScrollScenario()});
 battle.onScenarioAction=()=>{};
 return battle;
}

test("scroll encounter requires both exits before nonfatal restraint",()=>{
 const b=setup();
 b.submit({type:"objective"});
 assert.equal(b.scenario.scrollSafe,true);assert.equal(b.scenario.phase,2);assert.equal(b.finished,null);
 b.submit({type:"objective"});
 assert.equal(b.scenario.witnessPath,true);
 b.enemies[0].hp=1;b.submit({type:"attack",targetId:b.enemies[0].id});
 assert.equal(b.finished,"victory");assert.equal(b.enemies[0].hp,1);assert.equal(b.scenario.subdued,true);
 assert.ok(b.log.some(line=>line.includes("卷宗出口與證人通道")));
});

test("unsecured fire can burn the secondary scroll evidence",()=>{
 const b=setup();
 b.submit({type:"defend"});
 b.submit({type:"defend"});
 assert.equal(b.scenario.scrollLost,true);
 assert.equal(b.scenario.scrollSafe,false);
 assert.ok(b.log.some(line=>line.includes("部分帳目被焚")));
});

test("posture break or control interrupts the scroll fire attack",()=>{
 const b=setup();
 const control=skills.find(s=>s.type==="control");
 assert.ok(control);
 b.party[0].skills=[control];b.party[0].inner=b.party[0].maxInner=9999;
 b.submit({type:"skill",skillId:control.id,targetId:b.enemies[0].id});
 assert.equal(b.scenario.interruptedRound,1);
 assert.ok(b.log.some(line=>line.includes("反擊／火盆掩護被打斷")));
});

test("breaking the heavy armor removes its phase-one damage reduction",()=>{
 const b=setup();
 assert.equal(scrollDamageReduction(b,b.enemies[0]),.25);
 scrollHit(b,b.party[0],b.enemies[0],null,true);
 assert.equal(b.scenario.armorBroken,true);assert.equal(b.scenario.phase,2);
 assert.equal(scrollDamageReduction(b,b.enemies[0]),0);
});

test("scroll phase and fire loss survive reload validation",()=>{
 const b=setup();b.submit({type:"objective"});
 const saved=packBattle(b,{eventId:"5-4"});
 const restored=restoreBattle(JSON.parse(JSON.stringify(saved))).battle;
 assert.deepEqual(restored.snapshot(),b.snapshot());
 const bad=packBattle(b,{});bad.scenario.fireLevel=1.5;
 assert.throws(()=>restoreBattle(bad),/焚卷階段/);
});

test("fire loss is carried into the persistent chapter aftermath",()=>{
 const world=createWorld({name:"測試",startingCountry:"dasheng",ownerCharacterId:"hero",seed:"scroll-handoff"});
 world.zhaoye=createZhaoyeState();world.chapter=5;world.currentSceneId="5-4";
 const engine=new ZhaoyeEngine({world,character:{id:"hero"}});
 engine.battleAction("objective",1);
 engine.finishBattle({eventId:"5-4",next:"5-4",battle:"zhaoye_5-4"},"victory",{id:"5-4",scrollLost:true});
 assert.equal(world.zhaoye.scrollSecondaryLost,true);
 assert.match(world.zhaoye.aftermath.text,/副卷被焚毀/);
 const failedWorld=createWorld({name:"測試",startingCountry:"dasheng",ownerCharacterId:"hero",seed:"scroll-defeat"});
 failedWorld.zhaoye=createZhaoyeState();failedWorld.chapter=5;failedWorld.currentSceneId="5-4";
 const failedEngine=new ZhaoyeEngine({world:failedWorld,character:{id:"hero"}});
 failedEngine.finishBattle({eventId:"5-4",next:"5-4",battle:"zhaoye_5-4"},"defeat",{id:"5-4",scrollLost:false});
 assert.equal(failedWorld.zhaoye.scrollSecondaryLost,true);
});
