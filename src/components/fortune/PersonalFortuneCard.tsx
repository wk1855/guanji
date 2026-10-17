"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Briefcase,
  CalendarDays,
  ChevronRight,
  DollarSign,
  Heart,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
} from "lucide-react";
import type { PersonalFortune } from "@/lib/fortune/personal";

type Scope = "today" | "week" | "month";

const DIM_ICONS: Record<string, React.ElementType> = {
  事业运: Briefcase,
  感情运: Heart,
  财富运: DollarSign,
  健康运: Activity,
};

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < count ? "fill-amber-400 text-amber-400" : "fill-white/10 text-white/10"}`}
        />
      ))}
    </div>
  );
}

export function usePersonalFortune(scope: Scope, sign?: string | null) {
  const [data, setData] = useState<PersonalFortune | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noChart, setNoChart] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError("");
      setNoChart(false);
      try {
        const res = await fetch("/api/fortune/personal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope, sign: sign ?? null, refresh }),
        });
        const payload = await res.json().catch(() => null);
        if (payload?.success) {
          setData(payload.data);
          return;
        }
        if (payload?.error?.code === "NO_CHART") {
          setNoChart(true);
          return;
        }
        throw new Error(payload?.error?.message ?? (typeof payload?.error === "string" ? payload.error : "解读失败"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "解读失败");
      } finally {
        setLoading(false);
      }
    },
    [scope, sign]
  );

  useEffect(() => {
    setData(null);
    setError("");
    setNoChart(false);
  }, [scope, sign]);

  return { data, loading, error, noChart, load };
}

export function NoChartPrompt() {
  return (
    <div className="rounded-2xl border border-[#5749F4]/25 bg-[#5749F4]/5 p-5 text-center">
      <p className="text-sm text-white mb-1">还没有保存的八字命盘</p>
      <p className="text-xs text-white/45 mb-4">先排一次八字，系统会自动保存，然后就能结合你的本命盘生成专属解读。</p>
      <Link
        href="/bazi"
        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5749F4] to-[#7C3AED] px-5 py-2 text-xs font-semibold text-white"
      >
        去八字排盘
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/** 渲染个性化运势结果 */
export function PersonalFortuneView({
  data,
  onRefresh,
  refreshing,
}: {
  data: PersonalFortune;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const maxTimeline = data.timeline.length;
  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#16123a] to-[#0d0b1e] p-6 overflow-hidden">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/50">
          <CalendarDays className="h-3.5 w-3.5 text-[#8B7CF6]" />
          <span>{data.periodLabel}</span>
          {data.chart && (
            <span className="rounded-full border border-[#5749F4]/30 bg-[#5749F4]/10 px-2.5 py-0.5 text-[#A78BFA]">
              命盘 · {data.chart.name} · {data.chart.pillars}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="ml-auto inline-flex items-center gap-1 text-white/40 hover:text-white/80 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              重新生成
            </button>
          )}
        </div>
        <div className="mb-2 flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">{data.title}</h3>
          <Stars count={data.overallStars} />
        </div>
        <p className="text-sm leading-relaxed text-white/70">{data.overallSummary}</p>
      </div>

      {data.baziInsight && (
        <div className="rounded-2xl border border-[#5749F4]/25 bg-[#5749F4]/5 p-5">
          <div className="mb-2 text-xs font-medium tracking-widest text-[#8B7CF6]">八字 × 流运</div>
          <p className="text-sm leading-relaxed text-white/70">{data.baziInsight}</p>
        </div>
      )}
      {data.zodiacInsight && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
          <div className="mb-2 text-xs font-medium tracking-widest text-amber-300">星座 × 八字</div>
          <p className="text-sm leading-relaxed text-white/70">{data.zodiacInsight}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.dimensions.map((d) => {
          const Icon = DIM_ICONS[d.label] ?? Activity;
          return (
            <div key={d.label} className="rounded-2xl border border-white/8 bg-[#13102a] p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon className="h-4 w-4 text-[#8B7CF6]" />
                  {d.label}
                </span>
                <Stars count={d.stars} />
              </div>
              <p className="mb-3 text-xs leading-relaxed text-white/55">{d.interpretation}</p>
              <p className="rounded-xl bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/60">
                <span className="text-[#8B7CF6]">建议：</span>
                {d.advice}
              </p>
            </div>
          );
        })}
      </div>

      {maxTimeline > 0 && (
        <div className="rounded-2xl border border-white/8 bg-[#13102a] p-5">
          <div className="mb-4 text-xs font-medium tracking-widest text-white/40">
            {data.scope === "today" ? "分时段走势" : data.scope === "week" ? "逐日走势" : "月度走势"}
          </div>
          <div className="flex items-end gap-2 h-28 mb-3">
            {data.timeline.map((t) => (
              <div key={t.label} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-[#5749F4] to-[#A78BFA]"
                  style={{ height: `${(t.stars / 5) * 100}%` }}
                  title={`${t.stars}/5`}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {data.timeline.map((t) => (
              <div key={t.label} className="flex items-start gap-3 text-xs">
                <span className="w-32 shrink-0 text-white/60">
                  {t.label}
                  {t.ganZhi && <span className="ml-1 text-[#A78BFA]">{t.ganZhi}</span>}
                </span>
                <Stars count={t.stars} />
                <span className="text-white/50 leading-relaxed">{t.tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.keyDates.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-[#13102a] p-5">
          <div className="mb-3 text-xs font-medium tracking-widest text-white/40">关键节点</div>
          <ul className="space-y-2">
            {data.keyDates.map((k) => (
              <li key={k.date + k.note} className="flex gap-3 text-xs">
                <span className="shrink-0 rounded-md bg-[#5749F4]/15 px-2 py-0.5 text-[#A78BFA]">{k.date}</span>
                <span className="text-white/60 leading-relaxed">{k.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(data.yi.length > 0 || data.ji.length > 0) && (
          <div className="rounded-2xl border border-white/8 bg-[#13102a] p-5 text-xs space-y-2">
            {data.yi.length > 0 && (
              <p className="text-white/60">
                <span className="text-emerald-300 mr-2">宜</span>
                {data.yi.join("、")}
              </p>
            )}
            {data.ji.length > 0 && (
              <p className="text-white/60">
                <span className="text-red-300 mr-2">忌</span>
                {data.ji.join("、")}
              </p>
            )}
            <p className="text-white/50">
              开运色 {data.lucky.color || "—"} · 幸运数 {data.lucky.number || "—"} · 方位 {data.lucky.direction || "—"}
            </p>
          </div>
        )}
        {data.actions.length > 0 && (
          <div className="rounded-2xl border border-white/8 bg-[#13102a] p-5">
            <div className="mb-2 text-xs font-medium tracking-widest text-white/40">行动清单</div>
            <ol className="list-decimal pl-4 space-y-1 text-xs text-white/60 leading-relaxed">
              {data.actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

/** 完整卡片：按钮触发 / 自动加载 + 状态处理 */
export default function PersonalFortuneCard({
  scope,
  sign,
  autoLoad = false,
  ctaLabel = "生成专属解读",
  description,
}: {
  scope: Scope;
  sign?: string | null;
  autoLoad?: boolean;
  ctaLabel?: string;
  description?: string;
}) {
  const { data, loading, error, noChart, load } = usePersonalFortune(scope, sign);

  useEffect(() => {
    if (autoLoad) load();
  }, [autoLoad, load]);

  if (data) return <PersonalFortuneView data={data} onRefresh={() => load(true)} refreshing={loading} />;
  if (noChart) return <NoChartPrompt />;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#13102a] p-6 text-center">
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="h-7 w-7 animate-spin text-[#8B7CF6]" />
          <p className="text-sm text-white/50">正在结合命盘与当期干支推演，约需 10–30 秒…</p>
        </div>
      ) : (
        <>
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#8B7CF6]" />
          {description && <p className="mb-4 text-sm text-white/50">{description}</p>}
          {error && <p className="mb-3 text-xs text-red-300">{error}</p>}
          <button
            onClick={() => load()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5749F4] to-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            {error ? "重试" : ctaLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
