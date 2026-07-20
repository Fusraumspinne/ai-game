"use client";

import { useState, type ReactNode } from "react";

import { GAME_SPEED_OPTIONS } from "../game/time";
import type { GameSection, GameSpeed } from "../game/types";
import { Icon, type IconName } from "./icons";

export type { GameSpeed } from "../game/types";
export type AutosaveStatus = "saved" | "saving" | "error";

export interface GameShellProps {
  children: ReactNode;
  aside?: ReactNode;
  companyName: string;
  companyMark?: string;
  date: string;
  cash: string;
  monthlyProfit: string;
  monthlyProfitTone?: "positive" | "negative" | "neutral";
  valuation: string;
  ownership: string;
  autosaveLabel?: string;
  autosaveStatus?: AutosaveStatus;
  section: GameSection;
  onSectionChange: (section: GameSection) => void;
  speed: GameSpeed;
  onSpeedChange: (speed: GameSpeed) => void;
  onSettings?: () => void;
  onHelp?: () => void;
  onMenu?: () => void;
  asideTitle?: string;
  className?: string;
  contentClassName?: string;
}

export interface GameNavigationItem {
  id: GameSection;
  label: string;
  shortLabel: string;
  icon: IconName;
}

export const GAME_NAVIGATION: readonly GameNavigationItem[] = [
  {
    id: "dashboard",
    label: "Zentrale",
    shortLabel: "Zentrale",
    icon: "dashboard",
  },
  {
    id: "accounting",
    label: "Buchhaltung",
    shortLabel: "Buchhaltung",
    icon: "finance",
  },
  {
    id: "builder",
    label: "PC-Labor",
    shortLabel: "PC-Labor",
    icon: "monitor",
  },
  {
    id: "research",
    label: "Forschung",
    shortLabel: "Forschung",
    icon: "research",
  },
  {
    id: "company",
    label: "Fabrik & Anlagen",
    shortLabel: "Fabrik",
    icon: "building",
  },
  {
    id: "production",
    label: "Produktion & Aufträge",
    shortLabel: "Produktion",
    icon: "production",
  },
  {
    id: "people",
    label: "Personal",
    shortLabel: "Personal",
    icon: "people",
  },
  {
    id: "marketing",
    label: "Marketing",
    shortLabel: "Marketing",
    icon: "marketing",
  },
  {
    id: "market",
    label: "Absatzmarkt",
    shortLabel: "Markt",
    icon: "trendUp",
  },
  {
    id: "finance",
    label: "Finanzierung",
    shortLabel: "Finanzen",
    icon: "finance",
  },
  {
    id: "stocks",
    label: "Aktien",
    shortLabel: "Aktien",
    icon: "stocks",
  },
  {
    id: "deals",
    label: "Übernahmen",
    shortLabel: "Deals",
    icon: "deals",
  },
] as const;

const NAVIGATION_GROUPS = [
  { label: "Steuerung", items: ["dashboard", "accounting"] },
  { label: "Produkt & Markt", items: ["builder", "research", "market"] },
  { label: "Betrieb", items: ["production", "company", "people", "marketing"] },
  { label: "Kapital", items: ["finance", "stocks", "deals"] },
] as const;

const saveStatusClasses: Record<AutosaveStatus, string> = {
  saved: "text-emerald-600",
  saving: "text-blue-600",
  error: "text-rose-600",
};

const profitToneClasses: Record<
  NonNullable<GameShellProps["monthlyProfitTone"]>,
  string
> = {
  positive: "text-emerald-600",
  negative: "text-rose-600",
  neutral: "text-slate-900",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getCompanyMark(companyName: string, companyMark?: string) {
  if (companyMark?.trim()) return companyMark.trim().slice(0, 3).toUpperCase();

  const initials = companyName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("");

  return initials.toUpperCase() || "FT";
}

interface StatusMetricProps {
  label: string;
  value: string;
  icon: IconName;
  valueClassName?: string;
  compact?: boolean;
}

function StatusMetric({
  label,
  value,
  icon,
  valueClassName,
  compact = false,
}: StatusMetricProps) {
  return (
    <div
      className={cx(
        "flex shrink-0 items-center gap-2.5",
        compact
          ? "rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
          : "h-10 border-r border-slate-200 px-4",
      )}
    >
      <Icon name={icon} size={compact ? 15 : 16} className="text-slate-500" />
      <div className="min-w-0">
        <dt className="text-[0.6rem] font-medium tracking-[0.08em] text-slate-500 uppercase">
          {label}
        </dt>
        <dd
          className={cx(
            "mt-0.5 whitespace-nowrap font-mono text-xs font-semibold text-slate-900 tabular-nums",
            valueClassName,
          )}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

interface SaveIndicatorProps {
  label: string;
  status: AutosaveStatus;
  compact?: boolean;
}

function SaveIndicator({ label, status, compact = false }: SaveIndicatorProps) {
  return (
    <div
      className={cx(
        "flex items-center gap-2 whitespace-nowrap text-[0.68rem] font-medium",
        saveStatusClasses[status],
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex size-2" aria-hidden="true">
        {status === "saving" ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-50 motion-reduce:animate-none" />
        ) : null}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {!compact ? label : null}
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface SpeedControlsProps {
  speed: GameSpeed;
  onSpeedChange: (speed: GameSpeed) => void;
  compact?: boolean;
}

function SpeedControls({
  speed,
  onSpeedChange,
  compact = false,
}: SpeedControlsProps) {
  return (
    <div
      className="flex shrink-0 items-center rounded-md border border-slate-200 bg-slate-100 p-0.5"
      role="group"
      aria-label="Simulationsgeschwindigkeit"
    >
      {GAME_SPEED_OPTIONS.map((option) => {
        const active = speed === option;
        const label = option === 0
          ? "Simulation pausieren (Leertaste)"
          : option === 1
            ? "1× – ein Spieltag pro Sekunde (Taste 1)"
            : option === 5
              ? "5× – fünf Spieltage pro Sekunde (Taste 2)"
              : "10× – zehn Spieltage pro Sekunde (Taste 3)";

        return (
          <button
            key={option}
            type="button"
            onClick={() => onSpeedChange(option)}
            className={cx(
              "grid h-7 min-w-7 place-items-center rounded-[4px] px-1.5 font-mono text-[0.66rem] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/60 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none",
              compact && "h-8 min-w-8",
              active
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-500 hover:bg-white hover:text-slate-900",
            )}
            aria-label={label}
            aria-pressed={active}
            title={label}
          >
            {option === 0 ? (
              <Icon name="pause" size={13} strokeWidth={2.2} />
            ) : (
              `${option}×`
            )}
          </button>
        );
      })}
    </div>
  );
}

interface DesktopSidebarProps {
  section: GameSection;
  onSectionChange: (section: GameSection) => void;
  onSettings?: () => void;
  onHelp?: () => void;
}

function DesktopSidebar({
  section,
  onSectionChange,
  onSettings,
  onHelp,
}: DesktopSidebarProps) {
  return (
    <aside className="workspace-noise relative z-20 hidden h-full w-[15.5rem] shrink-0 flex-col border-r border-[#dbe3ee] bg-white lg:flex">
      <div className="flex h-[5rem] shrink-0 items-center gap-3 border-b border-[#e6ebf2] px-5">
        <div className="relative grid size-9 place-items-center overflow-hidden rounded-md border-2 border-blue-500 bg-white font-mono text-xs font-black tracking-[-0.08em] text-blue-600">
          CF
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-[-0.025em] text-[#172033]">
            UNTERNEHMENSPLANER
          </p>
          <p className="text-[0.56rem] font-semibold tracking-[0.13em] text-slate-400 uppercase">
            Circuit Forge · Verwaltung
          </p>
        </div>
      </div>

      <nav
        className="min-h-0 flex-1 overflow-y-auto px-2.5 py-4"
        aria-label="Spielbereiche"
      >
        <div className="space-y-5">
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2.5 text-[0.55rem] font-bold tracking-[0.18em] text-slate-400 uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
          {group.items.map((itemId) => {
            const item = GAME_NAVIGATION.find((candidate) => candidate.id === itemId)!;
            const active = section === item.id;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={cx(
                    "group relative flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-[0.8rem] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/70 motion-reduce:transition-none",
                    active
                      ? "bg-[#101a31] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active ? (
                    <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-blue-500" />
                  ) : null}
                  <Icon
                    name={item.icon}
                    size={18}
                    strokeWidth={active ? 2 : 1.8}
                    className={cx(
                      "shrink-0 transition-colors",
                    active
                        ? "text-blue-400"
                        : "text-slate-400 group-hover:text-slate-700",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
            </ul>
          </div>
        ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-[#e6ebf2] p-2.5">
        <div className="mb-2 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
          <span className="text-[0.58rem] font-semibold tracking-[0.12em] text-slate-500 uppercase">System</span>
          <span className="flex items-center gap-1.5 text-[0.6rem] font-medium text-emerald-600"><i className="size-1.5 rounded-full bg-emerald-500" />Online</span>
        </div>
        {onHelp ? (
          <button
            type="button"
            onClick={onHelp}
            className="flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-[0.8rem] font-medium text-slate-500 outline-none transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/70 motion-reduce:transition-none"
          >
            <Icon name="help" size={18} />
            Spielanleitung
          </button>
        ) : null}
        {onSettings ? (
          <button
            type="button"
            onClick={onSettings}
            className="flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-[0.8rem] font-medium text-slate-500 outline-none transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/70 motion-reduce:transition-none"
          >
            <Icon name="settings" size={18} />
            Einstellungen
          </button>
        ) : null}
      </div>
    </aside>
  );
}

interface DesktopStatusBarProps {
  section: GameSection;
  companyName: string;
  companyMark: string;
  date: string;
  cash: string;
  monthlyProfit: string;
  monthlyProfitTone: NonNullable<GameShellProps["monthlyProfitTone"]>;
  valuation: string;
  ownership: string;
  autosaveLabel: string;
  autosaveStatus: AutosaveStatus;
  speed: GameSpeed;
  onSpeedChange: (speed: GameSpeed) => void;
  onSettings?: () => void;
  onHelp?: () => void;
}

function DesktopStatusBar({
  section,
  companyName,
  companyMark,
  date,
  cash,
  monthlyProfit,
  monthlyProfitTone,
  valuation,
  ownership,
  autosaveLabel,
  autosaveStatus,
  speed,
  onSpeedChange,
  onSettings,
  onHelp,
}: DesktopStatusBarProps) {
  const activeSection = GAME_NAVIGATION.find((item) => item.id === section);
  return (
    <header className="relative z-20 hidden h-[5rem] shrink-0 items-center border-b border-[#dbe3ee] bg-white shadow-[0_1px_0_rgba(31,54,88,.02)] lg:flex">
      <div className="flex min-w-[15rem] shrink-0 items-center gap-3 border-r border-slate-200 px-4">
        <div className="grid size-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-950 font-mono text-[0.6rem] font-bold tracking-wider text-white">
          {companyMark}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[0.68rem] font-medium text-slate-500">
            {companyName} <span className="mx-1 text-slate-300">/</span>
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">{activeSection?.label ?? "Arbeitsbereich"}</p>
        </div>
      </div>

      <dl className="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <StatusMetric label="Datum" value={date} icon="calendar" />
        <StatusMetric label="Liquidität" value={cash} icon="wallet" />
        <StatusMetric
          label="Monatsgewinn"
          value={monthlyProfit}
          icon={monthlyProfitTone === "negative" ? "trendDown" : "trendUp"}
          valueClassName={profitToneClasses[monthlyProfitTone]}
        />
        <StatusMetric label="Unternehmenswert" value={valuation} icon="building" />
        <StatusMetric label="Gründeranteil" value={ownership} icon="people" />
      </dl>

      <div className="flex shrink-0 items-center gap-3 border-l border-slate-200 px-3">
        <SaveIndicator label={autosaveLabel} status={autosaveStatus} />
        <SpeedControls speed={speed} onSpeedChange={onSpeedChange} />
        {onHelp ? (
          <button
            type="button"
            onClick={onHelp}
            className="grid size-8 place-items-center rounded-lg text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/60 motion-reduce:transition-none"
            aria-label="Spielanleitung öffnen"
            title="Spielanleitung"
          >
            <Icon name="help" size={17} />
          </button>
        ) : null}
        {onSettings ? (
          <button
            type="button"
            onClick={onSettings}
            className="grid size-8 place-items-center rounded-lg text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/60 motion-reduce:transition-none"
            aria-label="Einstellungen öffnen"
            title="Einstellungen"
          >
            <Icon name="settings" size={17} />
          </button>
        ) : null}
      </div>
    </header>
  );
}

interface MobileHeaderProps {
  companyName: string;
  companyMark: string;
  date: string;
  cash: string;
  monthlyProfit: string;
  monthlyProfitTone: NonNullable<GameShellProps["monthlyProfitTone"]>;
  valuation: string;
  ownership: string;
  autosaveLabel: string;
  autosaveStatus: AutosaveStatus;
  speed: GameSpeed;
  onSpeedChange: (speed: GameSpeed) => void;
  onSettings?: () => void;
  onHelp?: () => void;
  onMenu?: () => void;
}

function MobileHeader({
  companyName,
  companyMark,
  date,
  cash,
  monthlyProfit,
  monthlyProfitTone,
  valuation,
  autosaveLabel,
  autosaveStatus,
  speed,
  onSpeedChange,
  onSettings,
  onHelp,
  onMenu,
}: MobileHeaderProps) {
  return (
    <div className="relative z-30 shrink-0 border-b border-slate-200 bg-white lg:hidden">
      <header className="flex h-14 items-center gap-2 px-3">
        {onMenu ? (
          <button
            type="button"
            onClick={onMenu}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/70 motion-reduce:transition-none"
            aria-label="Menü öffnen"
          >
            <Icon name="menu" size={19} />
          </button>
        ) : null}

        <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-300 bg-slate-100 font-mono text-[0.6rem] font-bold tracking-wider text-slate-700">
          {companyMark}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-900">
            {companyName}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-[0.6rem] text-slate-500">
            <span className="font-mono tabular-nums">{date}</span>
            <SaveIndicator
              label={autosaveLabel}
              status={autosaveStatus}
              compact
            />
          </div>
        </div>

        <SpeedControls
          speed={speed}
          onSpeedChange={onSpeedChange}
          compact
        />
        {onHelp ? (
          <button
            type="button"
            onClick={onHelp}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/70"
            aria-label="Spielanleitung öffnen"
          >
            <Icon name="help" size={18} />
          </button>
        ) : null}
        {onSettings ? (
          <button
            type="button"
            onClick={onSettings}
            className="hidden size-9 shrink-0 place-items-center rounded-lg text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/70 sm:grid motion-reduce:transition-none"
            aria-label="Einstellungen öffnen"
          >
            <Icon name="settings" size={18} />
          </button>
        ) : null}
      </header>

      <dl className="flex gap-2 overflow-x-auto border-t border-slate-200 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <StatusMetric label="Cash" value={cash} icon="wallet" compact />
        <StatusMetric
          label="Monat"
          value={monthlyProfit}
          icon={monthlyProfitTone === "negative" ? "trendDown" : "trendUp"}
          valueClassName={profitToneClasses[monthlyProfitTone]}
          compact
        />
        <StatusMetric label="Wert" value={valuation} icon="building" compact />
      </dl>
    </div>
  );
}

interface MobileNavigationProps {
  section: GameSection;
  onSectionChange: (section: GameSection) => void;
  hasAside: boolean;
}

function MobileNavigation({
  section,
  onSectionChange,
  hasAside,
}: MobileNavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryIds: GameSection[] = ["dashboard", "builder", "production", "market"];
  const primaryItems = primaryIds.map((id) => GAME_NAVIGATION.find((item) => item.id === id)!);

  return (
    <>
    {menuOpen ? (
      <div className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" role="presentation" onClick={() => setMenuOpen(false)}>
        <div className="absolute inset-x-2 bottom-[4.5rem] max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-2xl" role="dialog" aria-label="Alle Spielbereiche" onClick={(event) => event.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-slate-900">Alle Bereiche</p>
            <button type="button" onClick={() => setMenuOpen(false)} className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Bereichsmenü schließen"><Icon name="x" size={16} /></button>
          </div>
          <div className="space-y-4">
            {NAVIGATION_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-1 text-[0.58rem] font-semibold tracking-[0.12em] text-slate-400 uppercase">{group.label}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.items.map((id) => {
                    const item = GAME_NAVIGATION.find((candidate) => candidate.id === id)!;
                    const active = section === item.id;
                    return (
                      <button key={item.id} type="button" onClick={() => { onSectionChange(item.id); setMenuOpen(false); }} className={cx("flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-medium", active ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600")}>
                        <Icon name={item.icon} size={16} className="shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {hasAside ? <a href="#game-pulse" onClick={() => setMenuOpen(false)} className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-600"><Icon name="news" size={16} />Pulse</a> : null}
        </div>
      </div>
    ) : null}
    <nav
      className="absolute inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Spielbereiche"
    >
      <div className="flex h-16 items-stretch overflow-x-auto px-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {primaryItems.map((item) => {
          const active = section === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSectionChange(item.id); setMenuOpen(false); }}
              className={cx(
                "relative flex min-w-[4.35rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.6rem] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/70 motion-reduce:transition-none",
                active
                  ? "text-blue-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
              )}
              aria-current={active ? "page" : undefined}
            >
              {active ? (
                <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-blue-600" />
              ) : null}
              <Icon
                name={item.icon}
                size={19}
                strokeWidth={active ? 2 : 1.8}
              />
              <span className="whitespace-nowrap">{item.shortLabel}</span>
            </button>
          );
        })}
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} className={cx("relative flex min-w-[4.35rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.6rem] font-medium outline-none", !primaryIds.includes(section) || menuOpen ? "text-blue-700" : "text-slate-500")}>
          <Icon name="menu" size={19} />
          <span>Bereiche</span>
        </button>
      </div>
    </nav>
    </>
  );
}

export function GameShell({
  children,
  aside,
  companyName,
  companyMark,
  date,
  cash,
  monthlyProfit,
  monthlyProfitTone = "neutral",
  valuation,
  ownership,
  autosaveLabel = "Gespeichert",
  autosaveStatus = "saved",
  section,
  onSectionChange,
  speed,
  onSpeedChange,
  onSettings,
  onHelp,
  onMenu,
  asideTitle = "Pulse",
  className,
  contentClassName,
}: GameShellProps) {
  const resolvedCompanyMark = getCompanyMark(companyName, companyMark);

  return (
    <div
      className={cx(
        "fixed inset-0 isolate flex h-[100dvh] w-full overflow-hidden bg-[#f8fafc] font-sans text-slate-900 selection:bg-blue-200 selection:text-slate-950",
        className,
      )}
    >
      <a
        href="#game-main"
        className="fixed top-2 left-2 z-[100] -translate-y-20 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white outline-none transition-transform focus:translate-y-0"
      >
        Zum Hauptinhalt
      </a>

      <DesktopSidebar
        section={section}
        onSectionChange={onSectionChange}
        onSettings={onSettings}
        onHelp={onHelp}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <DesktopStatusBar
          section={section}
          companyName={companyName}
          companyMark={resolvedCompanyMark}
          date={date}
          cash={cash}
          monthlyProfit={monthlyProfit}
          monthlyProfitTone={monthlyProfitTone}
          valuation={valuation}
          ownership={ownership}
          autosaveLabel={autosaveLabel}
          autosaveStatus={autosaveStatus}
          speed={speed}
          onSpeedChange={onSpeedChange}
          onSettings={onSettings}
          onHelp={onHelp}
        />
        <MobileHeader
          companyName={companyName}
          companyMark={resolvedCompanyMark}
          date={date}
          cash={cash}
          monthlyProfit={monthlyProfit}
          monthlyProfitTone={monthlyProfitTone}
          valuation={valuation}
          ownership={ownership}
          autosaveLabel={autosaveLabel}
          autosaveStatus={autosaveStatus}
          speed={speed}
          onSpeedChange={onSpeedChange}
          onSettings={onSettings}
          onHelp={onHelp}
          onMenu={onMenu}
        />

        <div
          className={cx(
            "grid min-h-0 flex-1 grid-cols-1 overflow-y-auto overscroll-contain pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 xl:overflow-hidden",
            Boolean(aside) && "xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_21rem]",
          )}
        >
          <main
            id="game-main"
            className="min-w-0 scroll-mt-28 xl:overflow-y-auto xl:overscroll-contain"
          >
            <div
              className={cx(
                "mx-auto w-full max-w-[110rem] p-3 sm:p-5 lg:p-7 2xl:px-10 2xl:py-8",
                contentClassName,
              )}
            >
              {children}
            </div>
          </main>

          {aside ? (
            <aside
              id="game-pulse"
              className="min-w-0 scroll-mt-28 border-t border-slate-200 bg-white xl:overflow-y-auto xl:border-t-0 xl:border-l"
              aria-label={asideTitle}
            >
              <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-slate-200 bg-white px-4">
                <Icon name="activity" size={16} className="text-blue-600" />
                <h2 className="text-xs font-semibold tracking-[0.08em] text-slate-800 uppercase">
                  {asideTitle}
                </h2>
                <span className="ml-auto flex items-center gap-1.5 text-[0.6rem] font-medium text-emerald-700">
                  <span
                    className="size-1.5 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                  Live
                </span>
              </div>
              <div className="p-3 sm:p-4">{aside}</div>
            </aside>
          ) : null}
        </div>
      </div>

      <MobileNavigation
        section={section}
        onSectionChange={onSectionChange}
        hasAside={Boolean(aside)}
      />
    </div>
  );
}
