import { _decorator, Component, Node, RigidBody2D } from "cc";
import { getFaceDefinition } from "../config/FaceConfig";
import { gameEvents, GameEvents } from "../core/EventBus";
import { FaceItem } from "./FaceItem";
import { GameArea } from "./GameArea";

const { ccclass, property } = _decorator;

@ccclass("WarningLine")
export class WarningLine extends Component {
  @property(GameArea)
  gameArea: GameArea | null = null;

  @property(Node)
  faceRoot: Node | null = null;

  @property
  failSeconds = 3;

  @property
  restSpeed = 90;

  private active = false;
  private timer = 0;

  begin(): void {
    this.active = true;
    this.timer = 0;
  }

  stop(): void {
    this.active = false;
    this.timer = 0;
    this.emit();
  }

  update(deltaTime: number): void {
    if (!this.active || !this.gameArea || !this.faceRoot) return;
    const over = this.faceRoot.children.some((node) => {
      const item = node.getComponent(FaceItem);
      if (!item) return false;
      const rigidBody = node.getComponent(RigidBody2D);
      const speed = rigidBody?.linearVelocity.length() || 0;
      const radius = getFaceDefinition(item.level).radius;
      return node.position.y + radius > this.gameArea!.warningY && speed < this.restSpeed;
    });

    this.timer = over ? Math.min(this.failSeconds, this.timer + deltaTime) : 0;
    this.emit();
    if (this.timer >= this.failSeconds) {
      this.active = false;
      gameEvents.emit(GameEvents.RunEnded);
    }
  }

  private emit(): void {
    gameEvents.emit(GameEvents.WarningChanged, {
      seconds: this.timer,
      progress: this.failSeconds <= 0 ? 0 : this.timer / this.failSeconds
    });
  }
}
