"use client";

import { useMemo, useState, type Dispatch } from "react";
import {
  formatCompactMoney,
  formatMoney,
  getProductEconomics,
  PC_MARKET_SEGMENTS,
} from "@/app/game/engine";
import {
  PC_PART_CATEGORIES,
  PC_RESEARCH_ATTRIBUTE_IDS,
  createSegmentConfiguration,
  evaluatePcBuild,
  formatPcAttributeValue,
  getPcComponentSummary,
  getPcConfigurationLabel,
  getResearchTracksByCategory,
  isConfigurationWithinResearch,
} from "@/app/game/pc-system";
import type {
  GameAction,
  GameState,
  PcConfiguration,
  PcPartCategory,
  PcMarketSegment,
  PcResearchAttribute,
  ProductState,
} from "@/app/game/types";
import {
  ActionButton,
  EmptyState,
  Panel,
  PanelHeader,
  ProgressBar,
  SectionTitle,
  StatusBadge,
} from "./game-ui";
import { Icon } from "./icons";

const integer = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

function fieldClassName() {
  return "h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-700 focus:border-blue-300/45 focus:ring-2 focus:ring-blue-500/10";
}

function SelectedPartRow({
  category,
  configuration,
  selected,
  issueTone,
  onSelect,
}: {
  category: (typeof PC_PART_CATEGORIES)[number];
  configuration: PcConfiguration;
  selected: boolean;
  issueTone: "error" | "warning" | null;
  onSelect: (category: PcPartCategory) => void;
}) {
  const component = getPcComponentSummary(configuration, category.id);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(category.id)}
      className={`group flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
        selected
          ? "border-blue-300/35 bg-blue-500/[0.075]"
          : issueTone === "error"
            ? "border-rose-300/20 bg-rose-300/[0.035] hover:border-rose-300/35"
            : issueTone === "warning"
              ? "border-amber-300/20 bg-amber-300/[0.035] hover:border-amber-300/35"
              : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-lg ${
          selected ? "bg-blue-500/12 text-blue-600" : "bg-slate-50 text-slate-500"
        }`}
      >
        <Icon name={category.icon} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.62rem] font-semibold tracking-[0.08em] text-slate-600 uppercase">
          {category.shortName}
        </span>
        <span className="mt-0.5 block truncate text-xs font-medium text-slate-800">
          {component.specs.slice(0, 2).join(" · ")}
        </span>
      </span>
      {issueTone ? (
        <Icon
          name="alert"
          size={15}
          className={`shrink-0 ${issueTone === "error" ? "text-rose-700" : "text-amber-700"}`}
        />
      ) : (
        <Icon name="chevronRight" size={15} className="shrink-0 text-slate-700 group-hover:text-slate-600" />
      )}
    </button>
  );
}

function ProductRow({
  state,
  product,
  dispatch,
}: {
  state: GameState;
  product: ProductState;
  dispatch: Dispatch<GameAction>;
}) {
  const economics = getProductEconomics(state, product);
  if (!economics) return null;

  const lowerPrice = Math.max(economics.unitCost * 1.05, product.price * 0.95);
  const marketStatus = economics.relativePerformance < -0.9
    ? { label: "Veraltet", tone: "danger" as const }
    : product.price > economics.fairPrice * 1.2
      ? { label: "Zu teuer", tone: "warning" as const }
      : economics.relativePerformance >= 0
        ? { label: "Technikführer", tone: "success" as const }
        : economics.relativePerformance >= -0.35
          ? { label: "Marktaktuell", tone: "info" as const }
          : { label: "Unter Druck", tone: "neutral" as const };
  return (
    <div className="grid gap-3 border-t border-slate-200 px-4 py-3.5 first:border-t-0 sm:px-5 lg:grid-cols-[minmax(13rem,1.4fr)_repeat(3,minmax(6rem,.6fr))_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-emerald-300" />
          <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
          <StatusBadge tone={marketStatus.tone} className="hidden sm:inline-flex">
            {marketStatus.label}
          </StatusBadge>
        </div>
        <p className="mt-1 truncate pl-4 text-[0.68rem] text-slate-600">
          {product.configuration
            ? getPcConfigurationLabel(product.configuration)
            : economics.blueprint.tagline}
        </p>
        <p className="mt-1 pl-4 text-[0.62rem] text-slate-500">
          {PC_MARKET_SEGMENTS[economics.marketSegment].name} · Rang {economics.marketRank} · Marktwert ca. {formatMoney(economics.fairPrice)}
        </p>
        <p className="mt-0.5 pl-4 text-[0.62rem] text-slate-500">
          Technik vs. Marktspitze {economics.relativePerformance >= 0 ? "+" : ""}{economics.relativePerformance.toFixed(2)} · Segment {integer.format(economics.segmentMarketSize)} Geräte/Tag
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 lg:contents">
        <div>
          <p className="text-[0.58rem] tracking-wide text-slate-600 uppercase">Stückkosten</p>
          <p className="mt-1 font-mono text-xs text-slate-700">{formatMoney(economics.unitCost)}</p>
        </div>
        <div>
          <p className="text-[0.58rem] tracking-wide text-slate-600 uppercase">Nachfrage / Tag</p>
          <p className="mt-1 font-mono text-xs text-slate-700">{economics.demand.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[0.58rem] tracking-wide text-slate-600 uppercase">Absatz / Tag</p>
          <p className="mt-1 font-mono text-xs text-slate-700">{product.lastSales.toFixed(1)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 lg:justify-end">
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            aria-label={`Preis von ${product.name} senken`}
            onClick={() => dispatch({ type: "SET_PRODUCT_PRICE", productId: product.id, price: lowerPrice })}
            className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <Icon name="minus" size={13} />
          </button>
          <span className="min-w-24 px-2 text-center font-mono text-xs font-semibold text-slate-900">
            {formatMoney(product.price)}
          </span>
          <button
            type="button"
            aria-label={`Preis von ${product.name} erhöhen`}
            onClick={() => dispatch({ type: "SET_PRODUCT_PRICE", productId: product.id, price: product.price * 1.05 })}
            className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <Icon name="plus" size={13} />
          </button>
        </div>
        <ActionButton
          size="sm"
          variant="ghost"
          onClick={() => dispatch({ type: "RETIRE_PRODUCT", productId: product.id })}
        >
          Stilllegen
        </ActionButton>
      </div>
    </div>
  );
}

export function PcBuilderSection({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const [selectedCategory, setSelectedCategory] = useState<PcPartCategory>("cpu");
  const [configuration, setConfiguration] = useState<PcConfiguration>(() =>
    createSegmentConfiguration(state.componentResearch, "mainstream"),
  );
  const [name, setName] = useState("Circuit Nova");
  const [marketSegment, setMarketSegment] = useState<PcMarketSegment>("mainstream");
  const [price, setPrice] = useState(() =>
    String(evaluatePcBuild(configuration).suggestedPrice),
  );

  const evaluation = useMemo(() => evaluatePcBuild(configuration), [configuration]);
  const selectedCategoryDefinition = PC_PART_CATEGORIES.find(
    (category) => category.id === selectedCategory,
  )!;
  const selectedTracks = getResearchTracksByCategory(selectedCategory);
  const selectedIssues = new Map<PcPartCategory, "error" | "warning">();
  for (const issue of evaluation.issues) {
    for (const category of issue.categories) {
      if (issue.type === "error" || !selectedIssues.has(category)) {
        selectedIssues.set(category, issue.type);
      }
    }
  }
  const numericPrice = Number(price.replace(",", "."));
  const minimumPrice = Math.ceil(evaluation.buildCost * 1.05);
  const maximumPrice = Math.floor(evaluation.suggestedPrice * 3);
  const priceIsValid =
    Number.isFinite(numericPrice) &&
    numericPrice >= minimumPrice &&
    numericPrice <= maximumPrice;
  const everyPartUnlocked = isConfigurationWithinResearch(
    configuration,
    state.componentResearch,
  );
  const duplicateConfiguration = state.products.some(
    (product) =>
      product.active &&
      product.configuration &&
      PC_RESEARCH_ATTRIBUTE_IDS.every(
        (attribute) => product.configuration?.[attribute] === configuration[attribute],
      ),
  );
  const canLaunch =
    evaluation.valid &&
    everyPartUnlocked &&
    name.trim().length >= 2 &&
    priceIsValid &&
    !duplicateConfiguration &&
    state.cash >= evaluation.developmentCost;
  const activeProducts = state.products.filter((product) => product.active);
  const powerSupply = getPcComponentSummary(configuration, "psu");

  function setAttributeLevel(attribute: PcResearchAttribute, level: number) {
    const maximum = state.componentResearch[attribute];
    setConfiguration((current) => ({
      ...current,
      [attribute]: Math.max(1, Math.min(maximum, Math.floor(level))),
    }));
  }

  function useBestCategoryValues() {
    setConfiguration((current) => {
      const next = { ...current };
      for (const track of selectedTracks) {
        next[track.id] = state.componentResearch[track.id];
      }
      return next;
    });
  }

  function applyMarketSegment(segment: PcMarketSegment) {
    const nextConfiguration = createSegmentConfiguration(state.componentResearch, segment);
    const nextEvaluation = evaluatePcBuild(nextConfiguration);
    setMarketSegment(segment);
    setConfiguration(nextConfiguration);
    setPrice(String(nextEvaluation.suggestedPrice));
  }

  function launchProduct() {
    if (!canLaunch) return;
    dispatch({
      type: "LAUNCH_CUSTOM_PC",
      name: name.trim(),
      price: numericPrice,
      configuration,
      marketSegment,
    });
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="PC-Labor"
        title="Eigenen PC zusammenstellen"
        description="Kombiniere die erforschten Einzelwerte jeder Komponente, prüfe Strom und Kühlung und bringe den PC auf den Markt."
        action={
          <StatusBadge tone={evaluation.valid ? "success" : "danger"} dot>
            {evaluation.valid ? "Bauplan bereit" : `${evaluation.issues.filter((issue) => issue.type === "error").length} Probleme`}
          </StatusBadge>
        }
      />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,.8fr)]">
        <Panel>
          <PanelHeader
            eyebrow="01 · Konfiguration"
            title="Modell entwerfen"
            description="Wähle Low-End, Mid-Range oder High-End für einen passenden automatischen Bauplan und passe die Komponenten danach bei Bedarf an."
          />

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
            {(Object.keys(PC_MARKET_SEGMENTS) as PcMarketSegment[]).map((segment) => {
              const definition = PC_MARKET_SEGMENTS[segment];
              const active = marketSegment === segment;
              return (
                <button
                  key={segment}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyMarketSegment(segment)}
                  className={`rounded-lg border px-2 py-2.5 text-left transition-colors ${active ? "border-blue-300 bg-white text-blue-700 shadow-sm" : "border-transparent text-slate-600 hover:bg-white"}`}
                >
                  <span className="block text-xs font-semibold">{definition.name}</span>
                  <span className="mt-0.5 hidden text-[0.58rem] text-slate-500 sm:block">{definition.description}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(13rem,.72fr)_minmax(0,1.28fr)]">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-[0.62rem] font-semibold tracking-[0.1em] text-slate-600 uppercase">
                  Modellname
                </span>
                <input
                  value={name}
                  maxLength={30}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="z. B. Circuit Nova"
                  className={fieldClassName()}
                />
              </label>

              <div>
                <p className="mb-2 text-[0.62rem] font-semibold tracking-[0.1em] text-slate-600 uppercase">
                  Komponenten
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                  {PC_PART_CATEGORIES.map((category) => (
                    <SelectedPartRow
                      key={category.id}
                      category={category}
                      configuration={configuration}
                      selected={selectedCategory === category.id}
                      issueTone={selectedIssues.get(category.id) ?? null}
                      onSelect={setSelectedCategory}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedCategoryDefinition.name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {selectedCategoryDefinition.description}
                  </p>
                </div>
                <ActionButton
                  size="sm"
                  variant="ghost"
                  onClick={useBestCategoryValues}
                >
                  Maximale Stufen
                </ActionButton>
              </div>

              <div className="mt-3 divide-y divide-slate-200">
                {selectedTracks.map((track) => {
                  const level = configuration[track.id];
                  const maximum = state.componentResearch[track.id];
                  return (
                    <div
                      key={track.id}
                      className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-slate-800">
                            {track.name}
                          </p>
                          <StatusBadge tone={level === maximum ? "success" : "neutral"}>
                            Stufe {level} / {maximum}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 truncate font-mono text-[0.68rem] text-blue-700">
                          {formatPcAttributeValue(track.id, level)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
                        <button
                          type="button"
                          disabled={level <= 1}
                          onClick={() => setAttributeLevel(track.id, level - 1)}
                          className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-25"
                          aria-label={`${track.name} verringern`}
                        >
                          <Icon name="minus" size={13} />
                        </button>
                        <span className="min-w-16 text-center font-mono text-xs font-semibold text-slate-900">
                          Stufe {level}
                        </span>
                        <button
                          type="button"
                          disabled={level >= maximum}
                          onClick={() => setAttributeLevel(track.id, level + 1)}
                          className="grid size-8 place-items-center rounded-lg text-blue-600 hover:bg-blue-500/10 disabled:pointer-events-none disabled:opacity-25"
                          aria-label={`${track.name} erhöhen`}
                        >
                          <Icon name="plus" size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={level >= maximum}
                          onClick={() => setAttributeLevel(track.id, maximum)}
                          className="rounded-lg px-2 py-2 text-[0.6rem] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-25"
                        >
                          Max
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="h-fit 2xl:sticky 2xl:top-4">
          <PanelHeader
            eyebrow="02 · Marktreife"
            title="Bauplan prüfen"
            description="Alle Werte aktualisieren sich direkt mit deiner Auswahl."
          />

          <div className="mt-5 grid grid-cols-2 gap-2">
            {[
              ["Leistungsindex", integer.format(evaluation.performance)],
              ["Qualität", `${Math.round(evaluation.quality)} / 100`],
              ["Stückkosten", formatMoney(evaluation.buildCost)],
              ["Richtpreis", formatMoney(evaluation.suggestedPrice)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[0.58rem] tracking-wide text-slate-600 uppercase">{label}</p>
                <p className="mt-1.5 font-mono text-sm font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <ProgressBar
              label="Strombedarf"
              value={evaluation.totalPower}
              max={Math.max(1, powerSupply.wattage ?? evaluation.recommendedWattage)}
              valueLabel={`${integer.format(evaluation.totalPower)} / ${integer.format(powerSupply.wattage ?? 0)} W`}
              tone={evaluation.totalPower <= (powerSupply.wattage ?? 0) ? "cyan" : "red"}
              size="sm"
            />
            <p className="-mt-1 text-[0.62rem] text-slate-600">
              Empfohlen inklusive Reserve: {integer.format(evaluation.recommendedWattage)} W
            </p>
            <ProgressBar
              label="Kühlung"
              value={evaluation.coolingNeed}
              max={Math.max(1, evaluation.coolingCapacity)}
              valueLabel={`${integer.format(evaluation.coolingNeed)} / ${integer.format(evaluation.coolingCapacity)} W`}
              tone={evaluation.coolingNeed <= evaluation.coolingCapacity ? "green" : "red"}
              size="sm"
            />
          </div>

          {evaluation.issues.length ? (
            <div className="mt-4 space-y-2" aria-live="polite">
              {evaluation.issues.map((issue, index) => (
                <div
                  key={`${issue.message}-${index}`}
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-5 ${
                    issue.type === "error"
                      ? "border-rose-300/15 bg-rose-300/[0.045] text-rose-800"
                      : "border-amber-300/15 bg-amber-300/[0.045] text-amber-800"
                  }`}
                >
                  <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] px-3 py-2.5 text-xs text-emerald-800">
              <Icon name="check" size={15} />
              Alle Komponenten sind kompatibel.
            </div>
          )}

          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.62rem] tracking-wide text-slate-600 uppercase">Entwicklung</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                  {formatCompactMoney(evaluation.developmentCost)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrice(String(evaluation.suggestedPrice))}
                className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                Richtpreis {formatMoney(evaluation.suggestedPrice)}
              </button>
            </div>

            <label className="block">
              <span className="mb-2 block text-[0.62rem] font-semibold tracking-[0.1em] text-slate-600 uppercase">
                Verkaufspreis
              </span>
              <div className="relative">
                <input
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  aria-invalid={!priceIsValid}
                  className={`${fieldClassName()} pr-9 font-mono ${!priceIsValid ? "border-rose-300/35" : ""}`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-600">€</span>
              </div>
              {!priceIsValid ? (
                <span className="mt-1.5 block text-[0.65rem] text-rose-700">
                  {!Number.isFinite(numericPrice)
                    ? "Gib einen gültigen Verkaufspreis ein."
                    : numericPrice < minimumPrice
                      ? `Mindestens ${formatMoney(minimumPrice)}, damit keine Verluste entstehen.`
                      : `Höchstens ${formatMoney(maximumPrice)} für einen realistischen Marktstart.`}
                </span>
              ) : null}
            </label>

            <ActionButton
              className="mt-4"
              fullWidth
              size="lg"
              disabled={!canLaunch}
              onClick={launchProduct}
              leadingIcon={<Icon name="sparkles" size={16} />}
            >
              Modell auf den Markt bringen
            </ActionButton>
            {state.cash < evaluation.developmentCost ? (
              <p className="mt-2 text-center text-[0.65rem] text-amber-700">
                Es fehlen {formatCompactMoney(evaluation.developmentCost - state.cash)} für die Entwicklung.
              </p>
            ) : !everyPartUnlocked ? (
              <p className="mt-2 text-center text-[0.65rem] text-amber-700">
                Mindestens eine gewählte Stufe ist noch nicht erforscht.
              </p>
            ) : duplicateConfiguration ? (
              <p className="mt-2 text-center text-[0.65rem] text-amber-700">
                Diese Konfiguration ist bereits aktiv. Verändere mindestens ein Bauteil.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel padding="none" className="overflow-hidden">
        <div className="p-4 sm:p-5">
          <PanelHeader
            eyebrow="Aktive Modelle"
            title="Produkte am Markt"
            description="Passe Preise in kleinen Schritten an oder lege ein Modell still."
            action={<StatusBadge tone="info">{activeProducts.length} aktiv</StatusBadge>}
          />
        </div>
        {activeProducts.length ? (
          <div className="border-t border-slate-200">
            {activeProducts.map((product) => (
              <ProductRow
                key={product.id}
                state={state}
                product={product}
                dispatch={dispatch}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <EmptyState
              compact
              icon={<Icon name="monitor" size={18} />}
              title="Noch kein aktives Modell"
              description="Stelle oben deinen ersten kompatiblen PC zusammen."
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
