import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { identityModifiers, applyIdentitySceneBonus } from "../src/systems/identity-system.js";
import { travel } from "../src/systems/travel-system.js";
import { SeededRng } from "../src/core/rng.js";

const locations=JSON.parse(fs.readFileSync(new URL("../src/data/locations.json",import.meta.url),"utf8")).data;
const world=()=>({currentLocationId:"location_002",visitedLocations:["location_002"],partyMoney:100,clock:{day:1,segment:"morning"},worldEvents:[],flags:{},clues:[]});

test("all six identities expose an operational specialty",()=>{
  assert.equal(identityModifiers("identity_constable").inspection,true);
  assert.ok(identityModifiers("identity_escort").guardReductionPct>0);
  assert.ok(identityModifiers("identity_healer").healingPct>0);
  assert.equal(identityModifiers("identity_hunter").travelInsight,true);
  assert.equal(identityModifiers("identity_beggar").cityRumor,true);
  assert.ok(identityModifiers("identity_wanderer").observationPct>0);
});

test("scene specialties grant clues without duplicating them",()=>{
  const w=world();const character={identityId:"identity_constable"};
  applyIdentitySceneBonus(w,character,"inspect_body");applyIdentitySceneBonus(w,character,"inspect_body");
  assert.deepEqual(w.clues,["clue_palm_wound"]);
  const beggar=world();applyIdentitySceneBonus(beggar,{identityId:"identity_beggar"},"crowd");
  assert.deepEqual(beggar.clues,["clue_city_rumor"]);
});

test("hunter gets travel warning and beggar city income is one-time",()=>{
  const hunter=world();const warning=travel(hunter,"location_001",locations,new SeededRng("hunter"),{identityId:"identity_hunter"});
  assert.match(warning.identityMessage,/提前察覺/);
  const beggar=world();const first=travel(beggar,"location_001",locations,new SeededRng("beggar"),{identityId:"identity_beggar"});
  assert.equal(first.identityMessage,"丐幫耳目：市井消息換得 20 文盤纏。");assert.equal(beggar.partyMoney,120);
  travel(beggar,"location_002",locations,new SeededRng("return"),{identityId:"identity_beggar"});
  travel(beggar,"location_001",locations,new SeededRng("again"),{identityId:"identity_beggar"});
  assert.equal(beggar.partyMoney,140);
});
