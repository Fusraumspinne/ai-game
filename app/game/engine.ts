import {
  CAMPAIGNS,
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  DEPARTMENTS,
  GAME_START_YEAR,
  GAME_VERSION,
  MARKETING_STRATEGIES,
  PRODUCT_BLUEPRINTS,
  TECH_TREE,
  createInitialState,
} from "./data";
import {
  PC_PART_CATEGORIES,
  PC_RESEARCH_ATTRIBUTE_IDS,
  createNextComponentResearchProject,
  evaluatePcBuild,
  getComponentResearchCost,
  getComponentResearchProject,
  getCumulativeComponentResearchCost,
  getPcConfigurationLabel,
  getPcResearchTrack,
  getResearchTracksByCategory,
  isConfigurationWithinResearch,
  migrateLegacyResearch,
  normalizePcConfiguration,
  sanitizeResearchLevels,
} from "./pc-system";
import type {
  CompetitorState,
  DepartmentId,
  EnterpriseContractState,
  GameAction,
  GameDifficulty,
  GameState,
  MarketingFocus,
  NewsItem,
  PcMarketSegment,
  PcResearchAttribute,
  PcResearchProject,
  ProductBlueprint,
  ProductState,
  SimulationSummary,
  TechDefinition,
} from "./types";
import {
  normalizeActiveGameSpeed,
  normalizeGameSpeed,
} from "./time";

const NEWS_LIMIT = 24;
const STOCK_HISTORY_LIMIT = 12;
const STOCK_DAILY_HISTORY_LIMIT = 90;
const MAX_SIMULATION_DAYS = 3_600;
const ANNUAL_BASE_RATE = 0.072;
export const LOAN_TERM_DAYS = DAYS_PER_YEAR * 5;
const STOCK_TRADING_FEE = 0.0035;
const DETAILED_COMPANY_HISTORY_MONTHS = 24;

export const DIFFICULTY_SETTINGS: Record<GameDifficulty, {
  name: string;
  description: string;
  startingCash: number;
  playerDemand: number;
  competitorTechnology: number;
  interestAdjustment: number;
}> = {
  relaxed: { name: "Entspannt", description: "Mehr Startkapital und etwas nachsichtigere Märkte.", startingCash: 350_000, playerDemand: 1.18, competitorTechnology: -0.12, interestAdjustment: -0.01 },
  realistic: { name: "Realistisch", description: "Ausgewogene Konkurrenz und Finanzierung.", startingCash: 225_000, playerDemand: 1, competitorTechnology: 0, interestAdjustment: 0 },
  hard: { name: "Hart", description: "Knappes Kapital, stärkere Rivalen und teurere Kredite.", startingCash: 100_000, playerDemand: 0.84, competitorTechnology: 0.18, interestAdjustment: 0.018 },
};

export const MARKETING_FOCUSES: Record<MarketingFocus, { name: string; description: string; reach: number; brand: number }> = {
  awareness: { name: "Bekanntheit", description: "Mehr Reichweite und stärkerer Markenaufbau.", reach: 1.1, brand: 1.35 },
  conversion: { name: "Verkauf", description: "Ausgewogener Fokus auf messbaren Absatz.", reach: 1.04, brand: 1 },
  loyalty: { name: "Kundenbindung", description: "Weniger Reichweite, aber stabilere Marke bei Retouren.", reach: 0.97, brand: 0.9 },
};

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

const COMPETITOR_TAILWINDS: Record<string, readonly number[]> = {
  monolith: [-0.005, -0.005, -0.005, -0.005, -0.005, -0.005, -0.005],
  pixelworks: [0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025],
  telestar: [0.025, 0.025, 0.025, 0.09, 0.09, 0.09, 0.09],
  nexabyte: [0.075, 0.075, 0.075, 0.075, 0.075, 0.075, 0.075],
  softunion: [0.015, 0.015, 0.035, 0.035, 0.035, 0.035, 0.035],
  microfab: [0.004, 0.006, 0.008, 0.01, 0.01, 0.008, 0.005],
  coolwave: [0.018, 0.022, 0.028, 0.034, 0.04, 0.04, 0.035],
  datavault: [0.03, 0.035, 0.04, 0.045, 0.04, 0.028, 0.012],
  northbridge: [0.038, 0.043, 0.052, 0.062, 0.06, 0.05, 0.04],
  orbitnet: [-0.008, -0.002, 0.018, 0.05, 0.072, 0.07, 0.058],
  luminagraphics: [0.02, 0.03, 0.048, 0.072, 0.09, 0.09, 0.075],
  helixrobotics: [0.008, 0.012, 0.022, 0.04, 0.06, 0.072, 0.07],
  ironclad: [0.008, 0.01, 0.006, 0.002, -0.004, -0.008, -0.012],
  novahome: [0.018, 0.02, 0.016, 0.012, 0.008, 0.004, 0],
  vertex: [0.03, 0.034, 0.038, 0.04, 0.035, 0.03, 0.024],
  bytecraft: [0.05, 0.055, 0.05, 0.042, 0.032, 0.024, 0.018],
  apex: [0.065, 0.07, 0.075, 0.068, 0.058, 0.05, 0.04],
  officecore: [0.022, 0.024, 0.021, 0.018, 0.014, 0.01, 0.006],
  meridian: [0.034, 0.038, 0.041, 0.038, 0.032, 0.026, 0.02],
  quantumgrid: [0.06, 0.068, 0.074, 0.07, 0.062, 0.052, 0.044],
  polarbyte: [0.018, 0.025, 0.034, 0.043, 0.048, 0.045, 0.038],
  cedarlabs: [0.026, 0.03, 0.036, 0.04, 0.038, 0.032, 0.025],
  redline: [0.045, 0.052, 0.058, 0.054, 0.046, 0.038, 0.03],
  ember: [-0.055, -0.06, -0.065, -0.07, -0.075, -0.08, -0.085],
};

export type TechStatus = "unlocked" | "researching" | "available" | "locked";

export interface GameDate {
  day: number;
  month: number;
  year: number;
  monthName: string;
  label: string;
}

export interface CompanyControl {
  percentage: number;
  level: "full" | "majority" | "blocking" | "board" | "endangered";
  label: string;
  detail: string;
  vulnerable: boolean;
}

export interface ProductEconomics {
  blueprint: ProductBlueprint;
  unitCost: number;
  unitMargin: number;
  margin: number;
  quality: number;
  ageDays: number;
  ageFactor: number;
  modernity: number;
  fairPrice: number;
  marketPool: number;
  marketSegment: PcMarketSegment;
  segmentMarketSize: number;
  competitorBenchmark: number;
  relativePerformance: number;
  priceCompetitiveness: number;
  marketRank: number;
  appeal: number;
  demand: number;
  production: number;
  sales: number;
  revenue: number;
  productionCost: number;
  grossProfit: number;
  warrantyRate: number;
  warrantyCost: number;
}

export interface CompetitorProductOffer {
  competitorId: string;
  companyName: string;
  name: string;
  segment: PcMarketSegment;
  technology: number;
  price: number;
  quality: number;
  availability: number;
  appeal: number;
}

export interface EnterpriseContractOffer {
  id: string;
  clientName: string;
  segment: PcMarketSegment;
  totalUnits: number;
  unitPrice: number;
  minimumQuality: number;
  durationDays: number;
}

export interface MergerTerms {
  totalPrice: number;
  cashCost: number;
  shareConsideration: number;
  newShares: number;
  postMergerOwnership: number;
}

export interface ShareIssueQuote {
  percent: number;
  shares: number;
  proceeds: number;
  discount: number;
  postTransactionOwnership: number;
  estimatedSharePrice: number;
}

export interface BuybackQuote {
  percent: number;
  shares: number;
  cost: number;
  premium: number;
  postTransactionOwnership: number;
  estimatedSharePrice: number;
  founderStakeValueBefore: number;
  founderStakeValueAfter: number;
}

export interface CompanyHealth {
  score: number;
  status: "healthy" | "watch" | "critical";
  label: string;
  runwayDays: number;
  profitable: boolean;
  reasons: string[];
}

export interface SimulationOptions {
  now?: number;
}

export interface SimulationResult {
  state: GameState;
  summary: SimulationSummary;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

/** Keeps every recent monthly close, one aggregated point per older business
 * year, and the founding point. Charts therefore cover the whole company life
 * without allowing localStorage to grow by one object every month forever. */
export function compactCompanyHistory(points: readonly GameState["history"][number][]) {
  if (!points.length) return [];
  const ordered = [...points].sort((left, right) => left.day - right.day);
  const latestDay = ordered.at(-1)?.day ?? 0;
  const detailedCutoff = latestDay - DETAILED_COMPANY_HISTORY_MONTHS * DAYS_PER_MONTH;
  const founding = ordered.find((point) => point.day <= 0);
  const recent = ordered.filter((point) => point.day > Math.max(0, detailedCutoff));
  const annual = new Map<number, GameState["history"][number]>();
  for (const point of ordered) {
    if (point.day <= 0 || point.day > detailedCutoff) continue;
    const year = Math.floor(Math.max(0, point.day - 1) / DAYS_PER_YEAR);
    const previous = annual.get(year);
    annual.set(year, {
      ...point,
      revenue: (previous?.revenue ?? 0) + point.revenue,
      productRevenue: (previous?.productRevenue ?? 0) + (point.productRevenue ?? point.revenue),
      contractRevenue: (previous?.contractRevenue ?? 0) + (point.contractRevenue ?? 0),
      expenses: (previous?.expenses ?? 0) + point.expenses,
      profit: (previous?.profit ?? 0) + point.profit,
    });
  }
  return [
    ...(founding ? [founding] : []),
    ...annual.values(),
    ...recent,
  ].sort((left, right) => left.day - right.day);
}

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function positiveInteger(value: number, fallback = 0) {
  return Math.max(0, Math.floor(finite(value, fallback)));
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getBlueprint(blueprintId: string) {
  return PRODUCT_BLUEPRINTS.find((blueprint) => blueprint.id === blueprintId);
}

/**
 * Old saves keep their original blueprint. Newly designed PCs are translated
 * into the same compact economy profile, so the proven sales simulation can
 * handle both without separate code paths.
 */
export function resolveProductBlueprint(product: ProductState) {
  if (!product.configuration) return getBlueprint(product.blueprintId);
  const build = evaluatePcBuild(product.configuration);
  return {
    id: product.blueprintId,
    name: product.name,
    category: "computer",
    tagline: getPcConfigurationLabel(product.configuration),
    description: "Ein selbst entwickelter PC.",
    era: Math.max(0, build.tier - 1),
    requiredTech: [],
    developmentCost: build.developmentCost,
    basePrice: build.suggestedPrice,
    unitCost: build.buildCost,
    baseDemand: build.baseDemand,
    quality: build.quality,
    icon: "computer",
    accent: "#2563eb",
  } satisfies ProductBlueprint;
}

function getTech(techId: string | null) {
  return TECH_TREE.find((tech) => tech.id === techId);
}

function hasCompletedDeal(state: GameState, competitorId: string) {
  return state.competitors.some(
    (competitor) => competitor.id === competitorId && competitor.status !== "active",
  );
}

function addNews(state: GameState, item: Omit<NewsItem, "id"> & { id?: string }) {
  const id = item.id ?? `news-${item.category}-${item.day}-${state.news.length}`;
  if (state.news.some((news) => news.id === id)) return state;
  return {
    ...state,
    news: [{ ...item, id }, ...state.news].slice(0, NEWS_LIMIT),
  };
}

function normalizePercent(value: number) {
  const normalized = finite(value);
  return clamp(normalized > 1 ? normalized / 100 : normalized, 0, 0.5);
}

function withRevision(previous: GameState, next: GameState) {
  if (previous === next) return previous;
  return { ...next, saveRevision: previous.saveRevision + 1 };
}

export function formatMoney(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits,
  }).format(finite(value));
}

export function formatCompactMoney(value: number) {
  const safeValue = finite(value);
  const absolute = Math.abs(safeValue);
  const sign = safeValue < 0 ? "−" : "";
  const localized = (amount: number, digits = 1) =>
    amount.toLocaleString("de-DE", { maximumFractionDigits: digits });

  if (absolute >= 1_000_000_000) return `${sign}${localized(absolute / 1_000_000_000, 2)} Mrd. €`;
  if (absolute >= 1_000_000) return `${sign}${localized(absolute / 1_000_000)} Mio. €`;
  if (absolute >= 1_000) return `${sign}${localized(absolute / 1_000)} Tsd. €`;
  return formatMoney(safeValue);
}

export function getGameDate(stateOrDay: GameState | number): GameDate {
  const elapsedDays = positiveInteger(
    typeof stateOrDay === "number" ? stateOrDay : stateOrDay.day,
  );
  const year = GAME_START_YEAR + Math.floor(elapsedDays / DAYS_PER_YEAR);
  const yearDay = elapsedDays % DAYS_PER_YEAR;
  const month = Math.floor(yearDay / DAYS_PER_MONTH) + 1;
  const day = (yearDay % DAYS_PER_MONTH) + 1;
  const monthName = MONTH_NAMES[month - 1];
  return { day, month, year, monthName, label: `${day}. ${monthName} ${year}` };
}

export function getCompanyControl(state: GameState): CompanyControl {
  const percentage = clamp((state.founderShares / Math.max(1, state.totalShares)) * 100, 0, 100);
  if (percentage >= 75) {
    return { percentage, level: "full", label: "Volle Kontrolle", detail: "Strategische Entscheidungen liegen bei dir.", vulnerable: false };
  }
  if (percentage >= 50) {
    return { percentage, level: "majority", label: "Sichere Mehrheit", detail: "Du hältst die operative Stimmenmehrheit.", vulnerable: false };
  }
  if (percentage >= 33.4) {
    return { percentage, level: "blocking", label: "Sperrminorität", detail: "Große Beschlüsse sind blockierbar, Kontrolle ist aber umkämpft.", vulnerable: true };
  }
  if (percentage >= 25) {
    return { percentage, level: "board", label: "Board-abhängig", detail: "Investoren können die Strategie blockieren.", vulnerable: true };
  }
  return { percentage, level: "endangered", label: "Kontrolle gefährdet", detail: "Eine feindliche Mehrheit kann die Führung ablösen.", vulnerable: true };
}

export function getGovernanceEfficiency(state: GameState) {
  const level = getCompanyControl(state).level;
  if (level === "full") return 1.03;
  if (level === "majority") return 1;
  if (level === "blocking") return 0.96;
  if (level === "board") return 0.9;
  return 0.82;
}

export function getEmployeeCount(state: GameState) {
  return (Object.keys(DEPARTMENTS) as DepartmentId[]).reduce(
    (total, department) => total + positiveInteger(state.employees[department]),
    0,
  );
}

const DEPARTMENT_WORKFORCE_SHARES: Record<DepartmentId, number> = {
  production: 0.45,
  research: 0.22,
  marketing: 0.08,
  sales: 0.18,
  finance: 0.07,
};

export function getWorkforcePlan(state: GameState) {
  const monthDay = state.day % DAYS_PER_MONTH || DAYS_PER_MONTH;
  const currentRevenueRunRate =
    (state.monthlyRevenue / Math.max(1, monthDay)) * DAYS_PER_MONTH;
  const annualRevenue = Math.max(
    state.lastMonthRevenue,
    currentRevenueRunRate,
  ) * 12;
  const recommendedTotal = Math.min(
    10_000_000,
    Math.max(
      12,
      Math.ceil(state.valuation / 320_000 + annualRevenue / 320_000),
    ),
  );
  const recommended = Object.fromEntries(
    (Object.keys(DEPARTMENTS) as DepartmentId[]).map((department) => [
      department,
      Math.max(1, Math.round(recommendedTotal * DEPARTMENT_WORKFORCE_SHARES[department])),
    ]),
  ) as Record<DepartmentId, number>;
  const coverage = Object.fromEntries(
    (Object.keys(DEPARTMENTS) as DepartmentId[]).map((department) => [
      department,
      clamp(
        state.employees[department] / Math.max(1, recommended[department]),
        0,
        1.25,
      ),
    ]),
  ) as Record<DepartmentId, number>;
  const weightedCoverage = (Object.keys(DEPARTMENTS) as DepartmentId[]).reduce(
    (total, department) =>
      total +
      Math.sqrt(Math.min(1, coverage[department])) *
        DEPARTMENT_WORKFORCE_SHARES[department],
    0,
  );
  const governanceEfficiency = getGovernanceEfficiency(state);
  const readiness = clamp(
    (0.4 + weightedCoverage * 0.6) * governanceEfficiency,
    0.32,
    1,
  );
  return {
    currentTotal: getEmployeeCount(state),
    recommendedTotal,
    recommended,
    coverage,
    readiness,
    governanceEfficiency,
    gap: Math.max(0, recommendedTotal - getEmployeeCount(state)),
  };
}

export function getDailyPayroll(state: GameState) {
  return (Object.keys(DEPARTMENTS) as DepartmentId[]).reduce(
    (total, department) =>
      total + positiveInteger(state.employees[department]) * getAdjustedDailySalary(state, department),
    0,
  );
}

export function getAdjustedDailySalary(
  stateOrDay: GameState | number,
  department: DepartmentId,
) {
  const day = typeof stateOrDay === "number" ? stateOrDay : stateOrDay.day;
  const wageInflation = 1.000065 ** Math.max(0, day);
  return DEPARTMENTS[department].salaryPerDay * wageInflation;
}

export function getDailyMarketingCost(state: GameState) {
  const strategy = MARKETING_STRATEGIES[state.marketingStrategy];
  return Math.max(0, state.marketingBudget) * strategy.costMultiplier + (state.campaign?.dailyCost ?? 0);
}

export function getMarketingEfficiency(state: GameState) {
  const workforce = getWorkforcePlan(state);
  return clamp(
    (0.68 +
      Math.log1p(Math.max(0, state.employees.marketing)) * 0.085 +
      Math.log1p(Math.max(0, state.departmentLevels.marketing - 1)) * 0.12) *
      (0.65 + Math.min(1, workforce.coverage.marketing) * 0.35),
    0.45,
    1.8,
  );
}

function getMarketingReach(state: GameState) {
  const strategy = MARKETING_STRATEGIES[state.marketingStrategy];
  const focus = MARKETING_FOCUSES[state.marketingFocus];
  const addressableRevenue = getDailyPcMarketSize(state) * 1_100;
  const effectiveMarketBudget = 5_000 + addressableRevenue * 0.0025;
  const spendingPressure = Math.max(0, state.marketingBudget) / effectiveMarketBudget;
  const paidReach = clamp(
    Math.log1p(spendingPressure * 2.5) * 0.28 * getMarketingEfficiency(state),
    0,
    1.5,
  );
  return (1 + paidReach) * strategy.demandMultiplier * focus.reach;
}

export function getDailySalesCapacity(state: GameState) {
  const salesEmployees = Math.max(0, positiveInteger(state.employees.sales));
  if (salesEmployees === 0) return 0;
  const departmentLevel = Math.max(1, state.departmentLevels.sales);
  const brandAccess = 0.42 + clamp(state.brand, 0, 100) / 125;
  const marketingSupport = 0.9 + (getMarketingReach(state) - 1) * 0.3;
  const organization = 0.7 + getWorkforcePlan(state).readiness * 0.3;
  const employeeCapacity =
    salesEmployees ** 0.9 *
    (8 + Math.sqrt(departmentLevel) * 1.5) *
    brandAccess *
    marketingSupport *
    organization;
  const channelCapacity =
    10 *
    3.15 ** Math.max(0, departmentLevel - 1) *
    (0.7 + clamp(state.brand, 0, 100) / 125) *
    marketingSupport;
  return Math.max(
    1,
    Math.min(employeeCapacity, channelCapacity),
  );
}

export function getFactoryCapacity(state: GameState) {
  const productionEmployees = positiveInteger(state.employees.production);
  const departmentLevel = Math.max(1, state.departmentLevels.production);
  const leanBonus = state.unlockedTech.includes("lean-fabs") ? 1.15 : 1;
  const roboticsBonus = hasCompletedDeal(state, "helixrobotics") ? 1.15 : 1;
  const organizationFactor = 0.72 + getWorkforcePlan(state).readiness * 0.28;
  const conditionFactor = 0.55 + clamp(state.factoryCondition, 0, 100) / 220;
  const laborCapacity =
    productionEmployees ** 0.92 *
    (1.8 + Math.sqrt(departmentLevel) * 0.55) *
    (1 + Math.sqrt(Math.max(0, state.automationLevel)) * 0.18) *
    leanBonus *
    roboticsBonus *
    organizationFactor *
    conditionFactor;
  const facilityCapacity =
    35 *
    3.3 ** Math.max(0, state.factoryLevel - 1) *
    (1 + Math.sqrt(Math.max(0, state.automationLevel)) * 0.45);
  return Math.max(
    productionEmployees > 0 ? 1 : 0,
    Math.round(
      Math.min(laborCapacity, facilityCapacity) /
        clamp(state.qualityFocus, 0.7, 1.3),
    ),
  );
}

export function getWarehouseCapacity(state: GameState) {
  return Math.min(
    Number.MAX_SAFE_INTEGER,
    Math.round(120 * 4.2 ** Math.max(0, state.warehouseLevel - 1)),
  );
}

export function getResearchRate(state: GameState) {
  const researchers = Math.max(0, state.employees.research);
  if (researchers === 0) return 0;
  const memoryLabBonus = hasCompletedDeal(state, "northbridge") ? 1.1 : 1;
  const researchCoverage = Math.min(1, getWorkforcePlan(state).coverage.research);
  const rawRate = (
    researchers ** 0.72 *
    70 *
    (1 + Math.log1p(Math.max(0, state.departmentLevels.research - 1)) * 0.38) *
    (0.65 + clamp(state.morale, 0, 100) / 200) *
    memoryLabBonus *
    (0.65 + researchCoverage * 0.35)
  );
  const componentProject = getComponentResearchProject(state.currentResearch);
  const tech = getTech(state.currentResearch ?? "");
  if (!componentProject && !tech) return rawRate;
  const projectCost = componentProject?.cost ?? tech?.cost ?? 1;
  const baseProjectDays = componentProject
    ? clamp(120 + componentProject.targetLevel * 20, 120, 720)
    : clamp(240 + (tech?.era ?? 1) * 60, 240, 900);
  const teamAcceleration = clamp(
    1 + Math.log10(1 + researchers) ** 1.35,
    1,
    12,
  );
  const minimumDays = baseProjectDays / teamAcceleration;
  return Math.min(rawRate, projectCost / minimumDays);
}

export function getTechStatus(state: GameState, techOrId: TechDefinition | string): TechStatus {
  const tech = typeof techOrId === "string" ? getTech(techOrId) : techOrId;
  if (!tech) return "locked";
  if (state.unlockedTech.includes(tech.id)) return "unlocked";
  if (state.currentResearch === tech.id) return "researching";
  return tech.prerequisites.every((id) => state.unlockedTech.includes(id)) ? "available" : "locked";
}

function getProductQuality(state: GameState, product: ProductState, blueprint: ProductBlueprint) {
  let bonus = product.qualityBonus;
  bonus += (clamp(state.qualityFocus, 0.7, 1.3) - 1) * 20;
  bonus += (clamp(state.factoryCondition, 0, 100) - 80) * 0.08;
  if (blueprint.category === "computer" && state.unlockedTech.includes("silicon16")) bonus += 6;
  if (blueprint.category === "phone" && state.unlockedTech.includes("lithium-cells")) bonus += 10;
  if (state.unlockedTech.includes("machine-learning")) bonus += 3;
  if (hasCompletedDeal(state, "pixelworks")) bonus += 14;
  if (blueprint.category === "computer" && hasCompletedDeal(state, "coolwave")) bonus += 4;
  if (blueprint.category === "computer" && hasCompletedDeal(state, "luminagraphics")) bonus += 8;
  return clamp(blueprint.quality + bonus, 1, 100);
}

function getUnitCost(
  state: GameState,
  blueprint: ProductBlueprint,
  product?: ProductState,
) {
  let factor = state.unlockedTech.includes("lean-fabs")
    ? 0.88
    : state.unlockedTech.includes("robotic-assembly")
      ? 0.92
      : 1;
  factor *= 1 - Math.min(0.12, state.automationLevel * 0.018);
  factor *= 1 - Math.min(0.1, Math.max(0, state.departmentLevels.production - 1) * 0.018);
  factor *= 1 + (clamp(state.qualityFocus, 0.7, 1.3) - 1) * 0.12;
  if (hasCompletedDeal(state, "nexabyte")) factor *= 0.94;
  if (blueprint.category === "software" && hasCompletedDeal(state, "softunion")) factor *= 0.91;
  if (blueprint.category === "computer" && hasCompletedDeal(state, "microfab")) factor *= 0.98;
  if (blueprint.category === "computer" && hasCompletedDeal(state, "datavault")) factor *= 0.97;
  if (blueprint.id === "halo-device" && state.unlockedTech.includes("edge-ai")) factor *= 0.82;
  if (blueprint.category === "computer") {
    const productTier = product?.configuration
      ? evaluatePcBuild(product.configuration).tier
      : blueprint.era + 1;
    const marketFrontier = 1 + state.day / 2_400;
    const generationsBehind = Math.max(0, marketFrontier - productTier);
    const componentDeflation = 0.16 + 0.84 * 2 ** (-generationsBehind * 1.05);
    factor *= componentDeflation;
  }
  return Math.max(1, blueprint.unitCost * factor);
}

export const PC_MARKET_SEGMENTS: Record<PcMarketSegment, {
  name: string;
  description: string;
  basePrice: number;
}> = {
  budget: { name: "Low-End", description: "Preisbewusste Haushalte und Büros", basePrice: 650 },
  mainstream: { name: "Mid-Range", description: "Der große Massenmarkt", basePrice: 1_200 },
  performance: { name: "High-End", description: "Enthusiasten und Profis", basePrice: 2_250 },
};

export function getDailyPcMarketSize(state: GameState) {
  const years = Math.max(0, state.day) / DAYS_PER_YEAR;
  const earlyMarket = 12_000 * 1.055 ** years;
  const consumerAdoption = 1_800_000 / (1 + Math.exp(-(years - 12) * 0.48));
  const connectedDeviceWave = 2_200_000 / (1 + Math.exp(-(years - 20) * 0.35));
  return Math.min(4_000_000, earlyMarket + consumerAdoption + connectedDeviceWave);
}

export function getEnterpriseContractOffers(state: GameState): EnterpriseContractOffer[] {
  const month = Math.floor(state.day / DAYS_PER_MONTH);
  const clients = ["Stadtverwaltung", "Nordstern Versicherung", "Helios Logistik"];
  return (Object.keys(PC_MARKET_SEGMENTS) as PcMarketSegment[]).map((segment, index) => {
    const deliverableCapacity = Math.max(1, Math.min(getFactoryCapacity(state), getDailySalesCapacity(state)));
    const contractShare = 0.32 + index * 0.12 + ((month + index) % 3) * 0.04;
    const priceInflation = 1 + Math.min(0.45, state.day / 8_000);
    const durationDays = 120 + index * 30;
    return {
      id: `enterprise-${month}-${segment}`,
      clientName: clients[(month + index) % clients.length],
      segment,
      totalUnits: Math.min(
        Number.MAX_SAFE_INTEGER,
        Math.max(1, Math.round(finite(deliverableCapacity, 1) * contractShare * durationDays)),
      ),
      unitPrice: Math.round(PC_MARKET_SEGMENTS[segment].basePrice * priceInflation * (0.78 + index * 0.035)),
      minimumQuality: 42 + index * 16 + Math.min(18, Math.floor(state.day / 1_200)),
      durationDays,
    };
  });
}

export function getEnterpriseContractUnitPrice(
  state: GameState,
  offeredUnitPrice: number,
  product: ProductState,
) {
  const blueprint = resolveProductBlueprint(product);
  if (!blueprint) return 0;
  const unitCost = getUnitCost(state, blueprint, product);
  const segment = getProductSegment(product);
  const maximumMarkup = segment === "budget" ? 1.07 : segment === "mainstream" ? 1.1 : 1.13;
  // Großkunden handeln einen Mengenrabatt aus. Gleichzeitig darf stark
  // verbilligte Alttechnik nicht dauerhaft zum historischen Marktpreis zur
  // Gelddruckmaschine werden.
  return roundMoney(Math.max(0, Math.min(
    finite(offeredUnitPrice),
    product.price * 0.94,
    unitCost * maximumMarkup,
  )));
}

export function isEnterpriseContractOfferUsed(state: GameState, offerId: string) {
  if (state.enterpriseContracts.some((contract) => contract.id === offerId)) return true;
  return state.news.some((item) =>
    item.id.startsWith(`contract-complete-${offerId}-`) ||
    item.id.startsWith(`contract-missed-${offerId}-`),
  );
}

export function getEnterpriseContractCapacity(state: GameState) {
  const factoryCapacity = getFactoryCapacity(state);
  const manualProduction = state.products.reduce(
    (sum, product) => sum + (product.active && product.productionTarget !== null
      ? Math.max(0, finite(product.productionTarget))
      : 0),
    0,
  );
  const automaticConsumerDemand = state.products.reduce(
    (sum, product) => sum + (product.active && product.productionTarget === null
      ? (getProductEconomics(state, product)?.demand ?? 0)
      : 0),
    0,
  );
  const consumerProduction = manualProduction + Math.min(
    automaticConsumerDemand,
    getDailySalesCapacity(state),
  );
  const committedContracts = state.enterpriseContracts.reduce(
    (sum, contract) => sum + getContractDailyTarget(contract),
    0,
  );
  const safeCapacity = factoryCapacity * 0.9;
  return {
    factoryCapacity,
    consumerProduction,
    committedContracts,
    safetyReserve: factoryCapacity - safeCapacity,
    available: Math.max(0, Math.floor(safeCapacity - consumerProduction - committedContracts)),
  };
}

function appendEnterpriseContract(
  state: GameState,
  offer: EnterpriseContractOffer,
  product: ProductState,
) {
  const unitPrice = getEnterpriseContractUnitPrice(state, offer.unitPrice, product);
  return {
    ...state,
    enterpriseContracts: [
      ...state.enterpriseContracts,
      {
        ...offer,
        unitPrice,
        productId: product.id,
        daysRemaining: offer.durationDays,
        totalDays: offer.durationDays,
        fulfilledUnits: 0,
        lastDelivery: 0,
      },
    ],
  };
}

function acceptAutomaticEnterpriseContracts(state: GameState) {
  if (!state.autoAcceptContracts) return state;
  let next = state;
  for (const offer of getEnterpriseContractOffers(state)) {
    if (isEnterpriseContractOfferUsed(next, offer.id)) continue;
    const product = next.products
      .filter((candidate) => {
        if (!candidate.active || getProductSegment(candidate) !== offer.segment) return false;
        const blueprint = resolveProductBlueprint(candidate);
        return Boolean(blueprint && getProductQuality(next, candidate, blueprint) >= offer.minimumQuality);
      })
      .map((candidate) => {
        const economics = getProductEconomics(next, candidate);
        const unitPrice = getEnterpriseContractUnitPrice(next, offer.unitPrice, candidate);
        return { candidate, economics, unitPrice, unitMargin: unitPrice - (economics?.unitCost ?? Number.POSITIVE_INFINITY) };
      })
      .filter((entry) => entry.economics && entry.unitMargin >= entry.economics.unitCost * 0.01)
      .sort((left, right) => right.unitMargin - left.unitMargin)[0];
    if (!product) continue;
    const dailyCommitment = Math.ceil(offer.totalUnits / Math.max(1, offer.durationDays));
    if (dailyCommitment > getEnterpriseContractCapacity(next).available) continue;
    next = appendEnterpriseContract(next, offer, product.candidate);
  }
  return next;
}

export function getContractDailyTarget(contract: EnterpriseContractState) {
  const totalUnits = Math.max(1, finite(contract.totalUnits, 1));
  const fulfilledUnits = clamp(finite(contract.fulfilledUnits), 0, totalUnits);
  const daysRemaining = Math.max(1, positiveInteger(contract.daysRemaining, 1));
  const remaining = Math.max(0, totalUnits - fulfilledUnits);
  return Math.min(remaining, Math.ceil(remaining / daysRemaining));
}

function getPcSegmentShare(segment: PcMarketSegment, day: number) {
  const maturity = clamp(day / 7_200, 0, 1);
  if (segment === "budget") return 0.5 - maturity * 0.1;
  if (segment === "mainstream") return 0.35 + maturity * 0.04;
  return 0.15 + maturity * 0.06;
}

function getProductSegment(product: ProductState): PcMarketSegment {
  if (product.marketSegment) return product.marketSegment;
  if (product.audience === "gaming" || product.audience === "creator") return "performance";
  return "budget";
}

function competitorSeed(competitor: CompetitorState) {
  return competitor.id.split("").reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
}

function marketPulse(competitor: CompetitorState, day: number, salt = 0) {
  const seed = competitorSeed(competitor) * 0.173 + salt * 19.19;
  const raw = Math.sin((day + 1) * 12.9898 + seed) * 43_758.5453;
  return (raw - Math.floor(raw)) * 2 - 1;
}

interface CompetitorPcOffer {
  competitor: CompetitorState;
  segment: PcMarketSegment;
  technology: number;
  price: number;
  quality: number;
  availability: number;
  appeal: number;
}

function getCompetitorPcOffers(state: GameState): CompetitorPcOffer[] {
  const frontier = 1 + state.day / 2_400;
  return state.competitors.flatMap((competitor) => {
    if (competitor.status !== "active" || !competitor.pcSegment) return [];
    const seed = competitorSeed(competitor);
    const productCycle = Math.sin(state.day / 95 + seed * 0.17) * 0.16;
    const technology = Math.max(
      0.5,
      frontier +
        (competitor.innovation - 58) / 68 +
        productCycle +
        DIFFICULTY_SETTINGS[state.difficulty].competitorTechnology,
    );
    const segment = competitor.pcSegment;
    const priceAnchor = PC_MARKET_SEGMENTS[segment].basePrice * (1 + Math.min(0.45, state.day / 8_000));
    const price = priceAnchor * (competitor.pcPricePosition ?? 1) *
      (1 + Math.sin(state.day / 140 + seed) * 0.035);
    const priceRatio = price / priceAnchor;
    const priceFactor = priceRatio <= 1
      ? Math.min(1.28, priceRatio ** -0.28)
      : Math.exp(-(priceRatio - 1) * 3.7);
    const technologyFactor = Math.exp((technology - frontier) * 1.45);
    const brandReach = 0.48 + competitor.brand / 82;
    const availability = clamp(0.62 + Math.sqrt(Math.max(0, competitor.marketShare) / 10), 0.62, 2.35);
    return [{
      competitor,
      segment,
      technology,
      price,
      quality: clamp(35 + competitor.innovation * 0.45 + competitor.brand * 0.18, 25, 98),
      availability,
      appeal: Math.max(0.01, technologyFactor * priceFactor * brandReach * availability),
    }];
  });
}

export function getCompetitorProductOffers(state: GameState): CompetitorProductOffer[] {
  return getCompetitorPcOffers(state).map((offer) => {
    const generation = Math.max(1, Math.floor(state.day / 540) + 1);
    return {
      competitorId: offer.competitor.id,
      companyName: offer.competitor.name,
      name: `${offer.competitor.ticker} ${PC_MARKET_SEGMENTS[offer.segment].name} G${generation}`,
      segment: offer.segment,
      technology: offer.technology,
      price: offer.price,
      quality: offer.quality,
      availability: offer.availability,
      appeal: offer.appeal,
    };
  });
}

interface ProductMarketMetrics {
  ageFactor: number;
  modernity: number;
  fairPrice: number;
  appeal: number;
  marketPool: number;
  marketSegment: PcMarketSegment;
  segmentMarketSize: number;
  competitorBenchmark: number;
  relativePerformance: number;
  priceCompetitiveness: number;
  marketRank: number;
  demand: number;
}

const productMarketCache = new WeakMap<GameState, Map<string, ProductMarketMetrics>>();

function calculateProductMarketMetrics(state: GameState) {
  const cached = productMarketCache.get(state);
  if (cached) return cached;
  const activeComputers = state.products.filter((candidate) => {
    const candidateBlueprint = resolveProductBlueprint(candidate);
    return candidate.active && candidateBlueprint?.category === "computer";
  });
  const competitorOffers = getCompetitorPcOffers(state);
  const metrics = activeComputers.map((candidate) => {
    const candidateBlueprint = resolveProductBlueprint(candidate)!;
    const build = candidate.configuration
      ? evaluatePcBuild(candidate.configuration)
      : null;
    const tier = build?.tier ?? candidateBlueprint.era + 1;
    const segment = getProductSegment(candidate);
    const performance = build?.performance ?? candidateBlueprint.quality;
    const technology = tier + Math.log2(1 + Math.max(0, performance)) / 17;
    const segmentCompetitors = competitorOffers.filter((offer) => offer.segment === segment);
    const competitorBenchmark = segmentCompetitors.length
      ? Math.max(...segmentCompetitors.map((offer) => offer.technology))
      : technology;
    const relativePerformance = technology - competitorBenchmark;
    const modernity = clamp(Math.exp(relativePerformance * 1.1), 0.05, 1);
    const ageFactor = 1;
    const unitCost = getUnitCost(state, candidateBlueprint, candidate);
    const competitorPrice = segmentCompetitors.length
      ? segmentCompetitors.reduce((sum, offer) => sum + offer.price, 0) / segmentCompetitors.length
      : PC_MARKET_SEGMENTS[segment].basePrice;
    const fairPrice = Math.max(
      unitCost * 1.08,
      competitorPrice * clamp(modernity * (1 + relativePerformance * 0.12), 0.1, 1.55),
    );
    const priceRatio = candidate.price / Math.max(1, competitorPrice);
    const priceCompetitiveness = priceRatio <= 1
      ? Math.min(1.32, priceRatio ** -0.26)
      : Math.exp(-(priceRatio - 1) * 4.4);
    const quality = getProductQuality(state, candidate, candidateBlueprint);
    const qualityFactor = clamp(0.55 + quality / 145, 0.55, 1.25);
    const technologyAppeal = relativePerformance < 0
      ? Math.exp(clamp(relativePerformance, -12, 0) * 2.05)
      : Math.exp(clamp(relativePerformance, 0, 1.75) * 1.15);
    const newestGeneration = Math.max(
      candidate.generation,
      ...activeComputers
        .filter((product) => getProductSegment(product) === segment)
        .map((product) => product.generation),
    );
    const generationFactor = 0.62 ** Math.max(0, newestGeneration - candidate.generation);
    const targetFactor = state.marketingTarget === "all"
      ? 1
      : state.marketingTarget === segment
        ? 1.16
        : 0.93;
    const appeal = Math.max(
      0.000001,
      technologyAppeal * ageFactor * priceCompetitiveness * qualityFactor * generationFactor * targetFactor,
    );
    const marketRank = 1 + segmentCompetitors.filter((offer) => offer.technology > technology).length;
    return {
      candidate,
      segment,
      ageFactor,
      modernity,
      fairPrice,
      appeal,
      competitorBenchmark,
      relativePerformance,
      priceCompetitiveness,
      marketRank,
    };
  });
  const awareness = 0.04 + clamp(state.brand, 0, 100) / 120;
  const salesReach = 0.35 + Math.log1p(Math.max(0, state.employees.sales)) * 0.12 +
    Math.log1p(Math.max(0, state.departmentLevels.sales - 1)) * 0.12;
  const distributionFootprint = clamp(
    0.12 + Math.sqrt(clamp(state.marketShare, 0, 100) / 100) * 0.95,
    0.12,
    1,
  );
  const companyReach = Math.min(2.5, awareness * salesReach * getMarketingReach(state) * distributionFootprint *
    (1 + (state.campaign?.demandBoost ?? 0)) *
    (hasCompletedDeal(state, "orbitnet") ? 1.08 : 1) *
    getWorkforcePlan(state).readiness);
  const result = new Map<string, ProductMarketMetrics>();
  for (const segment of Object.keys(PC_MARKET_SEGMENTS) as PcMarketSegment[]) {
    const entries = metrics.filter((entry) => entry.segment === segment);
    if (!entries.length) continue;
    const sortedAppeals = entries.map((entry) => entry.appeal).sort((a, b) => b - a);
    const portfolioAppeal = sortedAppeals[0];
    // Junge Firmen bekommen eine kleine, zeitlich begrenzte lokale Startreichweite.
    // Sie verhindert einen frustrierenden Stillstand, ersetzt aber kein gutes Produkt.
    const startupReach = 1 + 0.12 * clamp(1 - state.day / 180, 0, 1);
    const playerWeight = portfolioAppeal * companyReach * DIFFICULTY_SETTINGS[state.difficulty].playerDemand * startupReach;
    const competitorWeight = competitorOffers
      .filter((offer) => offer.segment === segment)
      .reduce((sum, offer) => sum + offer.appeal, 0);
    const demandCycle = 1 +
      Math.sin(state.day / 17 + (segment === "budget" ? 0 : segment === "mainstream" ? 2.1 : 4.2)) * 0.055 +
      Math.sin(state.day / 83) * 0.035;
    const segmentMarketSize = getDailyPcMarketSize(state) * getPcSegmentShare(segment, state.day) * demandCycle;
    const competitiveDemand = segmentMarketSize * playerWeight /
      Math.max(0.01, playerWeight + competitorWeight + 0.35);
    const marketPool = competitiveDemand;
    const totalAppeal = entries.reduce((sum, entry) => sum + entry.appeal, 0);
    for (const entry of entries) {
      result.set(entry.candidate.id, {
        ageFactor: entry.ageFactor,
        modernity: entry.modernity,
        fairPrice: entry.fairPrice,
        appeal: entry.appeal,
        marketPool,
        marketSegment: segment,
        segmentMarketSize,
        competitorBenchmark: entry.competitorBenchmark,
        relativePerformance: entry.relativePerformance,
        priceCompetitiveness: entry.priceCompetitiveness,
        marketRank: entry.marketRank,
        demand: marketPool * entry.appeal / Math.max(0.000001, totalAppeal),
      });
    }
  }
  productMarketCache.set(state, result);
  return result;
}

function getProductMarketMetrics(
  state: GameState,
  product: ProductState,
  blueprint: ProductBlueprint,
): ProductMarketMetrics {
  return calculateProductMarketMetrics(state).get(product.id) ?? {
    ageFactor: 0,
    modernity: 0,
    fairPrice: blueprint.basePrice,
    appeal: 0,
    marketPool: 0,
    marketSegment: getProductSegment(product),
    segmentMarketSize: 0,
    competitorBenchmark: 1,
    relativePerformance: -1,
    priceCompetitiveness: 0,
    marketRank: 99,
    demand: 0,
  };
}

export function getProductWarrantyRate(
  state: GameState,
  product: ProductState,
) {
  const blueprint = resolveProductBlueprint(product);
  if (!blueprint) return 0;
  const quality = getProductQuality(state, product, blueprint);
  const build = product.configuration ? evaluatePcBuild(product.configuration) : null;
  const compatibilityPenalty = build?.issues.filter((issue) => issue.type === "warning").length ?? 0;
  return clamp(
    0.075 - quality * 0.00062 + compatibilityPenalty * 0.006 +
      Math.max(0, 75 - state.factoryCondition) * 0.00045,
    0.004,
    0.14,
  );
}

export function getProductEconomics(
  state: GameState,
  productOrId: ProductState | string,
): ProductEconomics | null {
  const product = typeof productOrId === "string"
    ? state.products.find((candidate) => candidate.id === productOrId)
    : productOrId;
  if (!product) return null;
  const blueprint = resolveProductBlueprint(product);
  if (!blueprint) return null;
  const unitCost = getUnitCost(state, blueprint, product);
  const quality = getProductQuality(state, product, blueprint);
  const ageDays = Math.max(0, state.day - product.launchedDay);
  const marketMetrics = getProductMarketMetrics(state, product, blueprint);
  const ageFactor = marketMetrics.ageFactor;
  const demand = marketMetrics.demand;
  const production = Math.max(0, product.lastProduction);
  const sales = Math.max(0, product.lastSales);
  const warrantyRate = getProductWarrantyRate(state, product);
  const warrantyCost = sales * warrantyRate * unitCost * 0.45;
  const revenue = sales * product.price;
  const productionCost = production * unitCost;
  return {
    blueprint,
    unitCost,
    unitMargin: product.price - unitCost - warrantyRate * unitCost * 0.45,
    margin: (product.price - unitCost - warrantyRate * unitCost * 0.45) / Math.max(1, product.price),
    quality,
    ageDays,
    ageFactor,
    modernity: marketMetrics.modernity,
    fairPrice: marketMetrics.fairPrice,
    marketPool: marketMetrics.marketPool,
    appeal: marketMetrics.appeal,
    marketSegment: marketMetrics.marketSegment,
    segmentMarketSize: marketMetrics.segmentMarketSize,
    competitorBenchmark: marketMetrics.competitorBenchmark,
    relativePerformance: marketMetrics.relativePerformance,
    priceCompetitiveness: marketMetrics.priceCompetitiveness,
    marketRank: marketMetrics.marketRank,
    demand,
    production,
    sales,
    revenue,
    productionCost,
    grossProfit: revenue - sales * unitCost - warrantyCost,
    warrantyRate,
    warrantyCost,
  };
}

export function getPortfolioValue(state: GameState) {
  return state.competitors.reduce(
    (total, competitor) => total + Math.max(0, competitor.ownedShares) * Math.max(0, competitor.price),
    0,
  );
}

export function getPortfolioCostBasis(state: GameState) {
  return state.competitors.reduce(
    (total, competitor) =>
      total + Math.max(0, competitor.ownedShares) * Math.max(0, competitor.averageCost),
    0,
  );
}

export function getPortfolioUnrealizedProfit(state: GameState) {
  return getPortfolioValue(state) - getPortfolioCostBasis(state);
}

export function getPortfolioRealizedProfit(state: GameState) {
  return state.competitors.reduce(
    (total, competitor) => total + competitor.realizedProfit,
    0,
  );
}

export function getEstimatedMonthlyDividend(competitor: CompetitorState) {
  if (
    competitor.status !== "active" ||
    competitor.ownedShares <= 0 ||
    competitor.profitMargin <= 0
  ) return 0;
  const payoutRatio = clamp(
    0.3 + competitor.brand / 500 - Math.max(0, competitor.growth) * 0.45,
    0.08,
    0.42,
  );
  const annualProfit = competitor.revenue * competitor.profitMargin;
  const dividendPerShare =
    (annualProfit * payoutRatio) /
    12 /
    Math.max(1, competitor.sharesOutstanding);
  const ownership = competitor.ownedShares / Math.max(1, competitor.sharesOutstanding);
  const strategicBonus = ownership >= 0.2 ? 1.1 : 1;
  return Math.max(0, dividendPerShare * competitor.ownedShares * strategicBonus);
}

export function getStrategicStakeLevel(competitor: CompetitorState) {
  const percentage = (competitor.ownedShares / Math.max(1, competitor.sharesOutstanding)) * 100;
  if (percentage >= 33.4) return { percentage, level: "board", label: "Board-Einfluss", benefit: "Geringere Übernahmeprämie" } as const;
  if (percentage >= 20) return { percentage, level: "partner", label: "Strategische Partnerschaft", benefit: "+10 % Beteiligungsdividende" } as const;
  if (percentage >= 5) return { percentage, level: "insider", label: "Informationsrecht", benefit: "Fundamentaldaten vollständig sichtbar" } as const;
  return { percentage, level: "financial", label: "Finanzanlage", benefit: "Keine strategischen Rechte" } as const;
}

export function getEstimatedMonthlyPortfolioIncome(state: GameState) {
  return state.competitors.reduce(
    (total, competitor) => total + getEstimatedMonthlyDividend(competitor),
    0,
  );
}

export function getStockTradeQuote(
  competitor: CompetitorState,
  shares: number,
  side: "buy" | "sell",
) {
  const normalizedShares = positiveInteger(shares);
  const marketPrice = Math.max(0, competitor.price);
  const liquidityShares = Math.max(
    1_000,
    competitor.sharesOutstanding * clamp(
      0.12 + (competitor.financialHealth ?? 60) / 250,
      0.16,
      0.5,
    ),
  );
  const participation = normalizedShares / liquidityShares;
  const priceImpact = clamp(Math.sqrt(participation) * 0.06, 0, 0.2);
  const direction = side === "buy" ? 1 : -1;
  const executionPrice = marketPrice * (1 + direction * priceImpact * 0.5);
  const postTradePrice = Math.max(0.01, marketPrice * (1 + direction * priceImpact));
  const gross = normalizedShares * executionPrice;
  const fee = gross * STOCK_TRADING_FEE;
  return {
    shares: normalizedShares,
    marketPrice,
    executionPrice,
    postTradePrice,
    priceImpact,
    gross,
    fee,
    total: side === "buy" ? gross + fee : Math.max(0, gross - fee),
  };
}

function applyStockTradePrice(
  competitor: CompetitorState,
  quote: ReturnType<typeof getStockTradeQuote>,
  side: "buy" | "sell",
  day: number,
) {
  const previous = competitor.priceHistory.at(-1);
  const point = previous?.day === day
    ? {
        ...previous,
        high: Math.max(previous.high, quote.postTradePrice),
        low: Math.min(previous.low, quote.postTradePrice),
        close: quote.postTradePrice,
      }
    : {
        day,
        open: competitor.price,
        high: Math.max(competitor.price, quote.postTradePrice),
        low: Math.min(competitor.price, quote.postTradePrice),
        close: quote.postTradePrice,
      };
  const history = previous?.day === day
    ? competitor.priceHistory.slice(0, -1)
    : competitor.priceHistory;
  return {
    price: quote.postTradePrice,
    priceHistory: [...history, point].slice(-STOCK_DAILY_HISTORY_LIMIT),
    lastReason: `${side === "buy" ? "Kaufdruck" : "Verkaufsdruck"} einer großen Order bewegt den Kurs um ${(
      quote.priceImpact * 100
    ).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %.`,
  };
}

export function getNetWorth(state: GameState) {
  return state.cash + getPortfolioValue(state) - state.debt;
}

const RESEARCH_VALUE: Record<PcResearchAttribute, number> = {
  "cpu.cores": 1.35,
  "cpu.clock": 1.35,
  "cpu.efficiency": 1.05,
  "cpu.architecture": 1.25,
  "gpu.compute": 1.3,
  "gpu.clock": 1.2,
  "gpu.memory": 1.15,
  "gpu.efficiency": 0.9,
  "memory.capacity": 1.2,
  "memory.speed": 1.15,
  "storage.capacity": 0.95,
  "storage.speed": 1.05,
  "storage.reliability": 0.8,
  "motherboard.cpuLimit": 0.72,
  "motherboard.memoryLimit": 0.72,
  "motherboard.memorySpeed": 0.72,
  "motherboard.expansion": 0.65,
  "psu.wattage": 0.7,
  "psu.efficiency": 0.72,
  "psu.reliability": 0.65,
  "cooling.capacity": 0.72,
  "cooling.noise": 0.62,
  "case.airflow": 0.65,
  "case.gpuLimit": 0.68,
  "case.quality": 0.6,
};

/** Picks a useful, affordable next step while keeping supporting parts in balance. */
export function getAutomaticResearchChoice(state: GameState): PcResearchProject {
  const levels = PC_RESEARCH_ATTRIBUTE_IDS.map(
    (attribute) => state.componentResearch[attribute],
  );
  const averageLevel = levels.reduce((sum, level) => sum + level, 0) / levels.length;
  const cpuPeak = Math.max(
    state.componentResearch["cpu.cores"],
    state.componentResearch["cpu.clock"],
    state.componentResearch["cpu.architecture"],
  );
  const gpuPeak = Math.max(
    state.componentResearch["gpu.compute"],
    state.componentResearch["gpu.clock"],
    state.componentResearch["gpu.memory"],
  );
  const memoryPeak = Math.max(
    state.componentResearch["memory.capacity"],
    state.componentResearch["memory.speed"],
  );
  const supportPressure: Partial<Record<PcResearchAttribute, number>> = {
    "motherboard.cpuLimit": Math.max(0, cpuPeak - state.componentResearch["motherboard.cpuLimit"]) * 0.8,
    "motherboard.memoryLimit": Math.max(0, memoryPeak - state.componentResearch["motherboard.memoryLimit"]) * 0.75,
    "motherboard.memorySpeed": Math.max(0, state.componentResearch["memory.speed"] - state.componentResearch["motherboard.memorySpeed"]) * 0.75,
    "psu.wattage": Math.max(0, Math.max(cpuPeak, gpuPeak) - state.componentResearch["psu.wattage"]) * 0.85,
    "cooling.capacity": Math.max(0, Math.max(cpuPeak, gpuPeak) - state.componentResearch["cooling.capacity"]) * 0.85,
    "case.airflow": Math.max(0, gpuPeak - state.componentResearch["case.airflow"]) * 0.55,
    "case.gpuLimit": Math.max(0, gpuPeak - state.componentResearch["case.gpuLimit"]) * 0.8,
  };

  return PC_RESEARCH_ATTRIBUTE_IDS
    .map((attribute) => {
      const project = createNextComponentResearchProject(
        attribute,
        state.componentResearch[attribute],
      );
      const catchUp = Math.max(0, averageLevel - state.componentResearch[attribute]) * 0.18;
      const score =
        (RESEARCH_VALUE[attribute] + catchUp + (supportPressure[attribute] ?? 0)) /
        Math.pow(Math.max(1, project.cost), 0.32);
      return { project, score };
    })
    .sort((a, b) => b.score - a.score || a.project.cost - b.project.cost)[0].project;
}

function startAutomaticResearch(state: GameState) {
  if (!state.autoResearch || state.currentResearch) return state;
  const project = getAutomaticResearchChoice(state);
  return {
    ...state,
    currentResearch: project.id,
    researchPoints: 0,
  };
}

/** Remaining borrowing capacity, after existing debt. */
export function getCreditLimit(state: GameState) {
  const revenueBase = Math.max(state.lastMonthRevenue, state.monthlyRevenue) * 6;
  const publicFloat = clamp(
    1 - state.founderShares / Math.max(1, state.totalShares),
    0,
    1,
  );
  const capitalMarketAccess = 1 + Math.sqrt(publicFloat) * 0.16;
  const financeBonus =
    1 +
    Math.max(0, state.departmentLevels.finance - 1) * 0.06 +
    Math.log1p(Math.max(0, state.employees.finance)) * 0.028;
  return Math.max(
    0,
    (state.valuation * 0.28 + revenueBase) * financeBonus * capitalMarketAccess - state.debt,
  );
}

export function getShareIssueQuote(state: GameState, requestedPercent: number): ShareIssueQuote {
  const percent = normalizePercent(requestedPercent);
  const shares = Math.round(state.totalShares * percent);
  const discount = clamp(0.035 + percent * 0.9, 0.035, 0.18);
  const proceeds = shares * state.sharePrice * (1 - discount);
  const totalShares = state.totalShares + shares;
  const valuation = state.valuation + proceeds;
  return {
    percent,
    shares,
    proceeds,
    discount,
    postTransactionOwnership: (state.founderShares / Math.max(1, totalShares)) * 100,
    estimatedSharePrice: valuation / Math.max(1, totalShares),
  };
}

export function getBuybackQuote(state: GameState, requestedPercent: number): BuybackQuote {
  const percent = normalizePercent(requestedPercent);
  const publicShares = Math.max(0, state.totalShares - state.founderShares);
  const shares = Math.min(publicShares, Math.round(state.totalShares * percent));
  const premium = clamp(0.035 + percent * 0.65, 0.035, 0.16);
  const cost = shares * state.sharePrice * (1 + premium);
  const totalShares = Math.max(1, state.totalShares - shares);
  // The company loses cash, while the tighter float and signal of confidence
  // preserve part of that value. This gives buybacks a modest per-share premium
  // without creating free enterprise value.
  const valuation = Math.max(250_000, state.valuation - cost * 0.78);
  const estimatedSharePrice = valuation / totalShares;
  return {
    percent,
    shares,
    cost,
    premium,
    postTransactionOwnership: (state.founderShares / totalShares) * 100,
    estimatedSharePrice,
    founderStakeValueBefore: state.founderShares * state.sharePrice,
    founderStakeValueAfter: state.founderShares * estimatedSharePrice,
  };
}

export function getAcquisitionPrice(competitor: CompetitorState) {
  if (competitor.status !== "active") return 0;
  const remainingShares = Math.max(0, competitor.sharesOutstanding - competitor.ownedShares);
  const ownership = competitor.ownedShares / Math.max(1, competitor.sharesOutstanding);
  const premium = ownership >= 0.334 ? 1.08 : ownership >= 0.2 ? 1.18 : 1.28;
  return remainingShares * competitor.price * premium;
}

export function getSubsidiaryExitQuote(competitor: CompetitorState) {
  const eligible = competitor.status === "acquired" || competitor.status === "merged";
  const referencePrice = Math.max(0.01, finite(competitor.fairValue, competitor.price));
  const enterpriseValue = referencePrice * Math.max(1, competitor.sharesOutstanding);
  const ipoRetainedShares = Math.round(competitor.sharesOutstanding * 0.3);
  const ipoSoldShares = Math.max(0, competitor.sharesOutstanding - ipoRetainedShares);
  const directSaleProceeds = eligible ? enterpriseValue * 0.88 : 0;
  const ipoPrice = referencePrice * 0.93;
  const ipoProceeds = eligible ? ipoSoldShares * ipoPrice : 0;
  return {
    enterpriseValue,
    referencePrice,
    directSaleProceeds,
    ipoPrice,
    ipoProceeds,
    ipoSoldShares,
    ipoRetainedShares,
    retainedPercentage: 30,
  };
}

export function getMergerTerms(
  state: GameState,
  competitorOrId: CompetitorState | string,
): MergerTerms | null {
  const competitor = typeof competitorOrId === "string"
    ? state.competitors.find((candidate) => candidate.id === competitorOrId)
    : competitorOrId;
  if (!competitor || competitor.status !== "active") return null;
  const totalPrice = getAcquisitionPrice(competitor);
  const cashCost = totalPrice * 0.46;
  const shareConsideration = totalPrice * 0.54;
  const newShares = Math.ceil(shareConsideration / Math.max(0.01, state.sharePrice));
  return {
    totalPrice,
    cashCost,
    shareConsideration,
    newShares,
    postMergerOwnership: (state.founderShares / Math.max(1, state.totalShares + newShares)) * 100,
  };
}

export function getCompanyHealth(state: GameState): CompanyHealth {
  const observedRevenue = state.lastMonthRevenue || state.monthlyRevenue;
  const observedExpenses = state.lastMonthExpenses || state.monthlyExpenses;
  const profit = observedRevenue - observedExpenses + state.lastMonthInvestmentIncome;
  const dailyBurn = Math.max(1, observedExpenses / DAYS_PER_MONTH - observedRevenue / DAYS_PER_MONTH);
  const runwayDays = profit >= 0 ? 999 : Math.max(0, state.cash / dailyBurn);
  const score = clamp(
    48 +
      (profit >= 0 ? 13 : -15) +
      Math.min(16, runwayDays / 12) +
      state.brand * 0.18 +
      state.morale * 0.08 -
      (state.debt / Math.max(1, state.valuation)) * 24,
    3,
    98,
  );
  const reasons = [
    profit >= 0 ? "Das operative Geschäft ist profitabel." : "Der laufende Betrieb verbrennt Liquidität.",
    runwayDays >= 180 ? "Die Liquiditätsreserve ist solide." : runwayDays < 60 ? "Die Reichweite der Kasse ist kritisch." : "Die Liquidität sollte beobachtet werden.",
    "Die eigene Firma kann nicht von Konkurrenten übernommen werden.",
  ];
  if (score >= 65) return { score, status: "healthy", label: "Unternehmen gesund", runwayDays, profitable: profit >= 0, reasons };
  if (score >= 40) return { score, status: "watch", label: "Auf Kurs achten", runwayDays, profitable: profit >= 0, reasons };
  return { score, status: "critical", label: "Handlungsbedarf", runwayDays, profitable: profit >= 0, reasons };
}

export function getAvailableBlueprints(state: GameState) {
  const launched = new Set(state.products.map((product) => product.blueprintId));
  return PRODUCT_BLUEPRINTS.filter(
    (blueprint) =>
      !launched.has(blueprint.id) &&
      blueprint.requiredTech.every((techId) => state.unlockedTech.includes(techId)),
  );
}

export function getHireCost(department: DepartmentId, amount = 1, day = 0) {
  const headcount = positiveInteger(amount, 1);
  const recruitingPremium = 1 + Math.min(1.5, Math.log10(Math.max(1, headcount)) * 0.24);
  return getAdjustedDailySalary(day, department) * 35 * headcount * recruitingPremium;
}

export function getFireCost(department: DepartmentId, amount = 1, day = 0) {
  return getAdjustedDailySalary(day, department) * 10 * positiveInteger(amount, 1);
}

export function getDepartmentUpgradeCost(state: GameState, department: DepartmentId) {
  const level = Math.max(1, state.departmentLevels[department]);
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(80_000 * 2.15 ** Math.max(0, level - 1)));
}

export function getFactoryUpgradeCost(state: GameState) {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(250_000 * 2.4 ** Math.max(0, state.factoryLevel - 1)));
}

export function getWarehouseUpgradeCost(state: GameState) {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(120_000 * 2.25 ** Math.max(0, state.warehouseLevel - 1)));
}

export function getAutomationUpgradeCost(state: GameState) {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(180_000 * 2.3 ** Math.max(0, state.automationLevel)));
}

export function getProductUpgradeCost(state: GameState, productOrId: ProductState | string) {
  const product = typeof productOrId === "string"
    ? state.products.find((candidate) => candidate.id === productOrId)
    : productOrId;
  const blueprint = product ? resolveProductBlueprint(product) : undefined;
  if (!product || !blueprint) return Number.POSITIVE_INFINITY;
  return blueprint.developmentCost * 0.32 + 35_000 * (product.qualityBonus / 5 + 1);
}

export function getDefenseCost(state: GameState) {
  return Math.max(125_000, state.valuation * 0.018);
}

function researchedPartTracks(state: GameState, minimumTier: number) {
  return PC_PART_CATEGORIES.filter((category) =>
    getResearchTracksByCategory(category.id).every(
      (track) => state.componentResearch[track.id] >= minimumTier,
    ),
  ).length;
}

export function getAutomationRequirement(state: GameState) {
  if (
    state.automationLevel >= 4 &&
    !state.unlockedTech.includes("nanometer-chips") &&
    researchedPartTracks(state, 4) < 4
  ) return "Erforsche vier Bauteilbereiche auf Stufe 4";
  if (
    state.automationLevel >= 2 &&
    !state.unlockedTech.includes("lean-fabs") &&
    researchedPartTracks(state, 3) < 3
  ) return "Erforsche drei Bauteilbereiche auf Stufe 3";
  if (
    state.automationLevel >= 1 &&
    !state.unlockedTech.includes("robotic-assembly") &&
    researchedPartTracks(state, 2) < 2
  ) return "Erforsche zwei Bauteilbereiche auf Stufe 2";
  return null;
}

function canUpgradeAutomation(state: GameState) {
  return getAutomationRequirement(state) === null;
}

function applyOperatingExpense(state: GameState, amount: number) {
  const cost = Math.max(0, amount);
  return {
    ...state,
    cash: state.cash - cost,
    monthlyExpenses: state.monthlyExpenses + cost,
    lifetimeProfit: state.lifetimeProfit - cost,
  };
}

function applyTechCompletion(state: GameState, tech: TechDefinition) {
  let next: GameState = {
    ...state,
    researchPoints: 0,
    currentResearch: null,
    unlockedTech: state.unlockedTech.includes(tech.id)
      ? state.unlockedTech
      : [...state.unlockedTech, tech.id],
  };
  if (tech.id === "graphical-os") next = { ...next, brand: clamp(next.brand + 5, 0, 100) };
  if (tech.id === "touch-interface") next = { ...next, brand: clamp(next.brand + 8, 0, 100) };
  if (tech.id === "network-stack") next = { ...next, marketShare: clamp(next.marketShare + 0.2, 0, 100) };
  next = addNews(next, {
    id: `research-${tech.id}-${next.day}`,
    day: next.day,
    title: `${tech.name} erforscht`,
    body: `${tech.description} Die Technologie kann jetzt in Produkten und Betrieb eingesetzt werden.`,
    category: "research",
    tone: "positive",
  });
  return next;
}

function applyComponentResearchCompletion(
  state: GameState,
  attribute: PcResearchAttribute,
  targetLevel: number,
) {
  const track = getPcResearchTrack(attribute);
  if (!track) return state;
  const currentLevel = state.componentResearch[attribute];
  if (targetLevel !== currentLevel + 1) return { ...state, currentResearch: null };
  let next: GameState = {
    ...state,
    researchPoints: 0,
    currentResearch: null,
    componentResearch: {
      ...state.componentResearch,
      [attribute]: targetLevel,
    },
  };
  next = addNews(next, {
    id: `research-component-${attribute}-${targetLevel}-${next.day}`,
    day: next.day,
    title: `${track.name} Stufe ${targetLevel} erforscht`,
    body: `${track.description} Der neue Wert kann jetzt im PC-Labor eingesetzt werden.`,
    category: "research",
    tone: "positive",
  });
  return next;
}

function applyAcquisitionPerk(state: GameState, competitorId: string) {
  if (competitorId === "monolith") {
    return { ...state, brand: clamp(state.brand + 18, 0, 100), reputation: clamp(state.reputation + 5, 0, 100) };
  }
  if (competitorId === "pixelworks") {
    return { ...state, brand: clamp(state.brand + 12, 0, 100) };
  }
  if (competitorId === "telestar") return { ...state, marketShare: clamp(state.marketShare + 12, 0, 100) };
  if (competitorId === "nexabyte") return { ...state, researchPoints: state.researchPoints + 700 };
  if (competitorId === "softunion") return { ...state, brand: clamp(state.brand + 4, 0, 100) };
  if (competitorId === "microfab") {
    return { ...state, factoryLevel: state.factoryLevel + 1 };
  }
  if (competitorId === "coolwave") {
    return { ...state, automationLevel: state.automationLevel + 1 };
  }
  if (competitorId === "datavault") {
    return { ...state, researchPoints: state.researchPoints + 300 };
  }
  if (competitorId === "northbridge") {
    return { ...state, researchPoints: state.researchPoints + 350 };
  }
  if (competitorId === "orbitnet") {
    return { ...state, reputation: clamp(state.reputation + 6, 0, 100) };
  }
  if (competitorId === "luminagraphics") {
    return { ...state, brand: clamp(state.brand + 6, 0, 100) };
  }
  if (competitorId === "helixrobotics") {
    return { ...state, automationLevel: state.automationLevel + 1 };
  }
  const competitor = state.competitors.find((candidate) => candidate.id === competitorId);
  if (competitor?.pcSegment === "budget") {
    return { ...state, marketShare: clamp(state.marketShare + 0.5, 0, 100) };
  }
  if (competitor?.pcSegment === "mainstream") {
    return { ...state, brand: clamp(state.brand + 2, 0, 100) };
  }
  if (competitor?.pcSegment === "performance") {
    return { ...state, researchPoints: state.researchPoints + 250 };
  }
  if (competitor) {
    return { ...state, reputation: clamp(state.reputation + 2, 0, 100) };
  }
  return state;
}

export function getAnnualInterestRate(state: GameState) {
  const leverage = state.debt / Math.max(1, state.valuation);
  const financeReduction =
    Math.max(0, state.departmentLevels.finance - 1) * 0.003 +
    Math.log1p(Math.max(0, state.employees.finance)) * 0.0014;
  return clamp(
    ANNUAL_BASE_RATE +
      Math.max(0, leverage - 0.2) * 0.09 -
      financeReduction +
      DIFFICULTY_SETTINGS[state.difficulty].interestAdjustment,
    0.025,
    0.22,
  );
}

export function getDailyDebtRepayment(state: GameState) {
  return Math.min(
    Math.max(0, state.debt),
    Math.max(0, finite(state.dailyDebtRepayment)),
  );
}

export function getDailyConsolidatedBusiness(state: GameState) {
  return state.competitors.reduce(
    (result, competitor) => {
      if (competitor.status === "active") return result;
      const integration = competitor.status === "merged" ? 0.94 : 0.84;
      const revenue = (competitor.revenue / DAYS_PER_YEAR) * integration;
      const expenses = revenue * (1 - competitor.profitMargin + 0.035);
      return { revenue: result.revenue + revenue, expenses: result.expenses + expenses };
    },
    { revenue: 0, expenses: 0 },
  );
}

export function getMonthlyFinancialProjection(state: GameState) {
  const consumerSalesByProduct = new Map(state.products.map((product) => [
    product.id,
    Math.max(0, finite(product.lastSales) - finite(product.lastContractSales)),
  ]));
  const productRevenue = state.products.reduce(
    (sum, product) => sum + (consumerSalesByProduct.get(product.id) ?? 0) * product.price,
    0,
  ) * DAYS_PER_MONTH;
  const projectedContractUnits = new Map<string, number>();
  const contractRevenue = state.enterpriseContracts.reduce((sum, contract) => {
    const remainingUnits = Math.max(0, contract.totalUnits - contract.fulfilledUnits);
    const observedDailyDelivery = Math.max(0, finite(contract.lastDelivery));
    const projectedUnits = Math.min(
      remainingUnits,
      observedDailyDelivery * Math.min(DAYS_PER_MONTH, contract.daysRemaining),
    );
    projectedContractUnits.set(contract.id, projectedUnits);
    return sum + projectedUnits * contract.unitPrice;
  }, 0);
  const consolidated = getDailyConsolidatedBusiness(state);
  const subsidiaryRevenue = consolidated.revenue * DAYS_PER_MONTH;
  const portfolioIncome = getEstimatedMonthlyPortfolioIncome(state);
  const productProductionExpenses = state.products.reduce(
    (sum, product) => sum + (consumerSalesByProduct.get(product.id) ?? 0) *
      (getProductEconomics(state, product)?.unitCost ?? 0),
    0,
  ) * DAYS_PER_MONTH;
  const contractProductionExpenses = state.enterpriseContracts.reduce((sum, contract) => {
    const economics = getProductEconomics(state, contract.productId);
    return sum + (projectedContractUnits.get(contract.id) ?? 0) * (economics?.unitCost ?? 0);
  }, 0);
  const productionExpenses = productProductionExpenses + contractProductionExpenses;
  const productWarrantyExpenses = state.products.reduce(
    (sum, product) => {
      const economics = getProductEconomics(state, product);
      return sum + (consumerSalesByProduct.get(product.id) ?? 0) *
        getProductWarrantyRate(state, product) * (economics?.unitCost ?? 0) * 0.45;
    },
    0,
  ) * DAYS_PER_MONTH;
  const contractWarrantyExpenses = state.enterpriseContracts.reduce((sum, contract) => {
    const product = state.products.find((candidate) => candidate.id === contract.productId);
    const economics = product ? getProductEconomics(state, product) : null;
    if (!product || !economics) return sum;
    return sum + (projectedContractUnits.get(contract.id) ?? 0) *
      getProductWarrantyRate(state, product) * economics.unitCost * 0.45;
  }, 0);
  const warrantyExpenses = productWarrantyExpenses + contractWarrantyExpenses;
  const payrollExpenses = getDailyPayroll(state) * DAYS_PER_MONTH;
  const marketingExpenses = getDailyMarketingCost(state) * DAYS_PER_MONTH;
  const maintenanceExpenses = Math.max(0, state.maintenanceBudget) * DAYS_PER_MONTH;
  const interestExpenses = (Math.max(0, state.debt) * getAnnualInterestRate(state)) / 12;
  const subsidiaryExpenses = consolidated.expenses * DAYS_PER_MONTH;
  const contractPenalties = state.enterpriseContracts.reduce((sum, contract) => {
    if (contract.daysRemaining > DAYS_PER_MONTH) return sum;
    const remainingUnits = Math.max(0, contract.totalUnits - contract.fulfilledUnits);
    const requiredPace = getContractDailyTarget(contract);
    const observedPace = contract.lastDelivery > 0 ? contract.lastDelivery : requiredPace;
    const expectedShortfall = Math.max(0, remainingUnits - observedPace * contract.daysRemaining);
    return sum + expectedShortfall * contract.unitPrice * 0.08;
  }, 0);
  const debtPrincipal = Math.min(
    Math.max(0, state.debt),
    getDailyDebtRepayment(state) * DAYS_PER_MONTH,
  );
  const totalIncome = productRevenue + contractRevenue + subsidiaryRevenue + portfolioIncome;
  const operatingExpenses = productionExpenses + warrantyExpenses + payrollExpenses +
    marketingExpenses + maintenanceExpenses + interestExpenses + contractPenalties + subsidiaryExpenses;
  const totalOutflow = operatingExpenses + debtPrincipal;
  return {
    productRevenue,
    contractRevenue,
    subsidiaryRevenue,
    portfolioIncome,
    productionExpenses,
    productProductionExpenses,
    contractProductionExpenses,
    warrantyExpenses,
    productWarrantyExpenses,
    contractWarrantyExpenses,
    payrollExpenses,
    marketingExpenses,
    maintenanceExpenses,
    interestExpenses,
    contractPenalties,
    subsidiaryExpenses,
    debtPrincipal,
    creditPayment: interestExpenses + debtPrincipal,
    totalIncome,
    operatingExpenses,
    totalOutflow,
    profit: totalIncome - totalOutflow,
  };
}

export function calculatePlayerFairValue(state: GameState) {
  const monthDay = state.day % DAYS_PER_MONTH || DAYS_PER_MONTH;
  const currentRevenueRunRate = (Math.max(0, finite(state.monthlyRevenue)) / Math.max(1, monthDay)) * DAYS_PER_MONTH;
  const currentExpenseRunRate = (Math.max(0, finite(state.monthlyExpenses)) / Math.max(1, monthDay)) * DAYS_PER_MONTH;
  // Innerhalb eines Monats werden die noch unvollstaendigen Zahlen mit dem
  // letzten abgeschlossenen Monat gewichtet. So folgt die Bewertung den echten
  // Fundamentaldaten, ohne am Monatsanfang durch einen einzelnen Tag zu springen.
  const monthProgress = clamp(monthDay / DAYS_PER_MONTH, 0, 1);
  const revenueBaseline = finite(state.lastMonthRevenue) > 0
    ? finite(state.lastMonthRevenue)
    : currentRevenueRunRate;
  const expenseBaseline = finite(state.lastMonthExpenses) > 0
    ? finite(state.lastMonthExpenses)
    : currentExpenseRunRate;
  const monthlyRevenue = revenueBaseline + (currentRevenueRunRate - revenueBaseline) * monthProgress;
  const monthlyExpenses = expenseBaseline + (currentExpenseRunRate - expenseBaseline) * monthProgress;
  const annualRevenue = Math.max(0, monthlyRevenue * 12);
  const annualProfit = Math.max(0, (monthlyRevenue - monthlyExpenses) * 12);
  const growth = finite(state.lastMonthRevenue) > 0
    ? clamp(currentRevenueRunRate / finite(state.lastMonthRevenue, 1) - 1, -0.6, 1.2)
    : 0;
  const revenueMultiple = clamp(0.16 + state.brand / 220 + state.reputation / 650 + state.marketShare / 110 + Math.max(0, growth) * 0.15, 0.12, 1.1);
  const advancedTracks = PC_RESEARCH_ATTRIBUTE_IDS.filter(
    (attribute) => state.componentResearch[attribute] > 1,
  );
  const profitMultiple = clamp(1.05 + state.brand / 55 + state.reputation / 90 + state.unlockedTech.length * 0.08 + advancedTracks.length * 0.025 + Math.max(0, growth) * 0.8, 1, 5.5);
  const legacyTechnologyValue = state.unlockedTech.reduce(
    (total, techId) => total + (getTech(techId)?.cost ?? 0) * 300,
    0,
  );
  const componentTechnologyValue = advancedTracks.reduce(
    (total, attribute) => {
      const level = state.componentResearch[attribute];
      return total + getCumulativeComponentResearchCost(attribute, level) * 1.35;
    },
    0,
  );
  const technologyValue = legacyTechnologyValue + componentTechnologyValue;
  const productValue = state.products.reduce(
    (total, product) => total + (resolveProductBlueprint(product)?.developmentCost ?? 0) * 0.32,
    0,
  );
  const inventoryValue = state.products.reduce((total, product) => {
    const blueprint = resolveProductBlueprint(product);
    return total + (blueprint ? product.inventory * getUnitCost(state, blueprint, product) * 0.65 : 0);
  }, 0);
  const operatingAssets =
    finite(250_000 * Math.max(1, finite(state.factoryLevel, 1)) ** 1.35) +
    finite(Math.max(0, finite(state.automationLevel)) * 90_000) +
    finite(68_000 * Math.max(1, finite(state.warehouseLevel, 1)) ** 1.25) +
    finite(inventoryValue);
  const fairValueCandidate =
    finite(state.cash) - Math.max(0, finite(state.debt)) +
    finite(getPortfolioValue(state)) * 0.9 +
    finite(annualRevenue * revenueMultiple) +
    finite(annualProfit * profitMultiple) +
    finite(technologyValue) +
    finite(productValue) +
    finite(operatingAssets);
  const fairValue = Math.max(
    250_000,
    finite(fairValueCandidate, 250_000),
  );
  return Math.min(Number.MAX_SAFE_INTEGER, fairValue);
}

function updateCompetitor(competitor: CompetitorState, day: number): CompetitorState {
  if (competitor.status === "bankrupt") return { ...competitor };
  const isSubsidiary = competitor.status === "acquired" || competitor.status === "merged";
  const subsidiaryGrowthBonus = competitor.status === "merged" ? 0.018 : competitor.status === "acquired" ? 0.012 : 0;
  const subsidiaryMarginBonus = competitor.status === "merged" ? 0.012 : competitor.status === "acquired" ? 0.007 : 0;
  const marketEra = Math.min(6, Math.floor(day / 1_080));
  const generatedTailwind = ((competitorSeed(competitor) % 21) - 10) / 1_000;
  const tailwindProfile = COMPETITOR_TAILWINDS[competitor.id] ?? [generatedTailwind];
  const sectorTailwind = tailwindProfile[Math.min(marketEra, tailwindProfile.length - 1)];
  const productCycleLength = Math.round(clamp(430 - competitor.innovation * 1.25, 300, 420));
  const productCyclePhase = ((day + competitorSeed(competitor)) % productCycleLength) / productCycleLength;
  const productCycleEffect = productCyclePhase < 0.18
    ? 0.075 * (1 - productCyclePhase / 0.18)
    : productCyclePhase > 0.7
      ? -0.055 * ((productCyclePhase - 0.7) / 0.3)
      : 0;
  const targetGrowth = clamp(
    0.015 +
      competitor.innovation * 0.00115 +
      competitor.brand * 0.00035 -
      competitor.marketShare * 0.00145 -
      competitor.debtRatio * 0.06 +
      sectorTailwind +
      productCycleEffect +
      subsidiaryGrowthBonus,
    -0.12,
    0.3,
  );
  const growth = competitor.growth + (targetGrowth - competitor.growth) * 0.012;
  const dailyGrowth = (1 + growth) ** (1 / DAYS_PER_YEAR) - 1;
  const revenue = Math.max(25_000, competitor.revenue * (1 + dailyGrowth));
  const marginTarget = clamp(
    0.03 + competitor.brand * 0.001 + competitor.innovation * 0.0006 + growth * 0.25 + productCycleEffect * 0.18 - competitor.debtRatio * 0.11 + (competitor.id === "softunion" ? 0.07 : 0) + subsidiaryMarginBonus,
    -0.18,
    0.3,
  );
  const profitMargin = competitor.profitMargin + (marginTarget - competitor.profitMargin) * 0.002;
  const innovation = clamp(competitor.innovation + (profitMargin * 0.018 - 0.0012), 10, 100);
  const brand = clamp(competitor.brand + (growth > 0.1 ? 0.0015 : -0.0003), 10, 100);
  const marketShare = clamp(competitor.marketShare + (growth - 0.06) * 0.0017, 0.4, 40);
  const sentimentTarget = clamp(50 + growth * 90 + profitMargin * 35 - competitor.debtRatio * 18, 15, 90);
  const sentiment = competitor.sentiment + (sentimentTarget - competitor.sentiment) * 0.018;
  const sectorFactor = competitor.id === "softunion" ? 0.87 : 1;
  const valuationMultiple = clamp(
    (0.42 + profitMargin * 1.8 + growth * 0.8 + innovation / 650 + brand / 850 - competitor.debtRatio * 0.25) * sectorFactor,
    0.28,
    1.65,
  );
  const financialHealth = clamp(
    (competitor.financialHealth ?? 100) +
      profitMargin * 0.16 +
      growth * 0.035 -
      Math.max(0, competitor.debtRatio - 0.55) * 0.09 -
      Math.max(0, -profitMargin) * 0.32,
    0,
    100,
  );
  const fairValue = Math.max(0.02, (revenue * valuationMultiple * (0.35 + financialHealth / 154)) / competitor.sharesOutstanding);
  const sentimentPremium = ((sentiment - 50) / 50) * 0.08;
  const targetPrice = fairValue * (1 + sentimentPremium);
  const open = Math.max(0.01, competitor.price);
  const revenueMomentum = (revenue - competitor.revenue) / Math.max(1, competitor.revenue);
  const marginChange = profitMargin - competitor.profitMargin;
  const growthChange = growth - competitor.growth;
  const healthChange = financialHealth - (competitor.financialHealth ?? 100);
  const valuationGap = (targetPrice - open) / open;
  const operatingSignal =
    revenueMomentum * 8 +
    marginChange * 3 +
    growthChange * 4 +
    healthChange * 0.002;
  const volatility = clamp(
    0.0025 +
      competitor.debtRatio * 0.004 +
      (100 - financialHealth) * 0.00008 +
      Math.abs(growthChange) * 0.35 +
      Math.abs(marginChange) * 0.8,
    0.0025,
    0.016,
  );
  const orderFlow = marketPulse(competitor, day) * volatility;
  const reportingDay = day % 90 === competitorSeed(competitor) % 90;
  const reportingMove = reportingDay
    ? clamp((growth - 0.06) * 0.025 + (profitMargin - 0.08) * 0.02, -0.018, 0.018)
    : 0;
  const dailyReturn = clamp(
    valuationGap * 0.022 + operatingSignal + orderFlow + reportingMove,
    -0.055,
    0.055,
  );
  const price = Math.max(0.01, open * (1 + dailyReturn));
  const intradayRange = volatility * (0.35 + Math.abs(marketPulse(competitor, day, 1)) * 0.8);
  const high = Math.max(open, price) * (1 + intradayRange);
  const low = Math.max(0.01, Math.min(open, price) * (1 - intradayRange));
  const priceHistory = [
    ...(competitor.priceHistory ?? []),
    { day, open, high, low, close: price },
  ].slice(-STOCK_DAILY_HISTORY_LIMIT);
  let lastReason = "Der Kurs nähert sich dem aus Umsatz, Marge und Bilanz berechneten fairen Wert.";
  if (productCyclePhase < 0.18 && dailyReturn > 0) {
    lastReason = "Ein neuer Produktzyklus verbessert Umsatzprognose und Bewertung.";
  } else if (productCyclePhase > 0.7 && dailyReturn < 0) {
    lastReason = "Das aktuelle Produktportfolio reift aus und schwächt die Wachstumserwartung.";
  } else if (competitor.debtRatio > 0.55 && dailyReturn <= 0) {
    lastReason = "Hohe Verschuldung belastet Finanzstabilität und Unternehmenswert.";
  } else if (marginChange > 0.00005 && revenueMomentum > 0) {
    lastReason = "Steigender Umsatz und eine bessere Marge erhöhen den Unternehmenswert.";
  } else if (marginChange < -0.00005) {
    lastReason = "Eine sinkende Gewinnmarge drückt auf Bewertung und Aktienkurs.";
  } else if (reportingDay) {
    lastReason = reportingMove >= 0
      ? "Der Quartalsbericht bestätigt Wachstum und Profitabilität."
      : "Der Quartalsbericht bleibt hinter den Markterwartungen zurück.";
  } else if (Math.abs(orderFlow) > Math.abs(valuationGap * 0.022 + operatingSignal)) {
    lastReason = "Kurzfristige Orderflüsse sorgen für Volatilität; der Fundamentalwert bleibt der langfristige Anker.";
  } else if (growthChange > 0.00005 || (growth > 0 && revenueMomentum > 0)) {
    lastReason = "Operatives Wachstum und steigender Umsatz stützen den Aktienkurs.";
  } else if (growth < 0) {
    lastReason = "Schrumpfender Umsatz senkt die fundamentale Bewertung.";
  }
  if (!isSubsidiary && (financialHealth <= 0.01 || (price <= 0.015 && profitMargin < 0))) {
    return {
      ...competitor,
      status: "bankrupt",
      revenue: 0,
      profitMargin,
      growth,
      innovation,
      brand,
      marketShare: 0,
      sentiment: 0,
      fairValue: 0,
      price: 0,
      financialHealth: 0,
      priceHistory: [...priceHistory.slice(0, -1), { day, open, high: open, low: 0, close: 0 }],
      lastReason: "Das Unternehmen ist zahlungsunfähig. Die Aktie ist wertlos und der gesamte Einsatz verloren.",
    };
  }
  return { ...competitor, revenue, profitMargin, growth, innovation, brand, marketShare, sentiment, fairValue, price, financialHealth, priceHistory, lastReason };
}

function updatePlayerValuation(state: GameState) {
  // Der Unternehmenswert ist kein kuenstlich gedeckelter Fortschrittsbalken.
  // Er wird direkt aus Ertrag, Wachstum, Vermoegen, Schulden und Marktposition
  // abgeleitet. Gebremst wird das operative Wachstum, nicht dessen Bewertung.
  const valuation = calculatePlayerFairValue(state);
  return { ...state, valuation, sharePrice: valuation / Math.max(1, state.totalShares) };
}

function updateAchievements(state: GameState) {
  const candidates = [
    { id: "first-profit", achieved: state.lastMonthRevenue > state.lastMonthExpenses && state.lastMonthRevenue > 0 },
    { id: "million-revenue", achieved: state.lifetimeRevenue >= 1_000_000 },
    { id: "valuation-10m", achieved: state.valuation >= 10_000_000 },
    { id: "market-share-5", achieved: state.marketShare >= 5 },
    { id: "team-50", achieved: getEmployeeCount(state) >= 50 },
    {
      id: "technology-leader",
      achieved:
        state.unlockedTech.length >= 8 ||
        PC_RESEARCH_ATTRIBUTE_IDS.filter(
          (attribute) => state.componentResearch[attribute] >= 3,
        ).length >= 8,
    },
  ];
  const existing = new Set(state.achievements.map((achievement) => achievement.id));
  const unlocked = candidates.filter((candidate) => candidate.achieved && !existing.has(candidate.id));
  if (!unlocked.length) return state;
  return {
    ...state,
    achievements: [
      ...state.achievements,
      ...unlocked.map((candidate) => ({ id: candidate.id, unlockedDay: state.day })),
    ],
  };
}

function closeMonth(state: GameState) {
  const revenue = state.monthlyRevenue;
  const expenses = state.monthlyExpenses;
  const investmentIncome = getEstimatedMonthlyPortfolioIncome(state);
  const profit = revenue - expenses + investmentIncome;
  let next: GameState = {
    ...state,
    cash: state.cash + investmentIncome,
    lifetimeProfit: state.lifetimeProfit + investmentIncome,
    lastMonthRevenue: revenue,
    lastMonthProductRevenue: state.monthlyProductRevenue,
    lastMonthContractRevenue: state.monthlyContractRevenue,
    lastMonthExpenses: expenses,
    lastMonthInvestmentIncome: investmentIncome,
    monthlyRevenue: 0,
    monthlyProductRevenue: 0,
    monthlyContractRevenue: 0,
    monthlyExpenses: 0,
    history: compactCompanyHistory([
      ...state.history,
      {
        day: state.day,
        revenue,
        productRevenue: state.monthlyProductRevenue,
        contractRevenue: state.monthlyContractRevenue,
        expenses,
        profit,
        valuation: state.valuation,
        cash: state.cash + investmentIncome,
        debt: state.debt,
        marketShare: state.marketShare,
        employees: getEmployeeCount(state),
        brand: state.brand,
      },
    ]),
    competitors: state.competitors.map((competitor) => ({
      ...competitor,
      history: [...competitor.history, competitor.price].slice(-STOCK_HISTORY_LIMIT),
    })),
  };
  if (state.day % 90 === 0) {
    next = addNews(next, {
      id: `quarter-${state.day}`,
      day: state.day,
      title: revenue >= expenses ? "Quartal endet mit operativem Gewinn" : "Quartalsverlust belastet die Liquidität",
      body: `${formatCompactMoney(revenue)} Umsatz stehen ${formatCompactMoney(expenses)} Kosten gegenüber.`,
      category: "finance",
      tone: revenue >= expenses ? "positive" : "warning",
    });
  }
  next = updateAchievements(next);
  return next;
}

function simulateOneDay(state: GameState) {
  const preparedState = acceptAutomaticEnterpriseContracts(state);
  const day = preparedState.day + 1;
  const sanitizedProducts = (Array.isArray(preparedState.products) ? preparedState.products : []).map((product) => ({
    ...product,
    price: Math.max(0, finite(product.price)),
    inventory: Math.max(0, finite(product.inventory)),
  }));
  const contractPricingState = { ...preparedState, products: sanitizedProducts };
  // A single invalid persisted value must never poison the complete financial
  // simulation. JSON serializes NaN/Infinity as null, so this also repairs
  // saves that were written while the old contract bug was active.
  const workingState: GameState = {
    ...preparedState,
    day,
    cash: finite(preparedState.cash),
    debt: Math.max(0, finite(preparedState.debt)),
    lifetimeRevenue: Math.max(0, finite(preparedState.lifetimeRevenue)),
    lifetimeProfit: finite(preparedState.lifetimeProfit),
    monthlyRevenue: Math.max(0, finite(preparedState.monthlyRevenue)),
    monthlyProductRevenue: Math.max(0, finite(preparedState.monthlyProductRevenue)),
    monthlyContractRevenue: Math.max(0, finite(preparedState.monthlyContractRevenue)),
    monthlyExpenses: Math.max(0, finite(preparedState.monthlyExpenses)),
    lastMonthRevenue: Math.max(0, finite(preparedState.lastMonthRevenue)),
    lastMonthProductRevenue: Math.max(0, finite(preparedState.lastMonthProductRevenue)),
    lastMonthContractRevenue: Math.max(0, finite(preparedState.lastMonthContractRevenue)),
    lastMonthExpenses: Math.max(0, finite(preparedState.lastMonthExpenses)),
    products: sanitizedProducts,
    enterpriseContracts: (Array.isArray(preparedState.enterpriseContracts) ? preparedState.enterpriseContracts : []).map((contract) => {
      const totalDays = Math.max(1, positiveInteger(contract.totalDays, 1));
      const totalUnits = Math.max(1, finite(contract.totalUnits, 1));
      const product = sanitizedProducts.find((candidate) => candidate.id === contract.productId);
      const balancedUnitPrice = product
        ? getEnterpriseContractUnitPrice(contractPricingState, Math.max(0, finite(contract.unitPrice)), product)
        : Math.max(0, finite(contract.unitPrice));
      return {
        ...contract,
        totalDays,
        daysRemaining: Math.max(1, positiveInteger(contract.daysRemaining, totalDays)),
        totalUnits,
        fulfilledUnits: clamp(finite(contract.fulfilledUnits), 0, totalUnits),
        unitPrice: balancedUnitPrice,
        minimumQuality: Math.max(0, finite(contract.minimumQuality)),
        lastDelivery: Math.max(0, finite(contract.lastDelivery)),
      };
    }),
  };
  const activeProducts = workingState.products.filter(
    (product) => product.active && resolveProductBlueprint(product),
  );
  const marketMetrics = calculateProductMarketMetrics(workingState);
  const demandEntries = activeProducts.map((product) => {
    const blueprint = resolveProductBlueprint(product)!;
    const consumerDemand = marketMetrics.get(product.id)?.demand ?? 0;
    const quality = getProductQuality(workingState, product, blueprint);
    const contractTargets = workingState.enterpriseContracts
      .filter((contract) => contract.productId === product.id && quality >= contract.minimumQuality)
      .map((contract) => ({
        contract,
        target: getContractDailyTarget(contract),
        remaining: Math.max(0, contract.totalUnits - contract.fulfilledUnits),
      }))
      .sort((left, right) => left.contract.daysRemaining - right.contract.daysRemaining);
    const contractDemand = contractTargets.reduce((sum, entry) => sum + entry.remaining, 0);
    const requiredContractDelivery = contractTargets.reduce((sum, entry) => sum + entry.target, 0);
    const demand = consumerDemand + contractDemand;
    const reportedDemand = consumerDemand + requiredContractDelivery;
    const automaticTarget = demand * 1.08 + Math.max(0, demand * 2.5 - product.inventory) * 0.14;
    const productionTarget = product.productionTarget === null
      ? automaticTarget
      : clamp(finite(product.productionTarget), 0, 5_000_000);
    return { product, blueprint, demand, reportedDemand, consumerDemand, contractDemand, contractTargets, productionTarget };
  });
  const totalConsumerDemand = demandEntries.reduce(
    (total, entry) => total + entry.consumerDemand,
    0,
  );
  const salesCapacity = getDailySalesCapacity(workingState);
  const capacity = getFactoryCapacity(workingState);
  const warehouseCapacity = getWarehouseCapacity(workingState);
  const currentInventory = activeProducts.reduce(
    (total, product) => total + Math.max(0, product.inventory),
    0,
  );
  const warehouseSpace = Math.max(0, warehouseCapacity - currentInventory);
  const totalProductionTarget = demandEntries.reduce(
    (total, entry) => total + entry.productionTarget,
    0,
  );
  const productionPlans = new Map(demandEntries.map((entry) => [entry.product.id, 0]));
  let remainingProductionCapacity = capacity;
  const allocateProductionStage = (desiredAmounts: Map<string, number>) => {
    const feasible = demandEntries.map((entry) => {
      const planned = productionPlans.get(entry.product.id) ?? 0;
      return [entry.product.id, Math.max(0, Math.min(
        desiredAmounts.get(entry.product.id) ?? 0,
        entry.productionTarget - planned,
      ))] as const;
    });
    const totalDesired = feasible.reduce((sum, [, amount]) => sum + amount, 0);
    const scale = totalDesired > 0 ? Math.min(1, remainingProductionCapacity / totalDesired) : 0;
    for (const [productId, amount] of feasible) {
      productionPlans.set(productId, (productionPlans.get(productId) ?? 0) + amount * scale);
    }
    remainingProductionCapacity = Math.max(0, remainingProductionCapacity - totalDesired * scale);
  };
  // 1. Endkundennachfrage, 2. Firmenaufträge, 3. zusätzlicher Lageraufbau.
  allocateProductionStage(new Map(demandEntries.map((entry) => [
    entry.product.id,
    totalConsumerDemand > 0
      ? Math.min(entry.consumerDemand, salesCapacity * (entry.consumerDemand / totalConsumerDemand))
      : 0,
  ])));
  allocateProductionStage(new Map(demandEntries.map((entry) => [entry.product.id, entry.contractDemand])));
  allocateProductionStage(new Map(demandEntries.map((entry) => [
    entry.product.id,
    totalProductionTarget > 0
      ? warehouseSpace * (entry.productionTarget / totalProductionTarget)
      : 0,
  ])));
  let productRevenue = 0;
  let contractRevenue = 0;
  let productionExpenses = 0;
  let totalSales = 0;
  let totalProduction = 0;
  let totalReturns = 0;
  let warrantyExpenses = 0;
  const contractDeliveries = new Map<string, number>();
  const products = workingState.products.map((product) => {
    const entry = demandEntries.find((candidate) => candidate.product.id === product.id);
    if (!entry) {
      return { ...product, lastDemand: 0, lastProduction: 0, lastSales: 0, lastContractSales: 0, lastLostSales: 0, lastReturns: 0 };
    }
    const production = productionPlans.get(product.id) ?? 0;
    const available = product.inventory + production;
    const salesAllocation = totalConsumerDemand > 0
      ? salesCapacity * (entry.consumerDemand / totalConsumerDemand)
      : 0;
    const consumerSales = Math.max(0, Math.min(entry.consumerDemand, available, salesAllocation));
    let availableForDelivery = available - consumerSales;
    let contractSales = 0;
    let productContractRevenue = 0;
    for (const target of entry.contractTargets) {
      const delivery = Math.min(target.remaining, availableForDelivery);
      contractDeliveries.set(target.contract.id, delivery);
      productContractRevenue += delivery * target.contract.unitPrice;
      contractSales += delivery;
      availableForDelivery -= delivery;
    }
    const sales = contractSales + consumerSales;
    const consumerRevenue = consumerSales * product.price;
    const unitCost = getUnitCost(workingState, entry.blueprint, product);
    const returnRate = getProductWarrantyRate(workingState, product);
    const returns = sales * returnRate;
    const warrantyCost = returns * unitCost * 0.45;
    productRevenue += consumerRevenue;
    contractRevenue += productContractRevenue;
    productionExpenses += production * unitCost;
    warrantyExpenses += warrantyCost;
    totalSales += sales;
    totalProduction += production;
    totalReturns += returns;
    return {
      ...product,
      inventory: Math.min(warehouseCapacity, Math.max(0, available - sales)),
      lastDemand: entry.reportedDemand,
      lastProduction: production,
      lastSales: sales,
      lastContractSales: contractSales,
      lastLostSales: Math.max(0, entry.reportedDemand - sales),
      lastReturns: returns,
    };
  });
  const payroll = getDailyPayroll(workingState);
  const marketing = getDailyMarketingCost(workingState);
  const maintenance = Math.max(0, workingState.maintenanceBudget);
  const interest = (workingState.debt * getAnnualInterestRate(workingState)) / DAYS_PER_YEAR;
  const consolidated = getDailyConsolidatedBusiness(workingState);
  const contractResults = workingState.enterpriseContracts.map((contract) => {
    const delivery = contractDeliveries.get(contract.id) ?? 0;
    const fulfilledUnits = contract.fulfilledUnits + delivery;
    const remainingUnits = Math.max(0, contract.totalUnits - fulfilledUnits);
    const completed = remainingUnits <= 0.001;
    const deadlineReached = contract.daysRemaining <= 1;
    return {
      contract,
      delivery,
      fulfilledUnits,
      remainingUnits,
      completed,
      deadlineReached,
      penalty: deadlineReached && !completed ? remainingUnits * contract.unitPrice * 0.08 : 0,
    };
  });
  const contractPenalty = contractResults.reduce((sum, result) => sum + result.penalty, 0);
  const revenue = productRevenue + contractRevenue + consolidated.revenue;
  const expenses = productionExpenses + warrantyExpenses + payroll + marketing + maintenance + interest + consolidated.expenses + contractPenalty;
  const profit = revenue - expenses;
  const cashBeforeDebtRepayment = workingState.cash + profit;
  const debtRepayment = Math.min(
    getDailyDebtRepayment(workingState),
    Math.max(0, cashBeforeDebtRepayment),
  );
  const remainingDebt = Math.max(0, workingState.debt - debtRepayment);
  const researchRate = workingState.currentResearch ? getResearchRate(workingState) : 0;
  const competitors = workingState.competitors.map((competitor) => updateCompetitor(competitor, day));
  const bankruptcies = competitors.filter((competitor, index) =>
    competitor.status === "bankrupt" && workingState.competitors[index]?.status === "active",
  );
  let next: GameState = {
    ...workingState,
    products,
    cash: cashBeforeDebtRepayment - debtRepayment,
    debt: remainingDebt,
    dailyDebtRepayment:
      remainingDebt <= 0.01 ? 0 : workingState.dailyDebtRepayment,
    lifetimeRevenue: workingState.lifetimeRevenue + revenue,
    lifetimeProfit: workingState.lifetimeProfit + profit,
    monthlyRevenue: workingState.monthlyRevenue + revenue,
    monthlyProductRevenue: workingState.monthlyProductRevenue + productRevenue,
    monthlyContractRevenue: workingState.monthlyContractRevenue + contractRevenue,
    monthlyExpenses: workingState.monthlyExpenses + expenses,
    lastDayRevenue: revenue,
    lastDayProductRevenue: productRevenue,
    lastDayContractRevenue: contractRevenue,
    lastDayExpenses: expenses,
    researchPoints: workingState.researchPoints + researchRate,
    enterpriseContracts: contractResults
      .filter((result) => !result.completed && !result.deadlineReached)
      .map((result) => ({
        ...result.contract,
        daysRemaining: result.contract.daysRemaining - 1,
        fulfilledUnits: result.fulfilledUnits,
        lastDelivery: result.delivery,
      })),
    competitors,
  };

  for (const result of contractResults) {
    if (result.completed) {
      next = addNews(next, {
        id: `contract-complete-${result.contract.id}-${day}`,
        day,
        title: `${result.contract.clientName}: Auftrag erfüllt`,
        body: `${Math.round(result.contract.totalUnits).toLocaleString("de-DE")} Geräte wurden vollständig geliefert.`,
        category: "company",
        tone: "positive",
      });
    } else if (result.deadlineReached) {
      next = addNews(next, {
        id: `contract-missed-${result.contract.id}-${day}`,
        day,
        title: `${result.contract.clientName}: Lieferfrist verfehlt`,
        body: `${Math.ceil(result.remainingUnits).toLocaleString("de-DE")} Geräte fehlen. Die Vertragsstrafe beträgt ${formatCompactMoney(result.penalty)}.`,
        category: "company",
        tone: "warning",
      });
    }
  }

  for (const competitor of bankruptcies) {
    const lostInvestment = competitor.ownedShares * competitor.averageCost;
    next = addNews(next, {
      id: `bankruptcy-${competitor.id}-${day}`,
      day,
      title: `${competitor.name} ist insolvent`,
      body: lostInvestment > 0
        ? `Die Aktie wird wertlos. Deine Position mit einem Einstand von ${formatCompactMoney(lostInvestment)} ist vollständig verloren.`
        : "Das Unternehmen scheidet aus dem Wettbewerb aus; seine Aktie wird wertlos.",
      category: "finance",
      tone: "critical",
    });
  }

  if (workingState.currentResearch) {
    const tech = getTech(workingState.currentResearch);
    const componentProject = getComponentResearchProject(workingState.currentResearch);
    if (tech && next.researchPoints >= tech.cost) next = applyTechCompletion(next, tech);
    else if (componentProject && next.researchPoints >= componentProject.cost) {
      next = applyComponentResearchCompletion(
        next,
        componentProject.attribute,
        componentProject.targetLevel,
      );
    }
  }

  if (workingState.campaign) {
    const daysRemaining = workingState.campaign.daysRemaining - 1;
    next = {
      ...next,
      brand: clamp(next.brand + (workingState.campaign.brandBoost * 100) / workingState.campaign.totalDays, 0, 100),
      campaign: daysRemaining > 0 ? { ...workingState.campaign, daysRemaining } : null,
    };
    if (daysRemaining <= 0) {
      next = addNews(next, {
        id: `campaign-end-${workingState.campaign.id}-${day}`,
        day,
        title: `${workingState.campaign.name} abgeschlossen`,
        body: "Die Kampagne endet. Ihre Markenwirkung bleibt, der direkte Nachfragebonus läuft aus.",
        category: "company",
        tone: "neutral",
      });
    }
  }

  const utilization = Math.min(1.5, totalProduction / Math.max(1, capacity));
  const moraleTarget = clamp(74 - Math.max(0, utilization - 0.92) * 28 + (next.cash < 0 ? -18 : 0), 20, 92);
  const addressableRevenue = getDailyPcMarketSize(next) * 1_100;
  const brandInvestment = Math.log1p(
    Math.max(0, next.marketingBudget) / Math.max(5_000, addressableRevenue * 0.0025),
  ) * 0.009 * getMarketingEfficiency(next) * MARKETING_FOCUSES[next.marketingFocus].brand;
  const returnReputationImpact = next.marketingFocus === "loyalty" ? 0.018 : 0.035;
  const brandDrift =
    clamp(brandInvestment, 0, 0.025) +
    (totalSales > 0 ? 0.001 : -0.002) -
    next.brand * 0.00008 -
    totalReturns / Math.max(1, totalSales) * returnReputationImpact;
  const requiredMaintenance = Math.max(250, 260 * workingState.factoryLevel ** 1.3 * (1 + workingState.automationLevel * 0.12));
  const maintenanceCoverage = clamp(workingState.maintenanceBudget / requiredMaintenance, 0, 2);
  const conditionChange = maintenanceCoverage * 0.075 - utilization * 0.065 - 0.006;
  const demandShareTarget =
    (totalSales / Math.max(1, getDailyPcMarketSize(next))) * 100;
  const marketShareGap = clamp(demandShareTarget, 0.0001, 95) - next.marketShare;
  const marketShareAdjustment = marketShareGap * (marketShareGap > 0 ? 0.0025 : 0.009);
  next = {
    ...next,
    morale: clamp(next.morale + (moraleTarget - next.morale) * 0.012, 0, 100),
    brand: clamp(next.brand + brandDrift, 0, 100),
    factoryCondition: clamp(next.factoryCondition + conditionChange, 20, 100),
    marketShare: clamp(
      next.marketShare + marketShareAdjustment,
      0.0001,
      95,
    ),
  };
  next = updatePlayerValuation(next);

  if (day % DAYS_PER_MONTH === 0) next = closeMonth(next);
  return startAutomaticResearch(next);
}

export function simulateDays(
  state: GameState,
  days: number,
  options: SimulationOptions = {},
): SimulationResult {
  const requestedDays = Math.min(MAX_SIMULATION_DAYS, positiveInteger(days));
  let next = state;
  let simulatedDays = 0;
  const initialRevenue = state.lifetimeRevenue;
  const initialProfit = state.lifetimeProfit;
  const initialResearch = state.researchPoints;
  const completedResearch: string[] = [];
  let spentResearch = 0;
  let previousUnlocked = new Set(state.unlockedTech);
  let previousComponentResearch = { ...state.componentResearch };

  for (let index = 0; index < requestedDays; index += 1) {
    next = simulateOneDay(next);
    simulatedDays += 1;
    for (const techId of next.unlockedTech) {
      if (!previousUnlocked.has(techId)) {
        const tech = getTech(techId);
        completedResearch.push(tech?.name ?? techId);
        spentResearch += tech?.cost ?? 0;
      }
    }
    for (const attribute of PC_RESEARCH_ATTRIBUTE_IDS) {
      const previousLevel = previousComponentResearch[attribute];
      const currentLevel = next.componentResearch[attribute];
      if (currentLevel > previousLevel) {
        const track = getPcResearchTrack(attribute);
        completedResearch.push(`${track?.name ?? attribute} Stufe ${currentLevel}`);
        spentResearch += getComponentResearchCost(attribute, currentLevel);
      }
    }
    previousUnlocked = new Set(next.unlockedTech);
    previousComponentResearch = { ...next.componentResearch };
  }

  if (Number.isFinite(options.now)) next = { ...next, lastTickAt: options.now! };
  const revenue = next.lifetimeRevenue - initialRevenue;
  const profit = next.lifetimeProfit - initialProfit;
  return {
    state: next,
    summary: {
      days: simulatedDays,
      revenue,
      expenses: Math.max(0, revenue - profit),
      profit,
      researchPoints: Math.max(0, next.researchPoints - initialResearch + spentResearch),
      completedResearch,
    },
  };
}

function normalizeLoadedState(imported: GameState) {
  const timestamp = Number.isFinite(imported.lastSavedAt) ? imported.lastSavedAt : 0;
  const base = createInitialState(timestamp);
  const importedRecord = { ...imported } as unknown as Record<string, unknown>;
  const legacyPendingEvent = importedRecord.pendingEvent;
  delete importedRecord.pendingEvent;
  delete importedRecord.lastEventDay;
  delete importedRecord.eventSeed;
  for (const obsolete of ["loanRateAdjustment", "staffingTargets", "autoStaffing", "monthlyPlan", "dividendPolicy", "lastDividendPaid", "investorConfidence", "capitalGuidance", "guidanceRevenueTarget"]) {
    delete importedRecord[obsolete];
  }
  const legacyContracts = Array.isArray(importedRecord.enterpriseContracts)
    ? importedRecord.enterpriseContracts
    : importedRecord.enterpriseContract && typeof importedRecord.enterpriseContract === "object"
      ? [importedRecord.enterpriseContract]
      : [];
  const importedContracts = legacyContracts.map((value) => ({ ...value } as Record<string, unknown>));
  for (const importedContract of importedContracts) {
    const contractDays = Math.max(1, finite(Number(importedContract.totalDays), finite(Number(importedContract.durationDays), 1)));
    const legacyDailyUnits = Math.max(0, finite(Number(importedContract.unitsPerDay)));
    importedContract.totalDays = contractDays;
    importedContract.daysRemaining = Math.max(1, finite(Number(importedContract.daysRemaining), contractDays));
    importedContract.totalUnits = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, finite(Number(importedContract.totalUnits), legacyDailyUnits * contractDays || 1)));
    importedContract.fulfilledUnits = clamp(Math.max(0, finite(Number(importedContract.fulfilledUnits))), 0, Number(importedContract.totalUnits));
    importedContract.unitPrice = Math.max(0, finite(Number(importedContract.unitPrice)));
    importedContract.minimumQuality = Math.max(0, finite(Number(importedContract.minimumQuality)));
    importedContract.lastDelivery = Math.max(0, finite(Number(importedContract.lastDelivery), finite(Number(importedContract.lastFulfilled))));
    delete importedContract.unitsPerDay;
    delete importedContract.lastFulfilled;
    delete importedContract.durationDays;
    delete importedContract.previousSalesChannel;
  }
  importedRecord.enterpriseContracts = importedContracts;
  delete importedRecord.enterpriseContract;
  const cleanImported = importedRecord as unknown as GameState;
  const employees = { ...base.employees, ...(imported.employees ?? {}) };
  const departmentLevels = { ...base.departmentLevels, ...(imported.departmentLevels ?? {}) };
  const componentResearch = imported.componentResearch
    ? sanitizeResearchLevels(imported.componentResearch)
    : migrateLegacyResearch(imported.unlockedParts);
  const componentProject = getComponentResearchProject(imported.currentResearch);
  const currentResearch =
    componentProject &&
    componentProject.targetLevel === componentResearch[componentProject.attribute] + 1
    ? imported.currentResearch
    : null;
  const legacySpeedScale = imported.version < 4;
  const previousSpeed = normalizeActiveGameSpeed(
    imported.previousSpeed,
    legacySpeedScale,
  );
  const savedSpeed = normalizeGameSpeed(imported.speed, legacySpeedScale);
  const resumedSpeed = legacyPendingEvent && savedSpeed === 0
    ? previousSpeed
    : savedSpeed;
  const sectionMap: Partial<Record<GameState["selectedSection"], GameState["selectedSection"]>> = {
    products: "builder",
  };
  const selectedSection = sectionMap[imported.selectedSection] ?? imported.selectedSection;
  const validSections: GameState["selectedSection"][] = ["dashboard", "accounting", "builder", "research", "company", "production", "people", "marketing", "market", "finance", "stocks", "deals"];
  const normalized = {
    ...base,
    ...cleanImported,
    version: GAME_VERSION,
    takeoverRisk: 0,
    takeoverDefenseDays: 0,
    day: positiveInteger(imported.day),
    speed: resumedSpeed,
    previousSpeed,
    difficulty: DIFFICULTY_SETTINGS[imported.difficulty] ? imported.difficulty : base.difficulty,
    cash: finite(imported.cash, base.cash),
    debt: Math.max(0, finite(imported.debt)),
    lifetimeRevenue: Math.max(0, finite(imported.lifetimeRevenue)),
    lifetimeProfit: finite(imported.lifetimeProfit),
    monthlyRevenue: Math.max(0, finite(imported.monthlyRevenue)),
    monthlyProductRevenue: Math.max(0, finite(imported.monthlyProductRevenue, imported.monthlyRevenue)),
    monthlyContractRevenue: Math.max(0, finite(imported.monthlyContractRevenue)),
    monthlyExpenses: Math.max(0, finite(imported.monthlyExpenses)),
    lastMonthRevenue: Math.max(0, finite(imported.lastMonthRevenue)),
    lastMonthProductRevenue: Math.max(0, finite(imported.lastMonthProductRevenue, imported.lastMonthRevenue)),
    lastMonthContractRevenue: Math.max(0, finite(imported.lastMonthContractRevenue)),
    lastMonthExpenses: Math.max(0, finite(imported.lastMonthExpenses)),
    lastDayRevenue: Math.max(0, finite(imported.lastDayRevenue)),
    lastDayProductRevenue: Math.max(0, finite(imported.lastDayProductRevenue, imported.lastDayRevenue)),
    lastDayContractRevenue: Math.max(0, finite(imported.lastDayContractRevenue)),
    lastDayExpenses: Math.max(0, finite(imported.lastDayExpenses)),
    dailyDebtRepayment: Math.max(
      0,
      finite(
        imported.dailyDebtRepayment,
        Math.max(0, finite(imported.debt)) / LOAN_TERM_DAYS,
      ),
    ),
    lastMonthInvestmentIncome: Math.max(
      0,
      finite(imported.lastMonthInvestmentIncome),
    ),
    brand: clamp(finite(imported.brand, base.brand), 0, 100),
    reputation: clamp(finite(imported.reputation, base.reputation), 0, 100),
    marketShare: clamp(finite(imported.marketShare, base.marketShare), 0, 100),
    morale: clamp(finite(imported.morale, base.morale), 0, 100),
    factoryLevel: Math.max(1, positiveInteger(imported.factoryLevel, base.factoryLevel)),
    warehouseLevel: Math.max(1, positiveInteger(imported.warehouseLevel, base.warehouseLevel)),
    automationLevel: positiveInteger(imported.automationLevel, base.automationLevel),
    founderShares: positiveInteger(imported.founderShares, base.founderShares),
    totalShares: Math.max(1, positiveInteger(imported.totalShares, base.totalShares)),
    employees: Object.fromEntries(
      (Object.keys(DEPARTMENTS) as DepartmentId[]).map((department) => [department, positiveInteger(employees[department])]),
    ) as GameState["employees"],
    departmentLevels: Object.fromEntries(
      (Object.keys(DEPARTMENTS) as DepartmentId[]).map((department) => [department, Math.max(1, positiveInteger(departmentLevels[department], 1))]),
    ) as GameState["departmentLevels"],
    factoryCondition: clamp(finite(imported.factoryCondition, 100), 20, 100),
    maintenanceBudget: Math.max(0, finite(imported.maintenanceBudget, base.maintenanceBudget)),
    qualityFocus: clamp(finite(imported.qualityFocus, base.qualityFocus), 0.7, 1.3),
    marketingBudget: Math.max(0, finite(imported.marketingBudget, base.marketingBudget)),
    productGenerations: { ...base.productGenerations, ...(imported.productGenerations ?? {}) },
    marketingFocus: MARKETING_FOCUSES[imported.marketingFocus] ? imported.marketingFocus : base.marketingFocus,
    marketingTarget: ["all", "budget", "mainstream", "performance"].includes(imported.marketingTarget) ? imported.marketingTarget : base.marketingTarget,
    enterpriseContracts: (cleanImported.enterpriseContracts ?? []).map((contract) => ({
      ...contract,
      totalDays: Math.max(1, positiveInteger(contract.totalDays, 1)),
      daysRemaining: Math.max(1, positiveInteger(contract.daysRemaining, contract.totalDays || 1)),
      totalUnits: Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, finite(contract.totalUnits, 1))),
      fulfilledUnits: clamp(Math.max(0, finite(contract.fulfilledUnits)), 0, Math.max(1, finite(contract.totalUnits, 1))),
      unitPrice: Math.max(0, finite(contract.unitPrice)),
      minimumQuality: Math.max(0, finite(contract.minimumQuality)),
      lastDelivery: Math.max(0, finite(contract.lastDelivery)),
    })),
    unlockedTech: [...new Set((imported.unlockedTech ?? base.unlockedTech).filter((id) => Boolean(getTech(id))))],
    unlockedParts: [...new Set((imported.unlockedParts ?? base.unlockedParts).filter((id) => typeof id === "string"))],
    componentResearch,
    currentResearch,
    autoResearch: imported.autoResearch === true,
    autoAcceptContracts: imported.autoAcceptContracts === true,
    selectedSection: validSections.includes(selectedSection) ? selectedSection : "dashboard",
    products: (imported.products ?? base.products).map((product) => {
      const cleanProduct = { ...product } as ProductState & Record<string, unknown>;
      delete cleanProduct.unitsSold;
      delete cleanProduct.lifetimeRevenue;
      delete cleanProduct.salesChannel;
      return {
        ...cleanProduct,
        productionTarget: imported.version < 7
          ? null
          : product.productionTarget === null
            ? null
            : clamp(finite(product.productionTarget, Math.max(1, product.lastDemand || 8)), 0, 5_000_000),
        lastDemand: Math.max(0, finite(product.lastDemand)),
        lastProduction: Math.max(0, finite(product.lastProduction)),
        lastSales: Math.max(0, finite(product.lastSales)),
        lastContractSales: Math.max(0, finite(product.lastContractSales)),
        lastLostSales: Math.max(0, finite(product.lastLostSales)),
        lastReturns: Math.max(0, finite(product.lastReturns)),
        generation: Math.max(1, positiveInteger(product.generation, 1)),
          configuration: product.configuration
            ? normalizePcConfiguration(product.configuration)
            : undefined,
          marketSegment: product.marketSegment ?? (product.audience === "gaming" || product.audience === "creator" ? "performance" : "budget"),
      };
    }),
    competitors: (imported.competitors ?? base.competitors).map((competitor) => {
      const currentPrice = Math.max(0, finite(competitor.price));
      const priceHistory = Array.isArray(competitor.priceHistory) && competitor.priceHistory.length
        ? competitor.priceHistory.map((point) => ({ ...point })).slice(-STOCK_DAILY_HISTORY_LIMIT)
        : [{
            day: positiveInteger(imported.day),
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
          }];
      return {
        ...competitor,
        history: [...competitor.history],
        averageCost: finite(competitor.averageCost, competitor.ownedShares > 0 ? competitor.price : 0),
        realizedProfit: finite(competitor.realizedProfit),
        priceHistory,
      };
    }),
    history: compactCompanyHistory([
      base.history[0],
      ...(imported.history ?? base.history).map((point) => ({
        ...point,
        productRevenue: Math.max(0, finite(point.productRevenue ?? point.revenue, point.revenue)),
        contractRevenue: Math.max(0, finite(point.contractRevenue ?? 0)),
        debt: finite(point.debt),
        marketShare: finite(point.marketShare, imported.marketShare),
        employees: positiveInteger(point.employees, getEmployeeCount(imported)),
        brand: finite(point.brand, imported.brand),
      })),
    ]),
    news: (imported.news ?? base.news).map((item) => ({ ...item })).slice(0, NEWS_LIMIT),
    achievements: (imported.achievements ?? []).map((achievement) => ({ ...achievement })),
    campaign: imported.campaign ? { ...imported.campaign } : null,
  } satisfies GameState;
  const valuation = calculatePlayerFairValue(normalized);
  return {
    ...normalized,
    valuation,
    sharePrice: valuation / Math.max(1, normalized.totalShares),
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  let next = state;
  switch (action.type) {
    case "TICK": {
      if (state.speed === 0 || positiveInteger(action.days) === 0) {
        if (!Number.isFinite(action.now) || action.now === state.lastTickAt) return state;
        return withRevision(state, { ...state, lastTickAt: action.now });
      }
      next = simulateDays(state, action.days, { now: action.now }).state;
      break;
    }
    case "SET_SPEED": {
      if (action.speed === state.speed) return state;
      next = action.speed === 0
        ? { ...state, previousSpeed: state.speed === 0 ? state.previousSpeed : state.speed, speed: 0 }
        : { ...state, speed: action.speed, previousSpeed: action.speed };
      break;
    }
    case "TOGGLE_PAUSE":
      next = state.speed === 0
        ? { ...state, speed: state.previousSpeed }
        : { ...state, previousSpeed: state.speed, speed: 0 };
      break;
    case "SET_SECTION":
      if (state.selectedSection === action.section) return state;
      next = { ...state, selectedSection: action.section };
      break;
    case "HIRE": {
      const amount = positiveInteger(action.amount ?? 1);
      if (amount <= 0) return state;
      const cost = getHireCost(action.department, amount, state.day);
      if (state.cash < cost) return state;
      next = applyOperatingExpense(state, cost);
      next = { ...next, employees: { ...next.employees, [action.department]: next.employees[action.department] + amount }, morale: clamp(next.morale - Math.min(3, amount * 0.15), 0, 100) };
      break;
    }
    case "FIRE": {
      const requested = positiveInteger(action.amount ?? 1);
      const amount = Math.min(requested, state.employees[action.department]);
      if (amount <= 0) return state;
      const cost = getFireCost(action.department, amount, state.day);
      if (state.cash < cost) return state;
      next = applyOperatingExpense(state, cost);
      next = { ...next, employees: { ...next.employees, [action.department]: next.employees[action.department] - amount }, morale: clamp(next.morale - Math.min(16, 2 + amount * 0.8), 0, 100), reputation: clamp(next.reputation - Math.min(5, amount * 0.25), 0, 100) };
      break;
    }
    case "UPGRADE_DEPARTMENT": {
      const cost = getDepartmentUpgradeCost(state, action.department);
      if (state.cash < cost) return state;
      next = { ...state, cash: state.cash - cost, departmentLevels: { ...state.departmentLevels, [action.department]: state.departmentLevels[action.department] + 1 } };
      break;
    }
    case "START_RESEARCH": {
      const tech = getTech(action.techId);
      if (!tech || state.currentResearch || getTechStatus(state, tech) !== "available") return state;
      next = {
        ...state,
        currentResearch: tech.id,
        researchPoints: 0,
      };
      break;
    }
    case "START_COMPONENT_RESEARCH": {
      if (state.currentResearch || !getPcResearchTrack(action.attribute)) return state;
      const project = createNextComponentResearchProject(
        action.attribute,
        state.componentResearch[action.attribute],
      );
      next = {
        ...state,
        currentResearch: project.id,
        researchPoints: 0,
      };
      break;
    }
    case "SET_AUTO_RESEARCH": {
      next = startAutomaticResearch({ ...state, autoResearch: action.enabled });
      break;
    }
    case "CANCEL_RESEARCH":
      if (!state.currentResearch) return state;
      next = { ...state, currentResearch: null, autoResearch: false, researchPoints: 0 };
      break;
    case "LAUNCH_PRODUCT": {
      const blueprint = getBlueprint(action.blueprintId);
      if (!blueprint || state.products.some((product) => product.blueprintId === blueprint.id)) return state;
      if (!blueprint.requiredTech.every((techId) => state.unlockedTech.includes(techId)) || state.cash < blueprint.developmentCost) return state;
      const priceFactor = state.pricingStrategy === "value" ? 0.88 : state.pricingStrategy === "premium" ? 1.2 : 1;
      next = applyOperatingExpense(state, blueprint.developmentCost);
      next = {
        ...next,
        products: [...next.products, { id: `product-${blueprint.id}`, blueprintId: blueprint.id, name: blueprint.name, price: roundMoney(blueprint.basePrice * priceFactor), launchedDay: state.day, inventory: 0, active: true, qualityBonus: 0, lastDemand: 0, lastProduction: 0, lastSales: 0, lastContractSales: 0, productionTarget: Math.ceil(blueprint.baseDemand), lastLostSales: 0, lastReturns: 0, generation: 1 }],
      };
      next = addNews(next, { id: `launch-${blueprint.id}-${state.day}`, day: state.day, title: `${blueprint.name} kommt auf den Markt`, body: blueprint.tagline, category: "product", tone: "positive" });
      break;
    }
    case "LAUNCH_CUSTOM_PC": {
      const marketSegment = action.marketSegment ?? "mainstream";
      const configuration = normalizePcConfiguration(action.configuration);
      const duplicateConfiguration = state.products.some(
        (product) =>
          product.active &&
          product.configuration &&
          PC_RESEARCH_ATTRIBUTE_IDS.every(
            (attribute) => product.configuration?.[attribute] === configuration[attribute],
          ),
      );
      const allPartsUnlocked = isConfigurationWithinResearch(
        configuration,
        state.componentResearch,
      );
      const build = evaluatePcBuild(configuration);
      const name = action.name.trim().slice(0, 30);
      const minimumPrice = Math.ceil(build.buildCost * 1.05);
      if (duplicateConfiguration || !allPartsUnlocked || !build.valid || name.length < 2 || state.cash < build.developmentCost) return state;
      const price = roundMoney(clamp(action.price, minimumPrice, build.suggestedPrice * 3));
      if (!Number.isFinite(action.price) || price < minimumPrice) return state;
      const productId = `pc-${state.day}-${state.saveRevision + 1}`;
      const predecessor = state.products
        .filter((product) => product.active && getProductSegment(product) === marketSegment)
        .sort((left, right) => right.generation - left.generation)[0];
      const generation = state.productGenerations[marketSegment] + 1;
      next = applyOperatingExpense(state, build.developmentCost);
      next = {
        ...next,
        products: [
          ...next.products,
          {
            id: productId,
            blueprintId: "custom-pc",
            configuration,
            marketSegment,
            name,
            price,
            launchedDay: state.day,
            inventory: 0,
            active: true,
            qualityBonus: 0,
            lastDemand: 0,
            lastProduction: 0,
            lastSales: 0,
            lastContractSales: 0,
            productionTarget: null,
            lastLostSales: 0,
            lastReturns: 0,
            generation,
            predecessorId: predecessor?.id,
          },
        ],
        productGenerations: {
          ...next.productGenerations,
          [marketSegment]: generation,
        },
      };
      next = addNews(next, {
        id: `launch-${productId}`,
        day: state.day,
        title: `${name} kommt auf den Markt`,
        body: `${PC_MARKET_SEGMENTS[marketSegment].name}-PC mit ${getPcConfigurationLabel(configuration)}.`,
        category: "product",
        tone: "positive",
      });
      break;
    }
    case "RETIRE_PRODUCT": {
      if (!state.products.some((product) => product.id === action.productId && product.active)) return state;
      if (state.enterpriseContracts.some((contract) => contract.productId === action.productId)) return state;
      next = { ...state, products: state.products.map((product) => product.id === action.productId ? { ...product, active: false, lastDemand: 0, lastProduction: 0, lastSales: 0, lastContractSales: 0, lastLostSales: 0 } : product) };
      break;
    }
    case "SET_PRODUCT_PRICE": {
      const product = state.products.find((candidate) => candidate.id === action.productId);
      const blueprint = product ? resolveProductBlueprint(product) : undefined;
      if (!product || !blueprint || !Number.isFinite(action.price) || action.price <= 0) return state;
      const price = roundMoney(clamp(action.price, blueprint.basePrice * 0.25, blueprint.basePrice * 4));
      if (price === product.price) return state;
      next = { ...state, products: state.products.map((candidate) => candidate.id === product.id ? { ...candidate, price } : candidate) };
      break;
    }
    case "UPGRADE_PRODUCT": {
      const product = state.products.find((candidate) => candidate.id === action.productId);
      if (!product || !product.active || product.qualityBonus >= 30) return state;
      const cost = getProductUpgradeCost(state, product);
      if (!Number.isFinite(cost) || state.cash < cost) return state;
      next = applyOperatingExpense(state, cost);
      next = { ...next, products: next.products.map((candidate) => candidate.id === product.id ? { ...candidate, qualityBonus: candidate.qualityBonus + 5 } : candidate) };
      break;
    }
    case "SET_PRODUCTION_TARGET": {
      const product = state.products.find((candidate) => candidate.id === action.productId);
      if (!product || !product.active) return state;
      const productionTarget = action.target === null
        ? null
        : clamp(finite(action.target), 0, 5_000_000);
      if (productionTarget === product.productionTarget) return state;
      next = {
        ...state,
        products: state.products.map((candidate) =>
          candidate.id === product.id ? { ...candidate, productionTarget } : candidate,
        ),
      };
      break;
    }
    case "SET_MAINTENANCE_BUDGET": {
      const maintenanceBudget = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(finite(action.value))));
      if (maintenanceBudget === state.maintenanceBudget) return state;
      next = { ...state, maintenanceBudget };
      break;
    }
    case "SET_AUTO_ACCEPT_CONTRACTS": {
      if (state.autoAcceptContracts === action.enabled) return state;
      next = { ...state, autoAcceptContracts: action.enabled };
      break;
    }
    case "ACCEPT_ENTERPRISE_CONTRACT": {
      const offer = getEnterpriseContractOffers(state).find((candidate) => candidate.id === action.offerId);
      if (isEnterpriseContractOfferUsed(state, action.offerId)) return state;
      const product = state.products.find((candidate) => candidate.id === action.productId && candidate.active);
      const blueprint = product ? resolveProductBlueprint(product) : undefined;
      if (!offer || !product || !blueprint || getProductSegment(product) !== offer.segment || getProductQuality(state, product, blueprint) < offer.minimumQuality) return state;
      const unitPrice = getEnterpriseContractUnitPrice(state, offer.unitPrice, product);
      if (unitPrice <= 0) return state;
      next = appendEnterpriseContract(state, { ...offer, unitPrice }, product);
      break;
    }
    case "UPGRADE_FACTORY": {
      const cost = getFactoryUpgradeCost(state);
      if (state.cash < cost) return state;
      next = { ...state, cash: state.cash - cost, factoryLevel: state.factoryLevel + 1 };
      break;
    }
    case "UPGRADE_WAREHOUSE": {
      const cost = getWarehouseUpgradeCost(state);
      if (state.cash < cost) return state;
      next = { ...state, cash: state.cash - cost, warehouseLevel: state.warehouseLevel + 1 };
      break;
    }
    case "UPGRADE_AUTOMATION": {
      if (!canUpgradeAutomation(state)) return state;
      const cost = getAutomationUpgradeCost(state);
      if (state.cash < cost) return state;
      next = { ...state, cash: state.cash - cost, automationLevel: state.automationLevel + 1 };
      break;
    }
    case "SET_QUALITY_FOCUS": {
      if (!Number.isFinite(action.value)) return state;
      const qualityFocus = clamp(action.value, 0.7, 1.3);
      if (qualityFocus === state.qualityFocus) return state;
      next = { ...state, qualityFocus };
      break;
    }
    case "SET_MARKETING_BUDGET": {
      if (!Number.isFinite(action.value)) return state;
      const marketingBudget = Math.min(
        Number.MAX_SAFE_INTEGER,
        Math.max(0, Math.round(action.value)),
      );
      if (marketingBudget === state.marketingBudget) return state;
      next = { ...state, marketingBudget };
      break;
    }
    case "SET_MARKETING_STRATEGY":
      if (action.strategy === state.marketingStrategy) return state;
      next = { ...state, marketingStrategy: action.strategy };
      break;
    case "SET_MARKETING_FOCUS":
      if (!MARKETING_FOCUSES[action.focus] || action.focus === state.marketingFocus) return state;
      next = { ...state, marketingFocus: action.focus };
      break;
    case "SET_MARKETING_TARGET":
      if (!["all", "budget", "mainstream", "performance"].includes(action.target) || action.target === state.marketingTarget) return state;
      next = { ...state, marketingTarget: action.target };
      break;
    case "START_CAMPAIGN": {
      const campaign = CAMPAIGNS.find((candidate) => candidate.id === action.campaignId);
      if (!campaign || state.campaign || state.cash < campaign.upfrontCost) return state;
      next = applyOperatingExpense(state, campaign.upfrontCost);
      next = { ...next, campaign: { id: campaign.id, name: campaign.name, daysRemaining: campaign.totalDays, totalDays: campaign.totalDays, dailyCost: campaign.dailyCost, demandBoost: campaign.demandBoost, brandBoost: campaign.brandBoost } };
      break;
    }
    case "BORROW": {
      const amount = finite(action.amount);
      if (amount <= 0 || amount > getCreditLimit(state)) return state;
      next = {
        ...state,
        cash: state.cash + amount,
        debt: state.debt + amount,
        dailyDebtRepayment:
          Math.max(0, finite(state.dailyDebtRepayment)) + amount / LOAN_TERM_DAYS,
      };
      break;
    }
    case "REPAY": {
      const amount = Math.min(Math.max(0, finite(action.amount)), state.debt, Math.max(0, state.cash));
      if (amount <= 0) return state;
      const debt = Math.max(0, state.debt - amount);
      next = {
        ...state,
        cash: state.cash - amount,
        debt,
        dailyDebtRepayment:
          debt <= 0.01
            ? 0
            : Math.min(debt, Math.max(0, finite(state.dailyDebtRepayment))),
      };
      break;
    }
    case "ISSUE_SHARES": {
      const quote = getShareIssueQuote(state, action.percent);
      if (quote.shares <= 0) return state;
      const totalShares = state.totalShares + quote.shares;
      const valuation = state.valuation + quote.proceeds;
      next = {
        ...state,
        cash: state.cash + quote.proceeds,
        totalShares,
        valuation,
        sharePrice: quote.estimatedSharePrice,
        reputation: clamp(state.reputation - 1 - quote.percent * 80, 0, 100),
      };
      next = addNews(next, {
        id: `share-issue-${state.day}-${state.saveRevision}`,
        day: state.day,
        title: "Kapitalerhöhung abgeschlossen",
        body: `${formatCompactMoney(quote.proceeds)} fließen in die Kasse. Der Gründeranteil sinkt auf ${quote.postTransactionOwnership.toFixed(1)} %.`,
        category: "finance",
        tone: quote.postTransactionOwnership >= 50 ? "neutral" : "warning",
      });
      break;
    }
    case "BUYBACK_SHARES": {
      const quote = getBuybackQuote(state, action.percent);
      if (quote.shares <= 0 || state.cash < quote.cost) return state;
      const totalShares = state.totalShares - quote.shares;
      next = {
        ...state,
        cash: state.cash - quote.cost,
        totalShares,
        valuation: quote.estimatedSharePrice * totalShares,
        sharePrice: quote.estimatedSharePrice,
        reputation: clamp(state.reputation + 1 + quote.percent * 100, 0, 100),
      };
      next = addNews(next, {
        id: `share-buyback-${state.day}-${state.saveRevision}`,
        day: state.day,
        title: "Aktienrückkauf abgeschlossen",
        body: `${quote.shares.toLocaleString("de-DE")} Aktien wurden eingezogen. Der Gründeranteil steigt auf ${quote.postTransactionOwnership.toFixed(1)} %.`,
        category: "finance",
        tone: "positive",
      });
      break;
    }
    case "BUY_STOCK": {
      const shares = positiveInteger(action.shares);
      const competitor = state.competitors.find((candidate) => candidate.id === action.competitorId);
      if (!competitor || competitor.status !== "active" || shares <= 0 || competitor.ownedShares + shares > competitor.sharesOutstanding) return state;
      const quote = getStockTradeQuote(competitor, shares, "buy");
      if (state.cash < quote.total) return state;
      const ownedShares = competitor.ownedShares + shares;
      const previousBasis = competitor.ownedShares * competitor.averageCost;
      const averageCost = (previousBasis + quote.total) / ownedShares;
      next = { ...state, cash: state.cash - quote.total, competitors: state.competitors.map((candidate) => candidate.id === competitor.id ? { ...candidate, ...applyStockTradePrice(candidate, quote, "buy", state.day), ownedShares, averageCost } : candidate) };
      break;
    }
    case "SELL_STOCK": {
      const requested = positiveInteger(action.shares);
      const competitor = state.competitors.find((candidate) => candidate.id === action.competitorId);
      if (!competitor || competitor.status !== "active" || requested <= 0) return state;
      const shares = Math.min(requested, competitor.ownedShares);
      if (shares <= 0) return state;
      const quote = getStockTradeQuote(competitor, shares, "sell");
      const ownedShares = competitor.ownedShares - shares;
      const realizedProfit = competitor.realizedProfit + quote.total - shares * competitor.averageCost;
      next = { ...state, cash: state.cash + quote.total, competitors: state.competitors.map((candidate) => candidate.id === competitor.id ? { ...candidate, ...applyStockTradePrice(candidate, quote, "sell", state.day), ownedShares, averageCost: ownedShares > 0 ? candidate.averageCost : 0, realizedProfit } : candidate) };
      break;
    }
    case "ACQUIRE_COMPETITOR": {
      const competitor = state.competitors.find((candidate) => candidate.id === action.competitorId);
      if (!competitor || competitor.status !== "active") return state;
      const cost = getAcquisitionPrice(competitor);
      if (state.cash < cost) return state;
      const totalBasis = competitor.ownedShares * competitor.averageCost + cost;
      next = { ...state, cash: state.cash - cost, competitors: state.competitors.map((candidate) => candidate.id === competitor.id ? { ...candidate, status: "acquired", ownedShares: candidate.sharesOutstanding, averageCost: totalBasis / Math.max(1, candidate.sharesOutstanding), acquisitionIntegrated: true } : candidate) };
      if (!competitor.acquisitionIntegrated) next = applyAcquisitionPerk(next, competitor.id);
      next = addNews(next, { id: `acquisition-${competitor.id}-${state.day}`, day: state.day, title: `${competitor.name} wird übernommen`, body: `Der Kaufpreis beträgt ${formatCompactMoney(cost)}. ${competitor.acquisitionPerk}.`, category: "finance", tone: "positive" });
      break;
    }
    case "MERGE_COMPETITOR": {
      const competitor = state.competitors.find((candidate) => candidate.id === action.competitorId);
      const terms = competitor ? getMergerTerms(state, competitor) : null;
      if (!competitor || !terms || getCompanyControl(state).percentage < 33.4 || state.cash < terms.cashCost) return state;
      const combinedValue = Math.max(250_000, state.valuation + competitor.fairValue * competitor.sharesOutstanding - terms.cashCost);
      const totalBasis = competitor.ownedShares * competitor.averageCost + terms.totalPrice;
      next = { ...state, cash: state.cash - terms.cashCost, totalShares: state.totalShares + terms.newShares, valuation: combinedValue, sharePrice: combinedValue / (state.totalShares + terms.newShares), competitors: state.competitors.map((candidate) => candidate.id === competitor.id ? { ...candidate, status: "merged", ownedShares: candidate.sharesOutstanding, averageCost: totalBasis / Math.max(1, candidate.sharesOutstanding), acquisitionIntegrated: true } : candidate) };
      if (!competitor.acquisitionIntegrated) next = applyAcquisitionPerk(next, competitor.id);
      next = addNews(next, { id: `merger-${competitor.id}-${state.day}`, day: state.day, title: `Fusion mit ${competitor.name}`, body: `${formatCompactMoney(terms.cashCost)} werden bar bezahlt; neue Aktien finanzieren den Rest.`, category: "finance", tone: "positive" });
      break;
    }
    case "DIVEST_COMPETITOR": {
      const competitor = state.competitors.find((candidate) => candidate.id === action.competitorId);
      if (!competitor || (competitor.status !== "acquired" && competitor.status !== "merged")) return state;
      const quote = getSubsidiaryExitQuote(competitor);
      const basis = competitor.ownedShares * competitor.averageCost;
      next = {
        ...state,
        cash: state.cash + quote.directSaleProceeds,
        competitors: state.competitors.map((candidate) => candidate.id === competitor.id ? {
          ...candidate,
          status: "active",
          price: quote.referencePrice,
          ownedShares: 0,
          averageCost: 0,
          realizedProfit: candidate.realizedProfit + quote.directSaleProceeds - basis,
          lastReason: "Nach dem Verkauf agiert das Unternehmen wieder als unabhängiger Wettbewerber.",
        } : candidate),
      };
      next = addNews(next, { id: `divest-${competitor.id}-${state.day}`, day: state.day, title: `${competitor.name} verkauft`, body: `${formatCompactMoney(quote.directSaleProceeds)} fließen aus dem Unternehmensverkauf in die Kasse.`, category: "finance", tone: "neutral" });
      break;
    }
    case "RELIST_COMPETITOR": {
      const competitor = state.competitors.find((candidate) => candidate.id === action.competitorId);
      if (!competitor || (competitor.status !== "acquired" && competitor.status !== "merged")) return state;
      const quote = getSubsidiaryExitQuote(competitor);
      const soldBasis = quote.ipoSoldShares * competitor.averageCost;
      next = {
        ...state,
        cash: state.cash + quote.ipoProceeds,
        competitors: state.competitors.map((candidate) => candidate.id === competitor.id ? {
          ...candidate,
          status: "active",
          price: quote.ipoPrice,
          ownedShares: quote.ipoRetainedShares,
          averageCost: quote.ipoRetainedShares > 0 ? candidate.averageCost : 0,
          realizedProfit: candidate.realizedProfit + quote.ipoProceeds - soldBasis,
          lastReason: "Der Börsengang schafft einen neuen Streubesitz; die frühere Mutter bleibt beteiligt.",
        } : candidate),
      };
      next = addNews(next, { id: `relist-${competitor.id}-${state.day}`, day: state.day, title: `${competitor.name} kehrt an die Börse zurück`, body: `${formatCompactMoney(quote.ipoProceeds)} Emissionserlös; 30 % bleiben als strategische Beteiligung im Portfolio.`, category: "finance", tone: "positive" });
      break;
    }
    case "ACTIVATE_DEFENSE": {
      return state;
    }
    case "SET_DIFFICULTY": {
      if (state.day > 0 || !DIFFICULTY_SETTINGS[action.difficulty]) return state;
      const previousStart = DIFFICULTY_SETTINGS[state.difficulty].startingCash;
      const nextStart = DIFFICULTY_SETTINGS[action.difficulty].startingCash;
      next = {
        ...state,
        difficulty: action.difficulty,
        cash: Math.max(0, state.cash - previousStart + nextStart),
      };
      break;
    }
    case "DISMISS_ONBOARDING":
      if (state.onboardingDismissed) return state;
      next = { ...state, onboardingDismissed: true };
      break;
    case "LOAD_STATE":
      next = normalizeLoadedState(action.state);
      break;
    case "RESET":
      return { ...createInitialState(0), saveRevision: state.saveRevision + 1 };
    default:
      return state;
  }
  return withRevision(state, next);
}
