import fs from 'node:fs';
import assert from 'node:assert/strict';
import { BattleSystem, makePlayerCombatant, makeEnemy } from '../src/systems/battle-system.js';
import { FLOW, journeyEnemyDefinitions } from '../src/systems/exploration-system.js';
import { SeededRng } from '../src/core/rng.js';

const data=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8')).data;
const skills=data('skills'),enemies=data('enemies');
const base={id:'hero',name:'固定測試角色',stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},equippedSkills:[FLOW.skillId],skills:{[FLOW.skillId]:{realm:0,completeness:1}},maxHp:200,maxPosture:90,maxInner:50};
const rows=[];
for(const encounter of ['flow_trial','flow_fame'])for(const stage of encounter==='flow_trial'?[0,1,2,3]:[3]){
 const durations=[];let wins=0;
 for(let seed=0;seed<40;seed++){
  const actor=makePlayerCombatant(base,skills);actor.flowStage=stage;
  const battle=new BattleSystem({party:[actor],enemies:journeyEnemyDefinitions(encounter,enemies[0]).map(e=>makeEnemy(e,skills,1)),rng:new SeededRng(`comparison-${seed}`)});
  let turns=0;while(!battle.finished&&turns<80){battle.submit({type:'skill',skillId:FLOW.skillId,targetId:battle.living('enemy')[0].id});turns++;}
  if(battle.finished==='victory')wins++;durations.push(turns);
 }
 durations.sort((a,b)=>a-b);rows.push({encounter,stage,seeds:40,wins,medianTurns:(durations[19]+durations[20])/2});
}
assert.ok(rows.find(r=>r.encounter==='flow_trial'&&r.stage===3).medianTurns<=rows[0].medianTurns*.7,'成形後需至少縮短 30%');
for(let i=1;i<4;i++)assert.ok(rows[i].medianTurns<=rows[i-1].medianTurns,'學會前一階口訣不應讓演練變慢');
assert.ok(rows.every(r=>r.wins===40),'固定角色應能完成試招與成名戰');
console.log(JSON.stringify({conditions:'單人、屬性各20、八方拳零重、無裝備天賦加成、相同敵人與40個種子、不服藥、不升級',rows},null,2));
