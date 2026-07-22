import { DEFAULT_SKIN_ID, SKIN_DEFINITIONS, type SkinDefinition } from "../config/ShopConfig";
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
    const skin = SKIN_DEFINITIONS.find((item) => item.id === skinId);
    if (!skin || profile.unlockedSkinIds.includes(skinId) || profile.yizaiCoins < skin.price) return false;

    profile.yizaiCoins -= skin.price;
    profile.unlockedSkinIds.push(skinId);
    profile.selectedSkinId = skinId;
    return true;
  }

  static select(profile: PlayerProfile, skinId: string): boolean {
    if (!profile.unlockedSkinIds.includes(skinId)) return false;
    profile.selectedSkinId = skinId || DEFAULT_SKIN_ID;
    return true;
  }
}
