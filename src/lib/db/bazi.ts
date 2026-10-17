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

// 按出生信息指纹查找已保存的命盘（用于复用解读）
export async function findBaziChartByInputKey(userId: string, inputKey: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("bazi_charts")
    .select("id, result_json")
    .eq("user_id", userId)
    .eq("result_json->meta->>inputKey", inputKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[DB:bazi] findBaziChartByInputKey error:", error.message);
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

// 读取「本人命盘」id（users.default_bazi_chart_id）
export async function getDefaultBaziChartId(userId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("users")
    .select("default_bazi_chart_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[DB:bazi] getDefaultBaziChartId error:", error.message);
    return null;
  }
  return (data?.default_bazi_chart_id as string | null) ?? null;
}

// 设置/清除「本人命盘」（chartId 必须属于该用户）
export async function setDefaultBaziChart(userId: string, chartId: string | null): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (chartId) {
    const owned = await getBaziChartById(chartId, userId);
    if (!owned) return false;
  }
  const { error } = await supabase
    .from("users")
    .update({ default_bazi_chart_id: chartId, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.error("[DB:bazi] setDefaultBaziChart error:", error.message);
    return false;
  }
  return true;
}

/**
 * 个性化所用命盘：优先「本人命盘」，未设置（或已被删除）时回退到最近保存的一份。
 * isDefault=false 表示是回退结果，前端应提示用户设置本人命盘。
 */
export async function getPersonalBaziChart(userId: string) {
  const defaultId = await getDefaultBaziChartId(userId);
  if (defaultId) {
    const row = await getBaziChartById(defaultId, userId);
    if (row) return { row, isDefault: true as const };
  }
  const latest = await getLatestBaziChart(userId);
  return { row: latest, isDefault: false as const };
}
