/**
 * 集中封装 DeepSeek Chat Completions 调用。
 *
 * 官方文档（2026-09-10 起）：
 * - 入门：https://api-docs.deepseek.com
 * - 模型与定价：https://api-docs.deepseek.com/quick_start/pricing
 * - Thinking Mode：https://api-docs.deepseek.com/guides/thinking_mode/
 * - JSON Output：https://api-docs.deepseek.com/guides/json_mode
 * - 更新日志：https://api-docs.deepseek.com/updates
 *
 * 当前官方模型名：
 * - `deepseek-flash`（DeepSeek-V4.1-Flash，默认：更快更便宜，适合本站结构化解读）
 * - `deepseek-v4-pro`（DeepSeek-V4-Pro-0813，能力更强、更贵）
 *
 * 旧名 `deepseek-chat` / `deepseek-reasoner` 已于 2026-07-24 停用。
 * Thinking 默认开启；本站 JSON 接口默认关闭 thinking，避免 reasoning_content
 * 污染解析，并让 temperature 生效。流式接口始终剥离 reasoning_content。
 */

import { annotateAiLog, newLogId, writeAiLog, type AiLogContext, type AiUsage } from "@/lib/ai-log";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type ReasoningEffort = "low" | "high" | "max";

export interface DeepSeekConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
  thinkingEnabled: boolean;
  reasoningEffort: ReasoningEffort;
}

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-flash";

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "").replace(/\/chat\/completions$/i, "");
}

export function getDeepSeekConfig(): DeepSeekConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY ?? "";
  const baseUrl = normalizeBaseUrl(
    process.env.DEEPSEEK_BASE_URL || process.env.DEEPSEEK_API_URL || DEFAULT_BASE_URL
  );
  const apiUrl = `${baseUrl}/chat/completions`;
  const model = (process.env.DEEPSEEK_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const thinkingRaw = (process.env.DEEPSEEK_THINKING || "disabled").trim().toLowerCase();
  const thinkingEnabled = thinkingRaw === "enabled" || thinkingRaw === "true" || thinkingRaw === "1";
  const effortRaw = (process.env.DEEPSEEK_REASONING_EFFORT || "high").trim().toLowerCase();
  const reasoningEffort: ReasoningEffort =
    effortRaw === "low" || effortRaw === "max" ? effortRaw : "high";

  return { apiKey, apiUrl, model, thinkingEnabled, reasoningEffort };
}

function buildRequestBody(params: {
  messages: ChatMessage[];
  stream: boolean;
  json?: boolean;
  thinking?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Record<string, unknown> {
  const config = getDeepSeekConfig();
  const thinking = params.thinking ?? config.thinkingEnabled;

  const body: Record<string, unknown> = {
    model: config.model,
    messages: params.messages,
    stream: params.stream,
    thinking: { type: thinking ? "enabled" : "disabled" },
  };

  if (thinking) {
    // thinking 模式下 temperature 无效，改用 reasoning_effort
    body.reasoning_effort = config.reasoningEffort;
  } else if (typeof params.temperature === "number") {
    body.temperature = params.temperature;
  }

  if (params.json) {
    body.response_format = { type: "json_object" };
  }

  if (typeof params.maxTokens === "number") {
    body.max_tokens = params.maxTokens;
  }

  return body;
}

export function extractMessageContent(payload: unknown): string {
  const data = payload as {
    choices?: Array<{
      message?: { content?: string | null; reasoning_content?: string | null };
    }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * 从模型输出中解析 JSON。忽略 reasoning，并容忍 markdown 代码块或前后杂质。
 */
export function parseJsonFromModel<T>(content: string): T {
  const cleaned = content.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("模型未返回可解析的 JSON");
  }
}

/** 记入日志的请求参数（不含 messages / 模型名 / 任何密钥） */
function loggableParams(body: Record<string, unknown>, json?: boolean) {
  const { messages: _m, model: _model, ...rest } = body;
  void _m;
  void _model;
  return { ...rest, json: !!json };
}

const DEFAULT_TIMEOUT_MS = 55_000;

function isAbortError(err: unknown) {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

/** 解析 JSON；失败时把对应日志标记为 error（解析失败），再抛出 */
export function parseLoggedJson<T>(content: string, logId: string | null): T {
  try {
    return parseJsonFromModel<T>(content);
  } catch (err) {
    annotateAiLog(logId, { status: "error", error_message: `JSON 解析失败：${err instanceof Error ? err.message : String(err)}` });
    throw err;
  }
}

export async function chatCompletion(params: {
  messages: ChatMessage[];
  json?: boolean;
  thinking?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** 传入即记录本次调用到 ai_call_logs（成功 / 失败 / 超时都会记录） */
  log?: AiLogContext;
}): Promise<{ content: string; raw: unknown; logId: string | null }> {
  const config = getDeepSeekConfig();
  const { log, timeoutMs, ...rest } = params;
  const body = buildRequestBody({ ...rest, stream: false });
  const logId = log ? newLogId() : null;
  const started = Date.now();
  const record = (r: {
    status: "success" | "error" | "timeout";
    content?: string;
    raw?: unknown;
    httpStatus?: number;
    error?: string;
  }) => {
    if (!log || !logId) return;
    const raw = r.raw as { usage?: AiUsage; choices?: Array<{ finish_reason?: string }> } | undefined;
    writeAiLog({
      id: logId,
      ctx: log,
      model: config.model,
      stream: false,
      requestParams: loggableParams(body, params.json),
      messages: params.messages,
      responseContent: r.content ?? null,
      finishReason: raw?.choices?.[0]?.finish_reason ?? null,
      usage: raw?.usage ?? null,
      latencyMs: Date.now() - started,
      status: r.status,
      httpStatus: r.httpStatus ?? null,
      errorMessage: r.error ?? null,
    });
  };

  if (!config.apiKey) {
    record({ status: "error", error: "未配置 DEEPSEEK_API_KEY" });
    throw new Error("未配置 DEEPSEEK_API_KEY");
  }

  let res: Response;
  try {
    res = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    const timeout = isAbortError(err);
    record({ status: timeout ? "timeout" : "error", error: timeout ? "请求超时" : String(err) });
    throw timeout ? new Error("DeepSeek API 请求超时") : err;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    record({ status: "error", httpStatus: res.status, error: errText.slice(0, 1000) });
    const error = new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 500)}`);
    (error as Error & { status: number }).status = res.status;
    throw error;
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch (err) {
    const timeout = isAbortError(err);
    record({ status: timeout ? "timeout" : "error", httpStatus: res.status, error: `响应读取失败：${String(err)}` });
    throw err;
  }
  const content = extractMessageContent(raw);
  record({ status: "success", content, raw, httpStatus: res.status });
  return { content, raw, logId };
}

/**
 * 流式调用。转发上游 SSE，但删除 delta.reasoning_content，避免思维链泄漏到 UI。
 */
export async function chatCompletionStream(params: {
  messages: ChatMessage[];
  thinking?: boolean;
  temperature?: number;
  maxTokens?: number;
  log?: AiLogContext;
  /** 可预先生成日志 id（例如需要放进响应头给前端评分） */
  logId?: string;
}): Promise<Response> {
  const config = getDeepSeekConfig();
  const { log, logId: presetId, ...rest } = params;
  const body = buildRequestBody({ ...rest, stream: true });
  // 让最后一个 chunk 带上 usage（choices 为空数组）
  body.stream_options = { include_usage: true };
  const logId = log ? presetId ?? newLogId() : null;
  const started = Date.now();
  const base = () => ({
    id: logId!,
    ctx: log!,
    model: config.model,
    stream: true,
    requestParams: loggableParams(body),
    messages: params.messages,
  });

  if (!config.apiKey) {
    if (log) writeAiLog({ ...base(), latencyMs: 0, status: "error", errorMessage: "未配置 DEEPSEEK_API_KEY" });
    throw new Error("未配置 DEEPSEEK_API_KEY");
  }

  let upstream: Response;
  try {
    upstream = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    const timeout = isAbortError(err);
    if (log) {
      writeAiLog({
        ...base(),
        latencyMs: Date.now() - started,
        status: timeout ? "timeout" : "error",
        errorMessage: timeout ? "请求超时" : String(err),
      });
    }
    throw timeout ? new Error("DeepSeek API 请求超时") : err;
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "unknown");
    if (log) {
      writeAiLog({
        ...base(),
        latencyMs: Date.now() - started,
        status: "error",
        httpStatus: upstream.status,
        errorMessage: errText.slice(0, 1000),
      });
    }
    const error = new Error(`DeepSeek API ${upstream.status}: ${errText.slice(0, 500)}`);
    (error as Error & { status: number }).status = upstream.status;
    throw error;
  }

  // 服务端累积完整输出（已剥离 reasoning）、finish_reason、usage、首 token 耗时，流结束时写日志
  let text = "";
  let finishReason: string | null = null;
  let usage: AiUsage | null = null;
  let ttft: number | null = null;
  const observer: SseObserver | undefined = log
    ? {
        onChunk(json) {
          if (json.usage) usage = json.usage;
          const choice = json.choices?.[0];
          const delta = choice?.delta?.content ?? "";
          if (delta) {
            if (ttft === null) ttft = Date.now() - started;
            text += delta;
          }
          if (choice?.finish_reason) finishReason = choice.finish_reason;
        },
        onEnd(error) {
          const timeout = isAbortError(error);
          writeAiLog({
            ...base(),
            responseContent: text,
            finishReason,
            usage,
            latencyMs: Date.now() - started,
            ttftMs: ttft,
            status: error ? (timeout ? "timeout" : "error") : "success",
            httpStatus: upstream.status,
            errorMessage: error ? (timeout ? "流式读取超时" : `流式中断：${String(error)}`) : null,
          });
        },
      }
    : undefined;

  const filtered = stripReasoningFromSse(upstream.body, observer);
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    Connection: "keep-alive",
  });
  if (logId) headers.set("X-Log-Id", logId);
  return new Response(filtered, { headers });
}

interface SseChunk {
  usage?: AiUsage;
  choices?: Array<{
    finish_reason?: string | null;
    delta?: { content?: string | null; reasoning_content?: string | null };
    message?: { content?: string | null; reasoning_content?: string | null };
  }>;
}

export interface SseObserver {
  onChunk: (json: SseChunk) => void;
  onEnd: (error?: unknown) => void;
}

export function stripReasoningFromSse(
  upstream: ReadableStream<Uint8Array>,
  observer?: SseObserver
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            controller.enqueue(encoder.encode(`${sanitizeSseLine(line, observer)}\n`));
          }
        }
        if (buffer) {
          controller.enqueue(encoder.encode(sanitizeSseLine(buffer, observer)));
        }
        safeEnd(observer);
        controller.close();
      } catch (err) {
        safeEnd(observer, err);
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

function safeEnd(observer: SseObserver | undefined, err?: unknown) {
  try {
    observer?.onEnd(err);
  } catch (e) {
    console.error("[deepseek] observer error:", e);
  }
}

function sanitizeSseLine(line: string, observer?: SseObserver): string {
  if (!line.startsWith("data:")) return line;
  const data = line.slice(5).trim();
  if (!data || data === "[DONE]") return line;
  try {
    const json = JSON.parse(data) as SseChunk;
    try {
      observer?.onChunk(json);
    } catch (e) {
      console.error("[deepseek] observer error:", e);
    }
    const choice = json.choices?.[0];
    if (choice?.delta && "reasoning_content" in choice.delta) {
      delete choice.delta.reasoning_content;
    }
    if (choice?.message && "reasoning_content" in choice.message) {
      delete choice.message.reasoning_content;
    }
    return `data: ${JSON.stringify(json)}`;
  } catch {
    return line;
  }
}
