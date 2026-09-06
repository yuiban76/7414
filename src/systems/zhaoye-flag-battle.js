export function createFlagScenario(progress=0,evidenceReady=false){
 const actions=Math.max(0,Math.min(2,Number.isInteger(progress)?progress:0));
 return {id:"7-3",phase:actions===0?1:actions===1?2:3,winch:actions>0,ordersRead:actions>1,evidenceReady:Boolean(evidenceReady),interruptedRound:0,subdued:false};
}
export function flagIntent(battle,enemy){
 const s=battle.scenario;if(s?.id!=="7-3")return null;
 const target=battle.living("party").toSorted((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
 if(s.phase===1)return {type:"story-flag",targetId:target?.id??null,charge:true,label:"騎兵衝鋒：路線已標記；防禦、身法或操作副絞盤可改變衝線"};
 if(s.phase===2)return {type:"story-flag",targetId:target?.id??null,charge:false,label:"韓烈持長槊守絞盤：破勢／控制可打斷，操作副絞盤會阻止斷橋滅口"};
 return {type:"story-flag",targetId:target?.id??null,charge:false,label:s.evidenceReady&&s.ordersRead
  ?"假旗軍令已宣讀：普通軍士停手，韓烈仍可攻擊；集中處理絞盤與撤離"
  :"軍號召兵：普通軍士仍在護送戰；若已核驗軍令，宣讀後才能讓其停手"};
}
export function flagObjective(battle){
 const s=battle.scenario;if(s?.id!=="7-3")return;
 if(!s.winch){s.winch=true;s.phase=2;battle.log.push("副絞盤轉動，騎兵衝線被迫偏移；韓烈下馬親守主絞盤。");return;}
 if(!s.ordersRead){s.ordersRead=true;s.phase=3;if(s.evidenceReady)battle.log.push("已核驗的假旗軍令當場宣讀，普通軍士停手；韓烈仍拒絕放下長槊。");else battle.log.push("你宣讀手上軍令，但核驗仍不足；阿史那衡帶印記向軍士說明，護送戰仍未停止。");}
}
export function flagHit(battle,actor,target,skill,newBreak){
 const s=battle.scenario;if(s?.id!=="7-3"||target.side!=="enemy")return;
 if(newBreak||skill?.type==="control"){
  s.interruptedRound=battle.round;
  if(s.phase===1){s.phase=2;s.winch=true;battle.log.push("騎兵路線被破勢牽開，副絞盤窗口出現；仍須完成現場操作。");}
 }
 if(target.hp===0){
  target.hp=1;s.subdued=true;
  battle.log.push("韓烈受創但未被寫成死亡；封橋與軍令仍須由現場行動處理。");
 }
}
export function resolveFlagAction(battle,actor,action){
 if(action.type!=="story-flag")return false;
 const s=battle.scenario;actor.lastActionRound=battle.round;
 if(s.interruptedRound===battle.round){battle.log.push("騎隊／軍士的攻勢被打斷，重新列陣。");return true;}
 const target=battle.find(action.targetId)??battle.living("party")[0];if(!target)return true;
 const multiplier=actor.damageMultiplier??1;
 try{
  actor.damageMultiplier=multiplier*(s.winch?.85:1);
  battle.attack(actor,target,action.charge?{name:"騎兵衝鋒",power:{hp:25,posture:16},effects:[]}:null);
 }finally{actor.damageMultiplier=multiplier;}
 return true;
}
