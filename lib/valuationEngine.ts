import type { Row } from "@/lib/dataPipeline";

export type ValuationCanonicalColumn = "per" | "pbr" | "peg" | "ev_ebitda";
export type ValuationSemanticColumn = ValuationCanonicalColumn | "market_cap" | "growth" | "price";
export type ValuationState = "VERY_CHEAP" | "CHEAP" | "FAIR" | "EXPENSIVE" | "VERY_EXPENSIVE";
export type ValuationConfidence = "HIGH" | "MEDIUM" | "LOW";
export type ValuationRiskSeverity = "HIGH" | "MEDIUM" | "LOW";
export type ValuationRegime = "Deep Value" | "Fair Value" | "Growth Premium" | "Speculative Bubble" | "Distressed" | "Recovery Repricing";
export type MultipleExpansionLabel = "HEALTHY_EXPANSION" | "SPECULATIVE_EXPANSION" | "COMPRESSION" | "VALUE_ROTATION";

export type ValuationColumnMapping = {
  canonical: ValuationSemanticColumn;
  source: string;
  confidence: number;
  method: "exact" | "alias" | "regex" | "value inference";
  semanticCategory: "valuation_multiple" | "size" | "growth" | "price";
};

export type ValuationSeriesPoint = {
  date: string;
  value: number;
  rawValue: unknown;
  flags: string[];
  state?: string;
};

export type ValuationSeriesMap = Partial<Record<ValuationCanonicalColumn, ValuationSeriesPoint[]>>;
export type ValuationSupplementalSeriesMap = Partial<Record<Exclude<ValuationSemanticColumn, ValuationCanonicalColumn>, ValuationSeriesPoint[]>>;
export type ValuationZScores = { z20: number | null; z60: number | null; z120: number | null };
export type ValuationPercentiles = { oneYear: number; threeYear: number; fullHistory: number };

export type ValuationIndicatorFeatures = {
  latestValue: number | null;
  displayValue: string;
  historicalPercentile: number;
  percentiles: ValuationPercentiles;
  state: ValuationState;
  zScores: ValuationZScores;
  historicalMean: number | null;
  historicalMedian: number | null;
  historicalMin: number | null;
  historicalMax: number | null;
  upperBand: number | null;
  lowerBand: number | null;
  premiumDiscount: number | null;
  trendDirection: "rising" | "falling" | "flat";
  trendSlope: number;
  momentum: number;
  expansionRate: number;
  meanReversionStrength: number;
  abnormalState: string | null;
  dataPoints: number;
  validStatPoints: number;
  hasNegatives: boolean;
  warningFlag: string | null;
  cleaningFlags: string[];
};

export type ValuationScoreComponents = {
  perScore: number;
  pbrScore: number;
  pegScore: number;
  evEbitdaScore: number;
};

export type ValuationScore = {
  total: number;
  components: ValuationScoreComponents;
  contribution: ValuationScoreComponents;
  dynamicWeights: ValuationScoreComponents;
  activeComponents: number;
  state: ValuationState;
  confidence: ValuationConfidence;
  mode: "NORMAL" | "GROWTH" | "DISTRESS" | "LIMITED_DATA";
};

export type MultipleExpansionAnalysis = {
  label: MultipleExpansionLabel;
  priceMomentum: number | null;
  growthMomentum: number | null;
  multipleMomentum: number;
  growthPremiumAcceleration: number;
  reratingScore: number;
  compressionScore: number;
  explanation: string;
};

export type ValuationRisk = {
  id: "value_trap" | "bubble" | "overvaluation_pressure" | "multiple_compression" | "growth_premium_instability" | "rerating_potential";
  label: string;
  severity: ValuationRiskSeverity;
  detected: boolean;
  description: string;
  value?: string;
  probability: number;
};

export type ValuationScenario = {
  case: "bull" | "base" | "bear";
  label: string;
  probability: number;
  drivers: string[];
  outlook: string;
};

export type ValuationSignalInterpretation = {
  bullish: string[];
  neutral: string[];
  warnings: string[];
  valueTrapWarnings: string[];
};

export type ValuationAISummary = {
  overall: string;
  historicalPositioning: string;
  fairValueInterpretation: string;
  bullishFactors: string[];
  bearishFactors: string[];
  riskWarnings: string[];
  scenarios: ValuationScenario[];
  interpretation: string;
};

export type ValuationAnalysis = {
  detected: boolean;
  dataType: "multi_factor" | "single_per" | "single_pbr" | "single_peg" | "single_ev_ebitda" | "snapshot" | "partial";
  dataTypeLabel: string;
  rowCount: number;
  dateRange: { start: string; end: string } | null;
  availableColumns: ValuationCanonicalColumn[];
  missingColumns: ValuationCanonicalColumn[];
  semanticColumns: ValuationSemanticColumn[];
  mapping: ValuationColumnMapping[];
  features: Partial<Record<ValuationCanonicalColumn, ValuationIndicatorFeatures>>;
  series: ValuationSeriesMap;
  supplementalSeries: ValuationSupplementalSeriesMap;
  score: ValuationScore;
  regime: ValuationRegime;
  regimeConfidence: number;
  meanReversionProbability: number;
  expansion: MultipleExpansionAnalysis;
  industryMedian: Partial<Record<ValuationCanonicalColumn, number>>;
  risks: ValuationRisk[];
  signals: ValuationSignalInterpretation;
  aiSummary: ValuationAISummary;
  warnings: string[];
  degradation: string[];
  hasHistoricalSeries: boolean;
};

export const VALUATION_INDICATOR_CONFIG: Record<ValuationCanonicalColumn, {
  label: string;
  unit: string;
  color: string;
  weight: number;
  description: string;
}> = {
  per: { label: "PER", unit: "x", color: "#38BDF8", weight: 0.30, description: "Price to earnings multiple" },
  pbr: { label: "PBR", unit: "x", color: "#22D3EE", weight: 0.25, description: "Price to book multiple" },
  peg: { label: "PEG", unit: "x", color: "#A78BFA", weight: 0.20, description: "Growth-adjusted PE multiple" },
  ev_ebitda: { label: "EV/EBITDA", unit: "x", color: "#34D399", weight: 0.25, description: "Enterprise value to EBITDA multiple" },
};

export const VALUATION_STATE_LABEL: Record<ValuationState, string> = {
  VERY_CHEAP: "VERY CHEAP",
  CHEAP: "CHEAP",
  FAIR: "FAIR",
  EXPENSIVE: "EXPENSIVE",
  VERY_EXPENSIVE: "VERY EXPENSIVE",
};

const MULTIPLE_COLUMNS: ValuationCanonicalColumn[] = ["per", "pbr", "peg", "ev_ebitda"];
const SEMANTIC_COLUMNS: ValuationSemanticColumn[] = [...MULTIPLE_COLUMNS, "market_cap", "growth", "price"];
const SCORE_KEYS: Record<ValuationCanonicalColumn, keyof ValuationScoreComponents> = {
  per: "perScore",
  pbr: "pbrScore",
  peg: "pegScore",
  ev_ebitda: "evEbitdaScore",
};

const COLUMN_ALIASES: Record<ValuationSemanticColumn, string[]> = {
  per: ["per", "pe", "p_e", "p/e", "pe_ratio", "price_earnings", "price_to_earnings", "trailing_pe", "forward_pe"],
  pbr: ["pbr", "pb", "p_b", "p/b", "pb_ratio", "price_book", "price_to_book"],
  peg: ["peg", "peg_ratio", "growth_adjusted_pe", "price_earnings_growth"],
  ev_ebitda: ["ev_ebitda", "ev/ebitda", "enterprise_multiple", "enterprise_value_multiple", "enterprise_value_ebitda", "ev_ebit", "ev_to_ebitda"],
  market_cap: ["market_cap", "mcap", "capitalization", "marketcap", "market_value"],
  growth: ["eps_growth", "revenue_growth", "earnings_growth", "growth", "sales_growth", "profit_growth"],
  price: ["close", "adj_close", "adjusted_close", "price", "last", "last_price"],
};

const COLUMN_REGEX: Record<ValuationSemanticColumn, RegExp[]> = {
  per: [/\bp\s*[\/_-]?\s*e\b/i, /price\s*(to)?\s*earnings/i, /(trailing|forward)\s*pe/i],
  pbr: [/\bp\s*[\/_-]?\s*b\b/i, /price\s*(to)?\s*book/i],
  peg: [/\bpeg\b/i, /growth\s*adjusted\s*pe/i],
  ev_ebitda: [/ev\s*[\/_-]?\s*ebit(da)?/i, /enterprise\s*value\s*multiple/i, /enterprise\s*multiple/i],
  market_cap: [/market\s*cap/i, /\bmcap\b/i, /capitalization/i],
  growth: [/(eps|revenue|earnings|sales|profit)\s*growth/i, /\bgrowth\b/i],
  price: [/^close$/i, /adj\s*close/i, /^price$/i, /last\s*price/i],
};

const DATE_REGEX = /date|datetime|period|quarter|year|fiscal|time|asof|as_of/i;
const DATE_VALUE_REGEX = /^(\d{4}([./-]\d{1,2}){0,2}|\d{4}\s?Q[1-4]|Q[1-4]\s?\d{4})$/i;

function semanticCategory(canonical: ValuationSemanticColumn): ValuationColumnMapping["semanticCategory"] {
  if (canonical === "market_cap") return "size";
  if (canonical === "growth") return "growth";
  if (canonical === "price") return "price";
  return "valuation_multiple";
}

function normalizeHeader(value: string) {
  return value.toLowerCase().trim().replace(/[\s().-]+/g, "_").replace(/__+/g, "_");
}

function compactHeader(value: string) {
  return value.toLowerCase().replace(/[\s_\-./()[\]{}]+/g, "");
}

function parseNumber(value: unknown): { value: number; flags: string[] } {
  const flags: string[] = [];
  if (value == null) return { value: NaN, flags: ["missing"] };
  if (typeof value === "number") return Number.isFinite(value) ? { value, flags } : { value: NaN, flags: ["infinite"] };
  let text = String(value).trim();
  if (!text || /^(nan|null|none|n\/a|na|-)$/i.test(text)) return { value: NaN, flags: ["missing"] };
  if (/inf(inity)?/i.test(text)) return { value: NaN, flags: ["infinite"] };
  if (text.includes(",")) flags.push("comma number");
  text = text.replace(/,/g, "");
  let multiplier = 1;
  if (/%$/.test(text)) {
    flags.push("percentage");
    text = text.replace(/%$/, "");
    multiplier = 0.01;
  }
  text = text.replace(/[$xX]/g, "").trim();
  const number = Number(text) * multiplier;
  if (!Number.isFinite(number)) return { value: NaN, flags: ["non numeric"] };
  if (typeof value === "string") flags.push("string number");
  return { value: number, flags };
}

function mean(values: number[]) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : NaN;
}

function std(values: number[]) {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 2) return 0;
  const m = mean(clean);
  return Math.sqrt(clean.reduce((sum, value) => sum + (value - m) ** 2, 0) / (clean.length - 1));
}

function median(values: number[]) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return NaN;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

function percentileRank(values: number[], value: number) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length || !Number.isFinite(value)) return 50;
  return (clean.filter((item) => item <= value).length / clean.length) * 100;
}

function slope(values: number[]) {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 2) return 0;
  const xs = clean.map((_, index) => index);
  const mx = mean(xs);
  const my = mean(clean);
  const numerator = xs.reduce((sum, x, index) => sum + (x - mx) * (clean[index] - my), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  return denominator ? numerator / denominator : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pctChange(values: number[], lookback = 1) {
  const clean = values.filter(Number.isFinite);
  if (clean.length <= lookback) return 0;
  const prev = clean[clean.length - 1 - lookback];
  const last = clean[clean.length - 1];
  return prev ? ((last - prev) / Math.abs(prev)) * 100 : 0;
}

function stateFromPercentile(percentile: number): ValuationState {
  if (percentile <= 20) return "VERY_CHEAP";
  if (percentile <= 40) return "CHEAP";
  if (percentile <= 60) return "FAIR";
  if (percentile <= 80) return "EXPENSIVE";
  return "VERY_EXPENSIVE";
}

function stateFromScore(score: number): ValuationState {
  if (score >= 80) return "VERY_CHEAP";
  if (score >= 60) return "CHEAP";
  if (score >= 40) return "FAIR";
  if (score >= 20) return "EXPENSIVE";
  return "VERY_EXPENSIVE";
}

function detectColumns(headers: string[], rows: Row[]) {
  const mapping: ValuationColumnMapping[] = [];
  let dateCol: string | null = headers.find((header) => DATE_REGEX.test(header)) ?? null;
  const normalized = headers.map((source) => ({ source, key: normalizeHeader(source), compact: compactHeader(source) }));

  for (const canonical of SEMANTIC_COLUMNS) {
    const aliases = COLUMN_ALIASES[canonical].map(compactHeader);
    const exact = normalized.find((column) => aliases.includes(column.compact));
    if (exact) {
      mapping.push({ canonical, source: exact.source, confidence: 0.98, method: exact.key === canonical ? "exact" : "alias", semanticCategory: semanticCategory(canonical) });
      continue;
    }
    const regex = normalized.find((column) => COLUMN_REGEX[canonical].some((rx) => rx.test(column.source) || rx.test(column.key)));
    if (regex) mapping.push({ canonical, source: regex.source, confidence: 0.82, method: "regex", semanticCategory: semanticCategory(canonical) });
  }

  if (!dateCol) {
    dateCol = headers.find((header) => {
      const samples = rows.slice(0, 8).map((row) => String(row[header] ?? "").trim()).filter(Boolean);
      return samples.length >= 3 && samples.filter((value) => DATE_VALUE_REGEX.test(value)).length / samples.length >= 0.6;
    }) ?? null;
  }

  return { mapping, dateCol };
}

function classifyPoint(canonical: ValuationSemanticColumn, value: number, industryMedian: number | null) {
  if (canonical === "per") {
    if (value < 0) return "LOSS_MAKING";
    if (value > 0 && value < 5) return "DISTRESSED_DEEP_VALUE";
    if (value > 60) return "SPECULATIVE_PREMIUM";
  }
  if (canonical === "pbr") {
    if (value < 0) return "INVALID";
    if (value > 0 && value < 0.7) return "ASSET_DISCOUNT";
    if (value > 8) return "PREMIUM_VALUATION";
  }
  if (canonical === "peg") {
    if (value < 0) return "UNRELIABLE_GROWTH_VALUATION";
    if (value > 0 && value < 0.5) return "UNDERPRICED_GROWTH";
    if (value > 4) return "OVERHEATING_GROWTH_VALUATION";
    if (value > 2) return "EXPENSIVE_GROWTH_PREMIUM";
  }
  if (canonical === "ev_ebitda") {
    if (value < 0) return "DISTRESSED_EARNINGS_STRUCTURE";
    if (industryMedian && value > 0 && value < industryMedian * 0.5) return "COMPRESSED_VALUATION";
    if (industryMedian && value > industryMedian * 2) return "EXTREME_PREMIUM_MULTIPLE";
  }
  return null;
}

function sortSeries(points: ValuationSeriesPoint[]) {
  const grouped = new Map<string, ValuationSeriesPoint>();
  points.forEach((point, index) => grouped.set(point.date || `Row ${index + 1}`, point));
  return Array.from(grouped.values()).sort((a, b) => {
    const ta = Date.parse(a.date);
    const tb = Date.parse(b.date);
    if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
    return a.date.localeCompare(b.date);
  });
}

function statValues(column: ValuationCanonicalColumn, values: number[]) {
  if (column === "pbr") return values.filter((value) => value > 0);
  if (column === "per") return values.filter((value) => value > 0);
  if (column === "peg") return values.filter((value) => value > 0);
  return values.filter(Number.isFinite);
}

function computeFeatures(column: ValuationCanonicalColumn, points: ValuationSeriesPoint[]): ValuationIndicatorFeatures {
  const values = points.map((point) => point.value).filter(Number.isFinite);
  const latestValue = values.at(-1) ?? null;
  const stats = statValues(column, values);
  const absStats = stats.map(Math.abs);
  const validLatest = latestValue == null || (column === "pbr" && latestValue <= 0) ? null : Math.abs(latestValue);
  const percentile = validLatest != null && absStats.length ? percentileRank(absStats, validLatest) : 50;
  const percentileWindow = (size: number) => validLatest != null ? percentileRank(absStats.slice(-size), validLatest) : 50;
  const historicalMean = stats.length ? mean(stats) : null;
  const historicalMedian = stats.length ? median(stats) : null;
  const s = std(stats);
  const recent = values.slice(-8);
  const trendSlope = slope(recent);
  const relativeSlope = Math.abs(trendSlope) / (Math.abs(mean(recent)) || 1);
  const trendDirection = relativeSlope < 0.01 ? "flat" : trendSlope > 0 ? "rising" : "falling";
  const cleaningFlags = Array.from(new Set(points.flatMap((point) => point.flags)));
  const abnormalState = points.at(-1)?.state ?? null;
  const zScore = (period: number) => {
    if (stats.length < period || validLatest == null) return null;
    const window = stats.slice(-period).map(Math.abs);
    const winStd = std(window);
    return winStd > 0 ? (validLatest - mean(window)) / winStd : 0;
  };
  const z20 = zScore(20);
  const z60 = zScore(60);
  const z120 = zScore(120);
  const expansionRate = pctChange(values, Math.min(20, Math.max(1, Math.floor(values.length / 4))));
  const stretch = Math.max(Math.abs(z20 ?? 0), Math.abs(z60 ?? 0), Math.abs(percentile - 50) / 20);
  const meanReversionStrength = clamp(Math.round(stretch * 24 + Math.abs(expansionRate) * 0.7), 0, 100);

  let warningFlag: string | null = null;
  if (abnormalState) warningFlag = abnormalState.replace(/_/g, " ");
  if (column === "ev_ebitda" && latestValue != null && latestValue < 0) warningFlag = "DISTRESSED EARNINGS STRUCTURE";

  return {
    latestValue,
    displayValue: latestValue == null ? "N/A" : `${latestValue.toFixed(2)}x`,
    historicalPercentile: percentile,
    percentiles: { oneYear: percentileWindow(252), threeYear: percentileWindow(756), fullHistory: percentile },
    state: stateFromPercentile(percentile),
    zScores: { z20, z60, z120 },
    historicalMean,
    historicalMedian,
    historicalMin: stats.length ? Math.min(...stats) : null,
    historicalMax: stats.length ? Math.max(...stats) : null,
    upperBand: historicalMedian != null ? historicalMedian + s : null,
    lowerBand: historicalMedian != null ? Math.max(0, historicalMedian - s) : null,
    premiumDiscount: historicalMean && validLatest != null ? ((validLatest - Math.abs(historicalMean)) / Math.abs(historicalMean)) * 100 : null,
    trendDirection,
    trendSlope,
    momentum: pctChange(values),
    expansionRate,
    meanReversionStrength,
    abnormalState,
    dataPoints: values.length,
    validStatPoints: stats.length,
    hasNegatives: values.some((value) => value < 0),
    warningFlag,
    cleaningFlags,
  };
}

function latestSeriesValue(points?: ValuationSeriesPoint[]) {
  return points?.map((point) => point.value).filter(Number.isFinite).at(-1) ?? null;
}

function computeExpansion(features: Partial<Record<ValuationCanonicalColumn, ValuationIndicatorFeatures>>, supplemental: ValuationSupplementalSeriesMap): MultipleExpansionAnalysis {
  const priceMomentum = supplemental.price ? pctChange(supplemental.price.map((point) => point.value), Math.min(20, supplemental.price.length - 1)) : null;
  const growthMomentum = supplemental.growth ? pctChange(supplemental.growth.map((point) => point.value), Math.min(8, supplemental.growth.length - 1)) : null;
  const multipleMomentum = mean(MULTIPLE_COLUMNS.map((column) => features[column]?.expansionRate ?? NaN).filter(Number.isFinite));
  const pegMomentum = features.peg?.expansionRate ?? 0;
  const growthPremiumAcceleration = clamp(Math.round((pegMomentum + (features.peg?.historicalPercentile ?? 50) - 50) * 0.8), -100, 100);
  const reratingScore = clamp(Math.round(Math.max(0, 50 - mean(MULTIPLE_COLUMNS.map((column) => features[column]?.historicalPercentile ?? NaN).filter(Number.isFinite))) + Math.max(0, growthMomentum ?? 0)), 0, 100);
  const compressionScore = clamp(Math.round(Math.max(0, -multipleMomentum) + Math.max(0, (growthMomentum ?? 0) - (priceMomentum ?? 0))), 0, 100);

  let label: MultipleExpansionLabel = "VALUE_ROTATION";
  if ((priceMomentum ?? 0) > (growthMomentum ?? 0) + 4 && multipleMomentum > 3) label = features.peg?.latestValue && features.peg.latestValue > 2 ? "SPECULATIVE_EXPANSION" : "HEALTHY_EXPANSION";
  if ((growthMomentum ?? 0) > (priceMomentum ?? 0) + 4 || multipleMomentum < -3) label = "COMPRESSION";
  if (reratingScore > 55 && multipleMomentum > 0) label = "VALUE_ROTATION";

  const explanation =
    label === "SPECULATIVE_EXPANSION" ? "Price and valuation multiples are expanding faster than growth, creating speculative rerating pressure." :
    label === "HEALTHY_EXPANSION" ? "Multiple expansion is supported by price momentum without clear overheating signals." :
    label === "COMPRESSION" ? "Growth or earnings proxy is improving faster than price/multiple expansion, implying valuation compression." :
    "Compressed multiples with improving growth create potential value rotation or rerating setup.";

  return { label, priceMomentum, growthMomentum, multipleMomentum: Number.isFinite(multipleMomentum) ? multipleMomentum : 0, growthPremiumAcceleration, reratingScore, compressionScore, explanation };
}

function dynamicWeights(features: Partial<Record<ValuationCanonicalColumn, ValuationIndicatorFeatures>>, available: ValuationCanonicalColumn[]) {
  const base: Record<ValuationCanonicalColumn, number> = { per: 0.30, pbr: 0.25, peg: 0.20, ev_ebitda: 0.25 };
  let mode: ValuationScore["mode"] = "NORMAL";
  if (available.length <= 1) mode = "LIMITED_DATA";
  if (features.peg && (features.peg.latestValue != null || features.peg.historicalPercentile > 65)) {
    base.peg += 0.12; base.per -= 0.05; base.pbr -= 0.04; base.ev_ebitda -= 0.03; mode = "GROWTH";
  }
  if ((features.per?.latestValue ?? 1) < 0 || (features.ev_ebitda?.latestValue ?? 1) < 0) {
    base.per = Math.max(0.08, base.per - 0.17); base.ev_ebitda += 0.15; base.pbr += 0.02; mode = "DISTRESS";
  }
  const total = available.reduce((sum, column) => sum + Math.max(0, base[column]), 0) || 1;
  const weights = { perScore: 0, pbrScore: 0, pegScore: 0, evEbitdaScore: 0 };
  available.forEach((column) => { weights[SCORE_KEYS[column]] = Math.max(0, base[column]) / total; });
  return { weights, mode };
}

function computeScore(features: Partial<Record<ValuationCanonicalColumn, ValuationIndicatorFeatures>>, available: ValuationCanonicalColumn[]): ValuationScore {
  const components: ValuationScoreComponents = { perScore: 0, pbrScore: 0, pegScore: 0, evEbitdaScore: 0 };
  const contribution: ValuationScoreComponents = { perScore: 0, pbrScore: 0, pegScore: 0, evEbitdaScore: 0 };
  const { weights, mode } = dynamicWeights(features, available);

  available.forEach((column) => {
    const feature = features[column];
    if (!feature) return;
    let score = 100 - feature.historicalPercentile;
    if (column === "peg" && feature.latestValue != null && feature.latestValue > 2) score *= feature.latestValue > 4 ? 0.35 : 0.68;
    if (column === "per" && feature.latestValue != null && feature.latestValue < 0) score = 18;
    if (column === "pbr" && feature.latestValue != null && feature.latestValue < 0) score = 5;
    if (column === "ev_ebitda" && feature.latestValue != null && feature.latestValue < 0) score = 10;
    if (feature.abnormalState === "UNDERPRICED_GROWTH" || feature.abnormalState === "ASSET_DISCOUNT" || feature.abnormalState === "COMPRESSED_VALUATION") score = Math.min(100, score + 12);
    if (feature.abnormalState === "SPECULATIVE_PREMIUM" || feature.abnormalState === "OVERHEATING_GROWTH_VALUATION" || feature.abnormalState === "EXTREME_PREMIUM_MULTIPLE") score *= 0.55;
    components[SCORE_KEYS[column]] = clamp(Math.round(score), 0, 100);
  });

  const total = clamp(Math.round(available.reduce((sum, column) => sum + components[SCORE_KEYS[column]] * weights[SCORE_KEYS[column]], 0)), 0, 100);
  available.forEach((column) => { contribution[SCORE_KEYS[column]] = Math.round(components[SCORE_KEYS[column]] * weights[SCORE_KEYS[column]] * 10) / 10; });
  const minPoints = Math.min(...available.map((column) => features[column]?.dataPoints ?? 0));
  const confidence: ValuationConfidence = available.length >= 3 && minPoints >= 20 ? "HIGH" : available.length >= 2 || minPoints >= 20 ? "MEDIUM" : "LOW";
  return { total, components, contribution, dynamicWeights: weights, activeComponents: available.length, state: stateFromScore(total), confidence, mode };
}

function detectRegime(score: ValuationScore, features: Partial<Record<ValuationCanonicalColumn, ValuationIndicatorFeatures>>, expansion: MultipleExpansionAnalysis): { regime: ValuationRegime; confidence: number } {
  const avgPct = mean(MULTIPLE_COLUMNS.map((column) => features[column]?.historicalPercentile ?? NaN).filter(Number.isFinite));
  const maxZ = Math.max(...MULTIPLE_COLUMNS.map((column) => Math.abs(features[column]?.zScores.z20 ?? 0)));
  const peg = features.peg?.latestValue ?? null;
  const per = features.per?.latestValue ?? null;
  const ev = features.ev_ebitda?.latestValue ?? null;
  let regime: ValuationRegime = "Fair Value";
  if ((per != null && per < 0) || (ev != null && ev < 0)) regime = "Distressed";
  else if ((peg != null && peg > 4) || (avgPct > 85 && maxZ > 2)) regime = "Speculative Bubble";
  else if ((peg != null && peg > 2) || (avgPct > 70 && expansion.label.includes("EXPANSION"))) regime = "Growth Premium";
  else if (avgPct < 25 && expansion.reratingScore > 45) regime = "Recovery Repricing";
  else if (avgPct < 30) regime = "Deep Value";
  const confidence = clamp(Math.round(45 + Math.abs(avgPct - 50) * 0.7 + maxZ * 12 + score.activeComponents * 6), 35, 96);
  return { regime, confidence };
}

function buildSignals(features: Partial<Record<ValuationCanonicalColumn, ValuationIndicatorFeatures>>, expansion: MultipleExpansionAnalysis, regime: ValuationRegime): ValuationSignalInterpretation {
  const bullish: string[] = [];
  const neutral: string[] = [];
  const warnings: string[] = [];
  const valueTrapWarnings: string[] = [];
  if (features.per?.historicalPercentile != null && features.per.historicalPercentile <= 25) bullish.push(`PER is in the historical lower ${features.per.historicalPercentile.toFixed(0)}% zone, indicating relative cheapness.`);
  if (features.pbr?.abnormalState === "ASSET_DISCOUNT") bullish.push("PBR is in an asset discount zone, supporting asset-based undervaluation.");
  if (features.peg?.abnormalState === "UNDERPRICED_GROWTH") bullish.push("PEG indicates possible underpriced growth.");
  if (expansion.reratingScore >= 55) bullish.push("Compressed valuation plus improving growth creates rerating potential.");
  if (features.per?.abnormalState === "SPECULATIVE_PREMIUM") warnings.push("PER is above 60x, indicating speculative premium.");
  if ((features.peg?.latestValue ?? 0) > 2) warnings.push("PEG suggests expensive growth premium.");
  if ((features.peg?.latestValue ?? 0) > 4) warnings.push("PEG is above 4x, indicating overheating growth valuation.");
  if (features.pbr?.abnormalState === "PREMIUM_VALUATION") warnings.push("PBR is above 8x, indicating premium valuation regime.");
  if (regime === "Speculative Bubble") warnings.push("Valuation regime is classified as Speculative Bubble.");
  if (features.per && features.per.historicalPercentile <= 30 && (latestGrowthProxy(features) ?? 0) < 0) valueTrapWarnings.push("Low PER is paired with falling growth proxy, raising value-trap risk.");
  if (!bullish.length) neutral.push("No decisive relative-undervaluation driver was detected.");
  if (!warnings.length) neutral.push("No major stretched-multiple warning was detected.");
  return { bullish, neutral, warnings, valueTrapWarnings };
}

function latestGrowthProxy(features: Partial<Record<ValuationCanonicalColumn, ValuationIndicatorFeatures>>) {
  return features.peg?.momentum != null ? -features.peg.momentum : null;
}

function detectRisks(features: Partial<Record<ValuationCanonicalColumn, ValuationIndicatorFeatures>>, expansion: MultipleExpansionAnalysis, regime: ValuationRegime): ValuationRisk[] {
  const lowPer = !!features.per && features.per.historicalPercentile <= 30;
  const fallingGrowth = (expansion.growthMomentum ?? latestGrowthProxy(features) ?? 0) < -2;
  const deterioratingMomentum = expansion.priceMomentum != null ? expansion.priceMomentum < -2 : expansion.multipleMomentum < -2;
  const valueTrap = lowPer && fallingGrowth && deterioratingMomentum;
  const bubble = ((features.peg?.latestValue ?? 0) > 4 || regime === "Speculative Bubble") && expansion.label === "SPECULATIVE_EXPANSION";
  const overvaluation = MULTIPLE_COLUMNS.some((column) => (features[column]?.historicalPercentile ?? 0) > 85 && (features[column]?.zScores.z20 ?? 0) > 2);
  const compression = expansion.compressionScore > 45 || (expansion.multipleMomentum < -5 && (expansion.growthMomentum ?? 0) <= 0);
  const instability = (features.peg?.latestValue ?? 0) > 2 && Math.abs(expansion.growthPremiumAcceleration) > 35;
  const rerating = expansion.reratingScore > 55 && !bubble;

  return [
    { id: "value_trap", label: "Value Trap Risk", detected: valueTrap, severity: valueTrap ? "HIGH" : "LOW", probability: valueTrap ? 78 : 18, description: valueTrap ? "Low PER is not enough: growth proxy and momentum are deteriorating, making cheapness potentially deceptive." : "No strong value-trap pattern from relative PER, growth proxy, and momentum.", value: features.per?.displayValue },
    { id: "bubble", label: "Bubble Risk", detected: bubble, severity: bubble ? "HIGH" : "LOW", probability: bubble ? 86 : 14, description: bubble ? "PEG is extreme and multiples are expanding, indicating accelerated growth-premium pricing." : "Growth premium does not meet bubble conditions.", value: features.peg?.displayValue },
    { id: "overvaluation_pressure", label: "Overvaluation Pressure", detected: overvaluation, severity: overvaluation ? "HIGH" : "LOW", probability: overvaluation ? 76 : 22, description: overvaluation ? "At least one valuation multiple is above the 85th percentile with z-score above 2." : "No high-percentile plus high-z-score overvaluation pressure detected." },
    { id: "multiple_compression", label: "Multiple Compression Risk", detected: compression, severity: compression ? "MEDIUM" : "LOW", probability: compression ? 62 : 24, description: compression ? "Multiples are falling faster than the available earnings/growth proxy can absorb." : "Compression pressure is not dominant." },
    { id: "growth_premium_instability", label: "Growth Premium Instability", detected: instability, severity: instability ? "MEDIUM" : "LOW", probability: instability ? 66 : 20, description: instability ? "PEG and premium acceleration are unstable, increasing rerating volatility." : "Growth premium appears stable or unsupported by available data." },
    { id: "rerating_potential", label: "Re-Rating Potential", detected: rerating, severity: rerating ? "MEDIUM" : "LOW", probability: rerating ? expansion.reratingScore : 18, description: rerating ? "Compressed valuation with improving growth supports recovery repricing potential." : "Rerating potential is limited by current relative valuation structure." },
  ];
}

function meanReversionProbability(features: Partial<Record<ValuationCanonicalColumn, ValuationIndicatorFeatures>>) {
  const strengths = MULTIPLE_COLUMNS.map((column) => features[column]?.meanReversionStrength ?? NaN).filter(Number.isFinite);
  const pctStretch = MULTIPLE_COLUMNS.map((column) => Math.abs((features[column]?.historicalPercentile ?? 50) - 50)).filter(Number.isFinite);
  return clamp(Math.round(mean(strengths) * 0.65 + mean(pctStretch) * 0.7), 0, 100);
}

function buildSummary(score: ValuationScore, features: Partial<Record<ValuationCanonicalColumn, ValuationIndicatorFeatures>>, signals: ValuationSignalInterpretation, risks: ValuationRisk[], expansion: MultipleExpansionAnalysis, regime: ValuationRegime, meanRev: number): ValuationAISummary {
  const available = MULTIPLE_COLUMNS.filter((column) => features[column]);
  const historicalPositioning = available.length
    ? available.map((column) => `${VALUATION_INDICATOR_CONFIG[column].label} ${features[column]!.percentiles.fullHistory.toFixed(0)}th percentile, 1Y ${features[column]!.percentiles.oneYear.toFixed(0)}th`).join("; ")
    : "No valuation multiple was detected.";
  const bullishFactors = signals.bullish.length ? signals.bullish : ["No explicit bullish valuation driver was detected."];
  const bearishFactors = [...signals.warnings, ...signals.valueTrapWarnings];
  if (!bearishFactors.length) bearishFactors.push("No major stretched-multiple or premium-instability factor detected.");
  const riskWarnings = risks.filter((risk) => risk.detected).map((risk) => `${risk.label}: ${risk.description}`);
  if (!riskWarnings.length) riskWarnings.push("No major valuation-specific risk trigger was detected.");
  const overall = `Valuation Score ${score.total}/100. Current regime: ${regime}. Historical positioning: ${historicalPositioning}. Mean reversion probability is ${meanRev}%.`;
  const fairValueInterpretation = available.map((column) => {
    const feature = features[column]!;
    return `${VALUATION_INDICATOR_CONFIG[column].label} trades ${feature.premiumDiscount == null ? "without enough mean history" : `${feature.premiumDiscount >= 0 ? "+" : ""}${feature.premiumDiscount.toFixed(1)}% vs historical mean`}`;
  }).join("; ");
  const bullP = clamp(score.total >= 60 ? 45 + meanRev * 0.25 : 25 + expansion.reratingScore * 0.25, 15, 70);
  const bearP = clamp(score.total <= 35 ? 45 + risks.filter((risk) => risk.detected).length * 8 : 22 + risks.filter((risk) => risk.severity === "HIGH" && risk.detected).length * 15, 15, 70);
  const baseP = Math.max(10, 100 - bullP - bearP);
  const scenarios: ValuationScenario[] = [
    { case: "bull", label: "Bull Case", probability: Math.round(bullP), drivers: bullishFactors.slice(0, 3), outlook: "Rerating occurs if compressed multiples normalize while growth does not deteriorate." },
    { case: "base", label: "Base Case", probability: Math.round(baseP), drivers: ["Valuation remains close to current historical band", expansion.label.replace(/_/g, " ")], outlook: "Market continues pricing current growth and risk assumptions without a decisive rerating." },
    { case: "bear", label: "Bear Case", probability: Math.round(bearP), drivers: bearishFactors.slice(0, 3), outlook: "Multiple compression accelerates if growth premium fades or high-percentile multiples revert." },
  ];
  const interpretation = `${overall} The market is pricing a ${regime.toLowerCase()} setup with ${expansion.label.replace(/_/g, " ").toLowerCase()} behavior. ${expansion.explanation} ${riskWarnings.join(" ")}`;
  return { overall, historicalPositioning, fairValueInterpretation, bullishFactors, bearishFactors, riskWarnings, scenarios, interpretation };
}

const EMPTY_SCORE: ValuationScore = {
  total: 50,
  components: { perScore: 0, pbrScore: 0, pegScore: 0, evEbitdaScore: 0 },
  contribution: { perScore: 0, pbrScore: 0, pegScore: 0, evEbitdaScore: 0 },
  dynamicWeights: { perScore: 0.30, pbrScore: 0.25, pegScore: 0.20, evEbitdaScore: 0.25 },
  activeComponents: 0,
  state: "FAIR",
  confidence: "LOW",
  mode: "LIMITED_DATA",
};

export function buildValuationAnalysis(rows: Row[]): ValuationAnalysis {
  const emptySignals: ValuationSignalInterpretation = { bullish: [], neutral: ["No valuation columns detected."], warnings: [], valueTrapWarnings: [] };
  const emptyExpansion: MultipleExpansionAnalysis = { label: "VALUE_ROTATION", priceMomentum: null, growthMomentum: null, multipleMomentum: 0, growthPremiumAcceleration: 0, reratingScore: 0, compressionScore: 0, explanation: "Valuation expansion analysis is inactive because no multiple was detected." };
  const emptySummary: ValuationAISummary = { overall: "No valuation data was detected.", historicalPositioning: "", fairValueInterpretation: "", bullishFactors: [], bearishFactors: [], riskWarnings: [], scenarios: [], interpretation: "Upload PER, PBR, PEG, EV/EBITDA, price, or growth columns to activate the institutional valuation engine." };
  const empty: ValuationAnalysis = {
    detected: false,
    dataType: "partial",
    dataTypeLabel: "VALUATION NOT DETECTED",
    rowCount: rows.length,
    dateRange: null,
    availableColumns: [],
    missingColumns: [...MULTIPLE_COLUMNS],
    semanticColumns: [],
    mapping: [],
    features: {},
    series: {},
    supplementalSeries: {},
    score: EMPTY_SCORE,
    regime: "Fair Value",
    regimeConfidence: 0,
    meanReversionProbability: 0,
    expansion: emptyExpansion,
    industryMedian: {},
    risks: [],
    signals: emptySignals,
    aiSummary: emptySummary,
    warnings: [],
    degradation: ["Valuation engine inactive: no recognized valuation semantic columns."],
    hasHistoricalSeries: false,
  };
  if (!rows.length) return empty;

  const headers = Object.keys(rows[0] ?? {});
  const { mapping, dateCol } = detectColumns(headers, rows);
  const multipleMappings = mapping.filter((item) => MULTIPLE_COLUMNS.includes(item.canonical as ValuationCanonicalColumn));
  if (!multipleMappings.length) return { ...empty, mapping, semanticColumns: mapping.map((item) => item.canonical) };

  const industryMedian: Partial<Record<ValuationCanonicalColumn, number>> = {};
  multipleMappings.forEach((item) => {
    const vals = rows.map((row) => parseNumber(row[item.source]).value).filter((value) => Number.isFinite(value) && value > 0);
    if (vals.length) industryMedian[item.canonical as ValuationCanonicalColumn] = median(vals);
  });

  const warnings = mapping.filter((item) => item.confidence < 0.7).map((item) => `Low confidence mapping: ${item.source} -> ${item.canonical} (${Math.round(item.confidence * 100)}%).`);
  const series: ValuationSeriesMap = {};
  const supplementalSeries: ValuationSupplementalSeriesMap = {};

  for (const item of mapping) {
    const points: ValuationSeriesPoint[] = [];
    rows.forEach((row, index) => {
      const parsed = parseNumber(row[item.source]);
      if (!Number.isFinite(parsed.value)) return;
      const date = dateCol ? String(row[dateCol] ?? `Row ${index + 1}`) : `Row ${index + 1}`;
      const state = classifyPoint(item.canonical, parsed.value, industryMedian[item.canonical as ValuationCanonicalColumn] ?? null);
      const flags = [...parsed.flags];
      if (state) flags.push(state.toLowerCase());
      points.push({ date, value: parsed.value, rawValue: row[item.source], flags, state: state ?? undefined });
    });
    const sorted = sortSeries(points);
    if (!sorted.length) continue;
    if (MULTIPLE_COLUMNS.includes(item.canonical as ValuationCanonicalColumn)) series[item.canonical as ValuationCanonicalColumn] = sorted;
    else supplementalSeries[item.canonical as keyof ValuationSupplementalSeriesMap] = sorted;
  }

  const availableColumns = multipleMappings.map((item) => item.canonical as ValuationCanonicalColumn).filter((column) => series[column]?.length);
  const features: Partial<Record<ValuationCanonicalColumn, ValuationIndicatorFeatures>> = {};
  availableColumns.forEach((column) => {
    const points = series[column];
    if (points?.length) features[column] = computeFeatures(column, points);
  });
  Object.entries(features).forEach(([column, feature]) => { if (feature?.warningFlag) warnings.push(`${column.toUpperCase()}: ${feature.warningFlag}`); });

  const expansion = computeExpansion(features, supplementalSeries);
  const score = computeScore(features, availableColumns);
  const regimeResult = detectRegime(score, features, expansion);
  const meanRev = meanReversionProbability(features);
  const signals = buildSignals(features, expansion, regimeResult.regime);
  const risks = detectRisks(features, expansion, regimeResult.regime);
  const aiSummary = buildSummary(score, features, signals, risks, expansion, regimeResult.regime, meanRev);
  const hasHistoricalSeries = availableColumns.some((column) => (series[column]?.length ?? 0) >= 2);
  const tooShortForZScore = availableColumns.every((column) => (series[column]?.length ?? 0) < 20);
  const degradation: string[] = [];
  if (availableColumns.length === 1 && availableColumns[0] === "per") degradation.push("Single-factor PER valuation mode active.");
  if (availableColumns.length === 1 && availableColumns[0] === "pbr") degradation.push("Asset-based PBR valuation mode active.");
  if (!hasHistoricalSeries) degradation.push("No historical series detected: static snapshot cards only.");
  if (tooShortForZScore) degradation.push("Data length < 20: rolling z-score analysis disabled.");
  if (!supplementalSeries.price) degradation.push("Price column missing: multiple expansion uses valuation multiples only.");
  if (!supplementalSeries.growth) degradation.push("Growth column missing: growth-premium and value-trap inference uses PEG/multiple proxy.");
  if (availableColumns.length < MULTIPLE_COLUMNS.length) degradation.push(`Missing valuation factors: ${MULTIPLE_COLUMNS.filter((column) => !availableColumns.includes(column)).join(", ")}.`);

  const firstSeries = availableColumns.map((column) => series[column]).find((points) => points?.length);
  const dateRange = firstSeries?.length ? { start: firstSeries[0].date, end: firstSeries[firstSeries.length - 1].date } : null;
  const dataType: ValuationAnalysis["dataType"] =
    !hasHistoricalSeries ? "snapshot" :
    availableColumns.length >= 3 ? "multi_factor" :
    availableColumns.length === 1 ? (`single_${availableColumns[0]}` as ValuationAnalysis["dataType"]) :
    "partial";

  return {
    detected: true,
    dataType,
    dataTypeLabel: `${dataType.replace(/_/g, " ").toUpperCase()} / ${score.mode}`,
    rowCount: rows.length,
    dateRange,
    availableColumns,
    missingColumns: MULTIPLE_COLUMNS.filter((column) => !availableColumns.includes(column)),
    semanticColumns: mapping.map((item) => item.canonical),
    mapping,
    features,
    series,
    supplementalSeries,
    score,
    regime: regimeResult.regime,
    regimeConfidence: regimeResult.confidence,
    meanReversionProbability: meanRev,
    expansion,
    industryMedian,
    risks,
    signals,
    aiSummary,
    warnings,
    degradation,
    hasHistoricalSeries,
  };
}
