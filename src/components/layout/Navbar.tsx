"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, User, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "今日运势", href: "/fortune" },
  { label: "八字排盘", href: "/bazi" },
  { label: "MBTI测试", href: "/mbti" },
  { label: "星座罗盘", href: "/zodiac" },
  { label: "缘分配对", href: "/match" },
  { label: "AI命理师", href: "/ai-chat" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();
  const isLoggedIn = !!session;
  const userName = session?.user?.name ?? "用户";
  const userAvatar = session?.user?.image ?? null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0d0b1e]/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#5749F4] to-[#8B7CF6] shadow-lg shadow-[#5749F4]/30">
            <span className="font-serif text-lg font-bold text-white leading-none">观</span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-semibold text-white tracking-widest leading-none">
              观己
            </span>
            <span className="text-[10px] text-[#8B7CF6] tracking-wider leading-none mt-0.5">
              GUANJI
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="relative px-4 py-2 text-sm text-white/70 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/5 group"
              >
                {item.label}
                <span className="absolute bottom-1 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-[#5749F4] to-[#8B7CF6] transition-all duration-300 group-hover:w-3/4" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="h-6 w-6 rounded-full" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#5749F4] to-[#C084FC] flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <span className="text-sm text-white/80">{userName}</span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-full bg-gradient-to-r from-[#5749F4] to-[#7C3AED] hover:opacity-90 transition-opacity shadow-lg shadow-[#5749F4]/25"
              >
                登录
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0d0b1e]/95 backdrop-blur-xl px-4 py-4">
          <ul className="flex flex-col gap-1 mb-4">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {isLoggedIn ? (
            <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
              <Link
                href="/profile"
                className="block w-full text-center py-2.5 text-sm text-white/70 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                个人档案
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="block w-full text-center py-2.5 text-sm font-medium text-white rounded-xl bg-white/10"
              >
                退出登录
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
              <Link
                href="/login"
                className="block w-full text-center py-2.5 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-[#5749F4] to-[#7C3AED]"
                onClick={() => setMenuOpen(false)}
              >
                登录
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
