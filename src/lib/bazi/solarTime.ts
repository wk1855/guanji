/**
 * 真太阳时相关：均时差（Equation of Time）与中国 1986–1991 夏令时。
 *
 * 真太阳时 = 标准时(UTC+8) + 经度修正(4 分钟/度，相对东经 120°) + 均时差
 * 若出生时间落在中国夏令时期间，用户填写的钟表时间需先减 1 小时得到标准时。
 */

/**
 * 均时差（视太阳时 − 平太阳时），单位分钟。NOAA 近似公式，误差约 ±0.5 分钟。
 * @param utc 计算时刻（UTC）
 */
export function equationOfTimeMinutes(utc: Date): number {
  const start = Date.UTC(utc.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((utc.getTime() - start) / 86400000) + 1;
  const hour = utc.getUTCHours() + utc.getUTCMinutes() / 60;
  const isLeap = new Date(Date.UTC(utc.getUTCFullYear(), 1, 29)).getUTCMonth() === 1;
  const gamma = ((2 * Math.PI) / (isLeap ? 366 : 365)) * (dayOfYear - 1 + (hour - 12) / 24);
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  );
}

/**
 * 中国大陆夏令时（国务院公告）：每年 4 月中旬第一个星期日 02:00 拨快至 03:00，
 * 9 月中旬第一个星期日 02:00（夏令时）拨回 01:00。1986 年为 5 月 4 日至 9 月 14 日。
 */
export const CHINA_DST_PERIODS: Record<number, { start: [number, number]; end: [number, number] }> = {
  1986: { start: [5, 4], end: [9, 14] },
  1987: { start: [4, 12], end: [9, 13] },
  1988: { start: [4, 10], end: [9, 11] },
  1989: { start: [4, 16], end: [9, 17] },
  1990: { start: [4, 15], end: [9, 16] },
  1991: { start: [4, 14], end: [9, 15] },
};

const NO_DST_REGIONS = /香港|澳门|台湾|臺灣/;

/**
 * 返回钟表时间需要扣除的夏令时分钟数（0 或 60）。
 * - 仅适用于中国大陆；港澳台不适用。
 * - 结束日 01:00–02:00 的钟表时间会出现两次，按标准时处理（不扣）。
 */
export function chinaDstMinutes(
  clock: { year: number; month: number; day: number; hour: number; minute: number },
  options: { inMainland: boolean }
): number {
  if (!options.inMainland) return 0;
  const p = CHINA_DST_PERIODS[clock.year];
  if (!p) return 0;
  const t = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute);
  const start = Date.UTC(clock.year, p.start[0] - 1, p.start[1], 3, 0); // 02:00 直接跳到 03:00
  const end = Date.UTC(clock.year, p.end[0] - 1, p.end[1], 1, 0);
  return t >= start && t < end ? 60 : 0;
}

/** 根据出生地判断是否按中国大陆夏令时处理（未填地点视为大陆） */
export function isMainlandPlace(place: string | undefined, knownLongitude: boolean): boolean {
  if (!place) return true;
  if (NO_DST_REGIONS.test(place)) return false;
  return knownLongitude;
}
