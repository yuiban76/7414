import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
test("all fixed content counts match the specification",()=>{assert.equal(read("skills").length,100);assert.equal(read("inner-arts").length,20);assert.equal(read("meridians").length,6);assert.equal(read("talents").length,50);assert.equal(read("equipment").length,300);assert.equal(read("items").length,50);assert.equal(read("npcs").length,24);assert.equal(read("enemies").length,70);assert.equal(read("chapters").length,8);});
test("equipment has exact slot and rarity distributions",()=>{const rows=read("equipment");const count=key=>rows.reduce((a,r)=>((a[r[key]]=(a[r[key]]??0)+1),a),{});assert.deepEqual(count("slot"),{weapon:120,armor:75,bracer:45,accessory:60});assert.deepEqual(count("rarity"),{common:125,fine:90,famed:62,legendary:23});});
test("every published id is unique within a dataset",()=>{for(const name of ["skills","talents","inner-arts","meridians","equipment","items","npcs","enemies","factions","locations","quests","chapters"]){const rows=read(name);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,name);}});
