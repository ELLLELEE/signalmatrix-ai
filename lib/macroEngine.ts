import type { Row } from "@/lib/dataPipeline";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MacroCanonicalColumn =
  | "vix" | "interest_rate" | "cpi" | "yield_10y" | "dxy"
  | "gdp_growth" | "unemployment" | "pmi" | "m2_growth" | "credit_spread";

export type MacroColumnMapping = { canonical: MacroCanonicalColumn; source: string; confidence: number };
export type DataFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "irregular" | "unknown";

export type MacroRegimeLabel =
  | "Risk-On" | "Risk-Off" | "Inflation Pressure" | "Rate Pressure"
  | "Dollar Strength Pressure" | "Liquidity Tightening" | "Liquidity Supportive"
  | "Volatility Spike" | "Mixed Macro Regime" | "Neutral Macro Regime"
  | "Risk-On Expansion" | "Late Cycle Tightening" | "Soft Landing"
  | "Inflation Shock" | "Liquidity Stress" | "Credit Stress"
  | "Recession Risk" | "Volatility Shock" | "Defensive Neutral"
  | "Transitional Regime";

export type MacroSemanticCategory =
  | "VOLATILITY" | "RATES" | "INFLATION" | "GROWTH" | "LABOR"
  | "CREDIT" | "LIQUIDITY" | "CURRENCY";

export type MacroCategoryState = {
  category: MacroSemanticCategory;
  labelKo: string;
  score: number;
  confidence: number;
  validMetricCount: number;
  anomalyCount: number;
  directionKo: string;
  confirmation: number;
  contributionPct: number;
  confirms: string[];
  contradicts: string[];
  metrics: MacroCanonicalColumn[];
};

export type MacroSemanticEngine = {
  categories: MacroCategoryState[];
  regimeLabel: MacroRegimeLabel;
  regimeKo: string;
  overallPressure: number;
  confidence: number;
  confirmationStrength: number;
  dominantDrivers: string[];
  contradictions: string[];
  excludedMetrics: string[];
  narrativeKo: string;
};

export type MacroRiskLevel =
  | "거시 환경 우호적" | "완만한 압박" | "혼재 / 중립" | "고압력 거시 환경" | "극단적 거시 스트레스";

export type MacroMetricType = "index" | "percentage" | "basis_points" | "amount" | "score";
export type MacroMetricDirection = "risk_up" | "risk_down" | "neutral";
export type MacroAnomalyStatus = "normal" | "warning" | "anomaly" | "insufficient";

export type StrictMacroMetric = {
  key: MacroCanonicalColumn;
  label: string;
  metricType: MacroMetricType;
  rawValue: number | null;
  displayValue: string;
  normalizedValue: number | null;
  scoreValue: number | null;
  riskContribution: number | null;
  unit: string;
  direction: MacroMetricDirection;
  confidence: number;
  anomalyStatus: MacroAnomalyStatus;
};

export type MacroIndicatorFeatures = {
  latestValue: number | null;
  displayValue: string;
  metric: StrictMacroMetric;
  shortTermChange: number | null;
  longTermChange: number | null;
  rollingMean: number | null;
  rollingStd: number | null;
  zScore: number | null;
  percentileRank: number;
  trendDirection: "상승" | "하락" | "보합";
  momentumTag: string;
  pressureTag: string;
  pressureLevel: number;
  signalConfidence: number;
  missingRatio: number;
  dataPoints: number;
  historicalMin: number | null;
  historicalMax: number | null;
  hasReliabilityWarning: boolean;
  reliabilityNote: string;
};

export type PressureContribution = {
  canonical: MacroCanonicalColumn;
  labelKo: string;
  pressureScore: number;
  effectiveWeight: number;
  contributionPct: number;
  zScore: number | null;
  percentileRank: number;
  explanationKo: string;
};

export type MacroRiskScore = {
  score: number;
  level: MacroRiskLevel;
  components: Partial<Record<MacroCanonicalColumn, number>>;
  activeComponentCount: number;
  warnings: string[];
};

export type MacroRegime = {
  label: MacroRegimeLabel;
  labelKo: string;
  confidence: number;
  descriptionKo: string;
  signals: string[];
  signalsKo: string[];
  alphaAdjustment: number;
  alphaNoteKo: string;
};

export type MacroSeriesPoint = { date: string; value: number };
export type MacroSeriesMap = Partial<Record<MacroCanonicalColumn, MacroSeriesPoint[]>>;

export type MacroSignal = {
  canonical: MacroCanonicalColumn;
  labelKo: string;
  value: string;
  pressureScore: number;
  trendDirection: "상승" | "하락" | "보합";
  direction: "bullish" | "bearish" | "neutral";
  directionKo: string;
  noteKo: string;
};

export type MacroAISummary = {
  headlineKo: string;
  overallKo: string;
  bullScenarioKo: string;
  baseScenarioKo: string;
  bearScenarioKo: string;
  keyRisksKo: string[];
  keySupportsKo: string[];
  keyDriversKo: string[];
  finalConditionLabelKo: string;
  investmentImplicationKo: string;
  alphaNoteKo: string;
};

export type MacroAlphaAdjustment = {
  adjustment: number;
  reasonKo: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

export type MacroAnalysis = {
  detected: boolean;
  dataMode: "full" | "standard" | "lite" | "summary";
  frequency: DataFrequency;
  dateRange: { start: string; end: string } | null;
  rowCount: number;
  confidence: number;
  confidenceScore: number;
  confidenceLabel: string;
  mapping: MacroColumnMapping[];
  availableIndicators: MacroCanonicalColumn[];
  features: Partial<Record<MacroCanonicalColumn, MacroIndicatorFeatures>>;
  series: MacroSeriesMap;
  normalizedSeries: MacroSeriesMap;
  riskScore: MacroRiskScore;
  pressureContributions: PressureContribution[];
  semantic: MacroSemanticEngine;
  regime: MacroRegime;
  signals: MacroSignal[];
  aiSummary: MacroAISummary;
  visualizationPlanKo: string;
  warnings: string[];
  alphaAdjustment: MacroAlphaAdjustment;
};

// ─── Column Config ────────────────────────────────────────────────────────────

export const INDICATOR_CONFIG: Record<MacroCanonicalColumn, { labelKo: string; unit: string; isPercent: boolean; isRaw: boolean; color: string }> = {
  vix:           { labelKo: "VIX 변동성지수",   unit: "",    isPercent: false, isRaw: true,  color: "#8B5CF6" },
  interest_rate: { labelKo: "기준금리",          unit: "%",   isPercent: true,  isRaw: false, color: "#FF6B6B" },
  cpi:           { labelKo: "CPI / 물가상승률",  unit: "%",   isPercent: true,  isRaw: false, color: "#FACC15" },
  yield_10y:     { labelKo: "10년 국채금리",     unit: "%",   isPercent: true,  isRaw: false, color: "#22C55E" },
  dxy:           { labelKo: "달러인덱스 (DXY)",  unit: "",    isPercent: false, isRaw: true,  color: "#3B82F6" },
  gdp_growth:    { labelKo: "GDP 성장률",        unit: "%",   isPercent: true,  isRaw: false, color: "#A78BFA" },
  unemployment:  { labelKo: "실업률",            unit: "%",   isPercent: true,  isRaw: false, color: "#94A3B8" },
  pmi:           { labelKo: "제조업 PMI",        unit: "",    isPercent: false, isRaw: true,  color: "#22d3ee" },
  m2_growth:     { labelKo: "M2 통화량 증가율",  unit: "%",   isPercent: true,  isRaw: false, color: "#34d399" },
  credit_spread: { labelKo: "크레딧 스프레드",   unit: "bps", isPercent: false, isRaw: false, color: "#f97316" },
};

const INVERSE_COLS = new Set<MacroCanonicalColumn>(["gdp_growth", "pmi"]);
const PERCENT_COLS = new Set<MacroCanonicalColumn>(["interest_rate", "yield_10y", "gdp_growth", "unemployment", "m2_growth"]);
const RISK_DOWN_COLS = new Set<MacroCanonicalColumn>(["gdp_growth", "pmi", "m2_growth"]);

// ─── Column Detection Tables ──────────────────────────────────────────────────

const NULL_STRS = new Set(["nan", "null", "none", "na", "n/a", "#n/a", "-", "--", "", "결측", "누락", "없음"]);

const MACRO_EXACT: Record<MacroCanonicalColumn, string[]> = {
  vix:           ["vix", "vix_index", "volatility_index", "cboe_vix", "fear_index", "implied_volatility", "market_volatility", "변동성", "공포지수", "변동성지수", "시장변동성", "내재변동성", "vix지수"],
  interest_rate: ["interest_rate", "fed_rate", "fed_funds_rate", "base_rate", "policy_rate", "ffr", "benchmark_rate", "central_bank_rate", "key_rate", "rate", "금리", "기준금리", "정책금리", "연방기금금리", "이자율"],
  cpi:           ["cpi", "inflation", "inflation_rate", "cpi_yoy", "consumer_price_index", "price_index", "headline_inflation", "core_cpi", "core_inflation", "물가", "소비자물가지수", "물가상승률", "인플레이션", "소비자물가", "물가지수"],
  yield_10y:     ["yield", "yield_10y", "10y_yield", "treasury_yield", "10yr_yield", "us_10y", "us10y", "bond_yield", "10year_yield", "t10y", "국채금리", "10년금리", "장기금리", "채권금리", "채권수익률", "국채수익률"],
  dxy:           ["dxy", "dollar_index", "usd_index", "dx_y", "usdx", "dollar_strength", "달러지수", "달러인덱스", "달러강세", "미달러지수"],
  gdp_growth:    ["gdp", "gdp_growth", "gdp_growth_rate", "real_gdp", "gdp_qoq", "gdp_yoy", "economic_growth", "경제성장률", "gdp성장률", "실질gdp", "경제성장"],
  unemployment:  ["unemployment", "unemployment_rate", "jobless_rate", "unemployment_pct", "실업률", "실업자수"],
  pmi:           ["pmi", "manufacturing_pmi", "ism_pmi", "pmi_manufacturing", "ism_manufacturing", "composite_pmi", "제조업pmi", "제조업지수", "pmi지수"],
  m2_growth:     ["m2", "m2_growth", "money_supply", "m2_yoy", "broad_money", "통화량", "m2증가율", "광의통화"],
  credit_spread: ["credit_spread", "hy_spread", "oas_spread", "high_yield_spread", "junk_spread", "신용스프레드", "크레딧스프레드", "하이일드스프레드"],
};

const MACRO_REGEX: Record<MacroCanonicalColumn, RegExp[]> = {
  vix:           [/\bvix\b|volatility.?index|fear.?index|market.?volat|공포지수|변동성지수|시장변동성/i],
  interest_rate: [/interest.?rate|fed.?rate|base.?rate|policy.?rate|\bffr\b|기준금리|이자율|정책금리/i],
  cpi:           [/\bcpi\b|inflation(?!.?spread)|consumer.?price|price.?index|소비자물가|물가상승|인플레/i],
  yield_10y:     [/\byield\b|treasury|bond.?rate|bond.?yield|10.?y(?:ear|r)?|국채|채권금리|채권수익/i],
  dxy:           [/\bdxy\b|dollar.?index|usd.?index|dollar.?strength|달러인덱스|달러지수|달러강세/i],
  gdp_growth:    [/\bgdp\b|economic.?growth|경제성장/i],
  unemployment:  [/unemployment|jobless|실업/i],
  pmi:           [/\bpmi\b|manufacturing.?index|제조업.?pmi|ism.?manufacturing/i],
  m2_growth:     [/\bm2\b|money.?supply|통화량/i],
  credit_spread: [/credit.?spread|hy.?spread|high.?yield.?spread|신용스프레드/i],
};

const MACRO_PRIORITY: MacroCanonicalColumn[] = [
  "vix", "interest_rate", "cpi", "yield_10y", "dxy",
  "gdp_growth", "unemployment", "pmi", "m2_growth", "credit_spread",
];

const BASE_WEIGHTS: Partial<Record<MacroCanonicalColumn, number>> = {
  vix: 0.25, interest_rate: 0.25, cpi: 0.20, yield_10y: 0.20, dxy: 0.10,
  gdp_growth: 0.15, unemployment: 0.10, pmi: 0.10, m2_growth: 0.05, credit_spread: 0.15,
};

const MACRO_CATEGORY: Record<MacroCanonicalColumn, MacroSemanticCategory> = {
  vix: "VOLATILITY",
  interest_rate: "RATES",
  yield_10y: "RATES",
  cpi: "INFLATION",
  gdp_growth: "GROWTH",
  pmi: "GROWTH",
  unemployment: "LABOR",
  credit_spread: "CREDIT",
  m2_growth: "LIQUIDITY",
  dxy: "CURRENCY",
};

const CATEGORY_LABEL_KO: Record<MacroSemanticCategory, string> = {
  VOLATILITY: "변동성",
  RATES: "금리",
  INFLATION: "인플레이션",
  GROWTH: "성장",
  LABOR: "노동시장",
  CREDIT: "크레딧",
  LIQUIDITY: "유동성",
  CURRENCY: "달러/환율",
};

const CATEGORY_WEIGHT: Record<MacroSemanticCategory, number> = {
  VOLATILITY: 0.16,
  RATES: 0.16,
  INFLATION: 0.14,
  GROWTH: 0.14,
  LABOR: 0.10,
  CREDIT: 0.14,
  LIQUIDITY: 0.08,
  CURRENCY: 0.08,
};

const DATE_COLS = ["date", "datetime", "time", "timestamp", "period", "month", "quarter", "year", "날짜", "일자", "기준일", "기간", "연월"];

// ─── Utilities ────────────────────────────────────────────────────────────────

const normKey = (s: string) => s.toLowerCase().replace(/[\s_()\[\]{}.‑-]/g, "").trim();
const isNull = (v: unknown): boolean => v == null || NULL_STRS.has(String(v).trim().toLowerCase());
const toNum = (v: unknown): number => { if (isNull(v)) return NaN; return Number(String(v).trim().replace(/,/g, "").replace(/%$/, "")); };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const fMean = (a: number[]) => { const f = a.filter(Number.isFinite); return f.length ? f.reduce((s, v) => s + v, 0) / f.length : NaN; };
const fStd = (a: number[]) => { const m = fMean(a); return Math.sqrt(fMean(a.map(v => (v - m) ** 2))); };
const fLast = (a: number[]) => { const f = a.filter(Number.isFinite); return f.length ? f[f.length - 1] : NaN; };

function pctile(sorted: number[], val: number): number {
  if (!sorted.length) return 50;
  let n = 0; for (const v of sorted) { if (v <= val) n++; }
  return n / sorted.length * 100;
}

function adaptiveWin(freq: DataFrequency): { short: number; long: number } {
  return freq === "daily"     ? { short: 20, long: 60 }
       : freq === "weekly"    ? { short: 4,  long: 12 }
       : freq === "monthly"   ? { short: 3,  long: 12 }
       : freq === "quarterly" ? { short: 4,  long: 8  }
       :                        { short: 10, long: 30 };
}

function parseDate(v: unknown): Date | null {
  if (isNull(v)) return null;
  const s = String(v).trim();
  const ymd = s.match(/^(\d{4})[.\/\-]?(\d{1,2})[.\/\-]?(\d{1,2})/);
  if (ymd) return new Date(Date.UTC(+ymd[1], +ymd[2] - 1, +ymd[3]));
  const qtr = s.match(/^(\d{4})Q([1-4])$/i);
  if (qtr) return new Date(Date.UTC(+qtr[1], (+qtr[2] - 1) * 3, 1));
  const ym = s.match(/^(\d{4})[\/\-](0?[1-9]|1[0-2])$/);
  if (ym) return new Date(Date.UTC(+ym[1], +ym[2] - 1, 1));
  const d = new Date(s); return isNaN(d.getTime()) ? null : d;
}

function findDateCol(rows: Row[]): string | null {
  if (!rows.length) return null;
  const cols = Object.keys(rows[0]);
  for (const col of cols) {
    if (DATE_COLS.map(normKey).includes(normKey(col))) {
      const hit = rows.slice(0, 15).filter(r => parseDate(r[col]) !== null).length;
      if (hit >= 3) return col;
    }
  }
  for (const col of cols) {
    const sample = rows.slice(0, 20);
    const hit = sample.filter(r => parseDate(r[col]) !== null).length;
    if (hit >= sample.length * 0.7) return col;
  }
  return null;
}

function detectFreq(dates: Date[]): DataFrequency {
  if (dates.length < 2) return "unknown";
  const gaps = dates.slice(1).map((d, i) => (d.getTime() - dates[i].getTime()) / 86400000).filter(g => g > 0 && g < 400);
  if (!gaps.length) return "unknown";
  const avg = fMean(gaps);
  return avg <= 2 ? "daily" : avg <= 8 ? "weekly" : avg <= 40 ? "monthly" : avg <= 120 ? "quarterly" : "irregular";
}

// ─── Column Detection ─────────────────────────────────────────────────────────

function detectMacroCols(rows: Row[]): MacroColumnMapping[] {
  if (!rows.length) return [];
  const cols = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const out: MacroColumnMapping[] = [];
  const used = new Set<string>();

  for (const canon of MACRO_PRIORITY) {
    const exacts = MACRO_EXACT[canon].map(normKey);
    const rxs = MACRO_REGEX[canon];
    // Exact match
    for (const col of cols) {
      if (used.has(col)) continue;
      if (exacts.includes(normKey(col))) {
        if (rows.map(r => toNum(r[col])).filter(Number.isFinite).length) {
          out.push({ canonical: canon, source: col, confidence: 0.95 }); used.add(col); break;
        }
      }
    }
    if (out.some(m => m.canonical === canon)) continue;
    // Regex match
    for (const col of cols) {
      if (used.has(col)) continue;
      if (rxs.some(rx => rx.test(col))) {
        if (rows.map(r => toNum(r[col])).filter(Number.isFinite).length) {
          out.push({ canonical: canon, source: col, confidence: 0.75 }); used.add(col); break;
        }
      }
    }
  }
  return out;
}

// ─── Series Extraction ────────────────────────────────────────────────────────

function extractSeries(rows: Row[], col: string, dateCol: string | null): MacroSeriesPoint[] {
  const pts: MacroSeriesPoint[] = [];
  for (let i = 0; i < rows.length; i++) {
    const val = toNum(rows[i][col]);
    if (!Number.isFinite(val)) continue;
    const raw = dateCol ? rows[i][dateCol] : null;
    const d = parseDate(raw);
    pts.push({ date: d ? d.toISOString().slice(0, 10) : String(i), value: val });
  }
  pts.sort((a, b) => a.date.localeCompare(b.date));
  // Deduplicate by date (average)
  const out: MacroSeriesPoint[] = [];
  let i = 0;
  while (i < pts.length) {
    const dt = pts[i].date; const grp: number[] = [];
    while (i < pts.length && pts[i].date === dt) { grp.push(pts[i].value); i++; }
    out.push({ date: dt, value: fMean(grp) });
  }
  return out;
}

function normSeries(pts: MacroSeriesPoint[]): MacroSeriesPoint[] {
  const vals = pts.map(p => p.value).filter(Number.isFinite);
  if (vals.length < 2) return pts.map(p => ({ ...p, value: 50 }));
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn;
  if (rng < 1e-10) return pts.map(p => ({ ...p, value: 50 }));
  return pts.map(p => ({ date: p.date, value: Math.round(((p.value - mn) / rng) * 100) }));
}

// ─── Display Formatting ───────────────────────────────────────────────────────

function fmtVal(val: number | null, canon: MacroCanonicalColumn): string {
  if (val === null || !Number.isFinite(val)) return "N/A";
  const cfg = INDICATOR_CONFIG[canon];
  if (cfg.isRaw) return val.toFixed(canon === "pmi" || canon === "dxy" ? 2 : 1);
  if (cfg.isPercent) {
    const pct = Math.abs(val) < 1.5 ? val * 100 : val;
    return `${pct.toFixed(2)}%`;
  }
  return `${Math.round(val)} bps`;
}

function metricTypeFor(canon: MacroCanonicalColumn, source = ""): MacroMetricType {
  const src = source.toLowerCase();
  if (canon === "credit_spread") return /bps|basis/.test(src) ? "basis_points" : "percentage";
  if (canon === "vix" || canon === "dxy" || canon === "pmi") return "index";
  if (canon === "cpi" && /index|consumer_price_index|price_index|지수/.test(src)) return "index";
  if (canon === "cpi") return "percentage";
  if (PERCENT_COLS.has(canon)) return "percentage";
  return "index";
}

function directionFor(canon: MacroCanonicalColumn): MacroMetricDirection {
  if (canon === "cpi") return "neutral";
  return RISK_DOWN_COLS.has(canon) ? "risk_down" : "risk_up";
}

function normalizePercentRaw(raw: number): number | null {
  if (!Number.isFinite(raw)) return null;
  if (Math.abs(raw) <= 1) return raw * 100;
  if (Math.abs(raw) <= 100) return raw;
  return null;
}

function scoreFromRange(value: number, low: number, high: number, direction: MacroMetricDirection): number {
  const norm = clamp((value - low) / Math.max(1e-9, high - low), 0, 1);
  const riskNorm = direction === "risk_down" ? 1 - norm : norm;
  return Math.round(clamp(riskNorm * 100, 0, 100));
}

function fmtStrictMetric(canon: MacroCanonicalColumn, metricType: MacroMetricType, value: number, unit: string) {
  if (metricType === "basis_points") return `${Math.round(value)} bps`;
  if (metricType === "percentage") return `${value.toFixed(Math.abs(value) < 10 ? 2 : 1)}%`;
  if (canon === "vix") return value.toFixed(1);
  if (canon === "dxy" || canon === "pmi") return value.toFixed(2);
  if (canon === "cpi" && metricType === "index") return value.toFixed(2);
  return unit ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}` : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function buildInvalidMetric(canon: MacroCanonicalColumn, rawValue: number | null, source: string, reason: string): StrictMacroMetric {
  const metricType = metricTypeFor(canon, source);
  const label = INDICATOR_CONFIG[canon].labelKo;
  return {
    key: canon,
    label,
    metricType,
    rawValue: Number.isFinite(rawValue ?? NaN) ? rawValue : null,
    displayValue: rawValue === null || !Number.isFinite(rawValue) ? "Invalid / out-of-range" : `${rawValue} anomaly`,
    normalizedValue: null,
    scoreValue: null,
    riskContribution: null,
    unit: INDICATOR_CONFIG[canon].unit,
    direction: directionFor(canon),
    confidence: 0,
    anomalyStatus: "anomaly",
  };
}

function validateMacroMetric(canon: MacroCanonicalColumn, rawValue: number | null, source = ""): StrictMacroMetric {
  const label = INDICATOR_CONFIG[canon].labelKo;
  const direction = directionFor(canon);
  let metricType = metricTypeFor(canon, source);
  let unit = INDICATOR_CONFIG[canon].unit;
  let value = rawValue;
  let low = 0;
  let high = 100;
  let status: MacroAnomalyStatus = "normal";

  if (value === null || !Number.isFinite(value)) {
    return { key: canon, label, metricType, rawValue: null, displayValue: "N/A", normalizedValue: null, scoreValue: null, riskContribution: null, unit, direction, confidence: 0, anomalyStatus: "insufficient" };
  }

  if (canon === "vix") {
    low = 5; high = 100;
    if (value < 5 || value > 100) return buildInvalidMetric(canon, rawValue, source, "VIX out of realistic range");
  } else if (canon === "dxy") {
    low = 70; high = 130;
    if (value < 40 || value > 200) return buildInvalidMetric(canon, rawValue, source, "DXY out of realistic range");
    if (value < 70 || value > 130) status = "warning";
  } else if (canon === "pmi") {
    low = 35; high = 65;
    if (value < 0 || value > 100) return buildInvalidMetric(canon, rawValue, source, "PMI out of realistic range");
  } else if (canon === "cpi") {
    const src = source.toLowerCase();
    const indexLike = /index|consumer_price_index|price_index|지수/.test(src) || (value >= 50 && value <= 400);
    if (indexLike) {
      metricType = "index"; unit = "";
      low = 50; high = 400;
      if (value < 50 || value > 400) return buildInvalidMetric(canon, rawValue, source, "CPI index out of realistic range");
      // CPI index level is contextual, not direct risk.
      return { key: canon, label, metricType, rawValue, displayValue: fmtStrictMetric(canon, metricType, value, unit), normalizedValue: clamp((value - low) / (high - low), 0, 1), scoreValue: 50, riskContribution: null, unit, direction: "neutral", confidence: 0.55, anomalyStatus: status };
    }
    const pct = normalizePercentRaw(value);
    if (pct === null || pct < -5 || pct > 20) return buildInvalidMetric(canon, rawValue, source, "inflation out of realistic range");
    value = pct; low = -5; high = 20; metricType = "percentage"; unit = "%";
  } else if (canon === "credit_spread") {
    const src = source.toLowerCase();
    const bpsMode = /bps|basis/.test(src) || value > 20;
    if (bpsMode) {
      metricType = "basis_points"; unit = "bps";
      if (value < 0 || value > 3000) return buildInvalidMetric(canon, rawValue, source, "credit spread bps out of realistic range");
      low = 50; high = 1000;
    } else {
      const pct = normalizePercentRaw(value);
      if (pct === null || pct < 0 || pct > 20) return buildInvalidMetric(canon, rawValue, source, "credit spread percent out of realistic range");
      value = pct; low = 0; high = 10; metricType = "percentage"; unit = "%";
    }
  } else if (canon === "interest_rate" || canon === "yield_10y" || canon === "unemployment") {
    const pct = normalizePercentRaw(value);
    if (pct === null || pct < 0 || pct > (canon === "unemployment" ? 30 : 25)) return buildInvalidMetric(canon, rawValue, source, "percentage macro metric out of realistic range");
    value = pct; low = 0; high = canon === "unemployment" ? 15 : 10; metricType = "percentage"; unit = "%";
  } else if (canon === "gdp_growth" || canon === "m2_growth") {
    const pct = normalizePercentRaw(value);
    if (pct === null || pct < -20 || pct > 20) return buildInvalidMetric(canon, rawValue, source, "growth metric out of realistic range");
    value = pct; low = -10; high = 10; metricType = "percentage"; unit = "%";
  }

  const scoreValue = canon === "cpi" && direction === "neutral" ? 50 : scoreFromRange(value, low, high, direction);
  const normalizedValue = clamp((value - low) / Math.max(1e-9, high - low), 0, 1);
  return {
    key: canon,
    label,
    metricType,
    rawValue,
    displayValue: fmtStrictMetric(canon, metricType, value, unit),
    normalizedValue,
    scoreValue,
    riskContribution: null,
    unit,
    direction,
    confidence: status === "warning" ? 0.65 : 0.9,
    anomalyStatus: status,
  };
}

function metricSeries(series: MacroSeriesPoint[], canon: MacroCanonicalColumn, source: string): MacroSeriesPoint[] {
  return series
    .map((p) => {
      const m = validateMacroMetric(canon, p.value, source);
      return m.scoreValue === null ? null : { date: p.date, value: m.scoreValue };
    })
    .filter((p): p is MacroSeriesPoint => p !== null);
}

// ─── Per-Indicator Feature Computation ────────────────────────────────────────

function computeFeatures(
  series: MacroSeriesPoint[],
  canon: MacroCanonicalColumn,
  freq: DataFrequency
): MacroIndicatorFeatures {
  const allVals = series.map(p => p.value);
  const valid = allVals.filter(Number.isFinite);
  const missingRatio = allVals.length > 0 ? (allVals.length - valid.length) / allVals.length : 0;
  const isInv = INVERSE_COLS.has(canon);

  if (!valid.length) return {
    latestValue: null, displayValue: "N/A", metric: validateMacroMetric(canon, null, ""), shortTermChange: null, longTermChange: null,
    rollingMean: null, rollingStd: null, zScore: null, percentileRank: 50,
    trendDirection: "보합", momentumTag: "데이터 없음", pressureTag: "알 수 없음",
    pressureLevel: 50, signalConfidence: 0, missingRatio: 1, dataPoints: 0,
    historicalMin: null, historicalMax: null,
    hasReliabilityWarning: true, reliabilityNote: "데이터 없음",
  };

  const { short: sW, long: lW } = adaptiveWin(freq);
  const ssW = Math.min(sW, valid.length - 1);
  const slW = Math.min(lW, valid.length - 1);

  const latest = valid[valid.length - 1];
  const shortPrev = ssW > 0 ? valid[valid.length - 1 - ssW] : null;
  const longPrev  = slW > 0 ? valid[valid.length - 1 - slW]  : null;
  const shortTC = shortPrev !== null ? latest - shortPrev : null;
  const longTC  = longPrev  !== null ? latest - longPrev  : null;

  const slice = valid.slice(-Math.max(slW + 1, 5));
  const rMean = fMean(slice);
  const rStd  = fStd(slice);
  const zScore = rStd > 1e-10 ? (latest - rMean) / rStd : 0;

  const sorted = [...valid].sort((a, b) => a - b);
  const pctileRank = pctile(sorted, latest);
  const effPctile = isInv ? 100 - pctileRank : pctileRank;

  const thr = (rStd || Math.abs(rMean) * 0.02 || 0.01) * 0.2;
  const trendDir: "상승" | "하락" | "보합" =
    shortTC === null ? "보합" : shortTC > thr ? "상승" : shortTC < -thr ? "하락" : "보합";

  const absZ = Math.abs(zScore);
  const momentumTag =
    trendDir === "상승" ? (absZ > 2 ? "강한 상승세" : absZ > 1 ? "완만한 상승" : "소폭 상승") :
    trendDir === "하락" ? (absZ > 2 ? "강한 하락세" : absZ > 1 ? "완만한 하락" : "소폭 하락") :
    "횡보";

  const isPressUp   = isInv ? trendDir === "하락" : trendDir === "상승";
  const isPressDown = isInv ? trendDir === "상승" : trendDir === "하락";
  const momentumAdj = isPressUp ? Math.min(14, absZ * 7) : isPressDown ? -Math.min(10, absZ * 5) : 0;
  const pressureLevel = Math.round(clamp(
    valid.length >= 5 ? effPctile * 0.70 + momentumAdj : clamp(50 + zScore * 15 * (isInv ? -1 : 1), 0, 100),
    0, 100
  ));

  const pressureTag = pressureLevel >= 75 ? "고압력" : pressureLevel >= 55 ? "중압력" : pressureLevel >= 35 ? "중립" : pressureLevel >= 20 ? "완화" : "저압력";

  const confBase = valid.length >= slW + 1 ? 85 : valid.length >= ssW + 2 ? 65 : valid.length >= 3 ? 40 : 15;
  const signalConfidence = clamp(confBase - Math.round(missingRatio * 20), 10, 92);
  const hasWarn = missingRatio > 0.2 || valid.length < 10;
  const reliabilityNote =
    valid.length < 3   ? "데이터 부족 (3개 미만)" :
    valid.length < 10  ? `데이터 포인트 적음 (${valid.length}개)` :
    missingRatio > 0.3 ? `결측값 비중 높음 (${Math.round(missingRatio * 100)}%)` :
    missingRatio > 0.1 ? `일부 결측값 존재 (${Math.round(missingRatio * 100)}%)` :
    "데이터 품질 양호";

  return {
    latestValue: latest, displayValue: fmtVal(latest, canon), metric: validateMacroMetric(canon, latest, ""),
    shortTermChange: shortTC, longTermChange: longTC,
    rollingMean: rMean, rollingStd: rStd > 1e-10 ? rStd : null,
    zScore: rStd > 1e-10 ? Math.round(zScore * 100) / 100 : null,
    percentileRank: Math.round(pctileRank),
    trendDirection: trendDir, momentumTag, pressureTag, pressureLevel,
    signalConfidence, missingRatio, dataPoints: valid.length,
    historicalMin: sorted[0] ?? null, historicalMax: sorted[sorted.length - 1] ?? null,
    hasReliabilityWarning: hasWarn, reliabilityNote,
  };
}

function computeStrictFeatures(
  series: MacroSeriesPoint[],
  canon: MacroCanonicalColumn,
  freq: DataFrequency,
  source = ""
): MacroIndicatorFeatures {
  const allVals = series.map(p => p.value);
  const metrics = series.map(p => validateMacroMetric(canon, p.value, source));
  const validMetrics = metrics.filter(m => m.scoreValue !== null && m.anomalyStatus !== "anomaly");
  const valid = validMetrics.map(m => m.scoreValue!).filter(Number.isFinite);
  const validRaw = validMetrics.map(m => m.rawValue).filter((v): v is number => v !== null && Number.isFinite(v));
  const latestRaw = allVals.filter(Number.isFinite).at(-1) ?? null;
  const latestMetric = validateMacroMetric(canon, latestRaw, source);
  const missingRatio = allVals.length ? (allVals.length - valid.length) / allVals.length : 1;

  if (!valid.length) return {
    latestValue: latestRaw,
    displayValue: latestMetric.displayValue,
    metric: latestMetric,
    shortTermChange: null,
    longTermChange: null,
    rollingMean: null,
    rollingStd: null,
    zScore: null,
    percentileRank: 50,
    trendDirection: "보합",
    momentumTag: "데이터 없음",
    pressureTag: latestMetric.anomalyStatus === "anomaly" ? "이상치 제외" : "압력 없음",
    pressureLevel: 50,
    signalConfidence: 0,
    missingRatio: 1,
    dataPoints: 0,
    historicalMin: null,
    historicalMax: null,
    hasReliabilityWarning: true,
    reliabilityNote: latestMetric.anomalyStatus === "anomaly" ? "비현실적 범위로 점수 계산에서 제외" : "데이터 없음",
  };

  const { short: sW, long: lW } = adaptiveWin(freq);
  const ssW = Math.min(sW, valid.length - 1);
  const slW = Math.min(lW, valid.length - 1);
  const latestScore = valid[valid.length - 1];
  const shortPrev = ssW > 0 ? valid[valid.length - 1 - ssW] : null;
  const longPrev = slW > 0 ? valid[valid.length - 1 - slW] : null;
  const shortTC = shortPrev !== null ? latestScore - shortPrev : null;
  const longTC = longPrev !== null ? latestScore - longPrev : null;
  const slice = valid.slice(-Math.max(slW + 1, 5));
  const rMean = fMean(slice);
  const rStd = fStd(slice);
  const zScore = rStd > 1e-10 ? (latestScore - rMean) / rStd : 0;
  const sorted = [...valid].sort((a, b) => a - b);
  const pctileRank = pctile(sorted, latestScore);
  const thr = (rStd || Math.abs(rMean) * 0.02 || 0.01) * 0.2;
  const trendDir: "상승" | "하락" | "보합" =
    shortTC === null ? "보합" : shortTC > thr ? "상승" : shortTC < -thr ? "하락" : "보합";
  const absZ = Math.abs(zScore);
  const momentumTag =
    trendDir === "상승" ? (absZ > 2 ? "강한 압력 상승" : absZ > 1 ? "완만한 압력 상승" : "소폭 압력 상승") :
    trendDir === "하락" ? (absZ > 2 ? "강한 압력 하락" : absZ > 1 ? "완만한 압력 하락" : "소폭 압력 하락") :
    "보합";
  const momentumAdj = trendDir === "상승" ? Math.min(10, absZ * 5) : trendDir === "하락" ? -Math.min(8, absZ * 4) : 0;
  const baseScore = latestMetric.scoreValue ?? latestScore;
  const pressureLevel = Math.round(clamp(baseScore * 0.78 + pctileRank * 0.14 + momentumAdj, 0, 100));
  const pressureTag = pressureLevel >= 75 ? "고압력" : pressureLevel >= 55 ? "중압력" : pressureLevel >= 35 ? "중립" : pressureLevel >= 20 ? "완화" : "저압력";
  const confBase = valid.length >= slW + 1 ? 85 : valid.length >= ssW + 2 ? 65 : valid.length >= 3 ? 40 : 15;
  const anomalyPenalty = metrics.filter(m => m.anomalyStatus === "anomaly").length * 8;
  const signalConfidence = clamp(Math.round((latestMetric.confidence * 100 + confBase) / 2) - Math.round(missingRatio * 20) - anomalyPenalty, 5, 92);
  const hasWarn = missingRatio > 0.2 || valid.length < 10 || latestMetric.anomalyStatus !== "normal" || anomalyPenalty > 0;
  const reliabilityNote =
    latestMetric.anomalyStatus === "anomaly" ? "최근값이 현실적 검증 범위를 벗어나 점수에서 제외" :
    anomalyPenalty > 0 ? "일부 이상치가 최종 점수에서 제외됨" :
    valid.length < 10 ? `검증 가능한 데이터가 적음 (${valid.length}개)` :
    missingRatio > 0.2 ? `결측/제외 비중 높음 (${Math.round(missingRatio * 100)}%)` :
    "검증 통과";

  return {
    latestValue: latestRaw,
    displayValue: latestMetric.displayValue,
    metric: { ...latestMetric, scoreValue: pressureLevel },
    shortTermChange: shortTC,
    longTermChange: longTC,
    rollingMean: rMean,
    rollingStd: rStd > 1e-10 ? rStd : null,
    zScore: rStd > 1e-10 ? Math.round(zScore * 100) / 100 : null,
    percentileRank: Math.round(pctileRank),
    trendDirection: trendDir,
    momentumTag,
    pressureTag,
    pressureLevel,
    signalConfidence,
    missingRatio,
    dataPoints: valid.length,
    historicalMin: validRaw.length ? Math.min(...validRaw) : null,
    historicalMax: validRaw.length ? Math.max(...validRaw) : null,
    hasReliabilityWarning: hasWarn,
    reliabilityNote,
  };
}

// ─── Risk Score Builder ───────────────────────────────────────────────────────

function buildRiskScore(
  features: Partial<Record<MacroCanonicalColumn, MacroIndicatorFeatures>>,
  available: MacroCanonicalColumn[]
): { riskScore: MacroRiskScore; pressureContributions: PressureContribution[] } {
  type Comp = { col: MacroCanonicalColumn; weight: number; pressure: number };
  const comps: Comp[] = available
    .filter(col => BASE_WEIGHTS[col] !== undefined && features[col] !== undefined && features[col]!.metric.scoreValue !== null && features[col]!.metric.anomalyStatus !== "anomaly" && features[col]!.dataPoints > 0)
    .map(col => ({ col, weight: BASE_WEIGHTS[col]!, pressure: features[col]!.pressureLevel }));

  if (!comps.length) return {
    riskScore: { score: 0, level: "혼재 / 중립", components: {}, activeComponentCount: 0, warnings: ["거시 지표 감지 없음"] },
    pressureContributions: [],
  };

  const totalW = comps.reduce((s, c) => s + c.weight, 0);
  const components: Partial<Record<MacroCanonicalColumn, number>> = {};
  let ws = 0;
  for (const c of comps) { components[c.col] = Math.round(c.pressure); ws += c.pressure * (c.weight / totalW); }

  const score = Math.round(clamp(ws, 0, 100));
  const level: MacroRiskLevel =
    score <= 25 ? "거시 환경 우호적" : score <= 45 ? "완만한 압박" :
    score <= 65 ? "혼재 / 중립"    : score <= 80 ? "고압력 거시 환경" : "극단적 거시 스트레스";

  const warnings: string[] = [];
  if (comps.length < 3) warnings.push("감지된 거시 지표 수 부족 — 점수 정확도 제한적");
  if (!available.includes("vix") && !available.includes("interest_rate"))
    warnings.push("핵심 지표(VIX·금리) 미감지 — 보조 지표 기반 점수");

  const excluded = available.filter(col => features[col]?.metric.anomalyStatus === "anomaly");
  if (excluded.length) warnings.push(`Data quality warning: ${excluded.map(col => INDICATOR_CONFIG[col].labelKo).join(", ")} excluded due to unrealistic ranges.`);

  const contributions: PressureContribution[] = comps
    .sort((a, b) => b.pressure - a.pressure)
    .map(c => {
      const feat = features[c.col]!;
      const ew = c.weight / totalW;
      const cPct = score > 0 ? Math.round((c.pressure * ew / score) * 100) : 0;
      feat.metric.riskContribution = c.pressure * ew;
      const pStr = `역사적 ${feat.percentileRank}백분위`;
      const tStr = feat.trendDirection === "상승" ? "단기 상승 모멘텀" : feat.trendDirection === "하락" ? "단기 하락 모멘텀" : "횡보세";
      return {
        canonical: c.col,
        labelKo: INDICATOR_CONFIG[c.col].labelKo,
        pressureScore: Math.round(c.pressure),
        effectiveWeight: Math.round(ew * 100),
        contributionPct: cPct,
        zScore: feat.zScore,
        percentileRank: feat.percentileRank,
        explanationKo: `${INDICATOR_CONFIG[c.col].labelKo}는 ${pStr}에 위치하며 ${tStr}을 보여 총 거시 압력의 ${cPct}%를 차지합니다.`,
      };
    });

  return { riskScore: { score, level, components, activeComponentCount: comps.length, warnings }, pressureContributions: contributions };
}

function macroLevelFromScore(score: number): MacroRiskLevel {
  return score <= 20 ? "거시 환경 우호적" :
    score <= 40 ? "완만한 압박" :
    score <= 60 ? "혼재 / 중립" :
    score <= 80 ? "고압력 거시 환경" :
    "극단적 거시 스트레스";
}

function capContributionShares<T extends { contributionPct: number }>(items: T[], cap: number): T[] {
  let capped = items.map(item => ({ ...item, contributionPct: Math.min(cap, Math.max(0, item.contributionPct)) }));
  const total = capped.reduce((s, item) => s + item.contributionPct, 0) || 1;
  capped = capped.map(item => ({ ...item, contributionPct: Math.round((item.contributionPct / total) * 100) }));
  return capped;
}

function getValidFeature(features: Partial<Record<MacroCanonicalColumn, MacroIndicatorFeatures>>, col: MacroCanonicalColumn) {
  const feat = features[col];
  if (!feat || feat.metric.anomalyStatus === "anomaly" || feat.metric.scoreValue === null || feat.dataPoints <= 0) return null;
  return feat;
}

function semanticConfirmation(category: MacroSemanticCategory, categoryScore: number, features: Partial<Record<MacroCanonicalColumn, MacroIndicatorFeatures>>) {
  const has = (col: MacroCanonicalColumn) => getValidFeature(features, col);
  const score = (col: MacroCanonicalColumn) => has(col)?.pressureLevel ?? null;
  const confirms: string[] = [];
  const contradicts: string[] = [];
  let confirmation = 0.72;

  const vix = score("vix"), credit = score("credit_spread"), labor = score("unemployment");
  const pmi = score("pmi"), gdp = score("gdp_growth"), rates = score("interest_rate"), y10 = score("yield_10y");
  const cpi = score("cpi"), dxy = score("dxy"), liq = score("m2_growth");

  if (category === "VOLATILITY") {
    if ((vix ?? categoryScore) >= 60 && (credit ?? 0) >= 55) { confirms.push("VIX와 크레딧 스프레드가 함께 스트레스를 확인"); confirmation += 0.16; }
    if ((vix ?? categoryScore) >= 60 && (labor ?? 0) >= 60) { confirms.push("변동성 상승과 노동 약화가 동반"); confirmation += 0.08; }
    if ((vix ?? categoryScore) >= 60 && (credit ?? 0) < 40 && (pmi ?? 50) < 55) contradicts.push("변동성은 높지만 크레딧/성장 확인은 제한적");
  }
  if (category === "RATES") {
    if ((rates ?? y10 ?? categoryScore) >= 60 && (cpi ?? 0) >= 55) { confirms.push("금리 압력과 인플레이션 압력이 동반"); confirmation += 0.14; }
    if ((rates ?? y10 ?? categoryScore) >= 60 && (pmi ?? 0) >= 60) { confirms.push("금리 상승이 성장 둔화와 결합"); confirmation += 0.08; }
    if ((rates ?? y10 ?? categoryScore) >= 60 && (cpi ?? 50) < 45) contradicts.push("금리 압력은 높지만 물가 압력 확인은 약함");
  }
  if (category === "INFLATION") {
    if ((cpi ?? categoryScore) >= 60 && ((rates ?? 0) >= 55 || (y10 ?? 0) >= 55)) { confirms.push("물가와 금리가 함께 긴축 압력을 확인"); confirmation += 0.16; }
    if ((cpi ?? categoryScore) < 45 && ((rates ?? 50) < 55) && ((pmi ?? 50) < 55)) { confirms.push("물가 둔화와 금리 안정이 소프트랜딩 조건을 지지"); confirmation += 0.10; }
  }
  if (category === "GROWTH") {
    if ((pmi ?? gdp ?? categoryScore) >= 60 && (labor ?? 0) >= 55) { confirms.push("성장 약화와 노동 약화가 경기 둔화 확인"); confirmation += 0.16; }
    if ((pmi ?? gdp ?? categoryScore) >= 60 && (credit ?? 0) >= 55) { confirms.push("성장 약화와 크레딧 스트레스가 동반"); confirmation += 0.12; }
    if ((pmi ?? gdp ?? categoryScore) >= 60 && (credit ?? 50) < 45 && (labor ?? 50) < 50) contradicts.push("성장 신호는 약하지만 크레딧/노동 확인은 제한적");
  }
  if (category === "LABOR") {
    if ((labor ?? categoryScore) >= 60 && ((pmi ?? 0) >= 55 || (gdp ?? 0) >= 55)) { confirms.push("노동 약화가 성장 둔화와 확인"); confirmation += 0.18; }
    if ((labor ?? categoryScore) >= 60 && (credit ?? 0) >= 55) { confirms.push("노동 약화와 크레딧 위험이 동반"); confirmation += 0.10; }
    if ((labor ?? categoryScore) >= 60 && (pmi ?? 50) < 50 && (credit ?? 50) < 50) { confirmation -= 0.20; contradicts.push("노동 스트레스는 있지만 경기/크레딧 확인이 부족해 단독 지배를 제한"); }
  }
  if (category === "CREDIT") {
    if ((credit ?? categoryScore) >= 60 && (vix ?? 0) >= 55) { confirms.push("크레딧 스프레드와 변동성이 함께 위험 회피 확인"); confirmation += 0.16; }
    if ((credit ?? categoryScore) >= 60 && ((pmi ?? 0) >= 55 || (labor ?? 0) >= 60)) { confirms.push("크레딧 스트레스가 실물 둔화와 동반"); confirmation += 0.12; }
  }
  if (category === "LIQUIDITY") {
    if ((liq ?? categoryScore) >= 55 && (dxy ?? 0) >= 55) { confirms.push("유동성 위축과 달러 강세가 동반"); confirmation += 0.14; }
    if ((liq ?? categoryScore) >= 55 && ((rates ?? 0) >= 55 || (y10 ?? 0) >= 55)) { confirms.push("유동성 위축과 금리 압력이 동반"); confirmation += 0.10; }
  }
  if (category === "CURRENCY") {
    if ((dxy ?? categoryScore) >= 60 && ((rates ?? 0) >= 55 || (y10 ?? 0) >= 55)) { confirms.push("달러 강세와 금리 상승이 글로벌 유동성 압박 확인"); confirmation += 0.14; }
    if ((dxy ?? categoryScore) >= 60 && (liq ?? 0) >= 55) { confirms.push("달러 강세와 유동성 위축이 동반"); confirmation += 0.10; }
  }

  return { confirmation: clamp(confirmation, 0.45, 1.12), confirms, contradicts };
}

function buildSemanticEngine(
  features: Partial<Record<MacroCanonicalColumn, MacroIndicatorFeatures>>,
  available: MacroCanonicalColumn[]
): { semantic: MacroSemanticEngine; riskScore: MacroRiskScore; pressureContributions: PressureContribution[]; regime: MacroRegime; aiSummary: MacroAISummary; confidence: number } {
  const valid = available.filter(col => getValidFeature(features, col));
  const excluded = available.filter(col => features[col]?.metric.anomalyStatus === "anomaly");
  const byCategory = new Map<MacroSemanticCategory, MacroCanonicalColumn[]>();
  for (const col of valid) {
    const cat = MACRO_CATEGORY[col];
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), col]);
  }

  const categoryStatesRaw: MacroCategoryState[] = Array.from(byCategory.entries()).map(([category, cols]) => {
    const feats = cols.map(col => getValidFeature(features, col)!).filter(Boolean);
    const score = Math.round(fMean(feats.map(f => f.pressureLevel)));
    const baseConfidence = fMean(feats.map(f => f.signalConfidence)) / 100;
    const confirm = semanticConfirmation(category, score, features);
    return {
      category,
      labelKo: CATEGORY_LABEL_KO[category],
      score,
      confidence: clamp(baseConfidence * confirm.confirmation, 0.1, 0.98),
      validMetricCount: feats.length,
      anomalyCount: available.filter(col => MACRO_CATEGORY[col] === category && features[col]?.metric.anomalyStatus === "anomaly").length,
      directionKo: score >= 65 ? "압력 상승" : score <= 35 ? "압력 완화" : "중립",
      confirmation: confirm.confirmation,
      contributionPct: 0,
      confirms: confirm.confirms,
      contradicts: confirm.contradicts,
      metrics: cols,
    };
  });

  const rawCategoryParts = categoryStatesRaw.map(cat => {
    const weighted = cat.score * CATEGORY_WEIGHT[cat.category] * cat.confirmation * cat.confidence;
    return { ...cat, rawContribution: weighted };
  });
  const rawTotal = rawCategoryParts.reduce((s, c) => s + c.rawContribution, 0) || 1;
  const cappedCats = capContributionShares(rawCategoryParts.map(c => ({ ...c, contributionPct: Math.round((c.rawContribution / rawTotal) * 100) })), 45);
  const categoryStates = cappedCats.map(({ rawContribution, ...c }) => c);

  const metricRaw = valid.map(col => {
    const feat = getValidFeature(features, col)!;
    const cat = categoryStates.find(c => c.category === MACRO_CATEGORY[col]);
    const categoryShare = cat?.contributionPct ?? 0;
    const siblingCount = Math.max(1, cat?.metrics.length ?? 1);
    const scoreShare = Math.max(1, Math.round(categoryShare * (feat.pressureLevel / Math.max(1, fMean((cat?.metrics ?? [col]).map(m => getValidFeature(features, m)?.pressureLevel ?? 0)))) / siblingCount));
    return { col, contributionPct: scoreShare };
  });
  const metricCapped = capContributionShares(metricRaw, 35);

  const pressureContributions: PressureContribution[] = metricCapped
    .map(item => {
      const feat = getValidFeature(features, item.col)!;
      feat.metric.riskContribution = item.contributionPct;
      return {
        canonical: item.col,
        labelKo: INDICATOR_CONFIG[item.col].labelKo,
        pressureScore: Math.round(feat.pressureLevel),
        effectiveWeight: Math.round(CATEGORY_WEIGHT[MACRO_CATEGORY[item.col]] * 100),
        contributionPct: item.contributionPct,
        zScore: feat.zScore,
        percentileRank: feat.percentileRank,
        explanationKo: `${CATEGORY_LABEL_KO[MACRO_CATEGORY[item.col]]} 범주의 검증된 ${INDICATOR_CONFIG[item.col].labelKo} 신호입니다. 단독 raw 값이 아니라 scoreValue, 카테고리 가중치, 확인 강도, 신뢰도를 함께 반영했습니다.`,
      };
    })
    .sort((a, b) => b.contributionPct - a.contributionPct);

  const categoryPressure = categoryStates.reduce((s, c) => s + c.score * (c.contributionPct / 100), 0);
  const overallPressure = Math.round(clamp(categoryPressure, 0, 100));
  const coverage = new Set(categoryStates.map(c => c.category)).size / 8;
  const anomalyRatio = available.length ? excluded.length / available.length : 0;
  const confirmationStrength = categoryStates.length ? fMean(categoryStates.map(c => c.confirmation)) : 0.4;
  const missingCritical = ["RATES", "GROWTH", "LABOR"].filter(cat => !categoryStates.some(c => c.category === cat)).length;
  const semanticConfidence = clamp(coverage * 0.35 + confirmationStrength * 0.35 + Math.min(1, valid.length / 5) * 0.25 - anomalyRatio * 0.25 - missingCritical * 0.06, 0.1, 0.95);

  const getCat = (cat: MacroSemanticCategory) => categoryStates.find(c => c.category === cat)?.score ?? null;
  const vol = getCat("VOLATILITY"), rates = getCat("RATES"), inf = getCat("INFLATION"), growth = getCat("GROWTH");
  const labor = getCat("LABOR"), credit = getCat("CREDIT"), liq = getCat("LIQUIDITY"), currency = getCat("CURRENCY");

  let regimeLabel: MacroRegimeLabel = "Transitional Regime";
  let regimeKo = "전환 국면";
  if ((credit ?? 0) >= 65 && (vol ?? 0) >= 55) { regimeLabel = "Credit Stress"; regimeKo = "크레딧 스트레스"; }
  else if ((vol ?? 0) >= 75) { regimeLabel = "Volatility Shock"; regimeKo = "변동성 충격"; }
  else if ((growth ?? 0) >= 60 && (labor ?? 0) >= 60) { regimeLabel = "Recession Risk"; regimeKo = "침체 위험"; }
  else if ((inf ?? 0) >= 65 && (rates ?? 0) >= 55) { regimeLabel = "Inflation Shock"; regimeKo = "인플레이션 충격"; }
  else if ((currency ?? 0) >= 60 && ((rates ?? 0) >= 55 || (liq ?? 0) >= 55)) { regimeLabel = "Liquidity Stress"; regimeKo = "유동성 스트레스"; }
  else if ((rates ?? 0) >= 60 && (inf ?? 0) >= 50 && (growth ?? 50) < 60) { regimeLabel = "Late Cycle Tightening"; regimeKo = "후기 사이클 긴축"; }
  else if ((inf ?? 50) <= 45 && (rates ?? 50) <= 55 && (growth ?? 50) <= 50) { regimeLabel = "Soft Landing"; regimeKo = "소프트랜딩"; }
  else if (overallPressure <= 35 && (growth ?? 50) <= 45) { regimeLabel = "Risk-On Expansion"; regimeKo = "위험선호 확장"; }
  else if (overallPressure >= 45 && overallPressure <= 62) { regimeLabel = "Defensive Neutral"; regimeKo = "방어적 중립"; }

  const dominantDrivers = categoryStates.slice().sort((a, b) => b.contributionPct - a.contributionPct).slice(0, 3).map(c => `${c.labelKo} ${c.score}/100`);
  const contradictions = categoryStates.flatMap(c => c.contradicts).slice(0, 4);
  const excludedMetrics = excluded.map(col => `${INDICATOR_CONFIG[col].labelKo} raw ${features[col]?.metric.rawValue}`);
  const narrativeKo = contradictions.length
    ? `${regimeKo}입니다. ${dominantDrivers.join(", ")}가 핵심이지만, ${contradictions[0]} 때문에 단일 지표 결론은 제한됩니다.`
    : `${regimeKo}입니다. ${dominantDrivers.join(", ")}가 서로 확인되며 전체 매크로 압력은 ${overallPressure}/100입니다.`;

  const warnings: string[] = [];
  if (excluded.length) warnings.push(`Data quality warning: ${excludedMetrics.join(", ")} 이상치가 해석과 기여도에서 제외되었습니다.`);
  if (semanticConfidence < 0.45) warnings.push("카테고리 커버리지와 확인 강도가 낮아 매크로 해석 신뢰도가 낮습니다.");
  if (missingCritical) warnings.push("성장/노동/금리 중 일부 핵심 카테고리가 없어 레짐 판단을 보수적으로 낮췄습니다.");

  const components: Partial<Record<MacroCanonicalColumn, number>> = {};
  for (const c of valid) components[c] = getValidFeature(features, c)!.pressureLevel;
  const riskScore: MacroRiskScore = {
    score: overallPressure,
    level: macroLevelFromScore(overallPressure),
    components,
    activeComponentCount: valid.length,
    warnings,
  };

  const regime: MacroRegime = {
    label: regimeLabel,
    labelKo: regimeKo,
    confidence: semanticConfidence,
    descriptionKo: narrativeKo,
    signals: [],
    signalsKo: [
      ...categoryStates.flatMap(c => c.confirms).slice(0, 4),
      ...contradictions.map(c => `반증: ${c}`),
    ],
    alphaAdjustment: overallPressure >= 80 ? -14 : overallPressure >= 60 ? -7 : overallPressure <= 25 ? 6 : 0,
    alphaNoteKo: overallPressure >= 60 ? "매크로 압력이 높아 위험자산 알파 신뢰도를 보수적으로 조정합니다." : overallPressure <= 35 ? "매크로 환경은 위험자산에 우호적이지만 다른 모듈 확인이 필요합니다." : "매크로는 중립 레이어로 작동하며 단독 방향 신호로 쓰지 않습니다.",
  };

  const top = pressureContributions[0];
  const aiSummary: MacroAISummary = {
    headlineKo: `${regimeKo} · 매크로 압력 ${overallPressure}/100`,
    overallKo: narrativeKo,
    bullScenarioKo: "물가와 금리가 안정되고 성장 지표가 개선되면 소프트랜딩 또는 위험선호 확장으로 전환될 수 있습니다.",
    baseScenarioKo: `${regimeKo} 유지. 현재 확인된 카테고리와 반증 신호를 함께 보면 단일 지표보다 복합 레짐 판단이 우선입니다.`,
    bearScenarioKo: "변동성, 크레딧, 노동 또는 성장 약화가 동시에 확인되면 침체/시스템 리스크 국면으로 악화될 수 있습니다.",
    keyRisksKo: categoryStates.filter(c => c.score >= 55).slice(0, 4).map(c => `${c.labelKo}: ${c.score}/100 · ${c.confirms[0] ?? "독립 신호라 확인 강도 제한"}`),
    keySupportsKo: categoryStates.filter(c => c.score <= 40).slice(0, 3).map(c => `${c.labelKo}: 압력 완화 (${c.score}/100)`),
    keyDriversKo: pressureContributions.slice(0, 4).map(c => `${c.labelKo}: 점수 ${c.pressureScore}, 기여 ${c.contributionPct}%`),
    finalConditionLabelKo: regimeKo,
    investmentImplicationKo: top ? `${top.labelKo}가 가장 큰 검증 기여를 하지만 단일 지표 cap을 적용했습니다. 최종 판단은 ${dominantDrivers.join(", ")}의 상호 확인 여부에 기반합니다.` : "유효한 매크로 지표가 부족해 투자 시사점 신뢰도가 낮습니다.",
    alphaNoteKo: regime.alphaNoteKo,
  };

  const semantic: MacroSemanticEngine = {
    categories: categoryStates,
    regimeLabel,
    regimeKo,
    overallPressure,
    confidence: semanticConfidence,
    confirmationStrength,
    dominantDrivers,
    contradictions,
    excludedMetrics,
    narrativeKo,
  };

  return { semantic, riskScore, pressureContributions, regime, aiSummary, confidence: semanticConfidence };
}

// ─── Regime Classification ────────────────────────────────────────────────────

function classifyRegime(
  components: Partial<Record<MacroCanonicalColumn, number>>,
  features: Partial<Record<MacroCanonicalColumn, MacroIndicatorFeatures>>,
  available: MacroCanonicalColumn[],
  riskScore: number
): MacroRegime {
  const vP = components.vix ?? 50, rP = components.interest_rate ?? 40;
  const cP = components.cpi ?? 30, yP = components.yield_10y ?? 30, dP = components.dxy ?? 30;
  const allVals = Object.values(components).filter(v => v !== undefined) as number[];
  const avgP = allVals.length ? fMean(allVals) : 50;
  const highN = allVals.filter(v => v > 65).length;

  const isVixSpike   = available.includes("vix")           && vP > 72;
  const isHighRate   = available.includes("interest_rate") && rP > 65;
  const isHighCPI    = available.includes("cpi")           && cP > 62;
  const isHighYield  = available.includes("yield_10y")     && yP > 62;
  const isHighDXY    = available.includes("dxy")           && dP > 65;
  const isLowVix     = available.includes("vix")           && vP < 30;
  const isLowRate    = available.includes("interest_rate") && rP < 30;
  const isMixed      = highN >= 2 && highN < allVals.length;

  let label: MacroRegimeLabel, labelKo: string, descriptionKo: string,
      confidence: number, alphaAdjustment: number, alphaNoteKo: string;
  const signalsKo: string[] = [];

  if (isVixSpike) {
    label = "Volatility Spike"; labelKo = "변동성 급등";
    descriptionKo = "VIX가 역사적 고점 구간에 위치하며 시장 공포가 급등하고 있습니다. 단기적으로 위험 자산 회피 압력이 강합니다.";
    confidence = clamp(0.55 + (vP - 72) / 100, 0, 0.93); alphaAdjustment = -20;
    alphaNoteKo = "변동성 급등 국면에서는 위험 자산 회피, 방어적 포지션 권장.";
    signalsKo.push(`VIX 압력 ${Math.round(vP)}점 — 역사적 고압력 구간`);
    if (isHighRate) signalsKo.push("금리 상승이 변동성 증폭");
  } else if (isHighCPI && isHighRate) {
    label = "Liquidity Tightening"; labelKo = "유동성 긴축";
    descriptionKo = "인플레이션과 금리 압력이 동시에 상승하며 긴축 사이클이 진행 중입니다. 유동성 환경이 악화되고 있습니다.";
    confidence = clamp(0.5 + (cP + rP) / 400, 0, 0.92); alphaAdjustment = -18;
    alphaNoteKo = "긴축 국면: 듀레이션 리스크 회피, 가치주·원자재 선호.";
    signalsKo.push(`CPI ${Math.round(cP)}점 + 금리 ${Math.round(rP)}점 동반 고압력`);
    if (isHighYield) signalsKo.push("장기금리 급등으로 금융 여건 추가 악화");
  } else if (isHighCPI) {
    label = "Inflation Pressure"; labelKo = "인플레이션 압력";
    descriptionKo = "소비자물가가 역사적으로 높은 수준에 위치하며 실질 구매력 침식이 진행 중입니다.";
    confidence = clamp(0.5 + cP / 200, 0, 0.90); alphaAdjustment = -12;
    alphaNoteKo = "인플레이션 압력 국면: 실물자산·인플레이션 헤지 자산 선호.";
    signalsKo.push(`CPI 압력 ${Math.round(cP)}점 — 역사적 상위권`);
    if (features.cpi?.trendDirection === "상승") signalsKo.push("물가 상승 모멘텀 지속");
  } else if (isHighRate) {
    label = "Rate Pressure"; labelKo = "금리 압박";
    descriptionKo = "금리가 역사적으로 높은 수준이며 차입 비용 상승으로 성장 압박이 가중되고 있습니다.";
    confidence = clamp(0.5 + rP / 200, 0, 0.88); alphaAdjustment = -14;
    alphaNoteKo = "고금리 환경: 고레버리지·장기물 회피, 단기 고배당주 선호.";
    signalsKo.push(`금리 압력 ${Math.round(rP)}점 — 역사적 고점권`);
  } else if (isHighYield && !isHighCPI && !isHighRate) {
    label = "Rate Pressure"; labelKo = "금리 압박";
    descriptionKo = "장기 국채금리가 상승하며 금융 여건이 긴축되고 있습니다.";
    confidence = 0.65; alphaAdjustment = -10;
    alphaNoteKo = "장기금리 상승 국면: 성장주 밸류에이션 압박, 가치주 상대 유리.";
    signalsKo.push(`국채금리 압력 ${Math.round(yP)}점 — 장기 긴축 신호`);
  } else if (isHighDXY && !isHighCPI && !isHighRate && !isVixSpike) {
    label = "Dollar Strength Pressure"; labelKo = "달러 강세 압력";
    descriptionKo = "달러인덱스가 역사적 상단에 위치하며 신흥국 및 원자재 시장에 부담이 됩니다.";
    confidence = clamp(0.5 + dP / 200, 0, 0.85); alphaAdjustment = -8;
    alphaNoteKo = "달러 강세 국면: 신흥국 노출 축소, 달러 자산 선호.";
    signalsKo.push(`DXY 압력 ${Math.round(dP)}점 — 역사적 강달러 구간`);
  } else if (vP > 55 && avgP > 55) {
    label = "Risk-Off"; labelKo = "리스크 오프";
    descriptionKo = "전반적 거시 압력이 높고 시장 불확실성이 확대되어 위험 자산 회피 심리가 강화되고 있습니다.";
    confidence = clamp(0.5 + (vP + avgP) / 400, 0, 0.88); alphaAdjustment = -20;
    alphaNoteKo = "리스크 오프 국면: 안전자산 선호, 방어주·채권 비중 확대.";
    signalsKo.push("VIX + 전반 지표 압력 상승 — 위험 회피 심리 지배");
  } else if (isLowVix && isLowRate && riskScore <= 35) {
    label = "Liquidity Supportive"; labelKo = "유동성 완화";
    descriptionKo = "금리가 낮고 변동성이 안정적입니다. 유동성이 풍부하여 위험 자산에 우호적 환경입니다.";
    confidence = clamp(0.55 + (30 - vP + 30 - rP) / 200, 0, 0.88); alphaAdjustment = +8;
    alphaNoteKo = "유동성 완화 국면: 성장주·위험 자산 전반에 우호적.";
    signalsKo.push("VIX 안정 + 금리 완화 — 유동성 우호 환경");
  } else if (riskScore <= 30 && isLowVix) {
    label = "Risk-On"; labelKo = "리스크 온";
    descriptionKo = "거시 지표 전반이 안정적이며 위험 자산에 우호적인 환경입니다.";
    confidence = clamp(0.5 + (30 - riskScore) / 100, 0, 0.90); alphaAdjustment = +10;
    alphaNoteKo = "리스크 온 국면: 성장주·모멘텀 팩터 역사적으로 강한 성과.";
    signalsKo.push("거시 압력 낮음 — 위험 선호 환경");
  } else if (isMixed) {
    label = "Mixed Macro Regime"; labelKo = "혼재 거시 환경";
    descriptionKo = `${highN}개 거시 지표에서 상충되는 신호 감지. 명확한 방향성 없는 교차 국면입니다.`;
    confidence = 0.50; alphaAdjustment = -3;
    alphaNoteKo = "혼재 환경: 거시 매크로보다 개별 종목·섹터 선택에 집중.";
    signalsKo.push(`${highN}개 지표 고압력 + 신호 상충`);
  } else {
    label = "Neutral Macro Regime"; labelKo = "중립 거시 환경";
    descriptionKo = "거시 지표들이 중립적 수준에서 유지되고 있습니다. 뚜렷한 압력 요인이나 지지 요인이 없는 균형 상태입니다.";
    confidence = 0.45; alphaAdjustment = 0;
    alphaNoteKo = "중립 환경: 매크로 편향보다 기본적 분석·팩터 투자 유효.";
    signalsKo.push("거시 지표 전반 중립 — 뚜렷한 방향성 없음");
  }

  if (!available.includes("vix")) signalsKo.push("VIX 미감지 — 변동성 수준 추론 기반");
  if (!available.includes("cpi")) signalsKo.push("CPI 미감지 — 인플레이션 환경 간접 추론");

  return {
    label, labelKo, confidence: clamp(confidence, 0.2, 0.95), descriptionKo,
    signals: [], signalsKo, alphaAdjustment, alphaNoteKo,
  };
}

// ─── Signal Cards ─────────────────────────────────────────────────────────────

function buildSignals(
  available: MacroCanonicalColumn[],
  features: Partial<Record<MacroCanonicalColumn, MacroIndicatorFeatures>>
): MacroSignal[] {
  return available
    .filter(col => (features[col]?.latestValue ?? null) !== null)
    .map(col => {
      const feat = features[col]!;
      const direction: "bullish" | "bearish" | "neutral" =
        feat.pressureLevel >= 60 ? "bearish" : feat.pressureLevel <= 35 ? "bullish" : "neutral";
      const z = feat.zScore !== null ? feat.zScore.toFixed(2) : "N/A";
      return {
        canonical: col,
        labelKo: INDICATOR_CONFIG[col].labelKo,
        value: feat.displayValue,
        pressureScore: feat.pressureLevel,
        trendDirection: feat.trendDirection,
        direction,
        directionKo: direction === "bullish" ? "지지적" : direction === "bearish" ? "압박" : "중립",
        noteKo: `백분위 ${feat.percentileRank}위 · z-점수 ${z} · ${feat.momentumTag}`,
      };
    });
}

// ─── AI Summary ───────────────────────────────────────────────────────────────

function buildAISummary(
  regime: MacroRegime,
  riskScore: MacroRiskScore,
  contributions: PressureContribution[]
): MacroAISummary {
  const sc = riskScore.score;
  const lvl = riskScore.level;

  const headlineKo = `${regime.labelKo} — ${lvl} (${sc}점)`;

  const highConts = contributions.filter(c => c.pressureScore >= 65);
  const lowConts  = contributions.filter(c => c.pressureScore <= 35);

  const overallKo = highConts.length
    ? `현재 거시 환경은 ${regime.labelKo} 국면에 해당하며, ${highConts.slice(0, 2).map(c => c.labelKo).join(', ')}에서 높은 압력이 감지됩니다. 거시 리스크 점수 ${sc}점 — ${lvl}.`
    : `현재 거시 환경은 ${regime.labelKo} 국면에 해당합니다. 전반적인 거시 압력이 제한적이며 리스크 점수 ${sc}점 — ${lvl}.`;

  const keyRisksKo = contributions.filter(c => c.pressureScore >= 55).slice(0, 4)
    .map(c => `${c.labelKo}: 압력 ${c.pressureScore}점 (역사적 ${c.percentileRank}백분위, 기여도 ${c.contributionPct}%)`);

  const keySupportsKo = lowConts.slice(0, 3)
    .map(c => `${c.labelKo}: 압력 낮음 (${c.pressureScore}점 — ${c.percentileRank}백분위)`);

  const keyDriversKo = contributions.slice(0, 4)
    .map(c => `${c.labelKo}: ${c.pressureScore}점 (비중 ${c.effectiveWeight}%, 기여 ${c.contributionPct}%)`);

  const dom = contributions[0]?.labelKo ?? "거시 지표";
  const isHigh = sc >= 60, isLow = sc <= 35;

  const bullScenarioKo = isHigh
    ? `${dom} 완화 + 거시 압력 개선 시 위험 자산 복원 가능. 리스크 점수 ${Math.max(20, sc - 20)}점 수준 하락 시 체제 전환 기대.`
    : `현재 우호적 거시 환경 유지. ${lowConts.length ? lowConts.slice(0, 2).map(c => c.labelKo).join(', ') + ' 안정 유지 핵심.' : '지표 전반 안정 유지 필요.'}`;

  const baseScenarioKo = `현재 추세 지속: ${regime.labelKo} 국면 유지. 리스크 점수 ${Math.max(0, sc - 8)}–${Math.min(100, sc + 8)}점 범위 횡보 예상.`;

  const bearScenarioKo = isHigh
    ? `${dom} 압력 추가 확대 시 점수 ${Math.min(100, sc + 20)}점 초과, 극단적 스트레스 국면 진입 위험.`
    : `${highConts.length ? highConts.slice(0, 1).map(c => c.labelKo).join(', ') + ' 추가 상승 또는 ' : ''}신규 지표 악화 시 거시 압력 상승 전환 가능.`;

  const finalConditionLabelKo =
    regime.label === "Volatility Spike"          ? "변동성 급등 주의" :
    regime.label === "Liquidity Tightening"       ? "유동성 긴축 경고" :
    regime.label === "Inflation Pressure"         ? "인플레이션 지속 모니터링" :
    regime.label === "Rate Pressure"              ? "고금리 압박 환경" :
    regime.label === "Dollar Strength Pressure"   ? "달러 강세 — 신흥국 주의" :
    regime.label === "Risk-Off"                   ? "리스크 오프 거시 환경" :
    regime.label === "Liquidity Supportive"       ? "유동성 완화 — 우호적 환경" :
    regime.label === "Risk-On"                    ? "거시 지지적 — 리스크 온" :
    regime.label === "Mixed Macro Regime"         ? "혼재된 거시 신호 — 선별적 접근" :
    "거시 중립 — 개별 분석 우선";

  const investmentImplicationKo =
    regime.alphaAdjustment >= 8  ? "거시 환경이 위험 자산에 우호적입니다. 성장주·사이클성 자산 비중 확대 고려." :
    regime.alphaAdjustment <= -15 ? "거시 압력이 높습니다. 방어적 포지션, 품질주 및 저베타 자산 선호 권장." :
    regime.alphaAdjustment <= -8  ? "선별적 접근 필요. 고레버리지·고위험 자산 축소, 품질 중심 포트폴리오 권장." :
    "뚜렷한 거시 방향성 없음. 섹터 선택과 개별 종목 기본 분석이 우선입니다.";

  return { headlineKo, overallKo, bullScenarioKo, baseScenarioKo, bearScenarioKo, keyRisksKo, keySupportsKo, keyDriversKo, finalConditionLabelKo, investmentImplicationKo, alphaNoteKo: regime.alphaNoteKo };
}

// ─── Alpha Adjustment ─────────────────────────────────────────────────────────

function computeAlphaAdj(score: number, conf: number): MacroAlphaAdjustment {
  const base = score <= 25 ? 6 : score <= 45 ? 2 : score <= 65 ? 0 : score <= 80 ? -7 : -14;
  const adjustment = Math.round(base * Math.min(1, conf + 0.2));
  const reasonKo =
    score <= 25 ? `거시 환경 우호적 (${score}점) — 알파 지원적` :
    score <= 45 ? `완만한 거시 압력 (${score}점) — 소폭 긍정 조정` :
    score <= 65 ? `중립 거시 환경 (${score}점) — 조정 없음` :
    score <= 80 ? `고압력 거시 환경 (${score}점) — 알파 하향 조정` :
    `극단적 거시 스트레스 (${score}점) — 알파 대폭 하향`;
  return { adjustment, reasonKo, confidence: conf >= 0.7 ? "HIGH" : conf >= 0.5 ? "MEDIUM" : "LOW" };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function buildMacroAnalysis(rows: Row[]): MacroAnalysis {
  const NULL_AI: MacroAISummary = { headlineKo: "", overallKo: "", bullScenarioKo: "", baseScenarioKo: "", bearScenarioKo: "", keyRisksKo: [], keySupportsKo: [], keyDriversKo: [], finalConditionLabelKo: "", investmentImplicationKo: "", alphaNoteKo: "" };
  const NULL_SEMANTIC: MacroSemanticEngine = { categories: [], regimeLabel: "Transitional Regime", regimeKo: "데이터 부족", overallPressure: 0, confidence: 0, confirmationStrength: 0, dominantDrivers: [], contradictions: [], excludedMetrics: [], narrativeKo: "" };
  const NULL: MacroAnalysis = {
    detected: false, dataMode: "summary", frequency: "unknown", dateRange: null,
    rowCount: 0, confidence: 0, confidenceScore: 0, confidenceLabel: "없음",
    mapping: [], availableIndicators: [], features: {}, series: {}, normalizedSeries: {},
    riskScore: { score: 0, level: "혼재 / 중립", components: {}, activeComponentCount: 0, warnings: [] },
    pressureContributions: [], semantic: NULL_SEMANTIC,
    regime: { label: "Neutral Macro Regime", labelKo: "중립 거시 환경", confidence: 0, descriptionKo: "", signals: [], signalsKo: [], alphaAdjustment: 0, alphaNoteKo: "" },
    signals: [], aiSummary: NULL_AI, visualizationPlanKo: "거시 데이터 미감지",
    warnings: [], alphaAdjustment: { adjustment: 0, reasonKo: "거시 데이터 없음", confidence: "LOW" },
  };

  if (!rows.length) return NULL;
  const mapping = detectMacroCols(rows);
  if (!mapping.length) return NULL;

  const available = mapping.map(m => m.canonical);
  const dateCol = findDateCol(rows);
  const parsedDates = (dateCol ? rows.map(r => parseDate(r[dateCol])).filter((d): d is Date => d !== null) : []).sort((a, b) => a.getTime() - b.getTime());
  const frequency = detectFreq(parsedDates);
  const dateRange = parsedDates.length >= 2
    ? { start: parsedDates[0].toISOString().slice(0, 10), end: parsedDates[parsedDates.length - 1].toISOString().slice(0, 10) }
    : null;

  const series: MacroSeriesMap = {};
  const normalizedSeries: MacroSeriesMap = {};
  for (const m of mapping) {
    series[m.canonical] = extractSeries(rows, m.source, dateCol);
    normalizedSeries[m.canonical] = normSeries(series[m.canonical]!);
  }

  const features: Partial<Record<MacroCanonicalColumn, MacroIndicatorFeatures>> = {};
  for (const col of available) {
    const source = mapping.find(m => m.canonical === col)?.source ?? "";
    features[col] = computeStrictFeatures(series[col] ?? [], col, frequency, source);
    normalizedSeries[col] = metricSeries(series[col] ?? [], col, source);
  }

  const semanticResult = buildSemanticEngine(features, available);
  const { semantic, riskScore, pressureContributions, regime, aiSummary } = semanticResult;
  const signals = buildSignals(available, features);

  const avgConf = mapping.reduce((s, m) => s + m.confidence, 0) / mapping.length;
  const confidence = clamp(semanticResult.confidence * 0.75 + avgConf * 0.25, 0, 1);
  const alphaAdjustment = computeAlphaAdj(riskScore.score, confidence);

  const dataMode: MacroAnalysis["dataMode"] =
    available.length >= 5 ? "full" : available.length >= 3 ? "standard" : available.length >= 1 ? "lite" : "summary";

  const confidenceScore = Math.round(confidence * 100);
  const confidenceLabel = confidenceScore >= 80 ? "높음" : confidenceScore >= 60 ? "보통" : confidenceScore >= 40 ? "제한적" : "낮음";

  const detectedLabels = available.map(col => INDICATOR_CONFIG[col].labelKo);
  const visualizationPlanKo = available.length === 0
    ? "감지된 거시 지표 없음"
    : available.length === 1
    ? `이 데이터셋에는 ${detectedLabels[0]}만 감지되어 단일 지표 분석 모드로 시각화됩니다.`
    : `이 데이터셋에는 ${detectedLabels.slice(0, -1).join(', ')} 및 ${detectedLabels[detectedLabels.length - 1]}가 감지되어, 각 지표의 변동성·추세·압력 수준을 정규화 비교 차트로 시각화합니다.`;

  const warnings: string[] = [...riskScore.warnings];
  for (const col of available) {
    const feat = features[col];
    if (feat?.hasReliabilityWarning) warnings.push(`${INDICATOR_CONFIG[col].labelKo}: ${feat.reliabilityNote}`);
  }

  return {
    detected: true, dataMode, frequency, dateRange, rowCount: rows.length,
    confidence, confidenceScore, confidenceLabel, mapping, availableIndicators: available,
    features, series, normalizedSeries, riskScore, pressureContributions, semantic,
    regime, signals, aiSummary, visualizationPlanKo, warnings, alphaAdjustment,
  };
}
