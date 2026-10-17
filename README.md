# 观己 · Guanji

> 观己知命，顺势而为

融合东方命理哲学与现代心理科学的 AI 占卜应用。本 fork 面向**站长个人全功能使用**：单一用户名密码、全站需登录、无公开注册、无 OAuth、无会员配额。

部署步骤见 [DEPLOY.md](./DEPLOY.md)，环境变量见 [.env.example](./.env.example)。

![观己界面预览](./public/page.png)

## ![体验链接](https://guanji.vercel.app/)

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [数据库初始化](#数据库初始化)
- [API 文档](#api-文档)
- [会员体系](#会员体系)
- [部署](#部署)

---

## 功能特性

### 核心模块

| 模块      | 路由          | 描述                                                                 |
| --------- | ------------- | -------------------------------------------------------------------- |
| 每日运势  | `/fortune`    | 基于今日干支由 AI 生成全局缓存运势，含事业、财运、感情、健康四维解读 |
| 八字排盘  | `/bazi`       | 输入生辰八字，AI 给出四柱、日主、五行平衡度及命盘分析，支持农历/公历 |
| MBTI 测试 | `/mbti`       | 60 道题测出 16 种人格类型，并与五行体系融合解读                      |
| 星座罗盘  | `/zodiac`     | 12 星座每日运势，星座与五行互相印证                                  |
| AI 命理师 | `/ai-chat`    | 与 AI 命理师「玄机」深度对话，结合个人命盘做个性化解读               |
| 个人档案  | `/profile`    | 查看站长账号信息                                                     |

### 核心技术亮点

- **AI 驱动**：解读由 DeepSeek 当前官方模型（默认 `deepseek-flash`）生成
- **八字硬计算**：四柱由 `lunar-javascript`（节气 + 可选真太阳时）排出，AI 只负责解读
- **智能缓存**：运势类内容全局缓存（TTL 2 天），避免重复 AI 调用
- **单账号鉴权**：`OWNER_USERNAME` + 密码，首次登录自动 upsert 为 pro
- **合规内容**：违禁词过滤、合规声明底栏、AI 输出末尾自动追加娱乐免责声明

---

## 技术栈

| 层级         | 技术                                                               |
| ------------ | ------------------------------------------------------------------ |
| **框架**     | [Next.js 14](https://nextjs.org/) (App Router)                     |
| **语言**     | TypeScript                                                         |
| **样式**     | Tailwind CSS + 自定义 CSS 动画                                     |
| **状态管理** | [Zustand](https://github.com/pmndrs/zustand) + localStorage 持久化 |
| **认证**     | [NextAuth.js v4](https://next-auth.js.org/)                        |
| **数据库**   | [Supabase](https://supabase.com/) (PostgreSQL + RLS)               |
| **AI**       | [DeepSeek API](https://api-docs.deepseek.com/)（默认 `deepseek-flash`） |
| **历法**     | [lunar-javascript](https://github.com/6tail/lunar-javascript)      |
| **图标**     | [Lucide React](https://lucide.dev/)                                |
| **部署**     | [Vercel](https://vercel.com/)                                      |

---

## 项目结构

```
src/
├── app/
│   ├── (auth)/              # 认证路由组
│   │   └── login/
│   ├── (chat)/              # AI 对话路由组（无 Footer/ComplianceBar）
│   │   └── ai-chat/
│   ├── (main)/              # 主功能路由组
│   │   ├── page.tsx         # 首页
│   │   ├── bazi/            # 八字排盘
│   │   ├── fortune/         # 每日运势
│   │   ├── mbti/            # MBTI 测试
│   │   ├── zodiac/          # 星座罗盘
│   │   ├── profile/         # 个人档案
│   │   └── membership/      # 会员套餐
│   └── api/
│       ├── auth/            # NextAuth 端点 + 注册
│       ├── bazi/            # 八字排盘 & 历史
│       ├── chat/            # AI 对话（含配额管理）
│       ├── fortune/         # 每日运势缓存
│       ├── mbti/            # MBTI 计算与保存
│       ├── zodiac/          # 星座运势缓存
│       └── user/            # 用户信息 & 配额查询
├── components/
│   ├── layout/              # Navbar, Footer, ComplianceBar, StarField
│   ├── ai-chat/             # ChatInput, ChatMessage
│   ├── bazi/                # BaziForm, BaziChart, PosterPreviewModal
│   ├── mbti/                # MbtiProgress, MbtiQuestionCard, MbtiResultDisplay
│   ├── zodiac/              # ZodiacCompass, ZodiacFortunePanel
│   └── ui/                  # Button, Card, Input, Badge 基础组件
├── lib/
│   ├── auth.ts              # NextAuth 配置
│   ├── supabase.ts          # Supabase 多端客户端
│   ├── constants.ts         # 全局常量（导航、配额、违禁词、五行映射）
│   ├── db/                  # 数据库操作层（users, bazi, chat, fortune, mbti, zodiac）
│   ├── data/                # 静态数据（mbtiQuestions, zodiacData）
│   └── utils/               # 工具函数
├── store/
│   ├── useUserStore.ts      # 用户全局状态
│   ├── useMbtiStore.ts      # MBTI 测试进度
│   └── useBaziStore.ts      # 八字排盘状态
├── types/
│   └── index.ts             # 全局 TypeScript 类型定义
└── middleware.ts             # 路由保护（未登录跳转 /login）

supabase/
└── schema.sql               # 完整数据库 Schema（表、索引、RLS、函数、初始数据）
```

---

## 快速开始

### 前置要求

- Node.js 18+
- npm
- Supabase 项目（[免费创建](https://app.supabase.com/)）
- DeepSeek API Key（[申请](https://platform.deepseek.com/)）

### 安装

```bash
# 克隆仓库
git clone <repo-url>
cd guanji

# 安装依赖
npm install
```

### 配置环境变量

```bash
cp .env.example .env.local
```

完整变量说明见 `.env.example` 与 [DEPLOY.md](./DEPLOY.md)。

### 初始化数据库

在 [Supabase Dashboard](https://app.supabase.com/) → **SQL Editor** 中执行：

```bash
supabase/schema.sql
```

该脚本会创建所有表、索引、RLS 策略、数据库函数，并插入初始会员套餐数据。

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 环境变量

见 [`.env.example`](./.env.example)。必填：`NEXTAUTH_URL`、`NEXTAUTH_SECRET`、`OWNER_USERNAME`、`OWNER_PASSWORD`（或 `OWNER_PASSWORD_HASH`）、Supabase 三项、`DEEPSEEK_API_KEY`。

默认模型为 `deepseek-flash`。已移除 GitHub / Google OAuth 变量。

---

## 数据库初始化

执行 `supabase/schema.sql` 后，数据库将包含：

### 数据表

| 表名                   | 描述                                     |
| ---------------------- | ---------------------------------------- |
| `users`                | 用户账号（OAuth 同步，含配额、会员等级） |
| `bazi_charts`          | 八字命盘排盘历史                         |
| `chat_sessions`        | AI 对话会话                              |
| `chat_messages`        | 对话消息记录                             |
| `fortune_cache`        | 每日运势全局缓存                         |
| `user_fortune_views`   | 用户运势查看记录                         |
| `zodiac_fortune_cache` | 星座每日运势缓存                         |
| `mbti_results`         | MBTI 测试结果（支持匿名）                |
| `membership_plans`     | 会员套餐配置                             |
| `orders`               | 支付订单（预留微信/支付宝）              |
| `ai_usage_logs`        | AI 调用日志（监控 & 计费）               |

### 关键数据库函数

```sql
-- 登录时同步用户（OAuth 回调调用）
get_or_create_user(provider_id, email, name, avatar_url, provider)

-- 原子性扣减 AI 对话次数（行锁防并发超扣）
decrement_ai_chat_remaining(user_id)

-- 调用失败时退款（不超过每日上限）
increment_ai_chat_remaining(user_id)

-- 每日重置所有用户配额（通过定时任务调用）
reset_daily_ai_quota()

-- 支付成功后升级会员
upgrade_membership(user_id, tier, expires_at, chat_limit)
```

站长账号由应用在首次登录时自动创建为 `pro`，**不必**手工 SQL，也**不必**配置每日配额 Cron。

---

## API 文档

所有 API 均位于 `/api/`，需要认证的接口通过 NextAuth session 鉴权。

### 八字排盘

```http
POST /api/bazi
Authorization: 需要登录

{
  "name": "张三",
  "gender": "male",
  "birthYear": 1990,
  "birthMonth": 5,
  "birthDay": 15,
  "birthHour": 8,
  "birthPlace": "北京市",
  "isLunar": false
}
```

### 每日运势

```http
GET /api/fortune
```

返回今日全局运势（优先读缓存，缓存不存在则 AI 生成）。

### AI 对话

```http
POST /api/chat
Authorization: 需要登录（含配额检查）

{
  "sessionId": "uuid（可选，不传则创建新会话）",
  "message": "我最近工作运势如何？",
  "baziId": "uuid（可选，关联命盘）"
}
```

### MBTI 测试

```http
POST /api/mbti

{
  "answers": {
    "q01": "A", "q02": "B", ...  // 60 道题答案
  }
}
```

### 星座运势

```http
GET /api/zodiac?sign=aries
```

### 用户配额

```http
GET /api/user/quota
Authorization: 需要登录
```

---

## 账号模型

仅 `OWNER_USERNAME` 可登录，权限视为专业版、无次数限制。公开注册与 OAuth 已关闭。支付相关表仍保留在 schema 中但不阻断使用。

---

## 部署

完整步骤（Supabase schema、DeepSeek、Vercel 环境变量、站长账号、Vercel 密码保护）见 **[DEPLOY.md](./DEPLOY.md)**。

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

---

## 内容合规

本平台遵守内容合规要求：

- 所有页面底部固定显示合规声明
- AI 输出自动过滤违禁词（`算命`、`改命`、`必中` 等）
- AI 系统提示词明确要求所有内容定位为「娱乐参考」，负面信息配套正向建议
- 禁止宣扬封建迷信、诱导消费等不当内容

---

## License

MIT
