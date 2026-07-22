export const CLOUD_API_VERSION = 1 as const;

export type ApiError = {
  code: string;
  retryable: boolean;
  messageKey: string;
};

export type ApiResponse<T> =
  | { ok: true; requestId: string; serverTimeMs: number; data: T }
  | { ok: false; requestId: string; serverTimeMs: number; error: ApiError };

export type SpawnWeight = { level: number; weight: number };

export interface AuthoritativeRunConfig {
  scoreByCreatedLevel: Record<number, number>;
  doubleLevel11Score: number;
  spawnWeights: SpawnWeight[];
  minDropIntervalMs: number;
  warningHoldMs: number;
  maxActiveDurationMs: number;
}

export interface RunStartRequest {
  apiVersion: typeof CLOUD_API_VERSION;
  requestId: string;
  clientVersion: string;
  configVersion: string;
}

export interface RunStartData {
  runId: string;
  nonce: string;
  seed: number;
  prngAlgorithm: "xorshift32-v1";
  startedAtMs: number;
  playDeadlineAtMs: number;
  submitDeadlineAtMs: number;
  configVersion: string;
  periodIds: { week: string; season: string; all: "all" };
  runConfig: AuthoritativeRunConfig;
}

// Compact event tuples are stable JSON and cheap to send through wx.cloud.callFunction.
export type RunEvent =
  | [kind: 0, wallTimeMs: number, normalizedX: number]
  | [kind: 1, wallTimeMs: number, fromLevel: number]
  | [kind: 2 | 3, wallTimeMs: number]
  | [kind: 4, wallTimeMs: number, active: 0 | 1];

export interface ClientRunClaim {
  score: number;
  maxLevel: number;
  dropCount: number;
  mergeCounts: number[];
  yizaiCount: number;
}

export interface RunFinishRequest {
  apiVersion: typeof CLOUD_API_VERSION;
  requestId: string;
  runId: string;
  nonce: string;
  configVersion: string;
  eventStream: {
    encoding: "compact-v1";
    events: RunEvent[];
    sha256: string;
  };
  finish: {
    reason: "warning_line";
    wallDurationMs: number;
    activeDurationMs: number;
    warningHoldMs: number;
  };
  clientClaim: ClientRunClaim;
  finalState?: Array<{ level: number; xQ: number; yQ: number; speedQ: number }>;
}

export interface PeriodRankUpdate {
  periodType: "week" | "season" | "all";
  periodId: string;
  improved: boolean;
  previousRank: number | null;
  currentRank: number | null;
}

export interface RunFinishData {
  runId: string;
  idempotentReplay: boolean;
  verdict: "valid" | "review" | "rejected";
  serverScore: number;
  maxLevel: number;
  riskFlags: string[];
  rankUpdates: PeriodRankUpdate[];
}

export function createCloudRequestId(prefix = "req"): string {
  const random = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}
