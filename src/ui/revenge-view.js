import {renderRevengeText} from '../core/revenge-engine.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function revengeMap(world,content){
 const chapters=content.revengeStory.chapters;
 return `<h2>復仇之路</h2><p>主線啟程會前往下一章現場；自由行走不會跳過故事。</p><div class="map-region-list">${chapters.map(c=>`<article class="panel panel-body"><h3>第${c.chapter}章 · ${esc(c.title)}</h3><p>${esc(c.place)} · ${c.chapter<world.chapter?'已走過':c.chapter===world.chapter?'目前主線':'尚未抵達'}</p>${c.chapter<=world.chapter?`<button class="btn" data-travel="${c.locationId}">前往${esc(c.place)}</button>`:''}</article>`).join('')}</div>`;
}
export function revengeJournal(world,content){
 const s=world.zhaoye,scenes=content.revengeStory.chapters.flatMap(c=>c.scenes),history=s.history??s.seenScenes??[];
 const entries=history.map(id=>scenes.find(x=>x.id===id)).filter(Boolean);
 const choices=scenes.filter(x=>x.choice&&s.choices?.[x.choice.flag]).map(x=>`<li>${esc(x.title)}：${esc(x.choice.options.find(o=>o.value===s.choices[x.choice.flag])?.label)}</li>`).join('');
 const cast=[['宋硯','npc_001'],['陸見霜','npc_002'],['程渡','npc_003']].map(([name,id])=>`<li>${name}：${s.choices?.cheng==='leave'&&id==='npc_003'?'已離隊，後續由閔石接應':world.party.npcIds.includes(id)?'同行':'尚未同行'}</li>`).join('');
 return `<h2>照夜行記事</h2><p>第${world.chapter}章 · ${world.flags.game_complete?'十章已完成':'主線進行中'}</p><h3>已作選擇</h3><ul>${choices||'<li>尚未作出重大選擇。</li>'}</ul><h3>人物去向</h3><ul>${cast}</ul><h3>行過的路</h3><ol>${entries.map(x=>`<li><details><summary>${esc(x.id)} · ${esc(x.title)}</summary><div class="scene-copy">${esc(renderRevengeText(x.text,s.choices))}</div></details></li>`).join('')}</ol>`;
}
