import { REALMS } from "../config/constants.js";
import { calculateRealm, TRAINING_SCORE_CAP } from "../systems/realm-system.js";

export function characterLevelView(character) {
  const growth = calculateRealm(character);
  const title = REALMS[growth.realm] ?? REALMS[0];
  const progressLabel = growth.level === 100
    ? `已達最高等級 · 修練總分 ${growth.trainingScore}／${TRAINING_SCORE_CAP}`
    : `本級修練 ${growth.progress}／${growth.progressRequired} 點 · 總修練 ${growth.trainingScore}／${TRAINING_SCORE_CAP}`;
  return `<div class="character-level" aria-label="角色等級進度"><div class="character-level-heading"><strong>角色等級 ${growth.level}／100</strong><span>稱號 · ${title}</span></div><progress class="character-level-bar" value="${growth.progress}" max="${growth.progressRequired}" aria-label="下一級修練進度">${growth.progressPercent}%</progress><small>${progressLabel}</small><small>武功熟練、研習內功與打通經脈可升級；等級不額外提高戰鬥數值。</small></div>`;
}
