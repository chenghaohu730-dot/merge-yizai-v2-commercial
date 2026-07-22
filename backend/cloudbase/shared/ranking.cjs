"use strict";

const { createHmac, timingSafeEqual } = require("node:crypto");
const { DomainError } = require("./contracts.cjs");

function compareRankEntries(left, right) {
  return Number(right.score) - Number(left.score)
    || Number(right.maxLevel) - Number(left.maxLevel)
    || Number(left.durationMs) - Number(right.durationMs)
    || Number(left.achievedAtMs) - Number(right.achievedAtMs)
    || String(left.playerId).localeCompare(String(right.playerId));
}

function isBetterEntry(candidate, existing) {
  if (!existing) return true;
  return compareRankEntries(candidate, existing) < 0;
}

function publicRankEntry(entry, rank, playerId) {
  return {
    rank,
    publicCode: entry.publicCode,
    displayName: entry.displayName,
    avatarId: entry.avatarId,
    equippedSkinId: entry.equippedSkinId,
    score: entry.score,
    maxLevel: entry.maxLevel,
    durationMs: entry.durationMs,
    achievedAtMs: entry.achievedAtMs,
    isMe: entry.playerId === playerId
  };
}

class CursorCodec {
  constructor(secret, options = {}) {
    if (typeof secret !== "string" || secret.length < 16) throw new Error("Cursor secret must be at least 16 characters");
    this.secret = secret;
    this.maxAgeMs = options.maxAgeMs || 60 * 60 * 1000;
    this.clock = options.clock || (() => Date.now());
  }

  encode(periodId, entry) {
    const payload = {
      v: 1,
      periodId,
      score: entry.score,
      maxLevel: entry.maxLevel,
      durationMs: entry.durationMs,
      achievedAtMs: entry.achievedAtMs,
      playerId: entry.playerId,
      issuedAtMs: this.clock()
    };
    const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = createHmac("sha256", this.secret).update(body).digest("base64url");
    return `${body}.${signature}`;
  }

  decode(token, expectedPeriodId) {
    if (typeof token !== "string" || token.length > 2048) throw new DomainError("CURSOR_INVALID", "Invalid cursor");
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra !== undefined) throw new DomainError("CURSOR_INVALID", "Invalid cursor");
    const expected = createHmac("sha256", this.secret).update(body).digest("base64url");
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new DomainError("CURSOR_INVALID", "Invalid cursor signature");
    }
    let payload;
    try {
      payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    } catch {
      throw new DomainError("CURSOR_INVALID", "Invalid cursor payload");
    }
    if (payload.v !== 1 || payload.periodId !== expectedPeriodId
        || !Number.isSafeInteger(payload.score) || !Number.isSafeInteger(payload.maxLevel)
        || !Number.isSafeInteger(payload.durationMs) || !Number.isSafeInteger(payload.achievedAtMs)
        || typeof payload.playerId !== "string" || !Number.isSafeInteger(payload.issuedAtMs)
        || payload.issuedAtMs > this.clock() + 60000 || this.clock() - payload.issuedAtMs > this.maxAgeMs) {
      throw new DomainError("CURSOR_INVALID", "Expired or mismatched cursor");
    }
    return payload;
  }
}

module.exports = {
  compareRankEntries,
  isBetterEntry,
  publicRankEntry,
  CursorCodec
};
