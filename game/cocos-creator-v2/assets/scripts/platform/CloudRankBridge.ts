import type { RunSummary } from "../core/GameState";

export class CloudRankBridge {
  async submitWorldScore(_summary: RunSummary): Promise<void> {
    // Hook for wx.cloud.callFunction once cloud development is enabled.
  }

  async fetchWorldRank(): Promise<unknown[]> {
    // Hook for global leaderboard data. Keep the game playable when cloud is disabled.
    return [];
  }
}
