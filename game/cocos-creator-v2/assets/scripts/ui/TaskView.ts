import { _decorator, Component, Label, Node } from "cc";
import { GameEvents, gameEvents } from "../core/EventBus";
import type { PlayerProfile } from "../core/GameState";
import { TaskService } from "../services/TaskService";

const { ccclass, property } = _decorator;

@ccclass("TaskView")
export class TaskView extends Component {
  @property(Label)
  listLabel: Label | null = null;

  @property(Node)
  claimAllButton: Node | null = null;

  @property(Node)
  backButton: Node | null = null;

  private profile: PlayerProfile | null = null;

  onEnable(): void {
    this.claimAllButton?.on(Node.EventType.TOUCH_END, this.claimAll, this);
    this.backButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(GameEvents.BackHome), this);
  }

  onDisable(): void {
    this.claimAllButton?.off(Node.EventType.TOUCH_END);
    this.backButton?.off(Node.EventType.TOUCH_END);
  }

  refresh(profile: PlayerProfile): void {
    this.profile = profile;
    if (!this.listLabel) return;
    this.listLabel.string = TaskService.getViewModels(profile)
      .map((task) => `${task.claimed ? "已领" : task.complete ? "可领" : "进行中"} ${task.title} ${task.progress}/${task.target} +${task.rewardCoins}`)
      .join("\n");
  }

  private claimAll(): void {
    if (!this.profile) return;
    for (const task of TaskService.getViewModels(this.profile)) {
      if (task.complete && !task.claimed) TaskService.claim(this.profile, task.id);
    }
    gameEvents.emit(GameEvents.ProfileChanged);
  }
}
