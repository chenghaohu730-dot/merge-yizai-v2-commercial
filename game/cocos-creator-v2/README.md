# 合成亿仔 V2.0 Cocos 工程

这是新的 Cocos Creator 3.8 LTS 迁移工程骨架。旧版 `game/web-prototype` 和 `game/wechat-minigame` 只作为玩法、数值、美术方向参考，不作为最终代码标准。

当前本机没有检测到 Cocos Creator，所以本目录先交付：

- Cocos 3.8 目标工程结构。
- 头像链、任务、商店、按钮三态、场景清单数据。
- 可迁入 Cocos 的 TypeScript 组件方案。
- 微信小游戏排行榜、开放数据域、云开发接口预留。
- 资源与包体拆分规范。

安装 Cocos Creator 3.8 LTS 后，用 Creator 创建/打开本目录，再按 `docs/v2-cocos/02_场景节点蓝图.md` 搭建 Boot、Home、Game、Result、Task、Shop、Rank 场景。

验证：

```text
npm run validate
```

验证只检查 V2.0 结构、数据和资源完整性，不代表已经通过 Cocos 编辑器运行。
