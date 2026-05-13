export type UniversalDatasetType =
  | "ohlcv_price"
  | "supply_investor_flow"
  | "short_selling"
  | "options_derivatives"
  | "macro_market"
  | "financial_statement"
  | "valuation"
  | "portfolio"
  | "sentiment"
  | "onchain"
  | "news_event"
  | "etf_flow"
  | "economic_calendar"
  | "mixed_multi_factor"
  | "unknown_custom";

export type UniversalMetricType =
  | "price"
  | "amount"
  | "volume"
  | "count"
  | "percentage"
  | "ratio"
  | "index"
  | "score"
  | "basis_points"
  | "z_score"
  | "date"
  | "text"
  | "boolean"
  | "category"
  | "days"
  | "volatility"
  | "yield"
  | "growth_rate"
  | "diffusion_index";

export type UniversalUnitType =
  | "decimal_ratio"
  | "percent"
  | "basis_points"
  | "currency"
  | "raw_index"
  | "contracts"
  | "shares"
  | "days"
  | "years"
  | "score_0_100"
  | "z_score"
  | "volatility"
  | "yield_percent"
  | "growth_percent"
  | "unknown_numeric"
  | "text"
  | "date"
  | "boolean";

export type UniversalDirection = "higher_positive" | "higher_risk" | "lower_risk" | "contextual" | "neutral";
export type UniversalDirectionalMeaning = "higher_is_positive" | "higher_is_riskier" | "lower_is_riskier" | "contextual" | "neutral";
export type UniversalValidationStatus = "valid" | "warning" | "anomaly" | "invalid" | "missing";
export type UniversalSourceRole = "primary_signal" | "secondary_signal" | "identifier" | "date" | "audit_only";
export type UniversalVisualizationRole = "primary_timeseries" | "secondary_timeseries" | "heatmap" | "curve" | "bar" | "treemap" | "event_timeline" | "table_only" | "excluded";
export type UniversalScoringRole = "core_score" | "risk_adjustment" | "confidence_modifier" | "context_only" | "excluded";
export type UniversalRelationshipRole = "driver" | "confirmation" | "contradiction_check" | "context" | "none";

export type UniversalSemanticCategory =
  | "market_price"
  | "volume_liquidity"
  | "investor_flow"
  | "short_pressure"
  | "option_positioning"
  | "macro_volatility"
  | "macro_rates"
  | "macro_inflation"
  | "macro_growth"
  | "macro_labor"
  | "macro_credit"
  | "macro_liquidity"
  | "macro_currency"
  | "financial_growth"
  | "financial_profitability"
  | "financial_cashflow"
  | "financial_balance_sheet"
  | "valuation_multiple"
  | "portfolio_exposure"
  | "sentiment_attention"
  | "onchain_activity"
  | "news_event"
  | "economic_calendar"
  | "identifier"
  | "temporal"
  | "unknown";

export type UniversalMetric = {
  key: string;
  originalColumnName: string;
  semanticCategory: UniversalSemanticCategory;
  metricType: UniversalMetricType;
  unitType: UniversalUnitType;
  rawValue: unknown;
  cleanedValue: number | string | boolean | null;
  validatedValue: number | string | boolean | null;
  displayValue: string;
  normalizedValue: number | null;
  scoreValue: number | null;
  contributionValue: number | null;
  direction: UniversalDirection;
  directionalMeaning: UniversalDirectionalMeaning;
  visualizationRole: UniversalVisualizationRole;
  scoringRole: UniversalScoringRole;
  relationshipRole: UniversalRelationshipRole;
  confidence: number;
  validationStatus: UniversalValidationStatus;
  anomalyReason: string | null;
  sourceRole: UniversalSourceRole;
  semanticMetric: {
    semanticCategory: UniversalSemanticCategory;
    metricType: UniversalMetricType;
    unitType: UniversalUnitType;
    directionalMeaning: UniversalDirectionalMeaning;
    visualizationRole: UniversalVisualizationRole;
    scoringRole: UniversalScoringRole;
    relationshipRole: UniversalRelationshipRole;
  };
};

export type UniversalRelationship = {
  id: string;
  labelKo: string;
  status: "confirming" | "contradicting" | "insufficient" | "neutral";
  metricKeys: string[];
  explanationKo: string;
};

export type UniversalMetricPipelineResult = {
  datasetType: UniversalDatasetType;
  metrics: UniversalMetric[];
  relationships: UniversalRelationship[];
  semanticGroups: Array<{
    category: UniversalSemanticCategory;
    labelKo: string;
    metricCount: number;
    validCount: number;
    anomalyCount: number;
    averageScore: number | null;
    contribution: number;
  }>;
  visualizationPlan: {
    layoutKo: string;
    primaryView: string;
    secondaryViews: string[];
    excludedColumns: string[];
    compatibilityWarnings: string[];
  };
  regime: {
    labelKo: string;
    score: number;
    confidenceKo: string;
    dominantCategories: UniversalSemanticCategory[];
  };
  narrativeKo: string;
  totalScore: number | null;
  confidence: number;
  warnings: string[];
};

type MetricRow = Record<string, unknown>;

type BuildOptions = {
  datasetType?: UniversalDatasetType;
  columns?: string[];
  canonicalMap?: Record<string, string>;
};

const CATEGORY_LABEL_KO: Record<UniversalSemanticCategory, string> = {
  market_price: "가격",
  volume_liquidity: "거래량/유동성",
  investor_flow: "수급",
  short_pressure: "공매도 압력",
  option_positioning: "옵션 포지셔닝",
  macro_volatility: "변동성",
  macro_rates: "금리",
  macro_inflation: "물가",
  macro_growth: "성장",
  macro_labor: "고용",
  macro_credit: "신용",
  macro_liquidity: "유동성",
  macro_currency: "달러/환율",
  financial_growth: "펀더멘탈 성장",
  financial_profitability: "수익성",
  financial_cashflow: "현금흐름",
  financial_balance_sheet: "재무 안정성",
  valuation_multiple: "밸류에이션",
  portfolio_exposure: "포트폴리오 노출",
  sentiment_attention: "심리/관심도",
  onchain_activity: "온체인 활동",
  news_event: "뉴스 이벤트",
  economic_calendar: "경제 캘린더",
  identifier: "식별자",
  temporal: "시간",
  unknown: "미분류",
};

const CATEGORY_WEIGHT: Partial<Record<UniversalSemanticCategory, number>> = {
  macro_volatility: 1.05,
  macro_rates: 0.95,
  macro_inflation: 0.9,
  macro_growth: 1,
  macro_labor: 0.9,
  macro_credit: 1.1,
  macro_liquidity: 1,
  macro_currency: 0.8,
  short_pressure: 0.9,
  option_positioning: 0.95,
  market_price: 1,
  volume_liquidity: 0.8,
  financial_growth: 1,
  financial_profitability: 1,
  financial_cashflow: 1.05,
  financial_balance_sheet: 0.9,
  valuation_multiple: 0.85,
  portfolio_exposure: 0.85,
  sentiment_attention: 0.65,
  onchain_activity: 0.75,
  economic_calendar: 0.7,
};

const PERCENT_NAME_RE = /pct|percent|percentage|ratio|rate|yield|margin|roe|roa|growth|fee|weight|allocation|비율|수익률|증가율|마진|금리|이자율|차입비용/i;
const BPS_NAME_RE = /bps|basis.?points?|bp$|spread_bps|스프레드.*bp/i;
const DATE_NAME_RE = /date|time|datetime|period|quarter|year|expiry|expiration|만기|날짜|일자|기간/i;
const TEXT_NAME_RE = /ticker|symbol|name|sector|industry|category|regime|label|event|headline|종목|섹터|업종|분류|이름/i;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function mean(vals: number[]) {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function std(vals: number[]) {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / (vals.length - 1));
}

function compact(n: number, digits = 2) {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(digits)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(digits)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[_\-\s/]+/g, " ").trim();
}

function cleanNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || /^(na|n\/a|null|nan|none|-|--|#n\/a)$/i.test(raw)) return null;
  const negative = /^\(.*\)$/.test(raw);
  const stripped = raw.replace(/[,%$₩€£\s]/g, "").replace(/[()]/g, "");
  const n = Number(stripped);
  return Number.isFinite(n) ? (negative ? -n : n) : null;
}

function latestNonEmpty(rows: MetricRow[], col: string) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i]?.[col];
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return null;
}

function numericDistribution(rows: MetricRow[], col: string) {
  return rows.map((r) => cleanNumber(r[col])).filter((v): v is number => v !== null && Number.isFinite(v));
}

function inferDatasetType(cols: string[]): UniversalDatasetType {
  const joined = cols.map(normalizeName).join(" ");
  const score = (patterns: RegExp[]) => patterns.reduce((s, re) => s + (re.test(joined) ? 1 : 0), 0);
  const candidates: Array<[UniversalDatasetType, number]> = [
    ["options_derivatives", score([/option|strike|expiry|expiration|call|put|gamma|delta|iv|open interest|행사가|만기/])],
    ["short_selling", score([/short|borrow|lending|utilization|days to cover|공매도|대차|차입/])],
    ["macro_market", score([/vix|dxy|cpi|pmi|unemployment|yield|spread|fed|gdp|inflation|금리|물가|실업|국채/])],
    ["financial_statement", score([/revenue|sales|operating income|net income|eps|roe|cashflow|assets|liabilities|매출|영업이익|순이익/])],
    ["valuation", score([/\bper\b|p\/e|pbr|p\/b|ev\/ebitda|valuation|multiple|밸류|배수/])],
    ["portfolio", score([/weight|allocation|holding|position|portfolio|exposure|비중|보유/])],
    ["sentiment", score([/sentiment|mention|polarity|tone|social|감성|언급/])],
    ["onchain", score([/wallet|hash|exchange inflow|tvl|gas|miner|staking|온체인/])],
    ["etf_flow", score([/etf|aum|creation|redemption|fund flow|설정|환매/])],
    ["economic_calendar", score([/actual|forecast|previous|surprise|calendar|consensus|예상|발표/])],
    ["ohlcv_price", score([/\bopen\b|\bhigh\b|\blow\b|\bclose\b|volume|ohlcv|종가|거래량/])],
  ];
  candidates.sort((a, b) => b[1] - a[1]);
  if (candidates[0][1] >= 2) return candidates[0][0];
  if (candidates[0][1] === 1) return "mixed_multi_factor";
  return "unknown_custom";
}

function semanticCategory(name: string, datasetType: UniversalDatasetType): UniversalSemanticCategory {
  const n = normalizeName(name);
  if (DATE_NAME_RE.test(name)) return "temporal";
  if (TEXT_NAME_RE.test(name)) return "identifier";
  if (/vix|move|volatility|realized vol|implied vol/.test(n)) return "macro_volatility";
  if (/fed|rate|yield|treasury|real yield|금리|국채/.test(n)) return "macro_rates";
  if (/cpi|ppi|inflation|breakeven|물가|인플레이션/.test(n)) return "macro_inflation";
  if (/pmi|ism/.test(n)) return "macro_growth";
  if (/gdp|production|retail|growth|성장|생산|소매/.test(n)) return datasetType === "financial_statement" ? "financial_growth" : "macro_growth";
  if (/unemployment|payroll|wage|labor|실업|고용|임금/.test(n)) return "macro_labor";
  if (/credit|spread|cds|default|hy/.test(n)) return "macro_credit";
  if (/liquidity|money supply|balance sheet|reserve|repo|유동성/.test(n)) return "macro_liquidity";
  if (/dxy|dollar|fx|currency|환율|달러/.test(n)) return "macro_currency";
  if (/short|borrow|lending|utilization|cover|공매도|대차|차입/.test(n)) return "short_pressure";
  if (/option|strike|expiry|gamma|delta|put|call|iv|oi|open interest|행사가|만기/.test(n)) return "option_positioning";
  if (/revenue|sales|growth|yoy|매출/.test(n)) return "financial_growth";
  if (/margin|profit|income|eps|roe|roa|ebitda|이익|마진/.test(n)) return "financial_profitability";
  if (/cash.?flow|fcf|ocf|capex|현금/.test(n)) return "financial_cashflow";
  if (/debt|equity|asset|liabilit|book|balance|shares|부채|자산|자본/.test(n)) return "financial_balance_sheet";
  if (/per|p\/e|pbr|p\/b|ev\/ebitda|multiple|valuation|밸류/.test(n)) return "valuation_multiple";
  if (/weight|allocation|holding|position|exposure|portfolio/.test(n)) return "portfolio_exposure";
  if (/sentiment|mention|polarity|attention|news|social/.test(n)) return "sentiment_attention";
  if (/wallet|tvl|gas|hash|exchange|staking|onchain/.test(n)) return "onchain_activity";
  if (/actual|forecast|previous|surprise|calendar|consensus/.test(n)) return "economic_calendar";
  if (/price|open|high|low|close|vwap|종가|가격/.test(n)) return "market_price";
  if (/volume|liquidity|거래량|유동성/.test(n)) return "volume_liquidity";
  if (/headline|event|news|뉴스|공시/.test(n)) return "news_event";
  return "unknown";
}

function metricType(name: string, semantic: UniversalSemanticCategory, values: number[]): UniversalMetricType {
  const n = normalizeName(name);
  if (DATE_NAME_RE.test(name)) return "date";
  if (TEXT_NAME_RE.test(name)) return "text";
  if (/boolean|flag|is_|true|false/.test(n)) return "boolean";
  if (BPS_NAME_RE.test(name)) return "basis_points";
  if (/zscore|z score/.test(n)) return "z_score";
  if (/days|dte|duration|잔존일수|일수/.test(n)) return "days";
  if (/pmi|ism/.test(n)) return "diffusion_index";
  if (/vix|volatility|iv|implied vol|realized vol/.test(n)) return "volatility";
  if (/yield|interest rate|policy rate|금리|수익률/.test(n)) return "yield";
  if (/growth|yoy|qoq|mom|증가율|성장률/.test(n)) return "growth_rate";
  if (/score|rank|signal/.test(n)) return "score";
  if (PERCENT_NAME_RE.test(name)) return /ratio|pcr|put call/.test(n) ? "ratio" : "percentage";
  if (/volume|shares|contracts|count|거래량|수량|주식수/.test(n)) return /volume/.test(n) ? "volume" : "count";
  if (/value|amount|notional|balance|market cap|debt|asset|liabilit|revenue|income|cash|대금|금액|매출|이익|자산|부채/.test(n)) return "amount";
  if (/price|open|high|low|close|strike|vwap|행사가|가격/.test(n)) return "price";
  if (/dxy|index|지수/.test(n)) return "index";
  return values.length ? "amount" : "text";
}

function unitType(name: string, type: UniversalMetricType, values: number[]): UniversalUnitType {
  const n = normalizeName(name);
  const absMax = values.length ? Math.max(...values.map(Math.abs)) : 0;
  if (type === "date") return "date";
  if (type === "text" || type === "category") return "text";
  if (type === "boolean") return "boolean";
  if (type === "basis_points" || BPS_NAME_RE.test(name)) return "basis_points";
  if (type === "days") return "days";
  if (/years|year|연수/.test(n)) return "years";
  if (type === "z_score") return "z_score";
  if (type === "score") return "score_0_100";
  if (type === "volatility") return absMax > 0 && absMax <= 1.5 ? "decimal_ratio" : "volatility";
  if (type === "yield") return absMax > 0 && absMax <= 1.5 ? "decimal_ratio" : "yield_percent";
  if (type === "growth_rate") return absMax > 0 && absMax <= 1.5 ? "decimal_ratio" : "growth_percent";
  if (type === "price" || /currency|amount|value|revenue|income|cash|debt|asset|liabilit/.test(n)) return "currency";
  if (type === "volume" || /shares|주식수|수량/.test(n)) return "shares";
  if (/contracts|계약/.test(n)) return "contracts";
  if (type === "index" || type === "diffusion_index") return "raw_index";
  if ((type === "percentage" || type === "ratio") && PERCENT_NAME_RE.test(name)) return absMax > 0 && absMax <= 1.5 ? "decimal_ratio" : "percent";
  return "unknown_numeric";
}

function direction(name: string, semantic: UniversalSemanticCategory, type: UniversalMetricType): UniversalDirection {
  const n = normalizeName(name);
  if (semantic === "financial_growth" || semantic === "financial_profitability" || semantic === "financial_cashflow") return "higher_positive";
  if (semantic === "macro_growth" && (type === "diffusion_index" || /pmi|gdp|retail|production/.test(n))) return "lower_risk";
  if (semantic === "macro_liquidity") return "lower_risk";
  if (semantic === "portfolio_exposure" && /return|pnl|alpha/.test(n)) return "higher_positive";
  if (semantic === "investor_flow" || /net inflow|inflow|순매수/.test(n)) return "higher_positive";
  if (semantic === "valuation_multiple" || semantic === "macro_volatility" || semantic === "macro_rates" || semantic === "macro_inflation" || semantic === "macro_labor" || semantic === "macro_credit" || semantic === "macro_currency") return "higher_risk";
  if (semantic === "short_pressure" || semantic === "option_positioning") return "contextual";
  if (/debt|liabilit|leverage|부채/.test(n)) return "higher_risk";
  return "neutral";
}

function directionalMeaning(dir: UniversalDirection): UniversalDirectionalMeaning {
  if (dir === "higher_positive") return "higher_is_positive";
  if (dir === "higher_risk") return "higher_is_riskier";
  if (dir === "lower_risk") return "lower_is_riskier";
  if (dir === "contextual") return "contextual";
  return "neutral";
}

function visualizationRole(datasetType: UniversalDatasetType, semantic: UniversalSemanticCategory, type: UniversalMetricType): UniversalVisualizationRole {
  if (semantic === "identifier") return "table_only";
  if (semantic === "temporal") return "excluded";
  if (type === "date" || type === "text" || type === "boolean" || type === "category") return "table_only";
  if (datasetType === "portfolio") return semantic === "portfolio_exposure" ? "treemap" : "bar";
  if (datasetType === "options_derivatives") return semantic === "option_positioning" ? "curve" : "secondary_timeseries";
  if (datasetType === "short_selling") return semantic === "short_pressure" ? "heatmap" : "secondary_timeseries";
  if (datasetType === "macro_market") return "bar";
  if (datasetType === "news_event" || datasetType === "economic_calendar") return "event_timeline";
  if (semantic === "market_price" || semantic === "financial_growth" || semantic === "financial_profitability" || semantic === "financial_cashflow") return "primary_timeseries";
  return "secondary_timeseries";
}

function scoringRole(semantic: UniversalSemanticCategory, type: UniversalMetricType): UniversalScoringRole {
  if (semantic === "identifier" || semantic === "temporal" || type === "date" || type === "text" || type === "boolean" || type === "category") return "excluded";
  if (semantic === "unknown") return "context_only";
  if (semantic === "short_pressure" || semantic === "option_positioning" || semantic === "sentiment_attention") return "risk_adjustment";
  if (semantic === "macro_liquidity" || semantic === "economic_calendar") return "confidence_modifier";
  return "core_score";
}

function relationshipRole(semantic: UniversalSemanticCategory, role: UniversalScoringRole): UniversalRelationshipRole {
  if (role === "excluded") return "none";
  if (role === "core_score") return "driver";
  if (role === "risk_adjustment") return "confirmation";
  if (role === "confidence_modifier") return "context";
  return "contradiction_check";
}

function sourceRole(type: UniversalMetricType, semantic: UniversalSemanticCategory): UniversalSourceRole {
  if (semantic === "identifier") return "identifier";
  if (semantic === "temporal" || type === "date") return "date";
  if (type === "text" || type === "category" || type === "boolean") return "audit_only";
  if (semantic === "unknown") return "secondary_signal";
  return "primary_signal";
}

function validate(name: string, type: UniversalMetricType, unit: UniversalUnitType, semantic: UniversalSemanticCategory, value: number | null, values: number[]) {
  if (value === null) return { status: "missing" as const, reason: "값이 비어 있거나 숫자로 파싱할 수 없습니다." };
  const n = normalizeName(name);
  const v = value;
  const st = std(values);
  const z = st > 0 && values.length >= 8 ? Math.abs((v - mean(values)) / st) : 0;

  if (z > 8) return { status: "anomaly" as const, reason: "업로드된 데이터 분포 대비 극단 이상치입니다." };
  if ((type === "percentage" || type === "ratio" || type === "yield" || type === "growth_rate") && ["percent", "yield_percent", "growth_percent"].includes(unit) && Math.abs(v) > 100) {
    return { status: "anomaly" as const, reason: "백분율 계열 값이 현실적 범위를 벗어나 점수와 축 스케일에서 제외했습니다." };
  }
  if (type === "score" && unit === "score_0_100" && (v < 0 || v > 100)) return { status: "anomaly" as const, reason: "0~100 점수 범위를 벗어났습니다." };
  if (type === "days" && (v < 0 || v > 36500)) return { status: "anomaly" as const, reason: "일수 값의 현실적 범위를 벗어났습니다." };
  if ((type === "volume" || type === "count") && v < 0) return { status: "invalid" as const, reason: "수량/거래량은 음수가 될 수 없습니다." };
  if (type === "price" && /price|open|high|low|close|strike|행사가/.test(n) && v <= 0) return { status: "invalid" as const, reason: "가격 계열 값은 0보다 커야 합니다." };
  if (type === "diffusion_index" && (v < 0 || v > 100)) return { status: "anomaly" as const, reason: "확산지수는 일반적으로 0~100 범위여야 합니다." };
  if (semantic === "macro_volatility" && /vix|move/.test(n) && (v < 0 || v > 150)) return { status: "anomaly" as const, reason: "변동성 지수 검증 범위를 벗어났습니다." };
  if (semantic === "macro_currency" && /dxy/.test(n) && (v < 50 || v > 200)) return { status: "anomaly" as const, reason: "DXY 검증 범위를 벗어났습니다." };
  if (semantic === "valuation_multiple" && /per|p\/e/.test(n) && (v < 0 || v > 200)) return { status: "warning" as const, reason: "PER 일반 검증 범위를 벗어나 낮은 신뢰도로 사용합니다." };
  if (semantic === "portfolio_exposure" && (unit === "percent" || unit === "decimal_ratio") && (v < 0 || v > 100)) return { status: "anomaly" as const, reason: "포트폴리오 비중 검증 범위를 벗어났습니다." };
  if (semantic === "financial_balance_sheet" && /asset|자산/.test(n) && v < 0) return { status: "invalid" as const, reason: "자산 값은 음수로 해석할 수 없습니다." };
  return { status: z > 5 ? "warning" as const : "valid" as const, reason: z > 5 ? "분포상 큰 값이므로 낮은 신뢰도로 사용합니다." : null };
}

function display(type: UniversalMetricType, unit: UniversalUnitType, value: number | string | boolean | null, status: UniversalValidationStatus) {
  if (status === "missing") return "N/A";
  if (status === "invalid" || status === "anomaly") return "Invalid / anomaly";
  if (typeof value !== "number") return value == null ? "N/A" : String(value);
  if (unit === "decimal_ratio") return `${(value * 100).toFixed(2)}%`;
  if (unit === "percent" || unit === "yield_percent" || unit === "growth_percent" || unit === "volatility") return `${value.toFixed(Math.abs(value) < 10 ? 2 : 1)}%`;
  if (unit === "basis_points") return `${value.toFixed(0)} bps`;
  if (unit === "days") return `${value.toFixed(value < 10 ? 2 : 1)}일`;
  if (unit === "years") return `${value.toFixed(value < 10 ? 2 : 1)}년`;
  if (unit === "score_0_100") return `${clamp(value, 0, 100).toFixed(0)}/100`;
  if (unit === "currency" || type === "amount") return compact(value);
  if (unit === "shares" || unit === "contracts" || type === "volume" || type === "count") return compact(value, 0);
  if (type === "price" || type === "index" || type === "diffusion_index") return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function normalize(value: number | null, values: number[], status: UniversalValidationStatus) {
  if (value === null || status === "invalid" || status === "anomaly" || status === "missing") return null;
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const idx = sorted.findIndex((v) => v >= value);
  const pct = idx < 0 ? 1 : sorted.length === 1 ? 0.5 : idx / (sorted.length - 1);
  return clamp(pct, 0, 1);
}

function score(norm: number | null, value: number | null, unit: UniversalUnitType, dir: UniversalDirection, type: UniversalMetricType, status: UniversalValidationStatus) {
  if (norm === null || value === null || status === "invalid" || status === "anomaly" || status === "missing") return null;
  let base = unit === "score_0_100" ? clamp(value, 0, 100) : norm * 100;
  if (type === "diffusion_index") base = value < 50 ? clamp((50 - value) * 4, 0, 100) : clamp(50 - (value - 50) * 2, 0, 100);
  if (dir === "lower_risk") base = 100 - base;
  if (dir === "higher_positive") base = 100 - base;
  if (dir === "neutral") base = 50;
  if (dir === "contextual") base = clamp(base * 0.7 + 15, 0, 100);
  return Math.round(clamp(base, 0, 100));
}

function relationshipLayer(metrics: UniversalMetric[], datasetType: UniversalDatasetType): UniversalRelationship[] {
  const valid = (cat: UniversalSemanticCategory) => metrics.find((m) => m.semanticCategory === cat && m.scoreValue !== null);
  const rels: UniversalRelationship[] = [];
  const mk = (id: string, labelKo: string, cats: UniversalSemanticCategory[], explanationKo: string) => {
    const ms = cats.map(valid).filter((m): m is UniversalMetric => Boolean(m));
    rels.push({ id, labelKo, status: ms.length >= 2 ? "confirming" : ms.length === 1 ? "insufficient" : "neutral", metricKeys: ms.map((m) => m.key), explanationKo });
  };
  if (datasetType === "macro_market" || datasetType === "mixed_multi_factor") {
    mk("macro_stress", "거시 스트레스 확인", ["macro_volatility", "macro_credit", "macro_labor"], "변동성, 신용, 고용이 함께 확인될 때 시스템 스트레스 신뢰도가 높아집니다.");
    mk("tightening_pressure", "긴축 압력 확인", ["macro_rates", "macro_inflation", "macro_currency"], "금리, 물가, 달러 강세가 결합되면 금융여건 긴축으로 해석합니다.");
  }
  if (datasetType === "short_selling" || datasetType === "mixed_multi_factor") mk("short_squeeze_context", "공매도 압력 연결", ["short_pressure", "market_price", "volume_liquidity"], "공매도 신호는 가격과 거래량 확인이 있을 때 방향성 의미가 강해집니다.");
  if (datasetType === "options_derivatives" || datasetType === "mixed_multi_factor") mk("options_positioning", "옵션 포지셔닝 연결", ["option_positioning", "market_price", "volume_liquidity"], "PCR, IV, 감마, 미결제약정은 가격 흐름과 함께 해석해야 합니다.");
  if (datasetType === "financial_statement" || datasetType === "mixed_multi_factor") {
    mk("fundamental_quality", "펀더멘탈 품질 연결", ["financial_growth", "financial_profitability", "financial_cashflow"], "성장, 수익성, 현금흐름이 동시에 확인될 때 재무 품질 신뢰도가 높아집니다.");
    mk("balance_quality", "재무 안정성 연결", ["financial_balance_sheet", "financial_cashflow", "valuation_multiple"], "부채/자본 구조는 현금창출력과 밸류에이션 부담을 함께 봅니다.");
  }
  return rels;
}

function buildSemanticGroups(metrics: UniversalMetric[]) {
  const cats = Array.from(new Set(metrics.map((m) => m.semanticCategory)));
  return cats.map((category) => {
    const group = metrics.filter((m) => m.semanticCategory === category);
    const valid = group.filter((m) => m.scoreValue !== null);
    const anomaly = group.filter((m) => m.validationStatus === "anomaly" || m.validationStatus === "invalid");
    const avg = valid.length ? Math.round(mean(valid.map((m) => m.scoreValue ?? 0))) : null;
    const contribution = Math.round(group.reduce((s, m) => s + (m.contributionValue ?? 0), 0) * 10) / 10;
    return { category, labelKo: CATEGORY_LABEL_KO[category], metricCount: group.length, validCount: valid.length, anomalyCount: anomaly.length, averageScore: avg, contribution };
  }).sort((a, b) => b.contribution - a.contribution);
}

function buildVisualizationPlan(datasetType: UniversalDatasetType, metrics: UniversalMetric[]) {
  const excludedColumns = metrics.filter((m) => m.visualizationRole === "excluded" || m.validationStatus === "anomaly" || m.validationStatus === "invalid").map((m) => m.originalColumnName);
  const compatibilityWarnings: string[] = [];
  const unitsByCategory = new Map<UniversalSemanticCategory, Set<UniversalUnitType>>();
  for (const m of metrics.filter((item) => item.scoreValue !== null)) {
    const set = unitsByCategory.get(m.semanticCategory) ?? new Set<UniversalUnitType>();
    set.add(m.unitType);
    unitsByCategory.set(m.semanticCategory, set);
  }
  for (const [cat, units] of unitsByCategory) {
    if (units.size > 2) compatibilityWarnings.push(`${CATEGORY_LABEL_KO[cat]} 그룹은 단위가 섞여 있어 같은 축에 직접 표시하지 않습니다.`);
  }
  const planByType: Record<UniversalDatasetType, { layoutKo: string; primaryView: string; secondaryViews: string[] }> = {
    ohlcv_price: { layoutKo: "가격 구조 중심 레이아웃", primaryView: "캔들/가격 추세", secondaryViews: ["거래량", "변동성", "추세 확인"] },
    supply_investor_flow: { layoutKo: "수급 주체 중심 레이아웃", primaryView: "투자자별 순매수 흐름", secondaryViews: ["누적 수급", "주체 기여도"] },
    short_selling: { layoutKo: "공매도 압력 중심 레이아웃", primaryView: "압력 히트맵", secondaryViews: ["DTC", "차입비용", "가격 확인"] },
    options_derivatives: { layoutKo: "옵션 포지셔닝 중심 레이아웃", primaryView: "행사가/만기 집중도", secondaryViews: ["감마 곡선", "IV/PCR", "미결제약정"] },
    macro_market: { layoutKo: "거시 레짐 패널 레이아웃", primaryView: "카테고리별 레짐 패널", secondaryViews: ["변동성", "금리", "성장/물가", "신용/유동성"] },
    financial_statement: { layoutKo: "펀더멘탈 품질 레이아웃", primaryView: "성장/수익성/현금흐름 추세", secondaryViews: ["마진 분해", "재무 안정성", "관계 검증"] },
    valuation: { layoutKo: "밸류에이션 비교 레이아웃", primaryView: "멀티플 비교", secondaryViews: ["성장 대비 밸류", "ROE 확인"] },
    portfolio: { layoutKo: "포트폴리오 노출 레이아웃", primaryView: "비중 트리맵", secondaryViews: ["섹터 노출", "집중도", "성과 기여"] },
    sentiment: { layoutKo: "심리/관심도 레이아웃", primaryView: "감성 점수와 언급량", secondaryViews: ["관심도 스파이크", "가격 확인"] },
    onchain: { layoutKo: "온체인 활동 레이아웃", primaryView: "네트워크 활동", secondaryViews: ["거래소 흐름", "대형 지갑", "유동성"] },
    news_event: { layoutKo: "이벤트 타임라인 레이아웃", primaryView: "뉴스/공시 타임라인", secondaryViews: ["영향도", "카테고리", "시나리오"] },
    etf_flow: { layoutKo: "ETF 자금흐름 레이아웃", primaryView: "순유입/순유출 추세", secondaryViews: ["AUM", "섹터 로테이션", "누적 흐름"] },
    economic_calendar: { layoutKo: "경제지표 발표 레이아웃", primaryView: "실제치 vs 예상치", secondaryViews: ["서프라이즈", "이전치", "이벤트 영향"] },
    mixed_multi_factor: { layoutKo: "혼합 멀티팩터 레이아웃", primaryView: "의미 그룹별 패널", secondaryViews: ["관계 확인", "이상치 감사", "신뢰도"] },
    unknown_custom: { layoutKo: "사용자 정의 데이터 감사 레이아웃", primaryView: "검증 가능한 지표 표", secondaryViews: ["의미 추정", "이상치", "단위 확인"] },
  };
  return { ...planByType[datasetType], excludedColumns, compatibilityWarnings };
}

function buildRegime(datasetType: UniversalDatasetType, groups: ReturnType<typeof buildSemanticGroups>, relationships: UniversalRelationship[], confidence: number) {
  const dominant = groups.filter((g) => g.averageScore !== null).slice(0, 3);
  const score = dominant.length ? Math.round(mean(dominant.map((g) => g.averageScore ?? 50))) : 50;
  const confirming = relationships.filter((r) => r.status === "confirming").length;
  let labelKo = "전환 국면";
  if (datasetType === "macro_market") labelKo = score >= 70 ? "거시 스트레스" : score <= 35 ? "위험선호 확장" : confirming >= 1 ? "방어적 중립" : "전환 국면";
  else if (datasetType === "short_selling") labelKo = confirming >= 1 && score >= 60 ? "숏커버링 감시" : score >= 60 ? "공매도 압력" : "중립 압력";
  else if (datasetType === "options_derivatives") labelKo = score >= 65 ? "옵션 변동성 경계" : "방어적 포지셔닝 점검";
  else if (datasetType === "financial_statement") labelKo = score <= 40 ? "펀더멘탈 우위" : score >= 65 ? "재무 압력" : "혼재된 펀더멘탈";
  else if (datasetType === "portfolio") labelKo = score >= 65 ? "집중도 리스크" : "분산 노출";
  const confidenceKo = confidence >= 75 ? "높음" : confidence >= 45 ? "보통" : "낮음";
  return { labelKo, score, confidenceKo, dominantCategories: dominant.map((g) => g.category) };
}

function buildNarrative(datasetType: UniversalDatasetType, groups: ReturnType<typeof buildSemanticGroups>, relationships: UniversalRelationship[], anomalyCount: number, regime: ReturnType<typeof buildRegime>) {
  const top = groups.filter((g) => g.averageScore !== null).slice(0, 3).map((g) => `${g.labelKo}(${g.averageScore}/100)`);
  const confirmed = relationships.filter((r) => r.status === "confirming").map((r) => r.labelKo);
  const missing = relationships.filter((r) => r.status === "insufficient").map((r) => r.labelKo);
  const typeKo: Record<UniversalDatasetType, string> = {
    ohlcv_price: "가격",
    supply_investor_flow: "수급",
    short_selling: "공매도",
    options_derivatives: "옵션",
    macro_market: "거시",
    financial_statement: "재무제표",
    valuation: "밸류에이션",
    portfolio: "포트폴리오",
    sentiment: "심리",
    onchain: "온체인",
    news_event: "뉴스 이벤트",
    etf_flow: "ETF 자금흐름",
    economic_calendar: "경제 캘린더",
    mixed_multi_factor: "혼합 멀티팩터",
    unknown_custom: "사용자 정의",
  };
  return `${typeKo[datasetType]} 데이터로 분류했고 현재 상태는 ${regime.labelKo}입니다. 주요 압력 그룹은 ${top.length ? top.join(", ") : "아직 충분히 확인되지 않음"}입니다. ${confirmed.length ? `확인된 관계는 ${confirmed.join(", ")}입니다.` : "아직 다중 지표 확인은 제한적입니다."} ${missing.length ? `일부 관계(${missing.join(", ")})는 보조 지표가 부족해 신뢰도를 낮춥니다.` : ""} ${anomalyCount ? `이상치 ${anomalyCount}개는 원시값을 보존하되 점수와 시각화 스케일에서 제외했습니다.` : "검증 실패로 제외된 핵심 이상치는 없습니다."}`;
}

export function buildUniversalMetricPipeline(rows: MetricRow[], options: BuildOptions = {}): UniversalMetricPipelineResult {
  const columns = options.columns?.length ? options.columns : rows[0] ? Object.keys(rows[0]) : [];
  const datasetType = options.datasetType ?? inferDatasetType(columns);
  const metrics: UniversalMetric[] = columns.map((col) => {
    const semanticName = options.canonicalMap?.[col] ?? col;
    const raw = latestNonEmpty(rows, col);
    const vals = numericDistribution(rows, col);
    const cleanedNumeric = cleanNumber(raw);
    const sem = semanticCategory(semanticName, datasetType);
    const mt = metricType(semanticName, sem, vals);
    const unit = unitType(semanticName, mt, vals);
    const dir = direction(semanticName, sem, mt);
    const meaning = directionalMeaning(dir);
    const visRole = visualizationRole(datasetType, sem, mt);
    const sRole = scoringRole(sem, mt);
    const relRole = relationshipRole(sem, sRole);
    const role = sourceRole(mt, sem);
    const cleanedValue =
      mt === "text" || mt === "category" || mt === "date" ? (raw == null ? null : String(raw)) :
      mt === "boolean" ? Boolean(raw) :
      cleanedNumeric;
    const validation = typeof cleanedValue === "number"
      ? validate(semanticName, mt, unit, sem, cleanedValue, vals)
      : raw == null ? { status: "missing" as const, reason: "값이 비어 있습니다." } : { status: "valid" as const, reason: null };
    const validatedValue = validation.status === "valid" || validation.status === "warning" ? cleanedValue : null;
    const norm = typeof cleanedValue === "number" ? normalize(cleanedValue, vals, validation.status) : null;
    const sc = typeof cleanedValue === "number" ? score(norm, cleanedValue, unit, dir, mt, validation.status) : null;
    const conf = validation.status === "valid" ? 0.92 : validation.status === "warning" ? 0.62 : validation.status === "missing" ? 0.2 : 0.12;
    return {
      key: normalizeName(semanticName).replace(/\s+/g, "_") || col,
      originalColumnName: col,
      semanticCategory: sem,
      metricType: mt,
      unitType: unit,
      rawValue: raw,
      cleanedValue,
      validatedValue,
      displayValue: display(mt, unit, cleanedValue, validation.status),
      normalizedValue: norm,
      scoreValue: sc,
      contributionValue: null,
      direction: dir,
      directionalMeaning: meaning,
      visualizationRole: visRole,
      scoringRole: sRole,
      relationshipRole: relRole,
      confidence: conf,
      validationStatus: validation.status,
      anomalyReason: validation.reason,
      sourceRole: role,
      semanticMetric: { semanticCategory: sem, metricType: mt, unitType: unit, directionalMeaning: meaning, visualizationRole: visRole, scoringRole: sRole, relationshipRole: relRole },
    };
  });

  const relationships = relationshipLayer(metrics, datasetType);
  const confirmationStrength = Math.min(1.25, 0.85 + relationships.filter((r) => r.status === "confirming").length * 0.1);
  const scoringMetrics = metrics.filter((m) => m.scoreValue !== null && m.scoringRole !== "excluded");
  const categoryTotals = new Map<UniversalSemanticCategory, number>();
  for (const m of scoringMetrics) {
    const weight = CATEGORY_WEIGHT[m.semanticCategory] ?? 0.55;
    const rawContribution = (m.scoreValue ?? 0) * m.confidence * weight * confirmationStrength;
    const capped = Math.min(rawContribution, 35);
    m.contributionValue = Math.round(capped * 10) / 10;
    categoryTotals.set(m.semanticCategory, Math.min((categoryTotals.get(m.semanticCategory) ?? 0) + m.contributionValue, 45));
  }

  const semanticGroups = buildSemanticGroups(metrics).map((g) => ({ ...g, contribution: Math.round((categoryTotals.get(g.category) ?? g.contribution) * 10) / 10 }));
  const anomalyMetrics = metrics.filter((m) => m.validationStatus === "anomaly" || m.validationStatus === "invalid");
  const validScoreMetrics = scoringMetrics.filter((m) => m.scoreValue !== null);
  const coverage = columns.length ? validScoreMetrics.length / columns.length : 0;
  const anomalyPenalty = columns.length ? anomalyMetrics.length / columns.length : 0;
  const confidence = Math.round(clamp(coverage * 100 - anomalyPenalty * 35 + relationships.filter((r) => r.status === "confirming").length * 4, 0, 100));
  const totalScore = validScoreMetrics.length ? Math.round(mean(validScoreMetrics.map((m) => m.scoreValue ?? 50))) : null;
  const visualizationPlan = buildVisualizationPlan(datasetType, metrics);
  const regime = buildRegime(datasetType, semanticGroups, relationships, confidence);
  const narrativeKo = buildNarrative(datasetType, semanticGroups, relationships, anomalyMetrics.length, regime);
  const warnings = [
    ...anomalyMetrics.map((m) => `${m.originalColumnName}: ${m.anomalyReason ?? "검증 실패"} 원시값=${String(m.rawValue)}`),
    ...visualizationPlan.compatibilityWarnings,
  ];

  if (typeof console !== "undefined") {
    console.log("[Universal Semantic Pipeline]", {
      datasetType,
      metricCount: metrics.length,
      semanticGroups,
      visualizationPlan,
      relationships,
      regime,
      confidence,
      anomalyMetrics: anomalyMetrics.map((m) => ({ column: m.originalColumnName, rawValue: m.rawValue, reason: m.anomalyReason })),
    });
  }

  return { datasetType, metrics, relationships, semanticGroups, visualizationPlan, regime, narrativeKo, totalScore, confidence, warnings };
}
