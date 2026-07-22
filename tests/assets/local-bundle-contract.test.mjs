import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  DEFAULT_LOCAL_SKIN_ID,
  LOCAL_BUNDLE_DESCRIPTORS,
  LOCAL_SKIN_DESCRIPTORS,
  LocalBundleLoader,
  LocalSkinRuntime
} from "../../game/cocos-creator-v2/assets/scripts/application/LocalBundleRuntime.ts";
import { evaluatePackageSizes, inspectWechatBuild } from "../../tools/audit-cocos-local-bundle-sizes.mjs";
import { findProjectRoot } from "../../tools/generate-cocos-local-bundle-integrity.mjs";
import { validateLocalBundleSources } from "../../tools/validate-cocos-local-bundles.mjs";

const projectRoot = findProjectRoot();
const manifest = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "assets", "data", "local-bundle-manifest.json"), "utf8")
);

test("local bundle manifest, source hashes and skin files are internally consistent", () => {
  const result = validateLocalBundleSources(projectRoot);
  assert.deepEqual(result.errors, []);
  assert.equal(result.manifest.externalAssetUrls.length, 0);
  assert.equal(result.manifest.integrity.runtimeDownloadVerification, false);
});

test("every non-main bundle is a WeChat local subpackage", () => {
  const nonMain = LOCAL_BUNDLE_DESCRIPTORS.filter((bundle) => bundle.name !== "main");
  assert.equal(nonMain.length, 7);
  for (const bundle of nonMain) {
    assert.equal(bundle.kind, "local-subpackage");
    assert.equal(bundle.compression, "subpackage");
  }
});

test("non-default skin prices cannot masquerade as approved economy values", () => {
  const shop = JSON.parse(fs.readFileSync(path.join(projectRoot, "assets", "data", "shop-skins.json"), "utf8"));
  assert.equal(shop.skins.find((skin) => skin.id === shop.defaultSkinId).pricingStatus, "locked");
  for (const skin of shop.skins.filter((item) => item.id !== shop.defaultSkinId)) {
    assert.equal(skin.pricingStatus, "provisional");
  }
});

test("TypeScript loader catalog matches the checked-in bundle manifest", () => {
  const manifestBundles = new Map(manifest.bundles.map((bundle) => [bundle.name, bundle]));
  for (const descriptor of LOCAL_BUNDLE_DESCRIPTORS) {
    const json = manifestBundles.get(descriptor.name);
    assert.ok(json, `missing manifest descriptor ${descriptor.name}`);
    assert.equal(json.kind, descriptor.kind);
    assert.equal(json.compression, descriptor.compression);
    assert.equal(json.required, descriptor.required);
    assert.equal(json.budgetBytes, descriptor.budgetBytes);
  }
});

test("concurrent local bundle loads are deduplicated", async () => {
  let loadCalls = 0;
  let finishLoad;
  const port = {
    get: () => null,
    load: async () => {
      loadCalls += 1;
      return new Promise((resolve) => {
        finishLoad = resolve;
      });
    }
  };
  const loader = new LocalBundleLoader(LOCAL_BUNDLE_DESCRIPTORS, port, {
    baseDelayMs: 0,
    wait: async () => undefined
  });
  const first = loader.load("meta_ui");
  const second = loader.load("meta_ui");
  await Promise.resolve();
  assert.equal(loadCalls, 1);
  finishLoad({ name: "meta_ui" });
  const [firstBundle, secondBundle] = await Promise.all([first, second]);
  assert.equal(firstBundle, secondBundle);
  assert.equal(loader.getState("meta_ui"), "loaded");
});

test("local bundle retry is bounded and exponential", async () => {
  let loadCalls = 0;
  const waits = [];
  const loader = new LocalBundleLoader(
    [
      {
        name: "skin_test_v2",
        kind: "local-subpackage",
        compression: "subpackage",
        required: false,
        budgetBytes: 100,
        maxLoadAttempts: 3
      }
    ],
    {
      get: () => null,
      load: async () => {
        loadCalls += 1;
        if (loadCalls < 3) throw new Error("transient local subpackage failure");
        return { name: "skin_test_v2" };
      }
    },
    {
      baseDelayMs: 5,
      wait: async (delayMs) => waits.push(delayMs)
    }
  );

  const bundle = await loader.load("skin_test_v2");
  assert.equal(bundle.name, "skin_test_v2");
  assert.equal(loadCalls, 3);
  assert.deepEqual(waits, [5, 10]);
});

test("locked or broken skins immediately fall back to classic", async () => {
  const failedBundleNames = [];
  const loader = new LocalBundleLoader(
    LOCAL_BUNDLE_DESCRIPTORS,
    {
      get: () => null,
      load: async (name) => {
        failedBundleNames.push(name);
        throw new Error("local subpackage unavailable");
      }
    },
    { baseDelayMs: 0, wait: async () => undefined }
  );
  const skins = new LocalSkinRuntime(loader, LOCAL_SKIN_DESCRIPTORS);

  const locked = await skins.activate("star_v2", [DEFAULT_LOCAL_SKIN_ID]);
  assert.equal(locked.reason, "locked");
  assert.equal(locked.activeSkinId, DEFAULT_LOCAL_SKIN_ID);
  assert.equal(failedBundleNames.length, 0);

  const failed = await skins.activate("jelly_v2", [DEFAULT_LOCAL_SKIN_ID, "jelly_v2"]);
  assert.equal(failed.reason, "bundle-load-failed");
  assert.equal(failed.activeSkinId, DEFAULT_LOCAL_SKIN_ID);
  assert.equal(failed.usedClassicFallback, true);
  assert.equal(skins.resolveFaceResource(11).bundleName, "core_game");
});

test("an unlocked built-in skin activates without changing the final Yizai asset", async () => {
  const loader = new LocalBundleLoader(
    LOCAL_BUNDLE_DESCRIPTORS,
    {
      get: () => null,
      load: async (name) => ({ name })
    },
    { baseDelayMs: 0, wait: async () => undefined }
  );
  const skins = new LocalSkinRuntime(loader, LOCAL_SKIN_DESCRIPTORS);
  const activation = await skins.activate("festival_v2", [DEFAULT_LOCAL_SKIN_ID, "festival_v2"]);
  assert.equal(activation.reason, "activated");
  assert.equal(skins.resolveFaceResource(1).bundleName, "skin_festival_v2");
  assert.deepEqual(skins.resolveFaceResource(11), {
    bundleName: "core_game",
    resource: "faces/default/face_11_yizai"
  });
});

test("package byte gate accepts an in-budget build report", () => {
  const report = {
    mainBytes: 2_000_000,
    bundles: {
      core_game: 4_000_000,
      meta_ui: 1_000_000,
      skin_jelly_v2: 800_000,
      skin_star_v2: 800_000,
      skin_cream_v2: 800_000,
      skin_coin_v2: 800_000,
      skin_festival_v2: 800_000
    },
    totalBytes: 11_000_000
  };
  assert.deepEqual(evaluatePackageSizes(report, manifest).errors, []);
});

test("WeChat build inspection excludes declared subpackages from main bytes", () => {
  const fixture = path.resolve(projectRoot, "..", "..", "tests", "assets", "fixtures", "wechat-local-build");
  const report = inspectWechatBuild(fixture);
  assert.ok(report.mainBytes > 0);
  assert.equal(Object.keys(report.bundles).length, 7);
  assert.equal(report.totalBytes, report.mainBytes + Object.values(report.bundles).reduce((sum, bytes) => sum + bytes, 0));
  assert.deepEqual(evaluatePackageSizes(report, manifest).errors, []);
});

test("package byte gate rejects main overflow, total overflow and missing skins", () => {
  const report = {
    mainBytes: manifest.budgets.mainMaxBytes + 1,
    bundles: {
      core_game: 4_000_000,
      meta_ui: 1_000_000,
      skin_jelly_v2: 800_000,
      skin_star_v2: 800_000,
      skin_cream_v2: 800_000,
      skin_coin_v2: 800_000
    },
    totalBytes: manifest.budgets.localTotalTargetBytes + 1
  };
  const errors = evaluatePackageSizes(report, manifest).errors.join("\n");
  assert.match(errors, /main is/);
  assert.match(errors, /missing local subpackage skin_festival_v2/);
  assert.match(errors, /internal gate/);
});
