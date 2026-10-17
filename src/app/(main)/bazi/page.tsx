"use client";

import { useState, useCallback } from "react";
import BaziForm from "@/components/bazi/BaziForm";
import BaziChart from "@/components/bazi/BaziChart";
import PosterPreviewModal from "@/components/bazi/PosterPreviewModal";
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
  hourPillar: Pillar;
  dayMaster: string;
  wuXingBalance: Record<string, number>;
  basicReading: string[];
}

const WU_XING_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  木: { bg: "bg-green-900/40", text: "text-green-300", bar: "bg-green-500" },
  火: { bg: "bg-red-900/40", text: "text-red-300", bar: "bg-red-500" },
  土: { bg: "bg-yellow-900/40", text: "text-yellow-300", bar: "bg-yellow-500" },
  金: { bg: "bg-gray-800", text: "text-gray-300", bar: "bg-gray-400" },
  水: { bg: "bg-blue-900/40", text: "text-blue-300", bar: "bg-blue-500" },
};

function WuXingBar({ balance }: { balance: Record<string, number> }) {
  const total = Object.values(balance).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-2.5">
      {Object.entries(balance).map(([key, val]) => {
        const pct = Math.round((val / total) * 100);
        const c = WU_XING_COLORS[key];
        return (
          <div key={key} className="flex items-center gap-3">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${c.bg} ${c.text}`}
            >
              {key}
            </span>
            <div className="flex-1 bg-[var(--border)] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-[var(--muted-foreground)] w-8 text-right">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ReadingSection({ readings }: { readings: string[] }) {
  const labels = ["整体格局", "性格特点", "近期运势"];
  const icons = ["☯", "✦", "◈"];
  return (
    <div className="space-y-4">
      {readings.map((text, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[var(--primary)] text-base">{icons[i]}</span>
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {labels[i]}
            </span>
          </div>
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">
            {text.replace(/^[^：]+：/, "")}
          </p>
        </div>
      ))}
    </div>
  );
}

function WuXingSummary({ balance }: { balance: Record<string, number> }) {
  const sorted = Object.entries(balance).sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const total = Object.values(balance).reduce((a, b) => a + b, 0);
  const strongPct = Math.round((strongest[1] / total) * 100);
  const weakPct = Math.round((weakest[1] / total) * 100);

  const colorMap: Record<string, string> = {
    木: "text-green-600", 火: "text-red-600", 土: "text-yellow-600",
    金: "text-gray-500", 水: "text-blue-600",
  };

  return (
    <p className="text-xs text-[var(--muted-foreground)] mt-4 leading-5">
      命主五行以{" "}
      <span className={`${colorMap[strongest[0]]} font-medium`}>{strongest[0]}（{strongPct}%）</span>{" "}
      最旺，
      <span className={`${colorMap[weakest[0]]} font-medium`}>{weakest[0]}（{weakPct}%）</span>{" "}
      最弱。
    </p>
  );
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
      <div className="h-1 w-full bg-gradient-to-r from-[var(--primary)] via-purple-400 to-indigo-400" />

      <header className="border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[var(--primary)] text-xl">☯</span>
            <span className="font-bold text-[var(--foreground)] tracking-wider">
              观己
            </span>
            <span className="text-[var(--muted-foreground)] text-sm mx-2">
              /
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">
              八字排盘
            </span>
          </div>
          {step === "result" && (
            <button
              onClick={() => { setStep("form"); setResult(null); setError(""); }}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              重新排盘
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
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
                  {baziInfo.birthYear}年{baziInfo.birthMonth}月
                  {baziInfo.birthDay}日 · {baziInfo.birthPlace}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">
                  日主
                </p>
                <p className="text-3xl font-bold text-[var(--primary)]">
                  {result.dayMaster}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {result.dayMaster}命之人
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-3 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[var(--primary)]" />
                四柱命盘
              </h2>
              <BaziChart result={result} />
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-1.5">
                <span className="text-[var(--primary)]">◎</span>
                五行偏旺 / 偏弱分析
              </h2>
              <WuXingBar balance={result.wuXingBalance} />
              <WuXingSummary balance={result.wuXingBalance} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-3 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[var(--primary)]" />
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
                <span className="text-green-400">已自动保存到档案</span>
              </div>
            </div>

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
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            <p className="text-sm text-[var(--muted-foreground)]">AI 正在为您排盘中，请稍候…</p>
          </div>
        )}
      </main>
    </div>
  );
}
