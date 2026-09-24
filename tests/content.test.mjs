import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertKnownEffect } from "../src/core/effects.js";

const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
test("all fixed content counts match the specification",()=>{assert.equal(read("skills").length,100);assert.equal(read("inner-arts").length,20);assert.equal(read("meridians").length,6);assert.equal(read("talents").length,50);assert.equal(read("equipment").length,300);assert.equal(read("items").length,50);assert.equal(read("npcs").length,24);assert.equal(read("enemies").length,70);assert.equal(read("chapters").length,8);});
test("equipment has exact slot and rarity distributions",()=>{const rows=read("equipment");const count=key=>rows.reduce((a,r)=>((a[r[key]]=(a[r[key]]??0)+1),a),{});assert.deepEqual(count("slot"),{weapon:120,armor:75,bracer:45,accessory:60});assert.deepEqual(count("rarity"),{common:125,fine:90,famed:62,legendary:23});});
test("every published id is unique within a dataset",()=>{for(const name of ["skills","talents","inner-arts","meridians","equipment","items","npcs","enemies","factions","locations","quests","chapters"]){const rows=read(name);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,name);}});
test("the hundred martial arts fill the intended combat roles",()=>{
 const rows=read('skills');const count=predicate=>rows.filter(predicate).length;
 assert.deepEqual(Object.fromEntries(Object.entries(Object.groupBy(rows,skill=>skill.type)).map(([type,group])=>[type,group.length])),{attack:40,control:20,defense:15,support:25});
 assert.equal(count(skill=>skill.tags.includes('posture_focus')),18);
 assert.equal(count(skill=>skill.type==='attack'&&!skill.tags.includes('posture_focus')),22);
 assert.equal(count(skill=>skill.effects.some(effect=>effect.effectId==='heal_pct')),6);
 assert.equal(count(skill=>skill.effects.some(effect=>effect.effectId==='battle_buff')),9);
 assert.equal(count(skill=>skill.effects.some(effect=>effect.effectId==='dodge')),10);
 for(const skill of rows.filter(skill=>skill.type==='support')){assert.ok(skill.effects.some(effect=>['heal_pct','battle_buff','dodge'].includes(effect.effectId)),skill.id);assert.ok(['single_ally','all_allies','self'].includes(skill.target),skill.id);}
 for(const id of ['skill_023','skill_024','skill_041','skill_057','skill_064','skill_075','skill_081','skill_082','skill_095']){const skill=rows.find(entry=>entry.id===id);assert.ok(skill.power.hp>0&&skill.power.posture>0,id);assert.equal(skill.target,'single_enemy',id);assert.ok(skill.effects.every(effect=>!['dodge','defend','battle_buff'].includes(effect.effectId)),id);}
});
test("effect validation rejects wrong parameter types and invalid probability ranges",()=>{assert.throws(()=>assertKnownEffect({effectId:"heal_flat",params:{value:"30"}}),/有限數字/);assert.throws(()=>assertKnownEffect({effectId:"dodge",params:{chance:1.2}}),/0～1/);assert.throws(()=>assertKnownEffect({effectId:"guard",params:{hits:0,reduction:.1}}),/無效/);assert.doesNotThrow(()=>assertKnownEffect({effectId:"defend",params:{hpReduction:.5,postureReduction:.3}}));});
