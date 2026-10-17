import { redirect } from "next/navigation";

// 单账号个人站：没有会员/付费体系，旧的会员中心入口统一跳转到个人档案
export default function MembershipPage() {
  redirect("/profile");
}
