"use client";

import type { MbtiResult, FiveElement } from "@/types";
import { MBTI_NAMES, MBTI_FIVE_ELEMENT } from "@/lib/constants";

// ==========================================
//  观己 — MBTI 结果展示组件
// ==========================================

// 五行颜色体系
const WU_XING_COLORS: Record<
  FiveElement,
  { bg: string; text: string; bar: string; glow: string }
> = {
  木: { bg: "bg-green-900/40", text: "text-green-300", bar: "bg-green-500", glow: "shadow-green-500/20" },
  火: { bg: "bg-red-900/40", text: "text-red-300", bar: "bg-red-500", glow: "shadow-red-500/20" },
  土: { bg: "bg-yellow-900/40", text: "text-yellow-300", bar: "bg-yellow-500", glow: "shadow-yellow-500/20" },
  金: { bg: "bg-gray-800", text: "text-gray-300", bar: "bg-gray-400", glow: "shadow-gray-400/20" },
  水: { bg: "bg-blue-900/40", text: "text-blue-300", bar: "bg-blue-500", glow: "shadow-blue-500/20" },
};

// 维度进度条配置
const DIMENSION_PAIRS = [
  { left: "E", right: "I", leftLabel: "外向", rightLabel: "内向" },
  { left: "S", right: "N", leftLabel: "感觉", rightLabel: "直觉" },
  { left: "T", right: "F", leftLabel: "思考", rightLabel: "情感" },
  { left: "J", right: "P", leftLabel: "判断", rightLabel: "感知" },
] as const;

interface MbtiResultDisplayProps {
  result: MbtiResult & { elementReading?: string };
}

export default function MbtiResultDisplay({ result }: MbtiResultDisplayProps) {
  const { mbtiType, scores, elementAffinity, aiReading, keyTraits, compatibleTypes } = result;
  const elementReading = (result as any).elementReading as string | undefined;

  const typeName = MBTI_NAMES[mbtiType] ?? mbtiType;
  const element = elementAffinity as FiveElement;
  const elementColors = WU_XING_COLORS[element] ?? WU_XING_COLORS["水"];

  // 四字母解析
  const letters = mbtiType.split("");

  return (
    <div className="space-y-6">
      {/* 类型展示主卡 */}
      <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[#13102a] to-[#1a1535] p-6 text-center">
        {/* 四字母大标题 */}
        <div className="flex justify-center gap-1.5 mb-3">
          {letters.map((letter, i) => (
            <span
              key={i}
              className="w-14 h-14 rounded-xl bg-[#5749F4]/20 border border-[#5749F4]/30 flex items-center justify-center text-2xl font-black text-[#a99ffb]"
            >
              {letter}
            </span>
          ))}
        </div>

        {/* 中文人格名 */}
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-1">{typeName}</h2>
        <p className="text-sm text-[var(--muted-foreground)]">{mbtiType} · 16种人格之一</p>

        {/* 五行亲和标签 */}
        <div className="mt-4 flex justify-center">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${elementColors.bg} ${elementColors.text} shadow-lg ${elementColors.glow}`}
          >
            <span>五行亲和</span>
            <span className="font-bold text-sm">{element}</span>
          </span>
        </div>
      </div>

      {/* 四维度进度条 */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-1.5">
          <span className="text-[#a99ffb]">◎</span>
          维度分析
        </h3>
        <div className="space-y-4">
          {DIMENSION_PAIRS.map(({ left, right, leftLabel, rightLabel }) => {
            const leftScore = scores[left as keyof typeof scores] as number;
            const rightScore = scores[right as keyof typeof scores] as number;
            const dominantLeft = leftScore >= rightScore;

            return (
              <div key={left + right}>
                <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-1.5">
                  <span className={dominantLeft ? "text-[#a99ffb] font-semibold" : ""}>
                    {leftLabel}（{left}）{leftScore}%
                  </span>
                  <span className={!dominantLeft ? "text-[#a99ffb] font-semibold" : ""}>
                    {rightScore}%（{right}）{rightLabel}
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                  {/* 左侧得分条 */}
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#5749F4] to-indigo-400 transition-all duration-700"
                    style={{ width: `${leftScore}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 核心特质标签 */}
      {keyTraits && keyTraits.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-1.5">
            <span className="text-[#F59E0B]">✦</span>
            核心特质
          </h3>
          <div className="flex flex-wrap gap-2">
            {keyTraits.map((trait: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full text-sm bg-[#5749F4]/15 border border-[#5749F4]/20 text-[#a99ffb]"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI 个性化解读 */}
      {aiReading && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-1.5">
            <span className="text-[#a99ffb]">☯</span>
            AI 性格解读
          </h3>
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">{aiReading}</p>
        </div>
      )}

      {/* 五行亲和解读 */}
      {elementReading && (
        <div className={`rounded-2xl border border-white/10 ${elementColors.bg} p-5`}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-1.5 ${elementColors.text}`}>
            <span>◈</span>
            五行命理联系
          </h3>
          <p className={`text-sm leading-7 ${elementColors.text} opacity-90`}>{elementReading}</p>
        </div>
      )}

      {/* 最佳搭档 */}
      {compatibleTypes && compatibleTypes.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-1.5">
            <span className="text-[#F59E0B]">◇</span>
            最佳搭档类型
          </h3>
          <div className="flex gap-3">
            {compatibleTypes.map((type: string, i: number) => (
              <div
                key={i}
                className="flex-1 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-3 text-center"
              >
                <p className="text-lg font-black text-[#F59E0B]">{type}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {MBTI_NAMES[type] ?? type}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
