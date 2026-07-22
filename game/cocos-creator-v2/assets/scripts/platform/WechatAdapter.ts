import type { RunSummary } from "../core/GameState";

type WechatLike = {
  showShareMenu?: (options: Record<string, unknown>) => void;
  shareAppMessage?: (options: Record<string, unknown>) => void;
  getOpenDataContext?: () => unknown;
  cloud?: unknown;
};

function getWx(): WechatLike | null {
  return (globalThis as { wx?: WechatLike }).wx || null;
}

export class WechatAdapter {
  static readonly isWechat = !!getWx();

  static enableShareMenu(): void {
    getWx()?.showShareMenu?.({ withShareTicket: true, menus: ["shareAppMessage"] });
  }

  static shareScore(summary: RunSummary): void {
    const title = summary.yizaiMerged
      ? `我合出了亿仔，拿到 ${summary.score} 分`
      : `我在合成亿仔冲到 ${summary.score} 分`;
    getWx()?.shareAppMessage?.({
      title,
      imageUrl: "assets/ui/share_card.png"
    });
  }

  static hasOpenDataContext(): boolean {
    return Boolean(getWx()?.getOpenDataContext);
  }

  static hasCloud(): boolean {
    return Boolean(getWx()?.cloud);
  }
}
