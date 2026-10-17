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

export async function chatCompletion(params: {
  messages: ChatMessage[];
  json?: boolean;
  thinking?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ content: string; raw: unknown }> {
  const config = getDeepSeekConfig();
  if (!config.apiKey) {
    throw new Error("未配置 DEEPSEEK_API_KEY");
  }

  const res = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequestBody({ ...params, stream: false })),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    const error = new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 500)}`);
    (error as Error & { status: number }).status = res.status;
    throw error;
  }

  const raw = await res.json();
  return { content: extractMessageContent(raw), raw };
}

/**
 * 流式调用。转发上游 SSE，但删除 delta.reasoning_content，避免思维链泄漏到 UI。
 */
export async function chatCompletionStream(params: {
  messages: ChatMessage[];
  thinking?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<Response> {
  const config = getDeepSeekConfig();
  if (!config.apiKey) {
    throw new Error("未配置 DEEPSEEK_API_KEY");
  }

  const upstream = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequestBody({ ...params, stream: true })),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "unknown");
    const error = new Error(`DeepSeek API ${upstream.status}: ${errText.slice(0, 500)}`);
    (error as Error & { status: number }).status = upstream.status;
    throw error;
  }

  const filtered = stripReasoningFromSse(upstream.body);
  return new Response(filtered, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}

export function stripReasoningFromSse(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
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
            controller.enqueue(encoder.encode(`${sanitizeSseLine(line)}\n`));
          }
        }
        if (buffer) {
          controller.enqueue(encoder.encode(sanitizeSseLine(buffer)));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

function sanitizeSseLine(line: string): string {
  if (!line.startsWith("data:")) return line;
  const data = line.slice(5).trim();
  if (!data || data === "[DONE]") return line;
  try {
    const json = JSON.parse(data) as {
      choices?: Array<{
        delta?: {
          content?: string | null;
          reasoning_content?: string | null;
        };
        message?: {
          content?: string | null;
          reasoning_content?: string | null;
        };
      }>;
    };
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
