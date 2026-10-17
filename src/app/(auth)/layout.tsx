import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登录",
  description: "观己 · 个人自用",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
