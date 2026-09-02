import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buyEquipment, buyItem, priceAt, restAtInn, sellItem, shopStock } from "../src/systems/economy-system.js";
import { OFFICE_RANKS, availableOfficeTasks, completeOfficeTask, joinOffice, resignOffice } from "../src/systems/office-system.js";

const read=name=>JSON.parse(fs.readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),"utf8")).data;
const items=read("items"),equipment=read("equipment"),locations=read("locations"),city=locations.find(row=>row.id==="location_002");
const character=()=>({moneyWen:2000,inventory:[],ownedEquipment:[],equipment:{weapon:null,armor:null,bracer:null,accessory:null},hp:1,maxHp:200,inner:1,maxInner:80,posture:1,maxPosture:100,office:null});
const world=()=>({chapter:3,clock:{day:1,segment:"morning"},officeState:null,factionRelations:{},wantedLevels:{dasheng:0,beishuo:0,nanli:0}});

test("city stock and prices drive purchases and sales",()=>{const c=character();const stock=shopStock(city,1,items,equipment);assert.equal(stock.items.length,8);assert.ok(stock.equipment.every(item=>item.sources.includes("shops")));const paid=buyItem(c,"item_001",2,items,city);assert.equal(paid,priceAt(items[0],city)*2);assert.equal(c.inventory[0].quantity,2);const received=sellItem(c,"item_001",1,items,city);assert.equal(received,20);const gear=stock.equipment[0];buyEquipment(c,gear.id,equipment,city);assert.ok(c.ownedEquipment.includes(gear.id));});
test("inn charges money, restores resources and advances time",()=>{const c=character(),w=world();const paid=restAtInn(c,w,city);assert.equal(paid,60);assert.equal(c.hp,c.maxHp);assert.equal(c.inner,c.maxInner);assert.equal(w.clock.segment,"evening");});
test("office loyalty, daily tasks, promotion and resignation are enforced",()=>{const c=character(),w=world();joinOffice(w,c,"dasheng");assert.equal(c.office.rank,OFFICE_RANKS[0]);assert.throws(()=>joinOffice(w,c,"beishuo"),/一次只能效忠/);const task=availableOfficeTasks(w,city)[0];completeOfficeTask(w,c,task.id,city);assert.equal(w.officeState.merit,20);assert.equal(availableOfficeTasks(w,city).some(row=>row.id===task.id),false);w.officeState.merit=260;w.clock.day=2;completeOfficeTask(w,c,"office_wanted",city);assert.equal(c.office.rank,"銀牌使");resignOffice(w,c);assert.equal(c.office,null);assert.equal(w.wantedLevels.dasheng,1);});
