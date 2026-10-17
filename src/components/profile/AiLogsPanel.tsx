"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Copy, Check, Download, Loader2, Trash2, Star } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  bazi: "八字排盘",
  fortune: "今日黄历解读",
  fortune_personal: "个性化运势",
  zodiac: "星座",
  mbti: "MBTI",
  chat: "AI 对话",
};
const STATUS_LABELS: Record<string, string> = { success: "成功", error: "失败", timeout: "超时" };
const PRESET_TAGS = ["准确", "有用", "温和", "啰嗦", "太泛", "编造", "格式问题", "偏题"];

interface LogRow {
  id: string;
  api_type: string;
  model: string | null;
  prompt_version: string | null;
  stream: boolean;
  status: "success" | "error" | "timeout";
  finish_reason: string | null;
  latency_ms: number | null;
  ttft_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cache_hit_tokens: number | null;
  cache_miss_tokens?: number | null;
  rating: number | null;
  quick_rating: number | null;
  tags: string[];
  note: string | null;
  rated_at: string | null;
  error_message: string | null;
  session_id: string | null;
  message_id: string | null;
  bazi_chart_id: string | null;
  mbti_result_id: string | null;
  created_at: string;
  http_status?: number | null;
  request_params?: Record<string, unknown> | null;
  messages?: { role: string; content: string }[];
  response_content?: string | null;
}

interface Stats {
  count: number;
  avgLatencyMs: number | null;
  totalTokens: number;
  errorRate: number;
  avgRating: number | null;
  good: number;
  bad: number;
}

interface Filters {
  type: string;
  status: string;
  rating: string;
  from: string;
  to: string;
}

const EMPTY: Filters = { type: "", status: "", rating: "", from: "", to: "" };
const PAGE = 20;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
const fmtMs = (ms: number | null | undefined) => (ms == null ? "—" : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
const fmtNum = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("zh-CN"));

function toQuery(f: Filters, extra: Record<string, string | number> = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) sp.set(k, v);
  for (const [k, v] of Object.entries(extra)) sp.set(k, String(v));
  return sp.toString();
}

function CopyButton({ text, label = "复制" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // 剪贴板不可用时忽略
        }
      }}
      className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-xs text-[var(--muted-foreground)] hover:text-white hover:bg-white/5"
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      {done ? "已复制" : label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "success"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "timeout"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-red-500/15 text-red-300";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${cls}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function TextBlock({ title, text, defaultOpen = false }: { title: string; text: string; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-[var(--border)] bg-[var(--background)]">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm text-white/90">
        <span className="flex items-center gap-2">
          <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
          {title}
          <span className="text-xs text-[var(--muted-foreground)]">{text.length.toLocaleString("zh-CN")} 字</span>
        </span>
      </summary>
      <div className="border-t border-[var(--border)] px-3 pb-2">
        <div className="flex justify-end">
          <CopyButton text={text} />
        </div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-white/85">{text}</pre>
      </div>
    </details>
  );
}

function RatingEditor({ row, onSaved }: { row: LogRow; onSaved: (r: Partial<LogRow>) => void }) {
  const [rating, setRating] = useState<number | null>(row.rating);
  const [quick, setQuick] = useState<number | null>(row.quick_rating);
  const [tags, setTags] = useState<string[]>(row.tags ?? []);
  const [note, setNote] = useState(row.note ?? "");
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const toggleTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/ai-logs/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, quickRating: quick, tags, note: note.trim() || null }),
      });
      const p = await res.json();
      if (!p?.success) throw new Error(p?.error?.message ?? "保存失败");
      onSaved(p.data);
      setMsg("已保存");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--muted-foreground)] w-10">评分</span>
        <div className="flex" role="radiogroup" aria-label="评分 1 到 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} 分`}
              onClick={() => setRating(rating === n ? null : n)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/5"
            >
              <Star className={`h-5 w-5 ${rating != null && n <= rating ? "fill-amber-400 text-amber-400" : "text-white/40"}`} />
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {([1, -1] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={quick === v}
              aria-label={v === 1 ? "好" : "差"}
              onClick={() => setQuick(quick === v ? null : v)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-base ${
                quick === v ? (v === 1 ? "bg-emerald-500/20 ring-1 ring-emerald-400/50" : "bg-red-500/20 ring-1 ring-red-400/50") : "hover:bg-white/5"
              }`}
            >
              {v === 1 ? "👍" : "👎"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--muted-foreground)] w-10">标签</span>
        {[...new Set([...PRESET_TAGS, ...tags])].map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tags.includes(t)}
            onClick={() => toggleTag(t)}
            className={`h-10 rounded-full border px-3 text-xs ${
              tags.includes(t) ? "border-[var(--primary)] bg-[var(--primary)]/20 text-white" : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = custom.trim();
            if (t && !tags.includes(t)) setTags([...tags, t]);
            setCustom("");
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="自定义标签，回车添加"
            aria-label="自定义标签"
            maxLength={20}
            className="h-10 w-40 rounded-full border border-[var(--border)] bg-transparent px-3 text-xs text-white placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
          />
        </form>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="备注（例如：哪里不准、期望的回答）"
        aria-label="备注"
        rows={2}
        className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3 text-sm text-white placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          保存评分
        </button>
        {msg && <span className={`text-xs ${msg === "已保存" ? "text-emerald-300" : "text-red-300"}`}>{msg}</span>}
      </div>
    </div>
  );
}

function LogDetail({ id, onChange, onDeleted }: { id: string; onChange: (r: Partial<LogRow>) => void; onDeleted: () => void }) {
  const [row, setRow] = useState<LogRow | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/ai-logs/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((p) => (p?.success ? setRow(p.data) : setError(p?.error?.message ?? "加载失败")))
      .catch(() => setError("加载失败"));
  }, [id]);

  if (error) return <p className="p-3 text-sm text-red-300">{error}</p>;
  if (!row)
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="animate-spin text-[var(--muted-foreground)]" />
      </div>
    );

  const del = async () => {
    if (!window.confirm("确定删除这条调用记录吗？删除后无法恢复。")) return;
    setDeleting(true);
    const res = await fetch(`/api/ai-logs/${row.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
    else {
      setDeleting(false);
      window.alert("删除失败，请稍后重试");
    }
  };

  const meta: [string, React.ReactNode][] = [
    ["模型", row.model ?? "—"],
    ["Prompt 版本", row.prompt_version ?? "—"],
    ["方式", row.stream ? "流式" : "非流式"],
    ["状态", <StatusBadge key="s" status={row.status} />],
    ["HTTP", row.http_status ?? "—"],
    ["finish_reason", row.finish_reason ?? "—"],
    ["总耗时", fmtMs(row.latency_ms)],
    ["首 token", fmtMs(row.ttft_ms)],
    ["输入 tokens", fmtNum(row.prompt_tokens)],
    ["输出 tokens", fmtNum(row.completion_tokens)],
    ["缓存命中", fmtNum(row.cache_hit_tokens)],
    ["缓存未命中", fmtNum(row.cache_miss_tokens)],
  ];
  const full = JSON.stringify(row, null, 2);

  return (
    <div className="space-y-3 border-t border-[var(--border)] p-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
        {meta.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 sm:block">
            <dt className="text-[var(--muted-foreground)]">{k}</dt>
            <dd className="text-white/90 break-all">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-[var(--muted-foreground)] break-all">
        请求参数：<code className="text-white/85">{JSON.stringify(row.request_params ?? {})}</code>
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        {row.session_id && (
          <Link href={`/ai-chat?session=${row.session_id}`} className="inline-flex h-10 items-center rounded-lg bg-white/5 px-3 text-[#a99ffb] hover:bg-white/10">
            打开对话
          </Link>
        )}
        {row.bazi_chart_id && (
          <Link href={`/profile/bazi/${row.bazi_chart_id}`} className="inline-flex h-10 items-center rounded-lg bg-white/5 px-3 text-[#a99ffb] hover:bg-white/10">
            查看命盘
          </Link>
        )}
        {row.mbti_result_id && (
          <Link href="/profile?tab=mbti" className="inline-flex h-10 items-center rounded-lg bg-white/5 px-3 text-[#a99ffb] hover:bg-white/10">
            MBTI 记录
          </Link>
        )}
        <CopyButton text={full} label="复制整条 JSON" />
      </div>
      {row.error_message && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 whitespace-pre-wrap break-words">{row.error_message}</p>
      )}
      <div className="space-y-2">
        <p className="text-xs text-[var(--muted-foreground)]">发送的消息（{row.messages?.length ?? 0} 条）</p>
        {(row.messages ?? []).map((m, i) => (
          <TextBlock key={i} title={`#${i + 1} ${m.role}`} text={m.content ?? ""} />
        ))}
        <TextBlock title="模型输出" text={row.response_content ?? ""} defaultOpen />
      </div>
      <RatingEditor
        row={row}
        onSaved={(r) => {
          setRow({ ...row, ...r });
          onChange(r);
        }}
      />
      <button
        type="button"
        onClick={del}
        disabled={deleting}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-500/30 px-4 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
      >
        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        删除这条记录
      </button>
    </div>
  );
}

export default function AiLogsPanel() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async (f: Filters, offset = 0) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ai-logs?${toQuery(f, { limit: PAGE, offset })}`, { cache: "no-store" });
      const p = await res.json();
      if (!p?.success) throw new Error(p?.error?.message ?? "加载失败");
      setRows((prev) => (offset ? [...prev, ...p.data.rows] : p.data.rows));
      setTotal(p.data.total);
      setStats(p.data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const set = (k: keyof Filters, v: string) => {
    setOpen(null);
    setFilters((prev) => ({ ...prev, [k]: v }));
  };
  const exportQuery = useMemo(() => toQuery(filters), [filters]);
  const selectCls =
    "h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white focus:outline-none focus:border-[var(--primary)]";

  return (
    <div className="space-y-4">
      {/* 统计 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["调用次数", stats ? fmtNum(stats.count) : "…"],
          ["平均耗时", stats ? fmtMs(stats.avgLatencyMs) : "…"],
          ["总 tokens", stats ? fmtNum(stats.totalTokens) : "…"],
          ["失败率", stats ? `${(stats.errorRate * 100).toFixed(1)}%` : "…"],
          ["平均评分", stats ? `${stats.avgRating ?? "—"} · 👍${stats.good} 👎${stats.bad}` : "…"],
        ].map(([k, v]) => (
          <div key={k} className="guanji-card px-3 py-2.5">
            <p className="text-xs text-[var(--muted-foreground)]">{k}</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{v}</p>
          </div>
        ))}
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="类型" value={filters.type} onChange={(e) => set("type", e.target.value)} className={selectCls}>
          <option value="">全部类型</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select aria-label="状态" value={filters.status} onChange={(e) => set("status", e.target.value)} className={selectCls}>
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="error">失败</option>
          <option value="timeout">超时</option>
        </select>
        <select aria-label="评分" value={filters.rating} onChange={(e) => set("rating", e.target.value)} className={selectCls}>
          <option value="">全部评分</option>
          <option value="unrated">未评分</option>
          <option value="rated">已评分</option>
          <option value="good">👍 好</option>
          <option value="bad">👎 差</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={String(n)}>
              {n} 星
            </option>
          ))}
        </select>
        <input type="date" aria-label="开始日期" value={filters.from} onChange={(e) => set("from", e.target.value)} className={selectCls} />
        <input type="date" aria-label="结束日期" value={filters.to} onChange={(e) => set("to", e.target.value)} className={selectCls} />
        {Object.values(filters).some(Boolean) && (
          <button type="button" onClick={() => setFilters(EMPTY)} className="h-10 rounded-xl px-3 text-sm text-[var(--muted-foreground)] hover:text-white">
            清除筛选
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <a
            href={`/api/ai-logs/export?${toQuery(filters, { format: "jsonl" })}`}
            download
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-[var(--border)] px-3 text-sm text-white/90 hover:bg-white/5"
            data-export={exportQuery}
          >
            <Download size={14} />
            JSONL
          </a>
          <a
            href={`/api/ai-logs/export?${toQuery(filters, { format: "json" })}`}
            download
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-[var(--border)] px-3 text-sm text-white/90 hover:bg-white/5"
          >
            <Download size={14} />
            JSON
          </a>
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      {/* 列表 */}
      {!loading && rows.length === 0 && !error ? (
        <div className="guanji-card p-8 text-center text-sm text-[var(--muted-foreground)]">没有符合条件的调用记录。</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const isOpen = open === r.id;
            return (
              <li key={r.id} className="guanji-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : r.id)}
                  aria-expanded={isOpen}
                  className="flex w-full min-h-[56px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left hover:bg-white/[0.03]"
                >
                  <span className="text-xs tabular-nums text-[var(--muted-foreground)]">{fmtTime(r.created_at)}</span>
                  <span className="text-sm font-medium text-white">{TYPE_LABELS[r.api_type] ?? r.api_type}</span>
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {fmtMs(r.latency_ms)} · {fmtNum(r.total_tokens)} tokens
                  </span>
                  <span className="ml-auto flex items-center gap-2 text-xs">
                    {r.rating != null && (
                      <span className="inline-flex items-center gap-0.5 text-amber-300">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {r.rating}
                      </span>
                    )}
                    {r.quick_rating === 1 && <span aria-label="好">👍</span>}
                    {r.quick_rating === -1 && <span aria-label="差">👎</span>}
                    {r.rating == null && r.quick_rating == null && <span className="text-[var(--muted-foreground)]">未评分</span>}
                    <ChevronDown size={16} className={`text-[var(--muted-foreground)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </span>
                </button>
                {isOpen && (
                  <LogDetail
                    id={r.id}
                    onChange={(patch) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patch } : x)))}
                    onDeleted={() => {
                      setOpen(null);
                      load(filters);
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-[var(--muted-foreground)]" />
        </div>
      )}
      {!loading && rows.length < total && (
        <button
          type="button"
          onClick={() => load(filters, rows.length)}
          className="h-11 w-full rounded-xl border border-[var(--border)] text-sm text-white/90 hover:bg-white/5"
        >
          加载更多（{rows.length}/{total}）
        </button>
      )}
      <p className="text-xs text-[var(--muted-foreground)]">
        记录每次 AI 调用发送的完整消息与模型原始输出，用于回看与评估；导出包含当前筛选下的全部字段（最多 5000 条）。
      </p>
    </div>
  );
}
