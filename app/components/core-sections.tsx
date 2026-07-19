"use client";

import type { Dispatch } from "react";
import {
  CATEGORY_LABELS,
  PRODUCT_BLUEPRINTS,
  TECH_TREE,
} from "@/app/game/data";
import type { GameAction, GameSection, GameState, ProductBlueprint } from "@/app/game/types";
import {
  ActionButton,
  DeltaBadge,
  EmptyState,
  MetricCard,
  Panel,
  PanelHeader,
  ProgressBar,
  SectionTitle,
  StatusBadge,
} from "./game-ui";
import { AreaChart, DonutGauge, ProductVisual, StatRow } from "./game-widgets";
import { Icon, type IconName } from "./icons";

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function compactMoney(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 1_000_000_000) return `${sign}${(absolute / 1_000_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mrd. €`;
  if (absolute >= 1_000_000) return `${sign}${(absolute / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio. €`;
  if (absolute >= 1_000) return `${sign}${(absolute / 1_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Tsd. €`;
  return money.format(value);
}

function totalEmployees(state: GameState) {
  return Object.values(state.employees).reduce((sum, value) => sum + value, 0);
}

function capacity(state: GameState) {
  const production = state.employees.production;
  if (production <= 0) return 0;
  const leanBonus = state.unlockedTech.includes("lean-fabs") ? 1.15 : 1;
  return Math.round(
    (production *
      (3.5 + state.departmentLevels.production * 0.75) *
      (1 + (state.factoryLevel - 1) * 0.55) *
      (1 + state.automationLevel * 0.22) *
      leanBonus) /
      state.qualityFocus,
  );
}

function researchRate(state: GameState) {
  return state.employees.research ** 0.88 * 2.4 * (1 + (state.departmentLevels.research - 1) * 0.18) * (0.65 + state.morale / 200);
}

function controlLabel(ownership: number) {
  if (ownership >= 75) return "Volle Kontrolle";
  if (ownership >= 50) return "Sichere Mehrheit";
  if (ownership >= 33.4) return "Sperrminorität";
  if (ownership >= 25) return "Board-abhängig";
  return "Kontrolle gefährdet";
}

function companyStage(state: GameState) {
  if (state.valuation >= 1_000_000_000) return { name: "Technologiekonzern", level: 6, next: "Marktstandard setzen" };
  if (state.valuation >= 250_000_000) return { name: "Global Player", level: 5, next: "1 Mrd. € Bewertung" };
  if (state.valuation >= 50_000_000) return { name: "Scale-up", level: 4, next: "250 Mio. € Bewertung" };
  if (state.valuation >= 12_000_000) return { name: "Wachstumsfirma", level: 3, next: "50 Mio. € Bewertung" };
  if (state.valuation >= 4_000_000) return { name: "Regionaler Anbieter", level: 2, next: "12 Mio. € Bewertung" };
  return { name: "Garagenfirma", level: 1, next: "4 Mio. € Bewertung" };
}

function healthScore(state: GameState) {
  const profit = state.lastMonthRevenue - state.lastMonthExpenses;
  const runway = state.cash / Math.max(1, state.monthlyExpenses / Math.max(1, state.day % 30));
  return Math.max(5, Math.min(98, 48 + (profit >= 0 ? 12 : -14) + Math.min(16, runway * 1.5) + state.brand * 0.18 - state.takeoverRisk * 0.2));
}

function blueprintIcon(category: ProductBlueprint["category"]): IconName {
  if (category === "phone") return "phone";
  if (category === "components") return "cpu";
  if (category === "software") return "cloud";
  return "monitor";
}

export function DashboardSection({
  state,
  dispatch,
  onNavigate,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onNavigate: (section: GameSection) => void;
}) {
  const employees = totalEmployees(state);
  const ownership = (state.founderShares / state.totalShares) * 100;
  const currentProfit = state.lastMonthRevenue || state.lastMonthExpenses
    ? state.lastMonthRevenue - state.lastMonthExpenses
    : state.monthlyRevenue - state.monthlyExpenses;
  const stage = companyStage(state);
  const health = healthScore(state);
  const activeProducts = state.products.filter((product) => product.active);
  const leadProduct = activeProducts[0];
  const leadBlueprint = PRODUCT_BLUEPRINTS.find((item) => item.id === leadProduct?.blueprintId);
  const currentTech = TECH_TREE.find((tech) => tech.id === state.currentResearch);
  const valuationSeries = state.history.map((point) => point.valuation);
  const chartValues = valuationSeries.length > 1 ? valuationSeries : [state.valuation * 0.88, state.valuation * 0.92, state.valuation];
  const completedNext = TECH_TREE.find(
    (tech) => !state.unlockedTech.includes(tech.id) && tech.prerequisites.every((id) => state.unlockedTech.includes(id)),
  );
  const topCompetitors = state.competitors
    .filter((item) => item.status === "active")
    .sort((a, b) => b.marketShare - a.marketShare)
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow={`${stage.name} · Stufe ${stage.level}`}
        title="Unternehmenszentrale"
        description="Steuere den Kreislauf aus Innovation, Produkt, Nachfrage und Kapital. Jede Zahl entsteht aus deinen Entscheidungen."
        action={
          <StatusBadge tone={health >= 65 ? "success" : health >= 40 ? "warning" : "danger"} dot>
            {health >= 65 ? "Unternehmen gesund" : health >= 40 ? "Auf Kurs achten" : "Handlungsbedarf"}
          </StatusBadge>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <MetricCard
          label="Umsatz / Monat"
          value={compactMoney(state.lastMonthRevenue || state.monthlyRevenue)}
          detail={`${activeProducts.length} aktive Produkt${activeProducts.length === 1 ? "linie" : "linien"}`}
          tone="cyan"
          icon={<Icon name="trendUp" size={17} />}
          delta={<DeltaBadge value={`${state.marketShare.toFixed(1)} % Markt`} direction="up" />}
        />
        <MetricCard
          label="Operatives Ergebnis"
          value={compactMoney(currentProfit)}
          detail={currentProfit >= 0 ? "Wachstum selbst finanziert" : "Cash-Reserve wird belastet"}
          tone={currentProfit >= 0 ? "green" : "amber"}
          icon={<Icon name="finance" size={17} />}
        />
        <MetricCard
          label="Team"
          value={employees}
          detail={`${state.employees.research} in Forschung · ${Math.round(state.morale)} % Moral`}
          tone="violet"
          icon={<Icon name="people" size={17} />}
        />
        <MetricCard
          label="Kontrolle"
          value={`${ownership.toFixed(1)} %`}
          detail={controlLabel(ownership)}
          tone="amber"
          icon={<Icon name="shield" size={17} />}
        />
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1.55fr_1fr]">
        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader
            eyebrow="Unternehmenswert"
            title={compactMoney(state.valuation)}
            description="Fundamentalwert aus Cash, Umsatz, Marge, Wachstum, Marke und Technologie."
            action={<StatusBadge tone="info">{money.format(state.sharePrice)} / Aktie</StatusBadge>}
          />
          <div className="mt-6 h-44">
            <AreaChart values={chartValues} height={176} positive={chartValues.at(-1)! >= chartValues[0]} label="Entwicklung des Unternehmenswerts" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4">
            <div>
              <p className="text-[0.62rem] text-slate-600 uppercase">Marke</p>
              <p className="mt-1 font-mono text-sm text-slate-200">{state.brand.toFixed(0)} / 100</p>
            </div>
            <div>
              <p className="text-[0.62rem] text-slate-600 uppercase">F&E-Portfolio</p>
              <p className="mt-1 font-mono text-sm text-slate-200">{state.unlockedTech.length} Techs</p>
            </div>
            <div>
              <p className="text-[0.62rem] text-slate-600 uppercase">Nächstes Ziel</p>
              <p className="mt-1 truncate text-xs text-cyan-300">{stage.next}</p>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="CEO-Briefing" title="Operative Lage" description="Die vier Engpässe deines Geschäftsmodells." />
          <div className="mt-5 flex items-center gap-5 rounded-xl border border-white/[0.055] bg-white/[0.025] p-3.5">
            <DonutGauge value={health} label={`${Math.round(health)}`} sublabel="HEALTH" tone={health >= 65 ? "#6ee7b7" : "#fbbf24"} />
            <div className="min-w-0 flex-1">
              <ProgressBar value={Math.min(100, (activeProducts.reduce((sum, product) => sum + product.lastProduction, 0) / Math.max(1, capacity(state))) * 100)} label="Kapazitätsnutzung" valueLabel={`${capacity(state)} Stk./Tag`} tone="cyan" size="sm" />
              <ProgressBar className="mt-3" value={state.morale} label="Team-Moral" valueLabel={`${Math.round(state.morale)} %`} tone={state.morale > 55 ? "green" : "amber"} size="sm" />
              <ProgressBar className="mt-3" value={state.takeoverRisk} label="Übernahmerisiko" valueLabel={`${Math.round(state.takeoverRisk)} %`} tone={state.takeoverRisk > 35 ? "red" : "amber"} size="sm" />
            </div>
          </div>
          <div className="mt-3">
            <StatRow label="Liquiditätsreserve" value={compactMoney(state.cash)} detail={state.cash > state.monthlyExpenses * 3 ? "Solider Puffer" : "Finanzierung prüfen"} icon="wallet" tone={state.cash > 0 ? "positive" : "negative"} />
            <StatRow label="Forschungstempo" value={`${researchRate(state).toFixed(1)} FP/Tag`} detail={`${state.employees.research} Forschende`} icon="research" />
            <StatRow label="Marktposition" value={`#${Math.min(6, 1 + state.competitors.filter((c) => c.marketShare > state.marketShare).length)}`} detail={`${state.marketShare.toFixed(2)} % Anteil`} icon="target" />
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          eyebrow="Wachstumsmotor"
          title="Forschung → Produkt → Markt"
          description="Ein starker Kreislauf verhindert technologische Schulden und finanziert die nächste Generation."
        />
        <div className="mt-5 grid gap-2 md:grid-cols-4">
          {[
            {
              icon: "research" as const,
              label: "1 · Forschen",
              value: currentTech?.name ?? completedNext?.name ?? "Projekt wählen",
              detail: currentTech ? `${Math.round((state.researchPoints / currentTech.cost) * 100)} % erforscht` : "Keine aktive Forschung",
              section: "research" as const,
              active: Boolean(currentTech),
            },
            {
              icon: "products" as const,
              label: "2 · Produkt bauen",
              value: leadBlueprint?.name ?? "Kein Produkt",
              detail: leadProduct ? `${leadProduct.lastSales.toFixed(1)} Verkäufe/Tag` : "Portfolio leer",
              section: "products" as const,
              active: Boolean(leadProduct),
            },
            {
              icon: "production" as const,
              label: "3 · Skalieren",
              value: `Fabrik Stufe ${state.factoryLevel}`,
              detail: `${capacity(state)} Einheiten/Tag`,
              section: "production" as const,
              active: state.products.some((product) => product.inventory < product.lastDemand * 2),
            },
            {
              icon: "marketing" as const,
              label: "4 · Nachfrage",
              value: `${state.brand.toFixed(0)} Markenwert`,
              detail: state.campaign ? state.campaign.name : `${money.format(state.marketingBudget)}/Tag`,
              section: "marketing" as const,
              active: Boolean(state.campaign),
            },
          ].map((step, index) => (
            <button
              key={step.label}
              type="button"
              onClick={() => onNavigate(step.section)}
              className="group relative min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 text-left hover:border-cyan-300/20 hover:bg-cyan-300/[0.035]"
            >
              {index < 3 ? <Icon name="chevronRight" size={15} className="absolute top-1/2 -right-2.5 z-10 hidden -translate-y-1/2 rounded-full bg-[#111820] text-slate-700 md:block" /> : null}
              <div className="flex items-center justify-between">
                <span className={`grid size-8 place-items-center rounded-lg ${step.active ? "bg-cyan-300/10 text-cyan-300" : "bg-white/[0.045] text-slate-500"}`}><Icon name={step.icon} size={16} /></span>
                <Icon name="arrowUpRight" size={14} className="text-slate-700 group-hover:text-cyan-300" />
              </div>
              <p className="mt-3 text-[0.62rem] font-semibold tracking-wide text-slate-600 uppercase">{step.label}</p>
              <p className="mt-1 truncate text-sm font-medium text-slate-200">{step.value}</p>
              <p className="mt-1 truncate text-[0.68rem] text-slate-500">{step.detail}</p>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Panel>
          <PanelHeader title="Flaggschiff" description="Dein wichtigstes aktives Produkt im aktuellen Markt." action={<button type="button" onClick={() => onNavigate("products")} className="text-xs font-medium text-cyan-300">Portfolio öffnen</button>} />
          {leadProduct && leadBlueprint ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-[150px_1fr]">
              <ProductVisual category={leadBlueprint.category} accent={leadBlueprint.accent} compact />
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="text-base font-semibold text-slate-100">{leadProduct.name}</h3><p className="mt-1 text-xs text-slate-500">{leadBlueprint.tagline}</p></div>
                  <StatusBadge tone="success" dot>AM MARKT</StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div><p className="text-[0.6rem] text-slate-600 uppercase">Preis</p><p className="mt-1 font-mono text-xs text-slate-200">{money.format(leadProduct.price)}</p></div>
                  <div><p className="text-[0.6rem] text-slate-600 uppercase">Lager</p><p className="mt-1 font-mono text-xs text-slate-200">{Math.round(leadProduct.inventory)}</p></div>
                  <div><p className="text-[0.6rem] text-slate-600 uppercase">Absatz / Tag</p><p className="mt-1 font-mono text-xs text-slate-200">{leadProduct.lastSales.toFixed(1)}</p></div>
                </div>
              </div>
            </div>
          ) : <EmptyState compact title="Kein aktives Produkt" description="Bringe ein Produkt auf den Markt, um Umsatz zu erzielen." icon={<Icon name="products" size={18} />} />}
        </Panel>

        <Panel>
          <PanelHeader title="Konkurrenzdruck" description="Marktanteile reagieren auf Technologie, Qualität, Marke und Preis." action={<button type="button" onClick={() => onNavigate("stocks")} className="text-xs font-medium text-cyan-300">Markt analysieren</button>} />
          <div className="mt-4 space-y-2.5">
            {topCompetitors.map((competitor) => (
              <div key={competitor.id} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg text-[0.6rem] font-bold" style={{ color: competitor.color, backgroundColor: `${competitor.color}15` }}>{competitor.ticker}</span>
                <div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-xs"><span className="truncate text-slate-300">{competitor.name}</span><span className="font-mono text-slate-400">{competitor.marketShare.toFixed(1)} %</span></div><ProgressBar className="mt-1.5" value={competitor.marketShare} max={30} size="sm" ariaLabel={`Marktanteil ${competitor.name}`} /></div>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-xl bg-cyan-300/[0.045] p-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-cyan-300/10 text-[0.6rem] font-bold text-cyan-300">CF</span>
              <div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-xs"><span className="truncate font-medium text-cyan-100">Circuit Forge</span><span className="font-mono text-cyan-300">{state.marketShare.toFixed(1)} %</span></div><ProgressBar className="mt-1.5" value={state.marketShare} max={30} size="sm" ariaLabel="Eigener Marktanteil" /></div>
            </div>
          </div>
        </Panel>
      </div>

      {!state.currentResearch && completedNext ? (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-violet-300/15 bg-violet-300/[0.055] p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-300"><Icon name="research" size={18} /></span><div><p className="text-sm font-medium text-violet-100">Dein Forschungsteam wartet auf ein Projekt</p><p className="mt-1 text-xs text-violet-200/50">Empfehlung: {completedNext.name} bringt den nächsten Technologiesprung.</p></div></div>
          <ActionButton onClick={() => dispatch({ type: "START_RESEARCH", techId: completedNext.id })}>Forschung starten</ActionButton>
        </div>
      ) : null}
    </div>
  );
}

function ActiveProductCard({ state, product, dispatch }: { state: GameState; product: GameState["products"][number]; dispatch: Dispatch<GameAction> }) {
  const blueprint = PRODUCT_BLUEPRINTS.find((item) => item.id === product.blueprintId);
  if (!blueprint) return null;
  const techCostFactor = state.unlockedTech.includes("lean-fabs") ? 0.88 : state.unlockedTech.includes("robotic-assembly") ? 0.92 : 1;
  const unitCost = blueprint.unitCost * techCostFactor * (1 + (state.qualityFocus - 1) * 0.12);
  const margin = ((product.price - unitCost) / Math.max(1, product.price)) * 100;
  const ageMonths = Math.floor((state.day - product.launchedDay) / 30);
  const upgradeCost = blueprint.developmentCost * 0.32 + 35_000 * (product.qualityBonus / 5 + 1);

  return (
    <Panel padding="none" className="overflow-hidden">
      <ProductVisual category={blueprint.category} accent={blueprint.accent} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-base font-semibold text-slate-100">{product.name}</h3><StatusBadge tone={product.active ? "success" : "neutral"} dot>{product.active ? "AKTIV" : "EINGESTELLT"}</StatusBadge></div><p className="mt-1 text-xs text-slate-500">{CATEGORY_LABELS[blueprint.category]} · Generation {blueprint.era + 1} · {ageMonths} Monate alt</p></div>
          <Icon name={blueprintIcon(blueprint.category)} size={19} style={{ color: blueprint.accent }} />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[ ["Nachfrage", product.lastDemand.toFixed(1)], ["Absatz", product.lastSales.toFixed(1)], ["Lager", Math.round(product.inventory)], ["Marge", `${margin.toFixed(0)} %`] ].map(([label, value]) => <div key={label} className="rounded-lg bg-white/[0.03] p-2"><p className="text-[0.57rem] text-slate-600 uppercase">{label}</p><p className="mt-1 font-mono text-xs text-slate-200">{value}</p></div>)}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Listenpreis</span><span className="font-mono font-semibold text-slate-100">{money.format(product.price)}</span></div>
          <div className="mt-2 flex gap-2">
            <ActionButton variant="secondary" size="sm" aria-label="Preis senken" onClick={() => dispatch({ type: "SET_PRODUCT_PRICE", productId: product.id, price: Math.max(unitCost * 1.05, product.price * 0.95) })}><Icon name="minus" size={14} /></ActionButton>
            <div className="flex flex-1 items-center justify-center rounded-lg border border-white/[0.07] bg-black/15 px-3 text-[0.65rem] text-slate-500">Marktreferenz {money.format(blueprint.basePrice)}</div>
            <ActionButton variant="secondary" size="sm" aria-label="Preis erhöhen" onClick={() => dispatch({ type: "SET_PRODUCT_PRICE", productId: product.id, price: product.price * 1.05 })}><Icon name="plus" size={14} /></ActionButton>
          </div>
        </div>
        <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-4">
          <ActionButton size="sm" disabled={!product.active || product.qualityBonus >= 30 || state.cash < upgradeCost} onClick={() => dispatch({ type: "UPGRADE_PRODUCT", productId: product.id })}>{product.qualityBonus >= 30 ? "Qualität maximiert" : `Qualität +5 · ${compactMoney(upgradeCost)}`}</ActionButton>
          {product.active ? <ActionButton size="sm" variant="ghost" onClick={() => dispatch({ type: "RETIRE_PRODUCT", productId: product.id })}>Einstellen</ActionButton> : null}
        </div>
      </div>
    </Panel>
  );
}

export function ProductsSection({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const launched = new Set(state.products.map((product) => product.blueprintId));
  const available = PRODUCT_BLUEPRINTS.filter((blueprint) => blueprint.requiredTech.every((id) => state.unlockedTech.includes(id)) && !launched.has(blueprint.id));
  const locked = PRODUCT_BLUEPRINTS.filter((blueprint) => !blueprint.requiredTech.every((id) => state.unlockedTech.includes(id)) && !launched.has(blueprint.id));

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Produktstrategie" title="Portfolio & Produktlabor" description="Erforschte Technologie schafft nur Potenzial. Erst ein finanziertes Produkt macht daraus Umsatz und Marktanteil." action={<StatusBadge tone="info">{state.products.filter((p) => p.active).length} aktive Linien</StatusBadge>} />
      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {state.products.map((product) => <ActiveProductCard key={product.id} state={state} product={product} dispatch={dispatch} />)}
      </div>

      <Panel>
        <PanelHeader eyebrow="Produktpipeline" title="Marktreife Konzepte" description="Entwicklungskosten werden sofort fällig. Kapazität verteilt sich danach automatisch anhand der Nachfrage." />
        {available.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {available.map((blueprint) => (
              <div key={blueprint.id} className="group overflow-hidden rounded-2xl border border-white/[0.065] bg-white/[0.022]">
                <ProductVisual category={blueprint.category} accent={blueprint.accent} compact />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3"><div><StatusBadge tone="success">ENTWICKLUNGSBEREIT</StatusBadge><h3 className="mt-2 text-base font-semibold text-slate-100">{blueprint.name}</h3><p className="mt-1 text-xs text-slate-500">{blueprint.tagline}</p></div><Icon name={blueprintIcon(blueprint.category)} size={18} style={{ color: blueprint.accent }} /></div>
                  <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">{blueprint.description}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/[0.055] py-3"><div><p className="text-[0.57rem] text-slate-600 uppercase">Preis</p><p className="mt-1 font-mono text-xs text-slate-300">{money.format(blueprint.basePrice)}</p></div><div><p className="text-[0.57rem] text-slate-600 uppercase">Stückkosten</p><p className="mt-1 font-mono text-xs text-slate-300">{money.format(blueprint.unitCost)}</p></div><div><p className="text-[0.57rem] text-slate-600 uppercase">Qualität</p><p className="mt-1 font-mono text-xs text-slate-300">{blueprint.quality}/100</p></div></div>
                  <ActionButton className="mt-4 w-full" disabled={state.cash < blueprint.developmentCost} onClick={() => dispatch({ type: "LAUNCH_PRODUCT", blueprintId: blueprint.id })}>{blueprint.developmentCost === 0 ? "Auf Markt bringen" : `Entwickeln · ${compactMoney(blueprint.developmentCost)}`}</ActionButton>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState className="mt-5" compact title="Keine marktreifen Konzepte" description="Erforsche neue Technologien oder finanziere bereits verfügbare Designs." icon={<Icon name="products" size={18} />} />}
      </Panel>

      {locked.length ? (
        <Panel variant="subtle">
          <PanelHeader title="Technologie-Roadmap" description="Diese Produktklassen warten auf Durchbrüche in deiner Forschung." />
          <div className="mt-4 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {locked.map((blueprint) => {
              const missing = blueprint.requiredTech.map((id) => TECH_TREE.find((tech) => tech.id === id)?.name ?? id).filter((_, index) => !state.unlockedTech.includes(blueprint.requiredTech[index]));
              return <div key={blueprint.id} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-black/10 p-3 opacity-65"><span className="grid size-9 place-items-center rounded-lg bg-white/[0.035] text-slate-600"><Icon name="lock" size={16} /></span><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-400">{blueprint.name}</p><p className="mt-1 truncate text-[0.62rem] text-slate-600">Benötigt: {missing.join(", ")}</p></div></div>;
            })}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

export function ResearchSection({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const currentTech = TECH_TREE.find((tech) => tech.id === state.currentResearch);
  const rate = researchRate(state);
  const unlockedEra = Math.max(...TECH_TREE.filter((tech) => state.unlockedTech.includes(tech.id)).map((tech) => tech.era), 0);
  const marketEra = Math.min(6, Math.floor(state.day / 1_080));
  const techPosition = unlockedEra - marketEra;
  const eras = Array.from(new Set(TECH_TREE.map((tech) => tech.era)));

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Forschung & Entwicklung" title="Technologie-Roadmap" description="Baue auf Voraussetzungen auf, halte mit der Marktzeit Schritt und integriere Durchbrüche in neue Produkte." action={<StatusBadge tone={techPosition >= 0 ? "success" : techPosition === -1 ? "warning" : "danger"}>{techPosition >= 1 ? "Technologieführer" : techPosition === 0 ? "Auf Marktniveau" : `${Math.abs(techPosition)} Ära zurück`}</StatusBadge>} />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="relative overflow-hidden">
          <div className="absolute top-[-8rem] right-[-8rem] size-64 rounded-full bg-violet-400/[0.07] blur-3xl" />
          {currentTech ? (
            <div className="relative">
              <PanelHeader eyebrow="Aktives Forschungsprojekt" title={currentTech.name} description={currentTech.description} action={<StatusBadge tone="violet" dot>IN ARBEIT</StatusBadge>} />
              <div className="mt-7"><ProgressBar value={state.researchPoints} max={currentTech.cost} label="Forschungsfortschritt" valueLabel={`${Math.round(state.researchPoints)} / ${currentTech.cost} FP`} tone="violet" /></div>
              <div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-[0.6rem] text-slate-600 uppercase">Tempo</p><p className="mt-1 font-mono text-sm text-violet-200">{rate.toFixed(1)} FP/Tag</p></div><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-[0.6rem] text-slate-600 uppercase">Restzeit</p><p className="mt-1 font-mono text-sm text-slate-200">≈ {Math.max(1, Math.ceil((currentTech.cost - state.researchPoints) / Math.max(0.1, rate)))} Tage</p></div><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-[0.6rem] text-slate-600 uppercase">Team</p><p className="mt-1 font-mono text-sm text-slate-200">{state.employees.research} Personen</p></div></div>
              <div className="mt-5 flex flex-wrap gap-2">{currentTech.effects.map((effect) => <StatusBadge key={effect} tone="info"><Icon name="bolt" size={11} /> {effect}</StatusBadge>)}</div>
              <ActionButton className="mt-5" size="sm" variant="ghost" onClick={() => dispatch({ type: "CANCEL_RESEARCH" })}>Projekt pausieren</ActionButton>
            </div>
          ) : (
            <EmptyState title="Forschungskapazität ungenutzt" description="Wähle im Technologiebaum ein verfügbares Projekt. Deine angesammelten FP fließen dann in den Fortschritt." icon={<Icon name="research" size={19} />} />
          )}
        </Panel>
        <Panel>
          <PanelHeader eyebrow="Branchenbenchmark" title="Technologieposition" description="Der Markt entwickelt sich mit der Spielzeit weiter." />
          <div className="mt-5 flex items-center gap-5"><DonutGauge value={Math.max(8, Math.min(95, 55 + techPosition * 18))} label={techPosition >= 0 ? `+${techPosition}` : techPosition} sublabel="ÄRA" tone={techPosition >= 0 ? "#6ee7b7" : "#fbbf24"} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-200">{techPosition >= 0 ? "Du setzt das Tempo." : "Technologieschuld wächst."}</p><p className="mt-1 text-xs leading-5 text-slate-500">{techPosition >= 0 ? "Frühe Forschung ist teuer, eröffnet aber Premium-Margen und Patente." : "Veraltete Produkte verlieren mit jedem Marktzyklus an Nachfrage."}</p></div></div>
          <div className="mt-5"><StatRow label="Deine höchste Ära" value={`Ära ${unlockedEra + 1}`} icon="sparkles" /><StatRow label="Markterwartung" value={`Ära ${marketEra + 1}`} icon="target" /><StatRow label="F&E-Leistung" value={`${rate.toFixed(1)} FP/Tag`} icon="research" /></div>
        </Panel>
      </div>

      <Panel padding="sm">
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[760px] gap-3">
            {eras.map((era) => {
              const techs = TECH_TREE.filter((tech) => tech.era === era);
              return (
                <div key={era} className="min-w-[220px] flex-1">
                  <div className="mb-3 flex items-center gap-2 px-1"><span className={`grid size-6 place-items-center rounded-full border font-mono text-[0.62rem] ${era <= unlockedEra ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-300" : "border-white/[0.07] bg-white/[0.025] text-slate-600"}`}>{era + 1}</span><div><p className="text-[0.65rem] font-semibold text-slate-400">{["Garage", "Industrialisierung", "Personal Computing", "Vernetzung", "Plattformära", "Intelligente Systeme", "Edge-Zukunft"][era]}</p><p className="text-[0.55rem] text-slate-700">Technologiewelle</p></div></div>
                  <div className="space-y-2">
                    {techs.map((tech) => {
                      const complete = state.unlockedTech.includes(tech.id);
                      const active = state.currentResearch === tech.id;
                      const available = !complete && tech.prerequisites.every((id) => state.unlockedTech.includes(id));
                      const missing = tech.prerequisites.filter((id) => !state.unlockedTech.includes(id)).map((id) => TECH_TREE.find((item) => item.id === id)?.name ?? id);
                      return (
                        <button
                          key={tech.id}
                          type="button"
                          disabled={complete || active || !available}
                          onClick={() => dispatch({ type: "START_RESEARCH", techId: tech.id })}
                          className={`block w-full rounded-xl border p-3 text-left transition ${complete ? "border-emerald-300/12 bg-emerald-300/[0.035]" : active ? "border-violet-300/30 bg-violet-300/[0.07] shadow-[0_0_20px_rgba(196,181,253,.05)]" : available ? "border-white/[0.075] bg-[#111820] hover:-translate-y-0.5 hover:border-cyan-300/25" : "cursor-not-allowed border-white/[0.04] bg-white/[0.015] opacity-55"}`}
                        >
                          <div className="flex items-start justify-between gap-2"><span className={`grid size-7 place-items-center rounded-lg ${complete ? "bg-emerald-300/10 text-emerald-300" : active ? "bg-violet-300/10 text-violet-300" : available ? "bg-cyan-300/[0.08] text-cyan-300" : "bg-white/[0.035] text-slate-600"}`}><Icon name={complete ? "check" : available || active ? tech.icon : "lock"} size={14} /></span><span className="font-mono text-[0.6rem] text-slate-600">{tech.cost || "BASIS"} FP</span></div>
                          <p className={`mt-2 text-xs font-medium ${complete ? "text-emerald-100/70" : active ? "text-violet-100" : "text-slate-300"}`}>{tech.name}</p>
                          <p className="mt-1 line-clamp-2 text-[0.62rem] leading-4 text-slate-600">{!available && !complete ? `Benötigt: ${missing.join(", ")}` : tech.description}</p>
                          {active ? <ProgressBar className="mt-2.5" value={state.researchPoints} max={tech.cost} size="sm" tone="violet" ariaLabel={`Forschung ${tech.name}`} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <Panel variant="subtle">
        <PanelHeader title="Erforschte Fähigkeiten" description="Technologien verändern konkrete Kosten, Kapazitäten und Produktmöglichkeiten." />
        <div className="mt-4 flex flex-wrap gap-2">{TECH_TREE.filter((tech) => state.unlockedTech.includes(tech.id)).flatMap((tech) => tech.effects.map((effect) => <span key={`${tech.id}-${effect}`} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.035] px-2.5 py-2 text-[0.68rem] text-emerald-100/70"><Icon name="check" size={12} className="text-emerald-300" />{effect}</span>))}</div>
      </Panel>
    </div>
  );
}
