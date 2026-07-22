import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(projectRoot, "game", "web-prototype", "package.json"));
const sharp = require("sharp");

const sheetRoot = path.join(projectRoot, "art", "generated", "v2-ai-sheets");
const packRoot = path.join(projectRoot, "art", "final", "v2-resource-pack");
const cocosRoot = path.join(projectRoot, "game", "cocos-creator-v2", "assets");
const checkRoot = path.join(projectRoot, "tests", "device-checks", "v2-ai-assets");

const defaultBallNames = [
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

const defaultBallThemes = [
  ["#8adf32", "#2d8f27"],
  ["#ffb07d", "#e96745"],
  ["#ff86ad", "#d6437b"],
  ["#ffd22c", "#f29415"],
  ["#59c9f3", "#168cc2"],
  ["#ffe48b", "#e5ad3a"],
  ["#c78a38", "#7d4d1c"],
  ["#8d54d8", "#542c9a"],
  ["#ff6535", "#c7311c"],
  ["#4754d9", "#23217e"],
  ["#ffffff", "#cfd3d8"],
];

const generated = [];
await Promise.all([
  mkdir(packRoot, { recursive: true }),
  mkdir(cocosRoot, { recursive: true }),
  mkdir(checkRoot, { recursive: true }),
]);

await processDefaultBallSheet();
await processSkinSheets();
await makeDefaultBallContactSheet();
await makeSkinContactSheet();
await validateBalls();
await writeManifest();

console.log(JSON.stringify({
  ok: true,
  generated: generated.length,
  packRoot,
  cocosRoot,
  checkRoot,
}, null, 2));

async function processDefaultBallSheet() {
  const sheet = path.join(sheetRoot, "default_balls_sheet.png");
  const meta = await sharp(sheet).metadata();
  const cellSize = Math.floor(meta.width / 4);
  const topOffset = Math.max(0, Math.floor((meta.height - cellSize * 3) / 2));

  for (let index = 0; index < defaultBallNames.length; index += 1) {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const left = Math.min(meta.width - cellSize, Math.round(col * meta.width / 4));
    const top = Math.min(meta.height - cellSize, topOffset + row * cellSize);
    const crop = await sharp(sheet)
      .extract({ left, top, width: cellSize, height: cellSize })
      .png()
      .toBuffer();
    const ball = await normalizeRoundBall(crop, index);
    await writeBoth(`balls/default/${defaultBallNames[index]}`, ball);
  }
}

async function processSkinSheets() {
  const skins = [
    ["jelly", "skin_jelly_sheet.png"],
    ["star", "skin_star_sheet.png"],
    ["cream", "skin_cream_sheet.png"],
    ["coin", "skin_coin_sheet.png"],
    ["festival", "skin_festival_sheet.png"],
  ];
  for (const [skin, sheetName] of skins) {
    const sheet = path.join(sheetRoot, sheetName);
    const meta = await sharp(sheet).metadata();
    const cellSize = Math.floor(meta.width / 4);
    const topOffset = Math.max(0, Math.floor((meta.height - cellSize * 3) / 2));
    const previewInputs = [];
    for (let index = 0; index < 10; index += 1) {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const left = Math.min(meta.width - cellSize, Math.round(col * meta.width / 4));
      const top = Math.min(meta.height - cellSize, topOffset + row * cellSize);
      const crop = await sharp(sheet)
        .extract({ left, top, width: cellSize, height: cellSize })
        .png()
        .toBuffer();
      const ball = await normalizeRoundBall(crop, index);
      await writeBoth(`balls/skins/${skin}/skin_${skin}_face_${String(index + 1).padStart(2, "0")}.png`, ball);
      if ([0, 4, 9].includes(index)) {
        previewInputs.push(await sharp(ball).resize(128, 128).png().toBuffer());
      }
    }

    const preview = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: previewInputs[0], left: 24, top: 90 },
        { input: previewInputs[1], left: 86, top: 38 },
        { input: previewInputs[2], left: 148, top: 118 },
      ])
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();
    await writeBoth(`balls/skins/${skin}/skin_preview_${skin}.png`, preview);
  }
}

async function normalizeRoundBall(input, index) {
  const keyed = await removeGreenOrUseAlpha(input);
  const trimmed = await sharp(keyed).trim({ threshold: 8 }).png().toBuffer().catch(async () => keyed);
  const squared = await squareCanvas(trimmed);
  const fitted = await sharp(squared)
    .resize(460, 460, { fit: "fill" })
    .ensureAlpha()
    .png()
    .toBuffer();

  const circleMask = Buffer.from(`<svg width="460" height="460" viewBox="0 0 460 460" xmlns="http://www.w3.org/2000/svg"><circle cx="230" cy="230" r="230" fill="#fff"/></svg>`);
  const [base, rim] = defaultBallThemes[index] || ["#ffffff", "#cccccc"];
  const baseCircle = Buffer.from(`<svg width="460" height="460" viewBox="0 0 460 460" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g" cx="34%" cy="24%" r="72%">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset=".23" stop-color="${base}"/>
        <stop offset="1" stop-color="${rim}"/>
      </radialGradient>
    </defs>
    <circle cx="230" cy="230" r="230" fill="url(#g)"/>
  </svg>`);
  const basePng = await sharp(baseCircle).png().toBuffer();
  const combined = await sharp(basePng)
    .composite([{ input: fitted, left: 0, top: 0 }])
    .png()
    .toBuffer();
  const maskPng = await sharp(circleMask).png().toBuffer();
  const circled = await sharp(combined)
    .composite([{ input: maskPng, blend: "dest-in" }])
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: circled, left: 26, top: 26 }])
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
}

async function squareCanvas(input) {
  const meta = await sharp(input).metadata();
  const side = Math.max(meta.width, meta.height);
  const left = Math.floor((side - meta.width) / 2);
  const top = Math.floor((side - meta.height) / 2);
  return sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input, left, top }])
    .png()
    .toBuffer();
}

async function removeGreenOrUseAlpha(input) {
  const image = sharp(input).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 12) transparent += 1;
  }

  if (transparent > info.width * info.height * 0.08) {
    return sharp(data, { raw: info }).png().toBuffer();
  }

  const queue = [];
  const seen = new Uint8Array(info.width * info.height);
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return;
    const idx = y * info.width + x;
    if (seen[idx]) return;
    seen[idx] = 1;
    const offset = idx * 4;
    if (isConnectedBackground(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])) {
      queue.push([x, y]);
    }
  };
  for (let x = 0; x < info.width; x += 1) {
    push(x, 0);
    push(x, info.height - 1);
  }
  for (let y = 0; y < info.height; y += 1) {
    push(0, y);
    push(info.width - 1, y);
  }
  for (let q = 0; q < queue.length; q += 1) {
    const [x, y] = queue[q];
    const idx = (y * info.width + x) * 4;
    data[idx + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  return sharp(data, { raw: info }).png().toBuffer();
}

function isConnectedBackground(r, g, b, a) {
  if (a < 12) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  return max - min <= 4 && avg >= 228;
}

async function makeDefaultBallContactSheet() {
  const thumbs = [];
  for (const name of defaultBallNames) {
    const file = path.join(packRoot, "assets", "balls", "default", name);
    thumbs.push(await sharp(file).resize(180, 180).png().toBuffer());
  }
  const composites = thumbs.map((input, index) => ({
    input,
    left: (index % 4) * 220 + 20,
    top: Math.floor(index / 4) * 220 + 20,
  }));
  const out = await sharp({
    create: {
      width: 880,
      height: 660,
      channels: 4,
      background: { r: 246, g: 250, b: 255, alpha: 1 },
    },
  }).composite(composites).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(checkRoot, "default_balls_contact_sheet.png"), out);
}

async function makeSkinContactSheet() {
  const skins = ["jelly", "star", "cream", "coin", "festival"];
  const composites = [];
  for (let row = 0; row < skins.length; row += 1) {
    const skin = skins[row];
    for (let col = 0; col < 10; col += 1) {
      const file = path.join(packRoot, "assets", "balls", "skins", skin, `skin_${skin}_face_${String(col + 1).padStart(2, "0")}.png`);
      composites.push({
        input: await sharp(file).resize(96, 96).png().toBuffer(),
        left: col * 110 + 12,
        top: row * 112 + 10,
      });
    }
  }
  const out = await sharp({
    create: {
      width: 1110,
      height: 570,
      channels: 4,
      background: { r: 246, g: 250, b: 255, alpha: 1 },
    },
  }).composite(composites).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(checkRoot, "skin_balls_contact_sheet.png"), out);
}

async function validateBalls() {
  const reports = [];
  const failures = [];
  const ballFiles = [
    ...defaultBallNames.map((name) => path.join("balls", "default", name)),
    ...["jelly", "star", "cream", "coin", "festival"].flatMap((skin) =>
      Array.from({ length: 10 }, (_, index) => path.join("balls", "skins", skin, `skin_${skin}_face_${String(index + 1).padStart(2, "0")}.png`))
    ),
  ];
  for (const rel of ballFiles) {
    const file = path.join(packRoot, "assets", rel);
    const name = rel.replaceAll("\\", "/");
    const meta = await sharp(file).metadata();
    if (meta.width !== 512 || meta.height !== 512 || !meta.hasAlpha) {
      failures.push(`${name}: expected 512x512 alpha PNG`);
    }
    const bounds = await alphaBounds(file);
    const report = { name, ...bounds };
    reports.push(report);
    if (bounds.minX < 26 || bounds.minY < 26 || bounds.maxX > 485 || bounds.maxY > 485) {
      failures.push(`${name}: transparent margin smaller than 26`);
    }
    if (bounds.width > 460 || bounds.height > 460) {
      failures.push(`${name}: subject larger than 460px circle`);
    }
    if (Math.abs(bounds.width - bounds.height) > 3) {
      failures.push(`${name}: normalized circle bounds not square enough`);
    }
    const corners = await sampleAlpha(file, [
      [26, 26],
      [485, 26],
      [26, 485],
      [485, 485],
    ]);
    const edgeCenters = await sampleAlpha(file, [
      [256, 26],
      [26, 256],
      [485, 256],
      [256, 485],
    ]);
    if (corners.some((value) => value > 12)) {
      failures.push(`${name}: 460px square corners must be transparent after circular mask`);
    }
    if (edgeCenters.some((value) => value < 180)) {
      failures.push(`${name}: circular edge centers must remain opaque`);
    }
  }

  await writeFile(path.join(checkRoot, "default_balls_validation.json"), JSON.stringify({
    ok: failures.length === 0,
    reports,
    failures,
  }, null, 2), "utf8");

  if (failures.length) {
    throw new Error(failures.join("\n"));
  }
}

async function sampleAlpha(file, points) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return points.map(([x, y]) => data[(y * info.width + x) * 4 + 3]);
}

async function alphaBounds(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function writeBoth(rel, buffer) {
  const packPath = path.join(packRoot, "assets", rel);
  const cocosPath = path.join(cocosRoot, rel);
  await mkdir(path.dirname(packPath), { recursive: true });
  await mkdir(path.dirname(cocosPath), { recursive: true });
  await writeFile(packPath, buffer);
  await copyFile(packPath, cocosPath);
  generated.push(`assets/${rel.replaceAll("\\", "/")}`);
}

async function writeManifest() {
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceSheets: {
      defaultBalls: path.join(sheetRoot, "default_balls_sheet.png"),
    },
    rules: {
      ballCanvas: "512x512",
      subjectCircleDiameter: 460,
      transparentMargin: 26,
      postProcess: "crop sheet cells, remove transparent/chroma background, fit inside 460px circle, apply circular alpha mask, place at 26px margin",
    },
    assets: generated,
  };
  await writeFile(path.join(packRoot, "ai_asset_manifest.json"), JSON.stringify(payload, null, 2), "utf8");
  await writeFile(path.join(cocosRoot, "data", "ai_asset_manifest.json"), JSON.stringify(payload, null, 2), "utf8");
}
