import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/require-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthedUser();
  return NextResponse.json({ session: user ? { user } : null });
}
