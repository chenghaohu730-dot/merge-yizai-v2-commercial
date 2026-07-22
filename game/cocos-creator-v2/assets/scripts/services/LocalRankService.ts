import type { LocalRankEntry, PlayerProfile, RunSummary } from "../core/GameState";

export class LocalRankService {
  static submit(profile: PlayerProfile, summary: RunSummary): void {
    const entry: LocalRankEntry = {
      score: summary.score,
      maxLevel: summary.maxLevel,
      createdAt: Date.now()
    };

    profile.localRanks = [entry, ...profile.localRanks]
      .sort((a, b) => b.score - a.score || b.maxLevel - a.maxLevel || b.createdAt - a.createdAt)
      .slice(0, 20);
  }

  static list(profile: PlayerProfile): LocalRankEntry[] {
    return [...profile.localRanks].sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
  }
}
