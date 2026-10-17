import { NextRequest, NextResponse } from "next/server";
import { chatCompletionStream } from "@/lib/deepseek";
import { createChatSession, getChatSession, saveChatMessage } from "@/lib/db/chat";
import { getLatestBaziChart } from "@/lib/db/bazi";
import { formatSavedChartForPrompt, type BaziRecordRow } from "@/lib/bazi/record";
import { formatAlmanacForPrompt, todayAlmanac } from "@/lib/fortune/almanac";
import { enforceAiRateLimit, requireUser } from "@/lib/require-session";

const SYSTEM_PROMPT = `你是「观己」平台的AI命理师，名为「玄机」。
你精通八字命理、紫微斗数、梅花易数等东方命理体系，同时融合现代积极心理学为用户提供温和、正向的人生参考。

【核心原则】
1. 所有解读定位为「东方传统文化科普与娱乐参考」，明确不构成任何决策建议
2. 使用温和、共情的语气，避免制造焦虑和恐慌
3. 负面信息必须配套至少3条正向应对建议
4. 不要编造典籍引文或出处；历法、命盘数据以系统提供的为准，不要自行推算或改动四柱
5. 禁止出现「大凶」「必死」「破财」「血光之灾」「改命」「算命」等话术
6. 每次回复结尾附上：「以上内容仅供娱乐参考，不构成任何决策建议。」

【回复风格】
- 语气：温暖、专业、富有东方哲学意蕴
- 结构：先回应用户情绪 → 命理分析 → 正向建议 → 合规提示
- 长度：200-500字为宜，不宜过长`;

const FORBIDDEN_WORDS = ["算命", "改命", "必中", "大凶", "破财", "血光之灾", "消灾", "化解灾难"];

function containsForbiddenWords(text: string): boolean {
  return FORBIDDEN_WORDS.some((word) => text.includes(word));
}

/**
 * 透传 SSE，同时累积 assistant 回复内容；流结束时（在关闭响应前）写入数据库，
 * 确保 Serverless 函数不会在保存完成前被回收。
 */
function teeAndPersist(body: ReadableStream<Uint8Array>, onDone: (text: string) => Promise<void>) {
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  const consume = (line: string) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    try {
      const json = JSON.parse(data);
      text += json.choices?.[0]?.delta?.content ?? "";
    } catch {
      // 忽略无法解析的行
    }
  };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          lines.forEach(consume);
        }
        if (buffer) consume(buffer);
        await onDone(text).catch((err) => console.error("[chat API] persist error:", err));
        controller.close();
      } catch (err) {
        if (text) await onDone(text).catch(() => undefined);
        controller.error(err);
      }
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const limited = enforceAiRateLimit(auth.user.id);
    if (limited) return limited;

    const body = await req.json();
    const { messages, sessionId: rawSessionId } = body as {
      messages: { role: string; content: string }[];
      sessionId?: string | null;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages 参数无效" }, { status: 400 });
    }

    const lastUserMsg = messages.filter((m) => m.role === "user").at(-1);
    if (!lastUserMsg || !lastUserMsg.content?.trim()) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }
    if (containsForbiddenWords(lastUserMsg.content)) {
      return NextResponse.json(
        { error: "您的提问包含不合规内容，请调整后重试。" },
        { status: 400 }
      );
    }

    // 会话：传入的 sessionId 必须属于当前用户，否则新建
    let sessionId: string | null = null;
    if (typeof rawSessionId === "string" && rawSessionId) {
      const existing = await getChatSession(rawSessionId, auth.user.id);
      if (existing) sessionId = existing.id as string;
    }
    if (!sessionId) {
      const title = lastUserMsg.content.trim().replace(/\s+/g, " ").slice(0, 20);
      sessionId = await createChatSession(auth.user.id, title);
    }
    if (sessionId) {
      await saveChatMessage({ sessionId, role: "user", content: lastUserMsg.content.trim() });
    }

    // 自动带上今日黄历与站长最近保存的命盘，避免模型自行编造日期/干支
    const almanac = todayAlmanac();
    const latestChart = (await getLatestBaziChart(auth.user.id).catch(() => null)) as BaziRecordRow | null;
    const contextBlock = [
      `【今日（北京时间）】\n${formatAlmanacForPrompt(almanac)}`,
      latestChart
        ? `【用户最近保存的八字命盘（系统精确排出，用户问到"我的命盘/八字"时以此为准；若用户谈论他人则不要套用）】\n${formatSavedChartForPrompt(latestChart)}`
        : "【用户尚未保存八字命盘】如需个人命理分析，可建议先到「八字排盘」生成。",
    ].join("\n\n");

    const upstreamMessages = [
      { role: "system" as const, content: `${SYSTEM_PROMPT}\n\n${contextBlock}` },
      ...messages.slice(-20).map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
    ];

    const upstream = await chatCompletionStream({
      messages: upstreamMessages,
      temperature: 0.6,
      maxTokens: 2048,
    });

    const headers = new Headers(upstream.headers);
    if (sessionId) headers.set("X-Session-Id", sessionId);
    if (!sessionId || !upstream.body) {
      return new Response(upstream.body, { headers });
    }

    const persistedSessionId = sessionId;
    const stream = teeAndPersist(upstream.body, async (text) => {
      if (text.trim()) {
        await saveChatMessage({ sessionId: persistedSessionId, role: "assistant", content: text });
      }
    });
    return new Response(stream, { headers });
  } catch (err) {
    console.error("[chat API] error:", err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
