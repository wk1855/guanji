-- ================================================================
-- 「观己」命理占卜平台 - Supabase 数据库 Schema
-- 在 Supabase Dashboard > SQL Editor 中执行此脚本
-- ================================================================

-- ─── 启用扩展 ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. 用户表
-- ================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         TEXT        UNIQUE NOT NULL,   -- OAuth provider 的 account ID
  provider            TEXT        NOT NULL DEFAULT 'oauth', -- 'github' | 'google' | 'credentials'
  email               TEXT        UNIQUE NOT NULL,
  name                TEXT,
  avatar_url          TEXT,
  password_hash       TEXT,                              -- 仅 credentials / 站长账号
  phone               TEXT,
  tier                TEXT        NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro')),
  ai_chat_remaining   INT         NOT NULL DEFAULT 10,
  ai_chat_total       INT         NOT NULL DEFAULT 10,
  membership_expires_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at       TIMESTAMPTZ
);

COMMENT ON TABLE public.users IS '用户表。本站为单账号个人使用，登录时按 OWNER_USERNAME 自动 upsert 为 pro。';
COMMENT ON COLUMN public.users.provider_id IS '账号唯一键，站长为 owner:<username>';
COMMENT ON COLUMN public.users.password_hash IS 'bcrypt 哈希；首次登录时由应用写入';
COMMENT ON COLUMN public.users.ai_chat_remaining IS '今日剩余 AI 对话次数（个人站固定为无限制，此字段仅兼容旧结构）';
COMMENT ON COLUMN public.users.ai_chat_total IS '该用户等级对应的每日 AI 对话总配额；-1 表示不限';

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ================================================================
-- 2. 八字命盘表
-- ================================================================
CREATE TABLE IF NOT EXISTS public.bazi_charts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,                  -- 命主姓名
  gender          TEXT        NOT NULL CHECK (gender IN ('male', 'female')),
  birth_year      INT         NOT NULL,
  birth_month     INT         NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
  birth_day       INT         NOT NULL CHECK (birth_day BETWEEN 1 AND 31),
  birth_hour      INT         CHECK (birth_hour BETWEEN 0 AND 23),
  birth_place     TEXT,
  is_lunar        BOOLEAN     NOT NULL DEFAULT FALSE,
  result_json     JSONB       NOT NULL,                  -- AI 返回的完整排盘结果
  year_pillar     JSONB,                                 -- 年柱 {tianGan, diZhi, wuXing}
  month_pillar    JSONB,                                 -- 月柱
  day_pillar      JSONB,                                 -- 日柱
  hour_pillar     JSONB,                                 -- 时柱
  day_master      TEXT,                                  -- 日主天干
  five_elements   JSONB,                                 -- 五行占比 {木,火,土,金,水}
  summary         TEXT,                                  -- AI 生成的命盘摘要
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.bazi_charts IS '八字命盘表：存储用户的排盘结果，一用户可有多个命盘';

-- ================================================================
-- 3. AI 对话会话表
-- ================================================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT '新对话',
  context     TEXT,                                     -- 会话背景（如关联的八字命盘id）
  bazi_id     UUID        REFERENCES public.bazi_charts(id) ON DELETE SET NULL,
  message_count INT       NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.chat_sessions IS 'AI 命理师对话会话表';

-- ================================================================
-- 4. 对话消息表
-- ================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.chat_messages IS 'AI 对话消息表';

-- ================================================================
-- 5. 每日运势缓存表（全局缓存，非用户级别）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.fortune_cache (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE        UNIQUE NOT NULL,           -- 日期（唯一键）
  fortune_json    JSONB       NOT NULL,                  -- AI 生成的完整运势数据
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 days')
);

COMMENT ON TABLE public.fortune_cache IS '每日运势全局缓存，避免重复调用 AI';

-- ================================================================
-- 6. 用户查看运势记录
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_fortune_views (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- ================================================================
-- 7. 会员套餐配置表
-- ================================================================
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tier            TEXT        NOT NULL UNIQUE CHECK (tier IN ('basic', 'pro')),
  name            TEXT        NOT NULL,
  price           NUMERIC(10,2) NOT NULL,                -- 元/月
  original_price  NUMERIC(10,2),
  features        JSONB       NOT NULL DEFAULT '[]',     -- 功能列表
  ai_chat_limit   INT         NOT NULL DEFAULT 30,       -- 每日 AI 对话次数，-1 不限
  highlighted     BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order      INT         NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- 8. 支付订单表
-- ================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  plan_id         UUID        REFERENCES public.membership_plans(id),
  order_no        TEXT        UNIQUE NOT NULL,           -- 业务订单号
  trade_no        TEXT,                                  -- 支付平台流水号
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT        NOT NULL DEFAULT 'CNY',
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  payment_method  TEXT,                                  -- 'wechat' | 'alipay'
  paid_at         TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,                           -- 会员到期时间
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.orders IS '支付订单表';

-- ================================================================
-- 9. AI 调用日志表（用于限流、计费和问题排查）
-- ================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  session_id      UUID        REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  api_type        TEXT        NOT NULL CHECK (api_type IN ('bazi', 'fortune', 'chat')),
  model           TEXT,
  input_tokens    INT,
  output_tokens   INT,
  latency_ms      INT,
  status          TEXT        NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ai_usage_logs IS 'AI 调用日志，用于监控、计费和问题排查';

-- ================================================================
-- 索引
-- ================================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON public.users(provider_id);
CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(tier);

-- bazi_charts
CREATE INDEX IF NOT EXISTS idx_bazi_charts_user_id ON public.bazi_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_bazi_charts_created_at ON public.bazi_charts(created_at DESC);

-- chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at ASC);

-- fortune_cache
CREATE INDEX IF NOT EXISTS idx_fortune_cache_date ON public.fortune_cache(date);

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON public.orders(order_no);

-- ai_usage_logs
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);

-- ================================================================
-- Row Level Security (RLS) 策略
-- ================================================================

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bazi_charts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fortune_cache     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fortune_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs     ENABLE ROW LEVEL SECURITY;

-- 注：本项目通过 Service Role Key 在服务端操作，RLS 策略由 Service Role 绕过
-- 以下策略适用于客户端直连 Supabase 的场景（当前项目暂不使用）

-- membership_plans: 所有人可读（套餐为公开信息）
CREATE POLICY "membership_plans_public_read" ON public.membership_plans
  FOR SELECT USING (is_active = TRUE);

-- fortune_cache: 所有人可读
CREATE POLICY "fortune_cache_public_read" ON public.fortune_cache
  FOR SELECT USING (TRUE);

-- ================================================================
-- 数据库函数
-- ================================================================

-- 函数1: 登录时同步用户（NextAuth signIn 回调中调用）
CREATE OR REPLACE FUNCTION public.get_or_create_user(
  p_provider_id   TEXT,
  p_email         TEXT,
  p_name          TEXT DEFAULT NULL,
  p_avatar_url    TEXT DEFAULT NULL,
  p_provider      TEXT DEFAULT 'oauth'
)
RETURNS TABLE (
  id                  UUID,
  email               TEXT,
  name                TEXT,
  avatar_url          TEXT,
  tier                TEXT,
  ai_chat_remaining   INT,
  is_new_user         BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_is_new    BOOLEAN := FALSE;
BEGIN
  -- 先通过 provider_id 查找，再通过 email 查找
  SELECT u.id INTO v_user_id
  FROM public.users u
  WHERE u.provider_id = p_provider_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT u.id INTO v_user_id
    FROM public.users u
    WHERE u.email = p_email
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    -- 新用户：创建记录
    INSERT INTO public.users (
      provider_id, provider, email, name, avatar_url,
      tier, ai_chat_remaining, ai_chat_total,
      created_at, updated_at, last_login_at
    )
    VALUES (
      p_provider_id, p_provider, p_email, p_name, p_avatar_url,
      'free', 10, 10,
      NOW(), NOW(), NOW()
    )
    RETURNING public.users.id INTO v_user_id;

    v_is_new := TRUE;
  ELSE
    -- 老用户：更新登录信息
    UPDATE public.users
    SET
      last_login_at = NOW(),
      avatar_url    = COALESCE(p_avatar_url, avatar_url),
      name          = COALESCE(p_name, name),
      provider_id   = COALESCE(provider_id, p_provider_id),
      updated_at    = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN QUERY
  SELECT
    u.id, u.email, u.name, u.avatar_url,
    u.tier, u.ai_chat_remaining, v_is_new
  FROM public.users u
  WHERE u.id = v_user_id;
END;
$$;

-- 函数2: 原子性扣减 AI 对话次数
CREATE OR REPLACE FUNCTION public.decrement_ai_chat_remaining(
  p_user_id UUID
)
RETURNS TABLE (
  success       BOOLEAN,
  remaining     INT,
  error_code    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining   INT;
  v_tier        TEXT;
BEGIN
  -- FOR UPDATE 行锁，防止并发超扣
  SELECT ai_chat_remaining, tier INTO v_remaining, v_tier
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_remaining IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'USER_NOT_FOUND';
    RETURN;
  END IF;

  -- Pro 用户检查是否无限制（ai_chat_total = -1）
  IF v_tier = 'pro' THEN
    RETURN QUERY SELECT TRUE, 999, NULL::TEXT;
    RETURN;
  END IF;

  IF v_remaining <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'QUOTA_EXHAUSTED';
    RETURN;
  END IF;

  UPDATE public.users
  SET
    ai_chat_remaining = ai_chat_remaining - 1,
    updated_at        = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, v_remaining - 1, NULL::TEXT;
END;
$$;

-- 函数3: 归还 AI 对话次数（调用失败时退款）
CREATE OR REPLACE FUNCTION public.increment_ai_chat_remaining(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET
    ai_chat_remaining = LEAST(ai_chat_remaining + 1, ai_chat_total),
    updated_at        = NOW()
  WHERE id = p_user_id AND tier != 'pro';
END;
$$;

-- 函数4: 每日重置 AI 对话次数（个人站无配额，保留函数但不需要 Cron）
CREATE OR REPLACE FUNCTION public.reset_daily_ai_quota()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.users
  SET
    ai_chat_remaining = ai_chat_total,
    updated_at        = NOW()
  WHERE tier != 'pro';  -- Pro 用户不限制，不需要重置

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 函数5: 支付成功后升级会员
CREATE OR REPLACE FUNCTION public.upgrade_membership(
  p_user_id     UUID,
  p_tier        TEXT,
  p_expires_at  TIMESTAMPTZ,
  p_chat_limit  INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET
    tier                  = p_tier,
    membership_expires_at = p_expires_at,
    ai_chat_total         = p_chat_limit,
    ai_chat_remaining     = p_chat_limit,
    updated_at            = NOW()
  WHERE id = p_user_id;
END;
$$;

-- ================================================================
-- 初始化数据：会员套餐
-- ================================================================
INSERT INTO public.membership_plans (tier, name, price, original_price, features, ai_chat_limit, highlighted, sort_order)
VALUES
  (
    'basic',
    '基础版',
    19.90,
    29.90,
    '["每日30次AI命理对话", "无限八字排盘", "每日运势解读", "命盘历史记录"]'::jsonb,
    30,
    FALSE,
    1
  ),
  (
    'pro',
    '专业版',
    49.90,
    79.90,
    '["无限AI命理对话", "无限八字排盘", "专属流年大运解读", "优先响应通道", "专属客服支持", "命盘导出 PDF"]'::jsonb,
    -1,
    TRUE,
    2
  )
ON CONFLICT (tier) DO UPDATE
SET
  name           = EXCLUDED.name,
  price          = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  features       = EXCLUDED.features,
  ai_chat_limit  = EXCLUDED.ai_chat_limit,
  highlighted    = EXCLUDED.highlighted;

-- ================================================================
-- 新增表（MBTI + 星座罗盘模块）
-- 在 Supabase Dashboard > SQL Editor 执行以下部分即可
-- ================================================================

-- ----------------------------------------------------------------
-- 10. MBTI 测试结果表
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mbti_results (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  mbti_type        TEXT        NOT NULL,            -- 'INTJ' | 'ENFP' 等16种
  -- 四维度得分（0-100，两端之和=100）
  e_score          SMALLINT    NOT NULL DEFAULT 50,
  i_score          SMALLINT    NOT NULL DEFAULT 50,
  s_score          SMALLINT    NOT NULL DEFAULT 50,
  n_score          SMALLINT    NOT NULL DEFAULT 50,
  t_score          SMALLINT    NOT NULL DEFAULT 50,
  f_score          SMALLINT    NOT NULL DEFAULT 50,
  j_score          SMALLINT    NOT NULL DEFAULT 50,
  p_score          SMALLINT    NOT NULL DEFAULT 50,
  -- AI 解读
  ai_reading       TEXT,                            -- AI个性化性格解读
  element_affinity TEXT,                            -- 五行亲和（木/火/土/金/水）
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.mbti_results IS 'MBTI测试结果表，支持匿名测试（user_id 可为空）';

CREATE INDEX IF NOT EXISTS idx_mbti_results_user_id   ON public.mbti_results(user_id);
CREATE INDEX IF NOT EXISTS idx_mbti_results_mbti_type  ON public.mbti_results(mbti_type);
CREATE INDEX IF NOT EXISTS idx_mbti_results_created_at ON public.mbti_results(created_at DESC);

ALTER TABLE public.mbti_results ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 11. 星座每日运势缓存表
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zodiac_fortune_cache (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  zodiac_sign  TEXT        NOT NULL,  -- 'aries' | 'taurus' | ... | 'pisces'
  date         DATE        NOT NULL,
  fortune_json JSONB       NOT NULL,  -- AI 生成的完整星座运势
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 days'),
  UNIQUE (zodiac_sign, date)          -- 每星座每天唯一
);

COMMENT ON TABLE public.zodiac_fortune_cache IS '星座每日运势缓存，与 fortune_cache 模式一致';

CREATE INDEX IF NOT EXISTS idx_zodiac_fortune_date ON public.zodiac_fortune_cache(date);
CREATE INDEX IF NOT EXISTS idx_zodiac_fortune_sign ON public.zodiac_fortune_cache(zodiac_sign);

ALTER TABLE public.zodiac_fortune_cache ENABLE ROW LEVEL SECURITY;

-- 星座运势公开可读（同 fortune_cache）
CREATE POLICY "zodiac_fortune_cache_public_read" ON public.zodiac_fortune_cache
  FOR SELECT USING (TRUE);

-- ----------------------------------------------------------------
-- 扩展 ai_usage_logs.api_type 枚举（支持新模块）
-- ----------------------------------------------------------------
ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_api_type_check;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_api_type_check
  CHECK (api_type IN ('bazi', 'fortune', 'chat', 'mbti', 'zodiac', 'match'));

-- ----------------------------------------------------------------
-- 安全加固：SECURITY DEFINER 函数仅允许服务端（service_role）调用
-- 防止持有 anon key 的任何人通过 /rest/v1/rpc 直接调用
-- ----------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.get_or_create_user(text, text, text, text, text),
  public.decrement_ai_chat_remaining(uuid),
  public.increment_ai_chat_remaining(uuid),
  public.reset_daily_ai_quota(),
  public.upgrade_membership(uuid, text, timestamptz, int)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.get_or_create_user(text, text, text, text, text),
  public.decrement_ai_chat_remaining(uuid),
  public.increment_ai_chat_remaining(uuid),
  public.reset_daily_ai_quota(),
  public.upgrade_membership(uuid, text, timestamptz, int)
TO service_role;
