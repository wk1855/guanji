import { createServiceRoleClient } from "@/lib/supabase";
import { AI_API_TYPES, type AiApiType } from "@/lib/ai-log";

export interface AiLogFilters {
  type?: AiApiType | null;
  status?: "success" | "error" | "timeout" | null;
  /** unrated | rated | good | bad | 1..5 */
  rating?: string | null;
  from?: string | null; // YYYY-MM-DD（北京时间）
  to?: string | null;
}

const LIST_COLUMNS =
  "id, api_type, model, prompt_version, stream, status, finish_reason, latency_ms, ttft_ms, prompt_tokens, completion_tokens, total_tokens, cache_hit_tokens, rating, quick_rating, tags, note, rated_at, error_message, session_id, message_id, bazi_chart_id, mbti_result_id, created_at";

export function parseAiLogFilters(sp: URLSearchParams): AiLogFilters {
  const type = sp.get("type");
  const status = sp.get("status");
  const date = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  return {
    type: type && (AI_API_TYPES as string[]).includes(type) ? (type as AiApiType) : null,
    status: status === "success" || status === "error" || status === "timeout" ? status : null,
    rating: sp.get("rating") || null,
    from: date(sp.get("from")),
    to: date(sp.get("to")),
  };
}

function applyFilters(q: any, userId: string, f: AiLogFilters) {
  q = q.eq("user_id", userId);
  if (f.type) q = q.eq("api_type", f.type);
  if (f.status) q = q.eq("status", f.status);
  if (f.from) q = q.gte("created_at", `${f.from}T00:00:00+08:00`);
  if (f.to) q = q.lte("created_at", `${f.to}T23:59:59.999+08:00`);
  switch (f.rating) {
    case "unrated":
      q = q.is("rating", null).is("quick_rating", null);
      break;
    case "rated":
      q = q.or("rating.not.is.null,quick_rating.not.is.null");
      break;
    case "good":
      q = q.eq("quick_rating", 1);
      break;
    case "bad":
      q = q.eq("quick_rating", -1);
      break;
    default:
      if (f.rating && /^[1-5]$/.test(f.rating)) q = q.eq("rating", Number(f.rating));
  }
  return q;
}

export async function listAiLogs(userId: string, f: AiLogFilters, limit = 30, offset = 0) {
  const supabase = createServiceRoleClient();
  const { data, error, count } = await applyFilters(
    supabase.from("ai_call_logs").select(LIST_COLUMNS, { count: "exact" }),
    userId,
    f
  )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return { rows: data ?? [], total: count ?? 0 };
}

/** 筛选范围内的统计（个人站数据量小，直接取轻量列在内存中汇总） */
export async function aiLogStats(userId: string, f: AiLogFilters) {
  const supabase = createServiceRoleClient();
  const { data, error } = await applyFilters(
    supabase.from("ai_call_logs").select("status, latency_ms, total_tokens, rating, quick_rating"),
    userId,
    f
  ).limit(10000);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { status: string; latency_ms: number | null; total_tokens: number | null; rating: number | null; quick_rating: number | null }[];
  const count = rows.length;
  const latencies = rows.map((r) => r.latency_ms).filter((v): v is number => typeof v === "number");
  const ratings = rows.map((r) => r.rating).filter((v): v is number => typeof v === "number");
  return {
    count,
    avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
    totalTokens: rows.reduce((a, r) => a + (r.total_tokens ?? 0), 0),
    errorRate: count ? rows.filter((r) => r.status !== "success").length / count : 0,
    avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    good: rows.filter((r) => r.quick_rating === 1).length,
    bad: rows.filter((r) => r.quick_rating === -1).length,
  };
}

export async function exportAiLogs(userId: string, f: AiLogFilters) {
  const supabase = createServiceRoleClient();
  const { data, error } = await applyFilters(supabase.from("ai_call_logs").select("*"), userId, f)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAiLog(id: string, userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("ai_call_logs").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) return null;
  return data;
}

export interface AiLogRatingPatch {
  rating?: number | null;
  quick_rating?: number | null;
  tags?: string[];
  note?: string | null;
}

export async function rateAiLog(id: string, userId: string, patch: AiLogRatingPatch) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("ai_call_logs")
    .update({ ...patch, rated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, rating, quick_rating, tags, note, rated_at")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAiLog(id: string, userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("ai_call_logs").delete().eq("id", id).eq("user_id", userId).select("id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/** 给对话消息附上对应日志（用于 👍/👎） */
export async function getLogsForMessages(userId: string, messageIds: string[]) {
  if (!messageIds.length) return [];
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("ai_call_logs")
    .select("id, message_id, quick_rating")
    .eq("user_id", userId)
    .in("message_id", messageIds);
  if (error) return [];
  return (data ?? []) as { id: string; message_id: string; quick_rating: number | null }[];
}
