import { _decorator, BoxCollider2D, Component, ERigidBody2DType, Node, RigidBody2D, Size, UITransform, Vec3 } from "cc";
import { designPointToCocos, designRectToCocos, designYToCocos, GAME_LAYOUT, GAME_POINTS } from "../config/LayoutConfig";
import { clamp } from "../utils/Random";

const { ccclass, property } = _decorator;

export interface GameAreaBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

@ccclass("GameArea")
export class GameArea extends Component {
  @property(Node)
  glassView: Node | null = null;

  @property(Node)
  leftWall: Node | null = null;

  @property(Node)
  rightWall: Node | null = null;

  @property(Node)
  floor: Node | null = null;

  @property(Node)
  warningLine: Node | null = null;

  @property
  wallThickness = 36;

  @property({ tooltip: "Uses docs/V2.0美术资源需求表_给GPT.md physics_rect by default." })
  useManifestPhysicsRect = true;

  get bounds(): GameAreaBounds {
    if (this.useManifestPhysicsRect) {
      const rect = GAME_LAYOUT.physicsRect;
      return {
        left: -rect.w / 2,
        right: rect.w / 2,
        top: rect.h / 2,
        bottom: -rect.h / 2
      };
    }

    const transform = this.node.getComponent(UITransform);
    const width = transform?.width || GAME_LAYOUT.physicsRect.w;
    const height = transform?.height || GAME_LAYOUT.physicsRect.h;
    return {
      left: -width / 2,
      right: width / 2,
      top: height / 2,
      bottom: -height / 2
    };
  }

  get warningY(): number {
    if (!this.useManifestPhysicsRect) return this.bounds.top - 91;
    return designYToCocos(GAME_POINTS.warningLineY) - designRectToCocos(GAME_LAYOUT.physicsRect).y;
  }

  get dropY(): number {
    if (!this.useManifestPhysicsRect) return this.bounds.top + 44;
    return designPointToCocos(GAME_POINTS.dropperAnchor).y - designRectToCocos(GAME_LAYOUT.physicsRect).y;
  }

  get dropX(): number {
    if (!this.useManifestPhysicsRect) return 0;
    return designPointToCocos(GAME_POINTS.dropperAnchor).x - designRectToCocos(GAME_LAYOUT.physicsRect).x;
  }

  onLoad(): void {
    this.deriveChildren();
  }

  deriveChildren(): void {
    const bounds = this.bounds;
    const width = bounds.right - bounds.left;
    const height = bounds.top - bounds.bottom;

    if (this.useManifestPhysicsRect) {
      const center = designRectToCocos(GAME_LAYOUT.physicsRect);
      this.node.setPosition(center.x, center.y, 0);
    }

    if (this.glassView) {
      this.sizeNode(this.glassView, width, height);
      this.glassView.setPosition(0, 0, 0);
    }

    this.setupWall(this.leftWall, this.wallThickness, height + this.wallThickness * 2, bounds.left - this.wallThickness / 2, 0);
    this.setupWall(this.rightWall, this.wallThickness, height + this.wallThickness * 2, bounds.right + this.wallThickness / 2, 0);
    this.setupWall(this.floor, width + this.wallThickness * 2, this.wallThickness, 0, bounds.bottom - this.wallThickness / 2);

    if (this.warningLine) {
      this.warningLine.setPosition(0, this.warningY, 0);
      this.sizeNode(this.warningLine, GAME_LAYOUT.warningLine.w, GAME_LAYOUT.warningLine.h);
    }
  }

  clampDropX(worldOrLocalX: number, radius: number): number {
    const bounds = this.bounds;
    return clamp(worldOrLocalX, bounds.left + radius, bounds.right - radius);
  }

  containsPoint(localPosition: Vec3, radius = 0): boolean {
    const bounds = this.bounds;
    return (
      localPosition.x - radius >= bounds.left &&
      localPosition.x + radius <= bounds.right &&
      localPosition.y - radius >= bounds.bottom
    );
  }

  private setupWall(node: Node | null, width: number, height: number, x: number, y: number): void {
    if (!node) return;
    this.sizeNode(node, width, height);
    node.setPosition(x, y, 0);

    const rigidBody = node.getComponent(RigidBody2D) || node.addComponent(RigidBody2D);
    rigidBody.type = ERigidBody2DType.Static;

    const collider = node.getComponent(BoxCollider2D) || node.addComponent(BoxCollider2D);
    collider.size = new Size(width, height);
    collider.apply();
  }

  private sizeNode(node: Node, width: number, height: number): void {
    const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
    transform.setContentSize(width, height);
  }
}
