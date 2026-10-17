"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { User, Trash2, Loader2, ChevronRight, ChevronDown, UserCheck, Check } from "lucide-react";
import { useSession } from "next-auth/react";

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
  is_default?: boolean;
}

interface MbtiRecord {
  id: string;
  mbti_type: string;
  e_score: number;
  i_score: number;
  s_score: number;
  n_score: number;
  t_score: number;
  f_score: number;
  j_score: number;
  p_score: number;
  element_affinity: string | null;
  created_at: string;
  ai_reading?: string | null;
}

interface ChatSessionRecord {
  id: string;
  title: string;
  message_count: number;
  updated_at: string;
  last_message: { role: string; content: string; created_at: string } | null;
}

type Tab = "bazi" | "chat" | "mbti";
const TABS: { key: Tab; label: string }[] = [
  { key: "bazi", label: "八字" },
  { key: "chat", label: "对话" },
  { key: "mbti", label: "MBTI" },
];

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
        className="inline-flex h-10 items-center gap-1 px-5 rounded-[var(--radius-pill)] text-white text-sm font-semibold"
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
  const [mbtis, setMbtis] = useState<MbtiRecord[]>([]);
  const [mbtisLoading, setMbtisLoading] = useState(true);
  const [openMbti, setOpenMbti] = useState<string | null>(null);
  const [mbtiDetail, setMbtiDetail] = useState<Record<string, MbtiRecord>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "chat" || t === "mbti" || t === "bazi") setTab(t);
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  };

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

  const loadMbtis = useCallback(async () => {
    setMbtisLoading(true);
    try {
      const res = await fetch("/api/mbti/history", { cache: "no-store" });
      const payload = await res.json();
      if (payload?.success) setMbtis(payload.data);
    } catch {
      setError("MBTI 记录加载失败");
    } finally {
      setMbtisLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCharts();
    loadChats();
    loadMbtis();
  }, [loadCharts, loadChats, loadMbtis]);

  const toggleDefault = async (c: BaziRecord) => {
    setSettingDefault(c.id);
    try {
      const res = await fetch("/api/user/default-chart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartId: c.is_default ? null : c.id }),
      });
      const payload = await res.json();
      if (!payload?.success) throw new Error();
      const newId: string | null = payload.data.chartId;
      setCharts((prev) => prev.map((x) => ({ ...x, is_default: x.id === newId })));
    } catch {
      window.alert("设置失败，请稍后重试");
    } finally {
      setSettingDefault(null);
    }
  };

  const toggleMbti = async (id: string) => {
    if (openMbti === id) {
      setOpenMbti(null);
      return;
    }
    setOpenMbti(id);
    if (!mbtiDetail[id]) {
      try {
        const res = await fetch(`/api/mbti/history/${id}`, { cache: "no-store" });
        const payload = await res.json();
        if (payload?.success) setMbtiDetail((prev) => ({ ...prev, [id]: payload.data }));
      } catch {
        // 详情加载失败时只显示得分
      }
    }
  };

  const deleteMbti = async (id: string, type: string) => {
    if (!window.confirm(`确定删除这条 ${type} 测试记录吗？删除后无法恢复。`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/mbti/history/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMbtis((prev) => prev.filter((m) => m.id !== id));
    } catch {
      window.alert("删除失败，请稍后重试");
    } finally {
      setDeleting(null);
    }
  };

  const defaultChart = charts.find((c) => c.is_default) ?? null;

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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/15">
          <User size={22} className="text-[#a99ffb]" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[var(--foreground)]">档案</h1>
          <p className="text-sm text-[var(--muted-foreground)] truncate">
            {name}
            {email ? ` · ${email}` : ""}
          </p>
        </div>
      </div>

      {/* 本人命盘 */}
      <div className="guanji-card p-5 mb-6">
        <p className="text-xs text-[var(--muted-foreground)] mb-1">本人命盘</p>
        {chartsLoading ? (
          <p className="text-sm text-[var(--muted-foreground)]">加载中…</p>
        ) : defaultChart ? (
          <Link href={`/profile/bazi/${defaultChart.id}`} className="block group">
            <p className="font-semibold text-[var(--foreground)] group-hover:underline">
              {defaultChart.name}
              <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">日主 {defaultChart.day_master ?? "--"}</span>
            </p>
            <p className="text-sm tracking-widest mt-1 text-[#a99ffb]">
              {[defaultChart.year_pillar, defaultChart.month_pillar, defaultChart.day_pillar, defaultChart.hour_pillar].map(pillar).join(" ")}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">今日运势、星座解读与 AI 对话默认使用这份命盘</p>
          </Link>
        ) : (
          <p className="text-sm text-amber-300/90">
            {charts.length
              ? "还没有设置本人命盘，目前默认使用最近保存的一份。在下方列表点「设为本人」即可指定。"
              : "还没有命盘。先去排一次盘，再设为本人命盘。"}
          </p>
        )}
        <p className="text-xs text-[var(--muted-foreground)] mt-3">
          八字 {chartsLoading ? "…" : charts.length} 份 · 对话 {chatsLoading ? "…" : chats.length} 段 · MBTI {mbtisLoading ? "…" : mbtis.length} 次
        </p>
      </div>

      {/* 历史记录 */}
      <div className="flex gap-1 rounded-xl bg-[var(--muted)] p-1 w-fit mb-4" role="tablist">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => switchTab(key)}
            className={`h-10 rounded-lg px-5 text-sm font-medium transition-all ${
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
                    {c.is_default && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">本人</span>
                    )}
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {c.gender === "male" ? "男" : "女"} · 日主 {c.day_master ?? "--"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {c.is_lunar ? "农历" : "公历"} {c.birth_year}年{c.birth_month}月{c.birth_day}日
                    {c.birth_hour != null ? ` ${c.birth_hour}时` : ""}
                    {c.birth_place ? ` · ${c.birth_place}` : ""}
                  </p>
                  <p className="text-sm font-medium tracking-widest mt-1 text-[#a99ffb]">
                    {[c.year_pillar, c.month_pillar, c.day_pillar, c.hour_pillar].map(pillar).join(" ")}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">排盘于 {formatDateTime(c.created_at)}</p>
                </Link>
                <button
                  onClick={() => toggleDefault(c)}
                  disabled={settingDefault === c.id}
                  aria-pressed={!!c.is_default}
                  className={`shrink-0 h-10 px-3 rounded-lg text-xs flex items-center gap-1 border disabled:opacity-50 ${
                    c.is_default
                      ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-white hover:bg-white/5"
                  }`}
                  title={c.is_default ? "取消本人命盘" : "设为本人命盘"}
                >
                  {settingDefault === c.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : c.is_default ? (
                    <Check size={14} />
                  ) : (
                    <UserCheck size={14} />
                  )}
                  {c.is_default ? "本人" : "设为本人"}
                </button>
                <button
                  onClick={() => deleteChart(c.id, c.name)}
                  disabled={deleting === c.id}
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
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
            <EmptyState text="还没有 AI 对话记录，和 AI 命理师聊过后会自动保存到这里。" href="/ai-chat" cta="开始对话" />
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
                      ? `${s.last_message.role === "user" ? "我" : "AI"}：${s.last_message.content.replace(/\s+/g, " ")}`
                      : "（暂无消息）"}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">{s.message_count} 条消息</p>
                </Link>
                <button
                  onClick={() => deleteChat(s.id, s.title)}
                  disabled={deleting === s.id}
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  aria-label="删除对话"
                >
                  {deleting === s.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            ))
          )}
        </div>
      )}
      {tab === "mbti" && (
        <div className="space-y-3">
          {mbtisLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : mbtis.length === 0 ? (
            <EmptyState text="还没有 MBTI 记录，完成一次测试会自动保存到这里。" href="/mbti" cta="去做 MBTI" />
          ) : (
            mbtis.map((m) => {
              const open = openMbti === m.id;
              const detail = mbtiDetail[m.id];
              const dims: [string, number, string, number][] = [
                ["E 外向", m.e_score, "I 内向", m.i_score],
                ["S 感觉", m.s_score, "N 直觉", m.n_score],
                ["T 思考", m.t_score, "F 情感", m.f_score],
                ["J 判断", m.j_score, "P 感知", m.p_score],
              ];
              return (
                <div key={m.id} className="guanji-card p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleMbti(m.id)}
                      aria-expanded={open}
                      className="flex-1 min-w-0 min-h-[44px] text-left flex items-center gap-3"
                    >
                      <span className="text-lg font-bold tracking-widest text-[#a99ffb]">{m.mbti_type}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {m.element_affinity ? `五行亲和 ${m.element_affinity} · ` : ""}
                        {formatDateTime(m.created_at)}
                      </span>
                      <ChevronDown size={16} className={`ml-auto shrink-0 text-[var(--muted-foreground)] transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    <button
                      onClick={() => deleteMbti(m.id, m.mbti_type)}
                      disabled={deleting === m.id}
                      className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      aria-label="删除 MBTI 记录"
                    >
                      {deleting === m.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                  {open && (
                    <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                      {dims.map(([l, lv, r, rv]) => (
                        <div key={l} className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                          <span className="w-20 shrink-0 whitespace-nowrap">{l} {lv}%</span>
                          <div className="h-1.5 flex-1 rounded-full bg-[var(--muted)] overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${lv}%` }} />
                          </div>
                          <span className="w-20 shrink-0 whitespace-nowrap text-right">{rv}% {r}</span>
                        </div>
                      ))}
                      {detail?.ai_reading && (
                        <p className="pt-2 text-sm leading-7 text-[var(--foreground)] whitespace-pre-wrap">{detail.ai_reading}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
