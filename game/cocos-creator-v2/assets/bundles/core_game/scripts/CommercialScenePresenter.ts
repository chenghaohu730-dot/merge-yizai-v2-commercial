import {
  _decorator,
  assetManager,
  Component,
  director,
  Node,
  Sprite,
  SpriteFrame,
  UITransform,
  Vec3
} from "cc";

const { ccclass } = _decorator;

@ccclass("CommercialScenePresenter")
export class CommercialScenePresenter extends Component {
  start(): void {
    void this.render().catch((error: unknown) => {
      console.error("Commercial scene art failed to load.", error);
    });
  }

  private async render(): Promise<void> {
    const sceneName = director.getScene()?.name || "Home";
    if (sceneName === "Home") {
      await this.addSprite("CommercialBackground", "ui/gameplay/splash_bg_750x1334", 750, 1334);
      this.addHitArea("StartHitArea", 520, 170, new Vec3(0, -360, 0), () => this.openScene("Game"));
      return;
    }
    if (sceneName === "Game") {
      await this.addSprite("CommercialBackground", "ui/gameplay/game_bg_750x1334", 750, 1334);
      return;
    }
    await this.addSprite("CommercialBackground", "ui/gameplay/game_bg_750x1334", 750, 1334);
    await this.addSprite("CommercialResultPanel", "ui/panels/result_panel", 640, 750, new Vec3(0, -30, 0));
  }

  private async addSprite(
    name: string,
    resource: string,
    width: number,
    height: number,
    position = Vec3.ZERO
  ): Promise<Node> {
    const frame = await this.loadFrame(resource);
    const node = new Node(name);
    node.layer = this.node.layer;
    node.setPosition(position);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.spriteFrame = frame;
    this.node.addChild(node);
    return node;
  }

  private addHitArea(name: string, width: number, height: number, position: Vec3, action: () => void): void {
    const node = new Node(name);
    node.layer = this.node.layer;
    node.setPosition(position);
    node.addComponent(UITransform).setContentSize(width, height);
    node.on(Node.EventType.TOUCH_END, action, this);
    this.node.addChild(node);
  }

  private loadFrame(resource: string): Promise<SpriteFrame> {
    const bundle = assetManager.getBundle("core_game");
    if (!bundle) return Promise.reject(new Error("core_game must be loaded before its scene presenter starts."));
    return new Promise((resolve, reject) => {
      bundle.load(`${resource}/spriteFrame`, SpriteFrame, (error, frame) => {
        if (error || !frame) reject(error || new Error(`Missing commercial SpriteFrame: ${resource}`));
        else resolve(frame);
      });
    });
  }

  private openScene(name: string): void {
    const bundle = assetManager.getBundle("core_game");
    if (!bundle) return;
    bundle.loadScene(name, (error, sceneAsset) => {
      if (error || !sceneAsset) {
        console.error(`Unable to open ${name}.`, error);
        return;
      }
      director.runScene(sceneAsset);
    });
  }
}
