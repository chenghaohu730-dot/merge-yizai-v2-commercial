import type { SpawnWeight } from "./RunContracts";

const ZERO_SEED_FALLBACK = 0x6d2b79f5;

export class XorShift32 {
  private state: number;

  constructor(seed: number) {
    const normalized = seed >>> 0;
    this.state = normalized === 0 ? ZERO_SEED_FALLBACK : normalized;
  }

  nextUint32(): number {
    let value = this.state >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  nextFloat(): number {
    return this.nextUint32() / 0x100000000;
  }

  pickWeightedLevel(weights: readonly SpawnWeight[]): number {
    const total = weights.reduce((sum, item) => sum + item.weight, 0);
    if (!Number.isFinite(total) || total <= 0) throw new Error("Invalid spawn weights");
    let cursor = this.nextFloat() * total;
    for (const item of weights) {
      cursor -= item.weight;
      if (cursor < 0) return item.level;
    }
    return weights[weights.length - 1].level;
  }
}
