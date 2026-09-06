import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { BattleSystem,makeEnemy,makeNpcCompanion,makePlayerCombatant } from "../src/systems/battle-system.js";
import { SeededRng } from "../src/core/rng.js";
const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
const skills=read("skills"),enemies=read("enemies");
function enemy(){
 const foe=makeEnemy(enemies[0],skills,1);
 foe.skills=[];foe.stats.agility=1;foe.damageMultiplier=1;
 return foe;
}
test("a medicine action is charged only when the hero actually gets a turn",()=>{
 const hero=makeNpcCompanion({id:"hero",name:"先手測試",role:"防禦"},skills);
 hero.stats.agility=200;hero.hp=20;
 const foe=enemy();foe.stats.agility=1;
 const battle=new BattleSystem({party:[hero],enemies:[foe],rng:new SeededRng("item-action")});
 battle.submit({type:"item"});
 const result=battle.lastActionResults.find(entry=>entry.actorId==="hero");
 assert.equal(result.executed,true);
 assert.equal(hero.consumablesUsed,1);
 assert.ok(hero.hp>20);
});
test("a slower hero cannot consume a medicine after being killed before the action",()=>{
 const hero=makeNpcCompanion({id:"hero",name:"後手測試",role:"防禦"},skills);
 hero.stats.agility=1;hero.hp=1;
 const foe=enemy();foe.stats.agility=200;foe.stats.strength=100;foe.damageMultiplier=5;
 const battle=new BattleSystem({party:[hero],enemies:[foe],rng:new SeededRng("skipped-item")});
 battle.submit({type:"item"});
 assert.equal(battle.finished,"defeat");
 assert.equal(battle.lastActionResults.some(entry=>entry.actorId==="hero"),false);
 assert.equal(hero.consumablesUsed,0);
 assert.equal(hero.hp,0);
});
test("skill proficiency is awarded only for an actually executed skill",()=>{
 const skill=skills.find(entry=>entry.innerCost>0);
 const character={id:"hero",name:"武功測試",stats:{strength:25,constitution:25,agility:200,comprehension:20,willpower:15},equippedSkills:[skill.id],skills:{[skill.id]:{realm:0,completeness:1}},maxHp:225,maxPosture:100,maxInner:50};
 const hero=makePlayerCombatant(character,skills);hero.inner=0;
 const foe=enemy();
 const battle=new BattleSystem({party:[hero],enemies:[foe],rng:new SeededRng("skill-fallback")});
 battle.submit({type:"skill",skillId:skill.id,targetId:foe.id});
 const result=battle.lastActionResults.find(entry=>entry.actorId==="hero");
 assert.equal(result.executed,true);
 assert.equal(result.usedSkill,false);
 assert.match(battle.log.join(" "),/內力不足，改以普通攻擊/);
});
test("successful skill action exposes a single proficiency-worthy result",()=>{
 const skill=skills.find(entry=>entry.innerCost>0);
 const character={id:"hero",name:"武功測試",stats:{strength:25,constitution:25,agility:200,comprehension:20,willpower:15},equippedSkills:[skill.id],skills:{[skill.id]:{realm:0,completeness:1}},maxHp:225,maxPosture:100,maxInner:50};
 const hero=makePlayerCombatant(character,skills);
 const foe=enemy();
 const battle=new BattleSystem({party:[hero],enemies:[foe],rng:new SeededRng("skill-success")});
 battle.submit({type:"skill",skillId:skill.id,targetId:foe.id});
 const results=battle.lastActionResults.filter(entry=>entry.actorId==="hero"&&entry.requestedType==="skill");
 assert.equal(results.length,1);
 assert.equal(results[0].usedSkill,true);
 assert.ok(hero.inner<=hero.maxInner);
 assert.match(battle.log.join(" "),new RegExp(skill.name));
});
