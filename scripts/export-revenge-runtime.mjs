import fs from 'node:fs';
import {CHAPTERS,FLAGS} from '../docs/manuscript-v3/scene-map.mjs';
import {readChapter} from './validate-manuscript-v3.mjs';
const places=['照溪山','柳橋','河梁','松嶺','槐州','白石','霜草廬','北上軍運道','重門關','定京'];
const locations=['018','017','005','004','001','006','012','007','016','015'];
const story={revision:3,flags:FLAGS,chapters:CHAPTERS.map((c,i)=>{
 const source=readChapter(fs.readFileSync(new URL(`../docs/manuscript-v3/${c.file}`,import.meta.url),'utf8'));
 return {chapter:c.chapter,title:c.title,place:places[i],locationId:`location_${locations[i]}`,scenes:c.scenes.map(s=>{
  const text=source.find(x=>x.id===s.id)?.body;if(!text)throw Error(s.id);
  return {...s,text};
 })};})};
fs.writeFileSync(new URL('../src/data/revenge-story.json',import.meta.url),JSON.stringify(story)+'\n');
console.log(`Exported ${story.chapters.length} chapters, ${story.chapters.flatMap(c=>c.scenes).length} scenes.`);
