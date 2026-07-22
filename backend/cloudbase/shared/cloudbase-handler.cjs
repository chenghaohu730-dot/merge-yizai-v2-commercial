"use strict";

const { DomainError, fail, ok } = require("./contracts.cjs");
const { CloudBaseRepository } = require("./cloudbase-repository.cjs");
const { createLeaderboardService } = require("./leaderboard-service.cjs");
const { DEFAULT_RUN_CONFIG } = require("./run-verifier.cjs");

const ACTION_METHODS = Object.freeze({
  profileGet: "profileGet",
  runStart: "runStart",
  runFinish: "runFinish",
  rankTop: "rankTop",
  rankAroundMe: "rankAroundMe",
  rankPage: "rankPage"
});

function requiredSecret(name) {
  const value = process.env[name];
  if (!value || value.length < 16) throw new Error(`${name} must be configured with at least 16 characters`);
  return value;
}

function createCloudFunction(action) {
  const method = ACTION_METHODS[action];
  if (!method) throw new Error(`Unknown CloudBase action: ${action}`);
  let runtime;

  return async function cloudFunctionMain(event) {
    const request = event && typeof event === "object" ? event : {};
    const requestId = typeof request.requestId === "string" ? request.requestId : "unknown";
    const serverTimeMs = Date.now();
    try {
      if (!runtime) runtime = buildRuntime();
      const wxContext = runtime.cloud.getWXContext();
      if (!wxContext || typeof wxContext.OPENID !== "string") {
        throw new DomainError("AUTH_REQUIRED", "No trusted WeChat identity");
      }
      const data = await runtime.service[method]({ openId: wxContext.OPENID }, request);
      return ok(requestId, data, serverTimeMs);
    } catch (error) {
      console.error(`[${action}] request failed`, {
        requestId,
        code: error && error.code,
        message: error && error.message
      });
      return fail(requestId, error, serverTimeMs);
    }
  };
}

function buildRuntime() {
  const cloud = require("wx-server-sdk");
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  const repository = new CloudBaseRepository(cloud.database());
  const configVersion = process.env.RUN_CONFIG_VERSION || DEFAULT_RUN_CONFIG.version;
  const service = createLeaderboardService({
    repository,
    playerIdSecret: requiredSecret("PLAYER_ID_SECRET"),
    runIdSecret: requiredSecret("RUN_ID_SECRET"),
    cursorSecret: requiredSecret("RANK_CURSOR_SECRET"),
    seasonId: process.env.ACTIVE_SEASON_ID || "season:prelaunch",
    configVersion,
    runConfig: { ...DEFAULT_RUN_CONFIG, version: configVersion }
  });
  return { cloud, service };
}

module.exports = { ACTION_METHODS, buildRuntime, createCloudFunction };
