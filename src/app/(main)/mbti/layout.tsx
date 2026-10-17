import type { Metadata } from "next";

export const metadata: Metadata = { title: "MBTI" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
