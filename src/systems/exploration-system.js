// Optional, deterministic journeys. Main-story flags are deliberately not used here.
export const FLOW = Object.freeze({skillId:'skill_003',postureMultiplier:1.8,followPower:44,followPosture:24,innerRefund:12});
export const JOURNEY_PLACES=['location_005','location_006','location_004'];
export function journey(world){return world.zhaoye?.journey??{completed:[],declined:false,stage:0,notes:[]};}
function writable(world){if(!world.zhaoye)throw new Error('此奇遇只適用照夜行');return world.zhaoye.journey??={completed:[],declined:false,stage:0,notes:[]};}
const events=[
 {id:'flow_rumor',place:'location_005',title:'茶棚裡的拳譜',text:'葉停舟翻出一張鏢路舊箋：朔京郊外仍有人練八方拳的連攻法。先學如何破勢，再到青衡山尋回後半篇。這一趟不涉案卷，你隨時可以回來查案。',label:'記下朔京郊外的線索',requires:[]},
 {id:'flow_fragment',place:'location_006',title:'郊外試拳',text:'郊外練武人替過路鏢客修補木樁。他答應傳授破勢口訣，請你先扶好倒下的拳架。你若不願受教，也可與他交手，自行參悟。',label:'扶起拳架，請教口訣',requires:['flow_rumor']},
 {id:'flow_alternative',place:'location_006',title:'以拳問路',text:'你沒有拜師。練武人仍將木器擺好：「那就讓招式說話。」這場較量可重試，勝後能自行參悟同一篇口訣。',label:'交手參悟殘招',requires:['flow_rumor'],battle:true},
 {id:'flow_trial',place:'location_006',title:'木樁試招',text:'連成一排的木器正適合試驗架勢。裝上八方拳，再親手打出一次破勢，便能理解口訣中「勢斷而拳不停」的用意。',label:'試招：破勢連攻',requires:['flow_fragment'],battle:true},
 {id:'flow_complete',place:'location_004',title:'山門後半篇',text:'青衡山守譜人看過你的試招筆記，指出連攻最後一處停頓。你依照後半篇調息，終於把破勢與追擊接成一氣。',label:'補全後半篇',requires:['flow_trial']},
 {id:'flow_invitation',place:'location_005',title:'葉停舟的戰帖',text:'茶棚已有人談起你的連攻。葉停舟遞來戰帖：「先過木器陣，再來青衡山與我比一場。勝負之外，我想看看你走出了什麼路。」',label:'接下成名戰帖',requires:['flow_complete']},
 {id:'flow_return',place:'location_006',title:'故地揚威',text:'還是初見時的木器，還是同一排拳架。這一次，你可以用完整的連攻證明自己的進境。',label:'擊破舊日拳架',requires:['flow_invitation'],battle:true},
 {id:'flow_fame',place:'location_004',title:'成名之戰',text:'葉停舟在山門外收起戰帖，以木劍相邀。這是一場與案卷無關的較量；若敗，可整備後再來。',label:'迎戰葉停舟',requires:['flow_return'],battle:true},
 {id:'flow_recognition',place:'location_005',title:'江湖記得這一拳',text:'你回到茶棚，鏢客讓出一席：「破陣客，請。」昔日攔路的練武人也拱手退讓。葉停舟將你的戰績寫進鏢路記事——這套本事有了自己的來處。',label:'記下這段江湖路',requires:['flow_fame']}
];
export function availableJourneyEvents(world,place=world.currentLocationId){if(!world.zhaoye)return [];const j=journey(world);return events.filter(e=>e.place===place&&!j.completed.includes(e.id)&&e.requires.every(id=>j.completed.includes(id))&&(e.id!=='flow_fragment'||!j.declined)&&(e.id!=='flow_alternative'||j.declined&&!j.completed.includes('flow_fragment')));}
export function journeyStatus(world,place){const j=journey(world);if(world.zhaoye&&!j.completed.includes('flow_rumor')&&place==='location_005')return '新傳聞';if(availableJourneyEvents(world,place).length)return j.completed.some(id=>events.find(e=>e.id===id)?.place===place)?'待返回':'可進行事件';return world.visitedLocations.includes(place)?'已探索':'未到訪';}
export function journeyAction(world,character,id,{victory=false,decline=false}={}){const e=availableJourneyEvents(world).find(e=>e.id===id);if(!e)throw new Error('此事件目前不可進行');const j=writable(world);if(decline){if(id!=='flow_fragment')throw new Error('此事件不可拒絕教學');j.declined=true;j.notes.push('你選擇以交手自行參悟，未接受練武人的教學。');return {message:'你選擇以拳問路，替代挑戰已開啟。'};}if(e.battle&&!victory)return {battle:true,id:e.id,title:e.title};j.completed.push(e.id);j.notes.push(e.title);if(id==='flow_fragment'||id==='flow_alternative'){if(id==='flow_alternative')j.completed.push('flow_fragment');character.skills[FLOW.skillId]??={realm:0,proficiency:0,completeness:1};j.stage=1;}if(id==='flow_trial')j.stage=2;if(id==='flow_complete')j.stage=3;return {message:id==='flow_fame'?'獲得稱號：破陣客。返回柳津，讓故人見證。':e.title+'：已記入江湖記事。'};}
export function flowSummary(world,character){
 const j=journey(world),equipped=character.equippedSkills.includes(FLOW.skillId);
 const next=nextJourneyEvent(world);
 return {stage:j.stage,equipped,next:next?`${next.place==='location_005'?'柳津':next.place==='location_006'?'朔京郊外':'青衡山'}：${next.title}。${['flow_trial','flow_return','flow_fame'].includes(next.id)&&!equipped?'請先裝上八方拳。':''}`:'鏢路拳譜已完成。帶著破陣客的名號，繼續八章江湖路。',title:j.completed.includes('flow_fame')?'破陣客':'無名旅人',effect:['尚未參悟','八方拳架勢傷害 ×1.8','八方拳破勢追加一擊，每回合一次','破勢追加；主動擊倒回復 12 內力並追擊下一人，各每回合一次'][j.stage]};
}
export function nextJourneyEvent(world){return JOURNEY_PLACES.flatMap(place=>availableJourneyEvents(world,place))[0]??null;}
export function settleJourneyBattle(world,character,choice,battle){
 if(!battle.finished)throw new Error('交鋒尚未結束');
 if(!availableJourneyEvents(world).some(e=>e.id===choice.journeyId&&e.battle))throw new Error('交鋒與當地奇遇不符');
 if(battle.finished!=='victory')return {message:'較量未成。可調整配招後重試；已學武功與奇遇進度保留。'};
 if(choice.journeyId==='flow_trial'&&!choice.trialBreak)return {message:'木器已退，但尚未親手以八方拳破勢。調整配招後可重試。'};
 return journeyAction(world,character,choice.journeyId,{victory:true});
}
export function applyJourneyToCombatant(actor,world){actor.flowStage=journey(world).stage;return actor;}
export function journeyEnemyDefinitions(id,base){const boss=id==='flow_fame';return Array.from({length:boss?1:3},(_,i)=>({...base,id:`enemy_${901+i}`,name:boss?'葉停舟 · 木劍試武':`練武木器 ${i+1}`,tier:'elite',aiProfile:boss?base.aiProfile:'training',damageMultiplier:boss?1:.15,stats:boss?{strength:25,constitution:28,agility:20,comprehension:20,willpower:20}:{strength:8,constitution:8,agility:8,comprehension:8,willpower:8},skillIds:[],phases:[],observeInfo:['木器強度固定，不隨修為成長。','八方拳能迅速削減架勢。','先完成試招，再回青衡山補全。']}));}
export function validateJourney(world){
 const j=world.zhaoye?.journey;if(j==null)return;
 if(![0,1,2,3].includes(j.stage)||typeof j.declined!=='boolean'||!Array.isArray(j.completed)||new Set(j.completed).size!==j.completed.length||j.completed.some(id=>!events.some(e=>e.id===id))||!Array.isArray(j.notes)||j.notes.length>20||j.notes.some(n=>typeof n!=='string'||n.length>500))throw new Error('奇遇存檔無效');
 for(const id of j.completed){const e=events.find(e=>e.id===id);if(!e.requires.every(required=>j.completed.includes(required)))throw new Error('奇遇前置進度缺失');}
 const expected=j.completed.includes('flow_complete')?3:j.completed.includes('flow_trial')?2:j.completed.includes('flow_fragment')?1:0;
 if(j.stage!==expected||j.completed.includes('flow_alternative')&&!j.declined)throw new Error('奇遇武學進度不一致');
}
