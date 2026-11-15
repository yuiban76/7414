import { isScenarioObjectiveOverdue } from '../systems/battle-system.js';

const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderScenarioAction(goal,round) {
  if(!goal || goal.done>=goal.objectives.length)return '';
  const overdue=isScenarioObjectiveOverdue(goal,round);
  const note=goal.objectives[goal.done]+(overdue?' · 已超過期限':' · 佔用本回合');
  return `<div class="combat-mission"><button class="btn choice-btn combat-command" data-combat-action='{"type":"objective"}' ${overdue?'disabled':''}><strong>場景行動</strong><small>${escapeHtml(note)}</small></button><p class="combat-note">推進護送、救援或機關等本場目標；完成目標才能取得完整場景結果。每次佔用一回合，不會附帶攻擊或防禦。</p></div>`;
}
