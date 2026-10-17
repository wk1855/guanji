import { getUserChatSessions } from "@/lib/db/chat";
import { ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const sessions = await getUserChatSessions(auth.user.id, 50);
    return ok(sessions);
  } catch (err) {
    console.error("[chat/sessions GET] error:", err);
    return serverError();
  }
}
