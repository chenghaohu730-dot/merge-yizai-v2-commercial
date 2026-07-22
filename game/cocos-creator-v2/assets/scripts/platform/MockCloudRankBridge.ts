import type { CloudRankGateway } from "../application/CloudRankGateway";
import type {
  RankAroundData,
  RankAroundRequest,
  RankEntryDto,
  RankPageData,
  RankPageRequest,
  RankTopData,
  RankTopRequest
} from "../domain/leaderboard/RankContracts";
import {
  type AuthoritativeRunConfig,
  type RunFinishData,
  type RunFinishRequest,
  type RunStartData,
  type RunStartRequest
} from "../domain/run/RunContracts";
import { claimMatches, replayRunLocally } from "../domain/run/RunVerification";
import { sha256Hex } from "../domain/run/Sha256";

interface MockRankEntry {
  periodId: string;
  playerId: string;
  publicCode: string;
  displayName: string;
  avatarId: string;
  equippedSkinId: string;
  score: number;
  maxLevel: number;
  durationMs: number;
  achievedAtMs: number;
}

interface MockSession extends RunStartData {}

const MOCK_PLAYER_ID = "mock-player";
const MOCK_CONFIG: AuthoritativeRunConfig = {
  scoreByCreatedLevel: { 2: 2, 3: 5, 4: 10, 5: 20, 6: 40, 7: 80, 8: 160, 9: 320, 10: 640, 11: 1280 },
  doubleLevel11Score: 3000,
  spawnWeights: [
    { level: 1, weight: 45 },
    { level: 2, weight: 30 },
    { level: 3, weight: 18 },
    { level: 4, weight: 7 }
  ],
  minDropIntervalMs: 350,
  warningHoldMs: 3000,
  maxActiveDurationMs: 30 * 60 * 1000
};

function compare(left: MockRankEntry, right: MockRankEntry): number {
  return right.score - left.score
    || right.maxLevel - left.maxLevel
    || left.durationMs - right.durationMs
    || left.achievedAtMs - right.achievedAtMs
    || left.playerId.localeCompare(right.playerId);
}

export class MockCloudRankBridge implements CloudRankGateway {
  private readonly sessions = new Map<string, MockSession>();
  private readonly receipts = new Map<string, RunFinishData>();
  private readonly boards = new Map<string, MockRankEntry[]>();
  private sequence = 1;

  constructor(private readonly configVersion = "v2-dev-1", fixtureSize = 205) {
    for (const periodId of ["week:mock", "season:mock", "all"]) {
      this.boards.set(periodId, this.createFixture(periodId, fixtureSize));
    }
  }

  isAvailable(): boolean {
    return true;
  }

  async runStart(request: RunStartRequest): Promise<RunStartData> {
    if (request.configVersion !== this.configVersion) throw new Error("CONFIG_MISMATCH");
    const existing = [...this.sessions.values()].find((session) => session.runId.endsWith(request.requestId));
    if (existing) return existing;
    const now = Date.now();
    const session: MockSession = {
      runId: `mock-run-${this.sequence++}-${request.requestId}`,
      nonce: `mock-nonce-${request.requestId}`,
      seed: (0x9e3779b9 + this.sequence) >>> 0,
      prngAlgorithm: "xorshift32-v1",
      startedAtMs: now,
      playDeadlineAtMs: now + 2 * 60 * 60 * 1000,
      submitDeadlineAtMs: now + 24 * 60 * 60 * 1000,
      configVersion: this.configVersion,
      periodIds: { week: "week:mock", season: "season:mock", all: "all" },
      runConfig: MOCK_CONFIG
    };
    this.sessions.set(session.runId, session);
    return session;
  }

  async runFinish(request: RunFinishRequest): Promise<RunFinishData> {
    const cached = this.receipts.get(request.runId);
    if (cached) return { ...cached, idempotentReplay: true };
    const session = this.sessions.get(request.runId);
    if (!session || session.nonce !== request.nonce) throw new Error("RUN_NOT_FOUND");
    const digest = sha256Hex(JSON.stringify([request.nonce, request.eventStream.events]));
    const verified = replayRunLocally(session.seed, request.eventStream.events, session.runConfig);
    const digestMatches = digest === request.eventStream.sha256;
    const claimIsCorrect = claimMatches(request.clientClaim, verified);
    const verdict = !digestMatches || !verified.valid ? "rejected" : claimIsCorrect ? "valid" : "review";
    const riskFlags = [
      ...(!digestMatches ? ["EVENT_DIGEST_MISMATCH"] : []),
      ...(!verified.valid ? ["IMPOSSIBLE_MERGE"] : []),
      ...(!claimIsCorrect && verified.valid ? ["CLIENT_STATS_MISMATCH"] : [])
    ];
    const rankUpdates: RunFinishData["rankUpdates"] = [];

    if (verdict === "valid") {
      for (const [periodType, periodId] of Object.entries(session.periodIds) as Array<["week" | "season" | "all", string]>) {
        const board = this.boards.get(periodId) || [];
        const previousIndex = board.findIndex((entry) => entry.playerId === MOCK_PLAYER_ID);
        const candidate: MockRankEntry = {
          periodId,
          playerId: MOCK_PLAYER_ID,
          publicCode: "0137",
          displayName: "亿仔玩家0137",
          avatarId: "avatar_default_yizai",
          equippedSkinId: "default",
          score: verified.serverScore,
          maxLevel: verified.maxLevel,
          durationMs: request.finish.activeDurationMs,
          achievedAtMs: Date.now()
        };
        const current = previousIndex >= 0 ? board[previousIndex] : null;
        const improved = !current || compare(candidate, current) < 0;
        if (improved) {
          if (previousIndex >= 0) board.splice(previousIndex, 1);
          board.push(candidate);
          board.sort(compare);
        }
        const currentIndex = board.findIndex((entry) => entry.playerId === MOCK_PLAYER_ID);
        rankUpdates.push({
          periodType,
          periodId,
          improved,
          previousRank: previousIndex >= 0 ? previousIndex + 1 : null,
          currentRank: currentIndex >= 0 ? currentIndex + 1 : null
        });
      }
    }

    const receipt: RunFinishData = {
      runId: request.runId,
      idempotentReplay: false,
      verdict,
      serverScore: verified.serverScore,
      maxLevel: verified.maxLevel,
      riskFlags,
      rankUpdates
    };
    this.receipts.set(request.runId, receipt);
    return receipt;
  }

  async rankTop(request: RankTopRequest): Promise<RankTopData> {
    const board = this.board(request.periodId);
    const limit = Math.max(1, Math.min(100, request.limit || 100));
    const meIndex = board.findIndex((entry) => entry.playerId === MOCK_PLAYER_ID);
    return {
      items: board.slice(0, limit).map((entry, index) => this.toDto(entry, index + 1)),
      me: meIndex >= 0 ? this.toDto(board[meIndex], meIndex + 1) : null,
      meStatus: meIndex >= 0 ? "ranked" : "not_ranked",
      nextCursor: board.length > limit ? this.cursor(request.periodId, limit) : null
    };
  }

  async rankAroundMe(request: RankAroundRequest): Promise<RankAroundData> {
    const board = this.board(request.periodId);
    const radius = Math.max(1, Math.min(10, request.radius || 5));
    const meIndex = board.findIndex((entry) => entry.playerId === MOCK_PLAYER_ID);
    if (meIndex < 0) return { items: [], me: null, meStatus: "not_ranked" };
    const start = Math.max(0, meIndex - radius);
    const end = Math.min(board.length, meIndex + radius + 1);
    return {
      items: board.slice(start, end).map((entry, index) => this.toDto(entry, start + index + 1)),
      me: this.toDto(board[meIndex], meIndex + 1),
      meStatus: "ranked"
    };
  }

  async rankPage(request: RankPageRequest): Promise<RankPageData> {
    const board = this.board(request.periodId);
    const limit = Math.max(1, Math.min(100, request.limit || 50));
    const offset = request.cursor ? this.parseCursor(request.periodId, request.cursor) : 0;
    const page = board.slice(offset, offset + limit);
    return {
      items: page.map((entry, index) => this.toDto(entry, offset + index + 1)),
      nextCursor: offset + page.length < board.length ? this.cursor(request.periodId, offset + page.length) : null
    };
  }

  private board(periodId: string): MockRankEntry[] {
    const board = this.boards.get(periodId);
    if (!board) throw new Error("PERIOD_NOT_FOUND");
    return board;
  }

  private createFixture(periodId: string, size: number): MockRankEntry[] {
    return Array.from({ length: size }, (_, index) => {
      const rank = index + 1;
      const isMe = rank === 137;
      return {
        periodId,
        playerId: isMe ? MOCK_PLAYER_ID : `mock-player-${String(rank).padStart(4, "0")}`,
        publicCode: String(rank).padStart(4, "0"),
        displayName: `亿仔玩家${String(rank).padStart(4, "0")}`,
        avatarId: "avatar_default_yizai",
        equippedSkinId: "default",
        score: 100000 - rank * 10,
        maxLevel: 11 - Math.floor(index / 30),
        durationMs: 60000 + rank,
        achievedAtMs: 1700000000000 + rank
      };
    }).sort(compare);
  }

  private toDto(entry: MockRankEntry, rank: number): RankEntryDto {
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
      isMe: entry.playerId === MOCK_PLAYER_ID
    };
  }

  private cursor(periodId: string, offset: number): string {
    return `mock:${encodeURIComponent(periodId)}:${offset}`;
  }

  private parseCursor(periodId: string, cursor: string): number {
    const expected = `mock:${encodeURIComponent(periodId)}:`;
    if (!cursor.startsWith(expected)) throw new Error("CURSOR_INVALID");
    const offset = Number(cursor.slice(expected.length));
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("CURSOR_INVALID");
    return offset;
  }
}
