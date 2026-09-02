import { clamp } from "../core/validators.js";
export function changeFaction(world, factionId, amount) {
  world.factionRelations[factionId] = clamp((world.factionRelations[factionId] ?? 0) + amount, -100, 100);
  return world.factionRelations[factionId];
}
export function factionLabel(value) {
  if (value <= -76) return "死敵"; if (value <= -41) return "敵對"; if (value <= -11) return "冷淡";
  if (value <= 10) return "中立"; if (value <= 40) return "友善"; if (value <= 75) return "信任"; return "盟友";
}
