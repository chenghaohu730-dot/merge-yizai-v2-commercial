import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(projectRoot, "game", "web-prototype", "package.json"));
const sharp = require("sharp");

const sheetSrc = "C:\\Users\\Administrator\\.codex\\generated_images\\019eb9ca-591a-7a82-95bd-d9cccd84c302\\ig_03376afc0d6a53e9016a2b8294f404819a918a31323453ebc2.png";
const generatedDir = path.join(projectRoot, "art", "generated");
const finalDir = path.join(projectRoot, "art", "final", "faces");
const webDir = path.join(projectRoot, "game", "web-prototype", "public", "assets", "faces");
const wechatDir = path.join(projectRoot, "game", "wechat-minigame", "assets", "faces");
const checkDir = path.join(projectRoot, "tests", "device-checks", "avatar-art");

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
  mkdir(finalDir, { recursive: true }),
  mkdir(webDir, { recursive: true }),
  mkdir(wechatDir, { recursive: true }),
  mkdir(checkDir, { recursive: true }),
]);

await copyFile(sheetSrc, path.join(generatedDir, "commercial_round_avatar_sheet_20260612.png"));
await copyFile(sheetSrc, path.join(generatedDir, "cute_avatar_sheet_20260612_round.png"));

const source = sharp(sheetSrc);
const meta = await source.metadata();
const cellW = Math.floor(meta.width / 4);
const cellH = Math.floor(meta.height / 3);
const cropSize = Math.round(meta.width * 0.228);
const rowCenters = [0.243, 0.514, 0.786].map((ratio) => Math.round(meta.height * ratio));
const positions = [
  [0, 0], [1, 0], [2, 0], [3, 0],
  [0, 1], [1, 1], [2, 1], [3, 1],
  [0, 2], [1, 2], [2, 2],
];
const contactCells = [];

for (let i = 0; i < positions.length; i += 1) {
  const [col, row] = positions[i];
  const cx = Math.round((col + 0.53) * cellW);
  const cy = rowCenters[row];
  const left = clamp(cx - Math.floor(cropSize / 2), 0, meta.width - cropSize);
  const top = clamp(cy - Math.floor(cropSize / 2), 0, meta.height - cropSize);
  const raw = await source
    .clone()
    .extract({
      left,
      top,
      width: cropSize,
      height: cropSize,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const keyed = removeGreenBackdrop(raw.data, raw.info.width, raw.info.height);
  const finalFace = await sharp(keyed, {
    raw: { width: raw.info.width, height: raw.info.height, channels: 4 },
  })
    .resize(512, 512, { fit: "fill" })
    .composite([{ input: circleMask(512), blend: "dest-in" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp(finalFace).toFile(path.join(finalDir, faceNames[i]));
  const runtimeFace = await sharp(finalFace)
    .resize(384, 384)
    .png({ compressionLevel: 9, palette: true, effort: 10 })
    .toBuffer();
  await sharp(runtimeFace).toFile(path.join(webDir, faceNames[i]));
  await sharp(runtimeFace).toFile(path.join(wechatDir, faceNames[i]));
  contactCells.push(await sharp(finalFace).resize(240, 240).toBuffer());
}

await makeContactSheet(contactCells);

console.log(JSON.stringify({
  ok: true,
  source: sheetSrc,
  generated: [
    "art/generated/commercial_round_avatar_sheet_20260612.png",
    "art/generated/cute_avatar_sheet_20260612_round.png",
    "tests/device-checks/avatar-art/perfect-round-faces-20260612.png",
  ],
  faces: faceNames.length,
}, null, 2));

function removeGreenBackdrop(data, width, height) {
  const out = Buffer.from(data);
  for (let i = 0; i < width * height; i += 1) {
    const p = i * 4;
    const r = out[p];
    const g = out[p + 1];
    const b = out[p + 2];
    if (r > 180 && b > 150 && g < 90 && Math.abs(r - b) < 90) {
      out[p] = 0;
      out[p + 1] = 0;
      out[p + 2] = 0;
      out[p + 3] = 0;
    }
  }
  return out;
}

function circleMask(size) {
  return Buffer.from(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="white"/></svg>`);
}

async function makeContactSheet(cells) {
  const cell = 260;
  const sheet = sharp({
    create: {
      width: cell * 4,
      height: cell * 3,
      channels: 4,
      background: { r: 244, g: 250, b: 255, alpha: 1 },
    },
  });
  const composites = cells.map((input, index) => ({
    input,
    left: (index % 4) * cell + 10,
    top: Math.floor(index / 4) * cell + 10,
  }));
  const out = await sheet.composite(composites).png({ compressionLevel: 9 }).toBuffer();
  await sharp(out).toFile(path.join(generatedDir, "perfect_round_faces_20260612.png"));
  await sharp(out).toFile(path.join(checkDir, "perfect-round-faces-20260612.png"));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
