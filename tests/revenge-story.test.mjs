import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TenChapterEngine, createTenChapterState, renderRevengeText } from '../src/core/revenge-engine.js';
import { canRecruit } from '../src/systems/npc-system.js';

const story = JSON.parse(fs.readFileSync(new URL('../src/data/revenge-story.json', import.meta.url), 'utf8'));
const content = { revengeStory:story };
const rows = story.chapters.flatMap(chapter => chapter.scenes);
const match = (scene, flags) => Object.entries(scene.when ?? {}).every(([key,value]) => flags[key] === value);

function fresh(campaign = story) {
  const world = {
    id:'test-world', ownerCharacterId:'hero', chapter:1, flags:{}, quests:{},
    currentSceneId:campaign.chapters[0].scenes[0].id, currentLocationId:'location_002',
    clock:{day:1, segment:'evening'}, visitedLocations:[],
    party:{playerIds:['hero'], npcIds:['npc_001', 'npc_004']}, npcStates:{npc_004:{availability:'party'}},
    zhaoye:createTenChapterState(campaign),
  };
  const character = { id:'hero', moneyWen:0, cultivation:0 };
  return { world, character, engine:new TenChapterEngine({world, character, content:{revengeStory:campaign}}) };
}

function reload(run, campaign = story) {
  run.world = JSON.parse(JSON.stringify(run.world));
  run.character = JSON.parse(JSON.stringify(run.character));
  run.engine = new TenChapterEngine({world:run.world, character:run.character, content:{revengeStory:campaign}});
  return run;
}

function enterNext(run, variant = 0) {
  const {engine} = run, view = engine.sceneView();
  const options = view.choices;
  const selected = options.length > 1 ? options[variant % options.length] : options[0];
  assert.ok(selected, `no action at ${run.world.currentSceneId}`);
  const result = engine.choose(selected.id);
  if (result.battle) engine.finishBattle(result, 'victory');
  return { result, selected, view };
}

function seek(run, predicate, variant = 0) {
  for (let i = 0; i < 1500; i++) {
    if (predicate(run)) return;
    enterNext(run, variant);
  }
  assert.fail('target scene was not reached');
}

test('manuscript rendering hides notes, unselected blocks and post-choice common results', () => {
  const text = '前言\n\n> 作者註記：不公開\n\n### [road=left]\n左路所見\n### [road=right]\n右路所見\n### 共通\n選後才到的共同結果';
  assert.equal(renderRevengeText(text, {}, {pendingFlag:'road'}), '前言');
  assert.equal(renderRevengeText(text, {road:'left'}), '前言\n\n左路所見\n選後才到的共同結果');
  assert.doesNotMatch(renderRevengeText(text, {road:'right'}), /註記|左路|###/);
});

test('both complete authored routes survive JSON reload at every action and reach chapter ten', () => {
  for (const variant of [0, 1]) {
    const run = fresh(), seen = [], battles = [], chapterRewards = [];
    let steps = 0;
    while (!run.world.flags.game_complete) {
      assert.ok(++steps < 1500, 'no narrative deadlocks');
      const before = run.world.currentSceneId;
      const raw = rows.find(scene => scene.id === before);
      const view = run.engine.sceneView();
      assert.doesNotMatch(view.text, /^\s*>|^### /m);
      assert.ok(!run.world.party.npcIds.some(id => !['npc_001', 'npc_002', 'npc_003'].includes(id)));
      if (view.choices[0]?.id.startsWith('battle:')) {
        assert.doesNotMatch(view.text, /死亡|劍送進|跪下仍/);
        assert.notEqual(view.text, renderRevengeText(raw.text, run.world.zhaoye.choices));
      }
      const choice = view.choices[view.choices.length > 1 ? variant : 0];
      assert.ok(choice, before);
      const result = run.engine.choose(choice.id);
      if (choice.id.startsWith('continue:')) seen.push(before);
      if (result.complete) chapterRewards.push(result.completedChapter);
      if (result.battle) {
        const encounterScenes = rows.filter(scene => scene.encounter === result.revengeEncounter && match(scene, run.world.zhaoye.choices));
        assert.equal(result.eventId, (result.revengeEncounter==='xie-final'?encounterScenes.at(-1):encounterScenes[0]).id, 'battle gates encounter prose; final duel follows its tactical choice');
        battles.push(result.revengeEncounter);
        reload(run);
        assert.equal(run.world.zhaoye.battle.status, 'active');
        run.engine.battleAction('objective', 1);
        run.engine.finishBattle(result, 'victory');
        assert.equal(run.world.currentSceneId, before, 'victory unlocks current text without auto-reading it');
        assert.equal(run.world.zhaoye.battle, null);
      }
      reload(run);
    }
    const {world,character} = run, flags = world.zhaoye.choices;
    const expected = rows.filter(scene => match(scene, flags)).map(scene => scene.id);
    assert.deepEqual(world.zhaoye.history, expected);
    assert.deepEqual(world.zhaoye.readSceneIds, expected);
    assert.deepEqual(seen, expected);
    assert.deepEqual(chapterRewards, [1,2,3,4,5,6,7,8,9,10]);
    assert.deepEqual(world.zhaoye.rewards, chapterRewards);
    assert.equal(character.moneyWen, 13750);
    assert.equal(character.cultivation, 5500);
    assert.equal(world.chapter, 10);
    assert.equal(world.zhaoye.chapterSafe, true);
    assert.deepEqual(run.engine.sceneView().choices, []);
    assert.equal(new Set(battles).size, battles.length);
    assert.deepEqual(new Set(world.zhaoye.completedEncounters), new Set(battles));
    assert.ok(world.zhaoye.history.some(id => id.startsWith('10-')));
    if (flags.cheng === 'leave') {
      assert.ok(!world.party.npcIds.includes('npc_003'));
      assert.equal(world.npcStates.npc_003.permanent, true);
      assert.equal(canRecruit({id:'npc_003'}, world), false);
      assert.ok(expected.includes('09-04') && !expected.includes('09-03'));
    } else {
      assert.ok(world.party.npcIds.includes('npc_003'));
      assert.ok(expected.includes('09-03') && !expected.includes('09-04'));
    }
  }
});

test('choice stays on its scene, survives reload, exposes one result and rejects stale clicks', () => {
  const campaign = {
    revision:3, flags:{road:['left','right']}, chapters:[{chapter:1,title:'試章',place:'試場',locationId:'test-place',scenes:[
      {id:'01-01',title:'選路',text:'先決定\n### [road=left]\n左路獨有\n### [road=right]\n右路獨有\n### 共通\n兩路都已走完這一刻',choice:{flag:'road',options:[{value:'left',label:'走左路'},{value:'right',label:'走右路'}]}},
      {id:'01-02',title:'後續',text:'下一頁'},
    ]}],
  };
  const run = fresh(campaign), original = run.engine.sceneView();
  assert.equal(original.text, '先決定');
  run.engine.choose(original.choices[0].id);
  assert.equal(run.world.currentSceneId, '01-01');
  assert.deepEqual(run.world.zhaoye.history, []);
  reload(run, campaign);
  assert.match(run.engine.sceneView().text, /左路獨有/);
  assert.doesNotMatch(run.engine.sceneView().text, /右路獨有/);
  assert.throws(() => run.engine.choose(original.choices[0].id), /已變更/);
  const next = run.engine.sceneView().choices[0].id;
  run.engine.choose(next);
  assert.equal(run.world.currentSceneId, '01-02');
  assert.throws(() => run.engine.choose(next), /已變更/);
});

test('battle defeat retries the same scene; repeated actions and settlements cannot award progress twice', () => {
  const run = fresh();
  seek(run, run => run.engine.sceneView().choices[0]?.id.startsWith('battle:'));
  const id = run.world.currentSceneId, history = [...run.world.zhaoye.history];
  const startId = run.engine.sceneView().choices[0].id;
  const first = run.engine.choose(startId);
  assert.throws(() => run.engine.choose(startId), /已變更/);
  assert.equal(run.engine.battleAction('objective', 1), true);
  assert.equal(run.engine.battleAction('objective', 1), false);
  assert.equal(run.engine.battleProgress().done, 1);
  run.engine.finishBattle(first, 'defeat');
  assert.equal(run.world.currentSceneId, id);
  assert.deepEqual(run.world.zhaoye.history, history);
  assert.equal(run.world.zhaoye.completedEncounters.length, 0);
  assert.deepEqual(run.engine.finishBattle(first, 'defeat'), {duplicate:true});
  reload(run);
  const retry = run.engine.choose(run.engine.sceneView().choices[0].id);
  assert.equal(retry.revengeAttempt, 2);
  assert.equal(run.engine.battleProgress().done, 0);
  assert.throws(() => run.engine.finishBattle(first, 'victory'), /已變更/);
  run.engine.finishBattle(retry, 'victory');
  assert.deepEqual(run.engine.finishBattle(retry, 'victory'), {duplicate:true});
  assert.deepEqual(run.world.zhaoye.completedEncounters, [retry.revengeEncounter]);
  assert.deepEqual(run.world.zhaoye.rewards, []);
  const continueId = run.engine.sceneView().choices[0].id;
  run.engine.choose(continueId);
  assert.throws(() => run.engine.choose(continueId), /已變更/);
});

test('chapter rewards are atomic, chapter ten does not complete early, and safe points survive reload', () => {
  const run = fresh();
  seek(run, run => run.world.zhaoye.chapterSafe);
  assert.deepEqual(run.world.zhaoye.rewards, [1]);
  assert.equal(run.character.moneyWen, 250);
  reload(run);
  const go = run.engine.sceneView().choices[0].id;
  run.engine.choose(go);
  assert.equal(run.world.chapter, 2);
  assert.equal(run.world.currentLocationId, story.chapters[1].locationId);
  assert.throws(() => run.engine.choose(go), /已變更/);
  seek(run, run => run.world.chapter === 10);
  assert.ok(!run.world.flags.game_complete);
  assert.deepEqual(run.world.zhaoye.rewards, [1,2,3,4,5,6,7,8,9]);
  seek(run, run => run.world.flags.game_complete);
  assert.equal(run.character.moneyWen, 13750);
});

test('companions join at authored milestones and leaving Cheng remains permanent after reload', () => {
  const run = fresh();
  assert.deepEqual(run.world.party.npcIds, []);
  assert.equal(canRecruit({id:'npc_003'}, run.world), false);
  assert.equal(canRecruit({id:'npc_004'}, run.world), false);
  seek(run, run => run.world.currentSceneId === '01-03');
  assert.deepEqual(run.world.party.npcIds, ['npc_001']);
  seek(run, run => run.world.currentSceneId === '02-02');
  assert.ok(!run.world.party.npcIds.includes('npc_002'));
  while(run.world.currentSceneId==='02-02')enterNext(run);
  assert.ok(run.world.party.npcIds.includes('npc_002'));
  seek(run, run => run.world.currentSceneId === '02-04');
  assert.deepEqual(run.world.party.npcIds, ['npc_001','npc_002','npc_003']);
  seek(run, run => run.world.currentSceneId === '08-07');
  const leave = run.engine.sceneView().choices.find(choice => choice.id.endsWith(':leave'));
  run.engine.choose(leave.id);
  assert.ok(!run.world.party.npcIds.includes('npc_003'));
  run.world.party.npcIds.push('npc_003');
  reload(run);
  assert.ok(!run.world.party.npcIds.includes('npc_003'));
  assert.equal(canRecruit({id:'npc_003'}, run.world), false);
});

test('travelling away pauses reading and returning does not consume a scene', () => {
  const run = fresh();
  enterNext(run);
  const id = run.world.currentSceneId, history = [...run.world.zhaoye.history];
  run.world.currentLocationId = 'some-other-place';
  const away = run.engine.sceneView();
  assert.equal(away.locationLocked, true);
  assert.equal(away.choices.length, 1);
  assert.throws(() => run.engine.choose(`continue:${id}:read`), /已變更/);
  run.engine.choose(away.choices[0].id);
  assert.equal(run.world.currentSceneId, id);
  assert.equal(run.world.currentLocationId, story.chapters[0].locationId);
  assert.deepEqual(run.world.zhaoye.history, history);
});

test('revision two and missing runtime data are rejected instead of silently migrating a campaign', () => {
  const run = fresh();
  run.world.zhaoye.storyRevision = 2;
  assert.throws(() => new TenChapterEngine({...run,content}), /版本不同/);
  assert.throws(() => new TenChapterEngine({...run,content:{}}), /尚未載入/);
});
