import { NextRequest, NextResponse } from "next/server";
import { getZodiacFortuneCached, saveZodiacFortuneCache } from "@/lib/db/zodiac";
import { ZODIAC_DATA } from "@/lib/data/zodiacData";
import { chatCompletion, parseJsonFromModel } from "@/lib/deepseek";
import { enforceAiRateLimit, requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `你是「观己」平台的星象解析师，精通西方占星与东方命理。
请为指定星座生成今日运势解读。

严格返回JSON（无markdown），格式如下：
{
  "overallStars": 1到5的整数,
  "overallSummary": "今日整体运势100字",
  "dimensions": [
    {"dimension":"事业运","level":1到5的整数,"summary":"50字","advice":"30字"},
    {"dimension":"感情运","level":1到5的整数,"summary":"50字","advice":"30字"},
    {"dimension":"财运","level":1到5的整数,"summary":"50字","advice":"30字"},
    {"dimension":"健康运","level":1到5的整数,"summary":"50字","advice":"30字"}
  ],
  "luckyColor": "颜色名",
  "luckyNumber": 1到99的整数,
  "dailyQuote": "今日寄语（一句话，20字内）",
  "periodAdvice": "近期建议（80字，结合星象节点）"
}

要求：
1. 内容温和正向，避免制造焦虑
2. 星级评分要有差异化，不要全部一样
3. 只返回JSON，不要markdown代码块
4. 结合该星座的元素特质给出有针对性的建议`;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const limited = enforceAiRateLimit(auth.user.id);
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const sign = searchParams.get("sign")?.toLowerCase();

    if (!sign || !ZODIAC_DATA[sign]) {
      return NextResponse.json(
        { error: "无效的星座参数，请传入合法的 sign（如 aries）" },
        { status: 400 }
      );
    }

    const dateStr = new Date()
      .toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Shanghai",
      })
      .replace(/\//g, "-");

    const cached = await getZodiacFortuneCached(sign, dateStr);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "private, max-age=3600" },
      });
    }

    const zodiacInfo = ZODIAC_DATA[sign];
    const today = new Date().toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      timeZone: "Asia/Shanghai",
    });

    const { content } = await chatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `今天是${today}，请为【${zodiacInfo.signCn}】（${zodiacInfo.dateRange}，${zodiacInfo.element}元素，守护星：${zodiacInfo.rulingPlanet}）生成今日运势。`,
        },
      ],
      json: true,
      thinking: false,
      temperature: 0.8,
      maxTokens: 2048,
    });

    const fortune = parseJsonFromModel<Record<string, unknown>>(content);
    const result = {
      ...fortune,
      sign,
      signCn: zodiacInfo.signCn,
      date: dateStr,
    };

    saveZodiacFortuneCache(sign, dateStr, result).catch((err) =>
      console.error("[zodiac API] save cache error:", err)
    );

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    console.error("[zodiac API] error:", err);
    return NextResponse.json({ error: "生成星座运势失败" }, { status: 500 });
  }
}
