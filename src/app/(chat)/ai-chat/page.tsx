"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, MessageSquare, X, PanelLeft, Trash2, Loader2, Home, ScrollText } from "lucide-react";
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

// ─── 初始欢迎消息（仅前端展示，不入库、不进上下文；固定内容，避免 hydration 不一致）──
const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "你好，我是观己的 AI 命理师。\n\n我会结合今日黄历和你的本人命盘回答问题：八字格局、流年运势、感情事业都可以问。\n\n想聊点什么？",
};

interface ChartContext {
  id: string;
  name: string;
  pillars: string;
}

function setUrlParams(params: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  }
  window.history.replaceState(null, "", url.toString());
}

function setUrlSession(id: string | null) {
  setUrlParams({ session: id });
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
      <div className="px-4 pt-4 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-[var(--foreground)] text-sm">会话记录</span>
          {onClose && (
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors lg:hidden"
              aria-label="关闭会话列表"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={onNew}
          className="w-full h-11 rounded-xl bg-[var(--primary)] text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <Plus size={15} />
          新建对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
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
                ? "bg-[var(--primary)]/10 text-[#a99ffb]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <button
              onClick={() => onSelect(session.id)}
              className="w-full min-h-[44px] text-left px-3 py-2.5 pr-11 flex items-start gap-2"
            >
              <MessageSquare size={14} className="flex-shrink-0 mt-0.5 opacity-70" />
              <span className="min-w-0">
                <span className="block text-xs font-medium leading-5 truncate">{session.title}</span>
                <span className="block text-[11px] opacity-80">{formatTime(session.updated_at)}</span>
              </span>
            </button>
            <button
              onClick={() => onDelete(session.id)}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center opacity-80 lg:opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500/15 hover:text-red-400 transition"
              aria-label="删除对话"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <p className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted-foreground)]">对话自动保存，可在「档案」中管理</p>
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────
export default function AIChatPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [chart, setChart] = useState<ChartContext | null>(null);
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
      setMessages(loaded.length ? loaded : [WELCOME]);
    } catch {
      setActiveId(null);
      setUrlSession(null);
      setMessages([WELCOME]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    const params = new URLSearchParams(window.location.search);
    const id = params.get("session");
    if (id) loadSession(id);
    const chartId = params.get("chart");
    if (chartId) {
      fetch(`/api/bazi/history/${chartId}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((payload) => {
          if (!payload?.success) {
            setUrlParams({ chart: null });
            return;
          }
          const d = payload.data as Record<string, { tianGan?: string; diZhi?: string } | string | null>;
          const pillars = ["year_pillar", "month_pillar", "day_pillar", "hour_pillar"]
            .map((k) => {
              const p = d[k] as { tianGan?: string; diZhi?: string } | null;
              return p?.tianGan ? `${p.tianGan}${p.diZhi ?? ""}` : "";
            })
            .filter(Boolean)
            .join(" ");
          setChart({ id: chartId, name: String(d.name ?? ""), pillars });
        })
        .catch(() => undefined);
    }
  }, [refreshSessions, loadSession]);

  const clearChart = useCallback(() => {
    setChart(null);
    setUrlParams({ chart: null });
  }, []);

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
        .filter((m) => m.id !== "welcome" && m.content)
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
          body: JSON.stringify({ sessionId: activeId, messages: contextMessages, chartId: chart?.id ?? null }),
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
    [activeId, chart, isStreaming, messages, refreshSessions]
  );

  const handleNewSession = useCallback(() => {
    setActiveId(null);
    setUrlSession(null);
    setMessages([WELCOME]);
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

  const activeTitle = sessions.find((s) => s.id === activeId)?.title ?? "新对话";
  const prompts = chart
    ? [`解读${chart.name}的命盘格局`, `${chart.name}适合什么职业`, `${chart.name}今年运势如何`, "五行缺什么，怎么补"]
    : undefined;

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-[var(--background)]">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:relative top-0 left-0 h-full w-72 lg:w-64 z-40 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="会话列表"
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
        <header className="flex-shrink-0 h-14 border-b border-[var(--border)] bg-[var(--card)] px-2 sm:px-4 flex items-center gap-1 z-10">
          <Link
            href="/"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--muted)] transition-colors"
            aria-label="返回看板"
            title="返回看板"
          >
            <Home size={18} />
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden h-10 px-3 rounded-lg flex items-center gap-1.5 text-sm text-[var(--foreground)] bg-[var(--muted)] hover:opacity-90 transition"
            aria-label="打开会话列表"
          >
            <PanelLeft size={16} />
            会话
            {sessions.length > 0 && <span className="text-xs text-[var(--muted-foreground)]">{sessions.length}</span>}
          </button>
          <div className="min-w-0 flex-1 px-2">
            <p className="text-sm font-semibold text-[var(--foreground)] leading-tight">AI 命理师</p>
            <p className="text-xs text-[var(--muted-foreground)] truncate">{activeTitle}</p>
          </div>
          <button
            onClick={handleNewSession}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--muted)] transition-colors"
            aria-label="新建对话"
            title="新建对话"
          >
            <Plus size={18} />
          </button>
        </header>

        {chart && (
          <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--primary)]/10 px-4 py-2 flex items-center gap-2 text-xs text-[var(--foreground)]">
            <ScrollText size={14} className="text-[#a99ffb] shrink-0" />
            <span className="min-w-0 truncate">
              已带入命盘：<b>{chart.name}</b>
              {chart.pillars && <span className="ml-1 text-[var(--muted-foreground)]">{chart.pillars}</span>}
            </span>
            <button
              onClick={clearChart}
              className="ml-auto h-10 px-2 rounded-lg text-[var(--muted-foreground)] hover:text-white"
              aria-label="不再带入此命盘"
            >
              改用本人命盘
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
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
        </div>

        <div className="flex-shrink-0">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            disabled={isStreaming || loadingMessages}
            prompts={prompts}
          />
        </div>
      </div>
    </div>
  );
}
