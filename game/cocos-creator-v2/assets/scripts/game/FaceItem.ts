import {
  _decorator,
  CircleCollider2D,
  Collider2D,
  Component,
  Contact2DType,
  ERigidBody2DType,
  IPhysics2DContact,
  RigidBody2D,
  Sprite,
  SpriteFrame,
  UITransform
} from "cc";
import { getFaceDefinition } from "../config/FaceConfig";
import { gameEvents, GameEvents } from "../core/EventBus";

const { ccclass, property } = _decorator;

@ccclass("FaceItem")
export class FaceItem extends Component {
  @property
  level = 1;

  mergeLocked = false;

  setup(level: number, spriteFrame: SpriteFrame | null): void {
    this.level = level;
    this.mergeLocked = false;

    const definition = getFaceDefinition(level);
    const transform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    transform.setContentSize(definition.diameter, definition.diameter);

    const sprite = this.node.getComponent(Sprite) || this.node.addComponent(Sprite);
    if (spriteFrame) sprite.spriteFrame = spriteFrame;

    const rigidBody = this.node.getComponent(RigidBody2D) || this.node.addComponent(RigidBody2D);
    rigidBody.type = ERigidBody2DType.Dynamic;
    rigidBody.linearDamping = 0.05;
    rigidBody.angularDamping = 0.1;
    rigidBody.gravityScale = 1;

    const collider = this.node.getComponent(CircleCollider2D) || this.node.addComponent(CircleCollider2D);
    collider.radius = definition.radius;
    collider.apply();
  }

  onEnable(): void {
    const collider = this.node.getComponent(Collider2D);
    collider?.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  onDisable(): void {
    const collider = this.node.getComponent(Collider2D);
    collider?.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
  }

  lockForMerge(): void {
    this.mergeLocked = true;
  }

  private onBeginContact(self: Collider2D, other: Collider2D, _contact: IPhysics2DContact | null): void {
    const otherFace = other.node.getComponent(FaceItem);
    if (!otherFace || otherFace === this) return;
    if (this.mergeLocked || otherFace.mergeLocked) return;
    if (this.level !== otherFace.level) return;
    gameEvents.emit(GameEvents.FaceContact, this, otherFace);
  }
}
