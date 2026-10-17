import { NextResponse } from "next/server";

// 本站为站长单账号使用，已关闭公开注册。
// 原注册实现已移除：不再向 users 表插入任意账号。
export async function POST() {
  return NextResponse.json(
    { success: false, error: { code: "AUTH_FORBIDDEN", message: "本站已关闭注册" } },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: { code: "AUTH_FORBIDDEN", message: "本站已关闭注册" } },
    { status: 403 }
  );
}
