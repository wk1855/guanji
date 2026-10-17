import type { Metadata } from "next";
import { Crown } from "lucide-react";

export const metadata: Metadata = {
  title: "会员中心",
  description: "本应用为站长个人使用，无需订阅。",
};

/*
const PLANS = [
  {
    tier: "basic" as const,
    name: "基础版",
    price: 19,
    originalPrice: 39,
    features: [
      "每日 20 次 AI 对话",
      "无限次八字排盘",
      "每日专属运势报告",
      "命盘历史保存（20 个）",
    ],
    highlighted: false,
    buttonLabel: "选择基础版",
  },
  {
    tier: "pro" as const,
    name: "专业版",
    price: 49,
    originalPrice: 99,
    features: [
      "无限次 AI 对话",
      "无限次八字排盘",
      "深度运势分析报告",
      "命盘历史无限保存",
      "优先客服支持",
      "专属会员徽章",
    ],
    highlighted: true,
    buttonLabel: "选择专业版",
  },
];
*/

export default function MembershipPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-m)] mb-4" style={{ background: "rgba(201,168,76,0.15)" }}>
          <Crown size={24} style={{ color: "var(--gold)" }} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">个人使用</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          本应用为站长单账号部署，登录后即可使用全部功能，无需订阅会员。
        </p>
      </div>
    </div>
  );
}
