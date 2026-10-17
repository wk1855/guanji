"use client";

const WU_XING_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  木: { bg: "bg-green-900/40", text: "text-green-300", bar: "bg-green-500" },
  火: { bg: "bg-red-900/40", text: "text-red-300", bar: "bg-red-500" },
  土: { bg: "bg-yellow-900/40", text: "text-yellow-300", bar: "bg-yellow-500" },
  金: { bg: "bg-gray-800", text: "text-gray-300", bar: "bg-gray-400" },
  水: { bg: "bg-blue-900/40", text: "text-blue-300", bar: "bg-blue-500" },
};

export function WuXingBar({ balance }: { balance: Record<string, number> }) {
  const total = Object.values(balance).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-2.5">
      {Object.entries(balance).map(([key, val]) => {
        const pct = Math.round((val / total) * 100);
        const c = WU_XING_COLORS[key];
        return (
          <div key={key} className="flex items-center gap-3">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${c.bg} ${c.text}`}
            >
              {key}
            </span>
            <div className="flex-1 bg-[var(--border)] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-[var(--muted-foreground)] w-8 text-right">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ReadingSection({ readings }: { readings: string[] }) {
  const labels = ["整体格局", "性格特点", "近期运势"];
  const icons = ["☯", "✦", "◈"];
  return (
    <div className="space-y-4">
      {readings.map((text, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[var(--primary)] text-base">{icons[i]}</span>
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {labels[i]}
            </span>
          </div>
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">
            {text.replace(/^[^：]+：/, "")}
          </p>
        </div>
      ))}
    </div>
  );
}

export function WuXingSummary({ balance }: { balance: Record<string, number> }) {
  const sorted = Object.entries(balance).sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const total = Object.values(balance).reduce((a, b) => a + b, 0);
  const strongPct = Math.round((strongest[1] / total) * 100);
  const weakPct = Math.round((weakest[1] / total) * 100);

  const colorMap: Record<string, string> = {
    木: "text-green-600", 火: "text-red-600", 土: "text-yellow-600",
    金: "text-gray-500", 水: "text-blue-600",
  };

  return (
    <p className="text-xs text-[var(--muted-foreground)] mt-4 leading-5">
      命主五行以{" "}
      <span className={`${colorMap[strongest[0]]} font-medium`}>{strongest[0]}（{strongPct}%）</span>{" "}
      最旺，
      <span className={`${colorMap[weakest[0]]} font-medium`}>{weakest[0]}（{weakPct}%）</span>{" "}
      最弱。
    </p>
  );
}

