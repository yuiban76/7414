import fs from 'node:fs';
import { SIDEQUESTS } from '../src/data/zhaoye-sidequests.js';
import { sidequestEnemyDefinition } from '../src/systems/sidequest-system.js';
import { BattleSystem, makeEnemy, makeNpcCompanion, makePlayerCombatant } from '../src/systems/battle-system.js';
import { createCharacter } from '../src/systems/progression-system.js';
import { recalculateEquipment } from '../src/systems/inventory-system.js';
import { IDENTITIES } from '../src/config/constants.js';
import { SeededRng } from '../src/core/rng.js';
const data=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8')).data;
const skills=data('skills'),equipment=data('equipment'),base=data('enemies')[0];
const rows=[];let trials=0;
for(const quest of SIDEQUESTS)for(const [step,node] of quest.scenes.entries())if(node.battle)for(const size of [1,2,3,4]){
  const rates=[];let complete=0,total=0;
  for(const identity of IDENTITIES)for(const startSkillName of identity.skills){let wins=0;
    for(let seed=0;seed<40;seed++){
      // No chapter gear, quest rewards, learnt additional techniques or level buffs.
      const hero=createCharacter({name:'支線稽核',gender:'unspecified',identityId:identity.id,stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},startSkillName},[{id:'talent_009'},{id:'talent_010'},{id:'talent_014'}],skills);
      recalculateEquipment(hero,equipment,[]);
      const party=[makePlayerCombatant(hero,skills),...Array.from({length:size-1},(_,i)=>makeNpcCompanion({id:`npc_00${i+1}`,name:`接應${i+1}`,role:'攻擊／身法'},skills,node.chapter))];
      const choice={questId:quest.id,step,enemyName:node.battle.enemy};
      const enemy=makeEnemy(sidequestEnemyDefinition(choice,node.chapter,base),skills,size);
      const battle=new BattleSystem({party,enemies:[enemy],rng:new SeededRng(`sq:${quest.id}:${step}:${size}:${startSkillName}:${seed}`)});
      let actions=0;battle.onScenarioAction=()=>actions++;
      while(!battle.finished&&battle.round<=80){
        const actor=battle.living('party')[0],target=battle.living('enemy')[0];if(!actor||!target)break;
        const skill=actor.skills.find(s=>['attack','control'].includes(s.type)&&s.innerCost<=actor.inner);
        battle.submit(actions<node.battle.objectives.length?{type:'objective'}:actor.hp/actor.maxHp<.3&&actor.consumablesUsed<3?{type:'item'}:skill?{type:'skill',skillId:skill.id,targetId:target.id}:{type:'attack',targetId:target.id});
      }
      wins+=battle.finished==='victory';complete+=battle.finished==='victory'&&actions>=node.battle.objectives.length;total++;trials++;
    }
    rates.push(wins/40);
  }
  rows.push({quest:quest.id,step,party:size,minWin:Math.round(Math.min(...rates)*100),maxWin:Math.round(Math.max(...rates)*100),rescue:Math.round(complete/total*100)});
}
console.table(rows);console.log(`${trials} seeded trials; rescue actions cost a turn; no extra gear or quest buffs.`);
if(rows.some(row=>row.minWin<55||row.maxWin-row.minWin>40))process.exitCode=1;
