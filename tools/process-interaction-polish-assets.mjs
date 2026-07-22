import { cp, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const projectRoot = path.resolve(import.meta.dirname, "..");
const webRoot = path.join(projectRoot, "game", "web-prototype");
const require = createRequire(path.join(webRoot, "package.json"));
const sharp = require("sharp");

const imagegenDropperSource =
  "C:\\Users\\Administrator\\.codex\\generated_images\\019ebb9f-91e2-7161-8986-5833d1292a56\\ig_03ff147368a3a8cb016a2bf6eb8f58819a93b9cfba8e28b9a5.png";
const imagegenCleanBackgroundSource =
  "C:\\Users\\Administrator\\.codex\\generated_images\\019ebb9f-91e2-7161-8986-5833d1292a56\\ig_03ff147368a3a8cb016a2bfc10b2f4819aaf3347cc24673c54.png";

const runtimeUiDirs = [
  path.join(webRoot, "public", "assets", "ui"),
  path.join(projectRoot, "game", "wechat-minigame", "assets", "ui"),
];
const finalDir = path.join(projectRoot, "art", "final", "interaction-polish-assets");
const splashBgPath = path.join(webRoot, "public", "assets", "ui", "splash_bg.jpg");

await mkdir(finalDir, { recursive: true });

const gameBgPath = imagegenCleanBackgroundSource;
const cleanGameBg = await buildCleanGameBackground(gameBgPath);
const dropper = await buildTransparentDropper(imagegenDropperSource);
const warningLine = await buildWarningLine();
const startButton = await buildStartButton(splashBgPath);
const controls = {
  control_sound: await buildControlButton(cleanGameBg, 236, 1221),
  control_pause: await buildControlButton(cleanGameBg, 375, 1221),
  control_restart: await buildControlButton(cleanGameBg, 515, 1221),
};

await cp(imagegenDropperSource, path.join(finalDir, "imagegen_dropper_source.png"));
await cp(imagegenCleanBackgroundSource, path.join(finalDir, "imagegen_clean_background_source.png"));
await writeFile(path.join(finalDir, "game_bg_cleaned_750x1334.jpg"), cleanGameBg);
await writeFile(path.join(finalDir, "dropper_head.png"), dropper);
await writeFile(path.join(finalDir, "warning_line.png"), warningLine);
await writeFile(path.join(finalDir, "button_start.png"), startButton);
for (const [key, buffer] of Object.entries(controls)) {
  await writeFile(path.join(finalDir, `${key}.png`), buffer);
}

for (const dir of runtimeUiDirs) {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "game_bg.jpg"), cleanGameBg);
  await writeFile(path.join(dir, "dropper_head.png"), dropper);
  await writeFile(path.join(dir, "warning_line.png"), warningLine);
  await writeFile(path.join(dir, "button_start.png"), startButton);
  for (const [key, buffer] of Object.entries(controls)) {
    await writeFile(path.join(dir, `${key}.png`), buffer);
  }
}

await writeFile(path.join(projectRoot, "art", "final", "game_bg_750x1334.jpg"), cleanGameBg);
await writeFile(path.join(projectRoot, "art", "final", "ui", "dropper_head.png"), dropper);
await writeFile(path.join(projectRoot, "art", "final", "ui", "warning_line.png"), warningLine);
await writeFile(path.join(projectRoot, "art", "final", "ui", "button_start.png"), startButton);
for (const [key, buffer] of Object.entries(controls)) {
  await writeFile(path.join(projectRoot, "art", "final", "ui", `${key}.png`), buffer);
}

console.log(JSON.stringify({ ok: true, finalDir }, null, 2));

async function buildCleanGameBackground(file) {
  await stat(file);
  return sharp(file, { limitInputPixels: false })
    .resize(750, 1334, { fit: "cover", position: "center" })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

async function buildTransparentDropper(file) {
  await stat(file);
  const normalized = await sharp(file, { limitInputPixels: false })
    .resize(512, 512, { fit: "contain", background: "#00ff00" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = normalized;
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const greenDistance = Math.abs(r) + Math.abs(g - 255) + Math.abs(b);
    const isKey = greenDistance < 118 && g > 145 && r < 150 && b < 150;
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = isKey ? 0 : data[i + 3];
  }

  const trimmed = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ background: { r: 0, g: 255, b: 0, alpha: 0 }, threshold: 8 })
    .png()
    .toBuffer();
  const meta = await sharp(trimmed).metadata();
  const cropTop = Math.round((meta.height || 1) * 0.5);
  const subject = await sharp(trimmed)
    .extract({ left: 0, top: cropTop, width: meta.width || 1, height: Math.max(1, (meta.height || 1) - cropTop) })
    .resize(112, 112, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, colors: 220, effort: 10 })
    .toBuffer();

  const canvas = await sharp({
    create: {
      width: 128,
      height: 128,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: subject, left: 8, top: 4 }])
    .png({ compressionLevel: 9, palette: true, colors: 220, effort: 10 })
    .toBuffer();

  return canvas;
}

async function buildWarningLine() {
  const svg = `<svg width="560" height="64" viewBox="0 0 560 64" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow" x="-10%" y="-80%" width="120%" height="260%">
        <feGaussianBlur stdDeviation="3.2" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <line x1="18" y1="32" x2="542" y2="32" stroke="#ff5634" stroke-width="7" stroke-linecap="round" stroke-dasharray="26 20" filter="url(#glow)"/>
    <line x1="18" y1="32" x2="542" y2="32" stroke="#fff2d4" stroke-width="3" stroke-linecap="round" stroke-dasharray="26 20" opacity="0.86"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, colors: 180, effort: 10 }).toBuffer();
}

async function buildStartButton(file) {
  await stat(file);
  const crop = await sharp(file, { limitInputPixels: false })
    .extract({ left: 177, top: 896, width: 400, height: 176 })
    .resize(520, 230, { fit: "fill" })
    .png()
    .toBuffer();
  const maskSvg = `<svg width="520" height="230" viewBox="0 0 520 230" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="58" width="492" height="150" rx="52" fill="#000"/>
  </svg>`;
  const mask = await sharp(Buffer.from(maskSvg)).resize(520, 230, { fit: "fill" }).png().toBuffer();
  const masked = await sharp(crop)
    .ensureAlpha()
    .composite([{ input: mask, left: 0, top: 0, blend: "dest-in" }])
    .png()
    .toBuffer();
  const isolated = await sharp(masked)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .resize(520, 158, { fit: "fill" })
    .png({ compressionLevel: 9, palette: true, colors: 240, effort: 10 })
    .toBuffer();
  return isolated;
}

async function buildControlButton(sourceBuffer, centerX, centerY) {
  const crop = await sharp(sourceBuffer, { limitInputPixels: false })
    .extract({ left: centerX - 64, top: centerY - 64, width: 128, height: 128 })
    .png()
    .toBuffer();
  const mask = Buffer.from(`<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
    <circle cx="64" cy="64" r="54" fill="#000"/>
  </svg>`);
  return sharp(crop)
    .ensureAlpha()
    .composite([{ input: mask, left: 0, top: 0, blend: "dest-in" }])
    .png({ compressionLevel: 9, palette: true, colors: 220, effort: 10 })
    .toBuffer();
}
