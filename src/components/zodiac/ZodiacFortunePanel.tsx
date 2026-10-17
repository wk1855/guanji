"use client";

import { Star, Briefcase, Heart, DollarSign, Activity, Sparkles } from "lucide-react";
import PersonalFortuneCard from "@/components/fortune/PersonalFortuneCard";
import { ZodiacInfo } from "@/types";

interface FortuneDimension {
  dimension: string;
  level: number;
  summary: string;
  advice: string;
}

interface ZodiacFortuneData {
  sign: string;
  signCn: string;
  date: string;
  overallStars: number;
  overallSummary: string;
  dimensions: FortuneDimension[];
  luckyColor: string;
  luckyNumber: number;
  dailyQuote: string;
  periodAdvice: string;
}

interface ZodiacFortunePanelProps {
  zodiacInfo: ZodiacInfo;
  fortune: ZodiacFortuneData | null;
  loading: boolean;
  error: string;
}

function StarRating({
  count,
  total = 5,
  size = "md",
}: {
  count: number;
  total?: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < count
              ? "fill-amber-400 text-amber-400"
              : "fill-white/10 text-white/10"
          }`}
        />
      ))}
    </div>
  );
}

const DIMENSION_ICONS: Record<string, React.ElementType> = {
  事业运: Briefcase,
  感情运: Heart,
  财运: DollarSign,
  健康运: Activity,
};

const DIMENSION_COLORS: Record<string, string> = {
  事业运: "from-[#5749F4] to-[#818CF8]",
  感情运: "from-[#EC4899] to-[#F472B6]",
  财运: "from-[#D97706] to-[#FBBF24]",
  健康运: "from-[#10B981] to-[#34D399]",
};

const ELEMENT_COLORS: Record<string, string> = {
  火: "text-red-400",
  土: "text-amber-600",
  风: "text-sky-400",
  水: "text-blue-400",
};

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      {/* 旋转星象动画 */}
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-2 border-[#5749F4]/30 animate-spin border-t-[#5749F4]" />
        <div className="absolute inset-3 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-[#8B7CF6] animate-pulse" />
        </div>
      </div>
      <p className="text-sm text-white/50 animate-pulse">星象解读中...</p>
    </div>
  );
}

export default function ZodiacFortunePanel({
  zodiacInfo,
  fortune,
  loading,
  error,
}: ZodiacFortunePanelProps) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#13102a]/60 backdrop-blur-sm">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (!fortune) return null;

  return (
    <div className="space-y-4">
      {/* 星座基础信息 + 总体运势 */}
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#16123a] to-[#0d0b1e] p-6 overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[#5749F4]/10 blur-2xl pointer-events-none" />
        <div className="relative z-10">
          {/* 星座标题行 */}
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
              style={{ backgroundColor: zodiacInfo.color + "22", border: `1px solid ${zodiacInfo.color}44` }}
            >
              {zodiacInfo.symbol}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {zodiacInfo.signCn}
              </h2>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                <span
                  className={`font-medium ${ELEMENT_COLORS[zodiacInfo.element] ?? "text-white/60"}`}
                >
                  {zodiacInfo.element}象
                </span>
                <span className="text-white/20">·</span>
                <span>守护星：{zodiacInfo.rulingPlanet}</span>
                <span className="text-white/20">·</span>
                <span>{zodiacInfo.dateRange}</span>
              </div>
            </div>
          </div>

          {/* 总体星级 */}
          <div className="mb-3 flex items-center gap-3">
            <StarRating count={fortune.overallStars} size="md" />
            <span className="text-xs text-white/40">
              今日综合运势 {fortune.overallStars}/5
            </span>
          </div>

          {/* 总体概述 */}
          <p className="text-sm leading-relaxed text-white/65">
            {fortune.overallSummary}
          </p>

          {/* 关键特质标签 */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {zodiacInfo.keyTraits.map((trait) => (
              <span
                key={trait}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/50"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 四维运势卡片 */}
      <div>
        <div className="mb-3 text-xs font-medium tracking-widest text-white/30 uppercase">
          四维运势详情
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fortune.dimensions.map((dim) => {
            const Icon = DIMENSION_ICONS[dim.dimension] || Activity;
            const color =
              DIMENSION_COLORS[dim.dimension] || "from-[#5749F4] to-[#818CF8]";
            return (
              <div
                key={dim.dimension}
                className="rounded-2xl border border-white/8 bg-[#13102a] p-5 hover:border-white/15 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${color}`}
                    >
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {dim.dimension}
                    </span>
                  </div>
                  <StarRating count={dim.level} size="sm" />
                </div>
                <p className="mb-3 text-xs leading-relaxed text-white/50">
                  {dim.summary}
                </p>
                <div className="rounded-xl bg-white/3 border border-white/6 px-3 py-2.5">
                  <div className="mb-1 text-[10px] font-medium tracking-widest text-[#8B7CF6] uppercase">
                    建议
                  </div>
                  <p className="text-xs leading-relaxed text-white/55">
                    {dim.advice}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 幸运信息 + 今日寄语 */}
      <div className="rounded-3xl border border-[#5749F4]/25 bg-gradient-to-br from-[#1a1540] to-[#13102a] overflow-hidden">
        <div className="relative p-6 text-center border-b border-white/8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(87,73,244,0.12),transparent)] pointer-events-none" />
          <div className="relative z-10">
            <div className="mb-2 text-xs font-medium tracking-widest text-[#8B7CF6] uppercase">
              今日寄语
            </div>
            <p className="mb-5 text-base font-serif font-medium text-white leading-relaxed">
              「{fortune.dailyQuote}」
            </p>
            <div className="flex flex-wrap justify-center gap-5 text-xs text-white/40">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-white/20"
                  style={{ backgroundColor: fortune.luckyColor.includes("#") ? fortune.luckyColor : undefined }}
                />
                <span>
                  <span className="text-[#8B7CF6]">幸运色：</span>
                  {fortune.luckyColor}
                </span>
              </div>
              <span>
                <span className="text-[#8B7CF6]">幸运数：</span>
                {fortune.luckyNumber}
              </span>
            </div>
          </div>
        </div>

        {/* 近期建议 */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="mb-1.5 text-xs font-medium tracking-widest text-white/30 uppercase">
            近期建议
          </div>
          <p className="text-xs leading-relaxed text-white/55">
            {fortune.periodAdvice}
          </p>
        </div>

        {/* 与八字深度结合解读 */}
        <div className="px-6 py-5">
          <div className="mb-3 flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/25">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-0.5">与八字深度结合解读</p>
              <p className="text-xs text-white/40">融合本命盘与今日星象，给出个性化建议</p>
            </div>
          </div>
          <PersonalFortuneCard
            key={zodiacInfo.sign}
            scope="today"
            sign={zodiacInfo.sign}
            ctaLabel="生成八字 × 星座解读"
          />
        </div>
      </div>
    </div>
  );
}
