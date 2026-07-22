# Golden Slice 生产说明

本目录只负责 V2 全新风格方向与代表性组件验证，不是批量生产目录。

## 最高优先级边界

- 使用 `../00_art_bible/《合成亿仔》V2.0美术圣经_v2.md`。
- `《合成亿仔》V2.0美术圣经_v1.md`、旧 `palette.json` 色板、旧概念提示词、V1/旧 Cocos 图片和历史截图均已废止，禁止作为生产输入。
- 已发布 V1 只作玩法行为和代码参考；V2 所有可见美术从零重新生成。
- 除本机正式亿仔源图外，任何旧图片不得进入 Grok `references`。
- 可以对标《开心消消乐》等头部休闲游戏的商业完成度，但不得复制其角色、Logo、图标、布局、按钮、文案或可识别商业外观。

## Grok 执行前提

- 先重新执行 `Get-Command grok`、`grok --help` 和 `grok --version`，将真实能力写入 `_tooling/grok-cli-capabilities.md`。
- 只使用 help 中已验证的能力，不猜 `image_edit`、参考图、透明 PNG、精确尺寸、seed 或批量参数。
- 每次调用保存实际命令、提示词、Grok 版本、原始输出、参考图、尺寸和 SHA256。
- 如果工具不能真实读取图片参考，所有涉及亿仔的任务停止；不得仅凭文字生成亿仔。

## 第一轮：4–6 个风格方向

每个方向必须使用相同的功能范围，至少提供：

- 首页分层合成预览。
- 局内分层合成预览。
- 主按钮 normal / pressed / disabled。
- 通用弹窗和一条排行行。
- 全新原创 `face_01` / `face_05` / `face_10`。
- `face_11_yizai`，必须真实使用 `art/source/yizai_highest_source.png`。
- `fx_merge_spark` 代表方向。

各方向必须在构图、材质、描边、色板和光照上有实质差异，不能只换颜色。先提交方向联系表让用户选择，不得自行宣布某个方向胜出。

## 第二轮：短名单候选

用户选出方向短名单后，每项再做 2–3 个候选。自动筛选后，只把 1–2 个合格版本交给用户确认。

按钮底图不得包含文字：

- normal：完整结构、高光和底部厚度。
- pressed：视觉下移 6 px、高光减弱、底部厚度缩短；热区不移动。
- disabled：降低饱和和明度但保留轮廓与材质，不能仅降低透明度。

## 亿仔唯一参考要求

```text
path: art/source/yizai_highest_source.png
sha256: 6B6C74F39FB8A92E8CD7B23BDD729D2E14BD76E38DE4C0CB0AD528638A7BCD12
```

每个涉及亿仔的 job 和 manifest 都必须包含这两个字段，并保持白熊、橙黄色口鼻区、黑色大鼻子、粗眉、头饰和正面清晰正确的 `MAEE`。生成后人工放大复核，必要时使用从正式参考源提取并批准的确定性字标覆盖。

## 目录与导入门禁

```text
art/generated/v2-commercial
→ art/review/v2-commercial
→ 用户确认
→ art/final/v2-commercial
→ Cocos
```

- 概念图、风格联系表和未批准候选不得进入 Cocos。
- 组件尺寸、透明通道、安全区、九宫格、三态和小尺寸可读性全部通过后，才能标记 `approved`。
- 只有 `art/final/v2-commercial` 中带批准记录的新资源可以进入 Bundle。

否决项：旧图复用、缺少亿仔参考图、错误或缺失 `MAEE`、现成 IP/真人脸、竞品可识别复制、动态文字烘焙、物理安全圆越界、组件无法分层、伪三态、尺寸错误、AI 乱码或水印。

用户未确认 Golden Slice 前，完整 UI、全部头像和所有皮肤保持禁止批量生产状态。
