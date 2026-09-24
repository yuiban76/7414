// Shared scene art keeps every technique card illustrated without adding image data to saves.
const ART_NAMES=new Set(['blade','sword','spear','staff','fist','needle','grappling','defense','healing','rally','footwork','qi','posture']);
const OVERRIDES=Object.freeze({
 skill_013:'fist',
 skill_019:'sword',
 skill_021:'sword',
 skill_023:'footwork',
 skill_036:'qi',
 skill_037:'qi',
 skill_041:'posture',
 skill_051:'qi',
 skill_053:'qi',
 skill_059:'needle',
 skill_082:'footwork',
 skill_091:'needle',
 skill_095:'fist',
 skill_096:'qi'
});

export function skillArtName(skill){
 if(OVERRIDES[skill.id])return OVERRIDES[skill.id];
 const effects=skill.effects??[];
 if(effects.some(effect=>effect.effectId==='heal_pct'))return 'healing';
 if(effects.some(effect=>effect.effectId==='battle_buff'))return 'rally';
 if(effects.some(effect=>effect.effectId==='dodge'))return 'footwork';
 if(skill.type==='defense')return 'defense';
 const name=skill.name??'';
 if(/[劍]/u.test(name))return 'sword';
 if(/[刀斬]/u.test(name))return 'blade';
 if(/[槍]/u.test(name))return 'spear';
 if(/[棍杖]/u.test(name))return 'staff';
 if(/[針指穴脈袖]/u.test(name))return 'needle';
 if(/[拳掌肘]/u.test(name))return 'fist';
 if(/[步身影]/u.test(name))return 'footwork';
 if(/[拿擒鎖牽纏手]/u.test(name))return 'grappling';
 if(skill.tags?.includes('posture_focus'))return 'posture';
 return 'qi';
}

export function skillArtStyle(skill){
 const name=typeof skill==='string'?skill:skillArtName(skill);
 if(!ART_NAMES.has(name))throw new Error(`未知武功圖片：${name}`);
 return `style="--skill-art:url('../assets/skills/${name}.jpg')"`;
}
