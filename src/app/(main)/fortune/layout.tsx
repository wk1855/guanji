import type { Metadata } from "next";

export const metadata: Metadata = { title: "今日运势" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
