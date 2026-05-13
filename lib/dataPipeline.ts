import Papa from "papaparse";
import { OptionsAnalysis, buildOptionsAnalysis } from "@/lib/optionsEngine";
import { MacroAnalysis, buildMacroAnalysis } from "@/lib/macroEngine";
import { FinancialAnalysis, buildFinancialAnalysis } from "@/lib/financialEngine";
import { ValuationAnalysis, buildValuationAnalysis } from "@/lib/valuationEngine";
import { PortfolioAnalysis, buildPortfolioAnalysis } from "@/lib/portfolioEngine";
import { DatasetClassification, classifyDataset } from "@/lib/datasetClassifier";
import { SentimentAnalysis, buildSentimentAnalysis } from "@/lib/sentimentEngine";
import { OnchainAnalysis, buildOnchainAnalysis } from "@/lib/onchainEngine";
import { NewsEventAnalysis, buildNewsEventAnalysis } from "@/lib/newsEventEngine";
import { EconomicCalendarAnalysis, buildEconomicCalendarAnalysis } from "@/lib/economicCalendarEngine";
import { EtfFlowAnalysis, buildEtfFlowAnalysis } from "@/lib/etfFlowEngine";
import { UniversalMetricPipelineResult, buildUniversalMetricPipeline } from "@/lib/universalMetricEngine";
export type { OptionsAnalysis } from "@/lib/optionsEngine";
export type { MacroAnalysis } from "@/lib/macroEngine";
export type { FinancialAnalysis } from "@/lib/financialEngine";
export type { ValuationAnalysis } from "@/lib/valuationEngine";
export type { PortfolioAnalysis } from "@/lib/portfolioEngine";
export type { DatasetClassification } from "@/lib/datasetClassifier";
export type { SentimentAnalysis } from "@/lib/sentimentEngine";
export type { OnchainAnalysis } from "@/lib/onchainEngine";
export type { NewsEventAnalysis } from "@/lib/newsEventEngine";
export type { EconomicCalendarAnalysis } from "@/lib/economicCalendarEngine";
export type { EtfFlowAnalysis } from "@/lib/etfFlowEngine";
export type { UniversalMetric, UniversalMetricPipelineResult } from "@/lib/universalMetricEngine";

export type CanonicalColumn = "date" | "open" | "high" | "low" | "close" | "volume" | "foreign" | "institution" | "vix";
export type MappingMethod = "exact" | "partial/regex" | "value inference" | "forced recovery";

export type ShortCanonicalColumn =
  | "short_volume"
  | "short_value"
  | "short_ratio"
  | "short_balance"
  | "short_balance_ratio"
  | "borrow_volume"
  | "borrow_balance"
  | "borrow_fee"
  | "cover_volume"
  | "utilization_rate"
  | "days_to_cover"
  | "squeeze_score"
  | "dark_pool_short_volume"
  | "dark_pool_short_ratio";

export type ShortColumnMapping = {
  canonical: ShortCanonicalColumn;
  source: string;
  method: MappingMethod;
  confidence: number;
  isCandidate: boolean;
};

export type ShortPressureScore = {
  score: number;
  label: string;
  components: {
    shortRatioRank: number;
    borrowFeeRank: number;
    utilizationRank: number;
    daysToCovertRank: number;
    squeezeRank: number;
    shortVolumeRatioRank: number;
    darkPoolRank: number;
    accelerationScore: number;
  };
  coveringScore: number | null;
  daysToCover: number | null;
  coveringSignal: number | null;
  warnings: string[];
};

export type ShortAnalysis = {
  detected: boolean;
  isShortOnlyMode: boolean;
  confidence: number;
  shortMapping: ShortColumnMapping[];
  availableFields: ShortCanonicalColumn[];
  candidates: ShortColumnMapping[];
  shortRows: Row[];
  shortPressure: ShortPressureScore | null;
  conflicts: { severity: "LOW" | "MEDIUM" | "HIGH"; message: string }[];
  preprocessingWarnings: string[];
};

export type Row = Record<string, unknown>;

export type ColumnMapping = {
  canonical: CanonicalColumn;
  source: string;
  method: MappingMethod;
  confidence: number;
};

export type SanitizeLog = {
  steps: string[];
  warnings: string[];
  droppedColumns: string[];
  penalties: { label: string; points: number }[];
  rowsBefore: number;
  rowsAfter: number;
  preprocessingLog: string[];
};

export type ParsedData = {
  rows: Row[];
  delimiter: string;
  encoding: string;
  parseWarnings: string[];
};

export type QualityBreakdown = {
  completeness: number;
  period: number;
  outlier: number;
  sanitizePenalty: number;
  forcedRecoveryPenalty: number;
  total: number;
};

export type Signals = {
  trend: number;
  momentum: number;
  volatility: number;
  volume: number;
  supply: number;
  risk: number;
};

export type ShortAlphaState =
  | "Alpha Confirmed"
  | "Alpha Weakened"
  | "Alpha Conflicted"
  | "Short-Covering Rebound Risk"
  | "High Short Crowding Risk";

export type ShortAlphaContext = {
  state: ShortAlphaState;
  rawAlpha: number;
  shortPressure: number;
  adjustedAlpha: number;
  levelDowngrade: number;
  biasLabel: string;
  confidenceOverride: "HIGH" | "MEDIUM" | "CAUTION" | null;
  interpretation: string;
  shortReasons: string[];
};

export type AnalysisResult = {
  parsed: ParsedData;
  rows: Row[];
  mapping: ColumnMapping[];
  sanitizeLog: SanitizeLog;
  forcedRecoveryApplied: boolean;
  quality: QualityBreakdown;
  alphaScore: number;
  rawAlphaScore: number;
  shortAlphaContext: ShortAlphaContext | null;
  baseDecision: Decision;
  finalDecision: Decision | "분석 제한";
  adjustmentReasons: string[];
  interpretation: string;
  regime: { label: string; value: 0 | 1 | 2 };
  risk: { stopLoss: number | null; method: string; atr: number | null };
  reasoningLog: string[];
  features: { name: string; score: number; contribution: number; note: string }[];
  validations: { label: string; value: string; status: "good" | "warn" | "bad" }[];
  conflicts: { severity: "LOW" | "MEDIUM" | "HIGH"; message: string }[];
  degradation: string[];
  backtestEnabled: boolean;
  liteMode: boolean;
  chart: { date: string; open?: number; high?: number; low?: number; close: number; volume?: number }[];
  shortAnalysis: ShortAnalysis;
  optionsAnalysis: OptionsAnalysis;
  macroAnalysis: MacroAnalysis;
  financialAnalysis: FinancialAnalysis;
  valuationAnalysis: ValuationAnalysis;
  portfolioAnalysis: PortfolioAnalysis;
  sentimentAnalysis: SentimentAnalysis;
  onchainAnalysis: OnchainAnalysis;
  newsEventAnalysis: NewsEventAnalysis;
  economicCalendarAnalysis: EconomicCalendarAnalysis;
  etfFlowAnalysis: EtfFlowAnalysis;
  datasetClassification: DatasetClassification;
  metricPipeline: UniversalMetricPipelineResult;
};

export type Decision = "Strong Buy" | "Buy" | "Neutral" | "Caution" | "Avoid";

const NULL_STRINGS = new Set(["nan", "null", "none", "na", "n/a", "n.a.", "#n/a", "#na", "-", "--", "---", "?", ".", " ", "", "결측", "누락", "없음", "해당없음"]);
const DELIMITERS = [",", "\t", ";", "|"];

const EXACT: Record<CanonicalColumn, string[]> = {
  date: ["date", "datetime", "time", "날짜", "일자", "거래일", "기준일"],
  open: ["open", "시가"],
  high: ["high", "고가"],
  low: ["low", "저가"],
  close: ["close", "adj close", "price", "종가", "현재가", "수정종가"],
  volume: ["volume", "vol", "거래량", "거래대금"],
  foreign: ["foreign", "foreigner", "외국인", "외국인순매수", "외인"],
  institution: ["institution", "institution_net_buy", "institution_buy", "institution_flow", "기관", "기관순매수", "기관합계", "기관매수", "기관수급"],
  vix: ["vix", "변동성지수"]
};

const REGEX: Record<CanonicalColumn, RegExp[]> = {
  date: [/date|time|일자|날짜|거래일|기준일/i],
  open: [/open|시가/i],
  high: [/high|고가/i],
  low: [/low|저가/i],
  close: [/close|price|last|종가|현재가|수정/i],
  volume: [/volume|vol|거래량|거래대금/i],
  foreign: [/foreign|foreigner|외국|외인|순매수/i],
  institution: [/institution|기관|순매수|매수|수급/i],
  vix: [/vix|변동성/i]
};

const EXACT_SHORT: Record<ShortCanonicalColumn, string[]> = {
  short_volume: ["short volume", "short_volume", "shortvol", "shorted shares", "short sell volume", "short_volume_shares", "shorted_shares", "공매도수량", "공매도 거래량", "공매도량", "공매도거래량"],
  short_value: ["short value", "short amount", "short_value", "shortvalue", "공매도금액", "공매도 금액"],
  short_ratio: ["short ratio", "short_ratio", "shortratio", "short_ratio_pct", "shortratiopct", "short interest ratio", "short %", "short%", "short_percent", "shortpercent", "short_float", "short_float_pct", "shortfloat", "shortfloatpct", "공매도비중", "공매도 비율", "공매도비율", "공매도 비중"],
  short_balance: ["short balance", "short interest", "short_interest", "shortinterest", "short position", "short_position", "short_balance", "shortbalance", "공매도잔고", "공매도 잔고"],
  short_balance_ratio: ["short balance ratio", "short interest %", "short_balance_ratio", "shortbalanceratio", "공매도잔고비율", "공매도 잔고 비율", "공매도잔고 비율"],
  borrow_volume: ["securities lending volume", "borrowed shares", "borrow_volume", "borrowvol", "대차거래량", "대차 거래량"],
  borrow_balance: ["borrow balance", "lending balance", "borrow_balance", "borrowbalance", "대차잔고", "대차 잔고"],
  borrow_fee: ["borrow fee", "stock loan fee", "lending fee", "borrow_fee", "borrowfee", "borrow_fee_pct", "borrowfeepct", "borrow_rate", "borrowrate", "cost_to_borrow", "costtoborrow", "stock_loan_fee", "stockloanfee", "대차수수료", "대차 수수료"],
  cover_volume: ["short covering volume", "repayment volume", "cover_volume", "covervol", "covering volume", "short_covering_volume", "repayment_volume", "상환수량", "상환 수량"],
  utilization_rate: ["utilization rate", "utilization_rate", "utilizationrate", "utilization_pct", "utilizationpct", "utilization", "대차활용률", "대차 활용률"],
  days_to_cover: ["days to cover", "days_to_cover", "daystocover", "dtc", "days_to_cover_ratio"],
  squeeze_score: ["squeeze score", "squeeze_score", "squeezescore", "squeeze risk", "squeeze_risk", "squeeze_index", "squeezerisk"],
  dark_pool_short_volume: ["dark pool short volume", "dark_pool_short_volume", "darkpoolshortvolume", "dp_short_volume", "dp_short_vol", "darkpool_short"],
  dark_pool_short_ratio: ["dark pool short ratio", "dark_pool_short_ratio", "dark_pool_short_ratio_pct", "darkpoolshortratio", "darkpoolshortratiopct", "dp_short_ratio", "dp_short_ratio_pct", "dpshortratiopct"]
};

const REGEX_SHORT: Record<ShortCanonicalColumn, RegExp[]> = {
  short_volume: [/short.?vol|short.?qty|shorted|short.?sell.?vol|short.?volume|공매도.?수량|공매도.?거래량/i],
  short_value: [/short.?val|short.?amt|short.?amount|공매도.?금액/i],
  short_ratio: [/short.?ratio|short.?rate|short.?pct|short.?percent|short.?float|short.?%|공매도.?비중|공매도.?비율/i],
  short_balance: [/short.?balance|short.?interest|short.?position|공매도.?잔고/i],
  short_balance_ratio: [/short.?balance.?ratio|short.?interest.?pct|short.?interest.?%|공매도.?잔고.?비율/i],
  borrow_volume: [/borrow.?vol|lend.?vol|대차.?거래량/i],
  borrow_balance: [/borrow.?balance|lend.?balance|대차.?잔고/i],
  borrow_fee: [/borrow.?fee|borrow.?rate|loan.?fee|lend.?fee|cost.?to.?borrow|stock.?loan|대차.?수수료/i],
  cover_volume: [/cover.?vol|cover.?qty|repay.?vol|상환.?수량/i],
  utilization_rate: [/utilization|대차.?활용/i],
  days_to_cover: [/days.?to.?cover|dtc/i],
  squeeze_score: [/squeeze.?score|squeeze.?risk|squeeze.?index/i],
  dark_pool_short_volume: [/dark.?pool.?short.?vol|dp.?short.?vol|darkpool.?short/i],
  dark_pool_short_ratio: [/dark.?pool.?short.?ratio|dark.?pool.?short.?pct|dp.?short.?ratio/i]
};

const TICKER_PATTERNS = [
  "ticker", "symbol", "code", "securitiescode", "종목코드", "종목명", "코드", "티커", "symbol_code", 
  "jpy_code", "stock_code", "isin", "세큐리티즈코드", "유가증권코드", "전종목코드"
];

const UNITS: Array<[RegExp, number]> = [
  [/억원?$/i, 1e8], [/천원$/i, 1e3], [/천주$/i, 1e3], [/만원$/i, 1e4], [/만주$/i, 1e4], [/억$/i, 1e8], [/만$/i, 1e4], [/천$/i, 1e3], [/k$/i, 1e3], [/m$/i, 1e6], [/b$/i, 1e9]
];

const SAMPLE_CSV = `date,open,high,low,close,volume,foreign,vix
2025-08-01,68200,69500,67600,69100,"13,240,000",120000,15.2
2025-08-02,69100,70600,68800,70200,"15,820,000",260000,14.8
2025-08-03,70200,70400,68900,69400,"11,430,000",-90000,16.1
2025-08-04,69400,71800,69200,71400,"18,040,000",320000,14.4
2025-08-05,71400,72100,70300,71900,"16,200,000",410000,13.8
2025-08-06,71900,73500,71600,73100,"19,510,000",530000,13.1
2025-08-07,73100,73800,72200,72400,"12,830,000",80000,14.6
2025-08-08,72400,74200,72100,73900,"21,020,000",610000,13.4
2025-08-09,73900,75500,73300,75100,"22,400,000",720000,12.9
2025-08-10,75100,75800,74200,74800,"17,100,000",150000,13.7
2025-08-11,74800,76100,74600,75900,"20,900,000",360000,12.8
2025-08-12,75900,77500,75500,77100,"23,600,000",640000,12.3
2025-08-13,77100,77900,76300,76600,"14,300,000",-120000,13.5
2025-08-14,76600,78200,76200,77800,"24,100,000",590000,12.4
2025-08-15,77800,78900,77400,78500,"25,300,000",700000,11.9
2025-08-16,78500,79100,77700,78100,"18,700,000",110000,12.7
2025-08-17,78100,79700,77900,79400,"26,500,000",820000,11.5
2025-08-18,79400,80300,78800,79900,"27,100,000",760000,11.2
2025-08-19,79900,80600,79200,80100,"21,800,000",420000,11.8
2025-08-20,80100,81700,79800,81300,"30,100,000",930000,10.9`;

export async function getSampleCsv() {
  try {
    const response = await fetch('/sample-data/korean_stock_signal_sample.csv');
    if (!response.ok) throw new Error('Failed to fetch sample CSV');
    return await response.text();
  } catch (error) {
    console.warn('Failed to load sample CSV, using fallback:', error);
    return SAMPLE_CSV;
  }
}

export async function analyzeFile(file: File): Promise<AnalysisResult> {
  const raw = await file.arrayBuffer();
  const parsed = parseCsv(new Uint8Array(raw));
  return analyzeRows(parsed);
}

export async function analyzeSample(): Promise<AnalysisResult> {
  const csv = await getSampleCsv();
  return analyzeRows(parseCsv(new TextEncoder().encode(csv)));
}

export function analyzeRows(parsed: ParsedData): AnalysisResult {
  const sanitizeLog: SanitizeLog = { steps: [], warnings: [...parsed.parseWarnings], droppedColumns: [], penalties: [], rowsBefore: parsed.rows.length, rowsAfter: parsed.rows.length, preprocessingLog: [] };
  
  // Step 1: Normalize column names case-insensitively
  let rows = normalizeColumnNamesCaseInsensitive(parsed.rows);
  sanitizeLog.preprocessingLog.push("✓ 컬럼명을 대소문자 구분 없이 정규화했습니다.");
  
  // Step 2: Flatten and sanitize
  rows = flattenRows(rows, sanitizeLog);
  rows = sanitizeDataframe(rows, sanitizeLog);
  const portfolioRows = rows;
  
  // Step 3: Detect multi-stock dataset and filter if needed
  const multiStockInfo = detectMultiStockDataset(rows);
  if (multiStockInfo.isMultiStock && multiStockInfo.tickerColumn) {
    sanitizeLog.preprocessingLog.push(`✓ 멀티 자산 데이터셋 감지: ${multiStockInfo.uniqueTickers.length}개 종목 포함`);
    
    const selected = selectBestStock(rows, multiStockInfo.tickerColumn);
    sanitizeLog.preprocessingLog.push(`✓ 최적 종목 선택: ${selected.ticker} (${selected.rowCount}행, 평균 거래량: ${Math.round(selected.avgVolume).toLocaleString()})`);
    
    rows = selected.filteredRows;
    sanitizeLog.rowsBefore = parsed.rows.length;
    sanitizeLog.rowsAfter = rows.length;
  }
  
  const mapping = normalizeColumns(rows, sanitizeLog);
  const forced = applyForcedRecovery(rows, mapping, sanitizeLog);
  rows = materializeCanonicalRows(rows, mapping);
  const rowsBeforeFilter = rows;
  rows = sanitizeAfterMapping(rows, sanitizeLog);

  // Check if OHLCV was restored after multi-stock filtering
  const ohlcvRestored = ["open", "high", "low"].every(c => mapping.some(m => m.canonical === c as CanonicalColumn)) && mapping.some(m => m.canonical === "close");
  if (ohlcvRestored && (multiStockInfo.isMultiStock && multiStockInfo.tickerColumn)) {
    sanitizeLog.preprocessingLog.push("✓ OHLCV 복구됨 - 전체 분석 모드 활성화");
  }

  const degradation = computeDegradation(rows, mapping);
  const quality = qualityScore(rows, sanitizeLog, forced.penalty);
  const chart = buildChart(rows);
  const signals = computeSignals(chart, rows, degradation);
  const liteMode = chart.length < 60;
  const alphaScore = computeAlphaScore(signals, quality.total, liteMode);
  const regime = detectRegime(chart);
  const risk = computeRisk(chart, degradation.includes("OHLC 없음: 라인차트 + 2σ 손절"));
  const baseConflicts = detectConflicts(signals, regime, quality.total);
  const shortAnalysis = computeShortAnalysis(rowsBeforeFilter, mapping);
  const datasetClassification = classifyDataset(portfolioRows);
  const metricPipeline = buildUniversalMetricPipeline(rowsBeforeFilter);
  if (typeof console !== "undefined") {
    console.log("[Dataset Classification]", {
      primaryType: datasetClassification.primaryType,
      confidenceScores: datasetClassification.confidenceScores,
      secondarySignals: datasetClassification.secondarySignals.map((signal) => signal.type),
      selectedEngine: datasetClassification.selectedEngine,
      suppressedEngines: datasetClassification.suppressedEngines,
      classificationReason: datasetClassification.classificationReason,
    });
  }
  const optionsAnalysis = buildOptionsAnalysis(rowsBeforeFilter);
  const macroAnalysis = buildMacroAnalysis(rowsBeforeFilter);
  const financialAnalysis = buildFinancialAnalysis(rowsBeforeFilter);
  const valuationAnalysis = buildValuationAnalysis(rowsBeforeFilter);
  const portfolioAnalysis = buildPortfolioAnalysis(portfolioRows);
  const sentimentAnalysis = buildSentimentAnalysis(rowsBeforeFilter);
  const onchainAnalysis = buildOnchainAnalysis(rowsBeforeFilter);
  const newsEventAnalysis = buildNewsEventAnalysis(rowsBeforeFilter);
  const economicCalendarAnalysis = buildEconomicCalendarAnalysis(rowsBeforeFilter);
  const etfFlowAnalysis = buildEtfFlowAnalysis(rowsBeforeFilter);

  // Build short-alpha context (organic connection between short pressure and Alpha)
  const shortAlphaContext = buildShortAlphaContext(alphaScore, shortAnalysis);
  const adjustedAlpha = shortAlphaContext?.adjustedAlpha ?? alphaScore;

  // Inject Alpha/Short conflict when both signals are elevated
  const alphaShortConflict: AnalysisResult["conflicts"] =
    shortAlphaContext?.state === "Alpha Conflicted" || shortAlphaContext?.state === "High Short Crowding Risk"
      ? [{ severity: "HIGH" as const, message: `Bullish Alpha(${alphaScore}pt)와 공매도 압력(${shortAlphaContext.shortPressure}/100)이 충돌합니다. 조건부 강세로 해석하세요.` }]
      : shortAlphaContext?.state === "Alpha Weakened" && alphaScore >= 55
      ? [{ severity: "MEDIUM" as const, message: `공매도 압력(${shortAlphaContext.shortPressure}/100)으로 Alpha 신뢰도가 낮아집니다.` }]
      : [];

  const conflicts = [...baseConflicts, ...shortAnalysis.conflicts, ...alphaShortConflict];

  const baseDecision = scoreToDecision(adjustedAlpha);
  const final = finalDecision(baseDecision, adjustedAlpha, regime.value, conflicts, quality.total);
  const features = featureContributions(signals);
  const validations = signalValidation(rows, chart, degradation, quality.total);
  const interpretationText =
    shortAlphaContext?.state === "Alpha Conflicted" || shortAlphaContext?.state === "High Short Crowding Risk"
      ? shortAlphaContext.interpretation
      : interpret(final.decision === "분석 제한" ? "Avoid" : final.decision, regime.value);
  return {
    parsed,
    rows,
    mapping,
    sanitizeLog,
    forcedRecoveryApplied: forced.applied,
    quality,
    alphaScore: adjustedAlpha,
    rawAlphaScore: alphaScore,
    shortAlphaContext,
    baseDecision,
    finalDecision: final.decision,
    adjustmentReasons: [...final.reasons, ...(shortAlphaContext?.shortReasons ?? [])],
    interpretation: interpretationText,
    regime,
    risk,
    reasoningLog: reasoning(adjustedAlpha, baseDecision, final, regime, quality.total, liteMode, forced.applied, alphaScore, shortAnalysis),
    features,
    validations,
    conflicts,
    degradation,
    backtestEnabled: chart.length >= 252,
    liteMode,
    chart,
    shortAnalysis,
    optionsAnalysis,
    macroAnalysis,
    financialAnalysis,
    valuationAnalysis,
    portfolioAnalysis,
    sentimentAnalysis,
    onchainAnalysis,
    newsEventAnalysis,
    economicCalendarAnalysis,
    etfFlowAnalysis,
    datasetClassification,
    metricPipeline,
  };
}

function parseCsv(raw: Uint8Array): ParsedData {
  const { text, encoding, warnings } = decodeBytes(raw);
  const delimiter = detectDelimiter(text);
  const preparedText = detectPortfolioHeaderText(text, delimiter, warnings);
  const parsed = Papa.parse<Row>(preparedText, { header: true, delimiter, skipEmptyLines: true, dynamicTyping: false, transformHeader: (h) => h.trim() });
  let rows = parsed.data.filter((row) => Object.values(row).some((v) => String(v ?? "").trim() !== ""));
  if (rows.length && Object.keys(rows[0]).every((key) => /^\d+(\.\d+)?$/.test(key))) {
    const noHeader = Papa.parse<string[]>(text, { header: false, delimiter, skipEmptyLines: true });
    const width = Math.max(...noHeader.data.map((r) => r.length));
    rows = noHeader.data.map((r) => Object.fromEntries(Array.from({ length: width }, (_, i) => [`col_${i}`, r[i] ?? null])));
    warnings.push("헤더 없는 CSV로 감지되어 col_0 형식의 컬럼명을 부여했습니다.");
  }
  if (parsed.errors.length) warnings.push(...parsed.errors.slice(0, 4).map((e) => `CSV 파싱 경고: ${e.message}`));
  return { rows, delimiter: delimiter === "\t" ? "tab" : delimiter, encoding, parseWarnings: warnings };
}

function detectPortfolioHeaderText(text: string, delimiter: string, warnings: string[]) {
  const raw = Papa.parse<string[]>(text, { header: false, delimiter, skipEmptyLines: true });
  const rows = raw.data.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  if (rows.length < 2) return text;

  const headerTerms = [
    "ticker", "symbol", "asset", "stock", "holding", "security", "code",
    "weight", "allocation", "ratio", "portfolio_weight", "position", "exposure", "weight_pct",
    "return", "pnl", "gain", "performance", "alpha", "return_pct", "profit",
    "sector", "industry", "theme", "group", "category",
    "asset_type", "instrument", "class", "market",
    "종목", "티커", "자산", "코드", "비중", "배분", "노출", "수익률", "성과", "섹터", "업종", "자산군"
  ];
  const metadataPattern = /generated by|portfolio summary|updated:?|as of|note:?|disclaimer|^total$|합계|요약|업데이트|생성/i;
  const scoreRow = (row: string[]) => row.reduce((score, cell) => {
    const value = String(cell ?? "").trim().toLowerCase().replace(/[\s_\-./()[\]{}]+/g, "");
    if (!value || metadataPattern.test(value)) return score - 1;
    return score + (headerTerms.some((term) => value.includes(term.toLowerCase().replace(/[\s_\-./()[\]{}]+/g, ""))) ? 1 : 0);
  }, 0);

  const candidates = rows.slice(0, Math.min(rows.length, 12)).map((row, index) => ({ row, index, score: scoreRow(row) }));
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best || best.index === 0 || best.score < 2) return text;

  warnings.push(`포트폴리오 CSV 헤더가 ${best.index + 1}번째 행에서 감지되어 앞쪽 메타데이터 행을 제거했습니다.`);
  return Papa.unparse(rows.slice(best.index), { delimiter });
}

function decodeBytes(raw: Uint8Array) {
  const warnings: string[] = [];
  const encodings = ["utf-8", "euc-kr", "cp949"];
  for (const enc of encodings) {
    try {
      const decoder = new TextDecoder(enc, { fatal: enc === "utf-8" });
      const text = decoder.decode(raw);
      const bad = (text.match(/�/g) ?? []).length;
      if (bad < Math.max(2, text.length * 0.01)) return { text, encoding: enc.toUpperCase(), warnings };
    } catch {
      warnings.push(`${enc.toUpperCase()} 디코딩 실패, 다음 인코딩을 시도했습니다.`);
    }
  }
  warnings.push("UTF-8/EUC-KR/CP949 자동 판별이 불완전해 UTF-8 replace 모드로 복구했습니다.");
  return { text: new TextDecoder("utf-8").decode(raw), encoding: "UTF-8(replace)", warnings };
}

function detectDelimiter(text: string) {
  const sample = text.split(/\r?\n/).filter(Boolean).slice(0, 5);
  const scored = DELIMITERS.map((d) => {
    const counts = sample.map((line) => line.split(d).length - 1);
    const consistent = counts.length > 0 && new Set(counts).size === 1 && counts[0] > 0;
    return { d, score: consistent ? counts[0] * 10 : counts.reduce((a, b) => a + b, 0) - new Set(counts).size };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].d : ",";
}

// Multi-stock dataset preprocessing
function normalizeColumnNamesCaseInsensitive(rows: Row[]): Row[] {
  if (rows.length === 0) return rows;
  const firstRow = rows[0];
  const columnMap = new Map<string, string>();
  Object.keys(firstRow).forEach(col => {
    const normalized = col.toLowerCase().trim();
    columnMap.set(col, normalized);
  });
  return rows.map(row => {
    const newRow: Row = {};
    Object.entries(row).forEach(([key, value]) => {
      const normalized = columnMap.get(key) || key.toLowerCase().trim();
      newRow[normalized] = value;
    });
    return newRow;
  });
}

function detectTickerColumn(rows: Row[]): string | null {
  if (rows.length === 0) return null;
  const cols = Object.keys(rows[0]);
  for (const col of cols) {
    const normalized = col.toLowerCase().trim();
    if (TICKER_PATTERNS.some(p => normalized.includes(p.toLowerCase()))) {
      return col;
    }
  }
  return null;
}

function detectMultiStockDataset(rows: Row[]): { isMultiStock: boolean; tickerColumn: string | null; uniqueTickers: string[] } {
  const tickerCol = detectTickerColumn(rows);
  if (!tickerCol) return { isMultiStock: false, tickerColumn: null, uniqueTickers: [] };
  
  const tickers = new Set<string>();
  for (const row of rows) {
    const ticker = String(row[tickerCol] ?? "").trim();
    if (ticker) tickers.add(ticker);
  }
  
  return { 
    isMultiStock: tickers.size > 1, 
    tickerColumn: tickerCol, 
    uniqueTickers: Array.from(tickers)
  };
}

function detectVolumeColumn(rows: Row[]): string | null {
  if (rows.length === 0) return null;
  const cols = Object.keys(rows[0]);
  for (const col of cols) {
    const normalized = col.toLowerCase().trim();
    if (["volume", "vol", "거래량", "거래대금"].some(p => normalized.includes(p.toLowerCase()))) {
      return col;
    }
  }
  return null;
}

function selectBestStock(rows: Row[], tickerColumn: string): { ticker: string; filteredRows: Row[]; rowCount: number; avgVolume: number } {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const ticker = String(row[tickerColumn] ?? "").trim();
    if (!grouped.has(ticker)) grouped.set(ticker, []);
    grouped.get(ticker)!.push(row);
  }
  
  let bestTicker = "";
  let bestRowCount = 0;
  let bestAvgVolume = 0;
  let bestFiltered: Row[] = [];
  
  for (const [ticker, tickerRows] of grouped) {
    const volCol = detectVolumeColumn(tickerRows);
    let avgVol = 0;
    if (volCol) {
      const volumes = tickerRows.map(r => {
        const v = cleanNumber(r[volCol]);
        return Number.isFinite(v) ? v : 0;
      }).filter(v => v > 0);
      avgVol = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;
    }
    
    const isCandidate = tickerRows.length > bestRowCount || (tickerRows.length === bestRowCount && avgVol > bestAvgVolume);
    if (isCandidate) {
      bestTicker = ticker;
      bestRowCount = tickerRows.length;
      bestAvgVolume = avgVol;
      bestFiltered = tickerRows;
    }
  }
  
  return { ticker: bestTicker, filteredRows: bestFiltered, rowCount: bestRowCount, avgVolume: bestAvgVolume };
}

function flattenRows(rows: Row[], log: SanitizeLog) {
  const flattened = rows.map((row) => flattenObject(row));
  if (flattened.some((row, i) => Object.keys(row).length !== Object.keys(rows[i] ?? {}).length)) log.steps.push("중첩 JSON 구조를 점 표기 컬럼으로 평탄화했습니다.");
  return flattened;
}

function flattenObject(obj: Row, prefix = ""): Row {
  return Object.entries(obj).reduce<Row>((acc, [key, value]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) Object.assign(acc, flattenObject(value as Row, name));
    else acc[name] = value;
    return acc;
  }, {});
}

function sanitizeDataframe(rows: Row[], log: SanitizeLog) {
  if (rows.length <= 1) {
    log.warnings.push("CRITICAL: 단일 행 데이터입니다. 제한 분석 모드로 전환합니다.");
    log.penalties.push({ label: "단일 행 guard", points: 35 });
    return rows;
  }
  const columns = getColumns(rows);
  if (columns.length <= 1) {
    log.warnings.push("CRITICAL: 단일 컬럼 데이터입니다. Forced Recovery를 시도합니다.");
    log.penalties.push({ label: "단일 컬럼 guard", points: 35 });
    return rows;
  }
  const first = rows[0];
  const stringHeaderRatio = columns.filter((c) => typeof first[c] === "string" && !isNumericString(String(first[c])) && !parseDate(String(first[c]))).length / columns.length;
  if (stringHeaderRatio > 0.7) {
    const renamed = rows.slice(1).map((row) => Object.fromEntries(columns.map((c) => [String(first[c] || c), row[c]])));
    log.steps.push("멀티 헤더/병합 셀 의심 행을 헤더로 승격했습니다.");
    rows = renamed;
  }
  let active = getColumns(rows);
  for (const col of active) {
    const values = rows.map((r) => normalizeNull(r[col]));
    if (values.every((v) => v == null)) {
      rows.forEach((r) => delete r[col]);
      log.droppedColumns.push(col);
    }
  }
  active = getColumns(rows);
  for (const col of active) {
    const vals = rows.map((r) => normalizeNull(r[col])).filter((v) => v != null).map(String);
    if (vals.length > 1 && new Set(vals).size === 1) {
      rows.forEach((r) => delete r[col]);
      log.droppedColumns.push(col);
    }
  }
  if (log.droppedColumns.length) log.steps.push("전체 NaN 컬럼과 상수 컬럼을 제거했습니다.");
  return rows;
}

function normalizeColumns(rows: Row[], log: SanitizeLog): ColumnMapping[] {
  const columns = getColumns(rows);
  const normalized = columns.map((source) => ({ source, key: normalizeName(source) }));
  const mappings: ColumnMapping[] = [];
  for (const canonical of Object.keys(EXACT) as CanonicalColumn[]) {
    const exact = normalized.find((c) => EXACT[canonical].includes(c.key));
    if (exact) mappings.push({ canonical, source: exact.source, method: "exact", confidence: 0.98 });
  }
  for (const canonical of Object.keys(REGEX) as CanonicalColumn[]) {
    if (mappings.some((m) => m.canonical === canonical)) continue;
    const partial = normalized.find((c) => REGEX[canonical].some((rx) => rx.test(c.key) || rx.test(c.source)));
    if (partial) mappings.push({ canonical, source: partial.source, method: "partial/regex", confidence: 0.78 });
  }
  for (const canonical of Object.keys(EXACT) as CanonicalColumn[]) {
    if (mappings.some((m) => m.canonical === canonical)) continue;
    const inferred = inferColumn(canonical, rows, columns.filter((c) => !mappings.some((m) => m.source === c)));
    if (inferred) mappings.push({ canonical, source: inferred.source, method: "value inference", confidence: inferred.confidence });
  }
  log.steps.push("normalize_columns(): exact match → partial/regex match → value inference 순서로 컬럼을 인식했습니다.");
  return mappings;
}

function inferColumn(canonical: CanonicalColumn, rows: Row[], columns: string[]) {
  const samples = columns.map((source) => {
    const vals = rows.map((r) => r[source]).filter((v) => normalizeNull(v) != null);
    const numeric = vals.map(cleanNumber).filter((v) => Number.isFinite(v));
    const dates = vals.map((v) => parseDate(v)).filter(Boolean);
    return { source, numericRatio: vals.length ? numeric.length / vals.length : 0, dateRatio: vals.length ? dates.length / vals.length : 0, numeric };
  });
  if (canonical === "date") {
    const best = samples.sort((a, b) => b.dateRatio - a.dateRatio)[0];
    return best?.dateRatio > 0.7 ? { source: best.source, confidence: best.dateRatio } : null;
  }
  const numericCols = samples.filter((s) => s.numericRatio > 0.75 && s.numeric.length > 1);
  if (!numericCols.length) return null;
  if (canonical === "close") return { source: numericCols[0].source, confidence: 0.55 };
  if (canonical === "volume") {
    const best = numericCols.sort((a, b) => median(b.numeric) - median(a.numeric))[0];
    return median(best.numeric) > 1000 ? { source: best.source, confidence: 0.52 } : null;
  }
  return null;
}

function applyForcedRecovery(rows: Row[], mappings: ColumnMapping[], log: SanitizeLog) {
  let applied = false;
  let penalty = 0;
  const required: CanonicalColumn[] = ["date", "close", "volume"];
  for (const col of required) {
    if (mappings.some((m) => m.canonical === col)) continue;
    const inferred = inferColumn(col, rows, getColumns(rows).filter((c) => !mappings.some((m) => m.source === c)));
    if (inferred) {
      mappings.push({ canonical: col, source: inferred.source, method: "forced recovery", confidence: Math.min(0.5, inferred.confidence) });
      applied = true;
      penalty += col === "date" || col === "close" ? 15 : 8;
      log.warnings.push(`Forced Recovery Applied: ${col} 컬럼을 값 패턴으로 복구했습니다.`);
    }
  }
  if (applied) log.penalties.push({ label: "Forced Recovery penalty", points: penalty });
  return { applied, penalty };
}

function materializeCanonicalRows(rows: Row[], mappings: ColumnMapping[]) {
  return rows.map((row) => {
    const out: Row = { ...row };
    for (const map of mappings) {
      if (map.canonical === "date") out.date = parseDate(row[map.source])?.toISOString() ?? null;
      else out[map.canonical] = cleanNumber(row[map.source]);
    }
    return out;
  });
}

function sanitizeAfterMapping(rows: Row[], log: SanitizeLog) {
  let cleaned = rows.filter((r) => r.date || Number.isFinite(r.close as number));
  if (cleaned.some((r) => r.date)) {
    const grouped = new Map<string, Row[]>();
    for (const row of cleaned) {
      const key = String(row.date ?? `row-${grouped.size}`);
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }
    if (grouped.size < cleaned.length) log.steps.push("중복 날짜 행을 평균값 기준으로 병합했습니다.");
    cleaned = Array.from(grouped.entries()).map(([date, group]) => averageRows(date, group)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    log.steps.push("timezone 혼재 가능성을 UTC 기준 tz-naive 날짜로 정규화했습니다.");
  }
  for (const key of ["open", "high", "low", "close", "volume", "foreign", "vix"]) {
    const max = Math.max(...cleaned.map((r) => Math.abs(Number(r[key]))).filter(Number.isFinite));
    if (max > 2147483647) log.steps.push(`${key} 컬럼은 int32 overflow 방지를 위해 float64 범위로 처리했습니다.`);
  }
  const longestGap = longestNanRun(cleaned.map((r) => Number(r.close)));
  if (longestGap >= 30) {
    log.warnings.push("연속 NaN 30일+ 구간을 감지했습니다. 장기 gap은 보간하지 않습니다.");
    log.penalties.push({ label: "30일 이상 연속 NaN", points: 10 });
  }
  log.rowsAfter = cleaned.length;
  return cleaned;
}

function averageRows(date: string, group: Row[]) {
  const ohlcvKeys = new Set(["date", "open", "high", "low", "close", "volume", "foreign", "vix"]);
  const out: Row = { date };
  // Average OHLCV columns
  for (const key of ["open", "high", "low", "close", "volume", "foreign", "vix"]) {
    const vals = group.map((r) => Number(r[key])).filter(Number.isFinite);
    if (vals.length) out[key] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  // Preserve all other columns (short-selling, custom, etc.)
  const extraKeys = Array.from(new Set(group.flatMap((r) => Object.keys(r)))).filter((k) => !ohlcvKeys.has(k));
  for (const key of extraKeys) {
    const nums = group.map((r) => Number(r[key])).filter(Number.isFinite);
    if (nums.length === group.length) {
      out[key] = nums.reduce((a, b) => a + b, 0) / nums.length;
    } else {
      const lastNonNull = group.map((r) => r[key]).filter((v) => v != null && String(v).trim() !== "").at(-1);
      if (lastNonNull !== undefined) out[key] = lastNonNull;
    }
  }
  return out;
}

function qualityScore(rows: Row[], log: SanitizeLog, forcedRecoveryPenalty: number): QualityBreakdown {
  const needed = ["date", "close", "volume"];
  const completeness = Math.round(100 * needed.reduce((acc, key) => acc + rows.filter((r) => normalizeNull(r[key]) != null && (key === "date" || Number.isFinite(Number(r[key])))).length / Math.max(rows.length, 1), 0) / needed.length);
  const period = rows.length >= 252 ? 100 : rows.length >= 60 ? 70 : Math.max(15, Math.round((rows.length / 60) * 60));
  const closes = rows.map((r) => Number(r.close)).filter(Number.isFinite);
  const returns = pctChanges(closes);
  const outlierRatio = returns.length ? returns.filter((r) => Math.abs(r) > 0.15).length / returns.length : 0.4;
  const outlier = Math.max(0, Math.round(100 - outlierRatio * 160));
  const sanitizePenalty = log.penalties.filter((p) => !p.label.includes("Forced")).reduce((a, b) => a + b.points, 0);
  const raw = completeness * 0.42 + period * 0.28 + outlier * 0.3 - sanitizePenalty - forcedRecoveryPenalty;
  return { completeness, period, outlier, sanitizePenalty, forcedRecoveryPenalty, total: clamp(Math.round(raw), 0, 100) };
}

function computeDegradation(rows: Row[], mapping: ColumnMapping[]) {
  const d: string[] = [];
  if (rows.length < 60) d.push("60일 미만: Lite Alpha Score");
  if (rows.length < 252) d.push("252일 미만: 백테스트 비활성");
  if (!["open", "high", "low"].every((c) => mapping.some((m) => m.canonical === c))) d.push("OHLC 없음: 라인차트 + 2σ 손절");
  if (!mapping.some((m) => m.canonical === "volume")) d.push("volume 없음: volume_signal = 0.5");
  if (!mapping.some((m) => m.canonical === "foreign") && !mapping.some((m) => m.canonical === "institution")) d.push("foreign/institution 없음: supply_signal = 0.5");
  return d;
}

function computeSignals(chart: AnalysisResult["chart"], rows: Row[], degradation: string[]): Signals {
  const closes = chart.map((p) => p.close).filter(Number.isFinite);
  const returns = pctChanges(closes);
  const last = closes.at(-1) ?? 0;
  const ma5 = mean(closes.slice(-5));
  const ma20 = mean(closes.slice(-20));
  const trend = score01((ma5 / ma20 - 1) * 12 + 0.5);
  const momentumBase = (closes.at(-10) ?? last) || 1;
  const momentum = score01(((last / momentumBase) - 1) * 7 + 0.5);
  const vol = std(returns.slice(-20));
  const volatility = score01(1 - vol * 10);
  const volume = degradation.some((x) => x.startsWith("volume 없음")) ? 0.5 : score01((mean(rows.slice(-5).map((r) => Number(r.volume))) / mean(rows.slice(-20).map((r) => Number(r.volume))) - 0.8));
  const supply = degradation.some((x) => x.startsWith("foreign/institution 없음")) ? 0.5 : score01((mean(rows.slice(-10).map((r) => Number(r.foreign || 0) + Number(r.institution || 0))) / (Math.abs(mean(rows.slice(-20).map((r) => Number(r.foreign || 0) + Number(r.institution || 0)))) + 1) / 2 + 0.5));
  const risk = score01(1 - Math.max(0, -Math.min(...returns.slice(-20))) * 5);
  return { trend, momentum, volatility, volume, supply, risk };
}

function computeAlphaScore(signals: Signals, quality: number, lite: boolean) {
  const weights = lite ? { trend: 0.32, momentum: 0.28, volatility: 0.22, volume: 0.08, supply: 0.05, risk: 0.05 } : { trend: 0.24, momentum: 0.18, volatility: 0.14, volume: 0.16, supply: 0.14, risk: 0.14 };
  const weighted = Object.entries(weights).reduce((acc, [key, w]) => acc + signals[key as keyof Signals] * w, 0) * 100;
  return clamp(Math.round(weighted * 0.86 + quality * 0.14), 0, 100);
}

function detectRegime(chart: AnalysisResult["chart"]): { label: string; value: 0 | 1 | 2 } {
  const closes = chart.map((p) => p.close);
  const ma5 = mean(closes.slice(-5));
  const ma20 = mean(closes.slice(-20));
  const ret = closes.length > 5 ? (closes.at(-1)! / closes.at(-5)! - 1) : 0;
  if (ma5 > ma20 && ret > 0.015) return { label: "강세 레짐", value: 2 };
  if (ma5 < ma20 && ret < -0.015) return { label: "약세 레짐", value: 0 };
  return { label: "중립 레짐", value: 1 };
}

function computeRisk(chart: AnalysisResult["chart"], lineOnly: boolean) {
  const closes = chart.map((p) => p.close);
  const last = closes.at(-1) ?? null;
  if (!last) return { stopLoss: null, method: "가격 데이터 부족", atr: null };
  if (lineOnly) {
    const sigma = std(pctChanges(closes).slice(-20));
    return { stopLoss: Math.round(last * (1 - 2 * sigma)), method: "라인차트 기반 2σ 손절", atr: null };
  }
  const atrs = chart.slice(1).map((p, i) => Math.max((p.high ?? p.close) - (p.low ?? p.close), Math.abs((p.high ?? p.close) - chart[i].close), Math.abs((p.low ?? p.close) - chart[i].close)));
  const atr = mean(atrs.slice(-14));
  return { stopLoss: Math.round(last - atr * 2), method: "ATR x2 손절", atr: Math.round(atr) };
}

function detectConflicts(signals: Signals, regime: { value: 0 | 1 | 2 }, quality: number) {
  const c: AnalysisResult["conflicts"] = [];
  if (signals.momentum > 0.75 && signals.volatility < 0.35) c.push({ severity: "HIGH", message: "강한 모멘텀과 높은 변동성이 충돌합니다." });
  if (signals.trend > 0.65 && regime.value === 0) c.push({ severity: "MEDIUM", message: "추세 점수는 양호하나 약세 레짐입니다." });
  if (quality < 60) c.push({ severity: "MEDIUM", message: "데이터 품질이 낮아 신호 신뢰도가 제한됩니다." });
  if (signals.volume < 0.35 && signals.momentum > 0.65) c.push({ severity: "LOW", message: "가격 모멘텀 대비 거래량 확인이 약합니다." });
  return c;
}

function finalDecision(base: Decision, alpha: number, regime: 0 | 1 | 2, conflicts: AnalysisResult["conflicts"], quality: number) {
  if (quality < 40) return { decision: "분석 제한" as const, reasons: ["품질점수 < 40: 데이터 보강 필요", `Alpha Score ${alpha}점은 표시하되 신뢰 불가`] };
  const ladder: Decision[] = ["Avoid", "Caution", "Neutral", "Buy", "Strong Buy"];
  let idx = ladder.indexOf(base);
  const reasons = [`데이터 품질 ${quality}점${quality < 60 ? " - 낮은 신뢰도" : " - 정상 판단 진행"}`];
  if (idx >= ladder.indexOf("Buy") && regime === 0) { idx -= 1; reasons.push("약세 레짐 감지로 1단계 하향"); }
  else if (idx <= ladder.indexOf("Neutral") && regime === 2 && quality >= 70) { idx = Math.min(idx + 1, ladder.indexOf(base) + 1); reasons.push("강세 레짐과 품질 70+ 조건으로 1단계 상향"); }
  const high = conflicts.filter((c) => c.severity === "HIGH").length;
  const medium = conflicts.filter((c) => c.severity === "MEDIUM").length;
  if (high >= 1 || medium >= 2) { idx = Math.max(0, idx - 1); reasons.push("신호 충돌 감지로 1단계 하향"); }
  else if (conflicts.some((c) => c.severity === "LOW")) reasons.push("LOW 충돌 경고 배지 적용");
  return { decision: ladder[idx], reasons };
}

function featureContributions(s: Signals) {
  return [
    { name: "추세", score: s.trend, contribution: Math.round(s.trend * 24), note: "MA 단기/중기 방향" },
    { name: "모멘텀", score: s.momentum, contribution: Math.round(s.momentum * 18), note: "최근 수익률 탄력" },
    { name: "변동성", score: s.volatility, contribution: Math.round(s.volatility * 14), note: "급락 위험 역산" },
    { name: "거래량", score: s.volume, contribution: Math.round(s.volume * 16), note: "거래량 확인 신호" },
    { name: "수급", score: s.supply, contribution: Math.round(s.supply * 14), note: "외국인 순매수 대체 가능" },
    { name: "리스크", score: s.risk, contribution: Math.round(s.risk * 14), note: "최근 낙폭 기반" }
  ];
}

function signalValidation(rows: Row[], chart: AnalysisResult["chart"], degradation: string[], quality: number) {
  return [
    { label: "가격 시계열", value: `${chart.length}개 관측치`, status: chart.length >= 60 ? "good" as const : "warn" as const },
    { label: "백테스트", value: chart.length >= 252 ? "가능" : "252일 미만으로 비활성", status: chart.length >= 252 ? "good" as const : "warn" as const },
    { label: "거래량 신호", value: degradation.some((x) => x.startsWith("volume 없음")) ? "기본값 0.5 적용" : "검증 가능", status: degradation.some((x) => x.startsWith("volume 없음")) ? "warn" as const : "good" as const },
    { label: "품질 점수", value: `${quality}점`, status: quality >= 60 ? "good" as const : quality >= 40 ? "warn" as const : "bad" as const }
  ];
}

function reasoning(alpha: number, base: Decision, final: { decision: Decision | "분석 제한"; reasons: string[] }, regime: { label: string }, quality: number, lite: boolean, forced: boolean, rawAlpha?: number, shortAnalysis?: ShortAnalysis) {
  const lines = [
    rawAlpha !== undefined && rawAlpha !== alpha
      ? `Alpha Score ${rawAlpha}점 (가격 기반) → 공매도 리스크 조정 후 ${alpha}점`
      : `Alpha Score ${alpha}점 → 기본 액션 ${base}`,
    `${regime.label} 감지 → 판단 엔진 보정 검토`,
    `데이터 품질 ${quality}점 → ${quality < 40 ? "분석 제한" : quality < 60 ? "낮은 신뢰도 배지" : "정상 판단"}`,
    lite ? "60일 미만 데이터 → Lite Alpha Score 적용" : "정식 Alpha Score 가중 모델 적용",
    forced ? "Forced Recovery Applied → quality penalty 반영" : "필수 컬럼 자동 인식 완료",
  ];
  if (shortAnalysis?.detected && shortAnalysis.shortPressure) {
    const p = shortAnalysis.shortPressure;
    lines.push(`공매도 압력 ${p.score}/100 (${p.label}) → Alpha Score 및 최종 판단에 반영`);
  }
  lines.push(`최종 액션: ${final.decision}`);
  return lines;
}

function buildChart(rows: Row[]) {
  return rows.map((r, i) => ({
    date: String(r.date ?? i + 1).slice(0, 10),
    open: Number.isFinite(Number(r.open)) ? Number(r.open) : undefined,
    close: Number(r.close),
    high: Number.isFinite(Number(r.high)) ? Number(r.high) : undefined,
    low: Number.isFinite(Number(r.low)) ? Number(r.low) : undefined,
    volume: Number.isFinite(Number(r.volume)) ? Number(r.volume) : undefined
  })).filter((p) => Number.isFinite(p.close));
}

export function simulateScore(base: AnalysisResult, scenario: { price: number; volume: number; foreign: number; institution: number; vix: number }) {
  const rows = base.rows.map((r, i, arr) => i === arr.length - 1 ? { ...r, close: Number(r.close) * (1 + scenario.price / 100), volume: Number(r.volume) * scenario.volume, foreign: Number(r.foreign || 0) + scenario.foreign, institution: Number(r.institution || 0) + scenario.institution, vix: Number(r.vix || 15) + scenario.vix } : r);
  const chart = buildChart(rows);
  const signals = computeSignals(chart, rows, base.degradation);
  return computeAlphaScore(signals, base.quality.total, base.liteMode);
}

function buildShortAlphaContext(rawAlpha: number, shortAnalysis: ShortAnalysis): ShortAlphaContext | null {
  const p = shortAnalysis.shortPressure;
  if (!p || !shortAnalysis.detected) return null;

  const sp = p.score;
  const reasons: string[] = [];
  let penalty = 0;
  let levelDowngrade = 0;

  // ── Base penalty and downgrade level ────────────────────────────────────
  if (sp >= 80) {
    penalty = 15; levelDowngrade = 2;
    reasons.push(`공매도 압력 ${sp}/100 극단 → Alpha -15pt, 2단계 하향`);
  } else if (sp >= 70) {
    penalty = 10; levelDowngrade = 1;
    reasons.push(`공매도 압력 ${sp}/100 높음 → Alpha -10pt, 1단계 하향`);
  } else if (sp >= 60) {
    penalty = 5; levelDowngrade = 1;
    reasons.push(`공매도 압력 ${sp}/100 경계 → Alpha -5pt, 1단계 하향`);
  } else if (sp >= 40) {
    penalty = 0; levelDowngrade = 0;
    reasons.push(`공매도 압력 ${sp}/100 보통 → 방향 유지, 주의 레이블 추가`);
  }

  // ── Component additive penalties ────────────────────────────────────────
  if (p.components.borrowFeeRank >= 80) { penalty += 3; reasons.push(`차입비용 랭크 ${p.components.borrowFeeRank}% → -3pt`); }
  if (p.components.squeezeRank >= 75) { penalty += 2; reasons.push(`스퀴즈 랭크 ${p.components.squeezeRank}% → -2pt`); }
  if (p.components.daysToCovertRank >= 75) { penalty += 2; reasons.push(`커버링일수 랭크 ${p.components.daysToCovertRank}% → -2pt`); }
  if (p.components.utilizationRank >= 80) { penalty += 2; reasons.push(`이용률 랭크 ${p.components.utilizationRank}% → -2pt`); }

  // ── Covering signal relief ───────────────────────────────────────────────
  if (p.coveringSignal !== null && p.coveringSignal >= 70 && penalty > 0) {
    const relief = Math.min(penalty, 5);
    penalty -= relief;
    reasons.push(`커버링 신호 ${p.coveringSignal}/100 → 완화 +${relief}pt`);
  }

  const adjustedAlpha = clamp(rawAlpha - penalty, 0, 100);

  // ── Determine state ──────────────────────────────────────────────────────
  let state: ShortAlphaState;
  if (p.coveringSignal !== null && p.coveringSignal >= 70 && rawAlpha < 55) {
    state = "Short-Covering Rebound Risk";
  } else if (sp >= 80) {
    state = "High Short Crowding Risk";
  } else if (sp >= 60 && rawAlpha >= 60) {
    state = "Alpha Conflicted";
  } else if (sp >= 40) {
    state = "Alpha Weakened";
  } else {
    state = "Alpha Confirmed";
  }

  // ── Bias label ───────────────────────────────────────────────────────────
  let biasLabel: string;
  if (state === "High Short Crowding Risk") biasLabel = "High Short Crowding Risk";
  else if (state === "Alpha Conflicted") biasLabel = rawAlpha >= 70 ? "Bullish but High Short Risk" : "Conditional Bullish";
  else if (state === "Short-Covering Rebound Risk") biasLabel = "Short-Covering Rebound Risk";
  else if (state === "Alpha Weakened") biasLabel = rawAlpha >= 60 ? "Bullish with Elevated Short Pressure" : "Cautiously Neutral";
  else biasLabel = rawAlpha >= 70 ? "Bullish Bias" : rawAlpha >= 55 ? "Neutral Bias" : "Bearish Bias";

  // ── Confidence override ──────────────────────────────────────────────────
  let confidenceOverride: ShortAlphaContext["confidenceOverride"] = null;
  if (sp >= 80) confidenceOverride = "CAUTION";
  else if (sp >= 60) confidenceOverride = "MEDIUM";
  else if (sp >= 40) confidenceOverride = "MEDIUM";

  // ── Interpretation text ──────────────────────────────────────────────────
  let interpretation: string;
  if (state === "Alpha Conflicted") {
    interpretation = `가격 기반 Alpha Score는 ${rawAlpha}점으로 양호하나, 공매도 압력이 ${sp}/100으로 높습니다. 이는 순수 강세 신호가 아니며, 공매도 포지셔닝 리스크가 내재된 조건부 강세입니다. 변동성 확대 또는 단기 조정 시 공매도 포지션 청산 가속으로 급락 위험이 있습니다.`;
  } else if (state === "High Short Crowding Risk") {
    interpretation = `가격 신호(${rawAlpha}점)와 무관하게 공매도 과밀(${sp}/100) 상태입니다. 트리거 이벤트 발생 시 급격한 Short Squeeze 또는 반대 방향 가속 하락이 발생할 수 있습니다. 신중한 접근이 요구됩니다.`;
  } else if (state === "Short-Covering Rebound Risk") {
    interpretation = `공매도 커버링 신호(${p.coveringSignal}/100)가 강화되고 있습니다. Alpha 방향과 무관하게 단기 커버링 반등 가능성을 모니터링해야 합니다.`;
  } else if (state === "Alpha Weakened") {
    interpretation = `Alpha Score는 ${rawAlpha}점이지만 공매도 압력(${sp}/100)이 상승 중입니다. 방향성은 유지되나 신뢰도가 낮아집니다. 공매도 동향을 병행 모니터링하세요.`;
  } else {
    interpretation = `공매도 압력(${sp}/100)이 낮아 Alpha Score ${rawAlpha}점의 방향성이 확인됩니다.`;
  }

  return { state, rawAlpha, shortPressure: sp, adjustedAlpha, levelDowngrade, biasLabel, confidenceOverride, interpretation, shortReasons: reasons };
}

// Legacy shim used by analyzeRows
function applyShortPressureAdjustment(alpha: number, shortAnalysis: ShortAnalysis): { adjustedAlpha: number; shortReasons: string[] } {
  const ctx = buildShortAlphaContext(alpha, shortAnalysis);
  if (!ctx) return { adjustedAlpha: alpha, shortReasons: [] };
  return { adjustedAlpha: ctx.adjustedAlpha, shortReasons: ctx.shortReasons };
}

function scoreToDecision(score: number): Decision {
  if (score >= 80) return "Strong Buy";
  if (score >= 60) return "Buy";
  if (score >= 40) return "Neutral";
  if (score >= 20) return "Caution";
  return "Avoid";
}

function interpret(decision: Decision, regime: 0 | 1 | 2) {
  const map: Record<string, string> = {
    "Strong Buy-2": "강세 레짐 확인. 즉시 진입 또는 적극 매수 고려.",
    "Strong Buy-1": "모멘텀 강함. 추세 지속 여부 확인 후 진입.",
    "Strong Buy-0": "점수는 높으나 약세 장. 소량 분할 진입 후 관망.",
    "Buy-2": "긍정적 신호. 손절선 설정 후 진입 고려.",
    "Buy-1": "중립 장세에서 매수 신호. 분할 진입 적절.",
    "Buy-0": "약세 레짐 주의. 레짐 전환 확인 후 진입 권고.",
    "Neutral-2": "강세장이나 점수 중립. 관망 또는 소량 진입.",
    "Neutral-1": "뚜렷한 방향 없음. 관망이 적절.",
    "Neutral-0": "약세 레짐 + 중립 점수. 현금 보유 권고.",
    "Caution-2": "강세장이나 신호 약함. 진입 시 소량 분할.",
    "Caution-1": "신호 불명확. 추가 확인 후 판단 권고.",
    "Caution-0": "약세 레짐 + 부정적 신호. 진입 비권고.",
    "Avoid-2": "점수 매우 낮음. 강세장이라도 신중.",
    "Avoid-1": "진입 비권고. 데이터 재확인 권고.",
    "Avoid-0": "강한 매도 신호. 보유 포지션 정리 고려."
  };
  return map[`${decision}-${regime}`];
}

function normalizeShortColumns(rows: Row[]): ShortColumnMapping[] {
  const columns = getColumns(rows);
  const normalized = columns.map((source) => ({ source, key: normalizeName(source) }));
  const mappings: ShortColumnMapping[] = [];

  for (const canonical of Object.keys(EXACT_SHORT) as ShortCanonicalColumn[]) {
    const exactKeys = EXACT_SHORT[canonical].map(normalizeName);
    const exact = normalized.find((c) => exactKeys.includes(c.key));
    if (exact) mappings.push({ canonical, source: exact.source, method: "exact", confidence: 0.98, isCandidate: false });
  }

  for (const canonical of Object.keys(REGEX_SHORT) as ShortCanonicalColumn[]) {
    if (mappings.some((m) => m.canonical === canonical)) continue;
    const partial = normalized.find((c) => !mappings.some((m) => m.source === c.source) && REGEX_SHORT[canonical].some((rx) => rx.test(c.key) || rx.test(c.source)));
    if (partial) mappings.push({ canonical, source: partial.source, method: "partial/regex", confidence: 0.78, isCandidate: false });
  }

  const unmapped = columns.filter((c) => !mappings.some((m) => m.source === c));
  for (const source of unmapped) {
    const inferred = inferShortColumn(source, rows);
    if (inferred) mappings.push({ canonical: inferred.canonical, source, method: "value inference", confidence: inferred.confidence, isCandidate: inferred.confidence < 0.65 });
  }

  return mappings;
}

function inferShortColumn(source: string, rows: Row[]): { canonical: ShortCanonicalColumn; confidence: number } | null {
  const vals = rows.map((r) => cleanNumber(r[source])).filter(Number.isFinite);
  if (vals.length < 3) return null;
  const avg = mean(vals);
  const stddev = std(vals);
  const hasPctStrings = rows.map((r) => String(r[source] ?? "")).filter((s) => /%/.test(s)).length / rows.length > 0.3;
  const allBetween0and1 = vals.every((v) => v >= 0 && v <= 1);
  const allBetween0and100 = vals.every((v) => v >= 0 && v <= 100);

  if (hasPctStrings || (allBetween0and100 && avg < 50 && stddev < 20)) {
    if (allBetween0and1 || avg < 0.5) return { canonical: "short_ratio", confidence: 0.42 };
    if (avg < 10) return { canonical: "short_ratio", confidence: 0.38 };
  }

  if (avg > 10000) {
    const changes = pctChanges(vals);
    const spikeRatio = changes.filter((c) => c > 0.5).length / Math.max(changes.length, 1);
    if (spikeRatio > 0.15) return { canonical: "cover_volume", confidence: 0.35 };
    const cv = stddev / Math.max(avg, 1);
    if (cv < 0.2) return { canonical: "short_balance", confidence: 0.35 };
    return { canonical: "short_volume", confidence: 0.33 };
  }

  return null;
}

type RatioNormalization = { value: number; status: "normal" | "anomaly" | "invalid"; mode: "decimal" | "percent" | "anomaly" | "invalid" };

function normalizeRatioValue(raw: number): RatioNormalization {
  if (!Number.isFinite(raw) || raw < 0) return { value: NaN, status: "invalid", mode: "invalid" };
  if (raw <= 1) return { value: raw, status: "normal", mode: "decimal" };
  if (raw <= 100) return { value: raw / 100, status: "normal", mode: "percent" };
  return { value: NaN, status: "anomaly", mode: "anomaly" };
}

function findNumericColumn(rows: Row[], aliases: RegExp[], minPositive = 1) {
  const columns = getColumns(rows);
  const candidates = columns
    .filter((column) => aliases.some((rx) => rx.test(column) || rx.test(normalizeName(column))))
    .map((column) => {
      const vals = rows.map((row) => cleanNumber(row[column])).filter((v) => Number.isFinite(v) && v > 0);
      return { column, count: vals.length, median: median(vals) };
    })
    .filter((candidate) => candidate.count >= Math.max(2, rows.length * 0.25) && candidate.median >= minPositive)
    .sort((a, b) => b.count - a.count || b.median - a.median);
  return candidates[0]?.column ?? null;
}

function scalePiecewise(value: number | null, points: Array<[number, number]>) {
  if (value === null || !Number.isFinite(value)) return null;
  if (value <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    if (value <= x2) {
      const t = (value - x1) / Math.max(x2 - x1, 1e-9);
      return y1 + (y2 - y1) * t;
    }
  }
  return points[points.length - 1][1];
}

function preprocessShortRows(rows: Row[], shortMapping: ShortColumnMapping[]): { rows: Row[]; warnings: string[] } {
  const warnings: string[] = [];
  const ratioFields: ShortCanonicalColumn[] = ["short_ratio", "short_balance_ratio", "borrow_fee", "utilization_rate", "dark_pool_short_ratio"];
  const volumeBalanceFields: ShortCanonicalColumn[] = ["short_volume", "borrow_volume", "cover_volume", "short_balance", "borrow_balance", "short_value", "dark_pool_short_volume"];
  const shortInterestSource = findNumericColumn(rows, [/^shortinterest$/i, /short.?interest.?shares/i, /short.?position/i, /short.?shares/i, /short.?balance/i, /short.?volume.?balance/i, /대차잔고수량|공매도잔고수량/i], 100);
  const avgVolumeSource = findNumericColumn(rows, [/avg.?daily.?volume/i, /average.?daily.?volume/i, /^adv20d$/i, /adv.?20/i, /volume.?20d.?avg/i, /avg.?volume/i, /거래량평균|평균거래량/i], 100);

  const processed = rows.map((row) => {
    const out: Row = { ...row };
    for (const mapping of shortMapping) {
      let val = cleanNumber(row[mapping.source]);
      if (!Number.isFinite(val)) { out[mapping.canonical] = NaN; continue; }
      if (ratioFields.includes(mapping.canonical)) {
        const normalized = normalizeRatioValue(val);
        out[`${mapping.canonical}__raw`] = val;
        out[`${mapping.canonical}__normalization`] = normalized.mode;
        out[`${mapping.canonical}__status`] = normalized.status;
        val = normalized.value;
      }
      if (volumeBalanceFields.includes(mapping.canonical) && val < 0) val = NaN;
      out[mapping.canonical] = val;
    }
    const numerator = shortInterestSource ? cleanNumber(row[shortInterestSource]) : NaN;
    const denominator = avgVolumeSource ? cleanNumber(row[avgVolumeSource]) : NaN;
    const rawDtc = cleanNumber(out.days_to_cover);
    let dtc = NaN;
    if (Number.isFinite(numerator) && numerator >= 0 && Number.isFinite(denominator) && denominator > 100) {
      dtc = numerator / denominator;
    } else if (Number.isFinite(rawDtc) && rawDtc >= 0) {
      dtc = rawDtc;
    }
    out.days_to_cover__raw = Number.isFinite(rawDtc) ? rawDtc : dtc;
    out.days_to_cover__status = Number.isFinite(dtc) ? (dtc > 100 ? "anomaly" : dtc > 30 ? "extreme" : "normal") : "insufficient";
    out.days_to_cover = Number.isFinite(dtc) && dtc <= 100 ? dtc : NaN;
    return out;
  });

  if (typeof console !== "undefined") {
    console.log("[Short debug] Days to Cover columns", { numerator: shortInterestSource, denominator: avgVolumeSource });
    console.log("[Short debug] Ratio normalization modes", Object.fromEntries(shortMapping.map((m) => [m.canonical, processed.map((r) => r[`${m.canonical}__normalization`]).find(Boolean) ?? "n/a"])));
    const anomalyRows = processed
      .map((row, index) => ({ index, date: row.date, columns: Object.keys(row).filter((key) => key.endsWith("__status") && row[key] === "anomaly") }))
      .filter((row) => row.columns.length);
    if (anomalyRows.length) console.log("[Short debug] anomaly rows and columns", anomalyRows.slice(0, 20));
  }

  const shortRatioMap = shortMapping.find((m) => m.canonical === "short_ratio");
  if (shortRatioMap) {
    const ratios = processed.map((r) => Number(r.short_ratio)).filter((v) => Number.isFinite(v) && v > 0 && v <= 1);
    if (ratios.at(-1) !== undefined && ratios.at(-1)! >= 0.5) warnings.push("공매도비율 ≥ 50% — 과열 포지셔닝 가능성");
  }

  const borrowFeeMap = shortMapping.find((m) => m.canonical === "borrow_fee");
  if (borrowFeeMap) {
    const fees = processed.map((r) => Number(r.borrow_fee)).filter(Number.isFinite);
    if (fees.length >= 10) {
      const recent = mean(fees.slice(-5));
      const prev = mean(fees.slice(-20, -5));
      if (prev > 0 && recent > prev * 1.3) warnings.push("borrow_fee 급등 — 공매도 차입 비용 상승");
    }
  }

  return { rows: processed, warnings };
}

function computeShortPressure(shortRows: Row[], shortMapping: ShortColumnMapping[]): ShortPressureScore | null {
  const confirmed = shortMapping.filter((m) => !m.isCandidate);
  if (confirmed.length < 1) return null;

  const getRollingRank = (values: number[], window = 60) => {
    const clean = values.filter(Number.isFinite);
    if (clean.length < 3) return 50;
    const recent = clean.slice(-window);
    const last = recent.at(-1) ?? 0;
    return Math.round((recent.filter((v) => v <= last).length / recent.length) * 100);
  };

  const has = (col: ShortCanonicalColumn) => confirmed.some((m) => m.canonical === col);

  // ── compute ranks for each field ──────────────────────────────────────────
  const shortRatioRank = has("short_ratio") ? getRollingRank(shortRows.map((r) => Number(r.short_ratio))) : null;
  const borrowFeeRank = has("borrow_fee") ? getRollingRank(shortRows.map((r) => Number(r.borrow_fee))) : null;
  const utilizationRank = has("utilization_rate") ? getRollingRank(shortRows.map((r) => Number(r.utilization_rate))) : null;
  const dtcVals = shortRows.map((r) => Number(r.days_to_cover)).filter((v) => Number.isFinite(v) && v >= 0 && v <= 100);
  const latestDtc = dtcVals.at(-1) ?? null;
  const daysToCovertRank = dtcVals.length >= 3 ? getRollingRank(dtcVals) : null;
  const squeezeRank = has("squeeze_score") ? getRollingRank(shortRows.map((r) => Number(r.squeeze_score))) : null;
  const darkPoolRank = has("dark_pool_short_ratio") ? getRollingRank(shortRows.map((r) => Number(r.dark_pool_short_ratio))) : null;

  let shortVolumeRatioRank: number | null = null;
  if (has("short_volume")) {
    const ratios = shortRows.map((r) => {
      const sv = Number(r.short_volume);
      const vol = Number((r.volume ?? r.borrow_volume) ?? 0);
      return vol > 0 && Number.isFinite(sv) ? sv / vol : NaN;
    }).filter(Number.isFinite);
    if (ratios.length >= 3) shortVolumeRatioRank = getRollingRank(ratios);
  }

  // acceleration: z-score of recent short_ratio vs history (or 50 if unavailable)
  const shortRatioVals = shortRows.map((r) => Number(r.short_ratio)).filter(Number.isFinite);
  const recentMean = mean(shortRatioVals.slice(-5));
  const histMean = mean(shortRatioVals.slice(-40));
  const histStd = std(shortRatioVals.slice(-40));
  const accelerationScore = histStd > 0 ? clamp(Math.round(50 + ((recentMean - histMean) / histStd) * 15), 0, 100) : 50;

  const latestBorrowFee = shortRows.map((r) => Number(r.borrow_fee)).filter(Number.isFinite).at(-1) ?? null;
  const latestUtilization = shortRows.map((r) => Number(r.utilization_rate)).filter(Number.isFinite).at(-1) ?? null;
  const priceVals = shortRows.map((r) => Number(r.close)).filter(Number.isFinite);
  const volumeVals = shortRows.map((r) => Number(r.volume)).filter(Number.isFinite);
  const balanceVals = shortRows.map((r) => Number(r.short_balance)).filter(Number.isFinite);
  const priceMomentum = priceVals.length >= 5 ? (priceVals.at(-1)! / Math.max(priceVals.at(-5)!, 1e-9) - 1) : 0;
  const shortIncrease = balanceVals.length >= 5 ? (balanceVals.at(-1)! / Math.max(balanceVals.at(-5)!, 1e-9) - 1) : 0;
  const volumeExpansion = volumeVals.length >= 10 ? mean(volumeVals.slice(-3)) / Math.max(mean(volumeVals.slice(-10, -3)), 1e-9) - 1 : 0;
  const dtcScore = scalePiecewise(latestDtc, [[0, 0], [1, 10], [3, 35], [5, 55], [10, 75], [20, 100]]) ?? null;
  const feeScore = scalePiecewise(latestBorrowFee !== null ? latestBorrowFee * 100 : null, [[0, 0], [5, 25], [20, 60], [50, 100]]) ?? null;
  const utilScore = scalePiecewise(latestUtilization !== null ? latestUtilization * 100 : null, [[0, 0], [50, 40], [80, 75], [95, 100]]) ?? null;
  const squeezeMomentumScore = priceMomentum > 0 && shortIncrease > 0 ? clamp(Math.round(50 + priceMomentum * 500 + shortIncrease * 90), 0, 100) : priceMomentum < 0 && shortIncrease > 0 ? 20 : null;
  const volumeScore = volumeExpansion > 0 ? clamp(Math.round(45 + volumeExpansion * 80), 0, 100) : null;
  const coveringParts = [
    { value: dtcScore, w: 0.34 },
    { value: feeScore, w: 0.22 },
    { value: utilScore, w: 0.20 },
    { value: squeezeMomentumScore, w: 0.14 },
    { value: volumeScore, w: 0.10 },
  ].filter((part): part is { value: number; w: number } => part.value !== null && Number.isFinite(part.value));
  const coveringWeight = coveringParts.reduce((sum, part) => sum + part.w, 0);
  const coveringScore = coveringParts.length ? clamp(Math.round(coveringParts.reduce((sum, part) => sum + part.value * part.w, 0) / coveringWeight), 0, 100) : null;
  const coveringSignal = coveringScore;

  if (typeof console !== "undefined") {
    console.log("[Short debug] covering score components", { latestDtc, latestBorrowFee, latestUtilization, priceMomentum, shortIncrease, volumeExpansion, dtcScore, feeScore, utilScore, squeezeMomentumScore, volumeScore, coveringScore });
  }

  // ── weight redistribution ─────────────────────────────────────────────────
  // Base weights: short_ratio(0.25), borrow_fee(0.20), utilization_rate(0.20),
  //               days_to_cover(0.15), squeeze_score(0.15), short_volume_ratio(0.05)
  const candidates = [
    { value: shortRatioRank,      baseW: 0.25 },
    { value: borrowFeeRank,       baseW: 0.20 },
    { value: utilizationRank,     baseW: 0.20 },
    { value: daysToCovertRank,    baseW: 0.15 },
    { value: squeezeRank,         baseW: 0.15 },
    { value: shortVolumeRatioRank, baseW: 0.05 },
  ];
  const available = candidates.filter((c) => c.value !== null);
  const totalBase = available.reduce((s, c) => s + c.baseW, 0) || 1;
  const weighted = available.map((c) => ({ value: c.value!, w: c.baseW / totalBase }));

  // Always include acceleration as a small blend on top (max 8% of score)
  const accelBlend = 0.08;
  const score = clamp(Math.round(
    weighted.reduce((s, c) => s + c.value * c.w * (1 - accelBlend), 0) + accelerationScore * accelBlend
  ), 0, 100);

  const label = score >= 80 ? "극단적 공매도 압력" : score >= 60 ? "높은 공매도 압력" : score >= 40 ? "보통 수준" : score >= 20 ? "낮은 압력" : "매우 낮은 압력";

  const warnings: string[] = [];
  if (score >= 60) warnings.push(`공매도 압력 ${score}점 — 하방 압력 집중`);
  if (borrowFeeRank !== null && borrowFeeRank >= 75) warnings.push("차입 비용 상위 25% — 포지셔닝 비용 급등");
  if (shortRatioRank !== null && shortRatioRank >= 70 && utilizationRank !== null && utilizationRank >= 70) warnings.push("공매도 비율·이용률 동시 상승 — 과밀 포지셔닝");
  if (squeezeRank !== null && squeezeRank >= 75) warnings.push("스퀴즈 점수 상위 25% — 숏 스퀴즈 위험 상승");
  if (daysToCovertRank !== null && daysToCovertRank >= 70) warnings.push("커버링 일수 상위 30% — 청산 압력 증가 시 급등 가능");
  if (coveringSignal !== null && coveringSignal >= 75) warnings.push("커버링 신호 강화 — 숏 스퀴즈 가능성");

  return {
    score,
    label,
    components: {
      shortRatioRank: shortRatioRank ?? 50,
      borrowFeeRank: borrowFeeRank ?? 50,
      utilizationRank: utilizationRank ?? 50,
      daysToCovertRank: daysToCovertRank ?? 50,
      squeezeRank: squeezeRank ?? 50,
      shortVolumeRatioRank: shortVolumeRatioRank ?? 50,
      darkPoolRank: darkPoolRank ?? 50,
      accelerationScore,
    },
    coveringScore,
    daysToCover: latestDtc,
    coveringSignal,
    warnings,
  };
}

function detectShortConflicts(
  rows: Row[],
  shortRows: Row[],
  shortMapping: ShortColumnMapping[],
  pressure: ShortPressureScore | null
): { severity: "LOW" | "MEDIUM" | "HIGH"; message: string }[] {
  const c: { severity: "LOW" | "MEDIUM" | "HIGH"; message: string }[] = [];
  const closes = rows.map((r) => Number(r.close)).filter(Number.isFinite);
  const shortBalVals = shortRows.map((r) => Number(r.short_balance)).filter(Number.isFinite);
  const shortRatioVals = shortRows.map((r) => Number(r.short_ratio)).filter(Number.isFinite);
  const borrowFeeVals = shortRows.map((r) => Number(r.borrow_fee)).filter(Number.isFinite);
  const coverVolVals = shortRows.map((r) => Number(r.cover_volume)).filter(Number.isFinite);
  const volVals = rows.map((r) => Number(r.volume)).filter(Number.isFinite);

  if (closes.length >= 5 && shortBalVals.length >= 5) {
    const priceUp = closes.at(-1)! > closes.at(-5)!;
    const balanceUp = shortBalVals.at(-1)! > shortBalVals.at(-5)!;
    if (priceUp && balanceUp) c.push({ severity: "MEDIUM", message: "주가 상승 중 공매도 잔고 증가 — 공매도 세력 버티기 감지" });
  }

  if (shortRatioVals.length >= 5 && volVals.length >= 5) {
    const srRecent = mean(shortRatioVals.slice(-3));
    const srHist = mean(shortRatioVals.slice(-20, -3));
    const volRecent = mean(volVals.slice(-3));
    const volHist = mean(volVals.slice(-20, -3));
    if (srHist > 0 && volHist > 0 && srRecent > srHist * 1.3 && volRecent > volHist * 1.3) {
      c.push({ severity: "MEDIUM", message: "공매도 비율 + 거래량 동시 급증 — 과밀 포지셔닝 또는 이벤트 매매" });
    }
  }

  if (borrowFeeVals.length >= 10 && shortBalVals.length >= 5) {
    const feeRecent = mean(borrowFeeVals.slice(-5));
    const feePrev = mean(borrowFeeVals.slice(-15, -5));
    const balanceUp = shortBalVals.at(-1)! > mean(shortBalVals.slice(-10));
    if (feePrev > 0 && feeRecent > feePrev * 1.25 && balanceUp) {
      c.push({ severity: "MEDIUM", message: "차입 비용 급등 + 잔고 증가 — 공매도 포지셔닝 스트레스 상승" });
    }
  }

  if (coverVolVals.length >= 5 && closes.length >= 5) {
    const coverRecent = mean(coverVolVals.slice(-3));
    const coverHist = mean(coverVolVals.slice(-20, -3));
    const priceUp = closes.at(-1)! > closes.at(-3)!;
    if (coverHist > 0 && coverRecent > coverHist * 1.5 && priceUp) {
      c.push({ severity: "LOW", message: "커버링 급증 + 주가 반등 — 숏 커버링 반등 가능성 (강세 지지)" });
    }
  }

  if (pressure && pressure.score >= 60) {
    const alpha = rows.length > 0 ? 50 : 0;
    if (alpha >= 60) c.push({ severity: "HIGH", message: "강세 신호이나 공매도 압력 극도로 높음 — 신뢰도 하향 조정" });
  }

  return c;
}

function computeShortAnalysis(rows: Row[], mapping: ColumnMapping[]): ShortAnalysis {
  const empty: ShortAnalysis = { detected: false, isShortOnlyMode: false, confidence: 0, shortMapping: [], availableFields: [], candidates: [], shortRows: [], shortPressure: null, conflicts: [], preprocessingWarnings: [] };
  const shortMapping = normalizeShortColumns(rows);
  const confirmed = shortMapping.filter((m) => !m.isCandidate);
  if (confirmed.length < 1) return empty;

  let confidence = clamp(0.35 + confirmed.length * 0.10, 0, 0.88);
  if (confirmed.some((m) => m.canonical === "short_ratio" || m.canonical === "short_balance_ratio")) confidence += 0.08;
  if (confirmed.some((m) => m.canonical === "borrow_fee")) confidence += 0.06;
  if (confirmed.length >= 4) confidence += 0.06;
  if (confirmed.length >= 6) confidence += 0.05;
  confidence = clamp(confidence, 0.35, 1);

  const { rows: shortRows, warnings: preprocessingWarnings } = preprocessShortRows(rows, confirmed);
  const hasPrice = mapping.some((m) => m.canonical === "close");
  const isShortOnlyMode = !hasPrice;
  const shortPressure = computeShortPressure(shortRows, confirmed);
  const conflicts = detectShortConflicts(rows, shortRows, confirmed, shortPressure);
  const availableFields = Array.from(new Set([
    ...confirmed.map((m) => m.canonical),
    ...(shortRows.some((row) => Number.isFinite(Number(row.days_to_cover))) ? ["days_to_cover" as const] : []),
  ]));

  if (typeof console !== "undefined") {
    console.log("[Short debug] detected dataset confidence", { confidence, fields: availableFields, candidates: shortMapping.filter((m) => m.isCandidate) });
  }

  return {
    detected: true,
    isShortOnlyMode,
    confidence,
    shortMapping: confirmed,
    availableFields,
    candidates: shortMapping.filter((m) => m.isCandidate),
    shortRows,
    shortPressure,
    conflicts,
    preprocessingWarnings
  };
}

function cleanNumber(value: unknown) {
  const normalized = normalizeNull(value);
  if (normalized == null) return NaN;
  let text = String(normalized).trim().replace(/,/g, "");
  let mult = 1;
  for (const [rx, factor] of UNITS) {
    if (rx.test(text)) { text = text.replace(rx, ""); mult = factor; break; }
  }
  if (/%$/.test(text)) { text = text.replace(/%$/, ""); mult *= 0.01; }
  return Number(text) * mult;
}

function parseDate(value: unknown): Date | null {
  const raw = normalizeNull(value);
  if (raw == null) return null;
  if (typeof raw === "number" || /^\d{10,13}$/.test(String(raw))) {
    const n = Number(raw);
    const d = new Date(n > 1e12 ? n : n * 1000);
    return Number.isNaN(d.getTime()) ? null : stripTimezone(d);
  }
  const s = String(raw).trim();
  const ymd = s.match(/^(\d{4})[./-]?(\d{1,2})[./-]?(\d{1,2})/);
  if (ymd) return stripTimezone(new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : stripTimezone(d);
}

function stripTimezone(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function normalizeNull(value: unknown) {
  if (value == null) return null;
  const s = String(value).trim();
  return NULL_STRINGS.has(s.toLowerCase()) ? null : value;
}

function normalizeName(name: string) { return name.toLowerCase().replace(/[\s_()\[\]{}.-]/g, "").trim(); }
function getColumns(rows: Row[]) { return Array.from(new Set(rows.flatMap((row) => Object.keys(row)))); }
function isNumericString(value: string) { return Number.isFinite(cleanNumber(value)); }
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function score01(n: number) { return clamp(Number.isFinite(n) ? n : 0.5, 0, 1); }
function mean(nums: number[]) { const clean = nums.filter(Number.isFinite); return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : 0; }
function median(nums: number[]) { const clean = nums.filter(Number.isFinite).sort((a, b) => a - b); return clean.length ? clean[Math.floor(clean.length / 2)] : 0; }
function std(nums: number[]) { const m = mean(nums); return Math.sqrt(mean(nums.map((n) => (n - m) ** 2))); }
function pctChanges(nums: number[]) { return nums.slice(1).map((n, i) => nums[i] ? n / nums[i] - 1 : 0).filter(Number.isFinite); }
function longestNanRun(nums: number[]) { let max = 0, cur = 0; for (const n of nums) { if (!Number.isFinite(n)) { cur++; max = Math.max(max, cur); } else cur = 0; } return max; }
