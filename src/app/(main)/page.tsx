import Link from "next/link";
import {
  Sparkles,
  MessageCircle,
  TrendingUp,
  Star,
  ChevronRight,
  Zap,
  Shield,
  BookOpen,
  Heart,
  Clock,
  Users,
  Briefcase,
  DollarSign,
  Activity,
  ArrowRight,
} from "lucide-react";
import StarField from "@/components/layout/StarField";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface FortuneCard {
  icon: React.ElementType;
  label: string;
  stars: number;
  tip: string;
}

interface FeatureCard {
  icon: React.ElementType;
  title: string;
  desc: string;
  ctaLabel: string;
  ctaHref: string;
  badge?: string;
  gradient: string;
}

interface QuizCard {
  icon: string;
  title: string;
  desc: string;
  duration: string;
  href: string;
}

interface ValueProp {
  icon: React.ElementType;
  title: string;
  desc: string;
}

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────
const TODAY_FORTUNE: FortuneCard[] = [
  { icon: Briefcase, label: "事业", stars: 4, tip: "贵人相助，适合推进重要提案" },
  { icon: Heart,     label: "感情", stars: 3, tip: "坦诚沟通，关系将更进一步" },
  { icon: DollarSign,label: "财富", stars: 5, tip: "正财旺盛，投资决策可稳步推进" },
  { icon: Activity,  label: "健康", stars: 3, tip: "注意休息，保持规律作息" },
];

const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: Star,
    title: "八字排盘",
    desc: "严格遵循正统典籍，一键生成专属命盘，洞见天赋与人生节律",
    ctaLabel: "立即排盘",
    ctaHref: "/bazi",
    gradient: "from-[#5749F4] to-[#7C3AED]",
  },
  {
    icon: MessageCircle,
    title: "AI命理师",
    desc: "双轨大模型深度解读，命理分析与情绪疏导并行，温和陪伴每一步",
    ctaLabel: "开始对话",
    ctaHref: "/ai-chat",
    gradient: "from-[#7C3AED] to-[#C084FC]",
  },
  {
    icon: TrendingUp,
    title: "流年运势",
    desc: "今日、本周、本月运势，结合你的八字命盘、大运与流年干支深度解读",
    ctaLabel: "立即查看",
    ctaHref: "/fortune",
    gradient: "from-[#4F46E5] to-[#818CF8]",
  },
];

const QUIZ_CARDS: QuizCard[] = [
  {
    icon: "🌸",
    title: "缘分契合度",
    desc: "探索彼此的命理契合度与相处模式",
    duration: "30秒测完",
    href: "/quiz/compatibility",
  },
  {
    icon: "💼",
    title: "职场天赋",
    desc: "发现你的天赋优势与事业方向",
    duration: "45秒测完",
    href: "/quiz/career",
  },
  {
    icon: "✨",
    title: "性格密码",
    desc: "从命理视角解读你的性格特质",
    duration: "30秒测完",
    href: "/quiz/personality",
  },
  {
    icon: "🌙",
    title: "财富潜力",
    desc: "解读你的财富流向与机遇时机",
    duration: "40秒测完",
    href: "/quiz/wealth",
  },
];

const VALUE_PROPS: ValueProp[] = [
  {
    icon: Shield,
    title: "合规安全",
    desc: "内容仅供娱乐参考，明确声明非医疗/法律/财务建议，依法合规运营，保护用户数据安全。",
  },
  {
    icon: BookOpen,
    title: "专业易懂",
    desc: "严格溯源正统命理典籍，结合现代心理科学框架，将晦涩术语转化为可落地的生活洞见。",
  },
  {
    icon: Heart,
    title: "温和共情",
    desc: "秉持正向引导理念，禁止恐吓话术，每一条解读都着眼于帮助你看见可能性与成长空间。",
  },
];

// 每颗星的闪烁参数：位置、尺寸、闪烁周期（duration 错落产生自然随机感）
const STAR_DOTS = [
  { top: "12%", left:  "8%", size: 2,   duration: "3.2s", delay: "0s"   },
  { top: "25%", left: "18%", size: 1.5, duration: "2.4s", delay: "0.8s" },
  { top:  "8%", left: "35%", size: 2.5, duration: "4.0s", delay: "1.6s" },
  { top: "18%", left: "55%", size: 1.5, duration: "2.8s", delay: "0.4s" },
  { top: "10%", left: "72%", size: 2,   duration: "3.6s", delay: "2.0s" },
  { top: "30%", left: "85%", size: 1.5, duration: "2.2s", delay: "1.2s" },
  { top: "45%", left: "92%", size: 2,   duration: "3.8s", delay: "0.6s" },
  { top: "60%", left:  "5%", size: 1.5, duration: "2.6s", delay: "1.8s" },
  { top: "70%", left: "22%", size: 2,   duration: "4.0s", delay: "0.2s" },
  { top: "80%", left: "65%", size: 1.5, duration: "3.0s", delay: "1.4s" },
  { top: "55%", left: "48%", size: 3,   duration: "2.0s", delay: "2.2s" },
] as const;

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Star rating renderer */
function StarRating({ count, total = 5 }: { count: number; total?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < count
              ? "fill-amber-400 text-amber-400"
              : "fill-white/10 text-white/10"
          }`}
        />
      ))}
    </div>
  );
}

/** Decorative background for hero */
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d0b1e] via-[#130f2e] to-[#0d0b1e]" />

      {/* Radial glow — center（animate-pulse-glow：缓慢呼吸，scale 0.95~1.05） */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(87,73,244,0.25),transparent)] animate-pulse-glow"
      />

      {/* Top-left accent */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#5749F4]/10 blur-3xl" />
      {/* Bottom-right accent */}
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#7C3AED]/10 blur-3xl" />

      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Scattered star dots（animate-twinkle：各星独立闪烁周期） */}
      {STAR_DOTS.map((s, i) => (
        <div
          key={i}
          className="star-dot absolute rounded-full bg-white animate-twinkle"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            boxShadow: `0 0 ${s.size * 3}px rgba(255,255,255,0.6)`,
            ["--twinkle-duration" as string]: s.duration,
            animationDelay: s.delay,
          }}
        />
      ))}

      {/* 轮盘外发光环：脉冲光晕，不旋转，只做 pulseGlow，营造"能量环"效果 */}
      <div
        className="absolute right-[8%] top-[15%] w-80 h-80 rounded-full animate-pulse-glow pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(87,73,244,0.15) 0%, rgba(87,73,244,0.05) 50%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      {/* Bagua ring — animate-rotate-slow（30s 顺时针一圈，opacity 提升到 0.18，加发光 filter） */}
      <div
        className="bagua-ring absolute right-[8%] top-[15%] opacity-[0.18] animate-rotate-slow"
        style={{ filter: 'drop-shadow(0 0 12px rgba(139,124,246,0.8)) drop-shadow(0 0 30px rgba(87,73,244,0.4))' }}
      >
        <svg width="320" height="320" viewBox="0 0 320 320" fill="none">
          <circle cx="160" cy="160" r="155" stroke="white" strokeWidth="1" strokeDasharray="6 4" />
          <circle cx="160" cy="160" r="110" stroke="white" strokeWidth="0.5" />
          <circle cx="160" cy="160" r="65"  stroke="white" strokeWidth="0.5" />
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const r1 = 120, r2 = 155;
            const x1 = 160 + r1 * Math.sin(angle), y1 = 160 - r1 * Math.cos(angle);
            const x2 = 160 + r2 * Math.sin(angle), y2 = 160 - r2 * Math.cos(angle);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="1" />;
          })}
          <circle cx="160" cy="160" r="28" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="160" cy="146" r="7" fill="white" fillOpacity="0.5" />
          <circle cx="160" cy="174" r="7" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Left decorative trigram lines */}
      <div className="absolute left-[6%] bottom-[20%] opacity-[0.15] flex flex-col gap-3" style={{ filter: 'drop-shadow(0 0 4px rgba(139,124,246,0.6))' }}>
        {["full", "full", "broken", "full", "broken", "broken"].map((t, i) => (
          <div key={i} className="flex gap-2">
            {t === "full" ? (
              <div className="h-px w-12 bg-white" />
            ) : (
              <>
                <div className="h-px w-5 bg-white" />
                <div className="h-px w-5 bg-white" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function HomePage() {
  return (
    <main className="relative z-10 bg-[#0d0b1e] text-white">
      {/* ══════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-32 overflow-hidden">
        <HeroBackground />
        <StarField />

        <div className="relative z-10 text-center max-w-4xl mx-auto">

          {/* Pill badge — 入场延迟 0s */}
          <div
            className="hero-badge animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-[#5749F4]/30 bg-[#5749F4]/10 px-4 py-1.5 text-sm text-[#A78BFA] mb-8 backdrop-blur-sm"
            style={{ animationDelay: "0s" }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            东方命理 × 现代心理学双轨解读
          </div>

          {/* Main title — 入场延迟 0.15s */}
          <h1
            className="hero-title animate-fade-in-up mb-6 font-serif text-[clamp(3.5rem,10vw,7rem)] font-bold leading-none tracking-wider"
            style={{ animationDelay: "0.15s" }}
          >
            <span
              className="inline-block"
              style={{
                background: "linear-gradient(135deg, #ffffff 30%, #C084FC 65%, #5749F4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "none",
              }}
            >
              观己
            </span>
          </h1>

          {/* Subtitle — 入场延迟 0.3s */}
          <p
            className="hero-subtitle animate-fade-in-up mb-4 text-[clamp(1.1rem,3vw,1.5rem)] font-light tracking-[0.25em] text-white/60"
            style={{ animationDelay: "0.3s" }}
          >
            观己知序，安住当下
          </p>

          {/* Description — 入场延迟 0.45s */}
          <p
            className="hero-desc animate-fade-in-up mx-auto mb-12 max-w-xl text-base leading-relaxed text-white/40"
            style={{ animationDelay: "0.45s" }}
          >
            基于东方命理哲学，结合现代心理科学，为你提供温和共情的人生参考
          </p>

          {/* CTA Buttons — 入场延迟 0.6s */}
          <div
            className="hero-cta animate-fade-in-up flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{ animationDelay: "0.6s" }}
          >
            <Link
              href="/bazi"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#5749F4] to-[#7C3AED] px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-[#5749F4]/30 transition-all duration-300 hover:scale-105 hover:shadow-[#5749F4]/50"
            >
              <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
              立即排盘
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-base text-white/70 backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              了解更多
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Social proof — 入场延迟 0.75s */}
          <div
            className="hero-social-proof animate-fade-in-up mt-14 flex flex-wrap items-center justify-center gap-6 text-sm text-white/30"
            style={{ animationDelay: "0.75s" }}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>已有 <strong className="text-white/60">12万+</strong> 用户在使用</span>
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>用户满意度 <strong className="text-white/60">4.8</strong> 分</span>
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>内容安全合规</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-bounce">
          <div className="h-8 w-px bg-gradient-to-b from-transparent to-white/30" />
        </div>
      </section>

      {/* ══════════════════════════════════════
          TODAY'S FORTUNE PREVIEW
      ══════════════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#13102a] to-[#0d0b1e] p-8 sm:p-10 overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[#5749F4]/10 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="mb-1 text-xs font-medium tracking-widest text-[#8B7CF6] uppercase">
                  今日运势预览
                </div>
                <h2 className="text-xl font-semibold text-white">
                  2026年3月21日 · 丙午年 庚申月 壬寅日
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/20 px-4 py-2 self-start sm:self-auto">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">综合运势 4.2分</span>
              </div>
            </div>

            {/* Fortune Grid — fortune-card 入场动画，各卡片延迟错落 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {TODAY_FORTUNE.map(({ icon: Icon, label, stars, tip }, idx) => (
                <div
                  key={label}
                  className="fortune-card animate-fade-in-up group relative rounded-2xl border border-white/8 bg-white/3 p-5 hover:border-[#5749F4]/30 hover:bg-[#5749F4]/5 transition-all duration-300"
                  style={{ animationDelay: `${0.1 + idx * 0.12}s` }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5749F4]/15">
                      <Icon className="h-4 w-4 text-[#8B7CF6]" />
                    </div>
                    <span className="text-xs text-white/40">{label}</span>
                  </div>
                  <StarRating count={stars} />
                  <p className="mt-3 text-xs leading-relaxed text-white/50">{tip}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex justify-center">
              <Link
                href="/fortune"
                className="group inline-flex items-center gap-2 text-sm font-medium text-[#8B7CF6] hover:text-white transition-colors"
              >
                查看专属运势
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CORE FEATURES
      ══════════════════════════════════════ */}
      <section id="features" className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <div className="mb-14 text-center">
            <div className="mb-3 text-xs font-medium tracking-widest text-[#8B7CF6] uppercase">
              核心功能
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-white">
              你需要的，这里都有
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURE_CARDS.map(({ icon: Icon, title, desc, ctaLabel, ctaHref, badge, gradient }) => (
              <div
                key={title}
                className="group relative flex flex-col rounded-3xl border border-white/10 bg-[#13102a] p-8 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#5749F4]/10 overflow-hidden"
              >
                {/* Top gradient bar — hover 时触发 shimmer 扫光
                    feature-card-bar 由 globals.css 控制，.group:hover 触发动画 */}
                <div className={`feature-card-bar absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${gradient}`} />

                {/* Badge */}
                {badge && (
                  <div className="absolute top-5 right-5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/25 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                      <Zap className="h-3 w-3" />
                      {badge}
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="mb-3 text-xl font-semibold text-white">{title}</h3>
                <p className="mb-8 flex-1 text-sm leading-relaxed text-white/50">{desc}</p>

                {/* CTA */}
                <Link
                  href={ctaHref}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${gradient} px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:opacity-90 hover:scale-[1.02]`}
                >
                  {ctaLabel}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          QUIZ CAROUSEL
      ══════════════════════════════════════ */}
      <section className="py-20 px-4 overflow-hidden">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <div className="mb-2 text-xs font-medium tracking-widest text-[#8B7CF6] uppercase">
                轻量测试
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-white">
                30秒了解你自己
              </h2>
            </div>
            <Link href="/quiz" className="hidden sm:flex items-center gap-1 text-sm text-[#8B7CF6] hover:text-white transition-colors">
              查看全部 <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Scrollable row */}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4">
            {QUIZ_CARDS.map((quiz) => (
              <Link
                key={quiz.title}
                href={quiz.href}
                className="group shrink-0 w-56 sm:w-auto flex flex-col rounded-2xl border border-white/10 bg-[#13102a] p-6 hover:border-[#5749F4]/30 hover:bg-[#5749F4]/5 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="mb-4 text-3xl">{quiz.icon}</div>
                <h3 className="mb-1.5 font-semibold text-white text-base">{quiz.title}</h3>
                <p className="mb-4 text-xs text-white/45 leading-relaxed flex-1">{quiz.desc}</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#8B7CF6]" />
                  <span className="text-xs text-[#8B7CF6] font-medium">{quiz.duration}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          VALUE PROPOSITIONS
      ══════════════════════════════════════ */}
      <section className="py-20 px-4 border-y border-white/5">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <div className="mb-3 text-xs font-medium tracking-widest text-[#8B7CF6] uppercase">
              为什么选择观己
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-white">
              负责任的命理体验
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {VALUE_PROPS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center px-4">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5749F4]/10 border border-[#5749F4]/20">
                  <Icon className="h-6 w-6 text-[#8B7CF6]" />
                </div>
                <h3 className="mb-3 text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/45">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          BOTTOM CTA
      ══════════════════════════════════════ */}
      <section className="relative py-28 px-4 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#5749F4]/15 via-[#0d0b1e] to-[#7C3AED]/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(87,73,244,0.12),transparent)]" />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <h2 className="mb-4 font-serif text-[clamp(1.8rem,5vw,3rem)] font-semibold text-white leading-tight">
            开启你的命理之旅
          </h2>
          <p className="mb-10 text-base text-white/45 leading-relaxed">
            加入12万+用户，用东方智慧点亮生活方向
          </p>
          <Link
            href="/bazi"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#5749F4] to-[#7C3AED] px-10 py-4 text-base font-semibold text-white shadow-2xl shadow-[#5749F4]/30 transition-all duration-300 hover:scale-105 hover:shadow-[#5749F4]/50"
          >
            <Sparkles className="h-4 w-4" />
            开始排盘
          </Link>
          <p className="mt-5 text-xs text-white/25">个人使用 · 内容仅供娱乐参考</p>
        </div>
      </section>
    </main>
  );
}
