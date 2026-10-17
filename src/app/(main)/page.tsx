import type { Metadata } from "next";
import Dashboard from "@/components/home/Dashboard";

export const metadata: Metadata = { title: "今日看板" };

/** 首页：个人看板（今日黄历 + 本人命盘今日运势 + 最近排盘/对话/MBTI + 快捷入口） */
export default function HomePage() {
  return <Dashboard />;
}
