"use client";

import { useState, type Dispatch } from "react";
import {
  formatCompactMoney,
  getAutomaticResearchChoice,
  getFactoryCapacity,
  getGameDate,
  getProductEconomics,
  getResearchRate,
} from "@/app/game/engine";
import {
  PC_PART_CATEGORIES,
  createNextComponentResearchProject,
  getComponentResearchProject,
  getPcResearchTrack,
  getResearchTracksByCategory,
} from "@/app/game/pc-system";
import type {
  GameAction,
  GameSection,
  GameState,
  PcPartCategory,
} from "@/app/game/types";
import {
  ActionButton,
  MetricCard,
  Panel,
  PanelHeader,
  ProgressBar,
  SectionTitle,
  StatusBadge,
} from "./game-ui";
import { Icon } from "./icons";
import { TrendChart } from "./trend-chart";

type SectionProps = {
  state: GameState;
  dispatch: Dispatch<GameAction>;
};

function totalEmployees(state: GameState) {
  return Object.values(state.employees).reduce((sum, amount) => sum + amount, 0);
}

function currentProfit(state: GameState) {
  const revenue = state.lastMonthRevenue || state.monthlyRevenue;
  const expenses = state.lastMonthExpenses || state.monthlyExpenses;
  return revenue - expenses;
}

export function SimpleDashboardSection({
  state,
  onNavigate,
}: SectionProps & { onNavigate: (section: GameSection) => void }) {
  const profit = currentProfit(state);
  const activeProducts = state.products.filter((product) => product.active);
  const activeResearchProject = getComponentResearchProject(state.currentResearch);
  const researchName = activeResearchProject?.name;
  const researchCost = activeResearchProject?.cost ?? 1;
  const dailyCapacity = getFactoryCapacity(state);
  const latestHistory = state.history.at(-1);
  const currentHistory = {
    day: state.day,
    revenue: state.monthlyRevenue,
    expenses: state.monthlyExpenses,
    profit: state.monthlyRevenue - state.monthlyExpenses,
    valuation: state.valuation,
    cash: state.cash,
    debt: state.debt,
    marketShare: state.marketShare,
    employees: totalEmployees(state),
    brand: state.brand,
  };
  const companyTrend = (
    latestHistory?.day === state.day
      ? state.history
      : [...state.history, currentHistory]
  );
  const trendLabels = companyTrend.map((item) => {
    const date = getGameDate(item.day);
    return `${String(date.month).padStart(2, "0")}/${date.year}`;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <SectionTitle
        eyebrow="Dein Unternehmen"
        title="Zentrale"
        description="Forsche, baue einen passenden PC und verkaufe ihn. Alles Weitere unterstützt diesen Kreislauf."
        action={
          <StatusBadge tone={profit >= 0 ? "success" : "warning"} dot>
            {profit >= 0 ? "Profitabel" : "Auf Kosten achten"}
          </StatusBadge>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <MetricCard
          label="Kasse"
          value={formatCompactMoney(state.cash)}
          detail="Verfügbares Kapital"
          tone="cyan"
          icon={<Icon name="wallet" size={17} />}
        />
        <MetricCard
          label="Monatsergebnis"
          value={formatCompactMoney(profit)}
          detail={profit >= 0 ? "Finanziert dein Wachstum" : "Ausgaben über Umsatz"}
          tone={profit >= 0 ? "green" : "amber"}
          icon={<Icon name={profit >= 0 ? "trendUp" : "trendDown"} size={17} />}
        />
        <MetricCard
          label="Aktive PCs"
          value={activeProducts.length}
          detail={`${activeProducts.reduce((sum, product) => sum + product.lastSales, 0).toFixed(1)} Verkäufe / Tag`}
          tone="violet"
          icon={<Icon name="monitor" size={17} />}
        />
        <MetricCard
          label="Team"
          value={totalEmployees(state)}
          detail={`${state.employees.research} Forschung · ${dailyCapacity} Stück / Tag`}
          icon={<Icon name="people" size={17} />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            eyebrow="Entwicklung"
            title="Unternehmenswert"
            description="Bewertung und verfügbare Liquidität seit der Unternehmensgründung."
            action={<StatusBadge tone="info">{formatCompactMoney(state.valuation)}</StatusBadge>}
          />
          <div className="mt-4">
            <TrendChart
              ariaLabel="Entwicklung von Unternehmenswert und Liquidität"
              labels={trendLabels}
              series={[
                { label: "Unternehmenswert", color: "#2563eb", values: companyTrend.map((item) => item.valuation), formatValue: formatCompactMoney },
                { label: "Liquidität", color: "#64748b", values: companyTrend.map((item) => item.cash), formatValue: formatCompactMoney },
              ]}
            />
          </div>
        </Panel>
        <Panel>
          <PanelHeader
            eyebrow="Geschäft"
            title="Umsatz & Ergebnis"
            description="Zeigt, ob Wachstum auch tatsächlich profitabel ist."
          />
          <div className="mt-4">
            <TrendChart
              ariaLabel="Entwicklung von Umsatz und Ergebnis"
              labels={trendLabels}
              includeZero
              series={[
                { label: "Umsatz", color: "#059669", values: companyTrend.map((item) => item.revenue), formatValue: formatCompactMoney },
                { label: "Ergebnis", color: "#d97706", values: companyTrend.map((item) => item.profit), formatValue: formatCompactMoney },
              ]}
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Panel>
          <PanelHeader
            eyebrow="Nächster Schritt"
            title={researchName ? `${researchName} fertig entwickeln` : "Nächsten Einzelwert erforschen"}
            description={
              researchName
                ? "Nach Abschluss steht genau diese neue Stufe im PC-Labor zur Auswahl."
                : "Verbessere zum Beispiel CPU-Kerne, RAM-Kapazität oder Netzteilleistung unabhängig voneinander."
            }
            action={<Icon name="research" size={20} className="text-indigo-600" />}
          />
          {researchName ? (
            <ProgressBar
              className="mt-5"
              value={state.researchPoints}
              max={researchCost}
              label={`${getResearchRate(state).toFixed(1)} FP pro Tag`}
              valueLabel={`${Math.min(state.researchPoints, researchCost).toFixed(0)} / ${researchCost} FP`}
              tone="violet"
            />
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <ActionButton
              onClick={() => onNavigate("research")}
              leadingIcon={<Icon name="research" size={15} />}
            >
              Zur Forschung
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={() => onNavigate("builder")}
              leadingIcon={<Icon name="monitor" size={15} />}
            >
              PC entwickeln
            </ActionButton>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow="Lage"
            title="Heute wichtig"
            description="Nur die Kennzahlen, die deine nächste Entscheidung beeinflussen."
          />
          <div className="mt-4 divide-y divide-slate-200">
            {[
              ["Forschung", `${state.researchPoints.toFixed(0)} FP`, state.employees.research > 0 ? "läuft" : "keine Forschenden"],
              ["Produktion", `${dailyCapacity} / Tag`, state.automationLevel > 0 ? `Automation ${state.automationLevel}` : "manuell"],
              ["Marke", `${state.brand.toFixed(0)} / 100`, `${state.marketShare.toFixed(1)} % Markt`],
              ["Eigentum", `${((state.founderShares / state.totalShares) * 100).toFixed(1)} %`, "Eigene Firma nicht übernehmbar"],
            ].map(([label, value, detail]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-xs text-slate-700">{label}</p>
                  <p className="mt-0.5 text-[0.68rem] text-slate-500">{detail}</p>
                </div>
                <p className="font-mono text-xs text-slate-900 tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Panel>
          <PanelHeader
            eyebrow="Produkte"
            title="Deine PC-Modelle"
            description="Verkäufe und Marge auf einen Blick."
            action={
              <ActionButton size="sm" variant="ghost" onClick={() => onNavigate("builder")}>
                Alle Modelle
              </ActionButton>
            }
          />
          <div className="mt-4 space-y-2">
            {activeProducts.slice(0, 3).map((product) => {
              const economics = getProductEconomics(state, product);
              return (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => onNavigate("builder")}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-blue-300/20 hover:bg-slate-50"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-500/[0.08] text-blue-600">
                    <Icon name="monitor" size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{product.name}</span>
                    <span className="mt-0.5 block text-[0.68rem] text-slate-500">
                      {product.lastSales.toFixed(1)} Verkäufe · {product.inventory.toFixed(0)} auf Lager
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-xs text-slate-900">{formatCompactMoney(product.price)}</span>
                    <span className={`mt-0.5 block text-[0.65rem] ${(economics?.unitMargin ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatCompactMoney(economics?.unitMargin ?? 0)} Marge
                    </span>
                  </span>
                </button>
              );
            })}
            {activeProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                <p className="text-sm text-slate-700">Noch kein PC am Markt</p>
                <p className="mt-1 text-xs text-slate-500">Entwickle dein erstes Modell im PC-Labor.</p>
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="News" title="Was passiert ist" />
          <div className="mt-4 space-y-3">
            {state.news.slice(0, 4).map((item) => (
              <div key={item.id} className="border-l border-slate-200 pl-3">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">{item.title}</p>
                  <span className="font-mono text-[0.62rem] text-slate-600">Tag {item.day + 1}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[0.68rem] leading-4 text-slate-500">{item.body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function ComponentResearchSection({ state, dispatch }: SectionProps) {
  const currentProject = getComponentResearchProject(state.currentResearch);
  const activeProjectCategory = currentProject
    ? getPcResearchTrack(currentProject.attribute)?.category
    : undefined;
  const [categorySelection, setCategorySelection] = useState<{
    category: PcPartCategory;
    projectId: string | null;
  }>(() => ({
    category: activeProjectCategory ?? "cpu",
    projectId: state.currentResearch,
  }));
  const category = categorySelection.projectId === state.currentResearch
    ? categorySelection.category
    : activeProjectCategory ?? categorySelection.category;
  const currentCost = currentProject?.cost ?? 0;
  const currentResearchRate = getResearchRate(state);
  const remainingResearchDays = currentProject
    ? Math.max(1, Math.ceil((currentCost - state.researchPoints) / Math.max(0.001, currentResearchRate)))
    : 0;
  const automaticChoice = getAutomaticResearchChoice(state);
  const currentName = currentProject?.name;
  const selectedCategory = PC_PART_CATEGORIES.find((item) => item.id === category)!;
  const categoryTracks = getResearchTracksByCategory(category);

  const selectCategory = (nextCategory: PcPartCategory) => {
    setCategorySelection({
      category: nextCategory,
      projectId: state.currentResearch,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <SectionTitle
        eyebrow="Komponentenentwicklung"
        title="Einzelwerte erforschen"
        description="Verbessere Kerne, Takt, Kapazität oder Effizienz getrennt. Jede Stufe baut auf der vorherigen auf – ohne Stufenlimit."
        action={
          <StatusBadge tone="violet">
            {currentProject ? `noch ca. ${remainingResearchDays} Tage` : "Langfristige Entwicklung"}
          </StatusBadge>
        }
      />

      <Panel padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl ${
              state.currentResearch
                ? "bg-indigo-50 text-indigo-600"
                : "bg-slate-50 text-slate-500"
            }`}
          >
            <Icon name="research" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {currentName ?? "Kein aktives Projekt"}
              </p>
              {state.currentResearch ? (
                <StatusBadge tone="violet" dot>
                  In Arbeit
                </StatusBadge>
              ) : null}
            </div>
            {state.currentResearch ? (
              <ProgressBar
                className="mt-2"
                value={state.researchPoints}
                max={Math.max(1, currentCost)}
                label={`${currentResearchRate.toFixed(1)} FP / Tag · noch ca. ${remainingResearchDays} Tage`}
                valueLabel={`${Math.min(state.researchPoints, currentCost).toFixed(0)} / ${currentCost.toLocaleString("de-DE")} FP`}
                tone="violet"
                size="sm"
              />
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Wähle unten den nächsten Einzelwert, den dein Team verbessern soll.
              </p>
            )}
          </div>
          {state.currentResearch ? (
            <ActionButton
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: "CANCEL_RESEARCH" })}
            >
              Abbrechen
            </ActionButton>
          ) : null}
          <ActionButton
            variant={state.autoResearch ? "primary" : "secondary"}
            size="sm"
            onClick={() => dispatch({ type: "SET_AUTO_RESEARCH", enabled: !state.autoResearch })}
            leadingIcon={<Icon name={state.autoResearch ? "check" : "sparkles"} size={14} />}
          >
            Auto-Forschung {state.autoResearch ? "an" : "aus"}
          </ActionButton>
        </div>
        <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-600">
          {state.autoResearch
            ? `Automatik aktiv: Nach Abschluss wird anhand von Nutzen, Engpässen und Kosten weitergeforscht.`
            : `Nächste Empfehlung: ${automaticChoice.name} für ${automaticChoice.cost.toLocaleString("de-DE")} FP.`}
        </p>
      </Panel>

      <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
        {PC_PART_CATEGORIES.map((item) => {
          const itemTracks = getResearchTracksByCategory(item.id);
          const developments = itemTracks.reduce(
            (sum, track) =>
              sum + Math.max(0, state.componentResearch[track.id] - 1),
            0,
          );
          const active = item.id === category;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => selectCategory(item.id)}
              className={`rounded-xl border p-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/70 ${
                active
                  ? "border-blue-300/30 bg-blue-500/[0.08] text-blue-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <Icon
                name={item.icon}
                size={16}
                className={active ? "text-blue-600" : "text-slate-500"}
              />
              <p className="mt-2 truncate text-[0.68rem] font-semibold">
                {item.shortName}
              </p>
              <p className="mt-0.5 font-mono text-[0.6rem] text-slate-600">
                {developments} Entwicklungen
              </p>
            </button>
          );
        })}
      </div>

      <Panel padding="none" className="overflow-hidden">
        <div className="p-4 sm:p-5">
          <PanelHeader
            eyebrow={selectedCategory.shortName}
            title={selectedCategory.name}
            description={selectedCategory.description}
            action={
              <StatusBadge tone="info">Kein Stufenlimit</StatusBadge>
            }
          />
        </div>

        <div className="divide-y divide-slate-200 border-t border-slate-200">
          {categoryTracks.map((track) => {
            const currentLevel = state.componentResearch[track.id];
            const nextProject = createNextComponentResearchProject(
              track.id,
              currentLevel,
            );
            const researching = state.currentResearch === nextProject.id;
            const blockedByOtherResearch = Boolean(
              state.currentResearch && !researching,
            );
            const estimatedRate = getResearchRate({
              ...state,
              currentResearch: nextProject.id,
              researchPoints: 0,
            });
            const estimatedDays = Math.ceil(nextProject.cost / Math.max(0.001, estimatedRate));

            return (
              <div
                key={track.id}
                className={`grid gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(12rem,1fr)_minmax(13rem,.9fr)_auto] lg:items-center ${
                  researching ? "bg-indigo-50/[0.035]" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {track.name}
                    </h3>
                    <StatusBadge tone={researching ? "violet" : "neutral"}>
                      Stufe {currentLevel}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {track.description}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[0.58rem] font-semibold tracking-wide text-slate-600 uppercase">
                    Nächste Verbesserung
                  </p>
                  <p className="mt-1.5 text-xs text-slate-700">
                    <span className="text-slate-500">
                      {nextProject.previousValue}
                    </span>
                    <span className="mx-2 text-blue-600">→</span>
                    <span className="font-medium text-blue-800">
                      {nextProject.nextValue}
                    </span>
                  </p>
                </div>

                <div className="flex min-w-40 items-center justify-between gap-3 lg:justify-end">
                  <div className="text-right">
                    <p className="font-mono text-xs text-slate-700">
                      {nextProject.cost.toLocaleString("de-DE")} FP
                    </p>
                    <p className="mt-0.5 text-[0.58rem] text-slate-600">
                      ca. {estimatedDays} Tage · Ziel Stufe {nextProject.targetLevel}
                    </p>
                  </div>
                  <ActionButton
                    size="sm"
                    disabled={blockedByOtherResearch || researching}
                    onClick={() =>
                      dispatch({
                        type: "START_COMPONENT_RESEARCH",
                        attribute: track.id,
                      })
                    }
                  >
                    {researching
                      ? "In Arbeit"
                      : blockedByOtherResearch
                        ? "Projekt läuft"
                        : "Erforschen"}
                  </ActionButton>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
