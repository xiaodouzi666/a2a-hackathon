# A2A 砍价擂台

A2A 砍价擂台是一个双 Agent 自动谈判应用：
两个不同用户登录后，分别由卖家 AI 分身与买家 AI 分身在同一房间内自动砍价，最多 10 轮，最终输出成交或流拍结果，并支持围观投票与分享拉新。

## 一、项目目标

- 严格体现 Agent-to-Agent：卖家 AI 与买家 AI 自主交互，不是人机聊天。
- 在最短链路内跑通完整闭环：登录、建房、加入、开始砍价、结果展示、投票分享。
- 面向黑客松演示：1 分钟内可以清楚展示 OAuth、A2A 过程和结果页。

## 二、功能范围（当前版本）

- SecondMe OAuth 登录（最小权限：`user.info`、`chat`）
- 卖家创建房间：物品名称、描述、标价、最低可接受价（服务端保密）
- 买家加入房间：预算上限（服务端保密）
- 卖家点击“开始砍价”后，双 AI 自动轮流报价与陈述
- 最多 10 轮自动判定成交或流拍
- 结果页展示：成交状态、成交价、砍价幅度、关键回合摘要
- 登录用户可投票（卖家 AI / 买家 AI）
- 首页包含基础榜单（砍价王、金牌销售）

## 三、技术栈

- 前端与服务端：Next.js 14（App Router）+ TypeScript
- 数据库：Prisma + SQLite（本地开发）
- 身份与 Agent 能力：SecondMe OAuth 与 `chat/stream` 接口

## 四、环境变量

在项目根目录创建 `.env.local`（或部署平台同名配置）：

```env
DATABASE_URL="file:./dev.db"
SECONDME_CLIENT_ID="你的 Client ID"
SECONDME_CLIENT_SECRET="你的 Client Secret"
BASE_URL="http://localhost:3000"
```

## 五、本地运行步骤

```bash
npm install
npx prisma migrate dev
npm run dev
```

默认访问：`http://localhost:3000`

## 六、OAuth 回调地址配置

在 SecondMe 开发者平台中设置回调地址：

- 本地开发：`http://localhost:3000/api/auth/callback`
- 线上部署：`https://你的域名/api/auth/callback`

## 七、页面说明

- `/`：首页（登录、创建入口、榜单）
- `/create`：卖家创建房间并复制邀请链接
- `/join`：通过房间链接或房间 ID 快速进入
- `/room/[id]`：房间页（买家加入、卖家开始、实时回合）
- `/result/[id]`：结果页（成交信息、摘要、投票、分享）

## 八、A2A 谈判规则

- 卖家与买家分别使用独立 `sessionId`
- 每个角色首次发言携带 `systemPrompt`，后续复用 `sessionId`
- 每轮解析统一输出结构：
  - `PRICE: <数字>`
  - `SAY: <一句话>`
- 最大轮数：10
- 成交条件：`买家报价 >= 卖家要价`
- 成交价规则：`finalPrice = sellerAsk`

## 九、线上部署建议

推荐部署到 Vercel 或 Zeabur：

1. 配置全部环境变量
2. 更新 OAuth 回调地址为线上域名
3. 打开线上地址做一次完整演示流程检查

## 十、黑客松提交清单（可直接对照）

- 必交：可访问的线上 Demo 链接（这是评审门槛）
- 可选：GitHub 仓库链接（作为补充材料）
- 建议：在项目页面补充清晰的演示说明（评委可快速复现）
- 必做：确保 OAuth 登录链路可用（用户数按 OAuth 登录统计）
- 建议：在提交页面同步填写应用标识信息（例如 Client ID），便于统计与核对

## 十一、1 分钟演示脚本

1. 卖家登录后进入 `/create`，填写商品信息并创建房间
2. 复制链接给买家，买家登录后进入 `/room/[id]` 并输入预算加入
3. 卖家点击“开始砍价”，观察双 AI 自动谈判
4. 达成成交或流拍后，进入 `/result/[id]` 查看结果与摘要
5. 现场进行投票并点击分享链接继续拉新
