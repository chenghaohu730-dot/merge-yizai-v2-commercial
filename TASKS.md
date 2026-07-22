# 《合成亿仔》V2.0 执行任务

更新日期：2026-07-22

## 当前锁定口径

- V2.0 正式工程：Cocos Creator 3.8.8 + TypeScript。
- V1 Web 与微信 Canvas 版本仅作行为和视觉基线。
- 主包保持最小，功能与皮肤使用本地 Asset Bundle / 微信普通分包。
- 所有皮肤随安装包内置，玩家解锁后直接使用，不做远程下载。
- 全服榜使用 CloudBase 接口设计；无正式 AppID 时先完成本地 mock、合同测试和可部署云函数源码。
- Grok 已完成真实图片生成探针；美术圣经与 Golden Slice 通过后才批量生产。

## 阶段 0：恢复可追溯地基

- [x] 完整读取 AGENTS、第二版审计、V2.0 总控、美术资源表、v2-cocos 文档和 V2_STATUS。
- [x] 核对当前 V1/V2 源码、工具版本、包体与关键 SHA256。
- [x] 证明 Grok 原生 `image_gen` 可被无界面命令调用。
- [x] 备份损坏的空 `.git`，初始化新仓库和 Git LFS。
- [x] 建立 V1 商业基线提交与标签。
- [x] 创建并推送私有 GitHub 仓库。
- [x] 固化阶段 0 构建、测试和包体证据。

## 阶段 1：Cocos 正式工程与本地分包

- [x] 创建真实 Boot、Home、Game、Result 场景与 9 个必要 Prefab。
- [x] 建立 domain、application、presentation、platform 分层和本地 Bundle 运行层。
- [x] 配置 main、core_game、meta_ui 和 5 个逐皮肤本地 Bundle；全部 `isRemote=false`。
- [x] 建立资源清单、构建 hash、逐包与总包体门禁。
- [ ] 默认资源缺失时进入正式错误态，不使用廉价代码 fallback。
- [x] 用 Cocos Creator 3.8.8 完成资源导入、TypeScript 检查和微信构建导出。
- [x] 验证 `game.json` 含 7 个本地普通分包，主包 `2,313,447` 字节，总包 `13,180,856` 字节。
- [ ] 将玩法组件与真实物理 Prefab 完整挂入 Game 场景，使默认局达到阶段退出条件。
- [ ] 使用微信开发者工具打开构建并补充正式 AppID 真机证据。

## 阶段 2：玩法对齐与自然失败

- [ ] 冻结 V1 物理与得分 fixture。
- [ ] 对齐掉落、合成、警戒、暂停、重开和结算。
- [ ] 新增自然失败及 100–1000 局模拟。
- [ ] 修复连续天数与 V1 存档迁移。

## 阶段 3：CloudBase 全服榜

- [x] 实现 runStart、runFinish、服务端重算、事务抽象和幂等。
- [x] 实现 Top100、我的名次、附近名次和签名游标分页。
- [x] 实现周榜、赛季榜、历史榜、审核队列和最低反作弊规则。
- [x] 205 人数据集与客户端完整调用链通过 24 项本地合同/集成测试。
- [x] 生成 6 个可部署 CloudBase 云函数包。
- [ ] 在真实 CloudBase 环境创建集合、索引和安全规则，验证真实事务与 OPENID。
- [ ] 用至少两个微信账号完成真机互榜、断网重试和 P95 验收。

## 阶段 4：商业美术、音频与完整闭环

- [x] 完成 V2.0 美术圣经、色板、首页/局内 Golden Slice 提示词和候选画面接入。
- [ ] 用户确认 Golden Slice 方向后，再启动 Grok 批量生产。
- [ ] 替换可见代码绘制背景、按钮、面板、头像 fallback 和粒子。
- [x] 接入经典链与 5 套内置皮肤；1–10 级换肤，11 级固定合规亿仔，皮肤不改变玩法数值。
- [x] 下载并接入 7 个 CC0 商业音频，保存来源、许可、逐文件 hash 和编码审计。
- [ ] 完成任务、亿仔币、皮肤、排行和分享闭环。

## 本轮可复核证据

- 微信构建审计：`evidence/v2-commercial/2026-07-22/wechat-package-audit-final.json`。
- 首页截图：`output/playwright/yizai-v2-home-golden-slice-430x765.png`。
- 游戏场景截图：`output/playwright/yizai-v2-game-golden-slice-430x765.png`。
- Cocos 本地 Bundle 测试：11/11 通过；CloudBase：24/24 通过；V1：548 项验证及微信 20 帧 smoke 通过。
- 当前阶段 1 尚未退出：商业场景骨架可运行，但真实物理默认局尚未完整挂载；不得将 V2 报为完整可玩成品。
