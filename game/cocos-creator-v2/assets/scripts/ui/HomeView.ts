import { _decorator, Component, Label, Node } from "cc";
import { GameEvents, gameEvents } from "../core/EventBus";
import type { PlayerProfile } from "../core/GameState";
import { TaskService } from "../services/TaskService";

const { ccclass, property } = _decorator;

@ccclass("HomeView")
export class HomeView extends Component {
  @property(Label)
  bestScoreLabel: Label | null = null;

  @property(Label)
  todayGoalLabel: Label | null = null;

  @property(Label)
  coinLabel: Label | null = null;

  @property(Node)
  startButton: Node | null = null;

  @property(Node)
  taskButton: Node | null = null;

  @property(Node)
  rankButton: Node | null = null;

  @property(Node)
  shopButton: Node | null = null;

  onEnable(): void {
    this.bind(this.startButton, GameEvents.StartRun);
    this.bind(this.taskButton, GameEvents.OpenTasks);
    this.bind(this.rankButton, GameEvents.OpenRank);
    this.bind(this.shopButton, GameEvents.OpenShop);
  }

  onDisable(): void {
    for (const button of [this.startButton, this.taskButton, this.rankButton, this.shopButton]) {
      button?.off(Node.EventType.TOUCH_END);
    }
  }

  refresh(profile: PlayerProfile): void {
    if (this.bestScoreLabel) this.bestScoreLabel.string = String(profile.bestScore);
    if (this.coinLabel) this.coinLabel.string = String(profile.yizaiCoins);

    const tasks = TaskService.getViewModels(profile);
    const pending = tasks.find((task) => !task.claimed);
    if (this.todayGoalLabel) {
      this.todayGoalLabel.string = pending ? `${pending.title} ${pending.progress}/${pending.target}` : "今日目标已完成";
    }
  }

  private bind(button: Node | null, eventName: string): void {
    button?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(eventName), this);
  }
}
