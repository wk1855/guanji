import { deleteChatSession, getChatMessages, getChatSession } from "@/lib/db/chat";
import { notFound, ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const session = await getChatSession(params.id, auth.user.id);
    if (!session) return notFound("对话不存在");
    const messages = await getChatMessages(params.id);
    return ok({ session, messages });
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
