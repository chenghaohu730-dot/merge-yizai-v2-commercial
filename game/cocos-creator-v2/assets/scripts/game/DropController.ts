import { _decorator, Component, EventTouch, input, Input, instantiate, Node, Prefab, RigidBody2D, Vec2, Vec3 } from "cc";
import { getFaceDefinition, rollSpawnLevel } from "../config/FaceConfig";
import { gameEvents, GameEvents } from "../core/EventBus";
import { GameArea } from "./GameArea";
import { FaceItem } from "./FaceItem";
import { FaceSpriteRegistry } from "./FaceSpriteRegistry";

const { ccclass, property } = _decorator;

@ccclass("DropController")
export class DropController extends Component {
  @property(GameArea)
  gameArea: GameArea | null = null;

  @property(Node)
  faceRoot: Node | null = null;

  @property(Prefab)
  facePrefab: Prefab | null = null;

  @property
  spawnCooldown = 0.42;

  currentLevel = 1;
  nextLevel = 1;
  dropX = 0;

  private acceptingInput = false;
  private readyToDrop = false;

  async onLoad(): Promise<void> {
    await FaceSpriteRegistry.loadAll();
  }

  onEnable(): void {
    input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
    input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
  }

  onDisable(): void {
    input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
    input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
  }

  beginRun(): void {
    this.dropX = this.gameArea?.dropX || 0;
    this.currentLevel = rollSpawnLevel();
    this.nextLevel = rollSpawnLevel();
    this.acceptingInput = true;
    this.readyToDrop = true;
    gameEvents.emit(GameEvents.ScoreChanged);
  }

  stopRun(): void {
    this.acceptingInput = false;
    this.readyToDrop = false;
  }

  pauseInput(paused: boolean): void {
    this.acceptingInput = !paused;
  }

  private onTouchStart(event: EventTouch): void {
    if (!this.acceptingInput || !this.readyToDrop) return;
    this.updateDropX(event);
  }

  private onTouchMove(event: EventTouch): void {
    if (!this.acceptingInput || !this.readyToDrop) return;
    this.updateDropX(event);
  }

  private onTouchEnd(event: EventTouch): void {
    if (!this.acceptingInput || !this.readyToDrop) return;
    this.updateDropX(event);
    this.dropCurrent();
  }

  private updateDropX(event: EventTouch): void {
    if (!this.gameArea) return;
    const uiLocation = event.getUILocation();
    const areaWorld = this.gameArea.node.worldPosition;
    const localX = uiLocation.x - areaWorld.x;
    const radius = getFaceDefinition(this.currentLevel).radius;
    this.dropX = this.gameArea.clampDropX(localX, radius);
  }

  private dropCurrent(): void {
    if (!this.gameArea || !this.faceRoot || !this.facePrefab) return;

    this.readyToDrop = false;
    const node = instantiate(this.facePrefab);
    node.parent = this.faceRoot;
    node.setPosition(new Vec3(this.dropX, this.gameArea.dropY, 0));

    const item = node.getComponent(FaceItem) || node.addComponent(FaceItem);
    item.setup(this.currentLevel, FaceSpriteRegistry.get(this.currentLevel));

    const rigidBody = node.getComponent(RigidBody2D);
    if (rigidBody) rigidBody.linearVelocity = new Vec2(0, -10);

    gameEvents.emit(GameEvents.FaceDropped, this.currentLevel);

    this.currentLevel = this.nextLevel;
    this.nextLevel = rollSpawnLevel();
    this.scheduleOnce(() => {
      this.readyToDrop = this.acceptingInput;
      gameEvents.emit(GameEvents.ScoreChanged);
    }, this.spawnCooldown);
  }
}
