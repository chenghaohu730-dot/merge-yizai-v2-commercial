import type {
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

export interface CloudRankGateway {
  isAvailable(): boolean;
  runStart(request: RunStartRequest): Promise<RunStartData>;
  runFinish(request: RunFinishRequest): Promise<RunFinishData>;
  rankTop(request: RankTopRequest): Promise<RankTopData>;
  rankAroundMe(request: RankAroundRequest): Promise<RankAroundData>;
  rankPage(request: RankPageRequest): Promise<RankPageData>;
}
