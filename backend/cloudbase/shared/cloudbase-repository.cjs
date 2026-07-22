"use strict";

const { compareRankEntries } = require("./ranking.cjs");

function unwrapDocument(result) {
  if (!result) return null;
  if (Array.isArray(result.data)) return result.data[0] || null;
  return result.data || null;
}

class CloudTransactionAdapter {
  constructor(transaction) {
    this.transaction = transaction;
  }

  async get(collection, id) {
    try {
      return unwrapDocument(await this.transaction.collection(collection).doc(id).get());
    } catch (error) {
      if (error && (error.errCode === -1 || /not.?found/i.test(String(error.errMsg || error.message)))) return null;
      throw error;
    }
  }

  async set(collection, id, value) {
    await this.transaction.collection(collection).doc(id).set({ data: value });
  }

  async delete(collection, id) {
    await this.transaction.collection(collection).doc(id).remove();
  }
}

class CloudBaseRepository {
  constructor(database) {
    this.db = database;
    this.command = database.command;
  }

  async get(collection, id) {
    try {
      return unwrapDocument(await this.db.collection(collection).doc(id).get());
    } catch (error) {
      if (error && (error.errCode === -1 || /not.?found/i.test(String(error.errMsg || error.message)))) return null;
      throw error;
    }
  }

  async runTransaction(work) {
    return this.db.runTransaction(async (transaction) => work(new CloudTransactionAdapter(transaction)));
  }

  async getLeaderboardEntry(periodId, playerId) {
    return this.get("leaderboard_entries", `${periodId}:${playerId}`);
  }

  ordered(query, reverse = false) {
    const directions = reverse
      ? ["asc", "asc", "desc", "desc", "desc"]
      : ["desc", "desc", "asc", "asc", "asc"];
    return query
      .orderBy("score", directions[0])
      .orderBy("maxLevel", directions[1])
      .orderBy("durationMs", directions[2])
      .orderBy("achievedAtMs", directions[3])
      .orderBy("playerId", directions[4]);
  }

  async queryFirst(periodId, limit) {
    const query = this.db.collection("leaderboard_entries").where({ periodId, status: "visible" });
    const result = await this.ordered(query).limit(limit).get();
    return result.data || [];
  }

  branchFilters(anchor, relation) {
    const _ = this.command;
    const after = relation === "after";
    const scoreRange = after ? _.lt(anchor.score) : _.gt(anchor.score);
    const levelRange = after ? _.lt(anchor.maxLevel) : _.gt(anchor.maxLevel);
    const durationRange = after ? _.gt(anchor.durationMs) : _.lt(anchor.durationMs);
    const achievedRange = after ? _.gt(anchor.achievedAtMs) : _.lt(anchor.achievedAtMs);
    const playerRange = after ? _.gt(anchor.playerId) : _.lt(anchor.playerId);
    return [
      { score: scoreRange },
      { score: anchor.score, maxLevel: levelRange },
      { score: anchor.score, maxLevel: anchor.maxLevel, durationMs: durationRange },
      {
        score: anchor.score,
        maxLevel: anchor.maxLevel,
        durationMs: anchor.durationMs,
        achievedAtMs: achievedRange
      },
      {
        score: anchor.score,
        maxLevel: anchor.maxLevel,
        durationMs: anchor.durationMs,
        achievedAtMs: anchor.achievedAtMs,
        playerId: playerRange
      }
    ];
  }

  async queryBranches(periodId, anchor, relation, limit) {
    const reverse = relation === "before";
    const requests = this.branchFilters(anchor, relation).map(async (branch) => {
      const query = this.db.collection("leaderboard_entries").where({
        periodId,
        status: "visible",
        ...branch
      });
      const result = await this.ordered(query, reverse).limit(limit).get();
      return result.data || [];
    });
    const rows = (await Promise.all(requests)).flat();
    const unique = [...new Map(rows.map((entry) => [entry._id, entry])).values()].sort(compareRankEntries);
    if (relation === "before") return unique.slice(Math.max(0, unique.length - limit));
    return unique.slice(0, limit);
  }

  async queryAfter(periodId, anchor, limit) {
    return this.queryBranches(periodId, anchor, "after", limit);
  }

  async queryBeforeClosest(periodId, anchor, limit) {
    return this.queryBranches(periodId, anchor, "before", limit);
  }

  async countBefore(periodId, anchor) {
    const branches = this.branchFilters(anchor, "before");
    const counts = await Promise.all(branches.map(async (branch) => {
      const result = await this.db.collection("leaderboard_entries").where({
        periodId,
        status: "visible",
        ...branch
      }).count();
      return Number(result.total || 0);
    }));
    return counts.reduce((sum, value) => sum + value, 0);
  }
}

module.exports = { CloudBaseRepository, CloudTransactionAdapter, unwrapDocument };
