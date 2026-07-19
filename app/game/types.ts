export type DepartmentId =
  | "production"
  | "research"
  | "marketing"
  | "sales"
  | "finance";

export type GameSection =
  | "dashboard"
  | "accounting"
  | "builder"
  | "company"
  | "market"
  | "products"
  | "research"
  | "production"
  | "people"
  | "marketing"
  | "finance"
  | "stocks"
  | "deals";

export type ProductCategory =
  | "computer"
  | "phone"
  | "components"
  | "software";

export type PricingStrategy = "value" | "balanced" | "premium";
export type MarketingStrategy = "efficient" | "balanced" | "aggressive";
export type CompetitorStatus = "active" | "acquired" | "merged" | "bankrupt";
export type NewsTone = "positive" | "warning" | "critical" | "neutral";
export type GameSpeed = 0 | 1 | 5 | 10;
export type ActiveGameSpeed = Exclude<GameSpeed, 0>;

export type PcPartCategory =
  | "cpu"
  | "gpu"
  | "memory"
  | "storage"
  | "motherboard"
  | "psu"
  | "cooling"
  | "case";

export type PcResearchAttribute =
  | "cpu.cores"
  | "cpu.clock"
  | "cpu.efficiency"
  | "cpu.architecture"
  | "gpu.compute"
  | "gpu.clock"
  | "gpu.memory"
  | "gpu.efficiency"
  | "memory.capacity"
  | "memory.speed"
  | "storage.capacity"
  | "storage.speed"
  | "storage.reliability"
  | "motherboard.cpuLimit"
  | "motherboard.memoryLimit"
  | "motherboard.memorySpeed"
  | "motherboard.expansion"
  | "psu.wattage"
  | "psu.efficiency"
  | "psu.reliability"
  | "cooling.capacity"
  | "cooling.noise"
  | "case.airflow"
  | "case.gpuLimit"
  | "case.quality";

export type PcAudience = "office" | "gaming" | "creator";
export type PcMarketSegment = "budget" | "mainstream" | "performance";

export type PcResearchLevels = Record<PcResearchAttribute, number>;

/** Concrete levels chosen for one product. Later research does not alter it. */
export type PcConfiguration = PcResearchLevels;

export interface PcResearchTrackDefinition {
  id: PcResearchAttribute;
  category: PcPartCategory;
  name: string;
  description: string;
  baseCost: number;
}

export interface PcResearchProject {
  id: string;
  attribute: PcResearchAttribute;
  targetLevel: number;
  cost: number;
  name: string;
  previousValue: string;
  nextValue: string;
}

export interface PcBuildIssue {
  type: "error" | "warning";
  message: string;
  categories: PcPartCategory[];
}

export interface PcBuildEvaluation {
  valid: boolean;
  issues: PcBuildIssue[];
  buildCost: number;
  developmentCost: number;
  suggestedPrice: number;
  totalPower: number;
  recommendedWattage: number;
  coolingNeed: number;
  coolingCapacity: number;
  performance: number;
  quality: number;
  baseDemand: number;
  tier: number;
  scores: Record<PcAudience, number>;
}

export interface DepartmentDefinition {
  id: DepartmentId;
  name: string;
  shortName: string;
  description: string;
  salaryPerDay: number;
  color: string;
}

export interface TechDefinition {
  id: string;
  name: string;
  category: "hardware" | "software" | "manufacturing" | "network";
  description: string;
  cost: number;
  prerequisites: string[];
  era: number;
  icon:
    | "cpu"
    | "monitor"
    | "bolt"
    | "cloud"
    | "phone"
    | "production"
    | "sparkles";
  effects: string[];
}

export interface ProductBlueprint {
  id: string;
  name: string;
  category: ProductCategory;
  tagline: string;
  description: string;
  era: number;
  requiredTech: string[];
  developmentCost: number;
  basePrice: number;
  unitCost: number;
  baseDemand: number;
  quality: number;
  icon: "computer" | "phone" | "components" | "software";
  accent: string;
}

export interface ProductState {
  id: string;
  blueprintId: string;
  name: string;
  price: number;
  launchedDay: number;
  inventory: number;
  active: boolean;
  qualityBonus: number;
  lastDemand: number;
  lastProduction: number;
  lastSales: number;
  productionTarget: number | null;
  lastLostSales: number;
  configuration?: PcConfiguration;
  audience?: PcAudience;
  marketSegment?: PcMarketSegment;
}

export interface CampaignState {
  id: string;
  name: string;
  daysRemaining: number;
  totalDays: number;
  dailyCost: number;
  demandBoost: number;
  brandBoost: number;
}

export interface StockPricePoint {
  day: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CompetitorState {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  color: string;
  description: string;
  sharesOutstanding: number;
  price: number;
  fairValue: number;
  revenue: number;
  profitMargin: number;
  growth: number;
  innovation: number;
  brand: number;
  debtRatio: number;
  marketShare: number;
  sentiment: number;
  history: number[];
  priceHistory: StockPricePoint[];
  status: CompetitorStatus;
  ownedShares: number;
  averageCost: number;
  realizedProfit: number;
  lastReason: string;
  acquisitionPerk: string;
  financialHealth?: number;
  pcSegment?: PcMarketSegment;
  pcPricePosition?: number;
}

export interface NewsItem {
  id: string;
  day: number;
  title: string;
  body: string;
  category: "company" | "market" | "research" | "product" | "finance";
  tone: NewsTone;
}

export interface HistoryPoint {
  day: number;
  revenue: number;
  expenses: number;
  profit: number;
  valuation: number;
  cash: number;
  debt: number;
  marketShare: number;
  employees: number;
  brand: number;
}

export interface AchievementState {
  id: string;
  unlockedDay: number;
}

export interface GameState {
  version: number;
  companyName: string;
  day: number;
  speed: GameSpeed;
  previousSpeed: ActiveGameSpeed;
  cash: number;
  debt: number;
  lifetimeRevenue: number;
  lifetimeProfit: number;
  brand: number;
  reputation: number;
  marketShare: number;
  researchPoints: number;
  unlockedTech: string[];
  unlockedParts: string[];
  componentResearch: PcResearchLevels;
  currentResearch: string | null;
  autoResearch: boolean;
  employees: Record<DepartmentId, number>;
  departmentLevels: Record<DepartmentId, number>;
  morale: number;
  factoryLevel: number;
  warehouseLevel: number;
  automationLevel: number;
  qualityFocus: number;
  marketingBudget: number;
  marketingStrategy: MarketingStrategy;
  pricingStrategy: PricingStrategy;
  campaign: CampaignState | null;
  products: ProductState[];
  competitors: CompetitorState[];
  founderShares: number;
  totalShares: number;
  sharePrice: number;
  valuation: number;
  takeoverRisk: number;
  takeoverDefenseDays: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  lastMonthRevenue: number;
  lastMonthExpenses: number;
  lastDayRevenue: number;
  lastDayExpenses: number;
  history: HistoryPoint[];
  news: NewsItem[];
  achievements: AchievementState[];
  selectedSection: GameSection;
  saveRevision: number;
  lastSavedAt: number;
  lastTickAt: number;
  onboardingDismissed: boolean;
}

export interface SimulationSummary {
  days: number;
  revenue: number;
  expenses: number;
  profit: number;
  researchPoints: number;
  completedResearch: string[];
}

export type GameAction =
  | { type: "TICK"; days: number; now: number }
  | { type: "SET_SPEED"; speed: GameSpeed }
  | { type: "TOGGLE_PAUSE" }
  | { type: "SET_SECTION"; section: GameSection }
  | { type: "HIRE"; department: DepartmentId; amount?: number }
  | { type: "FIRE"; department: DepartmentId; amount?: number }
  | { type: "UPGRADE_DEPARTMENT"; department: DepartmentId }
  | { type: "START_RESEARCH"; techId: string }
  | { type: "START_COMPONENT_RESEARCH"; attribute: PcResearchAttribute }
  | { type: "SET_AUTO_RESEARCH"; enabled: boolean }
  | { type: "CANCEL_RESEARCH" }
  | { type: "LAUNCH_PRODUCT"; blueprintId: string }
  | {
      type: "LAUNCH_CUSTOM_PC";
      name: string;
      price: number;
      configuration: PcConfiguration;
      marketSegment?: PcMarketSegment;
    }
  | { type: "RETIRE_PRODUCT"; productId: string }
  | { type: "SET_PRODUCT_PRICE"; productId: string; price: number }
  | { type: "UPGRADE_PRODUCT"; productId: string }
  | { type: "SET_PRODUCTION_TARGET"; productId: string; target: number | null }
  | { type: "UPGRADE_FACTORY" }
  | { type: "UPGRADE_WAREHOUSE" }
  | { type: "UPGRADE_AUTOMATION" }
  | { type: "SET_QUALITY_FOCUS"; value: number }
  | { type: "SET_MARKETING_BUDGET"; value: number }
  | { type: "SET_MARKETING_STRATEGY"; strategy: MarketingStrategy }
  | { type: "START_CAMPAIGN"; campaignId: string }
  | { type: "BORROW"; amount: number }
  | { type: "REPAY"; amount: number }
  | { type: "ISSUE_SHARES"; percent: number }
  | { type: "BUYBACK_SHARES"; percent: number }
  | { type: "BUY_STOCK"; competitorId: string; shares: number }
  | { type: "SELL_STOCK"; competitorId: string; shares: number }
  | { type: "ACQUIRE_COMPETITOR"; competitorId: string }
  | { type: "MERGE_COMPETITOR"; competitorId: string }
  | { type: "ACTIVATE_DEFENSE" }
  | { type: "DISMISS_ONBOARDING" }
  | { type: "LOAD_STATE"; state: GameState }
  | { type: "RESET" };
