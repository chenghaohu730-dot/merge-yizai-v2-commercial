# 《合成亿仔 V2.0》美术资产验收报告

## 汇总

- PASS: 2
- AUTO_FIXED: 80
- MANUAL_REVIEW: 0
- NEEDS_REGEN: 4
- MISSING: 136
- 未匹配原图/预览拼贴退回: 7

## 关键结论

- 本次只做资产工程化整理，没有接入游戏代码，也没有改动旧版 `game/wechat-minigame`。
- 大量 PNG 原图实际为 RGB 且烘焙了棋盘格/白底；脚本只在能从边缘可靠识别背景时生成 alpha。
- 多状态合图、预览图、未在需求表中的图片已退回到 `assets_rejected/`，不作为正式资源。
- 亿仔相关资源使用 OCR 和色彩特征做自动初筛；凡自动无法完全确认的，保留人工复核结论。

## 需优先关注

- `game_playfield_frame`: NEEDS_REGEN；玻璃仓边框；中心透明区域仍检测到不透明棋盘格，无法可靠自动修复
- `face_11_yizai`: NEEDS_REGEN；默认合成球；圆心 256,256，主体最大直径 460px，四周 26px 透明安全边距；亿仔主体和 MAEE 方向正确，但边缘残留明显棋盘格/白边抠图污染，最终球体必须重新生成透明 PNG
- `skin_jelly_face_01`: MISSING；jelly 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_jelly_face_02`: MISSING；jelly 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_jelly_face_03`: MISSING；jelly 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_jelly_face_04`: MISSING；jelly 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_jelly_face_05`: MISSING；jelly 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_jelly_face_06`: MISSING；jelly 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_jelly_face_07`: MISSING；jelly 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_jelly_face_08`: MISSING；jelly 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_jelly_face_09`: MISSING；jelly 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_jelly_face_10`: MISSING；jelly 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_preview_jelly`: MISSING；jelly 皮肤商店预览
- `skin_star_face_01`: MISSING；star 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_star_face_02`: MISSING；star 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_star_face_03`: MISSING；star 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_star_face_04`: MISSING；star 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_star_face_05`: MISSING；star 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_star_face_06`: MISSING；star 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_star_face_07`: MISSING；star 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_star_face_08`: MISSING；star 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_star_face_09`: MISSING；star 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_star_face_10`: MISSING；star 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_preview_star`: MISSING；star 皮肤商店预览
- `skin_cream_face_01`: MISSING；cream 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_cream_face_02`: MISSING；cream 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_cream_face_03`: MISSING；cream 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_cream_face_04`: MISSING；cream 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_cream_face_05`: MISSING；cream 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_cream_face_06`: MISSING；cream 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_cream_face_07`: MISSING；cream 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_cream_face_08`: MISSING；cream 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_cream_face_09`: MISSING；cream 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_cream_face_10`: MISSING；cream 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_preview_cream`: MISSING；cream 皮肤商店预览
- `skin_coin_face_01`: MISSING；coin 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_coin_face_02`: MISSING；coin 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_coin_face_03`: MISSING；coin 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_coin_face_04`: MISSING；coin 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_coin_face_05`: MISSING；coin 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_coin_face_06`: MISSING；coin 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_coin_face_07`: MISSING；coin 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_coin_face_08`: MISSING；coin 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_coin_face_09`: MISSING；coin 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_coin_face_10`: MISSING；coin 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_preview_coin`: MISSING；coin 皮肤商店预览
- `skin_festival_face_01`: MISSING；festival 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_festival_face_02`: MISSING；festival 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_festival_face_03`: MISSING；festival 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_festival_face_04`: MISSING；festival 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_festival_face_05`: MISSING；festival 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_festival_face_06`: MISSING；festival 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_festival_face_07`: MISSING；festival 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_festival_face_08`: MISSING；festival 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_festival_face_09`: MISSING；festival 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_festival_face_10`: MISSING；festival 皮肤球；仅改变前 10 级外观，不影响数值
- `skin_preview_festival`: MISSING；festival 皮肤商店预览
- `btn_resume_normal`: MISSING；继续游戏按钮 normal
- `btn_resume_pressed`: MISSING；继续游戏按钮 pressed
- `btn_resume_disabled`: MISSING；继续游戏按钮 disabled
- `rank_panel`: NEEDS_REGEN；排行榜弹窗，不写具体排名和名字；OCR 疑似动态数字：ve

eo@:s- ))

a * ETT 18 t=

|

| |

/ ]
\

|_|

N

|
- `result_panel`: NEEDS_REGEN；结算弹窗，不写分数数字；OCR 疑似动态数字：Toh vac POW re Se ae
( ‘ "ae AD 8 Aa —a }
ee | rip Geo S¢
=S =o.
S 4
| Ww LT
Ke 
- `btn_again_normal`: MISSING；再来一局按钮 normal
- `btn_again_pressed`: MISSING；再来一局按钮 pressed
- `fx_merge_spark_001`: MISSING；普通合成特效；序列帧 1/12，fps 12
- `fx_merge_spark_002`: MISSING；普通合成特效；序列帧 2/12，fps 12
- `fx_merge_spark_003`: MISSING；普通合成特效；序列帧 3/12，fps 12
- `fx_merge_spark_004`: MISSING；普通合成特效；序列帧 4/12，fps 12
- `fx_merge_spark_005`: MISSING；普通合成特效；序列帧 5/12，fps 12
- `fx_merge_spark_006`: MISSING；普通合成特效；序列帧 6/12，fps 12
- `fx_merge_spark_007`: MISSING；普通合成特效；序列帧 7/12，fps 12
- `fx_merge_spark_008`: MISSING；普通合成特效；序列帧 8/12，fps 12
- `fx_merge_spark_009`: MISSING；普通合成特效；序列帧 9/12，fps 12
- `fx_merge_spark_010`: MISSING；普通合成特效；序列帧 10/12，fps 12
- `fx_merge_spark_011`: MISSING；普通合成特效；序列帧 11/12，fps 12
- `fx_merge_spark_012`: MISSING；普通合成特效；序列帧 12/12，fps 12
- `fx_big_merge_001`: MISSING；高等级合成特效；序列帧 1/16，fps 12
- `fx_big_merge_002`: MISSING；高等级合成特效；序列帧 2/16，fps 12
- `fx_big_merge_003`: MISSING；高等级合成特效；序列帧 3/16，fps 12
- `fx_big_merge_004`: MISSING；高等级合成特效；序列帧 4/16，fps 12
- `fx_big_merge_005`: MISSING；高等级合成特效；序列帧 5/16，fps 12
- `fx_big_merge_006`: MISSING；高等级合成特效；序列帧 6/16，fps 12
- `fx_big_merge_007`: MISSING；高等级合成特效；序列帧 7/16，fps 12
- `fx_big_merge_008`: MISSING；高等级合成特效；序列帧 8/16，fps 12
- `fx_big_merge_009`: MISSING；高等级合成特效；序列帧 9/16，fps 12
- `fx_big_merge_010`: MISSING；高等级合成特效；序列帧 10/16，fps 12
- `fx_big_merge_011`: MISSING；高等级合成特效；序列帧 11/16，fps 12
- `fx_big_merge_012`: MISSING；高等级合成特效；序列帧 12/16，fps 12
- `fx_big_merge_013`: MISSING；高等级合成特效；序列帧 13/16，fps 12
- `fx_big_merge_014`: MISSING；高等级合成特效；序列帧 14/16，fps 12
- `fx_big_merge_015`: MISSING；高等级合成特效；序列帧 15/16，fps 12
- `fx_big_merge_016`: MISSING；高等级合成特效；序列帧 16/16，fps 12
- `fx_yizai_success_001`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 1/24，fps 12
- `fx_yizai_success_002`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 2/24，fps 12
- `fx_yizai_success_003`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 3/24，fps 12
- `fx_yizai_success_004`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 4/24，fps 12
- `fx_yizai_success_005`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 5/24，fps 12
- `fx_yizai_success_006`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 6/24，fps 12
- `fx_yizai_success_007`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 7/24，fps 12
- `fx_yizai_success_008`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 8/24，fps 12
- `fx_yizai_success_009`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 9/24，fps 12
- `fx_yizai_success_010`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 10/24，fps 12
- `fx_yizai_success_011`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 11/24，fps 12
- `fx_yizai_success_012`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 12/24，fps 12
- `fx_yizai_success_013`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 13/24，fps 12
- `fx_yizai_success_014`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 14/24，fps 12
- `fx_yizai_success_015`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 15/24，fps 12
- `fx_yizai_success_016`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 16/24，fps 12
- `fx_yizai_success_017`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 17/24，fps 12
- `fx_yizai_success_018`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 18/24，fps 12
- `fx_yizai_success_019`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 19/24，fps 12
- `fx_yizai_success_020`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 20/24，fps 12
- `fx_yizai_success_021`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 21/24，fps 12
- `fx_yizai_success_022`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 22/24，fps 12
- `fx_yizai_success_023`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 23/24，fps 12
- `fx_yizai_success_024`: MISSING；合出亿仔特效，不能遮住 MAEE；序列帧 24/24，fps 12
- `fx_coin_fly_001`: MISSING；获得亿仔币动效；序列帧 1/16，fps 24
- `fx_coin_fly_002`: MISSING；获得亿仔币动效；序列帧 2/16，fps 24
- `fx_coin_fly_003`: MISSING；获得亿仔币动效；序列帧 3/16，fps 24
- `fx_coin_fly_004`: MISSING；获得亿仔币动效；序列帧 4/16，fps 24
- `fx_coin_fly_005`: MISSING；获得亿仔币动效；序列帧 5/16，fps 24
- `fx_coin_fly_006`: MISSING；获得亿仔币动效；序列帧 6/16，fps 24
- `fx_coin_fly_007`: MISSING；获得亿仔币动效；序列帧 7/16，fps 24
- `fx_coin_fly_008`: MISSING；获得亿仔币动效；序列帧 8/16，fps 24
- `fx_coin_fly_009`: MISSING；获得亿仔币动效；序列帧 9/16，fps 24
- `fx_coin_fly_010`: MISSING；获得亿仔币动效；序列帧 10/16，fps 24
- `fx_coin_fly_011`: MISSING；获得亿仔币动效；序列帧 11/16，fps 24
- `fx_coin_fly_012`: MISSING；获得亿仔币动效；序列帧 12/16，fps 24
- `fx_coin_fly_013`: MISSING；获得亿仔币动效；序列帧 13/16，fps 24
- `fx_coin_fly_014`: MISSING；获得亿仔币动效；序列帧 14/16，fps 24
- `fx_coin_fly_015`: MISSING；获得亿仔币动效；序列帧 15/16，fps 24
- `fx_coin_fly_016`: MISSING；获得亿仔币动效；序列帧 16/16，fps 24
- `fx_button_tap_001`: MISSING；按钮点击反馈；序列帧 1/8，fps 24
- `fx_button_tap_002`: MISSING；按钮点击反馈；序列帧 2/8，fps 24
- `fx_button_tap_003`: MISSING；按钮点击反馈；序列帧 3/8，fps 24
- `fx_button_tap_004`: MISSING；按钮点击反馈；序列帧 4/8，fps 24
- `fx_button_tap_005`: MISSING；按钮点击反馈；序列帧 5/8，fps 24
- `fx_button_tap_006`: MISSING；按钮点击反馈；序列帧 6/8，fps 24
- `fx_button_tap_007`: MISSING；按钮点击反馈；序列帧 7/8，fps 24
- `fx_button_tap_008`: MISSING；按钮点击反馈；序列帧 8/8，fps 24

## 已输出预览

- `asset_audit/previews/home_preview.png`
- `asset_audit/previews/game_preview.png`
- `asset_audit/previews/ui_preview.png`
