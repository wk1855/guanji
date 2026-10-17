import { createServiceRoleClient } from "@/lib/supabase";

// 保存八字命盘结果到数据库
export async function saveBaziChart(params: {
  userId: string;
  name: string;
  gender: "male" | "female";
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour?: number;
  birthPlace?: string;
  isLunar: boolean;
  resultJson: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("bazi_charts")
    .insert({
      user_id: params.userId,
      name: params.name,
      gender: params.gender,
      birth_year: params.birthYear,
      birth_month: params.birthMonth,
      birth_day: params.birthDay,
      birth_hour: params.birthHour ?? null,
      birth_place: params.birthPlace ?? null,
      is_lunar: params.isLunar,
      result_json: params.resultJson,
      year_pillar: (params.resultJson as any).yearPillar ?? null,
      month_pillar: (params.resultJson as any).monthPillar ?? null,
      day_pillar: (params.resultJson as any).dayPillar ?? null,
      hour_pillar: (params.resultJson as any).hourPillar ?? null,
      day_master: (params.resultJson as any).dayMaster ?? null,
      five_elements: (params.resultJson as any).wuXingBalance ?? null,
      summary: ((params.resultJson as any).basicReading?.[0] ?? "").slice(0, 500),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[DB:bazi] saveBaziChart error:", error.message);
    return null;
  }
  return data?.id ?? null;
}

// 获取用户的八字历史记录（新到旧）
export async function getUserBaziCharts(userId: string, limit = 50) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("bazi_charts")
    .select(
      "id, name, gender, birth_year, birth_month, birth_day, birth_hour, birth_place, is_lunar, year_pillar, month_pillar, day_pillar, hour_pillar, day_master, summary, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[DB:bazi] getUserBaziCharts error:", error.message);
    return [];
  }
  return data ?? [];
}

// 获取最新一条八字命盘（用于个性化运势）
export async function getLatestBaziChart(userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("bazi_charts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[DB:bazi] getLatestBaziChart error:", error.message);
    return null;
  }
  return data;
}

// 获取单条八字命盘详情（验证所有权）
export async function getBaziChartById(id: string, userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("bazi_charts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

// 删除单条八字命盘（验证所有权），返回是否删除成功
export async function deleteBaziChart(id: string, userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("bazi_charts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    console.error("[DB:bazi] deleteBaziChart error:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
