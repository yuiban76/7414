import { BattleSystem } from '../systems/battle-system.js';
import { SeededRng } from '../core/rng.js';

export function packBattle(battle,choice,skillUses={}){return {version:1,...battle.snapshot(),rng:battle.rng.snapshot(),choice:structuredClone(choice),skillUses:structuredClone(skillUses)};}
export function restoreBattle(saved){
 if(saved?.version!==1||!Number.isSafeInteger(saved.round)||saved.round<1||!Array.isArray(saved.party)||saved.party.length<1||saved.party.length>4||!Array.isArray(saved.enemies)||saved.enemies.length<1||saved.enemies.length>8)throw new Error('戰鬥存檔結構無效');
 if(!Number.isSafeInteger(saved.rng?.state)||!Number.isSafeInteger(saved.rng?.counter)||saved.rng.counter<0||typeof saved.rng.seed!=='string'||!Array.isArray(saved.log)||![null,'victory','defeat'].includes(saved.finished))throw new Error('戰鬥存檔狀態無效');
 if(saved.scenario!=null){
  const s=saved.scenario;
  if(s.id!=='8-4'||![1,2,3].includes(s.phase)||![0,1,2].includes(s.mainLock)||![0,1,2,3].includes(s.successes)||typeof s.brokenOnce!=='boolean'||['phaseRound','lastSuccessRound','interruptedRound'].some(key=>!Number.isSafeInteger(s[key])||s[key]<0||s[key]>saved.round))throw new Error('戰鬥階段存檔無效');
 }
 const ids=new Set();for(const actor of [...saved.party,...saved.enemies]){if(!actor.id||ids.has(actor.id))throw new Error('戰鬥角色編號無效');ids.add(actor.id);for(const [value,max] of [['hp','maxHp'],['inner','maxInner'],['posture','maxPosture']])if(!Number.isFinite(actor[value])||!Number.isFinite(actor[max])||actor[max]<0||actor[value]<0||actor[value]>actor[max])throw new Error('戰鬥資源值無效');}
 const battle=Object.create(BattleSystem.prototype);Object.assign(battle,structuredClone({scenario:saved.scenario??null,round:saved.round,party:saved.party,enemies:saved.enemies,log:saved.log,finished:saved.finished}));battle.rng=new SeededRng(saved.rng.seed);battle.rng.state=saved.rng.state;battle.rng.counter=saved.rng.counter;
 return {battle,choice:structuredClone(saved.choice),skillUses:structuredClone(saved.skillUses??{})};
}
