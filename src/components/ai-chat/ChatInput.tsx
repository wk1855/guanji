"use client";

import { useRef, useEffect, KeyboardEvent } from "react";
import { Send } from "lucide-react";

// ─── 快捷提问 ────────────────────────────────────────────────
const DEFAULT_PROMPTS = ["今日运势如何", "近期感情状况", "事业发展方向", "财运如何"];

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  prompts?: string[];
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  prompts = DEFAULT_PROMPTS,
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
    <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-3xl">
      {/* 快捷提问（可换行，避免移动端横向滚动） */}
      <div className="flex flex-wrap gap-2 mb-3">
        {prompts.map((label) => (
          <button
            key={label}
            onClick={() => handleQuick(label)}
            disabled={disabled}
            className="inline-flex items-center h-10 px-3.5 rounded-full border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--muted-foreground)] hover:border-[var(--primary)]/50 hover:text-white hover:bg-[var(--primary)]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {label}
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
          placeholder="问点什么…（Enter 发送，Shift+Enter 换行）"
          aria-label="输入问题"
          className="flex-1 self-center bg-transparent resize-none text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none leading-6 max-h-[120px] min-h-[24px]"
        />

        {/* 发送按钮 */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isEmpty || disabled}
          aria-label="发送"
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isEmpty || disabled
              ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
              : "bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 shadow-sm shadow-purple-300/50"
          }`}
        >
          <Send size={16} />
        </button>
      </div>
      </div>
    </div>
  );
}
