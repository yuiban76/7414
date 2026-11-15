import { BALANCE } from '../config/balance.js';
import { SCHEMA_VERSION } from '../config/constants.js';
import { migrateSave } from '../core/migrations.js';
import { validateRevengeWorld } from './revenge-save-validation.js';
import { validateCharacter } from '../core/validators.js';
import { put, get, getAll, clearStore } from './indexeddb.js';

export const SAVE_SLOT_PREFIX='v3_';
export const LAST_SLOT_KEY='zhaoye:lastSlot:v3';
const legacyMessage='故事版本已更新，舊存檔無法使用。請重新創角開局；原有備份仍保留。';
const slotLimit=type=>type==='auto'?BALANCE.autosaveSlots:type==='manual'?BALANCE.manualSaveSlots:0;
function slotParts(slotId){
  const match=typeof slotId==='string'&&slotId.match(/^v3_(auto|manual)_(\d+)$/);
  if(!match)throw new Error(legacyMessage);
  const type=match[1],index=Number(match[2]);
  if(!Number.isSafeInteger(index)||index>=slotLimit(type)||slotId!==`${SAVE_SLOT_PREFIX}${type}_${index}`)throw new Error('存檔槽不存在');
  return {type,index};
}
async function protectExistingRecords(world,character){
  const [oldWorld,oldCharacter]=await Promise.all([get('worldSaves',world.id),get('characterSaves',character.id)]);
  if(oldWorld&&oldWorld.zhaoye?.storyRevision!==3)throw new Error('不能覆寫舊故事世界；原存檔已保留，請使用新角色與世界。');
  if(oldCharacter){
    if(oldCharacter.homeWorldId!==character.homeWorldId||!oldCharacter.homeWorldId)throw new Error('不能以新故事覆寫既有角色；原角色已保留。');
    const home=oldCharacter.homeWorldId===world.id?oldWorld:await get('worldSaves',oldCharacter.homeWorldId);
    if(home?.zhaoye?.storyRevision!==3)throw new Error('不能覆寫舊故事角色；原角色已保留，請重新創角。');
  }
}
export async function saveGame({world,character,type='auto',index=0}){
  if(!Number.isInteger(index)||index<0||index>=slotLimit(type))throw new Error('存檔槽不存在');
  const {bundle}=migrateSave({schemaVersion:SCHEMA_VERSION,worlds:[world],characters:[character]});
  await protectExistingRecords(world,character);
  const savedAt=new Date().toISOString(),snapshotId=`snapshot_v3_${globalThis.crypto?.randomUUID?.()??`${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
  const snapshot={schemaVersion:SCHEMA_VERSION,id:snapshotId,status:'writing',savedAt,world:{...bundle.worlds[0],updatedAt:savedAt},character:{...bundle.characters[0],updatedAt:savedAt}};
  await put('snapshots',snapshot);
  snapshot.status='complete';await put('snapshots',snapshot);
  await put('worldSaves',snapshot.world);await put('characterSaves',snapshot.character);
  const slotId=`${SAVE_SLOT_PREFIX}${type}_${index}`;
  await put('saveSlots',{slotId,schemaVersion:SCHEMA_VERSION,type,index,snapshotId,worldId:world.id,characterId:character.id,savedAt,status:'complete'});
  globalThis.localStorage?.setItem(LAST_SLOT_KEY,slotId);
  return structuredClone(snapshot);
}
export async function loadSlot(slotId){
  const {type,index}=slotParts(slotId),slot=await get('saveSlots',slotId);
  if(!slot)throw new Error('存檔槽是空的');
  if(slot.schemaVersion!==SCHEMA_VERSION)throw new Error(legacyMessage);
  if(slot.type!==type||slot.index!==index||slot.status!=='complete')throw new Error('存檔槽資料無效');
  const snapshot=await get('snapshots',slot.snapshotId);
  if(snapshot?.status!=='complete')throw new Error('存檔快照不完整');
  if(snapshot.id!==slot.snapshotId||slot.worldId!==snapshot.world?.id||slot.characterId!==snapshot.character?.id)throw new Error('存檔槽與快照不相符');
  const {bundle}=migrateSave({schemaVersion:snapshot.schemaVersion,worlds:[snapshot.world],characters:[snapshot.character]});
  return {...structuredClone(snapshot),schemaVersion:SCHEMA_VERSION,world:bundle.worlds[0],character:bundle.characters[0]};
}
export async function listSlots(){
  const slots=await getAll('saveSlots');
  const rows=await Promise.all(slots.map(async slot=>{let compatible=false;try{await loadSlot(slot.slotId);compatible=true;}catch{}return {...slot,compatible};}));
  return rows.toSorted((a,b)=>String(b.savedAt??'').localeCompare(String(a.savedAt??'')));
}
export async function getAllSaves(){
  const [allWorlds,allCharacters]=await Promise.all([getAll('worldSaves'),getAll('characterSaves')]);
  const validCharacters=allCharacters.filter(character=>{try{return validateCharacter(character).length===0;}catch{return false;}});
  const byId=new Map(validCharacters.map(character=>[character.id,character]));
  const worlds=allWorlds.filter(world=>{
    try{validateRevengeWorld(world);const owner=byId.get(world.ownerCharacterId);return !!owner&&(!owner.homeWorldId||owner.homeWorldId===world.id);}catch{return false;}
  });
  const ids=new Set(worlds.map(world=>world.id)),owners=new Set(worlds.map(world=>world.ownerCharacterId));
  const characters=validCharacters.filter(character=>(ids.has(character.homeWorldId)||owners.has(character.id))&&(!character.homeWorldId||ids.has(character.homeWorldId)));
  return migrateSave({schemaVersion:SCHEMA_VERSION,worlds,characters}).bundle;
}
export async function importSaves(bundle){
  bundle=migrateSave(bundle).bundle;
  const byId=new Map(bundle.characters.map(character=>[character.id,character]));
  // Validate every reference and legacy collision before the first write.
  for(const world of bundle.worlds)await protectExistingRecords(world,byId.get(world.ownerCharacterId));
  for(const character of bundle.characters){
    const old=await get('characterSaves',character.id);
    if(old&&(old.homeWorldId!==character.homeWorldId||!old.homeWorldId))throw new Error('不能覆寫既有故事角色；原角色已保留。');
  }
  let slotIndex=0;
  for(const world of bundle.worlds){
    if(slotIndex<BALANCE.manualSaveSlots)await saveGame({world,character:byId.get(world.ownerCharacterId),type:'manual',index:slotIndex++});
    else await put('worldSaves',world);
  }
  for(const character of bundle.characters)await put('characterSaves',character);
  return {restoredSlots:slotIndex};
}
export async function clearAllSaves(){
  for(const store of ['saveSlots','snapshots','worldSaves','characterSaves','roomHistory'])await clearStore(store);
  for(const key of ['jianghu:lastSlot','zhaoye:lastSlot:v2',LAST_SLOT_KEY])globalThis.localStorage?.removeItem(key);
}
