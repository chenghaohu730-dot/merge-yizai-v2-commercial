import type { RunSummary } from "../core/GameState";

export class OpenDataRankBridge {
  submitFriendScore(_summary: RunSummary): void {
    // Hook for wx.getOpenDataContext().postMessage after the open data domain is created.
  }

  requestFriendRank(): void {
    // Hook for asking the open data domain canvas to refresh friend rank.
  }
}
