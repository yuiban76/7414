import fs from 'node:fs';
import { IDENTITIES, DEFAULT_STATS } from '../src/config/constants.js';
import { createCharacter } from '../src/systems/progression-system.js';
import { BattleSystem, makeEnemy, makeNpcCompanion, makePlayerCombatant } from '../src/systems/battle-system.js';
import { REVENGE_ENCOUNTERS, createRevengeEncounter } from '../src/systems/revenge-battle.js';
import { applyRevengeCatalog } from '../src/core/revenge-catalog.js';
import { SeededRng } from '../src/core/rng.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8')).data;
const content=Object.fromEntries(['skills','enemies','chapters','locations','npcs','factions'].map(n=>[n,read(n)]));
applyRevengeCatalog(content);
const seeds=Number(process.env.REVENGE_AUDIT_SEEDS??3),rows=[];
let trials=0;
for(const d of Object.values(REVENGE_ENCOUNTERS))for(const size of [1,2,3,4]){
  let wins=0,rounds=0;const failures=[];
  for(const identity of IDENTITIES)for(const startSkillName of identity.skills)for(let seed=0;seed<seeds;seed++){
    const c=createCharacter({name:'測試',gender:'unspecified',identityId:identity.id,stats:{...DEFAULT_STATS},startSkillName},[{id:"talent_009"},{id:"talent_010"},{id:"talent_014"}],content.skills);
    const party=[makePlayerCombatant(c,content.skills),...content.npcs.slice(0,size-1).map(n=>makeNpcCompanion(n,content.skills,d.chapter))];
    const {enemyDef,scenario}=createRevengeEncounter({encounterId:d.id,chapter:d.chapter,content});
    const b=new BattleSystem({party,enemies:[makeEnemy(enemyDef,content.skills,size)],scenario,rng:new SeededRng(`revenge:${d.id}:${size}:${startSkillName}:${seed}`)});
    while(!b.finished&&b.round<90){
      const actor=b.living('party')[0],target=b.living('enemy')[0];if(!actor||!target)break;
      let action;
      if(actor.hp<actor.maxHp*.38&&actor.consumablesUsed<3)action={type:'item'};
      else if(scenario.objectiveProgress<scenario.objectiveTotal)action={type:'objective'};
      else{
        const heal=actor.skills.find(s=>s.innerCost<=actor.inner&&s.effects.some(e=>e.effectId==='heal_pct'));
        const skill=actor.skills.filter(s=>s.innerCost<=actor.inner&&['attack','control'].includes(s.type)).toSorted((a,b)=>b.power.hp+b.power.posture-a.power.hp-a.power.posture)[0];
        action=heal&&actor.hp<actor.maxHp*.65?{type:'skill',skillId:heal.id,targetId:actor.id}:skill?{type:'skill',skillId:skill.id,targetId:target.id}:{type:'attack',targetId:target.id};
      }
      b.submit(action);
    }
    trials++;rounds+=b.round;wins+=b.finished==='victory';
    if(b.finished!=='victory')failures.push(`${startSkillName}:${seed}`);
  }
  rows.push({encounter:d.id,party:size,wins,total:18*seeds,averageRounds:Math.round(rounds/(18*seeds)*10)/10,failures});
}
console.table(rows.map(({failures,...r})=>r));
console.log(`${trials} trials: all 18 starting skills, party sizes 1–4, ${seeds} deterministic seeds; base stats, non-combat talents, no extra equipment, no granted realms.`);
const failed=rows.filter(r=>r.failures.length);if(failed.length){console.error(JSON.stringify(failed,null,2));process.exitCode=1;}
