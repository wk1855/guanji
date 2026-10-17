import Link from "next/link";
import { Shield, BookOpen, Heart } from "lucide-react";

const FOOTER_LINKS = {
  产品功能: [
    { label: "八字排盘", href: "/bazi" },
    { label: "AI命理师", href: "/ai-chat" },
    { label: "每日运势", href: "/fortune" },
    { label: "测试中心", href: "/quiz" },
  ],
  了解我们: [
    { label: "关于观己", href: "/about" },
    { label: "命理典籍", href: "/classics" },
    { label: "帮助中心", href: "/help" },
    { label: "联系我们", href: "/contact" },
  ],
  法律合规: [
    { label: "用户协议", href: "/terms" },
    { label: "隐私政策", href: "/privacy" },
    { label: "免责声明", href: "/disclaimer" },
  ],
};

const VALUE_BADGES = [
  { icon: Shield, label: "合规运营", desc: "娱乐参考，非医疗/法律建议" },
  { icon: BookOpen, label: "典籍溯源", desc: "基于正统命理典籍解读" },
  { icon: Heart, label: "温和共情", desc: "正向引导，禁止恐吓话术" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#07061a]">
      {/* Value Badges */}
      <div className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {VALUE_BADGES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5749F4]/10 border border-[#5749F4]/20">
                  <Icon className="h-4 w-4 text-[#8B7CF6]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">{label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#5749F4] to-[#8B7CF6]">
                <span className="font-serif text-lg font-bold text-white leading-none">观</span>
              </div>
              <span className="font-serif text-lg font-semibold text-white tracking-widest">观己</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed mb-4">
              观己知序，安住当下。
              <br />
              东方命理 × 现代心理学双轨解读。
            </p>
            <p className="text-xs text-white/25">
              © {new Date().getFullYear()} 观己 GUANJI. All rights reserved.
            </p>
          </div>

          {/* Links Columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 hover:text-white/80 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Compliance Bar */}
      <div className="border-t border-white/5 bg-[#050411]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-white/20 leading-relaxed">
            本平台内容仅供娱乐参考，不构成任何医疗、法律、财务或其他专业建议。
            命理解读结果请勿作为重大决策唯一依据。如有心理健康需求，请咨询专业医疗机构。
          </p>
        </div>
      </div>
    </footer>
  );
}
