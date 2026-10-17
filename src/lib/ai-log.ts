/**
 * AI 模型调用日志：每次调用（成功 / 失败 / 超时）写入 ai_call_logs。
 *
 * 原则：日志绝不能拖慢或打断用户请求——
 * - 写库全部 fire-and-forget，并交给 Vercel `waitUntil` 保证函数在响应返回后仍能写完；
 * - 所有异常吞掉只打印；
 * - 只记录请求体（messages / 参数），绝不记录 API Key 或请求头。
 */
import { waitUntil } from "@vercel/functions";
import { createServiceRoleClient } from "@/lib/supabase";

export type AiApiType = "bazi" | "fortune" | "fortune_personal" | "zodiac" | "mbti" | "chat";
export const AI_API_TYPES: AiApiType[] = ["bazi", "fortune", "fortune_personal", "zodiac", "mbti", "chat"];

export interface AiLogContext {
  userId?: string | null;
  apiType: AiApiType;
  promptVersion?: string;
  sessionId?: string | null;
  messageId?: string | null;
  baziChartId?: string | null;
  mbtiResultId?: string | null;
}

export interface AiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
}

export interface AiLogRecord {
  id: string;
  ctx: AiLogContext;
  model: string;
  stream: boolean;
  requestParams: Record<string, unknown>;
  messages: unknown[];
  responseContent?: string | null;
  finishReason?: string | null;
  usage?: AiUsage | null;
  latencyMs: number;
  ttftMs?: number | null;
  status: "success" | "error" | "timeout";
  httpStatus?: number | null;
  errorMessage?: string | null;
}

// 同一函数实例内：logId → 插入 Promise，供后续补充关联 id 时串行等待
const pending = new Map<string, Promise<void>>();

function keepAlive(p: Promise<unknown>) {
  try {
    waitUntil(p);
  } catch {
    // 非 Vercel 环境没有 waitUntil 上下文，Promise 仍会照常执行
  }
}

const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);

/** 写入一条日志（不阻塞调用方） */
export function writeAiLog(rec: AiLogRecord): void {
  const row = {
    id: rec.id,
    user_id: rec.ctx.userId ?? null,
    api_type: rec.ctx.apiType,
    session_id: rec.ctx.sessionId ?? null,
    message_id: rec.ctx.messageId ?? null,
    bazi_chart_id: rec.ctx.baziChartId ?? null,
    mbti_result_id: rec.ctx.mbtiResultId ?? null,
    model: rec.model,
    prompt_version: rec.ctx.promptVersion ?? null,
    stream: rec.stream,
    request_params: rec.requestParams,
    messages: rec.messages,
    response_content: rec.responseContent ?? null,
    finish_reason: rec.finishReason ?? null,
    prompt_tokens: int(rec.usage?.prompt_tokens),
    completion_tokens: int(rec.usage?.completion_tokens),
    total_tokens: int(rec.usage?.total_tokens),
    cache_hit_tokens: int(rec.usage?.prompt_cache_hit_tokens),
    cache_miss_tokens: int(rec.usage?.prompt_cache_miss_tokens),
    latency_ms: Math.round(rec.latencyMs),
    ttft_ms: int(rec.ttftMs),
    status: rec.status,
    http_status: int(rec.httpStatus),
    error_message: rec.errorMessage ? rec.errorMessage.slice(0, 2000) : null,
  };
  const p = (async () => {
    try {
      const { error } = await createServiceRoleClient().from("ai_call_logs").insert(row);
      if (error) console.error("[ai-log] insert error:", error.message);
    } catch (err) {
      console.error("[ai-log] insert exception:", err);
    } finally {
      setTimeout(() => pending.delete(rec.id), 60_000);
    }
  })();
  pending.set(rec.id, p);
  keepAlive(p);
}

/** 调用完成后补充关联 id / 解析错误等（不阻塞调用方；会等该日志插入完成后再更新） */
export function annotateAiLog(
  logId: string | null | undefined,
  patch: Partial<{
    session_id: string | null;
    message_id: string | null;
    bazi_chart_id: string | null;
    mbti_result_id: string | null;
    error_message: string;
    status: "success" | "error" | "timeout";
  }>
): void {
  if (!logId) return;
  const before = pending.get(logId) ?? Promise.resolve();
  const p = before.then(async () => {
    try {
      const { error } = await createServiceRoleClient().from("ai_call_logs").update(patch).eq("id", logId);
      if (error) console.error("[ai-log] annotate error:", error.message);
    } catch (err) {
      console.error("[ai-log] annotate exception:", err);
    }
  });
  keepAlive(p);
}

export function newLogId(): string {
  return crypto.randomUUID();
}
