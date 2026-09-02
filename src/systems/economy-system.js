import { addItem, removeItem } from "./inventory-system.js";
import { advanceClock } from "./travel-system.js";

export function priceAt(definition,location,{selling=false}={}){
  const base=Number(definition?.priceWen);if(!Number.isFinite(base)||base<0)throw new Error("商品價格無效");
  const modifier=Number(location?.priceModifier??1);if(!Number.isFinite(modifier)||modifier<=0)throw new Error("地區價格修正無效");
  return Math.max(1,Math.round(base*modifier*(selling?.5:1)));
}

export function shopStock(location,chapter,itemCatalog,equipmentCatalog){
  if(!location?.facilities?.some(id=>["shop","medicine"].includes(id)))return {items:[],equipment:[]};
  const itemLimit=Math.min(50,8+Math.max(0,chapter-1)*2);const rarityByChapter=chapter>=6?["common","fine","named"]:chapter>=3?["common","fine"]:["common"];
  return {items:itemCatalog.slice(0,itemLimit).slice(-8),equipment:equipmentCatalog.filter(item=>item.sources?.includes("shops")&&rarityByChapter.includes(item.rarity)).slice(Math.max(0,(chapter-1)*4),Math.max(0,(chapter-1)*4)+8)};
}

export function buyItem(character,itemId,quantity,itemCatalog,location){if(!Number.isInteger(quantity)||quantity<=0)throw new Error("購買數量必須是正整數");const item=itemCatalog.find(row=>row.id===itemId);if(!item)throw new Error("商品不存在");const total=priceAt(item,location)*quantity;if((character.moneyWen??0)<total)throw new Error("銀錢不足");addItem(character,itemId,quantity,itemCatalog);character.moneyWen-=total;return total;}
export function sellItem(character,itemId,quantity,itemCatalog,location){const item=itemCatalog.find(row=>row.id===itemId);if(!item)throw new Error("商品不存在");removeItem(character,itemId,quantity);const total=priceAt(item,location,{selling:true})*quantity;character.moneyWen=(character.moneyWen??0)+total;return total;}
export function buyEquipment(character,equipmentId,equipmentCatalog,location){const item=equipmentCatalog.find(row=>row.id===equipmentId);if(!item||!item.sources?.includes("shops"))throw new Error("這件裝備不在普通商店販售");if(character.ownedEquipment.includes(equipmentId))throw new Error("已持有這件固定裝備");const total=priceAt(item,location);if((character.moneyWen??0)<total)throw new Error("銀錢不足");character.moneyWen-=total;character.ownedEquipment.push(equipmentId);return total;}
export function sellEquipment(character,equipmentId,equipmentCatalog,location){const item=equipmentCatalog.find(row=>row.id===equipmentId);if(!item)throw new Error("裝備不存在");if(item.bind!=="none")throw new Error("綁定裝備不可出售");if(Object.values(character.equipment).includes(equipmentId))throw new Error("請先卸下裝備");const index=character.ownedEquipment.indexOf(equipmentId);if(index<0)throw new Error("尚未持有這件裝備");character.ownedEquipment.splice(index,1);const total=priceAt(item,location,{selling:true});character.moneyWen=(character.moneyWen??0)+total;return total;}
export function restAtInn(character,world,location,{baseCost=60}={}){if(!location?.facilities?.includes("inn"))throw new Error("此地沒有客棧");const cost=Math.max(1,Math.round(baseCost*(location.priceModifier??1)));if((character.moneyWen??0)<cost)throw new Error("住店銀錢不足");character.moneyWen-=cost;character.hp=character.maxHp;character.inner=character.maxInner;character.posture=character.maxPosture;advanceClock(world,2);return cost;}
