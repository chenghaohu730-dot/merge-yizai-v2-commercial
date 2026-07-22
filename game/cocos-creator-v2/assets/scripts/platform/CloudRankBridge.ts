import type { CloudRankGateway } from "../application/CloudRankGateway";
import type {
  ApiResponse,
  RunFinishData,
  RunFinishRequest,
  RunStartData,
  RunStartRequest
} from "../domain/run/RunContracts";
import type {
  RankAroundData,
  RankAroundRequest,
  RankPageData,
  RankPageRequest,
  RankTopData,
  RankTopRequest
} from "../domain/leaderboard/RankContracts";

type CloudCallResult = { result?: unknown };
type WechatCloud = {
  init?: (options: { env?: string; traceUser?: boolean }) => void;
  callFunction: (options: { name: string; data: unknown }) => Promise<CloudCallResult>;
};
type WechatLike = { cloud?: WechatCloud };

export class CloudApiError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    readonly messageKey: string
  ) {
    super(code);
    this.name = "CloudApiError";
  }
}

export interface CloudRankBridgeOptions {
  envId?: string;
  traceUser?: boolean;
}

export class CloudRankBridge implements CloudRankGateway {
  private initialized = false;

  constructor(private readonly options: CloudRankBridgeOptions = {}) {}

  isAvailable(): boolean {
    return Boolean(this.getWxCloud()?.callFunction);
  }

  runStart(request: RunStartRequest): Promise<RunStartData> {
    return this.call<RunStartData>("runStart", request);
  }

  runFinish(request: RunFinishRequest): Promise<RunFinishData> {
    return this.call<RunFinishData>("runFinish", request);
  }

  rankTop(request: RankTopRequest): Promise<RankTopData> {
    return this.call<RankTopData>("rankTop", request);
  }

  rankAroundMe(request: RankAroundRequest): Promise<RankAroundData> {
    return this.call<RankAroundData>("rankAroundMe", request);
  }

  rankPage(request: RankPageRequest): Promise<RankPageData> {
    return this.call<RankPageData>("rankPage", request);
  }

  private async call<T>(name: string, data: unknown): Promise<T> {
    const cloud = this.getWxCloud();
    if (!cloud) throw new CloudApiError("CLOUD_UNAVAILABLE", true, "cloud_unavailable");
    if (!this.initialized) {
      cloud.init?.({ env: this.options.envId, traceUser: this.options.traceUser ?? true });
      this.initialized = true;
    }
    const response = await cloud.callFunction({ name, data });
    const envelope = response.result as ApiResponse<T> | undefined;
    if (!envelope || typeof envelope !== "object" || typeof envelope.ok !== "boolean") {
      throw new CloudApiError("INVALID_CLOUD_RESPONSE", true, "invalid_cloud_response");
    }
    if (!envelope.ok) {
      throw new CloudApiError(envelope.error.code, envelope.error.retryable, envelope.error.messageKey);
    }
    return envelope.data;
  }

  private getWxCloud(): WechatCloud | null {
    const wx = (globalThis as { wx?: WechatLike }).wx;
    return wx?.cloud || null;
  }
}
