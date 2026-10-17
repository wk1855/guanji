"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { X, Download, Copy, Eye, EyeOff, Check } from "lucide-react";
import type { BaziInfo, BaziResult } from "@/app/(main)/bazi/page";

const WX_COLORS: Record<string, string> = {
  木: "#22c55e", 火: "#ef4444", 土: "#eab308", 金: "#9ca3af", 水: "#3b82f6",
};

function drawPoster(
  canvas: HTMLCanvasElement,
  info: BaziInfo,
  result: BaziResult,
  hideName: boolean,
) {
  const dpr = 2;
  const W = 750, H = 1334;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0d0b1e");
  grad.addColorStop(0.5, "#130f2e");
  grad.addColorStop(1, "#0d0b1e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 60; i++) {
    const x = (i * 137.5) % W;
    const y = (i * 89.3) % H;
    const r = ((i % 5) + 1) * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 4) * 0.1})`;
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(167,139,250,0.8)";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("观己 · 八字命盘", W / 2, 80);

  const displayName = hideName ? "***" : info.name;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px serif";
  ctx.fillText(displayName, W / 2, 160);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "22px sans-serif";
  const genderText = info.gender === "male" ? "男命" : "女命";
  ctx.fillText(
    `${genderText} · ${info.birthYear}年${info.birthMonth}月${info.birthDay}日 · ${info.birthPlace || "未知"}`,
    W / 2, 210,
  );

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "20px sans-serif";
  ctx.fillText(`日主：${result.dayMaster}`, W / 2, 260);

  const pillars = [
    { label: "年柱", p: result.yearPillar },
    { label: "月柱", p: result.monthPillar },
    { label: "日柱", p: result.dayPillar },
    { label: "时柱", p: result.hourPillar ?? { tianGan: "?", diZhi: "?", wuXing: "时辰不详" } },
  ];

  const cardW = 140, cardH = 260, gap = 20;
  const totalW = cardW * 4 + gap * 3;
  const startX = (W - totalW) / 2;
  const startY = 310;

  pillars.forEach(({ label, p }, i) => {
    const x = startX + i * (cardW + gap);
    const isDay = i === 2;
    const color = WX_COLORS[p.wuXing] || "#eab308";
    const r2 = 16;

    ctx.beginPath();
    ctx.moveTo(x + r2, startY);
    ctx.lineTo(x + cardW - r2, startY);
    ctx.quadraticCurveTo(x + cardW, startY, x + cardW, startY + r2);
    ctx.lineTo(x + cardW, startY + cardH - r2);
    ctx.quadraticCurveTo(x + cardW, startY + cardH, x + cardW - r2, startY + cardH);
    ctx.lineTo(x + r2, startY + cardH);
    ctx.quadraticCurveTo(x, startY + cardH, x, startY + cardH - r2);
    ctx.lineTo(x, startY + r2);
    ctx.quadraticCurveTo(x, startY, x + r2, startY);
    ctx.closePath();
    ctx.fillStyle = isDay ? "rgba(87,73,244,0.15)" : "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.strokeStyle = isDay ? "#5749F4" : "rgba(255,255,255,0.12)";
    ctx.lineWidth = isDay ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = isDay ? "#5749F4" : "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(x + r2, startY);
    ctx.lineTo(x + cardW - r2, startY);
    ctx.quadraticCurveTo(x + cardW, startY, x + cardW, startY + r2);
    ctx.lineTo(x + cardW, startY + 40);
    ctx.lineTo(x, startY + 40);
    ctx.lineTo(x, startY + r2);
    ctx.quadraticCurveTo(x, startY, x + r2, startY);
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = isDay ? "#ffffff" : "rgba(255,255,255,0.5)";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(label, x + cardW / 2, startY + 27);

    ctx.fillStyle = color;
    ctx.font = "bold 56px serif";
    ctx.fillText(p.tianGan, x + cardW / 2, startY + 115);

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x + 20, startY + 135, cardW - 40, 1);

    ctx.fillStyle = color;
    ctx.font = "bold 56px serif";
    ctx.fillText(p.diZhi, x + cardW / 2, startY + 215);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "16px sans-serif";
    ctx.fillText(p.wuXing, x + cardW / 2, startY + 248);
  });

  const barY = startY + cardH + 50;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(167,139,250,0.8)";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("五行分布", startX, barY);

  const total = Object.values(result.wuXingBalance).reduce((a, b) => a + b, 0);
  const barStartY = barY + 20;
  const barH = 20, barMaxW = totalW - 80;

  Object.entries(result.wuXingBalance).forEach(([wx, val], i) => {
    const y = barStartY + i * 42;
    const pct = total > 0 ? val / total : 0;
    const color = WX_COLORS[wx] || "#eab308";

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(wx, startX, y + 15);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(startX + 40, y, barMaxW, barH, 10);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(startX + 40, y, Math.max(barMaxW * pct, 10), barH, 10);
    ctx.fill();

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "16px sans-serif";
    ctx.fillText(`${Math.round(pct * 100)}%`, startX + 40 + barMaxW + 35, y + 15);
  });

  const readingY = barStartY + 5 * 42 + 30;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(167,139,250,0.8)";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("基础解读", startX, readingY);

  if (result.basicReading?.[0]) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "18px sans-serif";
    const text = result.basicReading[0].replace(/^[^：]+：/, "");
    const maxW = totalW;
    const lines: string[] = [];
    let line = "";
    for (const ch of text) {
      const testLine = line + ch;
      if (ctx.measureText(testLine).width > maxW) {
        lines.push(line);
        line = ch;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, 6).forEach((l, i) => {
      ctx.fillText(l, startX, readingY + 35 + i * 30);
    });
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(W / 2 - 200, H - 80, 400, 1);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "16px sans-serif";
  ctx.fillText("观己 · 观己知序，安住当下", W / 2, H - 45);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "12px sans-serif";
  ctx.fillText("本内容仅供娱乐参考", W / 2, H - 20);
}

interface Props {
  info: BaziInfo;
  result: BaziResult;
  onClose: () => void;
}

export default function PosterPreviewModal({ info, result, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hideName, setHideName] = useState(false);
  const [copied, setCopied] = useState(false);

  const redraw = useCallback(() => {
    if (canvasRef.current) {
      drawPoster(canvasRef.current, info, result, hideName);
    }
  }, [info, result, hideName]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `观己命盘_${hideName ? "匿名" : info.name}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [info.name, hideName]);

  const handleCopy = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) return;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: some browsers don't support clipboard.write for images
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-[90vw] max-w-md max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-semibold text-[var(--foreground)]">命盘海报预览</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHideName((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              title={hideName ? "显示姓名" : "隐藏姓名"}
            >
              {hideName ? <EyeOff size={14} /> : <Eye size={14} />}
              {hideName ? "已隐藏姓名" : "隐藏姓名"}
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex justify-center">
          <canvas
            ref={canvasRef}
            className="w-full max-w-[320px] h-auto rounded-xl"
            style={{ aspectRatio: "750/1334" }}
          />
        </div>

        <div className="flex gap-3 px-4 py-3 border-t border-[var(--border)]">
          <button
            onClick={handleDownload}
            className="flex-1 h-10 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Download size={15} />
            下载图片
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] flex items-center justify-center gap-2 hover:bg-[var(--muted)] transition-colors active:scale-[0.98]"
          >
            {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
            {copied ? "已复制" : "复制图片"}
          </button>
        </div>
      </div>
    </div>
  );
}
