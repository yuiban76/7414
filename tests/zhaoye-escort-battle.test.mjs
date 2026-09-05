import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { BattleSystem,makeEnemy,makeNpcCompanion } from "../src/systems/battle-system.js";
import { createStoryScenario } from "../src/systems/zhaoye-escort-battle.js";
import { packBattle,restoreBattle } from "../src/persistence/battle-snapshot.js";
import { SeededRng } from "../src/core/rng.js";
import { GameEngine,createWorld } from "../src/core/game-engine.js";
import { createZhaoyeState } from "../src/core/zhaoye-engine.js";
import { storyBattleModifiers } from "../src/core/zhaoye-callbacks.js";
const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
const skills=read("skills"),enemies=read("enemies");
function setup(){
 const hero=makeNpcCompanion({id:"npc_001",name:"護送者",role:"防禦"},skills);
 hero.hp=hero.maxHp=9999;hero.posture=hero.maxPosture=9999;hero.stats.agility=200;
 const enemy=makeEnemy(enemies[0],skills,1);enemy.hp=enemy.maxHp=9999;
 const b=new BattleSystem({party:[hero],enemies:[enemy],rng:new SeededRng("escort"),scenario:createStoryScenario("6-4")});
 b.onScenarioAction=()=>{};return b;
}
test("escort requires the barricade passage then three streets without killing enemies",()=>{
 const b=setup();let operations=0;b.onScenarioAction=()=>operations++;
 b.submit({type:"objective"});assert.equal(b.scenario.phase,2);assert.equal(b.scenario.coverRemoved,true);
 assert.equal(b.scenario.streets,0);
 b.submit({type:"objective"});b.submit({type:"objective"});assert.equal(b.finished,null);
 b.submit({type:"objective"});assert.equal(b.finished,"victory");assert.equal(operations,4);
 assert.ok(b.enemies[0].hp>0);b.submit({type:"objective"});assert.equal(operations,4);
});
test("defeating escort boss does not bypass three street segments or create new enemies",()=>{
 const b=setup();b.enemies[0].hp=1;b.submit({type:"attack"});
 assert.equal(b.finished,null);assert.equal(b.scenario.subdued,true);assert.equal(b.scenario.streets,0);
 for(let i=0;i<5;i++)b.submit({type:"attack"});
 assert.equal(b.finished,null);assert.equal(b.enemies.length,1);
 for(let i=0;i<4;i++)b.submit({type:"objective"});
 assert.equal(b.finished,"victory");
});
test("control breaks the barricade pressure and interrupts a telegraphed volley",()=>{
 const b=setup(),control=skills.find(s=>s.type==="control");
 b.party[0].skills=[control];b.party[0].inner=b.party[0].maxInner=999;
 assert.equal(b.enemies[0].intent.volley,true);
 const hp=b.party[0].hp;b.submit({type:"skill",skillId:control.id});
 assert.equal(b.party[0].hp,hp);assert.equal(b.scenario.coverRemoved,true);
 assert.equal(b.scenario.streets,0);
});
test("a defeated actor cannot move the escort by submitting an objective",()=>{
 const b=setup();b.party[0].hp=1;b.party[0].stats.agility=0;
 let operations=0;b.onScenarioAction=()=>operations++;
 b.submit({type:"objective"});
 assert.equal(b.finished,"defeat");assert.equal(operations,0);assert.equal(b.scenario.streets,0);
});
test("escort progress and pending volley roundtrip without resetting",()=>{
 const b=setup();b.submit({type:"objective"});
 const restored=restoreBattle(JSON.parse(JSON.stringify(packBattle(b,{eventId:"6-4"})))).battle;
 restored.onScenarioAction=()=>{};
 assert.deepEqual(restored.snapshot(),b.snapshot());
 b.submit({type:"objective"});restored.submit({type:"objective"});
 assert.deepEqual(restored.snapshot(),b.snapshot());
 const bad=packBattle(b,{});bad.scenario.streets=4;
 assert.throws(()=>restoreBattle(bad),/護送階段/);
});
test("failed primary escort requires three saved backup handoffs before advancing",()=>{
 let world=createWorld({name:"護送",startingCountry:"dasheng",ownerCharacterId:"hero",seed:"escort"});
 world.zhaoye=createZhaoyeState();world.chapter=6;world.currentSceneId="6-4";
 world.zhaoye.evidence.E1="verified";
 const character={id:"hero",moneyWen:0};
 let engine=new GameEngine({world,character,content:{}});
 engine.finishBattle(engine.choose("A"),"defeat");engine.choose("continue");
 assert.equal(world.currentSceneId,"6-4");
 assert.equal(world.zhaoye.escortOutcome.backup,"pending");
 for(let i=0;i<3;i++){
  engine.choose("supplement:0");
  world=JSON.parse(JSON.stringify(world));engine=new GameEngine({world,character,content:{}});
  if(i<2)assert.equal(world.currentSceneId,"6-4");
 }
 assert.equal(world.currentSceneId,"6-5");assert.equal(world.zhaoye.escortOutcome.backup,"delivered");
 assert.equal(world.zhaoye.evidence.E1,"verified");
 world.currentSceneId="7-3";assert.equal(storyBattleModifiers(world).incoming,1.05);
});
