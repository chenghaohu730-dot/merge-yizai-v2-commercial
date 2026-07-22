import { _decorator, Component } from "cc";
import { gameEvents, GameEvents } from "../core/EventBus";

const { ccclass } = _decorator;

@ccclass("ScoreManager")
export class ScoreManager extends Component {
  score = 0;
  bestScore = 0;
  maxLevel = 1;

  reset(bestScore: number): void {
    this.score = 0;
    this.bestScore = bestScore;
    this.maxLevel = 1;
    this.emitChange();
  }

  addScore(value: number, nextLevel: number): void {
    this.score += value;
    this.maxLevel = Math.max(this.maxLevel, nextLevel);
    this.bestScore = Math.max(this.bestScore, this.score);
    this.emitChange();
  }

  private emitChange(): void {
    gameEvents.emit(GameEvents.ScoreChanged, {
      score: this.score,
      bestScore: this.bestScore,
      maxLevel: this.maxLevel
    });
  }
}
