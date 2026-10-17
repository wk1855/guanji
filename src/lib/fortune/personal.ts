import type { FortuneScope, PeriodContext } from "./period";

export interface PersonalFortune {
  scope: FortuneScope;
  sign: string | null;
  periodLabel: string;
  generatedAt: string;
  chart: { id: string; name: string; pillars: string; dayMaster: string } | null;
  title: string;
  overallStars: number;
  overallSummary: string;
  baziInsight: string;
  zodiacInsight: string;
  dimensions: { label: string; stars: number; interpretation: string; advice: string }[];
  timeline: { label: string; ganZhi: string; stars: number; tip: string }[];
  keyDates: { date: string; note: string }[];
  yi: string[];
  ji: string[];
  lucky: { color: string; number: number; direction: string };
  actions: string[];
}

const clampStars = (n: unknown) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(5, Math.max(1, v)) : 3;
};
const str = (v: unknown, max = 600) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strArr = (v: unknown, n: number) =>
  Array.isArray(v) ? v.map((x) => str(x, 80)).filter(Boolean).slice(0, n) : [];

/** 时间轴骨架：today=三个时段；week=7天；month=按周 */
export function timelineSkeleton(ctx: PeriodContext): { label: string; ganZhi: string }[] {
  if (ctx.scope === "today") {
    const gz = ctx.days[0]?.ganZhi ?? "";
    return [
      { label: "上午", ganZhi: gz },
      { label: "下午", ganZhi: gz },
      { label: "晚上", ganZhi: gz },
    ];
  }
  if (ctx.scope === "week") return ctx.days.map((d) => ({ label: d.label, ganZhi: d.ganZhi }));
  return ctx.weeks.map((w) => ({ label: w.label, ganZhi: "" }));
}

/** 规范化模型输出：校验字段，并用历法真实值覆盖时间轴标签与干支 */
export function normalizePersonalFortune(
  raw: Record<string, unknown>,
  ctx: PeriodContext,
  extra: { sign: string | null; chart: PersonalFortune["chart"] }
): PersonalFortune {
  const skeleton = timelineSkeleton(ctx);
  const rawTimeline = Array.isArray(raw.timeline) ? (raw.timeline as Record<string, unknown>[]) : [];
  const timeline = skeleton.map((s, i) => ({
    label: s.label,
    ganZhi: s.ganZhi,
    stars: clampStars(rawTimeline[i]?.stars),
    tip: str(rawTimeline[i]?.tip, 120),
  }));

  const dims = Array.isArray(raw.dimensions) ? (raw.dimensions as Record<string, unknown>[]) : [];
  const labels = ["事业运", "感情运", "财富运", "健康运"];
  const dimensions = labels.map((label) => {
    const d = dims.find((x) => str(x?.label) === label) ?? dims[labels.indexOf(label)] ?? {};
    return {
      label,
      stars: clampStars(d.stars),
      interpretation: str(d.interpretation, 300),
      advice: str(d.advice, 200),
    };
  });

  const lucky = (raw.lucky ?? {}) as Record<string, unknown>;
  const keyDates = Array.isArray(raw.keyDates)
    ? (raw.keyDates as Record<string, unknown>[])
        .map((k) => ({ date: str(k?.date, 20), note: str(k?.note, 160) }))
        .filter((k) => k.date && k.note)
        .slice(0, 6)
    : [];

  return {
    scope: ctx.scope,
    sign: extra.sign,
    periodLabel: ctx.periodLabel,
    generatedAt: new Date().toISOString(),
    chart: extra.chart,
    title: str(raw.title, 40) || "专属运势",
    overallStars: clampStars(raw.overallStars),
    overallSummary: str(raw.overallSummary, 500),
    baziInsight: extra.chart ? str(raw.baziInsight, 600) : "",
    zodiacInsight: extra.sign ? str(raw.zodiacInsight, 600) : "",
    dimensions,
    timeline,
    keyDates: ctx.scope === "today" ? [] : keyDates,
    yi: strArr(raw.yi, 6),
    ji: strArr(raw.ji, 6),
    lucky: {
      color: str(lucky.color, 20),
      number: Math.max(0, Math.round(Number(lucky.number) || 0)),
      direction: str(lucky.direction, 20),
    },
    actions: strArr(raw.actions, 5),
  };
}
