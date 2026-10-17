import { NextResponse } from "next/server";
import { getFortuneCacheByDate, saveFortuneCacheByDate } from "@/lib/db/fortune";
import { chatCompletion, parseLoggedJson } from "@/lib/deepseek";
import { formatAlmanacForPrompt, todayAlmanac, type Almanac } from "@/lib/fortune/almanac";
import { enforceAiRateLimit, requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

/** 缓存版本：旧版缓存（AI 自编干支）一律失效 */
const CACHE_VERSION = 2;

const SYSTEM_PROMPT = `你是「观己」平台的运势解读师。
用户消息里会给出由万年历精确计算的当日黄历（干支、建除、值神、冲煞、宜忌、喜神财神方位、节气）。
这些历法事实已经确定，你只负责解读，严禁改写、补充或另编任何干支、宜忌、方位、节气等历法信息。

请严格只返回 JSON（不要 markdown）：
{
  "overallStars": 1-5整数,
  "overallScore": "X.X",
  "overallSummary": "60字以内，结合当日干支五行与建除值神的综合概述",
  "dailyTip": "80字以内的开运小贴士，可结合当日五行与喜神财神方位",
  "dimensions": [
    {"label":"事业运","stars":1-5,"summary":"6字以内","interpretation":"80字以内","advice":"50字以内可落地建议"},
    {"label":"感情运","stars":1-5,"summary":"...","interpretation":"...","advice":"..."},
    {"label":"财富运","stars":1-5,"summary":"...","interpretation":"...","advice":"..."},
    {"label":"健康运","stars":1-5,"summary":"...","interpretation":"...","advice":"..."}
  ],
  "dailySign": {
    "quote": "一句富有东方哲学意蕴的格言，20字左右（不要标注出处）",
    "openingTip": "30字以内的开运提示",
    "luckyColor": "与当日五行相合的颜色",
    "luckyNumber": 1-9整数
  }
}

要求：内容温和正向，避免制造焦虑；星级要有差异；仅供娱乐参考。`;

function assemble(ai: Record<string, unknown>, a: Almanac) {
  const sign = (ai.dailySign ?? {}) as Record<string, unknown>;
  return {
    version: CACHE_VERSION,
    ...ai,
    // 历法事实一律以万年历为准
    date: a.date,
    weekday: a.weekday,
    ganzhi: a.ganzhi,
    yi: a.yi,
    ji: a.ji,
    dailySign: { ...sign, luckyDirection: `喜神${a.xiShen} · 财神${a.caiShen}` },
    almanac: a,
  };
}

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const almanac = todayAlmanac();
    const cached = (await getFortuneCacheByDate(almanac.dateKey)) as Record<string, unknown> | null;
    if (cached && cached.version === CACHE_VERSION) {
      return NextResponse.json(cached, { headers: { "Cache-Control": "private, max-age=600" } });
    }

    const limited = enforceAiRateLimit(auth.user.id);
    if (limited) return limited;

    const { content, logId } = await chatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `今日黄历（万年历计算结果）：\n${formatAlmanacForPrompt(almanac)}\n\n请据此生成今日运势解读。` },
      ],
      json: true,
      thinking: false,
      temperature: 0.4,
      maxTokens: 2048,
      log: { userId: auth.user.id, apiType: "fortune", promptVersion: `fortune.v${CACHE_VERSION}` },
    });

    const fortune = assemble(parseLoggedJson<Record<string, unknown>>(content, logId), almanac);

    await saveFortuneCacheByDate(almanac.dateKey, fortune).catch((err) =>
      console.error("[fortune API] save cache error:", err)
    );

    return NextResponse.json(fortune, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch (err) {
    console.error("[fortune API] error:", err);
    return NextResponse.json({ error: "生成运势失败" }, { status: 500 });
  }
}
