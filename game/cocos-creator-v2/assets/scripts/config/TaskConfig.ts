export type TaskType = "login" | "finish_rounds" | "max_level" | "share";

export interface TaskDefinition {
  id: string;
  title: string;
  type: TaskType;
  target: number;
  rewardCoins: number;
}

export interface TaskState {
  id: string;
  progress: number;
  claimed: boolean;
}

export const DAILY_RESET_HOUR = 0;

export const TASK_DEFINITIONS: readonly TaskDefinition[] = [
  { id: "daily_login", title: "每日登录", type: "login", target: 1, rewardCoins: 20 },
  { id: "finish_rounds_3", title: "完成 3 局", type: "finish_rounds", target: 3, rewardCoins: 40 },
  { id: "merge_level_5", title: "合成到 5 级", type: "max_level", target: 5, rewardCoins: 50 },
  { id: "share_once", title: "分享 1 次", type: "share", target: 1, rewardCoins: 30 },
  { id: "merge_yizai", title: "合出亿仔", type: "max_level", target: 11, rewardCoins: 200 }
];

export function todayKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDailyTaskStates(): TaskState[] {
  return TASK_DEFINITIONS.map((task) => ({
    id: task.id,
    progress: task.type === "login" ? 1 : 0,
    claimed: false
  }));
}
