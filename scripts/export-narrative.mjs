import fs from 'node:fs';
import { OPENING_REWRITE,NARRATIVE_REWRITE } from '../src/data/zhaoye-narrative.js';
import { SIDEQUESTS, SIDEQUEST_CLUES } from '../src/data/zhaoye-sidequests.js';
import { ZHAOYE_SCENES } from '../src/core/zhaoye-story.js';
const sections=['# 《照夜行》新版主線與十二條支線作者稿','版本：故事修訂 2。此稿由遊戲內作者資料輸出；正文修改請編輯 `zhaoye-narrative.js` 與 `zhaoye-sidequests.js`，再執行 `node scripts/export-narrative.mjs`。原機械匯入劇本保持不變。','## 主線','### 1-0 序章新增伏筆',OPENING_REWRITE];
for(const [id,text] of Object.entries(NARRATIVE_REWRITE))sections.push(`### ${id} ${ZHAOYE_SCENES[id].title}`,text,`保留的行動選項：${ZHAOYE_SCENES[id].choices.map(c=>c.label).join('；')}。`);
sections.push('## 十二條支線');
for(const q of SIDEQUESTS){sections.push(`### ${q.id} ${q.name}`,`開放：第 ${q.startChapter} 章；結算期限：第 ${q.endChapter} 章。`);for(const [i,s] of q.scenes.entries()){sections.push(`#### ${i+1}. ${s.title}`,s.text);if(s.battle)sections.push(`交鋒：${s.battle.enemy}；場景操作：${s.battle.objectives.join('、')||'擊退敵人'}。`);for(const o of s.outcomes??[])sections.push(`**${o.label}**`,o.text,...(o.danger?[`確認提示：${o.danger}`]:[]));}sections.push('#### 已知線索（依已完成交鋒顯示）',...(SIDEQUEST_CLUES[q.id]??[]),'#### 後續回應',`回收場景：${q.callback.scene}`,...q.scenes.at(-1).outcomes.map(o=>`${o.id}：${q.callback[o.id]}`));}
fs.writeFileSync(new URL('../docs/照夜行_新版主線與十二支線作者稿.md',import.meta.url),sections.join('\n\n')+'\n');
console.log('Author manuscript exported.');
