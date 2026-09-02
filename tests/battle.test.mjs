import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SeededRng } from "../src/core/rng.js";
import { BattleSystem, makeEnemy, makeNpcCompanion, makePlayerCombatant } from "../src/systems/battle-system.js";

const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;const skills=read("skills"),enemies=read("enemies");
const baseCharacter={id:"hero",name:"測試俠客",stats:{strength:25,constitution:25,agility:20,comprehension:15,willpower:15},equippedSkills:["skill_001"],maxHp:225,maxPosture:100,maxInner:50};
test("battle resolves deterministically and never creates negative resources",()=>{const rng=new SeededRng("battle-regression");const battle=new BattleSystem({party:[makePlayerCombatant(baseCharacter,skills),makeNpcCompanion("陸小川",skills)],enemies:[makeEnemy(enemies[0],skills,2)],rng});for(let turn=0;turn<60&&!battle.finished;turn++){const target=battle.living("enemy")[0];battle.submit({type:"skill",skillId:"skill_001",targetId:target.id});for(const actor of battle.all){assert.ok(actor.hp>=0);assert.ok(actor.posture>=0);assert.ok(actor.inner>=0);}}assert.ok(["victory","defeat"].includes(battle.finished));});
test("posture break persists through the following round then restores",()=>{const rng=new SeededRng("posture");const enemy=makeEnemy(enemies[0],skills,2);enemy.maxHp=9999;enemy.hp=9999;enemy.posture=1;const battle=new BattleSystem({party:[makePlayerCombatant(baseCharacter,skills),makeNpcCompanion("陸小川",skills)],enemies:[enemy],rng});battle.submit({type:"attack",targetId:enemy.id});assert.equal(enemy.vulnerableTurns,1,"vulnerability remains for the next round");battle.submit({type:"defend"});assert.ok(enemy.posture>0,"posture restores after the vulnerable round resolves");assert.equal(enemy.vulnerableTurns,0);});
