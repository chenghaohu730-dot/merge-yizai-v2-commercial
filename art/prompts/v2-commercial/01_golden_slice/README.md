# Golden Slice 生产说明

本目录只负责代表性美术验证，不是批量生产目录。

执行前提：

- 使用 `../00_art_bible/《合成亿仔》V2.0美术圣经_v1.md` 和 `palette.json`。
- 新图使用已实测的 Grok 原生 `image_gen`；涉及亿仔身份保持时，必须先单独实测 `image_edit`，不得把未验证能力写进流水线。
- 每次调用只生成一张，记录提示词、Grok CLI 版本、原始会话图和输出 SHA256。
- 概念图不直接进入 Cocos；组件拆分、透明通道、安全圆、三态和小尺寸可读性通过后，才移动到 `art/final/v2-commercial`。

待评审资产：

- `home_concept`：2–3 候选。
- `game_concept`：2–3 候选。
- `primary_button` 三态：2 组候选。
- `modal_base` + `rank_item`：2 组候选。
- `face_01` / `face_05` / `face_10`：每项 2–3 候选。
- `face_11_yizai`：2 候选，必须 100% 通过品牌锁。
- `fx_merge_spark`：2 个方向。

否决项与通过签字记录写入后续 `golden-slice-review.json`。用户未确认前，完整头像链和所有皮肤保持禁止批量生产状态。
