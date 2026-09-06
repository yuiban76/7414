export function createMessengerScenario(progress=0){
 const safe=Number.isInteger(progress)&&progress>0;
 return {id:"8-3",phase:safe?2:1,messengerSafe:safe,messengerDead:false,interruptedRound:0,subdued:false,limit:3};
}
export function messengerIntent(battle,enemy){
 const s=battle.scenario;if(s?.id!=="8-3")return null;
 const target=battle.living("party").toSorted((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
 if(s.phase===1)return {type:"story-messenger",targetId:target?.id??null,killShot:false,label:"魏沉沙：快速連擊已預告；破勢／控制可先打斷，場景行動可掩護信使"};
 return {type:"story-messenger",targetId:target?.id??null,killShot:!s.messengerSafe,label:s.messengerSafe
  ?"信使已被護住：魏仍可反擊，但不再能把人證當成空檔"
  :"準備射殺信使：下一次空檔會失去人證；控制／破勢或立刻掩護可阻止"};
}
export function messengerObjective(battle){
 const s=battle.scenario;if(s?.id!=="8-3"||s.messengerSafe)return;
 s.messengerSafe=true;s.phase=2;
 battle.log.push(s.messengerDead
  ?"信使已倒下，場景行動改為封存封袋與命令；不能讓死者重新出現在口供裡。"
  :"葉停舟帶信使退到側廊，命令封袋由見證人接手；魏失去射殺空檔。");
}
export function messengerHit(battle,actor,target,skill,newBreak){
 const s=battle.scenario;if(s?.id!=="8-3"||target.side!=="enemy")return;
 if(newBreak||skill?.type==="control")s.interruptedRound=battle.round;
 if(target.hp===0){
  target.hp=1;s.subdued=true;
  if(s.messengerSafe&&!s.messengerDead){
   battle.finished="victory";
   battle.log.push("魏沉沙被非致命制伏，信使由見證人護送；命令可供後續核對。");
  }else{
   battle.finished="victory";
   battle.log.push("魏沉沙被非致命制伏；信使未能救回，但封袋與命令仍被保全。");
  }
 }
}
export function resolveMessengerAction(battle,actor,action){
 if(action.type!=="story-messenger")return false;
 const s=battle.scenario;actor.lastActionRound=battle.round;
 if(s.interruptedRound===battle.round){battle.log.push("魏的連擊／射殺動作被打斷，信使趁隙退開。");return true;}
 if(action.killShot&&!s.messengerSafe&&!s.messengerDead){
  s.messengerDead=true;
  battle.log.push("魏沉沙抓住空檔射殺信使；封袋仍在，但口供位置改由遺物與命令補足。");
 }
 const target=battle.find(action.targetId)??battle.living("party")[0];if(!target)return true;
 battle.attack(actor,target,action.killShot?{name:"追擊",power:{hp:18,posture:12},effects:[]}:null);
 return true;
}
