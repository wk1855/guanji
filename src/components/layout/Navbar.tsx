"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export const NAV_ITEMS = [
  { label: "今日", href: "/fortune" },
  { label: "排盘", href: "/bazi" },
  { label: "对话", href: "/ai-chat" },
  { label: "星座", href: "/zodiac" },
  { label: "MBTI", href: "/mbti" },
  { label: "档案", href: "/profile" },
] as const;

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() ?? "/";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0d0b1e]/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="主导航">
        <Link href="/" className="flex items-center gap-2 min-h-[44px]" aria-label="观己 · 首页看板">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#5749F4] to-[#8B7CF6] shadow-lg shadow-[#5749F4]/30">
            <span className="font-serif text-lg font-bold text-white leading-none">观</span>
          </div>
          <span className="font-serif text-lg font-semibold text-white tracking-widest leading-none">观己</span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center h-10 px-4 text-sm rounded-lg transition-colors ${
                    active ? "bg-white/10 text-white font-medium" : "text-white/75 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-1">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="退出登录"
            title="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0d0b1e]/95 backdrop-blur-xl px-4 py-3">
          <ul className="grid grid-cols-3 gap-2 mb-3">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-12 items-center justify-center rounded-xl text-sm transition-colors ${
                      active ? "bg-[#5749F4] text-white font-medium" : "bg-white/5 text-white/85 hover:bg-white/10"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-white/10 text-sm text-white/75"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      )}
    </header>
  );
}
