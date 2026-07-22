import type { AuthoritativeRunConfig, ClientRunClaim, RunEvent } from "./RunContracts";
import { XorShift32 } from "./SeededPrng";

export interface LocalVerification {
  serverScore: number;
  maxLevel: number;
  dropCount: number;
  mergeCounts: number[];
  yizaiCount: number;
  valid: boolean;
}

// Used by the editor mock only. Production authority remains in CloudBase.
export function replayRunLocally(seed: number, events: readonly RunEvent[], config: AuthoritativeRunConfig): LocalVerification {
  const inventory = Array(12).fill(0) as number[];
  const mergeCounts = Array(12).fill(0) as number[];
  const prng = new XorShift32(seed);
  let score = 0;
  let maxLevel = 1;
  let dropCount = 0;
  let yizaiCount = 0;
  let valid = true;
  for (const event of events) {
    if (event[0] === 0) {
      const level = prng.pickWeightedLevel(config.spawnWeights);
      inventory[level] += 1;
      maxLevel = Math.max(maxLevel, level);
      dropCount += 1;
    } else if (event[0] === 1) {
      const fromLevel = event[2];
      if (inventory[fromLevel] < 2) {
        valid = false;
        break;
      }
      inventory[fromLevel] -= 2;
      const nextLevel = Math.min(11, fromLevel + 1);
      inventory[nextLevel] += 1;
      mergeCounts[fromLevel] += 1;
      score += fromLevel === 11 ? config.doubleLevel11Score : Number(config.scoreByCreatedLevel[nextLevel] || 0);
      if (fromLevel === 10) yizaiCount += 1;
      maxLevel = Math.max(maxLevel, nextLevel);
    }
  }
  return { serverScore: score, maxLevel, dropCount, mergeCounts, yizaiCount, valid };
}

export function claimMatches(claim: ClientRunClaim, verified: LocalVerification): boolean {
  return claim.score === verified.serverScore
    && claim.maxLevel === verified.maxLevel
    && claim.dropCount === verified.dropCount
    && claim.yizaiCount === verified.yizaiCount
    && claim.mergeCounts.length === verified.mergeCounts.length
    && claim.mergeCounts.every((value, index) => value === verified.mergeCounts[index]);
}
