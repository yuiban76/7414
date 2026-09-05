import { createFinalScenario } from "./zhaoye-final-battle.js";
export function createStoryScenario(id,progress=0){
 if(id==="8-4")return createFinalScenario(progress);
 if(id!=="6-4")return null;
 const actions=Math.max(0,Math.min(4,Number.isInteger(progress)?progress:0));
 return {id,streets:Math.max(0,actions-1),barrierPassed:actions>0,phase:actions?2:1,coverRemoved:actions>0,interruptedRound:0,subdued:false};
}
export function escortIntent(battle,enemy){
 const s=battle.scenario;if(s?.id!=="6-4")return null;
 const target=battle.living("party").toSorted((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
 const volley=battle.round%2===1;
 return {type:"story-escort",targetId:target?.id??null,volley,label:s.subdued
  ?"賀嶠已受制，接應者擋住增援；持卷人仍需完成三段護送，不必再攻擊"
  :s.phase===1?"街口拒馬與弩手：弩箭瞄準前排；拆障護送、近戰破勢或控制可開路"
  :volley?"街尾弩手瞄準撤離線：本回合齊射；可防禦、身法或先手打斷"
  :"親衛正在追近：護送下一街段即可拉開距離，第三段完成立即撤出"};
}
export function escortObjective(battle){
 const s=battle.scenario;if(s?.id!=="6-4"||s.streets>=3)return;
 if(!s.barrierPassed){
  s.coverRemoved=true;s.barrierPassed=true;s.phase=2;
  battle.log.push("你檢查拒馬接榫並帶持卷人通過側路；弩手失去高位掩護。接下來仍須走過三段街道。");
  return;
 }
 s.phase=2;s.streets++;
 battle.log.push(`持卷人已走過 ${s.streets}／3 段街道。街尾仍有增援，不停留清場。`);
 if(s.streets===3){battle.finished="victory";battle.log.push("持卷人越過接應線，案卷送出；隊伍立即撤離，封街戰結束。");}
}
export function escortHit(battle,actor,target,skill,newBreak){
 const s=battle.scenario;if(s?.id!=="6-4"||target.side!=="enemy")return;
 if(newBreak||skill?.type==="control"){
  if(s.phase===1){s.phase=2;s.coverRemoved=true;battle.log.push("親衛陣線被牽制，拒馬側路已打開；仍須逐段護送持卷人。");}
  if(target.lastActionRound!==battle.round)s.interruptedRound=battle.round;
 }
 if(target.hp===0){
  target.hp=1;s.subdued=true;s.phase=2;
  battle.log.push("賀嶠被非致命制伏，接應者攔住後隊。護送未完成，不發放清怪獎勵。");
 }
}
export function resolveEscortAction(battle,actor,action){
 if(action.type!=="story-escort")return false;
 const s=battle.scenario;actor.lastActionRound=battle.round;
 if(s.subdued||s.interruptedRound===battle.round){battle.log.push(s.subdued?"接應者守住街口，等待持卷人撤出。":"弩手／親衛的攻勢被打斷。");return true;}
 const target=battle.find(action.targetId)??battle.living("party")[0];if(!target)return true;
 const multiplier=actor.damageMultiplier??1;
 try{
  actor.damageMultiplier=multiplier*(s.coverRemoved?.8:1);
  battle.attack(actor,target,action.volley?{name:"街口弩射",power:{hp:24,posture:12},effects:[]}:null);
 }finally{actor.damageMultiplier=multiplier;}
 return true;
}
