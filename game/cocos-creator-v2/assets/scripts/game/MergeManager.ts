import { _decorator, Component, instantiate, isValid, Node, Prefab, RigidBody2D, Vec2, Vec3 } from "cc";
import { getFaceDefinition, getScoreForMerge, MAX_FACE_LEVEL } from "../config/FaceConfig";
import { gameEvents, GameEvents } from "../core/EventBus";
import { FaceItem } from "./FaceItem";
import { FaceSpriteRegistry } from "./FaceSpriteRegistry";

const { ccclass, property } = _decorator;

export interface MergePayload {
  fromLevel: number;
  nextLevel: number;
  score: number;
  position: Vec3;
  yizaiMerged: boolean;
}

@ccclass("MergeManager")
export class MergeManager extends Component {
  @property(Node)
  faceRoot: Node | null = null;

  @property(Prefab)
  facePrefab: Prefab | null = null;

  @property
  mergeDelay = 0.1;

  onEnable(): void {
    gameEvents.on(GameEvents.FaceContact, this.onFaceContact, this);
  }

  onDisable(): void {
    gameEvents.off(GameEvents.FaceContact, this.onFaceContact, this);
  }

  private onFaceContact(a: FaceItem, b: FaceItem): void {
    if (!this.faceRoot || !this.facePrefab) return;
    if (!isValid(a.node) || !isValid(b.node) || a.mergeLocked || b.mergeLocked || a.level !== b.level) return;

    a.lockForMerge();
    b.lockForMerge();
    this.scheduleOnce(() => this.resolveMerge(a, b), this.mergeDelay);
  }

  private resolveMerge(a: FaceItem, b: FaceItem): void {
    if (!this.faceRoot || !this.facePrefab) return;
    if (!isValid(a.node) || !isValid(b.node) || a.level !== b.level) return;

    const fromLevel = a.level;
    const nextLevel = Math.min(fromLevel + 1, MAX_FACE_LEVEL);
    const position = new Vec3(
      (a.node.position.x + b.node.position.x) / 2,
      (a.node.position.y + b.node.position.y) / 2,
      0
    );

    a.node.destroy();
    b.node.destroy();

    const node = instantiate(this.facePrefab);
    node.parent = this.faceRoot;
    node.setPosition(position);

    const item = node.getComponent(FaceItem) || node.addComponent(FaceItem);
    item.setup(nextLevel, FaceSpriteRegistry.get(nextLevel));

    const rigidBody = node.getComponent(RigidBody2D);
    if (rigidBody) rigidBody.linearVelocity = new Vec2(0, fromLevel >= 8 ? 260 : 180);

    const payload: MergePayload = {
      fromLevel,
      nextLevel,
      score: getScoreForMerge(fromLevel >= MAX_FACE_LEVEL ? MAX_FACE_LEVEL + 1 : nextLevel),
      position,
      yizaiMerged: nextLevel === MAX_FACE_LEVEL
    };

    const definition = getFaceDefinition(nextLevel);
    gameEvents.emit(GameEvents.MergeResolved, payload, definition);
  }
}
