import fs from "node:fs";
import path from "node:path";
import { EFFECT_HANDLERS, assertKnownEffect } from "../src/core/effects.js";

const root=path.resolve(import.meta.dirname,"..");
const read=name=>JSON.parse(fs.readFileSync(path.join(root,"src","data",`${name}.json`),"utf8"));
const expected={skills:100,talents:50,"inner-arts":20,meridians:6,equipment:300,items:50,npcs:24,enemies:70,factions:12,locations:18,quests:8,chapters:8};
const errors=[]; const content={};
for(const [name,count] of Object.entries(expected)){const set=read(name);content[name]=set.data;if(set.schemaVersion!==1)errors.push(`${name}: schemaVersion`);if(set.data.length!==count)errors.push(`${name}: expected ${count}, got ${set.data.length}`);const ids=new Set();for(const row of set.data){if(!row.id)errors.push(`${name}: missing id`);if(ids.has(row.id))errors.push(`${name}: duplicate ${row.id}`);ids.add(row.id);walkEffects(row,effect=>{try{assertKnownEffect(effect);}catch(error){errors.push(`${name}/${row.id}: ${error.message}`);}});}}
const countBy=(rows,key)=>rows.reduce((a,r)=>((a[r[key]]=(a[r[key]]??0)+1),a),{});
const expectMap=(actual,expectedMap,label)=>{for(const [key,value] of Object.entries(expectedMap))if(actual[key]!==value)errors.push(`${label}/${key}: expected ${value}, got ${actual[key]??0}`);};
expectMap(countBy(content.skills,"type"),{attack:17,posture:17,defense:17,control:17,guard:16,mobility:16},"skill-type");
expectMap(countBy(content.skills,"grade"),{basic:35,normal:30,advanced:25,ultimate:10},"skill-grade");
expectMap(countBy(content.equipment,"slot"),{weapon:120,armor:75,bracer:45,accessory:60},"equipment-slot");
expectMap(countBy(content.equipment,"rarity"),{common:125,fine:90,famed:62,legendary:23},"equipment-rarity");
expectMap(countBy(content.equipment,"sources"),{},"noop");
expectMap(countBy(content.equipment.filter(e=>e.slot==="weapon"),"weaponType"),{blade:18,sword:18,fist:16,staff:16,spear:16,hidden:16,special:20},"weapon-type");
const sourceCounts={};for(const item of content.equipment)for(const source of item.sources)sourceCounts[source]=(sourceCounts[source]??0)+1;
expectMap(sourceCounts,{shops:75,factions:80,military:30,boss:45,quests:35,black_market:25,main_story:10},"equipment-source");
const allowedSources=new Set(["identity_constable","identity_escort","identity_healer","identity_hunter","identity_beggar","identity_wanderer","source_wanderer","faction_court",...content.factions.map(f=>f.id)]);
for(const skill of content.skills)for(const source of skill.sources)if(!allowedSources.has(source))errors.push(`skill/${skill.id}: invalid source ${source}`);
const skillIds=new Set(content.skills.map(s=>s.id));for(const enemy of content.enemies)for(const id of enemy.skillIds)if(!skillIds.has(id))errors.push(`enemy/${enemy.id}: invalid skill ${id}`);
const factionIds=new Set(content.factions.map(row=>row.id)),locationIds=new Set(content.locations.map(row=>row.id)),enemyIds=new Set(content.enemies.map(row=>row.id)),questIds=new Set(content.quests.map(row=>row.id)),chapterIds=new Set(content.chapters.map(row=>row.id));
for(const location of content.locations)for(const id of location.adjacentIds??[])if(!locationIds.has(id))errors.push(`location/${location.id}: invalid adjacent ${id}`);
for(const chapter of content.chapters){if(!questIds.has(chapter.mainQuestId))errors.push(`chapter/${chapter.id}: invalid quest ${chapter.mainQuestId}`);if(chapter.nextChapterId&&!chapterIds.has(chapter.nextChapterId))errors.push(`chapter/${chapter.id}: invalid next chapter ${chapter.nextChapterId}`);for(const id of chapter.keyEnemyIds??[])if(!enemyIds.has(id))errors.push(`chapter/${chapter.id}: invalid enemy ${id}`);for(const choice of chapter.majorChoices)for(const effect of choice.effects??[])if(effect.effectId==="faction_change"&&!factionIds.has(effect.params.factionId))errors.push(`chapter/${chapter.id}: invalid faction ${effect.params.factionId}`);}
const written=[];for(const chapter of content.chapters)for(const choice of chapter.majorChoices)for(const effect of choice.effects??[])if(effect.effectId==="set_flag")written.push({chapter:chapter.chapter,key:effect.params.key});
for(const flag of written.filter(f=>f.chapter<8)){const consumed=content.chapters.some(ch=>ch.chapter>flag.chapter&&ch.consumesFlags?.includes(flag.key));if(!consumed)errors.push(`major flag never consumed: ${flag.key}`);}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}console.log(`Content valid: ${Object.entries(expected).map(([k,v])=>`${k}=${v}`).join(", ")}`);
function walkEffects(value,visit){if(!value||typeof value!=="object")return;if(typeof value.effectId==="string")visit(value);for(const child of Object.values(value))walkEffects(child,visit);}
