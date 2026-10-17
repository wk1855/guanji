import type { Metadata } from "next";

export const metadata: Metadata = { title: "AI 命理师" };

// 沉浸式全屏对话：不渲染全局导航，页面自带顶栏（返回看板 / 会话列表）
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
