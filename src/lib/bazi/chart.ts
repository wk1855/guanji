import { Lunar, LunarYear, Solar } from "lunar-javascript";
import { lookupLongitude } from "./longitudes";
import { chinaDstMinutes, equationOfTimeMinutes, isMainlandPlace } from "./solarTime";

export type FiveElement = "木" | "火" | "土" | "金" | "水";

export interface BaziPillar {
  tianGan: string;
  diZhi: string;
  wuXing: FiveElement;
}

/** 每柱的十神 / 藏干 / 十二长生 / 旬空等细节 */
export interface PillarDetail {
  name: "年柱" | "月柱" | "日柱" | "时柱";
  ganZhi: string;
  shiShenGan: string; // 天干十神（日柱为「日主」）
  hideGan: string[]; // 地支藏干
  shiShenZhi: string[]; // 藏干十神
  diShi: string; // 十二长生（日主在该支的状态）
  naYin: string;
  xunKong: string; // 该柱所在旬的空亡
}

export interface DaYunStep {
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  ganZhi: string;
}

export interface ComputedBaziChart {
  /** 用于排盘的真太阳时 */
  solar: { year: number; month: number; day: number; hour: number; minute: number };
  /** 用户填写的钟表时间（公历） */
  clock: { year: number; month: number; day: number; hour: number; minute: number };
  hourKnown: boolean;
  lunar: {
    year: number;
    month: number;
    day: number;
    isLeapMonth: boolean;
    monthChinese: string;
    dayChinese: string;
    yearGanZhi: string;
    shengXiao: string;
  };
  trueSolar: {
    applied: boolean;
    longitude?: number;
    /** 总修正分钟（经度 + 均时差 − 夏令时） */
    offsetMinutes: number;
    longitudeMinutes: number;
    eotMinutes: number;
    dstMinutes: number;
    hour: number;
    minute: number;
  };
  yearPillar: BaziPillar;
  monthPillar: BaziPillar;
  dayPillar: BaziPillar;
  /** 时辰不详时为 null（三柱） */
  hourPillar: BaziPillar | null;
  dayMaster: string;
  /** 五行力量估算：天干 + 地支藏干加权，月令（月支）权重加倍；归一为百分比 */
  wuXingBalance: Record<FiveElement, number>;
  nayin: { year: string; month: string; day: string; hour: string };
  details: PillarDetail[];
  taiYuan: string;
  mingGong: string;
  shenGong: string;
  /** 大运（需要性别；未提供性别时为空数组） */
  daYun: DaYunStep[];
  daYunStart?: { years: number; months: number; days: number; solarDate: string };
}

export interface ComputeBaziInput {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  /** 0–23；hourKnown=false 时忽略 */
  birthHour?: number | null;
  birthMinute?: number | null;
  hourKnown?: boolean;
  isLunar?: boolean;
  /** 农历闰月 */
  isLeapMonth?: boolean;
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
const MONTH_BRANCH_FACTOR = 2; // 月令加倍

export function daysInSolarMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function assertInt(v: number, min: number, max: number, msg: string) {
  if (!Number.isInteger(v) || v < min || v > max) throw new Error(msg);
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
  const sum = entries.reduce((a, [, v]) => a + v, 0);
  if (sum !== 100) {
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    sorted[0][1] += 100 - sum;
  }
  const get = (k: FiveElement) => entries.find(([x]) => x === k)?.[1] ?? 0;
  return { 木: get("木"), 火: get("火"), 土: get("土"), 金: get("金"), 水: get("水") };
}

/** 把用户输入解析为公历钟表时间 */
function resolveClockSolar(input: ComputeBaziInput, hour: number, minute: number): Solar {
  if (input.isLunar) {
    assertInt(input.birthMonth, 1, 12, "农历月份无效");
    assertInt(input.birthDay, 1, 30, "农历日期无效");
    if (input.isLeapMonth) {
      const leap = LunarYear.fromYear(input.birthYear).getLeapMonth();
      if (leap !== input.birthMonth) {
        throw new Error(
          leap ? `农历${input.birthYear}年的闰月是闰${leap}月，不是闰${input.birthMonth}月` : `农历${input.birthYear}年没有闰月`
        );
      }
    }
    const month = input.isLeapMonth ? -input.birthMonth : input.birthMonth;
    const days = LunarYear.fromYear(input.birthYear).getMonth(month)?.getDayCount() ?? 30;
    if (input.birthDay > days) {
      throw new Error(`农历${input.birthYear}年${input.isLeapMonth ? "闰" : ""}${input.birthMonth}月只有 ${days} 天`);
    }
    return Lunar.fromYmdHms(input.birthYear, month, input.birthDay, hour, minute, 0).getSolar();
  }
  assertInt(input.birthMonth, 1, 12, "出生月份无效");
  const dim = daysInSolarMonth(input.birthYear, input.birthMonth);
  assertInt(input.birthDay, 1, dim, `${input.birthYear}年${input.birthMonth}月只有 ${dim} 天`);
  return Solar.fromYmdHms(input.birthYear, input.birthMonth, input.birthDay, hour, minute, 0);
}

export function computeBaziChart(input: ComputeBaziInput): ComputedBaziChart {
  assertInt(input.birthYear, 1900, 2100, "出生年份无效");
  const hourKnown = input.hourKnown !== false && input.birthHour != null;
  const hour = hourKnown ? Number(input.birthHour) : 12;
  const minute = hourKnown ? Number(input.birthMinute ?? 0) : 0;
  assertInt(hour, 0, 23, "出生时辰无效");
  assertInt(minute, 0, 59, "出生分钟无效");

  const clock = resolveClockSolar(input, hour, minute);
  const clockParts = {
    year: clock.getYear(),
    month: clock.getMonth(),
    day: clock.getDay(),
    hour: clock.getHour(),
    minute: clock.getMinute(),
  };

  const longitude = lookupLongitude(input.birthPlace);
  // 1) 夏令时：钟表时间 → 北京标准时
  const dstMinutes = chinaDstMinutes(clockParts, {
    inMainland: isMainlandPlace(input.birthPlace, longitude != null),
  });
  // 2) 经度 + 均时差：标准时 → 真太阳时（仅在已知经度时）
  const standardUtc = new Date(
    Date.UTC(clockParts.year, clockParts.month - 1, clockParts.day, clockParts.hour, clockParts.minute) -
      dstMinutes * 60000 -
      8 * 3600000
  );
  const longitudeMinutes = longitude != null ? (longitude - 120) * 4 : 0;
  const eotMinutes = longitude != null ? equationOfTimeMinutes(standardUtc) : 0;
  const offsetMinutes = Math.round(longitudeMinutes + eotMinutes - dstMinutes);

  const adjusted = hourKnown
    ? Solar.fromJulianDay(clock.getJulianDay() + offsetMinutes / 1440)
    : clock; // 时辰不详：按当天正午取日柱
  const lunar = adjusted.getLunar();
  const eightChar = lunar.getEightChar();
  // 派别 2：晚子时（23:00–24:00）日柱仍记当天，时柱取次日的子时（早晚子时分论）。
  // 派别 1 则是 23:00 即换日。本站采用派别 2。
  eightChar.setSect(2);

  const yearPillar = toPillar(eightChar.getYearGan(), eightChar.getYearZhi());
  const monthPillar = toPillar(eightChar.getMonthGan(), eightChar.getMonthZhi());
  const dayPillar = toPillar(eightChar.getDayGan(), eightChar.getDayZhi());
  const hourPillar = hourKnown ? toPillar(eightChar.getTimeGan(), eightChar.getTimeZhi()) : null;

  const scores: Record<FiveElement, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const pillarsForScore = [
    { gan: eightChar.getYearGan(), hide: eightChar.getYearHideGan(), factor: 1 },
    { gan: eightChar.getMonthGan(), hide: eightChar.getMonthHideGan(), factor: MONTH_BRANCH_FACTOR },
    { gan: eightChar.getDayGan(), hide: eightChar.getDayHideGan(), factor: 1 },
    ...(hourKnown ? [{ gan: eightChar.getTimeGan(), hide: eightChar.getTimeHideGan(), factor: 1 }] : []),
  ];
  for (const p of pillarsForScore) {
    addScore(scores, p.gan, PILLAR_STEM_WEIGHT);
    p.hide.forEach((gan, idx) => addScore(scores, gan, (HIDDEN_STEM_WEIGHTS[idx] ?? 1) * p.factor));
  }

  const details: PillarDetail[] = [
    {
      name: "年柱",
      ganZhi: eightChar.getYear(),
      shiShenGan: eightChar.getYearShiShenGan(),
      hideGan: eightChar.getYearHideGan(),
      shiShenZhi: eightChar.getYearShiShenZhi(),
      diShi: eightChar.getYearDiShi(),
      naYin: eightChar.getYearNaYin(),
      xunKong: eightChar.getYearXunKong(),
    },
    {
      name: "月柱",
      ganZhi: eightChar.getMonth(),
      shiShenGan: eightChar.getMonthShiShenGan(),
      hideGan: eightChar.getMonthHideGan(),
      shiShenZhi: eightChar.getMonthShiShenZhi(),
      diShi: eightChar.getMonthDiShi(),
      naYin: eightChar.getMonthNaYin(),
      xunKong: eightChar.getMonthXunKong(),
    },
    {
      name: "日柱",
      ganZhi: eightChar.getDay(),
      shiShenGan: "日主",
      hideGan: eightChar.getDayHideGan(),
      shiShenZhi: eightChar.getDayShiShenZhi(),
      diShi: eightChar.getDayDiShi(),
      naYin: eightChar.getDayNaYin(),
      xunKong: eightChar.getDayXunKong(),
    },
    ...(hourKnown
      ? [
          {
            name: "时柱" as const,
            ganZhi: eightChar.getTime(),
            shiShenGan: eightChar.getTimeShiShenGan(),
            hideGan: eightChar.getTimeHideGan(),
            shiShenZhi: eightChar.getTimeShiShenZhi(),
            diShi: eightChar.getTimeDiShi(),
            naYin: eightChar.getTimeNaYin(),
            xunKong: eightChar.getTimeXunKong(),
          },
        ]
      : []),
  ];

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
    solar: {
      year: adjusted.getYear(),
      month: adjusted.getMonth(),
      day: adjusted.getDay(),
      hour: adjusted.getHour(),
      minute: adjusted.getMinute(),
    },
    clock: clockParts,
    hourKnown,
    lunar: {
      year: lunar.getYear(),
      month: Math.abs(lunar.getMonth()),
      day: lunar.getDay(),
      isLeapMonth: lunar.getMonth() < 0,
      monthChinese: lunar.getMonthInChinese(),
      dayChinese: lunar.getDayInChinese(),
      yearGanZhi: lunar.getYearInGanZhi(),
      shengXiao: lunar.getYearShengXiao(),
    },
    trueSolar: {
      applied: hourKnown && offsetMinutes !== 0,
      longitude,
      offsetMinutes,
      longitudeMinutes: Math.round(longitudeMinutes * 10) / 10,
      eotMinutes: Math.round(eotMinutes * 10) / 10,
      dstMinutes,
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
      hour: hourKnown ? eightChar.getTimeNaYin() : "",
    },
    details,
    taiYuan: eightChar.getTaiYuan(),
    mingGong: hourKnown ? eightChar.getMingGong() : "",
    shenGong: hourKnown ? eightChar.getShenGong() : "",
    daYun,
    daYunStart,
  };
}

/** 当前（指定年份）所在大运 */
export function currentDaYun(daYun: DaYunStep[], year = new Date().getFullYear()): DaYunStep | undefined {
  return daYun.find((d) => year >= d.startYear && year <= d.endYear);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatChartForPrompt(chart: ComputedBaziChart, today?: { date: string; yearGanZhi: string; dayGanZhi?: string }): string {
  const p = (x: BaziPillar | null) => (x ? `${x.tianGan}${x.diZhi}（天干五行${x.wuXing}）` : "时辰不详（三柱论命）");
  const ts = chart.trueSolar;
  const cur = currentDaYun(chart.daYun);
  const timeLine = chart.hourKnown
    ? `出生钟表时间：${chart.clock.year}年${chart.clock.month}月${chart.clock.day}日 ${pad2(chart.clock.hour)}:${pad2(chart.clock.minute)}；真太阳时：${chart.solar.year}年${chart.solar.month}月${chart.solar.day}日 ${pad2(chart.solar.hour)}:${pad2(chart.solar.minute)}`
    : `出生日期：${chart.clock.year}年${chart.clock.month}月${chart.clock.day}日（时辰不详）`;
  const corr = chart.hourKnown
    ? ts.longitude != null
      ? `修正：经度约${ts.longitude}°E ${ts.longitudeMinutes >= 0 ? "+" : ""}${ts.longitudeMinutes}分，均时差 ${ts.eotMinutes >= 0 ? "+" : ""}${ts.eotMinutes}分${ts.dstMinutes ? `，夏令时 −${ts.dstMinutes}分` : ""}`
      : `未识别出生地经度，按钟表时间排盘${ts.dstMinutes ? `（已扣夏令时 ${ts.dstMinutes} 分）` : ""}`
    : "";
  return [
    timeLine,
    corr,
    `农历：${chart.lunar.year}年${chart.lunar.isLeapMonth ? "闰" : ""}${chart.lunar.monthChinese}月${chart.lunar.dayChinese}（${chart.lunar.yearGanZhi} / ${chart.lunar.shengXiao}）`,
    `年柱：${p(chart.yearPillar)}`,
    `月柱：${p(chart.monthPillar)}`,
    `日柱：${p(chart.dayPillar)}`,
    `时柱：${p(chart.hourPillar)}`,
    `日主：${chart.dayMaster}`,
    "各柱细节（十神 / 藏干及其十神 / 十二长生 / 纳音 / 空亡）：",
    ...chart.details.map(
      (d) =>
        `  ${d.name} ${d.ganZhi}：天干${d.shiShenGan}；藏干${d.hideGan.map((g, i) => `${g}(${d.shiShenZhi[i] ?? ""})`).join("、")}；${d.diShi}；${d.naYin}；空亡${d.xunKong}`
    ),
    `胎元：${chart.taiYuan}${chart.mingGong ? `　命宫：${chart.mingGong}　身宫：${chart.shenGong}` : ""}`,
    chart.daYun.length
      ? `大运（${chart.daYunStart ? `${chart.daYunStart.years}岁${chart.daYunStart.months}个月起运` : ""}）：${chart.daYun.map((d) => `${d.ganZhi}(${d.startYear}-${d.endYear})`).join(" ")}`
      : "",
    cur ? `当前大运：${cur.ganZhi}（${cur.startYear}-${cur.endYear}，${cur.startAge}-${cur.endAge}岁）` : "",
    today ? `今天：${today.date}，流年${today.yearGanZhi}${today.dayGanZhi ? `，流日${today.dayGanZhi}` : ""}` : "",
    `五行力量估算（天干+藏干加权，月令加倍，归一化百分比）：木${chart.wuXingBalance.木}% 火${chart.wuXingBalance.火}% 土${chart.wuXingBalance.土}% 金${chart.wuXingBalance.金}% 水${chart.wuXingBalance.水}%`,
  ]
    .filter(Boolean)
    .join("\n");
}
