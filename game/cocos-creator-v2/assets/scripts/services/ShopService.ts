import { SKIN_DEFINITIONS, normalizeSkinId, type SkinDefinition } from "../config/ShopConfig";
import type { PlayerProfile } from "../core/GameState";

export interface SkinViewModel extends SkinDefinition {
  unlocked: boolean;
  selected: boolean;
  canBuy: boolean;
}

export class ShopService {
  static list(profile: PlayerProfile): SkinViewModel[] {
    return SKIN_DEFINITIONS.map((skin) => ({
      ...skin,
      unlocked: profile.unlockedSkinIds.includes(skin.id),
      selected: profile.selectedSkinId === skin.id,
      canBuy: !profile.unlockedSkinIds.includes(skin.id) && profile.yizaiCoins >= skin.price
    }));
  }

  static buy(profile: PlayerProfile, skinId: string): boolean {
    const normalizedSkinId = normalizeSkinId(skinId);
    const skin = SKIN_DEFINITIONS.find((item) => item.id === normalizedSkinId);
    if (!skin || profile.unlockedSkinIds.includes(normalizedSkinId) || profile.yizaiCoins < skin.price) return false;

    profile.yizaiCoins -= skin.price;
    profile.unlockedSkinIds.push(normalizedSkinId);
    profile.selectedSkinId = normalizedSkinId;
    return true;
  }

  static select(profile: PlayerProfile, skinId: string): boolean {
    const normalizedSkinId = normalizeSkinId(skinId);
    if (!SKIN_DEFINITIONS.some((skin) => skin.id === normalizedSkinId)) return false;
    if (!profile.unlockedSkinIds.includes(normalizedSkinId)) return false;
    profile.selectedSkinId = normalizedSkinId;
    return true;
  }
}
