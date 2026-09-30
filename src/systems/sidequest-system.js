import { SIDEQUESTS, SIDEQUEST_BY_ID } from '../data/zhaoye-sidequests.js';
import { companionAvailable, presentCastText, recordFate, COMPANION_NAMES } from '../core/zhaoye-fates.js';

export const SIDEQUEST_STATUS = { available: '未接', active: '進行中', waiting: '待後章', completed: '已完成', closed: '已結算' };
export function initSidequests(world) {
  const s = world.zhaoye;
  s.sidequests ??= {}; s.sidequestRewards ??= []; s.fates ??= {}; s.sidequestNotes ??= [];
  return s;
}
function progress(world, id) { return world.zhaoye?.sidequests?.[id]; }
function canAct(world) { const s = world.zhaoye; return !!s && !world.flags.game_complete && !s.activeBattle && !s.aftermath && !s.supplement && !s.events?.[world.currentSceneId]?.operation; }
export function availableSidequests(world, place = world.currentLocationId) {
  if (!canAct(world)) return [];
  return SIDEQUESTS.filter(q => {
    const p = progress(world, q.id);
    if (p?.status === 'completed' || p?.status === 'closed') return false;
    if (!p && world.chapter !== q.startChapter) return false;
    const step = p?.step ?? 0;
    if (q.scenes[step].chapter > world.chapter || world.chapter > q.endChapter) return false;
    const expectedPlace = step >= 3 ? q.places.at(-1) : q.places[0];
    return expectedPlace === place;
  });
}
export function sidequestView(world, id) {
  const q = SIDEQUEST_BY_ID[id]; if (!q) throw new Error('支線不存在');
  const p = progress(world, id);
  if (p?.status === 'completed' || p?.status === 'closed') return { title: q.name, text: p.summary, choices: [{ id: 'leave', label: '返回江湖' }] };
  if (!availableSidequests(world).some(row => row.id === id)) throw new Error('請到支線標記地點，或等待下一段開放');
  if (p?.confirmation) {
    const outcome = q.scenes[p.step].outcomes.find(row => row.id === p.confirmation);
    return { title: '最後確認 · ' + q.name, text: `${outcome.danger}\n\n這個決定將寫入人物命運。普通戰敗不會造成此後果；現在仍可返回，選擇另一條路。`, choices: [{ id: 'confirm', label: '我理解後果，確認這個決定', danger: true }, { id: 'cancel', label: '返回，重新選擇' }], danger: true };
  }
  if (p?.pendingBattle) return { title: q.name, text: '本場交鋒尚未結算，請先完成戰鬥。', choices: [] };
  const node = q.scenes[p?.step ?? 0];
  let choices = !p ? [{ id: 'accept', label: '接下這一趟' }] : node.battle ? [{ id: 'battle', label: '拔劍，完成救援與交鋒' }] : node.outcomes ? node.outcomes.map(row => ({ id: row.id, label: row.label, danger: !!row.danger })) : [{ id: 'continue', label: p.step === 2 && q.endChapter > world.chapter ? '記下重逢之約，等待後章' : '循線前行' }];
  choices.push({ id: 'leave', label: '暫緩，返回江湖' });
  return { title: node.title, text: [p?.feedback, presentCastText(world, node.text)].filter(Boolean).join('\n\n'), choices, questId: id, step: p?.step ?? 0, count: q.scenes.length };
}
export function chooseSidequest(world, character, id, choiceId) {
  const view = sidequestView(world, id);
  if (!view.choices.some(row => row.id === choiceId)) throw new Error('支線選項目前不可執行');
  if (choiceId === 'leave') return { leave: true };
  const s = initSidequests(world), q = SIDEQUEST_BY_ID[id];
  if (choiceId === 'accept') { s.sidequests[id] = { status: 'active', step: 1, choices: [], battles: [], actions: 0 }; return {}; }
  const p = s.sidequests[id], node = q.scenes[p.step];
  if (choiceId === 'cancel') { delete p.confirmation; return {}; }
  if (choiceId === 'battle') {
    p.status = 'active'; p.pendingBattle = `${id}:${p.step}`; p.feedback = null;
    return { battle: true, questId: id, encounterId: p.pendingBattle, step: p.step, enemyName: node.battle.enemy };
  }
  if (choiceId === 'continue') { p.step++; p.feedback = null; p.status = q.scenes[p.step].chapter > world.chapter ? 'waiting' : 'active'; return { leave: p.status === 'waiting' }; }
  const key = choiceId === 'confirm' ? p.confirmation : choiceId;
  const outcome = node.outcomes.find(row => row.id === key);
  if (!outcome) throw new Error('支線結果無效');
  if (outcome.danger && choiceId !== 'confirm') { p.confirmation = key; return {}; }
  if (outcome.fate && !companionAvailable(world, outcome.fate.npcId)) throw new Error('此人物命運已結算');
  if (outcome.fate) recordFate(world, outcome.fate, id);
  if (id === 'sq03') {
    s.oldCaseSubmitted = true; s.oldCaseStrategy = 'submitted';
    if (s.promises.oldCase) s.promises.oldCase.status = 'fulfilled';
  }
  p.status = 'completed'; p.outcome = key; p.choices.push(key); p.summary = outcome.text; delete p.confirmation;
  s.sidequestNotes.push({ questId: id, chapter: world.chapter, text: outcome.text });
  if (!s.sidequestRewards.includes(id)) { s.sidequestRewards.push(id); character.moneyWen += 100; character.cultivation = (character.cultivation ?? 0) + 50; }
  return { complete: true };
}
export function sidequestBattleGoal(world, choice) {
  const q = SIDEQUEST_BY_ID[choice.questId], p = progress(world, choice.questId);
  if (!q || !p || p.pendingBattle !== choice.encounterId || p.step !== choice.step) throw new Error('交鋒與支線不符');
  return { objectives: q.scenes[p.step].battle.objectives, done: p.actions, limit: Infinity };
}
export function sidequestBattleAction(world, choice) {
  const goal = sidequestBattleGoal(world, choice), p = progress(world, choice.questId);
  if (p.actions < goal.objectives.length) p.actions++;
}
export function settleSidequestBattle(world, choice, battle) {
  const goal = sidequestBattleGoal(world, choice), p = progress(world, choice.questId);
  if (!['victory', 'defeat'].includes(battle.finished)) throw new Error('交鋒尚未結束');
  const complete = battle.finished === 'victory' && goal.done >= goal.objectives.length;
  delete p.pendingBattle; p.actions = 0;
  if (!complete) { p.feedback = '接應者帶你撤回。人物沒有因此死亡，尚未發放獎勵；整備後可重試，需同時完成救援操作與擊退敵人。'; return { retry: true }; }
  p.battles.push(choice.encounterId); p.step++; p.feedback = '受困者已經走過撤離通道。收劍之後，還有話需要說清楚。'; return {};
}
export function closeChapterSidequests(world, chapter) {
  const s = initSidequests(world);
  for (const q of SIDEQUESTS) {
    const p = s.sidequests[q.id];
    if (p?.status === 'completed' || p?.status === 'closed') continue;
    if (!(q.endChapter === chapter || (q.startChapter === chapter && (!p || p.step < 3)))) continue;
    if (p?.pendingBattle) throw new Error('支線交鋒未結束，不能啟程');
    const summary = `${q.name}由當地接應者接手；你沒有完成這一趟，也未取得獎勵或具名支援。同行者沒有因略過任務死亡。`;
    s.sidequests[q.id] = { status: 'closed', step: p?.step ?? 0, choices: p?.choices ?? [], battles: p?.battles ?? [], actions: 0, summary };
  }
}
export function sidequestCallbacks(world, sceneId) {
  return SIDEQUESTS.filter(q => q.callback.scene === sceneId && progress(world, q.id)?.status === 'completed').map(q => q.callback[progress(world, q.id).outcome]).filter(Boolean).join('\n\n');
}
export function sidequestEpilogue(world) {
  return SIDEQUESTS.filter(q => progress(world, q.id)?.status === 'completed').map(q => `${q.name}｜${progress(world, q.id).summary}${q.callback.scene === 'ending' ? '\n'+q.callback[progress(world,q.id).outcome] : ''}`).join('\n\n');
}
export function sidequestEnemyDefinition(choice, chapter, base) {
  const objectives = SIDEQUEST_BY_ID[choice.questId].scenes[choice.step].battle.objectives.length;
  const growth = Math.min(10, (chapter - 1) * 2);
  return { ...base, id: 'enemy_950', name: choice.enemyName, tier: 'elite', stats: { strength: 14 + growth, constitution: 17 + growth, agility: 15 + growth, comprehension: 16, willpower: 16 }, damageMultiplier: objectives ? .5 : .65, skillIds: [], phases: [], aiProfile: 'training', observeInfo: ['先看撤離通道，再決定攻守。', '救援操作佔用一個回合，完成後再擊退敵人。', '失利可整備重試，不會直接造成永久死亡。'] };
}
export function validateSidequests(world) {
  const s = world.zhaoye; if (!s) return;
  if (s.storyRevision !== 2) throw new Error('故事版本已更新，請重新創角開局。');
  for (const key of ['sidequests', 'fates']) if (!s[key] || typeof s[key] !== 'object' || Array.isArray(s[key])) throw new Error('支線存檔結構無效');
  if (!Array.isArray(s.sidequestRewards) || new Set(s.sidequestRewards).size !== s.sidequestRewards.length || s.sidequestRewards.some(id => !SIDEQUEST_BY_ID[id] || s.sidequests[id]?.status !== 'completed')) throw new Error('支線獎勵存檔無效');
  if (!Array.isArray(s.sidequestNotes) || s.sidequestNotes.length > 12 || s.sidequestNotes.some(n => !SIDEQUEST_BY_ID[n.questId] || typeof n.text !== 'string' || n.text.length > 2000)) throw new Error('支線記事無效');
  if (s.selectedSidequest != null && !SIDEQUEST_BY_ID[s.selectedSidequest]) throw new Error('支線畫面存檔無效');
  for (const [id, p] of Object.entries(s.sidequests)) {
    const q = SIDEQUEST_BY_ID[id];
    if (!q || !['active', 'waiting', 'completed', 'closed'].includes(p.status) || !Number.isInteger(p.step) || p.step < 0 || p.step >= q.scenes.length || !Array.isArray(p.choices) || !Array.isArray(p.battles) || new Set(p.battles).size !== p.battles.length || !Number.isInteger(p.actions) || p.actions < 0) throw new Error('支線進度無效');
    const node = q.scenes[p.step], validBattles = q.scenes.flatMap((n, i) => n.battle ? [`${id}:${i}`] : []);
    if (p.battles.some(b => !validBattles.includes(b)) || p.battles.length !== q.scenes.slice(0, p.step).filter(n => n.battle).length && p.status !== 'closed') throw new Error('支線交鋒進度缺失');
    if (p.pendingBattle && (!node.battle || p.pendingBattle !== `${id}:${p.step}` || p.actions > node.battle.objectives.length)) throw new Error('支線交鋒無效');
    if (p.pendingBattle && (s.activeBattle?.choice?.questId !== id || s.activeBattle.choice.encounterId !== p.pendingBattle)) throw new Error('支線交鋒快照缺失');
    if (!p.pendingBattle && p.actions !== 0) throw new Error('支線操作存檔無效');
    if (p.confirmation && !node.outcomes?.some(o => o.id === p.confirmation && o.danger) || p.status === 'completed' && (!node.outcomes?.some(o => o.id === p.outcome) || !s.sidequestRewards.includes(id))) throw new Error('支線結局存檔無效');
    if (p.status === 'completed') { const fate = node.outcomes.find(o => o.id === p.outcome).fate; if (fate && (s.fates[fate.npcId]?.questId !== id || s.fates[fate.npcId]?.status !== fate.status)) throw new Error('人物命運與支線不符'); }
  }
  for (const [id, fate] of Object.entries(s.fates)) {
    const q = SIDEQUEST_BY_ID[fate.questId], p = s.sidequests[fate.questId], outcome = q?.scenes.at(-1).outcomes.find(o => o.id === p?.outcome);
    if (!COMPANION_NAMES[id] || p?.status !== 'completed' || outcome?.fate?.npcId !== id || outcome.fate.status !== fate.status || world.party.npcIds.includes(id)) throw new Error('人物命運存檔無效');
  }
  if (s.activeBattle?.choice?.questId) {
    const choice = s.activeBattle.choice;
    sidequestBattleGoal(world, choice);
    if (s.selectedSidequest !== choice.questId) throw new Error('支線戰鬥與畫面不符');
  }
}
