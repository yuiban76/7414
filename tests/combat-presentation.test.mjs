import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BattleSystem, makeEnemy, makePlayerCombatant } from '../src/systems/battle-system.js';
import { SeededRng } from '../src/core/rng.js';
import { packBattle, restoreBattle } from '../src/persistence/battle-snapshot.js';
import { combatFrame, PresentationCursor } from '../src/core/combat-presentation.js';
import { readCombatPreferences } from '../src/ui/combat-director.js';
import { applyJourneyToCombatant } from '../src/systems/exploration-system.js';

const data = name => JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8')).data;
const skills=data('skills'),enemies=data('enemies');
function create(seed='presentation') {
  const hero=makePlayerCombatant({id:'hero',name:'試拳',stats:{strength:20,constitution:20,agility:100,comprehension:20,willpower:20},
    equippedSkills:['skill_003'],skills:{skill_003:{realm:0,completeness:1}},maxHp:500,maxPosture:90,maxInner:80},skills);
  const enemy=makeEnemy(enemies[0],skills,1);enemy.stats.agility=1;enemy.hp=enemy.maxHp=1000;
  return new BattleSystem({party:[hero],enemies:[enemy],rng:new SeededRng(seed)});
}

test('capturing presentation never changes authoritative state, action accounting or RNG',()=>{
  for(const seed of ['one','two','three','four']){
    const animated=create(seed),silent=create(seed);silent.recordPresentation=()=>{};
    for(const type of ['skill','defend','observe','item','attack']){
      const action={type,skillId:'skill_003',targetId:animated.enemies[0].id};
      animated.submit(action);silent.submit(action);
      assert.deepEqual(animated.snapshot(),silent.snapshot());
      assert.deepEqual(animated.rng.snapshot(),silent.rng.snapshot());
      assert.deepEqual(animated.lastActionResults,silent.lastActionResults);
    }
  }
});

test('frames are detached, contain exact final resources, and never enter saved battles',()=>{
  const battle=create(),before=combatFrame(battle.all);
  battle.submit({type:'attack',targetId:battle.enemies[0].id});
  assert.deepEqual(battle.lastPresentation.before,before);
  assert.deepEqual(battle.lastPresentation.after,combatFrame(battle.all));
  assert.equal(battle.lastPresentation.events.at(-1).type,'state');
  const packed=packBattle(battle,{chapterBattle:true});
  assert.equal('lastPresentation' in packed,false);
  assert.equal(restoreBattle(packed).battle.lastPresentation,undefined);
  battle.enemies[0].hp=0;
  assert.ok(battle.lastPresentation.after.find(actor=>actor.side==='enemy').hp>0);
});

test('enemy first strike can kill a hero before their medicine, with no invented player action',()=>{
  const battle=create();battle.party[0].stats.agility=1;battle.party[0].hp=1;
  battle.enemies[0].stats.agility=200;battle.enemies[0].stats.strength=200;
  battle.submit({type:'item'});
  assert.equal(battle.finished,'defeat');
  assert.equal(battle.lastPresentation.events.some(event=>event.type==='action'&&event.actorId==='hero'),false);
  assert.equal(battle.lastPresentation.events.some(event=>event.type==='heal'),false);
});

test('insufficient inner power presents only the actually executed normal attack',()=>{
  const battle=create();battle.party[0].inner=0;
  battle.submit({type:'skill',skillId:'skill_003',targetId:battle.enemies[0].id});
  const action=battle.lastPresentation.events.find(event=>event.type==='action'&&event.actorId==='hero');
  assert.equal(action.label,'普通攻擊');assert.equal(action.skill,null);
});

test('break, follow-up hit, and round recovery appear in the actual rule order',()=>{
  const battle=create();applyJourneyToCombatant(battle.party[0],{zhaoye:{journey:{stage:3,completed:[],notes:[]}}});
  battle.enemies[0].posture=1;
  battle.submit({type:'skill',skillId:'skill_003',targetId:battle.enemies[0].id});
  const events=battle.lastPresentation.events;
  const broken=events.findIndex(event=>event.type==='break'),follow=events.findIndex(event=>event.type==='follow');
  assert.ok(broken>0&&follow>broken);
  assert.ok(events.slice(follow+1).some(event=>event.type==='hit'&&event.actorId==='hero'));
  assert.equal(events.at(-1).label,'回合調息');
});

test('guard redirects the visual hit to its guardian and a dodge emits no damage hit',()=>{
  const battle=create();const hero=battle.party[0],enemy=battle.enemies[0];
  const guardian={...structuredClone(hero),id:'guardian',guard:{targetId:hero.id,hits:1,reduction:.1}};
  battle.party.push(guardian);battle.lastPresentation={before:combatFrame(battle.all),after:null,events:[]};
  battle.attack(enemy,hero,null);
  assert.equal(battle.lastPresentation.events.find(event=>event.type==='guard').actorId,'guardian');
  assert.equal(battle.lastPresentation.events.find(event=>event.type==='hit').targetId,'guardian');
  battle.lastPresentation.events=[];guardian.guard=null;hero.dodge=1;battle.attack(enemy,hero,null);
  assert.equal(battle.lastPresentation.events.some(event=>event.type==='dodge'),true);
  assert.equal(battle.lastPresentation.events.some(event=>event.type==='hit'),false);
});

test('local playback cursor suppresses baselines, duplicates and reconnect history',()=>{
  const cursor=new PresentationCursor(),batch={instanceId:'room:1',sequence:1};
  assert.equal(cursor.accept(batch),false);
  assert.equal(cursor.accept({...batch,sequence:2}),true);
  assert.equal(cursor.accept({...batch,sequence:2}),false);
  cursor.reset({...batch,sequence:3});assert.equal(cursor.accept({...batch,sequence:3}),false);
  assert.equal(cursor.accept({instanceId:'room:2',sequence:1}),false);
});

test('bad or unavailable stored playback preferences recover to playable defaults',()=>{
  assert.deepEqual(readCombatPreferences({getItem:()=>'{broken'}),{speed:1,muted:false,volume:.16});
  assert.deepEqual(readCombatPreferences({getItem:()=>'{"speed":99,"volume":999,"muted":true}'}),{speed:1,muted:true,volume:.5});
});
