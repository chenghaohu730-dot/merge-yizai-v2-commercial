import { EventTarget } from "cc";

export const gameEvents = new EventTarget();

export const GameEvents = {
  StartRun: "start-run",
  PauseRun: "pause-run",
  ResumeRun: "resume-run",
  RestartRun: "restart-run",
  BackHome: "back-home",
  OpenTasks: "open-tasks",
  OpenShop: "open-shop",
  OpenRank: "open-rank",
  FaceContact: "face-contact",
  FaceDropped: "face-dropped",
  MergeResolved: "merge-resolved",
  ScoreChanged: "score-changed",
  WarningChanged: "warning-changed",
  RunEnded: "run-ended",
  ProfileChanged: "profile-changed",
  ShareScore: "share-score"
} as const;
