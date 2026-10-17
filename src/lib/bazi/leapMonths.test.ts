import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LunarYear } from "lunar-javascript";
import { LEAP_TABLE_RANGE, leapMonthError, leapMonthOf } from "./leapMonths";

describe("农历闰月表", () => {
  it("与 lunar-javascript 逐年一致", () => {
    for (let y = LEAP_TABLE_RANGE.start; y <= LEAP_TABLE_RANGE.end; y++) {
      assert.equal(leapMonthOf(y), LunarYear.fromYear(y).getLeapMonth(), String(y));
    }
  });
  it("错误文案", () => {
    assert.equal(leapMonthError(2023, 2), null);
    assert.equal(leapMonthError(2023, 3), "农历2023年的闰月是闰2月，不是闰3月");
    assert.equal(leapMonthError(2022, 3), "农历2022年没有闰月");
    assert.equal(leapMonthError(1800, 3), null);
  });
});
