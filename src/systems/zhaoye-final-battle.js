// All encounter state is plain data, included in the battle save snapshot.
export function createFinalScenario(mainLock=0) {
  const progress=Math.max(0,Math.min(2,Number.isInteger(mainLock)?mainLock:0));
  return {id:"8-4",mainLock:progress,phase:progress===2?3:1,phaseRound:1,successes:0,lastSuccessRound:0,interruptedRound:0,brokenOnce:false};
}
export function finalIntent(battle,enemy) {
  const s=battle.scenario;
  if(s?.id!=="8-4")return null;
  const targets=battle.living("party").toSorted((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
  const sweep=s.phase>=2&&(battle.round-s.phaseRound)%2===1&&enemy.inner>=8;
  return {type:"story-final",targetId:targets[0]?.id,sweep,label:sweep
    ?"斷纓：橫掃已蓄勢，本回合席捲全隊；可防禦、身法或先手破勢／控制打斷"
    :s.phase===1?"守旗：護體抵擋正面傷害，將壓制近鎖者；可沿護欄操作主鎖"
    :enemy.inner<8?"無人替答：內力漸竭，仍將揮掌；主鎖開啟後累計三次有效防禦／打斷可制伏"
    :"斷纓：近身壓制；下一回合將預告橫掃"};
}
export function finalObjective(battle) {
  const s=battle.scenario;if(s?.id!=="8-4"||s.mainLock>=2)return;
  s.mainLock++;
  battle.log.push(`沿護欄完成主鎖操作：${s.mainLock}／2，進度不因受擊歸零。`);
  if(s.mainLock===2){
    s.phase=3;s.phaseRound=battle.round;
    battle.log.push("主鎖開啟，人質撤離。顧失去護旗加成；三次有效防禦或打斷可令其力竭。");
  }
}
export function finalDamageReduction(battle,target) {
  return battle.scenario?.id==="8-4"&&target.side==="enemy"&&battle.scenario.phase===1?.25:0;
}
function success(battle) {
  const s=battle.scenario;
  if(s.mainLock<2||s.lastSuccessRound===battle.round||!battle.living("party").length)return;
  s.lastSuccessRound=battle.round;s.successes++;
  battle.log.push(`守住攻勢／成功打斷：${s.successes}／3。`);
  if(s.successes>=3){
    battle.finished="victory";
    battle.log.push("顧長纓內息耗盡，兵刃垂落；眾人上前非致命制伏。");
  }
}
export function finalHit(battle,actor,target,skill,newBreak) {
  const s=battle.scenario;if(s?.id!=="8-4")return;
  if(target.side==="enemy"){
    if(newBreak){
      s.brokenOnce=true;
      if(s.phase===1){s.phase=2;s.phaseRound=battle.round;battle.log.push("護體被破，進入斷纓階段；接下來橫掃會在出手前預告。");}
    }
    if((newBreak||skill?.type==="control")&&target.lastActionRound!==battle.round){
      s.interruptedRound=battle.round;
      battle.log.push("顧的蓄勢被打斷，本回合不能接續攻勢。");
      success(battle);
    }
    // Defeat requires both rescue and actual restraint, never an HP-only shortcut.
    if(target.hp===0&&(s.mainLock<2||!s.brokenOnce)){
      target.hp=1;
      battle.log.push(s.mainLock<2?"顧已受壓，主鎖仍未開啟；請先完成救援。":"顧仍持械抵抗；打破架勢或以有效防守令其力竭。");
    }
  }else if(actor.side==="enemy"&&target.hp>0&&target.defended)success(battle);
}
export function resolveFinalAction(battle,actor,action) {
  if(action.type!=="story-final")return false;
  const s=battle.scenario;
  actor.lastActionRound=battle.round;
  if(s.interruptedRound===battle.round){battle.log.push("顧的攻勢已被打斷，重新穩住步法。");return true;}
  const targets=action.sweep?battle.living("party"):[battle.find(action.targetId)??battle.living("party")[0]].filter(Boolean);
  actor.inner=Math.max(0,actor.inner-(action.sweep?8:4));
  const move=action.sweep?{name:"斷纓橫掃",power:{hp:24,posture:14},effects:[]}:null;
  for(const target of targets){if(battle.finished)break;battle.attack(actor,target,move);}
  return true;
}
export function finalRoundEnd(battle) {
  if(battle.scenario?.id!=="8-4")return;
  for(const enemy of battle.living("enemy"))enemy.inner=Math.max(0,enemy.inner-6);
}
