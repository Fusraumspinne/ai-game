import { useId, type ReactNode } from "react";

export interface TrendSeries {
  label: string;
  color: string;
  values: readonly number[];
  formatValue?: (value: number) => ReactNode;
}

export function TrendChart({
  series,
  labels,
  ariaLabel,
  includeZero = false,
}: {
  series: readonly TrendSeries[];
  labels?: readonly string[];
  ariaLabel: string;
  includeZero?: boolean;
}) {
  const gradientId = useId().replaceAll(":", "");
  const allValues = series.flatMap((item) =>
    item.values.filter((value) => Number.isFinite(value)),
  );
  const minimum = Math.min(...allValues, includeZero ? 0 : Number.POSITIVE_INFINITY);
  const maximum = Math.max(...allValues, includeZero ? 0 : Number.NEGATIVE_INFINITY);
  const safeMinimum = Number.isFinite(minimum) ? minimum : 0;
  const safeMaximum = Number.isFinite(maximum) ? maximum : 1;
  const range = safeMaximum - safeMinimum || Math.max(1, Math.abs(safeMaximum));
  const x = (index: number, count: number) =>
    count <= 1 ? 50 : 3 + (index / (count - 1)) * 94;
  const y = (value: number) => 36 - ((value - safeMinimum) / range) * 30;

  return (
    <div>
      <svg
        viewBox="0 0 100 42"
        preserveAspectRatio="none"
        className="h-44 w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series[0]?.color ?? "#2563eb"} stopOpacity="0.18" />
            <stop offset="100%" stopColor={series[0]?.color ?? "#2563eb"} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[6, 16, 26, 36].map((lineY) => (
          <line
            key={lineY}
            x1="3"
            x2="97"
            y1={lineY}
            y2={lineY}
            stroke="#e2e8f0"
            strokeWidth="0.45"
            strokeDasharray="2 2"
          />
        ))}
        {series.map((item, seriesIndex) => {
          const path = item.values
            .map(
              (value, index) =>
                `${index === 0 ? "M" : "L"} ${x(index, item.values.length)} ${y(value)}`,
            )
            .join(" ");
          return (
            <g key={item.label}>
              {seriesIndex === 0 && path ? (
                <path d={`${path} L 97 36 L 3 36 Z`} fill={`url(#${gradientId})`} />
              ) : null}
              <path
                d={path}
                fill="none"
                stroke={item.color}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {item.values.length ? (
                <circle
                  cx={x(item.values.length - 1, item.values.length)}
                  cy={y(item.values.at(-1) ?? 0)}
                  r="1.15"
                  fill="white"
                  stroke={item.color}
                  strokeWidth="0.8"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      {labels?.length ? (
        <div className="-mt-1 flex justify-between font-mono text-[0.58rem] text-slate-500">
          <span>{labels[0]}</span>
          <span>{labels.at(-1)}</span>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
        {series.map((item) => {
          const current = item.values.at(-1) ?? 0;
          return (
            <span key={item.label} className="inline-flex items-center gap-2">
              <i className="inline-block size-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
              <strong className="font-mono font-medium text-slate-900">
                {item.formatValue ? item.formatValue(current) : current.toLocaleString("de-DE", { maximumFractionDigits: 1 })}
              </strong>
            </span>
          );
        })}
      </div>
    </div>
  );
}
