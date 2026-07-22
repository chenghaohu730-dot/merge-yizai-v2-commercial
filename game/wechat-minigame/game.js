const Matter = require("./libs/matter.min.js");

const canvas = wx.createCanvas();
const ctx = canvas.getContext("2d");
const runtimeWindowInfo = getRuntimeWindowInfo();
const DPR = runtimeWindowInfo.pixelRatio;
const SCREEN_W = runtimeWindowInfo.windowWidth;
const SCREEN_H = runtimeWindowInfo.windowHeight;

canvas.width = Math.floor(SCREEN_W * DPR);
canvas.height = Math.floor(SCREEN_H * DPR);
ctx.scale(DPR, DPR);

const W = 750;
const BASE_H = 1334;
const scale = SCREEN_W / W;
const ox = 0;
const oy = 0;
const H = Math.max(BASE_H, Math.ceil(SCREEN_H / scale));

const WALL = 36;
const GLASS_RECT = { x: 61, y: 227, w: 628, h: 893 };
const PLAYFIELD_BG_RECT = { x: 53, y: 215, w: 644, bottomPad: 8 };
const PLAYFIELD_LEFT = 55;
const PLAYFIELD_RIGHT = 695;
const PLAYFIELD_TOP = 246;
const FLOOR_Y = bottomY(1120);
const SHELL_PLAYFIELD_TOP = 227;
const SHELL_SOURCE_FLOOR = 1120;
const SHELL_BOTTOM_H = BASE_H - SHELL_SOURCE_FLOOR;
const SHELL_SIDE_W = 82;
const HUD_SCORE_RECT = { x: 91, y: 96, w: 218, h: 92 };
const HUD_BEST_RECT = { x: 333, y: 96, w: 218, h: 92 };
const HUD_NEXT_RECT = { x: 565, y: 95, w: 108, h: 108 };
const CONTROL_SIZE = 104;
const CONTROL_RECTS = {
  sound: { x: 180, y: 1160, size: CONTROL_SIZE },
  pause: { x: 323, y: 1160, size: CONTROL_SIZE },
  restart: { x: 460, y: 1160, size: CONTROL_SIZE },
};
const DROP_Y = 310;
const WARNING_Y = 360;
const FACE_DRAW_SCALE = 1;
const DROPPER_HEAD_W = 96;
const DROPPER_HEAD_H = 100;
const DROPPER_HEAD_Y = 205;
const START_BUTTON_X = 115;
const START_BUTTON_Y_RATIO = 975 / BASE_H;
const START_BUTTON_W = 520;
const START_BUTTON_H = 160;

function sy(value) {
  return Math.round(value);
}

function bottomY(value) {
  return Math.max(value, Math.round(H - (BASE_H - value)));
}

function getControlRect(action) {
  const rect = CONTROL_RECTS[action];
  return { ...rect, y: bottomY(rect.y) };
}

function getRuntimeWindowInfo() {
  const windowInfo = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : {};
  const deviceInfo = typeof wx.getDeviceInfo === "function" ? wx.getDeviceInfo() : {};
  return {
    pixelRatio: windowInfo.pixelRatio || deviceInfo.pixelRatio || 1,
    windowWidth: windowInfo.windowWidth || windowInfo.screenWidth || 375,
    windowHeight: windowInfo.windowHeight || windowInfo.screenHeight || 667,
  };
}

const faces = [
  { level: 1, name: "芽芽豆", radius: 28, color: "#56c7a6", score: 0, asset: "assets/faces/face_01_sprout_bead.png" },
  { level: 2, name: "桃桃泡芙", radius: 35, color: "#f5e8ce", score: 2, asset: "assets/faces/face_02_peach_puff.png" },
  { level: 3, name: "心心果冻", radius: 44, color: "#f5a8be", score: 5, asset: "assets/faces/face_03_heart_jelly.png" },
  { level: 4, name: "阳光摇摇", radius: 55, color: "#ffbf48", score: 10, asset: "assets/faces/face_04_sun_wiggle.png" },
  { level: 5, name: "蓝莓惊惊", radius: 68, color: "#4fa8f5", score: 20, asset: "assets/faces/face_05_sky_spark.png" },
  { level: 6, name: "奶油笑笑", radius: 82, color: "#ffd866", score: 40, asset: "assets/faces/face_06_cream_smile.png" },
  { level: 7, name: "小芽贤者", radius: 100, color: "#cbb79a", score: 80, asset: "assets/faces/face_07_seed_sage.png" },
  { level: 8, name: "葡萄电电", radius: 120, color: "#b899ff", score: 160, asset: "assets/faces/face_08_grape_zap.png" },
  { level: 9, name: "火苗哈哈", radius: 145, color: "#ff795d", score: 320, asset: "assets/faces/face_09_flame_grin.png" },
  { level: 10, name: "星冠团团", radius: 174, color: "#6a5cf6", score: 640, asset: "assets/faces/face_10_crown_star.png" },
  { level: 11, name: "亿仔", radius: 205, color: "#ffffff", score: 1280, asset: "assets/faces/face_11_yizai.png" },
];

const DAILY_TARGET_LEVEL = 5;
const STATS_KEY = "mergeYizaiPlayerStats";
const SOUND_MUTED_KEY = "mergeYizaiSoundMuted";
const SETTINGS_KEY = "mergeYizaiSettings";
const LEADERBOARD_KEY = "mergeYizaiLocalLeaderboard";
const ACHIEVEMENTS_KEY = "mergeYizaiAchievements";
const LEADERBOARD_LIMIT = 10;
const SETTINGS_ROWS = [
  { id: "sound", label: "声音", desc: "音效和背景音乐" },
  { id: "dropGuide", label: "掉落指引", desc: "显示头像落点辅助线" },
  { id: "haptic", label: "轻震反馈", desc: "解锁成就时轻微震动" },
];
const ACHIEVEMENT_DEFS = [
  { id: "first_run", title: "初次开合", desc: "完成 1 局挑战", test: (run) => run.played >= 1 },
  { id: "score_1000", title: "千分小目标", desc: "单局分数达到 1000", test: (run) => run.score >= 1000 },
  { id: "level_5", title: "稳定合成", desc: `单局合成到 ${faces[DAILY_TARGET_LEVEL - 1].name}`, test: (run) => run.maxLevel >= DAILY_TARGET_LEVEL },
  { id: "level_8", title: "高阶上手", desc: `单局合成到 ${faces[7].name}`, test: (run) => run.maxLevel >= 8 },
  { id: "meet_yizai", title: "见到亿仔", desc: "单局合成出亿仔", test: (run) => run.maxLevel >= 11 },
  { id: "play_5", title: "熟练开局", desc: "累计完成 5 局挑战", test: (run) => run.played >= 5 },
];
const PANEL_LAYOUT = {
  width: 620,
  minTop: 92,
  screenMarginY: 160,
  heights: { settings: 860, leaderboard: 800, achievements: 760 },
  titleY: 102,
  bodyTop: 116,
  bodyBottom: 48,
};
const PANEL_CLOSE_LAYOUT = { right: 86, top: 20, size: 64 };
const SETTINGS_PANEL_LAYOUT = { x: 30, y: 146, w: 560, h: 112, step: 122, textX: 30, toggleW: 180, toggleH: 86 };
const LEADERBOARD_PANEL_LAYOUT = { x: 30, y: 136, w: 560, h: 96, step: 104, maxBottomPad: 52 };
const ACHIEVEMENTS_PANEL_LAYOUT = { x: 30, countY: 124, y: 156, w: 560, h: 90, sourceH: 120, step: 92, badge: 56 };
const soundFiles = {
  drop: "assets/audio/drop.wav",
  merge: "assets/audio/merge.wav",
  bigMerge: "assets/audio/big_merge.wav",
  yizai: "assets/audio/yizai.wav",
  gameOver: "assets/audio/game_over.wav",
  button: "assets/audio/button.wav",
  bgm: "assets/audio/bgm.mp3",
};

const images = new Map();
const sounds = new Map();
let engine;
let state = "ready";
let currentLevel = 1;
let nextLevel = 1;
let dropX = W / 2;
let canDrop = true;
let score = 0;
let best = Number(wx.getStorageSync("mergeYizaiBest") || 0);
let maxLevel = 1;
let warningTime = 0;
let lastTime = Date.now();
let particles = [];
let toast = "";
let toastTimer = 0;
let stats = loadPlayerStats();
let settings = loadSettings();
let soundMuted = Boolean(settings.soundMuted) || wx.getStorageSync(SOUND_MUTED_KEY) === "1";
settings.soundMuted = soundMuted;
saveSettings();
let localLeaderboard = loadLocalLeaderboard();
let achievements = loadAchievements();
let startButtonPressed = false;
let pressedControl = "";
let activePanel = "";

loadImages();
loadSounds();
setupShare();
setupWorld();
loop();

wx.onTouchStart((event) => {
  const p = event.touches[0];
  handleTouch(p.clientX, p.clientY, true);
});

wx.onTouchMove((event) => {
  if (activePanel) return;
  const p = event.touches[0];
  if (state === "ready") {
    const wxp = toWorldX(p.clientX);
    const wyp = toWorldY(p.clientY);
    const button = getStartButtonRect();
    startButtonPressed = insideCapsule(wxp, wyp, button.x, button.y, button.w, button.h);
    return;
  }
  if (state !== "playing") return;
  dropX = clampDropX(toWorldX(p.clientX));
});

wx.onTouchEnd((event) => {
  const p = event.changedTouches[0];
  handleTouch(p.clientX, p.clientY, false);
});

function loadImages() {
  for (const face of faces) {
    const img = wx.createImage();
    img.src = face.asset;
    images.set(face.level, img);
  }
  const shell = wx.createImage();
  shell.src = "assets/ui/game_shell.png";
  images.set("game_shell", shell);
  const playfieldBg = wx.createImage();
  playfieldBg.src = "assets/ui/game_playfield_bg.jpg";
  images.set("game_playfield_bg", playfieldBg);
  const glassOverlay = wx.createImage();
  glassOverlay.src = "assets/ui/glass_overlay.png";
  images.set("glass_overlay", glassOverlay);
  const homeMainBg = wx.createImage();
  homeMainBg.src = "assets/ui/home_bg_main.jpg";
  images.set("home_bg_main", homeMainBg);
  const dropper = wx.createImage();
  dropper.src = "assets/ui/dropper_head.png";
  images.set("dropper_head", dropper);
  for (const [key, src] of [
    ["progress_bar", "assets/ui/progress_bar.png"],
    ["score_panel", "assets/ui/score_panel.png"],
    ["btn_sound_on_normal", "assets/ui/btn_sound_on_normal.png"],
    ["btn_sound_on_pressed", "assets/ui/btn_sound_on_pressed.png"],
    ["btn_sound_off_normal", "assets/ui/btn_sound_off_normal.png"],
    ["btn_sound_off_pressed", "assets/ui/btn_sound_off_pressed.png"],
    ["btn_pause_normal", "assets/ui/btn_pause_normal.png"],
    ["btn_pause_pressed", "assets/ui/btn_pause_pressed.png"],
    ["btn_restart_normal", "assets/ui/btn_restart_normal.png"],
    ["btn_restart_pressed", "assets/ui/btn_restart_pressed.png"],
    ["btn_start_normal", "assets/ui/btn_start_normal.png"],
    ["btn_start_pressed", "assets/ui/btn_start_pressed.png"],
    ["button_continue", "assets/ui/button_continue.png"],
    ["warning_line", "assets/ui/warning_line.png"],
    ["btn_settings_normal", "assets/ui/btn_settings_normal.png"],
    ["btn_settings_pressed", "assets/ui/btn_settings_pressed.png"],
    ["btn_rank_normal", "assets/ui/btn_rank_normal.png"],
    ["btn_rank_pressed", "assets/ui/btn_rank_pressed.png"],
    ["btn_achievement_normal", "assets/ui/btn_achievement_normal.png"],
    ["btn_achievement_pressed", "assets/ui/btn_achievement_pressed.png"],
    ["icon_settings", "assets/ui/icon_settings.png"],
    ["icon_rank", "assets/ui/icon_rank.png"],
    ["icon_achievement", "assets/ui/icon_achievement.png"],
    ["close_button", "assets/ui/close_button.png"],
    ["settings_panel_frame", "assets/ui/settings_panel_frame.png"],
    ["rank_panel_frame", "assets/ui/rank_panel_frame.png"],
    ["achievement_panel_frame", "assets/ui/achievement_panel_frame.png"],
    ["settings_panel", "assets/ui/settings_panel.png"],
    ["rank_panel", "assets/ui/rank_panel.png"],
    ["achievement_panel", "assets/ui/achievement_panel.png"],
    ["toggle_on", "assets/ui/toggle_on.png"],
    ["toggle_off", "assets/ui/toggle_off.png"],
    ["setting_row", "assets/ui/setting_row.png"],
    ["rank_row", "assets/ui/rank_row.png"],
    ["achievement_row_unlocked", "assets/ui/achievement_row_unlocked.png"],
    ["achievement_row_locked", "assets/ui/achievement_row_locked.png"],
    ["rank_item", "assets/ui/rank_item.png"],
    ["achievement_item_unlocked", "assets/ui/achievement_item_unlocked.png"],
    ["achievement_item_locked", "assets/ui/achievement_item_locked.png"],
    ["achievement_badge_01", "assets/ui/achievement_badge_01.png"],
    ["achievement_badge_02", "assets/ui/achievement_badge_02.png"],
    ["achievement_badge_03", "assets/ui/achievement_badge_03.png"],
    ["achievement_badge_04", "assets/ui/achievement_badge_04.png"],
    ["achievement_badge_05", "assets/ui/achievement_badge_05.png"],
    ["achievement_badge_06", "assets/ui/achievement_badge_06.png"],
  ]) {
    const img = wx.createImage();
    img.src = src;
    images.set(key, img);
  }
}

function loadSounds() {
  if (!wx.createInnerAudioContext) return;
  for (const key of Object.keys(soundFiles)) {
    const audio = wx.createInnerAudioContext();
    audio.src = soundFiles[key];
    audio.loop = key === "bgm";
    audio.volume = key === "bgm" ? 0.24 : key === "gameOver" ? 0.45 : 0.55;
    sounds.set(key, audio);
  }
}

function playSound(key) {
  if (soundMuted) return;
  const audio = sounds.get(key);
  if (!audio) return;
  try {
    if (key !== "bgm") {
      audio.stop();
      audio.seek(0);
    }
    audio.play();
  } catch (error) {
    // Audio failures should not interrupt gameplay.
  }
}

function updateBgm() {
  const bgm = sounds.get("bgm");
  if (!bgm) return;
  try {
    if (soundMuted || state !== "playing") {
      bgm.pause();
      return;
    }
    bgm.play();
  } catch (error) {
    // BGM failures should not interrupt gameplay.
  }
}

function toggleSound() {
  setSoundMuted(!soundMuted);
  showToast(soundMuted ? "已静音" : "声音已开");
}

function setSoundMuted(value) {
  soundMuted = Boolean(value);
  settings.soundMuted = soundMuted;
  saveSettings();
  wx.setStorageSync(SOUND_MUTED_KEY, soundMuted ? "1" : "0");
  if (!soundMuted) playSound("button");
  updateBgm();
}

function defaultSettings() {
  return {
    soundMuted: false,
    dropGuide: true,
    haptic: true,
  };
}

function loadSettings() {
  const saved = readStorageValue(SETTINGS_KEY, {});
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return defaultSettings();
  return { ...defaultSettings(), ...saved };
}

function saveSettings() {
  wx.setStorageSync(SETTINGS_KEY, settings);
}

function readStorageValue(key, fallback) {
  try {
    const raw = wx.getStorageSync(key);
    if (raw === "" || raw === undefined || raw === null) return fallback;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (error) {
    return fallback;
  }
}

function todayId() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function defaultStats() {
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

function loadPlayerStats() {
  try {
    const raw = wx.getStorageSync(STATS_KEY);
    const saved = raw ? { ...defaultStats(), ...(typeof raw === "string" ? JSON.parse(raw) : raw) } : defaultStats();
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
  } catch (error) {
    return defaultStats();
  }
}

function savePlayerStats() {
  wx.setStorageSync(STATS_KEY, stats);
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
}

function loadLocalLeaderboard() {
  const saved = readStorageValue(LEADERBOARD_KEY, []);
  const records = Array.isArray(saved) ? saved : Array.isArray(saved.records) ? saved.records : [];
  return records.map(normalizeLeaderboardEntry).filter(Boolean).sort(compareLeaderboard).slice(0, LEADERBOARD_LIMIT);
}

function normalizeLeaderboardEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const safeScore = Math.max(0, Number(entry.score) || 0);
  const safeLevel = Math.max(1, Math.min(11, Number(entry.maxLevel) || 1));
  const timestamp = Number(entry.timestamp) || Date.now();
  return {
    score: safeScore,
    maxLevel: safeLevel,
    maxLevelName: entry.maxLevelName || faces[safeLevel - 1].name,
    date: entry.date || formatDateTime(new Date(timestamp)),
    timestamp,
  };
}

function compareLeaderboard(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
  return b.timestamp - a.timestamp;
}

function saveLocalLeaderboard() {
  wx.setStorageSync(LEADERBOARD_KEY, localLeaderboard);
}

function recordLocalLeaderboard(run) {
  localLeaderboard = [run, ...localLeaderboard].map(normalizeLeaderboardEntry).filter(Boolean).sort(compareLeaderboard).slice(0, LEADERBOARD_LIMIT);
  saveLocalLeaderboard();
}

function defaultAchievements() {
  return {
    unlocked: {},
    updatedAt: "",
  };
}

function loadAchievements() {
  const saved = readStorageValue(ACHIEVEMENTS_KEY, {});
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return defaultAchievements();
  const unlocked = saved.unlocked && typeof saved.unlocked === "object" && !Array.isArray(saved.unlocked) ? saved.unlocked : {};
  return {
    ...defaultAchievements(),
    ...saved,
    unlocked,
  };
}

function saveAchievements() {
  wx.setStorageSync(ACHIEVEMENTS_KEY, achievements);
}

function recordAchievements(run) {
  const unlocked = { ...achievements.unlocked };
  const newlyUnlocked = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (unlocked[def.id] || !def.test(run)) continue;
    unlocked[def.id] = run.date;
    newlyUnlocked.push(def.title);
  }
  if (newlyUnlocked.length === 0) return [];
  achievements = {
    ...achievements,
    unlocked,
    updatedAt: run.date,
  };
  saveAchievements();
  vibrateShort();
  return newlyUnlocked;
}

function getAchievementProgress(def) {
  if (achievements.unlocked[def.id]) return 1;
  const current = {
    first_run: stats.played,
    score_1000: Math.max(score, stats.dailyBestScore),
    level_5: Math.max(maxLevel, stats.dailyBestLevel),
    level_8: Math.max(maxLevel, stats.dailyBestLevel),
    meet_yizai: Math.max(maxLevel >= 11 ? 1 : 0, stats.yizaiCount > 0 ? 1 : 0),
    play_5: stats.played,
  }[def.id] || 0;
  const target = {
    first_run: 1,
    score_1000: 1000,
    level_5: DAILY_TARGET_LEVEL,
    level_8: 8,
    meet_yizai: 1,
    play_5: 5,
  }[def.id] || 1;
  return Math.max(0, Math.min(1, current / target));
}

function formatDateTime(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function vibrateShort() {
  if (!settings.haptic || !wx.vibrateShort) return;
  try {
    wx.vibrateShort({ type: "light" });
  } catch (error) {
    // Haptic feedback is optional on unsupported runtimes.
  }
}

function setupWorld() {
  engine = Matter.Engine.create({ gravity: { x: 0, y: 1.05 } });
  engine.enableSleeping = true;
  Matter.Composite.add(engine.world, [
    Matter.Bodies.rectangle(PLAYFIELD_LEFT - WALL / 2, H / 2, WALL, H * 2, { isStatic: true }),
    Matter.Bodies.rectangle(PLAYFIELD_RIGHT + WALL / 2, H / 2, WALL, H * 2, { isStatic: true }),
    Matter.Bodies.rectangle(W / 2, FLOOR_Y + WALL / 2, PLAYFIELD_RIGHT - PLAYFIELD_LEFT + WALL * 2, WALL, { isStatic: true }),
  ]);
  Matter.Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      if (!a.faceLevel || !b.faceLevel || a.faceLevel !== b.faceLevel) continue;
      if (a.merging || b.merging || a.faceLevel > 11 || state !== "playing") continue;
      a.merging = true;
      b.merging = true;
      setTimeout(() => mergeFaces(a, b), 70);
    }
  });
}

function resetGame() {
  playSound("button");
  setupWorld();
  state = "playing";
  pressedControl = "";
  updateBgm();
  currentLevel = weightedLevel();
  nextLevel = weightedLevel();
  dropX = W / 2;
  canDrop = true;
  score = 0;
  maxLevel = 1;
  warningTime = 0;
  particles = [];
  toast = "";
}

function weightedLevel() {
  const roll = Math.random();
  if (roll < 0.45) return 1;
  if (roll < 0.75) return 2;
  if (roll < 0.93) return 3;
  return 4;
}

function makeFace(level, x, y) {
  const config = faces[level - 1];
  const body = Matter.Bodies.circle(x, y, config.radius, {
    restitution: 0.2,
    friction: 0.58,
    frictionAir: 0.012,
    slop: 0.01,
    density: 0.0012 + level * 0.00008,
  });
  body.faceLevel = level;
  return body;
}

function dropCurrent() {
  if (!canDrop || state !== "playing") return;
  canDrop = false;
  playSound("drop");
  Matter.Composite.add(engine.world, makeFace(currentLevel, dropX, DROP_Y));
  setTimeout(() => {
    currentLevel = nextLevel;
    nextLevel = weightedLevel();
    canDrop = true;
  }, 430);
}

function mergeFaces(a, b) {
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
    spawnParticles(x, y, "#ffdf55", 36);
    return;
  }

  const merged = makeFace(next, x, y);
  Matter.Body.setVelocity(merged, { x: 0, y: -2.3 });
  Matter.Composite.add(engine.world, merged);
  addScore(faces[next - 1].score);
  maxLevel = Math.max(maxLevel, next);
  showToast(`合成 ${faces[next - 1].name}`);
  playSound(next >= 8 ? "bigMerge" : "merge");
  spawnParticles(x, y, faces[next - 1].color, next >= 8 ? 28 : 16);
}

function addScore(value) {
  score += value;
  if (score > best) {
    best = score;
    wx.setStorageSync("mergeYizaiBest", best);
  }
}

function setupShare() {
  if (wx.showShareMenu) {
    wx.showShareMenu({ withShareTicket: true });
  }
  if (wx.onShareAppMessage) {
    wx.onShareAppMessage(() => ({
      title: maxLevel >= 11 ? `我合出了亿仔，得分 ${score}` : `我在合成亿仔冲到了 ${score} 分`,
      imageUrl: "assets/ui/share_card.png",
      query: "from=share",
    }));
  }
}

function shareScore() {
  playSound("button");
  const title = maxLevel >= 11 ? `我合出了亿仔，得分 ${score}` : `我在合成亿仔冲到了 ${score} 分`;
  if (wx.shareAppMessage) {
    wx.shareAppMessage({ title, imageUrl: "assets/ui/share_card.png", query: "from=result" });
    return;
  }
  showToast("点右上角分享");
}

function handleTouch(x, y, isStart) {
  const wxp = toWorldX(x);
  const wyp = toWorldY(y);
  if (activePanel) {
    handlePanelTouch(wxp, wyp, isStart);
    return;
  }
  if (state === "ready") {
    const button = getStartButtonRect();
    const hitStart = insideCapsule(wxp, wyp, button.x, button.y, button.w, button.h);
    const menuAction = getStartMenuHit(wxp, wyp);
    if (isStart) {
      startButtonPressed = hitStart;
      return;
    }
    if (menuAction) {
      startButtonPressed = false;
      openPanel(menuAction);
      return;
    }
    if (startButtonPressed && hitStart) {
      startButtonPressed = false;
      resetGame();
      return;
    }
    startButtonPressed = false;
    return;
  }
  startButtonPressed = false;
  if (state === "over") {
    if (isStart) return;
    const action = getResultAction(wxp, wyp);
    if (action === "restart") resetGame();
    if (action === "share") shareScore();
    if (action === "leaderboard") openPanel("leaderboard");
    if (action === "achievements") openPanel("achievements");
    return;
  }
  if (state === "confirmRestart") {
    if (isStart) return;
    if (insideCapsule(wxp, wyp, 215, 744, 320, 58)) {
      playSound("button");
      state = "playing";
      updateBgm();
      return;
    }
    if (insideCapsule(wxp, wyp, 215, 828, 320, 58)) {
      resetGame();
    }
    return;
  }
  if (state === "paused") {
    if (!isStart && insideCapsuleRect(wxp, wyp, getPauseSettingsButtonRect())) {
      openPanel("settings");
      return;
    }
    if (!isStart && insideCapsule(wxp, wyp, 168, 760, 414, 90)) {
      playSound("button");
      state = "playing";
      updateBgm();
    }
    return;
  }
  if (state === "playing") {
    if (isStart) {
      pressedControl = getControlHit(wxp, wyp);
      dropX = clampDropX(wxp);
      return;
    }
    const releasedControl = getControlHit(wxp, wyp);
    if (pressedControl) {
      const action = pressedControl;
      pressedControl = "";
      if (action === releasedControl) runControlAction(action);
      return;
    }
    if (!isStart && releasedControl) {
      runControlAction(releasedControl);
      return;
    }
    dropX = clampDropX(wxp);
    if (!isStart) dropCurrent();
  }
}

function openPanel(panel) {
  playSound("button");
  activePanel = panel;
  pressedControl = "";
  startButtonPressed = false;
}

function closePanel() {
  playSound("button");
  activePanel = "";
}

function handlePanelTouch(x, y, isStart) {
  if (isStart) return;
  const close = getPanelCloseRect();
  if (inside(x, y, close.x, close.y, close.w, close.h)) {
    closePanel();
    return;
  }
  if (activePanel === "settings") {
    const row = getSettingsRowHit(x, y);
    if (row) toggleSetting(row.id);
  }
}

function toggleSetting(id) {
  if (id === "sound") {
    toggleSound();
    return;
  }
  settings[id] = !settings[id];
  saveSettings();
  playSound("button");
  showToast(settings[id] ? "已开启" : "已关闭");
}

function getControlHit(x, y) {
  if (insideRect(x, y, getControlRect("sound"))) return "sound";
  if (insideRect(x, y, getControlRect("pause"))) return "pause";
  if (insideRect(x, y, getControlRect("restart"))) return "restart";
  return "";
}

function runControlAction(action) {
  if (action === "sound") {
    toggleSound();
    return;
  }
  if (action === "pause") {
    playSound("button");
    state = "paused";
    updateBgm();
    return;
  }
  if (action === "restart") {
    playSound("button");
    pressedControl = "";
    state = "confirmRestart";
    updateBgm();
  }
}

function insideCircle(x, y, rect) {
  const cx = rect.x + rect.size / 2;
  const cy = rect.y + rect.size / 2;
  const radius = rect.size * 0.44;
  return Math.hypot(x - cx, y - cy) <= radius;
}

function insideRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.size && y >= rect.y && y <= rect.y + rect.size;
}

function insideCapsule(x, y, bx, by, bw, bh) {
  if (x < bx || x > bx + bw || y < by || y > by + bh) return false;
  const r = bh / 2;
  const cy = by + r;
  const leftCx = bx + r;
  const rightCx = bx + bw - r;
  if (x >= leftCx && x <= rightCx) return true;
  const cx = x < leftCx ? leftCx : rightCx;
  return Math.hypot(x - cx, y - cy) <= r;
}

function insideCapsuleRect(x, y, rect) {
  return insideCapsule(x, y, rect.x, rect.y, rect.w, rect.h);
}

function inside(x, y, bx, by, bw, bh) {
  return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
}

function toWorldX(x) {
  return Math.max(70, Math.min(W - 70, (x - ox) / scale));
}

function clampDropX(x) {
  const radius = faces[currentLevel - 1].radius;
  return Math.max(PLAYFIELD_LEFT + radius, Math.min(PLAYFIELD_RIGHT - radius, x));
}

function toWorldY(y) {
  return (y - oy) / scale;
}

function loop() {
  const now = Date.now();
  const dt = Math.min(32, now - lastTime);
  lastTime = now;
  if (state === "playing") {
    Matter.Engine.update(engine, Math.min(16.667, dt));
    checkWarning(dt);
    updateParticles(dt);
  }
  draw();
  requestAnimationFrame(loop);
}

function checkWarning(dt) {
  const active = Matter.Composite.allBodies(engine.world).filter((body) => body.faceLevel);
  const over = active.some((body) => {
    const radius = faces[body.faceLevel - 1].radius;
    return body.position.y - radius < WARNING_Y && body.speed < 1.5;
  });
  warningTime = over ? warningTime + dt : Math.max(0, warningTime - dt * 1.5);
  if (warningTime >= 3000) endGame();
}

function endGame() {
  if (state === "over") return;
  state = "over";
  playSound("gameOver");
  updateBgm();
  const finishedAt = new Date();
  const run = {
    score,
    maxLevel,
    maxLevelName: faces[maxLevel - 1].name,
    date: formatDateTime(finishedAt),
    timestamp: finishedAt.getTime(),
  };
  commitRunStats();
  recordLocalLeaderboard(run);
  const unlocked = recordAchievements({ ...run, played: stats.played, yizaiCount: stats.yizaiCount, streak: stats.streak });
  if (unlocked.length > 0) showToast(`解锁成就：${unlocked[0]}`);
}

function updateParticles(dt) {
  toastTimer = Math.max(0, toastTimer - dt);
  if (toastTimer === 0) toast = "";
  particles = particles
    .map((p) => ({ ...p, x: p.x + p.vx * (dt / 16.667), y: p.y + p.vy * (dt / 16.667), vy: p.vy + 0.22, life: p.life - dt }))
    .filter((p) => p.life > 0);
}

function showToast(text) {
  toast = text;
  toastTimer = 900;
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 7;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3, life: 720, maxLife: 720, color, size: 4 + Math.random() * 7 });
  }
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  drawGame();
  if (state === "ready") drawStart();
  if (state === "paused") drawPaused();
  if (state === "confirmRestart") drawRestartConfirm();
  if (state === "over") drawResult();
  if (activePanel) drawActivePanel();
  ctx.restore();
}

function drawGame() {
  drawGameBackdrop();
  drawPlayfieldBackdrop();
  drawMachineShellTop();

  drawBucket();
  drawDropGuide();

  for (const body of Matter.Composite.allBodies(engine.world)) {
    if (body.faceLevel) drawFace(body.faceLevel, body.position.x, body.position.y, faces[body.faceLevel - 1].radius, body.angle);
  }
  if (state === "playing" && canDrop) {
    drawFace(currentLevel, dropX, DROP_Y, faces[currentLevel - 1].radius, 0);
  }
  drawMachineShellSidesAndBase();
  drawParticles();
  drawGlassOverlay();
  drawWarning();
  drawHud();
  if (toast) drawToast();
  drawPauseButton();
}

function drawHud() {
  drawText("分数", HUD_SCORE_RECT.x + HUD_SCORE_RECT.w / 2, HUD_SCORE_RECT.y + 28, 17, "#9a5127", "center", "bold");
  drawText(String(score), HUD_SCORE_RECT.x + HUD_SCORE_RECT.w / 2, HUD_SCORE_RECT.y + 66, 42, "#7b3a20", "center", "bold");
  drawText("最高", HUD_BEST_RECT.x + HUD_BEST_RECT.w / 2, HUD_BEST_RECT.y + 28, 17, "#9a5127", "center", "bold");
  drawText(String(best), HUD_BEST_RECT.x + HUD_BEST_RECT.w / 2, HUD_BEST_RECT.y + 66, 38, "#7b3a20", "center", "bold");
  drawFace(nextLevel, HUD_NEXT_RECT.x + HUD_NEXT_RECT.w / 2, HUD_NEXT_RECT.y + HUD_NEXT_RECT.h / 2, Math.min(32, faces[nextLevel - 1].radius), 0);
}

function drawProgressBar() {
  drawUiImage("progress_bar", 119, sy(206), 512, 48);
  for (let i = 0; i < faces.length; i += 1) {
    if (faces[i].level > maxLevel) continue;
    drawFace(faces[i].level, 145 + i * 43.5, sy(230), 14, 0);
  }
}

function drawMissionRibbon() {
  const done = stats.dailyCleared || maxLevel >= DAILY_TARGET_LEVEL;
  const y = sy(1130);
  drawUiImage("score_panel", 36, y, 168, 72);
  drawText("今日目标", 120, y + 24, 17, "#6c5d48", "center", "bold");
  drawText(done ? `已完成 ${Math.max(stats.streak, 1)}天` : `合成${DAILY_TARGET_LEVEL}级`, 120, y + 52, 20, done ? "#2e7c65" : "#2b3136", "center", "bold");
  drawUiImage("score_panel", 546, y, 168, 72);
  drawText(`挑战 ${stats.played}局`, 630, y + 24, 17, "#6c5d48", "center", "bold");
  drawText(`亿仔 ${stats.yizaiCount}次`, 630, y + 52, 20, "#2b3136", "center", "bold");
}

function drawBucket() {
  const x = PLAYFIELD_LEFT;
  const y = PLAYFIELD_TOP;
  const w = PLAYFIELD_RIGHT - PLAYFIELD_LEFT;
  const h = FLOOR_Y - y;
  const pane = ctx.createLinearGradient(0, y, 0, FLOOR_Y);
  pane.addColorStop(0, "rgba(255,255,255,0.12)");
  pane.addColorStop(0.54, "rgba(255,238,166,0.04)");
  pane.addColorStop(1, "rgba(255,186,66,0.1)");
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = pane;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 22, y + 18, 18, Math.max(120, h - 90));
  ctx.fillRect(PLAYFIELD_RIGHT - 42, y + 28, 10, Math.max(90, h - 140));
  ctx.restore();
}

function drawGameBackdrop() {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#b9efff");
  bg.addColorStop(0.45, "#ffe9a3");
  bg.addColorStop(1, "#f3a64b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
}

function drawPlayfieldBackdrop() {
  const x = PLAYFIELD_BG_RECT.x;
  const y = PLAYFIELD_BG_RECT.y;
  const w = PLAYFIELD_BG_RECT.w;
  const h = Math.max(240, getGlassBottomY() - PLAYFIELD_BG_RECT.y + PLAYFIELD_BG_RECT.bottomPad);
  const bg = images.get("game_playfield_bg");
  if (bg) {
    drawImageCover(bg, x, y, w, h);
    return;
  }
  const pane = ctx.createLinearGradient(0, y, 0, y + h);
  pane.addColorStop(0, "#f8fdff");
  pane.addColorStop(1, "#fff4c8");
  ctx.fillStyle = pane;
  ctx.fillRect(x, y, w, h);
}

function getGlassBottomY() {
  return bottomY(GLASS_RECT.y + GLASS_RECT.h);
}

function drawGlassOverlay() {
  const overlay = images.get("glass_overlay");
  if (!overlay) return;
  ctx.drawImage(overlay, GLASS_RECT.x, GLASS_RECT.y, GLASS_RECT.w, getGlassBottomY() - GLASS_RECT.y);
}

function drawMachineShellTop() {
  const shell = images.get("game_shell");
  if (!shell) return;
  ctx.drawImage(shell, 0, 0, W, SHELL_PLAYFIELD_TOP, 0, 0, W, SHELL_PLAYFIELD_TOP);
}

function drawMachineShellSidesAndBase() {
  const shell = images.get("game_shell");
  if (!shell) return;
  const sourceMiddleH = SHELL_SOURCE_FLOOR - SHELL_PLAYFIELD_TOP;
  const bottomDestY = H - SHELL_BOTTOM_H;
  const middleDestH = Math.max(1, bottomDestY - SHELL_PLAYFIELD_TOP);
  ctx.drawImage(shell, 0, SHELL_PLAYFIELD_TOP, SHELL_SIDE_W, sourceMiddleH, 0, SHELL_PLAYFIELD_TOP, SHELL_SIDE_W, middleDestH);
  ctx.drawImage(shell, W - SHELL_SIDE_W, SHELL_PLAYFIELD_TOP, SHELL_SIDE_W, sourceMiddleH, W - SHELL_SIDE_W, SHELL_PLAYFIELD_TOP, SHELL_SIDE_W, middleDestH);
  ctx.drawImage(shell, 0, SHELL_SOURCE_FLOOR, W, SHELL_BOTTOM_H, 0, bottomDestY, W, SHELL_BOTTOM_H);
}

function drawWarning() {
  ctx.save();
  const line = images.get("warning_line");
  if (line) {
    const w = PLAYFIELD_RIGHT - PLAYFIELD_LEFT;
    const h = 40;
    ctx.globalAlpha = warningTime > 0 ? 1 : 0.72;
    ctx.drawImage(line, PLAYFIELD_LEFT, WARNING_Y - h / 2, w, h);
    if (warningTime > 0) drawText(`${Math.ceil((3000 - warningTime) / 1000)} 秒`, W / 2, WARNING_Y - 16, 26, "#ff544f", "center", "bold");
    ctx.restore();
    return;
  } else {
    ctx.strokeStyle = warningTime > 0 ? "#ff544f" : "rgba(255, 134, 120, 0.58)";
    ctx.setLineDash([18, 14]);
    ctx.lineWidth = warningTime > 0 ? 6 : 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(PLAYFIELD_LEFT + 24, WARNING_Y);
    ctx.lineTo(PLAYFIELD_RIGHT - 24, WARNING_Y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (warningTime > 0) drawText(`${Math.ceil((3000 - warningTime) / 1000)} 秒`, W / 2, WARNING_Y - 16, 26, "#ff544f", "center", "bold");
  ctx.restore();
}

function drawDropGuide() {
  if (state !== "playing" || !canDrop || !settings.dropGuide) return;
  ctx.save();
  const dropper = images.get("dropper_head");
  if (dropper) {
    ctx.drawImage(dropper, dropX - DROPPER_HEAD_W / 2, DROPPER_HEAD_Y, DROPPER_HEAD_W, DROPPER_HEAD_H);
  }
  ctx.strokeStyle = "rgba(255, 116, 48, 0.92)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.setLineDash([1, 14]);
  ctx.beginPath();
  const lineStartY = DROPPER_HEAD_Y + DROPPER_HEAD_H - 10;
  ctx.moveTo(dropX, lineStartY);
  ctx.lineTo(dropX, Math.max(lineStartY, DROP_Y - faces[currentLevel - 1].radius - 8));
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 246, 215, 0.78)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dropX, lineStartY);
  ctx.lineTo(dropX, Math.max(lineStartY, DROP_Y - faces[currentLevel - 1].radius - 8));
  ctx.stroke();
  ctx.restore();
}

function drawFace(level, x, y, r, angle) {
  const img = images.get(level);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (img) {
    const size = r * 2 * FACE_DRAW_SCALE;
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
  } else {
    ctx.fillStyle = faces[level - 1].color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawToast() {
  roundRect(220, 128, 310, 52, 26, "rgba(38,49,61,0.9)");
  drawText(toast, W / 2, 162, 24, "#fff", "center", "bold");
}

function drawPauseButton() {
  drawControlButton(getSoundButtonKey(), getControlRect("sound"), pressedControl === "sound");
  drawControlButton(pressedControl === "pause" ? "btn_pause_pressed" : "btn_pause_normal", getControlRect("pause"), pressedControl === "pause");
  drawControlButton(pressedControl === "restart" ? "btn_restart_pressed" : "btn_restart_normal", getControlRect("restart"), pressedControl === "restart");
}

function getSoundButtonKey() {
  if (soundMuted) return pressedControl === "sound" ? "btn_sound_off_pressed" : "btn_sound_off_normal";
  return pressedControl === "sound" ? "btn_sound_on_pressed" : "btn_sound_on_normal";
}

function drawControlButton(key, rect, pressed) {
  const img = images.get(key);
  let x = rect.x;
  let y = rect.y;
  const size = rect.size;
  ctx.save();
  if (pressed) {
    ctx.translate(x + size / 2, y + size / 2);
    ctx.translate(0, 5);
    ctx.scale(0.92, 0.92);
    x = -size / 2;
    y = -size / 2;
  }
  if (img) {
    ctx.drawImage(img, x, y, size, size);
  } else {
    roundRect(x, y, size, size, size / 2, "#28343d");
  }
  if (pressed) {
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = "#2c1720";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStart() {
  const homeBg = images.get("home_bg_main");
  if (homeBg) {
    drawImageCover(homeBg, 0, 0, W, H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#a8e8ff");
    bg.addColorStop(1, "#ffd879");
    ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
  }
  const button = getStartButtonRect();
  drawUiImage(startButtonPressed ? "btn_start_pressed" : "btn_start_normal", button.x, button.y, button.w, button.h);
  for (const item of getStartMenuButtons()) {
    drawUiImage(item.icon, item.x, item.y, item.size, item.size);
    drawText(item.label, item.x + item.size / 2, item.y + item.size + 26, 24, "#fff8dc", "center", "bold");
  }
}

function getStartButtonRect() {
  return {
    x: START_BUTTON_X,
    y: Math.round(H * START_BUTTON_Y_RATIO),
    w: START_BUTTON_W,
    h: START_BUTTON_H,
  };
}

function getStartMenuButtons() {
  const button = getStartButtonRect();
  const y = Math.min(button.y + button.h + 4, H - 148);
  return [
    { id: "settings", label: "设置", icon: "icon_settings", x: 105, y, size: 112 },
    { id: "leaderboard", label: "排行", icon: "icon_rank", x: 319, y, size: 112 },
    { id: "achievements", label: "成就", icon: "icon_achievement", x: 533, y, size: 112 },
  ];
}

function getStartMenuHit(x, y) {
  const button = getStartMenuButtons().find((item) => insideCircle(x, y, { x: item.x, y: item.y, size: item.size }));
  return button ? button.id : "";
}

function getPauseSettingsButtonRect() {
  return { x: 225, y: 862, w: 300, h: 64 };
}

function getResultButtonRects() {
  return {
    restart: { x: 168, y: 850, w: 414, h: 70, variant: "red", label: "再来一局" },
    share: { x: 168, y: 930, w: 414, h: 68, variant: "blue", label: "分享成绩" },
    leaderboard: { x: 168, y: 1010, w: 194, h: 64, variant: "green", label: "本地排行" },
    achievements: { x: 388, y: 1010, w: 194, h: 64, variant: "green", label: "成就" },
  };
}

function getResultAction(x, y) {
  const rects = getResultButtonRects();
  for (const key of Object.keys(rects)) {
    if (insideCapsuleRect(x, y, rects[key])) return key;
  }
  return "";
}

function getPanelRect() {
  const h = Math.min(PANEL_LAYOUT.heights[activePanel] || PANEL_LAYOUT.heights.leaderboard, H - PANEL_LAYOUT.screenMarginY);
  const w = PANEL_LAYOUT.width;
  return { x: Math.round((W - w) / 2), y: Math.max(PANEL_LAYOUT.minTop, Math.round((H - h) / 2)), w, h };
}

function getPanelCloseRect() {
  const panel = getPanelRect();
  return {
    x: panel.x + panel.w - PANEL_CLOSE_LAYOUT.right,
    y: panel.y + PANEL_CLOSE_LAYOUT.top,
    w: PANEL_CLOSE_LAYOUT.size,
    h: PANEL_CLOSE_LAYOUT.size,
  };
}

function getSettingsRowRects() {
  const panel = getPanelRect();
  return SETTINGS_ROWS.map((row, index) => ({
    ...row,
    x: panel.x + SETTINGS_PANEL_LAYOUT.x,
    y: panel.y + SETTINGS_PANEL_LAYOUT.y + index * SETTINGS_PANEL_LAYOUT.step,
    w: SETTINGS_PANEL_LAYOUT.w,
    h: SETTINGS_PANEL_LAYOUT.h,
  }));
}

function getSettingsRowHit(x, y) {
  return getSettingsRowRects().find((row) => inside(x, y, row.x, row.y, row.w, row.h));
}

function drawImageCover(img, x, y, w, h) {
  const sourceW = img.naturalWidth || img.width || W;
  const sourceH = img.naturalHeight || img.height || BASE_H;
  const scale = Math.max(w / sourceW, h / sourceH);
  const cropW = w / scale;
  const cropH = h / scale;
  const cropX = Math.max(0, (sourceW - cropW) / 2);
  const cropY = Math.max(0, (sourceH - cropH) / 2);
  ctx.drawImage(img, cropX, cropY, cropW, cropH, x, y, w, h);
}

function drawPaused() {
  ctx.fillStyle = "rgba(23,31,38,0.44)";
  ctx.fillRect(0, 0, W, H);
  drawText("已暂停", W / 2, 708, 42, "#fff6db", "center", "bold");
  drawUiImage("button_continue", 184, 764, 382, 78);
  drawText("继续游戏", W / 2, 812, 30, "#272114", "center", "bold");
  const settingsButton = getPauseSettingsButtonRect();
  drawCapsuleButton(settingsButton.x, settingsButton.y, settingsButton.w, settingsButton.h, "设置", "green");
}

function drawRestartConfirm() {
  ctx.fillStyle = "rgba(23,31,38,0.44)";
  ctx.fillRect(0, 0, W, H);
  drawCapsuleButton(215, 744, 320, 58, "继续游戏", "green");
  drawCapsuleButton(215, 828, 320, 58, "确认重置", "red");
}

function drawResult() {
  ctx.fillStyle = "rgba(23,31,38,0.44)";
  ctx.fillRect(0, 0, W, H);
  drawResultPanel(116, 538, 518, 610);
  drawText("本局结束", W / 2, 600, 28, "#8b4427", "center", "bold");
  drawText(String(score), W / 2, 674, 68, "#2a2020", "center", "bold");
  drawText(`最高合成：${faces[maxLevel - 1].name}`, W / 2, 736, 27, "#6d5448", "center", "bold");
  drawText(stats.dailyCleared ? `今日目标已完成 · 连续 ${Math.max(stats.streak, 1)} 天` : `今日目标：合成到 ${DAILY_TARGET_LEVEL} 级`, W / 2, 778, 25, "#20795f", "center", "bold");
  drawText(`累计挑战 ${stats.played} 局 · 合出亿仔 ${stats.yizaiCount} 次`, W / 2, 814, 22, "#8a6754", "center", "normal");
  const buttons = getResultButtonRects();
  for (const key of Object.keys(buttons)) {
    const item = buttons[key];
    drawCapsuleButton(item.x, item.y, item.w, item.h, item.label, item.variant);
  }
}

function drawActivePanel() {
  if (activePanel === "settings") drawSettingsPanel();
  if (activePanel === "leaderboard") drawLeaderboardPanel();
  if (activePanel === "achievements") drawAchievementsPanel();
}

function drawPanelFrame(title) {
  ctx.fillStyle = "rgba(15,24,31,0.56)";
  ctx.fillRect(0, 0, W, H);
  const panel = getPanelRect();
  const panelKey = activePanel === "settings" ? "settings_panel_frame" : activePanel === "leaderboard" ? "rank_panel_frame" : "achievement_panel_frame";
  drawUiImage(panelKey, panel.x, panel.y, panel.w, panel.h);
  drawText(title, panel.x + panel.w / 2, panel.y + PANEL_LAYOUT.titleY, 34, "#713819", "center", "bold");
  const close = getPanelCloseRect();
  drawUiImage("close_button", close.x, close.y, close.w, close.h);
  return panel;
}

function drawSettingsPanel() {
  drawPanelFrame("设置");
  for (const row of getSettingsRowRects()) {
    const enabled = row.id === "sound" ? !soundMuted : Boolean(settings[row.id]);
    drawUiImage("setting_row", row.x, row.y, row.w, row.h);
    drawTextWithin(row.label, row.x + SETTINGS_PANEL_LAYOUT.textX, row.y + 40, 26, "#2f2a20", "left", "bold", 300);
    drawTextWithin(row.desc, row.x + SETTINGS_PANEL_LAYOUT.textX, row.y + 74, 20, "#7b6a55", "left", "normal", 310);
    drawToggle(row.x + row.w - SETTINGS_PANEL_LAYOUT.toggleW - 18, row.y + 13, enabled);
  }
}

function drawLeaderboardPanel() {
  const panel = drawPanelFrame("本地排行");
  if (localLeaderboard.length === 0) {
    drawText("还没有本地成绩", panel.x + panel.w / 2, panel.y + 250, 28, "#6d5448", "center", "bold");
    drawText("完成一局后会自动记录", panel.x + panel.w / 2, panel.y + 296, 22, "#8a6754", "center", "normal");
    return;
  }
  const layout = LEADERBOARD_PANEL_LAYOUT;
  const maxRows = Math.max(1, Math.floor((panel.h - layout.y - layout.maxBottomPad) / layout.step));
  for (let i = 0; i < Math.min(maxRows, localLeaderboard.length); i += 1) {
    const item = localLeaderboard[i];
    const y = panel.y + layout.y + i * layout.step;
    drawUiImage("rank_row", panel.x + layout.x, y, layout.w, layout.h);
    drawText(String(i + 1), panel.x + 83, y + 48, 24, "#7b3a20", "center", "bold");
    drawTextWithin(`${item.score} 分`, panel.x + 166, y + 40, 25, "#2a2020", "left", "bold", 250);
    drawTextWithin(`最高 ${item.maxLevelName} · 第 ${item.played || 1} 局`, panel.x + 166, y + 68, 18, "#6d5448", "left", "normal", 275);
    drawText(item.date.slice(5), panel.x + panel.w - 62, y + 48, 18, "#8a6754", "right", "normal");
  }
}

function drawAchievementsPanel() {
  const panel = drawPanelFrame("成就");
  const count = ACHIEVEMENT_DEFS.filter((item) => achievements.unlocked[item.id]).length;
  const layout = ACHIEVEMENTS_PANEL_LAYOUT;
  drawText(`已解锁 ${count}/${ACHIEVEMENT_DEFS.length}`, panel.x + panel.w / 2, panel.y + layout.countY, 22, "#20795f", "center", "bold");
  for (let i = 0; i < ACHIEVEMENT_DEFS.length; i += 1) {
    const item = ACHIEVEMENT_DEFS[i];
    const unlockedAt = achievements.unlocked[item.id];
    const progress = getAchievementProgress(item);
    const y = panel.y + layout.y + i * layout.step;
    drawUiImage(unlockedAt ? "achievement_row_unlocked" : "achievement_row_locked", panel.x + layout.x, y, layout.w, layout.h);
    drawUiImage(`achievement_badge_0${(i % 6) + 1}`, panel.x + layout.x + 18, y + 17, layout.badge, layout.badge);
    drawTextWithin(item.title, panel.x + layout.x + 92, y + 27, 23, "#2f2a20", "left", "bold", 245);
    drawTextWithin(unlockedAt ? `已解锁 ${unlockedAt}` : item.desc, panel.x + layout.x + 92, y + 52, 18, unlockedAt ? "#20795f" : "#7b6a55", "left", "normal", 330);
    drawCodeProgressBar(panel.x + layout.x + 92, y + 72, 300, 10, progress);
    drawText(unlockedAt ? "已完成" : `${Math.round(progress * 100)}%`, panel.x + layout.x + 496, y + 46, 18, unlockedAt ? "#237931" : "#6d5448", "center", "bold");
  }
}

function drawToggle(x, y, enabled) {
  drawUiImage(enabled ? "toggle_on" : "toggle_off", x, y, 180, 86);
}

function drawResultPanel(x, y, w, h) {
  ctx.save();
  ctx.shadowColor = "rgba(39,15,24,0.32)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 14;
  roundRect(x, y, w, h, 8, "rgba(255,246,222,0.97)", "#ffdc78");
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  roundRect(x + 10, y + 10, w - 20, h - 20, 6, "rgba(255,226,171,0.28)", "rgba(255,255,255,0.58)");
  ctx.restore();
}

function drawCapsuleButton(x, y, w, h, label, variant) {
  const fill = variant === "blue" ? "#2498e8" : variant === "green" ? "#42b849" : "#f04449";
  const stroke = variant === "blue" ? "#bceeff" : variant === "green" ? "#ddffd9" : "#ffe9c6";
  ctx.save();
  ctx.shadowColor = "rgba(104,36,34,0.2)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 7;
  roundRect(x, y, w, h, h / 2, fill, stroke);
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 0.32;
  roundRect(x + 9, y + 7, w - 18, h * 0.34, h * 0.17, "#ffffff");
  ctx.globalAlpha = 1;
  drawText(label, x + w / 2, y + h / 2 + 1, variant === "blue" ? 30 : 32, "#fff8dc", "center", "bold");
  ctx.restore();
}

function drawBadge(x, y, w, h, label, value) {
  drawUiImage("score_panel", x, y, w, h);
  drawText(label, x + w / 2, y + 25, 20, "#65777d", "center", "bold");
  drawText(value, x + w / 2, y + 57, 29, "#202b34", "center", "bold");
}

function drawUiImage(key, x, y, w, h) {
  const img = images.get(key);
  if (img) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  roundRect(x, y, w, h, 18, "rgba(255,250,240,0.9)");
}

function roundRect(x, y, w, h, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawCodeProgressBar(x, y, w, h, progress) {
  roundRect(x, y, w, h, h / 2, "rgba(89,97,93,0.18)");
  const fillW = w * Math.max(0, Math.min(1, progress));
  if (fillW > 0) roundRect(x, y, Math.max(h, fillW), h, h / 2, "#42b849");
}

function drawTextWithin(text, x, y, size, color, align, weight, maxWidth) {
  const value = truncateText(text, size, weight, maxWidth);
  drawText(value, x, y, size, color, align, weight);
}

function truncateText(text, size, weight, maxWidth) {
  const value = String(text);
  ctx.font = `${weight || "normal"} ${size}px sans-serif`;
  if (ctx.measureText(value).width <= maxWidth) return value;
  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ctx.measureText(`${value.slice(0, mid)}…`).width <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return `${value.slice(0, Math.max(0, low))}…`;
}

function drawText(text, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight || "normal"} ${size}px sans-serif`;
  ctx.textAlign = align || "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}
