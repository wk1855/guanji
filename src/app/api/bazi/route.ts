import { NextRequest, NextResponse } from "next/server";
import { saveBaziChart } from "@/lib/db/bazi";
import { chatCompletion, parseJsonFromModel } from "@/lib/deepseek";
import { computeBaziChart, formatChartForPrompt } from "@/lib/bazi/chart";
import { enforceAiRateLimit, requireUser } from "@/lib/require-session";

const SYSTEM_PROMPT = `你是「观己」平台的AI八字解读师。精通八字命理、天干地支、五行生克。
用户会提供已经由万年历（含节气、真太阳时）精确排出的四柱命盘。
你只负责解读，严禁改动、重排或质疑四柱、日主、五行占比数字。

请严格按以下JSON格式返回，不要包含任何其他内容，只返回纯JSON：

{
  "yearPillar": { "tianGan": "X", "diZhi": "X", "wuXing": "木/火/土/金/水" },
  "monthPillar": { "tianGan": "X", "diZhi": "X", "wuXing": "木/火/土/金/水" },
  "dayPillar": { "tianGan": "X", "diZhi": "X", "wuXing": "木/火/土/金/水" },
  "hourPillar": { "tianGan": "X", "diZhi": "X", "wuXing": "木/火/土/金/水" },
  "dayMaster": "日主天干",
  "wuXingBalance": { "木": 数字, "火": 数字, "土": 数字, "金": 数字, "水": 数字 },
  "basicReading": [
    "整体格局：200字以内的格局分析，包含日主强弱、用神喜忌",
    "性格特点：150字以内的性格分析",
    "近期运势：150字以内的近期运势分析"
  ]
}

要求：
1. yearPillar/monthPillar/dayPillar/hourPillar/dayMaster/wuXingBalance 必须原样回写用户提供的排盘结果，一个字都不能改
2. wuXing 填该柱天干对应的五行
3. 解读温和正向，避免制造焦虑
4. 引用正统命理典籍
5. 只返回JSON，不要markdown代码块`;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const limited = enforceAiRateLimit(auth.user.id);
    if (limited) return limited;

    const body = await req.json();
    const { name, gender, birthYear, birthMonth, birthDay, birthHour, birthPlace, isLunar } = body;

    if (!name || !birthYear || !birthMonth || !birthDay) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    let chart;
    try {
      chart = computeBaziChart({
        birthYear: Number(birthYear),
        birthMonth: Number(birthMonth),
        birthDay: Number(birthDay),
        birthHour: birthHour != null ? Number(birthHour) : 12,
        isLunar: Boolean(isLunar),
        birthPlace: birthPlace ?? undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "排盘参数无效";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const genderText = gender === "male" ? "男" : "女";
    const calendarType = isLunar ? "农历" : "公历";
    const userMsg = `请解读以下命盘（四柱已由系统精确排出，请原样写入 JSON 的四柱字段）：
姓名：${name}
性别：${genderText}
用户填写的出生日期：${calendarType} ${birthYear}年${birthMonth}月${birthDay}日
出生地：${birthPlace ?? "未填写"}

${formatChartForPrompt(chart)}`;

    const { content } = await chatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      json: true,
      thinking: false,
      temperature: 0.4,
      maxTokens: 2048,
    });

    const aiResult = parseJsonFromModel<{
      basicReading?: string[];
      yearPillar?: unknown;
      monthPillar?: unknown;
      dayPillar?: unknown;
      hourPillar?: unknown;
      dayMaster?: unknown;
      wuXingBalance?: unknown;
    }>(content);

    const result = {
      yearPillar: chart.yearPillar,
      monthPillar: chart.monthPillar,
      dayPillar: chart.dayPillar,
      hourPillar: chart.hourPillar,
      dayMaster: chart.dayMaster,
      wuXingBalance: chart.wuXingBalance,
      basicReading: Array.isArray(aiResult.basicReading) ? aiResult.basicReading : [],
      meta: {
        solar: chart.solar,
        lunar: chart.lunar,
        trueSolar: chart.trueSolar,
        nayin: chart.nayin,
      },
    };

    saveBaziChart({
      userId: auth.user.id,
      name,
      gender: gender ?? "male",
      birthYear: Number(birthYear),
      birthMonth: Number(birthMonth),
      birthDay: Number(birthDay),
      birthHour: birthHour != null ? Number(birthHour) : undefined,
      birthPlace: birthPlace ?? undefined,
      isLunar: Boolean(isLunar),
      resultJson: result,
    }).catch((err) => console.error("[bazi API] save chart error:", err));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[bazi API] error:", err);
    return NextResponse.json({ error: "排盘失败" }, { status: 500 });
  }
}
