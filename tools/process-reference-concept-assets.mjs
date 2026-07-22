import { cp, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const projectRoot = path.resolve(import.meta.dirname, "..");
const webRoot = path.join(projectRoot, "game", "web-prototype");
const require = createRequire(path.join(webRoot, "package.json"));
const sharp = require("sharp");

const splashReference =
  "D:\\Documents\\xwechat_files\\wxid_7huhikq24u1m21_48f0\\temp\\RWTemp\\2026-06\\9e20f478899dc29eb19741386f9343c8\\6aa4896df690b6ebe26006f42501c2db.png";
const gameReference =
  "D:\\Documents\\xwechat_files\\wxid_7huhikq24u1m21_48f0\\temp\\RWTemp\\2026-06\\9e20f478899dc29eb19741386f9343c8\\3299e05d7e0e4bafd7f3d793538b4d33.png";
const imagegenGameCandidate = path.join(
  projectRoot,
  "art",
  "generated",
  "imagegen-reference-empty-machine",
  "imagegen_empty_machine.png",
);

const W = 750;
const H = 1334;
const runtimeUiDirs = [
  path.join(webRoot, "public", "assets", "ui"),
  path.join(projectRoot, "game", "wechat-minigame", "assets", "ui"),
];
const finalRoot = path.join(projectRoot, "art", "final", "reference-concept-assets");
const checksRoot = path.join(projectRoot, "tests", "device-checks", "reference-concept-assets");

for (const file of [splashReference, gameReference]) {
  await stat(file);
}

await mkdir(finalRoot, { recursive: true });
await mkdir(checksRoot, { recursive: true });
await cp(splashReference, path.join(finalRoot, "reference_start_original.png"));
await cp(gameReference, path.join(finalRoot, "reference_playing_original.png"));
if (await fileExists(imagegenGameCandidate)) {
  await cp(imagegenGameCandidate, path.join(finalRoot, "imagegen_empty_machine_original.png"));
}

const splashBg = await sharp(splashReference, { limitInputPixels: false })
  .resize(W, H, { fit: "cover", position: "center" })
  .jpeg({ quality: 93, mozjpeg: true })
  .toBuffer();

const conceptGame = await sharp(gameReference, { limitInputPixels: false })
  .resize(W, H, { fit: "cover", position: "center" })
  .png()
  .toBuffer();

const gameBg = (await fileExists(imagegenGameCandidate))
  ? await sharp(imagegenGameCandidate, { limitInputPixels: false })
      .resize(W, H, { fit: "cover", position: "center" })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer()
  : await sharp(conceptGame)
      .composite([
        { input: await buildCleanPlayfieldInterior(conceptGame), left: 74, top: 285 },
        { input: scorePanelPatch(288, 134, "left"), left: 28, top: 42 },
        { input: scorePanelPatch(148, 126, "middle"), left: 462, top: 50 },
        { input: scorePanelPatch(134, 134, "circle"), left: 598, top: 28 },
      ])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

const frame = await buildGlassFrame();
const warningLine = await buildWarningLine();
const dropperHead = await buildDropperHead(
  (await fileExists(imagegenGameCandidate))
    ? await sharp(imagegenGameCandidate, { limitInputPixels: false }).resize(W, H, { fit: "cover", position: "center" }).png().toBuffer()
    : conceptGame,
);

await writeFinalAndRuntime("splash_bg.jpg", splashBg);
await writeFinalAndRuntime("game_bg.jpg", gameBg);
await writeFinalAndRuntime("playfield_frame.png", frame);
await writeFinalAndRuntime("warning_line.png", warningLine);
await writeFinalAndRuntime("dropper_head.png", dropperHead);

await writeFile(path.join(finalRoot, "splash_bg_750x1334.jpg"), splashBg);
await writeFile(path.join(finalRoot, "game_bg_750x1334.jpg"), gameBg);
await writeFile(path.join(finalRoot, "playfield_frame_750x1334.png"), frame);
await writeFile(path.join(finalRoot, "warning_line.png"), warningLine);
await writeFile(path.join(finalRoot, "dropper_head.png"), dropperHead);

await writeFile(path.join(projectRoot, "art", "final", "ui_splash_750x1334.jpg"), splashBg);
await writeFile(path.join(projectRoot, "art", "final", "game_bg_750x1334.jpg"), gameBg);
await writeFile(path.join(projectRoot, "art", "final", "ui", "playfield_frame.png"), frame);
await writeFile(path.join(projectRoot, "art", "final", "ui", "warning_line.png"), warningLine);
await writeFile(path.join(projectRoot, "art", "final", "ui", "dropper_head.png"), dropperHead);

await makeContactSheet();

await writeFile(
  path.join(finalRoot, "asset-processing-report.json"),
  JSON.stringify(
    {
      ok: true,
      source: { splashReference, gameReference },
      imagegenGameCandidate: (await fileExists(imagegenGameCandidate)) ? imagegenGameCandidate : null,
      notes: [
        "启动页使用用户确认的最终概念图作为运行母图。",
        "游戏页使用用户确认的最终概念图提取机台外壳，并清理玩法区域里的静态球堆和固定分数，保留实时玩法绘制。",
        "玻璃框、警戒线和落点头按概念图风格重新生成/提取，避免旧资源压过最终参考效果。",
      ],
    },
    null,
    2,
  ),
  "utf8",
);

console.log(JSON.stringify({ ok: true, finalRoot, checksRoot }, null, 2));

async function buildCleanPlayfieldInterior(conceptGame) {
  const upperGlass = await sharp(conceptGame)
    .extract({ left: 92, top: 302, width: 566, height: 300 })
    .resize(602, 772, { fit: "cover", position: "top" })
    .blur(8)
    .modulate({ brightness: 0.82, saturation: 0.82 })
    .png()
    .toBuffer();

  const overlay = Buffer.from(`<svg width="602" height="772" viewBox="0 0 602 772" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pane" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#a7d7f7" stop-opacity="0.23"/>
        <stop offset="0.44" stop-color="#ffffff" stop-opacity="0.08"/>
        <stop offset="1" stop-color="#ffce8a" stop-opacity="0.20"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="12%" r="82%">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.26"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="602" height="772" rx="34" fill="#342835" fill-opacity="0.34"/>
    <rect x="0" y="0" width="602" height="772" rx="34" fill="url(#pane)"/>
    <rect x="0" y="0" width="602" height="772" rx="34" fill="url(#glow)"/>
  </svg>`);

  return sharp(upperGlass).composite([{ input: overlay, left: 0, top: 0 }]).png({ compressionLevel: 9 }).toBuffer();
}

async function fileExists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function scorePanelPatch(width, height, type) {
  const rx = type === "circle" ? height / 2 : 26;
  const fill = type === "circle" ? "#5d1e43" : "#4a1a36";
  const stroke = type === "middle" ? "#ffbe75" : "#ffb96d";
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${fill}"/>
        <stop offset="1" stop-color="#251423"/>
      </linearGradient>
      <pattern id="p" width="18" height="18" patternUnits="userSpaceOnUse">
        <rect width="9" height="9" fill="#ffffff" opacity="0.035"/>
        <rect x="9" y="9" width="9" height="9" fill="#ffffff" opacity="0.035"/>
      </pattern>
    </defs>
    <rect x="7" y="7" width="${width - 14}" height="${height - 14}" rx="${rx}" fill="url(#g)" stroke="${stroke}" stroke-width="8"/>
    <rect x="13" y="13" width="${width - 26}" height="${height - 26}" rx="${Math.max(10, rx - 7)}" fill="url(#p)" opacity="0.88"/>
  </svg>`);
}

async function buildGlassFrame() {
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="edge" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.92"/>
        <stop offset="0.42" stop-color="#bdf2ff" stop-opacity="0.32"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0.82"/>
      </linearGradient>
      <linearGradient id="shine" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="0.12" stop-color="#ffffff" stop-opacity="0.68"/>
        <stop offset="0.22" stop-color="#ffffff" stop-opacity="0.08"/>
        <stop offset="0.84" stop-color="#ffffff" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="73" y="282" width="604" height="782" rx="32" fill="none" stroke="#ffffff" stroke-opacity="0.80" stroke-width="12"/>
    <rect x="84" y="294" width="582" height="758" rx="26" fill="none" stroke="#8be7ff" stroke-opacity="0.28" stroke-width="6"/>
    <rect x="94" y="304" width="562" height="730" rx="22" fill="none" stroke="url(#edge)" stroke-width="4"/>
    <path d="M112 322 C122 500 120 744 116 1018" stroke="url(#shine)" stroke-width="16" stroke-linecap="round" opacity="0.42"/>
    <path d="M637 336 C626 520 626 770 634 1002" stroke="#ffffff" stroke-width="9" stroke-linecap="round" opacity="0.35"/>
    <path d="M104 316 C246 274 502 275 648 318" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.24"/>
    <path d="M132 1038 C268 1070 486 1070 620 1036" stroke="#ffffff" stroke-width="10" stroke-linecap="round" opacity="0.18"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

async function buildWarningLine() {
  const svg = `<svg width="560" height="64" viewBox="0 0 560 64" xmlns="http://www.w3.org/2000/svg">
    <line x1="8" y1="32" x2="552" y2="32" stroke="#ff4c27" stroke-width="7" stroke-linecap="round" stroke-dasharray="24 18"/>
    <line x1="8" y1="32" x2="552" y2="32" stroke="#fff2d4" stroke-width="3" stroke-linecap="round" stroke-dasharray="24 18" opacity="0.9"/>
    <rect x="42" y="6" width="140" height="52" rx="18" fill="#f04a27" stroke="#fff5d5" stroke-width="5"/>
    <text x="112" y="41" text-anchor="middle" font-family="Microsoft YaHei, Arial, sans-serif" font-size="29" font-weight="900" fill="#ffffff">警戒线</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

async function buildDropperHead(conceptGame) {
  const raw = await sharp(conceptGame)
    .extract({ left: 330, top: 215, width: 90, height: 92 })
    .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp(raw).modulate({ brightness: 1.05, saturation: 1.06 }).png({ compressionLevel: 9, palette: true, colors: 192, effort: 10 }).toBuffer();
}

async function writeFinalAndRuntime(name, buffer) {
  for (const dir of runtimeUiDirs) {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), await optimizeRuntime(name, buffer));
  }
}

async function optimizeRuntime(name, buffer) {
  if (name.endsWith(".jpg")) return buffer;
  let image = sharp(buffer, { limitInputPixels: false });
  if (name === "dropper_head.png") image = image.resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (name === "warning_line.png") image = image.resize(560, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  return image.png({ compressionLevel: 9, palette: true, colors: 220, effort: 10 }).toBuffer();
}

async function makeContactSheet() {
  const currentStart = await sharp(splashBg).resize(360, 640).png().toBuffer();
  const currentGame = await sharp(gameBg).resize(360, 640).png().toBuffer();
  const referenceStart = await sharp(splashReference).resize(360, 640, { fit: "cover" }).png().toBuffer();
  const referenceGame = await sharp(gameReference).resize(360, 640, { fit: "cover" }).png().toBuffer();
  const labels = Buffer.from(`<svg width="1440" height="80" xmlns="http://www.w3.org/2000/svg">
    <rect width="1440" height="80" fill="#ffffff"/>
    <text x="180" y="50" text-anchor="middle" font-family="Arial, Microsoft YaHei" font-size="28" font-weight="800" fill="#333">参考启动页</text>
    <text x="540" y="50" text-anchor="middle" font-family="Arial, Microsoft YaHei" font-size="28" font-weight="800" fill="#333">运行启动页</text>
    <text x="900" y="50" text-anchor="middle" font-family="Arial, Microsoft YaHei" font-size="28" font-weight="800" fill="#333">参考游戏页</text>
    <text x="1260" y="50" text-anchor="middle" font-family="Arial, Microsoft YaHei" font-size="28" font-weight="800" fill="#333">清理后游戏页</text>
  </svg>`);
  await sharp({
    create: { width: 1440, height: 720, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([
      { input: labels, left: 0, top: 0 },
      { input: referenceStart, left: 0, top: 80 },
      { input: currentStart, left: 360, top: 80 },
      { input: referenceGame, left: 720, top: 80 },
      { input: currentGame, left: 1080, top: 80 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(checksRoot, "reference_asset_comparison.png"));
}
