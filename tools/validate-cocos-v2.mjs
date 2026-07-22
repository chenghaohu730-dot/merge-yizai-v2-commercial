import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const projectRoot =
  path.basename(cwd) === "cocos-creator-v2" ? cwd : path.join(cwd, "game", "cocos-creator-v2");
const errors = [];

function readJson(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing JSON: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    errors.push(`Invalid JSON: ${relativePath} - ${error.message}`);
    return null;
  }
}

function mustExist(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) errors.push(`Missing: ${relativePath}`);
}

mustExist("project.json");
mustExist("README.md");
mustExist("assets/scenes/README.md");
mustExist("assets/prefabs/README.md");
mustExist("assets/data/asset_manifest.json");
mustExist("assets/data/resource-gap-report.json");

const faceChain = readJson("assets/data/face-chain.json");
if (faceChain) {
  if (faceChain.designWidth !== 750 || faceChain.designHeight !== 1334) {
    errors.push("Design resolution must stay 750x1334.");
  }
  if (!Array.isArray(faceChain.faces) || faceChain.faces.length !== 11) {
    errors.push("Face chain must contain exactly 11 levels.");
  } else {
    faceChain.faces.forEach((face, index) => {
      const expectedLevel = index + 1;
      if (face.level !== expectedLevel) errors.push(`Face level order mismatch at ${expectedLevel}.`);
      const assetPath = `${face.asset}.png`;
      mustExist(path.join("assets", "resources", assetPath));
    });
    const yizai = faceChain.faces[10];
    if (yizai.name !== "亿仔" || yizai.ipRules?.visibleText !== "MAEE") {
      errors.push("Level 11 must be 亿仔 and keep visible MAEE rule.");
    }
  }
  const totalWeight = (faceChain.spawnLevels || []).reduce((sum, item) => sum + Number(item.weight || 0), 0);
  if (totalWeight !== 100) errors.push(`Spawn weights must total 100, got ${totalWeight}.`);
}

const tasks = readJson("assets/data/tasks.json");
if (tasks && (!Array.isArray(tasks.tasks) || tasks.tasks.length < 5)) {
  errors.push("Task config must include login, rounds, level, share and yizai tasks.");
}

const shop = readJson("assets/data/shop-skins.json");
if (shop && (!Array.isArray(shop.skins) || !shop.skins.some((skin) => skin.unlockedByDefault))) {
  errors.push("Shop config must include at least one default unlocked skin.");
}

const buttonStates = readJson("assets/data/button-states.json");
if (buttonStates) {
  for (const button of buttonStates.buttons || []) {
    for (const state of ["normal", "pressed", "disabled"]) {
      mustExist(path.join("assets", "resources", `${button[state]}.png`));
    }
  }
}

const assetManifest = readJson("assets/data/asset_manifest.json");
if (assetManifest) {
  const design = assetManifest.designSize || {};
  if (design.width !== 750 || design.height !== 1334) {
    errors.push("asset_manifest designSize must be 750x1334.");
  }

  const home = assetManifest.layout?.home || {};
  const game = assetManifest.layout?.game || {};
  const safety = assetManifest.ballSafety || {};

  if (home.start_button_rect?.x !== 115 || home.start_button_rect?.y !== 910) {
    errors.push("asset_manifest home start_button_rect does not match the latest resource table.");
  }
  if (game.physics_rect?.x !== 89 || game.physics_rect?.y !== 254 || game.physics_rect?.w !== 572 || game.physics_rect?.h !== 732) {
    errors.push("asset_manifest physics_rect does not match the latest resource table.");
  }
  if (game.warning_line_y !== 345) {
    errors.push("asset_manifest warning_line_y must be 345.");
  }
  if (safety.center?.[0] !== 256 || safety.center?.[1] !== 256 || safety.maxSubjectDiameter !== 460 || safety.transparentMargin !== 26) {
    errors.push("asset_manifest ball safety must use center 256,256, subject diameter 460 and margin 26.");
  }
  if (!assetManifest.buttonStates?.soundOn || !assetManifest.buttonStates?.soundOff) {
    errors.push("asset_manifest must include separate soundOn and soundOff button states.");
  }
  if (!assetManifest.buttonStates?.resume || !assetManifest.buttonStates?.pauseHome || !assetManifest.buttonStates?.pauseRestart) {
    errors.push("asset_manifest must include pause modal button states.");
  }
}

for (const audio of ["button.wav", "drop.wav", "merge.wav", "big_merge.wav", "game_over.wav", "yizai.wav", "bgm.mp3"]) {
  mustExist(path.join("assets", "resources", "audio", audio));
}

const requiredScripts = [
  "assets/scripts/boot/Boot.ts",
  "assets/scripts/core/GameManager.ts",
  "assets/scripts/config/LayoutConfig.ts",
  "assets/scripts/game/GameArea.ts",
  "assets/scripts/game/DropController.ts",
  "assets/scripts/game/FaceItem.ts",
  "assets/scripts/game/MergeManager.ts",
  "assets/scripts/game/WarningLine.ts",
  "assets/scripts/ui/HomeView.ts",
  "assets/scripts/ui/ResultView.ts",
  "assets/scripts/platform/WechatAdapter.ts"
];
requiredScripts.forEach(mustExist);

if (errors.length > 0) {
  console.error("Cocos V2 validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Cocos V2 validation passed.");
