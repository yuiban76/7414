// The former meridian tracks now belong to six distinct inner arts.
export const INNER_REFINEMENTS = Object.freeze({
  inner_003: { legacyId: "meridian_001", stat: "hpPct", perLevel: .01, label: "氣血上限" },
  inner_009: { legacyId: "meridian_002", stat: "innerPct", perLevel: .01, label: "內力上限" },
  inner_015: { legacyId: "meridian_003", stat: "damagePct", perLevel: .005, label: "造成傷害" },
  inner_016: { legacyId: "meridian_004", stat: "postureDamagePct", perLevel: .005, label: "削減架勢" },
  inner_012: { legacyId: "meridian_005", stat: "speedPct", perLevel: .01, label: "行動速度" },
  inner_011: { legacyId: "meridian_006", stat: "posturePct", perLevel: .01, label: "架勢上限" }
});

export const LEGACY_INNER_MERGES = Object.freeze({
  inner_002: "inner_008", // Both restored inner power each turn.
  inner_004: "inner_010", // Both resisted control.
  inner_005: "inner_011"  // Both raised maximum posture.
});

export const INNER_REFINEMENT_COSTS = Object.freeze([100, 150, 220, 300, 400, 520, 660, 820, 1000, 1200]);
export const INNER_REFINEMENT_CAP = INNER_REFINEMENT_COSTS.length;
