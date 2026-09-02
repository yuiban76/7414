import test from "node:test";
import assert from "node:assert/strict";
import { createExportBundle, parseImport } from "../src/persistence/import-export.js";
import { clearAllSaves, importSaves, loadSlot } from "../src/persistence/save-service.js";

const character={id:"c1",name:"備份俠客",homeWorldId:"w1",stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},talents:["talent_001","talent_002","talent_003"],equippedSkills:["skill_001"]};
const world={id:"w1",name:"備份江湖",ownerCharacterId:"c1",chapter:3,flags:{chapter_1_complete:true}};

test.before(()=>{if(!globalThis.localStorage){const values=new Map();globalThis.localStorage={setItem:(key,value)=>values.set(key,String(value)),getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key)};}});

test("export round trip verifies checksum and references",async()=>{const bundle=await createExportBundle({worlds:[world],characters:[character],settings:{}});const parsed=await parseImport(JSON.stringify(bundle));assert.equal(parsed.summary.worlds,1);assert.equal(parsed.summary.characters,1);});
test("tampered export is rejected",async()=>{const bundle=await createExportBundle({worlds:[world],characters:[character],settings:{}});bundle.worlds[0].id="tampered";await assert.rejects(()=>parseImport(JSON.stringify(bundle)),/校驗失敗/);});
test("prototype pollution keys are rejected",async()=>{await assert.rejects(()=>parseImport('{"format":"jianghu-save","schemaVersion":1,"checksum":"x","worlds":[],"characters":[],"settings":{"__proto__":{"polluted":true}}}'),/不安全欄位/);});
test("broken world-character references are rejected",async()=>{const bundle=await createExportBundle({worlds:[{...world,ownerCharacterId:"missing"}],characters:[character],settings:{}});await assert.rejects(()=>parseImport(JSON.stringify(bundle)),/找不到房主角色/);});
test("clear then import creates a loadable recovery slot",async()=>{await clearAllSaves();const bundle=await createExportBundle({worlds:[world],characters:[character],settings:{}});const parsed=await parseImport(JSON.stringify(bundle));const result=await importSaves(parsed.bundle);assert.equal(result.restoredSlots,1);const restored=await loadSlot("manual_0");assert.equal(restored.world.id,"w1");assert.equal(restored.character.id,"c1");assert.equal(globalThis.localStorage.getItem("jianghu:lastSlot"),"manual_0");});
