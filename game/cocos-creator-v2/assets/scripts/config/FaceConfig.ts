export interface FaceDefinition {
  level: number;
  name: string;
  radius: number;
  diameter: number;
  score: number;
  color: string;
  resource: string;
  isYizai?: boolean;
}

export interface SpawnWeight {
  level: number;
  weight: number;
}

export const DESIGN_WIDTH = 750;
export const DESIGN_HEIGHT = 1334;
export const MAX_FACE_LEVEL = 11;
export const DOUBLE_YIZAI_BONUS_SCORE = 3000;

export const FACE_DEFINITIONS: readonly FaceDefinition[] = [
  { level: 1, name: "芽芽豆", radius: 29, diameter: 58, score: 0, color: "#56c7a6", resource: "faces/face_01_sprout_bead" },
  { level: 2, name: "桃桃泡芙", radius: 36, diameter: 72, score: 2, color: "#f5e8ce", resource: "faces/face_02_peach_puff" },
  { level: 3, name: "心心果冻", radius: 46, diameter: 92, score: 5, color: "#f5a8be", resource: "faces/face_03_heart_jelly" },
  { level: 4, name: "阳光摇摇", radius: 58, diameter: 116, score: 10, color: "#ffbf48", resource: "faces/face_04_sun_wiggle" },
  { level: 5, name: "蓝莓惊惊", radius: 72, diameter: 144, score: 20, color: "#4fa8f5", resource: "faces/face_05_sky_spark" },
  { level: 6, name: "奶油笑笑", radius: 88, diameter: 176, score: 40, color: "#ffd866", resource: "faces/face_06_cream_smile" },
  { level: 7, name: "小芽贤者", radius: 106, diameter: 212, score: 80, color: "#cbb79a", resource: "faces/face_07_seed_sage" },
  { level: 8, name: "葡萄电电", radius: 128, diameter: 256, score: 160, color: "#b899ff", resource: "faces/face_08_grape_zap" },
  { level: 9, name: "火苗哈哈", radius: 154, diameter: 308, score: 320, color: "#ff795d", resource: "faces/face_09_flame_grin" },
  { level: 10, name: "星冠团团", radius: 184, diameter: 368, score: 640, color: "#6a5cf6", resource: "faces/face_10_crown_star" },
  { level: 11, name: "亿仔", radius: 216, diameter: 432, score: 1280, color: "#ffffff", resource: "faces/face_11_yizai", isYizai: true }
];

export const SPAWN_WEIGHTS: readonly SpawnWeight[] = [
  { level: 1, weight: 45 },
  { level: 2, weight: 30 },
  { level: 3, weight: 18 },
  { level: 4, weight: 7 }
];

export function getFaceDefinition(level: number): FaceDefinition {
  const definition = FACE_DEFINITIONS[level - 1];
  if (!definition) throw new Error(`Unknown face level: ${level}`);
  return definition;
}

export function getScoreForMerge(nextLevel: number): number {
  if (nextLevel > MAX_FACE_LEVEL) return DOUBLE_YIZAI_BONUS_SCORE;
  return getFaceDefinition(nextLevel).score;
}

export function rollSpawnLevel(randomValue = Math.random()): number {
  const total = SPAWN_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  let cursor = randomValue * total;
  for (const item of SPAWN_WEIGHTS) {
    cursor -= item.weight;
    if (cursor <= 0) return item.level;
  }
  return SPAWN_WEIGHTS[SPAWN_WEIGHTS.length - 1].level;
}
