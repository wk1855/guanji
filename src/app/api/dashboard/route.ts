import { getPersonalBaziChart, getUserBaziCharts } from "@/lib/db/bazi";
import { getUserChatSessions } from "@/lib/db/chat";
import { getLatestMbtiResult } from "@/lib/db/mbti";
import { todayAlmanac } from "@/lib/fortune/almanac";
import { ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

type Pillar = { tianGan?: string; diZhi?: string } | null | undefined;
const pillarsOf = (row: Record<string, unknown>) =>
  [row.year_pillar, row.month_pillar, row.day_pillar, row.hour_pillar]
    .map((p) => {
      const v = p as Pillar;
      return v?.tianGan ? `${v.tianGan}${v.diZhi ?? ""}` : "";
    })
    .filter(Boolean)
    .join(" ");

/** 首页个人看板：今日黄历（万年历计算）+ 本人命盘 + 最近排盘/对话 + MBTI，全部为真实数据 */
export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const uid = auth.user.id;

    const [personal, charts, sessions, mbti] = await Promise.all([
      getPersonalBaziChart(uid),
      getUserBaziCharts(uid, 1),
      getUserChatSessions(uid, 3),
      getLatestMbtiResult(uid),
    ]);

    const p = personal.row as Record<string, unknown> | null;
    const latest = charts[0] as Record<string, unknown> | undefined;

    return ok({
      almanac: todayAlmanac(),
      personalChart: p
        ? { id: p.id, name: p.name, pillars: pillarsOf(p), dayMaster: p.day_master, isDefault: personal.isDefault }
        : null,
      latestChart: latest
        ? { id: latest.id, name: latest.name, pillars: pillarsOf(latest), createdAt: latest.created_at }
        : null,
      recentChats: sessions.map((s) => ({ id: s.id, title: s.title, updatedAt: s.updated_at, messageCount: s.message_count })),
      mbti: mbti ? { id: mbti.id, type: mbti.mbti_type, elementAffinity: mbti.element_affinity, createdAt: mbti.created_at } : null,
    });
  } catch (err) {
    console.error("[dashboard GET] error:", err);
    return serverError();
  }
}
