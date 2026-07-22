import { _decorator, Component, Node, PhysicsSystem2D, Vec2 } from "cc";
import { GameEvents, gameEvents } from "./EventBus";
import type { PlayerProfile, RunSummary } from "./GameState";
import { SaveManager } from "./SaveManager";
import { DropController } from "../game/DropController";
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

  private profile: PlayerProfile = SaveManager.createDefaultProfile();
  private lastSummary: RunSummary | null = null;
  private paused = false;

  onLoad(): void {
    this.profile = SaveManager.loadProfile();
    PhysicsSystem2D.instance.enable = true;
    PhysicsSystem2D.instance.gravity = new Vec2(0, -980);
    WechatAdapter.enableShareMenu();
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
    gameEvents.on(GameEvents.RunEnded, this.endRun, this);
    gameEvents.on(GameEvents.ShareScore, this.shareScore, this);
    gameEvents.on(GameEvents.ProfileChanged, this.saveAndRefresh, this);
  }

  onDisable(): void {
    gameEvents.targetOff(this);
  }

  startRun(): void {
    this.clearFaceRoot();
    this.paused = false;
    PhysicsSystem2D.instance.enable = true;
    this.lastSummary = null;
    this.router?.showGame();
    this.gameArea?.deriveChildren();
    this.scoreManager?.reset(this.profile.bestScore);
    this.warningLine?.begin();
    this.dropController?.beginRun();
    this.refreshHud();
  }

  pauseRun(): void {
    if (this.paused) return;
    this.paused = true;
    PhysicsSystem2D.instance.enable = false;
    this.dropController?.pauseInput(true);
    this.router?.showPauseOverlay();
  }

  resumeRun(): void {
    if (!this.paused) return;
    this.paused = false;
    PhysicsSystem2D.instance.enable = true;
    this.dropController?.pauseInput(false);
    this.router?.hidePauseOverlay();
  }

  showHome(): void {
    PhysicsSystem2D.instance.enable = true;
    this.paused = false;
    this.warningLine?.stop();
    this.dropController?.stopRun();
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

  private onFaceDropped(): void {
    this.effectManager?.playDrop();
    this.refreshHud();
  }

  private onMergeResolved(payload: MergePayload): void {
    this.scoreManager?.addScore(payload.score, payload.nextLevel);
    this.effectManager?.playMerge(payload);
    this.refreshHud();
  }

  private endRun(): void {
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

  private clearFaceRoot(): void {
    if (!this.faceRoot) return;
    for (const child of [...this.faceRoot.children]) child.destroy();
  }
}
