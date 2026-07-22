export type LocalBundleKind = "main" | "local-subpackage";
export type LocalBundleCompression = "merge_all_json" | "subpackage";

export interface LocalBundleDescriptor {
  name: string;
  kind: LocalBundleKind;
  compression: LocalBundleCompression;
  required: boolean;
  budgetBytes: number;
  maxLoadAttempts: number;
}

export interface LocalSkinDescriptor {
  id: string;
  bundleName: string;
  faceResources: readonly string[];
  previewResource: string;
  finalYizaiResource: string;
}

export interface LocalBundlePort<TBundle> {
  get(name: string): TBundle | null;
  load(name: string): Promise<TBundle>;
  release?(name: string, bundle: TBundle): void;
}

export interface LocalBundleRetryPolicy {
  baseDelayMs: number;
  wait(delayMs: number): Promise<void>;
}

export type LocalBundleState = "idle" | "loading" | "loaded" | "failed";

export interface SkinActivationResult {
  requestedSkinId: string;
  activeSkinId: string;
  bundleName: string;
  usedClassicFallback: boolean;
  reason: "activated" | "classic" | "locked" | "unknown" | "bundle-load-failed";
  error?: string;
}

export const LOCAL_BUNDLE_DESCRIPTORS: readonly LocalBundleDescriptor[] = [
  {
    name: "main",
    kind: "main",
    compression: "merge_all_json",
    required: true,
    budgetBytes: 3_460_300,
    maxLoadAttempts: 1
  },
  {
    name: "core_game",
    kind: "local-subpackage",
    compression: "subpackage",
    required: true,
    budgetBytes: 8_912_896,
    maxLoadAttempts: 3
  },
  {
    name: "meta_ui",
    kind: "local-subpackage",
    compression: "subpackage",
    required: false,
    budgetBytes: 2_097_152,
    maxLoadAttempts: 3
  },
  ...["jelly", "star", "cream", "coin", "festival"].map((skin) => ({
    name: `skin_${skin}_v2`,
    kind: "local-subpackage" as const,
    compression: "subpackage" as const,
    required: false,
    budgetBytes: 1_572_864,
    maxLoadAttempts: 3
  }))
];

const CLASSIC_FACE_RESOURCES = [
  "faces/default/face_01_sprout_bead",
  "faces/default/face_02_peach_puff",
  "faces/default/face_03_heart_jelly",
  "faces/default/face_04_sun_wiggle",
  "faces/default/face_05_sky_spark",
  "faces/default/face_06_cream_smile",
  "faces/default/face_07_seed_sage",
  "faces/default/face_08_grape_zap",
  "faces/default/face_09_flame_grin",
  "faces/default/face_10_crown_star"
] as const;

const CLASSIC_YIZAI_RESOURCE = "faces/default/face_11_yizai";

function skinFaceResources(skin: string): readonly string[] {
  return Array.from({ length: 10 }, (_, index) => {
    const level = String(index + 1).padStart(2, "0");
    return `faces/${skin}/skin_${skin}_face_${level}`;
  });
}

export const LOCAL_SKIN_DESCRIPTORS: readonly LocalSkinDescriptor[] = [
  {
    id: "classic_v2",
    bundleName: "core_game",
    faceResources: CLASSIC_FACE_RESOURCES,
    previewResource: "faces/default/face_01_sprout_bead",
    finalYizaiResource: CLASSIC_YIZAI_RESOURCE
  },
  ...["jelly", "star", "cream", "coin", "festival"].map((skin) => ({
    id: `${skin}_v2`,
    bundleName: `skin_${skin}_v2`,
    faceResources: skinFaceResources(skin),
    previewResource: `faces/${skin}/skin_preview_${skin}`,
    finalYizaiResource: CLASSIC_YIZAI_RESOURCE
  }))
];

export const DEFAULT_LOCAL_SKIN_ID = "classic_v2";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class LocalBundleLoader<TBundle> {
  private readonly port: LocalBundlePort<TBundle>;
  private readonly retryPolicy: LocalBundleRetryPolicy;
  private readonly descriptors = new Map<string, LocalBundleDescriptor>();
  private readonly pending = new Map<string, Promise<TBundle>>();
  private readonly loaded = new Map<string, TBundle>();
  private readonly states = new Map<string, LocalBundleState>();
  private readonly attempts = new Map<string, number>();

  constructor(
    descriptors: readonly LocalBundleDescriptor[],
    port: LocalBundlePort<TBundle>,
    retryPolicy: LocalBundleRetryPolicy = {
      baseDelayMs: 180,
      wait: (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  ) {
    this.port = port;
    this.retryPolicy = retryPolicy;
    for (const descriptor of descriptors) {
      if (this.descriptors.has(descriptor.name)) throw new Error(`Duplicate local bundle: ${descriptor.name}`);
      if (descriptor.kind === "local-subpackage" && descriptor.compression !== "subpackage") {
        throw new Error(`Local bundle ${descriptor.name} must use subpackage compression.`);
      }
      this.descriptors.set(descriptor.name, descriptor);
      this.states.set(descriptor.name, descriptor.kind === "main" ? "loaded" : "idle");
    }
  }

  getState(name: string): LocalBundleState {
    return this.states.get(name) || "idle";
  }

  getAttempts(name: string): number {
    return this.attempts.get(name) || 0;
  }

  getLoaded(name: string): TBundle | null {
    return this.loaded.get(name) || this.port.get(name);
  }

  async load(name: string): Promise<TBundle> {
    const descriptor = this.descriptors.get(name);
    if (!descriptor) throw new Error(`Unknown local bundle: ${name}`);
    if (descriptor.kind === "main") throw new Error("The main package is already loaded by the platform.");

    const existing = this.getLoaded(name);
    if (existing) {
      this.loaded.set(name, existing);
      this.states.set(name, "loaded");
      return existing;
    }

    const inFlight = this.pending.get(name);
    if (inFlight) return inFlight;

    const promise = this.loadWithRetry(descriptor).finally(() => this.pending.delete(name));
    this.pending.set(name, promise);
    return promise;
  }

  release(name: string): boolean {
    const descriptor = this.descriptors.get(name);
    if (!descriptor || descriptor.required || descriptor.kind === "main") return false;

    const bundle = this.loaded.get(name) || this.port.get(name);
    if (!bundle) return false;
    this.port.release?.(name, bundle);
    this.loaded.delete(name);
    this.states.set(name, "idle");
    return true;
  }

  private async loadWithRetry(descriptor: LocalBundleDescriptor): Promise<TBundle> {
    this.states.set(descriptor.name, "loading");
    let lastError: unknown = new Error(`Failed to load local bundle: ${descriptor.name}`);

    for (let attempt = 1; attempt <= descriptor.maxLoadAttempts; attempt += 1) {
      this.attempts.set(descriptor.name, attempt);
      try {
        const bundle = await this.port.load(descriptor.name);
        this.loaded.set(descriptor.name, bundle);
        this.states.set(descriptor.name, "loaded");
        return bundle;
      } catch (error) {
        lastError = error;
        if (attempt < descriptor.maxLoadAttempts) {
          await this.retryPolicy.wait(this.retryPolicy.baseDelayMs * 2 ** (attempt - 1));
        }
      }
    }

    this.states.set(descriptor.name, "failed");
    throw new Error(`Local bundle ${descriptor.name} failed after ${descriptor.maxLoadAttempts} attempts: ${errorMessage(lastError)}`);
  }
}

export class LocalSkinRuntime<TBundle> {
  private readonly bundleLoader: LocalBundleLoader<TBundle>;
  private readonly skins = new Map<string, LocalSkinDescriptor>();
  private activeSkinId = DEFAULT_LOCAL_SKIN_ID;

  constructor(
    bundleLoader: LocalBundleLoader<TBundle>,
    skins: readonly LocalSkinDescriptor[] = LOCAL_SKIN_DESCRIPTORS
  ) {
    this.bundleLoader = bundleLoader;
    for (const skin of skins) this.skins.set(skin.id, skin);
    if (!this.skins.has(DEFAULT_LOCAL_SKIN_ID)) throw new Error("Classic skin descriptor is required.");
  }

  get activeSkin(): LocalSkinDescriptor {
    return this.skins.get(this.activeSkinId) || this.skins.get(DEFAULT_LOCAL_SKIN_ID)!;
  }

  async activate(requestedSkinId: string, unlockedSkinIds: readonly string[]): Promise<SkinActivationResult> {
    const requested = this.skins.get(requestedSkinId);
    if (!requested) return this.fallback(requestedSkinId, "unknown");
    if (!unlockedSkinIds.includes(requestedSkinId)) return this.fallback(requestedSkinId, "locked");

    if (requestedSkinId === DEFAULT_LOCAL_SKIN_ID) {
      this.activeSkinId = DEFAULT_LOCAL_SKIN_ID;
      return {
        requestedSkinId,
        activeSkinId: DEFAULT_LOCAL_SKIN_ID,
        bundleName: "core_game",
        usedClassicFallback: false,
        reason: "classic"
      };
    }

    try {
      await this.bundleLoader.load(requested.bundleName);
      this.activeSkinId = requestedSkinId;
      return {
        requestedSkinId,
        activeSkinId: requestedSkinId,
        bundleName: requested.bundleName,
        usedClassicFallback: false,
        reason: "activated"
      };
    } catch (error) {
      return this.fallback(requestedSkinId, "bundle-load-failed", errorMessage(error));
    }
  }

  resolveFaceResource(level: number): { bundleName: string; resource: string } {
    const skin = this.activeSkin;
    if (level === 11) return { bundleName: "core_game", resource: skin.finalYizaiResource };
    if (!Number.isInteger(level) || level < 1 || level > 10) throw new Error(`Invalid skinnable face level: ${level}`);
    return { bundleName: skin.bundleName, resource: skin.faceResources[level - 1] };
  }

  private fallback(
    requestedSkinId: string,
    reason: "locked" | "unknown" | "bundle-load-failed",
    error?: string
  ): SkinActivationResult {
    this.activeSkinId = DEFAULT_LOCAL_SKIN_ID;
    return {
      requestedSkinId,
      activeSkinId: DEFAULT_LOCAL_SKIN_ID,
      bundleName: "core_game",
      usedClassicFallback: true,
      reason,
      ...(error ? { error } : {})
    };
  }
}
