"use client";

import type { Dispatch } from "react";

import {
  CAMPAIGNS,
  DAYS_PER_MONTH,
  DEPARTMENTS,
  PRODUCT_BLUEPRINTS,
} from "../game/data";
import type {
  DepartmentId,
  GameAction,
  GameState,
  MarketingStrategy,
  ProductCategory,
} from "../game/types";
import {
  ActionButton,
  EmptyState,
  MetricCard,
  Panel,
  PanelHeader,
  ProgressBar,
  SectionTitle,
  StatusBadge,
} from "./game-ui";
import { DonutGauge, StatRow } from "./game-widgets";
import { Icon, type IconName } from "./icons";

export interface OperationsSectionProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const moneyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const integerFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

const productBlueprintById = new Map(
  PRODUCT_BLUEPRINTS.map((blueprint) => [blueprint.id, blueprint]),
);

const productIcons: Record<ProductCategory, IconName> = {
  computer: "monitor",
  phone: "phone",
  components: "cpu",
  software: "cloud",
};

const departmentIds = Object.keys(DEPARTMENTS) as DepartmentId[];

const departmentPresentation: Record<
  DepartmentId,
  {
    icon: IconName;
    accent: string;
    iconClass: string;
    effect: string;
  }
> = {
  production: {
    icon: "production",
    accent: "border-emerald-300/15 bg-emerald-300/[0.035]",
    iconClass: "bg-emerald-300/10 text-emerald-300",
    effect:
      "Mehr Hände erhöhen den Tagesausstoß; Abteilungslevel verbessern die Kapazität pro Kopf.",
  },
  research: {
    icon: "research",
    accent: "border-violet-300/15 bg-violet-300/[0.035]",
    iconClass: "bg-violet-300/10 text-violet-300",
    effect:
      "Erzeugt laufend Forschungspunkte; höhere Level machen jedes Talent produktiver.",
  },
  marketing: {
    icon: "marketing",
    accent: "border-amber-300/15 bg-amber-300/[0.035]",
    iconClass: "bg-amber-300/10 text-amber-300",
    effect:
      "Verstärkt Markenaufbau und Nachfrage aus dem laufenden Marketingbudget.",
  },
  sales: {
    icon: "briefcase",
    accent: "border-sky-300/15 bg-sky-300/[0.035]",
    iconClass: "bg-sky-300/10 text-sky-300",
    effect:
      "Wandelt vorhandene Nachfrage in Verkäufe und verlässliche Händlerbeziehungen um.",
  },
  finance: {
    icon: "finance",
    accent: "border-yellow-300/15 bg-yellow-300/[0.035]",
    iconClass: "bg-yellow-300/10 text-yellow-300",
    effect:
      "Stärkt Finanzierung, Bewertung und rechtliche Kontrolle bei Wachstum und Deals.",
  },
};

const marketingStrategies: Array<{
  id: MarketingStrategy;
  name: string;
  kicker: string;
  description: string;
  costMultiplier: number;
  icon: IconName;
}> = [
  {
    id: "efficient",
    name: "Effizient",
    kicker: "0,82× Budget",
    description: "Präzise Kanäle, ruhiges Wachstum und maximale Reichweite je Euro.",
    costMultiplier: 0.82,
    icon: "target",
  },
  {
    id: "balanced",
    name: "Ausgewogen",
    kicker: "1,00× Budget",
    description: "Ein belastbarer Mix aus Markenpflege, Handel und Produktwerbung.",
    costMultiplier: 1,
    icon: "activity",
  },
  {
    id: "aggressive",
    name: "Aggressiv",
    kicker: "1,42× Budget",
    description: "Maximale Sichtbarkeit für Launches – schnell, teuer und druckvoll.",
    costMultiplier: 1.42,
    icon: "bolt",
  },
];

function formatMoney(value: number) {
  return moneyFormatter.format(Math.round(value));
}

function formatInteger(value: number) {
  return integerFormatter.format(Math.round(value));
}

function formatPercent(value: number, fractionDigits = 0) {
  return `${value.toLocaleString("de-DE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })} %`;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function factoryUpgradeCost(level: number) {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(120_000 * 1.85 ** Math.max(0, level - 1)));
}

function automationUpgradeCost(level: number) {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(95_000 * 1.75 ** Math.max(0, level)));
}

function departmentUpgradeCost(level: number) {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(60_000 * 1.7 ** Math.max(0, level - 1)));
}

function getStrategy(strategy: MarketingStrategy) {
  return (
    marketingStrategies.find((item) => item.id === strategy) ??
    marketingStrategies[1]
  );
}

export function ProductionSection({
  state,
  dispatch,
}: OperationsSectionProps) {
  const activeProducts = state.products.filter((product) => product.active);
  const totalInventory = activeProducts.reduce(
    (sum, product) => sum + product.inventory,
    0,
  );
  const dailyOutput = activeProducts.reduce(
    (sum, product) => sum + product.lastProduction,
    0,
  );
  const dailySales = activeProducts.reduce(
    (sum, product) => sum + product.lastSales,
    0,
  );
  const productionEmployees = state.employees.production;
  const productionDepartmentLevel = state.departmentLevels.production;
  const leanBonus = state.unlockedTech.includes("lean-fabs") ? 1.15 : 1;
  const employeeThroughput =
    productionEmployees * (3.5 + productionDepartmentLevel * 0.75);
  const factoryMultiplier = 1 + Math.max(0, state.factoryLevel - 1) * 0.55;
  const automationMultiplier = 1 + state.automationLevel * 0.22;
  const estimatedCapacity = Math.max(
    0,
    Math.round(
      (employeeThroughput * factoryMultiplier * automationMultiplier * leanBonus) /
        Math.max(0.7, state.qualityFocus),
    ),
  );
  const utilization =
    estimatedCapacity > 0
      ? clamp((dailyOutput / estimatedCapacity) * 100)
      : 0;
  const sellThrough =
    dailyOutput + totalInventory > 0
      ? clamp((dailySales / Math.max(1, dailyOutput)) * 100)
      : 0;
  const nextFactoryCost = factoryUpgradeCost(state.factoryLevel);
  const nextAutomationCost = automationUpgradeCost(state.automationLevel);
  const roboticAssemblyUnlocked = state.unlockedTech.includes(
    "robotic-assembly",
  );
  const automationRequirement =
    state.automationLevel >= 4 && !state.unlockedTech.includes("nanometer-chips")
      ? "Nanometer-Fertigung"
      : state.automationLevel >= 2 && !state.unlockedTech.includes("lean-fabs")
        ? "Lean-Fertigung"
        : state.automationLevel >= 1 && !roboticAssemblyUnlocked
          ? "Robotische Montage"
          : null;
  const automationTechLocked = Boolean(automationRequirement);
  const qualityLabel =
    state.qualityFocus < 0.9
      ? "Mengenfokus"
      : state.qualityFocus > 1.1
        ? "Premiumfokus"
        : "Ausbalanciert";

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Operations"
        title="Produktion"
        description="Kapazität, Bestände und Qualitätsanspruch in einem belastbaren Fertigungssystem ausbalancieren."
        action={
          <StatusBadge
            tone={utilization > 90 ? "warning" : "success"}
            dot
          >
            {utilization > 90 ? "Kapazität eng" : "Betrieb stabil"}
          </StatusBadge>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Tageskapazität"
          value={`≈ ${formatInteger(estimatedCapacity)}`}
          detail="Einheiten pro Tag"
          icon={<Icon name="production" size={17} />}
          tone="cyan"
        />
        <MetricCard
          label="Auslastung"
          value={formatPercent(utilization)}
          detail={`${formatInteger(dailyOutput)} Einheiten heute`}
          icon={<Icon name="activity" size={17} />}
          tone={utilization > 90 ? "amber" : "green"}
        />
        <MetricCard
          label="Lagerbestand"
          value={formatInteger(totalInventory)}
          detail={`${activeProducts.length} aktive Produktlinien`}
          icon={<Icon name="products" size={17} />}
        />
        <MetricCard
          label="Tagesabsatz"
          value={formatInteger(dailySales)}
          detail={`${formatPercent(sellThrough)} des Tagesausstoßes`}
          icon={<Icon name="trendUp" size={17} />}
          tone="green"
        />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
        <Panel className="min-w-0">
          <PanelHeader
            eyebrow="Live-Fertigung"
            title="Produktlinien"
            description="Ausstoß, Lager und Nachfrage der aktuell produzierten Geräte."
            action={
              <StatusBadge tone="info">
                {activeProducts.length} Linien
              </StatusBadge>
            }
          />

          {activeProducts.length ? (
            <div className="mt-4 space-y-2.5">
              {activeProducts.map((product) => {
                const blueprint = productBlueprintById.get(product.blueprintId);
                const demandCoverage =
                  product.lastDemand > 0
                    ? clamp((product.lastProduction / product.lastDemand) * 100)
                    : 0;
                const category = blueprint?.category ?? "computer";

                return (
                  <article
                    key={product.id}
                    className="rounded-xl border border-white/[0.065] bg-white/[0.022] p-3.5 transition-colors hover:border-white/10"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan-300/10 bg-cyan-300/[0.06] text-cyan-300">
                        <Icon name={productIcons[category]} size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-100">
                              {product.name}
                            </h3>
                            <p className="mt-0.5 text-[0.65rem] text-slate-500">
                              {blueprint?.tagline ?? "Aktive Produktlinie"}
                            </p>
                          </div>
                          <StatusBadge
                            tone={
                              product.inventory > product.lastDemand * 4
                                ? "warning"
                                : "success"
                            }
                            dot
                          >
                            {product.inventory > product.lastDemand * 4
                              ? "Überbestand"
                              : "In Fertigung"}
                          </StatusBadge>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {[
                            ["Output", product.lastProduction],
                            ["Absatz", product.lastSales],
                            ["Lager", product.inventory],
                          ].map(([label, value]) => (
                            <div
                              key={String(label)}
                              className="rounded-lg bg-black/15 px-2.5 py-2"
                            >
                              <p className="text-[0.58rem] tracking-[0.08em] text-slate-600 uppercase">
                                {label}
                              </p>
                              <p className="mt-1 font-mono text-xs font-semibold text-slate-200 tabular-nums">
                                {formatInteger(Number(value))}
                              </p>
                            </div>
                          ))}
                        </div>
                        <ProgressBar
                          className="mt-3"
                          value={demandCoverage}
                          label="Nachfrageabdeckung"
                          valueLabel={formatPercent(demandCoverage)}
                          tone={demandCoverage < 75 ? "amber" : "green"}
                          size="sm"
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              className="mt-4"
              title="Keine aktive Produktlinie"
              description="Entwickle und starte ein Produkt, damit die Fertigung anlaufen kann."
              icon={<Icon name="production" size={19} />}
            />
          )}
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelHeader
              eyebrow="Infrastruktur"
              title="Werk & Automatisierung"
              description="Kapital bindet sich langfristig, hebt aber deine skalierbare Kapazität."
            />

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/[0.065] bg-white/[0.022] p-3.5">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-cyan-300/[0.08] text-cyan-300">
                    <Icon name="building" size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-100">
                        Fabrik Stufe {state.factoryLevel}
                      </h3>
                      <span className="font-mono text-xs text-slate-300 tabular-nums">
                        {formatMoney(nextFactoryCost)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Mehr Linienfläche, Logistik und belastbare Versorgung.
                    </p>
                    <ActionButton
                      className="mt-3"
                      size="sm"
                      variant="secondary"
                      leadingIcon={<Icon name="arrowUpRight" size={14} />}
                      disabled={state.cash < nextFactoryCost}
                      title={
                        state.cash < nextFactoryCost
                          ? "Nicht genügend Liquidität"
                          : undefined
                      }
                      onClick={() => dispatch({ type: "UPGRADE_FACTORY" })}
                    >
                      Auf Stufe {state.factoryLevel + 1} ausbauen
                    </ActionButton>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.065] bg-white/[0.022] p-3.5">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-300/[0.08] text-violet-300">
                    <Icon name="production" size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-100">
                        Automation Stufe {state.automationLevel}
                      </h3>
                      <span className="font-mono text-xs text-slate-300 tabular-nums">
                        {formatMoney(nextAutomationCost)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Standardisierte Abläufe erhöhen den Ausstoß pro Mitarbeitendem.
                    </p>
                    {automationTechLocked ? (
                      <div className="mt-2 flex items-center gap-2 text-[0.68rem] text-amber-300">
                        <Icon name="lock" size={13} />
                        {automationRequirement} erforschen
                      </div>
                    ) : null}
                    <ActionButton
                      className="mt-3"
                      size="sm"
                      variant="secondary"
                      leadingIcon={
                        <Icon
                          name={automationTechLocked ? "lock" : "arrowUpRight"}
                          size={14}
                        />
                      }
                      disabled={
                        automationTechLocked ||
                        state.cash < nextAutomationCost
                      }
                      title={
                        automationTechLocked
                          ? `Benötigt ${automationRequirement}`
                          : state.cash < nextAutomationCost
                            ? "Nicht genügend Liquidität"
                            : undefined
                      }
                      onClick={() => dispatch({ type: "UPGRADE_AUTOMATION" })}
                    >
                      Auf Stufe {state.automationLevel + 1} erhöhen
                    </ActionButton>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow="Qualitätssteuerung"
              title="Fertigungsfokus"
              description="Qualität kostet Durchsatz, stärkt aber Produkt und Reputation."
              action={
                <StatusBadge
                  tone={state.qualityFocus > 1.1 ? "violet" : "info"}
                >
                  {qualityLabel}
                </StatusBadge>
              }
            />
            <div className="mt-5">
              <div className="mb-2 flex items-end justify-between gap-4">
                <span className="text-xs text-slate-500">Menge</span>
                <strong className="font-mono text-lg text-slate-100 tabular-nums">
                  {formatPercent(state.qualityFocus * 100)}
                </strong>
                <span className="text-xs text-slate-500">Qualität</span>
              </div>
              <input
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-cyan-300 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111820]"
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={state.qualityFocus}
                onChange={(event) =>
                  dispatch({
                    type: "SET_QUALITY_FOCUS",
                    value: Number(event.currentTarget.value),
                  })
                }
                aria-label="Qualitätsfokus"
                aria-valuetext={`${formatPercent(state.qualityFocus * 100)} Qualitätsfokus`}
              />
              <div className="mt-2 flex justify-between font-mono text-[0.6rem] text-slate-600">
                <span>70 %</span>
                <span>100 %</span>
                <span>130 %</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export function PeopleSection({ state, dispatch }: OperationsSectionProps) {
  const employeeTotal = departmentIds.reduce(
    (sum, departmentId) => sum + state.employees[departmentId],
    0,
  );
  const dailyPayroll = departmentIds.reduce(
    (sum, departmentId) =>
      sum +
      state.employees[departmentId] * DEPARTMENTS[departmentId].salaryPerDay,
    0,
  );
  const monthlyPayroll = dailyPayroll * DAYS_PER_MONTH;
  const averageLevel =
    departmentIds.reduce(
      (sum, departmentId) => sum + state.departmentLevels[departmentId],
      0,
    ) / departmentIds.length;
  const moraleTone =
    state.morale >= 70 ? "#6ee7b7" : state.morale >= 45 ? "#fcd34d" : "#fda4af";

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Organisation"
        title="Personal"
        description="Die richtigen Teams, tragfähige Gehälter und gute Führung machen aus Technologie ein Unternehmen."
        action={
          <StatusBadge
            tone={
              state.morale >= 70
                ? "success"
                : state.morale >= 45
                  ? "warning"
                  : "danger"
            }
            dot
          >
            {state.morale >= 70
              ? "Team motiviert"
              : state.morale >= 45
                ? "Stimmung beobachten"
                : "Moral kritisch"}
          </StatusBadge>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Mitarbeitende"
          value={formatInteger(employeeTotal)}
          detail="über 5 Fachbereiche"
          icon={<Icon name="people" size={17} />}
          tone="cyan"
        />
        <MetricCard
          label="Gehaltskosten / Tag"
          value={formatMoney(dailyPayroll)}
          detail={`${formatMoney(monthlyPayroll)} pro Monat`}
          icon={<Icon name="wallet" size={17} />}
          tone="amber"
        />
        <MetricCard
          label="Team-Moral"
          value={formatPercent(state.morale)}
          detail={state.morale >= 70 ? "stabile Leistung" : "Produktivität unter Druck"}
          icon={<Icon name="activity" size={17} />}
          tone={state.morale >= 70 ? "green" : "amber"}
        />
        <MetricCard
          label="Ø Abteilungslevel"
          value={averageLevel.toLocaleString("de-DE", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          detail="Prozesse & Führung"
          icon={<Icon name="arrowUpRight" size={17} />}
          tone="violet"
        />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-4 lg:grid-cols-2">
          {departmentIds.map((departmentId) => {
            const definition = DEPARTMENTS[departmentId];
            const presentation = departmentPresentation[departmentId];
            const employees = state.employees[departmentId];
            const level = state.departmentLevels[departmentId];
            const upgradeCost = departmentUpgradeCost(level);
            const departmentPayroll = employees * definition.salaryPerDay;
            const hireCost = definition.salaryPerDay * 14;
            const fireCost = definition.salaryPerDay * 10;
            const canHire = state.cash >= hireCost;
            const canFire = employees > 0 && state.cash >= fireCost;

            return (
              <Panel
                key={departmentId}
                className={presentation.accent}
                aria-label={definition.name}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${presentation.iconClass}`}
                  >
                    <Icon name={presentation.icon} size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-slate-100">
                          {definition.name}
                        </h2>
                        <p className="mt-0.5 text-[0.65rem] text-slate-500">
                          Level {level}
                        </p>
                      </div>
                      <div className="flex items-center rounded-lg border border-white/[0.07] bg-black/15 p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({ type: "FIRE", department: departmentId })
                          }
                          disabled={!canFire}
                          className="grid size-8 place-items-center rounded-md text-slate-500 outline-none transition-colors hover:bg-white/[0.06] hover:text-rose-300 focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none"
                          aria-label={`Eine Person aus ${definition.name} entlassen`}
                          title={
                            employees <= 0
                              ? "Niemand in dieser Abteilung"
                              : state.cash < fireCost
                                ? `Abfindung von ${formatMoney(fireCost)} nicht finanzierbar`
                                : `Entlassen · ${formatMoney(fireCost)} Abfindung`
                          }
                        >
                          <Icon name="minus" size={14} />
                        </button>
                        <span
                          className="min-w-9 text-center font-mono text-sm font-semibold text-slate-100 tabular-nums"
                          aria-label={`${employees} Mitarbeitende`}
                        >
                          {employees}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({ type: "HIRE", department: departmentId })
                          }
                          disabled={!canHire}
                          className="grid size-8 place-items-center rounded-md text-slate-500 outline-none transition-colors hover:bg-white/[0.06] hover:text-emerald-300 focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none"
                          aria-label={`Eine Person für ${definition.name} einstellen`}
                          title={
                            canHire
                              ? `Einstellen: ${formatMoney(hireCost)} Recruiting + ${formatMoney(definition.salaryPerDay)} pro Tag`
                              : `Nicht genug Cash für ${formatMoney(hireCost)} Recruiting`
                          }
                        >
                          <Icon name="plus" size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-400">
                      {definition.description}
                    </p>
                    <p className="mt-2 text-[0.68rem] leading-4 text-slate-500">
                      {presentation.effect}
                    </p>

                    <div className="mt-4 border-t border-white/[0.06] pt-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[0.68rem]">
                        <span className="text-slate-500">
                          Payroll {formatMoney(departmentPayroll)}/Tag · Recruiting {formatMoney(hireCost)}
                        </span>
                        <span className="font-mono text-slate-300 tabular-nums">
                          Upgrade {formatMoney(upgradeCost)}
                        </span>
                      </div>
                      <ActionButton
                        size="sm"
                        variant="secondary"
                        leadingIcon={<Icon name="arrowUpRight" size={14} />}
                        disabled={state.cash < upgradeCost}
                        title={
                          state.cash < upgradeCost
                            ? "Nicht genügend Liquidität"
                            : undefined
                        }
                        onClick={() =>
                          dispatch({
                            type: "UPGRADE_DEPARTMENT",
                            department: departmentId,
                          })
                        }
                      >
                        Auf Level {level + 1}
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>

        <Panel className="h-fit 2xl:sticky 2xl:top-6">
          <PanelHeader
            eyebrow="People Pulse"
            title="Organisation"
            description="Kostenstruktur und Teamgesundheit auf einen Blick."
          />
          <div className="mt-5 flex justify-center">
            <DonutGauge
              value={state.morale}
              label={`${Math.round(state.morale)} %`}
              sublabel="Moral"
              tone={moraleTone}
              size={112}
            />
          </div>
          <div className="mt-5">
            <StatRow
              label="Größtes Team"
              value={
                DEPARTMENTS[
                  departmentIds.reduce((largest, departmentId) =>
                    state.employees[departmentId] > state.employees[largest]
                      ? departmentId
                      : largest,
                  departmentIds[0],
                )
              ].shortName
              }
              icon="people"
            />
            <StatRow
              label="Fixkosten / Monat"
              value={formatMoney(monthlyPayroll)}
              icon="wallet"
              tone="negative"
            />
            <StatRow
              label="Cash-Runway Payroll"
              value={
                monthlyPayroll > 0
                  ? `${(state.cash / monthlyPayroll).toLocaleString("de-DE", {
                      maximumFractionDigits: 1,
                    })} Mon.`
                  : "∞"
              }
              icon="clock"
              tone={
                monthlyPayroll > 0 && state.cash / monthlyPayroll < 2
                  ? "negative"
                  : "positive"
              }
            />
          </div>
          <div className="mt-4 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.045] p-3 text-[0.68rem] leading-5 text-cyan-100/70">
            <div className="mb-1 flex items-center gap-2 font-semibold text-cyan-200">
              <Icon name="sparkles" size={13} />
              Führungsnotiz
            </div>
            Neue Mitarbeitende erhöhen sofort die Kostenbasis. Level-Upgrades sind
            einmalige Investitionen in Prozesse und Werkzeuge.
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function MarketingSection({
  state,
  dispatch,
}: OperationsSectionProps) {
  const activeProducts = state.products.filter((product) => product.active);
  const dailyDemand = activeProducts.reduce(
    (sum, product) => sum + product.lastDemand,
    0,
  );
  const dailySales = activeProducts.reduce(
    (sum, product) => sum + product.lastSales,
    0,
  );
  const conversion =
    dailyDemand > 0 ? clamp((dailySales / dailyDemand) * 100) : 0;
  const consideration = clamp(state.brand * 0.55 + state.reputation * 0.45);
  const selectedStrategy = getStrategy(state.marketingStrategy);
  const baseDailyMarketingCost =
    state.marketingBudget * selectedStrategy.costMultiplier;
  const campaignDailyCost = state.campaign?.dailyCost ?? 0;
  const effectiveDailyMarketingCost =
    baseDailyMarketingCost + campaignDailyCost;
  const marketingTeam = state.employees.marketing;

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Go to market"
        title="Marketing"
        description="Marke in Nachfrage übersetzen, Zielgruppen effizient erreichen und Launches mit Kampagnen beschleunigen."
        action={
          <StatusBadge tone={state.campaign ? "violet" : "neutral"} dot>
            {state.campaign ? "Kampagne aktiv" : "Always-on Marketing"}
          </StatusBadge>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Markenstärke"
          value={formatPercent(state.brand)}
          detail="Bekanntheit & Präferenz"
          icon={<Icon name="sparkles" size={17} />}
          tone="violet"
        />
        <MetricCard
          label="Tagesnachfrage"
          value={formatInteger(dailyDemand)}
          detail={`${formatInteger(dailySales)} Verkäufe zuletzt`}
          icon={<Icon name="trendUp" size={17} />}
          tone="green"
        />
        <MetricCard
          label="Demand Conversion"
          value={formatPercent(conversion)}
          detail="Nachfrage zu Absatz"
          icon={<Icon name="target" size={17} />}
          tone="cyan"
        />
        <MetricCard
          label="Effektive Kosten / Tag"
          value={formatMoney(effectiveDailyMarketingCost)}
          detail={`${selectedStrategy.kicker}${state.campaign ? " + Kampagne" : ""}`}
          icon={<Icon name="wallet" size={17} />}
          tone="amber"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel>
          <PanelHeader
            eyebrow="Demand Funnel"
            title="Von Aufmerksamkeit zu Absatz"
            description="Der Funnel verbindet Marke, Vertrauen, Nachfrage und tatsächliche Verkäufe."
          />
          <div className="mt-5 space-y-2.5">
            {[
              {
                label: "Bekanntheit",
                value: formatPercent(state.brand),
                detail: "Markenstärke",
                width: "w-full",
                tone: "border-violet-300/15 bg-violet-300/[0.075] text-violet-200",
              },
              {
                label: "Kaufinteresse",
                value: formatPercent(consideration),
                detail: "Marke + Reputation",
                width: "w-[94%]",
                tone: "border-cyan-300/15 bg-cyan-300/[0.065] text-cyan-200",
              },
              {
                label: "Nachfrage",
                value: `${formatInteger(dailyDemand)} Stk.`,
                detail: "letzter Simulationstag",
                width: "w-[88%]",
                tone: "border-sky-300/15 bg-sky-300/[0.055] text-sky-200",
              },
              {
                label: "Absatz",
                value: `${formatInteger(dailySales)} Stk.`,
                detail: `${formatPercent(conversion)} Conversion`,
                width: "w-[82%]",
                tone: "border-emerald-300/15 bg-emerald-300/[0.065] text-emerald-200",
              },
            ].map((step) => (
              <div
                key={step.label}
                className={`mx-auto flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${step.width} ${step.tone}`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{step.label}</p>
                  <p className="mt-0.5 truncate text-[0.62rem] text-slate-500">
                    {step.detail}
                  </p>
                </div>
                <strong className="shrink-0 font-mono text-sm tabular-nums">
                  {step.value}
                </strong>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[0.65rem] leading-5 text-slate-600">
            Kaufinteresse ist eine Orientierung aus 55 % Marke und 45 %
            Reputation; tatsächliche Nachfrage berücksichtigt zusätzlich Produkt,
            Preis und Wettbewerb.
          </p>
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow="Always-on"
            title="Tagesbudget"
            description="Das Grundbudget wirkt jeden Tag. Die Strategie bestimmt, wie intensiv es eingesetzt wird."
            action={
              <StatusBadge tone="info">
                {marketingTeam} {marketingTeam === 1 ? "Marketer" : "Marketer"}
              </StatusBadge>
            }
          />

          <div className="mt-5 rounded-xl border border-white/[0.065] bg-white/[0.022] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[0.65rem] tracking-[0.08em] text-slate-500 uppercase">
                  Basisbudget pro Tag
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-[-0.04em] text-slate-50 tabular-nums">
                  {formatMoney(state.marketingBudget)}
                </p>
              </div>
              <div className="text-right text-[0.68rem] text-slate-500">
                <p>Strategiefaktor {selectedStrategy.kicker}</p>
                <p className="mt-1 font-mono text-slate-300 tabular-nums">
                  ≈ {formatMoney(baseDailyMarketingCost * DAYS_PER_MONTH)}/Monat
                </p>
              </div>
            </div>
            <input
              className="mt-5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
              type="number"
              min="0"
              step="1000"
              value={state.marketingBudget}
              onChange={(event) =>
                dispatch({
                  type: "SET_MARKETING_BUDGET",
                  value: Number(event.currentTarget.value),
                })
              }
              aria-label="Marketingbudget pro Tag"
            />
            <p className="mt-2 text-[0.62rem] text-slate-600">Keine feste Budgetobergrenze · Wirkung steigt mit abnehmendem Grenznutzen.</p>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-[0.65rem] font-semibold tracking-[0.08em] text-slate-500 uppercase">
              Strategie
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {marketingStrategies.map((strategy) => {
                const active = state.marketingStrategy === strategy.id;

                return (
                  <button
                    key={strategy.id}
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: "SET_MARKETING_STRATEGY",
                        strategy: strategy.id,
                      })
                    }
                    className={`rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cyan-300/70 motion-reduce:transition-none ${
                      active
                        ? "border-cyan-300/30 bg-cyan-300/[0.075]"
                        : "border-white/[0.065] bg-white/[0.018] hover:border-white/12 hover:bg-white/[0.035]"
                    }`}
                    aria-pressed={active}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        name={strategy.icon}
                        size={15}
                        className={active ? "text-cyan-300" : "text-slate-500"}
                      />
                      <span
                        className={`text-xs font-semibold ${
                          active ? "text-cyan-100" : "text-slate-300"
                        }`}
                      >
                        {strategy.name}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-[0.62rem] text-slate-400">
                      {strategy.kicker}
                    </p>
                    <p className="mt-1.5 text-[0.64rem] leading-4 text-slate-600">
                      {strategy.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </Panel>
      </div>

      {state.campaign ? (
        <Panel className="border-violet-300/15 bg-violet-300/[0.035]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-300">
                <Icon name="marketing" size={21} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-100">
                    {state.campaign.name}
                  </h2>
                  <StatusBadge tone="violet" dot>
                    live
                  </StatusBadge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatMoney(state.campaign.dailyCost)}/Tag · Nachfrage +
                  {formatPercent(state.campaign.demandBoost * 100)} · Marke +
                  {formatPercent(state.campaign.brandBoost * 100)}
                </p>
                <ProgressBar
                  className="mt-3 max-w-xl"
                  value={state.campaign.totalDays - state.campaign.daysRemaining}
                  max={state.campaign.totalDays}
                  label="Kampagnenfortschritt"
                  valueLabel={`${state.campaign.daysRemaining} Tage verbleibend`}
                  tone="violet"
                />
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-64">
              <div className="rounded-xl bg-black/15 p-3">
                <p className="text-[0.58rem] tracking-[0.08em] text-slate-600 uppercase">
                  Restlaufzeit
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-200 tabular-nums">
                  {state.campaign.daysRemaining} Tage
                </p>
              </div>
              <div className="rounded-xl bg-black/15 p-3">
                <p className="text-[0.58rem] tracking-[0.08em] text-slate-600 uppercase">
                  Restkosten
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-amber-200 tabular-nums">
                  {formatMoney(
                    state.campaign.dailyCost * state.campaign.daysRemaining,
                  )}
                </p>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          eyebrow="Kampagnen"
          title="Marktmomente schaffen"
          description="Kampagnen haben Anlaufkosten und laufende Tageskosten. Es kann jeweils nur eine aktiv sein."
          action={
            state.campaign ? (
              <StatusBadge tone="warning">Slot belegt</StatusBadge>
            ) : (
              <StatusBadge tone="success">Slot verfügbar</StatusBadge>
            )
          }
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {CAMPAIGNS.map((campaign) => {
            const affordable = state.cash >= campaign.upfrontCost;
            const canStart = !state.campaign && affordable;
            const committedCost =
              campaign.upfrontCost + campaign.dailyCost * campaign.totalDays;

            return (
              <article
                key={campaign.id}
                className="flex min-w-0 flex-col rounded-xl border border-white/[0.065] bg-white/[0.022] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-cyan-300/[0.07] text-cyan-300">
                    <Icon name="marketing" size={17} />
                  </div>
                  <StatusBadge tone="neutral">{campaign.totalDays} Tage</StatusBadge>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-100">
                  {campaign.name}
                </h3>
                <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">
                  {campaign.description}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-black/15 px-2.5 py-2">
                    <p className="text-[0.56rem] text-slate-600 uppercase">
                      Nachfrage
                    </p>
                    <p className="mt-1 font-mono text-xs font-semibold text-emerald-300">
                      +{formatPercent(campaign.demandBoost * 100)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-black/15 px-2.5 py-2">
                    <p className="text-[0.56rem] text-slate-600 uppercase">Marke</p>
                    <p className="mt-1 font-mono text-xs font-semibold text-violet-300">
                      +{formatPercent(campaign.brandBoost * 100)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-0.5 border-t border-white/[0.055] pt-3">
                  <StatRow
                    label="Startkosten"
                    value={formatMoney(campaign.upfrontCost)}
                    tone={affordable ? "neutral" : "negative"}
                  />
                  <StatRow
                    label="Laufend"
                    value={`${formatMoney(campaign.dailyCost)}/Tag`}
                  />
                  <StatRow
                    label="Gesamtbindung"
                    value={formatMoney(committedCost)}
                  />
                </div>

                <ActionButton
                  className="mt-4"
                  fullWidth
                  size="sm"
                  variant={canStart ? "primary" : "secondary"}
                  leadingIcon={
                    <Icon
                      name={state.campaign ? "lock" : affordable ? "play" : "wallet"}
                      size={14}
                    />
                  }
                  disabled={!canStart}
                  title={
                    state.campaign
                      ? "Es läuft bereits eine Kampagne"
                      : !affordable
                        ? "Startkosten übersteigen deine Liquidität"
                        : undefined
                  }
                  onClick={() =>
                    dispatch({ type: "START_CAMPAIGN", campaignId: campaign.id })
                  }
                >
                  {state.campaign
                    ? "Kampagne läuft"
                    : affordable
                      ? "Kampagne starten"
                      : "Nicht finanzierbar"}
                </ActionButton>
              </article>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
