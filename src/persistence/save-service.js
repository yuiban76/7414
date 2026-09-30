import { BALANCE } from "../config/balance.js";
import { SCHEMA_VERSION } from '../config/constants.js';
import { migrateSave } from '../core/migrations.js';
import { validateJourney } from '../systems/exploration-system.js';
import { validateSidequests } from '../systems/sidequest-system.js';
import { put, get, getAll, clearStore } from "./indexeddb.js";

export async function saveGame({ world, character, type="auto", index=0 }) {
  const max=type==="auto"?BALANCE.autosaveSlots:BALANCE.manualSaveSlots;
  if(index<0||index>=max)throw new Error("存檔槽不存在");
  const savedAt=new Date().toISOString(); const snapshotId=`snapshot_${globalThis.crypto?.randomUUID?.()??Date.now()}`;
  validateJourney(world);
  if(world.zhaoye?.storyRevision!==2)throw new Error('故事版本已更新，請重新創角開局。');
  validateSidequests(world);
  const snapshot={schemaVersion:SCHEMA_VERSION,id:snapshotId,status:"writing",savedAt,world:structuredClone({...world,updatedAt:savedAt}),character:structuredClone({...character,updatedAt:savedAt})};
  await put("snapshots",snapshot);
  if(!snapshot.world.id||!snapshot.character.id)throw new Error("快照驗證失敗");
  snapshot.status="complete"; await put("snapshots",snapshot);
  await put("worldSaves",snapshot.world); await put("characterSaves",snapshot.character);
  await put("saveSlots",{slotId:`v2_${type}_${index}`,schemaVersion:SCHEMA_VERSION,type,index,snapshotId,worldId:world.id,characterId:character.id,savedAt,status:"complete"});
  localStorage.setItem("zhaoye:lastSlot:v2",`v2_${type}_${index}`);
  return snapshot;
}
export async function loadSlot(slotId) { const slot=await get("saveSlots",slotId);if(!slot)throw new Error("存檔槽是空的");const snapshot=await get("snapshots",slot.snapshotId);if(snapshot?.status!=="complete")throw new Error("存檔快照不完整");const {bundle}=migrateSave({schemaVersion:snapshot.schemaVersion??1,worlds:[snapshot.world],characters:[snapshot.character]});validateJourney(bundle.worlds[0]);return {...structuredClone(snapshot),schemaVersion:SCHEMA_VERSION,world:bundle.worlds[0],character:bundle.characters[0]}; }
export async function listSlots(){return (await getAll("saveSlots")).map(slot=>({...slot,compatible:slot.schemaVersion===SCHEMA_VERSION&&slot.slotId.startsWith('v2_')})).toSorted((a,b)=>b.savedAt.localeCompare(a.savedAt));}
export async function getAllSaves(){const [allWorlds,allCharacters]=await Promise.all([getAll("worldSaves"),getAll("characterSaves")]);const worlds=allWorlds.filter(w=>w.zhaoye?.storyRevision===2);const ids=new Set(worlds.map(w=>w.id));const owners=new Set(worlds.map(w=>w.ownerCharacterId));const characters=allCharacters.filter(c=>ids.has(c.homeWorldId)||owners.has(c.id));return migrateSave({schemaVersion:SCHEMA_VERSION,worlds,characters}).bundle;}
export async function importSaves(bundle){
  bundle=migrateSave(bundle).bundle;
  const charactersById=new Map(bundle.characters.map(character=>[character.id,character]));
  for(const world of bundle.worlds){validateJourney(world);if(!charactersById.has(world.ownerCharacterId))throw new Error(`世界 ${world.name??world.id} 找不到房主角色`);}
  for(const character of bundle.characters)await put("characterSaves",character);
  let slotIndex=0;
  for(const world of bundle.worlds){
    const owner=charactersById.get(world.ownerCharacterId);
    if(!owner)throw new Error(`世界 ${world.name??world.id} 找不到房主角色`);
    if(slotIndex<5)await saveGame({world,character:owner,type:"manual",index:slotIndex++});
    else await put("worldSaves",world);
  }
  return {restoredSlots:slotIndex};
}
export async function clearAllSaves(){for(const store of ["saveSlots","snapshots","worldSaves","characterSaves","roomHistory"])await clearStore(store);globalThis.localStorage?.removeItem("jianghu:lastSlot");globalThis.localStorage?.removeItem('zhaoye:lastSlot:v2');}
