// ==========================================
//  观己 — 全局常量
// ==========================================

export const SITE_NAME = "观己";
export const SITE_TAGLINE = "观己知命，顺势而为";
export const SITE_DESCRIPTION =
  "基于东方命理哲学的人生决策参考平台";

/** 合规免责声明 — 必须全站展示 */
export const COMPLIANCE_TEXT =
  "本产品内容仅供娱乐参考，不构成任何决策建议，不宣扬封建迷信";

// 导航菜单（与 components/layout/Navbar.tsx 保持一致）
export const NAV_LINKS = [
  { href: "/fortune", label: "今日", icon: "Star" },
  { href: "/bazi", label: "排盘", icon: "BookOpen" },
  { href: "/ai-chat", label: "对话", icon: "MessageCircle" },
  { href: "/zodiac", label: "星座", icon: "Compass" },
  { href: "/mbti", label: "MBTI", icon: "Brain" },
  { href: "/profile", label: "档案", icon: "User" },
] as const;

// 12星座
export const ZODIAC_SIGNS = [
  "aries", "taurus", "gemini", "cancer",
  "leo", "virgo", "libra", "scorpio",
  "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

export const ZODIAC_CN: Record<string, string> = {
  aries: "白羊座", taurus: "金牛座", gemini: "双子座",
  cancer: "巨蟹座", leo: "狮子座", virgo: "处女座",
  libra: "天秤座", scorpio: "天蝎座", sagittarius: "射手座",
  capricorn: "摩羯座", aquarius: "水瓶座", pisces: "双鱼座",
};

// MBTI 16种人格
export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

// MBTI 人格中文名
export const MBTI_NAMES: Record<string, string> = {
  INTJ: "建筑师", INTP: "逻辑学家", ENTJ: "指挥官", ENTP: "辩论家",
  INFJ: "提倡者", INFP: "调停者", ENFJ: "主人公", ENFP: "竞选者",
  ISTJ: "物流师", ISFJ: "守卫者", ESTJ: "总经理", ESFJ: "执政官",
  ISTP: "鉴赏家", ISFP: "探险家", ESTP: "企业家", ESFP: "表演者",
};

// MBTI 与五行的映射关系
export const MBTI_FIVE_ELEMENT: Record<string, string> = {
  INTJ: "水", INTP: "水", ENTJ: "金", ENTP: "木",
  INFJ: "水", INFP: "木", ENFJ: "火", ENFP: "火",
  ISTJ: "土", ISFJ: "土", ESTJ: "金", ESFJ: "土",
  ISTP: "金", ISFP: "木", ESTP: "火", ESFP: "火",
};

// 会员等级
export const MEMBERSHIP_TIERS = {
  FREE: "free",
  BASIC: "basic",
  PRO: "pro",
} as const;

export type MembershipTier = (typeof MEMBERSHIP_TIERS)[keyof typeof MEMBERSHIP_TIERS];

// AI 对话配置
export const AI_CHAT_CONFIG = {
  FREE_DAILY_LIMIT: 3,      // 免费用户每日对话次数
  BASIC_DAILY_LIMIT: 20,
  PRO_DAILY_LIMIT: -1,      // -1 = 无限制
  MAX_MESSAGE_LENGTH: 500,
} as const;

// 八字天干地支
export const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export const FIVE_ELEMENTS = ["木", "火", "土", "金", "水"] as const;
export const ZODIAC_ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"] as const;

// 运势方向
export const FORTUNE_DIRECTIONS = {
  CAREER: "事业运",
  WEALTH: "财运",
  LOVE: "感情运",
  HEALTH: "健康运",
  STUDY: "学业运",
} as const;

// 违规词汇黑名单（前端展示层过滤）
export const FORBIDDEN_WORDS = ["算命", "改命", "必中", "化解", "消灾", "保佑"] as const;

// API 路径前缀
export const API_PREFIX = "/api/v1";
