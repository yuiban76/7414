import test from 'node:test';
import assert from 'node:assert/strict';
import { SIDEQUESTS } from '../src/data/zhaoye-sidequests.js';
import { NARRATIVE_REWRITE, OPENING_REWRITE } from '../src/data/zhaoye-narrative.js';
import { createZhaoyeState } from '../src/core/zhaoye-engine.js';
import { createWorld, GameEngine } from '../src/core/game-engine.js';
import { ZHAOYE_SCENES, ZHAOYE_LOCATION_IDS } from '../src/core/zhaoye-story.js';
import { COMPANION_NAMES, STAND_INS } from '../src/core/zhaoye-fates.js';
import { canRecruit, dismissNpc } from '../src/systems/npc-system.js';
import { journeyEnemyDefinitions, availableJourneyEvents } from '../src/systems/exploration-system.js';
import { availableSidequests, chooseSidequest, closeChapterSidequests, settleSidequestBattle, sidequestBattleAction, sidequestCallbacks, sidequestView, validateSidequests } from '../src/systems/sidequest-system.js';
import { packBattle, restoreBattle } from '../src/persistence/battle-snapshot.js';
import { BattleSystem, makeEnemy, makeNpcCompanion } from '../src/systems/battle-system.js';
import { SeededRng } from '../src/core/rng.js';
import { sidequestEnemyDefinition } from '../src/systems/sidequest-system.js';
import { sidequestJournal, sidequestMapLabels } from '../src/ui/sidequest-view.js';

function fresh() {
  const world = createWorld({ name:'支線測試', startingCountry:'dasheng', ownerCharacterId:'hero', seed:'sidequests' });
  world.zhaoye = createZhaoyeState(); world.currentSceneId = '1-1'; world.currentLocationId = 'location_018';
  return { world, character:{ id:'hero', moneyWen:0, cultivation:0 } };
}
function reload(world) { const w = structuredClone(world); validateSidequests(w); return w; }
function completeQuest(world, character, q, outcomeId) {
  world.chapter = q.startChapter; world.currentLocationId = q.places[0];
  chooseSidequest(world, character, q.id, 'accept');
  while (world.zhaoye.sidequests[q.id].status !== 'completed') {
    const p = world.zhaoye.sidequests[q.id], node = q.scenes[p.step];
    if (p.status === 'waiting') { assert.match(sidequestJournal(world), /下一段/); world.chapter = q.endChapter; world.currentLocationId = q.places.at(-1); }
    if (node.battle) {
      const before = world.currentSceneId, fatesBefore=structuredClone(world.zhaoye.fates), stepBefore=p.step, choice = chooseSidequest(world, character, q.id, 'battle');
      settleSidequestBattle(world, choice, { finished:'defeat' });
      assert.equal(world.zhaoye.sidequests[q.id].step, stepBefore); assert.deepEqual(world.zhaoye.fates, fatesBefore);
      const retry = chooseSidequest(world, character, q.id, 'battle');
      for (const goal of node.battle.objectives) sidequestBattleAction(world, retry);
      const savedFight = new BattleSystem({party:[makeNpcCompanion({id:'hero',name:'主角'},[],1)],enemies:[makeEnemy(sidequestEnemyDefinition(retry,world.chapter,{}),[],1)],rng:new SeededRng(retry.encounterId)});
      world.zhaoye.selectedSidequest=q.id;world.zhaoye.activeBattle=packBattle(savedFight,retry);world=reload(world);
      settleSidequestBattle(world, retry, { finished:'victory' }); assert.equal(world.currentSceneId, before);
      delete world.zhaoye.activeBattle;delete world.zhaoye.selectedSidequest;
      assert.throws(() => settleSidequestBattle(world, retry, { finished:'victory' }));
    } else if (node.outcomes) {
      const outcome = node.outcomes.find(o => o.id === outcomeId) ?? node.outcomes[0];
      chooseSidequest(world, character, q.id, outcome.id);
      if (outcome.danger) {
        assert.ok(!world.zhaoye.fates[outcome.fate.npcId]); assert.match(sidequestView(world,q.id).text, /永久/);
        chooseSidequest(world,character,q.id,'cancel'); assert.ok(!world.zhaoye.fates[outcome.fate.npcId]);
        chooseSidequest(world,character,q.id,outcome.id); world = reload(world); chooseSidequest(world,character,q.id,'confirm');
      }
    } else chooseSidequest(world, character, q.id, 'continue');
    world = reload(world);
  }
  return world;
}

test('twelve authored quests have eight short arcs, four cross-chapter arcs and unique callbacks', () => {
  assert.equal(SIDEQUESTS.length,12); assert.equal(new Set(SIDEQUESTS.map(q=>q.id)).size,12);
  assert.equal(SIDEQUESTS.filter(q=>q.scenes.length===5).length,4);
  for (const q of SIDEQUESTS) { assert.equal(q.scenes.filter(s=>s.battle).length,q.scenes.length===5?2:1); for (const outcome of q.scenes.at(-1).outcomes) { assert.ok(outcome.text.trim()); assert.ok(q.callback[outcome.id]); } }
});
test('all twelve quest branches survive reload, defeat and confirmation without duplicate rewards or mainline edits', () => {
  for (const q of SIDEQUESTS) for (const outcome of q.scenes.at(-1).outcomes) {
    let {world,character}=fresh(); world = completeQuest(world,character,q,outcome.id);
    assert.equal(character.moneyWen,100); assert.equal(character.cultivation,50);
    assert.equal(world.zhaoye.sidequests[q.id].outcome,outcome.id);
    assert.equal(world.zhaoye.sidequests[q.id].battles.length,q.scenes.length===5?2:1);
    assert.ok(sidequestCallbacks(world,q.callback.scene).length>0);
    assert.throws(()=>chooseSidequest(world,character,q.id,outcome.id));
    assert.equal(character.moneyWen,100); assert.equal(world.currentSceneId,'1-1');
  }
});
test('acceptance requires current location and chapter, mainline aftermath and live fights block side actions', () => {
  const {world,character}=fresh(); assert.equal(availableSidequests(world).length,2);
  world.currentLocationId='location_001'; assert.throws(()=>chooseSidequest(world,character,'sq01','accept'));
  world.currentLocationId='location_018'; world.zhaoye.aftermath={text:'尚待回話'}; assert.equal(availableSidequests(world).length,0);
  delete world.zhaoye.aftermath; world.zhaoye.activeBattle={}; assert.equal(availableSidequests(world).length,0);
});
test('unfinished quests close at chapter exit without killing anyone; waiting cross-chapter arcs persist', () => {
  let {world,character}=fresh(); chooseSidequest(world,character,'sq02','accept');
  const c=chooseSidequest(world,character,'sq02','battle'); sidequestBattleAction(world,c); settleSidequestBattle(world,c,{finished:'victory'}); chooseSidequest(world,character,'sq02','continue');
  closeChapterSidequests(world,1); assert.equal(world.zhaoye.sidequests.sq01.status,'closed'); assert.equal(world.zhaoye.sidequests.sq02.status,'waiting');
  for(let chapter=2;chapter<=8;chapter++)closeChapterSidequests(world,chapter);
  assert.deepEqual(world.zhaoye.fates,{}); assert.equal(character.moneyWen,0); assert.equal(world.zhaoye.sidequests.sq02.status,'closed'); validateSidequests(world);
});
test('permanent fates prohibit recruitment, remove actors and provide substitutes throughout later scenes and fame', () => {
  let {world,character}=fresh();
  for(const [id,outcome] of [['sq02','return'],['sq03','sacrifice'],['sq05','sacrifice'],['sq07','sacrifice'],['sq10','burn']])world=completeQuest(world,character,SIDEQUESTS.find(q=>q.id===id),outcome);
  const engine=new GameEngine({world,character,content:{}});
  for(const [id,name] of Object.entries(COMPANION_NAMES)) {
    assert.equal(canRecruit({id},world),false); dismissNpc(world,id); assert.equal(canRecruit({id},world),false); assert.ok(!world.party.npcIds.includes(id));
    for(const scene of Object.values(ZHAOYE_SCENES).filter(s=>s.chapter>=6)) {
      world.chapter=scene.chapter; world.currentSceneId=scene.id; world.currentLocationId=ZHAOYE_LOCATION_IDS[scene.chapter-1];
      const text=engine.sceneView().text; assert.ok(!text.includes(name+'：「'),scene.id); assert.ok(!text.includes(name+'說'),scene.id);
      if(scene.text.includes(name))assert.ok(text.includes(STAND_INS[id]),scene.id);
    }
  }
  assert.match(journeyEnemyDefinitions('flow_fame',{stats:{},skillIds:[]},world)[0].name,/程野/);
  world.currentLocationId='location_005'; assert.ok(availableJourneyEvents(world).every(e=>!e.text.includes('葉停舟')));
  world.currentSceneId='5-2C';world.chapter=5;assert.match(engine.sceneView().title,/記事/);assert.ok(!engine.sceneView().choices.some(c=>c.label.includes('問他')));
  world.currentSceneId='6-2B';world.chapter=6;assert.match(engine.sceneView().title,/記事/);assert.ok(!engine.sceneView().choices.some(c=>c.label.includes('請沈')));
});
test('a real rescue fight reloads with the same RNG, objectives and mainline cursor', () => {
  const {world,character}=fresh(); chooseSidequest(world,character,'sq01','accept');const choice=chooseSidequest(world,character,'sq01','battle');
  const hero=makeNpcCompanion({id:'npc_001',name:'測試主角'},[],1);
  const enemy=makeEnemy(sidequestEnemyDefinition(choice,1,{phases:[],skillIds:[]}),[],1);
  const battle=new BattleSystem({party:[hero],enemies:[enemy],rng:new SeededRng('rescue')});battle.onScenarioAction=()=>sidequestBattleAction(world,choice);
  battle.submit({type:'objective'}); world.zhaoye.selectedSidequest='sq01'; world.zhaoye.activeBattle=packBattle(battle,choice); const w=reload(world),restored=restoreBattle(w.zhaoye.activeBattle);
  restored.battle.onScenarioAction=()=>sidequestBattleAction(w,restored.choice);
  assert.equal(w.zhaoye.sidequests.sq01.actions,1);assert.equal(restored.battle.round,battle.round);assert.deepEqual(restored.battle.rng.snapshot(),battle.rng.snapshot());
  while(!restored.battle.finished)restored.battle.submit({type:'attack',targetId:restored.battle.enemies[0].id});
  assert.equal(restored.battle.finished,'victory');settleSidequestBattle(w,restored.choice,restored.battle);delete w.zhaoye.activeBattle;assert.equal(w.zhaoye.sidequests.sq01.step,2);assert.equal(w.currentSceneId,'1-1');
});
test('forged rewards, missing battles and inconsistent fates are rejected', () => {
  const {world}=fresh(); world.zhaoye.sidequestRewards=['sq01']; assert.throws(()=>validateSidequests(world));
  world.zhaoye.sidequestRewards=[];world.zhaoye.sidequests.sq01={status:'active',step:2,choices:[],battles:[],actions:0};assert.throws(()=>validateSidequests(world));
  world.zhaoye.sidequests={};world.zhaoye.fates.npc_001={status:'dead',questId:'sq01'};assert.throws(()=>validateSidequests(world));
});
test('mainline reversal is planted before chapter five and map/journal reveal only unlocked quests', () => {
  assert.match(OPENING_REWRITE,/早兩天/);assert.match(NARRATIVE_REWRITE['1-4'],/下一站/);assert.match(NARRATIVE_REWRITE['4-4'],/名冊相同/);assert.match(NARRATIVE_REWRITE['5-3'],/人證集中/);assert.match(NARRATIVE_REWRITE['6-3'],/改成除/);
  const {world}=fresh();assert.equal(sidequestMapLabels(world,'location_018').length,2);const journal=sidequestJournal(world);assert.match(journal,/湯涼之前/);assert.doesNotMatch(journal,/第十九雙新鞋/);
  assert.doesNotMatch(journal,/追問下一站/);
  const character={moneyWen:0};chooseSidequest(world,character,'sq01','accept');const fight=chooseSidequest(world,character,'sq01','battle');sidequestBattleAction(world,fight);settleSidequestBattle(world,fight,{finished:'victory'});
  assert.match(sidequestJournal(world),/追問下一站/);assert.deepEqual(world.zhaoye.evidence,{E1:'missing',E2:'missing',E3:'missing',E4:'missing'});
});

test('whole campaigns finish with all quests skipped, all safe outcomes and all five permanent absences', () => {
  for (const mode of ['skip','safe','permanent']) {
    let {world,character}=fresh();world.currentSceneId='1-0';let steps=0;
    while(!world.flags.game_complete || world.zhaoye.aftermath) {
      assert.ok(++steps<1000,mode);
      if(mode!=='skip') for(const q of availableSidequests(world)) {
        const cursor=world.currentSceneId;
        if(!world.zhaoye.sidequests[q.id])chooseSidequest(world,character,q.id,'accept');
        while(true) {
          const p=world.zhaoye.sidequests[q.id],node=q.scenes[p.step];
          if(node.chapter>world.chapter || p.status==='completed')break;
          if(node.battle) {
            const c=chooseSidequest(world,character,q.id,'battle');
            settleSidequestBattle(world,c,{finished:'defeat'});
            const retry=chooseSidequest(world,character,q.id,'battle');
            for(const objective of node.battle.objectives)sidequestBattleAction(world,retry);
            settleSidequestBattle(world,retry,{finished:'victory'});
          } else if(node.outcomes) {
            const o=mode==='permanent'?node.outcomes.find(o=>o.fate)??node.outcomes[0]:node.outcomes[0];
            chooseSidequest(world,character,q.id,o.id);
            if(o.danger){world=reload(world);chooseSidequest(world,character,q.id,'confirm');}
          } else chooseSidequest(world,character,q.id,'continue');
          world=reload(world);assert.equal(world.currentSceneId,cursor);
        }
      }
      const engine=new GameEngine({world,character,content:{}}),view=engine.sceneView();
      for(const [id,name] of Object.entries(COMPANION_NAMES))if(world.zhaoye.fates[id])assert.ok(!view.text.includes(name+'：「'),world.currentSceneId);
      const choices=view.choices.filter(c=>!c.disabled);
      const c=choices.find(c=>['continue','operate','conclude'].includes(c.id))??choices.find(c=>c.id.startsWith('fulfil:'))??choices.find(c=>c.id==='next-chapter')??choices[0];
      assert.ok(c,world.currentSceneId);const r=engine.choose(c.id);
      if(r.battle){for(const objective of engine.battleProgress().objectives)engine.battleAction('objective',1);engine.finishBattle(r,'victory');}
      world=reload(world);character=structuredClone(character);
    }
    assert.equal(world.zhaoye.rewards.length,8);
    assert.equal(world.zhaoye.sidequestRewards.length,mode==='skip'?0:12);
    assert.equal(Object.keys(world.zhaoye.fates).length,mode==='permanent'?5:0);
    assert.ok(Object.values(world.zhaoye.sidequests).every(p=>p.status===(mode==='skip'?'closed':'completed')));
    if(mode!=='skip')assert.equal(world.zhaoye.oldCaseSubmitted,true);
  }
});
