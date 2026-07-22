#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = resolve(repoRoot, "game/cocos-creator-v2/assets");
const artRoot = resolve(repoRoot, "art/final");
const coreRoot = resolve(assetsRoot, "bundles/core_game");
const magick = process.env.YIZAI_MAGICK || "magick";

function requirePath(path) {
  if (!existsSync(path)) throw new Error(`Required source is missing: ${path}`);
  return path;
}

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function copy(source, target) {
  ensureParent(target);
  copyFileSync(requirePath(source), target);
}

function convert(source, target, operations = []) {
  ensureParent(target);
  const result = spawnSync(magick, [requirePath(source), ...operations, "-strip", target], {
    encoding: "utf8",
    windowsHide: true
  });
  if (result.status !== 0) {
    throw new Error(`ImageMagick failed for ${source}: ${result.stderr || result.stdout}`);
  }
}

function cleanGeneratedFolder(path) {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function copyFiles(sourceDir, targetDir, extensions) {
  cleanGeneratedFolder(targetDir);
  for (const name of readdirSync(requirePath(sourceDir)).sort()) {
    if (!extensions.includes(extname(name).toLowerCase())) continue;
    copy(resolve(sourceDir, name), resolve(targetDir, name));
  }
}

function copyImages(sourceDir, targetDir) {
  copyFiles(sourceDir, targetDir, [".png", ".jpg", ".jpeg"]);
}

copyImages(resolve(assetsRoot, "balls/default"), resolve(coreRoot, "faces/default"));
for (const skin of ["jelly", "star", "cream", "coin", "festival"]) {
  copyImages(
    resolve(assetsRoot, `balls/skins/${skin}`),
    resolve(assetsRoot, `bundles/skin_${skin}_v2/faces/${skin}`)
  );
}

const gameplayRoot = resolve(coreRoot, "ui/gameplay");
cleanGeneratedFolder(gameplayRoot);
copy(resolve(artRoot, "interaction-polish-assets/game_bg_cleaned_750x1334.jpg"), resolve(gameplayRoot, "game_bg_750x1334.jpg"));
copy(resolve(artRoot, "reference-concept-assets/splash_bg_750x1334.jpg"), resolve(gameplayRoot, "splash_bg_750x1334.jpg"));
copy(resolve(artRoot, "reference-concept-assets/playfield_frame_750x1334.png"), resolve(gameplayRoot, "playfield_frame_750x1334.png"));
copy(resolve(artRoot, "ui/dropper_head.png"), resolve(gameplayRoot, "dropper_head.png"));
copy(resolve(artRoot, "ui/warning_line.png"), resolve(gameplayRoot, "warning_line.png"));
for (const name of ["control_pause", "control_restart", "control_sound"]) {
  copy(resolve(artRoot, `ui/${name}.png`), resolve(gameplayRoot, `${name}.png`));
}

const panelsRoot = resolve(coreRoot, "ui/panels");
cleanGeneratedFolder(panelsRoot);
const panelTargets = {
  start_panel: "700x460>",
  pause_panel: "700x930>",
  result_panel: "700x820>",
  score_panel: "640x480>",
  next_frame: "240x215>",
  merge_bubble: "560x194>",
  progress_bar: "600x76>"
};
for (const [name, geometry] of Object.entries(panelTargets)) {
  convert(resolve(artRoot, `ui/${name}.png`), resolve(panelsRoot, `${name}.png`), ["-resize", geometry]);
}

const buttonsRoot = resolve(coreRoot, "ui/buttons");
cleanGeneratedFolder(buttonsRoot);
const buttonTargets = {
  button_start: "520x158>",
  button_continue: "1040x320>",
  button_primary: "1040x320>",
  button_secondary: "1040x320>",
  control_pause: "128x128>",
  control_restart: "128x128>",
  control_sound: "128x128>"
};
for (const [name, geometry] of Object.entries(buttonTargets)) {
  const source = resolve(artRoot, `ui/${name}.png`);
  convert(source, resolve(buttonsRoot, `${name}_normal.png`), ["-resize", geometry]);
  convert(source, resolve(buttonsRoot, `${name}_pressed.png`), ["-resize", geometry, "-brightness-contrast", "-8x4"]);
  convert(source, resolve(buttonsRoot, `${name}_disabled.png`), [
    "-resize", geometry,
    "-colorspace", "Gray",
    "-alpha", "on",
    "-channel", "A",
    "-evaluate", "multiply", "0.62",
    "+channel"
  ]);
}

console.log("Prepared local Cocos runtime assets:");
console.log("- core_game: classic faces and commercial UI");
console.log("- audio: generate separately with build-v2-commercial-audio.mjs");
console.log("- skin bundles: five complete level 1-10 sets plus previews");
console.log("- source masters remain unchanged under art/final and assets/balls");
