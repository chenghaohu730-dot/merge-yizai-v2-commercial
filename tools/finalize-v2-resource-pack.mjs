import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(projectRoot, "game", "web-prototype", "package.json"));
const sharp = require("sharp");

const packRoot = path.join(projectRoot, "art", "final", "v2-resource-pack", "assets");
const cocosRoot = path.join(projectRoot, "game", "cocos-creator-v2", "assets");
const sourceUi = path.join(projectRoot, "art", "generated", "v2-ai-ui");
const finalSource = path.join(projectRoot, "assets_final");
const checkRoot = path.join(projectRoot, "tests", "device-checks", "v2-final-assets");

const written = [];

await Promise.all([
  mkdir(packRoot, { recursive: true }),
  mkdir(cocosRoot, { recursive: true }),
  mkdir(checkRoot, { recursive: true }),
]);

await writeHomeAndGameLayers();
await copyUsefulAssetsFinal();
await deriveMissingUi();
await generateShareAndStore();
await generateFx();
await validatePack();
await makePreviewSheets();
await writeSummary();

console.log(JSON.stringify({
  ok: true,
  assetsWritten: written.length,
  packRoot,
  cocosRoot,
  validation: path.join(checkRoot, "resource_pack_validation.json"),
}, null, 2));

async function writeHomeAndGameLayers() {
  await writeResizedJpg(
    path.join(sourceUi, "home_bg_source.png"),
    "ui/home/home_bg.jpg",
    750,
    1334,
    88
  );
  await writeChromaPng(
    path.join(sourceUi, "home_machine_source.png"),
    "ui/home/home_machine.png",
    750,
    1334
  );
  await writeChromaPng(
    path.join(sourceUi, "game_shell_source.png"),
    "ui/game/game_shell.png",
    750,
    1334
  );
}

async function copyUsefulAssetsFinal() {
  const files = [
    "ui/home/btn_start_normal.png",
    "ui/home/btn_start_pressed.png",
    "ui/home/btn_start_disabled.png",
    "ui/home/btn_task_normal.png",
    "ui/home/btn_task_pressed.png",
    "ui/home/btn_task_disabled.png",
    "ui/home/btn_rank_normal.png",
    "ui/home/btn_rank_pressed.png",
    "ui/home/btn_rank_disabled.png",
    "ui/home/btn_shop_normal.png",
    "ui/home/btn_shop_pressed.png",
    "ui/home/btn_shop_disabled.png",
    "ui/home/panel_daily_goal.png",
    "ui/home/panel_best_score.png",
    "ui/home/panel_coin_balance.png",
    "ui/home/coin_icon.png",
    "ui/game/game_playfield_bg.jpg",
    "ui/game/hud_top.png",
    "ui/game/panel_score.png",
    "ui/game/panel_best.png",
    "ui/game/panel_next_ball.png",
    "ui/game/control_bar.png",
    "ui/game/btn_sound_on_normal.png",
    "ui/game/btn_sound_on_pressed.png",
    "ui/game/btn_sound_on_disabled.png",
    "ui/game/btn_sound_off_normal.png",
    "ui/game/btn_sound_off_pressed.png",
    "ui/game/btn_sound_off_disabled.png",
    "ui/game/btn_pause_normal.png",
    "ui/game/btn_pause_pressed.png",
    "ui/game/btn_pause_disabled.png",
    "ui/game/btn_restart_normal.png",
    "ui/game/btn_restart_pressed.png",
    "ui/game/btn_restart_disabled.png",
    "ui/game/warning_line.png",
    "ui/game/dropper_head.png",
    "ui/modal/modal_base.png",
    "ui/modal/pause_panel.png",
    "ui/modal/btn_pause_home_normal.png",
    "ui/modal/btn_pause_home_pressed.png",
    "ui/modal/btn_pause_restart_normal.png",
    "ui/modal/btn_pause_restart_pressed.png",
    "ui/modal/btn_close_normal.png",
    "ui/modal/btn_close_pressed.png",
    "ui/task/task_panel.png",
    "ui/task/task_item.png",
    "ui/task/btn_claim_normal.png",
    "ui/task/btn_claim_pressed.png",
    "ui/task/btn_claim_disabled.png",
    "ui/shop/shop_panel.png",
    "ui/shop/shop_card.png",
    "ui/shop/btn_buy_normal.png",
    "ui/shop/btn_buy_pressed.png",
    "ui/shop/btn_buy_disabled.png",
    "ui/shop/btn_use_normal.png",
    "ui/shop/btn_use_pressed.png",
    "ui/shop/btn_use_disabled.png",
    "ui/rank/rank_item.png",
    "ui/result/btn_share_normal.png",
    "ui/result/btn_share_pressed.png",
    "ui/result/btn_share_disabled.png",
    "ui/result/btn_home_normal.png",
    "ui/result/btn_home_pressed.png",
    "ui/loading/loading_bg.jpg",
    "ui/loading/loading_bar_bg.png",
    "ui/loading/loading_bar_fill.png",
    "icon/app_icon.png",
  ];
  for (const rel of files) {
    await copyBoth(path.join(finalSource, rel), rel);
  }

  await cropFromAssetsFinalShell();
}

async function cropFromAssetsFinalShell() {
  const shell = path.join(finalSource, "ui", "game", "game_shell.png");
  const frame = await sharp(shell)
    .extract({ left: 50, top: 295, width: 650, height: 820 })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
  await writeBoth("ui/game/game_playfield_frame.png", frame);
}

async function deriveMissingUi() {
  await copyBoth(path.join(finalSource, "ui", "shop", "shop_panel.png"), "ui/rank/rank_panel.png");
  await copyBoth(path.join(finalSource, "ui", "modal", "modal_base.png"), "ui/result/result_panel.png");

  await makeTextButton("ui/modal/btn_resume", 300, 100, "继续游戏", "#50c878", true);
  await makeTextButton("ui/result/btn_again", 300, 100, "再来一局", "#ffb437", false);
}

async function generateShareAndStore() {
  const homeBg = await sharp(path.join(packRoot, "ui", "home", "home_bg.jpg"))
    .resize(1200, 960, { fit: "cover" })
    .modulate({ brightness: 1.04, saturation: 1.05 })
    .png()
    .toBuffer();
  const yizai = await sharp(path.join(finalSource, "icon", "app_icon.png"))
    .resize(300, 300)
    .png()
    .toBuffer();
  const face10 = await sharp(path.join(packRoot, "balls", "default", "face_10_crown_star.png"))
    .resize(150, 150)
    .png()
    .toBuffer();
  const face11 = await sharp(path.join(packRoot, "balls", "default", "face_11_yizai.png"))
    .resize(170, 170)
    .png()
    .toBuffer();
  const sharePanel = await sharp(Buffer.from(`
    <svg width="1200" height="960" viewBox="0 0 1200 960" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#8a5528" flood-opacity=".25"/>
        </filter>
      </defs>
      <rect width="1200" height="960" fill="none"/>
      <rect x="72" y="78" width="650" height="760" rx="58" fill="#fff7dc" stroke="#ffbf45" stroke-width="10" filter="url(#s)"/>
      <text x="128" y="180" font-family="Microsoft YaHei, Arial" font-size="76" font-weight="900" fill="#7c3f1f">合成亿仔</text>
      <text x="132" y="240" font-family="Microsoft YaHei, Arial" font-size="34" font-weight="800" fill="#8b6334">今天最高能合到哪一级？</text>
      <rect x="126" y="320" width="520" height="128" rx="32" fill="#ffffff" opacity=".78"/>
      <rect x="126" y="486" width="520" height="128" rx="32" fill="#ffffff" opacity=".78"/>
      <rect x="126" y="662" width="520" height="92" rx="46" fill="#ffbd42" stroke="#fff2bd" stroke-width="8"/>
      <text x="386" y="721" font-family="Microsoft YaHei, Arial" font-size="38" font-weight="900" fill="#ffffff" text-anchor="middle">我也来合成</text>
      <path d="M752 760 C900 692 1040 710 1200 640 V960 H752Z" fill="#ffbd42" opacity=".9"/>
    </svg>
  `)).png().toBuffer();
  await writeJpgBuffer("share/share_card_bg.jpg", await sharp(homeBg)
    .composite([
      { input: sharePanel, left: 0, top: 0 },
      { input: yizai, left: 820, top: 150 },
      { input: face10, left: 780, top: 600 },
      { input: face11, left: 965, top: 555 },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer());

  const coverBg = await sharp(path.join(packRoot, "ui", "home", "home_bg.jpg"))
    .resize(1280, 720, { fit: "cover" })
    .blur(0.6)
    .modulate({ brightness: 1.08, saturation: 1.05 })
    .png()
    .toBuffer();
  const coverOverlay = await sharp(Buffer.from(`
    <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <rect width="1280" height="720" fill="rgba(255,248,220,.34)"/>
      <text x="88" y="142" font-family="Microsoft YaHei, Arial" font-size="86" font-weight="900" fill="#7c3f1f" stroke="#fff2bd" stroke-width="7" paint-order="stroke">合成亿仔</text>
      <text x="96" y="214" font-family="Microsoft YaHei, Arial" font-size="38" font-weight="800" fill="#8b6334">糖果合成机里的 2D 物理合成小游戏</text>
      <rect x="92" y="560" width="410" height="88" rx="44" fill="#ffbd42" stroke="#fff2bd" stroke-width="8"/>
      <text x="297" y="617" font-family="Microsoft YaHei, Arial" font-size="36" font-weight="900" fill="#ffffff" text-anchor="middle">一路合成到亿仔</text>
    </svg>
  `)).png().toBuffer();
  const balls = [
    ["face_01_sprout_bead.png", 470, 300, 120],
    ["face_04_sun_wiggle.png", 600, 245, 145],
    ["face_08_grape_zap.png", 735, 300, 160],
    ["face_11_yizai.png", 900, 210, 230],
  ];
  const composites = [
    { input: coverOverlay, left: 0, top: 0 },
    { input: await sharp(path.join(finalSource, "icon", "app_icon.png")).resize(260, 260).png().toBuffer(), left: 960, top: 100 },
  ];
  for (const [name, left, top, size] of balls) {
    composites.push({
      input: await sharp(path.join(packRoot, "balls", "default", name)).resize(size, size).png().toBuffer(),
      left,
      top,
    });
  }
  await writeJpgBuffer("share/store_cover.jpg", await sharp(coverBg)
    .composite(composites)
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer());
}

async function generateFx() {
  const fx = [
    ["merge_spark", "fx_merge_spark", 1024, 12, "spark"],
    ["big_merge", "fx_big_merge", 1024, 16, "big"],
    ["yizai_success", "fx_yizai_success", 1024, 24, "yizai"],
    ["coin_fly", "fx_coin_fly", 1024, 16, "coin"],
    ["button_tap", "fx_button_tap", 512, 8, "tap"],
  ];
  for (const [dir, prefix, size, frames, kind] of fx) {
    for (let i = 1; i <= frames; i += 1) {
      const buffer = await sharp(Buffer.from(fxSvg(size, i, frames, kind)))
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer();
      await writeBoth(`fx/${dir}/${prefix}_${String(i).padStart(3, "0")}.png`, buffer);
    }
  }
}

async function makeTextButton(baseRel, w, h, text, color, hasDisabled) {
  for (const state of hasDisabled ? ["normal", "pressed", "disabled"] : ["normal", "pressed"]) {
    const fill = state === "disabled" ? "#a9a9a9" : color;
    const yShift = state === "pressed" ? 5 : 0;
    const svg = `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#7a4a28" flood-opacity=".23"/></filter></defs>
        <rect width="${w}" height="${h}" fill="none"/>
        <g transform="translate(0 ${yShift})" opacity="${state === "disabled" ? ".55" : "1"}" filter="url(#s)">
          <rect x="8" y="7" width="${w - 16}" height="${h - 18}" rx="${(h - 18) / 2}" fill="${fill}" stroke="#fff4bd" stroke-width="6"/>
          <path d="M${h * .35} ${h * .27} H${w - h * .35}" stroke="#fff8d6" stroke-width="8" stroke-linecap="round" opacity=".55"/>
          <text x="${w / 2}" y="${h * .55}" dominant-baseline="middle" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="${w >= 300 ? 34 : 28}" font-weight="900" fill="#ffffff" stroke="rgba(102,58,24,.45)" stroke-width="4" paint-order="stroke">${text}</text>
        </g>
      </svg>`;
    await writeBoth(`${baseRel}_${state}.png`, await sharp(Buffer.from(svg)).png({ compressionLevel: 9, effort: 10 }).toBuffer());
  }
}

async function writeResizedJpg(src, rel, width, height, quality) {
  const buffer = await sharp(src)
    .resize(width, height, { fit: "cover" })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  await writeBoth(rel, buffer);
}

async function writeChromaPng(src, rel, width, height) {
  const resized = await sharp(src).resize(width, height, { fit: "cover" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = resized;
  const queue = [];
  const seen = new Uint8Array(info.width * info.height);
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return;
    const idx = y * info.width + x;
    if (seen[idx]) return;
    seen[idx] = 1;
    const offset = idx * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];
    if (a < 12 || (g > 150 && g > r * 1.5 && g > b * 1.5)) queue.push([x, y]);
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
  const buffer = await sharp(data, { raw: info }).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  await writeBoth(rel, buffer);
}

async function copyBoth(src, rel) {
  const packPath = path.join(packRoot, rel);
  const cocosPath = path.join(cocosRoot, rel);
  await mkdir(path.dirname(packPath), { recursive: true });
  await mkdir(path.dirname(cocosPath), { recursive: true });
  await copyFile(src, packPath);
  await copyFile(src, cocosPath);
  written.push(`assets/${rel.replaceAll("\\", "/")}`);
}

async function writeJpgBuffer(rel, buffer) {
  await writeBoth(rel, buffer);
}

async function writeBoth(rel, buffer) {
  const packPath = path.join(packRoot, rel);
  const cocosPath = path.join(cocosRoot, rel);
  await mkdir(path.dirname(packPath), { recursive: true });
  await mkdir(path.dirname(cocosPath), { recursive: true });
  await writeFile(packPath, buffer);
  await writeFile(cocosPath, buffer);
  written.push(`assets/${rel.replaceAll("\\", "/")}`);
}

function fxSvg(size, frame, total, kind) {
  const t = frame / total;
  const cx = size / 2;
  const cy = size / 2;
  if (kind === "tap") {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="none"/>
      <circle cx="${cx}" cy="${cy}" r="${40 + t * 190}" fill="none" stroke="#fff2a8" stroke-width="${28 * (1 - t) + 2}" opacity="${0.95 - t * 0.65}"/>
      <circle cx="${cx}" cy="${cy}" r="${18 + t * 75}" fill="#ffffff" opacity="${0.28 * (1 - t)}"/>
    </svg>`;
  }
  const count = kind === "big" ? 42 : kind === "yizai" ? 34 : kind === "coin" ? 16 : 26;
  const particles = Array.from({ length: count }, (_, i) => {
    const a = (Math.PI * 2 * i) / count + t * (kind === "coin" ? 2.5 : 1.2);
    const r = 80 + t * (kind === "big" ? 380 : 320) + (i % 4) * 18;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (kind === "coin") {
      return `<g transform="translate(${x} ${y}) rotate(${frame * 22 + i * 13})"><circle r="30" fill="#ffc83d" stroke="#b96e1c" stroke-width="5"/><circle r="18" fill="#ffe878"/><path d="M-9 -4 H9 M-9 6 H9" stroke="#9b5b18" stroke-width="4" stroke-linecap="round"/></g>`;
    }
    const color = kind === "yizai" ? (i % 3 === 0 ? "#ff615f" : "#fff0a8") : kind === "big" ? (i % 2 ? "#70ecff" : "#fff0a8") : "#fff3a6";
    return star(x, y, 12 + (i % 4) * 6, color, Math.max(0.18, 1 - t * 0.65));
  }).join("");
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="none"/>
    <circle cx="${cx}" cy="${cy}" r="${70 + t * 260}" fill="none" stroke="${kind === "yizai" ? "#ffcf52" : "#fff0a8"}" stroke-width="${Math.max(4, 44 * (1 - t))}" opacity="${Math.max(0.08, 0.7 * (1 - t))}"/>
    ${kind === "yizai" ? `<circle cx="${cx}" cy="${cy}" r="230" fill="none" stroke="#ffffff" stroke-width="10" opacity=".16"/>` : ""}
    ${particles}
  </svg>`;
}

function star(x, y, r, color, opacity) {
  return `<path d="M${x} ${y - r} L${x + r * 0.26} ${y - r * 0.26} L${x + r} ${y} L${x + r * 0.26} ${y + r * 0.26} L${x} ${y + r} L${x - r * 0.26} ${y + r * 0.26} L${x - r} ${y} L${x - r * 0.26} ${y - r * 0.26}Z" fill="${color}" opacity="${opacity}"/>`;
}

function expectedAssets() {
  const list = [
    "ui/home/home_bg.jpg",
    "ui/home/home_machine.png",
    "ui/home/btn_start_normal.png",
    "ui/home/btn_start_pressed.png",
    "ui/home/btn_start_disabled.png",
    "ui/home/btn_task_normal.png",
    "ui/home/btn_task_pressed.png",
    "ui/home/btn_task_disabled.png",
    "ui/home/btn_rank_normal.png",
    "ui/home/btn_rank_pressed.png",
    "ui/home/btn_rank_disabled.png",
    "ui/home/btn_shop_normal.png",
    "ui/home/btn_shop_pressed.png",
    "ui/home/btn_shop_disabled.png",
    "ui/home/panel_daily_goal.png",
    "ui/home/panel_best_score.png",
    "ui/home/panel_coin_balance.png",
    "ui/home/coin_icon.png",
    "ui/game/game_shell.png",
    "ui/game/game_playfield_bg.jpg",
    "ui/game/game_playfield_frame.png",
    "ui/game/hud_top.png",
    "ui/game/panel_score.png",
    "ui/game/panel_best.png",
    "ui/game/panel_next_ball.png",
    "ui/game/control_bar.png",
    "ui/game/btn_sound_on_normal.png",
    "ui/game/btn_sound_on_pressed.png",
    "ui/game/btn_sound_on_disabled.png",
    "ui/game/btn_sound_off_normal.png",
    "ui/game/btn_sound_off_pressed.png",
    "ui/game/btn_sound_off_disabled.png",
    "ui/game/btn_pause_normal.png",
    "ui/game/btn_pause_pressed.png",
    "ui/game/btn_pause_disabled.png",
    "ui/game/btn_restart_normal.png",
    "ui/game/btn_restart_pressed.png",
    "ui/game/btn_restart_disabled.png",
    "ui/game/warning_line.png",
    "ui/game/dropper_head.png",
    "ui/modal/modal_base.png",
    "ui/modal/pause_panel.png",
    "ui/modal/btn_resume_normal.png",
    "ui/modal/btn_resume_pressed.png",
    "ui/modal/btn_resume_disabled.png",
    "ui/modal/btn_pause_home_normal.png",
    "ui/modal/btn_pause_home_pressed.png",
    "ui/modal/btn_pause_restart_normal.png",
    "ui/modal/btn_pause_restart_pressed.png",
    "ui/modal/btn_close_normal.png",
    "ui/modal/btn_close_pressed.png",
    "ui/task/task_panel.png",
    "ui/task/task_item.png",
    "ui/task/btn_claim_normal.png",
    "ui/task/btn_claim_pressed.png",
    "ui/task/btn_claim_disabled.png",
    "ui/shop/shop_panel.png",
    "ui/shop/shop_card.png",
    "ui/shop/btn_buy_normal.png",
    "ui/shop/btn_buy_pressed.png",
    "ui/shop/btn_buy_disabled.png",
    "ui/shop/btn_use_normal.png",
    "ui/shop/btn_use_pressed.png",
    "ui/shop/btn_use_disabled.png",
    "ui/rank/rank_panel.png",
    "ui/rank/rank_item.png",
    "ui/result/result_panel.png",
    "ui/result/btn_again_normal.png",
    "ui/result/btn_again_pressed.png",
    "ui/result/btn_share_normal.png",
    "ui/result/btn_share_pressed.png",
    "ui/result/btn_share_disabled.png",
    "ui/result/btn_home_normal.png",
    "ui/result/btn_home_pressed.png",
    "ui/loading/loading_bg.jpg",
    "ui/loading/loading_bar_bg.png",
    "ui/loading/loading_bar_fill.png",
    "share/share_card_bg.jpg",
    "share/store_cover.jpg",
    "icon/app_icon.png",
  ];
  for (let i = 1; i <= 11; i += 1) {
    list.push(`balls/default/${[
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
    ][i - 1]}`);
  }
  for (const skin of ["jelly", "star", "cream", "coin", "festival"]) {
    for (let i = 1; i <= 10; i += 1) list.push(`balls/skins/${skin}/skin_${skin}_face_${String(i).padStart(2, "0")}.png`);
    list.push(`balls/skins/${skin}/skin_preview_${skin}.png`);
  }
  for (const [dir, prefix, frames] of [
    ["merge_spark", "fx_merge_spark", 12],
    ["big_merge", "fx_big_merge", 16],
    ["yizai_success", "fx_yizai_success", 24],
    ["coin_fly", "fx_coin_fly", 16],
    ["button_tap", "fx_button_tap", 8],
  ]) {
    for (let i = 1; i <= frames; i += 1) list.push(`fx/${dir}/${prefix}_${String(i).padStart(3, "0")}.png`);
  }
  return list;
}

async function validatePack() {
  const expected = expectedAssets();
  const missing = [];
  const wrong = [];
  for (const rel of expected) {
    const file = path.join(packRoot, rel);
    try {
      const meta = await sharp(file).metadata();
      if (/\.png$/i.test(rel) && !meta.hasAlpha && !rel.includes("icon/app_icon")) wrong.push(`${rel}: expected alpha-capable PNG`);
    } catch {
      missing.push(rel);
    }
  }
  await writeFile(path.join(checkRoot, "resource_pack_validation.json"), JSON.stringify({
    ok: missing.length === 0 && wrong.length === 0,
    expected: expected.length,
    missing,
    wrong,
  }, null, 2), "utf8");
  if (missing.length || wrong.length) throw new Error(`Resource pack validation failed: ${missing.length} missing, ${wrong.length} wrong`);
}

async function makePreviewSheets() {
  const homePreview = await sharp(path.join(packRoot, "ui", "home", "home_bg.jpg"))
    .resize(375, 667)
    .composite([
      { input: await sharp(path.join(packRoot, "ui", "home", "home_machine.png")).resize(375, 667).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(path.join(packRoot, "ui", "home", "btn_start_normal.png")).resize(260, 80).png().toBuffer(), left: 58, top: 455 },
      { input: await sharp(path.join(packRoot, "ui", "home", "btn_task_normal.png")).resize(75, 75).png().toBuffer(), left: 290, top: 395 },
      { input: await sharp(path.join(packRoot, "ui", "home", "btn_rank_normal.png")).resize(75, 75).png().toBuffer(), left: 290, top: 478 },
      { input: await sharp(path.join(packRoot, "ui", "home", "btn_shop_normal.png")).resize(75, 75).png().toBuffer(), left: 28, top: 568 },
    ])
    .png()
    .toBuffer();
  await writeFile(path.join(checkRoot, "home_preview.png"), homePreview);

  const gamePreview = await sharp({
    create: { width: 375, height: 667, channels: 3, background: "#f3fbff" },
  })
    .composite([
      { input: await sharp(path.join(packRoot, "ui", "game", "game_shell.png")).resize(375, 667).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(path.join(packRoot, "ui", "game", "game_playfield_bg.jpg")).resize(310, 390).png().toBuffer(), left: 33, top: 115 },
      { input: await sharp(path.join(packRoot, "ui", "game", "game_playfield_frame.png")).resize(325, 410).png().toBuffer(), left: 25, top: 105 },
    ])
    .png()
    .toBuffer();
  await writeFile(path.join(checkRoot, "game_preview.png"), gamePreview);
}

async function writeSummary() {
  await writeFile(path.join(projectRoot, "art", "final", "v2-resource-pack", "README.md"), `# 合成亿仔 V2.0 美术资源包

- 生成来源：本轮 image 模型图集 + 本地标准化处理，辅以 assets_final 中尺寸完全对齐的 GPT UI 素材。
- 输出目录：assets/
- 同步目录：game/cocos-creator-v2/assets/
- 球体规则：512x512，主体 460px 标准圆，四周 26px 透明边距。
- 不使用 assets_final 的 home_bg；home_bg/home_machine/game_shell 使用本轮生成素材。
- 验证记录：tests/device-checks/v2-final-assets/resource_pack_validation.json
`, "utf8");
}
