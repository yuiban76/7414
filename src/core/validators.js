import { EFFECT_HANDLERS } from "./effects.js";

export const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function assertSafeObject(value, path = "root") {
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`匯入資料含不安全欄位：${path}.${key}`);
    assertSafeObject(value[key], `${path}.${key}`);
  }
}

export function validateCharacter(character) {
  const errors = [];
  if (!character?.id || !character?.name?.trim()) errors.push("角色名稱不可空白");
  const values = Object.values(character?.stats ?? {});
  if (values.length !== 5 || values.some(v => !Number.isInteger(v) || v < 5 || v > 50)) errors.push("五大屬性必須是 5～50 的整數");
  if (values.reduce((a, b) => a + b, 0) !== 100) errors.push("五大屬性合計必須為 100");
  if ((character?.talents?.length ?? 0) !== 3 || new Set(character.talents).size !== 3) errors.push("創角必須有 3 個不重複天賦");
  if ((character?.equippedSkills?.length ?? 0) > 6) errors.push("最多裝備 6 個武功");
  return errors;
}

export function validateDataset(dataset, { count, effectCheck = true } = {}) {
  const rows = dataset?.data;
  const errors = [];
  if (dataset?.schemaVersion !== 1) errors.push("schemaVersion 必須為 1");
  if (!Array.isArray(rows)) return [...errors, "data 必須是陣列"];
  if (count != null && rows.length !== count) errors.push(`資料數量應為 ${count}，目前為 ${rows.length}`);
  const ids = new Set();
  for (const [index, row] of rows.entries()) {
    if (!row.id) errors.push(`第 ${index + 1} 筆缺少 ID`);
    else if (ids.has(row.id)) errors.push(`重複 ID：${row.id}`);
    ids.add(row.id);
    if (effectCheck) for (const effect of row.effects ?? []) if (!EFFECT_HANDLERS[effect.effectId]) errors.push(`${row.id} 使用未知效果 ${effect.effectId}`);
  }
  return errors;
}

export function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
