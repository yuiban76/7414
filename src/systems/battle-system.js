import { BALANCE, deriveResources } from "../config/balance.js";
import { clamp } from "../core/validators.js";

export function makePlayerCombatant(character, skillCatalog) {
  const resources = deriveResources(character.stats);
  return {
    id: character.id, name: character.name, side: "party", stats: structuredClone(character.stats),
    maxHp: character.maxHp ?? resources.maxHp, hp: character.maxHp ?? resources.maxHp,
    maxPosture: character.maxPosture ?? resources.maxPosture, posture: character.maxPosture ?? resources.maxPosture,
    maxInner: character.maxInner ?? resources.maxInner, inner: character.maxInner ?? resources.maxInner,
    skills: character.equippedSkills.map(id => skillCatalog.find(skill => skill.id === id)).filter(Boolean),
    statuses: [], intent: null, defended: false, guard: null, dodge: 0, vulnerableTurns: 0, observed: 0, consumablesUsed: 0, stableKey: 10
  };
}

export function makeNpcCompanion(name = "陸小川", skillCatalog = []) {
  const stats = { strength:22, constitution:24, agility:30, comprehension:26, willpower:20 };
  const resources = deriveResources(stats);
  return { id:"npc_001", name, side:"party", stats, ...resources, hp:resources.maxHp, posture:resources.maxPosture, inner:resources.maxInner, skills: ["流雲劍","踏草步"].map(skillName=>skillCatalog.find(s=>s.name===skillName)).filter(Boolean), statuses:[], intent:null, defended:false, guard:null, dodge:0, vulnerableTurns:0, observed:0, consumablesUsed:0, stableKey:11 };
}

export function makeEnemy(definition, skillCatalog, partySize = 2) {
  const scaleIndex = clamp(partySize, 1, 4);
  const resources = deriveResources(definition.stats);
  const isBoss = definition.tier !== "elite";
  const hpScale = isBoss ? BALANCE.bossHpScale[scaleIndex] : .78 + scaleIndex * .12;
  return { id:definition.id, name:definition.name, side:"enemy", tier:definition.tier, stats:structuredClone(definition.stats), damageMultiplier:isBoss?BALANCE.bossDamageScale[scaleIndex]:1, maxHp:Math.round(resources.maxHp*hpScale), hp:Math.round(resources.maxHp*hpScale), maxPosture:resources.maxPosture, posture:resources.maxPosture, maxInner:resources.maxInner, inner:resources.maxInner, skills:definition.skillIds.map(id=>skillCatalog.find(s=>s.id===id)).filter(Boolean), statuses:[], phases:structuredClone(definition.phases), triggeredPhases:[], aiProfile:definition.aiProfile, observeInfo:definition.observeInfo, intent:null, defended:false, guard:null, dodge:0, vulnerableTurns:0, observed:0, consumablesUsed:0, stableKey:100 + Number(definition.id.split("_").at(-1)) };
}

export class BattleSystem {
  constructor({ party, enemies, rng }) { this.party=party; this.enemies=enemies; this.rng=rng; this.round=1; this.log=["刀劍出鞘，戰鬥開始。"] ; this.finished=null; this.prepareIntents(); }
  get all() { return [...this.party, ...this.enemies]; }
  living(side) { return (side === "party" ? this.party : this.enemies).filter(c => c.hp > 0); }
  prepareIntents() { for (const enemy of this.living("enemy")) enemy.intent = this.chooseEnemyAction(enemy, false); }
  chooseEnemyAction(actor, includeTarget=true) {
    const opponents = this.living("party");
    const low = opponents.toSorted((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    let type = actor.posture/actor.maxPosture < .25 ? "defend" : "attack";
    const usable = actor.skills.filter(s=>s.innerCost<=actor.inner);
    if (opponents.some(o=>o.vulnerableTurns>0)) type="skill";
    else if (usable.length && this.rng.next()<.58) type="skill";
    const skill = type === "skill" ? usable.toSorted((a,b)=>(b.power.hp+b.power.posture)-(a.power.hp+a.power.posture))[0] : null;
    return { type, skillId:skill?.id, targetId:includeTarget ? low?.id : null, label:type==="defend"?"防守":type==="skill"?"蓄力／武功":"攻擊" };
  }
  submit(playerAction) {
    if (this.finished) return this.snapshot();
    const actions=[];
    const hero=this.living("party")[0];
    if (hero) actions.push({actor:hero, action:playerAction});
    for (const ally of this.living("party").slice(1)) actions.push({actor:ally,action:this.chooseAllyAction(ally)});
    for (const enemy of this.living("enemy")) actions.push({actor:enemy,action:this.chooseEnemyAction(enemy,true)});
    actions.sort((a,b)=>(b.actor.stats.agility-a.actor.stats.agility)||(a.actor.stableKey-b.actor.stableKey));
    for (const entry of actions) if (entry.actor.hp>0 && !this.finished) this.resolve(entry.actor,entry.action);
    this.endRound();
    return this.snapshot();
  }
  chooseAllyAction(actor) { const target=this.living("enemy").toSorted((a,b)=>a.hp-b.hp)[0]; const skill=actor.skills.find(s=>s.innerCost<=actor.inner && s.type==="attack"); return skill?{type:"skill",skillId:skill.id,targetId:target?.id}:{type:"attack",targetId:target?.id}; }
  resolve(actor, action) {
    actor.defended=false; actor.guard=null; actor.dodge=0;
    if (action.type === "defend") { actor.defended=true; this.log.push(`${actor.name}沉身守勢。`); return; }
    if (action.type === "observe") { const target=this.find(action.targetId)??this.living("enemy")[0]; if(target){target.observed=Math.min(3,target.observed+1); this.log.push(`${actor.name}觀察${target.name}：${target.observeInfo?.[0]??"呼吸與步法露出些許端倪"}。`);} return; }
    if (action.type === "guard") { if(actor.vulnerableTurns>0){this.log.push(`${actor.name}正露破綻，無法護衛。`);return;}actor.guard={targetId:action.targetId,hits:1,reduction:0}; this.log.push(`${actor.name}擋在同伴身前。`); return; }
    if (action.type === "item") { if(actor.consumablesUsed>=BALANCE.consumablesPerBattle){this.log.push(`${actor.name}本戰已無法再用消耗品。`);return;} actor.consumablesUsed++; const amount=Math.round(actor.maxHp*.28); actor.hp=clamp(actor.hp+amount,0,actor.maxHp); this.log.push(`${actor.name}服下金創散，恢復 ${amount} 氣血。`); return; }
    const target=this.find(action.targetId)??this.living(actor.side==="party"?"enemy":"party")[0]; if(!target)return;
    if(action.type==="skill") { const skill=actor.skills.find(s=>s.id===action.skillId); if(!skill||skill.innerCost>actor.inner){this.log.push(`${actor.name}內力不足，改以普通攻擊。`);this.attack(actor,target,null);return;} actor.inner-=skill.innerCost; const dodge=skill.effects.find(e=>e.effectId==="dodge"); const defend=skill.effects.find(e=>e.effectId==="defend"); const guard=skill.effects.find(e=>e.effectId==="guard"); if(dodge){actor.dodge=dodge.params.chance;this.log.push(`${actor.name}施展${skill.name}，身影倏忽。`);return;} if(defend){actor.defended=true;this.log.push(`${actor.name}施展${skill.name}，穩住門戶。`);return;} if(guard){if(actor.vulnerableTurns>0){this.log.push(`${actor.name}正露破綻，無法護衛。`);return;}actor.guard={targetId:action.targetId,hits:guard.params.hits??1,reduction:guard.params.reduction??.1};this.log.push(`${actor.name}施展${skill.name}護住同伴。`);return;} this.attack(actor,target,skill); }
    else this.attack(actor,target,null);
  }
  attack(actor, originalTarget, skill) {
    let target=this.redirectGuard(originalTarget);
    if(target.dodge>0&&this.rng.next()<target.dodge){this.log.push(`${target.name}避開了${actor.name}的攻勢。`);target.dodge=0;return;}
    const hpPower=skill?.power.hp??20, posturePower=skill?.power.posture??11;
    const defense=target.defended?BALANCE.defendHpReduction:BALANCE.playerDefense;
    const vulnerable=target.vulnerableTurns>0?BALANCE.postureBreakDamageMultiplier:1;
    const outgoing=actor.damageMultiplier??1;
    const hpDamage=Math.max(1,Math.round((hpPower+actor.stats.strength*.5)*(1-defense)*vulnerable*outgoing*(.94+this.rng.next()*.12)));
    const postureReduction=target.defended?BALANCE.defendPostureReduction:0;
    const postureDamage=Math.max(1,Math.round((posturePower+actor.stats.strength*.5)*(1-postureReduction)*outgoing));
    target.hp=clamp(target.hp-hpDamage,0,target.maxHp); target.posture=clamp(target.posture-postureDamage,0,target.maxPosture);
    this.log.push(`${actor.name}${skill?`施展${skill.name}`:"出手"}，對${target.name}造成 ${hpDamage} 氣血、${postureDamage} 架勢傷害。`);
    if(skill?.type==="control"){const drained=Math.min(target.inner,Math.max(5,skill.innerCost));target.inner-=drained;this.log.push(`${target.name}的內息受制，額外流失 ${drained} 內力。`);}
    if(target.posture===0&&target.vulnerableTurns===0){target.vulnerableTurns=2;this.log.push(`${target.name}架勢崩解，下一回合將持續露出破綻！`);}
    this.triggerPhases(target); this.checkFinished();
  }
  redirectGuard(target) { const guardian=this.living(target.side).find(c=>c.guard?.targetId===target.id&&c.guard.hits>0); if(!guardian)return target; guardian.guard.hits--; this.log.push(`${guardian.name}替${target.name}擋下攻擊。`); return guardian; }
  triggerPhases(target) { for(const phase of target.phases??[]){if(target.triggeredPhases.includes(phase.effect))continue;if(phase.trigger.type==="hp_below"&&target.hp/target.maxHp<=phase.trigger.value){target.triggeredPhases.push(phase.effect);target.stats.strength+=phase.effect==="desperate"?8:4;target.stats.agility+=3;this.log.push(`${target.name}氣機驟變，進入新的戰鬥階段。`);}} }
  endRound() { if(this.finished)return; for(const actor of this.living("party").concat(this.living("enemy"))){actor.inner=clamp(actor.inner+Math.max(1,Math.round(actor.maxInner*.03)),0,actor.maxInner); if(actor.vulnerableTurns>0){actor.vulnerableTurns--; if(actor.vulnerableTurns===0)actor.posture=Math.round(actor.maxPosture*BALANCE.postureRecoveryAfterBreak);} else actor.posture=clamp(actor.posture+Math.round(actor.maxPosture*.08),0,actor.maxPosture); actor.dodge=0;} this.round++; this.prepareIntents(); this.checkFinished(); }
  find(id){return this.all.find(c=>c.id===id&&c.hp>0);}
  checkFinished(){if(!this.living("enemy").length)this.finished="victory";else if(!this.living("party").length)this.finished="defeat";if(this.finished)this.log.push(this.finished==="victory"?"敵手盡退，此戰告捷。":"眾人不支，先行退回城中。");}
  snapshot(){return {round:this.round,party:structuredClone(this.party),enemies:structuredClone(this.enemies),log:[...this.log],finished:this.finished};}
}
