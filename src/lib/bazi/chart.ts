import { Lunar, Solar } from "lunar-javascript";
import { lookupLongitude, trueSolarOffsetMinutes } from "./longitudes";

export type FiveElement = "木" | "火" | "土" | "金" | "水";

export interface BaziPillar {
  tianGan: string;
  diZhi: string;
  wuXing: FiveElement;
}

export interface ComputedBaziChart {
  solar: { year: number; month: number; day: number; hour: number; minute: number };
  lunar: {
    year: number;
    month: number;
    day: number;
    monthChinese: string;
    dayChinese: string;
    yearGanZhi: string;
    shengXiao: string;
  };
  trueSolar: {
    applied: boolean;
    longitude?: number;
    offsetMinutes: number;
    hour: number;
    minute: number;
  };
  yearPillar: BaziPillar;
  monthPillar: BaziPillar;
  dayPillar: BaziPillar;
  hourPillar: BaziPillar;
  dayMaster: string;
  wuXingBalance: Record<FiveElement, number>;
  nayin: { year: string; month: string; day: string; hour: string };
  /** 大运（需要性别；未提供性别时为空数组） */
  daYun: DaYunStep[];
  /** 起运信息，如「出生后 7 年 3 个月 15 天起运」 */
  daYunStart?: { years: number; months: number; days: number; solarDate: string };
}

export interface DaYunStep {
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  ganZhi: string;
}

export interface ComputeBaziInput {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  isLunar?: boolean;
  birthPlace?: string;
  gender?: "male" | "female";
}

const STEM_ELEMENT: Record<string, FiveElement> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

const HIDDEN_STEM_WEIGHTS = [8, 4, 2];
const PILLAR_STEM_WEIGHT = 12;

function assertValidDateParts(year: number, month: number, day: number, hour: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error("出生年份无效");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("出生月份无效");
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error("出生日无效");
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("出生时辰无效");
  }
}

function toPillar(gan: string, zhi: string): BaziPillar {
  const wuXing = STEM_ELEMENT[gan];
  if (!wuXing) throw new Error(`无法识别天干：${gan}`);
  return { tianGan: gan, diZhi: zhi, wuXing };
}

function addScore(scores: Record<FiveElement, number>, gan: string, weight: number) {
  const el = STEM_ELEMENT[gan];
  if (!el) return;
  scores[el] += weight;
}

function normalizeBalance(raw: Record<FiveElement, number>): Record<FiveElement, number> {
  const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
  const entries = (Object.keys(raw) as FiveElement[]).map((k) => [
    k,
    Math.round((raw[k] / total) * 100),
  ]) as Array<[FiveElement, number]>;
  let sum = entries.reduce((a, [, v]) => a + v, 0);
  // 把舍入误差补到最大项，保证合计 100
  if (sum !== 100) {
    entries.sort((a, b) => b[1] - a[1]);
    entries[0][1] += 100 - sum;
  }
  return {
    木: entries.find(([k]) => k === "木")?.[1] ?? 0,
    火: entries.find(([k]) => k === "火")?.[1] ?? 0,
    土: entries.find(([k]) => k === "土")?.[1] ?? 0,
    金: entries.find(([k]) => k === "金")?.[1] ?? 0,
    水: entries.find(([k]) => k === "水")?.[1] ?? 0,
  };
}

function applyJulianMinutes(solar: Solar, minutes: number): Solar {
  if (!minutes) return solar;
  return Solar.fromJulianDay(solar.getJulianDay() + minutes / 1440);
}

export function computeBaziChart(input: ComputeBaziInput): ComputedBaziChart {
  const minute = input.birthMinute ?? 0;
  assertValidDateParts(input.birthYear, input.birthMonth, input.birthDay, input.birthHour);
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("出生分钟无效");
  }

  let solar: Solar;
  if (input.isLunar) {
    const lunar = Lunar.fromYmdHms(
      input.birthYear,
      input.birthMonth,
      input.birthDay,
      input.birthHour,
      minute,
      0
    );
    solar = lunar.getSolar();
  } else {
    solar = Solar.fromYmdHms(
      input.birthYear,
      input.birthMonth,
      input.birthDay,
      input.birthHour,
      minute,
      0
    );
  }

  const longitude = lookupLongitude(input.birthPlace);
  const offsetMinutes = longitude == null ? 0 : trueSolarOffsetMinutes(longitude);
  const adjusted = applyJulianMinutes(solar, offsetMinutes);
  const lunar = adjusted.getLunar();
  const eightChar = lunar.getEightChar();
  // 派别 2：23:00–00:00 的晚子时算次日，与常见命理排盘一致
  eightChar.setSect(2);

  const yearPillar = toPillar(eightChar.getYearGan(), eightChar.getYearZhi());
  const monthPillar = toPillar(eightChar.getMonthGan(), eightChar.getMonthZhi());
  const dayPillar = toPillar(eightChar.getDayGan(), eightChar.getDayZhi());
  const hourPillar = toPillar(eightChar.getTimeGan(), eightChar.getTimeZhi());

  const scores: Record<FiveElement, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const pillars = [
    { gan: eightChar.getYearGan(), hide: eightChar.getYearHideGan() },
    { gan: eightChar.getMonthGan(), hide: eightChar.getMonthHideGan() },
    { gan: eightChar.getDayGan(), hide: eightChar.getDayHideGan() },
    { gan: eightChar.getTimeGan(), hide: eightChar.getTimeHideGan() },
  ];
  for (const p of pillars) {
    addScore(scores, p.gan, PILLAR_STEM_WEIGHT);
    p.hide.forEach((gan, idx) => addScore(scores, gan, HIDDEN_STEM_WEIGHTS[idx] ?? 1));
  }

  let daYun: DaYunStep[] = [];
  let daYunStart: ComputedBaziChart["daYunStart"];
  if (input.gender === "male" || input.gender === "female") {
    const yun = eightChar.getYun(input.gender === "male" ? 1 : 0, 2);
    daYun = yun
      .getDaYun(9)
      .filter((d) => d.getIndex() > 0 && d.getGanZhi())
      .map((d) => ({
        startAge: d.getStartAge(),
        endAge: d.getEndAge(),
        startYear: d.getStartYear(),
        endYear: d.getEndYear(),
        ganZhi: d.getGanZhi(),
      }));
    daYunStart = {
      years: yun.getStartYear(),
      months: yun.getStartMonth(),
      days: yun.getStartDay(),
      solarDate: yun.getStartSolar().toYmd(),
    };
  }

  return {
    daYun,
    daYunStart,
    solar: {
      year: adjusted.getYear(),
      month: adjusted.getMonth(),
      day: adjusted.getDay(),
      hour: adjusted.getHour(),
      minute: adjusted.getMinute(),
    },
    lunar: {
      year: lunar.getYear(),
      month: lunar.getMonth(),
      day: lunar.getDay(),
      monthChinese: lunar.getMonthInChinese(),
      dayChinese: lunar.getDayInChinese(),
      yearGanZhi: lunar.getYearInGanZhi(),
      shengXiao: lunar.getYearShengXiao(),
    },
    trueSolar: {
      applied: longitude != null && offsetMinutes !== 0,
      longitude,
      offsetMinutes,
      hour: adjusted.getHour(),
      minute: adjusted.getMinute(),
    },
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayMaster: eightChar.getDayGan(),
    wuXingBalance: normalizeBalance(scores),
    nayin: {
      year: eightChar.getYearNaYin(),
      month: eightChar.getMonthNaYin(),
      day: eightChar.getDayNaYin(),
      hour: eightChar.getTimeNaYin(),
    },
  };
}

export function formatChartForPrompt(chart: ComputedBaziChart): string {
  const p = (x: BaziPillar) => `${x.tianGan}${x.diZhi}（天干五行${x.wuXing}）`;
  const ts = chart.trueSolar;
  return [
    `公历（真太阳时${ts.applied ? "已修正" : "未修正"}）：${chart.solar.year}年${chart.solar.month}月${chart.solar.day}日 ${String(chart.solar.hour).padStart(2, "0")}:${String(chart.solar.minute).padStart(2, "0")}`,
    ts.longitude != null
      ? `出生地经度约 ${ts.longitude}°E，相对东经120°修正 ${ts.offsetMinutes} 分钟`
      : "未识别出生地经度，使用钟表时间排盘",
    `农历：${chart.lunar.year}年${chart.lunar.monthChinese}月${chart.lunar.dayChinese}（${chart.lunar.yearGanZhi} / ${chart.lunar.shengXiao}）`,
    `年柱：${p(chart.yearPillar)}　纳音：${chart.nayin.year}`,
    `月柱：${p(chart.monthPillar)}　纳音：${chart.nayin.month}`,
    `日柱：${p(chart.dayPillar)}　纳音：${chart.nayin.day}`,
    `时柱：${p(chart.hourPillar)}　纳音：${chart.nayin.hour}`,
    `日主：${chart.dayMaster}`,
    ...(chart.daYun.length
      ? [`大运：${chart.daYun.map((d) => `${d.ganZhi}(${d.startAge}-${d.endAge}岁)`).join(" ")}`]
      : []),
    `五行占比（天干+地支藏干加权后归一）：木${chart.wuXingBalance.木}% 火${chart.wuXingBalance.火}% 土${chart.wuXingBalance.土}% 金${chart.wuXingBalance.金}% 水${chart.wuXingBalance.水}%`,
  ].join("\n");
}
