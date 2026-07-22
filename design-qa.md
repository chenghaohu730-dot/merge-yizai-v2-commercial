# 合成亿仔概念图视觉验收

final result: passed

## Source

- 启动页参考图：`D:/Documents/xwechat_files/wxid_7huhikq24u1m21_48f0/temp/RWTemp/2026-06/9e20f478899dc29eb19741386f9343c8/6aa4896df690b6ebe26006f42501c2db.png`
- 游戏页参考图：`D:/Documents/xwechat_files/wxid_7huhikq24u1m21_48f0/temp/RWTemp/2026-06/9e20f478899dc29eb19741386f9343c8/3299e05d7e0e4bafd7f3d793538b4d33.png`
- 图像模型补图：`art/generated/imagegen-reference-empty-machine/imagegen_empty_machine.png`

## Result

- 启动页使用用户确认的第一张概念图作为运行母图，网页端和微信端均已同步。
- 游戏页使用图像模型生成的空玻璃机台作为运行底图，匹配第二张概念图的糖果机质感，同时不烘焙固定分数、静态球堆或假玩法状态。
- 实时分数、最高分、下一个头像、警戒线、掉落虚线、物理头像球仍由游戏绘制，避免概念截图和真实玩法互相重影。
- 桌面试玩保持 9:16 不变形；手机长屏填满高度，已通过多屏烟测。

## Evidence

- 启动页最终截图：`tests/device-checks/final-reference-visual/start-page-final.png`
- 游戏页最终截图：`tests/device-checks/final-reference-visual/playing-page-final.png`
- 参考与素材对比：`tests/device-checks/reference-concept-assets/reference_asset_comparison.png`
- 多屏截图：`tests/device-checks/viewport-smoke/`

## Checks

- `npm run build`: passed
- `npm run validate`: passed
- `npm run test:wechat`: passed
- `npm run test:viewport`: passed

## 2026-06-15 矮窗口适配收尾

- 修复网页试玩在窄且很矮的窗口中强行撑宽导致顶部被裁、底部按钮跑出机台槽位的问题。
- 保留长手机屏 `100vh` 延展逻辑；只在视口比例比 750:1334 更高瘦时启用全高模式，矮窗口回到按高度等比缩放。
- 网页试玩逻辑高度统一由实际画布比例计算，避免 DOM 按钮与 canvas 底座错位。
- `test:viewport` 增加 `short-desktop` 520x300 用例，并检查三个底部按钮都在画布边界内。
- 最新截图与摘要输出：`tests/device-checks/viewport-smoke/short-desktop-playing.png`、`tests/device-checks/viewport-smoke/summary.json`。

## 2026-06-15 Checks

- `npm run build`: passed
- `npm run test:viewport`: passed, 6 个视口
- `npm run test:wechat`: passed

## 2026-06-15 槽位对齐二次修正

- 根据用户截图复核运行时 `game_shell.png` 槽位网格，不再按旧估算坐标放按钮。
- 底部按钮槽心改为约 `x=200/375/550, y=1195`，按钮尺寸回收到 104，避免按钮金边覆盖底座槽金边造成漂浮感。
- 右上“下一个”小球面板改为 `x=571, y=91, w=108, h=108`，对齐素材圆槽中心约 `x=625, y=145`。
- 头像球大小和物理贴边保留上一版，不再继续放大。
- 新增人工核对截图：`tests/device-checks/viewport-smoke/user-window-align-check.png`。

## 2026-06-15 Alignment Checks

- `npm run build`: passed
- `npm run test:wechat`: passed
- `npm run test:viewport`: passed, 6 个视口
