import type { AnalysisResult, Row } from "@/lib/dataPipeline";
import { SupplyFlowAnalysis, buildSupplyFlowAnalysis } from "@/lib/supplyFlowEngine";

export type EngineModuleId =
  | "ohlcv"
  | "flow"
  | "short"
  | "options"
  | "macro"
  | "fundamental"
  | "valuation"
  | "portfolio"
  | "sentiment"
  | "onchain"
  | "news"
  | "calendar"
  | "etfFlow";

export type EngineModule = {
  id: EngineModuleId;
  label: string;
  mode: string;
  alphaLabel: string;
  moduleAlphaScore: number;
  contributionWeight: number;
  unifiedContribution: number;
  confidence: number;
  matchedColumns: string[];
  missingColumns: string[];
  availableSignals: string[];
  missingSignals: string[];
  charts: string[];
  scores: { label: string; value: number }[];
  chips: string[];
  degradation: string[];
  scoreReason: string;
};

export type VisualizationEngine = {
  alphaScore: number;
  unifiedAlphaScore: number;
  blendMode: "single" | "weighted";
  riskStatus: "LOW" | "ELEVATED" | "HIGH";
  riskTone: "good" | "warn" | "bad";
  primaryModule: EngineModule;
  modules: EngineModule[];
  contributions: { label: string; score: number; weight: number; contribution: number }[];
  supply: SupplyFlowAnalysis;
  insights: string[];
  activatedCharts: string[];
  columnCoverage: number;
  systemStatus: {
    alphaScore: number;
    confidence: number;
    confidenceLabel: "High" | "Medium" | "Low";
    detectedDatasetType: string;
    lockedDatasetType: EngineModuleId;
    fallbackMode: boolean;
    weakSignalEnvironment: boolean;
    availableSignals: string[];
    missingSignals: string[];
    explanation: string;
    facts: string[];
    inferences: string[];
    lowConfidenceNotes: string[];
    conflictPenalties: { label: string; points: number; severity: "LOW" | "MEDIUM" | "HIGH" }[];
    diagnostics: { label: string; value: string }[];
  };
};

type ModuleSpec = {
  id: EngineModuleId;
  label: string;
  mode: string;
  alphaLabel: string;
  requiredAny: string[];
  core: string[];
  charts: string[];
  scores: string[];
};

const SPECS: ModuleSpec[] = [
  {
    id: "ohlcv",
    label: "가격 데이터",
    mode: "기술적 분석 모드",
    alphaLabel: "Technical Alpha",
    requiredAny: ["date", "timestamp", "close", "price", "ohlcv"],
    core: ["date", "open", "high", "low", "close", "volume"],
    charts: ["캔들 차트", "거래량 패널", "MA5 / MA20 / MA60", "볼린저 밴드", "RSI", "MACD", "드로다운"],
    scores: ["추세 점수", "모멘텀 점수", "변동성 점수"]
  },
  {
    id: "flow",
    label: "수급 / 자본 흐름",
    mode: "수급 Alpha 모드",
    alphaLabel: "Flow Alpha",
    requiredAny: ["foreign", "institution", "retail", "net_buy", "net_flow", "capital_flow", "inflow", "outflow", "smart_money", "dealer", "broker", "whale", "etf", "순매수", "수급", "유입", "유출"],
    core: ["foreign", "institution", "retail", "net_buy", "dealer", "broker", "whale", "etf"],
    charts: ["Smart Money Flow", "누적 순자본 라인", "스마트머니 게이지", "수급 히트맵", "참여자 구성"],
    scores: ["자본 유입 점수", "스마트머니 점수", "수급 압력 점수"]
  },
  {
    id: "etfFlow",
    label: "ETF 자금 흐름",
    mode: "Liquidity Rotation Alpha 모드",
    alphaLabel: "Liquidity Rotation Alpha",
    requiredAny: ["etf_inflow", "etf_outflow", "netflow", "aum", "sector_rotation", "etf"],
    core: ["etf_inflow", "etf_outflow", "netflow", "aum", "sector_rotation"],
    charts: ["ETF Flow Trend", "Sector Rotation Map", "Liquidity Map", "AUM 변화"],
    scores: ["유동성 회전 점수", "ETF 순유입 점수", "섹터 로테이션 점수"]
  },
  {
    id: "short",
    label: "공매도 / 대차",
    mode: "Short Risk Alpha 모드",
    alphaLabel: "Short Risk Alpha",
    requiredAny: ["short_volume", "short_ratio", "borrow_fee", "days_to_cover", "공매도"],
    core: ["short_volume", "short_ratio", "borrow_fee", "days_to_cover"],
    charts: ["공매도 압력 게이지", "숏 스퀴즈 리스크", "공매도 비율 영역"],
    scores: ["하방 압력 점수", "스퀴즈 가능성", "숏 리스크 점수"]
  },
  {
    id: "options",
    label: "옵션 / 변동성",
    mode: "Volatility Alpha 모드",
    alphaLabel: "Volatility Alpha",
    requiredAny: ["put_call_ratio", "implied_volatility", "open_interest", "gamma", "delta", "vega"],
    core: ["put_call_ratio", "implied_volatility", "open_interest", "gamma"],
    charts: ["PCR 게이지", "IV Surface", "감마 노출", "변동성 콘"],
    scores: ["공포 지수", "딜러 리스크", "변동성 확장 점수"]
  },
  {
    id: "macro",
    label: "매크로",
    mode: "Macro Regime Alpha 모드",
    alphaLabel: "Macro Alpha",
    requiredAny: ["vix", "yield", "interest_rate", "cpi", "dxy", "fx", "oil"],
    core: ["vix", "yield", "interest_rate", "cpi", "dxy", "fx"],
    charts: ["매크로 멀티라인", "레짐 밴드", "매크로 히트맵", "상관 매트릭스"],
    scores: ["매크로 레짐", "유동성", "인플레이션 압력"]
  },
  {
    id: "fundamental",
    label: "재무제표",
    mode: "Fundamental Alpha 모드",
    alphaLabel: "Fundamental Alpha",
    requiredAny: ["revenue", "operating_income", "eps", "roe", "net_income", "cashflow", "debt"],
    core: ["revenue", "operating_income", "eps", "roe", "debt", "cashflow"],
    charts: ["매출 성장", "마진 워터폴", "재무 레이더", "부채 안정성"],
    scores: ["성장성", "수익성", "안정성"]
  },
  {
    id: "valuation",
    label: "밸류에이션",
    mode: "Valuation Alpha 모드",
    alphaLabel: "Valuation Alpha",
    requiredAny: ["per", "pbr", "peg", "psr", "ev_ebitda"],
    core: ["per", "pbr", "peg", "psr", "ev_ebitda"],
    charts: ["밸류에이션 밴드", "상대 산점도", "할인율 게이지", "멀티 메트릭 레이더"],
    scores: ["밸류에이션 점수", "상대 할인 점수"]
  },
  {
    id: "portfolio",
    label: "포트폴리오",
    mode: "Portfolio Alpha 모드",
    alphaLabel: "Portfolio Alpha",
    requiredAny: ["ticker", "weight", "sector", "allocation", "avg_price", "return"],
    core: ["ticker", "weight", "sector", "allocation", "avg_price"],
    charts: ["트리맵", "배분 파이", "익스포저 히트맵", "위험-수익 산점도"],
    scores: ["분산 점수", "집중 리스크", "포트폴리오 알파"]
  },
  {
    id: "sentiment",
    label: "심리 / 소셜",
    mode: "Sentiment Alpha 모드",
    alphaLabel: "Sentiment Alpha",
    requiredAny: ["sentiment", "mentions", "reddit_score", "twitter_score", "news_score"],
    core: ["sentiment", "mentions", "reddit_score", "twitter_score", "news_score"],
    charts: ["심리 게이지", "언급량 추세", "소셜 히트맵"],
    scores: ["공포/탐욕", "관심 모멘텀", "소셜 가속"]
  },
  {
    id: "onchain",
    label: "온체인",
    mode: "On-chain Alpha 모드",
    alphaLabel: "On-chain Alpha",
    requiredAny: ["active_wallets", "exchange_inflow", "whale_tx", "hashrate", "staking_ratio"],
    core: ["active_wallets", "exchange_inflow", "whale_tx", "hashrate"],
    charts: ["고래 흐름", "거래소 유입", "지갑 활동", "네트워크 건강도"],
    scores: ["고래 매집", "네트워크 강도", "패닉 매도 위험"]
  },
  {
    id: "news",
    label: "뉴스 이벤트",
    mode: "News Event Alpha 모드",
    alphaLabel: "News Alpha",
    requiredAny: ["headline", "impact_score", "published_at", "category"],
    core: ["headline", "impact_score", "published_at", "category"],
    charts: ["이벤트 타임라인", "뉴스 영향 게이지", "센티먼트 스트림"],
    scores: ["이벤트 리스크", "뉴스 모멘텀", "내러티브 강도"]
  },
  {
    id: "calendar",
    label: "경제 캘린더",
    mode: "Economic Event Alpha 모드",
    alphaLabel: "Economic Event Alpha",
    requiredAny: ["event", "forecast", "actual", "previous", "importance"],
    core: ["event", "forecast", "actual", "previous", "importance"],
    charts: ["경제 이벤트 타임라인", "서프라이즈 바", "중요도 히트맵"],
    scores: ["매크로 서프라이즈", "이벤트 변동성 위험"]
  }
];

const MODULE_WEIGHTS: Record<EngineModuleId, number> = {
  ohlcv: 1,
  flow: 1.05,
  short: 0.72,
  options: 0.78,
  macro: 0.86,
  fundamental: 0.88,
  valuation: 0.76,
  portfolio: 0.7,
  sentiment: 0.58,
  onchain: 0.66,
  news: 0.52,
  calendar: 0.56,
  etfFlow: 0.82
};

const SIGNAL_LABELS: Record<string, string> = {
  date: "날짜",
  timestamp: "시간",
  open: "시가",
  high: "고가",
  low: "저가",
  close: "종가",
  price: "가격",
  volume: "거래량",
  foreign: "외국인",
  institution: "기관",
  retail: "개인",
  net_buy: "순매수",
  net_flow: "순자본 흐름",
  capital_flow: "자본 흐름",
  dealer: "딜러",
  broker: "브로커",
  whale: "고래",
  etf: "ETF",
  inflow: "유입",
  outflow: "유출"
};

export function buildVisualizationEngine(analysis: AnalysisResult): VisualizationEngine {
  const supply = buildSupplyFlowAnalysis(analysis);
  const columns = collectColumns(analysis);
  const modules = SPECS.map((spec) => detectModule(spec, columns, analysis.rows, supply)).filter(Boolean) as EngineModule[];
  const primaryId = classificationToModuleId(analysis.datasetClassification.primaryType);
  const secondaryIds = new Set(analysis.datasetClassification.secondarySignals.map((signal) => classificationToModuleId(signal.type)).filter(Boolean));
  const detectedPrimary = modules.find((module) => module.id === primaryId);
  const primaryModule = detectedPrimary ?? buildClassificationFallbackModule(analysis, primaryId);
  const supporting = modules.filter((module) => module.id !== primaryModule.id && secondaryIds.has(module.id)).slice(0, 4);
  const active = applyPrimaryCenteredWeights([primaryModule, ...supporting]);
  const blendMode = supporting.length ? "weighted" : "single";
  const baseAlpha = clamp(Math.round(primaryModule.moduleAlphaScore * 0.82 + supporting.reduce((sum, module) => sum + module.moduleAlphaScore * module.contributionWeight, 0)), 0, 100);
  const preliminaryAlphaScore = clamp(baseAlpha + supply.alphaAdjustment, 0, 100);
  const conflictPenalties = buildConflictPenalties(analysis, supply, active, preliminaryAlphaScore);
  const totalConflictPenalty = conflictPenalties.reduce((sum, penalty) => sum + penalty.points, 0);
  const unifiedAlphaScore = clamp(preliminaryAlphaScore - totalConflictPenalty, 0, 100);
  const riskStatus = unifiedAlphaScore >= 67 ? "LOW" : unifiedAlphaScore >= 43 ? "ELEVATED" : "HIGH";
  const columnCoverage = Math.round(active.reduce((sum, module) => sum + module.confidence, 0) / Math.max(active.length, 1) * 100);
  const systemStatus = buildSystemStatus(analysis, active, primaryModule, supply, unifiedAlphaScore, columnCoverage, conflictPenalties);

  return {
    alphaScore: unifiedAlphaScore,
    unifiedAlphaScore,
    blendMode,
    riskStatus,
    riskTone: riskStatus === "LOW" ? "good" : riskStatus === "ELEVATED" ? "warn" : "bad",
    primaryModule,
    modules: active,
    contributions: active.map((module) => ({
      label: module.alphaLabel,
      score: module.moduleAlphaScore,
      weight: module.contributionWeight,
      contribution: module.unifiedContribution
    })),
    supply,
    insights: buildPrimaryCenteredInsights(active, supply, unifiedAlphaScore, analysis.datasetClassification.primaryLabelKo),
    activatedCharts: Array.from(new Set(active.flatMap((module) => module.charts))).slice(0, 18),
    columnCoverage,
    systemStatus
  };
}

function buildSystemStatus(
  analysis: AnalysisResult,
  active: EngineModule[],
  primaryModule: EngineModule,
  supply: SupplyFlowAnalysis,
  alphaScore: number,
  columnCoverage: number,
  conflictPenalties: VisualizationEngine["systemStatus"]["conflictPenalties"]
): VisualizationEngine["systemStatus"] {
  const classification = analysis.datasetClassification;
  const confidence = clamp(Math.round(
    classification.confidence * 0.42 +
    columnCoverage * 0.36 +
    (analysis.metricPipeline?.confidence ?? 35) * 0.16 -
    conflictPenalties.reduce((sum, penalty) => sum + penalty.points, 0) * 0.9 -
    (analysis.liteMode ? 10 : 0) -
    (analysis.forcedRecoveryApplied ? 14 : 0)
  ), 0, 100);
  const availableSignals = Array.from(new Set(active.flatMap((module) => module.availableSignals))).slice(0, 14);
  const missingSignals = Array.from(new Set(active.flatMap((module) => module.missingSignals))).slice(0, 14);
  const weakSignalEnvironment = confidence < 45 || analysis.liteMode || primaryModule.confidence < 0.42;
  const fallbackMode = weakSignalEnvironment || analysis.forcedRecoveryApplied || !availableSignals.length;
  const confidenceLabel: VisualizationEngine["systemStatus"]["confidenceLabel"] = confidence >= 70 ? "High" : confidence >= 45 ? "Medium" : "Low";
  const lockedDatasetType = primaryModule.id;
  const facts = [
    `감지 데이터셋: ${classification.primaryLabelKo}`,
    `Alpha Score: ${alphaScore}/100`,
    `사용 가능 신호: ${availableSignals.length}개`,
    `누락 신호: ${missingSignals.length}개`,
  ];
  const inferences = weakSignalEnvironment
    ? ["신뢰도가 낮아 방향성 결론보다 데이터 품질과 제한 사항을 우선 해석합니다."]
    : [`${primaryModule.alphaLabel}를 최종 Alpha 판단의 중심 신호로 사용합니다.`];
  const lowConfidenceNotes = [
    ...(analysis.liteMode ? ["Lite Analysis로 전환되어 일부 계산은 축소되었습니다."] : []),
    ...(analysis.forcedRecoveryApplied ? ["업로드 복구 로직이 적용되어 원본 데이터 구조 신뢰도가 낮아졌습니다."] : []),
    ...(conflictPenalties.length ? conflictPenalties.map((penalty) => `${penalty.label}: -${penalty.points}점`) : []),
    ...(missingSignals.length ? [`누락 신호: ${missingSignals.slice(0, 5).join(", ")}`] : []),
  ];

  return {
    alphaScore,
    confidence,
    confidenceLabel,
    detectedDatasetType: classification.primaryLabelKo,
    lockedDatasetType,
    fallbackMode,
    weakSignalEnvironment,
    availableSignals,
    missingSignals,
    explanation: weakSignalEnvironment
      ? "Weak Signal Environment: 신호 커버리지 또는 데이터 품질이 제한적입니다. 과감한 강세/약세 결론 대신 제한 분석과 신뢰도 감산을 적용했습니다."
      : "데이터셋 타입이 잠겼고, 최종 Alpha Score는 주 엔진 신호와 보조 컨텍스트, 충돌 패널티를 함께 반영했습니다.",
    facts,
    inferences,
    lowConfidenceNotes,
    conflictPenalties,
    diagnostics: [
      { label: "Locked UI Mode", value: lockedDatasetType },
      { label: "Classification Confidence", value: `${classification.confidence}%` },
      { label: "Column Coverage", value: `${columnCoverage}%` },
      { label: "Metric Pipeline", value: `${analysis.metricPipeline?.confidence ?? 0}%` },
      { label: "Fallback Mode", value: fallbackMode ? "ON" : "OFF" },
      { label: "Supply Adjustment", value: `${supply.alphaAdjustment >= 0 ? "+" : ""}${supply.alphaAdjustment}` },
      { label: "Conflict Penalty", value: `${conflictPenalties.reduce((sum, penalty) => sum + penalty.points, 0)}점` },
    ],
  };
}

function buildConflictPenalties(
  analysis: AnalysisResult,
  supply: SupplyFlowAnalysis,
  active: EngineModule[],
  alphaScore: number
): VisualizationEngine["systemStatus"]["conflictPenalties"] {
  const penalties: VisualizationEngine["systemStatus"]["conflictPenalties"] = [];
  for (const conflict of analysis.conflicts ?? []) {
    penalties.push({
      label: conflict.message || "Cross-signal conflict",
      severity: conflict.severity,
      points: conflict.severity === "HIGH" ? 8 : conflict.severity === "MEDIUM" ? 5 : 2,
    });
  }
  for (const conflict of supply.conflicts ?? []) {
    penalties.push({
      label: conflict.message || conflict.title || "Supply-flow conflict",
      severity: conflict.severity,
      points: conflict.severity === "HIGH" ? 7 : conflict.severity === "MEDIUM" ? 4 : 2,
    });
  }
  const primary = active[0];
  if (primary && primary.confidence < 0.45 && alphaScore > 65) {
    penalties.push({ label: "High Alpha with weak primary evidence", severity: "MEDIUM", points: 6 });
  }
  if (analysis.metricPipeline?.relationships?.some((relationship) => relationship.status === "contradicting")) {
    penalties.push({ label: "Semantic metric relationship conflict", severity: "MEDIUM", points: 5 });
  }
  if (analysis.metricPipeline?.warnings?.length) {
    penalties.push({ label: "Metric anomalies or validation warnings", severity: "LOW", points: Math.min(5, analysis.metricPipeline.warnings.length) });
  }
  if (analysis.rows.length < 3) penalties.push({ label: "Very small dataset", severity: "MEDIUM", points: 6 });
  return penalties.slice(0, 8);
}

function detectModule(spec: ModuleSpec, columns: string[], rows: Row[], supply: SupplyFlowAnalysis): EngineModule | null {
  const matched = matchKeys([...spec.core, ...spec.requiredAny], columns);
  const trigger = matchKeys(spec.requiredAny, columns);
  if (!trigger.length && !(spec.id === "flow" && supply.active)) return null;

  const availableKeys = spec.core.filter((key) => matched.some((column) => matchesKey(key, column)));
  const missingKeys = spec.core.filter((key) => !availableKeys.includes(key));
  const confidence = spec.id === "flow"
    ? Math.max(supply.confidence, clamp(availableKeys.length / Math.max(spec.core.length, 1), 0.28, 1))
    : clamp(availableKeys.length / Math.max(spec.core.length, 1), 0.22, 1);
  const scores = spec.id === "flow"
    ? [
        { label: "자본 유입 점수", value: supply.smartMoneyScore },
        { label: "스마트머니 정렬", value: Math.round(supply.confidence * 100) },
        { label: "수급 충돌 안정성", value: clamp(100 - supply.conflicts.length * 18, 0, 100) }
      ]
    : spec.scores.map((label, index) => ({ label, value: scoreFromRows(rows, matched, index, confidence, spec.id) }));
  const moduleAlphaScore = spec.id === "flow"
    ? supply.smartMoneyScore
    : clamp(Math.round(mean(scores.map((score) => score.value)) * 0.78 + confidence * 22), 0, 100);

  return {
    id: spec.id,
    label: spec.label,
    mode: spec.id === "flow" && supply.lite ? "Lite Supply Analysis" : spec.mode,
    alphaLabel: spec.alphaLabel,
    moduleAlphaScore,
    contributionWeight: 1,
    unifiedContribution: moduleAlphaScore,
    confidence,
    matchedColumns: spec.id === "flow" ? supply.columns.map((column) => column.column) : matched,
    missingColumns: missingKeys,
    availableSignals: spec.id === "flow" ? supply.availableSignals : availableKeys.map(signalName),
    missingSignals: spec.id === "flow" ? supply.missingSignals : missingKeys.map(signalName),
    charts: spec.id === "flow" ? ["Smart Money Flow", "스마트머니 게이지", "참여자 구성", "수급 히트맵", "수급 충돌"] : spec.charts,
    scores,
    chips: spec.id === "flow" ? [supply.mode, supply.scoreLabel] : [spec.mode],
    degradation: spec.id === "flow" ? supply.degradation : missingKeys.slice(0, 4).map((key) => `${signalName(key)} 누락: 관련 분석 축소`),
    scoreReason: spec.id === "flow"
      ? `Smart Money Score ${supply.smartMoneyScore}점, 신뢰도 ${Math.round(supply.confidence * 100)}%, 수급 충돌 ${supply.conflicts.length}건을 Alpha Score에 반영했습니다.`
      : `${spec.alphaLabel}는 사용 가능 신호 ${availableKeys.length}개, 누락 신호 ${missingKeys.length}개, 컬럼 신뢰도 ${Math.round(confidence * 100)}%로 산출했습니다.`
  };
}

function buildFallbackModule(analysis: AnalysisResult): EngineModule {
  return {
    id: "ohlcv",
    label: "제한 데이터",
    mode: "제한 분석 모드",
    alphaLabel: "Limited Alpha",
    moduleAlphaScore: analysis.quality.total,
    contributionWeight: 1,
    unifiedContribution: analysis.quality.total,
    confidence: 0.35,
    matchedColumns: analysis.mapping.map((mapping) => mapping.source),
    missingColumns: ["전용 Alpha 모듈 컬럼"],
    availableSignals: analysis.mapping.map((mapping) => signalName(mapping.canonical)),
    missingSignals: ["전용 Alpha 모듈을 구성할 핵심 컬럼"],
    charts: analysis.chart.length ? ["제한 라인 차트", "데이터 품질 미터"] : ["컬럼 커버리지 매트릭스"],
    scores: [{ label: "데이터 활용도", value: analysis.quality.total }],
    chips: ["Graceful Degradation"],
    degradation: ["전용 모듈이 충분히 감지되지 않아 제한 분석으로 전환했습니다."],
    scoreReason: "감지 가능한 금융 도메인 컬럼이 부족해 데이터 품질 중심의 제한 Alpha를 산출했습니다."
  };
}

function applyUnifiedAlphaWeights(modules: EngineModule[]) {
  const weighted = modules.map((module) => ({
    module,
    rawWeight: MODULE_WEIGHTS[module.id] * Math.max(module.confidence, 0.2)
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.rawWeight, 0) || 1;
  return weighted.map(({ module, rawWeight }) => {
    const contributionWeight = rawWeight / totalWeight;
    return {
      ...module,
      contributionWeight,
      unifiedContribution: module.moduleAlphaScore * contributionWeight
    };
  });
}

function classificationToModuleId(type: AnalysisResult["datasetClassification"]["primaryType"]): EngineModuleId {
  const map: Record<AnalysisResult["datasetClassification"]["primaryType"], EngineModuleId> = {
    ohlcv: "ohlcv",
    flow: "flow",
    short: "short",
    options: "options",
    macro: "macro",
    financial: "fundamental",
    valuation: "valuation",
    portfolio: "portfolio",
    sentiment: "sentiment",
    onchain: "onchain",
    news: "news",
    economic_calendar: "calendar",
    etf_flow: "etfFlow",
    price_only: "ohlcv",
    generic: "ohlcv",
  };
  return map[type];
}

function buildClassificationFallbackModule(analysis: AnalysisResult, id: EngineModuleId): EngineModule {
  const spec = SPECS.find((item) => item.id === id);
  if (!spec) return buildFallbackModule(analysis);
  const score = Math.max(35, Math.round(analysis.datasetClassification.confidence * 0.75));
  return {
    id,
    label: spec.label,
    mode: spec.mode,
    alphaLabel: spec.alphaLabel,
    moduleAlphaScore: score,
    contributionWeight: 1,
    unifiedContribution: score,
    confidence: analysis.datasetClassification.confidence / 100,
    matchedColumns: analysis.datasetClassification.matchedColumns,
    missingColumns: spec.core,
    availableSignals: analysis.datasetClassification.matchedColumns,
    missingSignals: spec.core.map(signalName),
    charts: spec.charts,
    scores: [{ label: `${spec.label} 구조 신뢰도`, value: analysis.datasetClassification.confidence }],
    chips: [analysis.datasetClassification.primaryStructureKo, "Primary Locked"],
    degradation: ["도메인 컬럼 일부가 부족해 구조 분류 신뢰도를 기반으로 제한 모듈을 구성했습니다."],
    scoreReason: analysis.datasetClassification.classificationReason,
  };
}

function applyPrimaryCenteredWeights(modules: EngineModule[]) {
  return modules.map((module, index) => {
    const contributionWeight = index === 0 ? 0.82 : 0.18 / Math.max(1, modules.length - 1);
    return {
      ...module,
      contributionWeight,
      unifiedContribution: module.moduleAlphaScore * contributionWeight,
    };
  });
}

function buildPrimaryCenteredInsights(modules: EngineModule[], supply: SupplyFlowAnalysis, alphaScore: number, primaryLabelKo: string) {
  const primary = modules[0];
  const supporting = modules.slice(1);
  return [
    `${primaryLabelKo}가 primary dataset type으로 잠겼습니다. 메인 narrative는 ${primary.alphaLabel} 중심으로 생성됩니다.`,
    supporting.length
      ? `보조 신호는 ${supporting.map((module) => module.alphaLabel).join(", ")}이며 템플릿을 덮어쓰지 않고 supporting context로만 반영됩니다.`
      : "보조 신호는 메인 템플릿을 덮어쓰지 않습니다.",
    `Unified Alpha Score ${alphaScore}점은 primary analysis를 중심으로 계산하고 secondary signal은 제한 가중치로만 반영했습니다.`,
    supply.active && primary.id === "flow"
      ? `수급 레이어: ${supply.scoreLabel}, Alpha 조정 ${supply.alphaAdjustment >= 0 ? "+" : ""}${supply.alphaAdjustment}점.`
      : "수급 신호가 있더라도 primary type이 아니면 보조 컨텍스트로만 사용합니다.",
  ];
}

function buildInsights(modules: EngineModule[], supply: SupplyFlowAnalysis, alphaScore: number) {
  const primary = modules[0];
  const mode = modules.length > 1
    ? `${modules.map((module) => module.alphaLabel).join(" + ")}를 가중 결합했습니다.`
    : `${primary.alphaLabel}를 주요 Alpha 원천으로 사용했습니다.`;
  return [
    mode,
    `Unified Alpha Score ${alphaScore}점은 도메인별 Alpha와 Smart Money Score 조정을 합산한 결과입니다.`,
    supply.active
      ? `수급 레이어: ${supply.scoreLabel}, Alpha 조정 ${supply.alphaAdjustment >= 0 ? "+" : ""}${supply.alphaAdjustment}점, 레짐 신뢰도 ${supply.regimeConfidenceDelta >= 0 ? "+" : ""}${supply.regimeConfidenceDelta}.`
      : "수급 레이어는 감지 가능한 자본 흐름 컬럼이 부족해 중립 처리했습니다.",
    supply.conflicts.length ? `수급 충돌 ${supply.conflicts.length}건이 Conflict Layer에 반영되었습니다.` : "심각한 수급 충돌은 감지되지 않았습니다."
  ];
}

function collectColumns(analysis: AnalysisResult) {
  const raw = Object.keys(analysis.parsed.rows[0] ?? {});
  const mapped = analysis.mapping.flatMap((mapping) => [mapping.canonical, mapping.source]);
  return Array.from(new Set([...raw, ...mapped].filter(Boolean)));
}

function matchKeys(keys: string[], columns: string[]) {
  const found = new Set<string>();
  for (const key of keys) {
    for (const column of columns) {
      if (matchesKey(key, column)) found.add(column);
    }
  }
  return Array.from(found);
}

function matchesKey(key: string, column: string) {
  const normalizedKey = normalize(key);
  const normalizedColumn = normalize(column);
  if (normalizedColumn.includes(normalizedKey)) return true;
  if (normalizedKey === "foreign") return /foreign|foreigner|외국인|외인/.test(normalizedColumn);
  if (normalizedKey === "institution") return /institution|institutional|pension|fund|기관|연기금|투신/.test(normalizedColumn);
  if (normalizedKey === "retail") return /retail|individual|개인|개미/.test(normalizedColumn);
  if (normalizedKey === "netbuy") return /netbuy|netflow|순매수|순유입/.test(normalizedColumn);
  return false;
}

function signalName(key: string) {
  return SIGNAL_LABELS[key] ?? key;
}

function scoreFromRows(rows: Row[], columns: string[], salt: number, confidence: number, id: EngineModuleId) {
  const values = columns.flatMap((column) => rows.slice(-80).map((row) => toNumber(row[column]))).filter(Number.isFinite);
  if (!values.length) return clamp(Math.round(45 + confidence * 32 - salt * 4), 0, 100);
  const recent = mean(values.slice(-12));
  const base = Math.abs(mean(values)) || 1;
  const movement = (recent / base) * 12;
  const riskPenalty = ["short", "macro", "calendar"].includes(id) ? -Math.abs(movement) * 0.4 : movement;
  return clamp(Math.round(54 + confidence * 26 + riskPenalty + salt * 2), 0, 100);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s_\-./()[\]{}]+/g, "");
}

function toNumber(value: unknown) {
  const number = Number(String(value ?? "").replace(/,/g, "").replace(/%$/, "").trim());
  return Number.isFinite(number) ? number : NaN;
}

function mean(values: number[]) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
