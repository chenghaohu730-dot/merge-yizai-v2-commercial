"use strict";

const {
  API_VERSION,
  DomainError,
  requireInteger,
  requireObject,
  requireString,
  validateBaseRequest
} = require("./contracts.cjs");
const {
  hmacHex,
  randomHex,
  randomUint32,
  sha256Hex
} = require("./crypto-utils.cjs");
const { normalizeConfig, verifyRun } = require("./run-verifier.cjs");
const {
  CursorCodec,
  isBetterEntry,
  publicRankEntry
} = require("./ranking.cjs");

function cstWeekPeriodId(nowMs) {
  const shifted = new Date(nowMs + 8 * 60 * 60 * 1000);
  const day = shifted.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  shifted.setUTCDate(shifted.getUTCDate() - daysSinceMonday);
  const date = shifted.toISOString().slice(0, 10);
  return `week:${date}`;
}

function defaultPeriods(nowMs, seasonId) {
  return {
    week: cstWeekPeriodId(nowMs),
    season: seasonId,
    all: "all"
  };
}

function periodTypeFor(periodId, periodIds) {
  if (periodId === periodIds.week) return "week";
  if (periodId === periodIds.season) return "season";
  return "all";
}

function clone(value) {
  return structuredClone(value);
}

class LeaderboardService {
  constructor(options) {
    this.repository = options.repository;
    this.clock = options.clock || (() => Date.now());
    this.randomHex = options.randomHex || randomHex;
    this.randomUint32 = options.randomUint32 || randomUint32;
    this.playerIdSecret = options.playerIdSecret;
    this.runIdSecret = options.runIdSecret;
    this.seasonId = options.seasonId || "season:dev-1";
    this.runConfig = normalizeConfig(options.runConfig);
    this.configVersion = options.configVersion || this.runConfig.version;
    this.playTtlMs = options.playTtlMs || 2 * 60 * 60 * 1000;
    this.submitTtlMs = options.submitTtlMs || 24 * 60 * 60 * 1000;
    this.cursorCodec = new CursorCodec(options.cursorSecret, { clock: this.clock });

    for (const [name, secret] of Object.entries({
      playerIdSecret: this.playerIdSecret,
      runIdSecret: this.runIdSecret
    })) {
      if (typeof secret !== "string" || secret.length < 16) throw new Error(`${name} must be at least 16 characters`);
    }
  }

  playerIdForOpenId(openId) {
    requireString(openId, "OPENID", { minLength: 3, maxLength: 256 });
    return `p_${hmacHex(this.playerIdSecret, openId).slice(0, 24)}`;
  }

  publicCodeForPlayer(playerId) {
    const numeric = Number.parseInt(hmacHex(this.playerIdSecret, `public:${playerId}`).slice(0, 8), 16) % 10000;
    return String(numeric).padStart(4, "0");
  }

  requireIdentity(context) {
    const openId = context && (context.openId || context.OPENID);
    if (typeof openId !== "string" || openId.length < 3) {
      throw new DomainError("AUTH_REQUIRED", "Trusted OPENID is required");
    }
    return { openId, playerId: this.playerIdForOpenId(openId) };
  }

  newPlayer(playerId, openId, nowMs) {
    const publicCode = this.publicCodeForPlayer(playerId);
    return {
      _id: playerId,
      openid: openId,
      publicCode,
      displayName: `亿仔玩家${publicCode}`,
      avatarId: "avatar_default_yizai",
      equippedSkinId: "default",
      createdAtMs: nowMs,
      lastSeenAtMs: nowMs,
      status: "active",
      hasVisibleRank: false,
      pendingReviewRunId: null
    };
  }

  async profileGet(context, request = { apiVersion: API_VERSION, requestId: "profile-default" }) {
    validateBaseRequest(request);
    const { openId, playerId } = this.requireIdentity(context);
    const nowMs = this.clock();
    const player = await this.repository.runTransaction(async (tx) => {
      const existing = await tx.get("players", playerId);
      const next = existing || this.newPlayer(playerId, openId, nowMs);
      next.lastSeenAtMs = nowMs;
      await tx.set("players", playerId, next);
      return next;
    });
    return this.publicProfile(player);
  }

  publicProfile(player) {
    return {
      publicCode: player.publicCode,
      displayName: player.displayName,
      avatarId: player.avatarId,
      equippedSkinId: player.equippedSkinId,
      serverStatus: player.status
    };
  }

  validateRunStart(request) {
    validateBaseRequest(request);
    requireString(request.clientVersion, "clientVersion", { maxLength: 64 });
    requireString(request.configVersion, "configVersion", { maxLength: 64 });
    if (request.configVersion !== this.configVersion) {
      throw new DomainError("CONFIG_MISMATCH", "Client config is not current", { retryable: true });
    }
  }

  async runStart(context, request) {
    this.validateRunStart(request);
    const { openId, playerId } = this.requireIdentity(context);
    const nowMs = this.clock();
    const runId = `r_${hmacHex(this.runIdSecret, `${playerId}:${request.requestId}`).slice(0, 32)}`;
    const proposed = {
      _id: runId,
      playerId,
      requestId: request.requestId,
      nonce: this.randomHex(16),
      seed: this.randomUint32(),
      configVersion: this.configVersion,
      clientVersion: request.clientVersion,
      periodIds: defaultPeriods(nowMs, this.seasonId),
      runConfig: clone(this.runConfig),
      startedAtMs: nowMs,
      playDeadlineAtMs: nowMs + this.playTtlMs,
      submitDeadlineAtMs: nowMs + this.submitTtlMs,
      status: "started",
      finishedAtMs: null
    };

    const session = await this.repository.runTransaction(async (tx) => {
      let player = await tx.get("players", playerId);
      if (!player) player = this.newPlayer(playerId, openId, nowMs);
      if (player.status !== "active") throw new DomainError("AUTH_REQUIRED", "Player is restricted");
      player.lastSeenAtMs = nowMs;
      await tx.set("players", playerId, player);

      const existing = await tx.get("run_sessions", runId);
      if (existing) return existing;
      await tx.set("run_sessions", runId, proposed);
      return proposed;
    });

    return this.publicRunSession(session);
  }

  publicRunSession(session) {
    return {
      runId: session._id,
      nonce: session.nonce,
      seed: session.seed,
      prngAlgorithm: session.runConfig.prngAlgorithm,
      startedAtMs: session.startedAtMs,
      playDeadlineAtMs: session.playDeadlineAtMs,
      submitDeadlineAtMs: session.submitDeadlineAtMs,
      configVersion: session.configVersion,
      periodIds: clone(session.periodIds),
      runConfig: {
        scoreByCreatedLevel: clone(session.runConfig.scoreByCreatedLevel),
        doubleLevel11Score: session.runConfig.doubleLevel11Score,
        spawnWeights: clone(session.runConfig.spawnWeights),
        minDropIntervalMs: session.runConfig.minDropIntervalMs,
        warningHoldMs: session.runConfig.warningHoldMs,
        maxActiveDurationMs: session.runConfig.maxActiveDurationMs
      }
    };
  }

  validateRunFinish(request) {
    validateBaseRequest(request);
    requireString(request.runId, "runId", { maxLength: 128 });
    requireString(request.nonce, "nonce", { maxLength: 128 });
    requireString(request.configVersion, "configVersion", { maxLength: 64 });
    requireObject(request.eventStream);
    requireObject(request.finish);
    requireObject(request.clientClaim);
  }

  async runFinish(context, request) {
    this.validateRunFinish(request);
    const { playerId } = this.requireIdentity(context);
    const session = await this.repository.get("run_sessions", request.runId);
    if (!session || session.playerId !== playerId) throw new DomainError("RUN_NOT_FOUND", "Run not found");

    const existing = await this.repository.get("run_results", request.runId);
    if (existing) return this.ensureFinishReceipt(existing, true);

    const nowMs = this.clock();
    if (nowMs > session.submitDeadlineAtMs) throw new DomainError("RUN_EXPIRED", "Run submission expired");
    if (request.nonce !== session.nonce) throw new DomainError("RUN_NOT_FOUND", "Run not found");

    const priorRanks = {};
    for (const periodId of Object.values(session.periodIds)) {
      const oldEntry = await this.repository.getLeaderboardEntry(periodId, playerId);
      priorRanks[periodId] = oldEntry && oldEntry.status === "visible"
        ? (await this.repository.countBefore(periodId, oldEntry)) + 1
        : null;
    }

    const evaluation = verifyRun(session, request, session.runConfig);
    const requestDigest = sha256Hex(JSON.stringify(request));
    const core = await this.repository.runTransaction(async (tx) => {
      const storedResult = await tx.get("run_results", request.runId);
      if (storedResult) return { result: storedResult, created: false };

      const currentSession = await tx.get("run_sessions", request.runId);
      if (!currentSession || currentSession.playerId !== playerId || currentSession.nonce !== request.nonce) {
        throw new DomainError("RUN_NOT_FOUND", "Run not found");
      }
      if (currentSession.status !== "started") throw new DomainError("RUN_NOT_FOUND", "Run already closed");
      if (nowMs > currentSession.submitDeadlineAtMs) throw new DomainError("RUN_EXPIRED", "Run submission expired");

      const player = await tx.get("players", playerId);
      if (!player) throw new DomainError("AUTH_REQUIRED", "Player not found");
      const entryUpdates = [];

      if (evaluation.verdict === "valid") {
        for (const periodId of Object.values(currentSession.periodIds)) {
          const entryId = `${periodId}:${playerId}`;
          const existingEntry = await tx.get("leaderboard_entries", entryId);
          const candidate = {
            _id: entryId,
            periodType: periodTypeFor(periodId, currentSession.periodIds),
            periodId,
            playerId,
            score: evaluation.serverScore,
            maxLevel: evaluation.maxLevel,
            durationMs: request.finish.activeDurationMs,
            achievedAtMs: nowMs,
            bestRunId: request.runId,
            publicCode: player.publicCode,
            displayName: player.displayName,
            avatarId: player.avatarId,
            equippedSkinId: player.equippedSkinId,
            status: "visible"
          };
          const improved = isBetterEntry(candidate, existingEntry);
          if (improved) await tx.set("leaderboard_entries", entryId, candidate);
          entryUpdates.push({ periodId, improved, priorRank: priorRanks[periodId] });
        }
        player.hasVisibleRank = true;
        player.pendingReviewRunId = null;
      } else if (evaluation.verdict === "review") {
        player.pendingReviewRunId = request.runId;
      }
      player.lastSeenAtMs = nowMs;
      await tx.set("players", playerId, player);

      const result = {
        _id: request.runId,
        runId: request.runId,
        playerId,
        requestDigest,
        clientScore: request.clientClaim.score,
        serverScore: evaluation.serverScore,
        maxLevel: evaluation.maxLevel,
        durationMs: request.finish.activeDurationMs,
        dropCount: evaluation.dropCount,
        mergeCounts: evaluation.mergeCounts,
        yizaiCount: evaluation.yizaiCount,
        eventDigest: request.eventStream.sha256,
        riskFlags: evaluation.riskFlags,
        verdict: evaluation.verdict,
        completedAtMs: nowMs,
        entryUpdates,
        finishReceipt: null
      };
      currentSession.status = "finished";
      currentSession.finishedAtMs = nowMs;
      await tx.set("run_results", request.runId, result);
      await tx.set("run_sessions", request.runId, currentSession);
      return { result, created: true };
    });

    return this.ensureFinishReceipt(core.result, !core.created);
  }

  async ensureFinishReceipt(initialResult, idempotentReplay) {
    let result = initialResult;
    if (!result.finishReceipt) {
      const rankUpdates = [];
      for (const update of result.entryUpdates || []) {
        const entry = await this.repository.getLeaderboardEntry(update.periodId, result.playerId);
        const currentRank = entry && entry.status === "visible"
          ? (await this.repository.countBefore(update.periodId, entry)) + 1
          : null;
        rankUpdates.push({
          periodType: entry ? entry.periodType : periodTypeFor(update.periodId, { week: "", season: "" }),
          periodId: update.periodId,
          improved: update.improved,
          previousRank: update.priorRank,
          currentRank
        });
      }
      const proposed = {
        runId: result.runId,
        verdict: result.verdict,
        serverScore: result.serverScore,
        maxLevel: result.maxLevel,
        riskFlags: clone(result.riskFlags),
        rankUpdates
      };
      result = await this.repository.runTransaction(async (tx) => {
        const current = await tx.get("run_results", result.runId);
        if (!current) throw new DomainError("INTERNAL_ERROR", "Missing stored result", { retryable: true });
        if (!current.finishReceipt) {
          current.finishReceipt = proposed;
          await tx.set("run_results", result.runId, current);
        }
        return current;
      });
    }
    return { ...clone(result.finishReceipt), idempotentReplay };
  }

  validateRankRequest(request) {
    validateBaseRequest(request);
    requireString(request.periodId, "periodId", { maxLength: 128 });
  }

  async rankStatus(playerId, entry) {
    if (entry && entry.status === "visible") return "ranked";
    const player = await this.repository.get("players", playerId);
    return player && player.pendingReviewRunId ? "under_review" : "not_ranked";
  }

  async rankTop(context, request) {
    this.validateRankRequest(request);
    const { playerId } = this.requireIdentity(context);
    const limit = request.limit === undefined ? 100 : requireInteger(request.limit, "limit", { min: 1, max: 100 });
    const rows = await this.repository.queryFirst(request.periodId, limit + 1);
    const page = rows.slice(0, limit);
    const meEntry = await this.repository.getLeaderboardEntry(request.periodId, playerId);
    const meRank = meEntry && meEntry.status === "visible"
      ? (await this.repository.countBefore(request.periodId, meEntry)) + 1
      : null;
    return {
      items: page.map((entry, index) => publicRankEntry(entry, index + 1, playerId)),
      me: meRank ? publicRankEntry(meEntry, meRank, playerId) : null,
      meStatus: await this.rankStatus(playerId, meEntry),
      nextCursor: rows.length > limit ? this.cursorCodec.encode(request.periodId, page[page.length - 1]) : null
    };
  }

  async rankAroundMe(context, request) {
    this.validateRankRequest(request);
    const { playerId } = this.requireIdentity(context);
    const radius = request.radius === undefined ? 5 : requireInteger(request.radius, "radius", { min: 1, max: 10 });
    const meEntry = await this.repository.getLeaderboardEntry(request.periodId, playerId);
    if (!meEntry || meEntry.status !== "visible") {
      return { items: [], me: null, meStatus: await this.rankStatus(playerId, meEntry) };
    }
    const meRank = (await this.repository.countBefore(request.periodId, meEntry)) + 1;
    const before = await this.repository.queryBeforeClosest(request.periodId, meEntry, radius);
    const after = await this.repository.queryAfter(request.periodId, meEntry, radius);
    const combined = [...before, meEntry, ...after];
    const startRank = meRank - before.length;
    return {
      items: combined.map((entry, index) => publicRankEntry(entry, startRank + index, playerId)),
      me: publicRankEntry(meEntry, meRank, playerId),
      meStatus: "ranked"
    };
  }

  async rankPage(context, request) {
    this.validateRankRequest(request);
    const { playerId } = this.requireIdentity(context);
    const limit = request.limit === undefined ? 50 : requireInteger(request.limit, "limit", { min: 1, max: 100 });
    const anchor = request.cursor ? this.cursorCodec.decode(request.cursor, request.periodId) : null;
    const rows = anchor
      ? await this.repository.queryAfter(request.periodId, anchor, limit + 1)
      : await this.repository.queryFirst(request.periodId, limit + 1);
    const page = rows.slice(0, limit);
    const startRank = page.length ? (await this.repository.countBefore(request.periodId, page[0])) + 1 : 0;
    return {
      items: page.map((entry, index) => publicRankEntry(entry, startRank + index, playerId)),
      nextCursor: rows.length > limit ? this.cursorCodec.encode(request.periodId, page[page.length - 1]) : null
    };
  }
}

function createLeaderboardService(options) {
  return new LeaderboardService(options);
}

module.exports = {
  LeaderboardService,
  createLeaderboardService,
  cstWeekPeriodId,
  defaultPeriods
};
