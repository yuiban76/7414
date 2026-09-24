import { postureFocus, skillTypeLabel, skillEffectLabel } from './skill-display.js';
import { skillArtName } from './skill-art.js';

const INTRODUCTIONS = Object.freeze({
  skill_001: '低內耗的穩定攻擊，適合長戰與保留內力。',
  skill_002: '控制對手內息；命中時額外耗其內力，並短暫提高其招式消耗。',
  skill_003: '專攻架勢；完成鏢路拳譜奇遇後可接上破勢連攻。',
  skill_004: '以重刀削弱架勢，適合先打出破綻再集中攻擊。',
  skill_005: '氣血基礎威力高，適合集中攻擊單一敵人。',
  skill_006: '不造成傷害；本回合減少氣血傷害 45%、架勢傷害 30%。',
  skill_007: '命中時額外耗敵人內力，並使其速度降低 10% 一回合。',
  skill_008: '命中時額外耗敵人內力，並短暫提高其招式消耗。',
  skill_009: '不造成傷害；本回合減少氣血傷害 45%、架勢傷害 30%。',
  skill_010: '偏重氣血傷害，適合削減單一敵人的生命。',
  skill_011: '起始招式中架勢基礎威力最高，適合迅速打出破綻。',
  skill_012: '不造成傷害；有 55% 機率避開下一次攻擊，回合結束失效。',
  skill_013: '只消耗少量內力的貼身攻擊，可以頻繁使用。',
  skill_014: '不造成傷害；有 55% 機率避開下一次攻擊，回合結束失效。',
  skill_015: '集中攻擊敵人的架勢，為後續攻勢創造破綻。',
  skill_016: '偏重氣血傷害，內力消耗比更強的斷風刀低。',
  skill_017: '氣血基礎威力高，但每次施展需要較多內力。',
  skill_018: '不耗內力的破勢招式，長戰也能持續使用。'
});

export function startingSkillOptions(identity, skills) {
  return identity.skills.map(name => {
    const skill=skills.find(entry=>entry.name===name);
    if(!skill||!INTRODUCTIONS[skill.id])throw new Error(`起始武功資料不完整：${name}`);
    return {name:skill.name,type:skillTypeLabel(skill),hp:skill.power.hp,posture:skill.power.posture,innerCost:skill.innerCost,introduction:INTRODUCTIONS[skill.id],postureFocus:postureFocus(skill),effect:skillEffectLabel(skill),art:skillArtName(skill)};
  });
}
