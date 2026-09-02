import { changeFaction } from "./faction-system.js";

export function evaluateCondition(condition, world) {
  if (!condition || Object.keys(condition).length === 0) return true;
  if (condition.all) return condition.all.every(value => evaluateCondition(value, world));
  if (condition.any) return condition.any.some(value => evaluateCondition(value, world));
  if (condition.flagEquals) return world.flags[condition.flagEquals[0]] === condition.flagEquals[1];
  if (condition.factionAtLeast) return (world.factionRelations[condition.factionAtLeast[0]] ?? 0) >= condition.factionAtLeast[1];
  if (condition.chapterAtLeast) return world.chapter >= condition.chapterAtLeast;
  return false;
}

export function applyOutcome(world, outcome) {
  const { effectId, params = {} } = outcome;
  if (effectId === "set_flag") world.flags[params.key] = params.value;
  else if (effectId === "add_clue" && !world.clues.includes(params.clueId)) world.clues.push(params.clueId);
  else if (effectId === "faction_change") changeFaction(world, params.factionId, params.value);
  else if (effectId === "wanted_change") world.wantedLevels[params.country] = Math.max(0, Math.min(5, world.wantedLevels[params.country] + params.value));
  else if (effectId === "money") world.partyMoney = Math.max(0, (world.partyMoney ?? 0) + params.value);
  world.worldEvents.push({ at: new Date().toISOString(), effectId, params: structuredClone(params) });
}

export function chooseMajorPath(world, chapter, choice) {
  for (const outcome of choice.effects ?? []) applyOutcome(world, outcome);
  world.flags[`chapter_${chapter.chapter}_complete`] = true;
  world.flags[`chapter_${chapter.chapter}_choice`] = choice.id;
  return world;
}
