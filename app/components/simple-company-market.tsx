"use client";

import { useState, type Dispatch, type ReactNode } from "react";

import {
  CAMPAIGNS,
  DEPARTMENTS,
  MARKETING_STRATEGIES,
} from "../game/data";
import {
  formatCompactMoney,
  formatMoney,
  getAdjustedDailySalary,
  getAcquisitionPrice,
  getAnnualInterestRate,
  getAutomationUpgradeCost,
  getAutomationRequirement,
  getBuybackQuote,
  getCompanyControl,
  getCreditLimit,
  getDailyDebtRepayment,
  getDailyMarketingCost,
  getDailyPayroll,
  getDailySalesCapacity,
  getDepartmentUpgradeCost,
  getEmployeeCount,
  getFactoryCapacity,
  getFactoryUpgradeCost,
  getFireCost,
  getGovernanceEfficiency,
  getHireCost,
  getMarketingEfficiency,
  getEstimatedMonthlyDividend,
  getEstimatedMonthlyPortfolioIncome,
  getMergerTerms,
  getPortfolioCostBasis,
  getPortfolioRealizedProfit,
  getPortfolioUnrealizedProfit,
  getPortfolioValue,
  getProductEconomics,
  getResearchRate,
  getShareIssueQuote,
  getStockTradeQuote,
  getWarehouseCapacity,
  getWarehouseUpgradeCost,
  getWorkforcePlan,
  LOAN_TERM_DAYS,
} from "../game/engine";
import type {
  CompetitorState,
  DepartmentId,
  GameAction,
  GameState,
  MarketingStrategy,
} from "../game/types";
import {
  ActionButton,
  EmptyState,
  Panel,
  PanelHeader,
  ProgressBar,
  SectionTitle,
  StatusBadge,
} from "./game-ui";
import { Icon, type IconName } from "./icons";
import { StockPriceChart } from "./trend-chart";

interface SimpleSectionProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

type CompanyTab = "team" | "production";
type MarketTab = "finance" | "stocks" | "deals";

const companyTabs: Array<{
  id: CompanyTab;
  label: string;
  icon: IconName;
}> = [
  { id: "production", label: "Fabrik & Lager", icon: "production" },
  { id: "team", label: "Personal", icon: "people" },
];

const marketTabs: Array<{ id: MarketTab; label: string; icon: IconName }> = [
  { id: "finance", label: "Finanzierung", icon: "finance" },
  { id: "stocks", label: "Aktien", icon: "stocks" },
  { id: "deals", label: "Übernahmen", icon: "deals" },
];

const departmentIcons: Record<DepartmentId, IconName> = {
  production: "production",
  research: "research",
  marketing: "marketing",
  sales: "briefcase",
  finance: "finance",
};

const departmentIds = Object.keys(DEPARTMENTS) as DepartmentId[];
const marketingStrategies = Object.keys(
  MARKETING_STRATEGIES,
) as MarketingStrategy[];

function percent(value: number, digits = 1) {
  return `${value.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md border border-[#e6ebf2] bg-[#f8fafc] p-3.5">
      <p className="text-[0.62rem] font-medium tracking-[0.08em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-base font-semibold text-slate-900 tabular-nums">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 truncate text-[0.66rem] text-slate-500">{detail}</p>
      ) : null}
    </div>
  );
}

function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: Array<{ id: T; label: string; icon: IconName }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      className="grid gap-2 bg-transparent sm:flex"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      role="tablist"
      aria-label={label}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-xs font-semibold tracking-[0.03em] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:outline-none sm:min-w-28 ${
              active
                ? "border-[#101a31] bg-[#101a31] text-white shadow-sm"
                : "border-[#dbe3ee] bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            <Icon name={item.icon} size={14} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function departmentImpact(state: GameState, department: DepartmentId) {
  if (department === "production") return `${getFactoryCapacity(state)} PCs Produktionskapazität pro Tag`;
  if (department === "research") return `${getResearchRate(state).toFixed(1)} Forschungspunkte pro Tag`;
  if (department === "marketing") return `${getMarketingEfficiency(state).toFixed(2)}× Wirkung des Marketingbudgets`;
  if (department === "sales") {
    return `${Math.round(getDailySalesCapacity(state)).toLocaleString("de-DE")} Geräte erreichbare Nachfrage pro Tag`;
  }
  return `${(getAnnualInterestRate(state) * 100).toFixed(1)} % Kreditzins · ${formatCompactMoney(getCreditLimit(state))} frei`;
}

function TeamPanel({ state, dispatch }: SimpleSectionProps) {
  const [staffingAmount, setStaffingAmount] = useState(10);
  const employees = getEmployeeCount(state);
  const payroll = getDailyPayroll(state);
  const workforce = getWorkforcePlan(state);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Metric label="Mitarbeitende" value={employees} detail="in 5 Bereichen" />
        <Metric
          label="Personalbedarf"
          value={workforce.recommendedTotal.toLocaleString("de-DE")}
          detail={workforce.gap > 0 ? `${workforce.gap.toLocaleString("de-DE")} Stellen fehlen` : "Bedarf gedeckt"}
        />
        <Metric label="Löhne pro Tag" value={formatCompactMoney(payroll)} />
        <Metric label="Moral" value={percent(state.morale, 0)} />
        <Metric
          label="Personalkosten / Monat"
          value={formatCompactMoney(payroll * 30)}
        />
      </div>

      <Panel padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Personaländerung planen</p>
            <p className="mt-1 text-xs text-slate-600">
              Die gewählte Anzahl gilt für die Einstellen- und Entlassen-Buttons jeder Abteilung.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <label className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Personen</span>
              <input
                type="number"
                min={1}
                max={1_000_000}
                step={1}
                value={staffingAmount || ""}
                onChange={(event) =>
                  setStaffingAmount(
                    Math.min(1_000_000, Math.max(0, Math.floor(Number(event.target.value) || 0))),
                  )
                }
                className="h-9 w-40 rounded-lg border border-slate-300 bg-white px-3 text-right font-mono text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
              {[10, 100, 1_000, 10_000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setStaffingAmount(amount)}
                  className={`rounded-md px-2.5 py-1.5 font-mono text-[0.68rem] ${
                    staffingAmount === amount
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {amount.toLocaleString("de-DE")}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-slate-200 pt-3 text-xs text-slate-600">
          <span>Organisationsbereitschaft</span>
          <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${workforce.readiness * 100}%` }} />
          </div>
          <span className="font-mono font-medium text-slate-900">{percent(workforce.readiness * 100, 0)}</span>
        </div>
      </Panel>

      <Panel padding="none" className="divide-y divide-slate-200 overflow-hidden">
        {departmentIds.map((departmentId) => {
          const department = DEPARTMENTS[departmentId];
          const count = state.employees[departmentId];
          const level = state.departmentLevels[departmentId];
          const hireCost = getHireCost(departmentId, staffingAmount, state.day);
          const fireAmount = Math.min(staffingAmount, count);
          const fireCost = getFireCost(departmentId, fireAmount, state.day);
          const upgradeCost = getDepartmentUpgradeCost(state, departmentId);

          return (
            <div
              key={departmentId}
              className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl"
                  style={{
                    color: department.color,
                    backgroundColor: `${department.color}16`,
                  }}
                >
                  <Icon name={departmentIcons[departmentId]} size={17} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {department.shortName}
                    </h3>
                    <StatusBadge>Level {level}</StatusBadge>
                  </div>
                  <p className="mt-0.5 truncate text-[0.68rem] text-slate-600">
                    {departmentImpact(state, departmentId)}
                  </p>
                  <p className="mt-0.5 truncate text-[0.62rem] text-slate-600">
                    {formatMoney(getAdjustedDailySalary(state, departmentId))} Lohn pro Person und Tag
                  </p>
                  <p className="mt-0.5 text-[0.62rem] text-slate-500">
                    Richtwert: {workforce.recommended[departmentId].toLocaleString("de-DE")} · {percent(Math.min(1, workforce.coverage[departmentId]) * 100, 0)} besetzt
                  </p>
                </div>
              </div>

              <div className="min-w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                  <p className="font-mono text-sm font-semibold text-slate-900">
                    {count.toLocaleString("de-DE")}
                  </p>
                  <p className="text-[0.55rem] text-slate-600 uppercase">Personen</p>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                <ActionButton
                  size="sm"
                  variant="ghost"
                  disabled={fireAmount <= 0 || state.cash < fireCost}
                  onClick={() => dispatch({ type: "FIRE", department: departmentId, amount: staffingAmount })}
                >
                  −{fireAmount.toLocaleString("de-DE")} · {formatCompactMoney(fireCost)}
                </ActionButton>
                <ActionButton
                  size="sm"
                  disabled={staffingAmount <= 0 || state.cash < hireCost}
                  onClick={() => dispatch({ type: "HIRE", department: departmentId, amount: staffingAmount })}
                >
                  +{staffingAmount.toLocaleString("de-DE")} · {formatCompactMoney(hireCost)}
                </ActionButton>
              </div>

              <ActionButton
                size="sm"
                variant="secondary"
                disabled={state.cash < upgradeCost}
                onClick={() =>
                  dispatch({
                    type: "UPGRADE_DEPARTMENT",
                    department: departmentId,
                  })
                }
              >
                Level {level + 1} · {formatCompactMoney(upgradeCost)}
              </ActionButton>
            </div>
          );
        })}
      </Panel>
      <p className="text-center text-[0.65rem] text-slate-600">
        Einstellungskosten entsprechen 14 Tageslöhnen plus Rekrutierungsaufschlag für große Wellen; Abfindungen kosten 10 Tageslöhne.
      </p>
    </div>
  );
}

function ProductionPanel({ state, dispatch }: SimpleSectionProps) {
  const capacity = getFactoryCapacity(state);
  const warehouseCapacity = getWarehouseCapacity(state);
  const activeProducts = state.products.filter((product) => product.active);
  const dailyOutput = activeProducts.reduce(
    (sum, product) => sum + product.lastProduction,
    0,
  );
  const dailySales = activeProducts.reduce(
    (sum, product) => sum + product.lastSales,
    0,
  );
  const dailyDemand = activeProducts.reduce(
    (sum, product) => sum + product.lastDemand,
    0,
  );
  const lostSales = activeProducts.reduce(
    (sum, product) => sum + product.lastLostSales,
    0,
  );
  const inventory = activeProducts.reduce(
    (sum, product) => sum + product.inventory,
    0,
  );
  const plannedOutput = activeProducts.reduce((sum, product) => {
    if (product.productionTarget !== null) return sum + product.productionTarget;
    return sum + (getProductEconomics(state, product)?.demand ?? 0);
  }, 0);
  const utilization = capacity > 0 ? (dailyOutput / capacity) * 100 : 0;
  const warehouseUtilization = warehouseCapacity > 0
    ? (inventory / warehouseCapacity) * 100
    : 0;
  const factoryCost = getFactoryUpgradeCost(state);
  const warehouseCost = getWarehouseUpgradeCost(state);
  const automationCost = getAutomationUpgradeCost(state);
  const automationRequirement = getAutomationRequirement(state);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Metric label="Produktionsplan" value={`${plannedOutput.toFixed(0)} / Tag`} />
        <Metric label="Fabrikkapazität" value={`${capacity} / Tag`} />
        <Metric label="Verkauft / Nachfrage" value={`${dailySales.toFixed(1)} / ${dailyDemand.toFixed(1)}`} />
        <Metric label="Lager" value={`${Math.round(inventory)} / ${warehouseCapacity}`} />
        <Metric
          label="Entgangene Verkäufe"
          value={lostSales.toFixed(1)}
          detail={lostSales > 0.1 ? "Produktion oder Lagerbestand erhöhen" : "Nachfrage wird bedient"}
        />
      </div>

      {plannedOutput > capacity ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2.5 text-xs leading-5 text-amber-800">
          <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
          Dein Plan verlangt {plannedOutput.toFixed(0)} PCs pro Tag, die Fabrik schafft {capacity}. Die Modelle werden anteilig produziert.
        </div>
      ) : null}

      <Panel padding="none" className="overflow-hidden">
        <div className="p-4 sm:p-5">
          <PanelHeader
            eyebrow="Tagesplanung"
            title="Produktion und Verkauf ausbalancieren"
            description="Produziere genug für die Nachfrage, aber vermeide Kapitalbindung durch zu große Lagerbestände."
            action={<StatusBadge tone={plannedOutput <= capacity ? "success" : "warning"}>{plannedOutput.toFixed(0)} / {capacity} geplant</StatusBadge>}
          />
        </div>
        <div className="divide-y divide-slate-200 border-t border-slate-200">
          {activeProducts.map((product) => {
            const economics = getProductEconomics(state, product);
            const demand = economics?.demand ?? product.lastDemand;
            const target = product.productionTarget;
            const controlBase = target ?? Math.ceil(demand);
            const stockDays = product.inventory / Math.max(0.1, demand);
            const status = product.lastLostSales > 0.1
              ? { label: "Ausverkauft", tone: "danger" as const }
              : stockDays > 7
                ? { label: "Überbestand", tone: "warning" as const }
                : controlBase > demand * 1.15
                  ? { label: "Lager wächst", tone: "info" as const }
                  : { label: "Ausgeglichen", tone: "success" as const };
            return (
              <div key={product.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(12rem,1.2fr)_repeat(3,minmax(6rem,.55fr))_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-900">{product.name}</h3>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>
                  <p className="mt-1 text-[0.66rem] text-slate-500">
                    {formatCompactMoney(economics?.unitMargin ?? 0)} Deckungsbeitrag je PC
                  </p>
                </div>
                <Metric label="Gebaut" value={product.lastProduction.toFixed(1)} detail="letzter Tag" />
                <Metric label="Verkauft / Bedarf" value={`${product.lastSales.toFixed(1)} / ${demand.toFixed(1)}`} />
                <Metric label="Im Lager" value={Math.round(product.inventory)} detail={`${stockDays.toFixed(1)} Verkaufstage`} />
                <div className="flex items-center justify-between gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "SET_PRODUCTION_TARGET", productId: product.id, target: Math.max(0, controlBase - 1) })}
                    className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    aria-label={`Produktionsziel für ${product.name} senken`}
                  >
                    <Icon name="minus" size={13} />
                  </button>
                  <div className="min-w-20 text-center">
                    <p className="font-mono text-sm font-semibold text-slate-900">{target === null ? "Auto" : target.toFixed(0)}</p>
                    <p className="text-[0.55rem] text-slate-600 uppercase">PCs / Tag</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "SET_PRODUCTION_TARGET", productId: product.id, target: controlBase + 1 })}
                    className="grid size-9 place-items-center rounded-lg border border-blue-300/15 bg-blue-500/[0.05] text-blue-600 hover:bg-blue-500/10"
                    aria-label={`Produktionsziel für ${product.name} erhöhen`}
                  >
                    <Icon name="plus" size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "SET_PRODUCTION_TARGET", productId: product.id, target: null })}
                    className="rounded-lg px-2 py-2 text-[0.62rem] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  >
                    Auto
                  </button>
                </div>
              </div>
            );
          })}
          {!activeProducts.length ? (
            <div className="p-4">
              <EmptyState compact title="Keine aktive PC-Linie" description="Entwickle zuerst ein Modell im PC-Labor." icon={<Icon name="monitor" size={18} />} />
            </div>
          ) : null}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel>
          <PanelHeader
            eyebrow="Kapazität"
            title={`Fabrik Level ${state.factoryLevel}`}
            description="Mehr Fläche erhöht den möglichen Tagesausstoß."
            action={<Icon name="building" size={22} className="text-blue-600" />}
          />
          <ProgressBar
            className="mt-5"
            value={Math.min(100, utilization)}
            label="Aktuelle Auslastung"
            valueLabel={percent(Math.min(100, utilization), 0)}
            tone={utilization > 92 ? "amber" : "cyan"}
          />
          <ActionButton
            className="mt-5"
            fullWidth
            disabled={state.cash < factoryCost}
            onClick={() => dispatch({ type: "UPGRADE_FACTORY" })}
          >
            Auf Level {state.factoryLevel + 1} · {formatCompactMoney(factoryCost)}
          </ActionButton>
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow="Effizienz"
            title={`Automatisierung Level ${state.automationLevel}`}
            description="Maschinen steigern den Output pro Produktionskraft."
            action={<Icon name="bolt" size={22} className="text-indigo-600" />}
          />
          <div className="mt-5 rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Kapazitätsbonus</p>
            <p className="mt-1 font-mono text-lg font-semibold text-indigo-700">
              +{Math.round(state.automationLevel * 22)} %
            </p>
          </div>
          {automationRequirement ? (
            <p className="mt-3 text-[0.68rem] text-amber-700">
              {automationRequirement}
            </p>
          ) : null}
          <ActionButton
            className="mt-4"
            fullWidth
            variant="secondary"
            disabled={
              Boolean(automationRequirement) || state.cash < automationCost
            }
            onClick={() => dispatch({ type: "UPGRADE_AUTOMATION" })}
          >
            Level {state.automationLevel + 1} · {formatCompactMoney(automationCost)}
          </ActionButton>
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow="Lagerfläche"
            title={`Lager Level ${state.warehouseLevel}`}
            description="Mehr Fläche verhindert Produktionsstopps bei wachsendem Bestand."
            action={<Icon name="products" size={22} className="text-amber-700" />}
          />
          <ProgressBar
            className="mt-5"
            value={inventory}
            max={warehouseCapacity}
            label="Belegt"
            valueLabel={`${Math.round(inventory)} / ${warehouseCapacity} PCs`}
            tone={warehouseUtilization > 88 ? "red" : warehouseUtilization > 70 ? "amber" : "green"}
          />
          <ActionButton
            className="mt-5"
            fullWidth
            variant="secondary"
            disabled={state.cash < warehouseCost}
            onClick={() => dispatch({ type: "UPGRADE_WAREHOUSE" })}
          >
            Auf Level {state.warehouseLevel + 1} · {formatCompactMoney(warehouseCost)}
          </ActionButton>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          eyebrow="Fertigungsziel"
          title="Qualität oder Menge"
          description="Höhere Qualität verbessert Produkte, senkt aber die Stückzahl."
          action={
            <StatusBadge tone={state.qualityFocus > 1.08 ? "success" : "neutral"}>
              {Math.round(state.qualityFocus * 100)} % Qualität
            </StatusBadge>
          }
        />
        <input
          className="mt-5 h-2 w-full cursor-pointer accent-blue-600"
          type="range"
          min="0.7"
          max="1.3"
          step="0.05"
          value={state.qualityFocus}
          onChange={(event) =>
            dispatch({
              type: "SET_QUALITY_FOCUS",
              value: Number(event.target.value),
            })
          }
          aria-label="Qualitätsfokus"
        />
        <div className="mt-2 flex justify-between text-[0.62rem] text-slate-600">
          <span>Mehr Menge</span>
          <span>Ausgewogen</span>
          <span>Mehr Qualität</span>
        </div>
      </Panel>
    </div>
  );
}

function MarketingPanel({ state, dispatch }: SimpleSectionProps) {
  const marketingCost = getDailyMarketingCost(state);
  const activeProducts = state.products.filter((product) => product.active);
  const demand = activeProducts.reduce(
    (sum, product) => sum + (getProductEconomics(state, product)?.demand ?? 0),
    0,
  );
  const sales = activeProducts.reduce((sum, product) => sum + product.lastSales, 0);
  const efficiency = getMarketingEfficiency(state);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Nachfrage / Tag" value={demand.toFixed(1)} detail={`${sales.toFixed(1)} zuletzt verkauft`} />
        <Metric label="Marketingkosten" value={`${formatCompactMoney(marketingCost)} / Tag`} />
        <Metric label="Teamwirkung" value={`${efficiency.toFixed(2)}×`} detail={`${state.employees.marketing} Mitarbeitende · Level ${state.departmentLevels.marketing}`} />
        <Metric label="Markenwert" value={`${state.brand.toFixed(0)} / 100`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-4">
        <Panel>
          <PanelHeader
            eyebrow="Tagesbudget"
            title={formatCompactMoney(state.marketingBudget)}
            description={`Mit Strategie und Kampagne: ${formatCompactMoney(marketingCost)} pro Tag.`}
            action={<Icon name="marketing" size={22} className="text-amber-700" />}
          />
          <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            {[0, 10_000, 100_000, 1_000_000].map((budget) => (
              <button
                key={budget}
                type="button"
                onClick={() => dispatch({ type: "SET_MARKETING_BUDGET", value: budget })}
                className={`rounded-lg px-2 py-2 font-mono text-[0.66rem] ${state.marketingBudget === budget ? "bg-amber-300/10 text-amber-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
              >
                {formatCompactMoney(budget)}
              </button>
            ))}
          </div>
          <label className="mt-5 block">
            <span className="text-[0.62rem] font-semibold tracking-[0.08em] text-slate-500 uppercase">
              Freies Tagesbudget ohne Obergrenze
            </span>
            <div className="mt-2 flex items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
              <input
            className="h-10 min-w-0 flex-1 bg-transparent font-mono text-sm text-slate-900 outline-none"
            type="number"
            min="0"
            step="1000"
            value={state.marketingBudget}
            onChange={(event) =>
              dispatch({
                type: "SET_MARKETING_BUDGET",
                value: Number(event.target.value),
              })
            }
            aria-label="Marketingbudget pro Tag"
          />
              <span className="text-xs font-medium text-slate-500">€ / Tag</span>
            </div>
          </label>
        </Panel>

        <Panel>
          <PanelHeader
            title="Strategie"
            description="Wähle, wie aggressiv das Budget eingesetzt wird."
          />
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {marketingStrategies.map((strategyId) => {
              const strategy = MARKETING_STRATEGIES[strategyId];
              const active = state.marketingStrategy === strategyId;
              return (
                <button
                  key={strategyId}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    dispatch({
                      type: "SET_MARKETING_STRATEGY",
                      strategy: strategyId,
                    })
                  }
                  className={`rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:outline-none ${
                    active
                      ? "border-amber-300/30 bg-amber-300/[0.075]"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-50"
                  }`}
                >
                  <p className={active ? "text-amber-800" : "text-slate-700"}>
                    {strategy.name}
                  </p>
                  <p className="mt-1 text-[0.65rem] leading-4 text-slate-500">
                    {strategy.description}
                  </p>
                  <p className="mt-2 font-mono text-[0.62rem] text-slate-500">
                    {strategy.costMultiplier.toLocaleString("de-DE", {
                      maximumFractionDigits: 2,
                    })}
                    × Kosten
                  </p>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          eyebrow="Kampagnen"
          title={state.campaign ? state.campaign.name : "Keine Kampagne aktiv"}
          description={
            state.campaign
              ? "Die laufende Kampagne endet automatisch."
              : "Eine Kampagne gibt der Nachfrage einen zeitlich begrenzten Schub."
          }
        />
        {state.campaign ? (
          <div className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4">
            <ProgressBar
              value={state.campaign.totalDays - state.campaign.daysRemaining}
              max={state.campaign.totalDays}
              label="Laufzeit"
              valueLabel={`${state.campaign.daysRemaining} Tage übrig`}
              tone="green"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metric
                label="Nachfrage"
                value={`+${percent(state.campaign.demandBoost * 100, 0)}`}
              />
              <Metric
                label="Kosten / Tag"
                value={formatCompactMoney(state.campaign.dailyCost)}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {CAMPAIGNS.map((campaign) => (
              <div
                key={campaign.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {campaign.name}
                    </p>
                    <p className="mt-1 text-[0.65rem] leading-4 text-slate-500">
                      {campaign.description}
                    </p>
                  </div>
                  <StatusBadge tone="info">
                    +{Math.round(campaign.demandBoost * 100)} %
                  </StatusBadge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[0.62rem] text-slate-500">
                    {formatCompactMoney(campaign.upfrontCost)} Start · {formatCompactMoney(campaign.dailyCost)}/Tag
                  </p>
                  <ActionButton
                    size="sm"
                    variant="secondary"
                    disabled={state.cash < campaign.upfrontCost}
                    onClick={() =>
                      dispatch({
                        type: "START_CAMPAIGN",
                        campaignId: campaign.id,
                      })
                    }
                  >
                    Starten
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      </div>
    </div>
  );
}

function FinancePanel({ state, dispatch }: SimpleSectionProps) {
  const [creditAmount, setCreditAmount] = useState("50000");
  const [equityPercent, setEquityPercent] = useState(0.05);
  const creditLimit = getCreditLimit(state);
  const control = getCompanyControl(state);
  const annualInterestRate = getAnnualInterestRate(state);
  const issueQuote = getShareIssueQuote(state, equityPercent);
  const buybackQuote = getBuybackQuote(state, equityPercent);
  const observedRevenue = state.lastMonthRevenue || state.monthlyRevenue;
  const observedExpenses = state.lastMonthExpenses || state.monthlyExpenses;
  const observedProfit = observedRevenue - observedExpenses + state.lastMonthInvestmentIncome;
  const leverage = state.debt / Math.max(1, state.valuation);
  const ratingScore = Math.max(
    10,
    Math.min(
      95,
      68 +
        Math.max(-18, Math.min(14, (observedProfit / Math.max(1, observedRevenue)) * 70)) -
        Math.max(0, leverage - 0.15) * 100 +
        (state.departmentLevels.finance - 1) * 2 +
        Math.log1p(state.employees.finance) * 2,
    ),
  );
  const rating = ratingScore >= 82 ? "AA" : ratingScore >= 68 ? "A" : ratingScore >= 52 ? "BBB" : ratingScore >= 36 ? "BB" : "B";
  const creditPresets = [0.25, 0.5, 1];
  const amount = Math.min(
    Number.MAX_SAFE_INTEGER,
    Math.max(0, Math.floor(Number(creditAmount) || 0)),
  );
  const existingMonthlyPrincipal = Math.min(
    state.debt,
    getDailyDebtRepayment(state) * 30,
  );
  const founderValueChange = buybackQuote.founderStakeValueAfter - buybackQuote.founderStakeValueBefore;
  const governanceEfficiency = getGovernanceEfficiency(state);
  const monthlyPortfolioIncome = getEstimatedMonthlyPortfolioIncome(state);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Metric label="Kasse" value={formatCompactMoney(state.cash)} />
        <Metric label="Unternehmenswert" value={formatCompactMoney(state.valuation)} />
        <Metric
          label="Schulden"
          value={formatCompactMoney(state.debt)}
          detail={`${percent(annualInterestRate * 100)} Zins p. a.`}
        />
        <Metric label="Freier Kreditrahmen" value={formatCompactMoney(creditLimit)} />
        <Metric
          label="Kreditrating"
          value={rating}
          detail={`${Math.round(ratingScore)}/100 · ${state.employees.finance} Finanzprofis`}
        />
        <Metric
          label="Dividenden / Monat"
          value={formatCompactMoney(monthlyPortfolioIncome)}
          detail={`${state.lastMonthInvestmentIncome > 0 ? `${formatCompactMoney(state.lastMonthInvestmentIncome)} zuletzt` : "Noch keine Ausschüttung"}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            eyebrow="Fremdkapital"
            title="Kredit verwalten"
            description={`Neue Kredite laufen über fünf Spieljahre. Dabei werden täglich Zinsen und ein Teil der Restschuld bezahlt.`}
            action={<StatusBadge tone={ratingScore >= 52 ? "success" : "warning"}>Rating {rating}</StatusBadge>}
          />
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            {creditPresets.map((share) => {
              const preset = Math.max(
                1_000,
                Math.floor((creditLimit * share) / 1_000) * 1_000,
              );
              return (
              <button
                key={share}
                type="button"
                aria-pressed={amount === preset}
                onClick={() => setCreditAmount(String(preset))}
                className={`rounded-lg px-2 py-2 font-mono text-[0.68rem] transition-colors ${
                  amount === preset
                    ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                }`}
              >
                {formatCompactMoney(preset)}
              </button>
              );
            })}
          </div>
          <label className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-[0.65rem] text-slate-500">Eigener Kreditbetrag</span>
            <span className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={Math.floor(creditLimit)}
                step={1_000}
                value={creditAmount}
                onChange={(event) => setCreditAmount(event.target.value)}
                className="h-8 w-36 rounded-md border border-slate-300 px-2 text-right font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                aria-label="Kreditbetrag in Euro"
              />
              <span className="text-xs text-slate-500">€</span>
            </span>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric
              label="Neue Zinsen / Monat"
              value={formatCompactMoney((amount * annualInterestRate) / 12)}
            />
            <Metric
              label="Neue Tilgung / Monat"
              value={formatCompactMoney((amount / LOAN_TERM_DAYS) * 30)}
              detail={state.debt > 0 ? `Aktuell ${formatCompactMoney(existingMonthlyPrincipal)}` : "Laufzeit 5 Jahre"}
            />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <ActionButton
              disabled={amount <= 0 || amount > creditLimit}
              onClick={() => dispatch({ type: "BORROW", amount })}
            >
              Aufnehmen
            </ActionButton>
            <ActionButton
              variant="secondary"
              disabled={amount <= 0 || state.debt <= 0 || state.cash <= 0}
              onClick={() =>
                dispatch({
                  type: "REPAY",
                  amount: Math.min(amount, state.debt, state.cash),
                })
              }
            >
              Betrag tilgen
            </ActionButton>
            <ActionButton
              variant="secondary"
              disabled={state.debt <= 0 || state.cash < state.debt}
              onClick={() => dispatch({ type: "REPAY", amount: state.debt })}
            >
              Alles tilgen
            </ActionButton>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow="Eigenkapital"
            title="Eigene Aktien steuern"
            description="Neue Aktien bringen Kapital, verwässern aber deine Kontrolle. Rückkäufe erhöhen deinen Anteil und stärken den Kurs."
            action={
              <StatusBadge
                tone={control.vulnerable ? "warning" : "success"}
                dot
              >
                {percent(control.percentage)}
              </StatusBadge>
            }
          />
          <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            {[0.01, 0.05, 0.1, 0.2].map((share) => (
              <button
                key={share}
                type="button"
                aria-pressed={equityPercent === share}
                onClick={() => setEquityPercent(share)}
                className={`rounded-lg px-2 py-2 font-mono text-[0.68rem] transition-colors ${
                  equityPercent === share
                    ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                }`}
              >
                {percent(share * 100, 0)}
              </button>
            ))}
          </div>
          <label className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-[0.65rem] text-slate-500">Eigener Prozentsatz</span>
            <span className="flex items-center gap-1.5">
              <input
                type="number"
                min={0.1}
                max={50}
                step={0.1}
                value={Number((equityPercent * 100).toFixed(1))}
                onChange={(event) => setEquityPercent(Math.min(0.5, Math.max(0.001, Number(event.target.value) / 100 || 0.001)))}
                className="h-8 w-24 rounded-md border border-slate-300 px-2 text-right font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                aria-label="Prozentsatz für Aktienausgabe oder Rückkauf"
              />
              <span className="text-xs text-slate-500">%</span>
            </span>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="Gründerkontrolle" value={control.label} detail={`${percent(control.percentage)} Stimmrechte`} />
            <Metric label="Entscheidungstempo" value={percent(governanceEfficiency * 100, 0)} detail="Wirkt auf Organisation, Forschung und Vertrieb" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700">Aktien ausgeben</p>
              <p className="mt-1 font-mono text-sm text-emerald-700">
                +{formatCompactMoney(issueQuote.proceeds)}
              </p>
              <div className="mt-2 space-y-1 text-[0.62rem] text-slate-500">
                <p>Gründeranteil {percent(control.percentage)} → {percent(issueQuote.postTransactionOwnership)}</p>
                <p>Kurs {formatMoney(state.sharePrice)} → ca. {formatMoney(issueQuote.estimatedSharePrice)}</p>
                <p>{issueQuote.shares.toLocaleString("de-DE")} neue Aktien</p>
                <p className="text-amber-700">Emissionsabschlag {percent(issueQuote.discount * 100)}</p>
              </div>
              <ActionButton
                className="mt-3"
                size="sm"
                fullWidth
                onClick={() =>
                  dispatch({ type: "ISSUE_SHARES", percent: equityPercent })
                }
              >
                Aktien ausgeben
              </ActionButton>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700">Aktien zurückkaufen</p>
              <p className="mt-1 font-mono text-sm text-rose-700">
                −{formatCompactMoney(buybackQuote.cost)}
              </p>
              <div className="mt-2 space-y-1 text-[0.62rem] text-slate-500">
                <p>Gründeranteil {percent(control.percentage)} → {percent(buybackQuote.postTransactionOwnership)}</p>
                <p>Kurs {formatMoney(state.sharePrice)} → ca. {formatMoney(buybackQuote.estimatedSharePrice)}</p>
                <p className="text-amber-700">Rückkaufprämie {percent(buybackQuote.premium * 100)}</p>
                <p className={founderValueChange >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  Wert deines Anteils {founderValueChange >= 0 ? "+" : ""}{formatCompactMoney(founderValueChange)}
                </p>
              </div>
              <ActionButton
                className="mt-3"
                size="sm"
                fullWidth
                variant="secondary"
                disabled={buybackQuote.shares <= 0 || state.cash < buybackQuote.cost}
                onClick={() =>
                  dispatch({ type: "BUYBACK_SHARES", percent: equityPercent })
                }
              >
                Zurückkaufen
              </ActionButton>
            </div>
          </div>
        </Panel>
      </div>

    </div>
  );
}

export function SimpleCompanySection({ state, dispatch }: SimpleSectionProps) {
  const [tab, setTab] = useState<CompanyTab>("production");

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Unternehmen"
        title="Betrieb steuern"
        description="Plane Stückzahlen, erweitere Fabrik und Lager und stelle das passende Team ein."
        action={
          <StatusBadge tone={state.cash >= 0 ? "success" : "danger"} dot>
            {formatCompactMoney(state.cash)} verfügbar
          </StatusBadge>
        }
      />
      <Tabs
        items={companyTabs}
        value={tab}
        onChange={setTab}
        label="Unternehmensbereiche"
      />
      {tab === "team" ? <TeamPanel state={state} dispatch={dispatch} /> : null}
      {tab === "production" ? (
        <ProductionPanel state={state} dispatch={dispatch} />
      ) : null}
    </div>
  );
}

export function SimpleMarketingSection({ state, dispatch }: SimpleSectionProps) {
  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Nachfrage & Marke"
        title="Marketing"
        description="Steigere Nachfrage und Markenwert mit Team, Tagesbudget und zeitlich begrenzten Kampagnen."
        action={<StatusBadge tone="warning" dot>{formatCompactMoney(getDailyMarketingCost(state))} / Tag</StatusBadge>}
      />
      <MarketingPanel state={state} dispatch={dispatch} />
    </div>
  );
}

function StockCard({
  company,
  state,
  dispatch,
  orderSize,
}: SimpleSectionProps & {
  company: CompetitorState;
  orderSize: number;
}) {
  const chartHistory = company.priceHistory.slice(-90);
  const chartValues = chartHistory.length > 1
    ? chartHistory.map((point) => point.close)
    : company.history.slice(-30);
  const chartLabels = chartHistory.length > 1
    ? chartHistory.map((point) => `Tag ${point.day}`)
    : chartValues.map((_, index) => index === chartValues.length - 1 ? "Heute" : `−${chartValues.length - index - 1} T`);
  const previousPrice = chartValues[0] ?? company.price;
  const periodChange =
    previousPrice > 0
      ? ((company.price - previousPrice) / previousPrice) * 100
      : 0;
  const upside =
    company.price > 0
      ? ((company.fairValue - company.price) / company.price) * 100
      : 0;
  const buyQuote = getStockTradeQuote(company, orderSize, "buy");
  const sellQuote = getStockTradeQuote(
    company,
    Math.min(orderSize, company.ownedShares),
    "sell",
  );
  const holdingValue = company.ownedShares * company.price;
  const costBasis = company.ownedShares * company.averageCost;
  const openProfit = holdingValue - costBasis;
  const openProfitPercent = costBasis > 0 ? (openProfit / costBasis) * 100 : 0;
  const holdingPercent =
    (company.ownedShares / Math.max(1, company.sharesOutstanding)) * 100;
  const periodHigh = Math.max(company.price, ...chartValues);
  const periodLow = Math.min(company.price, ...chartValues);
  const trendColor = periodChange >= 0 ? "#16a34a" : "#dc2626";
  const monthlyDividend = getEstimatedMonthlyDividend(company);

  return (
    <Panel padding="none" className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl text-[0.65rem] font-bold"
            style={{
              color: company.color,
              backgroundColor: `${company.color}16`,
            }}
          >
            {company.ticker}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">
              {company.name}
            </h3>
            <p className="mt-0.5 text-[0.64rem] text-slate-500">
              {company.sector}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-semibold text-slate-900">
            {formatMoney(company.price, 2)}
          </p>
          <p
            className={`mt-1 font-mono text-[0.62rem] ${
              periodChange >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
            title="Kursentwicklung der letzten 90 Tage"
          >
            {periodChange >= 0 ? "+" : ""}
            {percent(periodChange, 2)}
          </p>
        </div>
      </div>

      <div className="px-3 pb-3">
        <StockPriceChart
          ariaLabel={`Fundamentaler 90-Tage-Aktienchart von ${company.name}`}
          labels={chartLabels}
          values={chartValues}
          fairValue={company.fairValue}
          color={trendColor}
        />
        <div className="mt-1.5 flex flex-wrap justify-between gap-2 font-mono text-[0.58rem] text-slate-500">
          <span>90T Tief {formatMoney(periodLow, 2)}</span>
          <span><i className="mr-1 inline-block w-3 border-t border-dashed border-blue-600" />Fairer Wert</span>
          <span>90T Hoch {formatMoney(periodHigh, 2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-y border-slate-200 bg-slate-200 sm:grid-cols-3 xl:grid-cols-6">
        <div className="bg-white p-2.5">
          <p className="text-[0.55rem] text-slate-600 uppercase">Umsatz</p>
          <p className="mt-1 font-mono text-[0.68rem] text-slate-700">
            {formatCompactMoney(company.revenue)}
          </p>
        </div>
        <div className="bg-white p-2.5">
          <p className="text-[0.55rem] text-slate-600 uppercase">Deine Dividende</p>
          <p className="mt-1 font-mono text-[0.68rem] text-emerald-700">
            {formatCompactMoney(monthlyDividend)} / Monat
          </p>
        </div>
        <div className="bg-white p-2.5">
          <p className="text-[0.55rem] text-slate-600 uppercase">90T Rendite</p>
          <p className={`mt-1 font-mono text-[0.68rem] ${periodChange >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {periodChange >= 0 ? "+" : ""}{percent(periodChange)}
          </p>
        </div>
        <div className="bg-white p-2.5">
          <p className="text-[0.55rem] text-slate-600 uppercase">Marge</p>
          <p className="mt-1 font-mono text-[0.68rem] text-slate-700">
            {percent(company.profitMargin * 100)}
          </p>
        </div>
        <div className="bg-white p-2.5">
          <p className="text-[0.55rem] text-slate-600 uppercase">Wachstum</p>
          <p
            className={`mt-1 font-mono text-[0.68rem] ${
              company.growth >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {company.growth >= 0 ? "+" : ""}
            {percent(company.growth * 100)}
          </p>
        </div>
        <div className="bg-white p-2.5">
          <p className="text-[0.55rem] text-slate-600 uppercase">Finanzstabilität</p>
          <p className={`mt-1 font-mono text-[0.68rem] ${(company.financialHealth ?? 100) < 35 ? "text-rose-700" : "text-slate-700"}`}>
            {Math.round(company.financialHealth ?? 100)} / 100
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">Fundamentaler Wert</span>
          <span className={upside >= 0 ? "text-blue-600" : "text-amber-700"}>
            {formatMoney(company.fairValue, 2)} · {upside >= 0 ? "+" : ""}
            {percent(upside)}
          </span>
        </div>
        <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[0.65rem] leading-4 text-slate-500">
          {company.lastReason}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.58rem] text-slate-600 uppercase">Dein Bestand</p>
            <p className="mt-1 font-mono text-xs text-slate-700">
              {company.ownedShares.toLocaleString("de-DE")} · {formatCompactMoney(holdingValue)}
            </p>
            {company.ownedShares > 0 ? (
              <div className="mt-1 space-y-0.5 text-[0.58rem]">
                <p className="text-blue-600">{percent(holdingPercent, 3)} am Unternehmen</p>
                <p className={openProfit >= 0 ? "text-emerald-700" : "text-rose-700"}>
                  Offen: {openProfit >= 0 ? "+" : ""}{formatCompactMoney(openProfit)} · {openProfitPercent >= 0 ? "+" : ""}{percent(openProfitPercent)}
                </p>
                <p className="text-slate-500">Ø Einstand {formatMoney(company.averageCost, 2)}</p>
              </div>
            ) : null}
          </div>
          <p className="text-right text-[0.6rem] text-slate-600">
            Orderwert
            <br />
            <span className="font-mono text-slate-600">
              {formatCompactMoney(buyQuote.total)}
            </span>
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ActionButton
            size="sm"
            disabled={orderSize <= 0 || state.cash < buyQuote.total}
            onClick={() =>
              dispatch({
                type: "BUY_STOCK",
                competitorId: company.id,
                shares: orderSize,
              })
            }
          >
            Kaufen
          </ActionButton>
          <ActionButton
            size="sm"
            variant="secondary"
            disabled={orderSize <= 0 || company.ownedShares < orderSize}
            onClick={() =>
              dispatch({
                type: "SELL_STOCK",
                competitorId: company.id,
                shares: orderSize,
              })
            }
          >
            Verkaufen
          </ActionButton>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[0.58rem] text-slate-500">
          <span>Kaufkurs {formatMoney(buyQuote.executionPrice, 2)} · Einfluss +{percent(buyQuote.priceImpact * 100)}</span>
          <span>Verkaufskurs {formatMoney(sellQuote.executionPrice, 2)} · Einfluss −{percent(sellQuote.priceImpact * 100)}</span>
        </div>
        {company.ownedShares > 0 ? (
          <ActionButton
            className="mt-2"
            size="sm"
            variant="ghost"
            fullWidth
            onClick={() => dispatch({ type: "SELL_STOCK", competitorId: company.id, shares: company.ownedShares })}
          >
            Gesamte Position verkaufen
          </ActionButton>
        ) : null}
        {company.realizedProfit !== 0 ? (
          <p className={`mt-2 text-center text-[0.62rem] ${company.realizedProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            Realisierter Gewinn: {company.realizedProfit >= 0 ? "+" : ""}{formatCompactMoney(company.realizedProfit)}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

function StocksPanel({ state, dispatch }: SimpleSectionProps) {
  const [orderSize, setOrderSize] = useState(1_000);
  const [showAll, setShowAll] = useState(false);
  const activeCompetitors = state.competitors
    .filter((competitor) => competitor.status === "active")
    .sort(
      (left, right) =>
        left.price * left.sharesOutstanding -
        right.price * right.sharesOutstanding,
    );
  const bankruptCompetitors = state.competitors.filter(
    (competitor) => competitor.status === "bankrupt",
  );
  const visibleCompetitors = showAll
    ? activeCompetitors
    : activeCompetitors.slice(0, 6);
  const portfolioValue = getPortfolioValue(state);
  const portfolioCost = getPortfolioCostBasis(state);
  const openProfit = getPortfolioUnrealizedProfit(state);
  const realizedProfit = getPortfolioRealizedProfit(state);
  const portfolioReturn = portfolioCost > 0 ? (openProfit / portfolioCost) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Metric label="Portfolio" value={formatCompactMoney(portfolioValue)} />
        <Metric
          label="Offener Gewinn"
          value={<span className={openProfit >= 0 ? "text-emerald-700" : "text-rose-700"}>{openProfit >= 0 ? "+" : ""}{formatCompactMoney(openProfit)}</span>}
          detail={`${portfolioReturn >= 0 ? "+" : ""}${percent(portfolioReturn)}`}
        />
        <Metric
          label="Realisierter Gewinn"
          value={<span className={realizedProfit >= 0 ? "text-emerald-700" : "text-rose-700"}>{realizedProfit >= 0 ? "+" : ""}{formatCompactMoney(realizedProfit)}</span>}
        />
        <Metric label="Kasse" value={formatCompactMoney(state.cash)} />
        <Metric label="Eigene Aktie" value={formatMoney(state.sharePrice, 2)} />
        <Metric label="Bewertung" value={formatCompactMoney(state.valuation)} />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-700">Ordergröße</p>
          <p className="mt-0.5 text-[0.64rem] text-slate-500">
            Gilt für alle Kauf- und Verkaufsbuttons.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <label className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Stück</span>
            <input
              type="number"
              min={1}
              max={100_000_000}
              step={1}
              value={orderSize || ""}
              onChange={(event) =>
                setOrderSize(Math.min(100_000_000, Math.max(0, Math.floor(Number(event.target.value) || 0))))
              }
              className="h-9 w-40 rounded-lg border border-slate-300 bg-white px-3 text-right font-mono text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Anzahl der Aktien"
            />
          </label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            {[1_000, 10_000, 100_000].map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={orderSize === size}
                onClick={() => setOrderSize(size)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs ${
                  orderSize === size
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {size.toLocaleString("de-DE")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeCompetitors.length ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {visibleCompetitors.map((company) => (
              <StockCard
                key={company.id}
                company={company}
                state={state}
                dispatch={dispatch}
                orderSize={orderSize}
              />
            ))}
          </div>
          {activeCompetitors.length > 6 ? (
            <div className="flex justify-center">
              <ActionButton
                variant="secondary"
                onClick={() => setShowAll((current) => !current)}
              >
                {showAll
                  ? "Große Unternehmen ausblenden"
                  : `${activeCompetitors.length - 6} weitere Unternehmen anzeigen`}
              </ActionButton>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          compact
          icon={<Icon name="stocks" size={18} />}
          title="Keine börsennotierten Rivalen mehr"
          description="Alle beobachteten Unternehmen wurden bereits integriert."
        />
      )}
      {bankruptCompetitors.length ? (
        <Panel>
          <PanelHeader
            eyebrow="Insolvenzen"
            title="Ausgeschiedene Unternehmen"
            description="Aktien insolventer Unternehmen sind wertlos. Ein investierter Einstand bleibt als vollständiger Verlust sichtbar."
          />
          <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200">
            {bankruptCompetitors.map((company) => (
              <div key={company.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{company.name} · {company.ticker}</p>
                  <p className="mt-0.5 text-[0.65rem] text-slate-500">{company.lastReason}</p>
                </div>
                <div className="text-left sm:text-right">
                  <StatusBadge tone="danger">Insolvent · 0,00 €</StatusBadge>
                  {company.ownedShares > 0 ? (
                    <p className="mt-1 text-[0.62rem] text-rose-700">
                      Verlust: −{formatCompactMoney(company.ownedShares * company.averageCost)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function DealsPanel({ state, dispatch }: SimpleSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const control = getCompanyControl(state);
  const activeCompetitors = state.competitors
    .filter((competitor) => competitor.status === "active")
    .sort(
      (left, right) =>
        getAcquisitionPrice(left) - getAcquisitionPrice(right),
    );
  const visibleCompetitors = showAll
    ? activeCompetitors
    : activeCompetitors.slice(0, 6);
  const completedCompetitors = state.competitors.filter(
    (competitor) => competitor.status === "acquired" || competitor.status === "merged",
  );

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.64rem] font-semibold tracking-[0.14em] text-blue-600/75 uppercase">
              Deal-Spielraum
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">
              {control.label} · {percent(control.percentage)}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Fusionen benötigen mindestens 33,4 % Gründeranteil. Über 60 % kombiniertem Marktanteil blockiert das Kartellrecht.
            </p>
          </div>
          <StatusBadge tone="success" dot>Eigene Firma geschützt</StatusBadge>
        </div>
      </Panel>

      {activeCompetitors.length ? (
        <>
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleCompetitors.map((company) => {
            const acquisitionPrice = getAcquisitionPrice(company);
            const merger = getMergerTerms(state, company);
            const antitrustBlocked =
              state.marketShare + company.marketShare > 60;
            const mergerBlocked =
              !merger ||
              control.percentage < 33.4 ||
              state.cash < merger.cashCost ||
              antitrustBlocked;

            return (
              <Panel key={company.id} padding="none" className="overflow-hidden">
                <div className="border-b border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-[0.65rem] font-bold"
                        style={{
                          color: company.color,
                          backgroundColor: `${company.color}16`,
                        }}
                      >
                        {company.ticker}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {company.name}
                        </h3>
                        <p className="mt-0.5 text-[0.64rem] text-slate-500">
                          {company.sector}
                        </p>
                      </div>
                    </div>
                    <StatusBadge tone="info">
                      {percent(company.marketShare)} Markt
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {company.description}
                  </p>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Metric
                      label="Kaufpreis"
                      value={formatCompactMoney(acquisitionPrice)}
                    />
                    <Metric
                      label="Marge"
                      value={percent(company.profitMargin * 100)}
                    />
                    <Metric
                      label="Dein Bestand"
                      value={percent(
                        (company.ownedShares /
                          Math.max(1, company.sharesOutstanding)) *
                          100,
                        2,
                      )}
                    />
                  </div>
                  <div className="mt-3 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.035] p-3">
                    <p className="text-[0.58rem] font-semibold text-emerald-800/60 uppercase">
                      Synergie
                    </p>
                    <p className="mt-1 text-[0.68rem] leading-4 text-emerald-100/70">
                      {company.acquisitionPerk}
                    </p>
                  </div>

                  {antitrustBlocked ? (
                    <p className="mt-3 rounded-lg bg-amber-300/[0.07] px-2.5 py-2 text-[0.66rem] text-amber-800">
                      Kartellrecht blockiert: zusammen wären es {percent(state.marketShare + company.marketShare)} Marktanteil.
                    </p>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <ActionButton
                      size="sm"
                      disabled={antitrustBlocked || state.cash < acquisitionPrice}
                      onClick={() =>
                        dispatch({
                          type: "ACQUIRE_COMPETITOR",
                          competitorId: company.id,
                        })
                      }
                    >
                      Übernehmen
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="secondary"
                      disabled={mergerBlocked}
                      onClick={() =>
                        dispatch({
                          type: "MERGE_COMPETITOR",
                          competitorId: company.id,
                        })
                      }
                    >
                      Fusionieren
                    </ActionButton>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[0.58rem] leading-4 text-slate-600">
                    <p>100 % Cash · kein Kontrollverlust</p>
                    <p>
                      {merger
                        ? `${formatCompactMoney(merger.cashCost)} Cash · danach ${percent(merger.postMergerOwnership)}`
                        : "Fusion nicht verfügbar"}
                    </p>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
        {activeCompetitors.length > 6 ? (
          <div className="flex justify-center">
            <ActionButton
              variant="secondary"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll
                ? "Große Ziele ausblenden"
                : `${activeCompetitors.length - 6} weitere Ziele anzeigen`}
            </ActionButton>
          </div>
        ) : null}
        </>
      ) : (
        <EmptyState
          compact
          icon={<Icon name="check" size={18} />}
          title="Keine offenen Übernahmeziele"
          description="Der beobachtete Markt ist bereits konsolidiert."
        />
      )}

      {completedCompetitors.length ? (
        <Panel>
          <PanelHeader title="Abgeschlossene Deals" />
          <div className="mt-3 flex flex-wrap gap-2">
            {completedCompetitors.map((company) => (
              <StatusBadge key={company.id} tone="success" dot>
                {company.name} · {company.status === "merged" ? "fusioniert" : "übernommen"}
              </StatusBadge>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

export function SimpleMarketSection({ state, dispatch }: SimpleSectionProps) {
  const [tab, setTab] = useState<MarketTab>("finance");

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Kapitalmarkt"
        title="Markt & Konkurrenz"
        description="Kurse folgen Umsatz, Marge, Wachstum, Schulden und Innovation – nicht dem Zufall."
        action={
          <StatusBadge tone="info" dot>
            {state.competitors.filter((company) => company.status === "active").length} Unternehmen
          </StatusBadge>
        }
      />
      <Tabs
        items={marketTabs}
        value={tab}
        onChange={setTab}
        label="Marktbereiche"
      />
      {tab === "finance" ? (
        <FinancePanel state={state} dispatch={dispatch} />
      ) : tab === "stocks" ? (
        <StocksPanel state={state} dispatch={dispatch} />
      ) : (
        <DealsPanel state={state} dispatch={dispatch} />
      )}
    </div>
  );
}
