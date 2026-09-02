export const BALANCE = Object.freeze({
  statMin: 5,
  statCreationMax: 50,
  statFinalMax: 100,
  postureBreakDamageMultiplier: 1.5,
  postureRecoveryAfterBreak: 0.3,
  defendHpReduction: 0.5,
  defendPostureReduction: 0.3,
  baseInnerRegenByArts: [0, 0.03, 0.028, 0.026, 0.024, 0.022, 0.02],
  consumablesPerBattle: 3,
  skillProficiencyRepeat: [1, 0.8, 0.6, 0.3],
  bossHpScale: [0, 0.82, 1.3, 1.58, 1.84],
  bossDamageScale: [0, 0.92, 1.06, 1.15, 1.24],
  enemyDefense: 0.12,
  playerDefense: 0.1,
  stableTurnKeyBase: 1000,
  autosaveSlots: 3,
  manualSaveSlots: 5,
  meridianCosts: [100, 150, 220, 300, 400, 520, 660, 820, 1000, 1200]
});

export function deriveResources(stats, equipment = {}, modifiers = {}) {
  const flatHp = equipment.hp ?? 0;
  const flatPosture = equipment.posture ?? 0;
  const flatInner = equipment.inner ?? 0;
  return {
    maxHp: Math.round((100 + stats.constitution * 5 + flatHp) * (1 + (modifiers.hpPct ?? 0))),
    maxPosture: Math.round((50 + stats.constitution * 2 + flatPosture) * (1 + (modifiers.posturePct ?? 0))),
    maxInner: Math.round((50 + flatInner + (modifiers.innerFlat ?? 0)) * (1 + (modifiers.innerPct ?? 0)))
  };
}
