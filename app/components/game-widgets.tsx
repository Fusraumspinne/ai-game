import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "./icons";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function ProductVisual({
  category,
  accent,
  compact = false,
}: {
  category: "computer" | "phone" | "components" | "software";
  accent: string;
  compact?: boolean;
}) {
  const style = { "--device-accent": accent } as CSSProperties;
  const size = compact ? "h-20" : "h-36 sm:h-40";

  return (
    <div
      className={`product-device ${size} rounded-xl`}
      style={style}
      aria-hidden="true"
    >
      {category === "computer" ? (
        <div className="relative z-10 flex -translate-y-1 flex-col items-center">
          <div className="grid h-16 w-20 place-items-center rounded-md border border-white/20 bg-[#17212a] shadow-[0_10px_28px_rgba(0,0,0,.35)] sm:h-20 sm:w-24">
            <div
              className="h-11 w-16 rounded-sm opacity-80 sm:h-14 sm:w-19"
              style={{
                background: `linear-gradient(145deg, ${accent}44, ${accent}12)`,
                boxShadow: `inset 0 0 20px ${accent}22`,
              }}
            >
              <div className="m-2 h-px w-7 bg-white/30" />
              <div className="mx-2 mt-2 h-px w-10 bg-white/15" />
              <div className="mx-2 mt-2 h-px w-5 bg-white/15" />
            </div>
          </div>
          <div className="h-2.5 w-8 bg-[#27333d]" />
          <div className="h-1.5 w-16 rounded-full bg-[#33404a]" />
        </div>
      ) : category === "phone" ? (
        <div className="relative z-10 grid h-24 w-13 place-items-center rounded-[14px] border border-white/25 bg-[#17212a] p-1.5 shadow-[0_14px_30px_rgba(0,0,0,.4)] sm:h-28 sm:w-15">
          <div
            className="h-full w-full rounded-[9px]"
            style={{ background: `linear-gradient(160deg, ${accent}55, #0f1822 65%)` }}
          >
            <div className="mx-auto mt-1 h-0.5 w-3 rounded-full bg-white/25" />
            <div className="mx-2 mt-5 grid grid-cols-2 gap-1">
              <span className="aspect-square rounded bg-white/15" />
              <span className="aspect-square rounded bg-white/10" />
              <span className="aspect-square rounded bg-white/10" />
              <span className="aspect-square rounded bg-white/15" />
            </div>
          </div>
        </div>
      ) : category === "components" ? (
        <div className="relative z-10 rotate-6 rounded-xl border border-white/20 bg-[#162029] p-5 shadow-[0_15px_30px_rgba(0,0,0,.4)]">
          <Icon name="cpu" size={compact ? 40 : 58} style={{ color: accent }} />
          <span className="absolute -top-2 left-5 h-2 w-px bg-white/20" />
          <span className="absolute -bottom-2 left-8 h-2 w-px bg-white/20" />
        </div>
      ) : (
        <div
          className="relative z-10 grid size-20 place-items-center rounded-2xl border border-white/20 bg-[#15202a] shadow-[0_14px_30px_rgba(0,0,0,.4)] sm:size-24"
          style={{ boxShadow: `0 18px 38px ${accent}18` }}
        >
          <Icon name="cloud" size={compact ? 38 : 48} style={{ color: accent }} />
          <span className="absolute right-2 bottom-2 size-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />
        </div>
      )}
    </div>
  );
}

export function AreaChart({
  values,
  height = 144,
  positive = true,
  label = "Wertentwicklung",
}: {
  values: number[];
  height?: number;
  positive?: boolean;
  label?: string;
}) {
  const safe = values.length > 1 ? values : [0, values[0] ?? 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const width = 520;
  const pad = 8;
  const points = safe.map((value, index) => {
    const x = pad + (index / (safe.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (value - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${points.at(-1)?.[0] ?? width},${height} L${points[0][0]},${height} Z`;
  const color = positive ? "#59e1d0" : "#fb7185";
  const gradientId = `area-${positive ? "up" : "down"}-${safe.length}`;

  return (
    <svg
      className="h-auto w-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.24" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((fraction) => (
        <line
          key={fraction}
          x1="0"
          x2={width}
          y1={height * fraction}
          y2={height * fraction}
          stroke="rgba(255,255,255,.055)"
          strokeDasharray="4 7"
        />
      ))}
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={points.at(-1)?.[0]}
        cy={points.at(-1)?.[1]}
        r="3.5"
        fill="#0b1118"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function DonutGauge({
  value,
  label,
  sublabel,
  tone = "#59e1d0",
  size = 94,
}: {
  value: number;
  label: ReactNode;
  sublabel?: ReactNode;
  tone?: string;
  size?: number;
}) {
  const safeValue = clamp(value);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safeValue / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <strong className="font-mono text-lg leading-none text-slate-50 tabular-nums">{label}</strong>
        {sublabel ? <span className="mt-1 text-[0.6rem] text-slate-500">{sublabel}</span> : null}
      </div>
    </div>
  );
}

export function StatRow({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: IconName;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.055] py-2.5 last:border-0">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.045] text-slate-400">
            <Icon name={icon} size={14} />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-300">{label}</p>
          {detail ? <p className="mt-0.5 truncate text-[0.65rem] text-slate-500">{detail}</p> : null}
        </div>
      </div>
      <span
        className={`shrink-0 font-mono text-xs font-medium tabular-nums ${
          tone === "positive"
            ? "text-emerald-300"
            : tone === "negative"
              ? "text-rose-300"
              : "text-slate-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
