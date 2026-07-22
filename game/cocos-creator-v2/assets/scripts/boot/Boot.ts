import { _decorator, assetManager, Component, director } from "cc";
import { WechatAdapter } from "../platform/WechatAdapter";

const { ccclass } = _decorator;

@ccclass("Boot")
export class Boot extends Component {
  start(): void {
    WechatAdapter.enableShareMenu();
    void this.enterHome();
  }

  private async enterHome(): Promise<void> {
    const bundle = assetManager.getBundle("core_game") || await new Promise<ReturnType<typeof assetManager.getBundle>>((resolve, reject) => {
      assetManager.loadBundle("core_game", (error, loadedBundle) => {
        if (error || !loadedBundle) reject(error || new Error("Missing built-in core_game bundle."));
        else resolve(loadedBundle);
      });
    });
    if (!bundle) throw new Error("Missing built-in core_game bundle.");
    await new Promise<void>((resolve, reject) => {
      bundle.loadScene("Home", (error, sceneAsset) => {
        if (error || !sceneAsset) {
          reject(error || new Error("Missing Home scene in core_game."));
          return;
        }
        director.runScene(sceneAsset);
        resolve();
      });
    });
  }
}
