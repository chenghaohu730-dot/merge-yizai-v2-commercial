import type { CloudRankGateway } from "./CloudRankGateway";
import {
  CLOUD_API_VERSION,
  createCloudRequestId
} from "../domain/run/RunContracts";
import type {
  RankAroundData,
  RankEntryDto,
  RankStatus,
  RankTopData
} from "../domain/leaderboard/RankContracts";

export interface WorldRankState {
  periodId: string;
  items: RankEntryDto[];
  me: RankEntryDto | null;
  meStatus: RankStatus;
  nextCursor: string | null;
  view: "top" | "around" | "page";
}

export class WorldRankController {
  private state: WorldRankState | null = null;
  private pageState: WorldRankState | null = null;

  constructor(private readonly gateway: CloudRankGateway) {}

  isAvailable(): boolean {
    return this.gateway.isAvailable();
  }

  current(): WorldRankState | null {
    return this.state ? {
      ...this.state,
      items: [...this.state.items],
      me: this.state.me ? { ...this.state.me } : null
    } : null;
  }

  async loadTop(periodId: string, limit = 100): Promise<WorldRankState> {
    const response: RankTopData = await this.gateway.rankTop({
      apiVersion: CLOUD_API_VERSION,
      requestId: createCloudRequestId("rank-top"),
      periodId,
      limit
    });
    this.state = {
      periodId,
      items: [...response.items],
      me: response.me,
      meStatus: response.meStatus,
      nextCursor: response.nextCursor,
      view: "top"
    };
    this.pageState = this.state;
    return this.current()!;
  }

  async loadAroundMe(periodId: string, radius = 5): Promise<WorldRankState> {
    const response: RankAroundData = await this.gateway.rankAroundMe({
      apiVersion: CLOUD_API_VERSION,
      requestId: createCloudRequestId("rank-around"),
      periodId,
      radius
    });
    this.state = {
      periodId,
      items: [...response.items],
      me: response.me,
      meStatus: response.meStatus,
      nextCursor: this.pageState?.periodId === periodId ? this.pageState.nextCursor : null,
      view: "around"
    };
    return this.current()!;
  }

  async loadMore(periodId: string, limit = 50): Promise<WorldRankState> {
    if (!this.pageState || this.pageState.periodId !== periodId) {
      return this.loadTop(periodId, Math.min(100, limit));
    }
    if (!this.pageState.nextCursor) {
      this.state = this.pageState;
      return this.current()!;
    }
    const response = await this.gateway.rankPage({
      apiVersion: CLOUD_API_VERSION,
      requestId: createCloudRequestId("rank-page"),
      periodId,
      cursor: this.pageState.nextCursor,
      limit
    });
    const byRank = new Map<number, RankEntryDto>();
    for (const entry of [...this.pageState.items, ...response.items]) byRank.set(entry.rank, entry);
    this.state = {
      ...this.pageState,
      items: [...byRank.values()].sort((left, right) => left.rank - right.rank),
      nextCursor: response.nextCursor,
      view: "page"
    };
    this.pageState = this.state;
    return this.current()!;
  }
}
