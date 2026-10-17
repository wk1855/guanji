import { getUserById } from "@/lib/db/users";
import { ok, unauthorized, serverError } from "@/lib/utils/response";
import { requireUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const user = await getUserById(auth.user.id);
    if (!user) return unauthorized("用户不存在");

    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      tier: "pro",
      unlimited: true,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error("[user/profile GET] error:", err);
    return serverError();
  }
}
