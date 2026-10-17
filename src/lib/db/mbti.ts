import { createServiceRoleClient } from "@/lib/supabase";

// 保存 MBTI 测试结果到数据库
export async function saveMbtiResult(params: {
  userId: string;
  mbtiType: string;
  eScore: number;
  iScore: number;
  sScore: number;
  nScore: number;
  tScore: number;
  fScore: number;
  jScore: number;
  pScore: number;
  aiReading?: string;
  elementAffinity?: string;
}) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("mbti_results")
    .insert({
      user_id: params.userId,
      mbti_type: params.mbtiType,
      e_score: params.eScore,
      i_score: params.iScore,
      s_score: params.sScore,
      n_score: params.nScore,
      t_score: params.tScore,
      f_score: params.fScore,
      j_score: params.jScore,
      p_score: params.pScore,
      ai_reading: params.aiReading ?? null,
      element_affinity: params.elementAffinity ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[DB:mbti] saveMbtiResult error:", error.message);
    return null;
  }
  return data?.id ?? null;
}

// 获取用户 MBTI 历史记录
export async function getUserMbtiResults(userId: string, limit = 5) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("mbti_results")
    .select(
      "id, mbti_type, e_score, i_score, s_score, n_score, t_score, f_score, j_score, p_score, element_affinity, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[DB:mbti] getUserMbtiResults error:", error.message);
    return [];
  }
  return data ?? [];
}

// 获取用户最新一次 MBTI 结果
export async function getLatestMbtiResult(userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("mbti_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

// 获取单条 MBTI 结果（验证所有权）
export async function getMbtiResultById(id: string, userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("mbti_results")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

// 删除单条 MBTI 结果（验证所有权），返回是否删除成功
export async function deleteMbtiResult(id: string, userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("mbti_results")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (error) {
    console.error("[DB:mbti] deleteMbtiResult error:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
