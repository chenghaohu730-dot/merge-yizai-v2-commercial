# 《合成亿仔》V2.0 CC0 音频来源与处理说明

下载日期：2026-07-22

本目录保存本次 V2.0 商业音频候选的原始下载物、解包后的作者许可证、逐文件哈希与编码探测结果。准确字节数、SHA256、时长、编码规格和派生参数见 `audio-provenance-manifest.json`。

## Dustyroom — Free Casual Game Sounds

- 作者：Dustyroom。
- 来源页：https://dustyroom.com/free-casual-game-sounds/
- 官方下载：https://dustyroom.com/casualgamesounds/DM-CGS.zip
- 许可：CC0 1.0；允许商业使用、修改和发行，不强制署名。
- 原作者许可证：`dustyroom/extracted/DM-CGS/license.pdf`。
- 原包：`dustyroom/DM-CGS.zip`。
- 解包范围：50 个 24-bit、44.1 kHz、立体声 WAV 和作者随包提供的 `license.pdf`。

## qubodup — Two Simple Game Music Loops

- 作者：qubodup。
- 来源页：https://opengameart.org/content/two-simple-game-music-loops
- 许可：CC0 1.0；允许商业使用、修改和发行，不强制署名。作者表示署名可选但欢迎。
- 菜单循环原文件：https://opengameart.org/sites/default/files/menumusicloop-tiggo.ogg
- 局内循环原文件：https://opengameart.org/sites/default/files/levelmusicloop-tigrun.ogg
- 本次仅将局内循环转为运行时 BGM；菜单循环作为同风格候选源保留，不进入当前核心运行时包。

## 运行时处理

- 六个 SFX 从 Dustyroom 原始 WAV 中筛选，转为 44.1 kHz、单声道、Ogg Vorbis quality 4。
- SFX 只做保守峰值增益、单声道下混和编码，不做重度压缩、削波或夸张限制。
- 局内 BGM 保持 44.1 kHz 立体声，以 128 kbps MP3 输出；只按输入响度与峰值余量做线性增益，不改变动态范围。
- 运行时候选位于 `game/cocos-creator-v2/assets/resources/audio/v2-commercial/`。
- 事件键映射位于 `game/cocos-creator-v2/assets/data/audio-v2-commercial-manifest.json`。
- 处理命令及输入/输出 SHA256 位于 `audio-provenance-manifest.json`，可由 `node tools/build-v2-commercial-audio.mjs` 重建。
- 发布前仍需在微信真机外放与耳机上试听，确认音色、循环边界、响度关系和高频刺耳风险。

CC0 1.0 官方说明：https://creativecommons.org/publicdomain/zero/1.0/
