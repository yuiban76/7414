export class SeededRng {
  constructor(seed = `${Date.now()}`) {
    this.seed = String(seed);
    this.state = hashSeed(this.seed) || 0x6d2b79f5;
    this.counter = 0;
  }

  next() {
    let t = this.state += 0x6d2b79f5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    this.counter += 1;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick(items) { return items[Math.floor(this.next() * items.length)]; }
  shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  snapshot() { return { seed: this.seed, state: this.state, counter: this.counter }; }
}

function hashSeed(value) {
  let hash = 2166136261;
  for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
