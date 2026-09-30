import test from "node:test";
import assert from "node:assert/strict";
import { createExportBundle, parseImport } from "../src/persistence/import-export.js";
import { clearAllSaves, importSaves, loadSlot, saveGame, getAllSaves, listSlots } from "../src/persistence/save-service.js";
import { put, get } from '../src/persistence/indexeddb.js';
import { sha256 } from '../src/persistence/checksum.js';
import { createWorld } from '../src/core/game-engine.js';
import { createZhaoyeState } from '../src/core/zhaoye-engine.js';
import { chooseSidequest, sidequestBattleAction } from '../src/systems/sidequest-system.js';
import { BattleSystem, makeNpcCompanion } from '../src/systems/battle-system.js';
import { packBattle, restoreBattle } from '../src/persistence/battle-snapshot.js';
import { SeededRng } from '../src/core/rng.js';

const character={id:"c1",name:"備份俠客",homeWorldId:"w1",stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},talents:["talent_001","talent_002","talent_003"],equippedSkills:["skill_001"]};
const world={...createWorld({name:'備份江湖',startingCountry:'dasheng',ownerCharacterId:'c1',seed:'backup'}),id:'w1',chapter:3,zhaoye:createZhaoyeState(),flags:{chapter_1_complete:true}};

test.before(()=>{if(!globalThis.localStorage){const values=new Map();globalThis.localStorage={setItem:(key,value)=>values.set(key,String(value)),getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key)};}});

test("export round trip verifies checksum and references",async()=>{const bundle=await createExportBundle({worlds:[world],characters:[character],settings:{}});const parsed=await parseImport(JSON.stringify(bundle));assert.equal(parsed.summary.worlds,1);assert.equal(parsed.summary.characters,1);});
test("tampered export is rejected",async()=>{const bundle=await createExportBundle({worlds:[world],characters:[character],settings:{}});bundle.worlds[0].id="tampered";await assert.rejects(()=>parseImport(JSON.stringify(bundle)),/校驗失敗/);});
test("prototype pollution keys are rejected",async()=>{await assert.rejects(()=>parseImport('{"format":"jianghu-save","schemaVersion":1,"checksum":"x","worlds":[],"characters":[],"settings":{"__proto__":{"polluted":true}}}'),/不安全欄位/);});
test("broken world-character references are rejected",async()=>{const bundle=await createExportBundle({worlds:[{...world,ownerCharacterId:"missing"}],characters:[character],settings:{}});await assert.rejects(()=>parseImport(JSON.stringify(bundle)),/找不到房主角色/);});
test("clear then import creates a loadable recovery slot",async()=>{await clearAllSaves();const bundle=await createExportBundle({worlds:[world],characters:[character],settings:{}});const parsed=await parseImport(JSON.stringify(bundle));const result=await importSaves(parsed.bundle);assert.equal(result.restoredSlots,1);const restored=await loadSlot("v2_manual_0");assert.equal(restored.world.id,"w1");assert.equal(restored.character.id,"c1");assert.equal(globalThis.localStorage.getItem("zhaoye:lastSlot:v2"),"v2_manual_0");});

test('old local saves remain intact, cannot load and are excluded from revision-two exports',async()=>{
  await clearAllSaves();
  const oldWorld={...structuredClone(world),id:'old-world',ownerCharacterId:'old-character'};delete oldWorld.zhaoye;
  const oldCharacter={...structuredClone(character),id:'old-character',homeWorldId:'old-world'};
  const oldSnapshot={id:'old-snapshot',schemaVersion:3,status:'complete',world:oldWorld,character:oldCharacter};
  await put('worldSaves',oldWorld);await put('characterSaves',oldCharacter);await put('snapshots',oldSnapshot);
  await put('saveSlots',{slotId:'auto_0',schemaVersion:3,snapshotId:oldSnapshot.id,savedAt:'2020-01-01'});
  await assert.rejects(()=>loadSlot('auto_0'),/重新創角/);
  await saveGame({world,character});
  assert.deepEqual(await get('snapshots','old-snapshot'),oldSnapshot);
  assert.equal((await listSlots()).find(s=>s.slotId==='auto_0').compatible,false);
  const exported=await getAllSaves();assert.equal(exported.schemaVersion,4);
  assert.deepEqual(exported.worlds.map(w=>w.id),['w1']);assert.deepEqual(exported.characters.map(c=>c.id),['c1']);
  assert.deepEqual(await get('worldSaves','old-world'),oldWorld);
});

test('valid-checksum old backups and character reuse cannot bypass restart or partially import',async()=>{
  for(const version of [1,2,3]) {
    const payload={format:'jianghu-save',schemaVersion:version,worlds:[world],characters:[character],settings:{}};
    const bundle={...payload,checksum:await sha256(payload)};
    await assert.rejects(()=>parseImport(JSON.stringify(bundle)),/重新創角/);
    await assert.rejects(()=>importSaves(bundle),/重新創角/);
  }
  const old={...structuredClone(world),id:'forged-old-world'};old.zhaoye.storyRevision=1;
  const bundle=await createExportBundle({worlds:[old],characters:[{...character,homeWorldId:old.id}]});
  await assert.rejects(()=>parseImport(JSON.stringify(bundle)),/重新創角/);
  await assert.rejects(()=>importSaves(bundle),/重新創角/);
  assert.equal(await get('worldSaves','forged-old-world'),undefined);
});

test('revision-four backups restore a running sidequest fight with exact rescue and RNG state',async()=>{
  const w=structuredClone(world);w.chapter=1;w.currentSceneId='1-1';w.currentLocationId='location_018';
  const c=structuredClone(character);chooseSidequest(w,c,'sq01','accept');const choice=chooseSidequest(w,c,'sq01','battle');
  const battle=new BattleSystem({party:[makeNpcCompanion({id:c.id,name:c.name},[],1)],enemies:[makeNpcCompanion({id:'enemy_950',name:'攔信刀客'},[],1)],rng:new SeededRng('backup-fight')});
  battle.onScenarioAction=()=>sidequestBattleAction(w,choice);battle.submit({type:'objective'});
  w.zhaoye.selectedSidequest='sq01';w.zhaoye.activeBattle=packBattle(battle,choice);
  const parsed=await parseImport(JSON.stringify(await createExportBundle({worlds:[w],characters:[c]})));
  await importSaves(parsed.bundle);const saved=await loadSlot('v2_manual_0');const restored=restoreBattle(saved.world.zhaoye.activeBattle);
  assert.equal(saved.world.currentSceneId,'1-1');assert.equal(saved.world.zhaoye.sidequests.sq01.actions,1);
  assert.deepEqual(restored.battle.rng.snapshot(),battle.rng.snapshot());assert.equal(restored.battle.round,battle.round);
  assert.deepEqual(saved.world.zhaoye.sidequestRewards,[]);
});
