import fs from 'node:fs';
import { createCharacter } from '../src/systems/progression-system.js';
import { IDENTITIES } from '../src/config/constants.js';
import { recalculateEquipment } from '../src/systems/inventory-system.js';
import { BattleSystem, makeEnemy, makeNpcCompanion, makePlayerCombatant } from '../src/systems/battle-system.js';
import { scaleStoryEncounter } from '../src/core/zhaoye-callbacks.js';
import { createZhaoyeState } from '../src/core/zhaoye-engine.js';
import { BATTLES } from '../src/core/zhaoye-story.js';
import { SeededRng } from '../src/core/rng.js';
const data=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8')).data;
const skills=data('skills'),equipment=data('equipment'),chapters=data('chapters'),enemies=data('enemies');
const rewards=['equipment_121','equipment_196','equipment_241','equipment_101','equipment_201','equipment_230','equipment_280','equipment_120'];
const score=e=>(e.stats.damage??0)*2+(e.stats.postureDamage??0)*1.5+(e.stats.hp??0)*.25+(e.stats.posture??0)*.6+(e.stats.damageReduction??0)*500;
const rows=[];let trials=0;
for(const [id,scene] of Object.entries(BATTLES).filter(([id])=>!process.env.ZHAOYE_SCENE||id===process.env.ZHAOYE_SCENE))for(const size of [1,2,3,4]){
 const chapter=Number(id[0]),rates=[];let rescues=0,total=0,rounds=0;
 for(const identity of IDENTITIES)for(const startSkillName of identity.skills){let wins=0;
  for(let seed=0;seed<40;seed++){
   const character=createCharacter({name:'測試',gender:'unspecified',identityId:identity.id,stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},startSkillName},[{id:"talent_009"},{id:"talent_010"},{id:"talent_014"}],skills);
   const available=['equipment_001',...rewards.slice(0,chapter-1)].map(id=>equipment.find(e=>e.id===id)).filter(Boolean);
   for(const slot of ['weapon','armor','bracer','accessory'])character.equipment[slot]=available.filter(e=>e.slot===slot).sort((a,b)=>score(b)-score(a))[0]?.id??null;
   recalculateEquipment(character,equipment,[]);
   const party=[makePlayerCombatant(character,skills),...Array.from({length:size-1},(_,i)=>makeNpcCompanion({id:`npc_00${i+1}`,name:`接應${i+1}`,role:'攻擊／身法'},skills,chapter))];
   const candidates=chapters[chapter-1].keyEnemyIds.map(id=>enemies.find(e=>e.id===id)).filter(Boolean);
   const def=chapter===1?enemies.find(e=>e.id===(id==='1-3'?'enemy_004':'enemy_001')):candidates.find(e=>e.tier==='major_boss')??candidates.find(e=>e.tier==='boss')??candidates[0];
   const enemy=makeEnemy({...def,name:scene.name},skills,size);scaleStoryEncounter(enemy,{currentSceneId:id,zhaoye:createZhaoyeState()},size);const battle=new BattleSystem({party,enemies:[enemy],rng:new SeededRng(`zhaoye:${id}:${size}:${startSkillName}:${seed}`)});
   let progress=0,defenses=0;battle.onScenarioAction=()=>{progress++;};
   while(!battle.finished&&battle.round<=100){const actor=battle.living('party')[0],target=battle.living('enemy')[0];if(!actor||!target)break;
    let action;if(progress<scene.objectives.length&&battle.round<=(scene.limit??Infinity))action={type:'objective'};
    else if(id==='8-4'&&progress>=2)action={type:'defend'};
    else if(actor.hp/actor.maxHp<.3&&actor.consumablesUsed<3)action={type:'item'};
    else {const skill=actor.skills.find(s=>['attack','posture','control'].includes(s.type)&&s.innerCost<=actor.inner);action=skill?{type:'skill',skillId:skill.id,targetId:target.id}:{type:'attack',targetId:target.id};}
    battle.submit(action);if(id==='8-4'&&action.type==='defend'&&battle.living('party').length&&++defenses>=3)battle.finished='victory';
   }
   wins+=battle.finished==='victory';rescues+=progress>=scene.objectives.length&&battle.finished==='victory';rounds+=battle.round;total++;trials++;
  }rates.push(wins/40);
 }
 rows.push({scene:id,party:size,minWin:Math.round(Math.min(...rates)*100),maxWin:Math.round(Math.max(...rates)*100),rescue:Math.round(rescues/total*100),rounds:Number((rounds/total).toFixed(1))});
}
console.table(rows);console.log(`${trials} seeded trials; no chapter-granted realm, no optional preparation buffs, chapter gear equipped, at most three medicine actions per fight.`);
const failures=rows.filter(r=>r.minWin<45||r.maxWin-r.minWin>45);
if(failures.length){console.error('Needs tuning:',failures);process.exitCode=1;}
