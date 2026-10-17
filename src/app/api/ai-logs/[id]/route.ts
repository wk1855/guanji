import { NextRequest } from "next/server";
import { deleteAiLog, getAiLog, rateAiLog, type AiLogRatingPatch } from "@/lib/db/ai-logs";
import { ErrorCode, fail, notFound, ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const row = await getAiLog(params.id, auth.user.id);
    if (!row) return notFound("调用记录不存在");
    return ok(row);
  } catch (err) {
    console.error("[ai-logs/:id GET] error:", err);
    return serverError();
  }
}

// PATCH body: { rating?: 1-5|null, quickRating?: 1|-1|null, tags?: string[], note?: string|null }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: AiLogRatingPatch = {};
    if ("rating" in body) {
      if (body.rating === null) patch.rating = null;
      else if (Number.isInteger(body.rating) && (body.rating as number) >= 1 && (body.rating as number) <= 5) patch.rating = body.rating as number;
      else return fail(ErrorCode.VALIDATION_FAILED, "rating 需为 1–5", 400);
    }
    if ("quickRating" in body) {
      if (body.quickRating === null || body.quickRating === 1 || body.quickRating === -1) patch.quick_rating = body.quickRating as number | null;
      else return fail(ErrorCode.VALIDATION_FAILED, "quickRating 需为 1 / -1 / null", 400);
    }
    if ("tags" in body) {
      if (!Array.isArray(body.tags)) return fail(ErrorCode.VALIDATION_FAILED, "tags 需为数组", 400);
      patch.tags = [...new Set(body.tags.map((t) => String(t).trim().slice(0, 20)).filter(Boolean))].slice(0, 12);
    }
    if ("note" in body) patch.note = body.note == null ? null : String(body.note).slice(0, 2000);
    if (!Object.keys(patch).length) return fail(ErrorCode.VALIDATION_FAILED, "没有可更新的字段", 400);
    const row = await rateAiLog(params.id, auth.user.id, patch);
    if (!row) return notFound("调用记录不存在");
    return ok(row);
  } catch (err) {
    console.error("[ai-logs/:id PATCH] error:", err);
    return serverError();
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const deleted = await deleteAiLog(params.id, auth.user.id);
    if (!deleted) return notFound("调用记录不存在或已删除");
    return ok({ id: params.id, deleted: true });
  } catch (err) {
    console.error("[ai-logs/:id DELETE] error:", err);
    return serverError();
  }
}
