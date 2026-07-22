import { _decorator, Component, Label, Node, Sprite } from "cc";
import { GameEvents, gameEvents } from "../core/EventBus";
import { FaceSpriteRegistry } from "../game/FaceSpriteRegistry";

const { ccclass, property } = _decorator;

export interface GameHudState {
  score: number;
  bestScore: number;
  yizaiCoins: number;
  currentLevel: number;
  nextLevel: number;
  maxLevel: number;
}

@ccclass("GameHud")
export class GameHud extends Component {
  @property(Label)
  scoreLabel: Label | null = null;

  @property(Label)
  bestScoreLabel: Label | null = null;

  @property(Label)
  coinLabel: Label | null = null;

  @property(Label)
  maxLevelLabel: Label | null = null;

  @property(Sprite)
  currentPreview: Sprite | null = null;

  @property(Sprite)
  nextPreview: Sprite | null = null;

  @property(Node)
  pauseButton: Node | null = null;

  @property(Node)
  restartButton: Node | null = null;

  onEnable(): void {
    this.pauseButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(GameEvents.PauseRun), this);
    this.restartButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(GameEvents.RestartRun), this);
  }

  onDisable(): void {
    this.pauseButton?.off(Node.EventType.TOUCH_END);
    this.restartButton?.off(Node.EventType.TOUCH_END);
  }

  refresh(state: GameHudState): void {
    if (this.scoreLabel) this.scoreLabel.string = String(state.score);
    if (this.bestScoreLabel) this.bestScoreLabel.string = String(state.bestScore);
    if (this.coinLabel) this.coinLabel.string = String(state.yizaiCoins);
    if (this.maxLevelLabel) this.maxLevelLabel.string = `${state.maxLevel}级`;
    if (this.currentPreview) this.currentPreview.spriteFrame = FaceSpriteRegistry.get(state.currentLevel);
    if (this.nextPreview) this.nextPreview.spriteFrame = FaceSpriteRegistry.get(state.nextLevel);
  }
}
