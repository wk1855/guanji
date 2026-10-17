import { NextRequest } from "next/server";
import { getBaziChartById, getLatestBaziChart } from "@/lib/db/bazi";
import { formatSavedChartForPrompt, type BaziRecordRow } from "@/lib/bazi/record";
import { ZODIAC_DATA } from "@/lib/data/zodiacData";
import { formatSkyForPrompt, todaySky } from "@/lib/astro/sky";
import { formatAlmanacForPrompt, todayAlmanac } from "@/lib/fortune/almanac";
import { chatCompletion, parseJsonFromModel } from "@/lib/deepseek";
import { buildPeriodContext, formatPeriodForPrompt, type FortuneScope } from "@/lib/fortune/period";
import { normalizePersonalFortune, timelineSkeleton, type PersonalFortune } from "@/lib/fortune/personal";
import { enforceAiRateLimit, requireUser } from "@/lib/require-session";
import { ErrorCode, fail, ok } from "@/lib/utils/response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCOPE_TEXT: Record<FortuneScope, string> = { today: "今日", week: "本周", month: "本月" };

// 同一实例内的轻量缓存：同一天、同一命盘、同一范围不重复调用 AI（可用 refresh 强制刷新）
const cache = new Map<string, PersonalFortune>();
const CACHE_VERSION = 2;

function buildSystemPrompt(scope: FortuneScope, hasChart: boolean, hasSign: boolean, timelineHint: string) {
  return `你是「观己」平台的资深命理师，精通子平八字与西方占星。
你要基于给出的真实历法干支${hasChart ? "和命主已排好的八字命盘" : ""}${hasSign ? "以及命主星座" : ""}，生成${SCOPE_TEXT[scope]}的个性化运势。
${hasChart ? "必须具体分析流年/流月/流日干支与命主日主、四柱、当前大运的生克冲合关系，不要泛泛而谈；严禁改动命盘。" : "命主尚未提供八字，按当期干支给出通用但具体的解读。"}
${hasSign ? "把星座元素特质与八字五行喜忌融合，说明二者如何共同影响当期。" : ""}

严格只返回 JSON（不要 markdown），格式：
{
  "title": "10字以内标题",
  "overallStars": 1-5整数,
  "overallSummary": "150字以内总评",
  "baziInsight": "${hasChart ? "200字以内：当期干支与命盘（日主强弱、用神喜忌、大运）的作用关系" : ""}",
  "zodiacInsight": "${hasSign ? "150字以内：星座特质 × 八字五行的融合解读" : ""}",
  "dimensions": [
    {"label":"事业运","stars":1-5,"interpretation":"100字以内","advice":"60字以内可落地建议"},
    {"label":"感情运","stars":1-5,"interpretation":"...","advice":"..."},
    {"label":"财富运","stars":1-5,"interpretation":"...","advice":"..."},
    {"label":"健康运","stars":1-5,"interpretation":"...","advice":"..."}
  ],
  "timeline": [${timelineHint}],
  "keyDates": [${scope === "today" ? "" : '{"date":"M/D","note":"60字以内：该日为何关键、如何把握"}'}],
  "yi": ["宜1","宜2","宜3","宜4"],
  "ji": ["忌1","忌2","忌3"],
  "lucky": {"color":"颜色","number":1-9整数,"direction":"方位"},
  "actions": ["具体行动建议1","具体行动建议2","具体行动建议3"]
}

要求：
1. timeline 数组长度与顺序必须与给定时间段一一对应，每项 {"stars":1-5,"tip":"40字以内"}
2. ${scope === "month" ? "keyDates 给 3-5 个本月关键日期（来自给定逐日干支）" : scope === "week" ? "keyDates 给 2-3 个本周关键日期" : "keyDates 返回空数组"}
3. 星级要有起伏，不要全部相同
4. 语气温和正向，负面信息必须配套建议，禁止「大凶」「破财」「血光之灾」等恐吓措辞
5. 历法干支、黄历、星象只能使用用户消息中给出的数据，严禁编造未给出的干支、宜忌、行星位置、逆行或相位；不要编造典籍引文
6. 仅供娱乐参考，不构成决策建议`;
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: { scope?: string; sign?: string | null; chartId?: string | null; refresh?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // 允许空 body
  }

  const scope: FortuneScope = body.scope === "week" || body.scope === "month" ? body.scope : "today";
  const sign = typeof body.sign === "string" && ZODIAC_DATA[body.sign.toLowerCase()] ? body.sign.toLowerCase() : null;
  if (body.sign && !sign) return fail(ErrorCode.VALIDATION_FAILED, "无效的星座参数", 400);

  const row = (body.chartId
    ? await getBaziChartById(body.chartId, auth.user.id)
    : await getLatestBaziChart(auth.user.id)) as BaziRecordRow | null;

  if (body.chartId && !row) return fail(ErrorCode.RESOURCE_NOT_FOUND, "命盘记录不存在", 404);
  // 「与八字深度结合」必须有命盘
  if (sign && !row) {
    return fail("NO_CHART", "还没有保存的八字命盘，请先去八字排盘生成一份", 404);
  }

  const ctx = buildPeriodContext(scope);
  const cacheKey = [CACHE_VERSION, auth.user.id, scope, sign ?? "-", row?.id ?? "-", ctx.todayKey].join(":");
  if (!body.refresh && cache.has(cacheKey)) return ok(cache.get(cacheKey));

  const limited = enforceAiRateLimit(auth.user.id);
  if (limited) return limited;

  const skeleton = timelineSkeleton(ctx);
  const timelineHint = skeleton.map((s) => `{"stars":n,"tip":"${s.label}${s.ganZhi ? `(${s.ganZhi})` : ""}"}`).join(",");

  const zodiac = sign ? ZODIAC_DATA[sign] : null;
  const userParts = [
    `【当期历法】\n${formatPeriodForPrompt(ctx)}`,
    scope === "today" ? `【今日黄历（万年历计算）】\n${formatAlmanacForPrompt(todayAlmanac())}` : "",
    zodiac ? `【今日真实星象（天文历表计算）】\n${formatSkyForPrompt(todaySky(), sign!)}` : "",
    `【时间轴分段】${skeleton.map((s) => s.label + (s.ganZhi ? `(${s.ganZhi})` : "")).join("；")}`,
    row ? `【命主八字】\n${formatSavedChartForPrompt(row)}` : "",
    zodiac
      ? `【命主星座】${zodiac.signCn}（${zodiac.element}象，守护星${zodiac.rulingPlanet}，对应五行${zodiac.fiveElementMap}，特质：${zodiac.keyTraits.join("、")}）`
      : "",
  ].filter(Boolean);

  try {
    const { content } = await chatCompletion({
      messages: [
        { role: "system", content: buildSystemPrompt(scope, !!row, !!zodiac, timelineHint) },
        { role: "user", content: userParts.join("\n\n") },
      ],
      json: true,
      thinking: false,
      temperature: 0.4,
      maxTokens: scope === "month" ? 3000 : 2400,
    });

    const raw = parseJsonFromModel<Record<string, unknown>>(content);
    const r = row?.result_json as Record<string, { tianGan?: string; diZhi?: string }> | undefined;
    const pillars = r
      ? [r.yearPillar, r.monthPillar, r.dayPillar, r.hourPillar].map((p) => `${p?.tianGan ?? ""}${p?.diZhi ?? ""}`).join(" ")
      : "";
    const result = normalizePersonalFortune(raw, ctx, {
      sign,
      chart: row ? { id: row.id, name: row.name, pillars, dayMaster: String(r?.dayMaster ?? "") } : null,
    });
    cache.set(cacheKey, result);
    if (cache.size > 100) cache.delete(cache.keys().next().value as string);
    return ok(result);
  } catch (err) {
    console.error("[fortune/personal] error:", err);
    return fail(ErrorCode.AI_SERVICE_ERROR, "AI 解读失败，请稍后重试", 502);
  }
}
