import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPeriodContext } from "./period";

// 2026-10-17 12:00 北京时间
const NOW = new Date("2026-10-17T04:00:00Z");

describe("buildPeriodContext", () => {
  it("今日：返回真实日干支", () => {
    const ctx = buildPeriodContext("today", NOW);
    assert.equal(ctx.todayKey, "2026-10-17");
    assert.equal(ctx.days.length, 1);
    assert.equal(ctx.days[0].ganZhi, "甲子");
    assert.equal(ctx.yearGanZhi, "丙午");
    assert.equal(ctx.monthGanZhi, "戊戌");
  });

  it("本周：周一到周日共 7 天", () => {
    const ctx = buildPeriodContext("week", NOW);
    assert.equal(ctx.days.length, 7);
    assert.equal(ctx.days[0].date, "2026-10-12");
    assert.equal(ctx.days[6].date, "2026-10-18");
  });

  it("本月：按周切分覆盖全月", () => {
    const ctx = buildPeriodContext("month", NOW);
    assert.equal(ctx.days.length, 31);
    assert.equal(ctx.weeks.length, 5);
    assert.equal(ctx.weeks[4].end, "2026-10-31");
  });
});
