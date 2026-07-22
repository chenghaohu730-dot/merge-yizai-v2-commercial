"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  FUNCTION_NAMES,
  packageFunctions
} = require("../../backend/cloudbase/scripts/package-functions.cjs");

const cloudRoot = path.resolve(__dirname, "../../backend/cloudbase");

test("deployment packager creates six self-contained thin cloud function folders", (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "merge-yizai-cloudbase-"));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const result = packageFunctions({ root: cloudRoot, output: temporary });
  assert.deepEqual(result.functions, FUNCTION_NAMES);
  for (const name of FUNCTION_NAMES) {
    const folder = path.join(temporary, name);
    assert.ok(fs.existsSync(path.join(folder, "index.js")), `${name} index`);
    assert.ok(fs.existsSync(path.join(folder, "_shared", "leaderboard-service.cjs")), `${name} shared service`);
    const packageJson = JSON.parse(fs.readFileSync(path.join(folder, "package.json"), "utf8"));
    assert.equal(packageJson.dependencies["wx-server-sdk"], "3.0.1");
  }
});

test("schema, full stable rank index and deny-client-access intent are present", () => {
  const collections = JSON.parse(fs.readFileSync(path.join(cloudRoot, "schema", "collections.json"), "utf8"));
  const indexes = JSON.parse(fs.readFileSync(path.join(cloudRoot, "indexes", "indexes.json"), "utf8"));
  const security = JSON.parse(fs.readFileSync(path.join(cloudRoot, "security", "database.rules.json"), "utf8"));
  assert.deepEqual(Object.keys(collections.collections).sort(), [
    "leaderboard_entries", "players", "run_results", "run_sessions"
  ]);
  const rankIndex = indexes.indexes.find((index) => index.name === "period_visible_rank");
  assert.deepEqual(rankIndex.fields.map((item) => `${item.field}:${item.direction}`), [
    "periodId:asc",
    "status:asc",
    "score:desc",
    "maxLevel:desc",
    "durationMs:asc",
    "achievedAtMs:asc",
    "playerId:asc"
  ]);
  for (const policy of Object.values(security.collections)) {
    assert.equal(policy.clientRead, false);
    assert.equal(policy.clientWrite, false);
  }
});

test("cloud runtime obtains identity from getWXContext and exposes no client database adapter", () => {
  const handler = fs.readFileSync(path.join(cloudRoot, "shared", "cloudbase-handler.cjs"), "utf8");
  const clientBridge = fs.readFileSync(path.resolve(
    cloudRoot,
    "../../game/cocos-creator-v2/assets/scripts/platform/CloudRankBridge.ts"
  ), "utf8");
  assert.match(handler, /getWXContext\(\)/);
  assert.match(handler, /wxContext\.OPENID/);
  assert.doesNotMatch(clientBridge, /\.database\s*\(/);
  assert.doesNotMatch(clientBridge, /submitWorldScore/);
  assert.match(clientBridge, /callFunction/);
});
