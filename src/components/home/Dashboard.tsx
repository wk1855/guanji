"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  MessageCircle,
  Compass,
  Brain,
  ChevronRight,
  Loader2,
  RefreshCw,
  Star,
  CalendarDays,
} from "lucide-react";
import type { Almanac } from "@/lib/fortune/almanac";
import { DefaultChartHint, NoChartPrompt, usePersonalFortune } from "@/components/fortune/PersonalFortuneCard";

interface DashboardData {
  almanac: Almanac;
  personalChart: { id: string; name: string; pillars: string; dayMaster: string; isDefault: boolean } | null;
  latestChart: { id: string; name: string; pillars: string; createdAt: string } | null;
  recentChats: { id: string; title: string; updatedAt: string; messageCount: number }[];
  mbti: { id: string; type: string; elementAffinity: string | null; createdAt: string } | null;
}

const QUICK_ACTIONS = [
  { href: "/bazi", label: "排盘", icon: BookOpen },
  { href: "/ai-chat", label: "问 AI", icon: MessageCircle },
  { href: "/zodiac", label: "星座", icon: Compass },
  { href: "/mbti", label: "MBTI", icon: Brain },
];

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} 星`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < count ? "fill-amber-400 text-amber-400" : "fill-white/10 text-white/20"}`} />
      ))}
    </span>
  );
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric" });
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="guanji-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MoreLink({ href, label = "全部" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center gap-0.5 text-xs text-[#a99ffb] hover:text-white">
      {label}
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function TodayFortune({ personalChart }: { personalChart: DashboardData["personalChart"] }) {
  const { data, loading, error, noChart, load } = usePersonalFortune("today");

  useEffect(() => {
    if (personalChart) load();
  }, [personalChart, load]);

  if (!personalChart || noChart) return <NoChartPrompt />;

  return (
    <div className="space-y-3">
      {!personalChart.isDefault && <DefaultChartHint name={personalChart.name} />}
      <p className="text-xs text-[var(--muted-foreground)]">
        命盘 · {personalChart.name} · <span className="tracking-widest">{personalChart.pillars}</span>
      </p>
      {loading && !data ? (
        <div className="flex items-center gap-2 py-6 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在结合本人命盘生成今日运势，通常 5–15 秒…
        </div>
      ) : error ? (
        <div className="py-4">
          <p className="mb-2 text-sm text-red-300">{error}</p>
          <button onClick={() => load()} className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm text-white">
            重试
          </button>
        </div>
      ) : data ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-base font-semibold text-white">{data.title}</p>
            <Stars count={data.overallStars} />
          </div>
          <p className="text-sm leading-relaxed text-white/80">{data.overallSummary}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {data.dimensions.map((d) => (
              <div key={d.label} className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-xs text-[var(--muted-foreground)]">{d.label}</p>
                <Stars count={d.stars} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/fortune"
              className="inline-flex h-10 items-center gap-1 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:opacity-90"
            >
              完整解读 · 本周 / 本月
              <ChevronRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-[var(--muted-foreground)] hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              重新生成
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((p) => {
        if (p?.success) setData(p.data);
        else setError(p?.error?.message ?? "加载失败");
      })
      .catch(() => setError("加载失败，请刷新重试"));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="mb-4 text-sm text-red-300">{error}</p>
        <button onClick={() => window.location.reload()} className="h-10 rounded-xl bg-[var(--primary)] px-5 text-sm text-white">
          刷新
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-4 animate-pulse" aria-busy="true">
        <div className="h-16 rounded-2xl bg-white/5" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-64 rounded-2xl bg-white/5 lg:col-span-2" />
          <div className="h-64 rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  const a = data.almanac;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
            <CalendarDays className="h-4 w-4" />
            {a.date} · {a.weekday} · 农历{a.lunarDate}
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-white">{a.ganzhi}</h1>
        </div>
        <nav className="grid w-full grid-cols-4 gap-2 sm:w-auto" aria-label="快捷操作">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-white/90 hover:bg-white/5"
            >
              <Icon className="h-4 w-4 text-[#a99ffb]" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="我的今日运势" action={<MoreLink href="/fortune" label="今日详情" />}>
            <TodayFortune personalChart={data.personalChart} />
          </Card>
        </div>

        <Card title="今日黄历">
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-8 shrink-0 text-emerald-300">宜</dt>
              <dd className="text-white/85">{a.yi.slice(0, 8).join("、") || "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-8 shrink-0 text-red-300">忌</dt>
              <dd className="text-white/85">{a.ji.slice(0, 8).join("、") || "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-8 shrink-0 text-[var(--muted-foreground)]">冲煞</dt>
              <dd className="text-white/85">冲{a.chong} 煞{a.sha}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-8 shrink-0 text-[var(--muted-foreground)]">值日</dt>
              <dd className="text-white/85">
                {a.jianChu}日 · {a.tianShen}（{a.tianShenLuck}）· {a.xiu}宿
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-8 shrink-0 text-[var(--muted-foreground)]">方位</dt>
              <dd className="text-white/85">
                喜神{a.xiShen} · 财神{a.caiShen} · 福神{a.fuShen}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-8 shrink-0 text-[var(--muted-foreground)]">节气</dt>
              <dd className="text-white/85">
                下一个 {a.jieQi.next}（{a.jieQi.nextDate}）
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="最近排盘" action={<MoreLink href="/profile?tab=bazi" />}>
          {data.latestChart ? (
            <Link href={`/profile/bazi/${data.latestChart.id}`} className="block rounded-xl bg-white/5 px-3 py-3 hover:bg-white/10">
              <p className="font-medium text-white">{data.latestChart.name}</p>
              <p className="mt-0.5 text-sm tracking-widest text-[#a99ffb]">{data.latestChart.pillars}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{shortDate(data.latestChart.createdAt)} 排盘</p>
            </Link>
          ) : (
            <MoreLink href="/bazi" label="还没有排盘，去排一次" />
          )}
        </Card>

        <Card title="最近对话" action={<MoreLink href="/profile?tab=chat" />}>
          {data.recentChats.length ? (
            <ul className="space-y-1">
              {data.recentChats.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/ai-chat?session=${c.id}`}
                    className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl px-3 hover:bg-white/5"
                  >
                    <span className="truncate text-sm text-white/90">{c.title}</span>
                    <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{shortDate(c.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <MoreLink href="/ai-chat" label="还没有对话，问问 AI" />
          )}
        </Card>

        <Card title="MBTI" action={<MoreLink href="/profile?tab=mbti" />}>
          {data.mbti ? (
            <div>
              <p className="text-2xl font-bold tracking-[0.3em] text-[#a99ffb]">{data.mbti.type}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {data.mbti.elementAffinity ? `五行亲和 ${data.mbti.elementAffinity} · ` : ""}
                {shortDate(data.mbti.createdAt)} 测试
              </p>
            </div>
          ) : (
            <MoreLink href="/mbti" label="还没测过，去做 MBTI" />
          )}
        </Card>
      </div>
    </div>
  );
}
