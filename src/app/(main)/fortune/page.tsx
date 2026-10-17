"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import PersonalFortuneCard from "@/components/fortune/PersonalFortuneCard";
import {
  Star,
  Briefcase,
  Heart,
  DollarSign,
  Activity,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Gift,
  ChevronRight,
  Flame,
  Calendar,
  Loader2,
} from "lucide-react";

type TabKey = "today" | "week" | "month";

interface FortuneDimension {
  label: string;
  stars: number;
  summary: string;
  interpretation: string;
  advice: string;
}

interface FortuneData {
  date: string;
  ganzhi: string;
  weekday: string;
  overallStars: number;
  overallScore: string;
  overallSummary: string;
  yi: string[];
  ji: string[];
  dailyTip: string;
  dimensions: FortuneDimension[];
  dailySign: {
    quote: string;
    openingTip: string;
    luckyColor: string;
    luckyNumber: number;
    luckyDirection: string;
  };
}

const DIMENSION_ICONS: Record<string, React.ElementType> = {
  "事业运": Briefcase,
  "感情运": Heart,
  "财富运": DollarSign,
  "健康运": Activity,
};

const DIMENSION_COLORS: Record<string, string> = {
  "事业运": "from-[#5749F4] to-[#818CF8]",
  "感情运": "from-[#EC4899] to-[#F472B6]",
  "财富运": "from-[#D97706] to-[#FBBF24]",
  "健康运": "from-[#10B981] to-[#34D399]",
};

function StarRating({ count, total = 5, size = "md" }: { count: number; total?: number; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < count ? "fill-amber-400 text-amber-400" : "fill-white/10 text-white/10"
          }`}
        />
      ))}
    </div>
  );
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "today", label: "今日" },
  { key: "week",  label: "本周" },
  { key: "month", label: "本月" },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-3xl border border-white/10 bg-[#16123a]/50 p-8">
        <div className="h-4 w-48 bg-white/10 rounded mb-6" />
        <div className="h-5 w-32 bg-white/10 rounded mb-4" />
        <div className="h-4 w-full bg-white/10 rounded" />
        <div className="h-4 w-3/4 bg-white/10 rounded mt-2" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 h-32" />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 h-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-white/8 bg-[#13102a] p-6 h-48" />
        ))}
      </div>
    </div>
  );
}

export default function FortunePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const { data: session, status } = useSession();
  const [checkedIn, setCheckedIn] = useState(false);
  const isLoggedIn = !!session?.user;
  const sessionLoading = status === "loading";

  const [fortune, setFortune] = useState<FortuneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFortune = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/fortune");
      if (!res.ok) throw new Error("请求失败");
      const data = await res.json();
      setFortune(data);
    } catch {
      setError("运势加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFortune();
  }, [fetchFortune]);

  return (
    <main className="min-h-screen bg-[#0d0b1e] text-white pt-20 pb-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">

        <div className="py-8">
          <div className="mb-1 text-xs font-medium tracking-widest text-[#8B7CF6] uppercase">
            命理 · 运势
          </div>
          <h1 className="text-3xl font-serif font-semibold text-white">每日运势</h1>
        </div>

        <div className="mb-8 flex gap-1 rounded-xl bg-white/5 p-1 border border-white/8 w-fit">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-lg px-6 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === key
                  ? "bg-[#5749F4] text-white shadow-lg shadow-[#5749F4]/25"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab !== "today" && (
          <div className="space-y-4">
            <p className="text-sm text-white/45">
              {activeTab === "week"
                ? "本周 7 天逐日运程：结合每日真实干支与你的本命盘，助你合理规划每一天"
                : "本月深度报告：含月度走势、关键节点提醒与个性化建议，结合你的本命盘与当前大运"}
            </p>
            <PersonalFortuneCard key={activeTab} scope={activeTab} autoLoad />
          </div>
        )}

        {activeTab === "today" && (
          <div className="space-y-6">
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
                <p className="text-red-300 mb-4">{error}</p>
                <button
                  onClick={fetchFortune}
                  disabled={loading}
                  className="rounded-xl bg-[#5749F4] px-6 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "加载中..." : "重新加载"}
                </button>
              </div>
            ) : fortune ? (
              <>
                <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#16123a] to-[#0d0b1e] p-8 overflow-hidden">
                  <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#5749F4]/10 blur-2xl pointer-events-none" />
                  <div className="relative z-10">
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Calendar className="h-4 w-4 text-[#8B7CF6]" />
                        <span>{fortune.date}</span>
                        <span className="text-white/30">·</span>
                        <span>{fortune.weekday}</span>
                      </div>
                      <div className="rounded-full bg-[#5749F4]/15 border border-[#5749F4]/25 px-3 py-0.5 text-xs font-medium text-[#A78BFA]">
                        {fortune.ganzhi}
                      </div>
                    </div>
                    <div className="mb-4 flex items-center gap-4">
                      <StarRating count={fortune.overallStars} size="lg" />
                      <span className="text-sm text-white/50">
                        综合运势 {fortune.overallScore} / 5
                      </span>
                    </div>
                    <p className="text-base leading-relaxed text-white/70">
                      {fortune.overallSummary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-300">宜</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {fortune.yi.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-medium text-red-300">忌</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {fortune.ji.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs text-red-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-5 py-4">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-sm leading-relaxed text-amber-200/80">{fortune.dailyTip}</p>
                </div>

                <div>
                  <h2 className="mb-4 text-base font-semibold text-white/60 tracking-wider uppercase text-xs">
                    四维运势详情
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fortune.dimensions.map((dim) => {
                      const Icon = DIMENSION_ICONS[dim.label] || Activity;
                      const color = DIMENSION_COLORS[dim.label] || "from-[#5749F4] to-[#818CF8]";
                      return (
                        <div
                          key={dim.label}
                          className="group rounded-2xl border border-white/8 bg-[#13102a] p-6 hover:border-white/15 transition-all duration-300 hover:-translate-y-0.5"
                        >
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${color}`}>
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-white">{dim.label}</div>
                                <div className="text-xs text-white/40">{dim.summary}</div>
                              </div>
                            </div>
                            <StarRating count={dim.stars} size="sm" />
                          </div>
                          <p className="mb-4 text-xs leading-relaxed text-white/50">{dim.interpretation}</p>
                          <div className="rounded-xl bg-white/3 border border-white/6 px-4 py-3">
                            <div className="mb-1 text-[10px] font-medium tracking-widest text-[#8B7CF6] uppercase">
                              可落地建议
                            </div>
                            <p className="text-xs leading-relaxed text-white/60">{dim.advice}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#5749F4]/25 bg-gradient-to-br from-[#1a1540] to-[#13102a] overflow-hidden">
                  <div className="relative p-8 text-center border-b border-white/8">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(87,73,244,0.12),transparent)] pointer-events-none" />
                    <div className="relative z-10">
                      <div className="mb-2 text-xs font-medium tracking-widest text-[#8B7CF6] uppercase">
                        今日日签
                      </div>
                      <p className="mb-6 text-lg font-serif font-medium text-white leading-relaxed">
                        「{fortune.dailySign.quote}」
                      </p>
                      <p className="mb-6 text-sm text-white/50">{fortune.dailySign.openingTip}</p>
                      <div className="flex flex-wrap justify-center gap-4 text-xs text-white/40">
                        <span>
                          <span className="text-[#8B7CF6]">开运色：</span>
                          {fortune.dailySign.luckyColor}
                        </span>
                        <span>
                          <span className="text-[#8B7CF6]">幸运数：</span>
                          {fortune.dailySign.luckyNumber}
                        </span>
                        <span>
                          <span className="text-[#8B7CF6]">开运方位：</span>
                          {fortune.dailySign.luckyDirection}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-5 flex items-center justify-center gap-2 text-sm text-white/50">
                      <Flame className="h-4 w-4 text-orange-400" />
                      <span>
                        {checkedIn
                          ? "已领取今日日签"
                          : "连续签到可获得额外开运贴士"}
                      </span>
                    </div>

                    {!checkedIn ? (
                      sessionLoading ? (
                        <div className="flex justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                        </div>
                      ) : !isLoggedIn ? (
                        <Link
                          href="/login?callbackUrl=/fortune"
                          className="mx-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5749F4] to-[#7C3AED] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5749F4]/25 hover:opacity-90 transition-opacity w-fit"
                        >
                          <Gift className="h-4 w-4" />
                          登录后领取日签
                        </Link>
                      ) : (
                        <button
                          onClick={() => setCheckedIn(true)}
                          className="mx-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5749F4] to-[#7C3AED] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5749F4]/25 hover:opacity-90 transition-opacity"
                        >
                          <Gift className="h-4 w-4" />
                          领取今日日签
                        </button>
                      )
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        今日已领取，明日再来
                      </div>
                    )}

                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">专属八字运势 · 命理深读</p>
                      <p className="text-sm text-white/45">基于你保存的八字命盘与今日干支，给出个性化解读</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("month")}
                      className="inline-flex items-center gap-1 text-xs text-[#A78BFA] hover:text-white"
                    >
                      深度月度运势报告
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <PersonalFortuneCard scope="today" ctaLabel="生成今日专属解读" />
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
