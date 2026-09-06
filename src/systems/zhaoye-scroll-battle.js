export function createScrollScenario(progress=0){
 const actions=Math.max(0,Math.min(2,Number.isInteger(progress)?progress:0));
 return {id:"5-4",phase:actions?2:1,armorBroken:actions>0,scrollSafe:actions>0,witnessPath:actions>1,fireLevel:0,scrollLost:false,interruptedRound:0,subdued:false};
}
export function scrollIntent(battle,enemy){
 const s=battle.scenario;if(s?.id!=="5-4")return null;
 const target=battle.living("party").toSorted((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
 if(s.phase===1)return {type:"story-scroll",targetId:target?.id??null,fire:false,label:"程岳重甲反擊：破勢可解除護體；先保住卷宗出口或打斷反擊"};
 return {type:"story-scroll",targetId:target?.id??null,fire:!s.scrollSafe,label:s.scrollSafe
  ?"卷宗出口已保全：火盆仍在擴散，證人通道需要另一個行動"
  :"火盆每回合預告擴散：先保住卷宗出口，否則帳目可能被焚"};
}
export function scrollObjective(battle){
 const s=battle.scenario;if(s?.id!=="5-4")return;
 if(!s.scrollSafe){s.scrollSafe=true;s.phase=2;battle.log.push("卷宗出口由同伴接手，火盆擴散不再直接吞掉主卷；證人通道仍未打開。");return;}
 if(!s.witnessPath){s.witnessPath=true;s.phase=2;battle.log.push("證人通道打開，持卷人與證人可分流撤出；程岳仍須被非致命制伏。");}
}
export function scrollDamageReduction(battle,target){
 const s=battle.scenario;
 return s?.id==="5-4"&&target.side==="enemy"&&s.phase===1&&!s.armorBroken?.25:0;
}
export function scrollHit(battle,actor,target,skill,newBreak){
 const s=battle.scenario;if(s?.id!=="5-4"||target.side!=="enemy")return;
 if(newBreak){s.armorBroken=true;s.phase=2;battle.log.push("程岳重甲護體被破，反擊不再享有護體減傷；火盆開始成為主要威脅。");}
 if(newBreak||skill?.type==="control")s.interruptedRound=battle.round;
 if(target.hp===0){
  target.hp=1;s.subdued=true;
  if(s.scrollSafe&&s.witnessPath){
   battle.finished="victory";
   battle.log.push("程岳被非致命制伏；卷宗出口與證人通道都已保住。");
  }else battle.log.push("程岳被逼退但未倒下；先完成卷宗與證人兩項撤離。");
 }
}
export function resolveScrollAction(battle,actor,action){
 if(action.type!=="story-scroll")return false;
 const s=battle.scenario;actor.lastActionRound=battle.round;
 if(s.interruptedRound===battle.round){battle.log.push("程岳的反擊／火盆掩護被打斷。");return true;}
 const target=battle.find(action.targetId)??battle.living("party")[0];if(!target)return true;
 battle.attack(actor,target,action.fire?{name:"焚卷火勢",power:{hp:20,posture:12},effects:[]}:null);
 return true;
}
export function scrollRoundEnd(battle){
 const s=battle.scenario;if(s?.id!=="5-4"||s.scrollSafe)return;
 s.fireLevel++;
 if(s.fireLevel>=2&&!s.scrollLost){s.scrollLost=true;battle.log.push("火盆越過卷宗出口，部分帳目被焚；後續只能靠付款批文與副本補足。");}
}
