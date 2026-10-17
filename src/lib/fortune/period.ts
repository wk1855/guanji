import { Solar } from "lunar-javascript";

export type FortuneScope = "today" | "week" | "month";

const WEEKDAY_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export interface PeriodDay {
  date: string; // YYYY-MM-DD
  label: string; // 10月17日 周六
  ganZhi: string; // 日干支
}

export interface PeriodContext {
  scope: FortuneScope;
  todayKey: string;
  periodLabel: string;
  yearGanZhi: string;
  monthGanZhi: string;
  days: PeriodDay[];
  /** 本月按周切分（仅 month） */
  weeks: { label: string; start: string; end: string }[];
}

/** 取 Asia/Shanghai 的当前日期 */
export function shanghaiToday(now = new Date()): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = parts.split("-").map(Number);
  return { y, m, d };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dayOf(s: Solar): PeriodDay {
  const lunar = s.getLunar();
  return {
    date: `${s.getYear()}-${pad(s.getMonth())}-${pad(s.getDay())}`,
    label: `${s.getMonth()}月${s.getDay()}日 ${WEEKDAY_CN[s.getWeek()]}`,
    ganZhi: lunar.getDayInGanZhiExact(),
  };
}

/** 生成某个时间范围的历法上下文（真实干支），供 AI 解读使用 */
export function buildPeriodContext(scope: FortuneScope, now = new Date()): PeriodContext {
  const { y, m, d } = shanghaiToday(now);
  const today = Solar.fromYmd(y, m, d);
  const lunar = today.getLunar();
  const todayKey = `${y}-${pad(m)}-${pad(d)}`;
  const base = {
    scope,
    todayKey,
    yearGanZhi: lunar.getYearInGanZhiExact(),
    monthGanZhi: lunar.getMonthInGanZhiExact(),
  };

  if (scope === "today") {
    return {
      ...base,
      periodLabel: `${y}年${m}月${d}日 ${WEEKDAY_CN[today.getWeek()]}`,
      days: [dayOf(today)],
      weeks: [],
    };
  }

  if (scope === "week") {
    // 本周一到周日
    const offset = (today.getWeek() + 6) % 7;
    const monday = today.next(-offset);
    const days = Array.from({ length: 7 }, (_, i) => dayOf(monday.next(i)));
    return {
      ...base,
      periodLabel: `${days[0].label.split(" ")[0]} - ${days[6].label.split(" ")[0]}`,
      days,
      weeks: [],
    };
  }

  const first = Solar.fromYmd(y, m, 1);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => dayOf(first.next(i)));
  const weeks: PeriodContext["weeks"] = [];
  for (let i = 0; i < daysInMonth; i += 7) {
    const startDay = i + 1;
    const endDay = Math.min(i + 7, daysInMonth);
    weeks.push({ label: `第${weeks.length + 1}周（${m}/${startDay}-${m}/${endDay}）`, start: days[i].date, end: days[endDay - 1].date });
  }
  return { ...base, periodLabel: `${y}年${m}月`, days, weeks };
}

export function formatPeriodForPrompt(ctx: PeriodContext): string {
  const lines = [`时间范围：${ctx.periodLabel}（今天 ${ctx.todayKey}）`, `流年：${ctx.yearGanZhi}　流月：${ctx.monthGanZhi}`];
  if (ctx.scope === "month") {
    lines.push(`本月分周：${ctx.weeks.map((w) => w.label).join("；")}`);
    lines.push(`逐日干支：${ctx.days.map((d) => `${d.date.slice(5)}${d.ganZhi}`).join(" ")}`);
  } else {
    lines.push(`逐日干支：${ctx.days.map((d) => `${d.label}=${d.ganZhi}`).join("；")}`);
  }
  return lines.join("\n");
}
