export interface DesignRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DesignPoint {
  x: number;
  y: number;
}

export interface CocosPoint {
  x: number;
  y: number;
}

export const DESIGN_SIZE = {
  width: 750,
  height: 1334,
  centerX: 375,
  centerY: 667
} as const;

export const HOME_LAYOUT = {
  homeBg: { x: 0, y: 0, w: 750, h: 1334 },
  homeMachineRect: { x: 0, y: 0, w: 750, h: 1334 },
  startButtonRect: { x: 115, y: 910, w: 520, h: 160 },
  taskButtonRect: { x: 580, y: 790, w: 150, h: 150 },
  rankButtonRect: { x: 580, y: 955, w: 150, h: 150 },
  shopButtonRect: { x: 55, y: 1135, w: 150, h: 150 },
  dailyGoalRect: { x: 50, y: 720, w: 220, h: 110 },
  bestScoreRect: { x: 50, y: 840, w: 220, h: 110 },
  coinBalanceRect: { x: 265, y: 1120, w: 220, h: 90 }
} as const satisfies Record<string, DesignRect>;

export const GAME_LAYOUT = {
  screen: { x: 0, y: 0, w: 750, h: 1334 },
  hudTop: { x: 0, y: 0, w: 750, h: 170 },
  playfieldRect: { x: 65, y: 230, w: 620, h: 780 },
  playfieldBg: { x: 65, y: 230, w: 620, h: 780 },
  playfieldFrame: { x: 50, y: 210, w: 650, h: 820 },
  physicsRect: { x: 89, y: 254, w: 572, h: 732 },
  warningLine: { x: 95, y: 345, w: 560, h: 40 },
  controlBar: { x: 115, y: 1160, w: 520, h: 150 }
} as const satisfies Record<string, DesignRect>;

export const GAME_POINTS = {
  dropperAnchor: { x: 375, y: 210 },
  warningLineY: 345
} as const;

export const BALL_SAFETY = {
  canvasSize: 512,
  centerX: 256,
  centerY: 256,
  maxSubjectDiameter: 460,
  transparentMargin: 26,
  collisionDiameter: 460
} as const;

export const SAFE_AREA_RULES = {
  designSafePadding: 24,
  avoidNotchStatusBarAndWechatCapsule: true,
  avoidBottomGestureArea: true
} as const;

export function designRectToCocos(rect: DesignRect): CocosPoint {
  return {
    x: rect.x + rect.w / 2 - DESIGN_SIZE.centerX,
    y: DESIGN_SIZE.centerY - (rect.y + rect.h / 2)
  };
}

export function designPointToCocos(point: DesignPoint): CocosPoint {
  return {
    x: point.x - DESIGN_SIZE.centerX,
    y: DESIGN_SIZE.centerY - point.y
  };
}

export function designYToCocos(y: number): number {
  return DESIGN_SIZE.centerY - y;
}
