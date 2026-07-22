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

### 尚未完成

- 备份空 `.git`、初始化仓库、建立基线标签并推送 GitHub。
- Cocos 真实场景、Prefab、构建与微信开发者工具验证。
- CloudBase 真实环境和双账号真机榜单验证。

