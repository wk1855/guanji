"use client";

// ==========================================
//  观己 — MBTI 进度条组件
// ==========================================

const DIMENSIONS = [
  { label: "EI", name: "外向/内向", start: 0, end: 15 },
  { label: "SN", name: "感觉/直觉", start: 15, end: 30 },
  { label: "TF", name: "思考/情感", start: 30, end: 45 },
  { label: "JP", name: "判断/感知", start: 45, end: 60 },
];

interface MbtiProgressProps {
  currentIndex: number; // 0-based
  total?: number;
}

export default function MbtiProgress({ currentIndex, total = 60 }: MbtiProgressProps) {
  const currentQuestion = currentIndex + 1;
  const progressPct = Math.round((currentQuestion / total) * 100);

  // 当前属于哪个维度
  const activeDimIndex = DIMENSIONS.findIndex(
    (d) => currentIndex >= d.start && currentIndex < d.end
  );

  return (
    <div className="w-full space-y-3">
      {/* 题号 & 总数 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--muted-foreground)]">
          第 <span className="text-[var(--foreground)] font-semibold">{currentQuestion}</span> 题
        </span>
        <span className="text-[var(--muted-foreground)]">共 {total} 题</span>
      </div>

      {/* 整体进度条 */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5749F4] to-indigo-400 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 四维度分段指示 */}
      <div className="grid grid-cols-4 gap-2">
        {DIMENSIONS.map((dim, idx) => {
          const isActive = idx === activeDimIndex;
          const isPast = idx < activeDimIndex;
          return (
            <div key={dim.label} className="text-center">
              <div
                className={`h-1 rounded-full mb-1.5 transition-all duration-300 ${
                  isPast
                    ? "bg-[#5749F4]"
                    : isActive
                    ? "bg-gradient-to-r from-[#5749F4] to-indigo-400"
                    : "bg-white/10"
                }`}
              />
              <span
                className={`text-xs font-medium transition-colors ${
                  isActive
                    ? "text-[#a99ffb]"
                    : isPast
                    ? "text-[var(--muted-foreground)]"
                    : "text-white/60"
                }`}
              >
                {dim.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
