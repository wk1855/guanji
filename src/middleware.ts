import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico" || pathname === "/icon.jpg" || pathname === "/page.png") return true;
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff2?|txt|xml)$/)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // 已登录访问登录页：直接回到首页看板
  if (pathname === "/login") {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (token) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (token) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
