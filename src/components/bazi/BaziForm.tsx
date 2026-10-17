"use client";

import { useState } from "react";
import { Loader2, Info } from "lucide-react";
import type { BaziInfo } from "@/app/(main)/bazi/page";

// ─── 常量数据 ────────────────────────────────────────────────
// 时辰选择器只是快捷方式：点选后填入该时辰的代表时间（尽量取时辰中段，避开边界）。
// 子时拆成早子 / 晚子，避免把 00:00 经真太阳时回拨到前一天。
const SHICHEN_LIST = [
  { label: "早子时", range: "00:00 – 01:00", hour: 0, minute: 30 },
  { label: "丑时", range: "01:00 – 03:00", hour: 2, minute: 0 },
  { label: "寅时", range: "03:00 – 05:00", hour: 4, minute: 0 },
  { label: "卯时", range: "05:00 – 07:00", hour: 6, minute: 0 },
  { label: "辰时", range: "07:00 – 09:00", hour: 8, minute: 0 },
  { label: "巳时", range: "09:00 – 11:00", hour: 10, minute: 0 },
  { label: "午时", range: "11:00 – 13:00", hour: 12, minute: 0 },
  { label: "未时", range: "13:00 – 15:00", hour: 14, minute: 0 },
  { label: "申时", range: "15:00 – 17:00", hour: 16, minute: 0 },
  { label: "酉时", range: "17:00 – 19:00", hour: 18, minute: 0 },
  { label: "戌时", range: "19:00 – 21:00", hour: 20, minute: 0 },
  { label: "亥时", range: "21:00 – 23:00", hour: 22, minute: 0 },
  { label: "晚子时", range: "23:00 – 24:00", hour: 23, minute: 30 },
];

const pad2 = (n: number) => String(n).padStart(2, "0");

const PROVINCES: Record<string, string[]> = {
  北京市: ["东城区", "西城区", "朝阳区", "丰台区", "石景山区", "海淀区", "门头沟区", "房山区", "通州区", "顺义区", "昌平区", "大兴区", "怀柔区", "平谷区", "密云区", "延庆区"],
  天津市: ["和平区", "河东区", "河西区", "南开区", "河北区", "红桥区", "东丽区", "西青区", "津南区", "北辰区", "武清区", "宝坻区", "滨海新区", "宁河区", "静海区", "蓟州区"],
  上海市: ["黄浦区", "徐汇区", "长宁区", "静安区", "普陀区", "虹口区", "杨浦区", "闵行区", "宝山区", "嘉定区", "浦东新区", "金山区", "松江区", "青浦区", "奉贤区", "崇明区"],
  重庆市: ["渝中区", "大渡口区", "江北区", "沙坪坝区", "九龙坡区", "南岸区", "北碚区", "綦江区", "大足区", "渝北区", "巴南区", "黔江区", "长寿区", "江津区", "合川区", "永川区", "南川区", "璧山区", "铜梁区", "潼南区", "荣昌区", "开州区", "梁平区", "武隆区", "城口县", "丰都县", "垫江县", "忠县", "云阳县", "奉节县", "巫山县", "巫溪县", "石柱土家族自治县", "秀山土家族苗族自治县", "酉阳土家族苗族自治县", "彭水苗族土家族自治县"],
  河北省: ["石家庄市", "唐山市", "秦皇岛市", "邯郸市", "邢台市", "保定市", "张家口市", "承德市", "沧州市", "廊坊市", "衡水市"],
  山西省: ["太原市", "大同市", "阳泉市", "长治市", "晋城市", "朔州市", "晋中市", "运城市", "忻州市", "临汾市", "吕梁市"],
  内蒙古自治区: ["呼和浩特市", "包头市", "乌海市", "赤峰市", "通辽市", "鄂尔多斯市", "呼伦贝尔市", "巴彦淖尔市", "乌兰察布市", "兴安盟", "锡林郭勒盟", "阿拉善盟"],
  辽宁省: ["沈阳市", "大连市", "鞍山市", "抚顺市", "本溪市", "丹东市", "锦州市", "营口市", "阜新市", "辽阳市", "盘锦市", "铁岭市", "朝阳市", "葫芦岛市"],
  吉林省: ["长春市", "吉林市", "四平市", "辽源市", "通化市", "白山市", "松原市", "白城市", "延边朝鲜族自治州"],
  黑龙江省: ["哈尔滨市", "齐齐哈尔市", "鸡西市", "鹤岗市", "双鸭山市", "大庆市", "伊春市", "佳木斯市", "七台河市", "牡丹江市", "黑河市", "绥化市", "大兴安岭地区"],
  江苏省: ["南京市", "无锡市", "徐州市", "常州市", "苏州市", "南通市", "连云港市", "淮安市", "盐城市", "扬州市", "镇江市", "泰州市", "宿迁市"],
  浙江省: ["杭州市", "宁波市", "温州市", "嘉兴市", "湖州市", "绍兴市", "金华市", "衢州市", "舟山市", "台州市", "丽水市"],
  安徽省: ["合肥市", "芜湖市", "蚌埠市", "淮南市", "马鞍山市", "淮北市", "铜陵市", "安庆市", "黄山市", "滁州市", "阜阳市", "宿州市", "六安市", "亳州市", "池州市", "宣城市"],
  福建省: ["福州市", "厦门市", "莆田市", "三明市", "泉州市", "漳州市", "南平市", "龙岩市", "宁德市"],
  江西省: ["南昌市", "景德镇市", "萍乡市", "九江市", "新余市", "鹰潭市", "赣州市", "吉安市", "宜春市", "抚州市", "上饶市"],
  山东省: ["济南市", "青岛市", "淄博市", "枣庄市", "东营市", "烟台市", "潍坊市", "济宁市", "泰安市", "威海市", "日照市", "临沂市", "德州市", "聊城市", "滨州市", "菏泽市"],
  河南省: ["郑州市", "开封市", "洛阳市", "平顶山市", "安阳市", "鹤壁市", "新乡市", "焦作市", "濮阳市", "许昌市", "漯河市", "三门峡市", "南阳市", "商丘市", "信阳市", "周口市", "驻马店市", "济源市"],
  湖北省: ["武汉市", "黄石市", "十堰市", "宜昌市", "襄阳市", "鄂州市", "荆门市", "孝感市", "荆州市", "黄冈市", "咸宁市", "随州市", "恩施土家族苗族自治州", "仙桃市", "潜江市", "天门市", "神农架林区"],
  湖南省: ["长沙市", "株洲市", "湘潭市", "衡阳市", "邵阳市", "岳阳市", "常德市", "张家界市", "益阳市", "郴州市", "永州市", "怀化市", "娄底市", "湘西土家族苗族自治州"],
  广东省: ["广州市", "韶关市", "深圳市", "珠海市", "汕头市", "佛山市", "江门市", "湛江市", "茂名市", "肇庆市", "惠州市", "梅州市", "汕尾市", "河源市", "阳江市", "清远市", "东莞市", "中山市", "潮州市", "揭州市", "云浮市"],
  广西壮族自治区: ["南宁市", "柳州市", "桂林市", "梧州市", "北海市", "防城港市", "钦州市", "贵港市", "玉林市", "百色市", "贺州市", "河池市", "来宾市", "崇左市"],
  海南省: ["海口市", "三亚市", "三沙市", "儋州市", "五指山市", "琼海市", "文昌市", "万宁市", "东方市", "定安县", "屯昌县", "澄迈县", "临高县", "白沙黎族自治县", "昌江黎族自治县", "乐东黎族自治县", "陵水黎族自治县", "保亭黎族苗族自治县", "琼中黎族苗族自治县"],
  四川省: ["成都市", "自贡市", "攀枝花市", "泸州市", "德阳市", "绵阳市", "广元市", "遂宁市", "内江市", "乐山市", "南充市", "眉山市", "宜宾市", "广安市", "达州市", "雅安市", "巴中市", "资阳市", "阿坝藏族羌族自治州", "甘孜藏族自治州", "凉山彝族自治州"],
  贵州省: ["贵阳市", "六盘水市", "遵义市", "安顺市", "毕节市", "铜仁市", "黔西南布依族苗族自治州", "黔东南苗族侗族自治州", "黔南布依族苗族自治州"],
  云南省: ["昆明市", "曲靖市", "玉溪市", "保山市", "昭通市", "丽江市", "普洱市", "临沧市", "楚雄彝族自治州", "红河哈尼族彝族自治州", "文山壮族苗族自治州", "西双版纳傣族自治州", "大理白族自治州", "德宏傣族景颇族自治州", "怒江傈僳族自治州", "迪庆藏族自治州"],
  西藏自治区: ["拉萨市", "日喀则市", "昌都市", "林芝市", "山南市", "那曲市", "阿里地区"],
  陕西省: ["西安市", "铜川市", "宝鸡市", "咸阳市", "渭南市", "延安市", "汉中市", "榆林市", "安康市", "商洛市"],
  甘肃省: ["兰州市", "嘉峪关市", "金昌市", "白银市", "天水市", "武威市", "张掖市", "平凉市", "酒泉市", "庆阳市", "定西市", "陇南市", "临夏回族自治州", "甘南藏族自治州"],
  青海省: ["西宁市", "海东市", "海北藏族自治州", "黄南藏族自治州", "海南藏族自治州", "果洛藏族自治州", "玉树藏族自治州", "海西蒙古族藏族自治州"],
  宁夏回族自治区: ["银川市", "石嘴山市", "吴忠市", "固原市", "中卫市"],
  新疆维吾尔自治区: ["乌鲁木齐市", "克拉玛依市", "吐鲁番市", "哈密市", "昌吉回族自治州", "博尔塔拉蒙古自治州", "巴音郭楞蒙古自治州", "阿克苏地区", "克孜勒苏柯尔克孜自治州", "喀什地区", "和田地区", "伊犁哈萨克自治州", "塔城地区", "阿勒泰地区", "石河子市", "阿拉尔市", "图木舒克市", "五家渠市", "北屯市", "铁门关市", "双河市", "可克达拉市", "昆玉市", "胡杨河市"],
  香港特别行政区: ["香港岛", "九龙", "新界"],
  澳门特别行政区: ["澳门半岛", "氹仔", "路环"],
  台湾省: ["台北市", "新北市", "桃园市", "台中市", "台南市", "高雄市", "基隆市", "新竹市", "嘉义市", "新竹县", "苗栗县", "彰化县", "南投县", "云林县", "嘉义县", "屏东县", "宜兰县", "花莲县", "台东县", "澎湖县", "金门县", "连江县"],
};

// ─── 子组件：标签 ────────────────────────────────────────────
function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

// ─── 子组件：输入框 ──────────────────────────────────────────
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-11 px-4 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all ${props.className ?? ""}`}
    />
  );
}

// ─── 子组件：Select ──────────────────────────────────────────
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full h-11 px-4 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all appearance-none cursor-pointer ${props.className ?? ""}`}
    />
  );
}

// ─── Props ───────────────────────────────────────────────────
interface BaziFormProps {
  onSubmit: (info: BaziInfo) => void;
  isLoading: boolean;
}

// ─── 主组件 ──────────────────────────────────────────────────
export default function BaziForm({ onSubmit, isLoading }: BaziFormProps) {
  const [isLunar, setIsLunar] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "",
    gender: "male" as "male" | "female",
    birthYear: new Date().getFullYear() - 25,
    birthMonth: 6,
    birthDay: 15,
    birthHour: 8,
    birthMinute: 0,
    hourKnown: true,
    isLeapMonth: false,
  });

  const maxDay = isLunar ? 30 : new Date(Date.UTC(form.birthYear || 2000, form.birthMonth, 0)).getUTCDate();

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "请输入姓名";
    if (!selectedProvince) e.province = "请选择省份";
    if (!selectedCity) e.city = "请选择城市";
    if (form.birthDay > maxDay) e.day = `该月只有 ${maxDay} 天`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      isLeapMonth: isLunar && form.isLeapMonth,
      birthPlace: `${selectedProvince}${selectedCity}`,
      isLunar,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6"
    >
      {/* 姓名 */}
      <div>
        <Label required>姓名</Label>
        <Input
          placeholder="请输入您的姓名"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        {errors.name && (
          <p className="text-xs text-red-500 mt-1">{errors.name}</p>
        )}
      </div>

      {/* 性别 */}
      <div>
        <Label required>性别</Label>
        <div className="grid grid-cols-2 gap-3">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => set("gender", g)}
              className={`h-11 rounded-xl border text-sm font-medium transition-all ${
                form.gender === g
                  ? "border-[var(--primary)] bg-[var(--primary)]/8 text-[#a99ffb]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              {g === "male" ? "♂ 男" : "♀ 女"}
            </button>
          ))}
        </div>
      </div>

      {/* 出生日期 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label required>出生日期</Label>
          {/* 公历/农历 Tab */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            {[
              { key: false, label: "公历" },
              { key: true, label: "农历" },
            ].map(({ key, label }) => (
              <button
                key={String(key)}
                type="button"
                onClick={() => setIsLunar(key)}
                aria-pressed={isLunar === key}
                className={`h-10 px-4 text-sm transition-all ${
                  isLunar === key
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="relative">
            <Input
              type="number"
              placeholder="年"
              min={1900}
              max={2100}
              value={form.birthYear}
              onChange={(e) => set("birthYear", Number(e.target.value))}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)] pointer-events-none">
              年
            </span>
          </div>
          <div className="relative">
            <Select
              value={form.birthMonth}
              onChange={(e) => set("birthMonth", Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {isLunar
                    ? ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"][m - 1] + "月"
                    : `${m}月`}
                </option>
              ))}
            </Select>
          </div>
          <div className="relative">
            <Select
              value={form.birthDay}
              onChange={(e) => set("birthDay", Number(e.target.value))}
            >
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}日
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {(isLunar || errors.day) && (
        <div className="-mt-4 flex items-center gap-4">
          {isLunar && (
            <label className="flex min-h-[40px] items-center gap-2 text-sm text-[var(--muted-foreground)] cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.isLeapMonth}
                onChange={(e) => set("isLeapMonth", e.target.checked)}
              />
              闰月（如闰二月）
            </label>
          )}
          {errors.day && <p className="text-xs text-red-500">{errors.day}</p>}
        </div>
      )}

      {/* 出生时间 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label required>出生时间</Label>
          <label className="flex min-h-[40px] items-center gap-2 text-sm text-[var(--muted-foreground)] cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={!form.hourKnown}
              onChange={(e) => set("hourKnown", !e.target.checked)}
            />
            不知道时辰（只排三柱）
          </label>
        </div>
        {form.hourKnown && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Input
                type="time"
                value={`${pad2(form.birthHour)}:${pad2(form.birthMinute)}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(":").map(Number);
                  if (Number.isFinite(h) && Number.isFinite(m)) {
                    setForm((prev) => ({ ...prev, birthHour: h, birthMinute: m }));
                  }
                }}
                className="max-w-40"
              />
              <span className="text-xs text-[var(--muted-foreground)]">
                精确到分钟（按出生证明上的钟表时间填写）
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] mb-2">
              或快速选择时辰（填入该时辰的代表时间；出生在时辰交界附近请填精确时间）：
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {SHICHEN_LIST.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, birthHour: s.hour, birthMinute: s.minute }))}
                  className={`rounded-xl border py-2 px-1 text-center transition-all ${
                    form.birthHour === s.hour && form.birthMinute === s.minute
                      ? "border-[var(--primary)] bg-[var(--primary)]/8 text-[#a99ffb]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40"
                  }`}
                >
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{s.range}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 出生省市 */}
      <div>
        <Label required>出生省市</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setSelectedCity("");
                setErrors((prev) => ({ ...prev, province: "" }));
              }}
            >
              <option value="">请选择省份</option>
              {Object.keys(PROVINCES).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            {errors.province && (
              <p className="text-xs text-red-500 mt-1">{errors.province}</p>
            )}
          </div>
          <div>
            <Select
              value={selectedCity}
              disabled={!selectedProvince}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setErrors((prev) => ({ ...prev, city: "" }));
              }}
            >
              <option value="">请选择城市</option>
              {(PROVINCES[selectedProvince] ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {errors.city && (
              <p className="text-xs text-red-500 mt-1">{errors.city}</p>
            )}
          </div>
        </div>
      </div>

      {/* 真太阳时提示 */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-[var(--primary)]/6 border border-[var(--primary)]/20">
        <Info size={14} className="text-[#a99ffb] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#a99ffb] leading-5">
          系统会按出生地经度与均时差换算<strong>真太阳时</strong>；1986–1991 年夏令时期间出生的会自动扣除 1 小时。
          节气交接精确到分钟。
        </p>
      </div>

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 rounded-2xl bg-[var(--primary)] text-white font-semibold text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            正在排盘中…
          </>
        ) : (
          <>
            <span>☯</span>
            生成我的命盘
          </>
        )}
      </button>
    </form>
  );
}
