"use client";

import type { BaziResult, DaYunStep, Pillar } from "@/app/(main)/bazi/page";

// ─── 五行色映射 ──────────────────────────────────────────────
const WU_XING_STYLE: Record<
  string,
  { tg: string; dz: string; badge: string; glow: string }
> = {
  木: {
    tg: "text-green-400",
    dz: "text-green-300",
    badge: "bg-green-900/40 text-green-300",
    glow: "shadow-green-900/30",
  },
  火: {
    tg: "text-red-400",
    dz: "text-red-300",
    badge: "bg-red-900/40 text-red-300",
    glow: "shadow-red-900/30",
  },
  土: {
    tg: "text-yellow-400",
    dz: "text-yellow-300",
    badge: "bg-yellow-900/40 text-yellow-300",
    glow: "shadow-yellow-900/30",
  },
  金: {
    tg: "text-gray-300",
    dz: "text-gray-200",
    badge: "bg-gray-800 text-gray-300",
    glow: "shadow-gray-800/30",
  },
  水: {
    tg: "text-blue-400",
    dz: "text-blue-300",
    badge: "bg-blue-900/40 text-blue-300",
    glow: "shadow-blue-900/30",
  },
};

// ─── 柱名映射 ────────────────────────────────────────────────
const PILLAR_NAMES = ["年柱", "月柱", "日柱", "时柱"];

const UNKNOWN_PILLAR: Pillar = { tianGan: "?", diZhi: "?", wuXing: "未知" };

const BRANCH_ELEMENT: Record<string, string> = {
  子: "水", 亥: "水", 寅: "木", 卯: "木", 巳: "火", 午: "火",
  申: "金", 酉: "金", 辰: "土", 戌: "土", 丑: "土", 未: "土",
};

// ─── 单柱组件 ────────────────────────────────────────────────
function PillarCard({
  pillar,
  label,
  isDay,
}: {
  pillar: Pillar;
  label: string;
  isDay: boolean;
}) {
  const s = WU_XING_STYLE[pillar.wuXing] ?? WU_XING_STYLE["土"];

  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border bg-[var(--card)] overflow-hidden transition-shadow ${
        isDay
          ? "border-[var(--primary)] shadow-lg shadow-purple-900/30 ring-2 ring-[var(--primary)]/20"
          : "border-[var(--border)] hover:shadow-md"
      } ${s.glow}`}
    >
      {/* 柱名 */}
      <div
        className={`w-full text-center py-2 text-xs font-semibold tracking-widest ${
          isDay
            ? "bg-[var(--primary)] text-white"
            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
        }`}
      >
        {label}
      </div>

      {/* 天干 */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 px-2 gap-1">
        <span className="text-[10px] text-[var(--muted-foreground)] tracking-wider">
          天干
        </span>
        <span
          className={`text-4xl sm:text-5xl font-bold leading-none ${s.tg} drop-shadow-sm`}
        >
          {pillar.tianGan}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 font-medium ${s.badge}`}>
          {pillar.wuXing}
        </span>
      </div>

      {/* 分隔线 */}
      <div className="w-4/5 h-px bg-[var(--border)]" />

      {/* 地支 */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 px-2 gap-1">
        <span className="text-[10px] text-[var(--muted-foreground)] tracking-wider">
          地支
        </span>
        <span className={`text-4xl sm:text-5xl font-bold leading-none ${s.dz} drop-shadow-sm`}>
          {pillar.diZhi}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 font-medium ${s.badge}`}>
          {pillar.wuXing}
        </span>
      </div>

      {/* 日主标记 */}
      {isDay && (
        <div className="absolute top-8 right-2">
          <span className="text-[9px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded-full">
            日主
          </span>
        </div>
      )}
    </div>
  );
}

// ─── 大运走势（lunar-javascript 按性别顺逆排出）───────────────
function DaYunRow({
  daYun,
  start,
}: {
  daYun: DaYunStep[];
  start?: { years: number; months: number; days: number; solarDate: string };
}) {
  const thisYear = new Date().getFullYear();
  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--muted)] flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--muted-foreground)] tracking-wider">
          大运走势（每步十年）
        </span>
        {start && (
          <span className="text-[10px] text-[var(--muted-foreground)]">
            出生后 {start.years} 年 {start.months} 个月 {start.days} 天起运（{start.solarDate}）
          </span>
        )}
      </div>
      <div className="flex overflow-x-auto">
        {daYun.map((yun) => {
          const current = thisYear >= yun.startYear && thisYear <= yun.endYear;
          return (
            <div
              key={yun.startYear}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-3 border-r border-[var(--border)] last:border-r-0 transition-colors cursor-default ${
                current ? "bg-[var(--primary)]/15" : "hover:bg-[var(--muted)]"
              }`}
              title={`${yun.startYear}–${yun.endYear}`}
            >
              <span className="text-[10px] text-[var(--muted-foreground)] mb-1">
                {yun.startAge}–{yun.endAge}岁
              </span>
              <span className="text-base font-bold text-[var(--foreground)]">{yun.ganZhi.charAt(0)}</span>
              <span className="text-base font-bold text-[var(--muted-foreground)]">{yun.ganZhi.charAt(1)}</span>
              <span className={`text-[10px] mt-1 ${current ? "text-[var(--primary)] font-semibold" : "text-[var(--muted-foreground)]"}`}>
                {current ? "当前" : yun.startYear}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────
interface BaziChartProps {
  result: BaziResult;
}

export default function BaziChart({ result }: BaziChartProps) {
  const pillars: Array<{ pillar: Pillar; label: string; isDay: boolean }> = [
    { pillar: result.yearPillar, label: PILLAR_NAMES[0], isDay: false },
    { pillar: result.monthPillar, label: PILLAR_NAMES[1], isDay: false },
    { pillar: result.dayPillar, label: PILLAR_NAMES[2], isDay: true },
    { pillar: result.hourPillar ?? UNKNOWN_PILLAR, label: PILLAR_NAMES[3], isDay: false },
  ];

  // 统计天干地支五行（地支按本气五行）
  const allChars = pillars
    .filter((p) => p.pillar !== UNKNOWN_PILLAR)
    .flatMap((p) => [
      { char: p.pillar.tianGan, wuXing: p.pillar.wuXing, type: "天干" },
      { char: p.pillar.diZhi, wuXing: BRANCH_ELEMENT[p.pillar.diZhi] ?? p.pillar.wuXing, type: "地支" },
    ]);
  const details = result.meta?.details;
  const ts = result.meta?.trueSolar;

  return (
    <div>
      {/* 四柱网格 */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {pillars.map(({ pillar, label, isDay }) => (
          <PillarCard key={label} pillar={pillar} label={label} isDay={isDay} />
        ))}
      </div>

      {/* 八字文字行 */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <p className="text-xs text-[var(--muted-foreground)] mb-2 tracking-wider">
          八字原文
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          {pillars.map(({ pillar, label }) => {
            const s = WU_XING_STYLE[pillar.wuXing] ?? WU_XING_STYLE["土"];
            return (
              <span key={label} className="flex items-center gap-1">
                <span className={`text-xl font-bold ${s.tg}`}>
                  {pillar.tianGan}
                </span>
                <span className={`text-xl font-bold ${s.dz}`}>
                  {pillar.diZhi}
                </span>
                {label !== "时柱" && (
                  <span className="text-[var(--border)] mx-1">·</span>
                )}
              </span>
            );
          })}
          <span className="ml-2 text-xs text-[var(--muted-foreground)]">
            （年 · 月 · 日 · 时）
          </span>
        </div>
      </div>

      {/* 五行标注行 */}
      <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <p className="text-xs text-[var(--muted-foreground)] mb-2 tracking-wider">
          干支五行
        </p>
        <div className="flex gap-3 flex-wrap">
          {allChars.map((item, idx) => {
            const s = WU_XING_STYLE[item.wuXing] ?? WU_XING_STYLE["土"];
            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${s.badge}`}
              >
                <span className="text-base font-bold">{item.char}</span>
                <span className="opacity-70">{item.wuXing}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* 十神 / 藏干 / 十二长生 / 空亡 */}
      {details && details.length > 0 && (
        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
          <table className="w-full text-xs text-center">
            <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
              <tr>
                <th className="py-2 px-2 font-medium text-left">排盘细节</th>
                {details.map((d) => (
                  <th key={d.name} className="py-2 px-2 font-medium">{d.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[var(--foreground)]">
              <tr className="border-t border-[var(--border)]">
                <td className="py-1.5 px-2 text-left text-[var(--muted-foreground)]">天干十神</td>
                {details.map((d) => <td key={d.name} className="py-1.5 px-2">{d.shiShenGan}</td>)}
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-1.5 px-2 text-left text-[var(--muted-foreground)]">藏干</td>
                {details.map((d) => (
                  <td key={d.name} className="py-1.5 px-2 leading-5">
                    {d.hideGan.map((g, i) => (
                      <span key={g + i} className="block">{g}<span className="text-[var(--muted-foreground)]">·{d.shiShenZhi[i]}</span></span>
                    ))}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-1.5 px-2 text-left text-[var(--muted-foreground)]">十二长生</td>
                {details.map((d) => <td key={d.name} className="py-1.5 px-2">{d.diShi}</td>)}
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-1.5 px-2 text-left text-[var(--muted-foreground)]">纳音</td>
                {details.map((d) => <td key={d.name} className="py-1.5 px-2">{d.naYin}</td>)}
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-1.5 px-2 text-left text-[var(--muted-foreground)]">空亡</td>
                {details.map((d) => <td key={d.name} className="py-1.5 px-2">{d.xunKong}</td>)}
              </tr>
            </tbody>
          </table>
          {(result.meta?.taiYuan || ts) && (
            <p className="px-3 py-2 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)] text-left leading-5">
              {result.meta?.taiYuan && <>胎元 {result.meta.taiYuan}</>}
              {result.meta?.mingGong && <> · 命宫 {result.meta.mingGong} · 身宫 {result.meta.shenGong}</>}
              {result.meta?.hourKnown === false && <> · 时辰不详，按三柱排盘</>}
              {ts && result.meta?.hourKnown !== false && result.meta?.clock && (
                <>
                  <br />
                  钟表 {String(result.meta.clock.hour).padStart(2, "0")}:{String(result.meta.clock.minute).padStart(2, "0")} → 真太阳时{" "}
                  {String(ts.hour).padStart(2, "0")}:{String(ts.minute).padStart(2, "0")}
                  {ts.longitude != null
                    ? `（经度 ${(ts.longitudeMinutes ?? 0) >= 0 ? "+" : ""}${ts.longitudeMinutes} 分，均时差 ${(ts.eotMinutes ?? 0) >= 0 ? "+" : ""}${ts.eotMinutes} 分${ts.dstMinutes ? `，夏令时 −${ts.dstMinutes} 分` : ""}）`
                    : ts.dstMinutes
                      ? `（未识别经度，已扣夏令时 ${ts.dstMinutes} 分）`
                      : "（未识别经度，按钟表时间）"}
                </>
              )}
            </p>
          )}
        </div>
      )}

      {/* 大运走势 */}
      {result.meta?.daYun && result.meta.daYun.length > 0 && (
        <DaYunRow daYun={result.meta.daYun} start={result.meta.daYunStart} />
      )}
    </div>
  );
}
