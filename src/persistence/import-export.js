import { GAME_VERSION, SAVE_FORMAT, SCHEMA_VERSION } from "../config/constants.js";
import { assertSafeObject } from "../core/validators.js";
import { migrateSave } from "../core/migrations.js";
import { sha256, stableStringify } from "./checksum.js";

export async function createExportBundle({ worlds, characters, settings={} }) {
  const payload={format:SAVE_FORMAT,schemaVersion:SCHEMA_VERSION,gameVersion:GAME_VERSION,exportedAt:new Date().toISOString(),worlds:structuredClone(worlds),characters:structuredClone(characters),settings:structuredClone(settings)};
  return {...payload,checksum:await sha256(payload)};
}
export async function parseImport(text) {
  let parsed; try{parsed=JSON.parse(text);}catch{throw new Error("檔案不是有效的 JSON。");}
  assertSafeObject(parsed);
  if(parsed.format!==SAVE_FORMAT)throw new Error("這不是江湖歸處存檔。");
  if(!Array.isArray(parsed.worlds)||!Array.isArray(parsed.characters))throw new Error("存檔缺少世界或角色資料。");
  const {checksum,...payload}=parsed; const actual=await sha256(payload);
  if(checksum!==actual)throw new Error("存檔校驗失敗，檔案可能損毀或被修改。");
  const migrated=migrateSave(parsed);
  return { ...migrated, summary:{worlds:parsed.worlds.length,characters:parsed.characters.length,exportedAt:parsed.exportedAt} };
}
export function downloadJson(bundle, filename="jianghu-save.json") { const blob=new Blob([stableStringify(bundle)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
