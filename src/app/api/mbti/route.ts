import { NextRequest, NextResponse } from "next/server";
import { saveMbtiResult } from "@/lib/db/mbti";
import { MBTI_FIVE_ELEMENT } from "@/lib/constants";
import { chatCompletion, parseJsonFromModel } from "@/lib/deepseek";
import { enforceAiRateLimit, requireUser } from "@/lib/require-session";
import type { MbtiAnswers, MbtiType, FiveElement } from "@/types";

// ==========================================
//  MBTI 维度得分计算（纯算法）
// ==========================================

function calculateScores(answers: MbtiAnswers): {
  E: number; I: number;
  S: number; N: number;
  T: number; F: number;
  J: number; P: number;
  mbtiType: MbtiType;
} {
  let E = 0, I = 0, S = 0, N = 0, T = 0, F = 0, J = 0, P = 0;

  // EI: q01-q15, A=E; SN: q16-q30, A=S; TF: q31-q45, A=T; JP: q46-q60, A=J
  for (let i = 1; i <= 60; i++) {
    const qId = `q${String(i).padStart(2, "0")}`;
    const choice = answers[qId];
    if (!choice) continue;

    if (i <= 15) {
      choice === "A" ? E++ : I++;
    } else if (i <= 30) {
      choice === "A" ? S++ : N++;
    } else if (i <= 45) {
      choice === "A" ? T++ : F++;
    } else {
      choice === "A" ? J++ : P++;
    }
  }

  const totalEI = E + I || 1;
  const totalSN = S + N || 1;
  const totalTF = T + F || 1;
  const totalJP = J + P || 1;

  const eScore = Math.round((E / totalEI) * 100);
  const iScore = 100 - eScore;
  const sScore = Math.round((S / totalSN) * 100);
  const nScore = 100 - sScore;
  const tScore = Math.round((T / totalTF) * 100);
  const fScore = 100 - tScore;
  const jScore = Math.round((J / totalJP) * 100);
  const pScore = 100 - jScore;

  const mbtiType = (
    (eScore >= 50 ? "E" : "I") +
    (sScore >= 50 ? "S" : "N") +
    (tScore >= 50 ? "T" : "F") +
    (jScore >= 50 ? "J" : "P")
  ) as MbtiType;

  return {
    E: eScore, I: iScore,
    S: sScore, N: nScore,
    T: tScore, F: fScore,
    J: jScore, P: pScore,
    mbtiType,
  };
}

// ==========================================
//  AI System Prompt
// ==========================================

const SYSTEM_PROMPT = `你是「观己」平台的性格解析师，融合16种人格理论与东方五行哲学。
根据用户的MBTI类型和维度分数，提供个性化解读。

严格返回JSON（无markdown代码块），格式如下：
{
  "aiReading": "200字个性化性格解读，温和正向",
  "keyTraits": ["特质1","特质2","特质3","特质4","特质5"],
  "compatibleTypes": ["XXXX","XXXX"],
  "elementReading": "80字五行关联解读（该MBTI类型对应的五行属性与命理联系）"
}

要求：
1. aiReading 约200字，温和正向，结合该类型的核心特征
2. keyTraits 恰好5个，简短精准的词语或短语
3. compatibleTypes 给出2个最佳搭配人格类型代码
4. elementReading 约80字，将MBTI特质与五行哲学自然融合
5. 只返回JSON，不要任何markdown标记`;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const limited = enforceAiRateLimit(auth.user.id);
    if (limited) return limited;

    const body = await req.json();
    const { answers } = body as { answers: MbtiAnswers };

    if (!answers || Object.keys(answers).length < 60) {
      return NextResponse.json({ error: "答题数据不完整" }, { status: 400 });
    }

    const scores = calculateScores(answers);
    const { mbtiType, E, I, S, N, T, F, J, P } = scores;
    const elementAffinity = (MBTI_FIVE_ELEMENT[mbtiType] ?? "水") as FiveElement;

    const userMsg = `用户的MBTI测试结果：
人格类型：${mbtiType}
维度得分：
- 外向(E) ${E}% / 内向(I) ${I}%
- 感觉(S) ${S}% / 直觉(N) ${N}%
- 思考(T) ${T}% / 情感(F) ${F}%
- 判断(J) ${J}% / 感知(P) ${P}%
五行亲和：${elementAffinity}

请根据以上信息，按要求返回个性化解读JSON。`;

    const { content } = await chatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      json: true,
      thinking: false,
      temperature: 0.7,
      maxTokens: 1024,
    });
    const aiResult = parseJsonFromModel<{
      aiReading?: string;
      keyTraits?: string[];
      compatibleTypes?: string[];
      elementReading?: string;
    }>(content);

    const result = {
      mbtiType,
      scores: { E, I, S, N, T, F, J, P },
      elementAffinity,
      aiReading: aiResult.aiReading ?? "",
      keyTraits: aiResult.keyTraits ?? [],
      compatibleTypes: aiResult.compatibleTypes ?? [],
      elementReading: aiResult.elementReading ?? "",
    };

    saveMbtiResult({
      userId: auth.user.id,
      mbtiType,
      eScore: E,
      iScore: I,
      sScore: S,
      nScore: N,
      tScore: T,
      fScore: F,
      jScore: J,
      pScore: P,
      aiReading: aiResult.aiReading,
      elementAffinity,
    }).catch((err) => console.error("[mbti API] save result error:", err));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[mbti API] error:", err);
    return NextResponse.json({ error: "测试解析失败" }, { status: 500 });
  }
}
