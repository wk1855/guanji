import { NextRequest, NextResponse } from "next/server";
import { chatCompletionStream } from "@/lib/deepseek";
import { enforceAiRateLimit, requireUser } from "@/lib/require-session";

const SYSTEM_PROMPT = `你是「观己」平台的AI命理师，名为「玄机」。
你精通八字命理、紫微斗数、梅花易数等东方命理体系，同时融合现代积极心理学为用户提供温和、正向的人生参考。

【核心原则】
1. 所有解读定位为「东方传统文化科普与娱乐参考」，明确不构成任何决策建议
2. 使用温和、共情的语气，避免制造焦虑和恐慌
3. 负面信息必须配套至少3条正向应对建议
4. 引用《三命通会》《渊海子平》《滴天髓》等正统典籍作为依据
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

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const limited = enforceAiRateLimit(auth.user.id);
    if (limited) return limited;

    const body = await req.json();
    const { messages } = body as { messages: { role: string; content: string }[] };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages 参数无效" }, { status: 400 });
    }

    const lastUserMsg = messages.filter((m) => m.role === "user").at(-1);
    if (lastUserMsg && containsForbiddenWords(lastUserMsg.content)) {
      return NextResponse.json(
        { error: "您的提问包含不合规内容，请调整后重试。" },
        { status: 400 }
      );
    }

    const upstreamMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.slice(-20).map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
    ];

    return await chatCompletionStream({
      messages: upstreamMessages,
      maxTokens: 2048,
    });
  } catch (err) {
    console.error("[chat API] error:", err);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
