import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeSky } from "./sky";
import { computeAlmanac } from "../fortune/almanac";

describe("星象计算（astronomy-engine）", () => {
  const sky = computeSky(new Date("2026-10-17T04:00:00Z"));
  it("2026-10-17：太阳天秤、金星天蝎逆行、火星木星在狮子", () => {
    const get = (k: string) => sky.planets.find((p) => p.key === k)!;
    assert.equal(get("Sun").sign, "libra");
    assert.equal(get("Venus").sign, "scorpio");
    assert.equal(get("Venus").retrograde, true);
    assert.equal(get("Mercury").retrograde, false);
    assert.equal(get("Mars").sign, "leo");
    assert.equal(get("Jupiter").sign, "leo");
  });
  it("水星逆行 2026-10-24 至 11-14（北京时间）", () => {
    const m = sky.retrogrades.find((r) => r.planet === "水星")!;
    assert.equal(m.status, "即将逆行");
    assert.equal(m.start, "2026-10-24");
    assert.equal(m.end, "2026-11-14");
  });
  it("相位在容许度内", () => {
    assert.ok(sky.aspects.every((a) => a.orb <= 8));
    assert.ok(!sky.aspects.some((a) => a.a === "金星" && a.b === "天王星"), "金星-天王星约 150°，不构成主要相位");
  });
});

describe("黄历（lunar-javascript）", () => {
  it("2026-10-17 为丙午年戊戌月甲子日，农历九月初八", () => {
    const a = computeAlmanac(2026, 10, 17);
    assert.equal(a.ganzhi, "丙午年 · 戊戌月 · 甲子日");
    assert.equal(a.lunarDate, "九月初八");
    assert.equal(a.jianChu, "满");
    assert.equal(a.xiShen, "东北");
    assert.ok(a.yi.includes("纳采"));
    assert.ok(a.ji.includes("开市"));
  });
});
