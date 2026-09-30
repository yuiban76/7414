// Presentation snapshots deliberately exclude RNG, rules and persistence state.
export function combatFrame(actors) {
  return actors.map(actor => ({
    id: actor.id, name: actor.name, side: actor.side,
    hp: actor.hp, maxHp: actor.maxHp, inner: actor.inner, maxInner: actor.maxInner,
    posture: actor.posture, maxPosture: actor.maxPosture,
    vulnerableTurns: actor.vulnerableTurns ?? 0, defended: Boolean(actor.defended),
    observed: actor.observed ?? 0, buffs: structuredClone(actor.buffs ?? []),
    intent: structuredClone(actor.intent ?? null)
  }));
}

export function roomCombatFrame(room) {
  const battle = room.battle;
  if (!battle) return [];
  return [
    ...battle.eligiblePlayerIds.map(id => ({id, name: room.players[id]?.name ?? id,
      side: 'party', hp: battle.partyHp[id], maxHp: 100})),
    {id: 'room-enemy', name: battle.enemyName, side: 'enemy', hp: battle.enemyHp, maxHp: battle.maxEnemyHp}
  ];
}

// A newly mounted view establishes a baseline rather than replaying old rounds.
export class PresentationCursor {
  constructor() { this.instance = null; this.sequence = 0; }
  reset(batch) { this.instance = batch?.instanceId ?? null; this.sequence = batch?.sequence ?? 0; }
  accept(batch) {
    if (!batch) return false;
    if (batch.instanceId !== this.instance) { this.reset(batch); return false; }
    if (batch.sequence <= this.sequence) return false;
    this.sequence = batch.sequence;
    return true;
  }
}
