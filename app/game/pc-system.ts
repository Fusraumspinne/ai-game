import type {
  PcAudience,
  PcBuildEvaluation,
  PcBuildIssue,
  PcConfiguration,
  PcMarketSegment,
  PcPartCategory,
  PcResearchAttribute,
  PcResearchLevels,
  PcResearchProject,
  PcResearchTrackDefinition,
} from "./types";

export const PC_PART_CATEGORIES: Array<{
  id: PcPartCategory;
  name: string;
  shortName: string;
  description: string;
  icon:
    | "cpu"
    | "monitor"
    | "products"
    | "save"
    | "production"
    | "bolt"
    | "activity"
    | "building";
}> = [
  { id: "cpu", name: "Prozessor", shortName: "CPU", description: "Kerne, Takt, Effizienz und Architektur einzeln kombinieren", icon: "cpu" },
  { id: "gpu", name: "Grafikprozessor", shortName: "GPU", description: "Recheneinheiten, Takt, Grafikspeicher und Effizienz", icon: "monitor" },
  { id: "memory", name: "Arbeitsspeicher", shortName: "RAM", description: "Kapazität und Geschwindigkeit unabhängig festlegen", icon: "products" },
  { id: "storage", name: "Datenspeicher", shortName: "Speicher", description: "Kapazität, Transferrate und Zuverlässigkeit", icon: "save" },
  { id: "motherboard", name: "Mainboard", shortName: "Board", description: "Grenzen für CPU, RAM und Schnittstellen", icon: "production" },
  { id: "psu", name: "Netzteil", shortName: "Netzteil", description: "Leistung, Effizienz und Zuverlässigkeit", icon: "bolt" },
  { id: "cooling", name: "Kühlung", shortName: "Kühlung", description: "Kühlleistung und Lautstärke", icon: "activity" },
  { id: "case", name: "Gehäuse", shortName: "Gehäuse", description: "Luftstrom, Bauraum und Verarbeitungsqualität", icon: "building" },
];

export const PC_AUDIENCES: Record<
  PcAudience,
  { name: string; description: string; accent: string }
> = {
  office: {
    name: "Office",
    description: "Günstig, leise und zuverlässig",
    accent: "#59e1d0",
  },
  gaming: {
    name: "Gaming",
    description: "Hohe Grafikleistung und schnelle Reaktion",
    accent: "#a78bfa",
  },
  creator: {
    name: "Creator",
    description: "Viele Kerne, viel RAM und schneller Speicher",
    accent: "#f6b85f",
  },
};

type RuntimeTrack = PcResearchTrackDefinition & {
  value: (level: number) => number;
  format: (value: number, level: number) => string;
};

const integer = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const MAX_RESEARCH_LEVEL = Number.MAX_SAFE_INTEGER - 1;
const MAX_FINITE_VALUE = Number.MAX_VALUE / 1_000_000;
const RESEARCH_POINT_SCALE = 40;

function levelOf(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(
    MAX_RESEARCH_LEVEL,
    Math.max(1, Math.floor(value)),
  );
}

function safe(value: number) {
  if (Number.isNaN(value)) return 0;
  if (!Number.isFinite(value)) return MAX_FINITE_VALUE;
  return Math.min(MAX_FINITE_VALUE, Math.max(0, value));
}

function growing(base: number, growth: number, level: number) {
  const safeLevel = levelOf(level);
  const progress = safeLevel - 1;
  return safe(
    base * (1 + Math.max(0.01, growth - 1) * progress) ** 1.35,
  );
}

function roundedGrowing(
  base: number,
  growth: number,
  level: number,
  step = 1,
) {
  const safeLevel = levelOf(level);
  const minimumForNextStep = base + (safeLevel - 1) * step;
  return safe(
    Math.max(
      step,
      Math.ceil(
        Math.max(growing(base, growth, safeLevel), minimumForNextStep) / step,
      ) * step,
    ),
  );
}

function adaptiveDecimal(value: number, level: number, minimumDigits = 1) {
  const digits = Math.min(
    8,
    Math.max(minimumDigits, Math.floor((levelOf(level) - 1) / 10) + 1),
  );
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: minimumDigits,
    maximumFractionDigits: digits,
  });
}

function diminishing(start: number, floor: number, factor: number, level: number) {
  return floor + (start - floor) * factor ** (levelOf(level) - 1);
}

function improving(start: number, ceiling: number, factor: number, level: number) {
  return ceiling - (ceiling - start) * factor ** (levelOf(level) - 1);
}

const tracks: RuntimeTrack[] = [
  {
    id: "cpu.cores",
    category: "cpu",
    name: "Kerne",
    description: "Mehr parallele Recheneinheiten erhöhen Leistung, Kosten und Wärme.",
    baseCost: 90,
    value: (level) => roundedGrowing(1, 1.58, level),
    format: (value) => `${integer.format(value)} ${value === 1 ? "Kern" : "Kerne"}`,
  },
  {
    id: "cpu.clock",
    category: "cpu",
    name: "Takt",
    description: "Höherer Takt beschleunigt jeden Kern, benötigt aber mehr Energie.",
    baseCost: 82,
    value: (level) => 1.2 + (levelOf(level) - 1) * 0.55,
    format: (value) => `${oneDecimal.format(value)} GHz`,
  },
  {
    id: "cpu.efficiency",
    category: "cpu",
    name: "Energieeffizienz",
    description: "Senkt den Verbrauch einer gewählten Kern- und Taktkonfiguration.",
    baseCost: 110,
    value: (level) => diminishing(100, 18, 0.9, level),
    format: (value, level) => `${adaptiveDecimal(value, level)} % Basisverbrauch`,
  },
  {
    id: "cpu.architecture",
    category: "cpu",
    name: "Architektur",
    description: "Mehr Leistung pro Kern ohne eine fertige CPU vorzugeben.",
    baseCost: 135,
    value: (level) => levelOf(level),
    format: (_value, level) => `Generation ${levelOf(level)}`,
  },
  {
    id: "gpu.compute",
    category: "gpu",
    name: "Recheneinheiten",
    description: "Skaliert Grafik- und Rendering-Leistung.",
    baseCost: 105,
    value: (level) => roundedGrowing(4, 1.62, level),
    format: (value) => `${integer.format(value)} Recheneinheiten`,
  },
  {
    id: "gpu.clock",
    category: "gpu",
    name: "Grafiktakt",
    description: "Mehr Takt steigert Durchsatz und Energiebedarf.",
    baseCost: 95,
    value: (level) => 0.5 + (levelOf(level) - 1) * 0.28,
    format: (value) => `${oneDecimal.format(value)} GHz`,
  },
  {
    id: "gpu.memory",
    category: "gpu",
    name: "Grafikspeicher",
    description: "Mehr VRAM hilft bei hohen Auflösungen und großen Projekten.",
    baseCost: 88,
    value: (level) => roundedGrowing(1, 1.75, level),
    format: (value) => `${integer.format(value)} GB VRAM`,
  },
  {
    id: "gpu.efficiency",
    category: "gpu",
    name: "Energieeffizienz",
    description: "Reduziert Leistungsaufnahme und Abwärme der GPU.",
    baseCost: 125,
    value: (level) => diminishing(100, 20, 0.91, level),
    format: (value, level) => `${adaptiveDecimal(value, level)} % Basisverbrauch`,
  },
  {
    id: "memory.capacity",
    category: "memory",
    name: "Kapazität",
    description: "Bestimmt, wie viele Programme und Daten gleichzeitig im RAM liegen.",
    baseCost: 72,
    value: (level) => roundedGrowing(4, 2, level),
    format: (value) => `${integer.format(value)} GB`,
  },
  {
    id: "memory.speed",
    category: "memory",
    name: "Geschwindigkeit",
    description: "Erhöht die Bandbreite zwischen Prozessor und Arbeitsspeicher.",
    baseCost: 78,
    value: (level) => roundedGrowing(800, 1.55, level, 100),
    format: (value) => `${integer.format(value)} MHz`,
  },
  {
    id: "storage.capacity",
    category: "storage",
    name: "Kapazität",
    description: "Mehr Platz für Programme, Spiele und Kundendaten.",
    baseCost: 68,
    value: (level) => roundedGrowing(250, 1.82, level, 50),
    format: (value) => value >= 1_000 ? `${oneDecimal.format(value / 1_000)} TB` : `${integer.format(value)} GB`,
  },
  {
    id: "storage.speed",
    category: "storage",
    name: "Transferrate",
    description: "Verkürzt Start-, Lade- und Speicherzeiten.",
    baseCost: 92,
    value: (level) => roundedGrowing(80, 1.78, level, 10),
    format: (value) => `${integer.format(value)} MB/s`,
  },
  {
    id: "storage.reliability",
    category: "storage",
    name: "Zuverlässigkeit",
    description: "Weniger Ausfälle erhöhen Produktqualität und Markenvertrauen.",
    baseCost: 84,
    value: (level) => improving(88, 99.9, 0.78, level),
    format: (value, level) => `${adaptiveDecimal(value, level)} %`,
  },
  {
    id: "motherboard.cpuLimit",
    category: "motherboard",
    name: "CPU-Stromversorgung",
    description: "Legt fest, wie leistungsstark die eingesetzte CPU sein darf.",
    baseCost: 88,
    value: (level) => roundedGrowing(65, 1.42, level, 5),
    format: (value) => `${integer.format(value)} W CPU-Limit`,
  },
  {
    id: "motherboard.memoryLimit",
    category: "motherboard",
    name: "RAM-Limit",
    description: "Maximale Arbeitsspeicherkapazität des Boards.",
    baseCost: 72,
    value: (level) => roundedGrowing(8, 2, level),
    format: (value) => `${integer.format(value)} GB RAM`,
  },
  {
    id: "motherboard.memorySpeed",
    category: "motherboard",
    name: "RAM-Unterstützung",
    description: "Maximaler Speichertakt, den das Board stabil betreiben kann.",
    baseCost: 82,
    value: (level) => roundedGrowing(1_200, 1.52, level, 100),
    format: (value) => `${integer.format(value)} MHz`,
  },
  {
    id: "motherboard.expansion",
    category: "motherboard",
    name: "Schnittstellen",
    description: "Schnellere Anbindung für GPU und Datenspeicher.",
    baseCost: 112,
    value: (level) => levelOf(level),
    format: (_value, level) => `Generation ${levelOf(level)}`,
  },
  {
    id: "psu.wattage",
    category: "psu",
    name: "Leistung",
    description: "Versorgt stärkere Komponenten mit ausreichender Reserve.",
    baseCost: 76,
    value: (level) => roundedGrowing(350, 1.32, level, 50),
    format: (value) => `${integer.format(value)} W`,
  },
  {
    id: "psu.efficiency",
    category: "psu",
    name: "Effizienz",
    description: "Senkt Stromkosten und Abwärme des Netzteils.",
    baseCost: 92,
    value: (level) => improving(76, 99.5, 0.8, level),
    format: (value, level) => `${adaptiveDecimal(value, level)} %`,
  },
  {
    id: "psu.reliability",
    category: "psu",
    name: "Zuverlässigkeit",
    description: "Stabilere Spannungen schützen teure Hardware.",
    baseCost: 82,
    value: (level) => improving(86, 99.9, 0.8, level),
    format: (value, level) => `${adaptiveDecimal(value, level)} %`,
  },
  {
    id: "cooling.capacity",
    category: "cooling",
    name: "Kühlleistung",
    description: "Führt die Wärme stärkerer CPU- und GPU-Konfigurationen ab.",
    baseCost: 78,
    value: (level) => roundedGrowing(65, 1.48, level, 5),
    format: (value) => `${integer.format(value)} W Kühlleistung`,
  },
  {
    id: "cooling.noise",
    category: "cooling",
    name: "Lautstärke",
    description: "Bessere Lüfter und Regelung machen den PC leiser.",
    baseCost: 70,
    value: (level) => diminishing(42, 12, 0.9, level),
    format: (value, level) => `${adaptiveDecimal(value, level)} dB`,
  },
  {
    id: "case.airflow",
    category: "case",
    name: "Luftstrom",
    description: "Unterstützt die Kühlung des gesamten Systems.",
    baseCost: 64,
    value: (level) => roundedGrowing(25, 1.46, level, 5),
    format: (value) => `${integer.format(value)} Luftstrom`,
  },
  {
    id: "case.gpuLimit",
    category: "case",
    name: "GPU-Bauraum",
    description: "Erlaubt größere und stromhungrigere Grafikkarten.",
    baseCost: 68,
    value: (level) => roundedGrowing(110, 1.43, level, 10),
    format: (value) => `${integer.format(value)} W GPU-Limit`,
  },
  {
    id: "case.quality",
    category: "case",
    name: "Verarbeitung",
    description: "Stabilere Materialien verbessern Qualität und Markenwirkung.",
    baseCost: 74,
    value: (level) => improving(54, 99.5, 0.82, level),
    format: (value, level) => `${adaptiveDecimal(value, level)} / 100`,
  },
];

export const PC_RESEARCH_TRACKS: readonly PcResearchTrackDefinition[] = tracks;
export const PC_RESEARCH_ATTRIBUTE_IDS = tracks.map((track) => track.id);

export function getPcResearchTrack(attribute: PcResearchAttribute | string | null | undefined) {
  return tracks.find((track) => track.id === attribute);
}

export function getResearchTracksByCategory(category: PcPartCategory) {
  return tracks.filter((track) => track.category === category);
}

export function getPcAttributeValue(attribute: PcResearchAttribute, level: number) {
  return getPcResearchTrack(attribute)?.value(levelOf(level)) ?? 0;
}

export function formatPcAttributeValue(attribute: PcResearchAttribute, level: number) {
  const track = getPcResearchTrack(attribute);
  if (!track) return `Stufe ${levelOf(level)}`;
  return track.format(track.value(levelOf(level)), levelOf(level));
}

export function getComponentResearchCost(attribute: PcResearchAttribute, targetLevel: number) {
  const track = getPcResearchTrack(attribute);
  if (!track) return MAX_FINITE_VALUE;
  const level = Math.max(2, levelOf(targetLevel));
  const raw = track.baseCost * 0.57 * level ** 2.65 * RESEARCH_POINT_SCALE;
  return Math.max(1, Math.round(safe(raw)));
}

export function getCumulativeComponentResearchCost(
  attribute: PcResearchAttribute,
  currentLevel: number,
) {
  const track = getPcResearchTrack(attribute);
  const level = levelOf(currentLevel);
  if (!track || level <= 1) return 0;
  const exponent = 2.65;
  const approximatePowerSum =
    (level ** (exponent + 1) - 1) / (exponent + 1) +
    (level ** exponent + 1) / 2 -
    1;
  return Math.max(
    0,
    Math.round(safe(track.baseCost * 0.57 * approximatePowerSum * RESEARCH_POINT_SCALE)),
  );
}

export function createNextComponentResearchProject(
  attribute: PcResearchAttribute,
  currentLevel: number,
): PcResearchProject {
  const track = getPcResearchTrack(attribute)!;
  const targetLevel = levelOf(currentLevel) + 1;
  return {
    id: `component:${attribute}:${targetLevel}`,
    attribute,
    targetLevel,
    cost: getComponentResearchCost(attribute, targetLevel),
    name: `${track.name} Stufe ${targetLevel}`,
    previousValue: formatPcAttributeValue(attribute, targetLevel - 1),
    nextValue: formatPcAttributeValue(attribute, targetLevel),
  };
}

export function getComponentResearchProject(projectId: string | null | undefined) {
  if (!projectId?.startsWith("component:")) return null;
  const match = /^component:(.+):(\d+)$/.exec(projectId);
  if (!match) return null;
  const track = getPcResearchTrack(match[1]);
  const targetLevel = Number(match[2]);
  if (!track || !Number.isSafeInteger(targetLevel) || targetLevel < 2) return null;
  return {
    id: projectId,
    attribute: track.id,
    targetLevel,
    cost: getComponentResearchCost(track.id, targetLevel),
    name: `${track.name} Stufe ${targetLevel}`,
    previousValue: formatPcAttributeValue(track.id, targetLevel - 1),
    nextValue: formatPcAttributeValue(track.id, targetLevel),
  } satisfies PcResearchProject;
}

export function createStarterResearchLevels(): PcResearchLevels {
  return Object.fromEntries(
    PC_RESEARCH_ATTRIBUTE_IDS.map((attribute) => [attribute, 1]),
  ) as PcResearchLevels;
}

export function sanitizeResearchLevels(input: unknown): PcResearchLevels {
  const source = input && typeof input === "object"
    ? input as Partial<Record<PcResearchAttribute, unknown>>
    : {};
  return Object.fromEntries(
    PC_RESEARCH_ATTRIBUTE_IDS.map((attribute) => {
      const value = source[attribute];
      return [attribute, typeof value === "number" ? levelOf(value) : 1];
    }),
  ) as PcResearchLevels;
}

const LEGACY_PARTS: Record<PcPartCategory, readonly string[]> = {
  cpu: ["cpu-spark-1", "cpu-spark-2", "cpu-forge-4", "cpu-forge-8"],
  gpu: ["gpu-pixel-1", "gpu-pixel-2", "gpu-vector-3", "gpu-vector-4"],
  memory: ["ram-4-ddr2", "ram-8-ddr3", "ram-16-ddr4", "ram-32-ddr5"],
  storage: ["storage-hdd-250", "storage-ssd-256", "storage-nvme-1", "storage-nvme-2"],
  motherboard: ["board-base-s1", "board-core-s1", "board-forge-s2", "board-elite-s3"],
  psu: ["psu-350", "psu-500", "psu-650", "psu-900"],
  cooling: ["cooler-stock-s1", "cooler-tower-120", "cooler-dual-190", "cooler-liquid-300"],
  case: ["case-compact-1", "case-flow-2", "case-air-3", "case-studio-4"],
};

export const STARTER_PART_IDS = Object.values(LEGACY_PARTS).map((ids) => ids[0]);

function getLegacyPartTier(partId: unknown, category?: PcPartCategory) {
  const categories = category
    ? PC_PART_CATEGORIES.filter((item) => item.id === category)
    : PC_PART_CATEGORIES;
  for (const item of categories) {
    const index = LEGACY_PARTS[item.id].indexOf(String(partId));
    if (index >= 0) return { category: item.id, tier: index + 1 };
  }
  return null;
}

export function migrateLegacyResearch(
  unlockedPartIds: readonly string[] | null | undefined,
  fallbackTier = 1,
): PcResearchLevels {
  const result = createStarterResearchLevels();
  const unlocked = new Set(unlockedPartIds ?? []);
  for (const category of PC_PART_CATEGORIES) {
    const highestLegacyTier = LEGACY_PARTS[category.id].reduce(
      (highest, partId, index) => unlocked.has(partId) ? Math.max(highest, index + 1) : highest,
      1,
    );
    const migratedLevel = Math.max(1, levelOf(fallbackTier), highestLegacyTier);
    for (const track of getResearchTracksByCategory(category.id)) {
      result[track.id] = migratedLevel;
    }
  }
  return result;
}

export function createStarterConfiguration(): PcConfiguration {
  return createStarterResearchLevels();
}

export function normalizePcConfiguration(
  input: unknown,
  fallback: PcResearchLevels = createStarterResearchLevels(),
): PcConfiguration {
  const source = input && typeof input === "object"
    ? input as Record<string, unknown>
    : {};
  const hasDynamicLevels = PC_RESEARCH_ATTRIBUTE_IDS.some(
    (attribute) => typeof source[attribute] === "number",
  );
  if (hasDynamicLevels) {
    return Object.fromEntries(
      PC_RESEARCH_ATTRIBUTE_IDS.map((attribute) => [
        attribute,
        typeof source[attribute] === "number"
          ? levelOf(source[attribute] as number)
          : levelOf(fallback[attribute]),
      ]),
    ) as PcConfiguration;
  }

  const migrated = createStarterConfiguration();
  for (const category of PC_PART_CATEGORIES) {
    const legacy = getLegacyPartTier(source[category.id], category.id);
    const level = legacy?.tier ?? 1;
    for (const track of getResearchTracksByCategory(category.id)) {
      migrated[track.id] = level;
    }
  }
  return migrated;
}

const AUTO_BUILD_SUPPORT_ATTRIBUTES: readonly PcResearchAttribute[] = [
  "psu.wattage",
  "cooling.capacity",
  "case.airflow",
  "cpu.efficiency",
  "gpu.efficiency",
  "motherboard.cpuLimit",
  "motherboard.memoryLimit",
  "case.gpuLimit",
  "motherboard.memorySpeed",
  "motherboard.expansion",
  "psu.efficiency",
  "psu.reliability",
  "cooling.noise",
  "case.quality",
  "storage.reliability",
];

const AUTO_BUILD_PERFORMANCE_ATTRIBUTES: readonly PcResearchAttribute[] = [
  "cpu.cores",
  "cpu.clock",
  "cpu.architecture",
  "gpu.compute",
  "gpu.clock",
  "gpu.memory",
  "memory.capacity",
  "memory.speed",
  "storage.capacity",
  "storage.speed",
];

function withAttributeLevel(
  configuration: PcConfiguration,
  attribute: PcResearchAttribute,
  level: number,
): PcConfiguration {
  return { ...configuration, [attribute]: levelOf(level) };
}

function highestValidAttributeLevel(
  configuration: PcConfiguration,
  attribute: PcResearchAttribute,
  maximumLevel: number,
  audience?: PcAudience,
) {
  const currentLevel = configuration[attribute];
  const maximum = levelOf(maximumLevel);
  if (maximum <= currentLevel) return configuration;

  const maximumCandidate = withAttributeLevel(
    configuration,
    attribute,
    maximum,
  );
  if (evaluatePcBuild(maximumCandidate, audience).valid) {
    return maximumCandidate;
  }

  let validLevel = currentLevel;
  let invalidLevel = maximum;
  while (invalidLevel - validLevel > 1) {
    const candidateLevel = validLevel + Math.floor(
      (invalidLevel - validLevel) / 2,
    );
    const candidate = withAttributeLevel(
      configuration,
      attribute,
      candidateLevel,
    );
    if (evaluatePcBuild(candidate, audience).valid) {
      validLevel = candidateLevel;
    } else {
      invalidLevel = candidateLevel;
    }
  }
  return withAttributeLevel(configuration, attribute, validLevel);
}

function isBetterAutomaticBuild(
  candidate: PcBuildEvaluation,
  current: PcBuildEvaluation,
  audience?: PcAudience,
) {
  const scoreDifference = audience
    ? candidate.scores[audience] - current.scores[audience]
    : candidate.performance - current.performance;
  if (Math.abs(scoreDifference) > 1e-8) return scoreDifference > 0;
  if (Math.abs(candidate.quality - current.quality) > 1e-8) {
    return candidate.quality > current.quality;
  }
  const candidateWarnings = candidate.issues.filter(
    (item) => item.type === "warning",
  ).length;
  const currentWarnings = current.issues.filter(
    (item) => item.type === "warning",
  ).length;
  if (candidateWarnings !== currentWarnings) {
    return candidateWarnings < currentWarnings;
  }
  return candidate.buildCost < current.buildCost;
}

/**
 * Creates a deterministic, researched and compatible PC for the chosen
 * audience. Support systems are raised first; performance values then compete
 * for the remaining board, power and cooling budget in logarithmic steps.
 */
export function createBestCompatibleConfiguration(
  researchLevels: PcResearchLevels,
  audience?: PcAudience,
): PcConfiguration {
  const research = sanitizeResearchLevels(researchLevels);
  let configuration = createStarterConfiguration();

  for (const attribute of AUTO_BUILD_SUPPORT_ATTRIBUTES) {
    configuration = highestValidAttributeLevel(
      configuration,
      attribute,
      research[attribute],
      audience,
    );
  }

  const largestGap = AUTO_BUILD_PERFORMANCE_ATTRIBUTES.reduce(
    (largest, attribute) => Math.max(
      largest,
      research[attribute] - configuration[attribute],
    ),
    0,
  );
  let step = largestGap > 0
    ? 2 ** Math.floor(Math.log2(largestGap))
    : 0;
  let evaluation = evaluatePcBuild(configuration, audience);
  let evaluationBudget = 4_000;

  while (step >= 1 && evaluationBudget > 0) {
    let improvedAtCurrentStep = true;
    while (improvedAtCurrentStep && evaluationBudget > 0) {
      improvedAtCurrentStep = false;
      let bestConfiguration: PcConfiguration | null = null;
      let bestEvaluation = evaluation;

      for (const attribute of AUTO_BUILD_PERFORMANCE_ATTRIBUTES) {
        const targetLevel = Math.min(
          research[attribute],
          configuration[attribute] + step,
        );
        if (targetLevel <= configuration[attribute]) continue;
        const candidate = withAttributeLevel(
          configuration,
          attribute,
          targetLevel,
        );
        const candidateEvaluation = evaluatePcBuild(candidate, audience);
        evaluationBudget -= 1;
        if (
          candidateEvaluation.valid &&
          isBetterAutomaticBuild(candidateEvaluation, bestEvaluation, audience)
        ) {
          bestConfiguration = candidate;
          bestEvaluation = candidateEvaluation;
        }
        if (evaluationBudget <= 0) break;
      }

      if (bestConfiguration) {
        configuration = bestConfiguration;
        evaluation = bestEvaluation;
        improvedAtCurrentStep = true;
      }
    }
    step = Math.floor(step / 2);
  }

  return evaluation.valid && isConfigurationWithinResearch(configuration, research)
    ? configuration
    : createStarterConfiguration();
}

/** Builds a compatible product for a price segment instead of always using
 * every researched level. This lets older, cheaper parts remain useful. */
export function createSegmentConfiguration(
  researchLevels: PcResearchLevels,
  segment: PcMarketSegment,
): PcConfiguration {
  const research = sanitizeResearchLevels(researchLevels);
  const utilization = segment === "budget" ? 0.38 : segment === "mainstream" ? 0.7 : 1;
  const capped = Object.fromEntries(
    PC_RESEARCH_ATTRIBUTE_IDS.map((attribute) => [
      attribute,
      Math.max(1, 1 + Math.floor((research[attribute] - 1) * utilization)),
    ]),
  ) as PcResearchLevels;
  const audience: PcAudience = segment === "budget"
    ? "office"
    : segment === "performance"
      ? "gaming"
      : "creator";
  return createBestCompatibleConfiguration(capped, audience);
}

export function isConfigurationWithinResearch(
  configuration: PcConfiguration,
  researchLevels: PcResearchLevels,
) {
  return PC_RESEARCH_ATTRIBUTE_IDS.every(
    (attribute) =>
      levelOf(configuration[attribute]) <= levelOf(researchLevels[attribute]),
  );
}

export interface PcComponentSummary {
  category: PcPartCategory;
  name: string;
  specs: string[];
  cost: number;
  performance: number;
  power: number;
  heat: number;
  quality: number;
  cpuPowerLimit?: number;
  memoryLimit?: number;
  memorySpeedLimit?: number;
  expansionLevel?: number;
  wattage?: number;
  efficiency?: number;
  coolingCapacity?: number;
  noise?: number;
  airflow?: number;
  maxGpuPower?: number;
}

function qualityFromLevels(...levels: number[]) {
  const total = levels.reduce((sum, level) => sum + levelOf(level), 0);
  return Math.min(99.5, 40 + Math.log2(1 + total) * 11);
}

function componentSummaries(configuration: PcConfiguration): Record<PcPartCategory, PcComponentSummary> {
  const config = normalizePcConfiguration(configuration);
  const value = (attribute: PcResearchAttribute) => getPcAttributeValue(attribute, config[attribute]);

  const cpuCores = value("cpu.cores");
  const cpuClock = value("cpu.clock");
  const cpuEfficiency = value("cpu.efficiency") / 100;
  const cpuArchitecture = value("cpu.architecture");
  const cpuPerformance = safe(cpuCores ** 0.78 * cpuClock * (1 + (cpuArchitecture - 1) * 0.16) * 7);
  const cpuPower = safe((18 + cpuCores * cpuClock * (5.5 + cpuArchitecture * 0.8)) * cpuEfficiency);
  const cpu: PcComponentSummary = {
    category: "cpu",
    name: "Eigene CPU",
    specs: [
      formatPcAttributeValue("cpu.cores", config["cpu.cores"]),
      formatPcAttributeValue("cpu.clock", config["cpu.clock"]),
      `${integer.format(cpuPower)} W`,
      formatPcAttributeValue("cpu.architecture", config["cpu.architecture"]),
    ],
    cost: safe(25 + cpuCores * 10 + cpuClock * 14 + config["cpu.architecture"] ** 1.35 * 8 + config["cpu.efficiency"] ** 1.25 * 5),
    performance: cpuPerformance,
    power: cpuPower,
    heat: cpuPower * 0.94,
    quality: qualityFromLevels(config["cpu.cores"], config["cpu.clock"], config["cpu.efficiency"], config["cpu.architecture"]),
  };

  const gpuCompute = value("gpu.compute");
  const gpuClock = value("gpu.clock");
  const gpuMemory = value("gpu.memory");
  const gpuEfficiency = value("gpu.efficiency") / 100;
  const gpuPerformance = safe(gpuCompute ** 0.82 * gpuClock * Math.sqrt(gpuMemory) * 5);
  const gpuPower = safe((14 + gpuCompute * gpuClock * 3.4 + gpuMemory * 1.4) * gpuEfficiency);
  const gpu: PcComponentSummary = {
    category: "gpu",
    name: "Eigene GPU",
    specs: [
      formatPcAttributeValue("gpu.compute", config["gpu.compute"]),
      formatPcAttributeValue("gpu.clock", config["gpu.clock"]),
      formatPcAttributeValue("gpu.memory", config["gpu.memory"]),
      `${integer.format(gpuPower)} W`,
    ],
    cost: safe(22 + gpuCompute * 7 + gpuClock * 18 + gpuMemory * 5 + config["gpu.efficiency"] ** 1.25 * 6),
    performance: gpuPerformance,
    power: gpuPower,
    heat: gpuPower * 0.76,
    quality: qualityFromLevels(config["gpu.compute"], config["gpu.clock"], config["gpu.memory"], config["gpu.efficiency"]),
  };

  const memoryCapacity = value("memory.capacity");
  const memorySpeed = value("memory.speed");
  const memory: PcComponentSummary = {
    category: "memory",
    name: "Eigener RAM",
    specs: [
      formatPcAttributeValue("memory.capacity", config["memory.capacity"]),
      formatPcAttributeValue("memory.speed", config["memory.speed"]),
    ],
    cost: safe(10 + memoryCapacity * 2.1 + memorySpeed / 95),
    performance: safe(Math.sqrt(memoryCapacity) * Math.log2(memorySpeed / 400 + 1) * 2),
    power: safe(3 + memoryCapacity / 18 + memorySpeed / 4_000),
    heat: safe(2 + memoryCapacity / 28 + memorySpeed / 7_000),
    quality: qualityFromLevels(config["memory.capacity"], config["memory.speed"]),
  };

  const storageCapacity = value("storage.capacity");
  const storageSpeed = value("storage.speed");
  const storageReliability = value("storage.reliability");
  const storage: PcComponentSummary = {
    category: "storage",
    name: "Eigener Speicher",
    specs: [
      formatPcAttributeValue("storage.capacity", config["storage.capacity"]),
      formatPcAttributeValue("storage.speed", config["storage.speed"]),
      formatPcAttributeValue("storage.reliability", config["storage.reliability"]),
    ],
    cost: safe(14 + storageCapacity / 14 + storageSpeed / 38 + config["storage.reliability"] ** 1.25 * 3),
    performance: safe(Math.log2(storageCapacity / 125 + 1) * Math.sqrt(storageSpeed / 80) * 4),
    power: safe(4 + storageCapacity / 2_000 + storageSpeed / 2_500),
    heat: safe(3 + storageSpeed / 3_000),
    quality: Math.min(99.5, storageReliability * 0.86 + qualityFromLevels(config["storage.capacity"], config["storage.speed"]) * 0.14),
  };

  const cpuPowerLimit = value("motherboard.cpuLimit");
  const memoryLimit = value("motherboard.memoryLimit");
  const memorySpeedLimit = value("motherboard.memorySpeed");
  const expansionLevel = value("motherboard.expansion");
  const motherboard: PcComponentSummary = {
    category: "motherboard",
    name: "Eigenes Mainboard",
    specs: [
      formatPcAttributeValue("motherboard.cpuLimit", config["motherboard.cpuLimit"]),
      formatPcAttributeValue("motherboard.memoryLimit", config["motherboard.memoryLimit"]),
      formatPcAttributeValue("motherboard.memorySpeed", config["motherboard.memorySpeed"]),
      formatPcAttributeValue("motherboard.expansion", config["motherboard.expansion"]),
    ],
    cost: safe(24 + cpuPowerLimit * 0.34 + memoryLimit * 0.85 + memorySpeedLimit / 100 + expansionLevel ** 1.4 * 8),
    performance: safe(expansionLevel * 5 + Math.log2(memorySpeedLimit / 600 + 1) * 4),
    power: safe(17 + expansionLevel * 2 + memorySpeedLimit / 2_500),
    heat: safe(9 + expansionLevel * 1.5),
    quality: qualityFromLevels(config["motherboard.cpuLimit"], config["motherboard.memoryLimit"], config["motherboard.memorySpeed"], config["motherboard.expansion"]),
    cpuPowerLimit,
    memoryLimit,
    memorySpeedLimit,
    expansionLevel,
  };

  const wattage = value("psu.wattage");
  const psuEfficiency = value("psu.efficiency");
  const psuReliability = value("psu.reliability");
  const psu: PcComponentSummary = {
    category: "psu",
    name: "Eigenes Netzteil",
    specs: [
      formatPcAttributeValue("psu.wattage", config["psu.wattage"]),
      `${formatPcAttributeValue("psu.efficiency", config["psu.efficiency"])} Effizienz`,
      `${formatPcAttributeValue("psu.reliability", config["psu.reliability"])} Zuverlässigkeit`,
    ],
    cost: safe(18 + wattage * 0.095 + config["psu.efficiency"] ** 1.4 * 7 + config["psu.reliability"] ** 1.3 * 5),
    performance: safe(wattage / 12),
    power: 0,
    heat: safe(wattage * (1 - psuEfficiency / 100) * 0.12),
    quality: Math.min(99.5, psuReliability * 0.68 + psuEfficiency * 0.32),
    wattage,
    efficiency: psuEfficiency,
  };

  const coolingCapacity = value("cooling.capacity");
  const noise = value("cooling.noise");
  const cooling: PcComponentSummary = {
    category: "cooling",
    name: "Eigene Kühlung",
    specs: [
      formatPcAttributeValue("cooling.capacity", config["cooling.capacity"]),
      formatPcAttributeValue("cooling.noise", config["cooling.noise"]),
    ],
    cost: safe(8 + coolingCapacity * 0.31 + config["cooling.noise"] ** 1.35 * 5),
    performance: safe(coolingCapacity / 5 + Math.max(0, 42 - noise)),
    power: safe(2 + coolingCapacity / 95),
    heat: 0,
    quality: qualityFromLevels(config["cooling.capacity"], config["cooling.noise"]),
    coolingCapacity,
    noise,
  };

  const airflow = value("case.airflow");
  const maxGpuPower = value("case.gpuLimit");
  const caseQuality = value("case.quality");
  const pcCase: PcComponentSummary = {
    category: "case",
    name: "Eigenes Gehäuse",
    specs: [
      formatPcAttributeValue("case.airflow", config["case.airflow"]),
      formatPcAttributeValue("case.gpuLimit", config["case.gpuLimit"]),
      formatPcAttributeValue("case.quality", config["case.quality"]),
    ],
    cost: safe(16 + airflow * 0.32 + maxGpuPower * 0.09 + config["case.quality"] ** 1.35 * 5),
    performance: safe(airflow / 4),
    power: 0,
    heat: 0,
    quality: caseQuality,
    airflow,
    maxGpuPower,
  };

  return { cpu, gpu, memory, storage, motherboard, psu, cooling, case: pcCase };
}

export function getPcComponentSummary(
  configuration: PcConfiguration,
  category: PcPartCategory,
) {
  return componentSummaries(configuration)[category];
}

function issue(
  type: PcBuildIssue["type"],
  message: string,
  categories: PcPartCategory[],
): PcBuildIssue {
  return { type, message, categories };
}

function roundTo50(value: number) {
  return Math.max(199, Math.ceil(safe(value) / 50) * 50 - 1);
}

export function evaluatePcBuild(
  configuration: PcConfiguration,
  audience?: PcAudience,
): PcBuildEvaluation {
  const config = normalizePcConfiguration(configuration);
  const selected = componentSummaries(config);
  const issues: PcBuildIssue[] = [];
  const { cpu, gpu, memory, storage, motherboard, psu, cooling, case: pcCase } = selected;

  if (cpu.power > (motherboard.cpuPowerLimit ?? 0)) {
    issues.push(issue("error", `Die CPU benötigt ${integer.format(cpu.power)} W, das Mainboard unterstützt nur ${integer.format(motherboard.cpuPowerLimit ?? 0)} W.`, ["cpu", "motherboard"]));
  }
  const memoryCapacity = getPcAttributeValue("memory.capacity", config["memory.capacity"]);
  if (memoryCapacity > (motherboard.memoryLimit ?? 0)) {
    issues.push(issue("error", `${integer.format(memoryCapacity)} GB RAM überschreiten das Mainboard-Limit von ${integer.format(motherboard.memoryLimit ?? 0)} GB.`, ["memory", "motherboard"]));
  }
  const memorySpeed = getPcAttributeValue("memory.speed", config["memory.speed"]);
  if (memorySpeed > (motherboard.memorySpeedLimit ?? 0)) {
    issues.push(issue("error", `${integer.format(memorySpeed)} MHz RAM sind zu schnell für das Mainboard-Limit von ${integer.format(motherboard.memorySpeedLimit ?? 0)} MHz.`, ["memory", "motherboard"]));
  }
  if (gpu.power > (pcCase.maxGpuPower ?? 0)) {
    issues.push(issue("error", `Die GPU benötigt ${integer.format(gpu.power)} W Bauraum und Kühlung, das Gehäuse unterstützt nur ${integer.format(pcCase.maxGpuPower ?? 0)} W.`, ["gpu", "case"]));
  }

  const gpuPlatformLevel = Math.max(
    config["gpu.compute"],
    config["gpu.clock"],
    config["gpu.memory"],
  );
  const expansionGap = Math.max(
    0,
    gpuPlatformLevel - config["motherboard.expansion"] - 1,
  );
  const gpuInterfaceFactor = Math.max(0.55, 1 - expansionGap * 0.08);
  if (expansionGap > 0) {
    issues.push(issue("warning", "Die GPU ist moderner als die Mainboard-Schnittstelle und verliert Leistung.", ["gpu", "motherboard"]));
  }
  const storageSpeed = getPcAttributeValue("storage.speed", config["storage.speed"]);
  const storageLimit = 120 * 2.05 ** Math.max(0, config["motherboard.expansion"] - 1);
  const storageInterfaceFactor = Math.min(1, storageLimit / Math.max(1, storageSpeed));
  if (storageInterfaceFactor < 0.98) {
    issues.push(issue("warning", `Der Speicher erreicht am Mainboard nur etwa ${integer.format(storageLimit)} MB/s.`, ["storage", "motherboard"]));
  }

  const allParts = Object.values(selected);
  const buildCost = allParts.reduce((sum, part) => safe(sum + part.cost), 0);
  const totalPower = allParts.reduce((sum, part) => safe(sum + part.power), 0) + 12;
  const recommendedWattage = Math.ceil((totalPower * 1.3) / 50) * 50;
  if ((psu.wattage ?? 0) < recommendedWattage) {
    issues.push(issue("error", `${integer.format(recommendedWattage)} W empfohlen – das Netzteil liefert nur ${integer.format(psu.wattage ?? 0)} W.`, ["cpu", "gpu", "psu"]));
  } else if ((psu.wattage ?? 0) < recommendedWattage + 100) {
    issues.push(issue("warning", "Das Netzteil funktioniert, bietet aber wenig Reserve.", ["psu"]));
  }

  const coolingNeed = cpu.heat + gpu.heat * 0.32 + motherboard.heat * 0.35;
  const coolingCapacity = (cooling.coolingCapacity ?? 0) + (pcCase.airflow ?? 0) * 0.38;
  if (coolingCapacity < coolingNeed) {
    issues.push(issue("error", `${integer.format(coolingNeed)} W Kühlung nötig – verfügbar sind ${integer.format(coolingCapacity)} W.`, ["cpu", "gpu", "cooling", "case"]));
  } else if (coolingCapacity < coolingNeed * 1.15) {
    issues.push(issue("warning", "Die Kühlung reicht knapp und wird unter Last laut.", ["cooling", "case"]));
  }

  const reliability = allParts.reduce((sum, part) => sum + part.quality, 0) / allParts.length;
  const powerHeadroom = Math.max(0, (psu.wattage ?? 0) - recommendedWattage);
  const coolingHeadroom = Math.max(0, coolingCapacity - coolingNeed);
  const quality = Math.min(100, reliability * 0.9 + Math.min(5, powerHeadroom / 55) + Math.min(5, coolingHeadroom / 35));
  const cpuPerformance = cpu.performance;
  const gpuPerformance = gpu.performance * gpuInterfaceFactor;
  const memoryPerformance = memory.performance;
  const storagePerformance = storage.performance * storageInterfaceFactor;
  const platformPerformance = motherboard.performance;
  const office = cpuPerformance * 0.34 + memoryPerformance * 0.3 + storagePerformance * 0.24 + platformPerformance * 0.12 + quality * 0.2;
  const gaming = cpuPerformance * 0.23 + gpuPerformance * 0.48 + memoryPerformance * 0.14 + storagePerformance * 0.06 + quality * 0.12;
  const creator = cpuPerformance * 0.36 + gpuPerformance * 0.27 + memoryPerformance * 0.25 + storagePerformance * 0.12 + quality * 0.14;
  const scores = { office, gaming, creator };
  const performance = audience
    ? scores[audience]
    : office * 0.34 + gaming * 0.34 + creator * 0.32;
  const selectedLevels = PC_RESEARCH_ATTRIBUTE_IDS.map((attribute) => config[attribute]);
  const averageLevel = selectedLevels.reduce((sum, level) => sum + level, 0) / selectedLevels.length;
  const sortedLevels = [...selectedLevels].sort((left, right) => left - right);
  const platformLevel = sortedLevels[Math.floor((sortedLevels.length - 1) * 0.25)];
  const developmentCost = Math.round(safe(15_000 + buildCost * 78 + averageLevel ** 1.35 * 4_500));
  const suggestedPrice = roundTo50(150 + buildCost * (1.68 + quality / 260) + Math.sqrt(performance) * 18);
  const baseDemand = Math.max(7, 6 + Math.sqrt(performance) * 1.45 + quality * 0.045);

  return {
    valid: !issues.some((item) => item.type === "error"),
    issues,
    buildCost,
    developmentCost,
    suggestedPrice,
    totalPower,
    recommendedWattage,
    coolingNeed,
    coolingCapacity,
    performance,
    quality,
    baseDemand,
    tier: Math.max(1, Math.round(platformLevel)),
    scores,
  };
}

export function getPcConfigurationLabel(configuration: PcConfiguration) {
  const selected = componentSummaries(configuration);
  return `${selected.cpu.specs[0]} · ${selected.cpu.specs[1]} · ${selected.memory.specs[0]} RAM`;
}
