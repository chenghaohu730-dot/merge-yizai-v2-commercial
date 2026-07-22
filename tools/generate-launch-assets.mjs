import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(projectRoot, "game", "web-prototype", "package.json"));
const sharp = require("sharp");
const launchDir = path.join(projectRoot, "art", "launch");
const webUiDir = path.join(projectRoot, "game", "web-prototype", "public", "assets", "ui");
const wechatUiDir = path.join(projectRoot, "game", "wechat-minigame", "assets", "ui");
const yizaiPath = path.join(projectRoot, "art", "final", "faces", "face_11_yizai.png");
const face10Path = path.join(projectRoot, "art", "final", "faces", "face_10_crown_star.png");
const face8Path = path.join(projectRoot, "art", "final", "faces", "face_08_grape_zap.png");

await mkdir(launchDir, { recursive: true });
await mkdir(webUiDir, { recursive: true });
await mkdir(wechatUiDir, { recursive: true });

await makeAppIcon();
await makeShareCard();
await makeStoreCover();

await sharp(path.join(launchDir, "app_icon_1024.png"))
  .resize(256, 256)
  .png({ compressionLevel: 9, palette: true })
  .toFile(path.join(wechatUiDir, "app_icon.png"));
await sharp(path.join(launchDir, "app_icon_1024.png"))
  .resize(256, 256)
  .png({ compressionLevel: 9, palette: true })
  .toFile(path.join(webUiDir, "app_icon.png"));
await copyFile(path.join(launchDir, "share_card_1200x960.png"), path.join(wechatUiDir, "share_card.png"));
await copyFile(path.join(launchDir, "share_card_1200x960.png"), path.join(webUiDir, "share_card.png"));

console.log(JSON.stringify({
  ok: true,
  launchDir,
  generated: [
    "app_icon_1024.png",
    "share_card_1200x960.png",
    "store_cover_1280x720.png",
  ],
}, null, 2));

async function makeAppIcon() {
  const size = 1024;
  const bg = Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFF5BF"/>
          <stop offset="54%" stop-color="#FFC547"/>
          <stop offset="100%" stop-color="#F0832E"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#6B3B12" flood-opacity="0.35"/>
        </filter>
      </defs>
      <rect width="1024" height="1024" rx="210" fill="url(#bg)"/>
      <circle cx="214" cy="188" r="42" fill="#fff" opacity="0.45"/>
      <circle cx="820" cy="242" r="58" fill="#fff" opacity="0.28"/>
      <circle cx="812" cy="812" r="112" fill="#FFD85C" opacity="0.7"/>
      <path d="M126 770 C270 682 392 703 514 792 C620 872 734 891 906 800 L906 1024 L126 1024 Z" fill="#7F4F24" opacity="0.18"/>
      <text x="512" y="910" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-weight="900" font-size="116" fill="#44250D" opacity="0.9">合成亿仔</text>
    </svg>
  `);

  const yizai = await sharp(yizaiPath).resize(610, 610, { fit: "contain" }).png().toBuffer();
  await sharp(bg)
    .composite([{ input: yizai, left: 207, top: 180 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(launchDir, "app_icon_1024.png"));
}

async function makeShareCard() {
  const width = 1200;
  const height = 960;
  const bg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#DFF4FF"/>
          <stop offset="52%" stop-color="#FFF0BE"/>
          <stop offset="100%" stop-color="#E2C184"/>
        </linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="20" stdDeviation="18" flood-color="#4A4326" flood-opacity="0.24"/>
        </filter>
      </defs>
      <rect width="1200" height="960" rx="48" fill="url(#bg)"/>
      <rect x="78" y="86" width="1044" height="700" rx="42" fill="#FFF8DF" opacity="0.84" stroke="#5A4930" stroke-width="14"/>
      <line x1="124" y1="346" x2="1076" y2="346" stroke="#FF9387" stroke-width="8" stroke-dasharray="34 28" opacity="0.72"/>
      <text x="112" y="160" font-family="Microsoft YaHei, Arial" font-weight="900" font-size="72" fill="#211B14">合成亿仔</text>
      <text x="114" y="232" font-family="Microsoft YaHei, Arial" font-weight="700" font-size="34" fill="#6F5A3D">抽象头像一路合成，最后冲出带 MAEE 的亿仔</text>
      <rect x="112" y="808" width="976" height="94" rx="24" fill="#28343D"/>
      <text x="600" y="866" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-weight="900" font-size="42" fill="#FFFFFF">来挑战今天能不能合出亿仔</text>
      <circle cx="1022" cy="174" r="42" fill="#FFCF4D"/>
      <circle cx="1000" cy="732" r="66" fill="#FFFFFF" opacity="0.36"/>
    </svg>
  `);

  const face10 = await sharp(face10Path).resize(250, 250, { fit: "contain" }).png().toBuffer();
  const face8 = await sharp(face8Path).resize(210, 210, { fit: "contain" }).png().toBuffer();
  const yizai = await sharp(yizaiPath).resize(390, 390, { fit: "contain" }).png().toBuffer();

  await sharp(bg)
    .composite([
      { input: face8, left: 166, top: 430 },
      { input: face10, left: 440, top: 414 },
      { input: yizai, left: 692, top: 350 },
    ])
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(launchDir, "share_card_1200x960.png"));
}

async function makeStoreCover() {
  const width = 1280;
  const height = 720;
  const bg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#DDF5FF"/>
          <stop offset="55%" stop-color="#FFE9A6"/>
          <stop offset="100%" stop-color="#F6A33E"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" rx="36" fill="url(#bg)"/>
      <rect x="70" y="82" width="1140" height="554" rx="46" fill="#FFF8DF" opacity="0.78" stroke="#5A4930" stroke-width="12"/>
      <text x="104" y="184" font-family="Microsoft YaHei, Arial" font-weight="900" font-size="86" fill="#211B14">合成亿仔</text>
      <text x="110" y="264" font-family="Microsoft YaHei, Arial" font-weight="700" font-size="38" fill="#6F5A3D">2D 竖屏物理合成小游戏</text>
      <text x="110" y="570" font-family="Microsoft YaHei, Arial" font-weight="800" font-size="44" fill="#C06D22">合成更抽象，冲出最终亿仔</text>
      <line x1="110" y1="330" x2="680" y2="330" stroke="#FF9387" stroke-width="8" stroke-dasharray="30 24"/>
    </svg>
  `);

  const face10 = await sharp(face10Path).resize(220, 220, { fit: "contain" }).png().toBuffer();
  const yizai = await sharp(yizaiPath).resize(330, 330, { fit: "contain" }).png().toBuffer();

  await sharp(bg)
    .composite([
      { input: face10, left: 658, top: 290 },
      { input: yizai, left: 855, top: 212 },
    ])
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(launchDir, "store_cover_1280x720.png"));
}
