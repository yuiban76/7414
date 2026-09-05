import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { BattleSystem,makeEnemy,makeNpcCompanion } from "../src/systems/battle-system.js";
import { createFinalScenario } from "../src/systems/zhaoye-final-battle.js";
import { packBattle,restoreBattle } from "../src/persistence/battle-snapshot.js";
import { SeededRng } from "../src/core/rng.js";
const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
const skills=read("skills"),enemies=read("enemies");
function setup(progress=0){
 const hero=makeNpcCompanion({id:"npc_001",name:"測試",role:"防禦"},skills);
 hero.hp=hero.maxHp=9999;hero.posture=hero.maxPosture=9999;hero.stats.agility=200;
 const enemy=makeEnemy(enemies[0],skills,1);enemy.hp=enemy.maxHp=9999;enemy.name="顧長纓";
 const b=new BattleSystem({party:[hero],enemies:[enemy],rng:new SeededRng("final"),scenario:createFinalScenario(progress)});
 b.onScenarioAction=()=>{};return b;
}
test("enemy executes the already displayed intent without rerolling",()=>{
 const b=setup();b.scenario=null;b.prepareIntents();
 const planned=structuredClone(b.enemies[0].intent);let actual;
 const resolve=b.resolve.bind(b);b.resolve=(actor,action)=>{if(actor.side==="enemy")actual=structuredClone(action);return resolve(actor,action);};
 b.chooseEnemyAction=()=>{throw new Error("must not redraw during execution");};
 b.endRound=()=>{};b.submit({type:"defend"});
 assert.deepEqual(actual,planned);
});
test("final guard reduces HP damage but a posture break removes it and announces sweep",()=>{
 const guarded=setup(),unguarded=setup();unguarded.scenario.phase=2;
 guarded.resolve(guarded.party[0],{type:"attack"});unguarded.resolve(unguarded.party[0],{type:"attack"});
 assert.ok(guarded.enemies[0].hp>unguarded.enemies[0].hp);
 guarded.enemies[0].posture=1;guarded.resolve(guarded.party[0],{type:"attack"});
 assert.equal(guarded.scenario.phase,2);assert.equal(guarded.scenario.brokenOnce,true);
 guarded.round++;guarded.prepareIntents();assert.equal(guarded.enemies[0].intent.sweep,true);
});
test("killing HP without opening the gate cannot finish the final encounter",()=>{
 const b=setup();b.enemies[0].hp=1;b.enemies[0].posture=1;
 b.resolve(b.party[0],{type:"attack"});
 assert.equal(b.enemies[0].hp,1);assert.equal(b.finished,null);
 b.submit({type:"objective"});b.submit({type:"objective"});
 assert.equal(b.scenario.mainLock,2);assert.equal(b.scenario.phase,3);
 b.resolve(b.party[0],{type:"attack"});assert.equal(b.finished,"victory");
});
test("defending without an incoming attack grants no exhaustion credit",()=>{
 const b=setup(2);b.enemies[0].intent={type:"defend",label:"休整"};
 b.submit({type:"defend"});assert.equal(b.scenario.successes,0);
 for(let i=0;i<3&&!b.finished;i++)b.submit({type:"defend"});
 assert.equal(b.scenario.successes,3);assert.equal(b.finished,"victory");
});
test("a defense that does not survive the hit cannot win",()=>{
 const b=setup(2);b.scenario.successes=2;b.party[0].hp=1;
 b.submit({type:"defend"});
 assert.equal(b.finished,"defeat");assert.equal(b.scenario.successes,2);
});
test("control interrupts the announced sweep and counts once per round after rescue",()=>{
 const b=setup(2);b.round=2;b.prepareIntents();assert.equal(b.enemies[0].intent.sweep,true);
 const control=skills.find(s=>s.type==="control");b.party[0].skills=[control];b.party[0].inner=b.party[0].maxInner=999;
 const before=b.party[0].hp;b.submit({type:"skill",skillId:control.id});
 assert.equal(b.party[0].hp,before);assert.equal(b.scenario.successes,1);
 assert.ok(b.log.some(line=>line.includes("已被打斷")));
});
test("final stage, gate, exhaustion and telegraph survive JSON save roundtrip",()=>{
 const b=setup();b.submit({type:"objective"});b.submit({type:"objective"});b.submit({type:"defend"});
 const restored=restoreBattle(JSON.parse(JSON.stringify(packBattle(b,{eventId:"8-4"})))).battle;
 assert.deepEqual(restored.snapshot(),b.snapshot());
 b.submit({type:"defend"});restored.submit({type:"defend"});
 assert.deepEqual(restored.snapshot(),b.snapshot());
 const bad=packBattle(b,{eventId:"8-4"});bad.scenario.successes=999;
 assert.throws(()=>restoreBattle(bad),/階段/);
});
