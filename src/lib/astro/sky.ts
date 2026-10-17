import * as A from "astronomy-engine";

/** 由 astronomy-engine 计算的真实星象（地心视黄经） */

export const SIGNS_CN = ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"];
export const SIGN_KEYS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

type PlanetKey = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";

export const PLANET_CN: Record<PlanetKey, string> = {
  Sun: "太阳",
  Moon: "月亮",
  Mercury: "水星",
  Venus: "金星",
  Mars: "火星",
  Jupiter: "木星",
  Saturn: "土星",
  Uranus: "天王星",
  Neptune: "海王星",
  Pluto: "冥王星",
};

const PLANETS: PlanetKey[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const CAN_RETRO: PlanetKey[] = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

const ASPECTS = [
  { name: "合相", angle: 0, orb: 8 },
  { name: "六分相", angle: 60, orb: 4 },
  { name: "四分相", angle: 90, orb: 6 },
  { name: "三分相", angle: 120, orb: 6 },
  { name: "对分相", angle: 180, orb: 8 },
];

export interface PlanetPosition {
  key: PlanetKey;
  name: string;
  longitude: number;
  sign: string; // aries
  signCn: string;
  degreeInSign: number;
  retrograde: boolean;
  dailyMotion: number;
}

export interface Aspect {
  a: string;
  b: string;
  type: string;
  angle: number;
  orb: number; // 实际偏差（度）
}

export interface RetroInfo {
  planet: string;
  status: "逆行中" | "即将逆行";
  start: string; // YYYY-MM-DD（北京时间）
  end: string;
}

export interface Sky {
  dateKey: string;
  planets: PlanetPosition[];
  aspects: Aspect[];
  retrogrades: RetroInfo[];
}

function longitude(body: PlanetKey, date: Date): number {
  if (body === "Sun") return A.SunPosition(date).elon;
  if (body === "Moon") return A.EclipticGeoMoon(date).lon;
  return A.Ecliptic(A.GeoVector(body as A.Body, date, true)).elon;
}

function delta(a: number, b: number): number {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function motion(body: PlanetKey, date: Date): number {
  const h = 12 * 3600000;
  return delta(longitude(body, new Date(date.getTime() - h)), longitude(body, new Date(date.getTime() + h)));
}

const DAY = 86400000;

function bjDate(d: Date): string {
  return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}

/** 在 [from, from + days] 内按天扫描运动方向变化（留），二分细化到约 1 小时 */
function findStation(body: PlanetKey, from: Date, days: number, step: 1 | -1): Date | null {
  let prevT = from;
  let prevSign = Math.sign(motion(body, prevT));
  for (let i = 1; i <= days; i++) {
    const t = new Date(from.getTime() + step * i * DAY);
    const s = Math.sign(motion(body, t));
    if (s !== prevSign && s !== 0) {
      let lo = Math.min(prevT.getTime(), t.getTime());
      let hi = Math.max(prevT.getTime(), t.getTime());
      const loSign = Math.sign(motion(body, new Date(lo)));
      while (hi - lo > 3600000) {
        const mid = (lo + hi) / 2;
        if (Math.sign(motion(body, new Date(mid))) === loSign) lo = mid;
        else hi = mid;
      }
      return new Date((lo + hi) / 2);
    }
    prevT = t;
    prevSign = s;
  }
  return null;
}

/** 计算某个时刻（默认北京时间当天 12:00）的星象 */
export function computeSky(date: Date, dateKey = bjDate(date)): Sky {
  const planets: PlanetPosition[] = PLANETS.map((key) => {
    const lon = longitude(key, date);
    const idx = Math.floor(lon / 30) % 12;
    const dm = motion(key, date);
    return {
      key,
      name: PLANET_CN[key],
      longitude: Math.round(lon * 100) / 100,
      sign: SIGN_KEYS[idx],
      signCn: SIGNS_CN[idx],
      degreeInSign: Math.round((lon - idx * 30) * 10) / 10,
      retrograde: CAN_RETRO.includes(key) && dm < 0,
      dailyMotion: Math.round(dm * 100) / 100,
    };
  });

  const aspects: Aspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p = planets[i];
      const q = planets[j];
      // 外行星之间的相位持续数年，意义有限，略去
      const slow = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
      if (slow.includes(p.key) && slow.includes(q.key)) continue;
      const sep = Math.abs(delta(p.longitude, q.longitude));
      for (const asp of ASPECTS) {
        const orb = Math.abs(sep - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({ a: p.name, b: q.name, type: asp.name, angle: asp.angle, orb: Math.round(orb * 10) / 10 });
          break;
        }
      }
    }
  }
  aspects.sort((x, y) => x.orb - y.orb);

  const retrogrades: RetroInfo[] = [];
  for (const key of CAN_RETRO) {
    const p = planets.find((x) => x.key === key)!;
    const window = ["Mercury", "Venus", "Mars"].includes(key) ? 120 : 200;
    if (p.retrograde) {
      const start = findStation(key, date, window, -1);
      const end = findStation(key, date, window, 1);
      retrogrades.push({ planet: p.name, status: "逆行中", start: start ? bjDate(start) : "", end: end ? bjDate(end) : "" });
    } else {
      // 30 天内将要逆行
      const start = findStation(key, date, 30, 1);
      if (start) {
        const end = findStation(key, new Date(start.getTime() + 2 * DAY), window, 1);
        retrogrades.push({ planet: p.name, status: "即将逆行", start: bjDate(start), end: end ? bjDate(end) : "" });
      }
    }
  }

  return { dateKey, planets, aspects, retrogrades };
}

/** 北京时间当天 12:00 的星象 */
export function todaySky(now = new Date()): Sky {
  const bj = new Date(now.getTime() + 8 * 3600000);
  const noonUtc = new Date(Date.UTC(bj.getUTCFullYear(), bj.getUTCMonth(), bj.getUTCDate(), 4, 0, 0));
  return computeSky(noonUtc, bj.toISOString().slice(0, 10));
}

export function formatSkyForPrompt(sky: Sky, focusSign?: string): string {
  const lines = [
    `日期：${sky.dateKey}（北京时间正午）`,
    `行星位置：${sky.planets
      .map((p) => `${p.name}${p.signCn}${p.degreeInSign}°${p.retrograde ? "（逆行）" : ""}`)
      .join("；")}`,
    `逆行：${
      sky.retrogrades.length
        ? sky.retrogrades
            .map((r) => (r.status === "逆行中" ? `${r.planet}逆行中（${r.start} 起至 ${r.end}）` : `${r.planet}将于 ${r.start} 开始逆行（至 ${r.end}）`))
            .join("；")
        : "无"
    }`,
    `主要相位（容许度内，按精确度排序）：${
      sky.aspects.length ? sky.aspects.slice(0, 10).map((a) => `${a.a}${a.type}${a.b}（偏差${a.orb}°）`).join("；") : "无"
    }`,
  ];
  if (focusSign) {
    const idx = SIGN_KEYS.indexOf(focusSign);
    const inSign = sky.planets.filter((p) => p.sign === focusSign).map((p) => p.name);
    const opposite = SIGN_KEYS[(idx + 6) % 12];
    const inOpp = sky.planets.filter((p) => p.sign === opposite).map((p) => p.name);
    lines.push(
      `${SIGNS_CN[idx]}：本星座内的行星 ${inSign.length ? inSign.join("、") : "无"}；对宫${SIGNS_CN[(idx + 6) % 12]}内的行星 ${inOpp.length ? inOpp.join("、") : "无"}`
    );
  }
  return lines.join("\n");
}
