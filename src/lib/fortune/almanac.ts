import { Solar } from "lunar-javascript";
import { shanghaiToday } from "./period";

const WEEKDAY_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** 由万年历（lunar-javascript）精确计算的当日黄历信息 */
export interface Almanac {
  dateKey: string; // YYYY-MM-DD
  date: string; // 2026年10月17日
  weekday: string;
  lunarDate: string; // 九月初八
  yearGanZhi: string; // 以立春为界
  monthGanZhi: string; // 以节气为界
  dayGanZhi: string;
  ganzhi: string; // 丙午年 · 戊戌月 · 甲子日
  dayNaYin: string;
  shengXiao: string;
  yi: string[];
  ji: string[];
  chong: string; // (戊午)马
  sha: string; // 南
  jianChu: string; // 建除十二值星
  tianShen: string; // 黄道/黑道神
  tianShenLuck: string; // 吉 / 凶
  xiShen: string;
  caiShen: string;
  fuShen: string;
  pengZu: string;
  xiu: string; // 二十八宿
  dayXunKong: string;
  jieQi: { prev: string; prevDate: string; next: string; nextDate: string };
}

export function computeAlmanac(y: number, m: number, d: number): Almanac {
  const solar = Solar.fromYmdHms(y, m, d, 12, 0, 0);
  const l = solar.getLunar();
  const prev = l.getPrevJieQi(true);
  const next = l.getNextJieQi(true);
  const yearGanZhi = l.getYearInGanZhiByLiChun();
  const monthGanZhi = l.getMonthInGanZhiExact();
  const dayGanZhi = l.getDayInGanZhi();
  return {
    dateKey: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    date: `${y}年${m}月${d}日`,
    weekday: WEEKDAY_CN[solar.getWeek()],
    lunarDate: `${l.getMonth() < 0 ? "闰" : ""}${l.getMonthInChinese()}月${l.getDayInChinese()}`,
    yearGanZhi,
    monthGanZhi,
    dayGanZhi,
    ganzhi: `${yearGanZhi}年 · ${monthGanZhi}月 · ${dayGanZhi}日`,
    dayNaYin: l.getDayNaYin(),
    shengXiao: l.getYearShengXiao(),
    yi: l.getDayYi(),
    ji: l.getDayJi(),
    chong: l.getDayChongDesc(),
    sha: l.getDaySha(),
    jianChu: l.getZhiXing(),
    tianShen: l.getDayTianShen(),
    tianShenLuck: l.getDayTianShenLuck(),
    xiShen: l.getDayPositionXiDesc(),
    caiShen: l.getDayPositionCaiDesc(),
    fuShen: l.getDayPositionFuDesc(),
    pengZu: `${l.getPengZuGan()} ${l.getPengZuZhi()}`,
    xiu: `${l.getXiu()}宿（${l.getXiuLuck()}）`,
    dayXunKong: l.getDayXunKong(),
    jieQi: {
      prev: prev.getName(),
      prevDate: prev.getSolar().toYmd(),
      next: next.getName(),
      nextDate: next.getSolar().toYmd(),
    },
  };
}

export function todayAlmanac(now = new Date()): Almanac {
  const { y, m, d } = shanghaiToday(now);
  return computeAlmanac(y, m, d);
}

export function formatAlmanacForPrompt(a: Almanac): string {
  return [
    `公历：${a.date} ${a.weekday}　农历：${a.lunarDate}（${a.shengXiao}年）`,
    `干支：${a.ganzhi}　日纳音：${a.dayNaYin}　日空亡：${a.dayXunKong}`,
    `建除：${a.jianChu}日　值神：${a.tianShen}（${a.tianShenLuck}）　${a.xiu}`,
    `冲煞：冲${a.chong} 煞${a.sha}`,
    `宜：${a.yi.join(" ")}`,
    `忌：${a.ji.join(" ")}`,
    `喜神：${a.xiShen}　财神：${a.caiShen}　福神：${a.fuShen}`,
    `彭祖百忌：${a.pengZu}`,
    `节气：上一个${a.jieQi.prev}（${a.jieQi.prevDate}），下一个${a.jieQi.next}（${a.jieQi.nextDate}）`,
  ].join("\n");
}
