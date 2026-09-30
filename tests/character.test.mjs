import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SeededRng } from "../src/core/rng.js";
import { adjustStatAllocation, createCharacter, rollStartingTalents } from "../src/systems/progression-system.js";
import { DEFAULT_STATS, IDENTITIES, STAT_DESCRIPTIONS, STAT_LABELS } from "../src/config/constants.js";
import { startingSkillOptions } from "../src/ui/starting-skill-view.js";
import { skillEffectLabel } from "../src/ui/skill-display.js";
import { deriveResources } from "../src/config/balance.js";
import { recalculateEquipment } from "../src/systems/inventory-system.js";
import { applyTalentModifiers } from "../src/systems/talent-system.js";

const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
const talents=read("talents"),skills=read("skills");
const neutralTalents=talents.filter(talent=>["talent_009","talent_012","talent_014"].includes(talent.id));
test("starting talent roll offers three positives and at most one pure negative",()=>{for(let i=0;i<200;i++){const roll=rollStartingTalents(talents,new SeededRng(`talent-${i}`));assert.equal(roll.choice.length,3);assert.ok(roll.choice.every(t=>t.type==="positive"));assert.equal(new Set([...roll.choice,...roll.random].map(t=>t.id)).size,5);assert.ok(roll.random.filter(t=>t.type==="negative").length<=1);}});
test("character creation enforces 100 stat points",()=>{const roll=rollStartingTalents(talents,new SeededRng("create"));const character=createCharacter({name:"林青雲",gender:"unspecified",identityId:"identity_constable",stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},startSkillName:"衙門刀法"},[roll.choice[0],...roll.random],skills);assert.equal(Object.values(character.stats).reduce((a,b)=>a+b,0),100);assert.equal(character.equippedSkills.length,1);});
test("creator header omits the removed five-step label",()=>{const app=fs.readFileSync(new URL("../src/app.js",import.meta.url),"utf8");assert.doesNotMatch(app,/創角\s*·\s*五步/);});
test("all eighteen starting skills have accurate creation details",()=>{const options=IDENTITIES.flatMap(identity=>startingSkillOptions(identity,skills));assert.equal(options.length,18);for(const option of options){const source=skills.find(skill=>skill.name===option.name);assert.ok(option.introduction.length>12,option.name);assert.deepEqual([option.hp,option.posture,option.innerCost],[source.power.hp,source.power.posture,source.innerCost]);}assert.match(options.find(option=>option.name==="八方拳").introduction,/破勢連攻/);});
test("starting posture attacks and evasive support display their roles clearly",()=>{const options=IDENTITIES.flatMap(identity=>startingSkillOptions(identity,skills));const fist=options.find(option=>option.name==='八方拳'),step=options.find(option=>option.name==='踏草步');assert.equal(fist.type,'攻擊');assert.equal(fist.postureFocus,true);assert.match(fist.effect,/強力削架勢 26/);assert.equal(step.type,'支援');assert.match(step.effect,/閃避 55%/);});
test("reassigned techniques show their combat effect in the skill list",()=>{assert.match(skillEffectLabel(skills.find(skill=>skill.id==='skill_041')),/強力削架勢 72/);assert.match(skillEffectLabel(skills.find(skill=>skill.id==='skill_095')),/防禦效果 -15%（2 回合）/);});
test("stat allocation cannot go above 100 and supports safe point transfer",()=>{assert.equal(adjustStatAllocation(DEFAULT_STATS,"strength",1),null);const reduced=adjustStatAllocation(DEFAULT_STATS,"constitution",-1);assert.equal(Object.values(reduced).reduce((a,b)=>a+b,0),99);const transferred=adjustStatAllocation(reduced,"strength",1);assert.equal(transferred.strength,21);assert.equal(transferred.constitution,19);assert.equal(Object.values(transferred).reduce((a,b)=>a+b,0),100);assert.equal(adjustStatAllocation(transferred,"strength",1),null);assert.equal(adjustStatAllocation(transferred,"missing",1),null);assert.equal(adjustStatAllocation(transferred,"strength",2),null);assert.deepEqual(DEFAULT_STATS,{strength:20,constitution:20,agility:20,comprehension:20,willpower:20});});
test("all five creation stats have a visible explanation matching the supported effects",()=>{for(const key of Object.keys(DEFAULT_STATS)){assert.ok(STAT_LABELS[key],`missing label ${key}`);assert.ok(STAT_DESCRIPTIONS[key],`missing explanation ${key}`);}assert.match(STAT_DESCRIPTIONS.strength,/傷害/);assert.match(STAT_DESCRIPTIONS.constitution,/5 氣血上限、2 架勢上限/);assert.match(STAT_DESCRIPTIONS.comprehension,/熟練度/);assert.match(STAT_DESCRIPTIONS.willpower,/每點增加 1 內力上限/);});
test("willpower increases starting inner capacity and permits more skill casts",()=>{
  const input={name:"定力試招",gender:"unspecified",identityId:"identity_constable",startSkillName:"衙門刀法"};
  const low=createCharacter({...input,stats:{...DEFAULT_STATS,strength:35,willpower:5}},neutralTalents,skills);
  const high=createCharacter({...input,stats:{...DEFAULT_STATS,strength:5,willpower:35}},neutralTalents,skills);
  assert.equal(low.maxInner,55);assert.equal(high.maxInner,85);
  assert.equal(high.inner,high.maxInner);
  const cost=skills.find(skill=>skill.name===input.startSkillName).innerCost;
  assert.ok(Math.floor(high.inner/cost)>Math.floor(low.inner/cost));
  assert.equal(high.maxHp,low.maxHp);assert.equal(high.maxPosture,low.maxPosture);
});
test("willpower combines with equipment and percentage inner bonuses",()=>{
  assert.equal(deriveResources(DEFAULT_STATS,{inner:10},{innerFlat:20,innerPct:.2}).maxInner,120);
});
test("recalculating an old character applies willpower once and preserves remaining inner ratio",()=>{
  const character=createCharacter({name:"舊存檔",gender:"unspecified",identityId:"identity_constable",stats:DEFAULT_STATS,startSkillName:"衙門刀法"},neutralTalents,skills);
  character.maxInner=50;character.inner=25;
  recalculateEquipment(character,[]);
  assert.equal(character.maxInner,70);assert.equal(character.inner,35);
  recalculateEquipment(character,[]);
  assert.equal(character.maxInner,70);assert.equal(character.inner,35);
  character.talents=["talent_005"];applyTalentModifiers(character);recalculateEquipment(character,[]);
  assert.equal(character.maxInner,75);assert.equal(character.stats.willpower,20);
  character.talents=["talent_044"];applyTalentModifiers(character);recalculateEquipment(character,[]);
  assert.equal(character.maxInner,62);
});
test("invalid stat allocation is rejected",()=>{const roll=rollStartingTalents(talents,new SeededRng("bad"));assert.throws(()=>createCharacter({name:"錯誤",gender:"unspecified",identityId:"identity_constable",stats:{strength:50,constitution:50,agility:20,comprehension:20,willpower:20},startSkillName:"衙門刀法"},[roll.choice[0],...roll.random],skills),/合計/);});
