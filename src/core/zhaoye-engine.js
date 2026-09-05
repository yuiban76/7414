import { ZHAOYE_SCENES, ZHAOYE_ORDER, ZHAOYE_CHAPTERS, ZHAOYE_PLACES, BATTLES, OPTIONAL_BATTLES, MAJOR, ZHAOYE_LOCATION_IDS, PROLOGUES, IDENTITY_OBSERVATIONS } from './zhaoye-story.js';
import { REACTIONS } from './zhaoye-reactions.js';
import { storyCallbacks, storyBattleModifiers } from './zhaoye-callbacks.js';
import { supplementsFor } from './zhaoye-supplements.js';

export function createZhaoyeState(){return {version:1,events:{},evidence:{E1:'missing',E2:'missing',E3:'missing',E4:'missing'},sources:{},support:{},losses:[],promises:{},facilities:{},publicFunds:0,preparations:[],rewards:[],custody:{},assignments:{},chapterSafe:false};}
const stateOf=w=>w.zhaoye;
const eventOf=(w,id)=>stateOf(w).events[id]??={status:'active',choice:null,investigations:[],paid:0,actions:0,aftermathSeen:false};
const picked=(w,id,value)=>stateOf(w).events[id]?.choice===value;
const support=(w,key,reason)=>{(stateOf(w).support[key]??=[]);if(!stateOf(w).support[key].includes(reason))stateOf(w).support[key].push(reason);};
export function recordLoss(w,key){if(!stateOf(w).losses.includes(key))stateOf(w).losses.push(key);}
function evidence(w,key,status,source){const s=stateOf(w);if(s.evidence[key]!=='verified'||status==='verified')s.evidence[key]=status;(s.sources[key]??=[]);if(!s.sources[key].includes(source))s.sources[key].push(source);}
const PROMISES={
 '2-2A':{A:['受害家庭','完成舊案清單並提交','青衡山',5],B:['外堂家戶','公示補償標準並確認領用','青衡山',5]},
 '2-2C':{B:['船工','修復借用船繩','赤水埠',2],C:['送飯家屬','安排安全住處與聯絡','赤水埠',2]},
 '4-1A':{C:['等診船工','確認不負重的備工安排','汀州',4]},
 '4-2C':{A:['碼頭工人','落實停搬期間食物與備工','汀州',4]},
 '4-3A':{B:['鄭雨','確認家屬轉移與固定聯絡人','汀州',4]},
 '6-2A':{C:['工匠代表','回覆赦令條款審讀結果','承京',6]},
 '6-2B':{C:['沈照微與聯署人','提交自述供外部核對','承京',6]},
 '6-3B':{C:['御史','核對封存原件調卷公文','承京',6]},
 '7-2A':{B:['撤離居民','護送空車回取必要工具','鎖雲鎮',7]},
 '7-2B':{A:['船主','核對兩趟船損與合理補償','鎖雲鎮',7],C:['船主','辦理船隻返還或補償','鎖雲鎮',7]},
 '8-5A':{B:['被害家屬','公示羈押地與案情說明時間','照夜臺',8]}
};
// Fixed modest costs, with explicitly offered labour alternatives. Never debit a public fund as personal money.
const COSTS={'1-0B':{B:20},'1-1A':{B:15},'1-3A':{B:25},'2-1B':{A:25},'2-3B':{B:20},'3-1B':{A:60},'3-2C':{A:20},'4-1A':{B:25},'4-2C':{A:30},'4-2D':{A:35,B:20},'7-2B':{A:30,C:30}};
const AFTER={
 '1-4':{A:'官吏寫下收件案號，抄手回讀封記。原件歸庫，家屬各留一份收條。',B:'鏢盟收下原帳，家屬代表將救援銀另列公帳。葉停舟看著每個人簽收，不把銀子裝進你的行囊。',C:'原帳封入世界共管卷箱，交接另留紀錄。沒有人能因離隊把全隊唯一原件帶走。'},
 '2-4':{A:'新案與舊罪分卷提交。殷紅袖留在赤水協助受害者，不要求他們立刻原諒。',B:'證人先移入安全住處。殷紅袖把青衡公議日期寫在卷首：「到了那裡，這一卷也得交。」'},
 '3-4':{A:'第一袋糧抬出時，你先挪開會絆倒抱孩子者的繩索。阿史那衡一袋一袋記，不讓給了誰又變成糊塗帳。',B:'封條貼上，人群問備糧在哪裡。監理報出交運時刻，醫者留在現場照護。'},
 '4-4':{A:'醫館前多一張桌。每位證人自己決定公開的內容，抄手回讀確認；不願說的人仍受照護。',B:'離城的人不搭同一班船，家屬拿到聯絡時間。蘇問棠說：「你回家不需要先替誰立功。」'},
 '5-5':{A:'執事收回通行牌。葉停舟問能否用自己的名字接鏢，沒有人承諾從此容易，但證人已跟你走出山門。',B:'你明說繼續查，不交回證人。顧只問照夜臺上是否肯聽。葉停舟收起保管收條：「以前也應該需要。」'},
 '6-5':{A:'可驗副本分交清查官、門派與受害者代表；住址另封。信使出門，涉案者開始加快部署。',B:'聯署人逐份核封，約定會盟前解封，扣卷時由預留副本送達。沈照微說：「收的人也要寫明明天做什麼。」'},
 '7-4':{A:'你在下游接住撤離隊伍，老人自己挑出工具箱裡最要緊的幾件。上游送來署名報告，不讓另一邊的代價無聲消失。',B:'你請使者帶侍役搬開官文，先救出糧袋下的車夫。下游名冊送到後，仍逐戶確認去向。'},
 '8-6':{A:'案卷推到桌中央，第一場聽證從已足證的部分開始。願意到場者有護送，不願者仍受保護。',B:'先簽放人與短期停兵，追責卷宗另行保全。名單上的「查無此人」改成由誰、何時回覆。',C:'保管規則寫在門外：誰可查、如何驗、何時公布、若一處被封如何接續。保管網不屬於任何個人。'}
};
export function endingFor(w,route=stateOf(w).events['8-6']?.choice){
 const s=stateOf(w),verified=Object.entries(s.evidence).filter(([,v])=>v==='verified').map(([k])=>k);
 const supports=Object.keys(s.support).filter(k=>s.support[k].length);
 const missing=[];let title='未竟之案';
 if(!s.oldCaseSubmitted)missing.push('舊罪尚未提交');
 if(route==='A'){for(const id of ['E1','E2','E3','E4'])if(!verified.includes(id))missing.push(`${id}尚未驗證`);if(supports.length<2||!supports.some(k=>['government','sects'].includes(k)))missing.push('需兩類實際支援，含官府或門派');if(!missing.length)title='公堂有燈';}
 if(route==='B'){for(const id of ['E1','E4'])if(!verified.includes(id))missing.push(`${id}尚未驗證`);if(!missing.length)title='江上暫平';}
 if(route==='C'){if(verified.length<2)missing.push('至少兩條已驗證據');if(!supports.includes('civil')||!supports.includes('sects'))missing.push('民間與門派均須實際支持');if(!missing.length)title='無旗之盟';}
 return {title,missing,memorial:s.losses.length>=3?'名字留在渡口':'鴉渡小型追思',losses:s.losses.length};
}
export function evidenceSummary(w){const s=stateOf(w),labels={missing:'未取得',pending:'待核對',verified:'已驗證'},names={government:'官府',sects:'門派',civil:'民間',escort:'鏢盟'};return Object.entries(s.evidence).map(([k,v])=>`${k} ${labels[v]}：${(s.sources[k]??[]).join('、')||'尚無材料'}`).join('\n')+'\n支援：'+(Object.entries(s.support).map(([k,v])=>`${names[k]}（${v.join('、')}）`).join('；')||'尚未形成')+`\n救援損失 ${s.losses.length} 次；公共救援銀 ${s.publicFunds} 文（不屬於角色私款）`;} 

function applyChoice(w,id,choice){
 const s=stateOf(w);const promised=PROMISES[id]?.[choice];if(promised)s.promises[id]={who:promised[0],what:promised[1],where:promised[2],due:promised[3],status:'pending'};
 if(id==='1-4'){s.ledger=['government','escort','self']['ABC'.indexOf(choice)];evidence(w,'E1','pending','鴉渡原帳與交接收條');if(choice==='A')support(w,'government','依法交帳留案號');if(choice==='B')s.publicFunds+=120;}
 if(id==='2-3') {evidence(w,'E1','pending','鄒平指認改印銅模');evidence(w,'E2','pending','鄒平自願口供');s.zouAlive=true;}
 if(id==='2-4'){s.oldCaseSubmitted=choice==='A';s.oldCaseStrategy=choice==='A'?'submitted':'deferred';if(choice==='B')s.promises.oldCase={who:'赤水受害者',what:'提交血河舊案與殷紅袖口供',where:'青衡公議',due:5,status:'pending'};else support(w,'civil','受理外堂舊案');}
 if(id==='3-2')s.prisonerShortcut=choice==='B';
 if(id==='3-3')evidence(w,'E3','pending','黑沙倉糧帳與軍封');
 if(id==='3-4'){if(choice==='A')support(w,'civil','開倉留樣並逐袋救急');else {support(w,'government','封倉完整查驗');if(!s.prisonerShortcut&&!picked(w,'3-2D','B'))recordLoss(w,'grain_wait');}}
 if(id==='4-3')evidence(w,'E2','pending','獲救醫工名單與工坊編號');
 if(id==='4-4'){support(w,'civil',choice==='A'?'醫館保護自願證人':'跨派庇護安置醫工');if(choice==='A')evidence(w,'E2','verified','醫工與鄒平獨立辨認');}
 if(id==='5-2')evidence(w,'E1','verified','公議核對銅模、運輸憑證');
 if(id==='5-2A'&&choice==='C'){s.oldCaseSubmitted=true;s.oldCaseStrategy='submitted';if(s.promises.oldCase)s.promises.oldCase.status='fulfilled';}
 if(id==='5-3'){evidence(w,'E1','verified','鏢盟運單對照原帳');evidence(w,'E3','pending','鏢盟運單補糧帳');}
 if(id==='5-4')support(w,'sects','照岳與棲霞實際護送人證卷宗');
 if(id==='6-1'){evidence(w,'E1','verified','承京交接紀錄核驗');evidence(w,'E2','verified','鄒平與自願醫工正式辨認');evidence(w,'E3','verified','付款批文、實物印記與運單交叉核對');support(w,'government','承京完整補驗與立案');}
 if(id==='6-3')evidence(w,'E4','pending','存卷院雙令及三方交割附件');
 if(id==='6-5')s.preparationLimit=choice==='A'?2:3;
 if(id==='7-3')evidence(w,'E4','pending','騎隊軍令、馬匹交割與密信');
 if(id==='7-4'){if(choice==='A'){support(w,'civil','親赴下游完成撤離');s.grainSaved=!!s.support.government||s.preparations.includes('B');}else {s.grainSaved=true;if(!s.support.civil&&!s.preparations.includes('A'))recordLoss(w,'civilians_unsupported');}}
 if(id==='8-2A'){s.facilities.crossbows=3;if(choice==='B')s.assignments.crossbow_guard='看管木楔與弩陣';}
 if(id==='8-2B'){s.facilities.signal=1;s.facilities.lowerGate=1;}
 if(id==='8-3A'&&s.sources.E4?.some(v=>v.includes('騎隊')))evidence(w,'E4','verified','雙令、封袋與弩陣配置現場對照');
 if(id==='8-4'){s.custody.gu='detained';s.custody.wei='detained';support(w,'escort','未涉案鏢師接手救援與保全');}
 if(id==='8-3A'&&choice==='B')s.assignments.witness_guard='獨立見證、護送信使或遺物';
 if(id==='8-3B')s.finalAid=choice==='A'?'medical':choice==='B'?'disperse':'retreat';
 if(id==='2-4'&&choice==='A'){w.party.npcIds=w.party.npcIds.filter(id=>id!=='npc_003');w.npcStates.npc_003={availability:'local',untilChapter:3,assignment:'赤水舊案善後'};}
}

export class ZhaoyeEngine {
 constructor({world,character}){this.world=world;this.character=character;world.zhaoye.assignments??={};}
 get scene(){return this.sceneView();}
 sceneView(){
  const w=this.world,s=stateOf(w);
  if(s.aftermath)return {title:s.aftermath.title,text:this.conditionText(s.aftermath.text),choices:[{id:'continue',label:'收起這一頁，繼續'}]};
  if(s.supplement){const pending=s.supplement,[title,options]=pending.steps[pending.index];const previous=s.events[pending.eventId].supplements??[];return {title,text:'主要決定已保留。這一段補問與個人回話不替其他人改票，也不抹去先前結果。',choices:options.map((label,index)=>({id:`supplement:${index}`,label})).filter(c=>!['4-1B','6-2C'].includes(pending.eventId)||!previous.some(p=>p.label===c.label))};}
  if(s.chapterSafe){const pending=Object.entries(s.promises).filter(([,p])=>p.status==='pending'&&p.due<=w.chapter);const end=w.flags.game_complete;const ending=end?endingFor(w):null;return {title:end?ending.title:`${ZHAOYE_PLACES[w.chapter-1]} · 章後安全據點`,text:(end?this.endingText(ending):`《${ZHAOYE_CHAPTERS[w.chapter-1]}》已告一段落。可以自由整備，再主動啟程；離線不推進危機。`)+`\n\n${this.callbacks()}\n\n${evidenceSummary(w)}\n\n未竟事項：\n`+(pending.map(([,p])=>`${p.who}：${p.what}（${p.where}）`).join('\n')||'本章沒有到期未履行承諾。'),choices:[...pending.map(([id,p])=>({id:`fulfil:${id}`,label:`返回${p.where}：${p.what}（完成一次交接）`})),...(end?[]:[{id:'next-chapter',label:'結束休整，啟程下一章'}])]};}
  const scene=ZHAOYE_SCENES[w.currentSceneId];if(!scene)throw new Error('照夜行場景不存在，請載入備份存檔');
  const e=s.events[scene.id],done=e?.investigations??[];
  let text=scene.text;const callback=storyCallbacks(w,scene.id);if(callback)text+='\n\n'+callback;
  if(BATTLES[scene.id]){const modifiers=storyBattleModifiers(w);if(modifiers.reasons.length)text+='\n\n已知準備影響：\n'+modifiers.reasons.join('\n');}
  if(scene.id==='1-0')text=PROLOGUES[w.startingCountry]+'\n\n'+(IDENTITY_OBSERVATIONS[this.character.identityId]??'');
  if(scene.id==='1-3')text+=`\n本場救援期限：${this.battleLimit(scene.id)} 回合。`;
  if(scene.id==='7-1')text+=`\n可準備 ${s.preparationLimit??2} 項，已做 ${done.length} 項。無現實時間倒數。`;
  if(scene.id==='7-4')text+='\n\n'+evidenceSummary(w)+`\n疏散：${s.preparations.includes('A')?'已準備':'未準備'}；騎隊查驗：${s.preparations.includes('B')?'已準備':'未準備'}`;
  if(scene.id==='8-6')text+='\n\n'+evidenceSummary(w)+'\n'+['A','B','C'].map(k=>{const result=endingFor(w,k);return `${k}：${result.title}${result.missing.length?'（'+result.missing.join('、')+'）':''}`;}).join('\n');
  text=this.conditionText(text);
  const choices=[];
  for(const c of scene.choices){if(done.includes(c.id))continue;if(scene.id==='7-1'&&done.length>=(s.preparationLimit??2))continue;if(scene.id==='8-2B'&&c.id==='B'&&!s.events['4-2C']?.choice&&!s.events['7-2B']?.choice)continue;
   const cost=COSTS[scene.id]?.[c.id]??0;const operationCount=scene.id==='8-2A'?(c.id==='A'?3:2):scene.id==='8-2B'?2:0;
   choices.push({...c,id:c.id,major:scene.major,label:c.label+(cost?`（${cost} 文）`:operationCount?`（${operationCount} 次場景操作）`:''),disabled:cost>this.character.moneyWen});if(cost)choices.push({...c,id:`labour:${c.id}`,label:`${c.label}（以勞務代付，多一段當地時間）`,major:scene.major});
  }
  if(scene.investigate){const required=scene.id==='1-1A'?2:scene.id==='7-1'?(s.preparationLimit??2):scene.choices.length;if(done.length>=required)choices.push({id:'conclude',label:'完成逐項核對，繼續前行'});text+=`\n已調查 ${done.length}／${scene.choices.length} 項；每項只能結算一次。`;}
  if(scene.optional)choices.push({id:'skip',label:'暫不參與，交由當地接手（不取得本次支援）'});
  if(e?.operation){return {title:scene.title,text:`${text}\n\n已選：${e.operation.label}\n操作 ${e.actions}／${e.operation.required}；每次操作推進一個場景回合。`,choices:[{id:'operate',label:'完成下一步現場操作'}]};}
  return {...scene,text,choices};
 }
 conditionText(text){const s=stateOf(this.world);
text=text.replace(/若陶安生還，他隔著屏風說：「有些不是人名，是船名。有些不是貨價，是贖人的錢。最後那頁不是我撕的。」若陶安死亡，改由帳頁邊緣的裝訂孔與連續頁碼證明缺頁，沒有人替他給出解釋。/g,s.taoAlive?'陶安隔著屏風說：「有些不是人名，是船名。有些不是貨價，是贖人的錢。最後那頁不是我撕的。」':'帳頁邊緣的裝訂孔與連續頁碼證明缺頁，陶安已無法再說明。');
text=text.replace(/若信使生還，他縮在牆邊，先問可不可以不要再看魏；若信使死亡，桌上只剩其封袋，醫工確認後覆上布。/g,s.messengerAlive?'信使縮在牆邊，問可不可以不要再看魏。':'桌上只剩信使的封袋，醫工確認後覆上布。');
text=text.replace(/若第四章曾協助船工履約，他會先認出你們：「我聽說你們答應的船錢真的有給。這回也能說清楚嗎？」若未做，便從基本條件開始談，不直接信任。/g,s.promises['4-2C']?.status==='fulfilled'?'船主認出你：「我聽說你答應的船錢真的有給。這回也能說清楚嗎？」':'船主等著你說明期限、航線與補償，不肯只信一句會負責。');text=text.replace(/若陶安生還，他會幫忙辨認，手仍在抖；若陶安已死，改由周述家屬寄來的字樣作回憶，不讓死者在帳篷裡復活。/g,s.taoAlive?'陶安幫忙辨認，手仍在抖。':'陶安已不在。周述家屬寄來的字樣留在燈旁。');return text.split('\n\n').filter(p=>!/^【|^主持註|^這件事沒有隱藏|^這件事沒有/.test(p.trim())).join('\n\n').replaceAll('玩家','你').replaceAll('NPC','場外同伴').replaceAll('第七章','往後').replaceAll('第八章','終局').replaceAll('第五章','青衡公議').replaceAll('第六章','承京').replaceAll('第四章','汀州').replaceAll('你們',(this.world.party.playerIds.length<=1?'你':'你們'));}
 choose(id){const w=this.world,s=stateOf(w),view=this.sceneView(),choice=view.choices.find(c=>c.id===id);if(!choice||choice.disabled)throw new Error('這個選項目前不能執行');
  if(s.aftermath){s.aftermath=null;return {id};}
  if(s.supplement){const pending=s.supplement,e=eventOf(w,pending.eventId),[title]=pending.steps[pending.index];(e.supplements??=[]).push({step:pending.index,label:choice.label,playerId:this.character.id??w.ownerCharacterId});
   (this.character.storyHistory??=[]).push({worldId:w.id,eventId:pending.eventId,prompt:title,answer:choice.label});
   if(title==='舊案到期：如何處理？'){if(id==='supplement:0'){s.oldCaseSubmitted=true;s.oldCaseStrategy='submitted';s.promises.oldCase.status='fulfilled';}else if(id==='supplement:2'){s.oldCaseStrategy='concealed';s.promises.oldCase.status='refused';}else s.promises.oldCase.remedy='由受害者代理人保管，仍可返回提交';}
   if(pending.eventId==='7-4'&&id==='supplement:1'&&title==='斷軸老人與工具箱')s.promises.tools={who:'斷軸老人',what:'依標記回取工具箱',where:'鎖雲鎮',due:7,status:'pending'};
   pending.index++;if(pending.index<pending.steps.length)return {id};s.supplement=null;e.supplementsComplete=true;return this.advance();}
  if(id.startsWith('fulfil:')){const key=id.slice(7),p=s.promises[key];p.status='fulfilled';if(key==='oldCase'){s.oldCaseSubmitted=true;s.oldCaseStrategy='submitted';}if(key==='4-2C'||key==='7-2B')support(w,'civil',`${p.who}履約完成`);s.aftermath={title:'承諾已實際交接',text:`你返回${p.where}，與${p.who}核對：${p.what}。交接人將結果寫回卷末。`};return {id};}
  if(id==='next-chapter'){s.assignments={};s.chapterSafe=false;w.chapter++;w.currentSceneId=ZHAOYE_ORDER.find(k=>k.startsWith(`${w.chapter}-`));w.quests[`quest_chapter_${w.chapter}`]='active';w.currentLocationId=ZHAOYE_LOCATION_IDS[w.chapter-1];if(!w.visitedLocations.includes(w.currentLocationId))w.visitedLocations.push(w.currentLocationId);return {id};}
  const eventId=w.currentSceneId,scene=ZHAOYE_SCENES[eventId],e=eventOf(w,eventId);
  if(id==='skip'){e.status='skipped';return this.advance();}
  if(id==='conclude'){e.status='completed';applyChoice(w,eventId,e.choice);return this.advance();}
  if(id==='operate'){e.actions++;if(e.actions>=e.operation.required){const c=e.operation.choice;delete e.operation;return this.resolve(eventId,c);}return {id};}
  const labour=id.startsWith('labour:'),key=labour?id.slice(7):id,c=scene.choices.find(c=>c.id===key);if(!c)throw new Error('事件選項無效');
  if(e.status==='completed'||e.investigations.includes(key))throw new Error('事件已結算');
  const cost=COSTS[eventId]?.[key]??0;if(!labour&&cost){if(!Number.isFinite(this.character.moneyWen)||this.character.moneyWen<cost)throw new Error('金錢不足，可選勞務路線');this.character.moneyWen-=cost;e.paid+=cost;}if(labour)e.localTime=(e.localTime??0)+1;
  const encounter=BATTLES[eventId]??OPTIONAL_BATTLES[`${eventId}:${key}`];if(encounter){e.choice=key;return {id:key,battle:`zhaoye_${eventId}`,enemyName:encounter.name,eventId,next:eventId,sparring:encounter.sparring,shortEncounter:encounter.shortEncounter,maxRounds:encounter.maxRounds};}
  if(eventId==='8-2A'||eventId==='8-2B'){e.operation={choice:key,label:c.label,required:eventId==='8-2A'&&key==='A'?3:2};return {id};}
  if(scene.investigate){e.investigations.push(key);e.choice=key;if(eventId==='7-1')s.preparations.push(key);s.aftermath={title:scene.title+' · 調查所得',text:REACTIONS[eventId]?.['ABC'.indexOf(key)]??`已完成「${c.label}」，原始來源已分開記錄，尚未調查的項目仍可繼續。`};return {id};}
  return this.resolve(eventId,key);
 }
 resolve(id,key){const w=this.world,s=stateOf(w),e=eventOf(w,id);e.status='completed';e.choice=key;applyChoice(w,id,key);if(MAJOR[id]){w.flags[`chapter_${w.chapter}_choice`]=`zhaoye_${id}_${key}`;w.flags[`chapter_${w.chapter}_path`]='ABC'.indexOf(key)+1;}
  const steps=supplementsFor(id,key);if(id==='5-5'&&!s.oldCaseSubmitted&&s.promises.oldCase)steps.push(['舊案到期：如何處理？',['現在提交舊案與口供','記明補救方式後延後，仍可返回提交','拒絕提交，承擔持續隱瞞的後果']]);
  if(steps.length)s.supplement={eventId:id,index:0,steps};
  const result=steps.length?{}:this.advance();s.aftermath={title:ZHAOYE_SCENES[id].title+' · 選後',text:AFTER[id]?.[key]??REACTIONS[id]?.['ABC'.indexOf(key)]??`你選擇「${ZHAOYE_SCENES[id].choices.find(c=>c.id===key)?.label??'完成現場處理'}」。這一段經過與參與者的說法已記入旅途案卷。${s.promises[id]?'\n承諾尚未履行，已列入章末返回清單。':''}`};if(s.promises[id])s.aftermath.text+='\n\n待履約：'+s.promises[id].what+'（'+s.promises[id].where+'）。';if(id==='3-4'&&s.losses.includes('grain_wait'))s.aftermath.text+='\n備糧到達前，一位老人因失溫死亡。家屬確認後，損失列入問責，不以保住點驗安慰他們。';return result;
 }
 advance(){const w=this.world,s=stateOf(w),current=w.currentSceneId,next=ZHAOYE_ORDER[ZHAOYE_ORDER.indexOf(current)+1];if(!next||Number(next[0])!==w.chapter){s.chapterSafe=true;w.flags[`chapter_${w.chapter}_complete`]=true;w.quests[`quest_chapter_${w.chapter}`]='completed';if(!next)w.flags.game_complete=true;if(!s.rewards.includes(w.chapter)){s.rewards.push(w.chapter);return {complete:true};}}else {w.currentSceneId=next;if(current==='1-0'){w.currentLocationId=ZHAOYE_LOCATION_IDS[0];if(!w.visitedLocations.includes(w.currentLocationId))w.visitedLocations.push(w.currentLocationId);}}return {};}
 battleDefinition(id=this.world.currentSceneId){return BATTLES[id]??OPTIONAL_BATTLES[`${id}:${stateOf(this.world).events[id]?.choice}`];}
 battleLimit(id){return (this.battleDefinition(id)?.limit??Infinity)+storyBattleModifiers(this.world).grace;}
 battleProgress(){const id=this.world.currentSceneId,b=this.battleDefinition(id);if(!b)return null;const e=eventOf(this.world,id);return {...b,done:e.actions??0,limit:this.battleLimit(id)};}
 battleAction(type,round){const w=this.world,id=w.currentSceneId,e=eventOf(w,id),b=this.battleDefinition(id);if(!b)return; if(type==='objective'&&e.actions<b.objectives.length&&round<=this.battleLimit(id)){e.actions++;if(b.persistent)stateOf(w).facilities.mainLock=e.actions;}if(id==='8-4'&&e.actions>=2&&type==='defend')e.defenses=(e.defenses??0)+1;return id==='8-4'&&(e.defenses??0)>=3;}
 finishBattle(choice,result){const w=this.world,id=choice.eventId;if(w.currentSceneId!==id)throw new Error('戰鬥與當前場景不符');const e=eventOf(w,id),s=stateOf(w),meta=this.battleDefinition(id),complete=e.actions>=meta.objectives.length; e.attempts=(e.attempts??0)+1;
  if(meta.sparring||meta.shortEncounter){e.challengeResult=result;e.localTime=(e.localTime??0)+(result==='victory'?0:1);if(meta.sparring){(this.character.learningClues??=[]).push({worldId:w.id,eventId:id,topic:id==='5-1B'?'上乘招式拜訪與護送演練':'基本破勢與輪班規矩',result});}const reward=this.resolve(id,e.choice);s.aftermath.text=(meta.sparring?(result==='victory'?'木器收起，雙方交換招式與站位的看法。':'比試落敗，對方說明被克制的一步；該說的證詞不因勝負取消。'):(result==='victory'?'短戰後攔下接頭護衛，來路仍须核對。':'你循退路脫離，傳信者已先報警；留下的腳印仍能指向磨坊。'))+'\n'+(REACTIONS[id]?.['ABC'.indexOf(e.choice)]??'');return reward;}
  if(id==='8-4'&&(result!=='victory'||!complete)&&e.attempts<2){s.aftermath={title:'鎖雲鎮 · 撤回整備',text:'盟友接住了倒下的人。主鎖與其他設施的操作進度保留，再次上臺前可以整備；若再失利，援隊會強行開閘，造成救援損失。'};return;}
  if(id==='1-3'){s.taoAlive=result==='victory'&&complete;if(!s.taoAlive)recordLoss(w,'mill');}
  if(id==='4-3'&&(result!=='victory'||!complete))recordLoss(w,'ship');
  if(id==='7-3'&&result!=='victory')recordLoss(w,'lockyun_defeat');
  if(id==='8-3')s.messengerAlive=result==='victory'&&complete;
  if(id==='8-4'&&(result!=='victory'||!complete)){recordLoss(w,'forced_gate');s.facilities.mainLock=2;}
  const reward=this.resolve(id,e.choice??'A');s.aftermath.text=(result==='victory'?'交鋒結束，重要涉案者非致命制伏。':'接應者將你帶回最近安全據點，核心人證與副證仍在；改走救援與補查路線。')+`\n場景目標：${e.actions}／${meta.objectives.length}。`+(id==='1-3'?(s.taoAlive?'\n陶安生還，由醫者接手。':'\n陶安未能逃出火場。家屬收到確認，帳冊由接應者保全。'):'')+(id==='8-3'?(s.messengerAlive?'\n信使獲救。':'\n信使未能救回，命令封袋交由見證人保全。'):'');return reward;
 }
 callbacks(){const w=this.world,s=stateOf(w),selected=Object.entries(s.events).filter(([id,e])=>Number(id[0])===w.chapter&&e.choice).map(([id,e])=>`${ZHAOYE_SCENES[id].title}：${ZHAOYE_SCENES[id].choices.find(c=>c.id===e.choice)?.label??e.choice}`);const specific=[`原帳：${{government:'官府封存，案號可追查',escort:'鏢盟保管，收條在卷',self:'世界共管卷箱'}[s.ledger]??'尚未取得'}`,s.taoAlive===undefined?'':s.taoAlive?'陶安在安全處養傷，不隨隊赴險。':'陶安的證言位置留給遺物與家屬，不再出現在同行名單。',s.oldCaseSubmitted?'血河舊案已提交，殷紅袖接受追責。':''];return [...specific,...selected].filter(Boolean).join('\n');}
 endingText(result){const prose={ '公堂有燈':'第一次聽證開了六個時辰。顧長纓聽見謝意，也聽見有人問兒子的屍骨。沈照微在卷末寫「續查」，沒有寫「結」。那盞燈不很亮，坐在門外的人也看得見。','江上暫平':'第一個過橋的是賣菜人。三國答應交換囚工、限期開倉，三十日後檢視第一次履約。江上暫時沒有戰船，這個「暫時」仍要有人守。','無旗之盟':'新據點沒有盟主椅子。葉停舟掛起白木牌：「運人回家，運糧過關。其餘的，先問清楚。」沒有替天下起新名字，只替下一個求助的人留門。','未竟之案':'告示把許多名字寫成「另案調查」。主要陰謀已止，部分高位人物仍以證據待補拖延。沈照微留下缺頁的位置：路沒有斷，只是比出發時更長。'};return `${prose[result.title]}\n\n顧長纓固定在押，供述不換赦免。${stateOf(this.world).oldCaseSubmitted?'殷紅袖接受舊案處置，繼續護送受害者。':'殷紅袖離隊自行補交口供，不替未交舊案簽結。'}\n${result.memorial}：家屬先讀死者名字，不以低損失忘記序章死者。\n\n再過鴉渡，許三更端出湯：「不急。吃完再走。」一隊沒有掛大旗的車馬慢慢過橋。\n第一部・完。江湖繼續。`;}
}
