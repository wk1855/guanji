import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { unauthorized } from "@/lib/utils/response";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export interface AuthedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  tier: "free" | "basic" | "pro";
}

export async function getAuthedUser(): Promise<AuthedUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    tier: user.tier ?? "pro",
  };
}

export async function requireUser(): Promise<
  { user: AuthedUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const user = await getAuthedUser();
  if (!user) return { error: unauthorized("请先登录") };
  return { user };
}

export function enforceAiRateLimit(userId: string): NextResponse | null {
  const result = rateLimit(`ai:${userId}`, 40, 60_000);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "请求过于频繁，请稍后再试" },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
  );
}
