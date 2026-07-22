import { assetManager, AssetManager } from "cc";
import type { LocalBundlePort } from "./LocalBundleRuntime";

export class CocosLocalBundlePort implements LocalBundlePort<AssetManager.Bundle> {
  get(name: string): AssetManager.Bundle | null {
    return assetManager.getBundle(name);
  }

  load(name: string): Promise<AssetManager.Bundle> {
    return new Promise((resolve, reject) => {
      assetManager.loadBundle(name, (error, bundle) => {
        if (error || !bundle) reject(error || new Error(`Missing local bundle: ${name}`));
        else resolve(bundle);
      });
    });
  }

  release(_name: string, bundle: AssetManager.Bundle): void {
    bundle.releaseAll();
    assetManager.removeBundle(bundle);
  }
}
