import assert from "node:assert/strict";
import { test } from "node:test";

import { DEPARTMENTS, GAME_VERSION, createInitialState } from "./data";
import {
  LOAN_TERM_DAYS,
  calculatePlayerFairValue,
  compactCompanyHistory,
  gameReducer,
  getAcquisitionPrice,
  getAdjustedDailySalary,
  getAutomationRequirement,
  getAutomaticResearchChoice,
  getBuybackQuote,
  getCompanyControl,
  getCompetitorProductOffers,
  getContractDailyTarget,
  getDailyPcMarketSize,
  getDailySalesCapacity,
  getEnterpriseContractOffers,
  getEnterpriseContractCapacity,
  getEstimatedMonthlyPortfolioIncome,
  getFactoryCapacity,
  getHireCost,
  getMonthlyFinancialProjection,
  getGovernanceEfficiency,
  getPortfolioValue,
  getPortfolioRealizedProfit,
  getProductEconomics,
  getProductWarrantyRate,
  getResearchRate,
  getStockTradeQuote,
  getStrategicStakeLevel,
  getSubsidiaryExitQuote,
  getWorkforcePlan,
  getWarehouseCapacity,
  simulateDays,
} from "./engine";
import {
  PC_PART_CATEGORIES,
  PC_RESEARCH_ATTRIBUTE_IDS,
  createBestCompatibleConfiguration,
  createStarterConfiguration,
  evaluatePcBuild,
  formatPcAttributeValue,
  getComponentResearchProject,
  getPcAttributeValue,
  getResearchTracksByCategory,
  isConfigurationWithinResearch,
} from "./pc-system";
import {
  BASE_GAME_DAY_MS,
  getOfflineSimulationDays,
  getSimulationPulse,
} from "./time";
import { mergeLoadedState, serializeState } from "./use-game";
import type { GameState, PcPartCategory } from "./types";

function starterProduct(state: GameState) {
  const product = state.products.find((candidate) => candidate.id === "product-circuit-one");
  assert.ok(product, "Der Starter-PC muss im Spielstand vorhanden sein.");
  return product;
}

function assertClose(actual: number, expected: number, tolerance = 1e-8) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Erwartet ${expected}, erhalten ${actual}`,
  );
}

test("Kredite werden täglich getilgt und können sofort abgelöst werden", () => {
  const initial = createInitialState(1_000);
  const amount = 10_000;
  const borrowed = gameReducer(initial, { type: "BORROW", amount });

  assert.equal(borrowed.debt, amount);
  assertClose(borrowed.dailyDebtRepayment, amount / LOAN_TERM_DAYS);

  const afterOneDay = simulateDays(borrowed, 1).state;
  assertClose(afterOneDay.debt, amount - amount / LOAN_TERM_DAYS);

  const repaid = gameReducer(afterOneDay, {
    type: "REPAY",
    amount: afterOneDay.debt,
  });
  assert.equal(repaid.debt, 0);
  assert.equal(repaid.dailyDebtRepayment, 0);
});

test("ein manuelles Produktionsziel steuert die Tagesproduktion", () => {
  const initial = createInitialState(1_000);
  const configured = gameReducer(initial, {
    type: "SET_PRODUCTION_TARGET",
    productId: "product-circuit-one",
    target: 3,
  });
  const withoutStock = {
    ...configured,
    products: configured.products.map((product) => ({ ...product, inventory: 0 })),
  };

  const result = simulateDays(withoutStock, 1).state;
  const product = starterProduct(result);

  assert.equal(product.productionTarget, 3);
  assert.equal(product.lastProduction, 3);
});

test("automatische Forschung startet und setzt nach Abschluss fort", () => {
  const initial = createInitialState(1_000);
  const suggestion = getAutomaticResearchChoice(initial);
  const automated = gameReducer(initial, {
    type: "SET_AUTO_RESEARCH",
    enabled: true,
  });

  assert.equal(automated.autoResearch, true);
  assert.equal(automated.currentResearch, suggestion.id);

  const funded = { ...automated, researchPoints: suggestion.cost };
  const afterCompletion = simulateDays(funded, 1).state;
  assert.equal(
    afterCompletion.componentResearch[suggestion.attribute],
    suggestion.targetLevel,
  );
  assert.equal(afterCompletion.autoResearch, true);
  assert.ok(afterCompletion.currentResearch);
  assert.notEqual(afterCompletion.currentResearch, suggestion.id);
});

test("mehr Forschende liefern deutlich mehr FP mit abnehmendem Koordinationsnutzen", () => {
  const initial = createInitialState(1_000);
  const smallTeam = {
    ...initial,
    employees: { ...initial.employees, research: 10 },
  };
  const smallProject = gameReducer(smallTeam, {
    type: "START_COMPONENT_RESEARCH",
    attribute: "cpu.clock",
  });
  const largeProject = {
    ...smallProject,
    employees: { ...smallProject.employees, research: 100_000 },
    departmentLevels: { ...smallProject.departmentLevels, research: 8 },
  };
  const project = getComponentResearchProject(smallProject.currentResearch);
  assert.ok(project);
  const smallRate = getResearchRate(smallProject);
  const largeRate = getResearchRate(largeProject);
  assert.ok(largeRate > smallRate * 4);
  assert.ok(project.cost / smallRate > 60);
  assert.ok(project.cost / largeRate >= 10);
  assert.ok(project.cost / largeRate < 30);
});

test("ein Produktionsstopp erzeugt bei Nachfrage verlorene Verkäufe", () => {
  const initial = createInitialState(1_000);
  const configured = gameReducer(initial, {
    type: "SET_PRODUCTION_TARGET",
    productId: "product-circuit-one",
    target: 0,
  });
  const withoutStock = {
    ...configured,
    products: configured.products.map((product) => ({ ...product, inventory: 0 })),
  };

  const product = starterProduct(simulateDays(withoutStock, 1).state);

  assert.equal(product.lastProduction, 0);
  assert.equal(product.lastSales, 0);
  assert.ok(product.lastDemand > 0);
  assertClose(product.lastLostSales, product.lastDemand - product.lastSales);
});

test("automatische Verkaeufe umgehen das Lagerlimit, der Endbestand aber nicht", () => {
  const initial = createInitialState(1_000);
  const warehouseCapacity = getWarehouseCapacity(initial);
  const nearlyFullWarehouse: GameState = {
    ...initial,
    employees: { ...initial.employees, production: 100 },
    products: initial.products.map((product) => ({
      ...product,
      salesChannel: "retail",
      inventory: warehouseCapacity - 1,
      productionTarget: 100,
    })),
  };

  const product = starterProduct(simulateDays(nearlyFullWarehouse, 1).state);

  assert.ok(product.lastProduction > 1);
  assert.ok(product.lastSales > 0);
  assert.ok(product.inventory <= warehouseCapacity);
});

test("ein Lager mit 120 Plaetzen deckelt den Tagesabsatz nicht auf 120", () => {
  const initial = createInitialState(1_000);
  const scaled: GameState = {
    ...initial,
    cash: 1_000_000_000,
    brand: 100,
    marketingBudget: 250_000,
    factoryLevel: 8,
    automationLevel: 6,
    employees: {
      ...initial.employees,
      production: 2_000,
      sales: 1_000,
      marketing: 500,
    },
    departmentLevels: {
      ...initial.departmentLevels,
      production: 8,
      sales: 8,
      marketing: 8,
    },
    competitors: initial.competitors.map((competitor) => competitor.pcSegment
      ? { ...competitor, status: "bankrupt" as const }
      : competitor),
    products: initial.products.map((product) => ({
      ...product,
      inventory: 0,
      productionTarget: null,
    })),
  };
  const product = starterProduct(simulateDays(scaled, 1).state);
  assert.ok(product.lastSales > 120, `Absatz: ${product.lastSales}`);
  assert.ok(product.inventory <= getWarehouseCapacity(scaled));
});

test("Marketing-Mitarbeiter steigern die Nachfrage bei aktivem Budget", () => {
  const initial = createInitialState(1_000);
  const withoutMarketing: GameState = {
    ...initial,
    marketingBudget: 10_000,
    employees: { ...initial.employees, marketing: 0 },
  };
  const staffedMarketing: GameState = {
    ...withoutMarketing,
    employees: { ...withoutMarketing.employees, marketing: 20 },
  };

  const lowDemand = getProductEconomics(withoutMarketing, "product-circuit-one")?.demand;
  const highDemand = getProductEconomics(staffedMarketing, "product-circuit-one")?.demand;

  assert.ok(lowDemand !== undefined);
  assert.ok(highDemand !== undefined);
  assert.ok(highDemand > lowDemand);
});

test("der gemeinsame PC-Markt startet mit wenigen Verkaeufen und skaliert mit dem Unternehmen", () => {
  const initial = createInitialState(1_000);
  const startupDemand = getProductEconomics(initial, "product-circuit-one")?.demand ?? 0;
  const corporation: GameState = {
    ...initial,
    valuation: 1_000_000_000,
    brand: 72,
    marketShare: 5,
    marketingBudget: 100_000,
    employees: { production: 1_500, research: 700, marketing: 300, sales: 600, finance: 250 },
    departmentLevels: { production: 5, research: 5, marketing: 5, sales: 5, finance: 5 },
  };
  const corporationDemand = getProductEconomics(corporation, "product-circuit-one")?.demand ?? 0;

  assert.ok(startupDemand > 0 && startupDemand < 20, `Startup-Nachfrage: ${startupDemand}`);
  assert.ok(corporationDemand > startupDemand * 10, `Konzern-Nachfrage: ${corporationDemand}`);
  assert.ok(getDailyPcMarketSize(initial) > corporationDemand);
});

test("Milliardenunternehmen benoetigen realistisch mehrere tausend Mitarbeitende", () => {
  const initial = createInitialState(1_000);
  const understaffed: GameState = {
    ...initial,
    valuation: 1_000_000_000,
    employees: {
      production: 450,
      research: 220,
      marketing: 80,
      sales: 180,
      finance: 70,
    },
  };
  const plan = getWorkforcePlan(understaffed);
  assert.ok(plan.recommendedTotal > 3_000);
  assert.ok(plan.gap > 2_000);
  assert.ok(plan.readiness < 0.8);
});

test("große Einstellungswellen stellen die eingegebene Anzahl auf einmal ein", () => {
  const initial = { ...createInitialState(1_000), cash: 1_000_000_000 };
  const amount = 10_000;
  const cost = getHireCost("production", amount);
  const result = gameReducer(initial, {
    type: "HIRE",
    department: "production",
    amount,
  });
  assert.equal(
    result.employees.production,
    initial.employees.production + amount,
  );
  assertClose(result.cash, initial.cash - cost);
  assert.ok(cost > DEPARTMENTS.production.salaryPerDay * 14 * amount);
  assert.ok(
    getAdjustedDailySalary(360, "production") >
      getAdjustedDailySalary(0, "production") * 1.02,
  );
});

test("Marketing und Betriebsausbau haben keine kuenstlichen Obergrenzen", () => {
  const initial = {
    ...createInitialState(1_000),
    cash: 1_000_000_000,
    factoryLevel: 8,
    warehouseLevel: 8,
    automationLevel: 6,
    departmentLevels: {
      ...createInitialState(1_000).departmentLevels,
      production: 8,
    },
    unlockedTech: [
      ...createInitialState(1_000).unlockedTech,
      "robotic-assembly",
      "lean-fabs",
      "nanometer-chips",
    ],
  };
  const factory = gameReducer(initial, { type: "UPGRADE_FACTORY" });
  const warehouse = gameReducer(factory, { type: "UPGRADE_WAREHOUSE" });
  const automation = gameReducer(warehouse, { type: "UPGRADE_AUTOMATION" });
  const department = gameReducer(automation, {
    type: "UPGRADE_DEPARTMENT",
    department: "production",
  });
  const marketing = gameReducer(department, {
    type: "SET_MARKETING_BUDGET",
    value: 2_000_000,
  });

  assert.equal(marketing.factoryLevel, 9);
  assert.equal(marketing.warehouseLevel, 9);
  assert.equal(marketing.automationLevel, 7);
  assert.equal(marketing.departmentLevels.production, 9);
  assert.equal(marketing.marketingBudget, 2_000_000);
});

test("identische Modelle teilen nur denselben Absatz statt neue Nachfrage zu erzeugen", () => {
  const initial = createInitialState(1_000);
  const original = starterProduct(initial);
  const originalDemand = getProductEconomics(initial, original)?.demand ?? 0;
  const duplicated: GameState = {
    ...initial,
    products: [original, { ...original, id: "duplicate", name: "Duplicate" }],
  };
  const combinedDemand = duplicated.products.reduce(
    (sum, product) => sum + (getProductEconomics(duplicated, product)?.demand ?? 0),
    0,
  );
  assertClose(combinedDemand, originalDemand, 1e-6);

  const rejected = gameReducer(
    { ...initial, cash: 10_000_000 },
    {
      type: "LAUNCH_CUSTOM_PC",
      name: "Noch einmal",
      price: original.price,
      configuration: original.configuration!,
    },
  );
  assert.equal(rejected.products.length, initial.products.length);
});

test("alte Technik wird billiger und verliert bei altem Preis fast ihre gesamte Nachfrage", () => {
  const initial = createInitialState(1_000);
  const fresh = getProductEconomics(initial, "product-circuit-one");
  const aged: GameState = { ...initial, day: 14_400 };
  const old = getProductEconomics(aged, "product-circuit-one");
  assert.ok(fresh && old);
  assert.ok(old.unitCost < fresh.unitCost * 0.4);
  assert.ok(old.modernity < 0.1);
  assert.ok(old.demand < fresh.demand * 0.02);
  assert.ok(old.fairPrice < fresh.fairPrice * 0.4);
});

test("Veraltung entsteht nur durch bessere Konkurrenzangebote", () => {
  const initial = createInitialState(1_000);
  const futureWithoutPcRivals: GameState = {
    ...initial,
    day: 7_200,
    competitors: initial.competitors.map((competitor) => competitor.pcSegment
      ? { ...competitor, status: "bankrupt" as const }
      : competitor),
  };
  const economics = getProductEconomics(futureWithoutPcRivals, "product-circuit-one");
  assert.ok(economics);
  assert.equal(economics.relativePerformance, 0);
  assert.equal(economics.modernity, 1);
});

test("Technikfuehrung gewinnt Nachfrage, ein zu hoher Preis verspielt sie wieder", () => {
  const initial = createInitialState(1_000);
  const starter = starterProduct(initial);
  const research = { ...initial.componentResearch };
  for (const attribute of PC_RESEARCH_ATTRIBUTE_IDS) research[attribute] = 4;
  const advancedConfiguration = createBestCompatibleConfiguration(research);
  const common = {
    ...initial,
    day: 600,
    products: [{ ...starter, marketSegment: "mainstream" as const, launchedDay: 600 }],
  };
  const weakDemand = getProductEconomics(common, common.products[0])?.demand ?? 0;
  const strongProduct = { ...common.products[0], configuration: advancedConfiguration };
  const strong = { ...common, products: [strongProduct] };
  const strongEconomics = getProductEconomics(strong, strongProduct);
  assert.ok(strongEconomics);
  assert.ok(strongEconomics.demand > weakDemand * 2);
  assert.ok(strongEconomics.relativePerformance > 0);

  const overpricedProduct = { ...strongProduct, price: strongProduct.price * 5 };
  const overpriced = { ...strong, products: [overpricedProduct] };
  const overpricedDemand = getProductEconomics(overpriced, overpricedProduct)?.demand ?? 0;
  assert.ok(overpricedDemand < strongEconomics.demand * 0.1);
});

test("der PC-Markt waechst spaeter auf Millionen Geraete pro Tag", () => {
  const initial = createInitialState(1_000);
  assert.ok(getDailyPcMarketSize(initial) < 25_000);
  assert.ok(getDailyPcMarketSize({ ...initial, day: 1_800 }) < 150_000);
  assert.ok(getDailyPcMarketSize({ ...initial, day: 4_800 }) > 1_000_000);
  assert.ok(initial.competitors.length >= 24);
});

test("mehr Personal ersetzt keinen fehlenden Fabrikausbau", () => {
  const initial = createInitialState(1_000);
  const staffed: GameState = {
    ...initial,
    employees: { ...initial.employees, production: 1_000_000 },
  };
  const expanded: GameState = {
    ...staffed,
    factoryLevel: 8,
    automationLevel: 6,
    departmentLevels: { ...staffed.departmentLevels, production: 8 },
  };

  assert.ok(getFactoryCapacity(staffed) <= getFactoryCapacity(initial) * 3);
  assert.ok(getFactoryCapacity(expanded) > getFactoryCapacity(staffed) * 1_000);
});

test("Marketing skaliert mit dem Markt und hat abnehmenden Grenznutzen", () => {
  const initial = createInitialState(1_000);
  const company: GameState = {
    ...initial,
    day: 3_600,
    brand: 70,
    marketShare: 12,
    employees: { production: 5_000, research: 2_000, marketing: 1_000, sales: 2_000, finance: 500 },
    departmentLevels: { production: 7, research: 7, marketing: 7, sales: 7, finance: 7 },
  };
  const moderate = { ...company, marketingBudget: 1_000_000 };
  const extreme = { ...company, marketingBudget: 100_000_000 };
  const moderateDemand = getProductEconomics(moderate, "product-circuit-one")?.demand ?? 0;
  const extremeDemand = getProductEconomics(extreme, "product-circuit-one")?.demand ?? 0;

  assert.ok(extremeDemand > moderateDemand);
  assert.ok(extremeDemand < moderateDemand * 2.5);
});

test("ein unveraendertes Startunternehmen wird nicht automatisch zum Milliardenkonzern", () => {
  const initial = createInitialState(1_000);
  const result = simulateDays(initial, 600).state;
  assert.ok(result.valuation < 10_000_000);
  assert.ok(result.valuation < initial.valuation * 3);
});

test("der Unternehmenswert folgt Milliarden-Gewinnen ohne kuenstliche Wachstumsbremse", () => {
  const initial = createInitialState(1_000);
  const profitable = {
    ...initial,
    day: 3_710,
    cash: 1_000_000_000,
    valuation: 50_000_000,
    sharePrice: 50,
    brand: 50,
    marketShare: 10,
    lastMonthRevenue: 10_000_000_000,
    lastMonthExpenses: 8_000_000_000,
    monthlyRevenue: 10_000_000_000 * (20 / 30),
    monthlyExpenses: 8_000_000_000 * (20 / 30),
  };

  const loaded = gameReducer(profitable, { type: "LOAD_STATE", state: profitable });

  assert.ok(loaded.valuation > 50_000_000_000);
  assertClose(loaded.valuation, calculatePlayerFairValue(loaded), 0.01);
  assertClose(loaded.sharePrice, loaded.valuation / loaded.totalShares, 0.01);
});

test("Unternehmensgrafiken behalten die Gruendung und verdichten nur alte Jahre", () => {
  const initial = createInitialState(1_000);
  const monthly = Array.from({ length: 120 }, (_, index) => ({
    ...initial.history[0],
    day: (index + 1) * 30,
    revenue: index + 1,
    expenses: (index + 1) / 2,
    profit: (index + 1) / 2,
    valuation: initial.valuation + index * 10_000,
  }));
  const compact = compactCompanyHistory([initial.history[0], ...monthly]);
  assert.equal(compact[0].day, 0);
  assert.equal(compact.at(-1)?.day, 3_600);
  assert.ok(compact.length <= 35);
  assertClose(
    compact.reduce((sum, point) => sum + point.revenue, 0),
    monthly.reduce((sum, point) => sum + point.revenue, 0),
  );
});

test("bei einer Insolvenz wird eine gehaltene Aktienposition wertlos", () => {
  const initial = createInitialState(1_000);
  const target = initial.competitors.find((competitor) => competitor.id === "ember");
  assert.ok(target);
  const distressed = {
    ...initial,
    competitors: initial.competitors.map((competitor) => competitor.id === target.id
      ? {
          ...competitor,
          ownedShares: 10_000,
          averageCost: competitor.price,
          financialHealth: 0.001,
          profitMargin: -0.5,
          growth: -0.5,
          debtRatio: 1,
        }
      : competitor),
  };
  assert.ok(getPortfolioValue(distressed) > 0);
  const result = simulateDays(distressed, 1).state;
  const bankrupt = result.competitors.find((competitor) => competitor.id === target.id);
  assert.equal(bankrupt?.status, "bankrupt");
  assert.equal(bankrupt?.price, 0);
  assert.equal(getPortfolioValue(result), 0);
  assert.ok(result.news.some((item) => item.id.startsWith("bankruptcy-ember")));
});

test("Aktienrueckkauf-Quote und Reducer erhoehen Anteil und Wert des Gruenderpakets", () => {
  const initial = createInitialState(1_000);
  const quote = getBuybackQuote(initial, 0.02);
  const controlBefore = getCompanyControl(initial).percentage;

  assert.ok(quote.shares > 0);
  assert.ok(quote.cost < initial.cash);
  assert.ok(quote.estimatedSharePrice > initial.sharePrice);
  assert.ok(quote.founderStakeValueAfter > quote.founderStakeValueBefore);
  assert.ok(quote.postTransactionOwnership > controlBefore);

  const result = gameReducer(initial, { type: "BUYBACK_SHARES", percent: 0.02 });

  assert.equal(result.totalShares, initial.totalShares - quote.shares);
  assert.equal(result.founderShares, initial.founderShares);
  assertClose(result.cash, initial.cash - quote.cost);
  assertClose(result.sharePrice, quote.estimatedSharePrice);
  assertClose(result.valuation, quote.estimatedSharePrice * result.totalShares);
  assertClose(getCompanyControl(result).percentage, quote.postTransactionOwnership);
  assert.equal(result.takeoverRisk, 0);
});

test("der Uebernahmepreis zieht bereits gehaltene Aktien ab", () => {
  const initial = createInitialState(1_000);
  const competitor = initial.competitors.find((candidate) => candidate.id === "microfab");
  assert.ok(competitor);
  const ownedShares = 125_000;
  const withPosition = { ...competitor, ownedShares };

  assertClose(
    getAcquisitionPrice(withPosition),
    (competitor.sharesOutstanding - ownedShares) * competitor.price * 1.28,
  );
  assertClose(
    getAcquisitionPrice(competitor) - getAcquisitionPrice(withPosition),
    ownedShares * competitor.price * 1.28,
  );
});

test("Aktienorders fuehren Einstandskurs und realisierten Gewinn", () => {
  const initial = { ...createInitialState(1_000), cash: 10_000_000 };
  const competitor = initial.competitors[0];
  const buyQuote = getStockTradeQuote(competitor, 10_000, "buy");
  const bought = gameReducer(initial, {
    type: "BUY_STOCK",
    competitorId: competitor.id,
    shares: 10_000,
  });
  const position = bought.competitors[0];
  assert.equal(position.ownedShares, 10_000);
  assertClose(position.averageCost, buyQuote.total / 10_000);
  assert.ok(position.price > competitor.price);
  assert.ok(position.priceHistory.at(-1)!.high > competitor.price);

  const sold = gameReducer(bought, {
    type: "SELL_STOCK",
    competitorId: competitor.id,
    shares: position.ownedShares,
  });
  assert.equal(sold.competitors[0].ownedShares, 0);
  assert.equal(sold.competitors[0].averageCost, 0);
  assert.ok(getPortfolioRealizedProfit(sold) < 0);
});

test("Aktienkurse folgen Fundamentaldaten mit realistischen Handelsspannen", () => {
  const result = simulateDays(createInitialState(1_000), 100).state;
  const competitor = result.competitors[0];
  assert.equal(competitor.priceHistory.length, 90);
  for (const point of competitor.priceHistory) {
    assert.ok(point.high >= Math.max(point.open, point.close));
    assert.ok(point.low <= Math.min(point.open, point.close));
    assert.ok(point.low > 0);
  }
  assert.ok(competitor.priceHistory.some((point) => point.high > Math.max(point.open, point.close)));
  assert.ok(competitor.priceHistory.some((point) => point.low < Math.min(point.open, point.close)));
  assert.notEqual(
    competitor.priceHistory.at(-1)?.close,
    competitor.priceHistory.at(-2)?.close,
  );
});

test("profitable Aktien zahlen monatliche Dividenden", () => {
  const initial = createInitialState(1_000);
  const target = initial.competitors.find((competitor) => competitor.profitMargin > 0.1);
  assert.ok(target);
  const invested: GameState = {
    ...initial,
    day: 29,
    competitors: initial.competitors.map((competitor) => competitor.id === target.id
      ? { ...competitor, ownedShares: Math.floor(competitor.sharesOutstanding * 0.1), averageCost: competitor.price }
      : competitor),
  };
  const expectedIncome = getEstimatedMonthlyPortfolioIncome(invested);
  const result = simulateDays(invested, 1).state;

  assert.ok(expectedIncome > 0);
  assert.ok(result.lastMonthInvestmentIncome > 0);
  assert.ok(result.cash > invested.cash + result.lastDayRevenue - result.lastDayExpenses);
});

test("Verwaesserung senkt die operative Kontrolle, Rueckkaeufe stellen sie wieder her", () => {
  const initial = { ...createInitialState(1_000), cash: 100_000_000 };
  const issued = gameReducer(initial, { type: "ISSUE_SHARES", percent: 0.5 });
  const issuedAgain = gameReducer(issued, { type: "ISSUE_SHARES", percent: 0.5 });
  const efficiencyAfterIssue = getGovernanceEfficiency(issuedAgain);
  const boughtBack = gameReducer(issuedAgain, { type: "BUYBACK_SHARES", percent: 0.5 });

  assert.ok(efficiencyAfterIssue < getGovernanceEfficiency(initial));
  assert.ok(getGovernanceEfficiency(boughtBack) > efficiencyAfterIssue);
});

test("fundamentale Produktzyklen erzeugen Auf- und Abwaertsphasen", () => {
  const result = simulateDays(createInitialState(1_000), 720).state;
  const companiesWithBothDirections = result.competitors.filter((competitor) => {
    let risingDays = 0;
    let fallingDays = 0;
    for (let index = 1; index < competitor.priceHistory.length; index += 1) {
      const movement = competitor.priceHistory[index].close - competitor.priceHistory[index - 1].close;
      if (movement > 0) risingDays += 1;
      if (movement < 0) fallingDays += 1;
    }
    return risingDays > 0 && fallingDays > 0;
  });
  assert.ok(companiesWithBothDirections.length >= result.competitors.length / 2);
});

test("Starke Geschaeftszahlen schlagen schwache Geschaeftszahlen am Aktienmarkt", () => {
  const initial = createInitialState(1_000);
  const base = initial.competitors[0];
  const strong = {
    ...base,
    id: "fundamental-strong",
    price: 0.5,
    fairValue: 1,
    growth: 0.22,
    profitMargin: 0.2,
    innovation: 92,
    brand: 85,
    debtRatio: 0.08,
    financialHealth: 95,
    priceHistory: [],
  };
  const weak = {
    ...base,
    id: "fundamental-weak",
    price: 0.5,
    fairValue: 0.2,
    growth: -0.1,
    profitMargin: -0.08,
    innovation: 18,
    brand: 25,
    debtRatio: 0.82,
    financialHealth: 55,
    priceHistory: [],
  };
  const result = simulateDays({ ...initial, competitors: [strong, weak] }, 60).state;

  assert.ok(result.competitors[0].revenue > strong.revenue);
  assert.ok(result.competitors[0].price > strong.price);
  assert.ok(result.competitors[1].revenue < weak.revenue);
  assert.ok(result.competitors[1].price < weak.price);
  assert.ok(result.competitors[0].price > result.competitors[1].price);
});

test("Migration ergaenzt neue Wettbewerber und behaelt bestehende Positionen", () => {
  const initial = createInitialState(1_000);
  const legacyCompetitor = initial.competitors.find((candidate) => candidate.id === "monolith");
  assert.ok(legacyCompetitor);
  const legacyState: GameState = {
    ...initial,
    competitors: [{ ...legacyCompetitor, ownedShares: 321, price: 44.25 }],
  };

  const migrated = mergeLoadedState(legacyState);
  assert.ok(migrated);

  const migratedIds = new Set(migrated.competitors.map((competitor) => competitor.id));
  const expectedNewIds = [
    "microfab",
    "coolwave",
    "datavault",
    "northbridge",
    "orbitnet",
    "luminagraphics",
    "helixrobotics",
  ];
  for (const id of expectedNewIds) assert.ok(migratedIds.has(id), `${id} fehlt nach der Migration.`);
  assert.deepEqual(
    migrated.competitors.map((competitor) => competitor.id),
    initial.competitors.map((competitor) => competitor.id),
  );

  const migratedLegacy = migrated.competitors.find((competitor) => competitor.id === "monolith");
  assert.equal(migratedLegacy?.ownedShares, 321);
  assert.equal(migratedLegacy?.price, 44.25);
});

test("alte Produktstatistiken und eigenes Uebernahmerisiko werden beim Laden entfernt", () => {
  const initial = createInitialState(1_000);
  const legacySave = {
    ...initial,
    version: 8,
    monthlyPlan: { revenue: 1, profit: 2, production: 3, research: 4 },
    autoStaffing: true,
    staffingTargets: initial.employees,
    investorConfidence: 99,
    capitalGuidance: "ambitious",
    dividendPolicy: "generous",
    loanRateAdjustment: 0.02,
    takeoverRisk: 87,
    takeoverDefenseDays: 120,
    products: initial.products.map((product) => ({
      ...product,
      salesChannel: "retail",
      unitsSold: 123_456,
      lifetimeRevenue: 987_654_321,
    })),
  };
  const migrated = mergeLoadedState(legacySave);
  assert.ok(migrated);
  assert.equal(migrated.takeoverRisk, 0);
  assert.equal(migrated.takeoverDefenseDays, 0);
  assert.equal("unitsSold" in migrated.products[0], false);
  assert.equal("lifetimeRevenue" in migrated.products[0], false);
  assert.equal("salesChannel" in migrated.products[0], false);
  assert.equal("monthlyPlan" in migrated, false);
  assert.equal("autoStaffing" in migrated, false);
  assert.equal("staffingTargets" in migrated, false);
  assert.equal("investorConfidence" in migrated, false);
  assert.equal("capitalGuidance" in migrated, false);
  assert.equal("dividendPolicy" in migrated, false);
  assert.equal("loanRateAdjustment" in migrated, false);
});

test("Attributforschung kann ohne Stufenlimit ueber Stufe 4 hinaus fortgesetzt werden", () => {
  const initial = createInitialState(1_000);
  let state: GameState = {
    ...initial,
    researchPoints: 1_000_000_000,
    componentResearch: {
      ...initial.componentResearch,
      "cpu.clock": 4,
    },
  };

  for (let expectedLevel = 5; expectedLevel <= 12; expectedLevel += 1) {
    state = gameReducer(state, {
      type: "START_COMPONENT_RESEARCH",
      attribute: "cpu.clock",
    });
    const project = getComponentResearchProject(state.currentResearch);
    assert.ok(project);
    state = simulateDays({ ...state, researchPoints: project.cost }, 1).state;

    assert.equal(state.componentResearch["cpu.clock"], expectedLevel);
    assert.equal(state.currentResearch, null);
  }
});

test("Zeitskala nutzt Pause und einen Basistag pro Sekunde", () => {
  assert.equal(BASE_GAME_DAY_MS, 1_000);
  assert.equal(getSimulationPulse(0), null);
  assert.deepEqual(getSimulationPulse(1), { intervalMs: 1_000, days: 1 });
  assert.deepEqual(getSimulationPulse(5), { intervalMs: 1_000, days: 5 });
  assert.deepEqual(getSimulationPulse(10), { intervalMs: 1_000, days: 10 });
  assert.equal(getOfflineSimulationDays(999), 0);
  assert.equal(getOfflineSimulationDays(1_000), 1);
  assert.equal(getOfflineSimulationDays(5_000), 5);
  assert.equal(getOfflineSimulationDays(1_000 * 500), 360);
});

test("Pause merkt sich die neue Simulationsgeschwindigkeit", () => {
  const initial = createInitialState(1_000);
  assert.equal(initial.speed, 1);
  assert.equal(initial.previousSpeed, 1);
  const fast = gameReducer(initial, { type: "SET_SPEED", speed: 10 });
  const paused = gameReducer(fast, { type: "SET_SPEED", speed: 0 });
  const ticked = gameReducer(paused, { type: "TICK", days: 10, now: 2_000 });
  const resumed = gameReducer(ticked, { type: "TOGGLE_PAUSE" });

  assert.equal(fast.speed, 10);
  assert.equal(fast.previousSpeed, 10);
  assert.equal(paused.speed, 0);
  assert.equal(paused.previousSpeed, 10);
  assert.equal(ticked.day, initial.day);
  assert.equal(resumed.speed, 10);
});

test("jede fruehe Attributstufe verbessert auch den sichtbaren Wert", () => {
  assert.ok(getPcAttributeValue("cpu.cores", 3) > getPcAttributeValue("cpu.cores", 2));
  assert.notEqual(
    formatPcAttributeValue("storage.reliability", 17),
    formatPcAttributeValue("storage.reliability", 18),
  );
});

test("PC-Attribute sind unabhaengig waehlbar und veroeffentlichte Konfigurationen bleiben unveraendert", () => {
  const initial = createInitialState(1_000);
  const configuration = {
    ...createStarterConfiguration(),
    "cpu.cores": 2,
    "cpu.clock": 3,
    "memory.capacity": 3,
    "memory.speed": 4,
    "motherboard.cpuLimit": 2,
    "motherboard.memoryLimit": 3,
    "motherboard.memorySpeed": 4,
  };
  const build = evaluatePcBuild(configuration, "office");
  assert.equal(build.valid, true, build.issues.map((issue) => issue.message).join("\n"));

  const launchReady: GameState = {
    ...initial,
    cash: 10_000_000,
    componentResearch: { ...configuration },
  };
  const launched = gameReducer(launchReady, {
    type: "LAUNCH_CUSTOM_PC",
    name: "Modular One",
    price: build.suggestedPrice,
    configuration,
  });
  const published = launched.products.find((product) => product.name === "Modular One");
  assert.ok(published?.configuration);
  assert.deepEqual(
    [
      published.configuration["cpu.cores"],
      published.configuration["cpu.clock"],
      published.configuration["memory.capacity"],
      published.configuration["memory.speed"],
    ],
    [2, 3, 3, 4],
  );
  const publishedSnapshot = { ...published.configuration };

  let researched: GameState = {
    ...launched,
    researchPoints: 1_000_000,
  };
  researched = gameReducer(researched, {
    type: "START_COMPONENT_RESEARCH",
    attribute: "cpu.cores",
  });
  let project = getComponentResearchProject(researched.currentResearch);
  assert.ok(project);
  researched = simulateDays({ ...researched, researchPoints: project.cost }, 1).state;
  researched = gameReducer(researched, {
    type: "START_COMPONENT_RESEARCH",
    attribute: "memory.speed",
  });
  project = getComponentResearchProject(researched.currentResearch);
  assert.ok(project);
  researched = simulateDays({ ...researched, researchPoints: project.cost }, 1).state;

  assert.equal(researched.componentResearch["cpu.cores"], 3);
  assert.equal(researched.componentResearch["memory.speed"], 5);
  const unchangedProduct = researched.products.find(
    (product) => product.id === published.id,
  );
  assert.deepEqual(unchangedProduct?.configuration, publishedSnapshot);
});

test("Auto-Build waehlt ein gueltiges bestes erforschtes Setup", () => {
  const initial = createInitialState(1_000);
  const research = Object.fromEntries(
    Object.keys(initial.componentResearch).map((attribute) => [attribute, 8]),
  ) as GameState["componentResearch"];
  const snapshot = { ...research };

  for (const audience of ["office", "gaming", "creator"] as const) {
    const configuration = createBestCompatibleConfiguration(research, audience);
    const build = evaluatePcBuild(configuration, audience);
    const starter = evaluatePcBuild(createStarterConfiguration(), audience);
    assert.equal(build.valid, true);
    assert.equal(isConfigurationWithinResearch(configuration, research), true);
    assert.ok(build.scores[audience] >= starter.scores[audience]);
    assert.deepEqual(
      createBestCompatibleConfiguration(research, audience),
      configuration,
    );
  }
  assert.deepEqual(research, snapshot);
});

test("Auto-Build reduziert Leistung bei schwacher Versorgung automatisch", () => {
  const initial = createInitialState(1_000);
  const research = {
    ...initial.componentResearch,
    "cpu.cores": 20,
    "cpu.clock": 20,
    "cpu.architecture": 20,
    "gpu.compute": 20,
    "gpu.clock": 20,
    "gpu.memory": 20,
  };
  const configuration = createBestCompatibleConfiguration(research, "gaming");
  const build = evaluatePcBuild(configuration, "gaming");

  assert.equal(build.valid, true);
  assert.equal(isConfigurationWithinResearch(configuration, research), true);
  assert.ok(
    configuration["cpu.cores"] < research["cpu.cores"] ||
      configuration["gpu.compute"] < research["gpu.compute"],
  );
});

test("eine staerkere CPU kann Mainboard-, Netzteil- und Kuehlungsfehler ausloesen", () => {
  const configuration = {
    ...createStarterConfiguration(),
    "cpu.cores": 8,
    "cpu.clock": 8,
    "cpu.architecture": 5,
  };

  const build = evaluatePcBuild(configuration, "gaming");

  assert.equal(build.valid, false);
  assert.ok(
    build.issues.some(
      (issue) => issue.type === "error" && issue.categories.includes("motherboard"),
    ),
    "Eine zu starke CPU muss das Mainboard-Limit verletzen.",
  );
  assert.ok(
    build.issues.some(
      (issue) => issue.type === "error" && issue.categories.includes("psu"),
    ),
    "Eine zu starke CPU muss ein zu kleines Netzteil melden.",
  );
  assert.ok(
    build.issues.some(
      (issue) => issue.type === "error" && issue.categories.includes("cooling"),
    ),
    "Eine zu starke CPU muss eine zu kleine Kuehlung melden.",
  );
});

test("GPU-Takt und VRAM koennen die Mainboard-Schnittstelle ueberfordern", () => {
  const configuration = {
    ...createStarterConfiguration(),
    "gpu.clock": 8,
    "gpu.memory": 8,
  };
  const build = evaluatePcBuild(configuration, "gaming");

  assert.ok(
    build.issues.some(
      (issue) =>
        issue.type === "warning" &&
        issue.categories.includes("gpu") &&
        issue.categories.includes("motherboard"),
    ),
  );
});

test("Marktaera und Automatisierung verlangen breit entwickelte Komponenten", () => {
  const initial = createInitialState(1_000);
  const oneExtremeValue = {
    ...createStarterConfiguration(),
    "cooling.noise": 101,
  };
  assert.equal(evaluatePcBuild(oneExtremeValue, "office").tier, 1);

  const shortcut: GameState = {
    ...initial,
    automationLevel: 1,
    componentResearch: {
      ...initial.componentResearch,
      "cpu.clock": 2,
      "memory.speed": 2,
    },
  };
  assert.notEqual(getAutomationRequirement(shortcut), null);

  const balancedResearch = { ...shortcut.componentResearch };
  for (const category of ["cpu", "memory"] as const) {
    for (const track of getResearchTracksByCategory(category)) {
      balancedResearch[track.id] = 2;
    }
  }
  assert.equal(
    getAutomationRequirement({ ...shortcut, componentResearch: balancedResearch }),
    null,
  );
});

test("V2-Part-Spielstaende migrieren Forschung und alte PC-Konfigurationen", () => {
  const initial = createInitialState(1_000);
  const legacyConfiguration: Record<PcPartCategory, string> = {
    cpu: "cpu-spark-2",
    gpu: "gpu-pixel-2",
    memory: "ram-16-ddr4",
    storage: "storage-ssd-256",
    motherboard: "board-forge-s2",
    psu: "psu-650",
    cooling: "cooler-dual-190",
    case: "case-flow-2",
  };
  const legacySave = {
    ...initial,
    version: 2,
    componentResearch: undefined,
    currentResearch: "silicon16",
    unlockedParts: [
      ...initial.unlockedParts,
      "cpu-forge-4",
      "ram-32-ddr5",
    ],
    products: initial.products.map((product) => ({
      ...product,
      configuration: legacyConfiguration,
    })),
  };

  const migrated = mergeLoadedState(legacySave);
  assert.ok(migrated);
  assert.equal(migrated.currentResearch, null);
  for (const track of getResearchTracksByCategory("cpu")) {
    assert.equal(migrated.componentResearch[track.id], 3);
  }
  for (const track of getResearchTracksByCategory("memory")) {
    assert.equal(migrated.componentResearch[track.id], 4);
  }

  const expectedConfiguration = createStarterConfiguration();
  const expectedTier: Record<PcPartCategory, number> = {
    cpu: 2,
    gpu: 2,
    memory: 3,
    storage: 2,
    motherboard: 3,
    psu: 3,
    cooling: 3,
    case: 2,
  };
  for (const category of PC_PART_CATEGORIES) {
    for (const track of getResearchTracksByCategory(category.id)) {
      expectedConfiguration[track.id] = expectedTier[category.id];
    }
  }
  assert.deepEqual(starterProduct(migrated).configuration, expectedConfiguration);
});

test("Event-Sperren alter Saves werden geloest, manuelle Pausen bleiben erhalten", () => {
  const initial = createInitialState(1_000);
  const interrupted = mergeLoadedState({
    ...initial,
    version: 2,
    speed: 0,
    previousSpeed: 2,
    pendingEvent: { id: "legacy-event", title: "Altes Ereignis" },
  });
  const manuallyPaused = mergeLoadedState({
    ...initial,
    version: 2,
    speed: 0,
    previousSpeed: 4,
  });

  assert.equal(interrupted?.speed, 5);
  assert.equal(interrupted?.previousSpeed, 5);
  assert.equal(manuallyPaused?.speed, 0);
  assert.equal(manuallyPaused?.previousSpeed, 10);
  assert.equal("pendingEvent" in (interrupted ?? {}), false);
});

test("V3-Spielstaende migrieren x2 und x4 auf x5 und x10", () => {
  const initial = createInitialState(1_000);
  const oldFive = mergeLoadedState({
    ...initial,
    version: 3,
    speed: 2,
    previousSpeed: 2,
  });
  const oldTen = mergeLoadedState({
    ...initial,
    version: 3,
    speed: 4,
    previousSpeed: 4,
  });

  assert.equal(oldFive?.version, GAME_VERSION);
  assert.equal(oldFive?.speed, 5);
  assert.equal(oldFive?.previousSpeed, 5);
  assert.equal(oldTen?.speed, 10);
  assert.equal(oldTen?.previousSpeed, 10);
});

test("extreme Forschungslevel aus Imports bleiben numerisch stabil", () => {
  const initial = createInitialState(1_000);
  const imported = mergeLoadedState({
    ...initial,
    componentResearch: Object.fromEntries(
      Object.keys(initial.componentResearch).map((attribute) => [
        attribute,
        Number.MAX_VALUE,
      ]),
    ),
  });
  assert.ok(imported);

  const result = simulateDays(imported, 2).state;
  assert.ok(Number.isFinite(result.cash));
  assert.ok(Number.isFinite(result.valuation));
  assert.ok(Number.isFinite(result.sharePrice));
  assert.ok(
    Object.values(result.componentResearch).every(Number.isSafeInteger),
  );
});

test("eine 360-Tage-Simulation laeuft ohne Eventstopp vollstaendig durch", () => {
  const initial = createInitialState(1_000);
  const result = simulateDays(initial, 360);

  assert.equal(result.summary.days, 360);
  assert.equal(result.state.day, initial.day + 360);
  assert.equal(result.state.speed, initial.speed);
  assert.equal("pendingEvent" in result.state, false);
});

test("Produktgenerationen verdraengen den eigenen Vorgaenger im selben Segment", () => {
  const initial = createInitialState(1_000);
  const original = starterProduct(initial);
  const portfolio: GameState = {
    ...initial,
    products: [
      { ...original, generation: 1 },
      { ...original, id: "circuit-two", name: "Circuit Two", generation: 2, predecessorId: original.id },
    ],
  };
  const oldDemand = getProductEconomics(portfolio, original.id)?.demand ?? 0;
  const newDemand = getProductEconomics(portfolio, "circuit-two")?.demand ?? 0;

  assert.ok(newDemand > oldDemand * 1.5, `${newDemand} sollte deutlich über ${oldDemand} liegen`);
});

test("schlechter Fabrikzustand erhoeht Retouren und Wartung stabilisiert die Anlage", () => {
  const initial = createInitialState(1_000);
  const worn: GameState = { ...initial, factoryCondition: 35, maintenanceBudget: 0 };
  assert.ok(getProductWarrantyRate(worn, starterProduct(worn)) > getProductWarrantyRate(initial, starterProduct(initial)));

  const idleProducts = initial.products.map((product) => ({ ...product, productionTarget: 0, inventory: 0 }));
  const neglected = simulateDays({ ...initial, products: idleProducts, maintenanceBudget: 0 }, 1).state;
  const maintained = simulateDays({ ...initial, products: idleProducts, maintenanceBudget: 2_000 }, 1).state;
  assert.ok(maintained.factoryCondition > neglected.factoryCondition);
});

test("Firmenkundenvertraege schaffen feste Nachfrage und blockieren die Stilllegung", () => {
  const initial = createInitialState(1_000);
  const offer = getEnterpriseContractOffers(initial).find((candidate) => candidate.segment === "budget");
  assert.ok(offer);
  assert.ok(Math.ceil(offer.totalUnits / offer.durationDays) <= Math.min(getFactoryCapacity(initial), getDailySalesCapacity(initial)));
  const accepted = gameReducer(initial, {
    type: "ACCEPT_ENTERPRISE_CONTRACT",
    offerId: offer.id,
    productId: "product-circuit-one",
  });
  const firstContract = accepted.enterpriseContracts[0];
  assert.ok(firstContract);
  const acceptedEconomics = getProductEconomics(accepted, "product-circuit-one");
  assert.ok(acceptedEconomics);
  assert.ok(firstContract.unitPrice <= acceptedEconomics.unitCost * 1.07 + 0.01);
  assert.equal(gameReducer(accepted, { type: "RETIRE_PRODUCT", productId: "product-circuit-one" }), accepted);
  const dailyTarget = getContractDailyTarget(firstContract);
  const delivered = simulateDays(accepted, 1).state;
  const deliveredUnits = delivered.enterpriseContracts[0]?.lastDelivery ?? 0;
  assert.ok(deliveredUnits > dailyTarget);
  assert.equal(delivered.enterpriseContracts[0]?.fulfilledUnits, deliveredUnits);
  assertClose(delivered.lastDayContractRevenue, deliveredUnits * firstContract.unitPrice);
  assertClose(
    delivered.lastDayRevenue,
    delivered.lastDayProductRevenue + delivered.lastDayContractRevenue,
  );
  assert.equal(delivered.monthlyContractRevenue, delivered.lastDayContractRevenue);
  assert.equal(delivered.monthlyProductRevenue, delivered.lastDayProductRevenue);
  const projection = getMonthlyFinancialProjection(delivered);
  assertClose(projection.productRevenue, delivered.lastDayProductRevenue * 30);
  assert.ok(projection.contractProductionExpenses > 0);
  assert.ok(projection.contractWarrantyExpenses > 0);
  assertClose(
    projection.productionExpenses,
    projection.productProductionExpenses + projection.contractProductionExpenses,
  );
  assertClose(
    projection.warrantyExpenses,
    projection.productWarrantyExpenses + projection.contractWarrantyExpenses,
  );
  assertClose(
    projection.totalIncome,
    projection.productRevenue + projection.contractRevenue + projection.subsidiaryRevenue + projection.portfolioIncome,
  );
  assertClose(
    projection.totalOutflow,
    projection.productionExpenses + projection.warrantyExpenses + projection.payrollExpenses +
      projection.marketingExpenses + projection.maintenanceExpenses + projection.interestExpenses +
      projection.contractPenalties + projection.subsidiaryExpenses + projection.debtPrincipal,
  );
  assertClose(projection.profit, projection.totalIncome - projection.totalOutflow);

  const monthClosed = simulateDays({ ...accepted, day: 29 }, 1).state;
  assert.ok(monthClosed.lastMonthContractRevenue > 0);
  assert.equal(monthClosed.monthlyContractRevenue, 0);
  assert.equal(monthClosed.history.at(-1)?.contractRevenue, monthClosed.lastMonthContractRevenue);

  const stopped = simulateDays({
    ...accepted,
    products: accepted.products.map((product) => ({ ...product, inventory: 0, productionTarget: 0 })),
  }, 1).state;
  const stoppedProjection = getMonthlyFinancialProjection(stopped);
  assert.equal(stopped.lastDayContractRevenue, 0);
  assert.equal(stoppedProjection.contractRevenue, 0);
  assert.ok(stopped.cash < accepted.cash);
  assert.ok(stoppedProjection.profit < 0);

  const inventoryDelivery = simulateDays({
    ...accepted,
    products: accepted.products.map((product) => ({ ...product, inventory: 100, productionTarget: 0 })),
  }, 1).state;
  const inventoryProjection = getMonthlyFinancialProjection(inventoryDelivery);
  assert.equal(inventoryDelivery.products[0].lastProduction, 0);
  const inventoryConsumerSales = inventoryDelivery.products[0].lastSales - inventoryDelivery.products[0].lastContractSales;
  assert.ok(inventoryConsumerSales > 0);
  assert.equal(inventoryDelivery.enterpriseContracts[0].lastDelivery, Math.min(100 - inventoryConsumerSales, firstContract.totalUnits));
  assert.ok(inventoryProjection.contractProductionExpenses > 0);
  assert.ok(inventoryProjection.productProductionExpenses > 0);
  assertClose(
    inventoryProjection.productionExpenses,
    inventoryProjection.productProductionExpenses + inventoryProjection.contractProductionExpenses,
  );
  assert.ok(inventoryProjection.contractRevenue < inventoryDelivery.lastDayContractRevenue * 30);

  const scarceInventory = simulateDays({
    ...accepted,
    products: accepted.products.map((product) => ({ ...product, inventory: 1, productionTarget: 0 })),
  }, 1).state;
  assert.equal(scarceInventory.products[0].lastContractSales, 0);
  assert.equal(scarceInventory.enterpriseContracts[0].lastDelivery, 0);
  assert.equal(scarceInventory.products[0].lastSales, 1);

  const nextMonth = { ...accepted, day: 30 };
  const secondOffer = getEnterpriseContractOffers(nextMonth).find((candidate) => candidate.segment === "budget");
  assert.ok(secondOffer);
  const acceptedTwice = gameReducer(nextMonth, {
    type: "ACCEPT_ENTERPRISE_CONTRACT",
    offerId: secondOffer.id,
    productId: "product-circuit-one",
  });
  assert.equal(acceptedTwice.enterpriseContracts.length, 2);

  const almostComplete: GameState = {
    ...accepted,
    enterpriseContracts: [{ ...firstContract, totalUnits: 1, fulfilledUnits: 0, daysRemaining: 100 }],
  };
  const completed = simulateDays(almostComplete, 1).state;
  assert.equal(completed.enterpriseContracts.length, 0);
  assert.ok(completed.news.some((item) => item.id.startsWith("contract-complete-")));
  assert.equal(gameReducer(completed, {
    type: "ACCEPT_ENTERPRISE_CONTRACT",
    offerId: offer.id,
    productId: "product-circuit-one",
  }), completed);
});

test("defekte Auftragswerte koennen Liquiditaet und Bewertung nicht mit NaN anstecken", () => {
  const initial = createInitialState(1_000);
  const offer = getEnterpriseContractOffers(initial).find((candidate) => candidate.segment === "budget");
  assert.ok(offer);
  const corrupted: GameState = {
    ...initial,
    cash: Number.NaN,
    monthlyRevenue: Number.NaN,
    enterpriseContracts: [{
      ...offer,
      productId: "product-circuit-one",
      totalUnits: Number.NaN,
      fulfilledUnits: Number.NaN,
      unitPrice: Number.NaN,
      minimumQuality: Number.NaN,
      daysRemaining: Number.NaN,
      totalDays: Number.NaN,
      lastDelivery: Number.NaN,
    }],
  };

  assert.ok(Number.isFinite(getContractDailyTarget(corrupted.enterpriseContracts[0])));
  const result = simulateDays(corrupted, 2).state;
  for (const value of [
    result.cash,
    result.monthlyRevenue,
    result.monthlyExpenses,
    result.lifetimeRevenue,
    result.lifetimeProfit,
    result.valuation,
    result.sharePrice,
  ]) assert.ok(Number.isFinite(value));
  assert.notEqual(result.valuation, Number.MAX_SAFE_INTEGER);

  const repaired = mergeLoadedState({
    ...initial,
    cash: null,
    monthlyRevenue: null,
    enterpriseContracts: [{
      ...offer,
      productId: "product-circuit-one",
      totalUnits: null,
      fulfilledUnits: null,
      unitPrice: null,
      daysRemaining: null,
      totalDays: null,
      lastDelivery: null,
    }],
  });
  assert.ok(repaired);
  assert.ok(Number.isFinite(repaired.cash));
  assert.ok(Number.isFinite(repaired.enterpriseContracts[0].totalUnits));
  assert.ok(Number.isFinite(repaired.enterpriseContracts[0].daysRemaining));
});

test("mehrere parallele Auftraege bleiben auch bei verfehlten Fristen numerisch stabil", () => {
  const initial = createInitialState(1_000);
  const offer = getEnterpriseContractOffers(initial).find((candidate) => candidate.segment === "budget");
  assert.ok(offer);
  const crowded: GameState = {
    ...initial,
    enterpriseContracts: Array.from({ length: 24 }, (_, index) => ({
      ...offer,
      id: `${offer.id}-${index}`,
      productId: "product-circuit-one",
      daysRemaining: 3 + index % 4,
      totalDays: 6,
      fulfilledUnits: 0,
      lastDelivery: 0,
    })),
  };
  const result = simulateDays(crowded, 10).state;
  assert.ok(Number.isFinite(result.cash));
  assert.ok(Number.isFinite(result.valuation));
  assert.ok(Number.isFinite(result.lastDayRevenue));
  assert.ok(Number.isFinite(result.lastDayExpenses));
});

test("Auto-Auftraege akzeptieren nur profitable Vertraege mit freier Produktionskapazitaet", () => {
  const initial = createInitialState(1_000);
  const enabled = gameReducer(initial, { type: "SET_AUTO_ACCEPT_CONTRACTS", enabled: true });
  assert.equal(enabled.autoAcceptContracts, true);
  assert.ok(getEnterpriseContractCapacity(enabled).available > 0);
  const automated = simulateDays(enabled, 1).state;
  assert.ok(automated.enterpriseContracts.length > 0);
  const accepted = automated.enterpriseContracts[0];
  const economics = getProductEconomics(automated, accepted.productId);
  assert.ok(economics);
  assert.ok(accepted.unitPrice >= economics.unitCost * 1.01 - 0.01);

  const blocked = {
    ...enabled,
    products: enabled.products.map((product) => ({
      ...product,
      productionTarget: getFactoryCapacity(enabled),
    })),
  };
  assert.equal(getEnterpriseContractCapacity(blocked).available, 0);
  assert.equal(simulateDays(blocked, 1).state.enterpriseContracts.length, 0);
});

test("Marketingfokus und Zielsegment veraendern die Nachfrage nachvollziehbar", () => {
  const initial = { ...createInitialState(1_000), marketingBudget: 10_000 };
  const baseline = getProductEconomics(initial, "product-circuit-one")?.demand ?? 0;
  const awareness = gameReducer(initial, { type: "SET_MARKETING_FOCUS", focus: "awareness" });
  const targeted = gameReducer(awareness, { type: "SET_MARKETING_TARGET", target: "budget" });

  assert.ok((getProductEconomics(awareness, "product-circuit-one")?.demand ?? 0) > baseline);
  assert.ok((getProductEconomics(targeted, "product-circuit-one")?.demand ?? 0) > (getProductEconomics(awareness, "product-circuit-one")?.demand ?? 0));
});

test("Beteiligungsstufen steigern Dividende und senken die Uebernahmeprämie", () => {
  const initial = createInitialState(1_000);
  const company = initial.competitors[0];
  const strategic = { ...company, ownedShares: company.sharesOutstanding * 0.2 };
  const board = { ...company, ownedShares: company.sharesOutstanding * 0.334 };

  assert.equal(getStrategicStakeLevel(strategic).level, "partner");
  assert.equal(getStrategicStakeLevel(board).level, "board");
  assert.ok(getAcquisitionPrice(board) < getAcquisitionPrice(strategic));
});

test("Marktanteil blockiert weder Uebernahmen noch Fusionen", () => {
  const dominant = {
    ...createInitialState(1_000),
    cash: 1_000_000_000_000,
    marketShare: 99,
  };
  const acquisitionTarget = dominant.competitors.find((company) => company.id === "microfab");
  const mergerTarget = dominant.competitors.find((company) => company.id === "coolwave");
  assert.ok(acquisitionTarget);
  assert.ok(mergerTarget);

  const acquired = gameReducer(dominant, {
    type: "ACQUIRE_COMPETITOR",
    competitorId: acquisitionTarget.id,
  });
  assert.equal(
    acquired.competitors.find((company) => company.id === acquisitionTarget.id)?.status,
    "acquired",
  );

  const merged = gameReducer(dominant, {
    type: "MERGE_COMPETITOR",
    competitorId: mergerTarget.id,
  });
  assert.equal(
    merged.competitors.find((company) => company.id === mergerTarget.id)?.status,
    "merged",
  );
});

test("Schwierigkeitsgrad wird nur vor Spielbeginn gesetzt und veraendert die Konkurrenz", () => {
  const initial = createInitialState(1_000);
  const hard = gameReducer(initial, { type: "SET_DIFFICULTY", difficulty: "hard" });
  assert.equal(hard.cash, 100_000);
  assert.equal(hard.difficulty, "hard");
  assert.ok(
    getCompetitorProductOffers(hard)[0].technology >
      getCompetitorProductOffers(initial)[0].technology,
  );
  const running = gameReducer({ ...hard, day: 1 }, { type: "SET_DIFFICULTY", difficulty: "relaxed" });
  assert.equal(running.difficulty, "hard");
});

test("neue Fachseiten bleiben beim Navigieren und Laden direkt erhalten", () => {
  const initial = createInitialState(1_000);
  for (const section of ["production", "people", "market", "finance", "stocks", "deals"] as const) {
    const navigated = gameReducer(initial, { type: "SET_SECTION", section });
    assert.equal(navigated.selectedSection, section);
    assert.equal(mergeLoadedState(navigated)?.selectedSection, section);
  }
});

test("ein neuer realistischer Spielstand besitzt mehr finanziellen Anlauf", () => {
  const initial = createInitialState(1_000);
  assert.equal(initial.cash, 225_000);
  assert.equal(initial.maintenanceBudget, 100);
  assert.equal(initial.marketingBudget, 200);
});

test("der Technologiemarkt besteht aus 100 eindeutig handelbaren Unternehmen", () => {
  const initial = createInitialState(1_000);
  assert.equal(initial.competitors.length, 100);
  assert.equal(new Set(initial.competitors.map((company) => company.id)).size, 100);
  assert.equal(new Set(initial.competitors.map((company) => company.ticker)).size, 100);
  assert.ok(initial.competitors.filter((company) => company.pcSegment === "budget").length >= 10);
  assert.ok(initial.competitors.filter((company) => company.pcSegment === "mainstream").length >= 10);
  assert.ok(initial.competitors.filter((company) => company.pcSegment === "performance").length >= 10);
  for (const company of initial.competitors) {
    assert.ok(Number.isFinite(company.revenue) && company.revenue > 0);
    assert.ok(Number.isFinite(company.price) && company.price > 0);
    assert.ok(company.priceHistory.length > 0);
  }
});

test("taegliche Aktienhistorien werden nicht gespeichert und nach dem Laden neu aufgebaut", () => {
  const running = simulateDays(createInitialState(1_000), 100).state;
  assert.ok(running.competitors.every((company) => company.priceHistory.length === 90));

  const serialized = serializeState(running, 2_000);
  const parsed = JSON.parse(serialized) as GameState;
  assert.ok(parsed.competitors.every((company) => !("priceHistory" in company)));
  assert.ok(serialized.length < JSON.stringify(running).length * 0.5);

  const loaded = mergeLoadedState(parsed);
  assert.ok(loaded);
  for (const company of loaded.competitors) {
    assert.equal(company.priceHistory.length, 1);
    assertClose(company.priceHistory[0].close, company.price);
    assert.ok(company.history.length > 0);
  }

  const continued = simulateDays(loaded, 2).state;
  assert.ok(continued.competitors.every((company) => company.priceHistory.length >= 2));
});

test("uebernommene Wettbewerber wachsen weiter und koennen vollstaendig verkauft werden", () => {
  const initial = { ...createInitialState(1_000), cash: 1_000_000_000_000 };
  const target = initial.competitors.find((company) => company.id === "bytecraft");
  assert.ok(target);

  const acquired = gameReducer(initial, {
    type: "ACQUIRE_COMPETITOR",
    competitorId: target.id,
  });
  const subsidiary = acquired.competitors.find((company) => company.id === target.id);
  assert.ok(subsidiary);
  assert.equal(subsidiary.status, "acquired");
  assert.equal(subsidiary.acquisitionIntegrated, true);

  const developed = simulateDays(acquired, 180).state;
  const grownSubsidiary = developed.competitors.find((company) => company.id === target.id);
  assert.ok(grownSubsidiary);
  assert.equal(grownSubsidiary.status, "acquired");
  assert.ok(grownSubsidiary.revenue > subsidiary.revenue);
  assert.notEqual(grownSubsidiary.fairValue, subsidiary.fairValue);

  const quote = getSubsidiaryExitQuote(grownSubsidiary);
  const cashBefore = developed.cash;
  const sold = gameReducer(developed, {
    type: "DIVEST_COMPETITOR",
    competitorId: target.id,
  });
  const independent = sold.competitors.find((company) => company.id === target.id);
  assert.ok(independent);
  assert.equal(independent.status, "active");
  assert.equal(independent.ownedShares, 0);
  assert.equal(independent.acquisitionIntegrated, true);
  assertClose(sold.cash, cashBefore + quote.directSaleProceeds, 0.01);
});

test("ein Boersengang bringt eine Tochter zurueck an den Markt und behaelt 30 Prozent", () => {
  const initial = { ...createInitialState(1_000), cash: 1_000_000_000_000 };
  const target = initial.competitors.find((company) => company.id === "bytecraft");
  assert.ok(target);
  const acquired = gameReducer(initial, {
    type: "ACQUIRE_COMPETITOR",
    competitorId: target.id,
  });
  const subsidiary = acquired.competitors.find((company) => company.id === target.id);
  assert.ok(subsidiary);
  const quote = getSubsidiaryExitQuote(subsidiary);
  const cashBefore = acquired.cash;

  const listed = gameReducer(acquired, {
    type: "RELIST_COMPETITOR",
    competitorId: target.id,
  });
  const publicCompany = listed.competitors.find((company) => company.id === target.id);
  assert.ok(publicCompany);
  assert.equal(publicCompany.status, "active");
  assert.equal(publicCompany.ownedShares, quote.ipoRetainedShares);
  assert.equal(
    publicCompany.ownedShares,
    Math.round(publicCompany.sharesOutstanding * 0.3),
  );
  assertClose(listed.cash, cashBefore + quote.ipoProceeds, 0.01);
});
