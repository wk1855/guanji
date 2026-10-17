"use client";

import { useState, useCallback } from "react";
import BaziForm from "@/components/bazi/BaziForm";
import BaziChart from "@/components/bazi/BaziChart";
import PosterPreviewModal from "@/components/bazi/PosterPreviewModal";
import ChartActions from "@/components/bazi/ChartActions";
import { ReadingSection, WuXingBar, WuXingSummary } from "@/components/bazi/BaziResultSections";
import {
  Share2,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";

export interface BaziInfo {
  name: string;
  gender: "male" | "female";
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  hourKnown: boolean;
  isLeapMonth: boolean;
  birthPlace: string;
  isLunar: boolean;
}

export interface Pillar {
  tianGan: string;
  diZhi: string;
  wuXing: string;
}

export interface BaziResult {
  yearPillar: Pillar;
  monthPillar: Pillar;
  dayPillar: Pillar;
  hourPillar: Pillar | null;
  dayMaster: string;
  wuXingBalance: Record<string, number>;
  basicReading: string[];
  id?: string | null;
  meta?: {
    solar?: { year: number; month: number; day: number; hour: number; minute: number };
    lunar?: { monthChinese: string; dayChinese: string; yearGanZhi: string; shengXiao: string };
    clock?: { year: number; month: number; day: number; hour: number; minute: number };
    hourKnown?: boolean;
    trueSolar?: {
      applied: boolean;
      hour: number;
      minute: number;
      offsetMinutes: number;
      longitude?: number;
      longitudeMinutes?: number;
      eotMinutes?: number;
      dstMinutes?: number;
    };
    details?: PillarDetail[];
    taiYuan?: string;
    mingGong?: string;
    shenGong?: string;
    nayin?: { year: string; month: string; day: string; hour: string };
    daYun?: DaYunStep[];
    daYunStart?: { years: number; months: number; days: number; solarDate: string };
  };
}

export interface PillarDetail {
  name: string;
  ganZhi: string;
  shiShenGan: string;
  hideGan: string[];
  shiShenZhi: string[];
  diShi: string;
  naYin: string;
  xunKong: string;
}

export interface DaYunStep {
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  ganZhi: string;
}

export default function BaziPage() {
  const [step, setStep] = useState<"form" | "result">("form");
  const [baziInfo, setBaziInfo] = useState<BaziInfo | null>(null);
  const [result, setResult] = useState<BaziResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [posterOpen, setPosterOpen] = useState(false);

  const handleSubmit = async (info: BaziInfo) => {
    setIsLoading(true);
    setError("");
    setBaziInfo(info);
    try {
      const res = await fetch("/api/bazi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "排盘失败");
      }
      const data = await res.json();
      setResult(data);
      setStep("result");
    } catch (err: any) {
      setError(err.message || "排盘失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 pt-4 flex justify-end min-h-[3.5rem]">
        {step === "result" && (
            <button
              onClick={() => { setStep("form"); setResult(null); setError(""); }}
              className="inline-flex h-10 items-center px-3 rounded-lg text-sm text-[#a99ffb] hover:bg-white/5"
            >
              重新排盘
            </button>
          )}
      </div>

      <main className="max-w-3xl mx-auto px-4 pb-10">
        {step === "form" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 tracking-wide">
                八字排盘
              </h1>
              <p className="text-[var(--muted-foreground)] text-sm">
                依据出生时空，推演先天命局，洞见自身格局
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <BaziForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        )}

        {step === "result" && baziInfo && result && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--muted-foreground)] mb-1">
                  命主
                </p>
                <p className="text-lg font-bold text-[var(--foreground)]">
                  {baziInfo.name}
                  <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">
                    {baziInfo.gender === "male" ? "男命" : "女命"}
                  </span>
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {baziInfo.isLunar ? "农历" : "公历"} {baziInfo.birthYear}年{baziInfo.isLeapMonth ? "闰" : ""}{baziInfo.birthMonth}月
                  {baziInfo.birthDay}日{" "}
                  {baziInfo.hourKnown
                    ? `${String(baziInfo.birthHour).padStart(2, "0")}:${String(baziInfo.birthMinute).padStart(2, "0")}`
                    : "时辰不详"}{" "}
                  · {baziInfo.birthPlace}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">
                  日主
                </p>
                <p className="text-3xl font-bold text-[#a99ffb]">
                  {result.dayMaster}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {result.dayMaster}命之人
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-3 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#a99ffb]" />
                四柱命盘
              </h2>
              <BaziChart result={result} />
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-1.5">
                <span className="text-[#a99ffb]">◎</span>
                五行偏旺 / 偏弱分析
              </h2>
              <WuXingBar balance={result.wuXingBalance} />
              <WuXingSummary balance={result.wuXingBalance} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-3 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#a99ffb]" />
                基础解读
              </h2>
              <ReadingSection readings={result.basicReading} />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPosterOpen(true)}
                className="flex-1 h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] flex items-center justify-center gap-2 hover:bg-[var(--muted)] transition-colors active:scale-[0.98]"
              >
                <Share2 size={15} />
                生成命盘海报
              </button>
              <div className="flex-1 h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm flex items-center justify-center gap-2">
                <Check size={15} className="text-green-400" />
                {result.id ? (
                  <a href={`/profile/bazi/${result.id}`} className="text-green-400 hover:underline">
                    已保存到档案 · 查看
                  </a>
                ) : (
                  <span className="text-green-400">已自动保存到档案</span>
                )}
              </div>
            </div>

            {result.id && <ChartActions chartId={result.id} name={baziInfo.name} />}

            {posterOpen && baziInfo && result && (
              <PosterPreviewModal
                info={baziInfo}
                result={result}
                onClose={() => setPosterOpen(false)}
              />
            )}

            <div className="h-8" />
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#a99ffb]" />
            <p className="text-sm text-[var(--muted-foreground)]">正在排盘并生成解读，通常 3–10 秒…</p>
          </div>
        )}
      </main>
    </div>
  );
}
