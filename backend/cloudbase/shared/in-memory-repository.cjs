"use strict";

const { compareRankEntries } = require("./ranking.cjs");

const COLLECTIONS = Object.freeze([
  "players",
  "run_sessions",
  "run_results",
  "leaderboard_entries"
]);

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

class MemoryTransaction {
  constructor(maps) {
    this.maps = maps;
  }

  async get(collection, id) {
    return clone(this.maps[collection].get(id) || null);
  }

  async set(collection, id, value) {
    this.maps[collection].set(id, clone(value));
  }

  async delete(collection, id) {
    this.maps[collection].delete(id);
  }
}

class InMemoryRepository {
  constructor() {
    this.maps = Object.fromEntries(COLLECTIONS.map((name) => [name, new Map()]));
    this.lockTail = Promise.resolve();
  }

  async get(collection, id) {
    return clone(this.maps[collection].get(id) || null);
  }

  async set(collection, id, value) {
    await this.runTransaction((tx) => tx.set(collection, id, value));
  }

  async runTransaction(work) {
    let release;
    const turn = new Promise((resolve) => { release = resolve; });
    const previous = this.lockTail;
    this.lockTail = this.lockTail.then(() => turn);
    await previous;

    const staged = Object.fromEntries(COLLECTIONS.map((name) => [
      name,
      new Map([...this.maps[name].entries()].map(([key, value]) => [key, clone(value)]))
    ]));
    try {
      const result = await work(new MemoryTransaction(staged));
      this.maps = staged;
      return result;
    } finally {
      release();
    }
  }

  async seedLeaderboard(entries) {
    await this.runTransaction(async (tx) => {
      for (const entry of entries) {
        await tx.set("leaderboard_entries", `${entry.periodId}:${entry.playerId}`, entry);
      }
    });
  }

  visibleEntries(periodId) {
    return [...this.maps.leaderboard_entries.values()]
      .filter((entry) => entry.periodId === periodId && entry.status === "visible")
      .map(clone)
      .sort(compareRankEntries);
  }

  async getLeaderboardEntry(periodId, playerId) {
    return this.get("leaderboard_entries", `${periodId}:${playerId}`);
  }

  async queryFirst(periodId, limit) {
    return this.visibleEntries(periodId).slice(0, limit);
  }

  async queryAfter(periodId, anchor, limit) {
    return this.visibleEntries(periodId)
      .filter((entry) => compareRankEntries(entry, anchor) > 0)
      .slice(0, limit);
  }

  async queryBeforeClosest(periodId, anchor, limit) {
    const better = this.visibleEntries(periodId)
      .filter((entry) => compareRankEntries(entry, anchor) < 0);
    return better.slice(Math.max(0, better.length - limit));
  }

  async countBefore(periodId, anchor) {
    return this.visibleEntries(periodId)
      .filter((entry) => compareRankEntries(entry, anchor) < 0)
      .length;
  }
}

module.exports = { COLLECTIONS, InMemoryRepository };
