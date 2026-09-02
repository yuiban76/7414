export const EFFECT_HANDLERS = Object.freeze({
  damage_bonus_below_hp: true, posture_bonus_below_ratio: true, defend: true,
  dodge: true, guard: true, status: true, restore_inner_on_dodge: true,
  next_attack_bonus: true, heal_flat: true, restore_inner_flat: true,
  restore_posture_flat: true, cleanse: true, proficiency: true, cultivation: true,
  event_tool: true, max_hp_pct: true, max_inner_pct: true, max_posture_pct: true,
  damage_pct: true, posture_damage_pct: true, speed_pct: true, control_resist_pct: true,
  damage_reduction_pct: true, inner_regen_pct: true, skill_proficiency_pct: true,
  inner_proficiency_pct: true, stat_flat: true, set_flag: true,
  add_clue: true, faction_change: true, wanted_change: true, money: true
});

export function assertKnownEffect(effect) {
  if (!effect || !EFFECT_HANDLERS[effect.effectId]) throw new Error(`未知效果：${effect?.effectId ?? "(空白)"}`);
  if (effect.params && (typeof effect.params !== "object" || Array.isArray(effect.params))) throw new Error(`效果參數格式錯誤：${effect.effectId}`);
}
