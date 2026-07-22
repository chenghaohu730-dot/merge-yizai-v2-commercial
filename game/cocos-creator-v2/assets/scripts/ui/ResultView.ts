import { _decorator, Component, Label, Node } from "cc";
import { getFaceDefinition } from "../config/FaceConfig";
import { GameEvents, gameEvents } from "../core/EventBus";
import type { RunSummary } from "../core/GameState";

const { ccclass, property } = _decorator;

@ccclass("ResultView")
export class ResultView extends Component {
  @property(Label)
  scoreLabel: Label | null = null;

  @property(Label)
  bestScoreLabel: Label | null = null;

  @property(Label)
  maxFaceLabel: Label | null = null;

  @property(Label)
  rewardLabel: Label | null = null;

  @property(Node)
  replayButton: Node | null = null;

  @property(Node)
  shareButton: Node | null = null;

  @property(Node)
  homeButton: Node | null = null;

  onEnable(): void {
    this.replayButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(GameEvents.RestartRun), this);
    this.shareButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(GameEvents.ShareScore), this);
    this.homeButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(GameEvents.BackHome), this);
  }

  onDisable(): void {
    this.replayButton?.off(Node.EventType.TOUCH_END);
    this.shareButton?.off(Node.EventType.TOUCH_END);
    this.homeButton?.off(Node.EventType.TOUCH_END);
  }

  show(summary: RunSummary): void {
    if (this.scoreLabel) this.scoreLabel.string = String(summary.score);
    if (this.bestScoreLabel) this.bestScoreLabel.string = String(summary.bestScore);
    if (this.maxFaceLabel) this.maxFaceLabel.string = getFaceDefinition(summary.maxLevel).name;
    if (this.rewardLabel) this.rewardLabel.string = `+${summary.earnedCoins} 亿仔币`;
  }
}
