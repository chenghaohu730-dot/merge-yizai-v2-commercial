import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(projectRoot, "game", "web-prototype", "package.json"));
const sharp = require("sharp");

const generatedDir = path.join(projectRoot, "art", "generated");
const finalDir = path.join(projectRoot, "art", "final");
const finalUiDir = path.join(finalDir, "ui");
const finalFaceDir = path.join(finalDir, "faces");
const webUiDir = path.join(projectRoot, "game", "web-prototype", "public", "assets", "ui");
const wechatUiDir = path.join(projectRoot, "game", "wechat-minigame", "assets", "ui");
const webFaceDir = path.join(projectRoot, "game", "web-prototype", "public", "assets", "faces");
const wechatFaceDir = path.join(projectRoot, "game", "wechat-minigame", "assets", "faces");
const avatarCheckDir = path.join(projectRoot, "tests", "device-checks", "avatar-art");

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

const faceThemes = [
  { base: "#45d7a1", rim: "#159f78", accent: "#2fba59", mood: "open", deco: "sprout" },
  { base: "#ff9c75", rim: "#ee6549", accent: "#fff0dc", mood: "wink", deco: "cream" },
  { base: "#ff5faa", rim: "#d9387e", accent: "#ff2f6d", mood: "sparkle", deco: "heart" },
  { base: "#ffcf34", rim: "#f29f00", accent: "#ff9b1a", mood: "happy", deco: "sun" },
  { base: "#45bdf5", rim: "#168bc9", accent: "#ffffff", mood: "open", deco: "cloud" },
  { base: "#ffd66b", rim: "#e9a529", accent: "#fff7cc", mood: "stars", deco: "swirl" },
  { base: "#c79243", rim: "#8a5d22", accent: "#62c54b", mood: "sage", deco: "leaf" },
  { base: "#9b56f0", rim: "#6b2bbb", accent: "#ffdc36", mood: "angry", deco: "bolt" },
  { base: "#ff6930", rim: "#d43c1c", accent: "#ffd235", mood: "fierce", deco: "flame" },
  { base: "#6b49e8", rim: "#3727a3", accent: "#ffd741", mood: "king", deco: "crown" },
  { base: "#ffffff", rim: "#d6d6d6", accent: "#ffc32d", mood: "yizai", deco: "helmet" },
];

await Promise.all([
  mkdir(generatedDir, { recursive: true }),
  mkdir(finalDir, { recursive: true }),
  mkdir(finalUiDir, { recursive: true }),
  mkdir(finalFaceDir, { recursive: true }),
  mkdir(webUiDir, { recursive: true }),
  mkdir(wechatUiDir, { recursive: true }),
  mkdir(webFaceDir, { recursive: true }),
  mkdir(wechatFaceDir, { recursive: true }),
  mkdir(avatarCheckDir, { recursive: true }),
]);

await writeJpeg(gameBackgroundSvg(), path.join(finalDir, "game_bg_750x1334.jpg"));
await writeJpeg(splashBackgroundSvg(), path.join(finalDir, "ui_splash_750x1334.jpg"));
await writePng(playfieldFrameSvg(), path.join(finalUiDir, "playfield_frame.png"));
await writePng(startPanelSvg(), path.join(finalUiDir, "start_panel.png"));
await writePng(controlIconSvg("sound"), path.join(finalUiDir, "control_sound.png"));
await writePng(controlIconSvg("pause"), path.join(finalUiDir, "control_pause.png"));
await writePng(controlIconSvg("restart"), path.join(finalUiDir, "control_restart.png"));

await copyUi("game_bg_750x1334.jpg", "game_bg.jpg", finalDir);
await copyUi("ui_splash_750x1334.jpg", "splash_bg.jpg", finalDir);
for (const file of ["playfield_frame.png", "start_panel.png", "control_sound.png", "control_pause.png", "control_restart.png"]) {
  await copyFile(path.join(finalUiDir, file), path.join(webUiDir, file));
  await copyFile(path.join(finalUiDir, file), path.join(wechatUiDir, file));
}

const contactCells = [];
for (let i = 0; i < faceThemes.length; i += 1) {
  const finalPath = path.join(finalFaceDir, faceNames[i]);
  const runtime = await sharp(Buffer.from(faceSvg(faceThemes[i], i + 1)))
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await sharp(runtime).toFile(finalPath);
  const gameFace = await sharp(runtime).resize(384, 384).png({ compressionLevel: 9, palette: true, effort: 10 }).toBuffer();
  await sharp(gameFace).toFile(path.join(webFaceDir, faceNames[i]));
  await sharp(gameFace).toFile(path.join(wechatFaceDir, faceNames[i]));
  contactCells.push(await sharp(runtime).resize(240, 240).toBuffer());
}

await makeContactSheet(contactCells);
await writePng(faceSheetSvg(), path.join(generatedDir, "commercial_round_avatar_sheet_20260612.png"), 1536, 1152);
await copyFile(path.join(generatedDir, "commercial_round_avatar_sheet_20260612.png"), path.join(generatedDir, "cute_avatar_sheet_20260612_round.png"));
await writePng(controlSheetSvg(), path.join(generatedDir, "ui_control_icons_20260612.png"), 768, 256);
await writePng(playfieldFrameSvg(), path.join(generatedDir, "playfield_frame_20260612.png"), 750, 1334);
await writePng(gameBackgroundSvg(), path.join(generatedDir, "game_background_20260612_commercial_machine.png"), 750, 1334);
await writePng(splashBackgroundSvg(), path.join(generatedDir, "ui_splash_background_20260612_commercial_machine.png"), 750, 1334);

console.log(JSON.stringify({
  ok: true,
  theme: "candy-claw-merge-machine",
  assets: {
    backgrounds: ["art/final/game_bg_750x1334.jpg", "art/final/ui_splash_750x1334.jpg"],
    frame: "art/final/ui/playfield_frame.png",
    faces: faceNames.length,
    contactSheet: "tests/device-checks/avatar-art/perfect-round-faces-20260612.png",
  },
}, null, 2));

async function copyUi(from, to, sourceRoot) {
  await copyFile(path.join(sourceRoot, from), path.join(webUiDir, to));
  await copyFile(path.join(sourceRoot, from), path.join(wechatUiDir, to));
}

async function writeJpeg(svg, file) {
  await sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toFile(file);
}

async function writePng(svg, file, width, height) {
  let image = sharp(Buffer.from(svg));
  if (width && height) image = image.resize(width, height, { fit: "fill" });
  await image.png({ compressionLevel: 9, palette: true, effort: 10 }).toFile(file);
}

async function makeContactSheet(cells) {
  const cell = 260;
  const composites = cells.map((input, index) => ({
    input,
    left: (index % 4) * cell + 10,
    top: Math.floor(index / 4) * cell + 10,
  }));
  const out = await sharp({
    create: {
      width: cell * 4,
      height: cell * 3,
      channels: 4,
      background: { r: 245, g: 251, b: 255, alpha: 1 },
    },
  }).composite(composites).png({ compressionLevel: 9 }).toBuffer();
  await sharp(out).toFile(path.join(generatedDir, "perfect_round_faces_20260612.png"));
  await sharp(out).toFile(path.join(avatarCheckDir, "perfect-round-faces-20260612.png"));
}

function gameBackgroundSvg() {
  return svgShell(`
    ${defs()}
    <rect width="750" height="1334" fill="url(#sky)"/>
    <rect y="0" width="750" height="190" fill="url(#topMetal)"/>
    <path d="M0 160 C130 198 235 198 375 166 C515 198 620 198 750 160 L750 0 L0 0 Z" fill="#f07d4e" opacity=".78"/>
    <circle cx="375" cy="92" r="58" fill="#ffe579" stroke="#b7632c" stroke-width="8"/>
    <circle cx="375" cy="92" r="28" fill="#ff6d55"/>
    <path d="M348 82 h54 l-17 12 7 22 -17 -13 -17 13 7 -22z" fill="#fff2a3"/>
    ${sideMachine(0)}
    ${sideMachine(750, true)}
    <rect x="51" y="208" width="648" height="928" rx="46" fill="#fff7c8" opacity=".55"/>
    <rect x="72" y="232" width="606" height="879" rx="34" fill="url(#playfield)" stroke="#ffffff" stroke-width="10" opacity=".86"/>
    <path d="M74 1112 C172 1084 266 1088 352 1115 C455 1083 561 1087 676 1110 L676 1134 L74 1134 Z" fill="#ffe282" opacity=".74"/>
    <rect x="0" y="1094" width="750" height="240" fill="url(#baseDeck)"/>
    <path d="M0 1130 C120 1092 236 1127 367 1100 C500 1072 620 1114 750 1085 L750 1334 L0 1334 Z" fill="#ffca5e" opacity=".82"/>
    <rect x="48" y="1146" width="654" height="118" rx="42" fill="#ffc547" stroke="#fff3bf" stroke-width="8"/>
    <rect x="78" y="1180" width="594" height="44" rx="22" fill="#9b5a31" opacity=".2"/>
    ${candyFloor()}
  `);
}

function splashBackgroundSvg() {
  return svgShell(`
    ${defs()}
    <rect width="750" height="1334" fill="url(#sky)"/>
    <rect y="0" width="750" height="198" fill="url(#topMetal)"/>
    <path d="M0 168 C132 206 246 198 375 164 C504 198 618 206 750 168 L750 0 L0 0 Z" fill="#f07d4e" opacity=".86"/>
    <circle cx="375" cy="96" r="60" fill="#ffe579" stroke="#b7632c" stroke-width="8"/>
    <circle cx="375" cy="96" r="30" fill="#ff6d55"/>
    <path d="M374 158 v72" stroke="#87543b" stroke-width="20" stroke-linecap="round"/>
    <path d="M306 226 C315 306 355 328 375 286 C395 328 435 306 444 226" fill="none" stroke="#ff9e3e" stroke-width="28" stroke-linecap="round"/>
    <path d="M306 226 C322 270 354 286 375 258 C396 286 428 270 444 226" fill="none" stroke="#fff2ca" stroke-width="10" stroke-linecap="round"/>
    <g opacity=".98">${floatingFaces()}</g>
    ${sideMachine(0)}
    ${sideMachine(750, true)}
    <rect x="0" y="1028" width="750" height="306" fill="url(#baseDeck)"/>
    <path d="M52 1050 h646 a48 48 0 0 1 48 48 v202 H4 v-202 a48 48 0 0 1 48-48z" fill="#ffd66c" stroke="#fff2bc" stroke-width="10"/>
    <path d="M94 1096 h562 a32 32 0 0 1 32 32 v150 H62 v-150 a32 32 0 0 1 32-32z" fill="#fff6d6" opacity=".9"/>
    <rect x="100" y="1214" width="550" height="86" rx="43" fill="#ffbd3d" stroke="#fff8d5" stroke-width="8"/>
    ${candyFloor()}
  `);
}

function playfieldFrameSvg() {
  return svgShell(`
    ${defs()}
    <rect width="750" height="1334" fill="none"/>
    <rect x="44" y="216" width="662" height="924" rx="48" fill="rgba(255,255,255,.06)" stroke="#fff8dc" stroke-width="16"/>
    <rect x="58" y="229" width="634" height="898" rx="38" fill="none" stroke="#4bd5ce" stroke-width="13"/>
    <rect x="66" y="237" width="618" height="882" rx="30" fill="none" stroke="#fff4b8" stroke-width="4" opacity=".84"/>
    <path d="M58 1118 C135 1147 256 1132 375 1110 C494 1132 615 1147 692 1118 L692 1162 L58 1162 Z" fill="#ffdd68" opacity=".9"/>
    <rect x="0" y="1122" width="750" height="212" fill="url(#baseDeck)" opacity=".98"/>
    <path d="M30 1134 h690 a42 42 0 0 1 42 42 v158 H-12 v-158 a42 42 0 0 1 42-42z" fill="#ffc851" stroke="#fff2bd" stroke-width="7"/>
    <rect x="408" y="1194" width="276" height="98" rx="49" fill="#955131" opacity=".18"/>
    <g>${boltDots()}</g>
    <g opacity=".96">${bottomPods()}</g>
  `);
}

function startPanelSvg() {
  return `<svg width="700" height="460" viewBox="0 0 700 460" xmlns="http://www.w3.org/2000/svg">
    ${defs()}
    <path d="M76 32 h548 a56 56 0 0 1 56 56 v314 a38 38 0 0 1-38 38 H58 a38 38 0 0 1-38-38 V88 a56 56 0 0 1 56-56z" fill="#fff5d4" stroke="#ffd45d" stroke-width="9"/>
    <path d="M50 112 h600 v94 H50z" fill="#ffffff" opacity=".48"/>
    <rect x="74" y="240" width="552" height="58" rx="29" fill="#ffffff" opacity=".72"/>
    <rect x="72" y="338" width="556" height="86" rx="43" fill="#ffbd3d" stroke="#fff6cb" stroke-width="8"/>
    <circle cx="350" cy="36" r="44" fill="#fffaf0" stroke="#ffc64c" stroke-width="7"/>
    <path d="M300 33 C322 10 378 10 400 33" fill="none" stroke="#ff9d44" stroke-width="9" stroke-linecap="round"/>
    ${smallStars()}
  </svg>`;
}

function controlIconSvg(type) {
  const glyph = type === "sound"
    ? `<path d="M38 72 h19 l26 25 V31 L57 56 H38z" fill="#fff"/><path d="M93 54 C105 66 105 83 93 95" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M107 42 C126 62 126 88 107 108" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`
    : type === "pause"
      ? `<rect x="47" y="39" width="17" height="58" rx="8" fill="#fff"/><rect x="78" y="39" width="17" height="58" rx="8" fill="#fff"/>`
      : `<path d="M93 48 C79 34 55 37 45 55 C33 77 51 102 76 101 C88 100 100 92 105 80" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round"/><path d="M95 32 l4 28 25-10" fill="#fff"/>`;
  return `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="shine" cx="34%" cy="24%" r="72%"><stop stop-color="#58d7ee"/><stop offset=".62" stop-color="#11718c"/><stop offset="1" stop-color="#05384d"/></radialGradient></defs>
    <circle cx="64" cy="64" r="58" fill="#fff8d7"/>
    <circle cx="64" cy="64" r="50" fill="url(#shine)" stroke="#0a5069" stroke-width="5"/>
    <path d="M31 33 C48 17 85 16 101 33" fill="none" stroke="#ffffff" stroke-opacity=".62" stroke-width="10" stroke-linecap="round"/>
    ${glyph}
    <circle cx="95" cy="96" r="6" fill="#ffe36c"/>
    <path d="M102 87 l5 7 8 1 -6 5 1 8 -7-4 -7 4 2-8 -6-5 8-1z" fill="#fff2a2"/>
  </svg>`;
}

function faceSheetSvg() {
  const cells = faceThemes.map((theme, index) => {
    const x = (index % 4) * 384;
    const y = Math.floor(index / 4) * 384;
    const body = faceSvg(theme, index + 1, true);
    return `<g transform="translate(${x} ${y})">${body.replace(/^<svg[^>]+>|<\/svg>$/g, "")}</g>`;
  }).join("");
  return `<svg width="1536" height="1152" viewBox="0 0 1536 1152" xmlns="http://www.w3.org/2000/svg">
    <rect width="1536" height="1152" fill="#eef8ff"/>
    ${cells}
  </svg>`;
}

function faceSvg(theme, level, embedded = false) {
  const size = embedded ? 384 : 512;
  const scale = size / 512;
  const wrapStart = embedded ? `<svg width="384" height="384" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">` : `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">`;
  return `${wrapStart}
    <defs>
      <radialGradient id="face${level}" cx="32%" cy="24%" r="74%">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset=".18" stop-color="${theme.base}"/>
        <stop offset=".72" stop-color="${theme.base}"/>
        <stop offset="1" stop-color="${theme.rim}"/>
      </radialGradient>
      <clipPath id="clip${level}"><circle cx="256" cy="256" r="248"/></clipPath>
      <filter id="shadow${level}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="9" stdDeviation="10" flood-color="#593000" flood-opacity=".22"/>
      </filter>
    </defs>
    <circle cx="256" cy="256" r="248" fill="url(#face${level})" filter="url(#shadow${level})"/>
    <g clip-path="url(#clip${level})">
      <ellipse cx="170" cy="115" rx="54" ry="25" fill="#fff" opacity=".78" transform="rotate(-34 170 115)"/>
      <ellipse cx="395" cy="168" rx="24" ry="52" fill="#fff" opacity=".18" transform="rotate(-24 395 168)"/>
      <path d="M92 354 C178 405 323 421 426 340 C396 430 299 479 191 456 C139 445 104 410 92 354z" fill="#000" opacity=".08"/>
      ${deco(theme.deco)}
      ${faceMood(theme.mood)}
    </g>
    <circle cx="256" cy="256" r="244" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="8"/>
  </svg>`.replaceAll("scale(1)", `scale(${scale})`);
}

function deco(kind) {
  if (kind === "sprout") return `<path d="M242 92 C205 62 178 48 146 63 C158 98 202 105 242 92z" fill="#45ba48" stroke="#17762f" stroke-width="8"/><path d="M270 94 C300 56 329 42 365 54 C357 95 310 111 270 94z" fill="#64d25b" stroke="#17762f" stroke-width="8"/><path d="M256 100 C250 132 251 154 257 180" fill="none" stroke="#1b7d37" stroke-width="10" stroke-linecap="round"/>`;
  if (kind === "cream") return `<path d="M201 94 C238 38 306 54 319 112 C286 101 257 127 224 120 C207 116 197 108 201 94z" fill="#fff9ed" stroke="#f06d42" stroke-width="7"/><path d="M230 92 C256 72 282 76 296 104" fill="none" stroke="#ffd6b5" stroke-width="8" stroke-linecap="round"/>`;
  if (kind === "heart") return `<path d="M256 94 C216 48 148 83 173 141 C191 183 235 205 256 226 C277 205 321 183 339 141 C364 83 296 48 256 94z" fill="#ff3d73" stroke="#c61c50" stroke-width="8"/>`;
  if (kind === "sun") return Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x = 256 + Math.cos(a) * 178;
    const y = 256 + Math.sin(a) * 178;
    return `<path d="M${x} ${y} l${Math.cos(a) * 42} ${Math.sin(a) * 42} l${Math.cos(a + .35) * 34} ${Math.sin(a + .35) * 34} z" fill="#ff9f1f" opacity=".85"/>`;
  }).join("");
  if (kind === "cloud") return `<path d="M166 105 C174 72 211 62 235 83 C251 52 304 58 317 92 C348 91 367 113 360 142 H157 C141 130 146 108 166 105z" fill="#ffffff" stroke="#d3f3ff" stroke-width="8"/>`;
  if (kind === "swirl") return `<path d="M201 104 C216 60 283 42 316 84 C351 129 303 169 246 151 C299 139 310 104 283 88 C251 68 220 82 201 104z" fill="#fff2c4" stroke="#edae31" stroke-width="8"/>`;
  if (kind === "leaf") return `<path d="M258 103 C295 57 349 49 385 84 C357 132 303 151 258 103z" fill="#73cc48" stroke="#2b7e29" stroke-width="8"/><path d="M266 106 C298 104 330 91 360 75" stroke="#2b7e29" stroke-width="7" stroke-linecap="round"/>`;
  if (kind === "bolt") return `<path d="M283 68 L210 236 H276 L239 354 L342 184 H276z" fill="#ffd936" stroke="#f0931f" stroke-width="8"/>`;
  if (kind === "flame") return `<path d="M256 52 C320 113 337 173 302 222 C337 207 356 166 343 124 C402 186 378 276 299 305 C231 330 161 291 168 216 C172 164 222 133 256 52z" fill="#ffd437" stroke="#e35a1b" stroke-width="8"/><path d="M258 118 C286 160 285 203 250 229 C241 191 215 177 258 118z" fill="#ff7d25"/>`;
  if (kind === "crown") return `<path d="M94 145 L144 72 L214 138 L258 58 L307 137 L371 72 L421 145 L397 194 H118z" fill="#ffd449" stroke="#823f19" stroke-width="10"/><circle cx="258" cy="119" r="24" fill="#38bdf8" stroke="#fff" stroke-width="6"/><circle cx="145" cy="130" r="14" fill="#ff5a7a"/><circle cx="371" cy="130" r="14" fill="#ff5a7a"/>`;
  if (kind === "helmet") return `<path d="M72 185 C108 62 404 62 440 185 L440 229 H72z" fill="#236eea" stroke="#1750a8" stroke-width="10"/><text x="256" y="168" font-family="Arial, sans-serif" font-size="52" font-weight="900" text-anchor="middle" fill="#ffffff" stroke="#ffffff" stroke-width="1">MAEE</text><path d="M74 218 H438" stroke="#ff6c5c" stroke-width="14"/></g><g clip-path="url(#clip11)"><ellipse cx="256" cy="304" rx="92" ry="78" fill="#ffc52e" stroke="#dc8a13" stroke-width="8"/><ellipse cx="256" cy="278" rx="55" ry="38" fill="#111" opacity=".95"/><ellipse cx="236" cy="267" rx="17" ry="10" fill="#fff" opacity=".55"/>`;
  return "";
}

function faceMood(mood) {
  if (mood === "yizai") return `<path d="M157 260 C181 234 217 236 237 267" fill="none" stroke="#171717" stroke-width="11" stroke-linecap="round"/><path d="M275 267 C295 236 331 234 355 260" fill="none" stroke="#171717" stroke-width="11" stroke-linecap="round"/><path d="M177 211 L231 198" stroke="#202020" stroke-width="17" stroke-linecap="round"/><path d="M335 198 L389 211" stroke="#202020" stroke-width="17" stroke-linecap="round"/><ellipse cx="163" cy="349" rx="34" ry="24" fill="#ff9bb0" opacity=".78"/><ellipse cx="349" cy="349" rx="34" ry="24" fill="#ff9bb0" opacity=".78"/><path d="M214 377 C240 414 286 414 312 377" fill="#b52320" stroke="#3b1010" stroke-width="7"/><path d="M243 396 C258 385 278 386 292 397" stroke="#ff8a8a" stroke-width="8" stroke-linecap="round"/>`;
  const brows = mood === "angry" || mood === "fierce" || mood === "king"
    ? `<path d="M150 219 L213 196" stroke="#321b18" stroke-width="13" stroke-linecap="round"/><path d="M362 219 L299 196" stroke="#321b18" stroke-width="13" stroke-linecap="round"/>`
    : "";
  const eyes = mood === "happy"
    ? `<path d="M151 255 C177 225 213 225 239 255" fill="none" stroke="#351d19" stroke-width="15" stroke-linecap="round"/><path d="M273 255 C299 225 335 225 361 255" fill="none" stroke="#351d19" stroke-width="15" stroke-linecap="round"/>`
    : mood === "sage"
      ? `<path d="M145 254 C178 240 211 240 239 254" stroke="#351d19" stroke-width="11" stroke-linecap="round"/><path d="M273 254 C301 240 334 240 367 254" stroke="#351d19" stroke-width="11" stroke-linecap="round"/><circle cx="191" cy="268" r="10" fill="#2a1713"/><circle cx="321" cy="268" r="10" fill="#2a1713"/>`
      : mood === "wink"
        ? `<path d="M143 257 C175 230 212 230 241 257" fill="none" stroke="#351d19" stroke-width="14" stroke-linecap="round"/><ellipse cx="326" cy="249" rx="37" ry="48" fill="#fff"/><ellipse cx="330" cy="257" rx="20" ry="30" fill="#54240d"/><circle cx="337" cy="244" r="10" fill="#fff"/>`
        : `<ellipse cx="187" cy="250" rx="39" ry="49" fill="#fff"/><ellipse cx="325" cy="250" rx="39" ry="49" fill="#fff"/><ellipse cx="193" cy="258" rx="22" ry="31" fill="#3a1f16"/><ellipse cx="331" cy="258" rx="22" ry="31" fill="#3a1f16"/><circle cx="202" cy="241" r="11" fill="#fff"/><circle cx="340" cy="241" r="11" fill="#fff"/>`;
  const mouth = mood === "king" || mood === "fierce"
    ? `<path d="M210 331 C242 374 300 374 331 331" fill="#b5212c" stroke="#35100d" stroke-width="8"/><path d="M220 333 l22 32 l18 -28 l18 28 l22 -32" fill="#fff" opacity=".95"/>`
    : `<path d="M205 327 C235 380 303 380 334 327" fill="#d92331" stroke="#35100d" stroke-width="8"/><path d="M235 359 C258 346 284 346 305 360" stroke="#ff9aa7" stroke-width="9" stroke-linecap="round"/>`;
  const cheeks = `<ellipse cx="139" cy="319" rx="33" ry="24" fill="#ff8ca2" opacity=".78"/><ellipse cx="373" cy="319" rx="33" ry="24" fill="#ff8ca2" opacity=".78"/>`;
  const sparkle = mood === "stars" ? `<path d="M175 244 l14 22 25 7 -24 9 -14 23 -13 -24 -25 -8 25 -8z" fill="#ffd936"/><path d="M319 244 l14 22 25 7 -24 9 -14 23 -13 -24 -25 -8 25 -8z" fill="#ffd936"/>` : "";
  return `${brows}${eyes}${sparkle}${cheeks}${mouth}`;
}

function defs() {
  return `<defs>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#67d8f6"/><stop offset=".38" stop-color="#bdf5ee"/><stop offset=".7" stop-color="#fff0a8"/><stop offset="1" stop-color="#ffb56a"/></linearGradient>
    <linearGradient id="topMetal" x1="0" x2="1"><stop stop-color="#dc6b3a"/><stop offset=".5" stop-color="#ffbd54"/><stop offset="1" stop-color="#c85337"/></linearGradient>
    <linearGradient id="playfield" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fffef0"/><stop offset=".5" stop-color="#fff8cf"/><stop offset="1" stop-color="#ffe992"/></linearGradient>
    <linearGradient id="baseDeck" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#ffdf75"/><stop offset=".48" stop-color="#ffae4a"/><stop offset="1" stop-color="#754733"/></linearGradient>
  </defs>`;
}

function svgShell(content) {
  return `<svg width="750" height="1334" viewBox="0 0 750 1334" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
}

function sideMachine(x, flip = false) {
  const t = flip ? `transform="translate(${x} 0) scale(-1 1)"` : "";
  return `<g ${t}>
    <path d="M0 172 C52 174 80 220 80 286 V1138 C80 1210 42 1255 0 1266 Z" fill="#ffb85a"/>
    <path d="M0 207 C33 220 48 245 48 290 V1105 C48 1165 28 1204 0 1218 Z" fill="#fff0a8" opacity=".65"/>
    <circle cx="40" cy="215" r="22" fill="#fff3a0"/>
    <circle cx="40" cy="1128" r="20" fill="#fff3a0"/>
  </g>`;
}

function candyFloor() {
  return `<g opacity=".95">
    <circle cx="72" cy="1210" r="54" fill="#44d5a3"/><circle cx="720" cy="1230" r="64" fill="#65b9ff"/>
    <circle cx="628" cy="1180" r="34" fill="#b969ee"/><circle cx="138" cy="1176" r="26" fill="#ff6d9d"/>
    <circle cx="274" cy="1242" r="17" fill="#ffd94a"/><circle cx="536" cy="1240" r="22" fill="#ff79a8"/>
    <path d="M140 1245 l16 24 28 5 -20 20 4 28 -27 -12 -25 14 3 -29 -21 -19 28 -6z" fill="#fff2a2"/>
    <path d="M590 1262 l13 19 23 4 -17 16 4 24 -22 -10 -21 11 2 -24 -18 -16 24-4z" fill="#9ee7ff"/>
  </g>`;
}

function floatingFaces() {
  return `<circle cx="170" cy="390" r="48" fill="#ffcf34" stroke="#e79b1b" stroke-width="6"/>
    <circle cx="530" cy="332" r="38" fill="#ff5faa" stroke="#d9387e" stroke-width="5"/>
    <circle cx="270" cy="540" r="34" fill="#45d7a1" stroke="#159f78" stroke-width="5"/>
    <circle cx="580" cy="628" r="28" fill="#ff9c75" stroke="#ee6549" stroke-width="5"/>
    <path d="M148 385 C166 365 190 365 209 385" fill="none" stroke="#351d19" stroke-width="8" stroke-linecap="round"/>
    <path d="M502 326 C520 340 542 340 560 326" fill="none" stroke="#351d19" stroke-width="7" stroke-linecap="round"/>
    <circle cx="258" cy="531" r="8" fill="#1b1715"/><circle cx="284" cy="531" r="8" fill="#1b1715"/>
  `;
}

function smallStars() {
  return `<g fill="#ffd75a" opacity=".9">
    <path d="M92 86 l8 14 16 3 -12 11 2 16 -14 -8 -14 8 3 -16 -12-11 16-3z"/>
    <path d="M612 96 l7 12 14 2 -10 10 2 14 -13-7 -12 7 2-14 -11-10 15-2z"/>
    <circle cx="58" cy="364" r="8"/><circle cx="644" cy="360" r="8"/>
  </g>`;
}

function boltDots() {
  const dots = [];
  for (const [x, y] of [[58, 258], [692, 258], [58, 572], [692, 572], [58, 886], [692, 886], [88, 1134], [662, 1134]]) {
    dots.push(`<circle cx="${x}" cy="${y}" r="7" fill="#ffe36b" stroke="#c98623" stroke-width="2"/>`);
  }
  return dots.join("");
}

function bottomPods() {
  return `<circle cx="476" cy="1243" r="55" fill="#f8f7dc" opacity=".86"/><circle cx="564" cy="1243" r="55" fill="#f8f7dc" opacity=".86"/><circle cx="652" cy="1243" r="55" fill="#f8f7dc" opacity=".86"/>`;
}

function controlSheetSvg() {
  return `<svg width="768" height="256" viewBox="0 0 768 256" xmlns="http://www.w3.org/2000/svg">
    <rect width="768" height="256" fill="#15b85b"/>
    <g transform="translate(64 64)">${controlIconSvg("sound").replace(/^<svg[^>]+>|<\/svg>$/g, "")}</g>
    <g transform="translate(320 64)">${controlIconSvg("pause").replace(/^<svg[^>]+>|<\/svg>$/g, "")}</g>
    <g transform="translate(576 64)">${controlIconSvg("restart").replace(/^<svg[^>]+>|<\/svg>$/g, "")}</g>
  </svg>`;
}
