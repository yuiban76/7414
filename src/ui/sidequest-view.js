import { SIDEQUESTS, SIDEQUEST_CLUES } from '../data/zhaoye-sidequests.js';
import { availableSidequests, SIDEQUEST_STATUS } from '../systems/sidequest-system.js';
import { COMPANION_NAMES } from '../core/zhaoye-fates.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export function sidequestPanel(world) {
  if (!world.zhaoye || world.zhaoye.selectedSidequest) return '';
  const quests = availableSidequests(world);
  if (!quests.length) return '';
  return `<section class="journey-card sidequest-card" aria-label="此地支線"><p class="eyebrow">此地支線 · ${quests.length} 趟未竟的路</p>${quests.map(q => { const p = world.zhaoye.sidequests[q.id]; return `<article><h3>${esc(q.name)}</h3><p>${p ? `已走到「${esc(q.scenes[p.step].title)}」` : esc(q.scenes[0].text.split('\n\n')[0])}</p><p class="muted">${q.endChapter > q.startChapter ? `跨章故事 · 第 ${q.startChapter} 至 ${q.endChapter} 章` : `第 ${q.startChapter} 章支線`} · 可暫緩，啟程前再決定</p><button class="btn" data-sidequest="${q.id}">${p ? '續接這一趟' : '查看故事與接取'}</button></article>`; }).join('')}</section>`;
}
export function sidequestJournal(world, locations = []) {
  if (!world.zhaoye) return '';
  const rows = SIDEQUESTS.filter(q => world.chapter >= q.startChapter).map(q => {
    const p = world.zhaoye.sidequests?.[q.id], step = p?.step ?? 0;
    const locationId = step >= 3 ? q.places.at(-1) : q.places[0];
    const place = locations.find(l => l.id === locationId)?.name ?? ({ location_018:'鴉渡', location_017:'赤水埠', location_007:'雁回城', location_012:'汀州', location_004:'青衡山', location_001:'承京', location_016:'鎖雲關／照夜臺' })[locationId];
    const terminal = ['completed', 'closed'].includes(p?.status);
    const waiting = !terminal && q.scenes[step].chapter > world.chapter;
    const clues = (SIDEQUEST_CLUES[q.id] ?? []).slice(0, p?.battles.length ?? 0);
    const label = p?.status === 'waiting' && !waiting ? SIDEQUEST_STATUS.active : SIDEQUEST_STATUS[p?.status ?? 'available'];
    return `<details class="journal-investigations"><summary>${esc(q.name)} · ${label}</summary><p>${terminal ? esc(p.summary) : waiting ? `下一段在第 ${q.scenes[step].chapter} 章的${esc(place)}開放。` : `下一步：${esc(place)} · ${esc(q.scenes[step].title)}`}</p>${clues.length ? `<h4>已知線索 · 尚須主線核驗</h4>${clues.map(text => `<p>${esc(text)}</p>`).join('')}` : ''}${terminal ? `<button class="btn" data-sidequest="${q.id}">回看結果</button>` : `<button class="btn" data-travel="${locationId}">前往${esc(place)}</button>`}</details>`;
  });
  const fates = Object.entries(world.zhaoye.fates ?? {});
  return `<section class="sidequest-journal"><h3>十二趟江湖支線</h3>${rows.join('') || '<p>抵達鴉渡後，開始遇見主線以外的人。</p>'}<h3>同行者的去向</h3>${fates.length ? fates.map(([id, fate]) => `<p>${COMPANION_NAMES[id]} · ${fate.status === 'dead' ? '已死亡，名字留在記事中' : '永久離隊，另走自己的路'}</p>`).join('') : '<p>目前沒有永久死亡或離隊的同行者。</p>'}</section>`;
}
export function sidequestMapLabels(world, place) {
  return availableSidequests(world, place).map(q => q.name);
}
