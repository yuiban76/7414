import { GAME_VERSION, SAVE_FORMAT, SCHEMA_VERSION } from "../config/constants.js";
import { assertSafeObject } from "../core/validators.js";
import { migrateSave } from "../core/migrations.js";
import { validateCharacter } from "../core/validators.js";
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
  validateImportReferences(parsed);
  const migrated=migrateSave(parsed);
  return { ...migrated, summary:{worlds:parsed.worlds.length,characters:parsed.characters.length,exportedAt:parsed.exportedAt} };
}
function validateImportReferences(bundle){
  const worldIds=new Set(),characterIds=new Set();
  for(const world of bundle.worlds){
    if(!world?.id||!world?.ownerCharacterId||!Number.isInteger(world.chapter)||world.chapter<1||world.chapter>8)throw new Error("世界資料缺少必要欄位或章節無效。");
    if(worldIds.has(world.id))throw new Error(`世界 ID 重複：${world.id}`);worldIds.add(world.id);
  }
  for(const character of bundle.characters){
    if(characterIds.has(character.id))throw new Error(`角色 ID 重複：${character.id}`);characterIds.add(character.id);
    const errors=validateCharacter(character);if(errors.length)throw new Error(`角色 ${character.name??character.id} 無效：${errors.join("；")}`);
  }
  for(const world of bundle.worlds)if(!characterIds.has(world.ownerCharacterId))throw new Error(`世界 ${world.name??world.id} 找不到房主角色。`);
  for(const character of bundle.characters)if(character.homeWorldId&&!worldIds.has(character.homeWorldId))throw new Error(`角色 ${character.name??character.id} 指向不存在的世界。`);
}
export function downloadJson(bundle, filename="jianghu-save.json") { const blob=new Blob([stableStringify(bundle)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
