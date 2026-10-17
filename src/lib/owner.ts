import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase";

export interface OwnerUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  tier: "pro";
}

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    const dummy = Buffer.alloc(left.length);
    timingSafeEqual(left, dummy);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function getOwnerUsername(): string | undefined {
  const name = process.env.OWNER_USERNAME?.trim();
  return name || undefined;
}

export async function verifyOwnerPassword(password: string): Promise<boolean> {
  const hash = process.env.OWNER_PASSWORD_HASH?.trim();
  const plain = process.env.OWNER_PASSWORD;
  if (hash) {
    return bcrypt.compare(password, hash);
  }
  if (typeof plain === "string" && plain.length > 0) {
    return safeEqualString(password, plain);
  }
  return false;
}

export async function upsertOwnerUser(username: string, password: string): Promise<OwnerUser> {
  const supabase = createServiceRoleClient();
  const providerId = `owner:${username}`;
  const email = (process.env.OWNER_EMAIL?.trim() || `${username}@guanji.local`).toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  const { data: matches, error: lookupError } = await supabase
    .from("users")
    .select("id, email, name, avatar_url")
    .or(`provider_id.eq.${providerId},name.eq.${username},email.eq.${email}`)
    .limit(1);

  if (lookupError) {
    console.error("[owner] lookup error:", lookupError.message);
    throw new Error("无法查询站长账号");
  }
  const existing = matches?.[0];

  if (existing) {
    const { data: updated, error } = await supabase
      .from("users")
      .update({
        name: username,
        email,
        provider: "credentials",
        provider_id: providerId,
        password_hash: passwordHash,
        tier: "pro",
        ai_chat_remaining: 9999,
        ai_chat_total: -1,
        last_login_at: now,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id, email, name, avatar_url")
      .single();

    if (error || !updated) {
      console.error("[owner] update error:", error?.message);
      throw new Error("无法更新站长账号");
    }

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatar_url: updated.avatar_url,
      tier: "pro",
    };
  }

  const { data: created, error } = await supabase
    .from("users")
    .insert({
      provider_id: providerId,
      provider: "credentials",
      email,
      name: username,
      password_hash: passwordHash,
      tier: "pro",
      ai_chat_remaining: 9999,
      ai_chat_total: -1,
      last_login_at: now,
    })
    .select("id, email, name, avatar_url")
    .single();

  if (error || !created) {
    console.error("[owner] insert error:", error?.message);
    throw new Error("无法创建站长账号");
  }

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    avatar_url: created.avatar_url,
    tier: "pro",
  };
}

export async function authenticateOwner(
  username: string,
  password: string
): Promise<OwnerUser | null> {
  const ownerUsername = getOwnerUsername();
  if (!ownerUsername || username !== ownerUsername) return null;
  const valid = await verifyOwnerPassword(password);
  if (!valid) return null;
  return upsertOwnerUser(ownerUsername, password);
}
