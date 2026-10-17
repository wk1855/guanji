import { createServerClient as _createServerClient } from "@supabase/ssr";
import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// 1. Server Component 客户端（只读 cookies）
// 用于: React Server Components, generateMetadata
export async function createServerComponentClient() {
  const cookieStore = await cookies();
  return _createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });
}

// 2. API Route 客户端（读写 cookies，支持 Session 刷新）
// 用于: API Route Handlers, Server Actions
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  return _createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Action 内部调用时可忽略
        }
      },
    },
  });
}

// 3. 浏览器客户端（单例）
// 用于: 'use client' 组件
let _browserClient: ReturnType<typeof _createBrowserClient> | null = null;

export function createBrowserClient() {
  if (_browserClient) return _browserClient;
  _browserClient = _createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _browserClient;
}

// 4. Service Role 客户端（绕过 RLS，仅服务端使用）
// 用于: NextAuth 回调、支付 Webhook、AI 配额管理
export function createServiceRoleClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "[Supabase] SUPABASE_SERVICE_ROLE_KEY is not set. Only use in server-side code."
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
