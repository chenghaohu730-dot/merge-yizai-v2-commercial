import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIntegrityInventory, checkIntegrityInventory, findProjectRoot } from "./generate-cocos-local-bundle-integrity.mjs";

const EXPECTED_BUNDLES = [
  "main",
  "core_game",
  "meta_ui",
  "skin_jelly_v2",
  "skin_star_v2",
  "skin_cream_v2",
  "skin_coin_v2",
  "skin_festival_v2"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function walk(value, visitor, key = "") {
  visitor(value, key);
  if (Array.isArray(value)) value.forEach((item) => walk(item, visitor, key));
  else if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) walk(childValue, visitor, childKey);
  }
}

export function validateLocalBundleSources(projectRoot = findProjectRoot()) {
  const errors = [];
  const warnings = [];
  const manifestPath = path.join(projectRoot, "assets", "data", "local-bundle-manifest.json");
  const manifest = readJson(manifestPath);
  const bundles = new Map((manifest.bundles || []).map((bundle) => [bundle.name, bundle]));

  if (manifest.deliveryMode !== "wechat-local-subpackages" || manifest.localOnly !== true) {
    errors.push("Bundle delivery mode must be WeChat local subpackages only.");
  }
  if (!Array.isArray(manifest.externalAssetUrls) || manifest.externalAssetUrls.length !== 0) {
    errors.push("externalAssetUrls must stay empty.");
  }

  walk(manifest, (value, key) => {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) errors.push(`External asset URL is forbidden: ${value}`);
    if (["url", "server", "isRemote", "remoteUrl", "cacheDir"].includes(key) && value) {
      errors.push(`Forbidden non-local bundle field: ${key}`);
    }
  });

  for (const expected of EXPECTED_BUNDLES) {
    if (!bundles.has(expected)) errors.push(`Missing local bundle descriptor: ${expected}`);
  }
  for (const [name, bundle] of bundles) {
    if (bundle.localOnly !== true) errors.push(`${name} must be localOnly.`);
    if (name === "main") {
      if (bundle.kind !== "main" || bundle.compression !== "merge_all_json") errors.push("main bundle settings are invalid.");
    } else if (bundle.kind !== "local-subpackage" || bundle.compression !== "subpackage") {
      errors.push(`${name} must be a local subpackage using subpackage compression.`);
    }
    if (!Number.isInteger(bundle.budgetBytes) || bundle.budgetBytes <= 0) errors.push(`${name} has an invalid byte budget.`);

    const entryPath = path.join(projectRoot, bundle.editorRoot, "bundle-entry.json");
    if (!fs.existsSync(entryPath)) errors.push(`Missing bundle entry: ${path.relative(projectRoot, entryPath)}`);
    else {
      const entry = readJson(entryPath);
      if (entry.name !== name || entry.localOnly !== true || entry.compression !== bundle.compression) {
        errors.push(`Bundle entry does not match manifest: ${name}`);
      }
    }
  }

  const main = bundles.get("main");
  if (manifest.budgets?.mainMaxBytes !== 3_460_300 || main?.budgetBytes !== 3_460_300) {
    errors.push("main byte gate must be exactly 3.3 MiB (3,460,300 bytes, rounded down)." );
  }
  if (manifest.budgets?.localTotalTargetBytes !== 16_777_216) errors.push("Local total target must be 16 MiB.");
  if (manifest.budgets?.localTotalHardMaxBytes !== 20_971_520) errors.push("Local total hard maximum must be 20 MiB.");

  const shop = readJson(path.join(projectRoot, "assets", "data", "shop-skins.json"));
  const skinBundles = new Set([...bundles.values()].filter((bundle) => bundle.skinId).map((bundle) => bundle.name));
  for (const skin of shop.skins || []) {
    if (skin.id === shop.defaultSkinId) {
      if (skin.bundleName !== "core_game") errors.push("Classic skin must live in core_game.");
      if (skin.price !== 0 || skin.pricingStatus !== "locked") errors.push("Classic skin must stay free and price-locked.");
      continue;
    }
    if (skin.pricingStatus !== "provisional") {
      errors.push(`${skin.id} price must remain explicitly provisional until economy tuning is approved.`);
    }
    if (!skinBundles.has(skin.bundleName)) errors.push(`Shop skin uses an unknown local bundle: ${skin.id}/${skin.bundleName}`);
    const sourceName = skin.theme;
    const sourceDir = path.join(projectRoot, "assets", "balls", "skins", sourceName);
    const faceFiles = fs.existsSync(sourceDir)
      ? fs.readdirSync(sourceDir).filter((name) => new RegExp(`^skin_${sourceName}_face_\\d{2}\\.png$`).test(name))
      : [];
    if (faceFiles.length !== 10) errors.push(`${skin.id} must contain exactly 10 skinnable face PNG files.`);
    if (!fs.existsSync(path.join(sourceDir, `skin_preview_${sourceName}.png`))) errors.push(`${skin.id} is missing its preview PNG.`);
  }

  const skinRules = manifest.skinRules || {};
  if (skinRules.level11Bundle !== "core_game" || skinRules.failureFallbackSkinId !== "classic_v2") {
    errors.push("Level 11 and load failures must fall back to the classic core_game skin.");
  }
  if (skinRules.gameplayValuesMutableBySkin !== false) errors.push("Skin gameplay values must be immutable.");

  const integrity = checkIntegrityInventory(projectRoot);
  if (!integrity.ok) errors.push(integrity.reason);
  const inventory = buildIntegrityInventory(projectRoot);
  for (const [name, bundle] of Object.entries(inventory.bundles)) {
    const budget = bundles.get(name)?.budgetBytes || 0;
    if (bundle.bytes > budget) warnings.push(`${name} source inventory is ${bundle.bytes} bytes, over its ${budget}-byte build budget.`);
  }

  return { errors, warnings, manifest, inventory };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateLocalBundleSources();
  for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
  if (result.errors.length) {
    console.error("Local bundle validation failed:");
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  const summary = Object.entries(result.inventory.bundles)
    .map(([name, bundle]) => `${name}=${bundle.bytes}B/${bundle.fileCount} files`)
    .join(", ");
  console.log(`Local bundle validation passed: ${summary}`);
}
