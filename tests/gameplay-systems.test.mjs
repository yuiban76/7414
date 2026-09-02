import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SeededRng } from "../src/core/rng.js";
import { createCharacter, rollStartingTalents } from "../src/systems/progression-system.js";
import { addItem, equipItem, useConsumable } from "../src/systems/inventory-system.js";
import { equipSkill, innerLoad, learnInnerArt, learnSkill, toggleInnerArt, upgradeMeridian } from "../src/systems/training-system.js";
import { availableDestinations, travel } from "../src/systems/travel-system.js";
import { createVote, castVote, resolveVote } from "../src/systems/vote-system.js";
import { recruitNpc } from "../src/systems/npc-system.js";

const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
const content={skills:read("skills"),talents:read("talents"),items:read("items"),equipment:read("equipment"),innerArts:read("inner-arts"),locations:read("locations"),npcs:read("npcs")};
function character(){const roll=rollStartingTalents(content.talents,new SeededRng("systems"));return createCharacter({name:"系統測試",gender:"unspecified",identityId:"identity_constable",stats:{strength:20,constitution:20,agility:20,comprehension:20,willpower:20},startSkillName:"衙門刀法"},[roll.choice[0],...roll.random],content.skills);}

test("inventory stacks items, consumes healing and equips owned gear",()=>{const c=character();addItem(c,"item_001",2,content.items);assert.equal(c.inventory[0].quantity,5);c.hp=100;useConsumable(c,"item_001",content.items);assert.ok(c.hp>100);const before=c.maxHp;equipItem(c,"equipment_001",content.equipment);assert.equal(c.equipment.weapon,"equipment_001");assert.equal(c.maxHp,before);});
test("inventory rejects over-cap stacks and unowned equipment",()=>{const c=character();assert.throws(()=>addItem(c,"item_001",200,content.items),/堆疊上限/);assert.throws(()=>equipItem(c,"equipment_002",content.equipment),/尚未持有/);});
test("skills, inner arts and meridians have enforced progression gates",()=>{const c=character();learnSkill(c,"skill_002");equipSkill(c,"skill_002");assert.equal(c.equippedSkills.length,2);learnInnerArt(c,content.innerArts[0]);toggleInnerArt(c,content.innerArts[0].id,true);assert.equal(innerLoad(c).regenRate,.03);c.cultivation=100;const result=upgradeMeridian(c,"meridian_001");assert.equal(result.newLevel,1);assert.equal(c.cultivation,0);});
test("travel requires adjacency for first visits and emits deterministic events",()=>{const world={currentLocationId:"location_002",visitedLocations:["location_002"],partyMoney:200,clock:{day:1,segment:"morning"},worldEvents:[]};const destinations=availableDestinations(world,content.locations);assert.equal(destinations.length,2);const result=travel(world,destinations[0].id,content.locations,new SeededRng("travel"));assert.equal(world.currentLocationId,destinations[0].id);assert.ok(result.event);assert.throws(()=>travel(world,"location_010",content.locations,new SeededRng("bad")),/不相鄰/);});
test("major vote uses majority and requires explicit host choice on ties",()=>{const vote=createVote({id:"v1",choices:["a","b"],playerIds:["p1","p2"],hostPlayerId:"p1"});castVote(vote,"p1","a");castVote(vote,"p2","b");assert.equal(resolveVote(vote).status,"tie");assert.equal(resolveVote(vote,"a").result,"a");});
test("party capacity is capped at four total units",()=>{const world={chapter:8,party:{playerIds:["p1"],npcIds:["npc_001"]},npcStates:{}};recruitNpc(world,content.npcs[1]);recruitNpc(world,content.npcs[2]);assert.equal(world.party.npcIds.length,3);assert.throws(()=>recruitNpc(world,content.npcs[3]),/最多 4/);});
