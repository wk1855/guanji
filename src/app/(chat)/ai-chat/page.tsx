"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, MessageSquare, X, Menu, Trash2, Loader2 } from "lucide-react";
import ChatMessageItem, {
  TypingIndicator,
  type ChatMessage,
} from "@/components/ai-chat/ChatMessage";
import ChatInput from "@/components/ai-chat/ChatInput";

// ─── 类型 ────────────────────────────────────────────────────
interface SessionSummary {
  id: string;
  title: string;
  message_count: number;
  updated_at: string;
  last_message: { role: string; content: string; created_at: string } | null;
}

// ─── 初始欢迎消息（仅前端展示，不入库、不进上下文）────────────────
function welcomeMessage(): ChatMessage {
  return {
    id: `welcome-${Date.now()}`,
    role: "assistant",
    content:
      "问道于此，万象俱明。\n\n我是观己·玄机，您的专属命理顾问。无论是八字格局、流年运势、感情事业，还是人生方向，皆可向我问询。\n\n请问有何指教？",
    timestamp: new Date(),
    reference: "《周易·系辞》：「仁者见之谓之仁，知者见之谓之知。」",
  };
}

function setUrlSession(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("session", id);
  else url.searchParams.delete("session");
  window.history.replaceState(null, "", url.toString());
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
    : d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

// ─── 侧边栏会话列表 ──────────────────────────────────────────
function Sidebar({
  sessions,
  loading,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose,
}: {
  sessions: SessionSummary[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}) {
  return (
    <div className="h-full flex flex-col bg-[var(--card)] border-r border-[var(--border)]">
      <div className="px-4 pt-5 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[var(--primary)] text-lg">☯</span>
            <span className="font-bold text-[var(--foreground)] tracking-wider text-sm">
              观己·玄机
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors lg:hidden"
              aria-label="关闭侧边栏"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={onNew}
          className="w-full h-10 rounded-xl bg-[var(--primary)] text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <Plus size={15} />
          新建对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <p className="text-[10px] text-[var(--muted-foreground)] tracking-wider px-2 mb-2">
          历史会话
        </p>
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 size={16} className="animate-spin text-[var(--muted-foreground)]" />
          </div>
        )}
        {!loading && sessions.length === 0 && (
          <p className="px-2 py-4 text-xs text-[var(--muted-foreground)]">还没有对话记录</p>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group relative rounded-xl transition-all ${
              session.id === activeId
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <button
              onClick={() => onSelect(session.id)}
              className="w-full text-left px-3 py-2.5 pr-9 flex items-start gap-2"
            >
              <MessageSquare size={14} className="flex-shrink-0 mt-0.5 opacity-70" />
              <span className="min-w-0">
                <span className="block text-xs font-medium leading-5 truncate">{session.title}</span>
                <span className="block text-[10px] opacity-60">{formatTime(session.updated_at)}</span>
              </span>
            </button>
            <button
              onClick={() => onDelete(session.id)}
              className="absolute right-2 top-2.5 w-6 h-6 rounded-md flex items-center justify-center opacity-60 lg:opacity-0 group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-400 transition"
              aria-label="删除对话"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] p-4">
        <div className="rounded-xl bg-[var(--muted)] px-3 py-2.5">
          <p className="text-xs text-[var(--muted-foreground)]">站长账号 · 无限对话 · 自动保存</p>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────
export default function AIChatPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/sessions", { cache: "no-store" });
      const payload = await res.json();
      if (payload?.success) setSessions(payload.data);
    } catch {
      // 忽略
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (id: string) => {
    setLoadingMessages(true);
    setActiveId(id);
    setUrlSession(id);
    try {
      const res = await fetch(`/api/chat/sessions/${id}`, { cache: "no-store" });
      const payload = await res.json();
      if (!payload?.success) throw new Error(payload?.error?.message ?? "加载失败");
      const loaded: ChatMessage[] = (payload.data.messages as { id: string; role: string; content: string; created_at: string }[])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.created_at),
        }));
      setMessages(loaded.length ? loaded : [welcomeMessage()]);
    } catch {
      setActiveId(null);
      setUrlSession(null);
      setMessages([welcomeMessage()]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    const id = new URLSearchParams(window.location.search).get("session");
    if (id) loadSession(id);
  }, [refreshSessions, loadSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };
      const aiMsgId = `ai-${Date.now() + 1}`;
      const aiMsg: ChatMessage = { id: aiMsgId, role: "assistant", content: "", timestamp: new Date() };

      const contextMessages = [...messages, userMsg]
        .filter((m) => !m.id.startsWith("welcome") && m.content)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setInputValue("");
      setIsStreaming(true);
      setStreamingMessageId(aiMsgId);

      const appendDelta = (delta: string) =>
        setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, content: m.content + delta } : m)));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeId, messages: contextMessages }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "请求失败" }));
          const msg = typeof err.error === "string" ? err.error : err?.error?.message;
          throw new Error(msg || `HTTP ${res.status}`);
        }

        const newSessionId = res.headers.get("X-Session-Id");
        if (newSessionId && newSessionId !== activeId) {
          setActiveId(newSessionId);
          setUrlSession(newSessionId);
        }
        refreshSessions();

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;

        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") {
              finished = true;
              continue;
            }
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content ?? "";
              if (delta) appendDelta(delta);
            } catch {
              // 忽略
            }
          }
        }
        // 继续读完，让服务端把回复写入数据库后再关闭
        while (finished) {
          const { done } = await reader.read();
          if (done) break;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "未知错误";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: `抱歉，服务暂时出现问题：${message}。请稍后重试。` } : m
          )
        );
      } finally {
        setIsStreaming(false);
        setStreamingMessageId(null);
        refreshSessions();
      }
    },
    [activeId, isStreaming, messages, refreshSessions]
  );

  const handleNewSession = useCallback(() => {
    setActiveId(null);
    setUrlSession(null);
    setMessages([welcomeMessage()]);
    setSidebarOpen(false);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("确定删除这段对话吗？删除后无法恢复。")) return;
      const res = await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        window.alert("删除失败，请稍后重试");
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (id === activeId) handleNewSession();
    },
    [activeId, handleNewSession]
  );

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--background)]">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:relative top-0 left-0 h-full w-60 z-40 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar
          sessions={sessions}
          loading={sessionsLoading}
          activeId={activeId}
          onSelect={(id) => {
            if (!isStreaming) loadSession(id);
            setSidebarOpen(false);
          }}
          onNew={handleNewSession}
          onDelete={handleDelete}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex-shrink-0 h-14 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label="打开会话列表"
            >
              <Menu size={16} />
            </button>
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-indigo-500 flex items-center justify-center text-white text-base shadow-md shadow-purple-200/50">
              ☯
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)] leading-tight">观己·玄机</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-[var(--muted-foreground)]">在线 · 命理 AI</span>
              </div>
            </div>
          </div>
          <span className="text-xs text-[var(--muted-foreground)] hidden sm:block">
            {sessions.find((s) => s.id === activeId)?.title ?? "新对话"}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {loadingMessages ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} isStreaming={msg.id === streamingMessageId} />
            ))
          )}
          {isStreaming && streamingMessageId === null && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0">
          <ChatInput value={inputValue} onChange={setInputValue} onSend={handleSend} disabled={isStreaming || loadingMessages} />
        </div>
      </div>
    </div>
  );
}
