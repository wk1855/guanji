"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles, Trash2, Share2 } from "lucide-react";
import BaziChart from "@/components/bazi/BaziChart";
import PosterPreviewModal from "@/components/bazi/PosterPreviewModal";
import { ReadingSection, WuXingBar, WuXingSummary } from "@/components/bazi/BaziResultSections";
import type { BaziInfo, BaziResult } from "@/app/(main)/bazi/page";

interface RecordData {
  id: string;
  name: string;
  gender: "male" | "female";
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_hour: number | null;
  birth_place: string | null;
  is_lunar: boolean;
  result_json: BaziResult;
  created_at: string;
}

export default function BaziRecordPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [record, setRecord] = useState<RecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posterOpen, setPosterOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/bazi/history/${params.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (payload?.success) setRecord(payload.data);
        else setError(payload?.error?.message ?? "记录不存在");
      })
      .catch(() => setError("加载失败，请稍后重试"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    if (!record || !window.confirm(`确定删除「${record.name}」的八字记录吗？删除后无法恢复。`)) return;
    setDeleting(true);
    const res = await fetch(`/api/bazi/history/${record.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/profile");
    } else {
      setDeleting(false);
      window.alert("删除失败，请稍后重试");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-[var(--muted-foreground)] mb-4">{error || "记录不存在"}</p>
        <Link href="/profile" className="text-sm" style={{ color: "var(--primary)" }}>
          返回个人档案
        </Link>
      </div>
    );
  }

  const result = record.result_json;
  const info: BaziInfo = {
    name: record.name,
    gender: record.gender,
    birthYear: record.birth_year,
    birthMonth: record.birth_month,
    birthDay: record.birth_day,
    birthHour: record.birth_hour ?? 12,
    birthPlace: record.birth_place ?? "",
    isLunar: record.is_lunar,
  };
  const meta = result.meta;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft size={15} />
          个人档案
        </Link>
        <span className="text-xs text-[var(--muted-foreground)]">
          排盘于 {new Date(record.created_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}
        </span>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-1">命主</p>
          <p className="text-lg font-bold text-[var(--foreground)]">
            {record.name}
            <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">
              {record.gender === "male" ? "男命" : "女命"}
            </span>
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {record.is_lunar ? "农历" : "公历"} {record.birth_year}年{record.birth_month}月{record.birth_day}日
            {record.birth_hour != null ? ` ${record.birth_hour}时` : ""}
            {record.birth_place ? ` · ${record.birth_place}` : ""}
          </p>
          {meta?.trueSolar?.applied && (
            <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
              真太阳时 {String(meta.trueSolar.hour).padStart(2, "0")}:{String(meta.trueSolar.minute).padStart(2, "0")}
              {meta.lunar ? ` · 农历${meta.lunar.monthChinese}月${meta.lunar.dayChinese} · ${meta.lunar.shengXiao}` : ""}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">日主</p>
          <p className="text-3xl font-bold text-[var(--primary)]">{result.dayMaster}</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-3 flex items-center gap-1.5">
          <Sparkles size={14} className="text-[var(--primary)]" />
          四柱命盘
        </h2>
        <BaziChart result={result} />
        {meta?.nayin && (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            纳音：年 {meta.nayin.year} · 月 {meta.nayin.month} · 日 {meta.nayin.day} · 时 {meta.nayin.hour}
          </p>
        )}
      </div>

      {result.wuXingBalance && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">五行偏旺 / 偏弱分析</h2>
          <WuXingBar balance={result.wuXingBalance} />
          <WuXingSummary balance={result.wuXingBalance} />
        </div>
      )}

      {Array.isArray(result.basicReading) && result.basicReading.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-3 flex items-center gap-1.5">
            <Sparkles size={14} className="text-[var(--primary)]" />
            AI 解读
          </h2>
          <ReadingSection readings={result.basicReading} />
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setPosterOpen(true)}
          className="flex-1 h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] flex items-center justify-center gap-2 hover:bg-[var(--muted)]"
        >
          <Share2 size={15} />
          生成命盘海报
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 h-11 rounded-xl border border-red-500/30 text-sm text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/10 disabled:opacity-50"
        >
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          删除这条记录
        </button>
      </div>

      {posterOpen && <PosterPreviewModal info={info} result={result} onClose={() => setPosterOpen(false)} />}
    </div>
  );
}
