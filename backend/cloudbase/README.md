# 《合成亿仔》CloudBase 全服榜

此目录实现 V2.0 全服全量榜的服务端领域逻辑、CloudBase 薄入口和无云环境测试。客户端只能调用云函数，不能直接读写 `players`、`run_sessions`、`run_results` 或 `leaderboard_entries`。

## 本地验证

```powershell
Set-Location backend/cloudbase
npm test
npm run check
```

本地测试使用内存事务仓库，不需要 AppID、OPENID 或 CloudBase 环境。

## 云函数打包

```powershell
Set-Location backend/cloudbase
npm run package:functions
```

输出位于 `dist/functions/<functionName>`。每个输出目录均包含薄入口、共享服务端源码和固定版本 `wx-server-sdk` 依赖，可作为 CloudBase 部署输入。`dist` 是生成物，不应手改。

## 部署前必须完成

1. 为 dev、staging、prod 分别创建 CloudBase 环境，不得共用榜单数据。
2. 在目标环境配置 `env/environment.template.json` 中列出的变量；真实 secret 不得写入仓库。
3. 创建 `schema/collections.json` 中的集合。
4. 按 `indexes/indexes.json` 创建组合索引，并在真实数据上检查查询执行计划。
5. 按 `security/database.rules.json` 将客户端读写全部关闭，只允许云函数服务端访问。
6. 使用正式小游戏 AppID 调用 `wx.cloud.callFunction`，验证 `getWXContext().OPENID`。
7. 至少用两个真实微信账号验证榜单互见、重复提交、弱网重试和第 101 名以后的 Around Me。

安全规则文件当前是部署意图清单，不冒充已对某个真实 CloudBase 环境应用的规则。目标环境创建后，必须按该环境控制台/CLI 的实际格式生成并回读验证。

## 事务边界

`runFinish` 的纯计算在事务外完成；事务内只按确定文档 ID 读取和写入 session、result、player 及三个 period 的 leaderboard entry。排名范围查询在核心事务提交后执行，首次生成的回执再以短事务固化，因此重复 runId 永远返回首次结果且不会重复上榜。
