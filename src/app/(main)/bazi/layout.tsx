import type { Metadata } from "next";

export const metadata: Metadata = { title: "八字排盘" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
