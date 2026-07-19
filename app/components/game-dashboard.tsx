"use client";

import { useMemo, useState } from "react";
import { DAYS_PER_MONTH, DAYS_PER_YEAR, GAME_START_YEAR } from "@/app/game/data";
import { useGame } from "@/app/game/use-game";
import type { GameSection } from "@/app/game/types";
import { GameShell, type GameSpeed } from "./game-shell";
import {
  ComponentResearchSection,
  SimpleDashboardSection,
} from "./simple-core-sections";
import { PcBuilderSection } from "./pc-builder-section";
import { AccountingSection } from "./accounting-section";
import {
  SimpleCompanySection,
  SimpleMarketingSection,
  SimpleMarketSection,
} from "./simple-company-market";
import {
  OfflineModal,
  OnboardingModal,
  SettingsModal,
} from "./game-modals";

const monthNames = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function compactMoney(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 1_000_000_000)
    return `${sign}${(absolute / 1_000_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mrd. €`;
  if (absolute >= 1_000_000)
    return `${sign}${(absolute / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio. €`;
  if (absolute >= 1_000)
    return `${sign}${(absolute / 1_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Tsd. €`;
  return money.format(value);
}

function gameDate(day: number) {
  const year = GAME_START_YEAR + Math.floor(day / DAYS_PER_YEAR);
  const dayOfYear = day % DAYS_PER_YEAR;
  const month = Math.floor(dayOfYear / DAYS_PER_MONTH);
  const dayOfMonth = (dayOfYear % DAYS_PER_MONTH) + 1;
  return `${dayOfMonth}. ${monthNames[month]} ${year}`;
}

function saveLabel(savedAt: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
  if (seconds < 8) return "Gespeichert";
  if (seconds < 60) return `vor ${seconds} Sek.`;
  return `vor ${Math.floor(seconds / 60)} Min.`;
}

export default function GameDashboard() {
  const {
    state,
    dispatch,
    hydrated,
    saveStatus,
    savedAt,
    offlineSummary,
    dismissOfflineSummary,
    exportSave,
    importSave,
    resetGame,
  } = useGame();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ownership = (state.founderShares / state.totalShares) * 100;
  const displayedRevenue = state.lastMonthRevenue || state.monthlyRevenue;
  const displayedExpenses = state.lastMonthExpenses || state.monthlyExpenses;
  const monthlyProfit = displayedRevenue - displayedExpenses;
  const currentSection = state.selectedSection;

  const content = useMemo(() => {
    const common = { state, dispatch };
    switch (currentSection) {
      case "accounting":
        return <AccountingSection state={state} />;
      case "builder":
        return <PcBuilderSection {...common} />;
      case "research":
        return <ComponentResearchSection {...common} />;
      case "company":
        return <SimpleCompanySection {...common} />;
      case "marketing":
        return <SimpleMarketingSection {...common} />;
      case "market":
        return <SimpleMarketSection {...common} />;
      default:
        return (
          <SimpleDashboardSection
            {...common}
            onNavigate={(section) =>
              dispatch({ type: "SET_SECTION", section })
            }
          />
        );
    }
  }, [currentSection, state, dispatch]);

  const navigate = (section: GameSection) =>
    dispatch({ type: "SET_SECTION", section });

  return (
    <>
      <GameShell
        companyName={state.companyName}
        companyMark="CF"
        date={gameDate(state.day)}
        cash={compactMoney(state.cash)}
        monthlyProfit={compactMoney(monthlyProfit)}
        monthlyProfitTone={
          monthlyProfit > 0
            ? "positive"
            : monthlyProfit < 0
              ? "negative"
              : "neutral"
        }
        valuation={compactMoney(state.valuation)}
        ownership={`${ownership.toFixed(1)} %`}
        autosaveStatus={saveStatus}
        autosaveLabel={saveLabel(savedAt)}
        section={currentSection}
        onSectionChange={navigate}
        speed={state.speed}
        onSpeedChange={(speed: GameSpeed) =>
          dispatch({ type: "SET_SPEED", speed })
        }
        onSettings={() => setSettingsOpen(true)}
        contentClassName="game-grid ambient-glow"
      >
        <div
          className={`mx-auto w-full max-w-[1540px] transition-opacity ${
            hydrated ? "opacity-100" : "opacity-0"
          }`}
        >
          {content}
        </div>
      </GameShell>

      {!hydrated ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-100">
          <div className="text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-800 shadow-sm">
              CF
            </div>
            <p className="mt-4 text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">
              Unternehmen wird geladen
            </p>
          </div>
        </div>
      ) : null}

      {hydrated && !state.onboardingDismissed ? (
        <OnboardingModal dispatch={dispatch} />
      ) : null}
      {hydrated && offlineSummary ? (
        <OfflineModal
          summary={offlineSummary}
          onClose={dismissOfflineSummary}
        />
      ) : null}
      {settingsOpen ? (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onExport={exportSave}
          onImport={(raw) => {
            const loaded = importSave(raw);
            if (loaded) window.setTimeout(() => setSettingsOpen(false), 500);
            return loaded;
          }}
          onReset={() => {
            resetGame();
            setSettingsOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
