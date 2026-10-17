import { getUserMbtiResults } from "@/lib/db/mbti";
import { ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    return ok(await getUserMbtiResults(auth.user.id, 50));
  } catch (err) {
    console.error("[mbti/history GET] error:", err);
    return serverError();
  }
}
