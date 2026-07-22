import Matter from "matter-js";
import "./styles.css";

const LOGICAL_W = 750;
const BASE_LOGICAL_H = 1334;
const WALL = 36;
const GLASS_RECT = { x: 61, y: 227, w: 628, h: 893 };
const PLAYFIELD_BG_RECT = { x: 53, y: 215, w: 644, bottomPad: 8 };
const PLAYFIELD_LEFT = 55;
const PLAYFIELD_RIGHT = 695;
const PLAYFIELD_TOP_BASE = 246;
const PLAYFIELD_FLOOR_BASE = 1120;
const SHELL_PLAYFIELD_TOP = 227;
const SHELL_SOURCE_FLOOR = 1120;
const SHELL_BOTTOM_H = BASE_LOGICAL_H - SHELL_SOURCE_FLOOR;
const SHELL_SIDE_W = 82;
const HUD_SCORE_RECT = { x: 91, y: 96, w: 218, h: 92 };
const HUD_BEST_RECT = { x: 333, y: 96, w: 218, h: 92 };
const HUD_NEXT_RECT = { x: 565, y: 95, w: 108, h: 108 };
const CONTROL_BUTTON_SIZE = 104;
const CONTROL_RECTS = {
  sound: { x: 180, y: 1160, w: CONTROL_BUTTON_SIZE, h: CONTROL_BUTTON_SIZE },
  pause: { x: 323, y: 1160, w: CONTROL_BUTTON_SIZE, h: CONTROL_BUTTON_SIZE },
  restart: { x: 460, y: 1160, w: CONTROL_BUTTON_SIZE, h: CONTROL_BUTTON_SIZE },
};
const DROP_Y_BASE = 310;
const WARNING_Y_BASE = 360;
const FACE_DRAW_SCALE = 1;
const DROPPER_HEAD_W = 96;
const DROPPER_HEAD_H = 100;
const DROPPER_HEAD_Y = 205;
const controlButtonSources = {
  btn_sound_on_normal: "/assets/ui/btn_sound_on_normal.png",
  btn_sound_on_pressed: "/assets/ui/btn_sound_on_pressed.png",
  btn_sound_off_normal: "/assets/ui/btn_sound_off_normal.png",
  btn_sound_off_pressed: "/assets/ui/btn_sound_off_pressed.png",
  btn_pause_normal: "/assets/ui/btn_pause_normal.png",
  btn_pause_pressed: "/assets/ui/btn_pause_pressed.png",
  btn_restart_normal: "/assets/ui/btn_restart_normal.png",
  btn_restart_pressed: "/assets/ui/btn_restart_pressed.png",
} as const;

type FaceConfig = {
  level: number;
  name: string;
  radius: number;
  color: string;
  score: number;
  asset: string;
};

type FaceBody = Matter.Body & {
  faceLevel?: number;
  merging?: boolean;
};

type GameState = "ready" | "playing" | "paused" | "over";

type PlayerStats = {
  date: string;
  played: number;
  totalScore: number;
  yizaiCount: number;
  dailyBestLevel: number;
  dailyBestScore: number;
  dailyCleared: boolean;
  streak: number;
};

type PanelKind = "settings" | "leaderboard" | "achievements";

type GameSettings = {
  version: number;
  soundEnabled: boolean;
  shakeEnabled: boolean;
  updatedAt: string;
};

type LeaderboardEntry = {
  id: string;
  score: number;
  maxLevel: number;
  maxLevelName: string;
  date: string;
  played: number;
  yizai: boolean;
};

type LocalLeaderboard = {
  version: number;
  entries: LeaderboardEntry[];
  updatedAt: string;
};

type AchievementId = "firstRun" | "dailyTarget" | "levelEight" | "firstYizai" | "scoreFiveHundred" | "fiveRuns";

type AchievementItem = {
  id: AchievementId;
  unlocked: boolean;
  progress: number;
  unlockedAt?: string;
};

type AchievementsState = {
  version: number;
  items: Record<AchievementId, AchievementItem>;
  updatedAt: string;
};

type AchievementDefinition = {
  id: AchievementId;
  title: string;
  description: string;
  target: number;
  evaluate: (snapshot: RunSnapshot) => number;
};

type RunSnapshot = {
  score: number;
  bestScore: number;
  maxLevel: number;
  played: number;
  yizaiCount: number;
  dailyCleared: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

type SoundKey = "drop" | "merge" | "bigMerge" | "yizai" | "gameOver" | "button" | "bgm";
type ControlButtonKey = keyof typeof controlButtonSources;

const faces: FaceConfig[] = [
  { level: 1, name: "芽芽豆", radius: 28, color: "#56c7a6", score: 0, asset: "/assets/faces/face_01_sprout_bead.png" },
  { level: 2, name: "桃桃泡芙", radius: 35, color: "#f5e8ce", score: 2, asset: "/assets/faces/face_02_peach_puff.png" },
  { level: 3, name: "心心果冻", radius: 44, color: "#f5a8be", score: 5, asset: "/assets/faces/face_03_heart_jelly.png" },
  { level: 4, name: "阳光摇摇", radius: 55, color: "#ffbf48", score: 10, asset: "/assets/faces/face_04_sun_wiggle.png" },
  { level: 5, name: "蓝莓惊惊", radius: 68, color: "#4fa8f5", score: 20, asset: "/assets/faces/face_05_sky_spark.png" },
  { level: 6, name: "奶油笑笑", radius: 82, color: "#ffd866", score: 40, asset: "/assets/faces/face_06_cream_smile.png" },
  { level: 7, name: "小芽贤者", radius: 100, color: "#cbb79a", score: 80, asset: "/assets/faces/face_07_seed_sage.png" },
  { level: 8, name: "葡萄电电", radius: 120, color: "#b899ff", score: 160, asset: "/assets/faces/face_08_grape_zap.png" },
  { level: 9, name: "火苗哈哈", radius: 145, color: "#ff795d", score: 320, asset: "/assets/faces/face_09_flame_grin.png" },
  { level: 10, name: "星冠团团", radius: 174, color: "#6a5cf6", score: 640, asset: "/assets/faces/face_10_crown_star.png" },
  { level: 11, name: "亿仔", radius: 205, color: "#ffffff", score: 1280, asset: "/assets/faces/face_11_yizai.png" },
];

const faceImages = new Map<number, HTMLImageElement>();
const shellImage = new Image();
const playfieldBgImage = new Image();
const glassOverlayImage = new Image();
const warningLineImage = new Image();
const dropperHeadImage = new Image();
const controlButtonImages = new Map<ControlButtonKey, HTMLImageElement>();

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;
const gameShellEl = document.querySelector<HTMLElement>(".game-shell")!;
const scorePanelEl = document.querySelector<HTMLElement>(".score-panel")!;
const bestPanelEl = document.querySelector<HTMLElement>(".best-panel")!;
const nextPanelEl = document.querySelector<HTMLElement>(".next-panel")!;
const nextCanvas = document.querySelector<HTMLCanvasElement>("#nextFace")!;
const nextCtx = nextCanvas.getContext("2d")!;
const scoreEl = document.querySelector<HTMLElement>("#score")!;
const bestEl = document.querySelector<HTMLElement>("#best")!;
const scoreLabelEl = scorePanelEl.querySelector<HTMLElement>("span")!;
const bestLabelEl = bestPanelEl.querySelector<HTMLElement>("span")!;
const resultEl = document.querySelector<HTMLElement>("#result")!;
const startEl = document.querySelector<HTMLElement>("#start")!;
const pausedEl = document.querySelector<HTMLElement>("#paused")!;
const restartConfirmEl = document.querySelector<HTMLElement>("#restartConfirm")!;
const toastEl = document.querySelector<HTMLElement>("#toast")!;
const levelStripEl = document.querySelector<HTMLElement>("#levelStrip")!;
const finalScoreEl = document.querySelector<HTMLElement>("#finalScore")!;
const finalLevelEl = document.querySelector<HTMLElement>("#finalLevel")!;
const finalCommentEl = document.querySelector<HTMLElement>("#finalComment")!;
const resultDailyEl = document.querySelector<HTMLElement>("#resultDaily")!;
const resultAchievementEl = document.querySelector<HTMLElement>("#resultAchievement")!;
const dailyProgressEl = document.querySelector<HTMLElement>("#dailyProgress")!;
const runCountEl = document.querySelector<HTMLElement>("#runCount")!;
const yizaiCountEl = document.querySelector<HTMLElement>("#yizaiCount")!;
const startBtn = document.querySelector<HTMLButtonElement>("#startGame")!;
const pauseBtn = document.querySelector<HTMLButtonElement>("#pause")!;
const soundToggleBtn = document.querySelector<HTMLButtonElement>("#soundToggle")!;
const resumeBtn = document.querySelector<HTMLButtonElement>("#resume")!;
const restartBtn = document.querySelector<HTMLButtonElement>("#restart")!;
const restartTopBtn = document.querySelector<HTMLButtonElement>("#restartTop")!;
const cancelRestartBtn = document.querySelector<HTMLButtonElement>("#cancelRestart")!;
const confirmRestartBtn = document.querySelector<HTMLButtonElement>("#confirmRestart")!;
const shareResultBtn = document.querySelector<HTMLButtonElement>("#shareResult")!;
const systemModalEl = document.querySelector<HTMLElement>("#systemModal")!;
const systemModalTitleEl = document.querySelector<HTMLElement>("#systemModalTitle")!;
const systemModalBodyEl = document.querySelector<HTMLElement>("#systemModalBody")!;
const closeSystemPanelBtn = document.querySelector<HTMLButtonElement>("#closeSystemPanel")!;
const panelOpenButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-open-panel]"));

let engine: Matter.Engine;
let runnerActive = false;
let currentLevel = 1;
let nextLevel = 1;
let dropX = LOGICAL_W / 2;
let canDrop = true;
let score = 0;
let best = Number(localStorage.getItem("mergeYizaiBest") || 0);
let maxLevel = 1;
let warningTime = 0;
let gameOver = false;
let lastTime = performance.now();
let mergeBurst = 0;
let state: GameState = "ready";
let combo = 0;
let comboTimer = 0;
let particles: Particle[] = [];
let toastTimer = 0;
let logicalH = BASE_LOGICAL_H;
let floorY = PLAYFIELD_FLOOR_BASE;
let dropY = DROP_Y_BASE;
let warningY = WARNING_Y_BASE;
let pressedControl: "sound" | "pause" | "restart" | "" = "";

const DAILY_TARGET_LEVEL = 5;
const STATS_KEY = "mergeYizaiPlayerStats";
const SETTINGS_KEY = "mergeYizaiSettings";
const LEADERBOARD_KEY = "mergeYizaiLocalLeaderboard";
const ACHIEVEMENTS_KEY = "mergeYizaiAchievements";
const SOUND_MUTED_KEY = "mergeYizaiSoundMuted";
const LOCAL_LEADERBOARD_LIMIT = 50;
const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    id: "firstRun",
    title: "初次试玩",
    description: "完成 1 局网页试玩",
    target: 1,
    evaluate: (snapshot) => snapshot.played,
  },
  {
    id: "dailyTarget",
    title: "今日达标",
    description: `单局合成到 ${DAILY_TARGET_LEVEL} 级`,
    target: DAILY_TARGET_LEVEL,
    evaluate: (snapshot) => Math.min(snapshot.maxLevel, DAILY_TARGET_LEVEL),
  },
  {
    id: "levelEight",
    title: "抽象进阶",
    description: "单局合成到 8 级头像",
    target: 8,
    evaluate: (snapshot) => Math.min(snapshot.maxLevel, 8),
  },
  {
    id: "firstYizai",
    title: "亿仔出现",
    description: "合成出带 MAEE 的亿仔",
    target: 1,
    evaluate: (snapshot) => (snapshot.yizaiCount > 0 ? 1 : 0),
  },
  {
    id: "scoreFiveHundred",
    title: "五百分挑战",
    description: "本地最高分达到 500 分",
    target: 500,
    evaluate: (snapshot) => Math.min(snapshot.bestScore, 500),
  },
  {
    id: "fiveRuns",
    title: "连续练手",
    description: "累计完成 5 局试玩",
    target: 5,
    evaluate: (snapshot) => snapshot.played,
  },
];
const soundFiles: Record<SoundKey, string> = {
  drop: "/assets/audio/drop.wav",
  merge: "/assets/audio/merge.wav",
  bigMerge: "/assets/audio/big_merge.wav",
  yizai: "/assets/audio/yizai.wav",
  gameOver: "/assets/audio/game_over.wav",
  button: "/assets/audio/button.wav",
  bgm: "/assets/audio/bgm.mp3",
};
let stats = loadPlayerStats();
let settings = loadGameSettings();
let leaderboard = loadLocalLeaderboard();
let achievements = loadAchievements();
let activePanelKind: PanelKind | null = null;
const sounds = new Map<SoundKey, HTMLAudioElement>();
let audioUnlocked = false;
let soundMuted = !settings.soundEnabled;

function loadFaceImages() {
  shellImage.onload = () => undefined;
  shellImage.src = "/assets/ui/game_shell.png";
  playfieldBgImage.onload = () => undefined;
  playfieldBgImage.src = "/assets/ui/game_playfield_bg.jpg";
  glassOverlayImage.onload = () => undefined;
  glassOverlayImage.src = "/assets/ui/glass_overlay.png";
  warningLineImage.onload = () => undefined;
  warningLineImage.src = "/assets/ui/warning_line.png";
  dropperHeadImage.onload = () => undefined;
  dropperHeadImage.src = "/assets/ui/dropper_head.png";
  for (const [key, src] of Object.entries(controlButtonSources) as Array<[ControlButtonKey, string]>) {
    const img = new Image();
    img.onload = () => undefined;
    img.src = src;
    controlButtonImages.set(key, img);
  }
  for (const face of faces) {
    const img = new Image();
    img.onload = () => drawNext();
    img.src = face.asset;
    faceImages.set(face.level, img);
  }
}

function loadSounds() {
  for (const [key, src] of Object.entries(soundFiles) as Array<[SoundKey, string]>) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.loop = key === "bgm";
    audio.volume = key === "bgm" ? 0.24 : key === "gameOver" ? 0.45 : 0.55;
    sounds.set(key, audio);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast("本地存储暂不可用");
  }
}

function defaultSettings(): GameSettings {
  const legacyMuted = localStorage.getItem(SOUND_MUTED_KEY) === "1";
  return {
    version: 1,
    soundEnabled: !legacyMuted,
    shakeEnabled: true,
    updatedAt: nowIso(),
  };
}

function loadGameSettings(): GameSettings {
  const defaults = defaultSettings();
  const saved = readStored<Partial<GameSettings>>(SETTINGS_KEY, {});
  return {
    ...defaults,
    ...saved,
    soundEnabled: typeof saved.soundEnabled === "boolean" ? saved.soundEnabled : defaults.soundEnabled,
    shakeEnabled: typeof saved.shakeEnabled === "boolean" ? saved.shakeEnabled : defaults.shakeEnabled,
    updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : defaults.updatedAt,
  };
}

function saveGameSettings() {
  settings = { ...settings, updatedAt: nowIso() };
  writeStored(SETTINGS_KEY, settings);
  try {
    localStorage.setItem(SOUND_MUTED_KEY, settings.soundEnabled ? "0" : "1");
  } catch {
    // The same settings payload remains the source of truth when legacy mirroring fails.
  }
}

function applySettings() {
  soundMuted = !settings.soundEnabled;
  updateSoundButton();
  document.body.classList.toggle("motion-reduced", !settings.shakeEnabled);
  updateBgm();
}

function defaultLocalLeaderboard(): LocalLeaderboard {
  return {
    version: 1,
    entries: [],
    updatedAt: nowIso(),
  };
}

function cleanLeaderboardEntries(entries: Partial<LeaderboardEntry>[]) {
  return entries
    .filter((entry) => Number.isFinite(entry.score) && Number.isFinite(entry.maxLevel))
    .map((entry, index) => ({
      id: typeof entry.id === "string" && entry.id ? entry.id : `legacy-${index}-${Date.now()}`,
      score: Math.max(0, Math.floor(Number(entry.score) || 0)),
      maxLevel: Math.max(1, Math.min(11, Math.floor(Number(entry.maxLevel) || 1))),
      maxLevelName: typeof entry.maxLevelName === "string" && entry.maxLevelName ? entry.maxLevelName : faces[Math.max(1, Math.min(11, Math.floor(Number(entry.maxLevel) || 1))) - 1].name,
      date: typeof entry.date === "string" && entry.date ? entry.date : nowIso(),
      played: Math.max(1, Math.floor(Number(entry.played) || 1)),
      yizai: Boolean(entry.yizai),
    }));
}

function sortLeaderboard(entries: LeaderboardEntry[]) {
  return [...entries].sort((a, b) => b.score - a.score || b.maxLevel - a.maxLevel || new Date(b.date).getTime() - new Date(a.date).getTime());
}

function loadLocalLeaderboard(): LocalLeaderboard {
  const defaults = defaultLocalLeaderboard();
  const saved = readStored<Partial<LocalLeaderboard>>(LEADERBOARD_KEY, {});
  return {
    version: 1,
    entries: sortLeaderboard(cleanLeaderboardEntries(Array.isArray(saved.entries) ? saved.entries : [])).slice(0, LOCAL_LEADERBOARD_LIMIT),
    updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : defaults.updatedAt,
  };
}

function saveLocalLeaderboard() {
  leaderboard = {
    version: 1,
    entries: sortLeaderboard(leaderboard.entries).slice(0, LOCAL_LEADERBOARD_LIMIT),
    updatedAt: nowIso(),
  };
  writeStored(LEADERBOARD_KEY, leaderboard);
}

function defaultAchievementItem(id: AchievementId): AchievementItem {
  return {
    id,
    unlocked: false,
    progress: 0,
  };
}

function defaultAchievements(): AchievementsState {
  const items = ACHIEVEMENT_CATALOG.reduce((result, item) => {
    result[item.id] = defaultAchievementItem(item.id);
    return result;
  }, {} as Record<AchievementId, AchievementItem>);
  return {
    version: 1,
    items,
    updatedAt: nowIso(),
  };
}

function loadAchievements(): AchievementsState {
  const defaults = defaultAchievements();
  const saved = readStored<Partial<AchievementsState>>(ACHIEVEMENTS_KEY, {});
  const savedItems = saved.items || {};
  for (const definition of ACHIEVEMENT_CATALOG) {
    const savedItem = savedItems[definition.id] as Partial<AchievementItem> | undefined;
    if (!savedItem) continue;
    defaults.items[definition.id] = {
      id: definition.id,
      unlocked: Boolean(savedItem.unlocked),
      progress: Math.max(0, Math.floor(Number(savedItem.progress) || 0)),
      unlockedAt: typeof savedItem.unlockedAt === "string" ? savedItem.unlockedAt : undefined,
    };
  }
  return {
    version: 1,
    items: defaults.items,
    updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : defaults.updatedAt,
  };
}

function saveAchievements() {
  achievements = { ...achievements, updatedAt: nowIso() };
  writeStored(ACHIEVEMENTS_KEY, achievements);
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  for (const sound of sounds.values()) {
    sound.load();
  }
}

function playSound(key: SoundKey) {
  if (soundMuted) return;
  if (!audioUnlocked) return;
  const sound = sounds.get(key);
  if (!sound) return;
  if (key !== "bgm") sound.currentTime = 0;
  void sound.play().catch(() => undefined);
}

function updateBgm() {
  const bgm = sounds.get("bgm");
  if (!bgm) return;
  if (soundMuted || state !== "playing") {
    bgm.pause();
    return;
  }
  if (audioUnlocked) void bgm.play().catch(() => undefined);
}

function updateSoundButton() {
  soundToggleBtn.textContent = soundMuted ? "静" : "声";
  soundToggleBtn.setAttribute("aria-label", soundMuted ? "打开声音" : "关闭声音");
  soundToggleBtn.classList.toggle("muted", soundMuted);
}

function toggleSound() {
  unlockAudio();
  settings = { ...settings, soundEnabled: !settings.soundEnabled };
  saveGameSettings();
  applySettings();
  if (settings.soundEnabled) playSound("button");
  showToast(settings.soundEnabled ? "声音已开" : "已静音");
  if (activePanelKind === "settings") renderSystemPanel("settings");
}

function todayId() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function defaultStats(): PlayerStats {
  return {
    date: todayId(),
    played: 0,
    totalScore: 0,
    yizaiCount: 0,
    dailyBestLevel: 1,
    dailyBestScore: 0,
    dailyCleared: false,
    streak: 0,
  };
}

function loadPlayerStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const saved = raw ? ({ ...defaultStats(), ...JSON.parse(raw) } as PlayerStats) : defaultStats();
    if (saved.date !== todayId()) {
      return {
        ...saved,
        date: todayId(),
        dailyBestLevel: 1,
        dailyBestScore: 0,
        dailyCleared: false,
      };
    }
    return saved;
  } catch {
    return defaultStats();
  }
}

function savePlayerStats() {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function updateMetaHud() {
  const targetMet = stats.dailyCleared || maxLevel >= DAILY_TARGET_LEVEL;
  dailyProgressEl.textContent = targetMet ? `已完成 · 连续 ${Math.max(stats.streak, 1)} 天` : `合成到 ${DAILY_TARGET_LEVEL} 级`;
  runCountEl.textContent = `${stats.played} 局`;
  yizaiCountEl.textContent = `${stats.yizaiCount} 次`;
}

function commitRunStats() {
  const clearedBefore = stats.dailyCleared;
  const clearedNow = maxLevel >= DAILY_TARGET_LEVEL;
  stats = {
    ...stats,
    played: stats.played + 1,
    totalScore: stats.totalScore + score,
    yizaiCount: stats.yizaiCount + (maxLevel >= 11 ? 1 : 0),
    dailyBestLevel: Math.max(stats.dailyBestLevel, maxLevel),
    dailyBestScore: Math.max(stats.dailyBestScore, score),
    dailyCleared: stats.dailyCleared || clearedNow,
    streak: !clearedBefore && clearedNow ? stats.streak + 1 : stats.streak,
  };
  savePlayerStats();
  updateMetaHud();
}

async function shareResult() {
  playSound("button");
  const text = `我在《合成亿仔》拿到 ${score} 分，最高合成到 ${faces[maxLevel - 1].name}。`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "合成亿仔战绩", text });
      return;
    }
    await navigator.clipboard.writeText(text);
    showToast("战绩已复制");
  } catch {
    showToast("分享已取消");
  }
}

function currentRunSnapshot(): RunSnapshot {
  return {
    score,
    bestScore: Math.max(best, score),
    maxLevel,
    played: stats.played,
    yizaiCount: stats.yizaiCount,
    dailyCleared: stats.dailyCleared,
  };
}

function commitLocalLeaderboard() {
  const entry: LeaderboardEntry = {
    id: `run-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    score,
    maxLevel,
    maxLevelName: faces[maxLevel - 1].name,
    date: nowIso(),
    played: stats.played,
    yizai: maxLevel >= 11,
  };
  leaderboard = {
    ...leaderboard,
    entries: [...leaderboard.entries, entry],
  };
  saveLocalLeaderboard();
  const rank = leaderboard.entries.findIndex((item) => item.id === entry.id) + 1;
  return { entry, rank: rank > 0 ? rank : null };
}

function updateAchievementsForRun(snapshot: RunSnapshot) {
  const unlocked: AchievementDefinition[] = [];
  for (const definition of ACHIEVEMENT_CATALOG) {
    const previous = achievements.items[definition.id] || defaultAchievementItem(definition.id);
    const nextProgress = Math.min(definition.target, Math.max(previous.progress, Math.floor(definition.evaluate(snapshot))));
    const nextUnlocked = previous.unlocked || nextProgress >= definition.target;
    if (!previous.unlocked && nextUnlocked) unlocked.push(definition);
    achievements.items[definition.id] = {
      id: definition.id,
      progress: nextProgress,
      unlocked: nextUnlocked,
      unlockedAt: nextUnlocked ? previous.unlockedAt || nowIso() : undefined,
    };
  }
  saveAchievements();
  return unlocked;
}

function buildResultSaveText(unlocked: AchievementDefinition[], rank: number | null) {
  if (unlocked.length > 0) {
    const names = unlocked.slice(0, 2).map((item) => item.title).join("、");
    return `新成就：${names}`;
  }
  return rank ? `本局已保存 · 本地排行第 ${rank} 名` : "本局已保存到本地排行";
}

function isPanelKind(value: string | undefined): value is PanelKind {
  return value === "settings" || value === "leaderboard" || value === "achievements";
}

function openSystemPanel(kind: PanelKind) {
  playSound("button");
  activePanelKind = kind;
  renderSystemPanel(kind);
  systemModalEl.classList.remove("hidden");
  closeSystemPanelBtn.focus({ preventScroll: true });
}

function closeSystemPanel() {
  playSound("button");
  systemModalEl.classList.add("hidden");
  activePanelKind = null;
}

function renderSystemPanel(kind: PanelKind) {
  activePanelKind = kind;
  systemModalEl.dataset.panel = kind;
  systemModalTitleEl.textContent = kind === "settings" ? "设置" : kind === "leaderboard" ? "本地排行" : "成就";
  systemModalBodyEl.replaceChildren();
  if (kind === "settings") renderSettingsPanel();
  if (kind === "leaderboard") renderLeaderboardPanel();
  if (kind === "achievements") renderAchievementsPanel();
}

function renderSettingsPanel() {
  const list = document.createElement("div");
  list.className = "settings-list";
  appendSettingSwitch(list, "声音", "掉落/合成/结算音效", settings.soundEnabled, () => toggleSound());
  appendSettingSwitch(list, "震屏", "高等级合成轻微反馈", settings.shakeEnabled, () => {
    settings = { ...settings, shakeEnabled: !settings.shakeEnabled };
    saveGameSettings();
    applySettings();
    renderSystemPanel("settings");
    showToast(settings.shakeEnabled ? "震屏已开" : "震屏已关");
  });

  systemModalBodyEl.appendChild(list);
}

function appendSettingSwitch(parent: HTMLElement, title: string, description: string, checked: boolean, onToggle: () => void) {
  const row = document.createElement("div");
  row.className = "setting-row";

  const copy = document.createElement("div");
  copy.className = "setting-copy";
  const titleEl = document.createElement("strong");
  titleEl.textContent = title;
  const descEl = document.createElement("span");
  descEl.textContent = description;
  copy.append(titleEl, descEl);

  const button = document.createElement("button");
  button.type = "button";
  button.className = `setting-switch${checked ? " is-on" : ""}`;
  button.setAttribute("aria-pressed", String(checked));
  button.textContent = checked ? "开" : "关";
  button.addEventListener("click", onToggle);

  row.append(copy, button);
  parent.appendChild(row);
}

function renderLeaderboardPanel() {
  const entries = sortLeaderboard(leaderboard.entries).slice(0, 10);
  if (entries.length === 0) {
    appendEmptyState("还没有本地成绩，完成一局后会自动写入排行。");
    return;
  }

  const list = document.createElement("ol");
  list.className = "leaderboard-list";
  entries.forEach((entry, index) => {
    const item = document.createElement("li");
    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = String(index + 1);

    const main = document.createElement("div");
    main.className = "leaderboard-main";
    const scoreText = document.createElement("strong");
    scoreText.textContent = `${entry.score} 分`;
    const meta = document.createElement("span");
    meta.textContent = `${entry.maxLevelName} · 第 ${entry.played} 局 · ${formatShortTime(entry.date)}`;
    main.append(scoreText, meta);

    const badge = document.createElement("span");
    badge.className = `leaderboard-badge${entry.yizai ? " yizai" : ""}`;
    badge.textContent = entry.yizai ? "亿仔" : `${entry.maxLevel}级`;

    item.append(rank, main, badge);
    list.appendChild(item);
  });
  systemModalBodyEl.appendChild(list);
}

function renderAchievementsPanel() {
  const list = document.createElement("div");
  list.className = "achievement-list";
  for (const [index, definition] of ACHIEVEMENT_CATALOG.entries()) {
    const item = achievements.items[definition.id] || defaultAchievementItem(definition.id);
    const row = document.createElement("div");
    row.className = `achievement-card${item.unlocked ? " unlocked" : ""}`;

    const badge = document.createElement("img");
    badge.className = "achievement-badge";
    badge.src = `/assets/ui/achievement_badge_0${(index % 6) + 1}.png`;
    badge.alt = "";
    badge.draggable = false;

    const copy = document.createElement("div");
    copy.className = "achievement-copy";

    const head = document.createElement("div");
    head.className = "achievement-head";
    const title = document.createElement("strong");
    title.textContent = definition.title;
    const stateText = document.createElement("span");
    stateText.textContent = item.unlocked ? "已完成" : `${Math.min(item.progress, definition.target)}/${definition.target}`;
    head.append(title, stateText);

    const desc = document.createElement("p");
    desc.textContent = definition.description;

    const meter = document.createElement("div");
    meter.className = "achievement-meter";
    const bar = document.createElement("span");
    bar.style.width = `${Math.min(100, (Math.min(item.progress, definition.target) / definition.target) * 100)}%`;
    meter.appendChild(bar);

    copy.append(head, desc, meter);
    row.append(badge, copy);
    list.appendChild(row);
  }
  systemModalBodyEl.appendChild(list);
}

function appendEmptyState(text: string) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = text;
  systemModalBodyEl.appendChild(empty);
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function setupCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = rect.width || window.innerWidth || LOGICAL_W;
  const cssHeight = rect.height || window.innerHeight || BASE_LOGICAL_H;
  const measuredH = Math.round((LOGICAL_W * cssHeight) / cssWidth);
  logicalH = Math.max(BASE_LOGICAL_H, measuredH);
  floorY = bottomAnchoredY(PLAYFIELD_FLOOR_BASE);
  dropY = DROP_Y_BASE;
  warningY = WARNING_Y_BASE;
  canvas.width = LOGICAL_W * ratio;
  canvas.height = logicalH * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  syncUiLayout(cssWidth / LOGICAL_W);
}

function bottomAnchoredY(value: number) {
  return Math.max(value, Math.round(logicalH - (BASE_LOGICAL_H - value)));
}

function glassBottomY() {
  return bottomAnchoredY(GLASS_RECT.y + GLASS_RECT.h);
}

function syncUiLayout(unit: number) {
  gameShellEl.style.setProperty("--game-unit", `${unit}px`);
  setDomRect(scorePanelEl, HUD_SCORE_RECT, unit);
  setDomRect(bestPanelEl, HUD_BEST_RECT, unit);
  setDomRect(nextPanelEl, HUD_NEXT_RECT, unit);
  setDomRect(soundToggleBtn, { ...CONTROL_RECTS.sound, y: bottomAnchoredY(CONTROL_RECTS.sound.y) }, unit);
  setDomRect(pauseBtn, { ...CONTROL_RECTS.pause, y: bottomAnchoredY(CONTROL_RECTS.pause.y) }, unit);
  setDomRect(restartTopBtn, { ...CONTROL_RECTS.restart, y: bottomAnchoredY(CONTROL_RECTS.restart.y) }, unit);
  setHudTextScale(unit);
}

function setDomRect(element: HTMLElement, rect: { x: number; y: number; w: number; h: number }, unit: number) {
  element.style.left = `${Math.round(rect.x * unit)}px`;
  element.style.top = `${Math.round(rect.y * unit)}px`;
  element.style.width = `${Math.round(rect.w * unit)}px`;
  element.style.height = `${Math.round(rect.h * unit)}px`;
}

function setHudTextScale(unit: number) {
  scoreLabelEl.style.fontSize = `${17 * unit}px`;
  bestLabelEl.style.fontSize = `${17 * unit}px`;
  scoreEl.style.fontSize = `${42 * unit}px`;
  bestEl.style.fontSize = `${38 * unit}px`;
}

function setupWorld() {
  engine = Matter.Engine.create({ gravity: { x: 0, y: 1.05 } });
  engine.enableSleeping = true;
  const walls = [
    Matter.Bodies.rectangle(PLAYFIELD_LEFT - WALL / 2, logicalH / 2, WALL, logicalH * 2, { isStatic: true }),
    Matter.Bodies.rectangle(PLAYFIELD_RIGHT + WALL / 2, logicalH / 2, WALL, logicalH * 2, { isStatic: true }),
    Matter.Bodies.rectangle(LOGICAL_W / 2, floorY + WALL / 2, PLAYFIELD_RIGHT - PLAYFIELD_LEFT + WALL * 2, WALL, { isStatic: true }),
  ];
  Matter.Composite.add(engine.world, walls);

  Matter.Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      const a = pair.bodyA as FaceBody;
      const b = pair.bodyB as FaceBody;
      if (!a.faceLevel || !b.faceLevel || a.faceLevel !== b.faceLevel) continue;
      if (a.merging || b.merging || a.faceLevel > 11 || gameOver) continue;
      a.merging = true;
      b.merging = true;
      window.setTimeout(() => mergeFaces(a, b), 70);
    }
  });
}

function weightedLevel() {
  const roll = Math.random();
  if (roll < 0.45) return 1;
  if (roll < 0.75) return 2;
  if (roll < 0.93) return 3;
  return 4;
}

function resetGame() {
  unlockAudio();
  playSound("button");
  setupWorld();
  restartConfirmEl.classList.add("hidden");
  pressedControl = "";
  currentLevel = weightedLevel();
  nextLevel = weightedLevel();
  dropX = LOGICAL_W / 2;
  canDrop = true;
  score = 0;
  maxLevel = 1;
  warningTime = 0;
  gameOver = false;
  mergeBurst = 0;
  combo = 0;
  comboTimer = 0;
  particles = [];
  toastTimer = 0;
  state = "playing";
  updateStateClass();
  runnerActive = true;
  updateBgm();
  startEl.classList.add("hidden");
  pausedEl.classList.add("hidden");
  restartConfirmEl.classList.add("hidden");
  resultEl.classList.add("hidden");
  updateHud();
  updateMetaHud();
  updateLevelStrip();
  drawNext();
}

function showReady() {
  setupWorld();
  state = "ready";
  updateStateClass();
  updateBgm();
  runnerActive = false;
  startEl.classList.remove("hidden");
  pausedEl.classList.add("hidden");
  restartConfirmEl.classList.add("hidden");
  resultEl.classList.add("hidden");
  updateHud();
  updateMetaHud();
  updateLevelStrip();
  drawNext();
}

function togglePause() {
  if (!restartConfirmEl.classList.contains("hidden")) return;
  if (state === "playing") {
    playSound("button");
    state = "paused";
    updateStateClass();
    updateBgm();
    runnerActive = false;
    pausedEl.classList.remove("hidden");
    pauseBtn.textContent = "▶";
    return;
  }
  if (state === "paused") {
    playSound("button");
    state = "playing";
    updateStateClass();
    updateBgm();
    runnerActive = true;
    pausedEl.classList.add("hidden");
    pauseBtn.textContent = "Ⅱ";
  }
}

function showRestartConfirm() {
  if (state !== "playing") return;
  playSound("button");
  pressedControl = "";
  runnerActive = false;
  restartConfirmEl.classList.remove("hidden");
}

function cancelRestartConfirm() {
  playSound("button");
  restartConfirmEl.classList.add("hidden");
  runnerActive = state === "playing";
}

function confirmRestart() {
  resetGame();
}

function makeFace(level: number, x: number, y: number) {
  const config = faces[level - 1];
  const body = Matter.Bodies.circle(x, y, config.radius, {
    restitution: 0.2,
    friction: 0.58,
    frictionAir: 0.012,
    slop: 0.01,
    density: 0.0012 + level * 0.00008,
    label: "face",
  }) as FaceBody;
  body.faceLevel = level;
  return body;
}

function dropCurrent() {
  if (!canDrop || gameOver || state !== "playing") return;
  canDrop = false;
  playSound("drop");
  const body = makeFace(currentLevel, dropX, dropY);
  Matter.Composite.add(engine.world, body);
  window.setTimeout(() => {
    currentLevel = nextLevel;
    nextLevel = weightedLevel();
    drawNext();
    canDrop = true;
  }, 430);
}

function mergeFaces(a: FaceBody, b: FaceBody) {
  const bodies = Matter.Composite.allBodies(engine.world);
  if (!bodies.includes(a) || !bodies.includes(b)) return;
  const level = a.faceLevel || 1;
  const next = Math.min(level + 1, 11);
  const x = (a.position.x + b.position.x) / 2;
  const y = (a.position.y + b.position.y) / 2;
  Matter.Composite.remove(engine.world, [a, b]);

  if (level === 11) {
    addScore(3000);
    showToast("亿仔爆分 +3000");
    playSound("yizai");
    spawnParticles(x, y, "#ffdf55", 34);
    shake();
    mergeBurst = 1;
    return;
  }

  const merged = makeFace(next, x, y);
  Matter.Body.setVelocity(merged, { x: 0, y: -2.3 });
  Matter.Composite.add(engine.world, merged);
  addScore(faces[next - 1].score);
  maxLevel = Math.max(maxLevel, next);
  updateMetaHud();
  combo += 1;
  comboTimer = 1250;
  updateLevelStrip();
  spawnParticles(x, y, faces[next - 1].color, next >= 8 ? 26 : 16);
  showToast(combo >= 3 ? `${combo} 连合成` : `合成 ${faces[next - 1].name}`);
  playSound(next >= 8 ? "bigMerge" : "merge");
  if (next >= 8) shake();
  mergeBurst = 1;
}

function forceMergeForTest(level = 1) {
  if (state !== "playing") resetGame();
  const a = makeFace(level, LOGICAL_W / 2 - 18, dropY + 200);
  const b = makeFace(level, LOGICAL_W / 2 + 18, dropY + 200);
  Matter.Composite.add(engine.world, [a, b]);
  mergeFaces(a, b);
}

function addScore(value: number) {
  score += value;
  if (score > best) {
    best = score;
    localStorage.setItem("mergeYizaiBest", String(best));
  }
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
  updateMetaHud();
}

function updateLevelStrip() {
  levelStripEl.innerHTML = "";
  for (const face of faces) {
    const dot = document.createElement("div");
    dot.className = `level-dot${face.level <= maxLevel ? " active" : ""}`;
    dot.title = face.name;
    const icon = document.createElement("img");
    icon.src = face.asset;
    icon.alt = "";
    dot.appendChild(icon);
    levelStripEl.appendChild(dot);
  }
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  runnerActive = false;
  state = "over";
  updateStateClass();
  playSound("gameOver");
  updateBgm();
  commitRunStats();
  const leaderboardResult = commitLocalLeaderboard();
  const unlockedAchievements = updateAchievementsForRun(currentRunSnapshot());
  finalScoreEl.textContent = String(score);
  finalLevelEl.textContent = `最高合成：${faces[maxLevel - 1].name}`;
  finalCommentEl.textContent =
    maxLevel >= 11 ? "已经合出亿仔，下一局冲更高分" : maxLevel >= 8 ? "已经很抽象了，差一步亿仔" : "再来一局，很快就能更离谱";
  resultDailyEl.textContent = stats.dailyCleared ? `今日目标已完成 · 连续 ${Math.max(stats.streak, 1)} 天` : `今日目标：合成到 ${DAILY_TARGET_LEVEL} 级`;
  resultAchievementEl.textContent = buildResultSaveText(unlockedAchievements, leaderboardResult.rank);
  resultEl.classList.remove("hidden");
}

function tick(now: number) {
  const dt = Math.min(32, now - lastTime);
  lastTime = now;
  if (runnerActive) {
    Matter.Engine.update(engine, Math.min(16.667, dt));
    checkWarning(dt);
    updateFeedback(dt);
  }
  draw();
  requestAnimationFrame(tick);
}

function updateFeedback(dt: number) {
  comboTimer = Math.max(0, comboTimer - dt);
  if (comboTimer === 0) combo = 0;
  toastTimer = Math.max(0, toastTimer - dt);
  if (toastTimer === 0) toastEl.classList.add("hidden");
  particles = particles
    .map((p) => ({ ...p, x: p.x + p.vx * (dt / 16.667), y: p.y + p.vy * (dt / 16.667), vy: p.vy + 0.22, life: p.life - dt }))
    .filter((p) => p.life > 0);
}

function showToast(text: string) {
  toastEl.textContent = text;
  toastEl.classList.remove("hidden");
  toastTimer = 900;
}

function spawnParticles(x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 7;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 520 + Math.random() * 340,
      maxLife: 860,
      color,
      size: 4 + Math.random() * 7,
    });
  }
}

function shake() {
  if (!settings.shakeEnabled) return;
  document.body.classList.remove("shake");
  window.setTimeout(() => document.body.classList.add("shake"), 0);
  window.setTimeout(() => document.body.classList.remove("shake"), 220);
}

function checkWarning(dt: number) {
  const activeFaces = Matter.Composite.allBodies(engine.world).filter((body) => (body as FaceBody).faceLevel);
  const over = activeFaces.some((body) => {
    const level = (body as FaceBody).faceLevel || 1;
    const radius = faces[level - 1].radius;
    return body.position.y - radius < warningY && body.speed < 1.5;
  });
  warningTime = over ? warningTime + dt : Math.max(0, warningTime - dt * 1.5);
  if (warningTime >= 3000) endGame();
}

function draw() {
  ctx.clearRect(0, 0, LOGICAL_W, logicalH);
  drawBackground();
  drawPlayfieldBackground();
  drawMachineShellTop();
  drawHudPreview();
  drawBucket();
  drawDropGuide();

  for (const body of Matter.Composite.allBodies(engine.world)) {
    const face = body as FaceBody;
    if (!face.faceLevel) continue;
    drawFace(ctx, face.faceLevel, body.position.x, body.position.y, faces[face.faceLevel - 1].radius, body.angle);
  }

  if (!gameOver && canDrop) {
    drawFace(ctx, currentLevel, dropX, dropY, faces[currentLevel - 1].radius, 0);
  }

  drawMachineShellSidesAndBase();
  drawCanvasControls();

  if (mergeBurst > 0) {
    drawMergeBurst();
    mergeBurst = Math.max(0, mergeBurst - 0.04);
  }
  drawParticles();
  drawGlassOverlay();
  drawWarning();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, logicalH);
  sky.addColorStop(0, "#b9efff");
  sky.addColorStop(0.45, "#ffe9a3");
  sky.addColorStop(1, "#f3a64b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, LOGICAL_W, logicalH);
}

function drawPlayfieldBackground() {
  const x = PLAYFIELD_BG_RECT.x;
  const y = PLAYFIELD_BG_RECT.y;
  const w = PLAYFIELD_BG_RECT.w;
  const h = Math.max(240, glassBottomY() - PLAYFIELD_BG_RECT.y + PLAYFIELD_BG_RECT.bottomPad);
  if (playfieldBgImage.complete && playfieldBgImage.naturalWidth > 0) {
    drawCoverImage(playfieldBgImage, x, y, w, h);
    return;
  }
  const pane = ctx.createLinearGradient(0, y, 0, y + h);
  pane.addColorStop(0, "#f8fdff");
  pane.addColorStop(1, "#fff4c8");
  ctx.fillStyle = pane;
  ctx.fillRect(x, y, w, h);
}

function drawBucket() {
  const x = PLAYFIELD_LEFT;
  const y = PLAYFIELD_TOP_BASE;
  const w = PLAYFIELD_RIGHT - PLAYFIELD_LEFT;
  const h = floorY - y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const pane = ctx.createLinearGradient(0, y, 0, floorY);
  pane.addColorStop(0, "rgba(255, 255, 255, 0.12)");
  pane.addColorStop(0.54, "rgba(255, 238, 166, 0.04)");
  pane.addColorStop(1, "rgba(255, 186, 66, 0.1)");
  ctx.fillStyle = pane;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 22, y + 18, 18, Math.max(120, h - 90));
  ctx.fillRect(PLAYFIELD_RIGHT - 42, y + 28, 10, Math.max(90, h - 140));
  ctx.restore();

}

function drawGlassOverlay() {
  if (!glassOverlayImage.complete || glassOverlayImage.naturalWidth === 0) return;
  ctx.drawImage(glassOverlayImage, GLASS_RECT.x, GLASS_RECT.y, GLASS_RECT.w, glassBottomY() - GLASS_RECT.y);
}

function drawMachineShellTop() {
  if (!shellImage.complete || shellImage.naturalWidth === 0) return;
  ctx.drawImage(shellImage, 0, 0, LOGICAL_W, SHELL_PLAYFIELD_TOP, 0, 0, LOGICAL_W, SHELL_PLAYFIELD_TOP);
}

function drawMachineShellSidesAndBase() {
  if (!shellImage.complete || shellImage.naturalWidth === 0) return;
  const sourceMiddleH = SHELL_SOURCE_FLOOR - SHELL_PLAYFIELD_TOP;
  const bottomDestY = logicalH - SHELL_BOTTOM_H;
  const middleDestH = Math.max(1, bottomDestY - SHELL_PLAYFIELD_TOP);
  ctx.drawImage(shellImage, 0, SHELL_PLAYFIELD_TOP, SHELL_SIDE_W, sourceMiddleH, 0, SHELL_PLAYFIELD_TOP, SHELL_SIDE_W, middleDestH);
  ctx.drawImage(shellImage, LOGICAL_W - SHELL_SIDE_W, SHELL_PLAYFIELD_TOP, SHELL_SIDE_W, sourceMiddleH, LOGICAL_W - SHELL_SIDE_W, SHELL_PLAYFIELD_TOP, SHELL_SIDE_W, middleDestH);
  ctx.drawImage(shellImage, 0, SHELL_SOURCE_FLOOR, LOGICAL_W, SHELL_BOTTOM_H, 0, bottomDestY, LOGICAL_W, SHELL_BOTTOM_H);
}

function drawHudPreview() {
  drawFace(
    ctx,
    nextLevel,
    HUD_NEXT_RECT.x + HUD_NEXT_RECT.w / 2,
    HUD_NEXT_RECT.y + HUD_NEXT_RECT.h / 2,
    Math.min(32, faces[nextLevel - 1].radius),
    0,
  );
}

function drawCanvasControls() {
  drawControlButton(getSoundButtonKey(), CONTROL_RECTS.sound);
  drawControlButton(pressedControl === "pause" ? "btn_pause_pressed" : "btn_pause_normal", CONTROL_RECTS.pause);
  drawControlButton(pressedControl === "restart" ? "btn_restart_pressed" : "btn_restart_normal", CONTROL_RECTS.restart);
}

function getSoundButtonKey(): ControlButtonKey {
  if (soundMuted) return pressedControl === "sound" ? "btn_sound_off_pressed" : "btn_sound_off_normal";
  return pressedControl === "sound" ? "btn_sound_on_pressed" : "btn_sound_on_normal";
}

function drawControlButton(key: ControlButtonKey, rect: { x: number; y: number; w: number; h: number }) {
  const image = controlButtonImages.get(key);
  const y = bottomAnchoredY(rect.y);
  if (image?.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, rect.x, y, rect.w, rect.h);
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(255, 246, 206, 0.85)";
  ctx.beginPath();
  ctx.arc(rect.x + rect.w / 2, y + rect.h / 2, rect.w * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWarning() {
  const danger = warningTime > 0;
  ctx.save();
  if (warningLineImage.complete && warningLineImage.naturalWidth > 0) {
    const w = PLAYFIELD_RIGHT - PLAYFIELD_LEFT;
    const h = 40;
    ctx.globalAlpha = danger ? 1 : 0.72;
    ctx.drawImage(warningLineImage, PLAYFIELD_LEFT, warningY - h / 2, w, h);
    if (danger) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#f03d35";
      ctx.font = "700 24px Microsoft YaHei";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.ceil((3000 - warningTime) / 1000)} 秒`, LOGICAL_W / 2, warningY - 18);
    }
    ctx.restore();
    return;
  } else {
    ctx.strokeStyle = danger ? "#ff544f" : "rgba(255, 134, 120, 0.58)";
    ctx.setLineDash([18, 14]);
    ctx.lineWidth = danger ? 6 : 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(PLAYFIELD_LEFT + 24, warningY);
    ctx.lineTo(PLAYFIELD_RIGHT - 24, warningY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (danger) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#f03d35";
    ctx.font = "700 24px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.ceil((3000 - warningTime) / 1000)} 秒`, LOGICAL_W / 2, warningY - 18);
  }
  ctx.restore();
}

function drawDropGuide() {
  if (state !== "playing" || !canDrop) return;
  ctx.save();
  if (dropperHeadImage.complete && dropperHeadImage.naturalWidth > 0) {
    ctx.shadowColor = "rgba(57, 18, 28, 0.34)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    ctx.drawImage(dropperHeadImage, dropX - DROPPER_HEAD_W / 2, DROPPER_HEAD_Y, DROPPER_HEAD_W, DROPPER_HEAD_H);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.strokeStyle = "rgba(255, 116, 48, 0.92)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.setLineDash([1, 14]);
  ctx.beginPath();
  const lineStartY = DROPPER_HEAD_Y + DROPPER_HEAD_H - 10;
  ctx.moveTo(dropX, lineStartY);
  ctx.lineTo(dropX, Math.max(lineStartY, dropY - faces[currentLevel - 1].radius - 8));
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 246, 215, 0.78)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dropX, lineStartY);
  ctx.lineTo(dropX, Math.max(lineStartY, dropY - faces[currentLevel - 1].radius - 8));
  ctx.stroke();
  ctx.restore();
}

function updateStateClass() {
  document.body.classList.toggle("start-mode", state === "ready");
  document.body.classList.toggle("playing-mode", state === "playing");
  document.body.classList.toggle("paused-mode", state === "paused");
  document.body.classList.toggle("over-mode", state === "over");
}

function drawMergeBurst() {
  ctx.save();
  ctx.globalAlpha = mergeBurst;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(LOGICAL_W / 2, logicalH / 2, 130 * (1.1 - mergeBurst), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCoverImage(image: CanvasImageSource, x: number, y: number, w: number, h: number) {
  const sourceW = "naturalWidth" in image ? image.naturalWidth : w;
  const sourceH = "naturalHeight" in image ? image.naturalHeight : h;
  const sourceRatio = sourceW / sourceH;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = sourceW;
  let sh = sourceH;
  if (sourceRatio > targetRatio) {
    sw = sourceH * targetRatio;
    sx = (sourceW - sw) / 2;
  } else {
    sh = sourceW / targetRatio;
    sy = (sourceH - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

function drawParticles() {
  ctx.save();
  for (const particle of particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.strokeStyle = "rgba(38,49,61,0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawNext() {
  nextCtx.clearRect(0, 0, 80, 80);
  drawFace(nextCtx, nextLevel, 40, 40, Math.min(32, faces[nextLevel - 1].radius), 0);
}

function drawFace(target: CanvasRenderingContext2D, level: number, x: number, y: number, r: number, angle: number) {
  target.save();
  target.translate(x, y);
  target.rotate(angle);

  const image = faceImages.get(level);
  if (image?.complete && image.naturalWidth > 0) {
    const size = r * 2 * FACE_DRAW_SCALE;
    target.drawImage(image, -size / 2, -size / 2, size, size);
    target.restore();
    return;
  }

  if (level === 11) {
    drawYizai(target, r);
    target.restore();
    return;
  }

  const config = faces[level - 1];
  target.fillStyle = config.color;
  target.strokeStyle = "#26313d";
  target.lineWidth = Math.max(3, r * 0.08);
  target.beginPath();
  target.arc(0, 0, r, 0, Math.PI * 2);
  target.fill();
  target.stroke();

  switch (level) {
    case 1:
      eyes(target, -0.28 * r, -0.12 * r, 0.09 * r, 0.09 * r);
      eyes(target, 0.28 * r, -0.12 * r, 0.09 * r, 0.09 * r);
      mouth(target, 0, 0.24 * r, 0.22 * r, 0.03 * r);
      break;
    case 2:
      ears(target, r, "#f5e8ce");
      eyes(target, -0.28 * r, -0.05 * r, 0.08 * r, 0.13 * r);
      eyes(target, 0.28 * r, -0.05 * r, 0.08 * r, 0.13 * r);
      openMouth(target, 0, 0.26 * r, 0.18 * r);
      break;
    case 3:
      flatEyes(target, r);
      smirk(target, r);
      break;
    case 4:
      eyes(target, -0.34 * r, -0.18 * r, 0.12 * r, 0.08 * r);
      eyes(target, 0.22 * r, 0.0, 0.09 * r, 0.12 * r);
      target.rotate(-0.2);
      smirk(target, r * 1.05);
      break;
    case 5:
      eyes(target, -0.28 * r, -0.18 * r, 0.12 * r, 0.15 * r);
      eyes(target, 0.28 * r, -0.18 * r, 0.12 * r, 0.15 * r);
      openMouth(target, 0, 0.22 * r, 0.32 * r);
      cracks(target, r);
      break;
    case 6:
      cheek(target, -0.38 * r, 0.12 * r, r);
      cheek(target, 0.38 * r, 0.12 * r, r);
      happyEyes(target, r);
      openMouth(target, 0, 0.18 * r, 0.36 * r);
      break;
    case 7:
      wrinkles(target, r);
      tiredEyes(target, r);
      mouth(target, 0, 0.34 * r, 0.35 * r, 0.1 * r);
      break;
    case 8:
      lightning(target, r);
      eyes(target, -0.25 * r, -0.15 * r, 0.13 * r, 0.13 * r);
      eyes(target, 0.25 * r, -0.15 * r, 0.13 * r, 0.13 * r);
      openMouth(target, 0, 0.2 * r, 0.38 * r);
      break;
    case 9:
      happyEyes(target, r);
      openMouth(target, 0, 0.12 * r, 0.5 * r);
      break;
    case 10:
      wrinkles(target, r);
      lightning(target, r * 0.8);
      eyes(target, -0.3 * r, -0.12 * r, 0.15 * r, 0.1 * r);
      eyes(target, 0.22 * r, -0.2 * r, 0.1 * r, 0.17 * r);
      openMouth(target, 0.08 * r, 0.23 * r, 0.42 * r);
      smirk(target, r * 0.8);
      break;
  }
  target.restore();
}

function drawYizai(target: CanvasRenderingContext2D, r: number) {
  target.fillStyle = "#ffffff";
  target.strokeStyle = "#222a30";
  target.lineWidth = Math.max(4, r * 0.07);
  target.beginPath();
  target.arc(-0.52 * r, -0.48 * r, 0.26 * r, 0, Math.PI * 2);
  target.arc(0.52 * r, -0.48 * r, 0.26 * r, 0, Math.PI * 2);
  target.arc(0, 0, r, 0, Math.PI * 2);
  target.fill();
  target.stroke();

  target.fillStyle = "#ffd15c";
  target.beginPath();
  target.ellipse(0, 0.24 * r, 0.52 * r, 0.36 * r, 0, 0, Math.PI * 2);
  target.fill();
  target.stroke();

  target.fillStyle = "#171a1d";
  target.beginPath();
  target.ellipse(0, 0.06 * r, 0.17 * r, 0.12 * r, 0, 0, Math.PI * 2);
  target.fill();

  target.strokeStyle = "#171a1d";
  target.lineWidth = Math.max(4, r * 0.08);
  target.beginPath();
  target.moveTo(-0.5 * r, -0.24 * r);
  target.lineTo(-0.2 * r, -0.32 * r);
  target.moveTo(0.2 * r, -0.32 * r);
  target.lineTo(0.5 * r, -0.24 * r);
  target.stroke();

  eyes(target, -0.34 * r, -0.06 * r, 0.1 * r, 0.12 * r);
  eyes(target, 0.34 * r, -0.06 * r, 0.1 * r, 0.12 * r);
  smileLine(target, r);

  target.fillStyle = "#2c8fe8";
  target.strokeStyle = "#17212b";
  target.lineWidth = Math.max(3, r * 0.045);
  roundRect(target, -0.46 * r, -0.86 * r, 0.92 * r, 0.28 * r, 0.1 * r);
  target.fill();
  target.stroke();
  target.fillStyle = "#ffffff";
  target.font = `900 ${Math.max(14, r * 0.19)}px Arial`;
  target.textAlign = "center";
  target.textBaseline = "middle";
  target.fillText("MAEE", 0, -0.72 * r);
}

function ears(target: CanvasRenderingContext2D, r: number, color: string) {
  target.fillStyle = color;
  target.strokeStyle = "#26313d";
  target.beginPath();
  target.moveTo(-0.55 * r, -0.62 * r);
  target.lineTo(-0.2 * r, -0.88 * r);
  target.lineTo(-0.1 * r, -0.5 * r);
  target.closePath();
  target.fill();
  target.stroke();
  target.beginPath();
  target.moveTo(0.55 * r, -0.62 * r);
  target.lineTo(0.2 * r, -0.88 * r);
  target.lineTo(0.1 * r, -0.5 * r);
  target.closePath();
  target.fill();
  target.stroke();
}

function eyes(target: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  target.fillStyle = "#171a1d";
  target.beginPath();
  target.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  target.fill();
}

function flatEyes(target: CanvasRenderingContext2D, r: number) {
  target.strokeStyle = "#171a1d";
  target.lineWidth = Math.max(4, r * 0.08);
  target.beginPath();
  target.moveTo(-0.46 * r, -0.14 * r);
  target.lineTo(-0.18 * r, -0.1 * r);
  target.moveTo(0.18 * r, -0.1 * r);
  target.lineTo(0.46 * r, -0.14 * r);
  target.stroke();
}

function happyEyes(target: CanvasRenderingContext2D, r: number) {
  target.strokeStyle = "#171a1d";
  target.lineWidth = Math.max(4, r * 0.07);
  target.beginPath();
  target.arc(-0.28 * r, -0.12 * r, 0.16 * r, Math.PI, 0);
  target.arc(0.28 * r, -0.12 * r, 0.16 * r, Math.PI, 0);
  target.stroke();
}

function tiredEyes(target: CanvasRenderingContext2D, r: number) {
  target.strokeStyle = "#171a1d";
  target.lineWidth = Math.max(4, r * 0.06);
  target.beginPath();
  target.moveTo(-0.45 * r, -0.1 * r);
  target.quadraticCurveTo(-0.28 * r, -0.02 * r, -0.1 * r, -0.1 * r);
  target.moveTo(0.1 * r, -0.1 * r);
  target.quadraticCurveTo(0.28 * r, -0.02 * r, 0.45 * r, -0.1 * r);
  target.stroke();
}

function mouth(target: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  target.strokeStyle = "#171a1d";
  target.lineWidth = Math.max(3, w * 0.18);
  target.beginPath();
  target.moveTo(x - w / 2, y);
  target.quadraticCurveTo(x, y + h, x + w / 2, y);
  target.stroke();
}

function openMouth(target: CanvasRenderingContext2D, x: number, y: number, size: number) {
  target.fillStyle = "#351b21";
  target.beginPath();
  target.ellipse(x, y, size * 0.52, size * 0.72, 0, 0, Math.PI * 2);
  target.fill();
  target.fillStyle = "#ff6f8e";
  target.beginPath();
  target.ellipse(x, y + size * 0.22, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
  target.fill();
}

function smirk(target: CanvasRenderingContext2D, r: number) {
  target.strokeStyle = "#171a1d";
  target.lineWidth = Math.max(4, r * 0.06);
  target.beginPath();
  target.moveTo(-0.3 * r, 0.22 * r);
  target.quadraticCurveTo(0.1 * r, 0.42 * r, 0.44 * r, 0.16 * r);
  target.stroke();
}

function smileLine(target: CanvasRenderingContext2D, r: number) {
  target.strokeStyle = "#171a1d";
  target.lineWidth = Math.max(3, r * 0.04);
  target.beginPath();
  target.moveTo(-0.2 * r, 0.31 * r);
  target.quadraticCurveTo(0, 0.42 * r, 0.2 * r, 0.31 * r);
  target.stroke();
}

function cheek(target: CanvasRenderingContext2D, x: number, y: number, r: number) {
  target.fillStyle = "rgba(255, 109, 132, 0.5)";
  target.beginPath();
  target.ellipse(x, y, 0.15 * r, 0.1 * r, 0, 0, Math.PI * 2);
  target.fill();
}

function cracks(target: CanvasRenderingContext2D, r: number) {
  target.strokeStyle = "rgba(34, 43, 52, 0.55)";
  target.lineWidth = Math.max(2, r * 0.035);
  target.beginPath();
  target.moveTo(-0.08 * r, -0.72 * r);
  target.lineTo(-0.02 * r, -0.44 * r);
  target.lineTo(-0.14 * r, -0.2 * r);
  target.moveTo(0.32 * r, 0.48 * r);
  target.lineTo(0.16 * r, 0.28 * r);
  target.lineTo(0.28 * r, 0.1 * r);
  target.stroke();
}

function wrinkles(target: CanvasRenderingContext2D, r: number) {
  target.strokeStyle = "rgba(62, 48, 37, 0.42)";
  target.lineWidth = Math.max(2, r * 0.028);
  for (let i = 0; i < 4; i += 1) {
    const y = -0.45 * r + i * 0.12 * r;
    target.beginPath();
    target.moveTo(-0.38 * r, y);
    target.quadraticCurveTo(0, y + 0.08 * r, 0.38 * r, y);
    target.stroke();
  }
}

function lightning(target: CanvasRenderingContext2D, r: number) {
  target.fillStyle = "#ffe94a";
  target.strokeStyle = "#26313d";
  target.lineWidth = Math.max(2, r * 0.035);
  target.beginPath();
  target.moveTo(0.54 * r, -0.84 * r);
  target.lineTo(0.28 * r, -0.28 * r);
  target.lineTo(0.52 * r, -0.34 * r);
  target.lineTo(0.24 * r, 0.34 * r);
  target.lineTo(0.74 * r, -0.48 * r);
  target.lineTo(0.5 * r, -0.42 * r);
  target.closePath();
  target.fill();
  target.stroke();
}

function roundRect(target: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  target.beginPath();
  target.moveTo(x + radius, y);
  target.lineTo(x + w - radius, y);
  target.quadraticCurveTo(x + w, y, x + w, y + radius);
  target.lineTo(x + w, y + h - radius);
  target.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  target.lineTo(x + radius, y + h);
  target.quadraticCurveTo(x, y + h, x, y + h - radius);
  target.lineTo(x, y + radius);
  target.quadraticCurveTo(x, y, x + radius, y);
  target.closePath();
}

function getPointerX(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * LOGICAL_W;
  return clampDropX(x);
}

function clampDropX(x: number) {
  const radius = faces[currentLevel - 1].radius;
  return Math.max(PLAYFIELD_LEFT + radius, Math.min(PLAYFIELD_RIGHT - radius, x));
}

canvas.addEventListener("pointermove", (event) => {
  dropX = getPointerX(event);
});

canvas.addEventListener("pointerdown", (event) => {
  dropX = getPointerX(event);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointerup", (event) => {
  dropX = getPointerX(event);
  dropCurrent();
});

startBtn.addEventListener("click", resetGame);
soundToggleBtn.addEventListener("click", toggleSound);
pauseBtn.addEventListener("click", togglePause);
resumeBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", resetGame);
restartTopBtn.addEventListener("click", showRestartConfirm);
shareResultBtn.addEventListener("click", shareResult);
cancelRestartBtn.addEventListener("click", cancelRestartConfirm);
confirmRestartBtn.addEventListener("click", confirmRestart);
closeSystemPanelBtn.addEventListener("click", closeSystemPanel);
systemModalEl.addEventListener("click", (event) => {
  if (event.target === systemModalEl) closeSystemPanel();
});
for (const button of panelOpenButtons) {
  button.addEventListener("click", () => {
    const kind = button.dataset.openPanel;
    if (isPanelKind(kind)) openSystemPanel(kind);
  });
}

bindControlPress(soundToggleBtn, "sound");
bindControlPress(pauseBtn, "pause");
bindControlPress(restartTopBtn, "restart");

function bindControlPress(button: HTMLButtonElement, control: "sound" | "pause" | "restart") {
  button.addEventListener("pointerdown", (event) => {
    pressedControl = control;
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointerup", () => {
    pressedControl = "";
  });
  button.addEventListener("pointercancel", () => {
    pressedControl = "";
  });
  button.addEventListener("lostpointercapture", () => {
    pressedControl = "";
  });
}

window.addEventListener("keydown", (event) => {
  if (!systemModalEl.classList.contains("hidden") && event.key === "Escape") {
    closeSystemPanel();
    return;
  }
  if (event.key === " " || event.key === "Enter") dropCurrent();
  if (event.key === "ArrowLeft") dropX = clampDropX(dropX - 34);
  if (event.key === "ArrowRight") dropX = clampDropX(dropX + 34);
  if (event.key.toLowerCase() === "p") togglePause();
});
window.addEventListener("resize", setupCanvas);

setupCanvas();
loadFaceImages();
loadSounds();
saveGameSettings();
applySettings();
showReady();
(globalThis as any).__MERGE_YIZAI_TEST__ = {
  start: resetGame,
  forceMerge: forceMergeForTest,
  pause: togglePause,
  end: endGame,
  getState: () => ({
    state,
    score,
    best,
    maxLevel,
    currentLevel,
    nextLevel,
    resultHidden: resultEl.classList.contains("hidden"),
    startHidden: startEl.classList.contains("hidden"),
    pausedHidden: pausedEl.classList.contains("hidden"),
    soundMuted,
  }),
  toggleSound,
};
requestAnimationFrame(tick);
