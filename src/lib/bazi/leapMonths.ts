/**
 * 农历 1900–2100 年的闰月表（由 lunar-javascript 生成，单元测试校验一致）。
 * 每个字符对应一年，13 进制：0 = 无闰月，1–9/a–c = 闰几月。
 * 供前端表单在提交前校验闰月，避免为必然失败的输入发请求。
 */
const START = 1900;
const TABLE = "800500400206005002070050040020600500307006004002070050030800600400307005004080060040a006005003080050040020700500409006004002060050030b0060050020700500308006004003070050040800600400307005004080060040020";

/** 返回该农历年的闰月（0 表示无闰月）；超出表范围返回 null（交由服务端校验） */
export function leapMonthOf(year: number): number | null {
  const i = year - START;
  if (!Number.isInteger(year) || i < 0 || i >= TABLE.length) return null;
  return parseInt(TABLE[i], 13);
}

/** 闰月校验：合法返回 null，否则返回与服务端一致的错误文案 */
export function leapMonthError(year: number, month: number): string | null {
  const leap = leapMonthOf(year);
  if (leap === null || leap === month) return null;
  return leap ? `农历${year}年的闰月是闰${leap}月，不是闰${month}月` : `农历${year}年没有闰月`;
}

export const LEAP_TABLE_RANGE = { start: START, end: START + TABLE.length - 1 };
