declare module "lunar-javascript" {
  export class Solar {
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number
    ): Solar;
    static fromJulianDay(julianDay: number): Solar;
    static fromYmd(year: number, month: number, day: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    getJulianDay(): number;
    getWeek(): number;
    next(days: number): Solar;
    getLunar(): Lunar;
    toYmd(): string;
    toYmdHms(): string;
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar;
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number
    ): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearInGanZhi(): string;
    getYearShengXiao(): string;
    getMonthInGanZhi(): string;
    getYearInGanZhiByLiChun(): string;
    getDayYi(): string[];
    getDayJi(): string[];
    getDayChongDesc(): string;
    getDayChongShengXiao(): string;
    getDaySha(): string;
    getZhiXing(): string;
    getDayTianShen(): string;
    getDayTianShenLuck(): string;
    getDayPositionXiDesc(): string;
    getDayPositionCaiDesc(): string;
    getDayPositionFuDesc(): string;
    getPengZuGan(): string;
    getPengZuZhi(): string;
    getDayNaYin(): string;
    getXiu(): string;
    getXiuLuck(): string;
    getDayXunKong(): string;
    getPrevJieQi(wholeDay?: boolean): JieQi;
    getNextJieQi(wholeDay?: boolean): JieQi;
    getJieQi(): string;
    getDayInGanZhi(): string;
    getYearInGanZhiExact(): string;
    getMonthInGanZhiExact(): string;
    getDayInGanZhiExact(): string;
    getSolar(): Solar;
    getEightChar(): EightChar;
    toString(): string;
  }

  export class JieQi {
    getName(): string;
    getSolar(): Solar;
  }

  export class EightChar {
    setSect(sect: number): void;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getYearHideGan(): string[];
    getMonthHideGan(): string[];
    getDayHideGan(): string[];
    getTimeHideGan(): string[];
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getTimeNaYin(): string;
    getYearWuXing(): string;
    getMonthWuXing(): string;
    getDayWuXing(): string;
    getTimeWuXing(): string;
    getYun(gender: number, sect?: number): Yun;
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getTimeShiShenGan(): string;
    getYearShiShenZhi(): string[];
    getMonthShiShenZhi(): string[];
    getDayShiShenZhi(): string[];
    getTimeShiShenZhi(): string[];
    getYearDiShi(): string;
    getMonthDiShi(): string;
    getDayDiShi(): string;
    getTimeDiShi(): string;
    getYearXunKong(): string;
    getMonthXunKong(): string;
    getDayXunKong(): string;
    getTimeXunKong(): string;
    getTaiYuan(): string;
    getMingGong(): string;
    getShenGong(): string;
    toString(): string;
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear;
    getLeapMonth(): number;
    getMonth(month: number): LunarMonth | null;
  }

  export class LunarMonth {
    getDayCount(): number;
    isLeap(): boolean;
  }

  export class Yun {
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartSolar(): Solar;
    getDaYun(n?: number): DaYun[];
  }

  export class DaYun {
    getIndex(): number;
    getStartAge(): number;
    getEndAge(): number;
    getStartYear(): number;
    getEndYear(): number;
    getGanZhi(): string;
  }
}
