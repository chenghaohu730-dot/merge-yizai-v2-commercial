import { _decorator, Component, Label, Node } from "cc";
import { GameEvents, gameEvents } from "../core/EventBus";
import type { PlayerProfile } from "../core/GameState";
import { LocalRankService } from "../services/LocalRankService";
import type { WorldRankController, WorldRankState } from "../application/WorldRankController";

const { ccclass, property } = _decorator;

@ccclass("RankView")
export class RankView extends Component {
  @property(Label)
  listLabel: Label | null = null;

  @property(Label)
  modeLabel: Label | null = null;

  @property(Label)
  myRankLabel: Label | null = null;

  @property(Label)
  statusLabel: Label | null = null;

  @property(Node)
  backButton: Node | null = null;

  @property(Node)
  aroundMeButton: Node | null = null;

  @property(Node)
  loadMoreButton: Node | null = null;

  @property(Node)
  retryButton: Node | null = null;

  private controller: WorldRankController | null = null;
  private periodId = "all";
  private profile: PlayerProfile | null = null;
  private loading = false;

  onEnable(): void {
    this.backButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(GameEvents.BackHome), this);
    this.aroundMeButton?.on(Node.EventType.TOUCH_END, this.onAroundMePressed, this);
    this.loadMoreButton?.on(Node.EventType.TOUCH_END, this.onLoadMorePressed, this);
    this.retryButton?.on(Node.EventType.TOUCH_END, this.onRetryPressed, this);
  }

  onDisable(): void {
    this.backButton?.off(Node.EventType.TOUCH_END);
    this.aroundMeButton?.off(Node.EventType.TOUCH_END, this.onAroundMePressed, this);
    this.loadMoreButton?.off(Node.EventType.TOUCH_END, this.onLoadMorePressed, this);
    this.retryButton?.off(Node.EventType.TOUCH_END, this.onRetryPressed, this);
  }

  configure(controller: WorldRankController, periodId = "all"): void {
    this.controller = controller;
    this.periodId = periodId;
  }

  refresh(profile: PlayerProfile): void {
    this.profile = profile;
    this.renderLocal(profile, this.controller ? "正在加载全服榜…" : "本地榜");
    if (this.controller) void this.loadTop();
  }

  async loadTop(): Promise<void> {
    if (!this.controller || this.loading) return;
    await this.execute(async () => this.controller!.loadTop(this.periodId, 100));
  }

  async loadAroundMe(): Promise<void> {
    if (!this.controller || this.loading) return;
    await this.execute(async () => this.controller!.loadAroundMe(this.periodId, 5));
  }

  async loadMore(): Promise<void> {
    if (!this.controller || this.loading) return;
    await this.execute(async () => this.controller!.loadMore(this.periodId, 50));
  }

  private async execute(operation: () => Promise<WorldRankState>): Promise<void> {
    this.loading = true;
    if (this.statusLabel) this.statusLabel.string = "加载中…";
    try {
      this.renderWorld(await operation());
    } catch {
      if (this.profile) this.renderLocal(this.profile, "全服榜暂不可用，点击重试");
      if (this.statusLabel) this.statusLabel.string = "offline / timeout / server error";
    } finally {
      this.loading = false;
    }
  }

  private renderWorld(state: WorldRankState): void {
    if (this.modeLabel) {
      this.modeLabel.string = state.view === "around" ? "全服榜 · 我附近" : "全服榜 · 全量";
    }
    if (this.listLabel) {
      this.listLabel.string = state.items.length
        ? state.items.map((entry) => `${entry.rank}. ${entry.displayName}  ${entry.score}分`).join("\n")
        : "暂无有效上榜玩家";
    }
    if (this.myRankLabel) {
      this.myRankLabel.string = state.me
        ? `我的名次 ${state.me.rank} · ${state.me.score}分`
        : state.meStatus === "under_review" ? "我的成绩审核中" : "完成首局有效对局后自动上榜";
    }
    if (this.statusLabel) {
      this.statusLabel.string = state.nextCursor ? "可继续加载全量榜" : "已加载到当前榜尾";
    }
  }

  private renderLocal(profile: PlayerProfile, mode: string): void {
    if (this.modeLabel) this.modeLabel.string = mode;
    const ranks = LocalRankService.list(profile);
    if (!this.listLabel) return;
    this.listLabel.string = ranks.length
      ? ranks.map((rank, index) => `${index + 1}. ${rank.score}分 最高${rank.maxLevel}级`).join("\n")
      : "暂无成绩";
    if (this.myRankLabel) this.myRankLabel.string = "本地成绩不代表全服名次";
  }

  private onAroundMePressed(): void {
    void this.loadAroundMe();
  }

  private onLoadMorePressed(): void {
    void this.loadMore();
  }

  private onRetryPressed(): void {
    void this.loadTop();
  }
}
