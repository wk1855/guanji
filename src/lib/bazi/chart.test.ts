import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeBaziChart } from "./chart";
import { lookupLongitude, trueSolarOffsetMinutes } from "./longitudes";

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

function pillar(g: string, z: string) {
  return `${g}${z}`;
}

describe("computeBaziChart", () => {
  it("公历 1990-05-15 辰时：立春后为庚午年，立夏后为巳月", () => {
    const chart = computeBaziChart({
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      birthHour: 8,
      isLunar: false,
    });
    assert.equal(pillar(chart.yearPillar.tianGan, chart.yearPillar.diZhi), "庚午");
    assert.equal(pillar(chart.monthPillar.tianGan, chart.monthPillar.diZhi), "辛巳");
    assert.equal(pillar(chart.dayPillar.tianGan, chart.dayPillar.diZhi), "庚辰");
    assert.equal(pillar(chart.hourPillar.tianGan, chart.hourPillar.diZhi), "庚辰");
    assert.equal(chart.dayMaster, "庚");
    assert.equal(chart.yearPillar.wuXing, "金");
  });

  it("以立春而非春节分年：1990-01-15 仍为己巳，1990-02-10 为庚午", () => {
    const before = computeBaziChart({
      birthYear: 1990,
      birthMonth: 1,
      birthDay: 15,
      birthHour: 12,
      isLunar: false,
    });
    const after = computeBaziChart({
      birthYear: 1990,
      birthMonth: 2,
      birthDay: 10,
      birthHour: 12,
      isLunar: false,
    });
    assert.equal(pillar(before.yearPillar.tianGan, before.yearPillar.diZhi), "己巳");
    assert.equal(pillar(after.yearPillar.tianGan, after.yearPillar.diZhi), "庚午");
  });

  it("2024 立春前后年柱：2月3日癸卯，2月5日甲辰", () => {
    const before = computeBaziChart({
      birthYear: 2024,
      birthMonth: 2,
      birthDay: 3,
      birthHour: 12,
    });
    const after = computeBaziChart({
      birthYear: 2024,
      birthMonth: 2,
      birthDay: 5,
      birthHour: 12,
    });
    assert.equal(pillar(before.yearPillar.tianGan, before.yearPillar.diZhi), "癸卯");
    assert.equal(pillar(after.yearPillar.tianGan, after.yearPillar.diZhi), "甲辰");
  });

  it("农历输入会先转公历再排盘", () => {
    const lunar = computeBaziChart({
      birthYear: 1990,
      birthMonth: 4,
      birthDay: 21,
      birthHour: 8,
      isLunar: true,
    });
    assert.equal(lunar.solar.year, 1990);
    assert.equal(lunar.solar.month, 5);
    assert.equal(lunar.solar.day, 15);
    assert.equal(pillar(lunar.yearPillar.tianGan, lunar.yearPillar.diZhi), "庚午");
  });

  it("五行占比合计为 100，且四柱天干地支合法", () => {
    const chart = computeBaziChart({
      birthYear: 2000,
      birthMonth: 1,
      birthDay: 1,
      birthHour: 0,
      isLunar: false,
      birthPlace: "北京市东城区",
    });
    const sum = Object.values(chart.wuXingBalance).reduce((a, b) => a + b, 0);
    assert.equal(sum, 100);
    for (const p of [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar]) {
      assert.ok(STEMS.includes(p.tianGan), p.tianGan);
      assert.ok(BRANCHES.includes(p.diZhi), p.diZhi);
    }
  });

  it("乌鲁木齐相对东经 120° 会回拨真太阳时", () => {
    const beijing = computeBaziChart({
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      birthHour: 8,
      birthPlace: "北京市朝阳区",
    });
    const urumqi = computeBaziChart({
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      birthHour: 8,
      birthPlace: "新疆维吾尔自治区乌鲁木齐市",
    });
    assert.ok((lookupLongitude("北京市朝阳区") ?? 0) < 120);
    assert.ok(trueSolarOffsetMinutes(lookupLongitude("乌鲁木齐市")!) < -100);
    assert.ok(urumqi.trueSolar.offsetMinutes < beijing.trueSolar.offsetMinutes);
    assert.equal(urumqi.trueSolar.applied, true);
  });
});
