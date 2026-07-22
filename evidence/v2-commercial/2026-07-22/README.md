# V2.0 本地分包与可信榜单实现证据

记录日期：2026-07-22

## Cocos Creator 构建

- 版本：Cocos Creator 3.8.8
- 工程：`game/cocos-creator-v2`
- 平台：`wechatgame`
- 构建 AppID：`touristappid`（正式 AppID 由发布者在联调/发布时填写）
- 构建日志：`cocos-wechat-build-final.stdout.log`、`cocos-wechat-build-final.stderr.log`（本机保留，日志按仓库规则不提交）
- 日志结论：`build Task (wechatgame) Finished`
- CLI 进程返回码：36。Cocos Creator 3.8 官方将 36 定义为“构建成功”（32 为参数错误，34 为构建过程失败）；最终产物另由结构、字节和 hash 审计确认。
- 官方命令行依据：<https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-in-command-line.html>

复现命令：

```powershell
& 'D:\CocosCreator\versions\3.8.8\CocosCreator.exe' `
  --project 'D:\01_Codex源码项目\微信小游戏\game\cocos-creator-v2' `
  --build 'platform=wechatgame;appid=touristappid'
```

## 最终包体

完整机器可读报告见 `wechat-package-audit-final.json`。

| 部分 | 文件数 | 字节数 | SHA256 |
| --- | ---: | ---: | --- |
| main | 24 | 2,313,447 | `1d2c8c3073fff50eb6d137f3f311d6fd3d55f6b991de23d3692f9e701e3f9890` |
| core_game | 165 | 6,474,090 | `77cfdd922a1f0934902f1f0233746610e1a8da398c3f3d957c50cc1b81ab3de3` |
| meta_ui | 9 | 3,670 | `b95ced785607ea050144dfae7d987b1bff1793649f3bc1743996fcdca89e4a70` |
| skin_jelly_v2 | 37 | 806,021 | `4936b0fce0976802ad48190bbaafca67156c71e29b0b731aa6d6a255cb6d1b99` |
| skin_star_v2 | 37 | 876,411 | `88fcbfa72d6e2d5b12d5b1cf891c4c0c6070ea5bbde2d4788e74aa76641e64b9` |
| skin_cream_v2 | 37 | 824,502 | `e9b4161b73699141841a230a110a74ddd7f27f75f2e73eb6752f8a08991e2f3e` |
| skin_coin_v2 | 37 | 1,004,440 | `564f2cac7170e99c7b5222cf707d278a7810278a4666e8ba6f3239e7f18d20e6` |
| skin_festival_v2 | 37 | 878,275 | `6da0f46cdc5c992d078923024f205cf75c67485dd7273c067ce385ec17a5ee7d` |
| total | 383 | 13,180,856 | `5fc79ef2c6dccbf2af29636eb604acc56d864b40c524c3e8453b221be81ccf0e` |

审计结果：`errors=[]`、`warnings=[]`。所有皮肤包均为本地普通分包，`game.json` 没有远程包配置。

微信小游戏官方限制为主包不超过 4M、主包与分包总计不超过 20M，单个普通分包不限制大小；本项目仍采用更严格的 3.3 MiB 主包和 16 MiB 总包内部门禁。依据：<https://intl.cloud.tencent.com/zh/document/product/1219/68072>。

## 自动测试

| 范围 | 结果 |
| --- | --- |
| Cocos V2 结构/资源验证 | 通过 |
| 本地 Bundle 合同、hash、重试、回退、包体门禁 | 11/11 通过 |
| Cocos TypeScript strict `--noEmit` | 通过 |
| CloudBase 合同、服务、打包与客户端接线 | 24/24 通过 |
| CloudBase 云函数打包 | 6 个函数，66 文件，253,662 字节 |
| CC0 音频来源、hash、编码与峰值审计 | 通过；7 个运行时文件，707,963 字节 |
| V1 项目验证 | 548 项通过；3,927,987 字节 |
| V1 微信运行时 smoke | 20 帧、1,072 draw ops，通过 |
| 430×765 浏览器 Home → Game | 通过；控制台 0 error / 0 warning |

## 视觉证据

- `output/playwright/yizai-v2-home-golden-slice-430x765.png`
- `output/playwright/yizai-v2-game-golden-slice-430x765.png`

截图证明当前商业候选背景方向、正面清晰的 MAEE 亿仔和程序点击区/场景切换已经接入。截图不证明物理玩法已经完成；Game 场景仍需挂接真实玩法 Prefab 才能满足阶段 1 退出条件。

## 未冒充完成的外部验收

- 尚未在正式 AppID 的微信开发者工具和真机中运行。
- 尚未部署到用户的 CloudBase 环境，也未做双账号真实互榜。
- Grok 本轮新图请求遇到上游传输/500 错误，批量美术生产未开始。
