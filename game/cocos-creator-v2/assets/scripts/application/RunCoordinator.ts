import type { CloudRankGateway } from "./CloudRankGateway";
import { FinishRetryQueue } from "./FinishRetryQueue";
import {
  CLOUD_API_VERSION,
  createCloudRequestId,
  type RunFinishData,
  type RunFinishRequest,
  type RunStartData
} from "../domain/run/RunContracts";

export type StartedRun =
  | { mode: "online"; session: RunStartData }
  | { mode: "local"; reason: "cloud_unavailable" | "start_failed"; seed: number };

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("cloud_timeout")), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

export class RunCoordinator {
  constructor(
    private readonly gateway: CloudRankGateway,
    private readonly retryQueue: FinishRetryQueue,
    private readonly clientVersion: string,
    private readonly configVersion: string,
    private readonly timeoutMs = 1500
  ) {}

  async start(): Promise<StartedRun> {
    if (!this.gateway.isAvailable()) {
      return { mode: "local", reason: "cloud_unavailable", seed: this.localSeed() };
    }
    try {
      const session = await withTimeout(this.gateway.runStart({
        apiVersion: CLOUD_API_VERSION,
        requestId: createCloudRequestId("start"),
        clientVersion: this.clientVersion,
        configVersion: this.configVersion
      }), this.timeoutMs);
      return { mode: "online", session };
    } catch {
      return { mode: "local", reason: "start_failed", seed: this.localSeed() };
    }
  }

  async finish(request: Omit<RunFinishRequest, "apiVersion" | "requestId">): Promise<RunFinishData | null> {
    const fullRequest: RunFinishRequest = {
      ...request,
      apiVersion: CLOUD_API_VERSION,
      requestId: createCloudRequestId("finish")
    };
    this.retryQueue.enqueue(fullRequest);
    try {
      const receipt = await withTimeout(this.gateway.runFinish(fullRequest), this.timeoutMs);
      this.retryQueue.remove(fullRequest.runId);
      return receipt;
    } catch {
      this.retryQueue.markFailed(fullRequest.runId);
      return null;
    }
  }

  async flushPending(): Promise<number> {
    let completed = 0;
    for (const pending of this.retryQueue.due()) {
      try {
        await this.gateway.runFinish(pending.request);
        this.retryQueue.remove(pending.request.runId);
        completed += 1;
      } catch {
        this.retryQueue.markFailed(pending.request.runId);
      }
    }
    return completed;
  }

  private localSeed(): number {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    return seed || 0x6d2b79f5;
  }
}
