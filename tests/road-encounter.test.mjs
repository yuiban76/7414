import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { travel, ROAD_ENCOUNTER_CHANCE } from "../src/systems/travel-system.js";
import { roadEnemyDefinition } from "../src/systems/road-encounter.js";
import { BattleSystem, makeEnemy, makePlayerCombatant } from "../src/systems/battle-system.js";
import { packBattle, restoreBattle } from "../src/persistence/battle-snapshot.js";
import { SeededRng } from "../src/core/rng.js";

const data=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
const locations=data("locations"),skills=data("skills"),baseEnemy=data("enemies")[0];
const world=()=>({currentLocationId:"location_002",visitedLocations:["location_002"],partyMoney:200,clock:{day:1,segment:"morning"},worldEvents:[],flags:{story_kept:true}});
const hero=()=>({id:"hero",name:"旅人",stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},equippedSkills:["skill_001"],skills:{},innerArts:{},meridians:{}});

test("ordinary travel rolls a 25% encounter independently of travel flavor",()=>{
  const encountered=world(),rng={pick:items=>items[0],next:()=>ROAD_ENCOUNTER_CHANCE-.001};
  const result=travel(encountered,"location_010",locations,rng);
  assert.equal(result.encounter,true);
  assert.ok(result.event);
  assert.equal(encountered.currentLocationId,"location_010");
  assert.deepEqual(encountered.flags,{story_kept:true});
  const quiet=travel(world(),"location_010",locations,{pick:items=>items[0],next:()=>ROAD_ENCOUNTER_CHANCE});
  assert.equal(quiet.encounter,false);
});

test("fast travel skips the encounter roll and still charges its fare",()=>{
  const state=world();state.visitedLocations.push("location_001");
  const rng={pick:()=>{throw new Error("fast travel should not draw an event");},next:()=>{throw new Error("fast travel should not roll an encounter");}};
  const result=travel(state,"location_001",locations,rng,{fast:true});
  assert.equal(result.encounter,false);
  assert.equal(result.cost,80);
  assert.equal(state.partyMoney,120);
});

test("road enemy strength follows the hero's training level with a gentle cap",()=>{
  const novice=hero();
  const trained=hero();trained.skills=Object.fromEntries(Array.from({length:3},(_,i)=>[`skill_${i}`,{realm:5,completeness:1}]));
  const master=hero();master.skills=Object.fromEntries(Array.from({length:6},(_,i)=>[`skill_${i}`,{realm:5,completeness:1}]));master.innerArts=Object.fromEntries(["inner_003","inner_009","inner_015","inner_016","inner_012","inner_011"].map(id=>[id,{realm:0,refinement:10}]));master.meridians=Object.fromEntries(Array.from({length:6},(_,i)=>[`meridian_${i}`,10]));
  const first=roadEnemyDefinition(novice,baseEnemy),middle=roadEnemyDefinition(trained,baseEnemy),last=roadEnemyDefinition(master,baseEnemy);
  assert.equal(first.level,1);assert.equal(last.level,100);
  assert.ok(first.stats.strength<middle.stats.strength&&middle.stats.strength<=last.stats.strength);
  assert.ok(first.stats.constitution<middle.stats.constitution&&middle.stats.constitution<=last.stats.constitution);
  assert.ok(last.stats.strength-first.stats.strength<=8);
  assert.ok(last.stats.constitution-first.stats.constitution<=10);
  assert.equal(first.tier,"elite");assert.equal(first.skillIds.length,1);
  const low=makeEnemy(first,skills,1),high=makeEnemy(last,skills,1);
  assert.ok(high.maxHp>low.maxHp);
  assert.ok(Number.isFinite(high.stableKey));
});

test("a road fight and its destination survive a battle snapshot",()=>{
  const state=world();travel(state,"location_010",locations,{pick:items=>items[0],next:()=>0});
  const character=hero(),definition=roadEnemyDefinition(character,baseEnemy);
  const battle=new BattleSystem({party:[makePlayerCombatant(character,skills)],enemies:[makeEnemy(definition,skills,1)],rng:new SeededRng("road-save")});
  const choice={roadEncounter:true,locationId:state.currentLocationId,enemyLevel:definition.level};
  const restored=restoreBattle(JSON.parse(JSON.stringify(packBattle(battle,choice))));
  assert.deepEqual(restored.choice,choice);
  assert.equal(restored.battle.enemies[0].name,definition.name);
  assert.equal(state.currentLocationId,"location_010");
});
