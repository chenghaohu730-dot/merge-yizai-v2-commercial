import { AssetManager, SpriteFrame } from "cc";
import {
  LOCAL_BUNDLE_DESCRIPTORS,
  LOCAL_SKIN_DESCRIPTORS,
  LocalBundleLoader,
  LocalSkinRuntime,
  type SkinActivationResult
} from "./LocalBundleRuntime";
import { CocosLocalBundlePort } from "./CocosLocalBundlePort";

export interface LoadedSkinFrames {
  activation: SkinActivationResult;
  frames: ReadonlyMap<number, SpriteFrame>;
}

export class CocosSkinAssetLoader {
  private readonly bundles = new LocalBundleLoader(LOCAL_BUNDLE_DESCRIPTORS, new CocosLocalBundlePort());
  private readonly skins = new LocalSkinRuntime(this.bundles, LOCAL_SKIN_DESCRIPTORS);

  async activate(skinId: string, unlockedSkinIds: readonly string[]): Promise<LoadedSkinFrames> {
    let activation = await this.skins.activate(skinId, unlockedSkinIds);
    try {
      return { activation, frames: await this.loadActiveFrames() };
    } catch (error) {
      if (activation.activeSkinId === "classic_v2") throw error;
      const fallback = await this.skins.activate("classic_v2", ["classic_v2"]);
      activation = {
        ...fallback,
        requestedSkinId: skinId,
        usedClassicFallback: true,
        reason: "bundle-load-failed",
        error: error instanceof Error ? error.message : String(error)
      };
      return { activation, frames: await this.loadActiveFrames() };
    }
  }

  private async loadActiveFrames(): Promise<ReadonlyMap<number, SpriteFrame>> {
    const frames = new Map<number, SpriteFrame>();
    for (let level = 1; level <= 11; level += 1) {
      const reference = this.skins.resolveFaceResource(level);
      const bundle = await this.bundles.load(reference.bundleName);
      frames.set(level, await this.loadSpriteFrame(bundle, reference.resource));
    }
    return frames;
  }

  private loadSpriteFrame(bundle: AssetManager.Bundle, resource: string): Promise<SpriteFrame> {
    return new Promise((resolve, reject) => {
      bundle.load(`${resource}/spriteFrame`, SpriteFrame, (error, frame) => {
        if (error || !frame) reject(error || new Error(`Missing SpriteFrame: ${bundle.name}/${resource}`));
        else resolve(frame);
      });
    });
  }
}
