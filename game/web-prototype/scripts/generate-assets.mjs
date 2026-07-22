import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const projectRoot = path.resolve(root, "..", "..");
const finalDir = path.join(projectRoot, "art", "final", "faces");
const publicDir = path.join(root, "public", "assets", "faces");

const yizaiSourcePath = path.join(projectRoot, "art", "source", "yizai_highest_source.png");

const faces = [
  ["face_01_sprout_bead", "#56c7a6", faceDaidou],
  ["face_02_peach_puff", "#f5e8ce", faceHajimi],
  ["face_03_heart_jelly", "#f5a8be", facePinkSmirk],
  ["face_04_sun_wiggle", "#ffbf48", faceMambo],
  ["face_05_sky_spark", "#4fa8f5", faceBlueCrack],
  ["face_06_cream_smile", "#ffd866", faceMilkLaugh],
  ["face_07_seed_sage", "#cbb79a", faceOldMeme],
  ["face_08_grape_zap", "#b899ff", faceThunderHiss],
  ["face_09_flame_grin", "#ff795d", faceCrazyLaugh],
  ["face_10_crown_star", "#6a5cf6", faceAbstractKing],
];

await mkdir(finalDir, { recursive: true });
await mkdir(publicDir, { recursive: true });

for (const [name, color, draw] of faces) {
  const svg = svgWrap(draw(color));
  const svgPath = path.join(finalDir, `${name}.svg`);
  const pngPath = path.join(finalDir, `${name}.png`);
  const publicPath = path.join(publicDir, `${name}.png`);
  const wechatPath = path.join(projectRoot, "game", "wechat-minigame", "assets", "faces", `${name}.png`);
  await writeFile(svgPath, svg, "utf8");
  await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(pngPath);
  await copyFile(pngPath, publicPath);
  try {
    await mkdir(path.dirname(wechatPath), { recursive: true });
    await copyFile(pngPath, wechatPath);
  } catch {
    // The WeChat project may not exist yet in early setup runs.
  }
}

await generateYizaiHighest();

console.log(`Generated ${faces.length + 1} face assets.`);

async function generateYizaiHighest() {
  const name = "face_11_yizai";
  const pngPath = path.join(finalDir, `${name}.png`);
  const publicPath = path.join(publicDir, `${name}.png`);
  const wechatPath = path.join(projectRoot, "game", "wechat-minigame", "assets", "faces", `${name}.png`);
  const mask = Buffer.from(`<svg width="512" height="512" viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="#fff"/></svg>`);

  await sharp(yizaiSourcePath)
    .resize(512, 512, { fit: "cover", position: "center" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toFile(pngPath);

  await copyFile(pngPath, publicPath);
  try {
    await mkdir(path.dirname(wechatPath), { recursive: true });
    await copyFile(pngPath, wechatPath);
  } catch {
    // The WeChat project may not exist yet in early setup runs.
  }
}

function svgWrap(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#26313d" flood-opacity="0.24"/>
    </filter>
    <radialGradient id="shine" cx="35%" cy="24%" r="68%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.82"/>
      <stop offset="0.34" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.12"/>
    </radialGradient>
  </defs>
  ${content}
</svg>`;
}

function ball(color, extra = "") {
  return `<g filter="url(#shadow)">
    <circle cx="256" cy="256" r="198" fill="${color}" stroke="#26313d" stroke-width="24"/>
    <circle cx="256" cy="256" r="184" fill="url(#shine)"/>
    <ellipse cx="184" cy="178" rx="54" ry="30" fill="#fff" opacity="0.38"/>
    ${extra}
  </g>`;
}

function eye(cx, cy, rx = 20, ry = 28) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#161a1f"/>`;
}

function blush(cx, cy) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="34" ry="22" fill="#ff708e" opacity="0.5"/>`;
}

function openMouth(cx, cy, rx, ry) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#351b21"/>
  <ellipse cx="${cx}" cy="${cy + ry * 0.28}" rx="${rx * 0.58}" ry="${ry * 0.25}" fill="#ff6f8e"/>`;
}

function faceDaidou(color) {
  return ball(color, `${eye(198, 224, 16, 18)}${eye(314, 224, 16, 18)}
    <path d="M224 310 Q256 318 288 310" fill="none" stroke="#161a1f" stroke-width="14" stroke-linecap="round"/>`);
}

function faceHajimi(color) {
  return `<g filter="url(#shadow)">
    <path d="M118 170 L178 82 L198 176 Z" fill="${color}" stroke="#26313d" stroke-width="22" stroke-linejoin="round"/>
    <path d="M394 170 L334 82 L314 176 Z" fill="${color}" stroke="#26313d" stroke-width="22" stroke-linejoin="round"/>
    ${ball(color, `${eye(194, 235, 18, 30)}${eye(318, 235, 18, 30)}${openMouth(256, 318, 34, 48)}`)}
  </g>`;
}

function facePinkSmirk(color) {
  return ball(color, `<path d="M162 224 Q198 242 230 226" fill="none" stroke="#161a1f" stroke-width="16" stroke-linecap="round"/>
    <path d="M282 226 Q316 242 352 224" fill="none" stroke="#161a1f" stroke-width="16" stroke-linecap="round"/>
    ${blush(150, 286)}${blush(362, 286)}
    <path d="M190 324 Q262 372 340 306" fill="none" stroke="#161a1f" stroke-width="18" stroke-linecap="round"/>`);
}

function faceMambo(color) {
  return ball(color, `<g transform="rotate(-9 256 256)">
      ${eye(180, 214, 28, 18)}${eye(314, 248, 18, 30)}
      <path d="M188 326 Q270 390 356 300" fill="none" stroke="#161a1f" stroke-width="20" stroke-linecap="round"/>
      <path d="M92 162 Q46 132 34 84" fill="none" stroke="#ffef7a" stroke-width="18" stroke-linecap="round"/>
      <path d="M420 374 Q472 398 492 444" fill="none" stroke="#ffef7a" stroke-width="18" stroke-linecap="round"/>
    </g>`);
}

function faceBlueCrack(color) {
  return ball(color, `${eye(188, 210, 28, 34)}${eye(328, 210, 28, 34)}
    ${openMouth(256, 322, 64, 78)}
    <path d="M240 62 L256 144 L222 194" fill="none" stroke="#26313d" stroke-width="12" stroke-linecap="round"/>
    <path d="M342 354 L304 304 L338 254" fill="none" stroke="#26313d" stroke-width="12" stroke-linecap="round"/>`);
}

function faceMilkLaugh(color) {
  return ball(color, `${blush(142, 280)}${blush(370, 280)}
    <path d="M160 214 Q196 180 232 214" fill="none" stroke="#161a1f" stroke-width="17" stroke-linecap="round"/>
    <path d="M280 214 Q316 180 352 214" fill="none" stroke="#161a1f" stroke-width="17" stroke-linecap="round"/>
    ${openMouth(256, 318, 72, 74)}`);
}

function faceOldMeme(color) {
  return ball(color, `<path d="M150 164 Q256 190 362 164" fill="none" stroke="#7f6e59" stroke-width="10" stroke-linecap="round"/>
    <path d="M148 206 Q256 234 364 206" fill="none" stroke="#7f6e59" stroke-width="10" stroke-linecap="round"/>
    <path d="M160 248 Q196 268 232 250" fill="none" stroke="#161a1f" stroke-width="16" stroke-linecap="round"/>
    <path d="M280 250 Q316 268 352 248" fill="none" stroke="#161a1f" stroke-width="16" stroke-linecap="round"/>
    <path d="M190 338 Q256 310 322 338" fill="none" stroke="#161a1f" stroke-width="16" stroke-linecap="round"/>`);
}

function faceThunderHiss(color) {
  return ball(color, `<path d="M378 66 L326 184 L380 168 L314 328 L426 140 L372 154 Z" fill="#ffe94a" stroke="#26313d" stroke-width="12" stroke-linejoin="round"/>
    ${eye(190, 212, 28, 34)}${eye(322, 212, 28, 34)}
    ${openMouth(256, 322, 74, 86)}`);
}

function faceCrazyLaugh(color) {
  return ball(color, `<path d="M152 210 Q196 166 236 214" fill="none" stroke="#161a1f" stroke-width="20" stroke-linecap="round"/>
    <path d="M276 214 Q316 166 360 210" fill="none" stroke="#161a1f" stroke-width="20" stroke-linecap="round"/>
    ${openMouth(256, 318, 98, 92)}
    ${blush(122, 282)}${blush(390, 282)}`);
}

function faceAbstractKing(color) {
  return ball(color, `<path d="M126 158 Q256 194 386 150" fill="none" stroke="#ffe94a" stroke-width="14" stroke-linecap="round"/>
    ${eye(182, 218, 34, 22)}${eye(322, 204, 20, 42)}
    <path d="M166 292 Q258 396 366 276" fill="none" stroke="#161a1f" stroke-width="24" stroke-linecap="round"/>
    <path d="M228 74 L250 146 L218 202" fill="none" stroke="#1f2630" stroke-width="12" stroke-linecap="round"/>
    <path d="M372 66 L326 174 L374 158 L318 286" fill="#ffe94a" stroke="#26313d" stroke-width="10" stroke-linejoin="round"/>`);
}

function faceYizai() {
  return `<g filter="url(#shadow)">
    <circle cx="160" cy="146" r="54" fill="#fff" stroke="#222a30" stroke-width="18"/>
    <circle cx="352" cy="146" r="54" fill="#fff" stroke="#222a30" stroke-width="18"/>
    <circle cx="256" cy="266" r="198" fill="#fff" stroke="#222a30" stroke-width="24"/>
    <circle cx="256" cy="266" r="184" fill="url(#shine)"/>
    <ellipse cx="256" cy="304" rx="102" ry="74" fill="#ffd15c" stroke="#222a30" stroke-width="12"/>
    <ellipse cx="256" cy="268" rx="34" ry="25" fill="#171a1d"/>
    <path d="M156 220 L224 194" stroke="#171a1d" stroke-width="22" stroke-linecap="round"/>
    <path d="M288 194 L356 220" stroke="#171a1d" stroke-width="22" stroke-linecap="round"/>
    ${eye(188, 270, 20, 28)}${eye(324, 270, 20, 28)}
    <path d="M216 338 Q256 370 296 338" fill="none" stroke="#171a1d" stroke-width="12" stroke-linecap="round"/>
    ${openMouth(256, 356, 28, 32)}
    <rect x="146" y="72" width="220" height="76" rx="28" fill="#2c8fe8" stroke="#17212b" stroke-width="12"/>
    <text x="256" y="112" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#fff">MAEE</text>
  </g>`;
}
