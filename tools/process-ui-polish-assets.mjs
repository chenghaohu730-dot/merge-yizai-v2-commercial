import { mkdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(projectRoot, "game", "web-prototype", "package.json"));
const sharp = require("sharp");

const generatedRoot = "C:\\Users\\Administrator\\.codex\\generated_images\\019eb5c4-90d6-78e3-b89c-d877a5d8e22b";
const avatarSheetSrc = path.join(generatedRoot, "ig_0b2483f1e671790c016a2b622b7d6081998bfb861d06038545.png");
const controlsSrc = path.join(generatedRoot, "ig_0b2483f1e671790c016a2b6295d1f481998edac881e251e29f.png");
const frameSrc = path.join(generatedRoot, "ig_0b2483f1e671790c016a2b62d02dc48199bc5d6f11a0694397.png");

const generatedDir = path.join(projectRoot, "art", "generated");
const uiFinalDir = path.join(projectRoot, "art", "final", "ui");
const faceFinalDir = path.join(projectRoot, "art", "final", "faces");
const webFaceDir = path.join(projectRoot, "game", "web-prototype", "public", "assets", "faces");
const wechatFaceDir = path.join(projectRoot, "game", "wechat-minigame", "assets", "faces");
const webUiDir = path.join(projectRoot, "game", "web-prototype", "public", "assets", "ui");
const wechatUiDir = path.join(projectRoot, "game", "wechat-minigame", "assets", "ui");

const faceNames = [
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

await Promise.all([
  mkdir(generatedDir, { recursive: true }),
  mkdir(uiFinalDir, { recursive: true }),
  mkdir(faceFinalDir, { recursive: true }),
  mkdir(webFaceDir, { recursive: true }),
  mkdir(wechatFaceDir, { recursive: true }),
  mkdir(webUiDir, { recursive: true }),
  mkdir(wechatUiDir, { recursive: true }),
]);

await copyFile(avatarSheetSrc, path.join(generatedDir, "cute_avatar_sheet_20260612_round.png"));
await copyFile(controlsSrc, path.join(generatedDir, "ui_control_icons_20260612.png"));
await copyFile(frameSrc, path.join(generatedDir, "playfield_frame_20260612.png"));

await extractFaces();
await extractControls();
await extractFrame();

console.log(JSON.stringify({
  ok: true,
  generated: [
    "art/generated/cute_avatar_sheet_20260612_round.png",
    "art/generated/ui_control_icons_20260612.png",
    "art/generated/playfield_frame_20260612.png",
    "art/final/ui/control_sound.png",
    "art/final/ui/control_pause.png",
    "art/final/ui/control_restart.png",
    "art/final/ui/playfield_frame.png",
  ],
}, null, 2));

async function extractFaces() {
  const source = sharp(avatarSheetSrc);
  const meta = await source.metadata();
  const cellW = Math.floor(meta.width / 4);
  const cellH = Math.floor(meta.height / 3);
  const positions = [
    [0, 0], [1, 0], [2, 0], [3, 0],
    [0, 1], [1, 1], [2, 1], [3, 1],
    [0, 2], [1, 2], [2, 2],
  ];

  for (let i = 0; i < positions.length; i += 1) {
    const [col, row] = positions[i];
    const crop = await source
      .clone()
      .extract({
        left: col * cellW,
        top: row * cellH,
        width: col === 3 ? meta.width - col * cellW : cellW,
        height: row === 2 ? meta.height - row * cellH : cellH,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const keyed = removeConnectedBackdrop(crop.data, crop.info.width, crop.info.height, isCheckerBackdrop);
    const bbox = alphaBounds(keyed, crop.info.width, crop.info.height, 8);
    const faceBuffer = await sharp(keyed, {
      raw: { width: crop.info.width, height: crop.info.height, channels: 4 },
    })
      .extract(bbox)
      .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .composite([{ input: circleMask(512, 255), blend: "dest-in" }])
      .png({ compressionLevel: 9 })
      .toBuffer();

    const finalPath = path.join(faceFinalDir, faceNames[i]);
    await sharp(faceBuffer).toFile(finalPath);
    const runtimeFace = await sharp(faceBuffer)
      .resize(384, 384, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true, effort: 10 })
      .toBuffer();
    await sharp(runtimeFace).toFile(path.join(webFaceDir, faceNames[i]));
    await sharp(runtimeFace).toFile(path.join(wechatFaceDir, faceNames[i]));
  }
}

async function extractControls() {
  const meta = await sharp(controlsSrc).metadata();
  const cellW = Math.floor(meta.width / 3);
  const names = ["control_sound.png", "control_pause.png", "control_restart.png"];
  for (let i = 0; i < 3; i += 1) {
    const raw = await sharp(controlsSrc)
      .extract({ left: i * cellW, top: 0, width: i === 2 ? meta.width - i * cellW : cellW, height: meta.height })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const keyed = removeConnectedBackdrop(raw.data, raw.info.width, raw.info.height, isGreenBackdrop);
    const bbox = alphaBounds(keyed, raw.info.width, raw.info.height, 10);
    const out = await sharp(keyed, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } })
      .extract(bbox)
      .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await sharp(out).toFile(path.join(uiFinalDir, names[i]));
    await sharp(out).toFile(path.join(webUiDir, names[i]));
    await sharp(out).toFile(path.join(wechatUiDir, names[i]));
  }
}

async function extractFrame() {
  const raw = await sharp(frameSrc)
    .resize(750, 1334, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const keyed = removeConnectedBackdrop(raw.data, raw.info.width, raw.info.height, isGreenBackdrop);
  const out = await sharp(keyed, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } })
    .png({ compressionLevel: 9, palette: true, effort: 10 })
    .toBuffer();
  await sharp(out).toFile(path.join(uiFinalDir, "playfield_frame.png"));
  await sharp(out).toFile(path.join(webUiDir, "playfield_frame.png"));
  await sharp(out).toFile(path.join(wechatUiDir, "playfield_frame.png"));
}

function removeConnectedBackdrop(data, width, height, predicate) {
  const out = Buffer.from(data);
  const seen = new Uint8Array(width * height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx]) return;
    const p = idx * 4;
    if (!predicate(out[p], out[p + 1], out[p + 2], out[p + 3])) return;
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
  return out;
}

function alphaBounds(data, width, height, pad) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) {
    return { left: 0, top: 0, width, height };
  }
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(width - 1, maxX + pad);
  const bottom = Math.min(height - 1, maxY + pad);
  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function isCheckerBackdrop(r, g, b, alpha) {
  if (alpha < 10) return true;
  const neutral = Math.abs(r - g) < 8 && Math.abs(g - b) < 8;
  return neutral && r >= 218 && r <= 255;
}

function isGreenBackdrop(r, g, b, alpha) {
  if (alpha < 10) return true;
  return g > 170 && r < 80 && b < 80;
}

function circleMask(size, radius) {
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="white"/>
    </svg>
  `);
}
