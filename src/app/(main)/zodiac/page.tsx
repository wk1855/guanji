"use client";

import { useState, useCallback } from "react";
import { Compass } from "lucide-react";
import ZodiacCompass from "@/components/zodiac/ZodiacCompass";
import ZodiacFortunePanel from "@/components/zodiac/ZodiacFortunePanel";
import { ZODIAC_DATA } from "@/lib/data/zodiacData";

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

export default function ZodiacPage() {
  const [selectedSign, setSelectedSign] = useState<string | null>(null);
  const [fortune, setFortune] = useState<ZodiacFortuneData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSelectSign = useCallback(
    async (sign: string) => {
      // 如果点击同一星座，不重复请求
      if (sign === selectedSign && fortune) return;

      setSelectedSign(sign);
      setFortune(null);
      setError("");
      setLoading(true);

      try {
        const res = await fetch(`/api/zodiac?sign=${sign}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "请求失败");
        }
        const data: ZodiacFortuneData = await res.json();
        setFortune(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "星象解读失败";
        setError(msg + "，请稍后重试");
      } finally {
        setLoading(false);
      }
    },
    [selectedSign, fortune]
  );

  const selectedInfo = selectedSign ? ZODIAC_DATA[selectedSign] : null;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-8 pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* 页面标题 */}
        <div className="py-8">
          <h1 className="text-3xl font-serif font-semibold text-white">星座</h1>
          <p className="mt-1.5 text-sm text-white/60">今日真实星象（天文历表计算）+ 本人命盘的八字 × 星座解读</p>
        </div>

        {/* 主体内容：响应式左右/上下布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">

          {/* 左侧：罗盘 */}
          <div className="lg:sticky lg:top-28">
            <ZodiacCompass
              selectedSign={selectedSign}
              onSelectSign={handleSelectSign}
            />
            {/* 罗盘说明 */}
            <p className="mt-4 text-center text-xs text-white/60">
              点击罗盘中的扇区选择星座
            </p>
          </div>

          {/* 右侧：运势面板 */}
          <div>
            {!selectedSign ? (
              /* 未选择星座时的提示 */
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center rounded-3xl border border-white/8 bg-white/3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                  <Compass className="h-7 w-7 text-[#8B7CF6]" />
                </div>
                <div>
                  <p className="text-base font-medium text-white/70 mb-1">
                    点击罗盘选择您的星座
                  </p>
                  <p className="text-sm text-white/60">
                    获取今日专属星象运势解读
                  </p>
                </div>
                {/* 12星座快速入口 */}
                <div className="mt-2 flex flex-wrap justify-center gap-2 px-4">
                  {Object.values(ZODIAC_DATA).map((info) => (
                    <button
                      key={info.sign}
                      onClick={() => handleSelectSign(info.sign)}
                      className="flex h-10 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3.5 text-sm text-white/75 hover:border-[var(--primary)]/50 hover:text-white/80 hover:bg-[var(--primary)]/10 transition-all duration-200"
                    >
                      <span>{info.symbol}</span>
                      <span>{info.signCn}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : selectedInfo ? (
              /* 已选择星座时显示运势面板 */
              <ZodiacFortunePanel
                zodiacInfo={selectedInfo}
                fortune={fortune}
                loading={loading}
                error={error}
              />
            ) : null}
          </div>
        </div>

      </div>
    </main>
  );
}
