import { deriveResources } from "../config/balance.js";
import { IDENTITIES, STAT_LABELS } from "../config/constants.js";
import { validateCharacter } from "../core/validators.js";

export function createCharacter(input, talents, skills) {
  const identity = IDENTITIES.find(entry => entry.id === input.identityId);
  if (!identity) throw new Error("未知身份");
  const startSkill = skills.find(skill => skill.name === input.startSkillName && identity.skills.includes(skill.name));
  if (!startSkill) throw new Error("起始武功與身份不符");
  const id = globalThis.crypto?.randomUUID?.() ?? `char_${Date.now()}`;
  const resources = deriveResources(input.stats);
  const character = {
    id, name: input.name.trim(), gender: input.gender, identityId: identity.id, realm: 0,
    stats: { ...input.stats }, talents: talents.map(t => t.id),
    skills: { [startSkill.id]: { realm: 0, proficiency: 0, completeness: 1 } },
    equippedSkills: [startSkill.id], innerArts: {}, meridians: Object.fromEntries(Array.from({length:6},(_,i)=>[`meridian_${String(i+1).padStart(3,"0")}`,0])),
    equipment: { weapon:null, armor:null, bracer:null, accessory:null }, ownedEquipment:["equipment_001"], inventory: [{ itemId:"item_001", quantity:3 }], storyItems: [], moneyWen: 500, cultivation:0,
    office: null, factionMemberships: [], wanted: { dasheng:0, beishuo:0, nanli:0 }, ...resources, hp: resources.maxHp, posture: resources.maxPosture, inner: resources.maxInner
  };
  const errors = validateCharacter(character);
  if (errors.length) throw new Error(errors.join("、"));
  return character;
}

export function rollStartingTalents(allTalents, rng) {
  const positives = allTalents.filter(t => t.type === "positive");
  const choice = rng.shuffle(positives).slice(0, 3);
  const random = [];
  const pool = rng.shuffle(allTalents.filter(t => !choice.some(s => s.id === t.id)));
  for (const talent of pool) {
    if (random.length >= 2) break;
    if (talent.type === "negative" && random.some(t => t.type === "negative")) continue;
    random.push(talent);
  }
  return { choice, random };
}

export function formatStats(stats) { return Object.entries(stats).map(([key,value]) => `${STAT_LABELS[key]} ${value}`).join("／"); }

export function addProficiency(character, skillId, baseAmount, usesThisBattle = 1) {
  const skill = character.skills[skillId];
  if (!skill) return character;
  const repeat = [1,.8,.6,.3][Math.min(3, usesThisBattle - 1)];
  const comprehension = 1 + character.stats.comprehension / 500;
  skill.proficiency += Math.round(baseAmount * repeat * comprehension);
  while (skill.proficiency >= 100 && skill.realm < 5) { skill.proficiency -= 100; skill.realm += 1; }
  return character;
}
