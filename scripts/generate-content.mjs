import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const dataDir = path.join(projectRoot, "src", "data");
fs.mkdirSync(dataDir, { recursive: true });
const specPath = process.argv[2] || "C:/Users/aa323/Desktop/武俠文字冒險遊戲_完整專案規格_V1.md";
if (!fs.existsSync(specPath)) throw new Error(`找不到規格檔：${specPath}`);
const lines = fs.readFileSync(specPath, "utf8").split(/\r?\n/);
const dataset = data => ({ schemaVersion: 1, contentVersion: "1.0.0", data });
const slug = (prefix, index) => `${prefix}_${String(index).padStart(3, "0")}`;
const cells = line => line.split("|").slice(1, -1).map(v => v.trim());
const tableAfter = heading => {
  const start = lines.findIndex(line => line.includes(heading));
  if (start < 0) throw new Error(`找不到表格：${heading}`);
  const result = [];
  let began = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith("|")) { if (began && result.length) break; else continue; }
    if (/^\|[-: |]+\|$/.test(line)) { began = true; continue; }
    const row = cells(line);
    if (/^#?$/.test(row[0]) || row[0] === "#") { began = true; continue; }
    if (began) result.push(row);
  }
  return result;
};
const num = value => Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
const mapType = { "攻擊": "attack", "破勢": "posture", "防禦": "defense", "控制": "control", "護衛": "guard", "身法": "mobility" };
const mapGrade = { "基礎": "basic", "普通": "normal", "上乘": "advanced", "絕學": "ultimate" };
const sourceIds = { "捕快":"identity_constable","鏢師":"identity_escort","醫者":"identity_healer","獵戶":"identity_hunter","乞丐":"identity_beggar","浪人":"identity_wanderer","太岳劍宗":"faction_taiyue","金剛寺":"faction_jingang","青虛觀":"faction_qingxu","鎮北武府":"faction_zhenbei","百草谷":"faction_baicao","千機樓":"faction_qianji","血河門":"faction_xuehe","無門會":"faction_wumen","朝廷":"faction_court","江湖散學":"source_wanderer" };
const inferSkillEffects = (effect, type) => {
  if (type === "defense") return [{ effectId: "defend", params: { hpReduction: num(effect.match(/氣血減傷\s*(\d+)/)?.[1]) / 100 || .45, postureReduction: num(effect.match(/架勢減傷\s*(\d+)/)?.[1]) / 100 || .3 } }];
  if (type === "mobility") return [{ effectId: "dodge", params: { chance: num(effect.match(/閃避\s*(\d+)/)?.[1]) / 100 || .55 } }];
  if (type === "guard") return [{ effectId: "guard", params: { hits: 1, reduction: num(effect.match(/減傷\s*(\d+)/)?.[1]) / 100 || .1 } }];
  if (effect.includes("架勢低於")) return [{ effectId: "posture_bonus_below_ratio", params: { ratio: .5, bonus: num(effect.match(/\+(\d+)%/)?.[1]) / 100 || .1 } }];
  if (effect !== "單體攻擊" && effect !== "高架勢傷害") return [{ effectId: "status", params: { description: effect, turns: effect.includes("2 回合") || effect.includes("兩回合") ? 2 : 1 } }];
  return [];
};
const skills = tableAfter("### 8.2 V1 表").map((r, i) => ({ id: slug("skill", i + 1), name: r[1], type: mapType[r[2]], grade: mapGrade[r[3]], weaponTypes: [], power: { hp: num(r[4]), posture: num(r[5]) }, innerCost: num(r[6]), target: mapType[r[2]] === "guard" ? "single_ally" : "single_enemy", effects: inferSkillEffects(r[7], mapType[r[2]]), sources: [sourceIds[r[8]] || "source_wanderer"], tags: [] }));

const talentRows = tableAfter("### 5.2 50 種天賦 V1");
const talents = talentRows.map((r, i) => ({ id: slug("talent", i + 1), name: r[1], rarity: r[2].split("／")[0], type: r[2].includes("優缺點") ? "tradeoff" : r[2].includes("負面") ? "negative" : "positive", description: r[3], effects: [] }));

const innerRows = tableAfter("### 9.2 V1 表");
const innerArts = innerRows.map((r, i) => ({ id: slug("inner", i + 1), name: r[1], grade: mapGrade[r[2]], maxInner: num(r[3]), description: r[4], effects: [] }));
const meridianNames = ["任脈", "督脈", "手陽脈", "手陰脈", "足陽脈", "足陰脈"];
const meridianEffects = ["max_hp_pct", "max_inner_pct", "damage_pct", "posture_damage_pct", "speed_pct", "max_posture_pct"];
const meridians = meridianNames.map((name, i) => ({ id: slug("meridian", i + 1), name, maxLevel: 10, perLevel: [{ effectId: meridianEffects[i], params: { value: i === 2 || i === 3 ? .005 : .01 } }], costs: [100,150,220,300,400,520,660,820,1000,1200] }));

const itemRows = tableAfter("### 12.3 50 種 V1");
const items = itemRows.map((r, i) => ({ id: slug("item", i + 1), name: r[1], category: r[2], stackLimit: 99, battleUsable: i < 28 || i === 46, perBattleLimit: [8,9,17].includes(i) ? 1 : null, description: r[3], effects: [{ effectId: i < 10 ? "heal_flat" : i < 18 ? "restore_inner_flat" : i < 28 ? "cleanse" : i < 40 ? (i < 32 ? "proficiency" : "cultivation") : "event_tool", params: { value: 30 + i * 3 } }], priceWen: 40 + i * 20 }));

const npcRows = tableAfter("### 13.2 名單");
const npcs = npcRows.map((r, i) => ({ id: slug("npc", i + 1), name: r[1], region: r[2], role: r[3], introduction: r[4], growthProfile: r[3], recruitConditions: i === 0 ? [] : [{ chapterAtLeast: Math.min(8, Math.max(1, Math.ceil((i + 1) / 3))) }], relationshipState: i === 0 ? "信任" : "陌生", availability: i === 0 ? "party" : "locked", aiProfile: r[3].includes("護衛") ? "protective" : r[3].includes("控制") ? "cautious" : "aggressive", storyFlags: [] }));

const enemyRows = tableAfter("### 14.3 V1 名單");
const enemies = enemyRows.map((r, i) => { const chapter = num(r[1]); const tier = r[4] === "精英" ? "elite" : r[4] === "Boss" ? "boss" : "major_boss"; const base = 16 + chapter * 5 + (tier === "major_boss" ? 12 : tier === "boss" ? 6 : 0); return { id: slug("enemy", i + 1), name: r[2], chapter, faction: r[3], tier, realm: Math.min(5, Math.floor((chapter - 1) / 1.5)), stats: { strength: base + 3, constitution: base + 5, agility: base, comprehension: base - 2, willpower: base + 1 }, skillIds: skills.filter(s => s.type === (r[5].includes("破勢") ? "posture" : r[5].includes("防禦") ? "defense" : "attack")).slice(0, tier === "elite" ? 3 : 6).map(s => s.id), phases: tier === "major_boss" ? [{ trigger: { type: "hp_below", value: .6 }, effect: "phase_two" }, { trigger: { type: "hp_below", value: .25 }, effect: "desperate" }] : [], aiProfile: r[5].includes("護衛") ? "protective" : r[5].includes("控制") ? "cunning" : "aggressive", observeInfo: [r[5]], rewards: [], storyFlags: [], scalingProfile: `chapter${chapter}_${tier}` }; });

const factions = [
  ["faction_taiyue","太岳劍宗","名門正派"],["faction_jingang","金剛寺","正派"],["faction_qingxu","青虛觀","中立偏正"],["faction_zhenbei","鎮北武府","中立"],["faction_baicao","百草谷","中立"],["faction_qianji","千機樓","中立偏灰"],["faction_xuehe","血河門","邪派"],["faction_wumen","無門會","中立偏邪"],["faction_patrol","巡武司","官府"],["faction_escort","天下鏢盟","跨國"],["faction_trade","四海商盟","商業"],["faction_nightowl","夜梟","地下情報"]
].map(([id,name,alignment]) => ({ id,name,alignment }));

const cities = ["上京","洛川城","河陽城","太岳城","青雲鎮","朔京","雁關城","黑水城","北原城","鎮北城","黎都","江陵港","百草城","錦水城","南江城","雁回關","赤水渡","三河驛"];
const locations = cities.map((name, i) => ({ id: slug("location", i + 1), name, country: i < 5 ? "dasheng" : i < 10 ? "beishuo" : i < 15 ? "nanli" : "cross_border", type: i < 15 ? "city" : "crossroad", adjacentIds: [slug("location", ((i + cities.length - 1) % cities.length) + 1), slug("location", ((i + 1) % cities.length) + 1)], firstVisitConditions: [], fastTravel: i === 1, facilities: ["inn","government","shop","medicine","gate"], eventPool: ["bandit","caravan","inspection"], storyLocks: [], priceModifier: 1 }));

const chapterNames = ["斷鏢","暗流","裂盟","北境風雷","血河真相","三國棋局","天下將亂","江湖歸處"];
const chapterChoices = [
  ["交給巡武司","交給天下鏢盟","公諸於眾","自行保留"],
  ["截斷商路","追查官線","與無門會交換情報","放長線釣大魚"],
  ["調停三派","公開證據","支持門派自治","保持中立"],
  ["守住雁關","救援百姓","奪回軍械","揭破換械陰謀"],
  ["支持改革派","協助守舊派","剿滅激進派","迫使血河分裂"],
  ["維持三國制衡","削弱朝廷","限制商盟","聯合江湖"],
  ["先救邊境","先止門派衝突","阻止刺殺","保住商路"],
  ["維持舊秩序","推動改革","擁立單一勢力","江湖自主"]
];
const chapters = chapterNames.map((name, i) => ({ id: `chapter_${i + 1}`, chapter: i + 1, name, entryConditions: i ? [{ flagEquals: [`chapter_${i}_complete`, true] }] : [], consumesFlags: i === 6 ? [1,2,3,4,5,6].map(n=>`chapter_${n}_path`) : i === 7 ? ["chapter_7_path"] : i ? [`chapter_${i}_path`] : [], mainQuestId: `quest_chapter_${i + 1}`, majorChoices: chapterChoices[i].map((label, j) => ({ id: `ch${i + 1}_choice_${j + 1}`, label, effects: [{ effectId: "set_flag", params: { key: `chapter_${i + 1}_path`, value: j + 1 } }, { effectId: "faction_change", params: { factionId: factions[(i + j) % factions.length].id, value: j === 3 ? -5 : 10 } }] })), factionChanges: factions.slice(i % 6, i % 6 + 3).map(f => f.id), keyEnemyIds: enemies.filter(e => e.chapter === i + 1).map(e => e.id), nextChapterId: i < 7 ? `chapter_${i + 2}` : null }));
const quests = chapters.map(ch => ({ id: ch.mainQuestId, name: ch.name, type: "main", chapter: ch.chapter, prerequisites: ch.entryConditions, states: ["locked","active","completed","failed","transformed"], steps: [{ id: "investigate", sceneId: `scene_ch${ch.chapter}_investigate`, conditions: [], choices: ch.majorChoices }], failureRoutes: [{ id: "setback", result: "transformed" }], rewards: [{ effectId: "cultivation", params: { value: ch.chapter * 100 } }], nextQuestIds: ch.nextChapterId ? [`quest_chapter_${ch.chapter + 1}`] : [] }));

const rarityPlan = [["common",125],["fine",90],["famed",62],["legendary",23]].flatMap(([v,n]) => Array(n).fill(v));
const slotPlan = [["weapon",120],["armor",75],["bracer",45],["accessory",60]].flatMap(([v,n]) => Array(n).fill(v));
const sourcePlan = [["shops",75],["factions",80],["military",30],["boss",45],["quests",35],["black_market",25],["main_story",10]].flatMap(([v,n]) => Array(n).fill(v));
const weaponTypes = [["blade",18],["sword",18],["fist",16],["staff",16],["spear",16],["hidden",16],["special",20]].flatMap(([v,n]) => Array(n).fill(v));
const prefixes = ["青鋼","沉水","松紋","雁翎","折柳","藏鋒","逐浪","定山","流火","寒星","墨羽","照膽","問心","孤鴻","聽雨","斷雲","玄鐵","赤霞","白虹","歸元"];
const suffix = { weapon: "兵", armor: "衣", bracer: "護腕", accessory: "佩" };
const rangeByRarity = { common:[.25,.35], fine:[.45,.5], famed:[.68,.7], legendary:[1,1] };
let weaponIndex = 0;
const equipment = Array.from({ length: 300 }, (_, i) => {
  const slot = slotPlan[i], rarity = rarityPlan[i], source = sourcePlan[i], ratio = rangeByRarity[rarity][0] + (i % 7) / 6 * (rangeByRarity[rarity][1] - rangeByRarity[rarity][0]);
  const type = slot === "weapon" ? weaponTypes[weaponIndex++] : null;
  const name = `${prefixes[i % prefixes.length]}${slot === "weapon" ? ({blade:"刀",sword:"劍",fist:"手",staff:"棍",spear:"槍",hidden:"針",special:"奇兵"}[type]) : suffix[slot]}·${String(i + 1).padStart(3,"0")}`;
  const stats = slot === "weapon" ? { damage: Math.round(4 + ratio * 36), postureDamage: Math.round(2 + ratio * 23) } : slot === "armor" ? { hp: Math.round(20 + ratio * 200), damageReduction: +(ratio * .08).toFixed(3) } : slot === "bracer" ? { posture: Math.round(5 + ratio * 50), controlResist: +(ratio * .15).toFixed(3) } : { inner: Math.round(5 + ratio * 55) };
  return { id: slug("equipment", i + 1), name, slot, weaponType: type, rarity, stats, effects: rarity === "common" ? [] : [{ effectId: slot === "weapon" ? "damage_pct" : slot === "armor" ? "damage_reduction_pct" : slot === "bracer" ? "control_resist_pct" : "inner_regen_pct", params: { value: rarity === "legendary" ? .08 : rarity === "famed" ? .05 : .025 } }], sources: [source], bind: rarity === "legendary" ? "character" : "none", priceWen: 300 + i * 55 };
});
Object.assign(equipment[0], { name: "青鋼刀", stats: { damage: 8, postureDamage: 5 }, weaponType: "blade" });
Object.assign(equipment[200], { name: "玄鐵戰衣", rarity: "famed", stats: { hp: 135, damageReduction: .05 } });
Object.assign(equipment[240], { name: "鎮岳護腕", rarity: "famed", stats: { posture: 36, controlResist: .07 } });
Object.assign(equipment[270], { name: "靜心玉", rarity: "fine", stats: { inner: 20, controlResist: .04 } });
Object.assign(equipment[299], { name: "歸元佩", rarity: "legendary", stats: { inner: 55 }, effects: [{ effectId: "inner_regen_pct", params: { value: .004 } }] });
Object.assign(equipment[100], { name: "斷江", rarity: "famed", stats: { damage: 24, postureDamage: 16 }, effects: [{ effectId: "posture_damage_pct", params: { value: .05 } }] });
Object.assign(equipment[119], { name: "寒月", rarity: "legendary", stats: { damage: 36, postureDamage: 17 }, effects: [{ effectId: "damage_bonus_below_hp", params: { targetBroken: true, bonus: .1 } }, { effectId: "next_attack_bonus", params: { afterDodge: true, bonus: .08 } }] });
equipment[215].rarity = "common";
equipment[215].effects = [];
equipment[277].rarity = "common";
equipment[277].effects = [];

for (const [name, data] of Object.entries({ skills, talents, "inner-arts": innerArts, meridians, equipment, items, npcs, enemies, factions, locations, quests, chapters })) {
  fs.writeFileSync(path.join(dataDir, `${name}.json`), JSON.stringify(dataset(data), null, 2) + "\n");
}
fs.writeFileSync(path.join(dataDir, "manifest.js"), `export const DATASETS = ${JSON.stringify(["skills","talents","inner-arts","meridians","equipment","items","npcs","enemies","factions","locations","quests","chapters"])};\n`);
console.log(`Generated content: skills=${skills.length}, equipment=${equipment.length}, items=${items.length}, npcs=${npcs.length}, enemies=${enemies.length}`);
