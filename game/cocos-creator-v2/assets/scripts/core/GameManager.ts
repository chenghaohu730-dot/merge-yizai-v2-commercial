import { _decorator, Component, Node, PhysicsSystem2D, sys, Vec2 } from "cc";
import { GameEvents, gameEvents } from "./EventBus";
import type { PlayerProfile, RunSummary } from "./GameState";
import { SaveManager } from "./SaveManager";
import { DropController, type FaceDroppedPayload, type SpawnLevelSource } from "../game/DropController";
import { EffectManager } from "../game/EffectManager";
import { GameArea } from "../game/GameArea";
import { MergePayload } from "../game/MergeManager";
import { ScoreManager } from "../game/ScoreManager";
import { WarningLine } from "../game/WarningLine";
import { LocalRankService } from "../services/LocalRankService";
import { TaskService } from "../services/TaskService";
import { WechatAdapter } from "../platform/WechatAdapter";
import { GameHud } from "../ui/GameHud";
import { HomeView } from "../ui/HomeView";
import { RankView } from "../ui/RankView";
import { ResultView } from "../ui/ResultView";
import { Router } from "../ui/Router";
import { ShopView } from "../ui/ShopView";
import { TaskView } from "../ui/TaskView";
import { RunEventRecorder } from "../domain/run/RunEventRecorder";
import { XorShift32 } from "../domain/run/SeededPrng";
import type { RunStartData } from "../domain/run/RunContracts";
import type { StartedRun } from "../application/RunCoordinator";
import {
  createCloudRuntime,
  type CloudRuntime
} from "../platform/CloudRuntimeBootstrap";

const { ccclass, property } = _decorator;

@ccclass("GameManager")
export class GameManager extends Component {
  @property(Router)
  router: Router | null = null;

  @property(GameArea)
  gameArea: GameArea | null = null;

  @property(Node)
  faceRoot: Node | null = null;

  @property(DropController)
  dropController: DropController | null = null;

  @property(ScoreManager)
  scoreManager: ScoreManager | null = null;

  @property(WarningLine)
  warningLine: WarningLine | null = null;

  @property(EffectManager)
  effectManager: EffectManager | null = null;

  @property(HomeView)
  homeView: HomeView | null = null;

  @property(GameHud)
  gameHud: GameHud | null = null;

  @property(ResultView)
  resultView: ResultView | null = null;

  @property(TaskView)
  taskView: TaskView | null = null;

  @property(ShopView)
  shopView: ShopView | null = null;

  @property(RankView)
  rankView: RankView | null = null;

  @property
  clientVersion = "2.0.0-dev";

  @property
  cloudConfigVersion = "v2-dev-1";

  @property
  cloudEnvId = "";

  @property({ tooltip: "Editor/test only. Production must use real wx.cloud or local-only fallback." })
  useMockCloud = false;

  private profile: PlayerProfile = SaveManager.createDefaultProfile();
  private lastSummary: RunSummary | null = null;
  private paused = false;
  private cloudRuntime: CloudRuntime | null = null;
  private activeRun: StartedRun | null = null;
  private runRecorder: RunEventRecorder | null = null;
  private mergeCounts: number[] = Array(12).fill(0);
  private dropCount = 0;
  private yizaiCount = 0;
  private warningActive = false;
  private lastWarningSeconds = 0;
  private endingRun = false;
  private startingRun = false;
  private lifecycleVersion = 0;
  private submittedRunId: string | null = null;

  onLoad(): void {
    this.profile = SaveManager.loadProfile();
    PhysicsSystem2D.instance.enable = true;
    PhysicsSystem2D.instance.gravity = new Vec2(0, -980);
    WechatAdapter.enableShareMenu();
    this.cloudRuntime = createCloudRuntime({
      storage: sys.localStorage,
      clientVersion: this.clientVersion,
      configVersion: this.cloudConfigVersion,
      envId: this.cloudEnvId.trim() || undefined,
      mode: this.useMockCloud ? "mock" : "cloud"
    });
    this.rankView?.configure(this.cloudRuntime.rankController, "all");
    // A failed retry stays persisted with exponential backoff; boot never waits on the network.
    void this.cloudRuntime.coordinator.flushPending();
  }

  start(): void {
    this.showHome();
  }

  onEnable(): void {
    gameEvents.on(GameEvents.StartRun, this.startRun, this);
    gameEvents.on(GameEvents.PauseRun, this.pauseRun, this);
    gameEvents.on(GameEvents.ResumeRun, this.resumeRun, this);
    gameEvents.on(GameEvents.RestartRun, this.startRun, this);
    gameEvents.on(GameEvents.BackHome, this.showHome, this);
    gameEvents.on(GameEvents.OpenTasks, this.showTasks, this);
    gameEvents.on(GameEvents.OpenShop, this.showShop, this);
    gameEvents.on(GameEvents.OpenRank, this.showRank, this);
    gameEvents.on(GameEvents.FaceDropped, this.onFaceDropped, this);
    gameEvents.on(GameEvents.MergeResolved, this.onMergeResolved, this);
    gameEvents.on(GameEvents.WarningChanged, this.onWarningChanged, this);
    gameEvents.on(GameEvents.RunEnded, this.endRun, this);
    gameEvents.on(GameEvents.ShareScore, this.shareScore, this);
    gameEvents.on(GameEvents.ProfileChanged, this.saveAndRefresh, this);
  }

  onDisable(): void {
    gameEvents.targetOff(this);
  }

  startRun(): void {
    if (this.startingRun) return;
    const version = ++this.lifecycleVersion;
    void this.beginRun(version);
  }

  private async beginRun(version: number): Promise<void> {
    this.startingRun = true;
    this.clearFaceRoot();
    this.paused = false;
    PhysicsSystem2D.instance.enable = true;
    this.lastSummary = null;
    this.activeRun = null;
    this.runRecorder = null;
    this.submittedRunId = null;
    this.resetRunTelemetry();
    this.dropController?.stopRun();
    this.router?.showGame();
    this.gameArea?.deriveChildren();
    this.scoreManager?.reset(this.profile.bestScore);
    this.refreshHud();

    const started = this.cloudRuntime
      ? await this.cloudRuntime.coordinator.start()
      : { mode: "local", reason: "cloud_unavailable", seed: Date.now() >>> 0 } as StartedRun;
    if (version !== this.lifecycleVersion) {
      this.startingRun = false;
      return;
    }

    this.activeRun = started;
    let spawnLevelSource: SpawnLevelSource | undefined;
    if (started.mode === "online") {
      this.runRecorder = new RunEventRecorder();
      const random = new XorShift32(started.session.seed);
      spawnLevelSource = () => random.pickWeightedLevel(started.session.runConfig.spawnWeights);
    }
    this.warningLine?.begin();
    this.dropController?.beginRun(spawnLevelSource);
    this.startingRun = false;
    this.refreshHud();
  }

  pauseRun(): void {
    if (this.paused) return;
    this.paused = true;
    PhysicsSystem2D.instance.enable = false;
    this.dropController?.pauseInput(true);
    this.runRecorder?.recordPause();
    this.router?.showPauseOverlay();
  }

  resumeRun(): void {
    if (!this.paused) return;
    this.paused = false;
    PhysicsSystem2D.instance.enable = true;
    this.dropController?.pauseInput(false);
    this.runRecorder?.recordResume();
    this.router?.hidePauseOverlay();
  }

  showHome(): void {
    this.lifecycleVersion += 1;
    this.startingRun = false;
    PhysicsSystem2D.instance.enable = true;
    this.paused = false;
    this.warningLine?.stop();
    this.dropController?.stopRun();
    this.activeRun = null;
    this.runRecorder = null;
    this.submittedRunId = null;
    this.router?.showHome();
    this.homeView?.refresh(this.profile);
  }

  showTasks(): void {
    this.router?.showTasks();
    this.taskView?.refresh(this.profile);
  }

  showShop(): void {
    this.router?.showShop();
    this.shopView?.refresh(this.profile);
  }

  showRank(): void {
    this.router?.showRank();
    this.rankView?.refresh(this.profile);
  }

  private onFaceDropped(payload: FaceDroppedPayload): void {
    this.dropCount += 1;
    this.runRecorder?.recordDrop(payload.normalizedX);
    this.effectManager?.playDrop();
    this.refreshHud();
  }

  private onMergeResolved(payload: MergePayload): void {
    this.runRecorder?.recordMerge(payload.fromLevel);
    if (payload.fromLevel >= 1 && payload.fromLevel < this.mergeCounts.length) {
      this.mergeCounts[payload.fromLevel] += 1;
    }
    if (payload.fromLevel === 10) this.yizaiCount += 1;
    this.scoreManager?.addScore(payload.score, payload.nextLevel);
    this.effectManager?.playMerge(payload);
    this.refreshHud();
  }

  private onWarningChanged(payload: { seconds?: number; progress?: number }): void {
    if (this.endingRun) return;
    this.lastWarningSeconds = Math.max(0, Number(payload?.seconds || 0));
    const active = Number(payload?.progress || 0) > 0;
    if (active === this.warningActive) return;
    this.warningActive = active;
    this.runRecorder?.recordWarning(active);
  }

  private endRun(): void {
    if (this.endingRun) return;
    this.endingRun = true;
    const completedRun = this.activeRun;
    const recorder = this.runRecorder;
    const completedMergeCounts = [...this.mergeCounts];
    const completedDropCount = this.dropCount;
    const completedYizaiCount = this.yizaiCount;
    const warningHoldMs = Math.round(this.lastWarningSeconds * 1000);
    this.warningLine?.stop();
    this.dropController?.stopRun();
    this.effectManager?.playGameOver();

    const score = this.scoreManager?.score || 0;
    const maxLevel = this.scoreManager?.maxLevel || 1;
    this.profile.bestScore = Math.max(this.profile.bestScore, score);

    const summary: RunSummary = {
      score,
      bestScore: this.profile.bestScore,
      maxLevel,
      yizaiMerged: maxLevel >= 11,
      earnedCoins: 0
    };

    TaskService.applyRun(this.profile, summary);
    LocalRankService.submit(this.profile, summary);
    summary.earnedCoins = this.autoClaimCompletedDailyCoins();
    this.lastSummary = summary;
    this.saveAndRefresh();

    this.router?.showResult();
    this.resultView?.show(summary);

    this.activeRun = null;
    this.runRecorder = null;
    if (completedRun?.mode === "online" && recorder && this.cloudRuntime) {
      this.submittedRunId = completedRun.session.runId;
      this.resultView?.showCloudPending();
      void this.finishWorldRun(
        completedRun.session,
        recorder,
        summary,
        completedDropCount,
        completedMergeCounts,
        completedYizaiCount,
        warningHoldMs
      );
    } else {
      this.resultView?.showLocalOnly();
    }
    this.endingRun = false;
  }

  private async finishWorldRun(
    session: RunStartData,
    recorder: RunEventRecorder,
    summary: RunSummary,
    dropCount: number,
    mergeCounts: number[],
    yizaiCount: number,
    warningHoldMs: number
  ): Promise<void> {
    if (!this.cloudRuntime) return;
    const runId = session.runId;
    const receipt = await this.cloudRuntime.coordinator.finish({
      runId,
      nonce: session.nonce,
      configVersion: session.configVersion,
      eventStream: {
        encoding: "compact-v1",
        events: recorder.snapshot(),
        sha256: recorder.digest(session.nonce)
      },
      finish: {
        reason: "warning_line",
        wallDurationMs: recorder.wallDurationMs(),
        activeDurationMs: recorder.activeDurationMs(),
        warningHoldMs
      },
      clientClaim: {
        // Diagnostic only. CloudBase always recomputes these values from the event stream.
        score: summary.score,
        maxLevel: summary.maxLevel,
        dropCount,
        mergeCounts,
        yizaiCount
      }
    });
    if (this.submittedRunId !== runId) return;
    if (receipt) {
      this.resultView?.showCloudReceipt(receipt);
      void this.rankView?.loadTop();
    } else {
      this.resultView?.showCloudDeferred();
    }
  }

  private shareScore(): void {
    if (!this.lastSummary) return;
    WechatAdapter.shareScore(this.lastSummary);
    TaskService.applyShare(this.profile);
    this.saveAndRefresh();
  }

  private autoClaimCompletedDailyCoins(): number {
    let coins = 0;
    for (const task of TaskService.getViewModels(this.profile)) {
      if (task.complete && !task.claimed && task.id === "daily_login") {
        coins += TaskService.claim(this.profile, task.id);
      }
    }
    return coins;
  }

  private saveAndRefresh(): void {
    SaveManager.saveProfile(this.profile);
    this.homeView?.refresh(this.profile);
    this.taskView?.refresh(this.profile);
    this.shopView?.refresh(this.profile);
    this.rankView?.refresh(this.profile);
    this.refreshHud();
  }

  private refreshHud(): void {
    if (!this.gameHud || !this.dropController || !this.scoreManager) return;
    this.gameHud.refresh({
      score: this.scoreManager.score,
      bestScore: this.scoreManager.bestScore,
      yizaiCoins: this.profile.yizaiCoins,
      currentLevel: this.dropController.currentLevel,
      nextLevel: this.dropController.nextLevel,
      maxLevel: this.scoreManager.maxLevel
    });
  }

  private resetRunTelemetry(): void {
    this.mergeCounts = Array(12).fill(0);
    this.dropCount = 0;
    this.yizaiCount = 0;
    this.warningActive = false;
    this.lastWarningSeconds = 0;
    this.endingRun = false;
  }

  private clearFaceRoot(): void {
    if (!this.faceRoot) return;
    for (const child of [...this.faceRoot.children]) child.destroy();
  }
}
