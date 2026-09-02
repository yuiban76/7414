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
  const params=effect.params??{};const numericValue=new Set(["heal_flat","restore_inner_flat","restore_posture_flat","proficiency","cultivation","event_tool","max_hp_pct","max_inner_pct","max_posture_pct","damage_pct","posture_damage_pct","speed_pct","control_resist_pct","damage_reduction_pct","inner_regen_pct","skill_proficiency_pct","inner_proficiency_pct","stat_flat","money"]);
  if(numericValue.has(effect.effectId)&&!Number.isFinite(params.value))throw new Error(`${effect.effectId}.value 必須是有限數字`);
  if(["max_hp_pct","max_inner_pct","max_posture_pct","damage_pct","posture_damage_pct","speed_pct","control_resist_pct","damage_reduction_pct","inner_regen_pct"].includes(effect.effectId)&&Math.abs(params.value)>1)throw new Error(`${effect.effectId}.value 超出百分比範圍`);
  if(effect.effectId==="dodge"&&(!Number.isFinite(params.chance)||params.chance<0||params.chance>1))throw new Error("dodge.chance 必須介於 0～1");
  if(effect.effectId==="defend"&&(!validRatio(params.hpReduction)||!validRatio(params.postureReduction)))throw new Error("defend 減傷必須介於 0～1");
  if(effect.effectId==="guard"&&(!Number.isInteger(params.hits)||params.hits<1||!validRatio(params.reduction)))throw new Error("guard 參數無效");
  if(effect.effectId==="status"&&(!String(params.description??"").trim()||!Number.isInteger(params.turns)||params.turns<1))throw new Error("status 需要敘述與正整數回合");
  if(effect.effectId==="set_flag"&&!String(params.key??"").trim())throw new Error("set_flag.key 不可空白");
  if(effect.effectId==="add_clue"&&!String(params.clueId??"").trim())throw new Error("add_clue.clueId 不可空白");
  if(effect.effectId==="faction_change"&&(!String(params.factionId??"").trim()||!Number.isFinite(params.value)))throw new Error("faction_change 參數無效");
  if(effect.effectId==="wanted_change"&&(!String(params.country??"").trim()||!Number.isFinite(params.value)))throw new Error("wanted_change 參數無效");
}

function validRatio(value){return Number.isFinite(value)&&value>=0&&value<=1;}
