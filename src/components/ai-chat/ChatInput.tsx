"use client";

import { useRef, useEffect, KeyboardEvent } from "react";
import { Send, Mic } from "lucide-react";

// ─── 快捷提问 ────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: "今日运势如何", icon: "☀️" },
  { label: "近期感情状况", icon: "❤️" },
  { label: "事业发展方向", icon: "💼" },
  { label: "财运如何", icon: "💰" },
];

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  remainingCount?: number;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuick = (prompt: string) => {
    if (disabled) return;
    onSend(prompt);
  };

  const isEmpty = !value.trim();

  return (
    <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 pt-3 pb-safe-or-4">
      {/* 快捷提问 */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.label}
            onClick={() => handleQuick(q.label)}
            disabled={disabled}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--muted-foreground)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{q.icon}</span>
            {q.label}
          </button>
        ))}
      </div>

      {/* 输入区主体 */}
      <div
        className={`flex items-end gap-2 rounded-2xl border bg-[var(--background)] px-3 py-2 transition-all ${
          disabled
            ? "border-[var(--border)] opacity-60"
            : "border-[var(--border)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20"
        }`}
      >
        {/* 文本域 */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="向玄机问命…（Enter 发送，Shift+Enter 换行）"
          className="flex-1 bg-transparent resize-none text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none leading-6 max-h-[120px] min-h-[24px]"
        />

        {/* 语音按钮 */}
        <button
          type="button"
          disabled={disabled}
          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40"
        >
          <Mic size={16} />
        </button>

        {/* 发送按钮 */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isEmpty || disabled}
          className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
            isEmpty || disabled
              ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
              : "bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 shadow-sm shadow-purple-300/50"
          }`}
        >
          <Send size={14} />
        </button>
      </div>

      {/* 底部提示 */}
      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-[10px] text-[var(--muted-foreground)]/50">
          AI 可能出错，内容仅供参考
        </p>
        <p className="text-[10px] text-[var(--muted-foreground)]/50">
          个人站 · 无次数限制
        </p>
      </div>
    </div>
  );
}
