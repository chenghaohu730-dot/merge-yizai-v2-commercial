import { _decorator, Component, Label, Node } from "cc";
import { GameEvents, gameEvents } from "../core/EventBus";
import type { PlayerProfile } from "../core/GameState";
import { ShopService } from "../services/ShopService";

const { ccclass, property } = _decorator;

@ccclass("ShopView")
export class ShopView extends Component {
  @property(Label)
  coinLabel: Label | null = null;

  @property(Label)
  listLabel: Label | null = null;

  @property(Node)
  firstActionButton: Node | null = null;

  @property(Node)
  backButton: Node | null = null;

  private profile: PlayerProfile | null = null;

  onEnable(): void {
    this.firstActionButton?.on(Node.EventType.TOUCH_END, this.buyOrSelectFirstAvailable, this);
    this.backButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(GameEvents.BackHome), this);
  }

  onDisable(): void {
    this.firstActionButton?.off(Node.EventType.TOUCH_END);
    this.backButton?.off(Node.EventType.TOUCH_END);
  }

  refresh(profile: PlayerProfile): void {
    this.profile = profile;
    if (this.coinLabel) this.coinLabel.string = String(profile.yizaiCoins);
    if (!this.listLabel) return;
    this.listLabel.string = ShopService.list(profile)
      .map((skin) => `${skin.selected ? "使用中" : skin.unlocked ? "已解锁" : `${skin.price}币`} ${skin.name}`)
      .join("\n");
  }

  private buyOrSelectFirstAvailable(): void {
    if (!this.profile) return;
    const target = ShopService.list(this.profile).find((skin) => !skin.selected && (skin.unlocked || skin.canBuy));
    if (!target) return;
    if (target.unlocked) ShopService.select(this.profile, target.id);
    else ShopService.buy(this.profile, target.id);
    gameEvents.emit(GameEvents.ProfileChanged);
  }
}
