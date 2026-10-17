import { deleteChatSession, getChatMessages, getChatSession } from "@/lib/db/chat";
import { getLogsForMessages } from "@/lib/db/ai-logs";
import { notFound, ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const session = await getChatSession(params.id, auth.user.id);
    if (!session) return notFound("对话不存在");
    const messages = (await getChatMessages(params.id)) as { id: string; role: string }[];
    // 附上每条 AI 回复对应的调用日志 id 与 👍/👎，用于在对话中直接评分
    const logs = await getLogsForMessages(
      auth.user.id,
      messages.filter((m) => m.role === "assistant").map((m) => m.id)
    );
    const byMessage = new Map(logs.map((l) => [l.message_id, l]));
    return ok({
      session,
      messages: messages.map((m) => {
        const log = byMessage.get(m.id);
        return log ? { ...m, log_id: log.id, quick_rating: log.quick_rating } : m;
      }),
    });
  } catch (err) {
    console.error("[chat/sessions/:id GET] error:", err);
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const deleted = await deleteChatSession(params.id, auth.user.id);
    if (!deleted) return notFound("对话不存在或已删除");
    return ok({ id: params.id, deleted: true });
  } catch (err) {
    console.error("[chat/sessions/:id DELETE] error:", err);
    return serverError();
  }
}
