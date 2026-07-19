import type { SVGProps } from "react";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ChartSpline,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Cloud,
  Coins,
  Cpu,
  Factory,
  FlaskConical,
  Handshake,
  LayoutDashboard,
  LockKeyhole,
  Megaphone,
  Menu,
  Minus,
  Monitor,
  Newspaper,
  Package,
  Pause,
  Play,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "dashboard"
  | "products"
  | "research"
  | "production"
  | "people"
  | "marketing"
  | "finance"
  | "stocks"
  | "deals"
  | "news"
  | "settings"
  | "pause"
  | "play"
  | "chevronRight"
  | "trendUp"
  | "trendDown"
  | "clock"
  | "target"
  | "shield"
  | "bolt"
  | "coins"
  | "building"
  | "phone"
  | "monitor"
  | "cpu"
  | "cloud"
  | "plus"
  | "minus"
  | "check"
  | "lock"
  | "calendar"
  | "activity"
  | "wallet"
  | "sparkles"
  | "alert"
  | "save"
  | "x"
  | "menu"
  | "briefcase"
  | "arrowUpRight";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
  title?: string;
};

const icons: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  products: Package,
  research: FlaskConical,
  production: Factory,
  people: Users,
  marketing: Megaphone,
  finance: ChartNoAxesCombined,
  stocks: ChartSpline,
  deals: Handshake,
  news: Newspaper,
  settings: Settings,
  pause: Pause,
  play: Play,
  chevronRight: ChevronRight,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  clock: Clock3,
  target: Target,
  shield: ShieldCheck,
  bolt: Zap,
  coins: Coins,
  building: Building2,
  phone: Smartphone,
  monitor: Monitor,
  cpu: Cpu,
  cloud: Cloud,
  plus: Plus,
  minus: Minus,
  check: Check,
  lock: LockKeyhole,
  calendar: CalendarDays,
  activity: Activity,
  wallet: WalletCards,
  sparkles: Sparkles,
  alert: CircleAlert,
  save: Save,
  x: X,
  menu: Menu,
  briefcase: BriefcaseBusiness,
  arrowUpRight: ArrowUpRight,
};

export function Icon({
  name,
  size = 24,
  className,
  strokeWidth = 1.8,
  title,
  "aria-hidden": ariaHidden,
  role,
  ...props
}: IconProps) {
  const Glyph = icons[name];
  const isLabelled = Boolean(
    title || props["aria-label"] || props["aria-labelledby"],
  );

  return (
    <Glyph
      {...props}
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      focusable="false"
      role={role ?? (isLabelled ? "img" : undefined)}
      aria-hidden={ariaHidden ?? (isLabelled ? undefined : true)}
    >
      {title ? <title>{title}</title> : null}
    </Glyph>
  );
}
