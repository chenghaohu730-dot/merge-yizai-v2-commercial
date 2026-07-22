import { resources, SpriteFrame } from "cc";
import { FACE_DEFINITIONS } from "../config/FaceConfig";

export class FaceSpriteRegistry {
  private static frames = new Map<number, SpriteFrame>();

  static async loadAll(): Promise<void> {
    await Promise.all(
      FACE_DEFINITIONS.map(async (face) => {
        const frame = await this.loadSpriteFrame(face.resource);
        this.frames.set(face.level, frame);
      })
    );
  }

  static get(level: number): SpriteFrame | null {
    return this.frames.get(level) || null;
  }

  private static loadSpriteFrame(resourcePath: string): Promise<SpriteFrame> {
    return new Promise((resolve, reject) => {
      resources.load(`${resourcePath}/spriteFrame`, SpriteFrame, (error, frame) => {
        if (error || !frame) reject(error || new Error(`Missing SpriteFrame: ${resourcePath}`));
        else resolve(frame);
      });
    });
  }
}
