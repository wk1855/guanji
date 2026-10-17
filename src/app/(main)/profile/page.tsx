"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  BookOpen,
  MessageCircle,
  Star,
  LogOut,
  Trash2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

interface ProfileData {
  name?: string;
  email?: string;
  tier?: string;
  createdAt?: string;
}

interface PillarJson {
  tianGan?: string;
  diZhi?: string;
}

interface BaziRecord {
  id: string;
  name: string;
  gender: "male" | "female";
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_hour: number | null;
  birth_place: string | null;
  is_lunar: boolean;
  year_pillar: PillarJson | null;
  month_pillar: PillarJson | null;
  day_pillar: PillarJson | null;
  hour_pillar: PillarJson | null;
  day_master: string | null;
  created_at: string;
}

interface ChatSessionRecord {
  id: string;
  title: string;
  message_count: number;
  updated_at: string;
  last_message: { role: string; content: string; created_at: string } | null;
}

type Tab = "bazi" | "chat";

const pillar = (p: PillarJson | null) => (p?.tianGan && p?.diZhi ? `${p.tianGan}${p.diZhi}` : "--");

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function EmptyState({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="guanji-card p-8 text-center">
      <p className="text-sm text-[var(--muted-foreground)] mb-4">{text}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1 px-5 py-2 rounded-[var(--radius-pill)] text-white text-xs font-semibold"
        style={{ background: "var(--primary)" }}
      >
        {cta}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [tab, setTab] = useState<Tab>("bazi");

  const [charts, setCharts] = useState<BaziRecord[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [chats, setChats] = useState<ChatSessionRecord[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.data) setProfile(payload.data);
      })
      .catch(() => undefined);
  }, []);

  const loadCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const res = await fetch("/api/bazi/history", { cache: "no-store" });
      const payload = await res.json();
      if (payload?.success) setCharts(payload.data);
    } catch {
      setError("八字记录加载失败");
    } finally {
      setChartsLoading(false);
    }
  }, []);

  const loadChats = useCallback(async () => {
    setChatsLoading(true);
    try {
      const res = await fetch("/api/chat/sessions", { cache: "no-store" });
      const payload = await res.json();
      if (payload?.success) setChats(payload.data);
    } catch {
      setError("对话记录加载失败");
    } finally {
      setChatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCharts();
    loadChats();
  }, [loadCharts, loadChats]);

  const deleteChart = async (id: string, name: string) => {
    if (!window.confirm(`确定删除「${name}」的八字记录吗？删除后无法恢复。`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/bazi/history/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCharts((prev) => prev.filter((c) => c.id !== id));
    } catch {
      window.alert("删除失败，请稍后重试");
    } finally {
      setDeleting(null);
    }
  };

  const deleteChat = async (id: string, title: string) => {
    if (!window.confirm(`确定删除对话「${title}」吗？删除后无法恢复。`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setChats((prev) => prev.filter((c) => c.id !== id));
    } catch {
      window.alert("删除失败，请稍后重试");
    } finally {
      setDeleting(null);
    }
  };

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
        <p className="text-xs text-[var(--muted-foreground)] mt-3">
          八字记录 {chartsLoading ? "…" : charts.length} 份 · AI 对话 {chatsLoading ? "…" : chats.length} 段
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-[var(--radius-pill)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: "var(--primary)" }}
        >
          <LogOut size={15} aria-hidden="true" />
          退出登录
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
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

      {/* 历史记录 */}
      <div className="flex gap-1 rounded-xl bg-[var(--muted)] p-1 w-fit mb-4">
        {([
          { key: "bazi", label: "八字记录" },
          { key: "chat", label: "AI 对话记录" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              tab === key ? "text-white" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
            style={tab === key ? { background: "var(--primary)" } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      {tab === "bazi" && (
        <div className="space-y-3">
          {chartsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : charts.length === 0 ? (
            <EmptyState text="还没有八字记录，排一次盘会自动保存到这里。" href="/bazi" cta="去八字排盘" />
          ) : (
            charts.map((c) => (
              <div key={c.id} className="guanji-card p-4 flex items-center gap-3">
                <Link href={`/profile/bazi/${c.id}`} className="flex-1 min-w-0 group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[var(--foreground)] group-hover:underline">{c.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {c.gender === "male" ? "男" : "女"} · 日主 {c.day_master ?? "--"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {c.is_lunar ? "农历" : "公历"} {c.birth_year}年{c.birth_month}月{c.birth_day}日
                    {c.birth_hour != null ? ` ${c.birth_hour}时` : ""}
                    {c.birth_place ? ` · ${c.birth_place}` : ""}
                  </p>
                  <p className="text-sm font-medium tracking-widest mt-1" style={{ color: "var(--primary)" }}>
                    {[c.year_pillar, c.month_pillar, c.day_pillar, c.hour_pillar].map(pillar).join(" ")}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">排盘于 {formatDateTime(c.created_at)}</p>
                </Link>
                <button
                  onClick={() => deleteChart(c.id, c.name)}
                  disabled={deleting === c.id}
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  aria-label="删除八字记录"
                >
                  {deleting === c.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "chat" && (
        <div className="space-y-3">
          {chatsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : chats.length === 0 ? (
            <EmptyState text="还没有 AI 对话记录，和玄机聊过后会自动保存到这里。" href="/ai-chat" cta="开始对话" />
          ) : (
            chats.map((s) => (
              <div key={s.id} className="guanji-card p-4 flex items-center gap-3">
                <Link href={`/ai-chat?session=${s.id}`} className="flex-1 min-w-0 group">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-[var(--foreground)] truncate group-hover:underline">{s.title}</span>
                    <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">{formatDateTime(s.updated_at)}</span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {s.last_message
                      ? `${s.last_message.role === "user" ? "我" : "玄机"}：${s.last_message.content.replace(/\s+/g, " ")}`
                      : "（暂无消息）"}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">{s.message_count} 条消息</p>
                </Link>
                <button
                  onClick={() => deleteChat(s.id, s.title)}
                  disabled={deleting === s.id}
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  aria-label="删除对话"
                >
                  {deleting === s.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
