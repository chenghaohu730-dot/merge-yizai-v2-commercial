import { TASK_DEFINITIONS, type TaskDefinition, type TaskState } from "../config/TaskConfig";
import type { PlayerProfile, RunSummary } from "../core/GameState";

export interface TaskViewModel extends TaskDefinition {
  progress: number;
  claimed: boolean;
  complete: boolean;
}

export class TaskService {
  static applyRun(profile: PlayerProfile, summary: RunSummary): void {
    profile.totalRounds += 1;
    profile.totalScore += summary.score;
    if (summary.yizaiMerged) profile.yizaiMergedTimes += 1;

    this.updateTask(profile, "finish_rounds", 1, "add");
    this.updateTask(profile, "max_level", summary.maxLevel, "max");
  }

  static applyShare(profile: PlayerProfile): void {
    this.updateTask(profile, "share", 1, "add");
  }

  static claim(profile: PlayerProfile, taskId: string): number {
    const definition = TASK_DEFINITIONS.find((task) => task.id === taskId);
    const state = profile.taskStates.find((task) => task.id === taskId);
    if (!definition || !state || state.claimed || state.progress < definition.target) return 0;

    state.claimed = true;
    profile.yizaiCoins += definition.rewardCoins;
    return definition.rewardCoins;
  }

  static getViewModels(profile: PlayerProfile): TaskViewModel[] {
    return TASK_DEFINITIONS.map((definition) => {
      const state = this.ensureState(profile, definition.id);
      return {
        ...definition,
        progress: Math.min(state.progress, definition.target),
        claimed: state.claimed,
        complete: state.progress >= definition.target
      };
    });
  }

  private static updateTask(
    profile: PlayerProfile,
    type: TaskDefinition["type"],
    value: number,
    mode: "add" | "max"
  ): void {
    for (const definition of TASK_DEFINITIONS) {
      if (definition.type !== type) continue;
      const state = this.ensureState(profile, definition.id);
      state.progress = mode === "add" ? state.progress + value : Math.max(state.progress, value);
    }
  }

  private static ensureState(profile: PlayerProfile, taskId: string): TaskState {
    let state = profile.taskStates.find((task) => task.id === taskId);
    if (!state) {
      state = { id: taskId, progress: 0, claimed: false };
      profile.taskStates.push(state);
    }
    return state;
  }
}
