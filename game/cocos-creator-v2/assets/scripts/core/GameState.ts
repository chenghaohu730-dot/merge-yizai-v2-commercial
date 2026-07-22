export type GameState = "booting" | "home" | "playing" | "paused" | "result";

export interface RunSummary {
  score: number;
  bestScore: number;
  maxLevel: number;
  yizaiMerged: boolean;
  earnedCoins: number;
}

export interface LocalRankEntry {
  score: number;
  maxLevel: number;
  createdAt: number;
}

export interface PlayerProfile {
  bestScore: number;
  yizaiCoins: number;
  selectedSkinId: string;
  unlockedSkinIds: string[];
  totalRounds: number;
  totalScore: number;
  yizaiMergedTimes: number;
  dailyKey: string;
  taskStates: Array<{ id: string; progress: number; claimed: boolean }>;
  localRanks: LocalRankEntry[];
}
