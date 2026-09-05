import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { packBattle, restoreBattle } from '../src/persistence/battle-snapshot.js';
import { BattleSystem, makeEnemy, makeNpcCompanion } from '../src/systems/battle-system.js';
import { SeededRng } from '../src/core/rng.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8')).data;
const skills=read('skills'),enemies=read('enemies');
function create(){return new BattleSystem({party:[makeNpcCompanion({id:'npc_001',name:'測試同伴',role:'攻擊'},skills)],enemies:[makeEnemy(enemies[0],skills,1)],rng:new SeededRng('battle-save')});}
test('battle roundtrip restores exact turn, HP, statuses, items-used, skill uses and RNG',()=>{const original=create();original.submit({type:'defend'});const packed=packBattle(original,{eventId:'1-3',battle:'zhaoye_1-3'},{skill_001:2});const restored=restoreBattle(JSON.parse(JSON.stringify(packed)));assert.deepEqual(restored.battle.snapshot(),original.snapshot());assert.deepEqual(restored.battle.rng.snapshot(),original.rng.snapshot());assert.equal(restored.skillUses.skill_001,2);const action={type:'attack',targetId:original.enemies[0].id};original.submit(action);restored.battle.submit(action);assert.deepEqual(restored.battle.snapshot(),original.snapshot());assert.deepEqual(restored.battle.rng.snapshot(),original.rng.snapshot());});
test('finished battle remains finished after reload, without rolling rewards or repeating combat',()=>{const b=create();b.finished='victory';const restored=restoreBattle(packBattle(b,{eventId:'8-4'})).battle;const before=restored.snapshot();restored.submit({type:'attack'});assert.deepEqual(restored.snapshot(),before);});
test('malformed battle data fails closed',()=>{const packed=packBattle(create(),{eventId:'1-3'});const negative=structuredClone(packed);negative.party[0].hp=-1;assert.throws(()=>restoreBattle(negative),/資源/);const invalid=structuredClone(packed);invalid.rng.state=NaN;assert.throws(()=>restoreBattle(invalid),/狀態/);});
