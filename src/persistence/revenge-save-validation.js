import STORY from '../data/revenge-story.json' with { type: 'json' };
import { assertSafeObject, validateCharacter } from '../core/validators.js';
import { restoreBattle } from './battle-snapshot.js';

const LEGACY_MESSAGE='故事版本已更新，舊存檔無法使用。請重新創角開局；原有備份仍保留。';
const scenes=STORY.chapters.flatMap(chapter=>chapter.scenes.map(scene=>({...scene,chapter:chapter.chapter})));
const sceneById=new Map(scenes.map(scene=>[scene.id,scene]));
const flagScenes=new Map(scenes.filter(scene=>scene.choice).map(scene=>[scene.choice.flag,scene]));
const locations=new Set(Array.from({length:18},(_,i)=>`location_${String(i+1).padStart(3,'0')}`));
const legacyObjects=['sidequests','evidence','sources','support','promises','facilities','custody','assignments'];
const legacyArrays=['sidequestRewards','sidequestNotes','losses','preparations'];
const stateKeys=new Set(['version','storyRevision','cursor','choices','completedEncounters','rewards','events','battle','chapterSafe','journey','fates','publicFunds','readSceneIds','history','activeBattle',...legacyObjects,...legacyArrays]);
const fail=message=>{throw new Error(`新主線存檔無效：${message}`);};
const record=value=>value!=null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const integer=(value,min=0,max=1000000)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const identifier=value=>typeof value==='string'&&value.length>0&&value.length<=160;
const same=(left,right)=>Array.isArray(left)&&left.length===right.length&&right.every((value,index)=>value===left[index]);
const exactKeys=(value,keys)=>record(value)&&Object.keys(value).every(key=>keys.includes(key));
const uniqueArray=(value,valid)=>Array.isArray(value)&&value.length<=scenes.length&&new Set(value).size===value.length&&Array.from(value).every(valid);
const matches=(scene,choices)=>Object.entries(scene.when??{}).every(([key,value])=>choices[key]===value);

export function validateRevengeWorld(world){
  assertSafeObject(world);
  if(!record(world)||!identifier(world.id)||!identifier(world.ownerCharacterId))fail('世界或房主編號缺失');
  const state=world.zhaoye;
  if(state?.storyRevision!==3||state?.version!==3)throw new Error(LEGACY_MESSAGE);
  if(!record(state)||Object.keys(state).some(key=>!stateKeys.has(key)))fail('混入未知故事狀態');
  if(!integer(world.chapter,1,10)||!locations.has(world.currentLocationId))fail('章節或地點無效');
  if(!record(world.party)||!uniqueArray(world.party.playerIds,identifier)||world.party.playerIds.length<1||world.party.playerIds.length>4||!world.party.playerIds.includes(world.ownerCharacterId)||!uniqueArray(world.party.npcIds,id=>['npc_001','npc_002','npc_003'].includes(id))||world.party.npcIds.length>3)fail('隊伍結構無效');
  if(!uniqueArray(world.visitedLocations,id=>locations.has(id))||!record(world.npcStates)||!record(world.quests)||!record(world.clock)||!integer(world.clock.day,1,Number.MAX_SAFE_INTEGER)||!['morning','noon','evening','night'].includes(world.clock.segment))fail('地圖、時辰或人物結構無效');
  if(!record(state.choices)||!record(state.events)||typeof state.chapterSafe!=='boolean')fail('旗標、事件或章末狀態無效');
  for(const [flag,value] of Object.entries(state.choices)){
    if(!STORY.flags[flag]?.includes(value)||!flagScenes.has(flag))fail(`未知選擇 ${flag}`);
  }
  const route=scenes.filter(scene=>matches(scene,state.choices));
  const index=route.findIndex(scene=>scene.id===state.cursor),current=route[index];
  if(index<0||world.currentSceneId!==state.cursor||current.chapter!==world.chapter)fail('游標與章節不相符');
  const lastInChapter=route.filter(scene=>scene.chapter===world.chapter).at(-1)?.id;
  if(state.chapterSafe&&state.cursor!==lastInChapter)fail('未讀到章末卻宣稱已完成');
  const prefix=route.slice(0,index+(state.chapterSafe?1:0));
  const readIds=prefix.map(scene=>scene.id),readSet=new Set(readIds);
  if(!same(state.readSceneIds,readIds)||!same(state.history,readIds))fail('游標超前或已讀路徑不完整');
  for(const [flag,scene]of flagScenes){
    const chosen=Object.hasOwn(state.choices,flag);
    if(readSet.has(scene.id)&&!chosen)fail(`漏掉必經選擇 ${flag}`);
    if(chosen&&!readSet.has(scene.id)&&scene.id!==state.cursor)fail(`選擇 ${flag} 來自尚未抵達的場景`);
  }
  for(const scene of prefix){if(!state.events[scene.id]||state.events[scene.id].status!=='completed')fail(`已讀事件 ${scene.id} 未完成`);}
  for(const [id,event]of Object.entries(state.events)){
    const scene=sceneById.get(id);
    if(!scene||(!readSet.has(id)&&id!==state.cursor)||!exactKeys(event,['status','choice','attempts'])||!['active','choice-made','completed'].includes(event.status))fail(`事件 ${id} 不屬於目前路徑`);
    if(!readSet.has(id)&&event.status==='completed')fail(`事件 ${id} 提前完成`);
    if(event.choice!==undefined&&(!scene.choice||event.choice!==state.choices[scene.choice.flag]))fail(`事件 ${id} 的選擇矛盾`);
    if(scene.choice&&Object.hasOwn(state.choices,scene.choice.flag)&&event.choice!==state.choices[scene.choice.flag])fail(`事件 ${id} 遺失已選結果`);
    if(event.status==='choice-made'&&(!scene.choice||event.choice===undefined))fail(`事件 ${id} 沒有選擇卻已選定`);
    if(event.attempts!==undefined&&(!scene.encounter||!integer(event.attempts,1)))fail(`事件 ${id} 的戰鬥次數無效`);
  }
  const currentChosen=current.choice&&Object.hasOwn(state.choices,current.choice.flag);
  if(currentChosen&&!state.chapterSafe&&state.events[current.id]?.status!=='choice-made')fail('當前選擇狀態未保存');
  const triggerEncounter=new Map();for(const [i,scene]of route.entries())if(scene.encounter&&(!triggerEncounter.has(scene.encounter)||scene.encounter==='xie-final'))triggerEncounter.set(scene.encounter,i);
  if(!uniqueArray(state.completedEncounters,id=>typeof id==='string'&&triggerEncounter.has(id)))fail('交鋒完成表無效');
  const completed=new Set(state.completedEncounters);
  for(const [encounter,last]of triggerEncounter){
    if(last<index&&!completed.has(encounter))fail(`跳過必經交鋒 ${encounter}`);
    if(completed.has(encounter)&&(last>index||(last===index&&current.encounter!==encounter)))fail(`提前完成交鋒 ${encounter}`);
  }
  if(state.chapterSafe&&current.encounter&&!completed.has(current.encounter))fail('章末交鋒尚未完成');
  const completedChapters=world.chapter-(state.chapterSafe?0:1);
  if(!same(state.rewards,Array.from({length:completedChapters},(_,i)=>i+1)))fail('章節獎勵超前或重複');
  if(!record(world.flags))fail('世界旗標不是物件');
  for(const [key,value]of Object.entries(world.flags)){
    if(/^chapter_\d+_complete$/.test(key)){
      const chapter=Number(key.match(/\d+/)[0]);if(value!==true||chapter<1||chapter>completedChapters||key!==`chapter_${chapter}_complete`)fail(`章節旗標 ${key} 超前`);
    }else if(key==='game_complete'){if(value!==true||world.chapter!==10||!state.chapterSafe)fail('結局旗標超前');}
    else if(key==='revenge_cheng_leave'){if(value!==true||state.choices.cheng!=='leave')fail('程渡離隊旗標矛盾');}
    else if(key==='last_defeat_scene'){if(!identifier(value)||!sceneById.get(value)?.encounter||(!readSet.has(value)&&value!==state.cursor))fail('敗戰紀錄來自未來場景');}
    else if(key.startsWith('beggar_rumor_')){if(value!==true||!locations.has(key.slice('beggar_rumor_'.length)))fail('旅行傳聞旗標無效');}
    else fail(`混入舊世界旗標 ${key}`);
  }
  for(let chapter=1;chapter<=completedChapters;chapter++)if(world.flags[`chapter_${chapter}_complete`]!==true)fail('缺少已完成章節旗標');
  if(world.chapter===10&&state.chapterSafe&&world.flags.game_complete!==true)fail('最終章未保存結局旗標');
  if(!exactKeys(state.journey,['completed','declined','stage','notes'])||!same(state.journey.completed,[])||state.journey.declined!==false||state.journey.stage!==0||!same(state.journey.notes,[]))fail('混入舊奇遇進度');
  for(const key of legacyObjects)if(!record(state[key])||Object.keys(state[key]).length)fail(`混入舊狀態 ${key}`);
  for(const key of legacyArrays)if(!same(state[key],[]))fail(`混入舊狀態 ${key}`);
  if(state.publicFunds!==0||!record(state.fates))fail('混入舊公款或命運狀態');
  const departed=state.choices.cheng==='leave';
  if(departed){
    const fate=state.fates.npc_003;
    if(Object.keys(state.fates).length!==1||!exactKeys(fate,['status','reason','questId'])||fate.status!=='departed'||fate.reason!=='cheng-leave'||fate.questId!=='revenge-main'||world.flags.revenge_cheng_leave!==true||world.party?.npcIds?.includes('npc_003'))fail('程渡離隊資料矛盾');
  }else if(Object.keys(state.fates).length)fail('混入舊人物命運');
  if(state.battle!==null){
    const battle=state.battle;
    if(!exactKeys(battle,['eventId','encounter','status','attempt','actions','lastRound'])||battle.eventId!==current.id||battle.encounter!==current.encounter||triggerEncounter.get(current.encounter)!==index||completed.has(current.encounter)||state.chapterSafe||!['active','defeated'].includes(battle.status)||!integer(battle.attempt,1)||!integer(battle.actions)||!integer(battle.lastRound)||state.events[current.id]?.attempts!==battle.attempt)fail('當前交鋒與游標不相符');
  }
  if(state.activeBattle!==undefined){
    const saved=state.activeBattle, restored=restoreBattle(saved), choice=restored.choice;
    if(!record(choice))fail('戰鬥選項無效');
    if(choice.roadEncounter===true){
      if(!exactKeys(choice,['roadEncounter','locationId','enemyLevel'])||choice.locationId!==world.currentLocationId||!integer(choice.enemyLevel,1,1000)||saved.scenario!==null||saved.enemies.length!==1||saved.enemies[0].id!=='enemy_901'||state.battle!==null)fail('旅行戰鬥無效');
    }else{
      if(choice.battle!=='revenge'||choice.revengeEncounter!==current.encounter||choice.eventId!==current.id||choice.revengeAttempt!==state.battle?.attempt||!state.battle||state.battle.status!=='active'||saved.scenario?.kind!=='revenge'||saved.scenario.encounter!==current.encounter||saved.scenario.chapter!==world.chapter||state.battle.lastRound>saved.round||['questId','journeyId','chapterBattle','roadEncounter'].some(key=>Object.hasOwn(choice,key)))fail('戰鬥快照混入支線或未來交鋒');
    }
    const partyIds=new Set([...(world.party?.playerIds??[]),...(world.party?.npcIds??[])]);
    if(saved.party.some(actor=>!partyIds.has(actor.id)))fail('戰鬥隊員不屬於目前隊伍');
  }
  return world;
}

export function validateRevengeBundle(bundle){
  assertSafeObject(bundle);
  if(!Array.isArray(bundle?.worlds)||!Array.isArray(bundle?.characters))fail('缺少世界或角色陣列');
  const worlds=new Map(),characters=new Map();
  for(const world of bundle.worlds){validateRevengeWorld(world);if(worlds.has(world.id))fail(`世界 ID 重複 ${world.id}`);worlds.set(world.id,world);}
  for(const character of bundle.characters){
    if(!record(character)||!identifier(character.id)||characters.has(character.id))fail('角色 ID 缺失或重複');
    const errors=validateCharacter(character);if(errors.length)fail(`角色 ${character.name??character.id}：${errors.join('；')}`);
    characters.set(character.id,character);
  }
  for(const world of worlds.values())if(!characters.has(world.ownerCharacterId))throw new Error(`世界 ${world.name??world.id} 找不到房主角色。`);
  for(const world of worlds.values()){const owner=characters.get(world.ownerCharacterId);if(owner.homeWorldId&&owner.homeWorldId!==world.id)fail('房主角色指向其他世界');}
  for(const character of characters.values())if(character.homeWorldId&&!worlds.has(character.homeWorldId))throw new Error(`角色 ${character.name??character.id} 指向不存在的世界。`);
  return bundle;
}
