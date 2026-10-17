import { NextRequest, NextResponse } from "next/server";
import { getZodiacFortuneCached, saveZodiacFortuneCache } from "@/lib/db/zodiac";
import { ZODIAC_DATA } from "@/lib/data/zodiacData";
import { chatCompletion, parseJsonFromModel } from "@/lib/deepseek";
import { formatSkyForPrompt, todaySky } from "@/lib/astro/sky";
import { enforceAiRateLimit, requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

/** 缓存版本：旧版缓存（AI 自编星象）一律失效 */
const CACHE_VERSION = 2;

const SYSTEM_PROMPT = `你是「观己」平台的星象解析师。
用户消息会给出由天文历表（astronomy-engine）计算的今日真实星象：行星所在星座、逆行状态与起止日期、主要相位及偏差。
你只能使用这些给定的星象事实。严禁编造任何未列出的相位、逆行、行星位置、月相或天象事件；
如果要提到某颗行星，必须与给定数据一致（例如给定数据里金星逆行，就不能说金星顺行）。

严格只返回 JSON（不要 markdown）：
{
  "overallStars": 1-5整数,
  "overallSummary": "今日整体运势100字以内，需点出与该星座最相关的1-2个真实星象",
  "dimensions": [
    {"dimension":"事业运","level":1-5,"summary":"50字以内","advice":"30字以内"},
    {"dimension":"感情运","level":1-5,"summary":"...","advice":"..."},
    {"dimension":"财运","level":1-5,"summary":"...","advice":"..."},
    {"dimension":"健康运","level":1-5,"summary":"...","advice":"..."}
  ],
  "luckyColor": "颜色名",
  "luckyNumber": 1-99整数,
  "dailyQuote": "今日寄语（一句话，20字内）",
  "periodAdvice": "近期建议（80字以内，只能结合给定的逆行起止日期等真实节点）"
}

要求：内容温和正向，避免制造焦虑；星级要有差异；仅供娱乐参考。`;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const sign = searchParams.get("sign")?.toLowerCase();
    if (!sign || !ZODIAC_DATA[sign]) {
      return NextResponse.json({ error: "无效的星座参数，请传入合法的 sign（如 aries）" }, { status: 400 });
    }

    const sky = todaySky();
    const dateStr = sky.dateKey;

    const cached = (await getZodiacFortuneCached(sign, dateStr)) as Record<string, unknown> | null;
    if (cached && cached.version === CACHE_VERSION) {
      return NextResponse.json(cached, { headers: { "Cache-Control": "private, max-age=600" } });
    }

    const limited = enforceAiRateLimit(auth.user.id);
    if (limited) return limited;

    const zodiacInfo = ZODIAC_DATA[sign];
    const { content } = await chatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `星座：${zodiacInfo.signCn}（${zodiacInfo.dateRange}，${zodiacInfo.element}象，守护星${zodiacInfo.rulingPlanet}）\n\n今日真实星象：\n${formatSkyForPrompt(sky, sign)}\n\n请据此生成今日运势。`,
        },
      ],
      json: true,
      thinking: false,
      temperature: 0.4,
      maxTokens: 2048,
    });

    const fortune = parseJsonFromModel<Record<string, unknown>>(content);
    const ruling = sky.planets.filter((p) => zodiacInfo.rulingPlanet.includes(p.name));
    const result = {
      ...fortune,
      version: CACHE_VERSION,
      sign,
      signCn: zodiacInfo.signCn,
      date: dateStr,
      sky: {
        planets: sky.planets.map((p) => ({ name: p.name, signCn: p.signCn, degree: p.degreeInSign, retrograde: p.retrograde })),
        retrogrades: sky.retrogrades,
        aspects: sky.aspects.slice(0, 6),
        inSign: sky.planets.filter((p) => p.sign === sign).map((p) => p.name),
        ruling: ruling.map((p) => `${p.name}在${p.signCn}${p.retrograde ? "（逆行）" : ""}`),
      },
    };

    await saveZodiacFortuneCache(sign, dateStr, result).catch((err) =>
      console.error("[zodiac API] save cache error:", err)
    );

    return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch (err) {
    console.error("[zodiac API] error:", err);
    return NextResponse.json({ error: "生成星座运势失败" }, { status: 500 });
  }
}
