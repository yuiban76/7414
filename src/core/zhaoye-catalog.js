import { ZHAOYE_CHAPTERS, ZHAOYE_PLACES, MAJOR } from './zhaoye-story.js';
const originals=new WeakMap();
export function useStoryCatalog(content,enabled){
 if(!originals.has(content))originals.set(content,structuredClone(content));
 const base=originals.get(content);
 for(const key of ['chapters','npcs','factions','locations'])content[key]=structuredClone(base[key]);
 if(!enabled)return;
 content.chapters.forEach((chapter,index)=>{chapter.name=ZHAOYE_CHAPTERS[index];const id=Object.keys(MAJOR).find(key=>Number(key[0])===index+1);chapter.majorChoices=MAJOR[id].map((label,i)=>({id:`zhaoye_${id}_${'ABC'[i]}`,label,effects:[]}));});
 const names=['葉停舟','沈照微','殷紅袖','阿史那衡','蘇問棠'];
 const descriptions=['鏢盟青年，追查失蹤師父與自己的遲報責任。','捕快，重新追查自己簽封的舊案。','血河外堂舊人，承認護送涉案貨物，仍須提交舊罪。','北朔斥候，核查自己經手的未登記徵工。','百草医者，尋回自己簽保證的醫工。'];
 content.npcs.slice(0,5).forEach((npc,i)=>{npc.name=names[i];npc.introduction=descriptions[i];npc.recruitConditions=i?[{chapterAtLeast:[1,1,2,3,4][i]}]:[];});
 ['青衡劍宗','照岳寺','棲霞觀','寒川派','鐵衣門','百草谷','血河門','無聲樓','天下鏢盟','四海商會','行腳幫','三國官府軍鎮'].forEach((name,i)=>{if(content.factions[i])content.factions[i].name=name;});
 // Preserve IDs and the travel graph; only authored destination names change.
 const places={location_001:'承京',location_004:'青衡山',location_005:'柳津',location_007:'雁回城',location_012:'汀州',location_016:'鎖雲關',location_017:'赤水埠',location_018:'鴉渡'};
 content.locations.forEach(location=>{if(places[location.id])location.name=places[location.id];});
}
