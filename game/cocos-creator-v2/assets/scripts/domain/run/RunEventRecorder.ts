import type { RunEvent } from "./RunContracts";
import { sha256Hex } from "./Sha256";

export class RunEventRecorder {
  private readonly events: RunEvent[] = [];
  private readonly startedAt: number;
  private lastTimeMs = 0;
  private pausedAt: number | null = null;
  private pausedTotalMs = 0;

  constructor(private readonly now: () => number = () => Date.now()) {
    this.startedAt = now();
  }

  recordDrop(normalizedX: number): void {
    const xQ = Math.round(Math.max(-1, Math.min(1, normalizedX)) * 10000);
    this.events.push([0, this.elapsed(), xQ]);
  }

  recordMerge(fromLevel: number): void {
    this.events.push([1, this.elapsed(), fromLevel]);
  }

  recordPause(): void {
    if (this.pausedAt !== null) return;
    const timeMs = this.elapsed();
    this.pausedAt = timeMs;
    this.events.push([2, timeMs]);
  }

  recordResume(): void {
    if (this.pausedAt === null) return;
    const timeMs = this.elapsed();
    this.pausedTotalMs += timeMs - this.pausedAt;
    this.pausedAt = null;
    this.events.push([3, timeMs]);
  }

  recordWarning(active: boolean): void {
    this.events.push([4, this.elapsed(), active ? 1 : 0]);
  }

  snapshot(): RunEvent[] {
    return this.events.map((event) => [...event] as RunEvent);
  }

  wallDurationMs(): number {
    return this.elapsed();
  }

  activeDurationMs(): number {
    const wall = this.elapsed();
    const openPause = this.pausedAt === null ? 0 : wall - this.pausedAt;
    return Math.max(0, wall - this.pausedTotalMs - openPause);
  }

  digest(nonce: string): string {
    return sha256Hex(JSON.stringify([nonce, this.events]));
  }

  private elapsed(): number {
    this.lastTimeMs = Math.max(this.lastTimeMs, Math.floor(this.now() - this.startedAt));
    return this.lastTimeMs;
  }
}
