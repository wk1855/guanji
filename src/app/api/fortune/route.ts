import { NextResponse } from "next/server";
import { getFortuneCacheByDate, saveFortuneCacheByDate } from "@/lib/db/fortune";
import { chatCompletion, parseJsonFromModel } from "@/lib/deepseek";
import { enforceAiRateLimit, requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `你是「观己」平台的AI运势分析师。你精通八字命理、紫微斗数等东方命理体系。
现在需要你生成今日运势内容。请严格按以下JSON格式返回，不要包含任何其他内容，只返回纯JSON：

{
  "date": "YYYY年M月D日",
  "ganzhi": "X年 · X月 · X日（用天干地支表示当日干支）",
  "weekday": "周X",
  "overallStars": 数字1-5,
  "overallScore": "X.X",
  "overallSummary": "50字以内的今日综合运势概述",
  "yi": ["宜做的事情1", "宜做的事情2", "宜做的事情3", "宜做的事情4", "宜做的事情5"],
  "ji": ["忌做的事情1", "忌做的事情2", "忌做的事情3", "忌做的事情4"],
  "dailyTip": "80字以内的今日开运小贴士，结合五行流转",
  "dimensions": [
    {
      "label": "事业运",
      "stars": 数字1-5,
      "summary": "6字以内摘要",
      "interpretation": "80字以内的详细解读",
      "advice": "50字以内的可落地建议"
    },
    {
      "label": "感情运",
      "stars": 数字1-5,
      "summary": "6字以内摘要",
      "interpretation": "80字以内的详细解读",
      "advice": "50字以内的可落地建议"
    },
    {
      "label": "财富运",
      "stars": 数字1-5,
      "summary": "6字以内摘要",
      "interpretation": "80字以内的详细解读",
      "advice": "50字以内的可落地建议"
    },
    {
      "label": "健康运",
      "stars": 数字1-5,
      "summary": "6字以内摘要",
      "interpretation": "80字以内的详细解读",
      "advice": "50字以内的可落地建议"
    }
  ],
  "dailySign": {
    "quote": "一句富有东方哲学意蕴的格言，20字左右",
    "openingTip": "30字以内的开运提示",
    "luckyColor": "开运颜色名称",
    "luckyNumber": 数字1-9,
    "luckyDirection": "方位"
  }
}

要求：
1. 根据今天的真实日期生成对应干支
2. 内容温和正向，避免制造焦虑
3. 星级评分要有差异化，不要全部一样
4. 只返回JSON，不要markdown代码块`;

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const limited = enforceAiRateLimit(auth.user.id);
    if (limited) return limited;

    const dateStr = new Date()
      .toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Shanghai",
      })
      .replace(/\//g, "-");

    const cached = await getFortuneCacheByDate(dateStr);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "private, max-age=3600" },
      });
    }

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
        { role: "user", content: `今天是${today}，请生成今日运势。` },
      ],
      json: true,
      thinking: false,
      temperature: 0.8,
      maxTokens: 2048,
    });

    const fortune = parseJsonFromModel<Record<string, unknown>>(content);

    saveFortuneCacheByDate(dateStr, fortune).catch((err) =>
      console.error("[fortune API] save cache error:", err)
    );

    return NextResponse.json(fortune, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    console.error("[fortune API] error:", err);
    return NextResponse.json({ error: "生成运势失败" }, { status: 500 });
  }
}
