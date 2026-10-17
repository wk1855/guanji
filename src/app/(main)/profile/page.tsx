"use client";

import { useEffect, useState } from "react";
import { User, BookOpen, MessageCircle, Star, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

interface ProfileData {
  name?: string;
  email?: string;
  tier?: string;
  createdAt?: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.data) setProfile(payload.data);
      })
      .catch(() => undefined);
  }, []);

  const name = profile?.name ?? session?.user?.name ?? "站长";
  const email = profile?.email ?? session?.user?.email ?? "";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-m)] mb-4" style={{ background: "rgba(87,73,244,0.12)" }}>
          <User size={24} style={{ color: "var(--primary)" }} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">个人档案</h1>
        <p className="text-sm text-[var(--muted-foreground)]">站长账号 · 全部功能可用</p>
      </div>

      <div className="guanji-card p-8 text-center mb-6">
        <p className="text-lg font-semibold text-[var(--foreground)]">{name}</p>
        {email && <p className="text-sm text-[var(--muted-foreground)] mt-1">{email}</p>}
        <p className="text-xs text-[var(--muted-foreground)] mt-3">身份：专业版（无次数限制）</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-[var(--radius-pill)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: "var(--primary)" }}
        >
          <LogOut size={15} aria-hidden="true" />
          退出登录
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: BookOpen, label: "八字排盘", href: "/bazi" },
          { icon: MessageCircle, label: "AI 对话", href: "/ai-chat" },
          { icon: Star, label: "今日运势", href: "/fortune" },
        ].map(({ icon: Icon, label, href }) => (
          <a key={label} href={href} className="guanji-card p-4 text-center hover:opacity-90 transition-opacity">
            <Icon size={18} className="mx-auto mb-2" style={{ color: "var(--primary)" }} aria-hidden="true" />
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{label}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
