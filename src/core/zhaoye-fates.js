export const COMPANION_NAMES = { npc_001: '葉停舟', npc_002: '沈照微', npc_003: '殷紅袖', npc_004: '阿史那衡', npc_005: '蘇問棠' };
export const STAND_INS = { npc_001: '鏢路教習程野', npc_002: '清查書吏方璧', npc_003: '受害者代理林嫂', npc_004: '斥候烏祁', npc_005: '醫工鄭雨' };
export function companionAvailable(world, id) {
  return !['dead', 'departed'].includes(world.zhaoye?.fates?.[id]?.status);
}
export function recordFate(world, fate, questId) {
  if (!COMPANION_NAMES[fate.npcId] || !['dead', 'departed'].includes(fate.status)) throw new Error('人物命運無效');
  const fates = world.zhaoye.fates ??= {};
  if (fates[fate.npcId]) throw new Error('人物命運已結算');
  fates[fate.npcId] = { status: fate.status, questId };
  world.party.npcIds = world.party.npcIds.filter(id => id !== fate.npcId);
  world.npcStates[fate.npcId] = { availability: fate.status, permanent: true };
  for (const key of Object.keys(world.zhaoye.assignments ?? {})) {
    if (world.zhaoye.assignments[key] === fate.npcId) delete world.zhaoye.assignments[key];
  }
}
// Personal speeches are omitted, not handed to somebody else's character.
// Essential scene objectives remain in the battle/choice interface.
export function presentCastText(world, text) {
  let paragraphs = String(text ?? '').split('\n\n');
  const substitutes = [];
  for (const [id, name] of Object.entries(COMPANION_NAMES)) {
    if (companionAvailable(world, id)) continue;
    const mentioned = String(text ?? '').includes(name);
    paragraphs = paragraphs.filter(p => !p.includes(name));
    if (mentioned) substitutes.push(`${name}${world.zhaoye.fates[id].status === 'dead' ? '已不在人世' : '已另走自己的路'}。這一程由${STAND_INS[id]}接應，現場調查、護送與必要操作仍由你完成。`);
  }
  return [...paragraphs, ...substitutes].join('\n\n');
}
