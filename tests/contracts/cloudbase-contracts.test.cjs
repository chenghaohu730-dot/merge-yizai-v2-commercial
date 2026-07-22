"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  API_VERSION,
  DomainError,
  fail,
  ok
} = require("../../backend/cloudbase/shared/contracts.cjs");
const { canonicalEventDigest } = require("../../backend/cloudbase/shared/crypto-utils.cjs");
const { XorShift32 } = require("../../backend/cloudbase/shared/prng.cjs");
const { CursorCodec } = require("../../backend/cloudbase/shared/ranking.cjs");

test("API envelope never leaks internal error messages", () => {
  assert.equal(API_VERSION, 1);
  assert.deepEqual(ok("request-1", { value: 42 }, 100), {
    ok: true,
    requestId: "request-1",
    serverTimeMs: 100,
    data: { value: 42 }
  });
  assert.deepEqual(fail("request-2", new DomainError("RUN_EXPIRED", "private details"), 101), {
    ok: false,
    requestId: "request-2",
    serverTimeMs: 101,
    error: { code: "RUN_EXPIRED", retryable: false, messageKey: "run_expired" }
  });
});

test("xorshift32 has a fixed cross-runtime vector", () => {
  const random = new XorShift32(1);
  assert.deepEqual(
    [random.nextUint32(), random.nextUint32(), random.nextUint32(), random.nextUint32()],
    [270369, 67634689, 2647435461, 307599695]
  );
});

test("event digest is bound to nonce and compact event order", () => {
  const events = [[0, 0, 0], [0, 400, 0], [1, 410, 1]];
  const first = canonicalEventDigest("nonce-a", events);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.notEqual(first, canonicalEventDigest("nonce-b", events));
  assert.notEqual(first, canonicalEventDigest("nonce-a", [...events].reverse()));
});

test("rank cursor is opaque, period-bound and tamper-evident", () => {
  let now = 100000;
  const codec = new CursorCodec("cursor-secret-at-least-16", { clock: () => now });
  const entry = {
    playerId: "player-1",
    score: 100,
    maxLevel: 5,
    durationMs: 60000,
    achievedAtMs: 90000
  };
  const token = codec.encode("week:fixture", entry);
  assert.equal(codec.decode(token, "week:fixture").playerId, "player-1");
  assert.throws(() => codec.decode(`${token.slice(0, -1)}x`, "week:fixture"), { code: "CURSOR_INVALID" });
  assert.throws(() => codec.decode(token, "season:fixture"), { code: "CURSOR_INVALID" });
  now += 60 * 60 * 1000 + 1;
  assert.throws(() => codec.decode(token, "week:fixture"), { code: "CURSOR_INVALID" });
});

test("JSON contract declares runStart, runFinish and rank request shapes", () => {
  const schemaPath = path.resolve(__dirname, "../../backend/cloudbase/contracts/v1/api.schema.json");
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  assert.equal(schema.$defs.runStartRequest.allOf.length, 2);
  assert.ok(schema.$defs.runFinishRequest);
  assert.ok(schema.$defs.rankRequest);
  assert.equal(schema.$defs.runEvent.oneOf.length, 4);
});
