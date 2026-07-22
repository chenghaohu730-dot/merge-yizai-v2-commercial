#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundlesRoot = resolve(repoRoot, "game/cocos-creator-v2/assets/bundles");
const imageExtensions = new Set([".png", ".jpg", ".jpeg"]);

function walk(path) {
  const files = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const fullPath = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

let updated = 0;
let alreadyConfigured = 0;
for (const imagePath of walk(bundlesRoot).filter((path) => imageExtensions.has(extname(path).toLowerCase()))) {
  if (!statSync(imagePath).isFile()) continue;
  const metaPath = `${imagePath}.meta`;
  if (!existsSync(metaPath)) throw new Error(`Import the project before configuring SpriteFrame metadata: ${metaPath}`);
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  if (meta.importer !== "image") throw new Error(`Unexpected image importer in ${metaPath}`);
  if (meta.userData?.type === "sprite-frame" && meta.userData?.flipVertical === false && meta.subMetas?.f9941) {
    alreadyConfigured += 1;
    continue;
  }
  meta.userData = {
    ...(meta.userData || {}),
    type: "sprite-frame",
    flipVertical: false,
    fixAlphaTransparencyArtifacts: false
  };
  if (meta.subMetas?.["6c48a"]?.userData) {
    meta.subMetas["6c48a"].userData.wrapModeS = "clamp-to-edge";
    meta.subMetas["6c48a"].userData.wrapModeT = "clamp-to-edge";
  }
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  updated += 1;
}

console.log(`SpriteFrame metadata prepared: ${updated} changed, ${alreadyConfigured} already imported.`);
