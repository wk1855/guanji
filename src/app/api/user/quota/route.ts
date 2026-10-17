import { ok, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    return ok({
      remaining: -1,
      total: -1,
      tier: "pro",
      unlimited: true,
    });
  } catch (err) {
    console.error("[user/quota GET] error:", err);
    return serverError();
  }
}
