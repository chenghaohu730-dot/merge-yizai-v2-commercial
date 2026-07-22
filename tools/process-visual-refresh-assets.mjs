import { mkdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(projectRoot, "game", "web-prototype", "package.json"));
const sharp = require("sharp");

const generatedRoot = "C:\\Users\\Administrator\\.codex\\generated_images\\019eb5c4-90d6-78e3-b89c-d877a5d8e22b";
const cuteBgSrc = path.join(generatedRoot, "ig_0b2483f1e671790c016a2b69e6c37c81999a6e196e3a3f9a14.png");
const thinFrameSrc = path.join(generatedRoot, "ig_0b2483f1e671790c016a2b698328e48199b373f28dc7561957.png");
const startPanelSrc = path.join(generatedRoot, "ig_0b2483f1e671790c016a2b673bb6e08199b59458525a465dcd.png");

const generatedDir = path.join(projectRoot, "art", "generated");
const finalDir = path.join(projectRoot, "art", "final");
const finalUiDir = path.join(finalDir, "ui");
const webUiDir = path.join(projectRoot, "game", "web-prototype", "public", "assets", "ui");
const wechatUiDir = path.join(projectRoot, "game", "wechat-minigame", "assets", "ui");

await Promise.all([
  mkdir(generatedDir, { recursive: true }),
  mkdir(finalUiDir, { recursive: true }),
  mkdir(webUiDir, { recursive: true }),
  mkdir(wechatUiDir, { recursive: true }),
]);

await copyFile(cuteBgSrc, path.join(generatedDir, "game_background_20260612_cute.png"));
await copyFile(thinFrameSrc, path.join(generatedDir, "playfield_frame_20260612_thin.png"));
await copyFile(startPanelSrc, path.join(generatedDir, "start_panel_20260612.png"));

const bg = await sharp(cuteBgSrc)
  .resize(750, 1334, { fit: "cover" })
  .jpeg({ quality: 84, mozjpeg: true })
  .toBuffer();
await sharp(bg).toFile(path.join(finalDir, "game_bg_750x1334.jpg"));
await sharp(bg).toFile(path.join(webUiDir, "game_bg.jpg"));
await sharp(bg).toFile(path.join(wechatUiDir, "game_bg.jpg"));

const frame = await keyGreen(thinFrameSrc, 750, 1334);
await sharp(frame, { raw: { width: 750, height: 1334, channels: 4 } })
  .png({ compressionLevel: 9, palette: true, effort: 10 })
  .toFile(path.join(finalUiDir, "playfield_frame.png"));
await sharp(path.join(finalUiDir, "playfield_frame.png")).toFile(path.join(webUiDir, "playfield_frame.png"));
await sharp(path.join(finalUiDir, "playfield_frame.png")).toFile(path.join(wechatUiDir, "playfield_frame.png"));

const panelRaw = await keyGreen(startPanelSrc, 1024, 768);
const panel = await sharp(panelRaw, { raw: { width: 1024, height: 768, channels: 4 } })
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
  .resize(700, 460, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9, palette: true, effort: 10 })
  .toBuffer();
await sharp(panel).toFile(path.join(finalUiDir, "start_panel.png"));
await sharp(panel).toFile(path.join(webUiDir, "start_panel.png"));
await sharp(panel).toFile(path.join(wechatUiDir, "start_panel.png"));

console.log(JSON.stringify({
  ok: true,
  generated: [
    "art/generated/game_background_20260612_cute.png",
    "art/generated/playfield_frame_20260612_thin.png",
    "art/generated/start_panel_20260612.png",
    "art/final/game_bg_750x1334.jpg",
    "art/final/ui/playfield_frame.png",
    "art/final/ui/start_panel.png",
  ],
}, null, 2));

async function keyGreen(file, width, height) {
  const raw = await sharp(file)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return removeConnectedBackdrop(raw.data, raw.info.width, raw.info.height);
}

function removeConnectedBackdrop(data, width, height) {
  const out = Buffer.from(data);
  const seen = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx]) return;
    const p = idx * 4;
    const r = out[p];
    const g = out[p + 1];
    const b = out[p + 2];
    const a = out[p + 3];
    if (!(a < 8 || (g > 145 && g > r * 1.45 && g > b * 1.45))) return;
    seen[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const idx = queue[head];
    const x = idx % width;
    const y = Math.floor(idx / width);
    const p = idx * 4;
    out[p] = 0;
    out[p + 1] = 0;
    out[p + 2] = 0;
    out[p + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }
  for (let idx = 0; idx < width * height; idx += 1) {
    const p = idx * 4;
    const r = out[p];
    const g = out[p + 1];
    const b = out[p + 2];
    const a = out[p + 3];
    if (a > 0 && g > 105 && g > r * 1.18 && g > b * 1.18) {
      out[p] = 0;
      out[p + 1] = 0;
      out[p + 2] = 0;
      out[p + 3] = 0;
    }
  }
  return out;
}
