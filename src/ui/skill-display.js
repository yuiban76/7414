const TYPE_LABELS=Object.freeze({attack:'攻擊',control:'控制',defense:'防禦',support:'支援'});
const BUFF_LABELS=Object.freeze({damage:'氣血傷害',posture:'削架勢',defense:'減傷',speed:'速度'});

export const postureFocus=skill=>skill.tags?.includes('posture_focus')??false;
export const skillTypeLabel=skill=>TYPE_LABELS[skill.type]??skill.type;

export function skillEffectLabel(skill){
 const heal=skill.effects.find(effect=>effect.effectId==='heal_pct');
 if(heal)return `回復所選隊友 ${Math.round(heal.params.value*100)}% 最大氣血`;
 const buff=skill.effects.find(effect=>effect.effectId==='battle_buff');
 if(buff)return `全隊${BUFF_LABELS[buff.params.stat]} +${Math.round(buff.params.value*100)}% · ${buff.params.turns} 回合`;
 const dodge=skill.effects.find(effect=>effect.effectId==='dodge');
 if(dodge)return `自身閃避 ${Math.round(dodge.params.chance*100)}% · 本回合`;
 const defend=skill.effects.find(effect=>effect.effectId==='defend');
 if(defend)return `自身氣血減傷 ${Math.round(defend.params.hpReduction*100)}% · 架勢減傷 ${Math.round(defend.params.postureReduction*100)}%`;
 if(skill.type==='attack'||skill.type==='control'){
  const damage=postureFocus(skill)?`強力削架勢 ${skill.power.posture} · 氣血傷害 ${skill.power.hp}`:`氣血傷害 ${skill.power.hp} · 架勢傷害 ${skill.power.posture}`;
  const postureBonus=skill.effects.find(effect=>effect.effectId==='posture_bonus_below_ratio');
  const status=skill.effects.find(effect=>effect.effectId==='status'&&['內力消耗 +15%','攻擊傷害 -10%','速度 -10%','防禦效果 -15%','架勢恢復 -20%'].includes(effect.params.description));
  return `${damage}${postureBonus?` · 目標架勢低於 ${Math.round(postureBonus.params.ratio*100)}% 時削架勢 +${Math.round(postureBonus.params.bonus*100)}%`:''}${status?` · ${status.params.description}（${status.params.turns} 回合）`:''}`;
 }
 return skillTypeLabel(skill);
}
