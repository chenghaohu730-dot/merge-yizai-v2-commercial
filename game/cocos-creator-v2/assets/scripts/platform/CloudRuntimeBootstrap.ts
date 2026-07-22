import type { KeyValueStorage } from "../application/FinishRetryQueue";
import { FinishRetryQueue } from "../application/FinishRetryQueue";
import { RunCoordinator } from "../application/RunCoordinator";
import { WorldRankController } from "../application/WorldRankController";
import type { CloudRankGateway } from "../application/CloudRankGateway";
import { CloudRankBridge } from "./CloudRankBridge";
import { MockCloudRankBridge } from "./MockCloudRankBridge";

export interface CloudRuntime {
  gateway: CloudRankGateway;
  coordinator: RunCoordinator;
  rankController: WorldRankController;
  retryQueue: FinishRetryQueue;
  mode: "cloud" | "mock";
}

export interface CloudRuntimeOptions {
  storage: KeyValueStorage;
  clientVersion: string;
  configVersion: string;
  envId?: string;
  mode?: "cloud" | "mock";
  gateway?: CloudRankGateway;
  timeoutMs?: number;
}

// This composition is intentionally independent of a Cocos scene. GameManager can
// instantiate it today; a future scene/prefab only needs to expose the optional labels/buttons.
export function createCloudRuntime(options: CloudRuntimeOptions): CloudRuntime {
  const mode = options.mode || "cloud";
  const gateway = options.gateway || (mode === "mock"
    ? new MockCloudRankBridge(options.configVersion)
    : new CloudRankBridge({ envId: options.envId }));
  const retryQueue = new FinishRetryQueue(options.storage);
  return {
    gateway,
    retryQueue,
    coordinator: new RunCoordinator(
      gateway,
      retryQueue,
      options.clientVersion,
      options.configVersion,
      options.timeoutMs
    ),
    rankController: new WorldRankController(gateway),
    mode
  };
}
