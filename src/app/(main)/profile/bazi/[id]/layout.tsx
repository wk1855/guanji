import type { Metadata } from "next";

export const metadata: Metadata = { title: { absolute: "命盘详情 · 观己" } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
