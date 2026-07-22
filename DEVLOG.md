# 《合成亿仔》V2.0 开发日志

## 2026-07-22：阶段 0 现场核对

### 已确认

- Cocos Creator：`3.8.8`，路径 `D:\CocosCreator\versions\3.8.8\CocosCreator.exe`。
- 微信开发者工具：`2.01.2510290`。
- Node：`v24.15.0`；npm：`11.12.1`；Git：`2.54.0.windows.1`；Git LFS：`3.7.1`。
- V1 微信工程总文件字节数：`3,927,987`；`game.json.subpackages` 为空；AppID 为 `touristappid`。
- `npm run validate`：548 项通过，报告包体 `3,927,987` 字节。
- `npm run test:wechat`：通过，20 帧、1072 次绘制操作。
- `npm run validate`（Cocos V2）：通过，但只代表结构检查。
- Cocos V2 当前有 32 个 TypeScript 文件；`.scene`、`.prefab`、`.meta` 均为 0，尚不是可运行工程。
- 根目录原 `.git` 是空目录，`git status`、`git log` 和 `git rev-parse` 均失败。
- `TASKS.md`、`DEVLOG.md`、`.gitignore` 原先不存在。
- Grok `0.2.106` 已登录；真实调用内置 `image_gen` 成功生成 1024×1024 JPG 探针。
- 原空 `.git` 已原样移至 `.git.broken-20260722-1610`，其中项目数为 0；随后重新初始化 `main` 和 Git LFS。
- V1 商业基线提交：`30a8bbf310caba1540808a28b68efd1b47131ee6`。
- V1 商业基线标签：`v1-commercial-baseline-20260722`（标签对象 `43784aa05ece4232159650bce4afee5f38414f7f`）。
- 私有 GitHub 仓库：`https://github.com/chenghaohu730-dot/merge-yizai-v2-commercial`；`main` 与基线标签均已推送。
- 首次基线共纳入 843 个文件；405 个路径由 Git LFS 跟踪，对应 346 个唯一 LFS 对象，本地对象字节数约 `164,916,519`。

### 关键基线 SHA256

| 文件 | SHA256 |
| --- | --- |
| `game/wechat-minigame/game.js` | `36B8A7714DDDABBC1D84FAD513E2AD6001949E35DBE886490CAB9395B880A9A5` |
| `game/wechat-minigame/game.json` | `53BF5D38FF4D913C4BB7E262273C66573AE2511CD3EB608834C3181289C030FE` |
| `game/web-prototype/src/main.ts` | `7A1ACD865D0F41F10FDE07AE8261D97B3A9268D115AA79BDC7873B91FC38EB8F` |
| `game/web-prototype/src/styles.css` | `07618DE26017F9692287B4AEF29099DD7F8163236954EFC0C61B8FE2D5FE1857` |
| `game/cocos-creator-v2/assets/scripts/core/GameManager.ts` | `76CD0DE93A66E8D884C0931AC515E09DE96F1A10A617C2F842B9BD23F2F2EC8E` |
| `art/source/yizai_highest_source.png` | `6B6C74F39FB8A92E8CD7B23BDD729D2E14BD76E38DE4C0CB0AD528638A7BCD12` |

### 用户最新决策

- 正式 AppID 由用户发布时自行填写；开发阶段保留占位配置。
- 皮肤全部随游戏内置，不做远程下载。实现采用逐皮肤本地 Bundle / 微信普通分包，以保护主包预算。
- 远程 CDN 不进入当前范围。
- 音频从授权清晰的线上来源重新选择并下载，优先 CC0/免署名。

### 阶段 0 结论

- 阶段 0 已完成：V1 行为、源码、包体、工具链、关键 hash、Git 基线和私有远端均有可追溯证据。
- 后续阶段不得改写 V1 双端；只在 `game/cocos-creator-v2` 和 V2 后端/工具目录继续实现。

### 尚未完成

- Cocos 真实场景、Prefab、构建与微信开发者工具验证。
- CloudBase 真实环境和双账号真机榜单验证。

## 2026-07-22：阶段 1 本地分包骨架与 Golden Slice 构建

### 已实现

- 创建 4 个可导入场景：`Boot`、`Home`、`Game`、`Result`；创建头像、状态按钮、通用弹窗、任务、商店和排行所需的 9 个 Prefab。
- `Boot` 只负责加载随包内置的 `core_game`，随后进入 `Home`；没有皮肤 CDN、远程 Asset Bundle、远程缓存或二次下载逻辑。
- 建立 `main`、`core_game`、`meta_ui`、`skin_jelly_v2`、`skin_star_v2`、`skin_cream_v2`、`skin_coin_v2`、`skin_festival_v2` 共 8 个 Bundle；除 main 外均导出为微信普通分包且 `isRemote=false`。
- 皮肤加载支持并发去重、最多 3 次退避重试和 `classic_v2` 本地回退；玩家解锁后直接从内置分包装备。1–10 级允许换肤，11 级固定使用 `core_game` 内合规亿仔。
- 旧 `assets/resources` 迁移为不参与构建的 `assets/legacy_resources_v1`，保留 V1 参考资产且不塞入主包。
- Cocos 引擎模块缩减到 2D、UI、Box2D、音频、Tween 等实际所需模块，未启用 3D、Ammo、Spine、WebView、Video 等无关模块。
- 商业首页、游戏背景和结算面板由 SpriteFrame 载入；点击区域和场景切换继续由程序负责。浏览器检查发现并修复了 SpriteFrame 垂直翻转问题。

### 最终微信构建证据

- 构建器：Cocos Creator `3.8.8`，参数 `--project game/cocos-creator-v2 --build "platform=wechatgame;appid=touristappid"`。
- Creator 日志明确记录 `build Task (wechatgame) Finished`，进程返回码为 `36`；Cocos Creator 3.8 官方命令行文档将 `36` 定义为“构建成功”（`32/34` 才是失败）。
- 构建文件：`383` 个，总计 `13,180,856` 字节。
- 主包：`2,313,447` 字节，SHA256 `1d2c8c3073fff50eb6d137f3f311d6fd3d55f6b991de23d3692f9e701e3f9890`。
- 整包排序内容 hash：`5fc79ef2c6dccbf2af29636eb604acc56d864b40c524c3e8453b221be81ccf0e`。
- 分包字节数：`core_game 6,474,090`；`meta_ui 3,670`；`jelly 806,021`；`star 876,411`；`cream 824,502`；`coin 1,004,440`；`festival 878,275`。
- 包体审计 `errors=[]`、`warnings=[]`；主包低于项目 3.3 MiB 门禁，整包低于 16 MiB 内部目标和 20 MiB 硬门禁。
- `game.json` 只有上述 7 个本地 `subpackages`，没有远程包字段。

### 自动验证

- Cocos V2 结构与资源验证：通过。
- 本地 Bundle、hash、解锁即用、重试、fallback、11 级亿仔锁定和包体门禁测试：`11/11` 通过。
- Cocos Creator 自带 TypeScript 编译器，`--noEmit` strict 检查：通过。
- V1 回归：`548` 项验证通过，包体仍为 `3,927,987` 字节；微信 smoke `20` 帧、`1,072` 次绘制操作通过。
- 浏览器 430×765 视口：Home → Game 点击链路通过，页面控制台 `0 error / 0 warning`。

### 阶段 1 当前结论

- 场景、Prefab、本地分包、资源导入、微信导出、包体和 hash 骨架已完成。
- 阶段 1 仍未达到退出条件：Game 场景目前是可切换的商业 Golden Slice 外壳，玩法物理组件和真实默认局尚未完整挂载；微信开发者工具/真机也未验收。

## 2026-07-22：CloudBase 可信榜单代码切片

### 已实现和验证

- 6 个接口：`profileGet`、`runStart`、`runFinish`、`rankTop`、`rankAroundMe`、`rankPage`。
- 服务端下发 seed/nonce，按有序事件重算分数；客户端 claim 只用于诊断，不能直接写榜或成为可信分数。
- 加入事务抽象、请求幂等、运行归属校验、事件摘要、异常合成/篡改分数拒绝或审核、失败持久重试。
- 周榜、赛季榜、历史榜同时写入；205 人夹具验证 Top100、准确第 137 名、附近名次和完整游标遍历。
- 合同与集成测试 `24/24` 通过；服务端语法检查通过。
- 已生成 6 个自包含云函数目录，共 `66` 个文件、`253,662` 字节。

### 真实环境最小缺口

- 需要 CloudBase 环境 ID 后才能部署集合、索引、安全规则和云函数，并验证真实 OPENID/事务。
- 正式 AppID 仅在用户准备微信开发者工具和真机联调时需要；不阻塞当前本地实现。
- 真实退出条件仍需两个以上微信账号完成互榜、弱网重试和 P95 验收。

## 2026-07-22：商业美术与 CC0 音频

### 已实现和验证

- 完成 V2.0 美术圣经、色板、Golden Slice 提示词和 Grok CLI 适配器；适配器先按真实 `Get-Command`、`help`、`version` 结果实现，没有猜测参数。
- Grok 版本 `0.2.106`，早期 `image_gen` 探针成功；本轮 Golden Slice 新图请求连续遇到 x.ai 传输/500 错误，因此没有伪报生成成功，也未启动批量生产。
- 将现有商业质量首页/局内候选画面接入真实 Cocos 场景，并留存 430×765 浏览器截图供用户确认方向。
- 下载并归档 Dustyroom 50 个 CC0 SFX 和 qubodup 2 个 CC0 音乐源，保存许可证、来源 URL、下载日期、逐文件 SHA256 和 ffprobe 信息。
- 生成 7 个运行时音频，共 `707,963` 字节；来源、hash、编码、采样率、声道和峰值余量审计全部通过。

### 尚未完成

- Golden Slice 尚待用户确认；后续 UI Kit、原创默认头像链和批量皮肤生产不得提前启动。
- 全量界面、头像 fallback、粒子和完整任务/商店/排行视觉替换尚未完成。
- 音频真机听感、切后台/来电/静音恢复仍待设备验收。
