import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyRevengeCatalog, REVENGE_DESTINATIONS } from '../src/core/revenge-catalog.js';
import { REVENGE_ENCOUNTERS, createRevengeEncounter, revengeBattleGoal, validateRevengeBattleScenario } from '../src/systems/revenge-battle.js';
import { BattleSystem, makeEnemy, makePlayerCombatant } from '../src/systems/battle-system.js';
import { canRecruit } from '../src/systems/npc-system.js';
import { SeededRng } from '../src/core/rng.js';
import { renderScenarioAction } from '../src/ui/battle-objective-view.js';
import { TenChapterEngine, createTenChapterState } from '../src/core/revenge-engine.js';
import { packBattle, restoreBattle } from '../src/persistence/battle-snapshot.js';

const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8')).data;
const content=Object.fromEntries(['skills','enemies','chapters','locations','npcs','factions'].map(n=>[n,read(n)]));
content.revengeStory=JSON.parse(fs.readFileSync(new URL('../src/data/revenge-story.json',import.meta.url),'utf8'));
const hero=()=>makePlayerCombatant({id:'hero',name:'照溪弟子',stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},equippedSkills:['skill_001'],skills:{}},content.skills);
function battleFor(id){const d=REVENGE_ENCOUNTERS[id],{enemyDef,scenario}=createRevengeEncounter({encounterId:id,chapter:d.chapter,content});return new BattleSystem({party:[hero()],enemies:[makeEnemy(enemyDef,content.skills,1)],scenario,rng:new SeededRng('revenge:'+id)});}

test('ten-chapter catalog preserves graph and numeric/skill assets, exposes only the new three companions',()=>{
  const c=structuredClone(content),before=structuredClone(c);applyRevengeCatalog(c);
  assert.equal(c.chapters.length,10);assert.equal(c.chapters[9].name,'照夜而行');assert.equal(c.chapters[9].nextChapterId,null);
  assert.deepEqual(c.locations.map(l=>[l.id,l.adjacentIds]),before.locations.map(l=>[l.id,l.adjacentIds]));
  assert.deepEqual(c.skills,before.skills);assert.deepEqual(c.enemies,before.enemies);
  for(const [id,name]of REVENGE_DESTINATIONS)assert.equal(c.locations.find(l=>l.id===id).name,name);
  const world={chapter:10,npcStates:{}};
  assert.deepEqual(c.npcs.filter(n=>canRecruit(n,world)).map(n=>n.name),['宋硯','陸見霜','程渡']);
  assert.ok(c.npcs.slice(0,3).every(n=>n.portrait.includes('/identities/')));
  assert.ok(!JSON.stringify(c.npcs).includes('陸小川'));
  applyRevengeCatalog(c);assert.equal(c.chapters.length,10);assert.equal(c.npcs.length,24);
});

test('every authored encounter has the correct chapter, new enemy identity, and concrete operations',()=>{
  const encountered=new Set(content.revengeStory.chapters.flatMap(c=>c.scenes.map(s=>s.encounter).filter(Boolean)));
  assert.deepEqual(encountered,new Set(Object.keys(REVENGE_ENCOUNTERS)));
  assert.equal(encountered.size,29); // Each path uses just one of the two gate entries.
  for(const d of Object.values(REVENGE_ENCOUNTERS)){
    const b=battleFor(d.id),goal=revengeBattleGoal(b);
    assert.equal(b.enemies[0].name,d.name);assert.ok(goal.objectives.every(x=>x.length>=4));
    assert.equal(validateRevengeBattleScenario(b.scenario,b.snapshot()),true);
    assert.throws(()=>createRevengeEncounter({encounterId:d.id,chapter:d.chapter+1,content}));
  }
});

test('nonlethal duels retain the opponent and never emit a kill event',()=>{
  for(const id of ['well-lesson','constable-chase','yue-duel','han-corridor','xu-needles','dong-convoy']){
    const b=battleFor(id);while(b.scenario.objectiveProgress<b.scenario.objectiveTotal)b.submit({type:'objective'});
    const target=b.enemies[0];target.hp=1;b.party[0].stats.agility=100;
    b.submit({type:'attack',targetId:target.id});
    assert.equal(b.finished,'victory',id);assert.equal(target.hp,1,id);
    assert.ok(!b.snapshot().events.some(e=>e.type==='kill'),id);
    assert.equal(validateRevengeBattleScenario(b.scenario,b.snapshot()),true,id);
  }
});

test('chapter-six escape cannot kill Xie even with a lethal attack; objectives win with him alive',()=>{
  const b=battleFor('xie-escape'),enemy=b.enemies[0];enemy.hp=1;
  b.party[0].stats.agility=100;b.submit({type:'attack',targetId:enemy.id});
  assert.equal(enemy.hp,1);assert.equal(b.finished,null);assert.ok(!b.snapshot().events.some(e=>e.type==='kill'));
  while(!b.finished)b.submit({type:'objective'});
  assert.equal(b.finished,'victory');assert.equal(enemy.hp,1);assert.match(b.log.join(' '),/仍活著/);
});

test('final Xie requires operations AND an actual lethal victory, with posture interrupts preserved',()=>{
  const b=battleFor('xie-final'),enemy=b.enemies[0];b.party[0].stats.agility=100;enemy.hp=1;enemy.posture=1;
  b.submit({type:'attack',targetId:enemy.id});assert.equal(b.finished,null);assert.equal(enemy.hp,1);assert.equal(b.scenario.brokenOnce,true);
  while(b.scenario.objectiveProgress<b.scenario.objectiveTotal)b.submit({type:'objective'});
  assert.equal(b.finished,null);b.submit({type:'attack',targetId:enemy.id});
  assert.equal(b.finished,'victory');assert.equal(enemy.hp,0);assert.equal(validateRevengeBattleScenario(b.scenario,b.snapshot()),true);
});

test('scenario validation is pure and rejects altered objectives, enemy identity, mode and progress',()=>{
  const b=battleFor('xie-escape'),snapshot=b.snapshot(),original=JSON.stringify(snapshot);
  for(const patch of [{encounter:'xie-final'},{mode:'defeat'},{objectiveTotal:0},{objectiveProgress:99},{phase:3},{interruptedRound:99},{subdued:true},{extra:1}]){
    assert.equal(validateRevengeBattleScenario({...snapshot.scenario,...patch},snapshot),false,JSON.stringify(patch));
  }
  const forged=structuredClone(snapshot);forged.enemies[0].name='舊版反派';assert.equal(validateRevengeBattleScenario(forged.scenario,forged),false);
  assert.equal(JSON.stringify(snapshot),original);
});

test('rendered scene actions remain enabled without a deadline and honor finite deadlines',()=>{
  for(const id of Object.keys(REVENGE_ENCOUNTERS)){
    const goal=revengeBattleGoal(battleFor(id));
    for(const round of [1,50,200]){
      const html=renderScenarioAction(goal,round);
      assert.match(html,/data-combat-action='\{"type":"objective"\}'/,id);
      assert.doesNotMatch(html,/disabled|已超過期限/,id);
    }
  }
  const goal={done:0,objectives:['接住茶碗'],limit:3};
  assert.doesNotMatch(renderScenarioAction(goal,3),/disabled|已超過期限/);
  assert.match(renderScenarioAction(goal,4),/ disabled/);
  assert.match(renderScenarioAction(goal,4),/已超過期限/);
  assert.equal(renderScenarioAction({...goal,done:1},4),'');
  assert.equal(renderScenarioAction(null,1),'');
});

test('a first battle saved after subduing the teacher can use the rendered action and continue the story',()=>{
  const story=content.revengeStory,character={id:'hero',moneyWen:0,cultivation:0};
  const world={chapter:1,flags:{},quests:{},clock:{day:1,segment:'evening'},visitedLocations:[],party:{playerIds:['hero'],npcIds:[]},npcStates:{},zhaoye:createTenChapterState(story)};
  const engine=new TenChapterEngine({world,character,content});
  while(!engine.sceneView().choices[0].id.startsWith('battle:'))engine.choose(engine.sceneView().choices[0].id);
  const choice=engine.choose(engine.sceneView().choices[0].id);
  assert.equal(choice.revengeEncounter,'well-lesson');
  let battle=battleFor(choice.revengeEncounter);
  while(!battle.scenario.subdued&&!battle.finished&&battle.round<60)battle.submit({type:'attack',targetId:battle.enemies[0].id});
  assert.equal(battle.finished,null);
  assert.equal(battle.scenario.subdued,true);
  assert.equal(battle.enemies[0].hp,1);
  const restored=restoreBattle(JSON.parse(JSON.stringify(packBattle(battle,choice))));
  battle=restored.battle;
  const html=renderScenarioAction(revengeBattleGoal(battle),battle.round);
  assert.doesNotMatch(html,/disabled|已超過期限/);
  const action=JSON.parse(html.match(/data-combat-action='([^']+)'/)[1]);
  battle.submit(action);
  assert.equal(battle.finished,'victory');
  assert.equal(validateRevengeBattleScenario(battle.scenario,battle.snapshot()),true);
  engine.finishBattle(restored.choice,battle.finished,battle.scenario);
  assert.equal(engine.needsBattle(),false);
  assert.match(engine.sceneView().choices[0].id,/^continue:/);
  const scene=world.currentSceneId;
  engine.choose(engine.sceneView().choices[0].id);
  assert.notEqual(world.currentSceneId,scene);
  assert.deepEqual(world.zhaoye.completedEncounters,['well-lesson']);
});

test('renamed encounter descriptions keep revision-three active battles loadable',()=>{
  for(const [id,name]of Object.entries({'yue-ash-guard':'岳家守旗弟子','terrace-practice':'松嶺試劍弟子','river-borrow-fire':'河道巡兵','wei-siege':'衛峻','capital-relay':'謝府傳令騎'})){
    const battle=battleFor(id),saved=packBattle(battle,{revengeEncounter:id});
    saved.enemies[0].name=name;
    assert.equal(validateRevengeBattleScenario(saved.scenario,saved),true,id);
    const restored=restoreBattle(JSON.parse(JSON.stringify(saved))).battle;
    assert.equal(restored.round,battle.round);
    restored.submit({type:'objective'});
    assert.equal(restored.scenario.objectiveProgress,1);
  }
});
