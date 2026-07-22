# V2.0 状态记录

更新日期：2026-07-22

## 环境结论

- 正式工程：Cocos Creator 3.8.8 + TypeScript。
- 主程序：`D:\CocosCreator\versions\3.8.8\CocosCreator.exe`。
- 微信开发者工具已安装；正式 AppID 由用户发布时填写。
- Grok CLI `0.2.106` 曾完成原生 `image_gen` 探针；正式生产前仍须重新读取 `Get-Command`、`--help` 和 `--version`，只使用真实暴露的能力。

## 工程边界

- 不删除、不覆盖已发布 V1。
- `game/web-prototype` 和 `game/wechat-minigame` 只作玩法行为、数值、平台适配、测试方法和代码实现参考。
- V1、旧 `art/final`、旧 Cocos 资源、旧截图和既有美术风格全部禁止作为 V2 美术母版、Grok 参考图、Golden Slice 或 Bundle 资源。
- V2 正式工程位于 `game/cocos-creator-v2`。
- 所有皮肤随审核包内置并按本地 Asset Bundle / 微信普通分包加载，玩家解锁后直接使用；不做远程皮肤下载。

## 最新美术决策

- V2 全部可见美术从零重新设计和生产，美术风格不受 V1 糖果机方案约束。
- 先通过 Grok 制作 4–6 个原创商业风格方向，可以对标《开心消消乐》等头部休闲游戏的完成度、信息层级、色彩、触感和反馈节奏，但不得复制其可识别表达。
- 用户选定 Golden Slice 后，才能批量生产 UI、默认头像链、皮肤、图标和特效。
- 任何涉及亿仔的任务必须真实使用 `art/source/yizai_highest_source.png` 作为唯一正式身份参考；工具不能读取参考图时停止该任务。
- 唯一参考图 SHA256：`6B6C74F39FB8A92E8CD7B23BDD729D2E14BD76E38DE4C0CB0AD528638A7BCD12`。
- 详细规则：`docs/13_《合成亿仔》V2.0美术全量重制硬性边界.md`。

## 当前真实状态

- Cocos 场景、Prefab、本地分包、微信构建、包体门禁和 CloudBase 本地代码已有阶段性实现；具体证据见 `TASKS.md` 与 `DEVLOG.md`。
- 当前从旧 `art/final` 接入的全屏背景、按钮、头像和五套皮肤均为无效视觉占位，不得作为正式美术或 Golden Slice 已完成证据。
- 当前 `StateButton.prefab` 和旧按钮图不能证明真实 normal / pressed / disabled 已接入。
- 正式 V2 Grok 风格方向、用户批准的 Golden Slice 和全量新资源尚未完成。
- 旧预览截图只证明当时构建链可显示图片和切换场景，不证明商业美术质量。

## 下一步

1. 先读取 `AGENTS.md`、美术全量重制硬性边界、美术圣经 v2、资源需求表、`TASKS.md` 和 `DEVLOG.md`。
2. 修复 V2 资源导入门禁，只允许 `art/final/v2-commercial` 中的 approved 新资源进入 Bundle。
3. 重新探测 Grok CLI，建立真实参考图与 provenance 能力。
4. 生成并提交 4–6 套风格方向 Golden Slice，等待用户选择。
5. 用户批准后再批量生产、分层接入、构建和真机验收。
