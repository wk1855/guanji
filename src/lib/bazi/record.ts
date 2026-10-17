import { computeBaziChart, type DaYunStep } from "./chart";

export interface BaziRecordRow {
  id: string;
  name: string;
  gender: "male" | "female";
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_hour: number | null;
  birth_place: string | null;
  is_lunar: boolean;
  result_json: Record<string, unknown> & { meta?: Record<string, unknown> };
  created_at: string;
  [key: string]: unknown;
}

/** 旧记录没有大运数据时，按保存的出生信息补算（不改动数据库） */
export function ensureDaYun<T extends BaziRecordRow>(row: T): T {
  const meta = (row.result_json?.meta ?? {}) as { daYun?: DaYunStep[] };
  if (Array.isArray(meta.daYun) && meta.daYun.length > 0) return row;
  try {
    const chart = computeBaziChart({
      birthYear: row.birth_year,
      birthMonth: row.birth_month,
      birthDay: row.birth_day,
      birthHour: row.birth_hour ?? 12,
      isLunar: row.is_lunar,
      birthPlace: row.birth_place ?? undefined,
      gender: row.gender,
    });
    return {
      ...row,
      result_json: {
        ...row.result_json,
        meta: { ...meta, daYun: chart.daYun, daYunStart: chart.daYunStart },
      },
    };
  } catch {
    return row;
  }
}

const pillarText = (p: unknown) => {
  const x = p as { tianGan?: string; diZhi?: string } | null;
  return x?.tianGan && x?.diZhi ? `${x.tianGan}${x.diZhi}` : "";
};

/** 把已保存的命盘整理成给 AI 的文字 */
export function formatSavedChartForPrompt(row: BaziRecordRow): string {
  const r = ensureDaYun(row).result_json as Record<string, unknown> & {
    meta?: { daYun?: DaYunStep[]; nayin?: Record<string, string> };
    wuXingBalance?: Record<string, number>;
    basicReading?: string[];
  };
  const pillars = [r.yearPillar, r.monthPillar, r.dayPillar, r.hourPillar].map(pillarText);
  const wx = r.wuXingBalance
    ? Object.entries(r.wuXingBalance).map(([k, v]) => `${k}${v}%`).join(" ")
    : "未知";
  const daYun = r.meta?.daYun?.length
    ? r.meta.daYun.map((d) => `${d.ganZhi}(${d.startYear}-${d.endYear})`).join(" ")
    : "未知";
  const current = r.meta?.daYun?.find((d) => {
    const y = new Date().getFullYear();
    return y >= d.startYear && y <= d.endYear;
  });
  return [
    `命主：${row.name}（${row.gender === "male" ? "男" : "女"}）`,
    `出生：${row.is_lunar ? "农历" : "公历"}${row.birth_year}年${row.birth_month}月${row.birth_day}日 ${row.birth_hour ?? "未知"}时 · ${row.birth_place ?? "出生地未填"}`,
    `四柱：${pillars.join(" ")}（年 月 日 时）`,
    `日主：${String(r.dayMaster ?? "")}`,
    `五行占比：${wx}`,
    `大运：${daYun}`,
    current ? `当前大运：${current.ganZhi}（${current.startYear}-${current.endYear}）` : "",
    r.basicReading?.[0] ? `原盘格局摘要：${String(r.basicReading[0]).slice(0, 200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
