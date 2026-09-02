import test from "node:test";
import assert from "node:assert/strict";
import { applyTalentModifiers, talentModifiers } from "../src/systems/talent-system.js";

test("all fifty published talents map to a mechanical modifier",()=>{const baseline=JSON.stringify(talentModifiers([]));for(let index=1;index<=50;index++){const id=`talent_${String(index).padStart(3,"0")}`;assert.notEqual(JSON.stringify(talentModifiers([id])),baseline,`${id} must not be flavor-only`);}});
test("flat-stat talents preserve creation stats and expose effective stats",()=>{const character={stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},talents:["talent_001","talent_044","talent_046"]};applyTalentModifiers(character);assert.equal(character.stats.strength,20);assert.equal(character.effectiveStats.strength,25);assert.equal(character.effectiveStats.willpower,12);assert.equal(character.effectiveStats.agility,30);assert.equal(character.talentModifiers.proficiencyPct,.15);});
test("tradeoff and negative talents retain their costs",()=>{const reckless=talentModifiers(["talent_045"]);assert.equal(reckless.damagePct,.1);assert.equal(reckless.damageTakenPct,.08);const frail=talentModifiers(["talent_047","talent_048"]);assert.equal(frail.hpPct,-.15);assert.equal(frail.innerPct,-.15);});
