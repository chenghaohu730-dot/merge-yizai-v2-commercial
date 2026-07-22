import { _decorator, Component, director } from "cc";
import { WechatAdapter } from "../platform/WechatAdapter";

const { ccclass } = _decorator;

@ccclass("Boot")
export class Boot extends Component {
  start(): void {
    WechatAdapter.enableShareMenu();
    director.loadScene("Home");
  }
}
