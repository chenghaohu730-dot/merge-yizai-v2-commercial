export interface SkinDefinition {
  id: string;
  name: string;
  theme: string;
  price: number;
  unlockedByDefault: boolean;
  description: string;
  bundleName: string;
  previewResource: string;
  pricingStatus: "locked" | "provisional";
  availability: "available";
}

export const DEFAULT_SKIN_ID = "classic_v2";

export const LEGACY_SKIN_ID_ALIASES: Readonly<Record<string, string>> = {
  classic_round: DEFAULT_SKIN_ID,
  candy_gloss: "jelly_v2",
  sticker_edge: "star_v2"
};

export const SKIN_DEFINITIONS: readonly SkinDefinition[] = [
  {
    id: DEFAULT_SKIN_ID,
    name: "经典亿仔",
    theme: "classic",
    price: 0,
    unlockedByDefault: true,
    description: "默认头像链外观，不改变数值。",
    bundleName: "core_game",
    previewResource: "faces/default/face_01_sprout_bead",
    pricingStatus: "locked",
    availability: "available"
  },
  {
    id: "jelly_v2",
    name: "果冻派对",
    theme: "jelly",
    price: 300,
    unlockedByDefault: false,
    description: "只替换前 10 级外观，最终亿仔和所有物理数值不变。",
    bundleName: "skin_jelly_v2",
    previewResource: "faces/jelly/skin_preview_jelly",
    pricingStatus: "provisional",
    availability: "available"
  },
  {
    id: "star_v2",
    name: "星星电台",
    theme: "star",
    price: 500,
    unlockedByDefault: false,
    description: "只替换前 10 级外观，最终亿仔和所有物理数值不变。",
    bundleName: "skin_star_v2",
    previewResource: "faces/star/skin_preview_star",
    pricingStatus: "provisional",
    availability: "available"
  },
  {
    id: "cream_v2",
    name: "奶油云朵",
    theme: "cream",
    price: 700,
    unlockedByDefault: false,
    description: "只替换前 10 级外观，最终亿仔和所有物理数值不变。",
    bundleName: "skin_cream_v2",
    previewResource: "faces/cream/skin_preview_cream",
    pricingStatus: "provisional",
    availability: "available"
  },
  {
    id: "coin_v2",
    name: "亿仔金币",
    theme: "coin",
    price: 900,
    unlockedByDefault: false,
    description: "只替换前 10 级外观，最终亿仔和所有物理数值不变。",
    bundleName: "skin_coin_v2",
    previewResource: "faces/coin/skin_preview_coin",
    pricingStatus: "provisional",
    availability: "available"
  },
  {
    id: "festival_v2",
    name: "节日糖果",
    theme: "festival",
    price: 1200,
    unlockedByDefault: false,
    description: "只替换前 10 级外观，最终亿仔和所有物理数值不变。",
    bundleName: "skin_festival_v2",
    previewResource: "faces/festival/skin_preview_festival",
    pricingStatus: "provisional",
    availability: "available"
  }
];

export function normalizeSkinId(skinId: string): string {
  return LEGACY_SKIN_ID_ALIASES[skinId] || skinId;
}

export function hasSkinDefinition(skinId: string): boolean {
  return SKIN_DEFINITIONS.some((skin) => skin.id === normalizeSkinId(skinId));
}

export function getDefaultUnlockedSkinIds(): string[] {
  return SKIN_DEFINITIONS.filter((skin) => skin.unlockedByDefault).map((skin) => skin.id);
}
