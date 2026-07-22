import { _decorator, AudioClip, AudioSource, Component, Node, Prefab, Vec3 } from "cc";
import type { MergePayload } from "./MergeManager";

const { ccclass, property } = _decorator;

@ccclass("EffectManager")
export class EffectManager extends Component {
  @property(AudioSource)
  audioSource: AudioSource | null = null;

  @property(AudioClip)
  dropClip: AudioClip | null = null;

  @property(AudioClip)
  mergeClip: AudioClip | null = null;

  @property(AudioClip)
  bigMergeClip: AudioClip | null = null;

  @property(AudioClip)
  yizaiClip: AudioClip | null = null;

  @property(AudioClip)
  gameOverClip: AudioClip | null = null;

  @property(Prefab)
  mergeFxPrefab: Prefab | null = null;

  @property(Node)
  fxRoot: Node | null = null;

  playDrop(): void {
    this.play(this.dropClip);
  }

  playMerge(payload: MergePayload): void {
    if (payload.yizaiMerged) this.play(this.yizaiClip || this.bigMergeClip || this.mergeClip);
    else this.play(payload.nextLevel >= 8 ? this.bigMergeClip || this.mergeClip : this.mergeClip);
    this.spawnMergeFx(payload.position);
  }

  playGameOver(): void {
    this.play(this.gameOverClip);
  }

  private play(clip: AudioClip | null): void {
    if (!clip || !this.audioSource) return;
    this.audioSource.playOneShot(clip);
  }

  private spawnMergeFx(_position: Vec3): void {
    // Real particle prefab is wired in Cocos after visual effects are finalized.
  }
}
