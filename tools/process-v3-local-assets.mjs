import { mkdir, readFile, readdir, rm, stat, writeFile, cp } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const projectRoot = path.resolve(import.meta.dirname, "..");
const webRoot = path.join(projectRoot, "game", "web-prototype");
const require = createRequire(path.join(webRoot, "package.json"));
const sharp = require("sharp");
const sourceRoot = "E:\\美术素材";
const supplementRoot = path.join(sourceRoot, "游戏页背景分层-补充");
const processedRoot = path.join(projectRoot, "art", "final", "v3-local-assets");
const checksRoot = path.join(projectRoot, "tests", "device-checks", "visual-v3-local-assets");
const generatedGameBg = path.join(processedRoot, "generated", "generated_game_machine_bg.png");
const runtimeUiNames = new Set([
  "button_start",
  "button_primary",
  "button_continue",
  "button_secondary",
  "control_sound",
  "control_pause",
  "control_restart",
  "score_panel",
  "next_frame",
  "progress_bar",
  "merge_bubble",
  "warning_line",
  "pause_panel",
  "result_panel",
]);

const faceRuntimeNames = [
  "face_01_sprout_bead.png",
  "face_02_peach_puff.png",
  "face_03_heart_jelly.png",
  "face_04_sun_wiggle.png",
  "face_05_sky_spark.png",
  "face_06_cream_smile.png",
  "face_07_seed_sage.png",
  "face_08_grape_zap.png",
  "face_09_flame_grin.png",
  "face_10_crown_star.png",
  "face_11_yizai.png",
];

await mkdir(processedRoot, { recursive: true });
await mkdir(checksRoot, { recursive: true });
await copyRawSources();
await backupRuntimeAssets();

const sourceFiles = await collectSourceFiles();
const avatars = sourceFiles
  .filter((file) => file.includes("前 10 级头像球"))
  .sort((a, b) => sourceIndex(a) - sourceIndex(b));
const yizai = sourceFiles.find((file) => file.includes("第 11 级亿仔头像球"));
if (avatars.length !== 10 || !yizai) {
  throw new Error(`头像素材不完整：前 10 级 ${avatars.length} 个，第 11 级 ${yizai ? 1 : 0} 个`);
}

const avatarSources = [...avatars, yizai];
const avatarReport = [];
for (let i = 0; i < avatarSources.length; i += 1) {
  const level = i + 1;
  const base = level === 11 ? "avatar_11_yizai.png" : `avatar_${String(level).padStart(2, "0")}.png`;
  const transparent = await removeCheckerBackground(avatarSources[i], { threshold: 222, removeAllLightBg: false });
  const trimmed = await trimToSubject(transparent, 0);
  const src512 = await squareFit(trimmed, 512, 1);
  const run384 = await sharp(src512).resize(384, 384, { fit: "contain" }).png({ compressionLevel: 9, palette: true, colors: 256, effort: 10 }).toBuffer();
  const check80 = await sharp(src512).resize(80, 80, { fit: "contain" }).png({ compressionLevel: 9, palette: true, colors: 256, effort: 10 }).toBuffer();

  await writeAsset(path.join(processedRoot, "avatars", "source-512", base), src512);
  await writeAsset(path.join(processedRoot, "avatars", "runtime-384", base), run384);
  await writeAsset(path.join(processedRoot, "avatars", "check-80", base), check80);
  await writeAsset(path.join(projectRoot, "art", "final", "faces", faceRuntimeNames[i]), src512);
  await writeAsset(path.join(webRoot, "public", "assets", "faces", faceRuntimeNames[i]), run384);
  await writeAsset(path.join(projectRoot, "game", "wechat-minigame", "assets", "faces", faceRuntimeNames[i]), run384);
  avatarReport.push(await imageReport(path.join(processedRoot, "avatars", "runtime-384", base)));
}

const ui = await processUiAssets(sourceFiles);
await buildGameBackground(ui);
await buildSplashBackground(ui);
await makeLaunchAssets();
await makeContactSheets();

await writeFile(path.join(processedRoot, "asset-processing-report.json"), JSON.stringify({
  sourceRoot,
  processedRoot,
  avatarReport,
  notes: [
    "v3 以 E:\\美术素材 的分层图为基准重搭视觉层，旧版只保留玩法逻辑。",
    "原始 PNG 均为不带透明通道的棋盘格底图，已复制到 raw-copy 并按边界连通背景抠底。",
    "运行头像为 384x384，另保留 512x512 源处理图和 80x80 检查图。",
    "运行端继续保留旧 face_* 文件名以兼容现有玩法代码，处理目录中同时提供 avatar_* 命名。",
    "优先使用完整游戏机底图，避免非透明分层素材硬拼造成接缝和贴片感。",
    "补充包只作为完整底图缺失时的兜底来源，不再压过一体化机器视觉。",
  ],
}, null, 2), "utf8");

console.log(JSON.stringify({
  ok: true,
  processedRoot,
  checksRoot,
  avatars: avatarReport.length,
}, null, 2));

async function collectSourceFiles() {
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.png$/i.test(entry.name)) files.push(full);
    }
  }
  await walk(sourceRoot);
  return files.sort((a, b) => a.localeCompare(b, "zh-CN"));
}

async function copyRawSources() {
  const rawRoot = path.join(processedRoot, "raw-copy");
  await rm(rawRoot, { recursive: true, force: true });
  await cp(sourceRoot, rawRoot, { recursive: true });
}

function sourceIndex(file) {
  const name = path.basename(file);
  const match = name.match(/\((\d+)\)/);
  return match ? Number(match[1]) : 1;
}

async function backupRuntimeAssets() {
  const backupRoot = path.join(projectRoot, "art", "backup", `pre-v3-local-assets-${stamp()}`);
  await mkdir(backupRoot, { recursive: true });
  for (const [from, to] of [
    [path.join(webRoot, "public", "assets", "faces"), path.join(backupRoot, "web-faces")],
    [path.join(webRoot, "public", "assets", "ui"), path.join(backupRoot, "web-ui")],
    [path.join(projectRoot, "game", "wechat-minigame", "assets", "faces"), path.join(backupRoot, "wechat-faces")],
    [path.join(projectRoot, "game", "wechat-minigame", "assets", "ui"), path.join(backupRoot, "wechat-ui")],
  ]) {
    await cp(from, to, { recursive: true });
  }
}

async function processUiAssets(files) {
  const uiFiles = new Map();
  for (const file of files.filter((item) => item.includes("UI 组件") || item.includes("游戏页背景分层") || item.includes("启动页背景分层"))) {
    uiFiles.set(path.basename(file), file);
  }
  const pick = (contains) => {
    const found = [...uiFiles.entries()].find(([name]) => name.includes(contains));
    if (!found) throw new Error(`缺少 UI 素材：${contains}`);
    return found[1];
  };
  const maybe = (contains) => {
    const found = [...uiFiles.entries()].find(([name]) => name.includes(contains));
    return found?.[1] || null;
  };
  const prefer = (preferred, fallback) => maybe(preferred) || pick(fallback);

  const output = {};
  const direct = [
    ["button_start", pick("14_11_37 (5)")],
    ["button_primary", pick("14_17_01 (1)")],
    ["button_continue", pick("14_17_01 (2)")],
    ["button_secondary", pick("14_17_02 (4)")],
    ["button_restart", pick("14_19_44 (2)")],
    ["control_sound", pick("14_17_04 (10)")],
    ["control_pause", pick("14_19_43 (1)")],
    ["control_restart", pick("14_19_44 (2)")],
    ["score_panel", pick("14_17_03 (6)")],
    ["next_frame", pick("14_17_03 (7)")],
    ["progress_bar", pick("14_17_04 (9)")],
    ["merge_bubble", pick("14_19_45 (3)")],
    ["pause_panel", pick("14_19_46 (5)")],
    ["result_panel", pick("14_19_46 (7)")],
    ["warning_line", prefer("16_20_42 (7)", "14_08_25 (7)")],
  ];

  for (const [name, source] of direct) {
    const transparent = await removeCheckerBackground(source, { threshold: 222, removeAllLightBg: false });
    const trimmed = await trimToSubject(transparent, 18);
    const runtime = name.startsWith("control_") ? await squareFit(trimmed, 128, 1) : trimmed;
    const dest = path.join(processedRoot, "ui", `${name}.png`);
    await writeAsset(dest, trimmed);
    await writeAsset(path.join(projectRoot, "art", "final", "ui", `${name}.png`), runtime);
    if (runtimeUiNames.has(name)) await writeRuntimeUi(`${name}.png`, runtime);
    output[name] = dest;
  }
  await cleanupRuntimeUiExtras();

  return {
    ...output,
    gameTop: prefer("16_20_38 (1)", "14_08_23 (1)"),
    gameLeft: prefer("16_20_38 (2)", "14_08_23 (2)"),
    gameRight: prefer("16_20_39 (3)", "14_08_23 (3)"),
    gameInterior: maybe("16_20_41 (4)"),
    gameGlass: prefer("16_20_43 (8)", "14_08_24 (4)"),
    gameBase: prefer("16_20_41 (5)", "14_08_24 (5)"),
    gameControls: prefer("16_20_42 (6)", "14_08_25 (6)"),
    splashMachine: pick("14_11_34 (1)"),
    splashTitle: pick("14_11_34 (2)"),
    splashAvatars: pick("14_11_36 (3)"),
    splashPanel: pick("14_11_37 (4)"),
    splashButton: pick("14_11_37 (5)"),
  };
}

async function buildGameBackground(ui) {
  const W = 750;
  const H = 1334;
  if (await fileExists(generatedGameBg)) {
    const bg = await sharp(generatedGameBg, { limitInputPixels: false })
      .resize(W, H, { fit: "cover" })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    const frame = await sharp({
      create: {
        width: W,
        height: H,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const warningSource = await trimToSubject(await removeCheckerBackground(ui.warning_line, { threshold: 222, removeAllLightBg: false }), 4);
    const warningRuntime = await fitPng(warningSource, 560, 28);

    await writeRuntimeUi("game_bg.jpg", bg);
    await writeRuntimeUi("playfield_frame.png", frame);
    await writeRuntimeUi("warning_line.png", warningRuntime);
    await writeAsset(path.join(processedRoot, "ui", "game_bg_750x1334.jpg"), bg);
    await writeAsset(path.join(processedRoot, "ui", "playfield_frame_750x1334.png"), frame);
    await writeAsset(path.join(processedRoot, "ui", "warning_line.png"), warningRuntime);
    await writeAsset(path.join(projectRoot, "art", "final", "game_bg_750x1334.jpg"), bg);
    await writeAsset(path.join(projectRoot, "art", "final", "ui", "playfield_frame.png"), frame);
    await writeAsset(path.join(projectRoot, "art", "final", "ui", "warning_line.png"), warningRuntime);
    return;
  }

  const top = await trimToSubject(await removeCheckerBackground(ui.gameTop, { threshold: 222, removeAllLightBg: false }), 4);
  const left = await trimToSubject(await removeCheckerBackground(ui.gameLeft, { threshold: 222, removeAllLightBg: false }), 2);
  const right = await trimToSubject(await removeCheckerBackground(ui.gameRight, { threshold: 222, removeAllLightBg: false }), 2);
  const interior = ui.gameInterior
    ? await trimToSubject(await removeCheckerBackground(ui.gameInterior, { threshold: 222, removeAllLightBg: false }), 0)
    : null;
  const glass = await clearNeutralBackground(
    await trimToSubject(await removeCheckerBackground(ui.gameGlass, { threshold: 222, removeAllLightBg: false }), 4),
    30,
  );
  const base = await trimToSubject(await removeCheckerBackground(ui.gameBase, { threshold: 222, removeAllLightBg: false }), 4);
  const controls = await trimToSubject(await removeCheckerBackground(ui.gameControls, { threshold: 222, removeAllLightBg: false }), 4);
  const warning = await trimToSubject(await removeCheckerBackground(ui.warning_line, { threshold: 222, removeAllLightBg: false }), 4);

  const bg = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 255, g: 244, b: 207, alpha: 1 },
    },
  })
    .composite([
      { input: await candyBackdrop(W, H), left: 0, top: 0 },
      ...(interior ? [{ input: await fitCoverPng(interior, 650, 875), left: 50, top: 220 }] : []),
      { input: await fitPng(top, 750, 236), left: 0, top: 0 },
      { input: await fitPng(base, 750, 188), left: 0, top: H - 226 },
      { input: await fitPng(controls, 520, 174), left: 115, top: H - 206 },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  const frame = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
    })
    .composite([
      { input: await fitPng(glass, 628, 850), left: 61, top: 232 },
      { input: await fitPng(left, 118, 910), left: 0, top: 220 },
      { input: await fitPng(right, 118, 910), left: W - 118, top: 220 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  const warningRuntime = await fitPng(warning, 560, 28);

  await writeRuntimeUi("game_bg.jpg", bg);
  await writeRuntimeUi("playfield_frame.png", frame);
  await writeRuntimeUi("warning_line.png", warningRuntime);
  await writeAsset(path.join(processedRoot, "ui", "game_bg_750x1334.jpg"), bg);
  await writeAsset(path.join(processedRoot, "ui", "playfield_frame_750x1334.png"), frame);
  await writeAsset(path.join(processedRoot, "ui", "warning_line.png"), warningRuntime);
  await writeAsset(path.join(projectRoot, "art", "final", "game_bg_750x1334.jpg"), bg);
  await writeAsset(path.join(projectRoot, "art", "final", "ui", "playfield_frame.png"), frame);
  await writeAsset(path.join(projectRoot, "art", "final", "ui", "warning_line.png"), warningRuntime);
}

async function fileExists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function buildSplashBackground(ui) {
  const W = 750;
  const H = 1334;
  const machine = await sharp(ui.splashMachine, { limitInputPixels: false }).resize(W, H, { fit: "cover" }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const title = await trimToSubject(await removeCheckerBackground(ui.splashTitle, { threshold: 222, removeAllLightBg: false }), 8);
  const avatars = await trimToSubject(await removeCheckerBackground(ui.splashAvatars, { threshold: 222, removeAllLightBg: false }), 8);
  const panel = await clearLightBackground(
    await trimToSubject(await removeCheckerBackground(ui.splashPanel, { threshold: 222, removeAllLightBg: false }), 12),
    214,
  );
  const startPanel = await sharp({
    create: {
      width: 700,
      height: 460,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: await fitPng(panel, 700, 300), left: 0, top: 0 },
      { input: await fitPng(await readFile(ui.button_start), 450, 92), left: 125, top: 320 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  const splash = await sharp(machine)
    .composite([
      { input: await fitPng(title, 660, 250), left: 45, top: 40 },
      { input: await fitPng(avatars, 390, 350), left: 180, top: 346 },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  await writeRuntimeUi("splash_bg.jpg", splash);
  await writeRuntimeUi("start_panel.png", startPanel);
  await writeAsset(path.join(processedRoot, "ui", "splash_bg_750x1334.jpg"), splash);
  await writeAsset(path.join(processedRoot, "ui", "start_panel.png"), startPanel);
  await writeAsset(path.join(projectRoot, "art", "final", "ui_splash_750x1334.jpg"), splash);
  await writeAsset(path.join(projectRoot, "art", "final", "ui", "start_panel.png"), startPanel);
}

async function makeLaunchAssets() {
  const yizai = path.join(processedRoot, "avatars", "source-512", "avatar_11_yizai.png");
  const face10 = path.join(processedRoot, "avatars", "source-512", "avatar_10.png");
  const face8 = path.join(processedRoot, "avatars", "source-512", "avatar_08.png");
  const icon = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 255, g: 207, b: 72, alpha: 1 } },
  })
    .composite([{ input: await sharp(yizai).resize(840, 840).png().toBuffer(), left: 92, top: 92 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeAsset(path.join(projectRoot, "art", "launch", "app_icon_1024.png"), icon);
  await writeRuntimeUi("app_icon.png", await sharp(icon).resize(256, 256).png({ compressionLevel: 9 }).toBuffer());

  const shareBg = await sharp(path.join(processedRoot, "ui", "splash_bg_750x1334.jpg"))
    .resize(1200, 960, { fit: "cover" })
    .modulate({ brightness: 1.03, saturation: 1.08 })
    .toBuffer();
  const shareText = Buffer.from(`<svg width="1200" height="960" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="1200" height="960" fill="rgba(255,244,213,0.30)"/>
    <text x="96" y="170" font-family="Microsoft YaHei, Arial" font-size="112" font-weight="900" fill="#fff7d1" stroke="#7f2f55" stroke-width="9" paint-order="stroke">合成亿仔</text>
    <text x="102" y="248" font-family="Microsoft YaHei, Arial" font-size="42" font-weight="800" fill="#fff">一路合成，冲到 MAEE 亿仔</text>
  </svg>`);
  const shareCard = await sharp(shareBg)
    .composite([
      { input: await sharp(face8).resize(230, 230).png().toBuffer(), left: 668, top: 170 },
      { input: await sharp(face10).resize(270, 270).png().toBuffer(), left: 802, top: 382 },
      { input: await sharp(yizai).resize(410, 410).png().toBuffer(), left: 575, top: 430 },
      { input: shareText, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9, palette: true, colors: 192, effort: 10 })
    .toBuffer();
  await writeAsset(path.join(projectRoot, "art", "launch", "share_card_1200x960.png"), shareCard);
  await writeRuntimeUi("share_card.png", shareCard);

  const coverBg = await sharp(path.join(processedRoot, "ui", "game_bg_750x1334.jpg")).resize(1280, 720, { fit: "cover" }).toBuffer();
  const coverText = Buffer.from(`<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
    <rect width="1280" height="720" fill="rgba(255,224,137,0.22)"/>
    <text x="88" y="190" font-family="Microsoft YaHei, Arial" font-size="112" font-weight="900" fill="#fff7d1" stroke="#73325b" stroke-width="8" paint-order="stroke">合成亿仔</text>
    <text x="94" y="272" font-family="Microsoft YaHei, Arial" font-size="40" font-weight="800" fill="#6b2b3f">糖果合成机里的抽象头像大冲关</text>
  </svg>`);
  const storeCover = await sharp(coverBg)
    .composite([
      { input: await sharp(yizai).resize(330, 330).png().toBuffer(), left: 840, top: 206 },
      { input: await sharp(face10).resize(210, 210).png().toBuffer(), left: 712, top: 360 },
      { input: coverText, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9, palette: true, colors: 192, effort: 10 })
    .toBuffer();
  await writeAsset(path.join(projectRoot, "art", "launch", "store_cover_1280x720.png"), storeCover);
}

async function makeContactSheets() {
  const avatarPaths = faceRuntimeNames.map((name) => path.join(projectRoot, "art", "final", "faces", name));
  await makeSheet(avatarPaths, path.join(checksRoot, "avatar_overview.png"), 6, 180, 214, true);
  const checkPaths = await Promise.all(
    [...Array(11)].map(async (_, index) => {
      const level = index + 1;
      return path.join(processedRoot, "avatars", "check-80", level === 11 ? "avatar_11_yizai.png" : `avatar_${String(level).padStart(2, "0")}.png`);
    }),
  );
  await makeSheet(checkPaths, path.join(checksRoot, "avatar_80px_check.png"), 11, 96, 126, false);
}

async function makeSheet(files, dest, cols, cellW, cellH, label) {
  const comps = [];
  for (let i = 0; i < files.length; i += 1) {
    const image = await sharp(files[i]).resize({ width: cellW - 28, height: cellH - 52, fit: "inside" }).png().toBuffer();
    const tile = await sharp({
      create: { width: cellW, height: cellH, channels: 4, background: { r: 252, g: 249, b: 239, alpha: 1 } },
    })
      .composite([
        { input: image, left: 14, top: 12 },
        ...(label ? [{ input: Buffer.from(`<svg width="${cellW}" height="30"><text x="${cellW / 2}" y="20" font-family="Arial" font-size="14" font-weight="700" text-anchor="middle" fill="#443">${path.basename(files[i])}</text></svg>`), left: 0, top: cellH - 34 }] : []),
      ])
      .png()
      .toBuffer();
    comps.push({ input: tile, left: (i % cols) * cellW, top: Math.floor(i / cols) * cellH });
  }
  await sharp({
    create: {
      width: cols * cellW,
      height: Math.ceil(files.length / cols) * cellH,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(comps)
    .png({ compressionLevel: 9 })
    .toFile(dest);
}

async function removeCheckerBackground(file, options) {
  const image = sharp(file, { limitInputPixels: false }).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const transparent = new Uint8Array(width * height);
  const queue = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (transparent[i]) return;
    const j = i * 4;
    if (!isBackground(data[j], data[j + 1], data[j + 2], data[j + 3], options.threshold)) return;
    transparent[i] = 1;
    queue.push(i);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  for (let q = 0; q < queue.length; q += 1) {
    const i = queue[q];
    const x = i % width;
    const y = Math.floor(i / width);
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  for (let i = 0; i < transparent.length; i += 1) {
    if (transparent[i]) data[i * 4 + 3] = 0;
  }

  return sharp(data, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
}

function isBackground(r, g, b, a, threshold) {
  if (a < 8) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 18 && min > threshold;
}

async function clearLightBackground(input, threshold) {
  const image = sharp(input, { limitInputPixels: false }).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < info.width * info.height; i += 1) {
    const j = i * 4;
    if (isBackground(data[j], data[j + 1], data[j + 2], data[j + 3], threshold)) {
      data[j + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
}

async function clearNeutralBackground(input, spread) {
  const image = sharp(input, { limitInputPixels: false }).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < info.width * info.height; i += 1) {
    const j = i * 4;
    const max = Math.max(data[j], data[j + 1], data[j + 2]);
    const min = Math.min(data[j], data[j + 1], data[j + 2]);
    if (data[j + 3] < 8 || max - min <= spread) {
      data[j + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
}

async function trimToSubject(input, pad) {
  const image = sharp(input, { limitInputPixels: false }).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 16) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return input;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(info.width - 1, maxX + pad);
  maxY = Math.min(info.height - 1, maxY + pad);
  return sharp(input).extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }).png({ compressionLevel: 9 }).toBuffer();
}

async function squareFit(input, size, fillRatio) {
  const meta = await sharp(input).metadata();
  const side = Math.max(meta.width || size, meta.height || size);
  const fitted = await sharp(input)
    .resize(Math.round(size * fillRatio), Math.round(size * fillRatio), { fit: "inside" })
    .png()
    .toBuffer();
  const fittedMeta = await sharp(fitted).metadata();
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: fitted, left: Math.round((size - (fittedMeta.width || side)) / 2), top: Math.round((size - (fittedMeta.height || side)) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function fitPng(input, width, height) {
  return sharp(input)
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function fitCoverPng(input, width, height) {
  return sharp(input)
    .resize(width, height, { fit: "cover", position: "center", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function candyBackdrop(width, height) {
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#94dcf3"/>
        <stop offset="0.48" stop-color="#fff2bb"/>
        <stop offset="1" stop-color="#ffbf62"/>
      </linearGradient>
      <pattern id="p" width="70" height="70" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
        <rect width="70" height="70" fill="none"/>
        <circle cx="18" cy="18" r="8" fill="#fff" opacity="0.26"/>
        <circle cx="52" cy="48" r="5" fill="#ff6f91" opacity="0.18"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect width="100%" height="100%" fill="url(#p)"/>
  </svg>`;
  return Buffer.from(svg);
}

async function imageReport(file) {
  const meta = await sharp(file).metadata();
  return { file: path.relative(processedRoot, file).replaceAll("\\", "/"), width: meta.width, height: meta.height, hasAlpha: !!meta.hasAlpha, size: (await stat(file)).size };
}

async function writeRuntimeUi(name, buffer) {
  const runtime = await optimizeRuntimeUi(name, buffer);
  await writeAsset(path.join(webRoot, "public", "assets", "ui", name), runtime);
  await writeAsset(path.join(projectRoot, "game", "wechat-minigame", "assets", "ui", name), runtime);
}

async function optimizeRuntimeUi(name, buffer) {
  if (!name.endsWith(".png")) return buffer;
  let image = sharp(buffer, { limitInputPixels: false });
  if (name.startsWith("button_")) image = image.resize(512, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (name === "score_panel.png") image = image.resize(384, 160, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (name === "next_frame.png") image = image.resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (name === "progress_bar.png") image = image.resize(512, 96, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (name === "merge_bubble.png") image = image.resize(420, 140, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (name === "warning_line.png") image = image.resize(560, 28, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (name === "pause_panel.png") image = image.resize(566, 340, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (name === "result_panel.png") image = image.resize(566, 550, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  return image.png({ compressionLevel: 9, palette: true, colors: 192, effort: 10 }).toBuffer();
}

async function cleanupRuntimeUiExtras() {
  for (const name of ["button_restart.png"]) {
    await rm(path.join(webRoot, "public", "assets", "ui", name), { force: true });
    await rm(path.join(projectRoot, "game", "wechat-minigame", "assets", "ui", name), { force: true });
  }
}

async function writeAsset(file, buffer) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
}
