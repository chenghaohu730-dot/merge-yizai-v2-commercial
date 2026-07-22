# V2.0 状态记录

日期：2026-06-13

## 环境结论

- Node、npm、git、ripgrep 可用。
- 微信开发者工具已安装。
- Cocos Creator 3.8.8 已下载并解压到 `D:\CocosCreator\versions\3.8.8`。
- 主程序路径：`D:\CocosCreator\versions\3.8.8\CocosCreator.exe`。
- 下载包路径：`D:\01_Codex源码项目\微信小游戏\downloads\CocosCreator-v3.8.8-win-121518.zip`。
- 下载包 SHA256：`E365030AA4F24B515F499CF093CD86FDF38A0F763B5FBCACB20E96253E0FCC0B`。
- Cocos Dashboard 官方安装器直链当前返回 403，未安装 Dashboard；Creator 本体可直接运行。

## 执行边界

- 不删除、不覆盖旧项目。
- `game/web-prototype` 和 `game/wechat-minigame` 保持为 reference。
- 新工程位于 `game/cocos-creator-v2`。
- 当前阶段先完成 Cocos 工程规划、资源规范、数据结构、脚本方案、迁移步骤和可验证清单。

## 下一步

用 `D:\CocosCreator\versions\3.8.8\CocosCreator.exe` 打开本目录，按场景蓝图创建 `.scene` 和 `.prefab`，再用现有脚本组件挂载节点。
