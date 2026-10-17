# 观己 · Vercel 个人部署指南

本仓库已改成**站长单账号、全功能、需登录**使用。不要在公开 URL 上开放注册。部署本身不会创建 DeepSeek / Supabase / Vercel 账号，请按下面步骤在各控制台完成。

## 1. 准备三个外部账号

1. [Supabase](https://supabase.com) 新建一个项目（区域选离你较近的即可）。
2. [DeepSeek 开放平台](https://platform.deepseek.com) 创建 API Key，并充值少量余额。
3. [Vercel](https://vercel.com) 用 GitHub 登录，准备导入本仓库。

## 2. 初始化 Supabase

1. 打开项目 → **SQL Editor**。
2. 将仓库中的 [`supabase/schema.sql`](./supabase/schema.sql) 全部粘贴执行。
3. 成功后应看到 `users`、`bazi_charts`、`fortune_cache` 等表。
4. **无需手工插入用户**。站长账号会在第一次用环境变量登录时自动写入，并设为 `pro`（无 AI 次数限制）。
5. 打开 **Project Settings → API**，复制：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`（**绝不可**暴露到前端或 git）

> 若这是旧库升级：脚本里包含 `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;`，重复执行一般是安全的。

## 3. 申请 DeepSeek Key

1. 打开 [platform.deepseek.com](https://platform.deepseek.com) → API Keys。
2. 文档以官网为准：
   - 入门与模型名：https://api-docs.deepseek.com
   - 定价：https://api-docs.deepseek.com/quick_start/pricing
   - Thinking：https://api-docs.deepseek.com/guides/thinking_mode/
   - JSON 输出：https://api-docs.deepseek.com/guides/json_mode
   - 更新日志：https://api-docs.deepseek.com/updates
3. 当前官方模型：
   - `deepseek-flash`（默认，V4.1-Flash，性价比高）
   - `deepseek-v4-pro`（更强、更贵）
4. 旧名 `deepseek-chat` / `deepseek-reasoner` 已于 **2026-07-24** 停用，不要再填。

建议：`DEEPSEEK_MODEL=deepseek-flash`，`DEEPSEEK_THINKING=disabled`（八字/运势走 JSON 输出；关闭 thinking 可避免思维链污染解析，也更省 token）。

## 4. 导入 Vercel 并填写环境变量

1. Vercel → **Add New → Project** → 导入本 Git 仓库。
2. Framework Preset 选 Next.js，其它构建命令保持默认（`npm install` / `npm run build`）。
3. 在 **Settings → Environment Variables** 按 [`.env.example`](./.env.example) 全部添加。生产环境至少需要：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `NEXTAUTH_URL` | 是 | 生产域名，如 `https://xxx.vercel.app`（自定义域也填最终 https 地址） |
| `NEXTAUTH_SECRET` | 是 | `openssl rand -base64 32` |
| `OWNER_USERNAME` | 是 | 登录用户名 |
| `OWNER_PASSWORD` 或 `OWNER_PASSWORD_HASH` | 是 | 明文或 bcrypt；二者都有时用哈希 |
| `OWNER_EMAIL` | 否 | 写入 users.email，默认 `{用户名}@guanji.local` |
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是 | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | service_role |
| `DEEPSEEK_API_KEY` | 是 | DeepSeek Key |
| `DEEPSEEK_BASE_URL` | 否 | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-flash` |
| `DEEPSEEK_THINKING` | 否 | 默认 `disabled` |
| `DEEPSEEK_REASONING_EFFORT` | 否 | 仅 thinking=enabled 时有效：`low` / `high` / `max` |

4. 部署完成后用 `OWNER_USERNAME` + 密码打开站点登录。首次成功登录即会在 Supabase `users` 表 upsert 一条 `tier=pro` 记录。

## 5. 站长权限

无需 SQL、无需会员支付。登录逻辑会：

- 只接受 `OWNER_USERNAME`
- 校验 `OWNER_PASSWORD` 或 `OWNER_PASSWORD_HASH`
- upsert 用户为 `pro`，AI 次数视为无限
- 中间件拦截所有页面与 API（`/login` 与 `/api/auth/*` 除外）

改密码：改 Vercel 环境变量后 **Redeploy**，再用新密码登录（会更新库里的 `password_hash`）。

## 6. 公开 URL 防护（建议）

即使用户名密码已限制为一人，仍建议：

1. Vercel 项目 → **Settings → Deployment Protection** 打开 **Vercel Authentication**（访问站点需先过 Vercel 密码/登录）。Hobby 可用。
2. 不要把 `SUPABASE_SERVICE_ROLE_KEY`、`DEEPSEEK_API_KEY`、`OWNER_PASSWORD` 写进客户端或 README。
3. 未登录访问任意页面会跳到 `/login`；打 AI 接口会 401。额外还有进程内频率限制，防止误循环刷 Key。

本仓库已移除 GitHub / Google 登录与公开注册，**不必**配置 OAuth Callback。

## 7. 不需要的东西

- **每日配额 Cron**：个人站无配额，未配置 `vercel.json` cron，也无需调用 `reset_daily_ai_quota()`。
- **支付 / 会员页**：定价 UI 已隐藏；`/membership` 仅提示个人使用。
- **Hobby 计划 Cron 限制**：因此也不再依赖定时任务。

## 8. 本地验证

```bash
cp .env.example .env.local
# 填入真实或占位变量
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

占位变量足以通过 `lint` / `typecheck` / `next build`。真正排盘与对话需要有效的 Supabase 与 DeepSeek 凭证。

## 9. 上线后自检

- [ ] 未登录打开首页会跳到 `/login`
- [ ] 错误密码无法进入
- [ ] 正确站长账号可进八字 / 运势 / MBTI / 星座 / AI 对话
- [ ] 八字四柱由本地万年历算出（与 AI 解读分开）
- [ ] 对话为流式，且不会把模型 thinking 文本显示在气泡里
- [ ] Supabase `users` 中出现一条 `provider_id = owner:<用户名>`、`tier = pro` 的记录
