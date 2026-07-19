"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createInitialState, GAME_VERSION, STORAGE_KEY, TECH_TREE } from "./data";
import {
  LOAN_TERM_DAYS,
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
import type { GameState, SimulationSummary } from "./types";

type SaveStatus = "saved" | "saving" | "error";

function withoutTransientProductMetrics<T extends object>(product: T): T {
  const clean = { ...product } as T & Record<string, unknown>;
  delete clean.unitsSold;
  delete clean.lifetimeRevenue;
  delete clean.lastDemand;
  delete clean.lastProduction;
  delete clean.lastSales;
  delete clean.lastLostSales;
  return clean;
}

export function mergeLoadedState(input: unknown): GameState | null {
  if (!input || typeof input !== "object") return null;
  const inputRecord = { ...input } as Record<string, unknown>;
  const legacyPendingEvent = inputRecord.pendingEvent;
  delete inputRecord.pendingEvent;
  delete inputRecord.lastEventDay;
  delete inputRecord.eventSeed;
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
      priceHistory: Array.isArray(existing.priceHistory)
        ? existing.priceHistory
        : competitor.priceHistory,
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
    production: "company",
    people: "company",
    marketing: "marketing",
    finance: "market",
    stocks: "market",
    deals: "market",
  };
  const selectedSection = sectionMap[parsed.selectedSection ?? "dashboard"] ?? parsed.selectedSection ?? "dashboard";

  return {
    ...base,
    ...parsed,
    version: GAME_VERSION,
    takeoverRisk: 0,
    takeoverDefenseDays: 0,
    speed,
    previousSpeed,
    dailyDebtRepayment:
      typeof parsed.dailyDebtRepayment === "number"
        ? Math.max(0, parsed.dailyDebtRepayment)
        : Math.max(0, parsed.debt ?? 0) / LOAN_TERM_DAYS,
    employees: { ...base.employees, ...(parsed.employees ?? {}) },
    departmentLevels: {
      ...base.departmentLevels,
      ...(parsed.departmentLevels ?? {}),
    },
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
          configuration: product.configuration
            ? normalizePcConfiguration(product.configuration)
            : undefined,
          marketSegment: product.marketSegment ?? (product.audience === "gaming" || product.audience === "creator" ? "performance" : "budget"),
        }))
      : base.products,
    competitors: mergedCompetitors,
    unlockedTech,
    unlockedParts: [...new Set([...STARTER_PART_IDS, ...unlockedParts])],
    componentResearch,
    currentResearch,
    autoResearch: parsed.autoResearch === true,
    selectedSection,
    history: Array.isArray(parsed.history)
      ? compactCompanyHistory([base.history[0], ...parsed.history.map((point) => ({
          ...point,
          debt: typeof point.debt === "number" ? point.debt : 0,
          marketShare:
            typeof point.marketShare === "number"
              ? point.marketShare
              : parsed.marketShare ?? base.marketShare,
          employees:
            typeof point.employees === "number"
              ? point.employees
              : Object.values(parsed.employees ?? base.employees).reduce(
                  (sum, amount) => sum + amount,
                  0,
                ),
          brand:
            typeof point.brand === "number" ? point.brand : parsed.brand ?? base.brand,
        }))])
      : base.history,
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

function serializeState(state: GameState, now = Date.now()) {
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
      configuration: product.configuration,
      audience: product.audience,
      marketSegment: product.marketSegment,
    }));
  const competitors = state.competitors.map((competitor) => ({
    ...competitor,
    history: competitor.history.slice(-12),
    priceHistory: competitor.priceHistory.slice(-90),
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
