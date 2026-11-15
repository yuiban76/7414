// One definition per authored encounter. Split manuscript scenes share this ID.
const rows=[
  ['well-lesson',1,'溫守拙','nonlethal','收步點腕',['接住茶碗，站穩後腳']],
  ['courtyard',1,'火場黑甲','defeat','持盾短刀',['打開後廊通道']],
  ['hook-road',1,'封山鉤鐮隊','defeat','鉤鐮封步',['斬開封路鉤索','護住下坡缺口']],
  ['constable-chase',2,'陸見霜','nonlethal','鐵尺鎖拿',['辨明旁人位置，留出退路']],
  ['dye-house',2,'染坊弩手','defeat','暗處弩射',['遮住弩口','拆除誤導方向的鈴索']],
  ['bian-jiu',2,'卞九','defeat','遠弩追射',['辨認弩位','切斷牽鈴線']],
  ['hong-furnace',3,'洪百川','defeat','雙刀翻爐',['卸開翻爐絞盤','讓工棚人員離開油地']],
  ['yue-ash-guard',4,'岳家守旗弟子','nonlethal','守旗橫劍',['隔開客房守衛與焚旗處']],
  ['terrace-practice',4,'松嶺試劍弟子','nonlethal','借力引步',['確認收腳的安全落點']],
  ['yue-duel',4,'岳承義','nonlethal','借力封路',['拆開臺邊誘步','留出眾人能看清的站位']],
  ['river-borrow-fire',4,'河道巡兵','defeat','沿岸攔截',['移開堵船的浮木','護送接應船離岸']],
  ['xie-banquet',5,'謝欣達','escape','定川壓掌',['破壞調度軍符','打開撤宴側廊','越過接應線']],
  ['han-corridor',5,'韓逐鹿','nonlethal','換手短刃',['拆開河邊弩手射線','確認登船落點']],
  ['river-escape',5,'追船親衛','escape','飛索追船',['割斷追船索','送傷者上船','推船離開弩線']],
  ['wei-siege',6,'衛峻','escape','斷岳壓步',['固定過渠門板','護送最後一批慢行者','退至水渠出口']],
  ['xie-escape',6,'謝欣達','escape','定川三步',['撐開灶房撤離口','引開第三掌壓線','拉倒支架並越過斷牆']],
  ['xu-needles',7,'許問針','nonlethal','針槽封脈',['避開門邊針座','以濕氈封箱','引他踏入可停步的距離']],
  ['convoy-bridge',8,'棄車護兵','defeat','馬鞭短刀',['解開民夫車索','拆下軍車批次鐵環']],
  ['dong-convoy',8,'董綸','nonlethal','親衛短旗',['截斷火藥燃線','送領路民夫離坡','取下傳令短旗']],
  ['gate-preparation',9,'外柵守機兵','defeat','弩槽斧擊',['拆下補弩或左槽連動件','確認撤人繩索可承重']],
  ['gate-entry-stay',9,'柴門黑甲','defeat','門內矛陣',['預留有傷也能走的側門','撐住柴門讓傷車通過']],
  ['gate-entry-leave',9,'柴門守軍','defeat','門軸短矛',['卡住修輪車','掩護閔石退至外坡']],
  ['gate-machines',9,'右槽監軍','defeat','落石側弩',['解開推石民夫鎖鏈','切斷右槽副索','拔下側弩轉軸銷']],
  ['wei-final',9,'衛峻','defeat','斷岳重刀',['清出半腳側移處','截斷鎖步的起點','貼柄進入甲縫']],
  ['capital-street',10,'封街親衛','defeat','街口弩陣',['拆掉街口弩','移開拒馬讓百姓離街']],
  ['capital-relay',10,'謝府傳令騎','nonlethal','短匣快騎',['阻住衝街軍馬','取下真正傳令短匣']],
  ['xie-side-crossbow',10,'側樓弩手','nonlethal','高處交叉弩',['切開油柴封門線','卸下側樓弩架']],
  ['xie-gates',10,'謝府近衛','defeat','交叉長槍',['斷開守門照應位置','留出回來也能走的門縫']],
  ['xie-final',10,'謝欣達','defeat','定川連掌',['移開封步桌架','卡住側門援軍鏈','破長槍後收步逼出左肋']]
];
export const REVENGE_ENCOUNTERS=Object.freeze(Object.fromEntries(rows.map(([id,chapter,name,mode,move,objectives],i)=>[id,Object.freeze({id,chapter,name,mode,move,objectives:Object.freeze(objectives),enemyId:`enemy_revenge_${String(i+1).padStart(3,'0')}`})])));
const fields=['id','kind','revision','encounter','chapter','mode','objectiveProgress','objectiveTotal','phase','interruptedRound','lastSuccessRound','brokenOnce','subdued'];
const isRevenge=battle=>battle.scenario?.kind==='revenge';

export function createRevengeEncounter({encounterId,chapter,content,world}={}) {
  const definition=REVENGE_ENCOUNTERS[encounterId];
  if(!definition || definition.chapter!==chapter)throw new Error('此章沒有這場主線交鋒');
  const baseChapter=Math.min(8,chapter);
  const candidates=content?.enemies?.filter(e=>e.chapter===baseChapter)??[];
  const base=candidates.find(e=>e.tier==='boss')??candidates[0];
  if(!base)throw new Error('缺少主線交鋒使用的敵人數值資產');
  const stats=structuredClone(base.stats);
  // Existing skills, equipment, resources and party-size scaling remain intact.
  // The new campaign has ten chapters rather than eight old difficulty bands.
  const growth=chapter-1;
  Object.assign(stats,{strength:20+Math.round(growth*1.6),constitution:21+Math.round(growth*1.8),agility:18+Math.round(growth*.8),comprehension:20+growth,willpower:20+growth});
  const enemyDef={...structuredClone(base),id:definition.enemyId,name:definition.name,chapter,
    faction:definition.mode==='nonlethal'&&chapter===1?'照溪門':'大寧禁武軍',tier:'boss',stats,
    damageMultiplier:definition.mode==='escape'?.58:definition.id==='well-lesson'?.3:.64,
    phases:[],aiProfile:'revenge',rewards:[],storyFlags:[],
    observeInfo:[`本戰目標：${definition.objectives.join('；')}`,`${definition.move}會在出手前顯示；破勢或控制能打斷當輪攻勢。`,definition.mode==='escape'?'不用擊殺敵人；完成每段撤離操作即可突圍。':definition.mode==='nonlethal'?'這場交鋒採取非致命制伏，倒下不寫作死亡。':'操作完成後仍須擊敗眼前敵人，破勢可爭取出手機會。']};
  const scenario={id:`revenge:${encounterId}`,kind:'revenge',revision:3,encounter:encounterId,chapter,mode:definition.mode,
    objectiveProgress:0,objectiveTotal:definition.objectives.length,phase:1,interruptedRound:0,lastSuccessRound:0,brokenOnce:false,subdued:false};
  // Preparations alter a real first step instead of granting an automatic win.
  const flags=world?.zhaoye?.choices??{};
  if(encounterId==='xu-needles'&&flags.c7_training==='steady'){enemyDef.damageMultiplier*=.9;enemyDef.observeInfo[1]='穩步訓練讓封脈掌壓力降低；濕氈仍需親自覆箱。';}if(encounterId==='xu-needles'&&flags.c7_training==='turn'){enemyDef.stats.agility=Math.max(1,enemyDef.stats.agility-3);enemyDef.observeInfo[1]='辨勢轉向讓你較早掌握出手時機；針槽仍須拆除。';}
  return {enemyDef,scenario};
}
export function encounterDefinition(encounter,chapter,content){return createRevengeEncounter({encounterId:encounter,chapter,content});}

export function revengeBattleGoal(battle) {
  if(!isRevenge(battle))return null;
  const s=battle.scenario,d=REVENGE_ENCOUNTERS[s.encounter];
  if(!d)return null;
  return {done:s.objectiveProgress,objectives:[...d.objectives],limit:null,name:d.name,
    description:s.mode==='escape'?'完成撤離操作並保住隊伍；敵人不會在此戰死亡。':s.mode==='nonlethal'?'完成現場操作並非致命制伏。':'完成現場操作後擊敗敵人。',
    mode:s.mode};
}
export function revengeIntent(battle,enemy) {
  if(!isRevenge(battle))return null;
  const s=battle.scenario,d=REVENGE_ENCOUNTERS[s.encounter];
  const target=battle.living('party').toSorted((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  const pressure=battle.round%3===0;
  return {type:'revenge-strike',targetId:target?.id??null,pressure,label:s.subdued?'敵手已被制住；請完成剩下的現場操作':`${d.move}${pressure?'：重勢已蓄，可防禦、身法或破勢／控制打斷':'：逼近落點；可先完成一段場景操作'}`};
}
export function revengeObjective(battle) {
  if(!isRevenge(battle))return false;
  const s=battle.scenario,d=REVENGE_ENCOUNTERS[s.encounter];
  if(s.objectiveProgress>=s.objectiveTotal){battle.log.push('本戰現場操作已完成，仍須處理敵人。');return true;}
  const step=d.objectives[s.objectiveProgress++];s.lastSuccessRound=battle.round;
  s.phase=s.objectiveProgress===s.objectiveTotal?3:2;
  battle.log.push(`${step}：${s.objectiveProgress}／${s.objectiveTotal}。`);
  if(s.objectiveProgress===s.objectiveTotal){
    if(s.mode==='escape'){battle.finished='victory';battle.log.push(`撤離完成，隊伍越過接應線；${d.name}仍活著，此戰以突圍告捷。`);}
    else if(s.mode==='nonlethal'&&s.subdued){battle.finished='victory';battle.log.push(`${d.name}已被非致命制伏，現場工作也已完成。`);}
    else battle.log.push('操作已完成，敵人的封路優勢解除；繼續以破勢與兵器擊敗對手。');
  }
  return true;
}
export function revengeHit(battle,actor,target,skill,newBreak) {
  if(!isRevenge(battle)||target.side!=='enemy')return;
  const s=battle.scenario,d=REVENGE_ENCOUNTERS[s.encounter];
  if(newBreak)s.brokenOnce=true;
  if((newBreak||skill?.type==='control')&&target.lastActionRound!==battle.round){s.interruptedRound=battle.round;battle.log.push(`${d.name}的蓄勢被打斷，本回合不能接續攻擊。`);}
  if(target.hp!==0)return;
  if(s.mode==='escape'){target.hp=1;battle.log.push(`${d.name}被迫收勢，撤離口仍需親自通過；他不在此戰死亡。`);}
  else if(s.mode==='nonlethal'){
    target.hp=1;s.subdued=true;
    if(s.objectiveProgress===s.objectiveTotal){battle.finished='victory';battle.log.push(`${d.name}兵刃落地，非致命交鋒結束。`);}
    else battle.log.push(`${d.name}已被制伏；先完成現場操作，不再追擊。`);
  }else if(s.objectiveProgress<s.objectiveTotal){target.hp=1;battle.log.push('敵人已受重創，仍有未完成的現場工作；先保住通路再作最後一擊。');}
}
export function revengeDamageReduction(battle,target){return isRevenge(battle)&&target.side==='enemy'&&battle.scenario.objectiveProgress<battle.scenario.objectiveTotal?.12:0;}
export function resolveRevengeAction(battle,actor,action) {
  if(action.type!=='revenge-strike'||!isRevenge(battle))return false;
  const s=battle.scenario,d=REVENGE_ENCOUNTERS[s.encounter];actor.lastActionRound=battle.round;
  if(s.subdued||s.interruptedRound===battle.round){battle.log.push(s.subdued?`${d.name}已被制住，等待現場工作完成。`:`${d.name}收回被打斷的攻勢。`);return true;}
  const target=battle.find(action.targetId)??battle.living('party')[0];if(!target)return true;
  const multiplier=actor.damageMultiplier??1;
  try{
    actor.damageMultiplier=multiplier*(s.objectiveProgress===s.objectiveTotal?.73:1);
    const move={id:`revenge-move:${s.encounter}`,name:d.move,type:'attack',power:{hp:action.pressure?27:17,posture:action.pressure?20:11},effects:[]};
    battle.attack(actor,target,move);
  }finally{actor.damageMultiplier=multiplier;}
  return true;
}

export function validateRevengeBattleScenario(s,saved) {
  if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).length!==fields.length||fields.some(k=>!Object.hasOwn(s,k)))return false;
  const d=REVENGE_ENCOUNTERS[s.encounter];
  if(!d||s.kind!=='revenge'||s.revision!==3||s.id!==`revenge:${d.id}`||s.chapter!==d.chapter||s.mode!==d.mode||s.objectiveTotal!==d.objectives.length)return false;
  if(!Number.isSafeInteger(s.objectiveProgress)||s.objectiveProgress<0||s.objectiveProgress>s.objectiveTotal||![1,2,3].includes(s.phase)||s.phase!==(s.objectiveProgress===0?1:s.objectiveProgress===s.objectiveTotal?3:2))return false;
  if(typeof s.brokenOnce!=='boolean'||typeof s.subdued!=='boolean'||s.subdued&&s.mode!=='nonlethal')return false;
  if(!saved||!Number.isSafeInteger(saved.round)||saved.round<1||['interruptedRound','lastSuccessRound'].some(k=>!Number.isSafeInteger(s[k])||s[k]<0||s[k]>saved.round))return false;
  if(s.objectiveProgress>0&&s.lastSuccessRound<1||s.objectiveProgress===0&&s.lastSuccessRound!==0)return false;
  if(saved.enemies?.length!==1||saved.enemies[0].id!==d.enemyId||saved.enemies[0].name!==d.name)return false;
  const hp=saved.enemies[0].hp;
  if(s.mode!=='defeat'&&hp<1||s.subdued&&hp!==1)return false;
  if(saved.finished==='victory'&&(s.objectiveProgress!==s.objectiveTotal||s.mode==='defeat'&&hp!==0||s.mode==='nonlethal'&&!s.subdued))return false;
  if(!saved.finished&&s.mode==='escape'&&s.objectiveProgress===s.objectiveTotal)return false;
  return true;
}
