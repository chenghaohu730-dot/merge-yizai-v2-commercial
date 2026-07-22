import type { RunFinishRequest } from "../domain/run/RunContracts";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PendingFinish {
  request: RunFinishRequest;
  attempts: number;
  nextAttemptAtMs: number;
  createdAtMs: number;
}

const DEFAULT_KEY = "mergeYizai.v2.pendingRunFinishes";

export class FinishRetryQueue {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key = DEFAULT_KEY,
    private readonly now: () => number = () => Date.now()
  ) {}

  list(): PendingFinish[] {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as PendingFinish[];
      return Array.isArray(parsed)
        ? parsed.filter((item) => item && item.request && typeof item.request.runId === "string")
        : [];
    } catch {
      return [];
    }
  }

  enqueue(request: RunFinishRequest): void {
    const pending = this.list();
    const existing = pending.find((item) => item.request.runId === request.runId);
    if (existing) existing.request = request;
    else pending.push({ request, attempts: 0, nextAttemptAtMs: this.now(), createdAtMs: this.now() });
    this.save(pending);
  }

  markFailed(runId: string): void {
    const pending = this.list();
    const item = pending.find((candidate) => candidate.request.runId === runId);
    if (!item) return;
    item.attempts += 1;
    const delay = Math.min(5 * 60 * 1000, 1000 * (2 ** Math.min(item.attempts, 8)));
    item.nextAttemptAtMs = this.now() + delay;
    this.save(pending);
  }

  remove(runId: string): void {
    this.save(this.list().filter((item) => item.request.runId !== runId));
  }

  due(): PendingFinish[] {
    const nowMs = this.now();
    return this.list().filter((item) => item.nextAttemptAtMs <= nowMs);
  }

  private save(items: PendingFinish[]): void {
    this.storage.setItem(this.key, JSON.stringify(items));
  }
}
