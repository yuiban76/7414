import fs from 'node:fs';
import {CHAPTERS,FLAGS} from '../docs/manuscript-v3/scene-map.mjs';
import {readChapter} from './validate-manuscript-v3.mjs';
const places=['照溪山','柳橋','河梁','松嶺','槐州','白石','霜草廬','北上軍運道','重門關','定京'];
const locations=['018','017','005','004','001','006','012','007','016','015'];
const playRoot=new URL('../docs/play-edition/',import.meta.url);
const edition=Object.assign({},...['01-03.json','04-06.json','07-09.json','10.json'].map(name=>JSON.parse(fs.readFileSync(new URL(name,playRoot),'utf8'))));
const leads=JSON.parse(fs.readFileSync(new URL('encounter-leads.json',playRoot),'utf8'));
const ids=new Set(CHAPTERS.flatMap(c=>c.scenes.map(s=>s.id)));
if(Object.keys(edition).length!==ids.size||Object.keys(edition).some(id=>!ids.has(id)))throw Error('精簡正文場景覆蓋不完整');
const gates=text=>text.match(/^### (?:\[[a-z0-9_]+=[a-z]+\]|共通)\s*$/gm)?.map(s=>s.trim())??[];
const story={revision:3,presentation:{edition:'paced',maxScenes:4,maxHan:600},battleLeads:leads,flags:FLAGS,chapters:CHAPTERS.map((c,i)=>{
 const source=readChapter(fs.readFileSync(new URL(`../docs/manuscript-v3/${c.file}`,import.meta.url),'utf8'));
 return {chapter:c.chapter,title:c.title,place:places[i],locationId:`location_${locations[i]}`,scenes:c.scenes.map(s=>{
  const text=source.find(x=>x.id===s.id)?.body;if(!text)throw Error(s.id);
  const playText=edition[s.id];
  if(typeof playText!=='string'||!playText.trim()||/TODO|待補|示意正文/.test(playText))throw Error(`${s.id} 缺少精簡正文`);
  if(JSON.stringify(gates(text))!==JSON.stringify(gates(playText)))throw Error(`${s.id} 精簡正文的條件段不符`);
  if(s.encounter&&!leads[s.encounter])throw Error(`${s.encounter} 缺少戰前情境`);
  return {...s,text,playText};
 })};})};
fs.writeFileSync(new URL('../src/data/revenge-story.json',import.meta.url),JSON.stringify(story)+'\n');
console.log(`Exported ${story.chapters.length} chapters, ${story.chapters.flatMap(c=>c.scenes).length} scenes.`);
