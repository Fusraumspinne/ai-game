import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  ReactNode,
  SVGProps,
} from "react";

type ClassValue = string | false | null | undefined;

function cx(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

export interface PanelProps extends ComponentPropsWithoutRef<"section"> {
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "subtle" | "interactive";
}

const panelPadding = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
} satisfies Record<NonNullable<PanelProps["padding"]>, string>;

const panelVariants = {
  default: "border-[#dbe3ee] bg-white",
  subtle: "border-[#dbe3ee] bg-[#f8fafc]",
  interactive:
    "border-[#dbe3ee] bg-white transition-[border-color,background-color,box-shadow] duration-200 hover:border-blue-300 hover:shadow-[0_8px_24px_rgba(31,54,88,0.08)]",
} satisfies Record<NonNullable<PanelProps["variant"]>, string>;

export function Panel({
  padding = "md",
  variant = "default",
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <section
      className={cx(
        "rounded-md border shadow-[0_1px_2px_rgba(31,54,88,0.035)]",
        panelPadding[padding],
        panelVariants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export interface PanelHeaderProps
  extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  headingLevel?: "h2" | "h3" | "h4";
}

export function PanelHeader({
  title,
  description,
  eyebrow,
  action,
  headingLevel = "h3",
  className,
  ...props
}: PanelHeaderProps) {
  const Heading = headingLevel;

  return (
    <div
      className={cx(
        "flex min-w-0 items-start justify-between gap-4",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[0.62rem] font-bold tracking-[0.15em] text-blue-600 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <Heading className="text-sm font-semibold tracking-[-0.015em] text-slate-950 sm:text-[0.95rem]">
          {title}
        </Heading>
        {description ? (
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export interface MetricCardProps extends ComponentPropsWithoutRef<"div"> {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  delta?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "cyan" | "green" | "amber" | "violet";
}

const metricToneClasses = {
  neutral: "border-[#e6ebf2] bg-[#f8fafc] before:bg-slate-300",
  cyan: "border-[#e6ebf2] bg-[#f8fafc] before:bg-blue-500",
  green: "border-emerald-100 bg-emerald-50/40 before:bg-emerald-400",
  amber: "border-amber-100 bg-amber-50/40 before:bg-amber-400",
  violet: "border-indigo-100 bg-indigo-50/35 before:bg-indigo-400",
} satisfies Record<NonNullable<MetricCardProps["tone"]>, string>;

const metricIconToneClasses = {
  neutral: "bg-slate-100 text-slate-600",
  cyan: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-indigo-100 text-indigo-700",
} satisfies Record<NonNullable<MetricCardProps["tone"]>, string>;

export function MetricCard({
  label,
  value,
  detail,
  delta,
  icon,
  tone = "neutral",
  className,
  ...props
}: MetricCardProps) {
  return (
    <div
      className={cx(
        "relative min-w-0 overflow-hidden rounded-md border p-4 shadow-[0_1px_2px_rgba(31,54,88,0.025)] before:absolute before:inset-x-0 before:bottom-0 before:h-[2px] sm:p-5",
        metricToneClasses[tone],
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.68rem] font-medium tracking-[0.06em] text-slate-600 uppercase">
            {label}
          </p>
          <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="truncate font-mono text-xl font-semibold tracking-[-0.04em] text-slate-900 tabular-nums sm:text-2xl">
              {value}
            </p>
            {delta ? <div className="shrink-0">{delta}</div> : null}
          </div>
          {detail ? (
            <p className="mt-1.5 truncate text-xs text-slate-600">{detail}</p>
          ) : null}
        </div>
        {icon ? (
          <div
            className={cx(
            "grid size-8 shrink-0 place-items-center rounded-md border border-current/10",
              metricIconToneClasses[tone],
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface ProgressBarProps extends ComponentPropsWithoutRef<"div"> {
  value: number;
  max?: number;
  label?: ReactNode;
  valueLabel?: ReactNode;
  ariaLabel?: string;
  tone?: "cyan" | "green" | "amber" | "red" | "violet";
  size?: "sm" | "md";
}

const progressToneClasses = {
  cyan: "bg-blue-600",
  green: "bg-emerald-600",
  amber: "bg-amber-500",
  red: "bg-rose-400",
  violet: "bg-violet-300",
} satisfies Record<NonNullable<ProgressBarProps["tone"]>, string>;

export function ProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  ariaLabel,
  tone = "cyan",
  size = "md",
  className,
  ...props
}: ProgressBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(value, 0), safeMax)
    : 0;
  const percentage = (safeValue / safeMax) * 100;

  return (
    <div className={cx("min-w-0", className)} {...props}>
      {label || valueLabel ? (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
          <span className="min-w-0 truncate text-slate-600">{label}</span>
          {valueLabel ? (
            <span className="shrink-0 font-mono text-slate-700 tabular-nums">
              {valueLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={cx(
          "overflow-hidden rounded-full bg-slate-200",
          size === "sm" ? "h-1" : "h-1.5",
        )}
        role="progressbar"
        aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={
          typeof valueLabel === "string" ? valueLabel : undefined
        }
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
            progressToneClasses[tone],
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export interface StatusBadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: "neutral" | "info" | "success" | "warning" | "danger" | "violet";
  dot?: boolean;
}

const statusToneClasses = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  violet: "border-indigo-200 bg-indigo-50 text-indigo-700",
} satisfies Record<NonNullable<StatusBadgeProps["tone"]>, string>;

const statusDotClasses = {
  neutral: "bg-slate-400",
  info: "bg-blue-500",
  success: "bg-emerald-300",
  warning: "bg-amber-300",
  danger: "bg-rose-300",
  violet: "bg-violet-300",
} satisfies Record<NonNullable<StatusBadgeProps["tone"]>, string>;

export function StatusBadge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border px-2 text-[0.68rem] font-semibold tracking-[0.02em] whitespace-nowrap",
        statusToneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span
          className={cx("size-1.5 rounded-full", statusDotClasses[tone])}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}

export interface DeltaBadgeProps extends ComponentPropsWithoutRef<"span"> {
  value: ReactNode;
  direction?: "up" | "down" | "flat";
  sentiment?: "positive" | "negative" | "neutral";
}

const deltaToneClasses = {
  positive: "bg-emerald-50 text-emerald-700",
  negative: "bg-rose-50 text-rose-700",
  neutral: "bg-slate-100 text-slate-600",
} satisfies Record<NonNullable<DeltaBadgeProps["sentiment"]>, string>;

const deltaSymbols = {
  up: "↑",
  down: "↓",
  flat: "→",
} satisfies Record<NonNullable<DeltaBadgeProps["direction"]>, string>;

const deltaLabels = {
  up: "Gestiegen",
  down: "Gefallen",
  flat: "Unverändert",
} satisfies Record<NonNullable<DeltaBadgeProps["direction"]>, string>;

export function DeltaBadge({
  value,
  direction = "flat",
  sentiment,
  className,
  ...props
}: DeltaBadgeProps) {
  const resolvedSentiment =
    sentiment ??
    (direction === "up"
      ? "positive"
      : direction === "down"
        ? "negative"
        : "neutral");

  return (
    <span
      className={cx(
        "inline-flex h-5 items-center gap-1 rounded-md px-1.5 font-mono text-[0.66rem] font-semibold tabular-nums",
        deltaToneClasses[resolvedSentiment],
        className,
      )}
      {...props}
    >
      <span className="sr-only">{deltaLabels[direction]}: </span>
      <span aria-hidden="true">{deltaSymbols[direction]}</span>
      {value}
    </span>
  );
}

export interface SparklineProps
  extends Omit<SVGProps<SVGSVGElement>, "children"> {
  data: readonly number[];
  tone?: "cyan" | "green" | "amber" | "red" | "violet" | "neutral";
  ariaLabel?: string;
  showArea?: boolean;
}

const sparklineToneClasses = {
  cyan: "text-blue-600",
  green: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-rose-600",
  violet: "text-indigo-600",
  neutral: "text-slate-500",
} satisfies Record<NonNullable<SparklineProps["tone"]>, string>;

export function Sparkline({
  data,
  tone = "cyan",
  ariaLabel,
  showArea = true,
  className,
  ...props
}: SparklineProps) {
  const values = data.map((value) => (Number.isFinite(value) ? value : 0));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const range = max - min || 1;
  const chartTop = 3;
  const chartBottom = 37;
  const chartHeight = chartBottom - chartTop;

  const points = values.map((value, index) => {
    const x = values.length <= 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = chartBottom - ((value - min) / range) * chartHeight;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const areaPath = linePath
    ? `${linePath} L ${points.at(-1)?.[0] ?? 100} 40 L ${points[0]?.[0] ?? 0} 40 Z`
    : "";

  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className={cx("h-10 w-full", sparklineToneClasses[tone], className)}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      focusable="false"
      {...props}
    >
      {points.length ? (
        <>
          {showArea ? (
            <path d={areaPath} fill="currentColor" opacity="0.09" />
          ) : null}
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.length === 1 ? (
            <circle
              cx={points[0][0]}
              cy={points[0][1]}
              r="2"
              fill="currentColor"
            />
          ) : null}
        </>
      ) : (
        <path
          d="M 0 20 L 100 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 4"
          opacity="0.35"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

export interface EmptyStateProps
  extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center",
        compact ? "py-6" : "min-h-56 py-10",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-3 grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500 sm:text-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export interface SectionTitleProps
  extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  headingLevel?: "h1" | "h2" | "h3";
}

export function SectionTitle({
  title,
  description,
  eyebrow,
  action,
  headingLevel = "h1",
  className,
  ...props
}: SectionTitleProps) {
  const Heading = headingLevel;

  return (
    <div
      className={cx(
        "flex min-w-0 flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[0.62rem] font-bold tracking-[0.18em] text-blue-600 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <Heading className="text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[1.65rem]">
          {title}
        </Heading>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export interface ActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const buttonVariantClasses = {
  primary:
    "border-slate-900 bg-slate-900 text-white shadow-sm hover:border-slate-800 hover:bg-slate-800 active:bg-slate-950",
  secondary:
    "border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100",
  ghost:
    "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 active:bg-rose-200",
} satisfies Record<NonNullable<ActionButtonProps["variant"]>, string>;

const buttonSizeClasses = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-10 gap-2 rounded-lg px-4 text-sm",
  lg: "h-11 gap-2 rounded-lg px-5 text-sm",
} satisfies Record<NonNullable<ActionButtonProps["size"]>, string>;

export function ActionButton({
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  className,
  children,
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex shrink-0 items-center justify-center border font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none",
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {leadingIcon ? (
        <span className="grid shrink-0 place-items-center" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      {children}
      {trailingIcon ? (
        <span className="grid shrink-0 place-items-center" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </button>
  );
}
