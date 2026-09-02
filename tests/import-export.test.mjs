import test from "node:test";
import assert from "node:assert/strict";
import { createExportBundle, parseImport } from "../src/persistence/import-export.js";

test("export round trip verifies checksum",async()=>{const bundle=await createExportBundle({worlds:[{id:"w1"}],characters:[{id:"c1"}],settings:{}});const parsed=await parseImport(JSON.stringify(bundle));assert.equal(parsed.summary.worlds,1);assert.equal(parsed.summary.characters,1);});
test("tampered export is rejected",async()=>{const bundle=await createExportBundle({worlds:[{id:"w1"}],characters:[{id:"c1"}],settings:{}});bundle.worlds[0].id="tampered";await assert.rejects(()=>parseImport(JSON.stringify(bundle)),/校驗失敗/);});
test("prototype pollution keys are rejected",async()=>{await assert.rejects(()=>parseImport('{"format":"jianghu-save","schemaVersion":1,"checksum":"x","worlds":[],"characters":[],"settings":{"__proto__":{"polluted":true}}}'),/不安全欄位/);});
