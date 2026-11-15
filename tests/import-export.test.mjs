import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createExportBundle, parseImport } from '../src/persistence/import-export.js';
import { clearAllSaves, importSaves, loadSlot, saveGame, getAllSaves, listSlots, LAST_SLOT_KEY } from '../src/persistence/save-service.js';
import { put, get, getAll } from '../src/persistence/indexeddb.js';
import { sha256 } from '../src/persistence/checksum.js';
import { migrateSave } from '../src/core/migrations.js';
import { validateRevengeWorld } from '../src/persistence/revenge-save-validation.js';
import { createWorld } from '../src/core/game-engine.js';
import { createTenChapterState, TenChapterEngine } from '../src/core/revenge-engine.js';
import { createZhaoyeState } from '../src/core/zhaoye-engine.js';
import { createRevengeEncounter } from '../src/systems/revenge-battle.js';
import { BattleSystem, makePlayerCombatant, makeEnemy } from '../src/systems/battle-system.js';
import { packBattle, restoreBattle } from '../src/persistence/battle-snapshot.js';
import { SeededRng } from '../src/core/rng.js';
import { GAME_VERSION, SCHEMA_VERSION } from '../src/config/constants.js';
const story=JSON.parse(fs.readFileSync(new URL('../src/data/revenge-story.json',import.meta.url),'utf8'));
const data=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8')).data;
const content={revengeStory:story,skills:data('skills'),enemies:data('enemies')};
function fresh(id='w1',characterId='c1'){
  const character={id:characterId,name:'備份俠客',homeWorldId:id,stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},talents:['talent_001','talent_002','talent_003'],equippedSkills:['skill_001'],skills:{},moneyWen:100,cultivation:0};
  const world={...createWorld({name:'十章備份',startingCountry:'dasheng',ownerCharacterId:characterId,seed:'backup'}),id,zhaoye:createTenChapterState(story)};
  return {world,character,engine:new TenChapterEngine({world,character,content})};
}
function step(run,variant=0){const options=run.engine.sceneView().choices;const result=run.engine.choose(options[variant%options.length].id);if(result.battle)run.engine.finishBattle(result,'victory');return result;}
function seek(run,predicate,variant=0){for(let i=0;i<1500;i++){if(predicate(run))return;step(run,variant);}assert.fail('target not reached');}
async function signed(worlds,characters,schemaVersion=5){const payload={format:'jianghu-save',schemaVersion,gameVersion:GAME_VERSION,worlds,characters,settings:{}};return {...payload,checksum:await sha256(payload)};}
function activeFight(){
 const run=fresh();seek(run,r=>r.engine.needsBattle());const choice=run.engine.choose(run.engine.sceneView().choices[0].id);
 const built=createRevengeEncounter({encounterId:choice.revengeEncounter,chapter:run.world.chapter,content,world:run.world});
 const battle=new BattleSystem({party:[makePlayerCombatant(run.character,content.skills)],enemies:[makeEnemy(built.enemyDef,content.skills,1)],rng:new SeededRng('backup-fight'),scenario:built.scenario});
 battle.submit({type:'observe',targetId:battle.enemies[0].id});
 run.world.zhaoye.activeBattle=packBattle(battle,choice,{skill_001:1});return {...run,battle,choice};
}

test.before(()=>{if(!globalThis.localStorage){const values=new Map();globalThis.localStorage={setItem:(key,value)=>values.set(key,String(value)),getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key)};}});
test.beforeEach(async()=>clearAllSaves());

test('schema five export round trip verifies checksum and ten-chapter references',async()=>{
 const run=fresh();seek(run,r=>r.world.chapter===10);
 const exported=await createExportBundle({worlds:[run.world],characters:[run.character],settings:{textSize:'standard'}});
 assert.equal(exported.schemaVersion,5);assert.equal(exported.gameVersion,GAME_VERSION);
 const parsed=await parseImport(JSON.stringify(exported));assert.equal(parsed.summary.worlds,1);assert.equal(parsed.bundle.worlds[0].chapter,10);assert.deepEqual(parsed.bundle.worlds[0].zhaoye,run.world.zhaoye);
});
test('tampered export and unsafe keys are rejected before restoration',async()=>{
 const {world,character}=fresh(),exported=await createExportBundle({worlds:[world],characters:[character]});exported.worlds[0].id='tampered';
 await assert.rejects(()=>parseImport(JSON.stringify(exported)),/校驗失敗/);
 await assert.rejects(()=>parseImport('{"format":"jianghu-save","schemaVersion":5,"worlds":[],"characters":[],"settings":{"__proto__":{"polluted":true}}}'),/不安全欄位/);
});
test('invalid references and duplicate records fail before any import writes',async()=>{
 const {world,character}=fresh(),other={...structuredClone(world),id:'w2',ownerCharacterId:'missing'};
 for(const worlds of [[world,other],[world,world]]){
  const bundle=await signed(worlds,[character]);await assert.rejects(()=>parseImport(JSON.stringify(bundle)));await assert.rejects(()=>importSaves(bundle));
  assert.deepEqual(await getAll('worldSaves'),[]);assert.deepEqual(await getAll('characterSaves'),[]);
 }
});
test('clear then import creates an independent v3 recovery slot',async()=>{
 const {world,character}=fresh(),bundle=await createExportBundle({worlds:[world],characters:[character]});
 const {bundle:parsed}=await parseImport(JSON.stringify(bundle));assert.equal((await importSaves(parsed)).restoredSlots,1);
 const restored=await loadSlot('v3_manual_0');assert.equal(restored.world.id,'w1');assert.equal(restored.character.id,'c1');
 assert.equal(localStorage.getItem(LAST_SLOT_KEY),'v3_manual_0');assert.equal((await listSlots())[0].compatible,true);
});
test('revision-two local records remain intact and are never loadable or exported',async()=>{
 const run=fresh(),oldWorld={...structuredClone(run.world),id:'old-world',ownerCharacterId:'old-character',zhaoye:createZhaoyeState()};
 const oldCharacter={...structuredClone(run.character),id:'old-character',homeWorldId:'old-world'};
 const snapshot={id:'old-snapshot',schemaVersion:4,status:'complete',world:oldWorld,character:oldCharacter};
 await put('worldSaves',oldWorld);await put('characterSaves',oldCharacter);await put('snapshots',snapshot);await put('saveSlots',{slotId:'v2_auto_0',schemaVersion:4,snapshotId:snapshot.id,savedAt:'2020-01-01'});
 localStorage.setItem('zhaoye:lastSlot:v2','v2_auto_0');await assert.rejects(()=>loadSlot('v2_auto_0'),/重新創角/);
 await saveGame(run);assert.deepEqual(await get('snapshots','old-snapshot'),snapshot);assert.deepEqual(await get('worldSaves','old-world'),oldWorld);
 assert.equal(localStorage.getItem('zhaoye:lastSlot:v2'),'v2_auto_0');assert.equal(localStorage.getItem(LAST_SLOT_KEY),'v3_auto_0');
 const slots=await listSlots();assert.equal(slots.find(s=>s.slotId==='v2_auto_0').compatible,false);assert.equal(slots.find(s=>s.slotId==='v3_auto_0').compatible,true);
 const exported=await getAllSaves();assert.equal(exported.schemaVersion,5);assert.deepEqual(exported.worlds.map(w=>w.id),['w1']);assert.deepEqual(exported.characters.map(c=>c.id),['c1']);
});
test('schema four, old revisions and future schemas cannot be relabelled or partially imported',async()=>{
 const {world,character}=fresh();
 for(const version of [1,2,3,4,6]){const bundle=await signed([world],[character],version);await assert.rejects(()=>parseImport(JSON.stringify(bundle)));await assert.rejects(()=>importSaves(bundle));}
 for(const revision of [1,2,4]){const altered=structuredClone(world);altered.zhaoye.storyRevision=revision;const bundle=await signed([altered],[character]);await assert.rejects(()=>parseImport(JSON.stringify(bundle)),/重新創角/);await assert.rejects(()=>saveGame({world:altered,character}),/重新創角/);}
 assert.deepEqual(await getAll('worldSaves'),[]);
});
test('new saves and imports cannot overwrite legacy worlds or reuse old character identities',async()=>{
 const run=fresh(),oldWorld={...structuredClone(run.world),zhaoye:createZhaoyeState()};await put('worldSaves',oldWorld);await put('characterSaves',run.character);
 await assert.rejects(()=>saveGame(run),/不能覆寫/);
 const bundle=await signed([run.world],[run.character]);await assert.rejects(()=>importSaves(bundle),/不能覆寫/);assert.deepEqual(await get('worldSaves','w1'),oldWorld);assert.deepEqual(await getAll('snapshots'),[]);
});
test('only integer in-range v3 slots can be written or loaded',async()=>{
 const run=fresh();for(const index of [-1,.5,NaN,Infinity,'0',3])await assert.rejects(()=>saveGame({...run,index}));
 await assert.rejects(()=>saveGame({...run,type:'other'}));await assert.rejects(()=>loadSlot('v3_auto_00'));await assert.rejects(()=>loadSlot('v2_auto_0'));assert.deepEqual(await getAll('snapshots'),[]);
});
test('snapshot-slot mismatches and corrupted current saves are listed incompatible without deletion',async()=>{
 const run=fresh(),snapshot=await saveGame(run),slot=await get('saveSlots','v3_auto_0');slot.worldId='another';await put('saveSlots',slot);
 await assert.rejects(()=>loadSlot(slot.slotId),/不相符/);assert.equal((await listSlots())[0].compatible,false);assert.deepEqual(await get('snapshots',snapshot.id),snapshot);
});
test('both complete paths validate after every choice, battle result and chapter transition',()=>{
 for(const variant of [0,1]){const run=fresh();let steps=0;while(!run.world.flags.game_complete){assert.ok(++steps<1500);const options=run.engine.sceneView().choices;const result=run.engine.choose(options[variant%options.length].id);validateRevengeWorld(run.world);if(result.battle){run.engine.finishBattle(result,'victory');validateRevengeWorld(run.world);}}assert.equal(run.world.chapter,10);assert.deepEqual(run.world.zhaoye.rewards,[1,2,3,4,5,6,7,8,9,10]);}
});
test('future cursors, flags, rewards, encounters and malformed histories fail all entry points',async()=>{
 const mutations=[w=>{w.chapter=10;w.currentSceneId=w.zhaoye.cursor=story.chapters[9].scenes[0].id;},w=>{w.zhaoye.choices.c10_approach='inside';},w=>{w.zhaoye.choices.injected='yes';},w=>{w.zhaoye.rewards=[10];},w=>{w.zhaoye.completedEncounters=['xie-final'];},w=>{w.zhaoye.events['10-08']={status:'completed'};},w=>{w.zhaoye.history=['01-01'];},w=>{w.flags.game_complete=true;},w=>{w.chapter=11;},w=>{w.zhaoye.cursor='01-999';}];
 for(const mutate of mutations){const {world,character}=fresh();mutate(world);await assert.rejects(()=>saveGame({world,character}));const bundle=await signed([world],[character]);await assert.rejects(()=>parseImport(JSON.stringify(bundle)));await assert.rejects(()=>importSaves(bundle));}
 assert.deepEqual(await getAll('snapshots'),[]);
});
test('old sidequest, journey, evidence and unsupported fate state cannot contaminate v3',async()=>{
 for(const mutate of [w=>{w.zhaoye.sidequests.sq01={status:'active'};},w=>{w.zhaoye.journey.stage=1;},w=>{w.zhaoye.evidence.E1='verified';},w=>{w.zhaoye.selectedSidequest='sq01';},w=>{w.zhaoye.fates.npc_002={status:'dead'};}]){const {world,character}=fresh();mutate(world);await assert.rejects(()=>saveGame({world,character}));}
});
test('new campaign active battle survives JSON, import and load with exact RNG state',async()=>{
 const run=activeFight(),exported=await createExportBundle({worlds:[run.world],characters:[run.character]}),parsed=await parseImport(JSON.stringify(exported));
 await importSaves(parsed.bundle);const saved=await loadSlot('v3_manual_0'),restored=restoreBattle(saved.world.zhaoye.activeBattle);
 assert.deepEqual(restored.battle.snapshot(),run.battle.snapshot());assert.deepEqual(restored.battle.rng.snapshot(),run.battle.rng.snapshot());assert.deepEqual(restored.choice,run.choice);assert.deepEqual(restored.skillUses,{skill_001:1});assert.deepEqual(saved.world.zhaoye.completedEncounters,[]);
});
test('battle snapshots reject future scenarios, stale attempts and old sidequest descriptors',async()=>{
 for(const mutate of [w=>{w.zhaoye.activeBattle.scenario.chapter=10;},w=>{w.zhaoye.activeBattle.choice.revengeAttempt++;},w=>{w.zhaoye.activeBattle.choice.eventId='10-06';},w=>{w.zhaoye.activeBattle.choice.questId='sq01';},w=>{w.zhaoye.activeBattle.scenario.objectiveProgress=999;}]){const run=activeFight();mutate(run.world);const bundle=await signed([run.world],[run.character]);await assert.rejects(()=>parseImport(JSON.stringify(bundle)));await assert.rejects(()=>saveGame(run));}
});
test('defeated attempts remain retryable while victory persists once without replaying rewards',async()=>{
 const run=fresh();seek(run,r=>r.engine.needsBattle());let choice=run.engine.choose(run.engine.sceneView().choices[0].id);run.engine.finishBattle(choice,'defeat');await saveGame(run);
 const restored=await loadSlot('v3_auto_0');const engine=new TenChapterEngine({...restored,content});choice=engine.choose(engine.sceneView().choices[0].id);assert.equal(choice.revengeAttempt,2);engine.finishBattle(choice,'victory');await saveGame({world:restored.world,character:restored.character});assert.deepEqual(restored.world.zhaoye.completedEncounters,[choice.revengeEncounter]);assert.equal(restored.world.zhaoye.rewards.length,0);
});
test('valid travel locations and beggar flags survive without accepting unknown flags',async()=>{
 const run=fresh();run.world.currentLocationId='location_010';run.world.flags.beggar_rumor_location_010=true;await saveGame(run);assert.equal((await loadSlot('v3_auto_0')).world.currentLocationId,'location_010');run.world.flags.beggar_rumor_location_999=true;await assert.rejects(()=>saveGame(run));
});
test('schema version constants reject malformed numeric versions',()=>{assert.equal(SCHEMA_VERSION,5);for(const schemaVersion of [undefined,'5',5.1,NaN])assert.throws(()=>migrateSave({schemaVersion,worlds:[],characters:[]}));});

test('a malformed local v3 cursor is rejected by load and excluded from exports without deletion',async()=>{
 const run=fresh(),snapshot=await saveGame(run);snapshot.world.chapter=10;snapshot.world.currentSceneId=snapshot.world.zhaoye.cursor=story.chapters[9].scenes[0].id;
 await put('snapshots',snapshot);await put('worldSaves',snapshot.world);
 await assert.rejects(()=>loadSlot('v3_auto_0'),/游標超前|路徑/);assert.equal((await listSlots())[0].compatible,false);
 assert.deepEqual((await getAllSaves()).worlds,[]);assert.deepEqual(await get('snapshots',snapshot.id),snapshot);
});
test('ordinary road combat can be saved while the manuscript cursor remains unchanged',async()=>{
 const run=fresh();run.world.currentLocationId='location_010';
 const definition={...content.enemies[0],id:'enemy_901',tier:'elite'},battle=new BattleSystem({party:[makePlayerCombatant(run.character,content.skills)],enemies:[makeEnemy(definition,content.skills,1)],rng:new SeededRng('road-backup')});
 run.world.zhaoye.activeBattle=packBattle(battle,{roadEncounter:true,locationId:'location_010',enemyLevel:1});
 const {bundle}=await parseImport(JSON.stringify(await createExportBundle({worlds:[run.world],characters:[run.character]})));await importSaves(bundle);
 const loaded=await loadSlot('v3_manual_0');assert.equal(loaded.world.zhaoye.cursor,run.world.zhaoye.cursor);assert.equal(restoreBattle(loaded.world.zhaoye.activeBattle).choice.roadEncounter,true);
 loaded.world.zhaoye.activeBattle.choice.locationId='location_018';await assert.rejects(()=>saveGame(loaded),/旅行戰鬥/);
});
test('unsafe cyclic objects and malformed battle collections fail closed',async()=>{
 const run=fresh();run.world.circular=run.world;await assert.rejects(()=>saveGame(run),/循環/);
 for(const mutate of [w=>{w.zhaoye.activeBattle.party[0].skills={};},w=>{w.zhaoye.activeBattle.skillUses.skill_001=-1;},w=>{w.zhaoye.activeBattle.log.push({bad:true});}]){
  const battleRun=activeFight();mutate(battleRun.world);await assert.rejects(()=>saveGame(battleRun));
 }
});
