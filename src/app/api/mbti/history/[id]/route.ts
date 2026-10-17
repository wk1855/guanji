import { deleteMbtiResult, getMbtiResultById } from "@/lib/db/mbti";
import { notFound, ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const row = await getMbtiResultById(params.id, auth.user.id);
    if (!row) return notFound("MBTI 记录不存在");
    return ok(row);
  } catch (err) {
    console.error("[mbti/history/:id GET] error:", err);
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const deleted = await deleteMbtiResult(params.id, auth.user.id);
    if (!deleted) return notFound("MBTI 记录不存在或已删除");
    return ok({ id: params.id, deleted: true });
  } catch (err) {
    console.error("[mbti/history/:id DELETE] error:", err);
    return serverError();
  }
}
