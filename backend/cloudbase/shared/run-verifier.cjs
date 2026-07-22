"use strict";

const { XorShift32 } = require("./prng.cjs");
const { canonicalEventDigest, safeEqualHex } = require("./crypto-utils.cjs");

const EVENT_KIND = Object.freeze({
  DROP: 0,
  MERGE: 1,
  PAUSE: 2,
  RESUME: 3,
  WARNING: 4
});

const DEFAULT_RUN_CONFIG = Object.freeze({
  version: "v2-dev-1",
  prngAlgorithm: "xorshift32-v1",
  scoreByCreatedLevel: Object.freeze({
    2: 2,
    3: 5,
    4: 10,
    5: 20,
    6: 40,
    7: 80,
    8: 160,
    9: 320,
    10: 640,
    11: 1280
  }),
  doubleLevel11Score: 3000,
  spawnWeights: Object.freeze([
    Object.freeze({ level: 1, weight: 45 }),
    Object.freeze({ level: 2, weight: 30 }),
    Object.freeze({ level: 3, weight: 18 }),
    Object.freeze({ level: 4, weight: 7 })
  ]),
  minDropIntervalMs: 350,
  warningHoldMs: 3000,
  maxActiveDurationMs: 30 * 60 * 1000,
  maxWallDurationMs: 24 * 60 * 60 * 1000,
  maxEvents: 10000,
  maxDropCount: 5000,
  reviewScoreThreshold: 1000000
});

const HARD_REJECT_FLAGS = new Set([
  "EVENT_DIGEST_MISMATCH",
  "EVENT_FORMAT_INVALID",
  "EVENT_TIME_INVALID",
  "IMPOSSIBLE_MERGE",
  "EVENT_LIMIT_EXCEEDED",
  "DROP_LIMIT_EXCEEDED",
  "FINISH_REASON_INVALID"
]);

function normalizeConfig(config = {}) {
  return {
    ...DEFAULT_RUN_CONFIG,
    ...config,
    scoreByCreatedLevel: {
      ...DEFAULT_RUN_CONFIG.scoreByCreatedLevel,
      ...(config.scoreByCreatedLevel || {})
    },
    spawnWeights: (config.spawnWeights || DEFAULT_RUN_CONFIG.spawnWeights).map((item) => ({
      level: Number(item.level),
      weight: Number(item.weight)
    }))
  };
}

function arraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function rejectResult(flag, riskFlags = []) {
  return {
    verdict: "rejected",
    serverScore: 0,
    maxLevel: 1,
    dropCount: 0,
    mergeCounts: Array(12).fill(0),
    yizaiCount: 0,
    riskFlags: [...new Set([flag, ...riskFlags])],
    inventory: Array(12).fill(0)
  };
}

function verifyRun(session, request, suppliedConfig) {
  const config = normalizeConfig(suppliedConfig || session.runConfig);
  const riskFlags = [];
  const stream = request && request.eventStream;
  const events = stream && stream.events;

  if (!stream || stream.encoding !== "compact-v1" || !Array.isArray(events)) {
    return rejectResult("EVENT_FORMAT_INVALID");
  }
  if (events.length > config.maxEvents) return rejectResult("EVENT_LIMIT_EXCEEDED");

  const expectedDigest = canonicalEventDigest(request.nonce, events);
  if (!safeEqualHex(expectedDigest, String(stream.sha256 || ""))) {
    return rejectResult("EVENT_DIGEST_MISMATCH");
  }

  const inventory = Array(12).fill(0);
  const mergeCounts = Array(12).fill(0);
  const prng = new XorShift32(session.seed);
  let previousTime = -1;
  let previousDropTime = null;
  let dropCount = 0;
  let serverScore = 0;
  let maxLevel = 1;
  let yizaiCount = 0;
  let warningStartedAt = null;
  let paused = false;
  let pauseStartedAt = null;
  let pausedTotalMs = 0;

  for (const event of events) {
    if (!Array.isArray(event) || event.length < 2 || event.length > 3) return rejectResult("EVENT_FORMAT_INVALID", riskFlags);
    const [kind, timeMs, argument] = event;
    if (!Number.isSafeInteger(kind) || !Number.isSafeInteger(timeMs) || timeMs < 0 || timeMs < previousTime) {
      return rejectResult("EVENT_TIME_INVALID", riskFlags);
    }
    previousTime = timeMs;

    if (kind === EVENT_KIND.DROP) {
      if (!Number.isSafeInteger(argument) || argument < -10000 || argument > 10000) {
        return rejectResult("EVENT_FORMAT_INVALID", riskFlags);
      }
      dropCount += 1;
      if (dropCount > config.maxDropCount) return rejectResult("DROP_LIMIT_EXCEEDED", riskFlags);
      if (paused) riskFlags.push("DROP_WHILE_PAUSED");
      if (!paused && previousDropTime !== null && timeMs - previousDropTime < config.minDropIntervalMs) {
        riskFlags.push("DROP_INTERVAL_TOO_SHORT");
      }
      previousDropTime = timeMs;
      const level = prng.pickWeightedLevel(config.spawnWeights);
      inventory[level] += 1;
      maxLevel = Math.max(maxLevel, level);
    } else if (kind === EVENT_KIND.MERGE) {
      const fromLevel = argument;
      if (!Number.isSafeInteger(fromLevel) || fromLevel < 1 || fromLevel > 11 || inventory[fromLevel] < 2) {
        return rejectResult("IMPOSSIBLE_MERGE", riskFlags);
      }
      inventory[fromLevel] -= 2;
      const nextLevel = Math.min(11, fromLevel + 1);
      inventory[nextLevel] += 1;
      mergeCounts[fromLevel] += 1;
      serverScore += fromLevel === 11
        ? config.doubleLevel11Score
        : Number(config.scoreByCreatedLevel[nextLevel] || 0);
      if (fromLevel === 10) yizaiCount += 1;
      maxLevel = Math.max(maxLevel, nextLevel);
    } else if (kind === EVENT_KIND.PAUSE) {
      if (paused) riskFlags.push("PAUSE_SEQUENCE_INVALID");
      else {
        paused = true;
        pauseStartedAt = timeMs;
      }
    } else if (kind === EVENT_KIND.RESUME) {
      if (!paused) riskFlags.push("PAUSE_SEQUENCE_INVALID");
      else {
        paused = false;
        pausedTotalMs += timeMs - pauseStartedAt;
        pauseStartedAt = null;
      }
    } else if (kind === EVENT_KIND.WARNING) {
      if (argument !== 0 && argument !== 1) return rejectResult("EVENT_FORMAT_INVALID", riskFlags);
      if (argument === 1) warningStartedAt = warningStartedAt === null ? timeMs : warningStartedAt;
      else warningStartedAt = null;
    } else {
      return rejectResult("EVENT_FORMAT_INVALID", riskFlags);
    }
  }

  const finish = request.finish || {};
  if (finish.reason !== "warning_line") return rejectResult("FINISH_REASON_INVALID", riskFlags);
  if (!Number.isSafeInteger(finish.wallDurationMs) || !Number.isSafeInteger(finish.activeDurationMs)
      || finish.wallDurationMs < 0 || finish.activeDurationMs < 0
      || finish.activeDurationMs > finish.wallDurationMs
      || finish.wallDurationMs > config.maxWallDurationMs
      || finish.activeDurationMs > config.maxActiveDurationMs) {
    riskFlags.push("DURATION_INVALID");
  }
  if (previousTime > finish.wallDurationMs || Math.abs(finish.wallDurationMs - previousTime) > 5000) {
    riskFlags.push("DURATION_MISMATCH");
  }
  const finalPausedMs = paused && pauseStartedAt !== null ? finish.wallDurationMs - pauseStartedAt : 0;
  const derivedActiveDurationMs = Math.max(0, finish.wallDurationMs - pausedTotalMs - finalPausedMs);
  if (Math.abs(finish.activeDurationMs - derivedActiveDurationMs) > 1000) riskFlags.push("ACTIVE_DURATION_MISMATCH");
  if (warningStartedAt === null || finish.wallDurationMs - warningStartedAt < config.warningHoldMs
      || finish.warningHoldMs < config.warningHoldMs) {
    riskFlags.push("WARNING_EVIDENCE_WEAK");
  }

  const claim = request.clientClaim || {};
  if (claim.score !== serverScore) riskFlags.push("CLIENT_SCORE_MISMATCH");
  if (claim.maxLevel !== maxLevel || claim.dropCount !== dropCount || claim.yizaiCount !== yizaiCount
      || !arraysEqual(claim.mergeCounts, mergeCounts)) {
    riskFlags.push("CLIENT_STATS_MISMATCH");
  }
  if (request.configVersion !== session.configVersion) riskFlags.push("CONFIG_VERSION_MISMATCH");
  if (serverScore >= config.reviewScoreThreshold) riskFlags.push("SCORE_OUTLIER");

  const uniqueFlags = [...new Set(riskFlags)];
  const rejected = uniqueFlags.some((flag) => HARD_REJECT_FLAGS.has(flag));
  return {
    verdict: rejected ? "rejected" : uniqueFlags.length ? "review" : "valid",
    serverScore,
    maxLevel,
    dropCount,
    mergeCounts,
    yizaiCount,
    riskFlags: uniqueFlags,
    inventory
  };
}

module.exports = {
  EVENT_KIND,
  DEFAULT_RUN_CONFIG,
  HARD_REJECT_FLAGS,
  normalizeConfig,
  verifyRun
};
