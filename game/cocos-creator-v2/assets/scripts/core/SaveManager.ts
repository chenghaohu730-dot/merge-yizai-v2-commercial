import { sys } from "cc";
import {
  DEFAULT_SKIN_ID,
  getDefaultUnlockedSkinIds,
  hasSkinDefinition,
  normalizeSkinId
} from "../config/ShopConfig";
import { createDailyTaskStates, todayKey } from "../config/TaskConfig";
import type { LocalRankEntry, PlayerProfile } from "./GameState";

const PROFILE_KEY = "mergeYizai.v2.profile";

export class SaveManager {
  static loadProfile(): PlayerProfile {
    const dailyKey = todayKey();
    const fallback = this.createDefaultProfile(dailyKey);
    const raw = sys.localStorage.getItem(PROFILE_KEY);
    if (!raw) return fallback;

    try {
      const saved = JSON.parse(raw) as Partial<PlayerProfile>;
      const unlockedSkinIds = this.normalizeSkinIds(saved.unlockedSkinIds || fallback.unlockedSkinIds);
      const selectedSkinId = normalizeSkinId(saved.selectedSkinId || fallback.selectedSkinId);
      const profile: PlayerProfile = {
        ...fallback,
        ...saved,
        selectedSkinId: unlockedSkinIds.includes(selectedSkinId) ? selectedSkinId : DEFAULT_SKIN_ID,
        unlockedSkinIds,
        localRanks: this.normalizeRanks(saved.localRanks || [])
      };

      if (profile.dailyKey !== dailyKey) {
        profile.dailyKey = dailyKey;
        profile.taskStates = createDailyTaskStates();
      }
      return profile;
    } catch {
      return fallback;
    }
  }

  static saveProfile(profile: PlayerProfile): void {
    sys.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  static createDefaultProfile(dailyKey = todayKey()): PlayerProfile {
    return {
      bestScore: 0,
      yizaiCoins: 0,
      selectedSkinId: DEFAULT_SKIN_ID,
      unlockedSkinIds: getDefaultUnlockedSkinIds(),
      totalRounds: 0,
      totalScore: 0,
      yizaiMergedTimes: 0,
      dailyKey,
      taskStates: createDailyTaskStates(),
      localRanks: []
    };
  }

  private static normalizeRanks(ranks: LocalRankEntry[]): LocalRankEntry[] {
    return ranks
      .filter((rank) => Number.isFinite(rank.score) && Number.isFinite(rank.createdAt))
      .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
      .slice(0, 20);
  }

  private static normalizeSkinIds(skinIds: string[]): string[] {
    const normalized = skinIds.map(normalizeSkinId).filter(hasSkinDefinition);
    return [...new Set([DEFAULT_SKIN_ID, ...normalized])];
  }
}
