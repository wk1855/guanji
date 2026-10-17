import type { Metadata } from "next";

export const metadata: Metadata = { title: "星座" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
