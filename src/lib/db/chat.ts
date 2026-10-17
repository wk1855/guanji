import { createServiceRoleClient } from "@/lib/supabase";

// 创建新会话
export async function createChatSession(userId: string, title = "新对话") {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId, title: title.slice(0, 60) || "新对话" })
    .select("id")
    .single();

  if (error) {
    console.error("[DB:chat] createChatSession error:", error.message);
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_message: { role: string; content: string; created_at: string } | null;
}

// 获取用户会话列表（按最近活动排序，附带最后一条消息）
export async function getUserChatSessions(userId: string, limit = 30): Promise<ChatSessionSummary[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, message_count, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[DB:chat] getUserChatSessions error:", error.message);
    return [];
  }

  const sessions = data ?? [];
  const lastMessages = await Promise.all(
    sessions.map(async (s) => {
      const { data: msg } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("session_id", s.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return msg ?? null;
    })
  );

  return sessions.map((s, i) => ({ ...s, last_message: lastMessages[i] })) as ChatSessionSummary[];
}

// 获取会话详情（验证所有权）
export async function getChatSession(sessionId: string, userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

// 获取会话消息（按时间正序）
export async function getChatMessages(sessionId: string, limit = 200) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[DB:chat] getChatMessages error:", error.message);
    return [];
  }
  return data ?? [];
}

// 保存消息到会话，并同步会话的 updated_at 与 message_count
export async function saveChatMessage(params: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
}): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("chat_messages").insert({
    session_id: params.sessionId,
    role: params.role,
    content: params.content,
  });

  if (error) {
    console.error("[DB:chat] saveChatMessage error:", error.message);
    return false;
  }

  // 以实际消息条数为准，避免并发自增出错
  const { count, error: countError } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", params.sessionId);

  if (countError) {
    console.error("[DB:chat] count messages error:", countError.message);
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof count === "number") update.message_count = count;

  const { error: updateError } = await supabase
    .from("chat_sessions")
    .update(update)
    .eq("id", params.sessionId);

  if (updateError) {
    console.error("[DB:chat] update session error:", updateError.message);
  }
  return true;
}

// 删除会话（消息随外键级联删除），返回是否删除成功
export async function deleteChatSession(sessionId: string, userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    console.error("[DB:chat] deleteChatSession error:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
