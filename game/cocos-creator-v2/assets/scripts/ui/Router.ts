import { _decorator, Component, Node } from "cc";

const { ccclass, property } = _decorator;

@ccclass("Router")
export class Router extends Component {
  @property(Node)
  homePage: Node | null = null;

  @property(Node)
  gamePage: Node | null = null;

  @property(Node)
  resultPage: Node | null = null;

  @property(Node)
  taskPage: Node | null = null;

  @property(Node)
  shopPage: Node | null = null;

  @property(Node)
  rankPage: Node | null = null;

  @property(Node)
  pauseOverlay: Node | null = null;

  showHome(): void {
    this.showOnly(this.homePage);
  }

  showGame(): void {
    this.showOnly(this.gamePage);
    this.hidePauseOverlay();
  }

  showResult(): void {
    this.showOnly(this.resultPage);
  }

  showTasks(): void {
    this.showOnly(this.taskPage);
  }

  showShop(): void {
    this.showOnly(this.shopPage);
  }

  showRank(): void {
    this.showOnly(this.rankPage);
  }

  showPauseOverlay(): void {
    if (this.pauseOverlay) this.pauseOverlay.active = true;
  }

  hidePauseOverlay(): void {
    if (this.pauseOverlay) this.pauseOverlay.active = false;
  }

  private showOnly(activePage: Node | null): void {
    for (const page of [this.homePage, this.gamePage, this.resultPage, this.taskPage, this.shopPage, this.rankPage]) {
      if (page) page.active = page === activePage;
    }
  }
}
