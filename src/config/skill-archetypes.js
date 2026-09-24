// Stable skill IDs keep existing character saves valid when combat roles change.
const SUPPORT_EFFECTS = Object.freeze({
  skill_022: { stat:'damage', value:.16 },
  skill_033: { heal:.18 },
  skill_034: { stat:'defense', value:.23 },
  skill_039: { stat:'speed', value:.18 },
  skill_048: { stat:'posture', value:.18 },
  skill_049: { stat:'damage', value:.23 },
  skill_050: { stat:'defense', value:.23 },
  skill_056: { heal:.2 },
  skill_063: { stat:'speed', value:.24 },
  skill_072: { heal:.25 },
  skill_073: { stat:'defense', value:.16 },
  skill_080: { heal:.18 },
  skill_081: { stat:'damage', value:.3 },
  skill_089: { stat:'posture', value:.16 },
  skill_090: { heal:.25 },
  skill_099: { heal:.26 }
});

// These nine techniques now fill distinct combat roles while keeping their save IDs.
const ROLE_REVISIONS = Object.freeze({
 skill_023:{name:'流雲追擊',type:'attack',power:{hp:40,posture:21},innerCost:14,target:'single_enemy',effects:[{effectId:'status',params:{description:'速度 -10%',turns:1}}]},
 skill_024:{name:'踏嶺突拳',type:'attack',power:{hp:60,posture:28},innerCost:20,target:'single_enemy',effects:[{effectId:'status',params:{description:'防禦效果 -15%',turns:1}}]},
 skill_041:{name:'乘風破陣',type:'attack',power:{hp:52,posture:72},target:'single_enemy',effects:[{effectId:'posture_bonus_below_ratio',params:{ratio:.5,bonus:.15}}],tags:['posture_focus']},
 skill_057:{name:'踏葉封穴',type:'control',power:{hp:26,posture:22},target:'single_enemy',effects:[{effectId:'status',params:{description:'內力消耗 +15%',turns:2}}]},
 skill_064:{name:'流影鎖步',type:'control',power:{hp:28,posture:27},target:'single_enemy',effects:[{effectId:'status',params:{description:'速度 -10%',turns:2}}]},
 skill_075:{name:'化勁反掌',type:'attack',power:{hp:27,posture:12},target:'single_enemy',effects:[{effectId:'status',params:{description:'攻擊傷害 -10%',turns:1}}]},
 skill_081:{name:'截擊劍',type:'attack',power:{hp:100,posture:52},target:'single_enemy',effects:[{effectId:'status',params:{description:'架勢恢復 -20%',turns:1}}]},
 skill_082:{name:'江湖絆步',type:'control',power:{hp:15,posture:14},target:'single_enemy',effects:[{effectId:'status',params:{description:'架勢恢復 -20%',turns:2}}]},
 skill_095:{name:'回風反擊',type:'attack',power:{hp:66,posture:30},innerCost:24,target:'single_enemy',effects:[{effectId:'status',params:{description:'防禦效果 -15%',turns:2}}]}
});

export function adaptSkillArchetype(skill){
 const revision=ROLE_REVISIONS[skill.id];
 if(revision)return {...skill,...revision,tags:revision.tags??[]};
 if(skill.type==='posture')return {...skill,type:'attack',tags:[...skill.tags,'posture_focus']};
 if(skill.type==='mobility')return {...skill,type:'support',target:'self',tags:[...skill.tags,'evasion']};
 if(skill.type!=='guard')return skill;
 const effect=SUPPORT_EFFECTS[skill.id];
 if(!effect)throw new Error(`缺少支援武功設定：${skill.id}`);
 const healing=effect.heal!=null;
 return {...skill,type:'support',target:healing?'single_ally':'all_allies',effects:[healing?{effectId:'heal_pct',params:{value:effect.heal}}:{effectId:'battle_buff',params:{stat:effect.stat,value:effect.value,turns:3}}],tags:[...skill.tags,healing?'healing':'team_buff']};
}
