#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(repoRoot, "game/cocos-creator-v2");
const assetsRoot = resolve(projectRoot, "assets");
const creatorRoot = resolve(
  process.env.YIZAI_COCOS_ROOT || "D:/CocosCreator/versions/3.8.8"
);
const sceneTemplatePath = resolve(
  creatorRoot,
  "resources/resources/3d/engine/editor/assets/default_file_content/scene/scene-2d.scene"
);
const prefabTemplatePath = resolve(
  creatorRoot,
  "resources/resources/3d/engine/editor/assets/default_file_content/prefab/default.prefab"
);

function requireFile(path, hint) {
  if (!existsSync(path)) throw new Error(`${hint}: ${path}`);
  return path;
}

function stableHex(value, length = 32) {
  return createHash("sha256").update(value).digest("hex").slice(0, length);
}

function stableUuid(value) {
  const hex = stableHex(`merge-yizai-v2:${value}`, 32).split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  const joined = hex.join("");
  return `${joined.slice(0, 8)}-${joined.slice(8, 12)}-${joined.slice(12, 16)}-${joined.slice(16, 20)}-${joined.slice(20)}`;
}

function compressedUuid(uuid) {
  const base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const hex = uuid.replaceAll("-", "");
  let output = hex.slice(0, 5);
  for (let index = 5; index < hex.length; index += 3) {
    const value = Number.parseInt(hex.slice(index, index + 3), 16);
    output += base64[value >> 6] + base64[value & 63];
  }
  return output;
}

function stableObjectId(value) {
  return compressedUuid(stableUuid(value));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const sceneTemplate = JSON.parse(
  readFileSync(requireFile(sceneTemplatePath, "Missing Cocos 3.8.8 2D scene template"), "utf8")
);
const prefabTemplate = JSON.parse(
  readFileSync(requireFile(prefabTemplatePath, "Missing Cocos 3.8.8 prefab template"), "utf8")
);

function createScene(name, outputPath, componentMetaPath) {
  const scene = structuredClone(sceneTemplate);
  scene[0]._name = name;
  scene[1]._name = name;
  scene[1]._id = stableUuid(`scene:${name}`);
  scene[2]._lpos.x = 375;
  scene[2]._lpos.y = 667;
  scene[2]._id = stableObjectId(`scene:${name}:canvas`);
  scene[3]._id = stableObjectId(`scene:${name}:camera-node`);
  scene[4]._orthoHeight = 667;
  scene[4]._id = stableObjectId(`scene:${name}:camera`);
  scene[5]._contentSize.width = 750;
  scene[5]._contentSize.height = 1334;
  scene[5]._id = stableObjectId(`scene:${name}:canvas-transform`);
  scene[6]._id = stableObjectId(`scene:${name}:canvas-component`);
  scene[7]._top = 0;
  scene[7]._bottom = 0;
  scene[7]._id = stableObjectId(`scene:${name}:canvas-widget`);

  if (componentMetaPath) {
    const meta = JSON.parse(readFileSync(requireFile(componentMetaPath, "Missing scene component metadata"), "utf8"));
    const componentIndex = scene.length;
    scene[2]._components.push({ __id__: componentIndex });
    scene.push({
      __type__: compressedUuid(meta.uuid),
      _name: "",
      _objFlags: 0,
      node: { __id__: 2 },
      _enabled: true,
      __prefab: null,
      _id: stableObjectId(`scene:${name}:component:${meta.uuid}`)
    });
  }

  writeJson(outputPath, scene);
}

function createPrefab(name, outputPath) {
  const prefab = structuredClone(prefabTemplate);
  prefab[0]._name = name;
  prefab[1]._name = name;
  prefab[1]._id = stableObjectId(`prefab:${name}:node`);
  prefab[2].fileId = stableObjectId(`prefab:${name}:file`);
  writeJson(outputPath, prefab);
}

createScene(
  "Boot",
  resolve(assetsRoot, "main/scenes/Boot.scene"),
  resolve(assetsRoot, "scripts/boot/Boot.ts.meta")
);
for (const name of ["Home", "Game", "Result"]) {
  createScene(
    name,
    resolve(assetsRoot, `bundles/core_game/scenes/${name}.scene`),
    resolve(assetsRoot, "bundles/core_game/scripts/CommercialScenePresenter.ts.meta")
  );
}

for (const name of ["FaceBall", "StateButton", "CommonModal"]) {
  createPrefab(name, resolve(assetsRoot, `bundles/core_game/prefabs/${name}.prefab`));
}
for (const name of ["TaskPanel", "ShopPanel", "RankPanel", "TaskRow", "ShopSkinCard", "RankRow"]) {
  createPrefab(name, resolve(assetsRoot, `bundles/meta_ui/prefabs/${name}.prefab`));
}

const bundleNames = [
  "core_game",
  "meta_ui",
  "skin_jelly_v2",
  "skin_star_v2",
  "skin_cream_v2",
  "skin_coin_v2",
  "skin_festival_v2"
];
const localSubpackageConfigId = `auto_${stableObjectId("bundle-config:wechat-local-subpackage")}`;
for (const [index, name] of bundleNames.entries()) {
  const metaPath = resolve(assetsRoot, `bundles/${name}.meta`);
  const meta = JSON.parse(readFileSync(requireFile(metaPath, "Import the project once before configuring bundle metadata"), "utf8"));
  meta.userData = {
    ...meta.userData,
    isBundle: true,
    bundleName: name,
    bundleConfigID: localSubpackageConfigId,
    priority: bundleNames.length - index,
    compressionType: {
      ...(meta.userData?.compressionType || {}),
      wechatgame: "subpackage"
    },
    isRemoteBundle: {
      ...(meta.userData?.isRemoteBundle || {}),
      wechatgame: false
    }
  };
  writeJson(metaPath, meta);
}

const legacyResourcesMetaPath = resolve(assetsRoot, "legacy_resources_v1.meta");
if (existsSync(legacyResourcesMetaPath)) {
  const legacyMeta = JSON.parse(readFileSync(legacyResourcesMetaPath, "utf8"));
  legacyMeta.userData = {};
  writeJson(legacyResourcesMetaPath, legacyMeta);
}

const builderSettingsPath = resolve(projectRoot, "settings/v2/packages/builder.json");
const builderSettings = JSON.parse(readFileSync(requireFile(builderSettingsPath, "Missing imported builder settings"), "utf8"));
builderSettings.bundleConfig = {
  ...(builderSettings.bundleConfig || {}),
  custom: {
    ...(builderSettings.bundleConfig?.custom || {}),
    [localSubpackageConfigId]: {
      displayName: "V2 WeChat local subpackage",
      configs: {
        native: {
          preferredOptions: { isRemote: false, compressionType: "merge_dep" }
        },
        web: {
          preferredOptions: { isRemote: false, compressionType: "merge_dep" },
          fallbackOptions: { isRemote: false, compressionType: "merge_dep" }
        },
        miniGame: {
          preferredOptions: { isRemote: false, compressionType: "subpackage" },
          fallbackOptions: { isRemote: false, compressionType: "subpackage" },
          configMode: "fallback"
        }
      }
    }
  }
};
writeJson(builderSettingsPath, builderSettings);

const engineSettingsPath = resolve(projectRoot, "settings/v2/packages/engine.json");
const engineSettings = JSON.parse(readFileSync(requireFile(engineSettingsPath, "Missing imported engine settings"), "utf8"));
const engineConfigKey = "v2_mobile_2d";
engineSettings.modules = {
  globalConfigKey: engineConfigKey,
  configs: {
    [engineConfigKey]: {
      name: "V2 mobile 2D minimal",
      flags: {
        LOAD_BOX2D_MANUALLY: false,
        LOAD_BULLET_MANUALLY: false,
        LOAD_SPINE_MANUALLY: false,
        LOAD_PHYSX_MANUALLY: false
      },
      includeModules: [
        "base",
        "gfx-webgl",
        "2d",
        "ui",
        "mask",
        "audio",
        "physics-2d-box2d",
        "intersection-2d",
        "tween",
        "particle-2d",
        "legacy-pipeline"
      ],
      noDeprecatedFeatures: { value: false, version: "" },
      cache: {
        base: { _value: true },
        "gfx-webgl": { _value: true },
        "gfx-webgl2": { _value: false },
        "gfx-webgpu": { _value: false },
        animation: { _value: false },
        "skeletal-animation": { _value: false },
        "3d": { _value: false },
        meshopt: { _value: false },
        "2d": { _value: true },
        "sorting-2d": { _value: false },
        "rich-text": { _value: false },
        mask: { _value: true },
        graphics: { _value: false },
        "ui-skew": { _value: false },
        "affine-transform": { _value: false },
        ui: { _value: true },
        particle: { _value: false },
        physics: { _value: false, _option: "physics-ammo" },
        "physics-ammo": { _value: false, _flags: { LOAD_BULLET_MANUALLY: false } },
        "physics-cannon": { _value: false },
        "physics-physx": { _value: false, _flags: { LOAD_PHYSX_MANUALLY: false } },
        "physics-builtin": { _value: false },
        "physics-2d": { _value: true, _option: "physics-2d-box2d" },
        "physics-2d-box2d": { _value: true },
        "physics-2d-box2d-wasm": { _value: false, _flags: { LOAD_BOX2D_MANUALLY: false } },
        "physics-2d-builtin": { _value: false },
        "physics-2d-box2d-jsb": { _value: false },
        "intersection-2d": { _value: true },
        primitive: { _value: false },
        profiler: { _value: false },
        "occlusion-query": { _value: false },
        "geometry-renderer": { _value: false },
        "debug-renderer": { _value: false },
        "particle-2d": { _value: true },
        audio: { _value: true },
        video: { _value: false },
        webview: { _value: false },
        tween: { _value: true },
        websocket: { _value: false },
        "websocket-server": { _value: false },
        terrain: { _value: false },
        "light-probe": { _value: false },
        "tiled-map": { _value: false },
        "vendor-google": { _value: false },
        spine: { _value: false, _option: "spine-3.8" },
        "spine-3.8": { _value: false, _flags: { LOAD_SPINE_MANUALLY: false } },
        "spine-4.2": { _value: false, _flags: { LOAD_SPINE_MANUALLY: false } },
        "dragon-bones": { _value: false },
        marionette: { _value: false },
        "procedural-animation": { _value: false },
        "custom-pipeline-post-process": { _value: false },
        "render-pipeline": { _value: true, _option: "legacy-pipeline" },
        "custom-pipeline": { _value: false },
        "legacy-pipeline": { _value: true },
        xr: { _value: false }
      }
    }
  }
};
writeJson(engineSettingsPath, engineSettings);

const projectSettingsPath = resolve(projectRoot, "settings/v2/packages/project.json");
const settings = JSON.parse(readFileSync(requireFile(projectSettingsPath, "Missing imported project settings"), "utf8"));
settings.general = {
  ...(settings.general || {}),
  designResolution: { width: 750, height: 1334 },
  fitWidth: true,
  fitHeight: false
};
writeJson(projectSettingsPath, settings);

console.log(`Generated 4 scenes and 9 prefabs for Cocos Creator 3.8.8.`);
console.log(`Configured ${bundleNames.length} local-only WeChat subpackage bundles.`);
console.log(`Registered bundle config: ${localSubpackageConfigId}.`);
console.log(`Engine module preset: ${engineConfigKey}.`);
console.log(`Design resolution: 750x1334 (fit width).`);
