export interface SkinDefinition {
  id: string;
  name: string;
  price: number;
  unlockedByDefault: boolean;
  description: string;
}

export const DEFAULT_SKIN_ID = "classic_round";

export const SKIN_DEFINITIONS: readonly SkinDefinition[] = [
  {
    id: "classic_round",
    name: "经典圆球",
    price: 0,
    unlockedByDefault: true,
    description: "默认头像链外观，不改变数值。"
  },
  {
    id: "candy_gloss",
    name: "糖果高光",
    price: 300,
    unlockedByDefault: false,
    description: "只增加外观高光，不改变半径、重量、概率和得分。"
  },
  {
    id: "sticker_edge",
    name: "贴纸描边",
    price: 500,
    unlockedByDefault: false,
    description: "只替换边框装饰，不改变玩法数值。"
  }
];

export function getDefaultUnlockedSkinIds(): string[] {
  return SKIN_DEFINITIONS.filter((skin) => skin.unlockedByDefault).map((skin) => skin.id);
}
