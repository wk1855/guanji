import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeBaziChart, type ComputedBaziChart, type ComputeBaziInput } from "./chart";
import { chinaDstMinutes, equationOfTimeMinutes } from "./solarTime";

const pillars = (c: ComputedBaziChart) =>
  [c.yearPillar, c.monthPillar, c.dayPillar, c.hourPillar].map((p) => (p ? p.tianGan + p.diZhi : "--")).join(" ");
const run = (input: ComputeBaziInput) => pillars(computeBaziChart(input));

describe("参考命盘（来自准确性审计）", () => {
  it("李小龙 1940-11-27 07:12 旧金山：庚辰 丁亥 甲戌 戊辰，大运 戊子 己丑 庚寅", () => {
    const c = computeBaziChart({ birthYear: 1940, birthMonth: 11, birthDay: 27, birthHour: 7, birthMinute: 12, birthPlace: "美国旧金山", gender: "male" });
    assert.equal(pillars(c), "庚辰 丁亥 甲戌 戊辰");
    assert.deepEqual(c.daYun.slice(0, 3).map((d) => d.ganZhi), ["戊子", "己丑", "庚寅"]);
    assert.equal(c.trueSolar.offsetMinutes, 0, "海外未识别地点不做修正");
  });

  it("邓小平 1904-08-22 20:30：甲辰 壬申 戊子 壬戌", () => {
    assert.equal(run({ birthYear: 1904, birthMonth: 8, birthDay: 22, birthHour: 20, birthMinute: 30 }), "甲辰 壬申 戊子 壬戌");
  });

  it("锚点 1949-10-01 12:00 为甲子日", () => {
    assert.equal(run({ birthYear: 1949, birthMonth: 10, birthDay: 1, birthHour: 12 }), "己丑 癸酉 甲子 庚午");
  });

  it("立春边界精确到分钟：2024-02-04 16:20 癸卯年，16:35 甲辰年", () => {
    assert.equal(run({ birthYear: 2024, birthMonth: 2, birthDay: 4, birthHour: 16, birthMinute: 20 }), "癸卯 乙丑 戊戌 庚申");
    assert.equal(run({ birthYear: 2024, birthMonth: 2, birthDay: 4, birthHour: 16, birthMinute: 35 }), "甲辰 丙寅 戊戌 庚申");
  });

  it("子时 2000-01-01 北京（时辰选择器取 00:30）：戊午日 壬子时，不会退回前一天", () => {
    const c = computeBaziChart({ birthYear: 2000, birthMonth: 1, birthDay: 1, birthHour: 0, birthMinute: 30, birthPlace: "北京市" });
    assert.equal(pillars(c), "己卯 丙子 戊午 壬子");
    assert.equal(c.solar.day, 1);
  });

  it("夏令时 1988-07-01 07:30 上海：扣 1 小时后为卯时（癸卯）", () => {
    const c = computeBaziChart({ birthYear: 1988, birthMonth: 7, birthDay: 1, birthHour: 7, birthMinute: 30, birthPlace: "上海市" });
    assert.equal(pillars(c), "戊辰 戊午 丁巳 癸卯");
    assert.equal(c.trueSolar.dstMinutes, 60);
  });

  it("均时差 1990-11-03 09:05 北京：加均时差后进入巳时（乙巳）", () => {
    const c = computeBaziChart({ birthYear: 1990, birthMonth: 11, birthDay: 3, birthHour: 9, birthMinute: 5, birthPlace: "北京市" });
    assert.equal(pillars(c), "庚午 丙戌 壬申 乙巳");
    assert.ok(c.trueSolar.eotMinutes > 15 && c.trueSolar.eotMinutes < 17.5, String(c.trueSolar.eotMinutes));
  });
});

describe("输入处理", () => {
  it("时辰不详：只排三柱，五行不计时柱", () => {
    const c = computeBaziChart({ birthYear: 1990, birthMonth: 5, birthDay: 15, hourKnown: false, gender: "female" });
    assert.equal(c.hourPillar, null);
    assert.equal(c.details.length, 3);
    assert.equal(pillars(c), "庚午 辛巳 庚辰 --");
    assert.equal(Object.values(c.wuXingBalance).reduce((a, b) => a + b, 0), 100);
  });

  it("支持 31 日，且按真实天数校验", () => {
    assert.doesNotThrow(() => computeBaziChart({ birthYear: 2024, birthMonth: 1, birthDay: 31, birthHour: 12 }));
    assert.throws(() => computeBaziChart({ birthYear: 2023, birthMonth: 2, birthDay: 29, birthHour: 12 }), /只有 28 天/);
    assert.doesNotThrow(() => computeBaziChart({ birthYear: 2024, birthMonth: 2, birthDay: 29, birthHour: 12 }));
  });

  it("农历闰月：2023 闰二月初一 = 2023-03-22，二月初一 = 2023-02-20；无该闰月时报错", () => {
    const leap = computeBaziChart({ birthYear: 2023, birthMonth: 2, birthDay: 1, birthHour: 12, isLunar: true, isLeapMonth: true });
    assert.deepEqual([leap.clock.month, leap.clock.day], [3, 22]);
    assert.equal(leap.lunar.isLeapMonth, true);
    const normal = computeBaziChart({ birthYear: 2023, birthMonth: 2, birthDay: 1, birthHour: 12, isLunar: true });
    assert.deepEqual([normal.clock.month, normal.clock.day], [2, 20]);
    assert.throws(
      () => computeBaziChart({ birthYear: 2023, birthMonth: 3, birthDay: 1, birthHour: 12, isLunar: true, isLeapMonth: true }),
      /闰月是闰2月/
    );
  });

  it("十神 / 藏干 / 十二长生 / 空亡 已计算", () => {
    const c = computeBaziChart({ birthYear: 1990, birthMonth: 5, birthDay: 15, birthHour: 9, birthMinute: 46 });
    const year = c.details[0];
    assert.equal(year.shiShenGan, "比肩");
    assert.deepEqual(year.shiShenZhi, ["正官", "正印"]);
    assert.equal(c.details[2].shiShenGan, "日主");
    assert.equal(c.details[2].xunKong, "申酉");
    assert.equal(year.diShi, "沐浴");
  });
});

describe("真太阳时组件", () => {
  it("均时差：11 月初约 +16.4 分，2 月中约 −14.2 分", () => {
    assert.ok(Math.abs(equationOfTimeMinutes(new Date("1990-11-03T04:00:00Z")) - 16.4) < 0.6);
    assert.ok(Math.abs(equationOfTimeMinutes(new Date("1990-02-11T04:00:00Z")) + 14.2) < 0.6);
  });

  it("中国夏令时边界（1988-04-10 02:00 起，09-11 02:00 止）", () => {
    const opt = { inMainland: true };
    assert.equal(chinaDstMinutes({ year: 1988, month: 4, day: 10, hour: 1, minute: 30 }, opt), 0);
    assert.equal(chinaDstMinutes({ year: 1988, month: 4, day: 10, hour: 3, minute: 30 }, opt), 60);
    assert.equal(chinaDstMinutes({ year: 1988, month: 9, day: 11, hour: 0, minute: 30 }, opt), 60);
    assert.equal(chinaDstMinutes({ year: 1988, month: 9, day: 11, hour: 2, minute: 30 }, opt), 0);
    assert.equal(chinaDstMinutes({ year: 1992, month: 7, day: 1, hour: 12, minute: 0 }, opt), 0);
    assert.equal(chinaDstMinutes({ year: 1988, month: 7, day: 1, hour: 12, minute: 0 }, { inMainland: false }), 0);
  });
});
