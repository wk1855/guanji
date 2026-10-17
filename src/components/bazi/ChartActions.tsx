"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, UserCheck, Loader2, Check } from "lucide-react";

/** 命盘操作：用这份命盘问 AI / 设为本人命盘（排盘结果页与档案详情页共用） */
export default function ChartActions({ chartId, name }: { chartId: string; name: string }) {
  const [defaultId, setDefaultId] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/default-chart", { cache: "no-store" })
      .then((r) => r.json())
      .then((p) => setDefaultId(p?.success ? p.data.chartId : null))
      .catch(() => setDefaultId(null));
  }, []);

  const isDefault = defaultId === chartId;

  const toggleDefault = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/default-chart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartId: isDefault ? null : chartId }),
      });
      const p = await res.json();
      if (!p?.success) throw new Error(p?.error?.message ?? "设置失败");
      setDefaultId(p.data.chartId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "设置失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/ai-chat?chart=${chartId}`}
          className="h-11 rounded-xl bg-[var(--primary)] text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition active:scale-[0.98]"
        >
          <MessageCircle size={16} />
          用这份命盘问 AI
        </Link>
        <button
          onClick={toggleDefault}
          disabled={saving || defaultId === undefined}
          aria-pressed={isDefault}
          className={`h-11 rounded-xl border text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60 ${
            isDefault
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]"
          }`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : isDefault ? <Check size={16} /> : <UserCheck size={16} />}
          {isDefault ? "本人命盘（点击取消）" : "设为本人命盘"}
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        {isDefault
          ? `今日运势、星座解读与 AI 对话默认使用「${name}」的命盘。`
          : "设为本人命盘后，今日运势、星座解读和 AI 对话会默认使用它。"}
      </p>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
