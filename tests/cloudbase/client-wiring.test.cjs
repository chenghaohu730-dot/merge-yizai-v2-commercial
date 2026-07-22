"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const esbuild = require("../../game/web-prototype/node_modules/esbuild");

const workspace = path.resolve(__dirname, "../..");

async function loadClientSlice() {
  const source = `
    export { createCloudRuntime } from "./game/cocos-creator-v2/assets/scripts/platform/CloudRuntimeBootstrap";
    export { RunEventRecorder } from "./game/cocos-creator-v2/assets/scripts/domain/run/RunEventRecorder";
    export { XorShift32 } from "./game/cocos-creator-v2/assets/scripts/domain/run/SeededPrng";
    export { FinishRetryQueue } from "./game/cocos-creator-v2/assets/scripts/application/FinishRetryQueue";
    export { RunCoordinator } from "./game/cocos-creator-v2/assets/scripts/application/RunCoordinator";
  `;
  const result = await esbuild.build({
    stdin: { contents: source, resolveDir: workspace, loader: "ts" },
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    write: false,
    logLevel: "silent"
  });
  const module = { exports: {} };
  const output = result.outputFiles[0].text;
  new Function("module", "exports", "require", "__filename", "__dirname", output)(
    module,
    module.exports,
    require,
    "client-slice.cjs",
    workspace
  );
  return module.exports;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    values
  };
}

test("mock composition runs start -> seeded events -> non-trusted finish -> all rank query paths", async () => {
  const { createCloudRuntime, RunEventRecorder, XorShift32 } = await loadClientSlice();
  const runtime = createCloudRuntime({
    storage: memoryStorage(),
    clientVersion: "2.0.0-test",
    configVersion: "v2-dev-1",
    mode: "mock",
    timeoutMs: 100
  });

  const started = await runtime.coordinator.start();
  assert.equal(started.mode, "online");
  let now = 0;
  const recorder = new RunEventRecorder(() => now);
  const random = new XorShift32(started.session.seed);
  const droppedLevel = random.pickWeightedLevel(started.session.runConfig.spawnWeights);
  recorder.recordDrop(0.25);
  now = 100;
  recorder.recordWarning(true);
  now = 3100;
  const receipt = await runtime.coordinator.finish({
    runId: started.session.runId,
    nonce: started.session.nonce,
    configVersion: started.session.configVersion,
    eventStream: {
      encoding: "compact-v1",
      events: recorder.snapshot(),
      sha256: recorder.digest(started.session.nonce)
    },
    finish: {
      reason: "warning_line",
      wallDurationMs: recorder.wallDurationMs(),
      activeDurationMs: recorder.activeDurationMs(),
      warningHoldMs: 3000
    },
    clientClaim: {
      score: 0,
      maxLevel: droppedLevel,
      dropCount: 1,
      mergeCounts: Array(12).fill(0),
      yizaiCount: 0
    }
  });
  assert.equal(receipt.verdict, "valid");
  assert.equal(receipt.serverScore, 0);
  assert.equal(runtime.retryQueue.list().length, 0);

  const top = await runtime.rankController.loadTop("all", 100);
  assert.equal(top.items.length, 100);
  assert.equal(top.me.rank, 137);
  assert.ok(top.nextCursor);
  const around = await runtime.rankController.loadAroundMe("all", 5);
  assert.deepEqual(around.items.map((entry) => entry.rank), [132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142]);
  const paged = await runtime.rankController.loadMore("all", 50);
  assert.equal(paged.items.length, 150);
  assert.equal(paged.items[100].rank, 101);
});

test("runFinish timeout leaves a stable request in persistent exponential-backoff queue", async () => {
  const { FinishRetryQueue, RunCoordinator } = await loadClientSlice();
  const storage = memoryStorage();
  const queue = new FinishRetryQueue(storage, "test.pending", () => 1000);
  const never = () => new Promise(() => {});
  const gateway = {
    isAvailable: () => true,
    runStart: never,
    runFinish: never,
    rankTop: never,
    rankAroundMe: never,
    rankPage: never
  };
  const coordinator = new RunCoordinator(gateway, queue, "2.0.0-test", "v2-dev-1", 5);
  const receipt = await coordinator.finish({
    runId: "run-timeout",
    nonce: "nonce-timeout",
    configVersion: "v2-dev-1",
    eventStream: { encoding: "compact-v1", events: [], sha256: "0".repeat(64) },
    finish: { reason: "warning_line", wallDurationMs: 3000, activeDurationMs: 3000, warningHoldMs: 3000 },
    clientClaim: { score: 999999, maxLevel: 11, dropCount: 0, mergeCounts: Array(12).fill(0), yizaiCount: 0 }
  });
  assert.equal(receipt, null);
  const pending = queue.list();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].request.runId, "run-timeout");
  assert.equal(pending[0].attempts, 1);
  assert.ok(pending[0].nextAttemptAtMs > 1000);
});

test("Cocos controllers expose concrete seed, recorder, background finish and full-rank wiring", () => {
  const gameManager = fs.readFileSync(path.join(
    workspace,
    "game/cocos-creator-v2/assets/scripts/core/GameManager.ts"
  ), "utf8");
  const dropController = fs.readFileSync(path.join(
    workspace,
    "game/cocos-creator-v2/assets/scripts/game/DropController.ts"
  ), "utf8");
  const rankView = fs.readFileSync(path.join(
    workspace,
    "game/cocos-creator-v2/assets/scripts/ui/RankView.ts"
  ), "utf8");
  const resultView = fs.readFileSync(path.join(
    workspace,
    "game/cocos-creator-v2/assets/scripts/ui/ResultView.ts"
  ), "utf8");
  assert.match(gameManager, /await this\.cloudRuntime\.coordinator\.start\(\)/);
  assert.match(gameManager, /new XorShift32\(started\.session\.seed\)/);
  assert.match(gameManager, /void this\.finishWorldRun\(/);
  assert.match(gameManager, /Diagnostic only\. CloudBase always recomputes/);
  assert.match(dropController, /beginRun\(spawnLevelSource\?/);
  assert.match(rankView, /loadTop\(this\.periodId, 100\)/);
  assert.match(rankView, /loadAroundMe\(this\.periodId, 5\)/);
  assert.match(rankView, /loadMore\(this\.periodId, 50\)/);
  assert.match(resultView, /showCloudDeferred/);
});
