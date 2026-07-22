import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(projectRoot, "game", "web-prototype", "package.json"));
const sharp = require("sharp");
const sourcePath = path.join(projectRoot, "art", "generated", "cute_avatar_sheet_20260611.png");
const outputDirs = [
  path.join(projectRoot, "art", "final", "faces"),
  path.join(projectRoot, "game", "web-prototype", "public", "assets", "faces"),
  path.join(projectRoot, "game", "wechat-minigame", "assets", "faces"),
];

const faceFiles = [
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

const source = sharp(sourcePath);
const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
const groups = findHorizontalGroups(data, info);

if (groups.length !== 11) {
  throw new Error(`Expected 11 avatar groups, got ${groups.length}: ${JSON.stringify(groups)}`);
}

for (const dir of outputDirs) {
  await mkdir(dir, { recursive: true });
}

for (let index = 0; index < groups.length; index += 1) {
  const box = findContentBox(data, info, groups[index]);
  const crop = boundedCrop(box, groups, index, info, 4);
  const cropped = await sharp(sourcePath).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const transparent = removeBorderBackground(cropped.data, cropped.info);
  const png = await sharp(transparent, {
    raw: {
      width: cropped.info.width,
      height: cropped.info.height,
      channels: 4,
    },
  })
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 88, effort: 10 })
    .toBuffer();

  for (const dir of outputDirs) {
    await sharp(png).toFile(path.join(dir, faceFiles[index]));
  }
}

console.log(JSON.stringify({ ok: true, source: sourcePath, groups: groups.length, files: faceFiles }, null, 2));

function isInk(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min < 230 || max - min > 22;
}

function isBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min >= 225 && max - min <= 28;
}

function pixelAt(buffer, info, x, y) {
  const i = (y * info.width + x) * info.channels;
  return [buffer[i], buffer[i + 1], buffer[i + 2], info.channels > 3 ? buffer[i + 3] : 255];
}

function findHorizontalGroups(buffer, imageInfo) {
  const columns = new Array(imageInfo.width).fill(0);
  for (let y = 0; y < imageInfo.height; y += 1) {
    for (let x = 0; x < imageInfo.width; x += 1) {
      const [r, g, b] = pixelAt(buffer, imageInfo, x, y);
      if (isInk(r, g, b)) columns[x] += 1;
    }
  }

  const groups = [];
  let start = -1;
  for (let x = 0; x < columns.length; x += 1) {
    if (columns[x] > 8 && start === -1) start = x;
    if ((columns[x] <= 8 || x === columns.length - 1) && start !== -1) {
      const end = x;
      if (end - start > 20) groups.push({ left: start, right: end });
      start = -1;
    }
  }
  return groups;
}

function findContentBox(buffer, imageInfo, group) {
  let left = imageInfo.width;
  let right = 0;
  let top = imageInfo.height;
  let bottom = 0;
  for (let y = 0; y < imageInfo.height; y += 1) {
    for (let x = group.left; x <= group.right; x += 1) {
      const [r, g, b] = pixelAt(buffer, imageInfo, x, y);
      if (!isInk(r, g, b)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}

function boundedCrop(box, groups, index, imageInfo, padding) {
  const prevRight = index > 0 ? groups[index - 1].right : 0;
  const nextLeft = index < groups.length - 1 ? groups[index + 1].left : imageInfo.width - 1;
  const leftLimit = index > 0 ? Math.ceil((prevRight + groups[index].left) / 2) : 0;
  const rightLimit = index < groups.length - 1 ? Math.floor((groups[index].right + nextLeft) / 2) : imageInfo.width - 1;
  const left = Math.max(0, leftLimit, box.left - padding);
  const right = Math.min(imageInfo.width - 1, rightLimit, box.right + padding);
  const top = Math.max(0, box.top - padding);
  const bottom = Math.min(imageInfo.height - 1, box.bottom + padding);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function removeBorderBackground(buffer, imageInfo) {
  const width = imageInfo.width;
  const height = imageInfo.height;
  const channels = imageInfo.channels;
  const out = Buffer.from(buffer);
  const seen = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x += 1) {
    queueIfBackground(x, 0);
    queueIfBackground(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    queueIfBackground(0, y);
    queueIfBackground(width - 1, y);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head];
    const i = (y * width + x) * 4;
    out[i + 3] = 0;
    queueIfBackground(x + 1, y);
    queueIfBackground(x - 1, y);
    queueIfBackground(x, y + 1);
    queueIfBackground(x, y - 1);
  }

  return out;

  function queueIfBackground(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const key = y * width + x;
    if (seen[key]) return;
    const i = key * channels;
    if (!isBackground(out[i], out[i + 1], out[i + 2])) return;
    seen[key] = 1;
    queue.push([x, y]);
  }
}
