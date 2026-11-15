// Keep asset IDs and the travel graph stable while replacing the main-story cast.
export const REVENGE_CHAPTER_TITLES = [
  '山門血夜','雨巷追魂','血債山莊','義旗藏刃','權門赴宴',
  '斷岳壓城','殘招再起','千里索命','黑甲終局','照夜而行'
];
export const REVENGE_DESTINATIONS = [
  ['location_018','照溪山'],['location_017','柳橋'],['location_005','河梁'],
  ['location_004','松嶺'],['location_001','槐州'],['location_006','白石'],
  ['location_012','霜草廬'],['location_007','北上軍運道'],
  ['location_016','重門關'],['location_015','定京']
];
const companionCast = [
  {name:'宋硯',role:'攻擊／身法',portrait:'./assets/identities/wanderer.jpg',introduction:'照溪門師弟阿硯，會算帳、記路，也要自己選擇站在哪裡。',chapter:1},
  {name:'陸見霜',role:'控制／護衛',portrait:'./assets/identities/constable.jpg',introduction:'追查軍令的捕快，出手前先看旁人，願意承擔違令的代價。',chapter:2},
  {name:'程渡',role:'攻擊／破勢',portrait:'./assets/identities/escort.jpg',introduction:'先找退路的逃兵，嘴上愛說散夥，會悄悄替同行者補鞋。',chapter:2}
];
const factionNames=['照溪門','慈雲寺','清風觀','松嶺岳家','重門守軍','西嶺醫廬','洪家軍械坊','禁武司','北道車行','河梁商會','柳橋行腳會','大寧州縣衙門'];
const otherPlaces={location_002:'照溪山下',location_003:'柳橋近郊',location_008:'石嶺',location_009:'北道驛站',location_010:'雙井村',location_011:'西嶺山口',location_013:'西嶺藥市',location_014:'定京南郊'};

export function applyRevengeCatalog(content) {
  if(!content || !Array.isArray(content.chapters) || !Array.isArray(content.locations))throw new Error('新主線目錄缺少章節或地圖資料');
  const oldChapters=content.chapters;
  const authored=content.revengeStory?.chapters??[];
  content.chapters=REVENGE_CHAPTER_TITLES.map((name,i)=>{
    const chapter=i+1, source=authored.find(c=>c.chapter===chapter);
    const base=oldChapters[Math.min(i,oldChapters.length-1)]??{};
    return {...structuredClone(base),id:`chapter_${chapter}`,chapter,name:source?.title??name,
      place:source?.place??REVENGE_DESTINATIONS[i][1],locationId:source?.locationId??REVENGE_DESTINATIONS[i][0],
      mainQuestId:`quest_chapter_${chapter}`,entryConditions:[],consumesFlags:[],
      majorChoices:(source?.scenes??[]).flatMap(s=>(s.choice?.options??[]).map(o=>({id:`revenge_${s.id.replaceAll('-','_')}_${o.value}`,label:o.label,effects:[]}))),
      nextChapterId:chapter<10?`chapter_${chapter+1}`:null};
  });
  content.npcs=(content.npcs??[]).map((npc,i)=>{
    const cast=companionCast[i];
    if(!cast)return {...npc,name:'未相識的旅人',introduction:'尚未相識的旅人。',portrait:null,availability:'unavailable',recruitConditions:[{chapterAtLeast:999}],revengeDisabled:true,storyFlags:[]};
    return {...npc,name:cast.name,role:cast.role,growthProfile:cast.role,region:'大寧',portrait:cast.portrait,introduction:cast.introduction,
      recruitConditions:[{chapterAtLeast:cast.chapter}],availability:i?'available':'party',storyFlags:[],revengeDisabled:false};
  });
  content.factions=(content.factions??[]).map((faction,i)=>({...faction,name:factionNames[i]??'大寧地方門庭'}));
  const names={...otherPlaces,...Object.fromEntries(REVENGE_DESTINATIONS)};
  for(const chapter of authored)if(chapter.locationId&&chapter.place)names[chapter.locationId]=chapter.place;
  content.locations=content.locations.map(location=>({...location,name:names[location.id]??location.name}));
  return content;
}
