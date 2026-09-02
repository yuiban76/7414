import { DATASETS } from "./manifest.js";
import { validateDataset } from "../core/validators.js";

const EXPECTED_COUNTS = { skills: 100, talents: 50, "inner-arts": 20, meridians: 6, equipment: 300, items: 50, npcs: 24, enemies: 70, factions: 12, locations: 18, quests: 8, chapters: 8 };

export async function loadContent() {
  const content = {};
  const errors = [];
  await Promise.all(DATASETS.map(async name => {
    const response = await fetch(new URL(`./${name}.json`, import.meta.url));
    if (!response.ok) throw new Error(`無法載入資料：${name}`);
    const dataset = await response.json();
    const validation = validateDataset(dataset, { count: EXPECTED_COUNTS[name] });
    if (validation.length) errors.push(...validation.map(error => `${name}: ${error}`));
    content[toCamel(name)] = dataset.data;
  }));
  validateDistributions(content, errors);
  if (errors.length) throw new Error(`內容驗證失敗\n${errors.join("\n")}`);
  return content;
}

function toCamel(value) { return value.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }
function countBy(rows, key) { return Object.fromEntries(Object.entries(rows.reduce((acc, row) => ((acc[row[key]] = (acc[row[key]] ?? 0) + 1), acc), {})).sort()); }
function compare(actual, expected, label, errors) {
  for (const [key, value] of Object.entries(expected)) if (actual[key] !== value) errors.push(`${label} ${key} 應為 ${value}，目前為 ${actual[key] ?? 0}`);
}
function validateDistributions(content, errors) {
  compare(countBy(content.skills, "type"), { attack:17, posture:17, defense:17, control:17, guard:16, mobility:16 }, "武功類型", errors);
  compare(countBy(content.skills, "grade"), { basic:35, normal:30, advanced:25, ultimate:10 }, "武功品級", errors);
  compare(countBy(content.equipment, "slot"), { weapon:120, armor:75, bracer:45, accessory:60 }, "裝備欄位", errors);
  compare(countBy(content.equipment, "rarity"), { common:125, fine:90, famed:62, legendary:23 }, "裝備品質", errors);
}
