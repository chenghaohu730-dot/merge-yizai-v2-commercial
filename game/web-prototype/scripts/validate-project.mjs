import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const projectRoot = path.resolve(root, "..", "..");

const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "art/source/yizai_highest_source.png",
  "art/generated/cute_avatar_sheet_20260611.png",
  "art/generated/cute_avatar_sheet_20260612_round.png",
  "art/generated/commercial_round_avatar_sheet_20260612.png",
  "art/generated/perfect_round_faces_20260612.png",
  "art/generated/game_background_20260611.png",
  "art/generated/ui_splash_background_20260612.png",
  "art/generated/ui_control_icons_20260612.png",
  "art/generated/playfield_frame_20260612.png",
  "art/generated/game_background_20260612_commercial_machine.png",
  "art/generated/ui_splash_background_20260612_commercial_machine.png",
  "art/final/game_bg_750x1334.jpg",
  "art/final/ui_splash_750x1334.jpg",
  "art/final/ui/start_panel.png",
  "art/final/ui/control_sound.png",
  "art/final/ui/control_pause.png",
  "art/final/ui/control_restart.png",
  "art/final/ui/playfield_frame.png",
  "assets_final/ui/game/game_shell.png",
  "assets_final/ui/game/game_playfield_bg.jpg",
  "assets_final/ui/game/dropper_head.png",
  "assets_final/ui/game/btn_sound_on_normal.png",
  "assets_final/ui/game/btn_pause_normal.png",
  "assets_final/ui/game/btn_restart_normal.png",
  "game/web-prototype/src/main.ts",
  "game/wechat-minigame/game.js",
  "game/wechat-minigame/game.json",
  "game/wechat-minigame/project.config.json",
  "game/wechat-minigame/libs/matter.min.js",
  "art/launch/app_icon_1024.png",
  "art/launch/share_card_1200x960.png",
  "art/launch/store_cover_1280x720.png",
  "game/web-prototype/public/assets/ui/app_icon.png",
  "game/web-prototype/public/assets/ui/share_card.png",
  "game/web-prototype/public/assets/ui/game_bg.jpg",
  "game/web-prototype/public/assets/ui/splash_bg.jpg",
  "game/web-prototype/public/assets/ui/start_panel.png",
  "game/web-prototype/public/assets/ui/control_sound.png",
  "game/web-prototype/public/assets/ui/control_pause.png",
  "game/web-prototype/public/assets/ui/control_restart.png",
  "game/web-prototype/public/assets/ui/playfield_frame.png",
  "game/web-prototype/public/assets/ui/game_shell.png",
  "game/web-prototype/public/assets/ui/game_playfield_bg.jpg",
  "game/web-prototype/public/assets/ui/dropper_head.png",
  "game/web-prototype/public/assets/ui/btn_sound_on_normal.png",
  "game/web-prototype/public/assets/ui/btn_pause_normal.png",
  "game/web-prototype/public/assets/ui/btn_restart_normal.png",
  "game/web-prototype/public/assets/ui/btn_settings_normal.png",
  "game/web-prototype/public/assets/ui/btn_rank_normal.png",
  "game/web-prototype/public/assets/ui/btn_achievement_normal.png",
  "game/web-prototype/public/assets/ui/settings_panel.png",
  "game/web-prototype/public/assets/ui/rank_panel.png",
  "game/web-prototype/public/assets/ui/achievement_panel.png",
  "game/web-prototype/public/assets/ui/settings_panel_frame.png",
  "game/web-prototype/public/assets/ui/rank_panel_frame.png",
  "game/web-prototype/public/assets/ui/achievement_panel_frame.png",
  "game/web-prototype/public/assets/ui/close_button.png",
  "game/web-prototype/public/assets/ui/icon_settings.png",
  "game/web-prototype/public/assets/ui/icon_rank.png",
  "game/web-prototype/public/assets/ui/icon_achievement.png",
  "game/web-prototype/public/assets/ui/setting_row.png",
  "game/web-prototype/public/assets/ui/rank_row.png",
  "game/web-prototype/public/assets/ui/achievement_row_unlocked.png",
  "game/web-prototype/public/assets/ui/achievement_row_locked.png",
  "game/web-prototype/public/assets/ui/rank_item.png",
  "game/web-prototype/public/assets/ui/achievement_item_unlocked.png",
  "game/web-prototype/public/assets/ui/achievement_item_locked.png",
  "game/web-prototype/public/assets/ui/toggle_on.png",
  "game/web-prototype/public/assets/ui/toggle_off.png",
  "game/wechat-minigame/assets/ui/app_icon.png",
  "game/wechat-minigame/assets/ui/share_card.png",
  "game/wechat-minigame/assets/ui/home_bg_main.jpg",
  "game/wechat-minigame/assets/ui/btn_start_normal.png",
  "game/wechat-minigame/assets/ui/btn_start_pressed.png",
  "game/wechat-minigame/assets/ui/btn_start_disabled.png",
  "game/wechat-minigame/assets/ui/game_shell.png",
  "game/wechat-minigame/assets/ui/game_playfield_bg.jpg",
  "game/wechat-minigame/assets/ui/dropper_head.png",
  "game/wechat-minigame/assets/ui/btn_sound_on_normal.png",
  "game/wechat-minigame/assets/ui/btn_pause_normal.png",
  "game/wechat-minigame/assets/ui/btn_restart_normal.png",
  "game/wechat-minigame/assets/ui/btn_settings_normal.png",
  "game/wechat-minigame/assets/ui/btn_rank_normal.png",
  "game/wechat-minigame/assets/ui/btn_achievement_normal.png",
  "game/wechat-minigame/assets/ui/settings_panel.png",
  "game/wechat-minigame/assets/ui/rank_panel.png",
  "game/wechat-minigame/assets/ui/achievement_panel.png",
  "game/wechat-minigame/assets/ui/settings_panel_frame.png",
  "game/wechat-minigame/assets/ui/rank_panel_frame.png",
  "game/wechat-minigame/assets/ui/achievement_panel_frame.png",
  "game/wechat-minigame/assets/ui/close_button.png",
  "game/wechat-minigame/assets/ui/icon_settings.png",
  "game/wechat-minigame/assets/ui/icon_rank.png",
  "game/wechat-minigame/assets/ui/icon_achievement.png",
  "game/wechat-minigame/assets/ui/setting_row.png",
  "game/wechat-minigame/assets/ui/rank_row.png",
  "game/wechat-minigame/assets/ui/achievement_row_unlocked.png",
  "game/wechat-minigame/assets/ui/achievement_row_locked.png",
  "game/wechat-minigame/assets/ui/rank_item.png",
  "game/wechat-minigame/assets/ui/achievement_item_unlocked.png",
  "game/wechat-minigame/assets/ui/achievement_item_locked.png",
  "game/wechat-minigame/assets/ui/toggle_on.png",
  "game/wechat-minigame/assets/ui/toggle_off.png",
  "tools/extract-avatar-sheet.mjs",
  "tests/device-checks/avatar-art/cute-avatar-chain-20260611.png",
  "docs/10_商业化验收报告.md",
];

const audioFiles = [
  "bgm.mp3",
  "drop.wav",
  "merge.wav",
  "big_merge.wav",
  "yizai.wav",
  "game_over.wav",
  "button.wav",
];

const faceDirs = [
  "art/final/faces",
  "game/web-prototype/public/assets/faces",
  "game/wechat-minigame/assets/faces",
];

const audioDirs = [
  "game/web-prototype/public/assets/audio",
  "game/wechat-minigame/assets/audio",
];

const forbiddenPublicTerms = [
  "哈基米",
  "蓝豆",
  "耄耋",
  "老登",
  "曼波",
  "奶龙",
  "奶呼呼",
  "阴阳怪气",
  "癫笑",
  "hajimi",
  "blue_crack",
  "old_meme",
  "mambo",
  "milk_laugh",
  "crazy_laugh",
  "abstract_king",
  "pink_smirk",
  "daidou",
  "thunder_hiss",
];

const results = [];

for (const file of requiredFiles) {
  await mustExist(path.join(projectRoot, file), `file:${file}`);
}

for (const dir of faceDirs) {
  const files = (await readdir(path.join(projectRoot, dir))).filter((name) => name.endsWith(".png"));
  assert(files.length === 11, `${dir} should contain 11 png files, got ${files.length}`);
  for (const term of forbiddenPublicTerms) {
    assert(!files.some((name) => name.includes(term)), `${dir} should not contain legacy meme filename term ${term}`);
  }
  const expectedFaceSize = dir === "art/final/faces" ? 512 : 384;
  for (const file of files) {
    const relative = path.join(dir, file);
    await assertImageSize(relative, expectedFaceSize, expectedFaceSize, `${dir}/${file}`);
    await assertRoundFaceAlpha(relative, expectedFaceSize, `${dir}/${file}`);
  }
}

for (const dir of audioDirs) {
  const files = (await readdir(path.join(projectRoot, dir))).filter((name) => name.endsWith(".wav") || name.endsWith(".mp3"));
  assert(audioFiles.every((name) => files.includes(name)), `${dir} should contain gameplay audio files`);
}

const yizaiPath = path.join(projectRoot, "art/final/faces/face_11_yizai.png");
const yizai = sharp(yizaiPath);
const meta = await yizai.metadata();
assert(meta.width === 512 && meta.height === 512, `face_11_yizai should be 512x512, got ${meta.width}x${meta.height}`);
assert(meta.hasAlpha === true || meta.channels === 4, "face_11_yizai should have alpha");

const raw = await yizai.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const w = raw.info.width;
const h = raw.info.height;
const alphas = [
  raw.data[3],
  raw.data[((w - 1) * 4) + 3],
  raw.data[(((h - 1) * w) * 4) + 3],
  raw.data[(((h - 1) * w + (w - 1)) * 4) + 3],
];
assert(alphas.every((alpha) => alpha === 0), `face_11_yizai corners should be transparent, got ${alphas.join(",")}`);

await assertImageSize("art/launch/app_icon_1024.png", 1024, 1024, "launch app icon");
await assertImageSize("art/launch/share_card_1200x960.png", 1200, 960, "launch share card");
await assertImageSize("art/launch/store_cover_1280x720.png", 1280, 720, "launch store cover");
await assertImageSize("game/web-prototype/public/assets/ui/app_icon.png", 256, 256, "web runtime app icon");
await assertImageSize("game/wechat-minigame/assets/ui/app_icon.png", 256, 256, "wechat runtime app icon");
await assertImageSize("game/wechat-minigame/assets/ui/share_card.png", 1200, 960, "wechat share card");
await assertImageSize("game/web-prototype/public/assets/ui/game_shell.png", 750, 1334, "web runtime game shell");
await assertImageSize("game/wechat-minigame/assets/ui/game_shell.png", 750, 1334, "wechat runtime game shell");
await assertImageSize("game/web-prototype/public/assets/ui/game_playfield_bg.jpg", 628, 893, "web runtime playfield background");
await assertImageSize("game/wechat-minigame/assets/ui/game_playfield_bg.jpg", 628, 893, "wechat runtime playfield background");
await assertImageSize("game/web-prototype/public/assets/ui/splash_bg.jpg", 750, 1334, "web runtime splash background");
await assertImageSize("game/wechat-minigame/assets/ui/home_bg_main.jpg", 750, 1334, "wechat runtime home background");
await assertImageSize("game/web-prototype/public/assets/ui/start_panel.png", 700, 460, "web runtime start panel");
for (const file of ["btn_start_normal.png", "btn_start_pressed.png", "btn_start_disabled.png"]) {
  await assertImageSize(`game/wechat-minigame/assets/ui/${file}`, 520, 160, `wechat runtime ${file}`);
}
await assertImageSize("game/web-prototype/public/assets/ui/dropper_head.png", 96, 100, "web runtime dropper head");
await assertImageSize("game/wechat-minigame/assets/ui/dropper_head.png", 96, 100, "wechat runtime dropper head");
await assertImageSize("assets_final/ui/game/dropper_head.png", 96, 100, "final game dropper head");
for (const file of [
  "btn_sound_on_normal.png",
  "btn_sound_on_pressed.png",
  "btn_sound_off_normal.png",
  "btn_sound_off_pressed.png",
  "btn_pause_normal.png",
  "btn_pause_pressed.png",
  "btn_restart_normal.png",
  "btn_restart_pressed.png",
]) {
  await assertImageSize(`game/web-prototype/public/assets/ui/${file}`, 128, 128, `web runtime ${file}`);
  await assertImageSize(`game/wechat-minigame/assets/ui/${file}`, 128, 128, `wechat runtime ${file}`);
  await assertImageSize(`assets_final/ui/game/${file}`, 128, 128, `final game ${file}`);
}

for (const file of ["btn_settings_normal.png", "btn_settings_pressed.png", "btn_rank_normal.png", "btn_rank_pressed.png", "btn_achievement_normal.png", "btn_achievement_pressed.png"]) {
  await assertImageSize(`game/web-prototype/public/assets/ui/${file}`, 128, 128, `web runtime filing system ${file}`);
  await assertImageSize(`game/wechat-minigame/assets/ui/${file}`, 128, 128, `wechat runtime filing system ${file}`);
}
for (const [file, width, height] of [
  ["settings_panel.png", 620, 860],
  ["rank_panel.png", 620, 800],
  ["achievement_panel.png", 620, 760],
  ["settings_panel_frame.png", 620, 860],
  ["rank_panel_frame.png", 620, 800],
  ["achievement_panel_frame.png", 620, 760],
  ["close_button.png", 96, 96],
  ["icon_settings.png", 128, 128],
  ["icon_rank.png", 128, 128],
  ["icon_achievement.png", 128, 128],
  ["setting_row.png", 560, 112],
  ["rank_row.png", 560, 96],
  ["achievement_row_unlocked.png", 560, 120],
  ["achievement_row_locked.png", 560, 120],
  ["rank_item.png", 560, 96],
  ["achievement_item_unlocked.png", 560, 120],
  ["achievement_item_locked.png", 560, 120],
  ["toggle_on.png", 180, 86],
  ["toggle_off.png", 180, 86],
]) {
  await assertImageSize(`game/web-prototype/public/assets/ui/${file}`, width, height, `web runtime filing system ${file}`);
  await assertImageSize(`game/wechat-minigame/assets/ui/${file}`, width, height, `wechat runtime filing system ${file}`);
}

const config = JSON.parse(await readFile(path.join(projectRoot, "game/wechat-minigame/project.config.json"), "utf8"));
assert(config.compileType === "game", `wechat project compileType should be game, got ${config.compileType}`);
assert(config.appid === "touristappid", "wechat project should use touristappid until official AppID is supplied");

const gameJs = await readFile(path.join(projectRoot, "game/wechat-minigame/game.js"), "utf8");
assert(gameJs.includes("wx.createCanvas()"), "wechat game should create a canvas");
assert(gameJs.includes("Matter.Engine.create"), "wechat game should initialize Matter.js physics");
assert(gameJs.includes("face_11_yizai.png"), "wechat game should reference final yizai asset");
assert(gameJs.includes("wx.showShareMenu"), "wechat game should enable share menu");
assert(gameJs.includes("wx.onShareAppMessage"), "wechat game should register share message");
assert(gameJs.includes("assets/ui/share_card.png"), "wechat game should use formal share card");
assert(gameJs.includes("assets/ui/game_shell.png"), "wechat game should use generated game shell");
assert(gameJs.includes("assets/ui/game_playfield_bg.jpg"), "wechat game should use generated playfield background");
assert(gameJs.includes("assets/ui/home_bg_main.jpg"), "wechat game should use generated home background");
assert(gameJs.includes("assets/ui/btn_start_normal.png"), "wechat game should use generated start button");
assert(gameJs.includes("assets/ui/dropper_head.png"), "wechat game should use generated dropper head");
assert(gameJs.includes("assets/ui/btn_sound_on_normal.png"), "wechat game should use generated sound button asset");
assert(gameJs.includes("assets/ui/btn_pause_normal.png"), "wechat game should use generated pause button asset");
assert(gameJs.includes("assets/ui/btn_restart_normal.png"), "wechat game should use generated restart button asset");
assert(gameJs.includes("wx.createInnerAudioContext"), "wechat game should initialize audio contexts");
assert(gameJs.includes("assets/audio/yizai.wav"), "wechat game should reference yizai celebration audio");
assert(gameJs.includes("assets/audio/bgm.mp3"), "wechat game should reference background music");
assert(gameJs.includes("mergeYizaiSoundMuted"), "wechat game should persist sound mute preference");
assert(gameJs.includes("toggleSound"), "wechat game should expose a sound toggle control");
assert(gameJs.includes("mergeYizaiSettings"), "wechat game should persist filing settings");
assert(gameJs.includes("mergeYizaiLocalLeaderboard"), "wechat game should persist local leaderboard");
assert(gameJs.includes("mergeYizaiAchievements"), "wechat game should persist achievements");
assert(gameJs.includes("settings_panel.png"), "wechat game should use generated settings panel");
assert(gameJs.includes("rank_panel.png"), "wechat game should use generated leaderboard panel");
assert(gameJs.includes("achievement_panel.png"), "wechat game should use generated achievement panel");
assert(gameJs.includes("settings_panel_frame.png"), "wechat game should use layered settings panel frame");
assert(gameJs.includes("rank_panel_frame.png"), "wechat game should use layered leaderboard panel frame");
assert(gameJs.includes("achievement_panel_frame.png"), "wechat game should use layered achievement panel frame");
assert(gameJs.includes("close_button.png"), "wechat game should use layered close button asset");
assert(gameJs.includes("setting_row.png") && gameJs.includes("rank_row.png"), "wechat game should use layered row assets");

const webIndex = await readFile(path.join(projectRoot, "game/web-prototype/index.html"), "utf8");
assert(webIndex.includes("soundToggle"), "web prototype should expose a sound toggle button");
assert(webIndex.includes("game-shell"), "web prototype should align overlays inside game shell");

const webMain = await readFile(path.join(projectRoot, "game/web-prototype/src/main.ts"), "utf8");
assert(webMain.includes("mergeYizaiSoundMuted"), "web prototype should persist sound mute preference");
assert(webMain.includes("mergeYizaiSettings"), "web prototype should persist filing settings");
assert(webMain.includes("mergeYizaiLocalLeaderboard"), "web prototype should persist local leaderboard");
assert(webMain.includes("mergeYizaiAchievements"), "web prototype should persist achievements");
assert(webMain.includes("/assets/audio/bgm.mp3"), "web prototype should reference background music");
assert(webMain.includes("/assets/ui/game_shell.png"), "web prototype should use generated game shell");
assert(webMain.includes("/assets/ui/game_playfield_bg.jpg"), "web prototype should use generated playfield background");
assert(webMain.includes("drawMachineShellSidesAndBase"), "web prototype should draw the game shell in non-stretching slices");
assert(webMain.includes("PLAYFIELD_FLOOR_BASE"), "web prototype should align the physics floor to the new visual glass floor");
assert(webMain.includes("PLAYFIELD_LEFT") && webMain.includes("PLAYFIELD_RIGHT"), "web prototype should align the physics walls to the new visual glass sides");
const webStyles = await readFile(path.join(projectRoot, "game/web-prototype/src/styles.css"), "utf8");
assert(
  webStyles.includes("/assets/ui/home_bg_main.jpg") || webStyles.includes("/assets/ui/splash_bg.jpg"),
  "web prototype should use a generated start background",
);
assert(webStyles.includes(".start-panel"), "web prototype should define the start panel");
assert(webStyles.includes("/assets/ui/btn_sound_on_normal.png"), "web prototype should use generated sound button asset");
assert(webStyles.includes("/assets/ui/btn_pause_normal.png"), "web prototype should use generated pause button asset");
assert(webStyles.includes("/assets/ui/btn_restart_normal.png"), "web prototype should use generated restart button asset");
assert(webStyles.includes("/assets/ui/settings_panel_frame.png"), "web prototype should use layered settings panel frame");
assert(webStyles.includes("/assets/ui/rank_panel_frame.png"), "web prototype should use layered leaderboard panel frame");
assert(webStyles.includes("/assets/ui/achievement_panel_frame.png"), "web prototype should use layered achievement panel frame");
assert(webStyles.includes("/assets/ui/close_button.png"), "web prototype should use layered close button asset");
assert(webStyles.includes("/assets/ui/setting_row.png") && webStyles.includes("/assets/ui/rank_row.png"), "web prototype should use layered row assets");

for (const [label, text] of [
  ["wechat game", gameJs],
  ["web prototype", webMain],
  ["gameplay rules doc", await readFile(path.join(projectRoot, "docs/01_完整玩法规则表.md"), "utf8")],
  ["avatar art doc", await readFile(path.join(projectRoot, "docs/02_11级抽象头像美术清单.md"), "utf8")],
  ["commercial acceptance report", await readFile(path.join(projectRoot, "docs/10_商业化验收报告.md"), "utf8")],
]) {
  for (const term of forbiddenPublicTerms) {
    assert(!text.includes(term), `${label} should not contain legacy meme term ${term}`);
  }
}

const packageSize = await dirSize(path.join(projectRoot, "game/wechat-minigame"));
assert(packageSize < 4 * 1024 * 1024, `wechat package should be below 4MB for main package, got ${packageSize} bytes`);

console.log(JSON.stringify({ ok: true, checks: results.length, packageSize, results }, null, 2));

async function mustExist(file, label) {
  await access(file);
  const info = await stat(file);
  assert(info.size > 0, `${label} should not be empty`);
}

async function assertImageSize(file, width, height, label) {
  const metadata = await sharp(path.join(projectRoot, file)).metadata();
  assert(metadata.width === width && metadata.height === height, `${label} should be ${width}x${height}, got ${metadata.width}x${metadata.height}`);
}

async function assertRoundFaceAlpha(file, size, label) {
  const raw = await sharp(path.join(projectRoot, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const data = raw.data;
  const width = raw.info.width;
  const height = raw.info.height;
  const corners = [
    data[3],
    data[((width - 1) * 4) + 3],
    data[(((height - 1) * width) * 4) + 3],
    data[(((height - 1) * width + (width - 1)) * 4) + 3],
  ];
  assert(corners.every((alpha) => alpha === 0), `${label} should have transparent corners`);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let visible = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < 8) continue;
      visible += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const visibleW = maxX - minX + 1;
  const visibleH = maxY - minY + 1;
  const coverage = visible / (size * size);
  assert(visibleW >= size - 28 && visibleH >= size - 8, `${label} should visually fill the round collision area`);
  assert(coverage > 0.72 && coverage < 0.8, `${label} should have circular alpha coverage`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  results.push(message.replace(/^(.+?) should /, "$1 ok: should "));
}

async function dirSize(dir) {
  let total = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await dirSize(fullPath);
    } else {
      total += (await stat(fullPath)).size;
    }
  }
  return total;
}
