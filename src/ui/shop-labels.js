const RARITY_LABELS = {
  common: "普通",
  fine: "精良",
  famed: "名品",
  legendary: "傳奇"
};

const STAT_LABELS = {
  damage: "傷害",
  postureDamage: "架勢傷害",
  hp: "氣血上限",
  damageReduction: "傷害減免",
  posture: "架勢上限",
  controlResist: "控制抗性",
  inner: "內力上限"
};

const PERCENT_STATS = new Set(["damageReduction", "controlResist"]);

export function equipmentRarityLabel(rarity) {
  return RARITY_LABELS[rarity] ?? "普通";
}

export function equipmentStatSummary(stats = {}) {
  return Object.entries(stats).map(([key, value]) => {
    const amount = PERCENT_STATS.has(key)
      ? `${(Number(value) * 100).toFixed(1).replace(/\.0$/, "")}%`
      : value;
    return `${STAT_LABELS[key] ?? "其他加成"} +${amount}`;
  }).join("　");
}
