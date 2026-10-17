"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, MessageSquare, Settings, X, Menu } from "lucide-react";
import ChatMessageItem, {
  TypingIndicator,
  type ChatMessage,
} from "@/components/ai-chat/ChatMessage";
import ChatInput from "@/components/ai-chat/ChatInput";

// ─── 类型 ────────────────────────────────────────────────────
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

// ─── 初始欢迎消息 ────────────────────────────────────────────
const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "问道于此，万象俱明。\n\n我是观己·玄机，您的专属命理顾问。无论是八字格局、流年运势、感情事业，还是人生方向，皆可向我问询。\n\n请问有何指教？",
  timestamp: new Date(),
  reference: "《周易·系辞》：「仁者见之谓之仁，知者见之谓之知。」",
};

const INITIAL_SESSION: ChatSession = {
  id: "session-1",
  title: "初次问道",
  messages: [WELCOME_MESSAGE],
  createdAt: new Date(),
};

const HISTORY_SESSIONS: ChatSession[] = [
  {
    id: "session-old-1",
    title: "八字五行分析",
    messages: [],
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: "session-old-2",
    title: "2026年运势咨询",
    messages: [],
    createdAt: new Date(Date.now() - 172800000),
  },
  {
    id: "session-old-3",
    title: "感情缘分推算",
    messages: [],
    createdAt: new Date(Date.now() - 259200000),
  },
];

// ─── 解析豆包 SSE 格式 ───────────────────────────────────────
function parseSSEChunk(raw: string): string {
  // 豆包格式：data: {"id":"...","choices":[{"delta":{"content":"..."}}],...}
  // 或结束：data: [DONE]
  const lines = raw.split("\n");
  let result = "";
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (data === "[DONE]") break;
    try {
      const json = JSON.parse(data);
      const delta = json.choices?.[0]?.delta?.content ?? "";
      result += delta;
    } catch {}
  }
  return result;
}

// ─── 侧边栏会话列表 ──────────────────────────────────────────
function Sidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  onClose,
}: {
  sessions: ChatSession[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="h-full flex flex-col bg-[var(--card)] border-r border-[var(--border)]">
      {/* 顶部 */}
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

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <p className="text-[10px] text-[var(--muted-foreground)] tracking-wider px-2 mb-2">
          历史会话
        </p>
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2 group ${
              session.id === activeId
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <MessageSquare size={14} className="flex-shrink-0 mt-0.5 opacity-70" />
            <span className="text-xs font-medium leading-5 line-clamp-2">
              {session.title}
            </span>
          </button>
        ))}
      </div>

      <div className="border-t border-[var(--border)] p-4 space-y-3">
        <div className="rounded-xl bg-[var(--muted)] px-3 py-2.5">
          <p className="text-xs text-[var(--muted-foreground)]">站长账号 · 无限对话</p>
        </div>
        <button className="w-full h-9 rounded-xl border border-[var(--border)] text-xs text-[var(--muted-foreground)] flex items-center justify-center gap-1.5 hover:bg-[var(--muted)] transition-colors">
          <Settings size={13} />
          设置
        </button>
      </div>
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────
export default function AIChatPage() {
  const [allSessions, setAllSessions] = useState<ChatSession[]>([
    INITIAL_SESSION,
    ...HISTORY_SESSIONS,
  ]);
  const [activeSessionId, setActiveSessionId] = useState(INITIAL_SESSION.id);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = allSessions.find((s) => s.id === activeSessionId)!;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isStreaming, scrollToBottom]);

  // 更新当前会话消息
  const updateMessages = useCallback(
    (sessionId: string, updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
      setAllSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, messages: updater(s.messages) } : s
        )
      );
    },
    []
  );

  // 真实流式 handleSend
  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const sessionId = activeSessionId;

      // 1. 添加用户消息
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      const aiMsgId = `ai-${Date.now() + 1}`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      updateMessages(sessionId, (msgs) => [...msgs, userMsg, aiMsg]);
      setInputValue("");
      setIsStreaming(true);
      setStreamingMessageId(aiMsgId);

      // 更新会话标题（取第一条用户消息前12字）
      setAllSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId && s.title === "初次问道"
            ? { ...s, title: text.slice(0, 12) }
            : s
        )
      );

      // 获取当前会话所有消息（含刚加的用户消息）用于上下文
      const contextMessages = [
        ...allSessions.find((s) => s.id === sessionId)!.messages,
        userMsg,
      ].map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: contextMessages }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "请求失败" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // 按行处理
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") {
              reader.cancel();
              break;
            }
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                updateMessages(sessionId, (msgs) =>
                  msgs.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, content: m.content + delta }
                      : m
                  )
                );
              }
            } catch {}
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "未知错误";
        updateMessages(sessionId, (msgs) =>
          msgs.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: `抱歉，服务暂时出现问题：${message}。请稍后重试。`,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        setStreamingMessageId(null);
      }
    },
    [activeSessionId, isStreaming, updateMessages, allSessions]
  );

  const handleNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "新的对话",
      messages: [
        {
          ...WELCOME_MESSAGE,
          id: `welcome-${Date.now()}`,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
    };
    setAllSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setSidebarOpen(false);
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--background)]">
      {/* ── 侧边栏（PC 常驻，移动端 Drawer）── */}
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏主体 */}
      <aside
        className={`fixed lg:relative top-0 left-0 h-full w-60 z-40 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar
          sessions={allSessions}
          activeId={activeSessionId}
          onSelect={(id) => {
            setActiveSessionId(id);
            setSidebarOpen(false);
          }}
          onNew={handleNewSession}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* ── 主聊天区 ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 顶部栏 */}
        <header className="flex-shrink-0 h-14 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <Menu size={16} />
            </button>

            {/* AI 信息 */}
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-indigo-500 flex items-center justify-center text-white text-base shadow-md shadow-purple-200/50">
              ☯
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)] leading-tight">
                观己·玄机
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  在线 · 命理 AI
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted-foreground)] hidden sm:block">
              无限对话
            </span>
          </div>
        </header>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {activeSession.messages.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              isStreaming={msg.id === streamingMessageId}
            />
          ))}

          {/* 流式输出等待期显示 TypingIndicator */}
          {isStreaming && streamingMessageId === null && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div className="flex-shrink-0">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            disabled={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
