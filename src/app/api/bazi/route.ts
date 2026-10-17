import { NextRequest, NextResponse } from "next/server";
import { annotateAiLog } from "@/lib/ai-log";
import { findBaziChartByInputKey, saveBaziChart } from "@/lib/db/bazi";
import { chatCompletion, parseLoggedJson } from "@/lib/deepseek";
import { computeBaziChart, formatChartForPrompt } from "@/lib/bazi/chart";
import { todayAlmanac } from "@/lib/fortune/almanac";
import { enforceAiRateLimit, requireUser } from "@/lib/require-session";

export const maxDuration = 60;

/** 排盘算法 / 提示词版本；变更后旧的解读缓存不再复用 */
const READING_VERSION = 2;

const SYSTEM_PROMPT = `你是「观己」平台的八字解读师。
用户会提供已经由万年历（含节气、真太阳时、夏令时修正）精确排出的命盘，以及系统计算好的十神、藏干、十二长生、空亡、大运、流年。
你只负责解读：严禁改动、重排或质疑四柱、日主、十神、大运等任何给定数据，也不要自行补充未给出的神煞。
若时柱为「时辰不详」，按三柱论命，不要臆测时柱。

请严格只返回 JSON（不要 markdown）：
{
  "basicReading": [
    "整体格局：200字以内，分析日主强弱（结合月令与十二长生）、格局与用神喜忌",
    "性格特点：150字以内，结合十神组合分析",
    "近期运势：150字以内，结合当前大运与今年流年对命局的作用"
  ]
}

要求：解读温和正向，避免制造焦虑；不要编造典籍引文或出处；仅供娱乐参考。`;

function inputKeyOf(p: Record<string, unknown>) {
  return JSON.stringify([
    READING_VERSION,
    p.name,
    p.gender,
    p.birthYear,
    p.birthMonth,
    p.birthDay,
    p.hourKnown ? p.birthHour : null,
    p.hourKnown ? p.birthMinute : null,
    p.isLunar,
    p.isLeapMonth,
    p.birthPlace ?? "",
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const body = await req.json();
    const name = String(body.name ?? "").trim().slice(0, 40);
    const gender: "male" | "female" = body.gender === "female" ? "female" : "male";
    const birthYear = Number(body.birthYear);
    const birthMonth = Number(body.birthMonth);
    const birthDay = Number(body.birthDay);
    const hourKnown = body.hourKnown !== false && body.birthHour != null && body.birthHour !== "";
    const birthHour = hourKnown ? Number(body.birthHour) : null;
    const birthMinute = hourKnown ? Number(body.birthMinute ?? 0) : null;
    const isLunar = Boolean(body.isLunar);
    const isLeapMonth = isLunar && Boolean(body.isLeapMonth);
    const birthPlace = typeof body.birthPlace === "string" && body.birthPlace ? body.birthPlace : undefined;

    if (!name || !birthYear || !birthMonth || !birthDay) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    let chart;
    try {
      chart = computeBaziChart({ birthYear, birthMonth, birthDay, birthHour, birthMinute, hourKnown, isLunar, isLeapMonth, birthPlace, gender });
    } catch (err) {
      const message = err instanceof Error ? err.message : "排盘参数无效";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const meta = {
      inputKey: inputKeyOf({ name, gender, birthYear, birthMonth, birthDay, birthHour, birthMinute, hourKnown, isLunar, isLeapMonth, birthPlace }),
      input: { birthYear, birthMonth, birthDay, birthHour, birthMinute, hourKnown, isLunar, isLeapMonth, birthPlace: birthPlace ?? null },
      solar: chart.solar,
      clock: chart.clock,
      hourKnown: chart.hourKnown,
      lunar: chart.lunar,
      trueSolar: chart.trueSolar,
      nayin: chart.nayin,
      details: chart.details,
      taiYuan: chart.taiYuan,
      mingGong: chart.mingGong,
      shenGong: chart.shenGong,
      daYun: chart.daYun,
      daYunStart: chart.daYunStart,
      readingVersion: READING_VERSION,
    };
    const base = {
      yearPillar: chart.yearPillar,
      monthPillar: chart.monthPillar,
      dayPillar: chart.dayPillar,
      hourPillar: chart.hourPillar,
      dayMaster: chart.dayMaster,
      wuXingBalance: chart.wuXingBalance,
      meta,
    };

    // 相同出生信息 + 相同算法版本：直接复用已保存的解读，不重复调用 AI
    const existing = await findBaziChartByInputKey(auth.user.id, meta.inputKey);
    const existingReading = (existing?.result_json as { basicReading?: string[] } | undefined)?.basicReading;
    if (existing && Array.isArray(existingReading) && existingReading.length) {
      return NextResponse.json({ ...base, basicReading: existingReading, id: existing.id, cached: true });
    }

    const limited = enforceAiRateLimit(auth.user.id);
    if (limited) return limited;

    const almanac = todayAlmanac();
    const userMsg = `请解读以下命盘：
命主：${name}（${gender === "male" ? "男" : "女"}）
出生地：${birthPlace ?? "未填写"}

${formatChartForPrompt(chart, { date: `${almanac.date}`, yearGanZhi: almanac.yearGanZhi, dayGanZhi: almanac.dayGanZhi })}`;

    const { content, logId } = await chatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      json: true,
      thinking: false,
      temperature: 0.4,
      maxTokens: 2048,
      log: { userId: auth.user.id, apiType: "bazi", promptVersion: "bazi.v3" },
    });

    const aiResult = parseLoggedJson<{ basicReading?: string[] }>(content, logId);
    const result = {
      ...base,
      basicReading: Array.isArray(aiResult.basicReading) ? aiResult.basicReading.map(String) : [],
    };

    const chartId = await saveBaziChart({
      userId: auth.user.id,
      name,
      gender,
      birthYear,
      birthMonth,
      birthDay,
      birthHour: birthHour ?? undefined,
      birthPlace,
      isLunar,
      resultJson: result,
    }).catch((err) => {
      console.error("[bazi API] save chart error:", err);
      return null;
    });

    if (chartId) annotateAiLog(logId, { bazi_chart_id: chartId });
    return NextResponse.json({ ...result, id: chartId });
  } catch (err) {
    console.error("[bazi API] error:", err);
    return NextResponse.json({ error: "排盘失败" }, { status: 500 });
  }
}
