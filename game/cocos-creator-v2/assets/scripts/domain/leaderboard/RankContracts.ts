import type { ApiResponse } from "../run/RunContracts";

export type RankPeriodType = "week" | "season" | "all";
export type RankStatus = "ranked" | "not_ranked" | "under_review";

export interface RankEntryDto {
  rank: number;
  publicCode: string;
  displayName: string;
  avatarId: string;
  equippedSkinId: string;
  score: number;
  maxLevel: number;
  durationMs: number;
  achievedAtMs: number;
  isMe: boolean;
}

export interface RankTopData {
  items: RankEntryDto[];
  me: RankEntryDto | null;
  meStatus: RankStatus;
  nextCursor: string | null;
}

export interface RankAroundData {
  items: RankEntryDto[];
  me: RankEntryDto | null;
  meStatus: RankStatus;
}

export interface RankPageData {
  items: RankEntryDto[];
  nextCursor: string | null;
}

export interface RankRequestBase {
  apiVersion: 1;
  requestId: string;
  periodId: string;
}

export type RankTopRequest = RankRequestBase & { limit?: number };
export type RankAroundRequest = RankRequestBase & { radius?: number };
export type RankPageRequest = RankRequestBase & { cursor?: string; limit?: number };

export type RankTopResponse = ApiResponse<RankTopData>;
