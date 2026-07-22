import { _decorator, AudioClip, AudioSource, Component, Node, Sprite, SpriteFrame } from "cc";

const { ccclass, property } = _decorator;

@ccclass("ButtonStateAudio")
export class ButtonStateAudio extends Component {
  @property(SpriteFrame)
  normal: SpriteFrame | null = null;

  @property(SpriteFrame)
  pressed: SpriteFrame | null = null;

  @property(SpriteFrame)
  disabled: SpriteFrame | null = null;

  @property(AudioClip)
  clickClip: AudioClip | null = null;

  @property(AudioSource)
  audioSource: AudioSource | null = null;

  @property
  interactable = true;

  private sprite: Sprite | null = null;

  onLoad(): void {
    this.sprite = this.node.getComponent(Sprite);
    this.applyNormal();
  }

  onEnable(): void {
    this.node.on(Node.EventType.TOUCH_START, this.applyPressed, this);
    this.node.on(Node.EventType.TOUCH_END, this.onRelease, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.applyNormal, this);
  }

  onDisable(): void {
    this.node.off(Node.EventType.TOUCH_START, this.applyPressed, this);
    this.node.off(Node.EventType.TOUCH_END, this.onRelease, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.applyNormal, this);
  }

  setInteractable(value: boolean): void {
    this.interactable = value;
    if (!value) this.applyFrame(this.disabled);
    else this.applyNormal();
  }

  private onRelease(): void {
    if (!this.interactable) return;
    this.applyNormal();
    if (this.clickClip && this.audioSource) this.audioSource.playOneShot(this.clickClip);
  }

  private applyPressed(): void {
    if (!this.interactable) return;
    this.applyFrame(this.pressed || this.normal);
  }

  private applyNormal(): void {
    this.applyFrame(this.interactable ? this.normal : this.disabled);
  }

  private applyFrame(frame: SpriteFrame | null): void {
    if (this.sprite && frame) this.sprite.spriteFrame = frame;
  }
}
