import { BALANCE, deriveResources } from "../config/balance.js";

export const INVENTORY_SLOTS = 30;

export function addItem(character, itemId, quantity, itemCatalog) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("加入數量必須是正整數");
  const definition=itemCatalog.find(item=>item.id===itemId); if(!definition)throw new Error("未知道具");
  const existing=character.inventory.find(entry=>entry.itemId===itemId);
  if(existing){if(existing.quantity+quantity>definition.stackLimit)throw new Error(`${definition.name}超過堆疊上限`);existing.quantity+=quantity;return character;}
  if(character.inventory.length>=INVENTORY_SLOTS)throw new Error("一般背包已滿（30 格）");
  character.inventory.push({itemId,quantity}); return character;
}

export function removeItem(character, itemId, quantity=1) {
  const index=character.inventory.findIndex(entry=>entry.itemId===itemId); if(index<0)throw new Error("背包中沒有這項道具");
  const entry=character.inventory[index]; if(quantity<=0||entry.quantity<quantity)throw new Error("道具數量不足");
  entry.quantity-=quantity; if(entry.quantity===0)character.inventory.splice(index,1); return character;
}

export function useConsumable(character, itemId, itemCatalog, battleState=null) {
  const item=itemCatalog.find(row=>row.id===itemId); if(!item)throw new Error("未知道具");
  if(battleState&&!item.battleUsable)throw new Error(`${item.name}無法在戰鬥中使用`);
  if(battleState&&(battleState.consumablesUsed??0)>=BALANCE.consumablesPerBattle)throw new Error("本場戰鬥最多使用 3 次消耗品");
  removeItem(character,itemId,1);
  for(const effect of item.effects??[]){const value=effect.params?.value??0;if(effect.effectId==="heal_flat")character.hp=Math.min(character.maxHp,character.hp+value);else if(effect.effectId==="restore_inner_flat")character.inner=Math.min(character.maxInner,character.inner+value);else if(effect.effectId==="restore_posture_flat")character.posture=Math.min(character.maxPosture,character.posture+value);else if(effect.effectId==="cultivation")character.cultivation=(character.cultivation??0)+value;}
  if(battleState)battleState.consumablesUsed=(battleState.consumablesUsed??0)+1;
  return character;
}

export function equipItem(character, equipmentId, equipmentCatalog) {
  const item=equipmentCatalog.find(row=>row.id===equipmentId);if(!item)throw new Error("未知裝備");
  if(!["weapon","armor","bracer","accessory"].includes(item.slot))throw new Error("非法裝備欄位");
  if(!character.ownedEquipment?.includes(equipmentId))throw new Error("角色尚未持有這件裝備");
  character.equipment[item.slot]=equipmentId;recalculateEquipment(character,equipmentCatalog);return character;
}

export function unequipItem(character, slot, equipmentCatalog) {if(!(slot in character.equipment))throw new Error("非法裝備欄位");character.equipment[slot]=null;recalculateEquipment(character,equipmentCatalog);return character;}

export function recalculateEquipment(character, equipmentCatalog, meridianCatalog=[]) {
  const total={hp:0,posture:0,inner:0};let damageReduction=0,controlResist=0;
  for(const id of Object.values(character.equipment)){if(!id)continue;const item=equipmentCatalog.find(row=>row.id===id);if(!item)continue;total.hp+=item.stats.hp??0;total.posture+=item.stats.posture??0;total.inner+=item.stats.inner??0;damageReduction+=item.stats.damageReduction??0;controlResist+=item.stats.controlResist??0;}
  const previous={hpRatio:character.maxHp?character.hp/character.maxHp:1,postureRatio:character.maxPosture?character.posture/character.maxPosture:1,innerRatio:character.maxInner?character.inner/character.maxInner:1};
  const level=id=>character.meridians?.[id]??0;const modifiers={innerFlat:activeInnerFlat(character),hpPct:level("meridian_001")*.01,innerPct:level("meridian_002")*.01,posturePct:level("meridian_006")*.01};
  const resources=deriveResources(character.stats,total,modifiers);Object.assign(character,resources,{hp:Math.round(resources.maxHp*previous.hpRatio),posture:Math.round(resources.maxPosture*previous.postureRatio),inner:Math.round(resources.maxInner*previous.innerRatio),damageReduction:Math.min(.5,damageReduction),controlResist:Math.min(.75,controlResist),damagePct:level("meridian_003")*.005,postureDamagePct:level("meridian_004")*.005,speedPct:level("meridian_005")*.01});return character;
}

function activeInnerFlat(character){return Object.values(character.innerArts??{}).filter(value=>value.active).reduce((sum,value)=>sum+(value.maxInner??0),0);}
