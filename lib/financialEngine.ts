import type { Row } from "@/lib/dataPipeline";
import { UniversalMetric, UniversalMetricPipelineResult, buildUniversalMetricPipeline } from "@/lib/universalMetricEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FinancialCanonicalColumn =
  | "revenue" | "operating_income" | "net_income" | "eps" | "roe"
  | "operating_cashflow" | "free_cashflow" | "gross_profit"
  | "operating_margin" | "gross_margin" | "net_margin"
  | "debt" | "equity" | "assets" | "liabilities"
  | "capex" | "dividend" | "dividend_yield" | "payout_ratio" | "dividend_per_share" | "total_dividend"
  | "debt_equity" | "debt_ratio" | "interest_coverage" | "current_ratio" | "quick_ratio"
  | "shares_outstanding" | "market_cap"
  | "yoy_growth" | "ebitda" | "book_value";

export type FinancialSemanticGroup =
  | "SCALE_SIZE"
  | "PROFITABILITY"
  | "GROWTH"
  | "PER_SHARE"
  | "DIVIDEND"
  | "LEVERAGE_STABILITY"
  | "CASHFLOW_QUALITY";

export type FinancialMetricType =
  | "amount"
  | "percentage"
  | "growth_rate"
  | "per_share"
  | "ratio"
  | "multiple"
  | "count"
  | "unknown_numeric";

export type FinancialUnitType =
  | "currency"
  | "millions"
  | "billions"
  | "percentage"
  | "ratio"
  | "basis_points"
  | "per_share"
  | "growth_rate"
  | "multiple"
  | "count"
  | "unknown_numeric";

export type FinancialValidationStatus = "valid" | "warning" | "anomaly" | "invalid" | "missing";
export type FinancialDirectionalMeaning = "higher_is_positive" | "higher_is_riskier" | "lower_is_riskier" | "contextual" | "neutral";
export type FinancialRelationshipRole = "driver" | "confirmation" | "penalty_check" | "context" | "excluded";

export type FinancialSemanticMetric = {
  key: FinancialCanonicalColumn;
  originalColumnName: string;
  semanticGroup: FinancialSemanticGroup;
  metricType: FinancialMetricType;
  unitType: FinancialUnitType;
  rawValue: unknown;
  cleanedValue: number | null;
  displayValue: string;
  normalizedValue: number | null;
  scoreValue: number | null;
  contributionValue: number | null;
  directionalMeaning: FinancialDirectionalMeaning;
  validationStatus: FinancialValidationStatus;
  confidence: number;
  relationshipRole: FinancialRelationshipRole;
  anomalyReason: string | null;
};

export type FinancialDataType =
  | "quarterly" | "annual" | "mixed" | "valuation_only"
  | "profitability_focused" | "growth_focused" | "balance_sheet_focused";

export type FinancialColumnMapping = {
  canonical: FinancialCanonicalColumn;
  source: string;
  confidence: number;
};

export type FinancialSeriesPoint = { date: string; value: number };
export type FinancialSeriesMap = Partial<Record<FinancialCanonicalColumn, FinancialSeriesPoint[]>>;

export type FinancialScoreComponents = {
  growth: number;
  profitability: number;
  stability: number;
  cashflow: number;
  efficiency: number;
  valuationSupport: number;
  shareholderReturn: number;
  leverageRisk: number;
  earningsQuality: number;
};

// Expanded quality labels — derived from cross-signal structure, not isolated scores
export type FinancialQualityLabel =
  | "High Quality Compounder"
  | "Stable Cash Generator"
  | "Growth Accelerator"
  | "Unstable Expansion"
  | "Weak Profitability Structure"
  | "Cash-Burning Growth"
  | "Leverage Distortion"
  | "Earnings Quality Risk"
  | "Operational Deterioration"
  | "Weakening Growth"
  | "Financially Fragile"
  | "Turnaround Candidate"
  | "Neutral Quality";

export type FinancialIndicatorFeatures = {
  latestValue: number | null;
  displayValue: string;
  metric: FinancialSemanticMetric | null;
  yoyGrowth: number | null;
  qoqGrowth: number | null;
  rollingMean: number | null;
  rollingStd: number | null;
  trendDirection: "상승" | "하락" | "보합";
  trendSlope: number;
  consistency: number;
  growthAcceleration: "가속" | "둔화" | "안정";
  signalTag: string;
  qualityNote: string;
  dataPoints: number;
  historicalMin: number | null;
  historicalMax: number | null;
  percentileRank: number;
};

// Cross-signal relationship between two metrics
export type CrossSignalSeverity = "positive" | "warning" | "danger" | "neutral";

export type CrossSignalRelation = {
  id: string;
  labelKo: string;
  metricA: FinancialCanonicalColumn;
  metricB: FinancialCanonicalColumn;
  directionA: "상승" | "하락" | "보합";
  directionB: "상승" | "하락" | "보합";
  consistent: boolean;
  severity: CrossSignalSeverity;
  assessmentKo: string;  // what the relationship means
  impactKo: string;      // impact on the score / final interpretation
};

// Overall financial structure assessment derived from cross signals
export type StructureAssessment = {
  qualityScore: number;          // 0-100: how consistent signals are with each other
  scoreMultiplier: number;       // 0.35-1.0: penalizes contradictions in final score
  label: FinancialQualityLabel;
  labelKo: string;
  confirmingPairs: number;
  contradictingPairs: number;
  dangerPairs: number;
  totalAnalyzedPairs: number;
  keyStrengthsKo: string[];
  keyWeaknessesKo: string[];
  contradictionSummaryKo: string;
  confidencePenaltyKo: string;   // explains why score was penalized
};

export type FinancialScore = {
  total: number;             // final score after structure multiplier
  rawTotal: number;          // score before cross-signal penalty
  components: FinancialScoreComponents;
  activeComponents: number;
  level: FinancialQualityLabel;
  levelKo: string;
  penaltyApplied: boolean;
  penaltyReasonKo: string;
};

export type FinancialRisk = {
  id: string;
  labelKo: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  descriptionKo: string;
  detected: boolean;
  value?: string;
  relatedSignals?: string[];  // which cross-signal relations triggered this
};

export type FinancialScenario = {
  case: "bull" | "base" | "bear";
  labelKo: string;
  probability: number;
  driversKo: string[];
  outlookKo: string;
  conditionsKo: string;  // what must be true for this scenario
};

export type FinancialAISummary = {
  overallKo: string;
  growthNarrativeKo: string;
  profitabilityNarrativeKo: string;
  riskNarrativeKo: string;
  crossSignalNarrativeKo: string;  // explains confirmations / contradictions
  qualityLabelKo: string;
  growthClassKo: string;
  riskClassKo: string;
  ltOutlookKo: string;
  stOutlookKo: string;
  scoreExplanationKo: string;      // WHY the score is what it is
  scenarios: FinancialScenario[];
};

export type FinancialAnalysis = {
  detected: boolean;
  dataType: FinancialDataType;
  dataTypeKo: string;
  confidence: number;
  confidenceLabel: string;
  rowCount: number;
  dateRange: { start: string; end: string } | null;
  mapping: FinancialColumnMapping[];
  availableColumns: FinancialCanonicalColumn[];
  features: Partial<Record<FinancialCanonicalColumn, FinancialIndicatorFeatures>>;
  series: FinancialSeriesMap;
  normalizedSeries: FinancialSeriesMap;
  crossSignals: CrossSignalRelation[];
  structure: StructureAssessment;
  score: FinancialScore;
  risks: FinancialRisk[];
  aiSummary: FinancialAISummary;
  warnings: string[];
  metricPipeline: UniversalMetricPipelineResult | null;
  metrics: Partial<Record<FinancialCanonicalColumn, UniversalMetric>>;
  financialMetrics: Partial<Record<FinancialCanonicalColumn, FinancialSemanticMetric>>;
  semanticGroups: Record<FinancialSemanticGroup, { labelKo: string; metrics: FinancialCanonicalColumn[]; validCount: number; anomalyCount: number; score: number | null }>;
  structuralPenalties: { id: string; labelKo: string; severity: "LOW" | "MEDIUM" | "HIGH"; explanationKo: string; scorePenalty: number; confidencePenalty: number }[];
  metricAudit: UniversalMetric[];
};

// ─── Indicator Config ─────────────────────────────────────────────────────────

export const FINANCIAL_INDICATOR_CONFIG: Record<FinancialCanonicalColumn, {
  labelKo: string; unit: string; color: string;
  higherIsBetter: boolean; isMargin: boolean; isGrowthMetric: boolean; isBalanceSheet: boolean;
  scoreGroup: keyof FinancialScoreComponents;
}> = {
  revenue:            { labelKo: "매출액",              unit: "",    color: "#3B82F6", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "growth" },
  operating_income:   { labelKo: "영업이익",            unit: "",    color: "#8B5CF6", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "profitability" },
  net_income:         { labelKo: "순이익",              unit: "",    color: "#22C55E", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "profitability" },
  eps:                { labelKo: "EPS (주당순이익)",    unit: "",    color: "#FACC15", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "profitability" },
  roe:                { labelKo: "ROE (자기자본이익률)",unit: "%",   color: "#FF6B6B", higherIsBetter: true,  isMargin: true,  isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "efficiency" },
  operating_cashflow: { labelKo: "영업현금흐름",        unit: "",    color: "#06B6D4", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "cashflow" },
  free_cashflow:      { labelKo: "잉여현금흐름 (FCF)",  unit: "",    color: "#10B981", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "cashflow" },
  gross_profit:       { labelKo: "매출총이익",          unit: "",    color: "#A78BFA", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "profitability" },
  operating_margin:   { labelKo: "영업이익률",          unit: "%",   color: "#F97316", higherIsBetter: true,  isMargin: true,  isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "profitability" },
  gross_margin:       { labelKo: "매출총이익률",        unit: "%",   color: "#EC4899", higherIsBetter: true,  isMargin: true,  isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "profitability" },
  net_margin:         { labelKo: "순이익률",            unit: "%",   color: "#14B8A6", higherIsBetter: true,  isMargin: true,  isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "profitability" },
  debt:               { labelKo: "총부채",              unit: "",    color: "#EF4444", higherIsBetter: false, isMargin: false, isGrowthMetric: false, isBalanceSheet: true,  scoreGroup: "stability" },
  equity:             { labelKo: "자기자본",            unit: "",    color: "#84CC16", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: true,  scoreGroup: "stability" },
  assets:             { labelKo: "총자산",              unit: "",    color: "#6366F1", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: true,  scoreGroup: "efficiency" },
  liabilities:        { labelKo: "총부채합계",          unit: "",    color: "#F43F5E", higherIsBetter: false, isMargin: false, isGrowthMetric: false, isBalanceSheet: true,  scoreGroup: "stability" },
  capex:              { labelKo: "CAPEX (설비투자)",    unit: "",    color: "#78716C", higherIsBetter: false, isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "cashflow" },
  dividend:           { labelKo: "배당금",              unit: "",    color: "#D97706", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "stability" },
  dividend_yield:     { labelKo: "배당수익률",          unit: "%",   color: "#F59E0B", higherIsBetter: true,  isMargin: true,  isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "shareholderReturn" },
  payout_ratio:       { labelKo: "배당성향",            unit: "%",   color: "#FBBF24", higherIsBetter: false, isMargin: true,  isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "shareholderReturn" },
  dividend_per_share: { labelKo: "주당배당금",          unit: "",    color: "#D97706", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "shareholderReturn" },
  total_dividend:     { labelKo: "총배당금",            unit: "",    color: "#B45309", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "shareholderReturn" },
  debt_equity:        { labelKo: "부채/자본 비율",      unit: "x",   color: "#F87171", higherIsBetter: false, isMargin: false, isGrowthMetric: false, isBalanceSheet: true,  scoreGroup: "leverageRisk" },
  debt_ratio:         { labelKo: "부채비율",            unit: "%",   color: "#FB7185", higherIsBetter: false, isMargin: true,  isGrowthMetric: false, isBalanceSheet: true,  scoreGroup: "leverageRisk" },
  interest_coverage:  { labelKo: "이자보상배율",        unit: "x",   color: "#38BDF8", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: true,  scoreGroup: "leverageRisk" },
  current_ratio:      { labelKo: "유동비율",            unit: "x",   color: "#67E8F9", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: true,  scoreGroup: "stability" },
  quick_ratio:        { labelKo: "당좌비율",            unit: "x",   color: "#22D3EE", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: true,  scoreGroup: "stability" },
  shares_outstanding: { labelKo: "발행주식수",          unit: "",    color: "#6B7280", higherIsBetter: false, isMargin: false, isGrowthMetric: false, isBalanceSheet: true,  scoreGroup: "efficiency" },
  market_cap:         { labelKo: "시가총액",            unit: "",    color: "#0EA5E9", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "valuationSupport" },
  yoy_growth:         { labelKo: "YoY 성장률",         unit: "%",   color: "#4ADE80", higherIsBetter: true,  isMargin: false, isGrowthMetric: true,  isBalanceSheet: false, scoreGroup: "growth" },
  ebitda:             { labelKo: "EBITDA",              unit: "",    color: "#818CF8", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: false, scoreGroup: "profitability" },
  book_value:         { labelKo: "BPS (주당순자산)",   unit: "",    color: "#94A3B8", higherIsBetter: true,  isMargin: false, isGrowthMetric: false, isBalanceSheet: true,  scoreGroup: "stability" },
};

const QUALITY_LABELS: Record<FinancialQualityLabel, string> = {
  "High Quality Compounder":     "고품질 복리 성장주",
  "Stable Cash Generator":       "안정적 현금창출원",
  "Growth Accelerator":          "성장 가속 기업",
  "Unstable Expansion":          "불안정 성장 구조",
  "Weak Profitability Structure":"수익성 취약 구조",
  "Cash-Burning Growth":         "현금 소진형 성장",
  "Leverage Distortion":         "레버리지 왜곡 구조",
  "Earnings Quality Risk":       "회계 품질 위험",
  "Operational Deterioration":   "영업 악화 구조",
  "Weakening Growth":            "성장 둔화 기업",
  "Financially Fragile":         "재무 취약 기업",
  "Turnaround Candidate":        "턴어라운드 후보",
  "Neutral Quality":             "중립 재무 품질",
};

// ─── Column Detection Tables ──────────────────────────────────────────────────

const COL_ALIASES: Record<FinancialCanonicalColumn, string[]> = {
  revenue:            ["revenue","sales","net_sales","total_revenue","total_sales","매출","매출액","총매출","순매출","revenue_ttm","net_revenue"],
  operating_income:   ["operating_income","operating_profit","op_income","op_profit","ebit","영업이익","영업수익","operating_earnings"],
  net_income:         ["net_income","net_profit","net_earnings","profit","after_tax_profit","순이익","당기순이익","순손익"],
  eps:                ["eps","earnings_per_share","diluted_eps","basic_eps","주당순이익","주당이익","eps_diluted","eps_basic"],
  roe:                ["roe","return_on_equity","자기자본이익률","자본이익률","return_equity"],
  operating_cashflow: ["operating_cashflow","cash_from_operations","cfo","op_cashflow","영업현금흐름","영업활동현금흐름","현금흐름","operating_cash_flow"],
  free_cashflow:      ["free_cashflow","fcf","free_cash_flow","잉여현금흐름","free_cf"],
  gross_profit:       ["gross_profit","gross_income","매출총이익","총이익","gross_earnings"],
  operating_margin:   ["operating_margin","op_margin","영업이익률","영업마진","operating_margin_pct"],
  gross_margin:       ["gross_margin","매출총이익률","그로스마진","gross_margin_pct"],
  net_margin:         ["net_margin","profit_margin","순이익률","순마진","net_profit_margin"],
  debt:               ["debt","total_debt","long_term_debt","부채","총부채","차입금","long_term_liabilities"],
  equity:             ["equity","shareholders_equity","total_equity","자기자본","자본총계","stockholders_equity"],
  assets:             ["assets","total_assets","총자산","total_asset"],
  liabilities:        ["liabilities","total_liabilities","총부채","부채총계","total_liability"],
  capex:              ["capex","capital_expenditure","capital_expenditures","설비투자","자본지출","capex_spending"],
  dividend_yield:     ["dividend_yield","dividend yield","yield","div_yield","cash_dividend_yield","배당수익률","시가배당률"],
  payout_ratio:       ["payout_ratio","dividend_payout_ratio","payout","배당성향","배당지급률"],
  dividend_per_share: ["dividend_per_share","dps","dividend_per_sh","cash_dividend_per_share","주당배당","주당배당금"],
  total_dividend:     ["total_dividend","dividends_paid","cash_dividends_paid","total_dividends","dividend_paid","총배당","배당총액"],
  dividend:           ["dividend","dividends","dividend_per_share","dps","배당금","주당배당","cash_dividend"],
  debt_equity:        ["debt_equity","debt_to_equity","debt_equity_ratio","d/e","부채자본비율","부채대자본"],
  debt_ratio:         ["debt_ratio","debt_to_assets","liabilities_to_assets","부채비율","부채자산비율"],
  interest_coverage:  ["interest_coverage","interest_coverage_ratio","ebit_interest_coverage","이자보상배율"],
  current_ratio:      ["current_ratio","유동비율"],
  quick_ratio:        ["quick_ratio","당좌비율"],
  shares_outstanding: ["shares_outstanding","shares","diluted_shares","발행주식수","주식수","shares_diluted"],
  market_cap:         ["market_cap","market_capitalization","시가총액","시총","mktcap"],
  yoy_growth:         ["yoy_growth","yoy","yoy_change","annual_growth","전년대비","전년비","yoy성장률","revenue_growth","yoy_rev_growth"],
  ebitda:             ["ebitda","ebita"],
  book_value:         ["book_value","bps","book_value_per_share","주당순자산","장부가치","book_val"],
};

const COL_REGEX: Record<FinancialCanonicalColumn, RegExp> = {
  revenue:            /rev(?:enue)?|sales|매출/i,
  operating_income:   /op(?:erating)?[_\s-]?(?:income|profit)|영업이익|ebit(?!da)/i,
  net_income:         /net[_\s-]?(?:income|profit|earnings)|순이익|당기순이익/i,
  eps:                /\beps\b|earnings[_\s-]per[_\s-]share|주당순이익/i,
  roe:                /\broe\b|return[_\s-]on[_\s-]equity|자기자본이익률/i,
  operating_cashflow: /op(?:erating)?[_\s-]?cash|cfo\b|영업현금|영업활동/i,
  free_cashflow:      /free[_\s-]?cash|fcf\b|잉여현금/i,
  gross_profit:       /gross[_\s-]?(?:profit|income)|매출총이익/i,
  operating_margin:   /op(?:erating)?[_\s-]?margin|영업이익률/i,
  gross_margin:       /gross[_\s-]?margin|매출총이익률/i,
  net_margin:         /net[_\s-]?(?:margin|profit[_\s-]?margin)|순이익률/i,
  debt:               /\bdebt\b|long[_\s-]?term[_\s-]?debt|부채(?!총계|합계)/i,
  equity:             /\bequity\b|shareholder|자기자본|자본총계/i,
  assets:             /total[_\s-]?assets|총자산/i,
  liabilities:        /total[_\s-]?liab|부채총계|부채합계/i,
  capex:              /capex|capital[_\s-]?expend|설비투자|자본지출/i,
  dividend_yield:     /dividend[_\s-]?yield|배당수익률|시가배당률/i,
  payout_ratio:       /payout[_\s-]?ratio|dividend[_\s-]?payout|배당성향|배당지급률/i,
  dividend_per_share: /dividend[_\s-]?per[_\s-]?share|\bdps\b|주당배당/i,
  total_dividend:     /total[_\s-]?dividend|dividends[_\s-]?paid|cash[_\s-]?dividends[_\s-]?paid|총배당|배당총액/i,
  dividend:           /dividend|배당/i,
  debt_equity:        /debt[_\s-]?(?:to[_\s-]?)?equity|debt[_\s-]?equity[_\s-]?ratio|\bd\/e\b|부채자본/i,
  debt_ratio:         /debt[_\s-]?ratio|debt[_\s-]?to[_\s-]?assets|부채비율|부채자산/i,
  interest_coverage:  /interest[_\s-]?coverage|이자보상/i,
  current_ratio:      /current[_\s-]?ratio|유동비율/i,
  quick_ratio:        /quick[_\s-]?ratio|당좌비율/i,
  shares_outstanding: /shares[_\s-]?outstanding|발행주식|주식수/i,
  market_cap:         /market[_\s-]?cap|시가총액|시총/i,
  yoy_growth:         /yoy|year[_\s-]?on[_\s-]?year|전년(?:대비|비)|annual[_\s-]?growth/i,
  ebitda:             /\bebitda\b/i,
  book_value:         /\bbps\b|book[_\s-]?value|주당순자산/i,
};

const DATE_ALIASES = ["date","period","quarter","year","fiscal_year","fiscal","날짜","기간","분기","연도","회계연도","time","quarter_end","year_end","period_end","reporting_period","term"];
const DATE_REGEX = /date|period|quarter|year|fiscal|날짜|기간|분기|연도|time/i;

// ─── Utilities ────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = parseFloat(v.replace(/[,%$₩\s]/g, "")); return isNaN(n) ? NaN : n; }
  return NaN;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function fMean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;
}

function fStd(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = fMean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

function linearSlope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const xs = ys.map((_, i) => i);
  const mx = fMean(xs), my = fMean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den < 1e-10 ? 0 : num / den;
}

function percentileRank(val: number, arr: number[]): number {
  if (!arr.length) return 50;
  return Math.round(arr.filter(v => v < val).length / arr.length * 100);
}

function normSeries(pts: FinancialSeriesPoint[]): FinancialSeriesPoint[] {
  const vals = pts.map(p => p.value).filter(Number.isFinite);
  if (vals.length < 2) return pts.map(p => ({ ...p, value: 50 }));
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn;
  if (rng < 1e-10) return pts.map(p => ({ ...p, value: 50 }));
  return pts.map(p => ({ date: p.date, value: Math.round(((p.value - mn) / rng) * 100) }));
}

const FIN_SEMANTIC_LABELS: Record<FinancialSemanticGroup, string> = {
  SCALE_SIZE: "규모/절대금액",
  PROFITABILITY: "수익성",
  GROWTH: "성장률",
  PER_SHARE: "주당 지표",
  DIVIDEND: "배당",
  LEVERAGE_STABILITY: "레버리지/안정성",
  CASHFLOW_QUALITY: "현금흐름 품질",
};

function financialSemanticGroup(canon: FinancialCanonicalColumn): FinancialSemanticGroup {
  if (["revenue","operating_income","net_income","gross_profit","assets","equity","liabilities","market_cap"].includes(canon)) return "SCALE_SIZE";
  if (["operating_cashflow","free_cashflow","capex"].includes(canon)) return "CASHFLOW_QUALITY";
  if (["operating_margin","gross_margin","net_margin","roe","ebitda"].includes(canon)) return "PROFITABILITY";
  if (["yoy_growth"].includes(canon)) return "GROWTH";
  if (["eps","book_value","dividend_per_share"].includes(canon)) return "PER_SHARE";
  if (["dividend","dividend_yield","payout_ratio","total_dividend"].includes(canon)) return "DIVIDEND";
  if (["debt","debt_equity","debt_ratio","interest_coverage","current_ratio","quick_ratio","shares_outstanding"].includes(canon)) return "LEVERAGE_STABILITY";
  return "SCALE_SIZE";
}

function financialMetricType(canon: FinancialCanonicalColumn, source: string): FinancialMetricType {
  const n = `${canon} ${source}`.toLowerCase();
  if (/dividend_yield|yield|payout|margin|roe|roa|roic|ratio_pct|percent|growth|yoy|qoq|mom|비율|수익률|성장률|마진|배당성향/.test(n)) {
    if (/growth|yoy|qoq|mom|성장률/.test(n)) return "growth_rate";
    if (/debt_equity|coverage|current_ratio|quick_ratio/.test(n)) return "ratio";
    return "percentage";
  }
  if (/eps|book_value|bps|dps|per_share|주당/.test(n)) return "per_share";
  if (/debt_equity|coverage|current_ratio|quick_ratio|multiple|배율/.test(n)) return "multiple";
  if (/shares|count|주식수/.test(n)) return "count";
  return "amount";
}

function financialUnitType(canon: FinancialCanonicalColumn, source: string): FinancialUnitType {
  const n = `${canon} ${source}`.toLowerCase();
  if (/dividend_yield|yield|payout|margin|roe|roa|roic|debt_ratio/.test(n)) return /growth|yoy|qoq|mom/.test(n) ? "growth_rate" : "percentage";
  if (/growth|yoy|qoq|mom|성장률/.test(n)) return "growth_rate";
  if (/eps|book_value|bps|dps|per_share|dividend_per_share|주당/.test(n)) return "per_share";
  if (/debt_equity|coverage|current_ratio|quick_ratio|배율/.test(n)) return "multiple";
  if (/shares|count|주식수/.test(n)) return "count";
  if (/bps|basis/.test(n)) return "basis_points";
  return "currency";
}

function financialDirection(canon: FinancialCanonicalColumn): FinancialDirectionalMeaning {
  if (["debt","liabilities","debt_equity","debt_ratio","shares_outstanding","payout_ratio"].includes(canon)) return "higher_is_riskier";
  if (["capex"].includes(canon)) return "contextual";
  if (["dividend_yield","dividend","total_dividend"].includes(canon)) return "contextual";
  return "higher_is_positive";
}

function cleanFinancialNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || /^(na|n\/a|null|nan|none|-|--|#n\/a)$/i.test(s)) return null;
  const negative = /^\(.*\)$/.test(s);
  const n = Number(s.replace(/[,%$₩€£\s]/g, "").replace(/[()]/g, ""));
  return Number.isFinite(n) ? (negative ? -n : n) : null;
}

function normalizeFinancialPercent(value: number, unitType: FinancialUnitType) {
  if (unitType !== "percentage" && unitType !== "growth_rate") return value;
  return Math.abs(value) <= 1.5 ? value * 100 : value;
}

function formatFinancialSemanticValue(value: number | null, unitType: FinancialUnitType, status: FinancialValidationStatus) {
  if (status === "missing") return "N/A";
  if (status === "anomaly" || status === "invalid") return "Invalid / anomaly";
  if (value === null || !Number.isFinite(value)) return "N/A";
  if (unitType === "percentage" || unitType === "growth_rate") return `${normalizeFinancialPercent(value, unitType).toFixed(Math.abs(value) < 10 ? 2 : 1)}%`;
  if (unitType === "per_share") return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (unitType === "multiple" || unitType === "ratio") return `${value.toFixed(Math.abs(value) < 10 ? 2 : 1)}x`;
  if (unitType === "count") return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function buildFinancialSemanticMetric(canon: FinancialCanonicalColumn, source: string, raw: unknown, distribution: number[]): FinancialSemanticMetric {
  const cleaned = cleanFinancialNumber(raw);
  const semanticGroup = financialSemanticGroup(canon);
  const metricType = financialMetricType(canon, source);
  const unitType = financialUnitType(canon, source);
  const directionalMeaning = financialDirection(canon);
  let validationStatus: FinancialValidationStatus = cleaned === null ? "missing" : "valid";
  let anomalyReason: string | null = cleaned === null ? "값이 비어 있거나 숫자로 파싱할 수 없습니다." : null;
  const displayPct = cleaned === null ? null : normalizeFinancialPercent(cleaned, unitType);

  if (cleaned !== null) {
    if (unitType === "percentage" && canon === "dividend_yield" && (displayPct! < 0 || displayPct! > 20)) {
      validationStatus = "anomaly"; anomalyReason = "배당수익률의 일반 검증 범위(0~20%)를 벗어났습니다.";
    } else if (unitType === "percentage" && canon === "payout_ratio" && (displayPct! < 0 || displayPct! > 300)) {
      validationStatus = "anomaly"; anomalyReason = "배당성향의 일반 검증 범위(0~300%)를 벗어났습니다.";
    } else if ((canon === "operating_margin" || canon === "gross_margin" || canon === "net_margin" || canon === "roe" || canon === "debt_ratio") && Math.abs(displayPct!) > 500) {
      validationStatus = "anomaly"; anomalyReason = "재무 비율이 현실적 검증 범위를 벗어났습니다.";
    } else if ((unitType === "per_share" || unitType === "currency") && ["assets","revenue","market_cap","dividend_per_share","total_dividend"].includes(canon) && cleaned < 0) {
      validationStatus = canon === "revenue" || canon === "assets" || canon === "market_cap" ? "invalid" : "warning";
      anomalyReason = validationStatus === "invalid" ? "음수로 해석하기 어려운 절대 금액입니다." : "음수 배당/주당 지표는 데이터 정의 확인이 필요합니다.";
    } else if (unitType === "multiple" && canon === "interest_coverage" && cleaned < 0) {
      validationStatus = "warning"; anomalyReason = "이자보상배율이 음수입니다. 영업손실 또는 이자부담 위험 가능성이 있습니다.";
    }
  }

  const valid = validationStatus === "valid" || validationStatus === "warning";
  const sorted = distribution.filter(Number.isFinite).slice().sort((a, b) => a - b);
  const normalizedValue = valid && cleaned !== null && sorted.length > 1
    ? clamp(sorted.filter((v) => v <= cleaned).length / sorted.length, 0, 1)
    : null;
  let scoreValue: number | null = normalizedValue === null ? null : Math.round(normalizedValue * 100);
  if (scoreValue !== null && directionalMeaning === "higher_is_riskier") scoreValue = 100 - scoreValue;
  if (scoreValue !== null && directionalMeaning === "contextual") scoreValue = Math.round(clamp(scoreValue * 0.7 + 15, 0, 100));

  return {
    key: canon,
    originalColumnName: source,
    semanticGroup,
    metricType,
    unitType,
    rawValue: raw,
    cleanedValue: cleaned,
    displayValue: formatFinancialSemanticValue(cleaned, unitType, validationStatus),
    normalizedValue,
    scoreValue,
    contributionValue: null,
    directionalMeaning,
    validationStatus,
    confidence: validationStatus === "valid" ? 0.92 : validationStatus === "warning" ? 0.62 : validationStatus === "missing" ? 0.2 : 0.1,
    relationshipRole: validationStatus === "anomaly" || validationStatus === "invalid" ? "excluded" : semanticGroup === "DIVIDEND" ? "context" : "driver",
    anomalyReason,
  };
}

function parseDate(raw: unknown): Date | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s.length < 4) return null;
  const qMatch = s.match(/(\d{4})[_\s-]?Q([1-4])/i) ?? s.match(/Q([1-4])[_\s-]?(\d{4})/i);
  if (qMatch) {
    const year = parseInt(qMatch[1] ?? qMatch[2]);
    const q = parseInt(qMatch[2] ?? qMatch[1]);
    return new Date(year, (q - 1) * 3, 1);
  }
  const yearOnly = s.match(/^(?:FY)?(\d{4})$/i);
  if (yearOnly) return new Date(parseInt(yearOnly[1]), 0, 1);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Column Detection ─────────────────────────────────────────────────────────

function detectFinancialColumns(rows: Row[]): FinancialColumnMapping[] {
  if (!rows.length) return [];
  const cols = Object.keys(rows[0]);
  const used = new Set<FinancialCanonicalColumn>();
  const out: FinancialColumnMapping[] = [];

  for (const col of cols) {
    const norm = col.toLowerCase().replace(/[^a-z0-9가-힣]/g, "_");
    for (const [canon, aliases] of Object.entries(COL_ALIASES) as [FinancialCanonicalColumn, string[]][]) {
      if (used.has(canon)) continue;
      if (aliases.some(a => a === norm || a === col.toLowerCase())) {
        const sample = rows.slice(0, 10).map(r => toNum(r[col])).filter(Number.isFinite);
        if (sample.length >= 1) { out.push({ canonical: canon, source: col, confidence: 0.97 }); used.add(canon); break; }
      }
    }
    if (out.some(m => m.source === col)) continue;
    for (const [canon, rx] of Object.entries(COL_REGEX) as [FinancialCanonicalColumn, RegExp][]) {
      if (used.has(canon)) continue;
      if (rx.test(col)) {
        const sample = rows.slice(0, 10).map(r => toNum(r[col])).filter(Number.isFinite);
        if (sample.length >= 1) { out.push({ canonical: canon, source: col, confidence: 0.80 }); used.add(canon); break; }
      }
    }
  }
  return out;
}

function findDateColumn(rows: Row[]): string | null {
  if (!rows.length) return null;
  const cols = Object.keys(rows[0]);
  for (const col of cols) {
    const lc = col.toLowerCase();
    if (DATE_ALIASES.includes(lc) || DATE_REGEX.test(lc)) {
      const sample = rows.slice(0, 5).map(r => parseDate(r[col])).filter(Boolean);
      if (sample.length >= 1) return col;
    }
  }
  for (const col of cols) {
    const sample = rows.slice(0, 10).map(r => parseDate(r[col])).filter(Boolean);
    if (sample.length >= rows.length * 0.6) return col;
  }
  return null;
}

// ─── Series Extraction ────────────────────────────────────────────────────────

function extractFinancialSeries(rows: Row[], col: string, dateCol: string | null): FinancialSeriesPoint[] {
  const pts: FinancialSeriesPoint[] = [];
  for (let i = 0; i < rows.length; i++) {
    const val = toNum(rows[i][col]);
    if (!Number.isFinite(val)) continue;
    const d = parseDate(dateCol ? rows[i][dateCol] : null);
    pts.push({ date: d ? d.toISOString().slice(0, 10) : String(i).padStart(4, "0"), value: val });
  }
  pts.sort((a, b) => a.date.localeCompare(b.date));
  const out: FinancialSeriesPoint[] = [];
  let i = 0;
  while (i < pts.length) {
    const dt = pts[i].date; const grp: number[] = [];
    while (i < pts.length && pts[i].date === dt) { grp.push(pts[i].value); i++; }
    out.push({ date: dt, value: fMean(grp) });
  }
  return out;
}

// ─── Feature Computation ──────────────────────────────────────────────────────

export function formatFinancialVal(val: number, col: FinancialCanonicalColumn): string {
  const cfg = FINANCIAL_INDICATOR_CONFIG[col];
  if (!cfg) return val.toFixed(2);
  if (cfg.isMargin || cfg.isGrowthMetric) return `${val.toFixed(1)}%`;
  if (col === "eps" || col === "book_value" || col === "dividend") return val.toFixed(2);
  const abs = Math.abs(val);
  if (abs >= 1e12) return `${(val / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${(val / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${(val / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${(val / 1e3).toFixed(1)}K`;
  return val.toFixed(2);
}

function computeFeatures(col: FinancialCanonicalColumn, pts: FinancialSeriesPoint[], metric: FinancialSemanticMetric | null = null): FinancialIndicatorFeatures {
  if (metric && (metric.validationStatus === "anomaly" || metric.validationStatus === "invalid")) {
    const latestValue = typeof metric.cleanedValue === "number" ? metric.cleanedValue : null;
    return {
      latestValue,
      displayValue: `${metric.displayValue} (${String(metric.rawValue ?? "N/A")})`,
      metric,
      yoyGrowth: null,
      qoqGrowth: null,
      rollingMean: null,
      rollingStd: null,
      trendDirection: "보합",
      trendSlope: 0,
      consistency: 0,
      growthAcceleration: "안정",
      signalTag: "검증 제외",
      qualityNote: metric.anomalyReason ?? "검증 실패로 점수 계산에서 제외",
      dataPoints: 0,
      historicalMin: null,
      historicalMax: null,
      percentileRank: 50,
    };
  }
  const vals = pts.map(p => p.value);
  const n = vals.length;
  const latestValue = n > 0 ? vals[n - 1] : null;
  const displayValue = metric?.displayValue ?? (latestValue !== null ? formatFinancialVal(latestValue, col) : "N/A");

  const rollingN = Math.min(n, 4);
  const recent = vals.slice(-rollingN);
  const rollingMean = n > 0 ? fMean(recent) : null;
  const rollingStd = n > 1 ? fStd(recent) : null;

  let yoyGrowth: number | null = null;
  if (n >= 5 && vals[n - 5] !== 0 && Number.isFinite(vals[n - 5]))
    yoyGrowth = ((vals[n - 1] - vals[n - 5]) / Math.abs(vals[n - 5])) * 100;
  else if (n >= 2 && vals[n - 2] !== 0 && Number.isFinite(vals[n - 2]))
    yoyGrowth = ((vals[n - 1] - vals[n - 2]) / Math.abs(vals[n - 2])) * 100;

  let qoqGrowth: number | null = null;
  if (n >= 2 && vals[n - 2] !== 0 && Number.isFinite(vals[n - 2]))
    qoqGrowth = ((vals[n - 1] - vals[n - 2]) / Math.abs(vals[n - 2])) * 100;

  const slope = linearSlope(vals.slice(-Math.min(8, n)));
  const trendDirection: "상승" | "하락" | "보합" =
    slope > 0.01 * Math.abs(rollingMean ?? 1) ? "상승" :
    slope < -0.01 * Math.abs(rollingMean ?? 1) ? "하락" : "보합";

  const cv = rollingMean && Math.abs(rollingMean) > 1e-9 && rollingStd ? rollingStd / Math.abs(rollingMean) : 0;
  const consistency = Math.round(clamp((1 - cv) * 100, 0, 100));

  let growthAcceleration: "가속" | "둔화" | "안정" = "안정";
  if (n >= 6) {
    const earlySlope = linearSlope(vals.slice(0, Math.floor(n / 2)));
    const lateSlope = linearSlope(vals.slice(Math.floor(n / 2)));
    if (lateSlope > earlySlope * 1.2) growthAcceleration = "가속";
    else if (lateSlope < earlySlope * 0.8) growthAcceleration = "둔화";
  }

  const cfg = FINANCIAL_INDICATOR_CONFIG[col];
  const isGood = cfg.higherIsBetter ? trendDirection === "상승" : trendDirection === "하락";
  const signalTag = isGood
    ? growthAcceleration === "가속" ? "강세 가속" : "강세"
    : trendDirection === "보합" ? "보합"
    : growthAcceleration === "둔화" ? "약세 심화" : "약세";

  const qualityNote =
    n < 4 ? "데이터 부족 — 해석 주의" :
    consistency >= 80 ? "실적 일관성 높음" :
    consistency >= 60 ? "적정 실적 안정성" : "실적 변동성 높음";

  const pctRank = latestValue !== null ? percentileRank(latestValue, vals) : 50;

  return {
    latestValue, displayValue, metric, yoyGrowth, qoqGrowth,
    rollingMean, rollingStd, trendDirection, trendSlope: slope,
    consistency, growthAcceleration, signalTag, qualityNote,
    dataPoints: n,
    historicalMin: n > 0 ? Math.min(...vals) : null,
    historicalMax: n > 0 ? Math.max(...vals) : null,
    percentileRank: pctRank,
  };
}

// ─── Cross-Signal Analysis ────────────────────────────────────────────────────

function dir(col: FinancialCanonicalColumn, features: Partial<Record<FinancialCanonicalColumn, FinancialIndicatorFeatures>>): "상승" | "하락" | "보합" {
  return features[col]?.trendDirection ?? "보합";
}

function analyzeCrossSignals(
  features: Partial<Record<FinancialCanonicalColumn, FinancialIndicatorFeatures>>,
  available: FinancialCanonicalColumn[]
): CrossSignalRelation[] {
  const has = (col: FinancialCanonicalColumn) => available.includes(col) && features[col] !== undefined;
  const d = (col: FinancialCanonicalColumn) => dir(col, features);
  const relations: CrossSignalRelation[] = [];

  // 1. Revenue ↔ Operating Income → operational leverage / margin trend
  if (has("revenue") && has("operating_income")) {
    const rDir = d("revenue"), oDir = d("operating_income");
    const isGood   = rDir === "상승" && oDir === "상승";
    const isDanger = rDir === "상승" && oDir === "하락";
    const isWarn   = (rDir === "상승" && oDir === "보합") || (rDir === "보합" && oDir === "하락");
    relations.push({
      id: "rev_oi", labelKo: "매출 ↔ 영업이익",
      metricA: "revenue", metricB: "operating_income",
      directionA: rDir, directionB: oDir,
      consistent: !isDanger,
      severity: isDanger ? "danger" : isGood ? "positive" : isWarn ? "warning" : "neutral",
      assessmentKo: isDanger
        ? "매출 성장에도 영업이익 감소 — 마진 압박 또는 고정비 증가"
        : isGood
        ? "매출·영업이익 동반 상승 — 건전한 영업 레버리지 확인"
        : isWarn
        ? "매출 성장 대비 영업이익 정체 — 비용 효율성 점검 필요"
        : "매출·영업이익 추이 안정",
      impactKo: isDanger ? "수익성 품질 하향 — 알파 점수 조정" : isGood ? "수익 구조 건전성 확인" : "마진 방어 여부 점검 필요",
    });
  }

  // 2. Operating Income ↔ EPS → earnings translation quality
  if (has("operating_income") && has("eps")) {
    const oDir = d("operating_income"), eDir = d("eps");
    const isGood   = oDir === "상승" && eDir === "상승";
    const isDanger = oDir === "상승" && eDir === "하락";
    const isOdd    = oDir === "하락" && eDir === "상승";
    relations.push({
      id: "oi_eps", labelKo: "영업이익 ↔ EPS",
      metricA: "operating_income", metricB: "eps",
      directionA: oDir, directionB: eDir,
      consistent: !isDanger,
      severity: isDanger ? "danger" : isGood ? "positive" : isOdd ? "warning" : "neutral",
      assessmentKo: isDanger
        ? "영업이익 상승에도 EPS 하락 — 주식 희석, 세금 부담 또는 비영업 손실 의심"
        : isGood
        ? "영업이익이 주주 이익(EPS)으로 적절히 전환 — 이익 전환 건전"
        : isOdd
        ? "영업이익 하락에도 EPS 상승 — 비영업이익 의존, 지속성 불확실"
        : "이익 전환 과정 중립",
      impactKo: isDanger ? "주주가치 훼손 우려 — 수익성 품질 하향" : isGood ? "이익 전환 건전성 확인" : "이익 구조 지속성 점검 필요",
    });
  }

  // 3. EPS ↔ Cashflow → earnings quality (most critical signal)
  const cfCol = has("operating_cashflow") ? "operating_cashflow" : has("free_cashflow") ? "free_cashflow" : null;
  if (has("eps") && cfCol) {
    const eDir = d("eps"), cDir = d(cfCol);
    const isDanger  = eDir === "상승" && cDir === "하락";  // EPS up, CF down = ACCOUNTING RISK
    const isPositive = eDir === "상승" && cDir === "상승";
    const isConserv = eDir === "하락" && cDir === "상승"; // conservative accounting
    relations.push({
      id: "eps_cf", labelKo: "EPS ↔ 현금흐름",
      metricA: "eps", metricB: cfCol,
      directionA: eDir, directionB: cDir,
      consistent: !isDanger,
      severity: isDanger ? "danger" : isPositive ? "positive" : isConserv ? "neutral" : "warning",
      assessmentKo: isDanger
        ? "EPS 상승에도 현금흐름 하락 — 회계 이익 품질 위험, 실질 현금 창출력 의심"
        : isPositive
        ? "EPS와 현금흐름 동반 상승 — 이익의 실질성 최고 수준으로 확인"
        : isConserv
        ? "EPS 하락에도 현금흐름 유지 — 보수적 회계 가능성, 현금 창출력 건전"
        : "EPS·현금흐름 추이 혼재 — 이익 지속성 점검 필요",
      impactKo: isDanger ? "회계 투명성 위험 — 알파 점수 대폭 하향" : isPositive ? "이익 품질 최상급 확인" : "이익 현금화 능력 지속 모니터링",
    });
  }

  // 4. ROE ↔ Cashflow → leverage distortion check
  if (has("roe") && cfCol) {
    const rDir = d("roe"), cDir = d(cfCol);
    const isDanger  = rDir === "상승" && cDir === "하락"; // ROE up, CF down = leverage distortion
    const isPositive = rDir === "상승" && cDir === "상승";
    relations.push({
      id: "roe_cf", labelKo: "ROE ↔ 현금흐름",
      metricA: "roe", metricB: cfCol,
      directionA: rDir, directionB: cDir,
      consistent: !isDanger,
      severity: isDanger ? "danger" : isPositive ? "positive" : rDir === "하락" ? "warning" : "neutral",
      assessmentKo: isDanger
        ? "ROE 상승에도 현금흐름 하락 — 레버리지 의존 ROE 또는 회계 왜곡 의심"
        : isPositive
        ? "ROE와 현금흐름 동반 개선 — 실질 자본 효율성 확인"
        : rDir === "하락"
        ? "ROE 하락 — 자본 효율성 저하, 수익성 압박"
        : "ROE·현금흐름 관계 안정",
      impactKo: isDanger ? "레버리지 왜곡 위험 — 수익성 품질 하향" : isPositive ? "자본 효율성 건전성 확인" : "ROE 지속성 점검 필요",
    });
  }

  // 5. Revenue Growth ↔ Cashflow → growth quality
  if (has("revenue") && cfCol) {
    const rDir = d("revenue"), cDir = d(cfCol);
    const isDanger  = rDir === "상승" && cDir === "하락"; // cash-burning growth
    const isPositive = rDir === "상승" && cDir === "상승";
    const isEfficient = rDir === "하락" && cDir === "상승"; // shrinking but profitable
    relations.push({
      id: "rev_cf", labelKo: "매출 성장 ↔ 현금흐름",
      metricA: "revenue", metricB: cfCol,
      directionA: rDir, directionB: cDir,
      consistent: !isDanger,
      severity: isDanger ? "warning" : isPositive ? "positive" : isEfficient ? "neutral" : "neutral",
      assessmentKo: isDanger
        ? "매출 성장에도 현금흐름 약화 — 현금 소진형 성장 패턴"
        : isPositive
        ? "매출 성장과 현금흐름 동반 확대 — 고품질 사업 확장"
        : isEfficient
        ? "매출 감소에도 현금 창출 유지 — 비용 효율화 성공"
        : "성장·현금흐름 관계 중립",
      impactKo: isDanger ? "현금 소진 성장 경고 — 재무 건전성 점검 필요" : isPositive ? "고품질 성장 확인" : "성장 지속성 점검 필요",
    });
  }

  // 6. Revenue ↔ Margins → pricing power / operational efficiency
  const marginCol = has("operating_margin") ? "operating_margin" : has("gross_margin") ? "gross_margin" : null;
  if (has("revenue") && marginCol) {
    const rDir = d("revenue"), mDir = d(marginCol);
    const isDanger  = rDir === "상승" && mDir === "하락"; // growing but margins shrinking
    const isPositive = rDir === "상승" && mDir === "상승";
    relations.push({
      id: "rev_margin", labelKo: "매출 성장 ↔ 마진",
      metricA: "revenue", metricB: marginCol,
      directionA: rDir, directionB: mDir,
      consistent: !isDanger,
      severity: isDanger ? "warning" : isPositive ? "positive" : "neutral",
      assessmentKo: isDanger
        ? "매출 성장에도 마진 하락 — 저마진 성장 또는 가격 경쟁력 약화"
        : isPositive
        ? "매출 성장과 마진 동반 개선 — 최상급 영업 레버리지 효과"
        : rDir === "보합" && mDir === "하락"
        ? "매출 정체에도 마진 하락 — 영업 악화 신호"
        : "매출·마진 관계 안정",
      impactKo: isDanger ? "수익성 품질 저하 위험" : isPositive ? "최상급 영업 효율성 확인" : "마진 방어 전략 점검 필요",
    });
  }

  return relations;
}

// ─── Structure Classification ─────────────────────────────────────────────────

function classifyStructure(
  relations: CrossSignalRelation[],
  features: Partial<Record<FinancialCanonicalColumn, FinancialIndicatorFeatures>>,
  available: FinancialCanonicalColumn[]
): StructureAssessment {
  const confirming    = relations.filter(r => r.severity === "positive").length;
  const warnings      = relations.filter(r => r.severity === "warning").length;
  const dangers       = relations.filter(r => r.severity === "danger").length;
  const total         = relations.length;

  // Structure quality: 100 = all confirming, 0 = all danger
  const rawScore = total > 0 ? (confirming * 1.0 - warnings * 0.6 - dangers * 1.5) / total : 0;
  const qualityScore = Math.round(clamp((rawScore + 1.5) / 3 * 100, 0, 100));

  // Score multiplier — contradictions heavily penalize the final score
  const scoreMultiplier = clamp(1.0 - warnings * 0.12 - dangers * 0.22, 0.35, 1.0);

  // Signal helpers
  const has = (col: FinancialCanonicalColumn) => available.includes(col);
  const d   = (col: FinancialCanonicalColumn) => dir(col, features);
  const up  = (col: FinancialCanonicalColumn) => has(col) && d(col) === "상승";
  const dn  = (col: FinancialCanonicalColumn) => has(col) && d(col) === "하락";

  const cfCol = has("operating_cashflow") ? "operating_cashflow" : has("free_cashflow") ? "free_cashflow" : null;
  const cfUp  = cfCol ? up(cfCol) : false;
  const cfDn  = cfCol ? dn(cfCol) : false;

  // Derive quality label from cross-signal patterns (NOT isolated scores)
  let label: FinancialQualityLabel;

  const epsUpCfDn = has("eps") && up("eps") && cfDn;
  const roUpCfDn  = has("roe") && up("roe") && cfDn;
  const revUpEpsDnCfDn = up("revenue") && dn("eps") && cfDn;
  const revUpCfDn = up("revenue") && cfDn;

  if (epsUpCfDn && dangers >= 1) {
    label = "Earnings Quality Risk";
  } else if (roUpCfDn && dangers >= 1) {
    label = "Leverage Distortion";
  } else if (revUpEpsDnCfDn) {
    label = "Weak Profitability Structure";
  } else if (revUpCfDn) {
    label = "Cash-Burning Growth";
  } else if (!up("revenue") && dn("operating_margin")) {
    label = "Operational Deterioration";
  } else if (up("revenue") && up("operating_income") && up("eps") && cfUp) {
    label = "High Quality Compounder";
  } else if (cfUp && qualityScore >= 60 && !cfDn) {
    label = "Stable Cash Generator";
  } else if (up("revenue") && (features.eps?.growthAcceleration === "가속" || features.operating_income?.growthAcceleration === "가속")) {
    label = "Growth Accelerator";
  } else if (up("revenue") && !cfUp && (dn("eps") || warnings >= 2)) {
    label = "Unstable Expansion";
  } else if (dn("revenue") && dn("eps") && !cfUp) {
    label = "Weakening Growth";
  } else if (dangers >= 2 || (has("debt") && (features.debt?.percentileRank ?? 0) > 75)) {
    label = "Financially Fragile";
  } else if (qualityScore < 40 && (up("operating_income") || cfUp)) {
    label = "Turnaround Candidate";
  } else {
    label = "Neutral Quality";
  }

  const positiveRels = relations.filter(r => r.severity === "positive");
  const dangerRels   = relations.filter(r => r.severity === "danger");
  const warnRels     = relations.filter(r => r.severity === "warning");

  const keyStrengthsKo  = positiveRels.map(r => r.assessmentKo).slice(0, 2);
  const keyWeaknessesKo = [...dangerRels, ...warnRels].map(r => r.assessmentKo).slice(0, 3);

  const contradictionSummaryKo =
    dangers > 0 || warnings > 0
      ? `${dangers}개 위험 신호, ${warnings}개 주의 신호 감지 — 지표 간 불일치로 최종 점수 조정`
      : confirming > 0
      ? `${confirming}개 신호 상호 확인 — 재무 구조 일관성 양호`
      : "신호 분석 데이터 부족";

  const penaltyPct = Math.round((1 - scoreMultiplier) * 100);
  const confidencePenaltyKo =
    scoreMultiplier < 0.6
      ? `신호 불일치 심각 — 기본 점수 대비 ${penaltyPct}% 하향 조정 적용`
      : scoreMultiplier < 0.85
      ? `신호 불일치 감지 — 기본 점수 대비 ${penaltyPct}% 조정 적용`
      : "신호 일관성 양호 — 조정 최소";

  return {
    qualityScore, scoreMultiplier, label, labelKo: QUALITY_LABELS[label],
    confirmingPairs: confirming, contradictingPairs: warnings + dangers, dangerPairs: dangers,
    totalAnalyzedPairs: total,
    keyStrengthsKo: keyStrengthsKo.length > 0 ? keyStrengthsKo : [],
    keyWeaknessesKo: keyWeaknessesKo.length > 0 ? keyWeaknessesKo : [],
    contradictionSummaryKo, confidencePenaltyKo,
  };
}

// ─── Score Engine (uses structure multiplier) ─────────────────────────────────

function computeScore(
  features: Partial<Record<FinancialCanonicalColumn, FinancialIndicatorFeatures>>,
  available: FinancialCanonicalColumn[],
  structure: StructureAssessment
): FinancialScore {
  const components: FinancialScoreComponents = { growth: 50, profitability: 50, stability: 50, cashflow: 50, efficiency: 50, valuationSupport: 50, shareholderReturn: 50, leverageRisk: 50, earningsQuality: 50 };
  const counts: Record<keyof FinancialScoreComponents, number> = { growth: 0, profitability: 0, stability: 0, cashflow: 0, efficiency: 0, valuationSupport: 0, shareholderReturn: 0, leverageRisk: 0, earningsQuality: 0 };

  for (const col of available) {
    const feat = features[col];
    if (!feat) continue;
    const cfg = FINANCIAL_INDICATOR_CONFIG[col];
    const group = cfg.scoreGroup;

    let colScore = feat.percentileRank;
    if (!cfg.higherIsBetter) colScore = 100 - colScore;

    if (feat.trendDirection === "상승") colScore = clamp(colScore + 8, 0, 100);
    if (feat.trendDirection === "하락") colScore = clamp(colScore - 8, 0, 100);

    if (group === "profitability" || group === "stability")
      colScore = colScore * 0.7 + feat.consistency * 0.3;

    if (group === "growth" && feat.yoyGrowth !== null)
      colScore = clamp(colScore + clamp(feat.yoyGrowth * 0.5, -15, 15), 0, 100);

    components[group] = (components[group] * counts[group] + colScore) / (counts[group] + 1);
    counts[group]++;
  }

  const weights: Record<keyof FinancialScoreComponents, number> = {
    growth: 0.30, profitability: 0.25, stability: 0.20,
    cashflow: 0.15, efficiency: 0.05, valuationSupport: 0.05,
    shareholderReturn: 0.08, leverageRisk: 0.12, earningsQuality: 0.15,
  };
  let total = 0, wSum = 0;
  for (const [k, w] of Object.entries(weights) as [keyof FinancialScoreComponents, number][]) {
    total += components[k] * w; wSum += w;
  }
  const rawTotal = Math.round(wSum > 0 ? total / wSum : 50);

  // Apply cross-signal structure penalty
  const penalizedTotal = Math.round(clamp(rawTotal * structure.scoreMultiplier, 10, 95));
  const penaltyApplied = structure.scoreMultiplier < 0.95;

  const penaltyReasonKo = penaltyApplied
    ? structure.dangerPairs >= 2
      ? `복수의 위험 신호(${structure.dangerPairs}건) 감지 — 기본 점수 ${rawTotal}에서 ${penalizedTotal}으로 하향`
      : structure.contradictingPairs >= 2
      ? `지표 간 불일치(${structure.contradictingPairs}건) 감지 — 기본 점수 ${rawTotal}에서 ${penalizedTotal}으로 조정`
      : `신호 불일치 감지 — 기본 점수 ${rawTotal}에서 ${penalizedTotal}으로 소폭 조정`
    : `신호 일관성 양호 — 점수 조정 없음 (${rawTotal}점)`;

  const activeComponents = Object.values(counts).filter(c => c > 0).length;

  return {
    total: penalizedTotal, rawTotal,
    components: {
      growth:           Math.round(components.growth),
      profitability:    Math.round(components.profitability),
      stability:        Math.round(components.stability),
      cashflow:         Math.round(components.cashflow),
      efficiency:       Math.round(components.efficiency),
      valuationSupport: Math.round(components.valuationSupport),
      shareholderReturn: Math.round(components.shareholderReturn),
      leverageRisk:      Math.round(components.leverageRisk),
      earningsQuality:   Math.round(components.earningsQuality),
    },
    activeComponents,
    level: structure.label,
    levelKo: structure.labelKo,
    penaltyApplied,
    penaltyReasonKo,
  };
}

// ─── Relationship-Driven Risk Detection ───────────────────────────────────────

function detectRisks(
  features: Partial<Record<FinancialCanonicalColumn, FinancialIndicatorFeatures>>,
  crossSignals: CrossSignalRelation[],
  score: FinancialScore
): FinancialRisk[] {
  const risks: FinancialRisk[] = [];

  function fromSignal(id: string): CrossSignalRelation | undefined {
    return crossSignals.find(r => r.id === id);
  }

  // Risk 1: Margin deterioration (Revenue up, OI down relationship)
  const revOi = fromSignal("rev_oi");
  risks.push({
    id: "margin_deterioration",
    labelKo: "마진 압박 위험",
    severity: revOi?.severity === "danger" ? "HIGH" : revOi?.severity === "warning" ? "MEDIUM" : "LOW",
    descriptionKo: revOi?.severity === "danger" || revOi?.severity === "warning"
      ? `${revOi.assessmentKo}. 지속되면 수익성 훼손으로 이어질 수 있습니다.`
      : "매출·영업이익 추이가 정상 범위 내에 있습니다.",
    detected: revOi?.severity === "danger" || revOi?.severity === "warning",
    relatedSignals: ["rev_oi"],
    value: features.operating_margin?.displayValue ?? features.operating_income?.displayValue,
  });

  // Risk 2: Earnings translation failure (OI up, EPS down)
  const oiEps = fromSignal("oi_eps");
  risks.push({
    id: "earnings_translation",
    labelKo: "이익 전환 실패",
    severity: oiEps?.severity === "danger" ? "HIGH" : oiEps?.severity === "warning" ? "MEDIUM" : "LOW",
    descriptionKo: oiEps?.severity === "danger"
      ? `${oiEps.assessmentKo}. 주주 이익에 영업이익이 제대로 전달되지 않고 있습니다.`
      : oiEps?.severity === "warning"
      ? `${oiEps?.assessmentKo ?? "이익 전환 과정 점검 필요"}.`
      : "영업이익의 EPS 전환이 정상적입니다.",
    detected: oiEps?.severity === "danger" || oiEps?.severity === "warning",
    relatedSignals: ["oi_eps"],
    value: features.eps?.displayValue,
  });

  // Risk 3: Earnings quality / accounting distortion (EPS up, CF down — most critical)
  const epsCf = fromSignal("eps_cf");
  risks.push({
    id: "earnings_quality",
    labelKo: "회계 품질 위험",
    severity: epsCf?.severity === "danger" ? "HIGH" : epsCf?.severity === "warning" ? "MEDIUM" : "LOW",
    descriptionKo: epsCf?.severity === "danger"
      ? `${epsCf.assessmentKo}. 장부 이익과 실질 현금흐름의 괴리는 회계 리스크 신호입니다.`
      : "EPS와 현금흐름이 일관된 방향을 보입니다.",
    detected: epsCf?.severity === "danger",
    relatedSignals: ["eps_cf"],
    value: features.eps?.displayValue,
  });

  // Risk 4: Leverage-driven ROE distortion (ROE up, CF down)
  const roeCf = fromSignal("roe_cf");
  risks.push({
    id: "leverage_distortion",
    labelKo: "레버리지 왜곡 위험",
    severity: roeCf?.severity === "danger" ? "HIGH" : roeCf?.severity === "warning" ? "MEDIUM" : "LOW",
    descriptionKo: roeCf?.severity === "danger"
      ? `${roeCf.assessmentKo}. 부채 증가를 통한 ROE 부풀리기 가능성이 있습니다.`
      : "ROE와 현금흐름이 일관된 추세를 보입니다.",
    detected: roeCf?.severity === "danger",
    relatedSignals: ["roe_cf"],
    value: features.roe?.displayValue,
  });

  // Risk 5: Cash-burning growth (Revenue up, CF down)
  const revCf = fromSignal("rev_cf");
  risks.push({
    id: "cash_burning_growth",
    labelKo: "현금 소진형 성장",
    severity: revCf?.severity === "warning" ? "MEDIUM" : "LOW",
    descriptionKo: revCf?.severity === "warning"
      ? `${revCf.assessmentKo}. 성장을 위해 현금을 과도하게 소진하고 있을 수 있습니다.`
      : "성장과 현금흐름이 균형적입니다.",
    detected: revCf?.severity === "warning",
    relatedSignals: ["rev_cf"],
  });

  // Risk 6: Margin compression despite growth (Revenue up, margin down)
  const revMargin = fromSignal("rev_margin");
  risks.push({
    id: "margin_compression",
    labelKo: "마진 압축 위험",
    severity: revMargin?.severity === "warning" ? "MEDIUM" : "LOW",
    descriptionKo: revMargin?.severity === "warning"
      ? `${revMargin.assessmentKo}. 성장 과정에서 수익성이 저하되고 있습니다.`
      : "마진 추세가 안정적입니다.",
    detected: revMargin?.severity === "warning",
    relatedSignals: ["rev_margin"],
    value: features.operating_margin?.displayValue ?? features.gross_margin?.displayValue,
  });

  // Risk 7: Overall structural risk
  risks.push({
    id: "structural_weakness",
    labelKo: "전반적 재무 구조 취약",
    severity: score.total < 35 ? "HIGH" : score.total < 50 ? "MEDIUM" : "LOW",
    descriptionKo: score.penaltyApplied
      ? `${score.penaltyReasonKo}. 지표 간 불일치가 전반적 재무 품질을 저하시키고 있습니다.`
      : `종합 펀더멘탈 점수 ${score.total}/100. 신호 일관성이 확인되었습니다.`,
    detected: score.total < 50,
  });

  return risks;
}

// ─── AI Summary — Cross-Signal Narrative ─────────────────────────────────────

function buildAISummary(
  score: FinancialScore,
  features: Partial<Record<FinancialCanonicalColumn, FinancialIndicatorFeatures>>,
  crossSignals: CrossSignalRelation[],
  structure: StructureAssessment,
  risks: FinancialRisk[],
  available: FinancialCanonicalColumn[]
): FinancialAISummary {
  const { total, rawTotal, components, level } = score;
  const rev = features.revenue;
  const oi = features.operating_income;
  const eps = features.eps;
  const roe = features.roe;
  const cf = features.operating_cashflow ?? features.free_cashflow;
  const om = features.operating_margin;

  const qualityLabelKo = structure.labelKo;
  const quality = total >= 75 ? "우수한" : total >= 60 ? "양호한" : total >= 45 ? "보통 수준의" : "저조한";

  const growthClassKo =
    components.growth >= 70 ? "고성장" : components.growth >= 55 ? "완만한 성장" :
    components.growth >= 40 ? "성장 정체" : "역성장 위험";

  const detectedHighRisks  = risks.filter(r => r.detected && r.severity === "HIGH");
  const detectedMedRisks   = risks.filter(r => r.detected && r.severity === "MEDIUM");
  const riskClassKo =
    detectedHighRisks.length >= 2 ? "고위험" :
    detectedHighRisks.length >= 1 ? "중고위험" :
    detectedMedRisks.length >= 2  ? "중위험" :
    detectedMedRisks.length >= 1  ? "저중위험" : "저위험";

  // Score explanation — the WHY
  const dangerSignals = crossSignals.filter(s => s.severity === "danger");
  const warnSignals   = crossSignals.filter(s => s.severity === "warning");
  const goodSignals   = crossSignals.filter(s => s.severity === "positive");

  let scoreExplanationKo: string;
  if (score.penaltyApplied && dangerSignals.length > 0) {
    const dangerDescs = dangerSignals.map(s => s.labelKo).join(", ");
    scoreExplanationKo =
      `기본 점수는 ${rawTotal}점이었으나 ${dangerDescs} 간 위험한 불일치가 감지되어 최종 점수 ${total}점으로 하향 조정되었습니다. ` +
      `단순 성장 지표가 강하더라도 이익 품질·현금흐름 불일치가 존재하면 높은 점수를 부여하지 않습니다.`;
  } else if (score.penaltyApplied && warnSignals.length > 0) {
    const warnDescs = warnSignals.map(s => s.labelKo).join(", ");
    scoreExplanationKo =
      `기본 점수 ${rawTotal}점에서 ${warnDescs} 간 주의 신호로 인해 ${total}점으로 조정되었습니다. ` +
      `지표 간 일관성이 완전히 확보될 때 점수가 회복됩니다.`;
  } else if (goodSignals.length >= 3) {
    scoreExplanationKo =
      `${goodSignals.length}개의 지표 쌍이 상호 확인 신호를 보내고 있어 ${total}점의 신뢰도 높은 점수가 산출되었습니다. ` +
      `특히 ${goodSignals.slice(0, 2).map(s => s.labelKo).join(", ")} 관계가 재무 건전성을 뒷받침합니다.`;
  } else {
    scoreExplanationKo = `가용 지표로 산출한 종합 점수 ${total}점입니다. 추가 재무 지표 업로드 시 분석 정확도가 높아집니다.`;
  }

  // Growth narrative
  const growthNarrativeKo = rev
    ? `매출은 ${rev.trendDirection} 추세${rev.yoyGrowth != null ? ` (YoY ${rev.yoyGrowth > 0 ? "+" : ""}${rev.yoyGrowth.toFixed(1)}%)` : ""}입니다. ` +
      (oi ? `영업이익은 ${oi.trendDirection} 추세로, ` +
        (crossSignals.find(s => s.id === "rev_oi")?.severity === "positive"
          ? "매출과 함께 건전한 영업 레버리지를 형성하고 있습니다. "
          : crossSignals.find(s => s.id === "rev_oi")?.severity === "danger"
          ? "매출 성장에 동반되지 못해 마진 압박이 발생하고 있습니다. "
          : "마진 방어력이 중립 수준입니다. ")
        : "") +
      (eps ? `EPS는 ${eps.trendDirection} 추세 (${eps.displayValue})입니다.` : "")
    : `매출 데이터 미감지. 성장성 분석이 제한적입니다. 성장 컴포넌트 점수: ${components.growth}점.`;

  // Profitability narrative
  const profitabilityNarrativeKo = roe
    ? `ROE ${roe.displayValue}으로 ${roe.trendDirection} 추세입니다. ` +
      (crossSignals.find(s => s.id === "roe_cf")?.severity === "danger"
        ? "현금흐름과의 불일치가 관찰되어 레버리지 의존 가능성을 주의해야 합니다. "
        : "현금흐름과의 관계가 안정적입니다. ") +
      (om ? `영업이익률 ${om.displayValue}${om.trendDirection === "하락" ? " — 마진 하락 추세 지속 주의" : " — 안정 유지"}.` : "")
    : `수익성 컴포넌트 점수: ${components.profitability}점. ` +
      (om ? `영업이익률 ${om.displayValue} (${om.trendDirection}).` : "수익성 지표 감지 제한적.");

  // Risk narrative — references cross-signal relationships
  const activeRisks = risks.filter(r => r.detected && r.severity !== "LOW");
  const riskNarrativeKo = dangerSignals.length > 0
    ? `심각한 신호 불일치 감지: ${dangerSignals.map(s => `"${s.labelKo}" — ${s.assessmentKo}`).join("; ")}. ` +
      `이는 단순 성장 지표만으로 낙관적 해석을 내릴 수 없는 구조를 나타냅니다.`
    : activeRisks.length > 0
    ? `주의 위험 요인: ${activeRisks.map(r => r.labelKo).join(", ")}. ` +
      (cf ? `현금흐름 상태: ${cf.trendDirection} (${cf.displayValue}).` : "")
    : `현재 심각한 재무 위험 신호가 감지되지 않았습니다. ${qualityLabelKo}로서 ${quality} 재무 상태를 유지하고 있습니다.`;

  // Cross-signal narrative — the core of the analysis
  const crossSignalNarrativeKo =
    dangerSignals.length > 0 || warnSignals.length > 0
      ? `[신호 불일치 분석] ${structure.contradictionSummaryKo}. ` +
        (dangerSignals.length > 0 ? `위험: ${dangerSignals.map(s => s.assessmentKo).join(" / ")}. ` : "") +
        (warnSignals.length > 0  ? `주의: ${warnSignals.map(s => s.assessmentKo).join(" / ")}. ` : "") +
        `${structure.confidencePenaltyKo}.`
      : goodSignals.length > 0
      ? `[신호 일관성 분석] ${goodSignals.map(s => s.assessmentKo).join(". ")}. 지표 간 상호 확인이 완료되어 분석 신뢰도가 높습니다.`
      : "교차 신호 분석을 위한 충분한 지표 쌍을 찾지 못했습니다. 더 많은 재무 지표를 업로드하면 정밀도가 높아집니다.";

  const ltOutlookKo = total >= 65
    ? `장기적으로 ${qualityLabelKo}의 특성을 유지하면 복리 가치 창출 가능성이 있습니다. ${structure.keyStrengthsKo[0] ?? ""}`
    : total >= 45
    ? `장기 방향성은 긍정적이나 ${structure.keyWeaknessesKo[0] ?? "구조적 개선"}이 필요합니다.`
    : `현재 구조 (${qualityLabelKo}) 하에서는 장기 가치 훼손 위험이 있습니다. 근본적 펀더멘탈 개선이 선행되어야 합니다.`;

  const stOutlookKo = components.growth >= 60 && components.cashflow >= 55
    ? `단기적으로 실적 개선 모멘텀이 주가에 긍정적으로 작용할 수 있습니다.`
    : dangerSignals.length > 0
    ? `단기적으로 ${dangerSignals[0].labelKo} 리스크가 실적 변동성을 높일 수 있습니다.`
    : components.growth < 45
    ? `단기 실적 모멘텀이 약해 보수적 접근이 필요합니다.`
    : `단기적으로 안정적인 실적 흐름이 예상됩니다.`;

  // Scenarios — only bullish if signals confirm
  const canBullish = goodSignals.length >= 2 && dangerSignals.length === 0;
  const bearTriggers = [...dangerSignals.map(s => s.impactKo), ...activeRisks.map(r => r.labelKo)].slice(0, 3);

  const scenarios: FinancialScenario[] = [
    {
      case: "bull",
      labelKo: "강세 시나리오",
      probability: canBullish ? Math.min(45, total - 10) : Math.max(8, 20 - dangerSignals.length * 5),
      conditionsKo: canBullish ? `${goodSignals.map(s => s.labelKo).join(", ")} 신호 지속` : `현재 신호 불일치 해소 필요`,
      driversKo: [
        rev?.trendDirection === "상승" ? "매출 성장 가속" : "매출 회복",
        oi?.trendDirection === "상승" ? "영업이익 개선" : "비용 구조 효율화",
        cf?.trendDirection === "상승" ? "현금흐름 강화" : "현금창출 개선",
      ],
      outlookKo: canBullish
        ? `${goodSignals.length}개 지표 쌍의 상호 확인이 지속된다면 고품질 성장 기업으로 재평가 가능합니다.`
        : `현재 신호 불일치(${dangerSignals.length}개 위험)가 해소되는 경우에만 강세 해석이 유효합니다.`,
    },
    {
      case: "base",
      labelKo: "기본 시나리오",
      probability: 40,
      conditionsKo: "현재 재무 구조 유지",
      driversKo: ["현재 성장 궤적 유지", "마진 안정화", "현금흐름 보전"],
      outlookKo: `현재 펀더멘탈(${total}점, ${qualityLabelKo}) 수준이 유지된다면 ${growthClassKo} 기조 속 안정적 실적이 예상됩니다.`,
    },
    {
      case: "bear",
      labelKo: "약세 시나리오",
      probability: Math.max(10, detectedHighRisks.length * 15 + warnSignals.length * 8 + Math.max(0, 50 - total) / 3),
      conditionsKo: bearTriggers.length > 0 ? bearTriggers.join(", ") : "현재 추세 악화 지속",
      driversKo: bearTriggers.length > 0 ? bearTriggers : ["실적 둔화", "마진 압박", "현금흐름 약화"],
      outlookKo: dangerSignals.length > 0
        ? `감지된 위험 신호(${dangerSignals.map(s => s.labelKo).join(", ")})가 지속·심화될 경우 실적 하락과 재무 품질 훼손 가능성이 있습니다.`
        : `위험 신호가 복합적으로 작용할 경우 ${qualityLabelKo} 등급에서 하향 조정될 수 있습니다.`,
    },
  ];

  return {
    overallKo:
      `종합 펀더멘탈 점수 ${total}점 (기본 ${rawTotal}점${score.penaltyApplied ? ` → 신호 불일치 패널티 적용 후 ${total}점` : ""}). ` +
      `${qualityLabelKo}로 분류되며 성장성 ${components.growth}점, 수익성 ${components.profitability}점, ` +
      `안정성 ${components.stability}점, 현금흐름 ${components.cashflow}점을 기록하였습니다.`,
    growthNarrativeKo,
    profitabilityNarrativeKo,
    riskNarrativeKo,
    crossSignalNarrativeKo,
    qualityLabelKo,
    growthClassKo,
    riskClassKo,
    ltOutlookKo,
    stOutlookKo,
    scoreExplanationKo,
    scenarios,
  };
}

// ─── Data Type Detection ──────────────────────────────────────────────────────

function detectDataType(rows: Row[], dateCol: string | null, available: FinancialCanonicalColumn[]): { type: FinancialDataType; typeKo: string } {
  const marginCols: FinancialCanonicalColumn[]  = ["operating_margin", "gross_margin", "net_margin", "roe"];
  const balanceCols: FinancialCanonicalColumn[] = ["debt", "equity", "assets", "liabilities"];
  const growthCols: FinancialCanonicalColumn[]  = ["yoy_growth"];
  const incomeCols: FinancialCanonicalColumn[]  = ["revenue", "operating_income", "net_income", "eps"];

  const hasMargin  = marginCols.some(c => available.includes(c));
  const hasBalance = balanceCols.some(c => available.includes(c));
  const hasGrowth  = growthCols.some(c => available.includes(c));
  const hasIncome  = incomeCols.some(c => available.includes(c));

  if (!hasIncome && hasMargin)   return { type: "profitability_focused", typeKo: "수익성 중심 데이터" };
  if (!hasIncome && hasBalance)  return { type: "balance_sheet_focused", typeKo: "재무상태표 중심 데이터" };
  if (hasGrowth && !hasIncome)   return { type: "growth_focused",        typeKo: "성장률 중심 데이터" };
  if (!hasIncome)                return { type: "valuation_only",        typeKo: "밸류에이션 중심 데이터" };

  if (dateCol) {
    const dates = rows.slice(0, 20).map(r => String(r[dateCol] ?? ""));
    if (dates.some(d => /Q[1-4]/i.test(d))) return { type: "quarterly", typeKo: "분기 재무데이터" };
    const parsed = dates.map(d => parseDate(d)).filter((d): d is Date => d !== null);
    if (parsed.length >= 3) {
      parsed.sort((a, b) => a.getTime() - b.getTime());
      const avgSpacing = (parsed[parsed.length - 1].getTime() - parsed[0].getTime()) / (parsed.length - 1) / 86400000;
      if (avgSpacing < 120) return { type: "quarterly", typeKo: "분기 재무데이터" };
      if (avgSpacing > 200) return { type: "annual",    typeKo: "연간 재무데이터" };
    }
  }
  return { type: "mixed", typeKo: "혼합 재무데이터" };
}

function buildFinancialSemanticGroups(financialMetrics: Partial<Record<FinancialCanonicalColumn, FinancialSemanticMetric>>) {
  const groups = Object.fromEntries((Object.keys(FIN_SEMANTIC_LABELS) as FinancialSemanticGroup[]).map((group) => [
    group,
    { labelKo: FIN_SEMANTIC_LABELS[group], metrics: [] as FinancialCanonicalColumn[], validCount: 0, anomalyCount: 0, score: null as number | null },
  ])) as FinancialAnalysis["semanticGroups"];
  for (const [col, metric] of Object.entries(financialMetrics) as [FinancialCanonicalColumn, FinancialSemanticMetric][]) {
    const g = groups[metric.semanticGroup];
    g.metrics.push(col);
    if (metric.validationStatus === "anomaly" || metric.validationStatus === "invalid") g.anomalyCount++;
    if (metric.scoreValue !== null) g.validCount++;
  }
  for (const group of Object.values(groups)) {
    const scores = group.metrics.map((col) => financialMetrics[col]?.scoreValue).filter((v): v is number => v !== null && v !== undefined);
    group.score = scores.length ? Math.round(fMean(scores)) : null;
  }
  return groups;
}

function buildStructuralPenalties(
  features: Partial<Record<FinancialCanonicalColumn, FinancialIndicatorFeatures>>,
  available: FinancialCanonicalColumn[],
  relations: CrossSignalRelation[]
): FinancialAnalysis["structuralPenalties"] {
  const has = (col: FinancialCanonicalColumn) => available.includes(col) && features[col] !== undefined;
  const up = (col: FinancialCanonicalColumn) => has(col) && features[col]?.trendDirection === "상승";
  const dn = (col: FinancialCanonicalColumn) => has(col) && features[col]?.trendDirection === "하락";
  const penalties: FinancialAnalysis["structuralPenalties"] = [];
  const add = (id: string, labelKo: string, severity: "LOW" | "MEDIUM" | "HIGH", explanationKo: string, scorePenalty: number, confidencePenalty: number) =>
    penalties.push({ id, labelKo, severity, explanationKo, scorePenalty, confidencePenalty });

  if (up("revenue") && dn("eps")) add("rev_up_eps_down", "매출 성장 대비 EPS 악화", "MEDIUM", "매출이 늘어도 EPS가 하락하면 희석, 세금, 비영업손실 또는 마진 훼손 가능성을 점검해야 합니다.", 6, 7);
  if ((up("operating_income") || up("net_income")) && (dn("operating_cashflow") || dn("free_cashflow"))) add("profit_up_cashflow_down", "이익-현금흐름 괴리", "HIGH", "이익 개선이 현금흐름으로 전환되지 않아 이익 품질 저하 가능성이 있습니다.", 10, 10);
  if (up("debt") && (dn("current_ratio") || dn("quick_ratio") || dn("interest_coverage"))) add("debt_up_liquidity_down", "부채 증가와 유동성 약화", "HIGH", "부채 부담이 커지는 동시에 유동성 또는 이자상환능력이 약해져 금융 압력이 높아집니다.", 10, 10);
  if ((up("operating_margin") || up("gross_margin") || up("net_margin")) && dn("revenue")) add("margin_up_revenue_down", "매출 감소 속 마진 개선", "LOW", "마진은 좋아졌지만 매출이 줄어 비용 절감형 개선인지 수요 회복인지 구분이 필요합니다.", 4, 4);
  if ((up("revenue") || up("yoy_growth")) && up("shares_outstanding")) add("growth_with_dilution", "성장과 주식 희석 동반", "MEDIUM", "성장 신호가 있으나 발행주식수 증가가 주주 몫을 희석할 수 있습니다.", 7, 6);

  for (const rel of relations.filter((r) => r.severity === "danger")) {
    add(`relation_${rel.id}`, rel.labelKo, "HIGH", rel.assessmentKo, 8, 8);
  }
  return penalties;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function buildFinancialAnalysis(rows: Row[]): FinancialAnalysis {
  const NULL_RESULT: FinancialAnalysis = {
    detected: false, dataType: "mixed", dataTypeKo: "혼합 재무데이터",
    confidence: 0, confidenceLabel: "미감지", rowCount: 0, dateRange: null,
    mapping: [], availableColumns: [], features: {}, series: {}, normalizedSeries: {},
    crossSignals: [],
    structure: {
      qualityScore: 50, scoreMultiplier: 1.0, label: "Neutral Quality", labelKo: "중립 재무 품질",
      confirmingPairs: 0, contradictingPairs: 0, dangerPairs: 0, totalAnalyzedPairs: 0,
      keyStrengthsKo: [], keyWeaknessesKo: [], contradictionSummaryKo: "신호 없음", confidencePenaltyKo: "없음",
    },
    score: {
      total: 50, rawTotal: 50, components: { growth: 50, profitability: 50, stability: 50, cashflow: 50, efficiency: 50, valuationSupport: 50, shareholderReturn: 50, leverageRisk: 50, earningsQuality: 50 },
      activeComponents: 0, level: "Neutral Quality", levelKo: "중립 재무 품질", penaltyApplied: false, penaltyReasonKo: "",
    },
    risks: [], aiSummary: {
      overallKo: "", growthNarrativeKo: "", profitabilityNarrativeKo: "", riskNarrativeKo: "",
      crossSignalNarrativeKo: "", qualityLabelKo: "", growthClassKo: "", riskClassKo: "",
      ltOutlookKo: "", stOutlookKo: "", scoreExplanationKo: "", scenarios: [],
    },
    warnings: [],
    metricPipeline: null,
    metrics: {},
    financialMetrics: {},
    semanticGroups: {
      SCALE_SIZE: { labelKo: FIN_SEMANTIC_LABELS.SCALE_SIZE, metrics: [], validCount: 0, anomalyCount: 0, score: null },
      PROFITABILITY: { labelKo: FIN_SEMANTIC_LABELS.PROFITABILITY, metrics: [], validCount: 0, anomalyCount: 0, score: null },
      GROWTH: { labelKo: FIN_SEMANTIC_LABELS.GROWTH, metrics: [], validCount: 0, anomalyCount: 0, score: null },
      PER_SHARE: { labelKo: FIN_SEMANTIC_LABELS.PER_SHARE, metrics: [], validCount: 0, anomalyCount: 0, score: null },
      DIVIDEND: { labelKo: FIN_SEMANTIC_LABELS.DIVIDEND, metrics: [], validCount: 0, anomalyCount: 0, score: null },
      LEVERAGE_STABILITY: { labelKo: FIN_SEMANTIC_LABELS.LEVERAGE_STABILITY, metrics: [], validCount: 0, anomalyCount: 0, score: null },
      CASHFLOW_QUALITY: { labelKo: FIN_SEMANTIC_LABELS.CASHFLOW_QUALITY, metrics: [], validCount: 0, anomalyCount: 0, score: null },
    },
    structuralPenalties: [],
    metricAudit: [],
  };

  if (!rows.length) return NULL_RESULT;

  const mapping = detectFinancialColumns(rows);
  if (mapping.length < 1) return NULL_RESULT;

  const dateCol = findDateColumn(rows);
  const available = mapping.map(m => m.canonical);
  const metricPipeline = buildUniversalMetricPipeline(rows, {
    datasetType: "financial_statement",
    columns: mapping.map((m) => m.source),
    canonicalMap: Object.fromEntries(mapping.map((m) => [m.source, m.canonical])),
  });
  const metrics: Partial<Record<FinancialCanonicalColumn, UniversalMetric>> = {};
  for (const m of mapping) {
    const metric = metricPipeline.metrics.find((item) => item.originalColumnName === m.source);
    if (metric) metrics[m.canonical] = metric;
  }
  const financialMetrics: Partial<Record<FinancialCanonicalColumn, FinancialSemanticMetric>> = {};
  for (const m of mapping) {
    const raw = rows.slice().reverse().map((row) => row[m.source]).find((value) => value !== null && value !== undefined && String(value).trim() !== "");
    const distribution = rows.map((row) => cleanFinancialNumber(row[m.source])).filter((value): value is number => value !== null && Number.isFinite(value));
    financialMetrics[m.canonical] = buildFinancialSemanticMetric(m.canonical, m.source, raw ?? null, distribution);
  }

  const confidence = clamp(mapping.length * 0.12 + mapping.filter(m => m.confidence >= 0.9).length * 0.08, 0, 1);
  const confidenceLabel = confidence >= 0.7 ? "높음" : confidence >= 0.4 ? "보통" : "제한적";

  const series: FinancialSeriesMap = {};
  const normalizedSeries: FinancialSeriesMap = {};
  for (const m of mapping) {
    const pts = extractFinancialSeries(rows, m.source, dateCol);
    if (pts.length > 0) { series[m.canonical] = pts; normalizedSeries[m.canonical] = normSeries(pts); }
  }

  const availableWithSeries = available.filter(c => {
    const metric = financialMetrics[c];
    const usable = metric?.validationStatus !== "anomaly" && metric?.validationStatus !== "invalid";
    return usable && (series[c]?.length ?? 0) > 0;
  });
  const allDates = Object.values(series).flat().map(p => p.date).sort();
  const dateRange = allDates.length >= 2 ? { start: allDates[0], end: allDates[allDates.length - 1] } : null;

  const features: Partial<Record<FinancialCanonicalColumn, FinancialIndicatorFeatures>> = {};
  for (const col of availableWithSeries) {
    const pts = series[col] ?? [];
    if (pts.length > 0) features[col] = computeFeatures(col, pts, financialMetrics[col] ?? null);
  }
  for (const col of available) {
    if (features[col]) continue;
    const metric = financialMetrics[col];
    if (metric && (metric.validationStatus === "anomaly" || metric.validationStatus === "invalid")) {
      features[col] = computeFeatures(col, series[col] ?? [], metric);
    }
  }

  // Cross-signal analysis drives everything downstream
  const crossSignals = analyzeCrossSignals(features, availableWithSeries);
  const structuralPenalties = buildStructuralPenalties(features, availableWithSeries, crossSignals);
  const structure    = classifyStructure(crossSignals, features, availableWithSeries);
  const score        = computeScore(features, availableWithSeries, structure);
  if (structuralPenalties.length > 0) {
    const penalty = Math.min(25, structuralPenalties.reduce((sum, item) => sum + item.scorePenalty, 0));
    score.rawTotal = score.total;
    score.total = Math.round(clamp(score.total - penalty, 10, 95));
    score.penaltyApplied = true;
    score.penaltyReasonKo = `구조적 재무 패널티 ${penalty}점 적용: ${structuralPenalties.slice(0, 2).map((p) => p.labelKo).join(", ")}`;
  }
  const groupCounts: Partial<Record<keyof FinancialScoreComponents, number>> = {};
  for (const col of availableWithSeries) {
    const group = FINANCIAL_INDICATOR_CONFIG[col].scoreGroup;
    groupCounts[group] = (groupCounts[group] ?? 0) + 1;
  }
  for (const col of available) {
    const metric = financialMetrics[col];
    if (!metric) continue;
    const group = FINANCIAL_INDICATOR_CONFIG[col].scoreGroup;
    const activeCount = groupCounts[group] ?? 0;
    metric.contributionValue =
      metric.scoreValue === null || activeCount === 0 || metric.validationStatus === "anomaly" || metric.validationStatus === "invalid"
        ? null
        : Math.round((score.components[group] / activeCount) * metric.confidence * 100) / 100;
  }
  const risks        = detectRisks(features, crossSignals, score);
  const aiSummary    = buildAISummary(score, features, crossSignals, structure, risks, availableWithSeries);
  const semanticGroups = buildFinancialSemanticGroups(financialMetrics);

  const { type: dataType, typeKo: dataTypeKo } = detectDataType(rows, dateCol, availableWithSeries);

  const warnings: string[] = [];
  if (availableWithSeries.length < 3) warnings.push("감지된 재무 지표 수가 적어 교차 신호 분석이 제한됩니다.");
  if (!dateCol) warnings.push("날짜/기간 열이 감지되지 않아 시계열 분석이 제한됩니다.");
  if (crossSignals.length < 2) warnings.push("교차 신호 분석을 위한 지표 쌍이 부족합니다. 더 많은 재무 지표를 포함해주세요.");

  if (metricPipeline.warnings.length > 0) warnings.push(...metricPipeline.warnings.map((w) => `Metric Pipeline: ${w}`));
  const financialAnomalies = Object.values(financialMetrics).filter((metric) => metric.validationStatus === "anomaly" || metric.validationStatus === "invalid");
  if (financialAnomalies.length > 0) warnings.push(...financialAnomalies.map((metric) => `Financial Semantic Engine: ${metric.originalColumnName} ${metric.displayValue} raw=${String(metric.rawValue ?? "N/A")} - ${metric.anomalyReason ?? "검증 제외"}`));

  return {
    detected: true, dataType, dataTypeKo, confidence, confidenceLabel,
    rowCount: rows.length, dateRange, mapping, availableColumns: availableWithSeries,
    features, series, normalizedSeries, crossSignals, structure, score, risks, aiSummary, warnings,
    metricPipeline,
    metrics,
    financialMetrics,
    semanticGroups,
    structuralPenalties,
    metricAudit: metricPipeline.metrics,
  };
}
