"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { API_VERSION } = require("../../backend/cloudbase/shared/contracts.cjs");
const { canonicalEventDigest } = require("../../backend/cloudbase/shared/crypto-utils.cjs");
const { InMemoryRepository } = require("../../backend/cloudbase/shared/in-memory-repository.cjs");
const {
  createLeaderboardService,
  cstWeekPeriodId
} = require("../../backend/cloudbase/shared/leaderboard-service.cjs");

const SECRETS = {
  playerIdSecret: "test-player-id-secret-1234567890",
  runIdSecret: "test-run-id-secret-123456789012",
  cursorSecret: "test-cursor-secret-123456789012"
};

function createHarness(options = {}) {
  let now = options.now || Date.parse("2026-07-22T12:00:00+08:00");
  let randomSequence = 100;
  const repository = new InMemoryRepository();
  const service = createLeaderboardService({
    repository,
    ...SECRETS,
    clock: () => now,
    randomHex: () => `nonce-${randomSequence++}-abcdefgh`,
    randomUint32: () => 123456789,
    seasonId: "season:fixture",
    configVersion: "fixture-v1",
    runConfig: {
      version: "fixture-v1",
      spawnWeights: [{ level: 1, weight: 100 }],
      minDropIntervalMs: 350,
      warningHoldMs: 3000,
      reviewScoreThreshold: 1000000
    }
  });
  return {
    repository,
    service,
    context: { openId: options.openId || "openid-primary" },
    now: () => now,
    advance: (milliseconds) => { now += milliseconds; }
  };
}

async function startRun(harness, requestId = `start-${Math.random().toString(16).slice(2)}`) {
  return harness.service.runStart(harness.context, {
    apiVersion: API_VERSION,
    requestId,
    clientVersion: "2.0.0-test",
    configVersion: "fixture-v1"
  });
}

function finishRequest(session, options = {}) {
  const events = options.events || [[0, 0, 0], [0, 400, 0], [1, 410, 1], [4, 500, 1]];
  const mergeCounts = Array(12).fill(0);
  mergeCounts[1] = 1;
  const claim = options.claim || {
    score: 2,
    maxLevel: 2,
    dropCount: 2,
    mergeCounts,
    yizaiCount: 0
  };
  return {
    apiVersion: API_VERSION,
    requestId: options.requestId || "finish-request-0001",
    runId: session.runId,
    nonce: session.nonce,
    configVersion: session.configVersion,
    eventStream: {
      encoding: "compact-v1",
      events,
      sha256: canonicalEventDigest(session.nonce, events)
    },
    finish: {
      reason: "warning_line",
      wallDurationMs: 3500,
      activeDurationMs: 3500,
      warningHoldMs: 3000
    },
    clientClaim: claim
  };
}

test("runFinish recomputes score and a valid first game creates week, season and all entries", async () => {
  const harness = createHarness();
  const session = await startRun(harness, "start-valid-0001");
  const receipt = await harness.service.runFinish(harness.context, finishRequest(session));
  assert.equal(receipt.verdict, "valid");
  assert.equal(receipt.serverScore, 2);
  assert.equal(receipt.maxLevel, 2);
  assert.equal(receipt.rankUpdates.length, 3);
  assert.equal(harness.repository.maps.run_results.size, 1);
  assert.equal(harness.repository.maps.leaderboard_entries.size, 3);

  const top = await harness.service.rankTop(harness.context, {
    apiVersion: 1,
    requestId: "rank-top-request",
    periodId: session.periodIds.week
  });
  assert.equal(top.items.length, 1);
  assert.equal(top.me.rank, 1);
  assert.equal(top.me.score, 2);
});

test("runStart requestId is idempotent and never creates a second seed or nonce", async () => {
  const harness = createHarness();
  const first = await startRun(harness, "start-network-retry");
  const second = await startRun(harness, "start-network-retry");
  assert.deepEqual(second, first);
  assert.equal(harness.repository.maps.run_sessions.size, 1);
});

test("a modified client score goes to review and cannot create a public entry", async () => {
  const harness = createHarness();
  const session = await startRun(harness, "start-tamper-0001");
  const request = finishRequest(session);
  request.clientClaim.score = 999999999;
  const receipt = await harness.service.runFinish(harness.context, request);
  assert.equal(receipt.verdict, "review");
  assert.equal(receipt.serverScore, 2);
  assert.ok(receipt.riskFlags.includes("CLIENT_SCORE_MISMATCH"));
  assert.equal(harness.repository.maps.leaderboard_entries.size, 0);

  const around = await harness.service.rankAroundMe(harness.context, {
    apiVersion: 1,
    requestId: "around-review-request",
    periodId: session.periodIds.week,
    radius: 5
  });
  assert.equal(around.meStatus, "under_review");
  assert.deepEqual(around.items, []);
});

test("impossible merge is rejected even when the client claim looks plausible", async () => {
  const harness = createHarness();
  const session = await startRun(harness, "start-reject-0001");
  const events = [[1, 0, 1], [4, 100, 1]];
  const request = finishRequest(session, {
    events,
    claim: { score: 999, maxLevel: 11, dropCount: 0, mergeCounts: Array(12).fill(0), yizaiCount: 1 }
  });
  const receipt = await harness.service.runFinish(harness.context, request);
  assert.equal(receipt.verdict, "rejected");
  assert.equal(receipt.serverScore, 0);
  assert.ok(receipt.riskFlags.includes("IMPOSSIBLE_MERGE"));
  assert.equal(harness.repository.maps.leaderboard_entries.size, 0);
});

test("same runId is idempotent, including concurrent and changed-payload retries", async () => {
  const harness = createHarness();
  const session = await startRun(harness, "start-idempotent-0001");
  const request = finishRequest(session);
  const receipts = await Promise.all(Array.from({ length: 10 }, () => harness.service.runFinish(harness.context, request)));
  assert.equal(receipts.filter((item) => item.idempotentReplay === false).length, 1);
  assert.equal(harness.repository.maps.run_results.size, 1);
  assert.equal(harness.repository.maps.leaderboard_entries.size, 3);

  const changed = structuredClone(request);
  changed.requestId = "finish-changed-payload";
  changed.clientClaim.score = 7777777;
  const replay = await harness.service.runFinish(harness.context, changed);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.verdict, "valid");
  assert.equal(replay.serverScore, 2);
  assert.equal(harness.repository.maps.run_results.size, 1);
});

test("a different OPENID cannot finish or inspect another player's run receipt", async () => {
  const harness = createHarness();
  const session = await startRun(harness, "start-owner-check-01");
  const attackerContext = { openId: "openid-attacker" };
  await assert.rejects(
    harness.service.runFinish(attackerContext, finishRequest(session)),
    { code: "RUN_NOT_FOUND" }
  );
  assert.equal(harness.repository.maps.run_results.size, 0);
  assert.equal(harness.repository.maps.leaderboard_entries.size, 0);
});

test("expired first submission is rejected without creating a result", async () => {
  const harness = createHarness();
  const session = await startRun(harness, "start-expired-run-01");
  harness.advance(24 * 60 * 60 * 1000 + 1);
  await assert.rejects(
    harness.service.runFinish(harness.context, finishRequest(session)),
    { code: "RUN_EXPIRED" }
  );
  assert.equal(harness.repository.maps.run_results.size, 0);
});

test("in-memory transaction rolls back all staged writes on failure", async () => {
  const repository = new InMemoryRepository();
  await assert.rejects(repository.runTransaction(async (tx) => {
    await tx.set("players", "p-rollback", { _id: "p-rollback" });
    await tx.set("run_results", "r-rollback", { _id: "r-rollback" });
    throw new Error("injected failure");
  }), /injected failure/);
  assert.equal(await repository.get("players", "p-rollback"), null);
  assert.equal(await repository.get("run_results", "r-rollback"), null);
});

test("a valid zero-score completed game still enters every leaderboard", async () => {
  const harness = createHarness();
  const session = await startRun(harness, "start-zero-score-01");
  const events = [[0, 0, 0], [4, 100, 1]];
  const request = finishRequest(session, {
    events,
    claim: { score: 0, maxLevel: 1, dropCount: 1, mergeCounts: Array(12).fill(0), yizaiCount: 0 }
  });
  request.finish.wallDurationMs = 3100;
  request.finish.activeDurationMs = 3100;
  const receipt = await harness.service.runFinish(harness.context, request);
  assert.equal(receipt.verdict, "valid");
  assert.equal(receipt.serverScore, 0);
  assert.equal(harness.repository.maps.leaderboard_entries.size, 3);
});

test("pause time is excluded from active duration without sending a valid run to review", async () => {
  const harness = createHarness();
  const session = await startRun(harness, "start-paused-run-001");
  const events = [
    [0, 0, 0],
    [2, 100],
    [3, 5100],
    [0, 5500, 0],
    [1, 5510, 1],
    [4, 5600, 1]
  ];
  const request = finishRequest(session, { events });
  request.finish.wallDurationMs = 8600;
  request.finish.activeDurationMs = 3600;
  const receipt = await harness.service.runFinish(harness.context, request);
  assert.equal(receipt.verdict, "valid");
  assert.deepEqual(receipt.riskFlags, []);
});

test("205-player board supports Top100, exact rank 137, Around Me and complete cursor traversal", async () => {
  const harness = createHarness({ openId: "openid-rank-137" });
  await harness.service.profileGet(harness.context, { apiVersion: 1, requestId: "profile-rank-137" });
  const meId = harness.service.playerIdForOpenId(harness.context.openId);
  const periodId = "week:205-fixture";
  const entries = Array.from({ length: 205 }, (_, index) => {
    const rank = index + 1;
    const playerId = rank === 137 ? meId : `fixture-player-${String(rank).padStart(4, "0")}`;
    return {
      _id: `${periodId}:${playerId}`,
      periodType: "week",
      periodId,
      playerId,
      score: 100000 - rank * 10,
      maxLevel: 11 - Math.floor(index / 30),
      durationMs: 60000 + rank,
      achievedAtMs: 1700000000000 + rank,
      bestRunId: `fixture-run-${rank}`,
      publicCode: String(rank).padStart(4, "0"),
      displayName: `亿仔玩家${String(rank).padStart(4, "0")}`,
      avatarId: "avatar_default_yizai",
      equippedSkinId: "default",
      status: "visible"
    };
  });
  await harness.repository.seedLeaderboard(entries);

  const top = await harness.service.rankTop(harness.context, {
    apiVersion: 1,
    requestId: "rank-top-205-fixture",
    periodId
  });
  assert.equal(top.items.length, 100);
  assert.equal(top.me.rank, 137);
  assert.ok(top.nextCursor);
  const continued = await harness.service.rankPage(harness.context, {
    apiVersion: 1,
    requestId: "rank-page-after-top100",
    periodId,
    cursor: top.nextCursor,
    limit: 20
  });
  assert.equal(continued.items[0].rank, 101);
  assert.equal(continued.items[0].publicCode, "0101");

  const around = await harness.service.rankAroundMe(harness.context, {
    apiVersion: 1,
    requestId: "rank-around-205-fixture",
    periodId,
    radius: 5
  });
  assert.equal(around.items.length, 11);
  assert.deepEqual(around.items.map((item) => item.rank), [132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142]);
  assert.equal(around.me.rank, 137);

  const seen = [];
  let cursor;
  do {
    const page = await harness.service.rankPage(harness.context, {
      apiVersion: 1,
      requestId: `rank-page-${String(seen.length).padStart(4, "0")}`,
      periodId,
      limit: 37,
      ...(cursor ? { cursor } : {})
    });
    seen.push(...page.items.map((item) => item.publicCode));
    cursor = page.nextCursor;
  } while (cursor);
  assert.equal(seen.length, 205);
  assert.equal(new Set(seen).size, 205);
  assert.equal(seen[0], "0001");
  assert.equal(seen[204], "0205");
});

test("fixed tie ordering ends with playerId and cursor traversal stays stable", async () => {
  const harness = createHarness();
  const periodId = "all";
  const entries = ["p-c", "p-a", "p-b"].map((playerId) => ({
    _id: `${periodId}:${playerId}`,
    periodType: "all",
    periodId,
    playerId,
    score: 100,
    maxLevel: 5,
    durationMs: 50000,
    achievedAtMs: 1700000000000,
    bestRunId: `run-${playerId}`,
    publicCode: playerId,
    displayName: playerId,
    avatarId: "avatar_default_yizai",
    equippedSkinId: "default",
    status: "visible"
  }));
  await harness.repository.seedLeaderboard(entries);
  const page = await harness.service.rankPage(harness.context, {
    apiVersion: 1,
    requestId: "rank-tie-fixture",
    periodId,
    limit: 3
  });
  assert.deepEqual(page.items.map((item) => item.publicCode), ["p-a", "p-b", "p-c"]);
});

test("weekly period changes exactly at Monday 00:00 China Standard Time", () => {
  assert.equal(cstWeekPeriodId(Date.parse("2026-07-19T23:59:59.999+08:00")), "week:2026-07-13");
  assert.equal(cstWeekPeriodId(Date.parse("2026-07-20T00:00:00.000+08:00")), "week:2026-07-20");
});
