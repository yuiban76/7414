import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SeededRng } from "../src/core/rng.js";
import { createCharacter, rollStartingTalents } from "../src/systems/progression-system.js";

const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
const talents=read("talents"),skills=read("skills");
test("starting talent roll offers three positives and at most one pure negative",()=>{for(let i=0;i<200;i++){const roll=rollStartingTalents(talents,new SeededRng(`talent-${i}`));assert.equal(roll.choice.length,3);assert.ok(roll.choice.every(t=>t.type==="positive"));assert.equal(new Set([...roll.choice,...roll.random].map(t=>t.id)).size,5);assert.ok(roll.random.filter(t=>t.type==="negative").length<=1);}});
test("character creation enforces 100 stat points",()=>{const roll=rollStartingTalents(talents,new SeededRng("create"));const character=createCharacter({name:"林青雲",gender:"unspecified",identityId:"identity_constable",stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},startSkillName:"衙門刀法"},[roll.choice[0],...roll.random],skills);assert.equal(Object.values(character.stats).reduce((a,b)=>a+b,0),100);assert.equal(character.equippedSkills.length,1);});
test("invalid stat allocation is rejected",()=>{const roll=rollStartingTalents(talents,new SeededRng("bad"));assert.throws(()=>createCharacter({name:"錯誤",gender:"unspecified",identityId:"identity_constable",stats:{strength:50,constitution:50,agility:20,comprehension:20,willpower:20},startSkillName:"衙門刀法"},[roll.choice[0],...roll.random],skills),/合計/);});
