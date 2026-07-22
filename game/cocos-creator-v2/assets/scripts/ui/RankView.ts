import { _decorator, Component, Label, Node } from "cc";
import { GameEvents, gameEvents } from "../core/EventBus";
import type { PlayerProfile } from "../core/GameState";
import { LocalRankService } from "../services/LocalRankService";

const { ccclass, property } = _decorator;

@ccclass("RankView")
export class RankView extends Component {
  @property(Label)
  listLabel: Label | null = null;

  @property(Label)
  modeLabel: Label | null = null;

  @property(Node)
  backButton: Node | null = null;

  onEnable(): void {
    this.backButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(GameEvents.BackHome), this);
  }

  onDisable(): void {
    this.backButton?.off(Node.EventType.TOUCH_END);
  }

  refresh(profile: PlayerProfile): void {
    if (this.modeLabel) this.modeLabel.string = "本地榜";
    const ranks = LocalRankService.list(profile);
    if (!this.listLabel) return;
    this.listLabel.string = ranks.length
      ? ranks.map((rank, index) => `${index + 1}. ${rank.score}分 最高${rank.maxLevel}级`).join("\n")
      : "暂无成绩";
  }
}
