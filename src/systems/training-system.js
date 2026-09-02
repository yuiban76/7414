import { BALANCE } from "../config/balance.js";

export function learnSkill(character, skillId, completeness=1) {if(character.skills[skillId])throw new Error("已經學會此武功");character.skills[skillId]={realm:0,proficiency:0,completeness:Math.max(.01,Math.min(1,completeness))};return character;}
export function equipSkill(character, skillId) {if(!character.skills[skillId])throw new Error("尚未學會此武功");if(character.equippedSkills.includes(skillId))return character;if(character.equippedSkills.length>=6)throw new Error("六格配招已滿");character.equippedSkills.push(skillId);return character;}
export function unequipSkill(character, skillId) {if(character.equippedSkills.length<=1)throw new Error("至少保留一個已裝備武功");character.equippedSkills=character.equippedSkills.filter(id=>id!==skillId);return character;}

export function learnInnerArt(character, innerArt) {if(character.innerArts[innerArt.id])throw new Error("已經學會此內功");character.innerArts[innerArt.id]={realm:0,proficiency:0,active:false,maxInner:innerArt.maxInner};return character;}
export function toggleInnerArt(character, innerArtId, active) {const art=character.innerArts[innerArtId];if(!art)throw new Error("尚未學會此內功");art.active=Boolean(active);return character;}
export function innerLoad(character) {const count=Object.values(character.innerArts).filter(value=>value.active).length;return {count,regenRate:BALANCE.baseInnerRegenByArts[Math.min(6,count)]};}

export function upgradeMeridian(character, meridianId) {const level=character.meridians[meridianId];if(level==null)throw new Error("未知經脈");if(level>=10)throw new Error("此經脈已滿級");const cost=BALANCE.meridianCosts[level];if((character.cultivation??0)<cost)throw new Error(`修為不足，需 ${cost}`);character.cultivation-=cost;character.meridians[meridianId]+=1;return {character,cost,newLevel:level+1};}
