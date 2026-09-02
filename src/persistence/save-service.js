import { BALANCE } from "../config/balance.js";
import { put, get, getAll } from "./indexeddb.js";

export async function saveGame({ world, character, type="auto", index=0 }) {
  const max=type==="auto"?BALANCE.autosaveSlots:BALANCE.manualSaveSlots;
  if(index<0||index>=max)throw new Error("存檔槽不存在");
  const savedAt=new Date().toISOString(); const snapshotId=`snapshot_${globalThis.crypto?.randomUUID?.()??Date.now()}`;
  const snapshot={id:snapshotId,status:"writing",savedAt,world:structuredClone({...world,updatedAt:savedAt}),character:structuredClone({...character,updatedAt:savedAt})};
  await put("snapshots",snapshot);
  if(!snapshot.world.id||!snapshot.character.id)throw new Error("快照驗證失敗");
  snapshot.status="complete"; await put("snapshots",snapshot);
  await put("worldSaves",snapshot.world); await put("characterSaves",snapshot.character);
  await put("saveSlots",{slotId:`${type}_${index}`,type,index,snapshotId,worldId:world.id,characterId:character.id,savedAt,status:"complete"});
  localStorage.setItem("jianghu:lastSlot",`${type}_${index}`);
  return snapshot;
}
export async function loadSlot(slotId) { const slot=await get("saveSlots",slotId);if(!slot)throw new Error("存檔槽是空的");const snapshot=await get("snapshots",slot.snapshotId);if(snapshot?.status!=="complete")throw new Error("存檔快照不完整");return structuredClone(snapshot); }
export async function listSlots(){return (await getAll("saveSlots")).toSorted((a,b)=>b.savedAt.localeCompare(a.savedAt));}
export async function getAllSaves(){return {worlds:await getAll("worldSaves"),characters:await getAll("characterSaves")};}
export async function importSaves(bundle){for(const world of bundle.worlds)await put("worldSaves",world);for(const character of bundle.characters)await put("characterSaves",character);}
