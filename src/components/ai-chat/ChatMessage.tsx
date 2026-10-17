"use client";

import { useEffect, useState } from "react";

// 时间只在浏览器端渲染（服务端与浏览器时区不同，直接渲染会导致 hydration 不一致）
function TimeLabel({ date }: { date?: Date }) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (date) setText(date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }));
  }, [date]);
  return text ? <>{text}</> : null;
}

// 旧回复正文末尾可能带有免责声明；界面已统一展示一次，这里去掉重复的那句
const TRAILING_DISCLAIMER = /\n*\s*(?:以上内容)?仅供娱乐参考[，,]?\s*不构成任何决策建议[。.]?\s*$/;
export function stripDisclaimer(text: string) {
  return text.replace(TRAILING_DISCLAIMER, "").trimEnd();
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

// ─── 打字光标 ────────────────────────────────────────────────
function Cursor() {
  return (
    <span className="inline-block w-0.5 h-4 bg-[var(--primary)] ml-0.5 animate-pulse align-middle" />
  );
}

// ─── AI 消息气泡 ─────────────────────────────────────────────
function AssistantBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      {/* AI 头像 */}
      <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-indigo-500 flex items-center justify-center text-white text-base shadow-md shadow-purple-200/50 dark:shadow-purple-900/30">
        ☯
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-xs text-[var(--muted-foreground)] ml-1">
          AI 命理师
        </span>

        {/* 气泡 */}
        <div className="relative rounded-2xl rounded-tl-sm border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
          <p className="text-sm leading-7 text-[var(--foreground)] whitespace-pre-wrap break-words">
            {isStreaming ? message.content : stripDisclaimer(message.content)}
            {isStreaming && <Cursor />}
          </p>

        </div>

        {/* 免责声明 */}
        {!isStreaming && message.id !== "welcome" && (
          <p className="text-[11px] text-[var(--muted-foreground)] ml-1">
            仅供娱乐参考，不构成决策建议 <TimeLabel date={message.timestamp} />
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 用户消息气泡 ────────────────────────────────────────────
function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex items-end gap-3 max-w-[80%] ml-auto flex-row-reverse">
      {/* 用户头像 */}
      <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)] text-sm font-bold">
        我
      </div>

      <div className="flex flex-col items-end gap-1 min-w-0">
        {/* 气泡 */}
        <div className="rounded-2xl rounded-br-sm bg-[var(--primary)] px-4 py-3 shadow-sm shadow-purple-200/50">
          <p className="text-sm leading-7 text-white whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        <p className="text-[10px] text-[var(--muted-foreground)] mr-1">
          <TimeLabel date={message.timestamp} />
        </p>
      </div>
    </div>
  );
}

// ─── AI 加载动画 ─────────────────────────────────────────────
export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-indigo-500 flex items-center justify-center text-white text-base shadow-md shadow-purple-200/50">
        ☯
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--muted-foreground)] ml-1">
          AI 命理师
        </span>
        <div className="rounded-2xl rounded-tl-sm border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-[var(--primary)]/60 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 主导出 ──────────────────────────────────────────────────
export default function ChatMessageItem({
  message,
  isStreaming,
}: ChatMessageProps) {
  if (message.role === "user") {
    return <UserBubble message={message} />;
  }
  return <AssistantBubble message={message} isStreaming={isStreaming} />;
}
