"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createInitialState, GAME_VERSION, STORAGE_KEY, TECH_TREE } from "./data";
import {
  LOAN_TERM_DAYS,
  MARKETING_FOCUSES,
  compactCompanyHistory,
  gameReducer,
  simulateDays,
} from "./engine";
import {
  STARTER_PART_IDS,
  getComponentResearchProject,
  migrateLegacyResearch,
  normalizePcConfiguration,
  sanitizeResearchLevels,
} from "./pc-system";
import {
  getOfflineSimulationDays,
  getSimulationPulse,
  normalizeActiveGameSpeed,
  normalizeGameSpeed,
} from "./time";
import type { EnterpriseContractState, GameState, SimulationSummary } from "./types";

type SaveStatus = "saved" | "saving" | "error";

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function withoutTransientProductMetrics<T extends object>(product: T): T {
  const clean = { ...product } as T & Record<string, unknown>;
  delete clean.unitsSold;
  delete clean.lifetimeRevenue;
  delete clean.lastDemand;
  delete clean.lastProduction;
  delete clean.lastSales;
  delete clean.lastContractSales;
  delete clean.lastLostSales;
  delete clean.lastReturns;
  delete clean.salesChannel;
  return clean;
}

function migrateEnterpriseContract(value: unknown): EnterpriseContractState | null {
  if (!value || typeof value !== "object") return null;
  const contract = { ...value } as Record<string, unknown>;
  const totalDays = Math.max(1, Math.floor(safeNumber(contract.totalDays, safeNumber(contract.durationDays, 1))));
  const legacyDailyUnits = Math.max(0, safeNumber(contract.unitsPerDay));
  const totalUnits = Math.min(
    Number.MAX_SAFE_INTEGER,
    Math.max(1, safeNumber(contract.totalUnits, legacyDailyUnits * totalDays || 1)),
  );
  delete contract.unitsPerDay;
  delete contract.lastFulfilled;
  delete contract.durationDays;
  delete contract.previousSalesChannel;
  return {
    ...contract,
    totalDays,
    daysRemaining: Math.max(1, Math.floor(safeNumber(contract.daysRemaining, totalDays))),
    totalUnits,
    fulfilledUnits: Math.min(totalUnits, Math.max(0, safeNumber(contract.fulfilledUnits))),
    unitPrice: Math.max(0, safeNumber(contract.unitPrice)),
    minimumQuality: Math.max(0, safeNumber(contract.minimumQuality)),
    lastDelivery: Math.max(0, safeNumber(contract.lastDelivery)),
  } as unknown as EnterpriseContractState;
}

export function mergeLoadedState(input: unknown): GameState | null {
  if (!input || typeof input !== "object") return null;
  const inputRecord = { ...input } as Record<string, unknown>;
  const legacyPendingEvent = inputRecord.pendingEvent;
  delete inputRecord.pendingEvent;
  delete inputRecord.lastEventDay;
  delete inputRecord.eventSeed;
  for (const obsolete of ["loanRateAdjustment", "staffingTargets", "autoStaffing", "monthlyPlan", "dividendPolicy", "lastDividendPaid", "investorConfidence", "capitalGuidance", "guidanceRevenueTarget"]) {
    delete inputRecord[obsolete];
  }
  const legacyContract = inputRecord.enterpriseContract;
  const rawContracts = Array.isArray(inputRecord.enterpriseContracts)
    ? inputRecord.enterpriseContracts
    : legacyContract
      ? [legacyContract]
      : [];
  inputRecord.enterpriseContracts = rawContracts
    .map(migrateEnterpriseContract)
    .filter((contract): contract is EnterpriseContractState => contract !== null);
  delete inputRecord.enterpriseContract;
  const parsed = inputRecord as Partial<GameState>;
  const saveVersion = parsed.version ?? -1;
  if (
    !Number.isInteger(saveVersion) ||
    saveVersion < 1 ||
    saveVersion > GAME_VERSION ||
    typeof parsed.day !== "number"
  ) return null;

  const base = createInitialState();
  const loadedCompetitors = Array.isArray(parsed.competitors) ? parsed.competitors : [];
  const mergedCompetitors = base.competitors.map((competitor) => {
    const existing = loadedCompetitors.find((item) => item?.id === competitor.id);
    if (!existing) return competitor;
    const merged = { ...competitor, ...existing };
    const currentPrice = Math.max(0, safeNumber(merged.price, competitor.price));
    const currentDay = Math.max(0, Math.floor(safeNumber(parsed.day)));
    return {
      ...merged,
      averageCost:
        typeof existing.averageCost === "number"
          ? existing.averageCost
          : existing.ownedShares > 0
            ? existing.price
            : 0,
      realizedProfit:
        typeof existing.realizedProfit === "number" ? existing.realizedProfit : 0,
      // Tägliche OHLC-Daten werden absichtlich nicht persistiert. Ein einzelner
      // valider Startpunkt hält Chart und Orders nach dem Laden funktionsfähig.
      priceHistory: [{
        day: currentDay,
        open: currentPrice,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
      }],
    };
  });
  const unlockedTech = Array.isArray(parsed.unlockedTech)
    ? parsed.unlockedTech
    : base.unlockedTech;
  const highestLegacyEra = TECH_TREE.reduce(
    (highest, tech) => unlockedTech.includes(tech.id) ? Math.max(highest, tech.era) : highest,
    0,
  );
  const migratedTier = highestLegacyEra >= 5 ? 4 : highestLegacyEra >= 3 ? 3 : highestLegacyEra >= 1 ? 2 : 1;
  const unlockedParts = Array.isArray(parsed.unlockedParts)
    ? parsed.unlockedParts
    : STARTER_PART_IDS;
  const componentResearch = parsed.componentResearch
    ? sanitizeResearchLevels(parsed.componentResearch)
    : migrateLegacyResearch(unlockedParts, parsed.version === 1 ? migratedTier : 1);
  const componentProject = getComponentResearchProject(parsed.currentResearch);
  const currentResearch =
    componentProject &&
      componentProject.targetLevel ===
        componentResearch[componentProject.attribute] + 1
      ? parsed.currentResearch ?? null
      : null;
  const legacySpeedScale = saveVersion < 4;
  const previousSpeed = normalizeActiveGameSpeed(
    parsed.previousSpeed,
    legacySpeedScale,
  );
  const savedSpeed = normalizeGameSpeed(parsed.speed, legacySpeedScale);
  const speed = legacyPendingEvent && savedSpeed === 0
    ? previousSpeed
    : savedSpeed;
  const sectionMap: Partial<Record<GameState["selectedSection"], GameState["selectedSection"]>> = {
    products: "builder",
  };
  const selectedSection = sectionMap[parsed.selectedSection ?? "dashboard"] ?? parsed.selectedSection ?? "dashboard";
  const latestValidHistory = Array.isArray(parsed.history)
    ? [...parsed.history].reverse().find((point) =>
        Number.isFinite(point.cash) &&
        Number.isFinite(point.valuation) &&
        point.valuation < Number.MAX_SAFE_INTEGER,
      )
    : undefined;
  const recoveredCash = safeNumber(latestValidHistory?.cash, base.cash);
  const recoveredValuation = Math.max(250_000, safeNumber(latestValidHistory?.valuation, base.valuation));
  const totalShares = Math.max(1, Math.floor(safeNumber(parsed.totalShares, base.totalShares)));
  const storedValuation = safeNumber(parsed.valuation, recoveredValuation);
  const valuation = storedValuation >= Number.MAX_SAFE_INTEGER
    ? recoveredValuation
    : Math.max(250_000, storedValuation);

  return {
    ...base,
    ...parsed,
    version: GAME_VERSION,
    takeoverRisk: 0,
    takeoverDefenseDays: 0,
    speed,
    previousSpeed,
    cash: safeNumber(parsed.cash, recoveredCash),
    debt: Math.max(0, safeNumber(parsed.debt)),
    lifetimeRevenue: Math.max(0, safeNumber(parsed.lifetimeRevenue)),
    lifetimeProfit: safeNumber(parsed.lifetimeProfit),
    monthlyRevenue: Math.max(0, safeNumber(parsed.monthlyRevenue)),
    monthlyProductRevenue: Math.max(0, safeNumber(parsed.monthlyProductRevenue, safeNumber(parsed.monthlyRevenue))),
    monthlyContractRevenue: Math.max(0, safeNumber(parsed.monthlyContractRevenue)),
    monthlyExpenses: Math.max(0, safeNumber(parsed.monthlyExpenses)),
    lastMonthRevenue: Math.max(0, safeNumber(parsed.lastMonthRevenue)),
    lastMonthProductRevenue: Math.max(0, safeNumber(parsed.lastMonthProductRevenue, safeNumber(parsed.lastMonthRevenue))),
    lastMonthContractRevenue: Math.max(0, safeNumber(parsed.lastMonthContractRevenue)),
    lastMonthExpenses: Math.max(0, safeNumber(parsed.lastMonthExpenses)),
    lastDayRevenue: Math.max(0, safeNumber(parsed.lastDayRevenue)),
    lastDayProductRevenue: Math.max(0, safeNumber(parsed.lastDayProductRevenue, safeNumber(parsed.lastDayRevenue))),
    lastDayContractRevenue: Math.max(0, safeNumber(parsed.lastDayContractRevenue)),
    lastDayExpenses: Math.max(0, safeNumber(parsed.lastDayExpenses)),
    founderShares: Math.min(totalShares, Math.max(0, Math.floor(safeNumber(parsed.founderShares, base.founderShares)))),
    totalShares,
    valuation,
    sharePrice: valuation / totalShares,
    dailyDebtRepayment:
      Number.isFinite(parsed.dailyDebtRepayment)
        ? Math.max(0, safeNumber(parsed.dailyDebtRepayment))
        : Math.max(0, safeNumber(parsed.debt)) / LOAN_TERM_DAYS,
    difficulty: parsed.difficulty ?? base.difficulty,
    employees: { ...base.employees, ...(parsed.employees ?? {}) },
    departmentLevels: {
      ...base.departmentLevels,
      ...(parsed.departmentLevels ?? {}),
    },
    productGenerations: {
      ...base.productGenerations,
      ...(parsed.productGenerations ?? {}),
    },
    factoryCondition:
      Math.min(100, Math.max(20, safeNumber(parsed.factoryCondition, 100))),
    maintenanceBudget:
      Math.max(0, safeNumber(parsed.maintenanceBudget, base.maintenanceBudget)),
    qualityFocus: Math.min(1.3, Math.max(0.7, safeNumber(parsed.qualityFocus, base.qualityFocus))),
    marketingBudget: Math.max(0, safeNumber(parsed.marketingBudget, base.marketingBudget)),
    marketingFocus: parsed.marketingFocus && MARKETING_FOCUSES[parsed.marketingFocus] ? parsed.marketingFocus : base.marketingFocus,
    marketingTarget: parsed.marketingTarget && ["all", "budget", "mainstream", "performance"].includes(parsed.marketingTarget) ? parsed.marketingTarget : base.marketingTarget,
    enterpriseContracts: Array.isArray(parsed.enterpriseContracts)
      ? parsed.enterpriseContracts.map(migrateEnterpriseContract).filter((contract): contract is EnterpriseContractState => contract !== null)
      : [],
    products: Array.isArray(parsed.products)
      ? parsed.products.filter((product) => product.active !== false).map((product) => ({
          ...withoutTransientProductMetrics(product),
          productionTarget:
            saveVersion < 7
              ? null
              : typeof product.productionTarget === "number" || product.productionTarget === null
              ? product.productionTarget
              : null,
          lastLostSales: 0,
          lastDemand: 0,
          lastProduction: 0,
          lastSales: 0,
          lastContractSales: 0,
          lastReturns: 0,
          generation:
            typeof product.generation === "number" ? Math.max(1, product.generation) : 1,
          configuration: product.configuration
            ? normalizePcConfiguration(product.configuration)
            : undefined,
          marketSegment: product.marketSegment ?? (product.audience === "gaming" || product.audience === "creator" ? "performance" : "budget"),
        }))
      : base.products,
    history: compactCompanyHistory([base.history[0], ...(Array.isArray(parsed.history) ? parsed.history : [])].map((point) => ({
      ...point,
      day: Math.max(0, Math.floor(safeNumber(point.day))),
      revenue: Math.max(0, safeNumber(point.revenue)),
      productRevenue: Math.max(0, safeNumber(point.productRevenue, safeNumber(point.revenue))),
      contractRevenue: Math.max(0, safeNumber(point.contractRevenue)),
      expenses: Math.max(0, safeNumber(point.expenses)),
      profit: safeNumber(point.profit),
      valuation: safeNumber(point.valuation, base.valuation) >= Number.MAX_SAFE_INTEGER
        ? base.valuation
        : Math.max(250_000, safeNumber(point.valuation, base.valuation)),
      cash: safeNumber(point.cash),
      debt: Math.max(0, safeNumber(point.debt)),
      marketShare: Math.min(100, Math.max(0, safeNumber(point.marketShare, base.marketShare))),
      employees: Math.max(0, Math.floor(safeNumber(point.employees))),
      brand: Math.min(100, Math.max(0, safeNumber(point.brand, base.brand))),
    }))),
    competitors: mergedCompetitors,
    unlockedTech,
    unlockedParts: [...new Set([...STARTER_PART_IDS, ...unlockedParts])],
    componentResearch,
    currentResearch,
    autoResearch: parsed.autoResearch === true,
    autoAcceptContracts: parsed.autoAcceptContracts === true,
    selectedSection,
    news: Array.isArray(parsed.news) ? parsed.news : base.news,
    achievements: Array.isArray(parsed.achievements)
      ? parsed.achievements
      : base.achievements,
    lastSavedAt:
      typeof parsed.lastSavedAt === "number" ? parsed.lastSavedAt : Date.now(),
    lastTickAt:
      typeof parsed.lastTickAt === "number" ? parsed.lastTickAt : Date.now(),
  };
}

export function serializeState(state: GameState, now = Date.now()) {
  // Tageskennzahlen werden nach dem Laden neu berechnet. Eine Positivliste
  // verhindert, dass Produktstatistiken später versehentlich im Save landen.
  const products = state.products
    .filter((product) => product.active)
    .map((product) => ({
      id: product.id,
      blueprintId: product.blueprintId,
      name: product.name,
      price: product.price,
      launchedDay: product.launchedDay,
      inventory: product.inventory,
      active: true,
      qualityBonus: product.qualityBonus,
      productionTarget: product.productionTarget,
      generation: product.generation,
      predecessorId: product.predecessorId,
      configuration: product.configuration,
      audience: product.audience,
      marketSegment: product.marketSegment,
    }));
  const competitors = state.competitors.map((competitor) => ({
    ...competitor,
    history: competitor.history.slice(-12),
    // Die täglichen Kurskerzen sind reine Laufzeitdaten und würden bei 100
    // Unternehmen den Großteil des Speicherstands ausmachen.
    priceHistory: undefined,
  }));
  return JSON.stringify({
    ...state,
    products,
    competitors,
    history: compactCompanyHistory(state.history),
    news: state.news.slice(0, 24),
    unlockedParts: undefined,
    takeoverRisk: undefined,
    takeoverDefenseDays: undefined,
    lastDayRevenue: undefined,
    lastDayExpenses: undefined,
    lastSavedAt: now,
    lastTickAt: now,
    saveRevision: state.saveRevision + 1,
  });
}

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState(0);
  const [offlineSummary, setOfflineSummary] =
    useState<SimulationSummary | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const lastPersistedRevisionRef = useRef(-1);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = Date.now();
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const loaded = mergeLoadedState(JSON.parse(raw));
          if (loaded) {
            const offlineDays = getOfflineSimulationDays(
              now - (loaded.lastTickAt || loaded.lastSavedAt),
            );
            if (offlineDays >= 1) {
              const result = simulateDays(loaded, offlineDays, {
                now,
              });
              dispatch({ type: "LOAD_STATE", state: result.state });
              setOfflineSummary(result.summary);
            } else {
              dispatch({
                type: "LOAD_STATE",
                state: { ...loaded, lastTickAt: now },
              });
            }
            setSavedAt(loaded.lastSavedAt);
          }
        } else {
          setSavedAt(now);
        }
      } catch {
        setSaveStatus("error");
        setSavedAt(now);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const pulse = getSimulationPulse(state.speed);
    if (!hydrated || !pulse) return;
    const timer = window.setInterval(() => {
      dispatch({ type: "TICK", days: pulse.days, now: Date.now() });
    }, pulse.intervalMs);
    return () => window.clearInterval(timer);
  }, [hydrated, state.speed]);

  useEffect(() => {
    if (!hydrated) return;
    const saveTimer = window.setInterval(() => {
      const current = stateRef.current;
      if (!current || current.saveRevision === lastPersistedRevisionRef.current) {
        return;
      }
      setSaveStatus("saving");
      try {
        const now = Date.now();
        window.localStorage.setItem(STORAGE_KEY, serializeState(current, now));
        lastPersistedRevisionRef.current = current.saveRevision;
        setSavedAt(now);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 5_000);
    return () => window.clearInterval(saveTimer);
  }, [hydrated]);

  useEffect(() => {
    const persist = () => {
      try {
        if (stateRef.current) {
          window.localStorage.setItem(
            STORAGE_KEY,
            serializeState(stateRef.current),
          );
        }
      } catch {
        // The regular autosave indicator already surfaces storage errors.
      }
    };
    window.addEventListener("beforeunload", persist);
    return () => window.removeEventListener("beforeunload", persist);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.code === "Space") {
        event.preventDefault();
        dispatch({ type: "TOGGLE_PAUSE" });
      } else if (event.key === "1") {
        dispatch({ type: "SET_SPEED", speed: 1 });
      } else if (event.key === "2") {
        dispatch({ type: "SET_SPEED", speed: 5 });
      } else if (event.key === "3") {
        dispatch({ type: "SET_SPEED", speed: 10 });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const exportSave = useCallback(async () => {
    const current = stateRef.current;
    if (!current) return false;
    const raw = serializeState(current);
    try {
      await navigator.clipboard.writeText(raw);
      return true;
    } catch {
      return false;
    }
  }, []);

  const importSave = useCallback((raw: string) => {
    try {
      const loaded = mergeLoadedState(JSON.parse(raw));
      if (!loaded) return false;
      const now = Date.now();
      const next = { ...loaded, lastSavedAt: now, lastTickAt: now };
      dispatch({ type: "LOAD_STATE", state: next });
      window.localStorage.setItem(STORAGE_KEY, serializeState(next, now));
      setSavedAt(now);
      setSaveStatus("saved");
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetGame = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setOfflineSummary(null);
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    dispatch,
    hydrated,
    saveStatus,
    savedAt,
    offlineSummary,
    dismissOfflineSummary: () => setOfflineSummary(null),
    exportSave,
    importSave,
    resetGame,
  };
}
