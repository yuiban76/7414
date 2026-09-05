import { BALANCE, deriveResources } from "../config/balance.js";
import { identityModifiers } from "./identity-system.js";

export const INVENTORY_SLOTS = 30;

export function addItem(character, itemId, quantity, itemCatalog) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("加入數量必須是正整數");
  const definition=itemCatalog.find(item=>item.id===itemId); if(!definition)throw new Error("未知道具");
  if(quantity>definition.stackLimit)throw new Error(`${definition.name}超過堆疊上限`);
  const existing=character.inventory.find(entry=>entry.itemId===itemId);
  if(existing){if(existing.quantity+quantity>definition.stackLimit)throw new Error(`${definition.name}超過堆疊上限`);existing.quantity+=quantity;return character;}
  if(character.inventory.length>=INVENTORY_SLOTS)throw new Error("一般背包已滿（30 格）");
  character.inventory.push({itemId,quantity}); return character;
}

export function removeItem(character, itemId, quantity=1) {
  if(!Number.isSafeInteger(quantity)||quantity<=0)throw new Error("移除數量必須是正整數");
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
  const total={hp:0,posture:0,inner:0,damage:0,postureDamage:0};let damageReduction=0,controlResist=0,damagePct=0,postureDamagePct=0,innerRegenPct=0;
  for(const id of Object.values(character.equipment)){if(!id)continue;const item=equipmentCatalog.find(row=>row.id===id);if(!item)continue;total.hp+=item.stats.hp??0;total.posture+=item.stats.posture??0;total.inner+=item.stats.inner??0;total.damage+=item.stats.damage??0;total.postureDamage+=item.stats.postureDamage??0;damageReduction+=item.stats.damageReduction??0;controlResist+=item.stats.controlResist??0;for(const effect of item.effects??[]){const value=Number(effect.params?.value??0);if(effect.effectId==="damage_pct")damagePct+=value;else if(effect.effectId==="posture_damage_pct")postureDamagePct+=value;else if(effect.effectId==="damage_reduction_pct")damageReduction+=value;else if(effect.effectId==="control_resist_pct")controlResist+=value;else if(effect.effectId==="inner_regen_pct")innerRegenPct+=value;}}
  const previous={hpRatio:character.maxHp?character.hp/character.maxHp:1,postureRatio:character.maxPosture?character.posture/character.maxPosture:1,innerRatio:character.maxInner?character.inner/character.maxInner:1};
  const level=id=>character.meridians?.[id]??0;const inner=activeInnerModifiers(character);const talent=character.talentModifiers??{};const identity=identityModifiers(character.identityId,character.realm);const modifiers={innerFlat:inner.innerFlat,hpPct:level("meridian_001")*.01+inner.hpPct+(talent.hpPct??0),innerPct:level("meridian_002")*.01+(talent.innerPct??0),posturePct:level("meridian_006")*.01+inner.posturePct+(talent.posturePct??0)};
  const resources=deriveResources(character.effectiveStats??character.stats,total,modifiers);Object.assign(character,resources,{hp:Math.round(resources.maxHp*previous.hpRatio),posture:Math.round(resources.maxPosture*previous.postureRatio),inner:Math.round(resources.maxInner*previous.innerRatio),weaponDamageFlat:total.damage,weaponPostureFlat:total.postureDamage,damageReduction:Math.max(-.25,Math.min(.5,damageReduction+inner.damageReduction-(talent.damageTakenPct??0))),normalAttackReductionPct:talent.normalAttackReductionPct??0,postureDamageTakenPct:talent.postureDamageTakenPct??0,controlResist:Math.min(.75,controlResist+inner.controlResist),damagePct:level("meridian_003")*.005+damagePct+(talent.damagePct??0),situationalDamagePct:inner.situationalDamagePct+(talent.situationalDamagePct??0),lateTurnDamagePct:talent.lateTurnDamagePct??0,postureDamagePct:level("meridian_004")*.005+postureDamagePct+(talent.postureDamagePct??0),speedPct:level("meridian_005")*.01+inner.speedPct,speedFlat:talent.speedFlat??0,innerRegenRate:inner.regenRate+innerRegenPct,proficiencyPct:inner.proficiencyPct+(talent.proficiencyPct??0),innerProficiencyPct:talent.innerProficiencyPct??0,healingPct:(talent.healingPct??0)+identity.healingPct,observationPct:(talent.observationPct??0)+identity.observationPct,guardReductionPct:(talent.guardReductionPct??0)+identity.guardReductionPct,survivalHealPct:talent.survivalHealPct??0,postBattleHealPct:inner.postBattleHealPct});return character;
}

function activeInnerModifiers(character){
  const active=Object.entries(character.innerArts??{}).filter(([,value])=>value.active);const count=active.length;const result={innerFlat:0,hpPct:0,posturePct:0,damageReduction:0,controlResist:0,speedPct:0,situationalDamagePct:0,proficiencyPct:0,postBattleHealPct:0,regenRate:BALANCE.baseInnerRegenByArts[Math.min(6,count)]};
  const unity=active.some(([id])=>id==="inner_020")?1.1:1;
  for(const [id,value] of active){const scale=1+(value.realm??0)*.05;result.innerFlat+=(value.maxInner??0)*scale*(id==="inner_020"?1:unity);if(id==="inner_003")result.hpPct+=.05*scale;else if(id==="inner_004")result.controlResist+=.05*scale;else if(id==="inner_005")result.posturePct+=.08*scale;else if(id==="inner_007")result.damageReduction+=.04*scale;else if(id==="inner_008")result.regenRate+=.005*scale;else if(id==="inner_010")result.controlResist+=.1*scale;else if(id==="inner_011")result.posturePct+=.12*scale;else if(id==="inner_012")result.speedPct+=.05*scale;else if(id==="inner_013"){result.hpPct+=.1*scale;result.posturePct+=.1*scale;}else if(id==="inner_015")result.situationalDamagePct+=.08*scale;else if(id==="inner_017")result.postBattleHealPct+=.2*scale;else if(id==="inner_018")result.proficiencyPct+=.1*scale;else if(id==="inner_019"){result.regenRate+=.01*scale;result.hpPct+=.1*scale;result.controlResist+=.1*scale;}}
  return result;
}
