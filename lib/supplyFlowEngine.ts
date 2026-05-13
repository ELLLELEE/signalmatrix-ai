import type { AnalysisResult, Row } from "@/lib/dataPipeline";

export type FlowCategory = "institutional" | "foreign" | "retail" | "dealer" | "broker" | "whale" | "etf" | "aggregate" | "inflow" | "outflow";

export type FlowSeries = {
  key: string;
  column: string;
  label: string;
  category: FlowCategory;
  confidence: number;
  values: number[];
  cumulative: number[];
  latest: number;
  recentMean: number;
  consistency: number;
  volatility: number;
};

export type FlowConflict = {
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  message: string;
  guidance: string;
};

export type SupplyFlowAnalysis = {
  active: boolean;
  lite: boolean;
  mode: string;
  smartMoneyScore: number;
  scoreLabel: string;
  scoreTone: "good" | "positive" | "neutral" | "weak" | "bad";
  confidence: number;
  alphaAdjustment: number;
  regimeConfidenceDelta: number;
  columns: FlowSeries[];
  aggregate: number[];
  dates: string[];
  heatmap: { date: string; value: number; intensity: number }[];
  composition: { label: string; category: FlowCategory; value: number; share: number; color: string }[];
  insights: string[];
  conflicts: FlowConflict[];
  availableSignals: string[];
  missingSignals: string[];
  degradation: string[];
  analysisState: SupplyAnalysisState;
};

export type SupplyScenario = {
  institutional: number;
  foreign: number;
  retail: number;
  aggregate: number;
  dealer: number;
  etf: number;
  whale: number;
};

export type SupplyAnalysisState = {
  datasetType: "supply";
  confidence: "high" | "medium" | "low";
  detectedColumns: {
    date: string | null;
    foreign: string | null;
    institution: string | null;
    retail: string | null;
    netBuy: string | null;
  };
  preprocessing: {
    columnsNormalized: boolean;
    dateParsed: boolean;
    numericConverted: boolean;
    missingValuesHandled: boolean;
    coverageScore: number;
  };
  metrics: {
    foreignParticipation: number;
    institutionStrength: number;
    retailPressure: number;
    netBuyMomentum: number;
    accumulationStrength: number;
    distributionPressure: number;
    flowStability: number;
    participantImbalance: number;
  };
  derivedSignals: {
    dominantBuyer: "Foreign" | "Institution" | "Retail" | "Mixed" | "Insufficient Data";
    dominantSeller: "Foreign" | "Institution" | "Retail" | "Mixed" | "Insufficient Data";
    flowDirection: "Inflow" | "Outflow" | "Mixed" | "Neutral";
    flowRegime: "Strong Accumulation" | "Weak Accumulation" | "Mixed Rotation" | "Neutral Flow" | "Weak Distribution" | "Strong Distribution";
    flowRisk: "Low" | "Neutral" | "High" | "Extreme";
    smartMoneyBias: "Bullish" | "Neutral" | "Bearish" | "Mixed";
    confidenceLabel: "High" | "Medium" | "Low";
  };
  alpha: {
    score: number;
    bias: "Accumulation Bias" | "Distribution Bias" | "Mixed Bias" | "Neutral Bias";
    explanation: string;
  };
  activeSignals: string[];
  warnings: string[];
  interpretation: {
    summary: string;
    opportunity: string;
    risk: string;
    scenarioA: string;
    scenarioB: string;
    scenarioC: string;
  };
  parsingDebug: Array<{
    sourceColumn: string;
    semanticRole: string;
    participant: string;
    signDirection: string;
    recentValues: number[];
    confidence: number;
  }>;
};

type Participant = "foreign" | "institutional" | "retail";
type ColumnRole = "buy" | "sell" | "net" | "date" | "volume" | "value" | "unknown";

const CATEGORY_META: Record<FlowCategory, { label: string; color: string; weight: number; aliases: RegExp[] }> = {
  institutional: { label: "기관", color: "#41d6a3", weight: 1, aliases: [/institution/i, /institutional/i, /pension/i, /fund/i, /기관|기관계|연기금|투신|사모/] },
  foreign: { label: "외국인", color: "#38bdf8", weight: 0.95, aliases: [/foreign/i, /foreigner/i, /foreigners/i, /offshore/i, /외국인|외인/] },
  retail: { label: "개인", color: "#fb923c", weight: -0.45, aliases: [/retail/i, /individual/i, /개인/] },
  dealer: { label: "딜러", color: "#60a5fa", weight: 0.86, aliases: [/dealer/i, /market.?maker/i, /gamma.?desk/i, /딜러|마켓메이커/] },
  broker: { label: "브로커", color: "#22c55e", weight: 0.78, aliases: [/broker/i, /prime/i, /securities/i, /증권|브로커/] },
  whale: { label: "대형 자금", color: "#14b8a6", weight: 0.82, aliases: [/whale/i, /large.?wallet/i, /wallet.?flow/i, /고래|대형/] },
  etf: { label: "ETF", color: "#a3e635", weight: 0.74, aliases: [/etf/i, /fund.?flow/i, /creation|redemption/i] },
  aggregate: { label: "순자본", color: "#94a3b8", weight: 0.62, aliases: [/^net$/i, /net.?buy/i, /net.?flow/i, /total.?net.?buy/i, /capital.?flow/i, /순매수|순매수금액|순매수량|자본|누적/] },
  inflow: { label: "유입", color: "#84cc16", weight: 0.56, aliases: [/inflow/i, /deposit/i, /유입|입금/] },
  outflow: { label: "유출", color: "#fb7185", weight: -0.56, aliases: [/outflow/i, /withdraw/i, /redemption/i, /유출|출금|매도/] }
};

const REQUIRED_SIGNAL_NAMES = ["기관/스마트머니", "외국인", "개인", "총 순자본"];

export function buildSupplyFlowAnalysis(analysis: AnalysisResult, scenario?: Partial<SupplyScenario>): SupplyFlowAnalysis {
  const prepared = prepareRows(analysis);
  const detected = detectSupplySeries(prepared.rows);
  const fallbackDetected = detected.length ? detected : detectLooseFlowColumns(prepared.rows);

  if (!fallbackDetected.length) return emptySupplyAnalysis(analysis, prepared);

  const clipped = fallbackDetected.map((series) => clipSeries(series, prepared.dates.length));
  const scenarioAdjusted = applyScenario(clipped, scenario);
  const aggregate = buildAggregateSeries(scenarioAdjusted);
  const confidence = computeCoverageConfidence(scenarioAdjusted, prepared.dateColumn);
  const conflicts = detectSupplyConflicts(scenarioAdjusted, aggregate);
  const heatmap = aggregate.map((value, index) => ({ date: prepared.dates[index] ?? String(index + 1), value, intensity: rollingRank(aggregate, index) }));
  const composition = buildComposition(scenarioAdjusted);
  const lite = confidence < 0.55;
  const analysisState = buildSupplyAnalysisState(analysis, scenarioAdjusted, aggregate, prepared, confidence);

  return {
    active: true,
    lite,
    mode: lite ? "Limited Flow Coverage" : "Universal Smart Money Flow Analysis",
    smartMoneyScore: analysisState.alpha.score,
    scoreLabel: scoreBand(analysisState.alpha.score),
    scoreTone: scoreTone(analysisState.alpha.score),
    confidence,
    alphaAdjustment: Math.round((analysisState.alpha.score - 50) * confidence * 0.18 - conflicts.length * 1.5),
    regimeConfidenceDelta: Math.round((analysisState.alpha.score - 50) * confidence * 0.12),
    columns: scenarioAdjusted,
    aggregate,
    dates: prepared.dates,
    heatmap,
    composition,
    insights: [
      analysisState.interpretation.summary,
      analysisState.interpretation.opportunity,
      analysisState.interpretation.risk
    ],
    conflicts,
    availableSignals: Array.from(new Set(scenarioAdjusted.map((series) => CATEGORY_META[series.category].label))),
    missingSignals: REQUIRED_SIGNAL_NAMES.filter((name) => !scenarioAdjusted.some((series) => name.includes(CATEGORY_META[series.category].label))),
    degradation: analysisState.warnings,
    analysisState
  };
}

function prepareRows(analysis: AnalysisResult) {
  const sourceRows = (analysis.parsed.rows.length ? analysis.parsed.rows : analysis.rows).filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
  const columns = Array.from(new Set(sourceRows.flatMap((row) => Object.keys(row))));
  const dateColumn = columns.find((column) => classifyColumnV2(column).role === "date") ?? null;
  const rows = [...sourceRows].sort((a, b) => {
    if (!dateColumn) return 0;
    const left = Date.parse(String(a[dateColumn] ?? ""));
    const right = Date.parse(String(b[dateColumn] ?? ""));
    if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
    return left - right;
  });
  const dates = rows.map((row, index) => dateColumn ? String(row[dateColumn] ?? index + 1).slice(0, 10) : analysis.chart[index]?.date ?? String(index + 1)).slice(-90);
  return { rows, dates, dateColumn };
}

function detectSupplySeries(rows: Row[]) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const specs = columns.map((column) => ({ column, ...classifyColumnV2(column) }));
  const series: FlowSeries[] = [];
  const participants: Array<{ participant: Participant; category: FlowCategory }> = [
    { participant: "foreign", category: "foreign" },
    { participant: "institutional", category: "institutional" },
    { participant: "retail", category: "retail" }
  ];

  for (const { participant, category } of participants) {
    const net = bestColumn(specs, participant, "net");
    const buy = bestColumn(specs, participant, "buy");
    const sell = bestColumn(specs, participant, "sell");
    if (buy && sell) {
      const buyValues = numericValues(rows, buy.column);
      const sellValues = numericValues(rows, sell.column);
      const values = alignLength(buyValues, sellValues).map(([b, s]) => b - s);
      series.push(makeSeries(category, `${buy.column} - ${sell.column}`, `${CATEGORY_META[category].label} 순매수`, values, Math.max(buy.confidence, sell.confidence), net?.column));
    } else if (net) {
      series.push(makeSeries(category, net.column, `${CATEGORY_META[category].label} 순매수`, numericValues(rows, net.column), net.confidence));
    }
  }

  const aggregateNet = specs.find((spec) => spec.category === "aggregate" && spec.role === "net");
  if (aggregateNet) {
    series.push(makeSeries("aggregate", aggregateNet.column, "총 순매수", numericValues(rows, aggregateNet.column), aggregateNet.confidence));
  }

  return series.filter((item) => item.values.length >= 2);
}

function detectLooseFlowColumns(rows: Row[]) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return columns
    .map((column) => {
      const spec = classifyColumnV2(column);
      const values = numericValues(rows, column);
      if (spec.confidence < 0.38 || spec.role === "date" || values.length < 2) return null;
      return makeSeries(spec.category ?? "aggregate", column, CATEGORY_META[spec.category ?? "aggregate"].label, values, spec.confidence);
    })
    .filter(Boolean) as FlowSeries[];
}

function classifyColumn(column: string): { role: ColumnRole; participant: Participant | null; category: FlowCategory | null; confidence: number } {
  const normalized = normalize(column);
  if (/^(date|datetime|time|timestamp|일자|날짜)$/.test(normalized)) return { role: "date", participant: null, category: null, confidence: 1 };
  const participant = /foreign|foreigner|foreigners|외국인|외인/.test(normalized)
    ? "foreign"
    : /institution|institutional|기관|연기금|투신|사모/.test(normalized)
      ? "institutional"
      : /retail|individual|개인/.test(normalized)
        ? "retail"
        : null;
  const role: ColumnRole = /sell|매도/.test(normalized)
    ? "sell"
    : /buy|매수/.test(normalized)
      ? "buy"
      : /net|순매수|순매매/.test(normalized)
        ? "net"
        : /volume|거래량/.test(normalized)
          ? "volume"
          : /value|amount|거래대금/.test(normalized)
            ? "value"
            : "unknown";
  const category: FlowCategory | null = participant === "foreign"
    ? "foreign"
    : participant === "institutional"
      ? "institutional"
      : participant === "retail"
        ? "retail"
        : /netbuy|netflow|순매수|^net$/.test(normalized)
          ? "aggregate"
          : null;
  const confidence = (participant ? 0.58 : 0) + (role !== "unknown" ? 0.28 : 0) + (category === "aggregate" ? 0.34 : 0);
  return { role, participant, category, confidence: clamp(confidence, 0, 0.98) };
}

function bestColumn(specs: Array<ReturnType<typeof classifyColumn> & { column: string }>, participant: Participant, role: ColumnRole) {
  return specs
    .filter((spec) => spec.participant === participant && spec.role === role)
    .sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}

function classifyColumnV2(column: string): { role: ColumnRole; participant: Participant | null; category: FlowCategory | null; confidence: number } {
  const normalized = normalize(column);
  if (/^(date|datetime|time|timestamp|\uc77c\uc790|\ub0a0\uc9dc)$/.test(normalized)) return { role: "date", participant: null, category: null, confidence: 1 };

  const participant = /foreign|foreigner|foreigners|\uc678\uad6d\uc778|\uc678\uc778/.test(normalized)
    ? "foreign"
    : /institution|institutional|\uae30\uad00|\uc5f0\uae30\uae08|\ud22c\uc2e0|\uc0ac\ubaa8/.test(normalized)
      ? "institutional"
      : /retail|individual|\uac1c\uc778/.test(normalized)
        ? "retail"
        : null;

  const semanticOnly = /pressure|ratio|participation|share|\uc555\ub825|\ube44\uc728|\ube44\uc911|\ucc38\uc5ec/.test(normalized);
  const role: ColumnRole = semanticOnly
    ? "unknown"
    : /sell|\ub9e4\ub3c4|outflow|\uc720\ucd9c/.test(normalized)
      ? "sell"
      : /buy|\ub9e4\uc218|inflow|\uc720\uc785/.test(normalized)
        ? "buy"
        : /net|\uc21c\ub9e4\uc218|\uc21c\ub9e4\ub9e4|\uc21c\uc790\ubcf8/.test(normalized)
          ? "net"
          : /volume|\uac70\ub798\ub7c9/.test(normalized)
            ? "volume"
            : /value|amount|\uac70\ub798\ub300\uae08/.test(normalized)
              ? "value"
              : "unknown";

  const category: FlowCategory | null = participant === "foreign"
    ? "foreign"
    : participant === "institutional"
      ? "institutional"
      : participant === "retail"
        ? "retail"
        : /netbuy|netflow|totalnet|^net$|\uc21c\ub9e4\uc218|\uc21c\ub9e4\uc218\uae08\uc561|\uc21c\ub9e4\uc218\ub7c9/.test(normalized)
          ? "aggregate"
          : null;

  const confidence = (participant ? 0.58 : 0) + (role !== "unknown" ? 0.28 : 0) + (category === "aggregate" ? 0.34 : 0) - (semanticOnly ? 0.35 : 0);
  return { role, participant, category, confidence: clamp(confidence, 0, 0.98) };
}

function makeSeries(category: FlowCategory, column: string, label: string, values: number[], confidence: number, comparedColumn?: string): FlowSeries {
  const recent = values.slice(-20);
  return {
    key: `${category}-${column}`,
    column: comparedColumn ? `${column} (calculated, checked against ${comparedColumn})` : column,
    label,
    category,
    confidence: clamp(confidence, 0.35, 0.98),
    values,
    cumulative: cumulativeSum(values),
    latest: values.at(-1) ?? 0,
    recentMean: mean(recent),
    consistency: directionalConsistency(recent),
    volatility: normalizedVolatility(recent)
  };
}

function buildSupplyAnalysisState(
  analysis: AnalysisResult,
  series: FlowSeries[],
  aggregate: number[],
  prepared: ReturnType<typeof prepareRows>,
  coverageConfidence: number
): SupplyAnalysisState {
  const recentWindow = Math.min(20, Math.max(...series.map((item) => item.values.length), aggregate.length, 1));
  const foreign = series.find((item) => item.category === "foreign");
  const institution = series.find((item) => item.category === "institutional");
  const retail = series.find((item) => item.category === "retail");
  const netBuy = series.find((item) => item.category === "aggregate") ?? (aggregate.length ? makeSeries("aggregate", "derived aggregate", "총 순매수", aggregate, 0.7) : undefined);
  const participantCount = [foreign, institution, retail].filter(Boolean).length;
  const coverageConfidenceLabel: SupplyAnalysisState["confidence"] = participantCount >= 2 && prepared.dateColumn ? "high" : participantCount >= 1 && netBuy ? "medium" : "low";
  const metrics = {
    foreignParticipation: participantMetric(foreign, recentWindow),
    institutionStrength: participantMetric(institution, recentWindow),
    retailPressure: retailPressureMetric(retail, recentWindow),
    netBuyMomentum: momentumMetric(netBuy, recentWindow),
    accumulationStrength: accumulationMetric(foreign, institution, netBuy, recentWindow),
    distributionPressure: distributionMetric(foreign, institution, netBuy, recentWindow),
    flowStability: stabilityMetric(series, recentWindow),
    participantImbalance: imbalanceMetric([foreign, institution, retail].filter(Boolean) as FlowSeries[], recentWindow)
  };
  const dominantBuyer = dominantParticipant([foreign, institution, retail], "buyer", recentWindow);
  const dominantSeller = dominantParticipant([foreign, institution, retail], "seller", recentWindow);
  const conflict = smartMoneyConflict(foreign, institution, recentWindow);
  const recentNet = recentMean(netBuy, recentWindow);
  const scale = flowScale(series);
  const neutralThreshold = scale * 0.08;
  const flowDirection: SupplyAnalysisState["derivedSignals"]["flowDirection"] = conflict && Math.abs(recentNet) < neutralThreshold ? "Mixed" : Math.abs(recentNet) < neutralThreshold ? "Neutral" : recentNet > 0 ? "Inflow" : "Outflow";
  const smartMoneyNet = recentMean(foreign, recentWindow) + recentMean(institution, recentWindow);
  const context = classifyFlowContext({ foreign, institution, retail, netBuy, metrics, recentWindow, smartMoneyNet, recentNet, conflict, participantCount, coverageConfidenceLabel });
  const { flowRegime, flowRisk, smartMoneyBias, confidence } = context;
  const activeSignals = buildActiveSignals({ foreign, institution, retail, netBuy, metrics, flowRegime, recentWindow });
  const warnings = [
    confidence === "low" ? "Limited Flow Coverage" : null,
    participantCount < 2 ? "Limited participant coverage detected." : null,
    participantCount === 0 ? "Insufficient data for participant dominance analysis." : null
  ].filter(Boolean) as string[];
  const alpha = contextualSupplyAlpha(metrics, flowRisk, confidence, flowRegime, smartMoneyBias);
  const interpretation = contextualSupplyInterpretation({ metrics, dominantBuyer, dominantSeller, flowDirection, flowRegime, flowRisk, smartMoneyBias, alpha, warnings });

  return {
    datasetType: "supply",
    confidence,
    detectedColumns: {
      date: prepared.dateColumn,
      foreign: foreign?.column ?? null,
      institution: institution?.column ?? null,
      retail: retail?.column ?? null,
      netBuy: netBuy?.column ?? null
    },
    preprocessing: {
      columnsNormalized: true,
      dateParsed: Boolean(prepared.dateColumn),
      numericConverted: true,
      missingValuesHandled: true,
      coverageScore: round2(coverageConfidence)
    },
    metrics,
    derivedSignals: {
      dominantBuyer,
      dominantSeller,
      flowDirection,
      flowRegime,
      flowRisk,
      smartMoneyBias,
      confidenceLabel: confidence === "high" ? "High" : confidence === "medium" ? "Medium" : "Low"
    },
    alpha,
    activeSignals,
    warnings,
    interpretation,
    parsingDebug: series.map((item) => ({
      sourceColumn: item.column,
      semanticRole: semanticRoleForSeries(item),
      participant: CATEGORY_META[item.category].label,
      signDirection: item.category === "retail" ? "positive = retail buying pressure" : "positive = inflow / accumulation",
      recentValues: item.values.slice(-5),
      confidence: round2(item.confidence)
    }))
  };
}

function applyScenario(series: FlowSeries[], scenario?: Partial<SupplyScenario>) {
  if (!scenario) return series;
  const map: Partial<Record<FlowCategory, number>> = {
    institutional: scenario.institutional,
    foreign: scenario.foreign,
    retail: scenario.retail,
    aggregate: scenario.aggregate,
    dealer: scenario.dealer,
    broker: scenario.dealer,
    etf: scenario.etf,
    whale: scenario.whale
  };
  return series.map((item) => {
    const delta = map[item.category] ?? 0;
    if (!delta) return item;
    const values = item.values.map((value, index) => index === item.values.length - 1 ? value + delta : value);
    return makeSeries(item.category, item.column, item.label, values, item.confidence);
  });
}

function buildAggregateSeries(series: FlowSeries[]) {
  const length = Math.max(...series.map((item) => item.values.length), 0);
  return Array.from({ length }, (_item, index) => {
    return series.reduce((sum, item) => {
      const value = item.values[index + item.values.length - length] ?? 0;
      const weight = item.category === "retail" ? -0.2 : Math.abs(CATEGORY_META[item.category].weight);
      const direction = item.category === "outflow" ? -1 : 1;
      return sum + value * direction * weight;
    }, 0);
  });
}

function computeCoverageConfidence(series: FlowSeries[], dateColumn: string | null) {
  const participants = new Set(series.filter((item) => ["foreign", "institutional", "retail"].includes(item.category)).map((item) => item.category));
  const net = series.some((item) => item.category === "aggregate");
  const base = participants.size >= 2 && dateColumn ? 0.86 : participants.size >= 1 && net ? 0.64 : series.length ? 0.38 : 0;
  const quality = mean(series.map((item) => item.confidence * (0.7 + item.consistency * 0.3)));
  return clamp(base * 0.55 + quality * 0.45, 0, 1);
}

function detectSupplyConflicts(series: FlowSeries[], aggregate: number[]): FlowConflict[] {
  const conflicts: FlowConflict[] = [];
  const recentWindow = Math.min(20, aggregate.length || 20);
  const foreign = series.find((item) => item.category === "foreign");
  const institution = series.find((item) => item.category === "institutional");
  const retail = series.find((item) => item.category === "retail");
  const foreignRecent = recentMean(foreign, recentWindow);
  const institutionRecent = recentMean(institution, recentWindow);
  const retailRecent = recentMean(retail, recentWindow);
  const aggregateRecent = mean(aggregate.slice(-recentWindow));
  if (foreignRecent * institutionRecent < 0 && Math.abs(foreignRecent - institutionRecent) > flowScale(series) * 0.35) {
    conflicts.push({ severity: "MEDIUM", title: "스마트머니 충돌", message: "외국인과 기관 흐름이 서로 다른 방향으로 움직입니다.", guidance: "참여자 정렬이 회복될 때까지 수급 신뢰도를 낮게 해석합니다." });
  }
  if (aggregateRecent < 0 && (foreignRecent < 0 || institutionRecent < 0)) {
    conflicts.push({ severity: "HIGH", title: "주요 참여자 유출", message: "순자본 유출과 스마트머니 매도 압력이 동시에 감지됩니다.", guidance: "분배 압력과 유동성 약화를 우선 확인합니다." });
  }
  if (retailRecent > 0 && foreignRecent + institutionRecent < 0) {
    conflicts.push({ severity: "HIGH", title: "개인 추격성 수급", message: "개인 매수와 스마트머니 유출이 충돌합니다.", guidance: "추격성 참여가 가격 변동성을 키울 수 있습니다." });
  }
  return conflicts;
}

function buildComposition(series: FlowSeries[]) {
  const grouped = new Map<FlowCategory, { label: string; category: FlowCategory; value: number; color: string }>();
  for (const item of series) {
    const value = Math.abs(mean(item.values.slice(-20)));
    if (!value) continue;
    const prev = grouped.get(item.category);
    const meta = CATEGORY_META[item.category];
    grouped.set(item.category, prev ? { ...prev, value: prev.value + value } : { label: meta.label, category: item.category, value, color: meta.color });
  }
  const rows = Array.from(grouped.values());
  const total = rows.reduce((sum, item) => sum + item.value, 0) || 1;
  return rows.map((item) => ({ ...item, share: item.value / total }));
}

function emptySupplyAnalysis(analysis: AnalysisResult, prepared = prepareRows(analysis)): SupplyFlowAnalysis {
  const analysisState: SupplyAnalysisState = {
    datasetType: "supply",
    confidence: "low",
    detectedColumns: { date: prepared.dateColumn, foreign: null, institution: null, retail: null, netBuy: null },
    preprocessing: { columnsNormalized: true, dateParsed: Boolean(prepared.dateColumn), numericConverted: true, missingValuesHandled: true, coverageScore: 0 },
    metrics: { foreignParticipation: 0, institutionStrength: 0, retailPressure: 0, netBuyMomentum: 0, accumulationStrength: 0, distributionPressure: 0, flowStability: 0, participantImbalance: 0 },
    derivedSignals: { dominantBuyer: "Insufficient Data", dominantSeller: "Insufficient Data", flowDirection: "Neutral", flowRegime: "Neutral Flow", flowRisk: "Neutral", smartMoneyBias: "Neutral", confidenceLabel: "Low" },
    alpha: { score: 50, bias: "Neutral Bias", explanation: "수급 분석에 필요한 참여자 또는 순매수 컬럼이 부족합니다." },
    activeSignals: ["Limited participant coverage detected."],
    warnings: ["Limited Flow Coverage", "This dataset contains partial supply-flow information. The system generated analysis only from detected participant and net-flow columns."],
    interpretation: {
      summary: "이 데이터셋은 수급 분석에 필요한 컬럼이 제한적입니다.",
      opportunity: "사용 가능한 참여자 또는 순매수 컬럼이 추가되면 자본 흐름 구조를 더 명확히 계산할 수 있습니다.",
      risk: "현재는 우세 참여자와 순매수 모멘텀을 신뢰도 있게 판단하기 어렵습니다.",
      scenarioA: "참여자별 순매수 컬럼이 추가되면 매집 구조를 계산합니다.",
      scenarioB: "순매수 컬럼만 제공되면 제한적 Flow 모드로 분석합니다.",
      scenarioC: "데이터 커버리지가 낮으면 unsupported 신호는 표시하지 않습니다."
    },
    parsingDebug: []
  };
  return {
    active: false,
    lite: true,
    mode: "Limited Flow Coverage",
    smartMoneyScore: 50,
    scoreLabel: "Neutral",
    scoreTone: "neutral",
    confidence: 0,
    alphaAdjustment: 0,
    regimeConfidenceDelta: 0,
    columns: [],
    aggregate: [],
    dates: prepared.dates,
    heatmap: [],
    composition: [],
    insights: [analysisState.interpretation.summary],
    conflicts: [],
    availableSignals: [],
    missingSignals: REQUIRED_SIGNAL_NAMES,
    degradation: analysisState.warnings,
    analysisState
  };
}

function participantMetric(series: FlowSeries | undefined, window: number) {
  if (!series) return 50;
  const recent = series.values.slice(-window);
  const full = series.values;
  const recentAvg = mean(recent);
  const fullAvg = mean(full);
  const positiveRatio = recent.filter((value) => value > 0).length / Math.max(recent.length, 1);
  const slope = linearSlope(recent);
  const scale = Math.max(mean(full.map(Math.abs)), 1);
  return clamp(Math.round(50 + (recentAvg / scale) * 24 + (recentAvg - fullAvg) / scale * 16 + positiveRatio * 18 + slope / scale * 12), 0, 100);
}

function retailPressureMetric(series: FlowSeries | undefined, window: number) {
  if (!series) return 50;
  const recentAvg = recentMean(series, window);
  const positiveRatio = series.values.slice(-window).filter((value) => value > 0).length / Math.max(window, 1);
  const scale = Math.max(mean(series.values.map(Math.abs)), 1);
  return clamp(Math.round(50 + (recentAvg / scale) * 32 + positiveRatio * 18), 0, 100);
}

function momentumMetric(series: FlowSeries | undefined, window: number) {
  if (!series) return 50;
  const recent = series.values.slice(-window);
  const avg = mean(recent);
  const slope = linearSlope(recent);
  const positiveRatio = recent.filter((value) => value > 0).length / Math.max(recent.length, 1);
  const acceleration = mean(recent.slice(-Math.ceil(window / 2))) - mean(recent.slice(0, Math.floor(window / 2)));
  const scale = Math.max(mean(series.values.map(Math.abs)), 1);
  return clamp(Math.round(50 + (avg / scale) * 20 + (slope / scale) * 18 + positiveRatio * 20 + (acceleration / scale) * 14), 0, 100);
}

function accumulationMetric(foreign: FlowSeries | undefined, institution: FlowSeries | undefined, netBuy: FlowSeries | undefined, window: number) {
  const smart = [foreign, institution].filter(Boolean) as FlowSeries[];
  if (!smart.length && !netBuy) return 0;
  const smartMean = mean(smart.map((item) => recentMean(item, window)));
  const netMomentum = momentumMetric(netBuy, window);
  const smartPositive = smart.filter((item) => recentMean(item, window) > 0).length / Math.max(smart.length, 1);
  const scale = Math.max(mean(smart.flatMap((item) => item.values.map(Math.abs))), 1);
  return clamp(Math.round(42 + (smartMean / scale) * 24 + netMomentum * 0.24 + smartPositive * 18), 0, 100);
}

function distributionMetric(foreign: FlowSeries | undefined, institution: FlowSeries | undefined, netBuy: FlowSeries | undefined, window: number) {
  const smart = [foreign, institution].filter(Boolean) as FlowSeries[];
  if (!smart.length && !netBuy) return 0;
  const smartMean = mean(smart.map((item) => recentMean(item, window)));
  const netMomentum = momentumMetric(netBuy, window);
  const smartNegative = smart.filter((item) => recentMean(item, window) < 0).length / Math.max(smart.length, 1);
  const scale = Math.max(mean(smart.flatMap((item) => item.values.map(Math.abs))), 1);
  return clamp(Math.round(42 + (-smartMean / scale) * 24 + (100 - netMomentum) * 0.24 + smartNegative * 18), 0, 100);
}

function stabilityMetric(series: FlowSeries[], window: number) {
  if (!series.length) return 0;
  const consistency = mean(series.map((item) => item.consistency));
  const reversals = mean(series.map((item) => reversalRate(item.values.slice(-window))));
  const volatility = mean(series.map((item) => item.volatility));
  return clamp(Math.round(consistency * 50 + (1 - reversals) * 26 + (1 - volatility) * 24), 0, 100);
}

function imbalanceMetric(series: FlowSeries[], window: number) {
  if (series.length < 2) return series.length ? 55 : 0;
  const absolutes = series.map((item) => Math.abs(recentMean(item, window)));
  const total = absolutes.reduce((sum, value) => sum + value, 0);
  if (!total) return 0;
  return clamp(Math.round((Math.max(...absolutes) / total) * 100), 0, 100);
}

function dominantParticipant(items: Array<FlowSeries | undefined>, side: "buyer" | "seller", window: number): SupplyAnalysisState["derivedSignals"]["dominantBuyer"] {
  const ranked = items
    .filter(Boolean)
    .map((item) => item as FlowSeries)
    .map((item) => ({ name: participantName(item.category), value: recentMean(item, window) }))
    .filter((item) => side === "buyer" ? item.value > 0 : item.value < 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  if (!ranked.length) return items.filter(Boolean).length ? "Mixed" : "Insufficient Data";
  if (ranked.length > 1 && Math.abs(ranked[0].value) < Math.abs(ranked[1].value) * 1.15) return "Mixed";
  return ranked[0].name;
}

function participantName(category: FlowCategory): "Foreign" | "Institution" | "Retail" | "Mixed" | "Insufficient Data" {
  if (category === "foreign") return "Foreign";
  if (category === "institutional") return "Institution";
  if (category === "retail") return "Retail";
  return "Mixed";
}

function semanticRoleForSeries(series: FlowSeries) {
  if (series.column.includes(" - ")) return "calculated net flow (buy - sell)";
  if (/sell|\ub9e4\ub3c4/.test(normalize(series.column))) return "selling activity";
  if (/buy|\ub9e4\uc218/.test(normalize(series.column)) && !/net|\uc21c\ub9e4\uc218/.test(normalize(series.column))) return "buying activity";
  if (/net|\uc21c\ub9e4\uc218|derivedaggregate/.test(normalize(series.column))) return "net flow";
  return "flow-like numeric column";
}

function smartMoneyConflict(foreign: FlowSeries | undefined, institution: FlowSeries | undefined, window: number) {
  if (!foreign || !institution) return false;
  return recentMean(foreign, window) * recentMean(institution, window) < 0;
}

function classifyFlowContext(input: {
  foreign?: FlowSeries;
  institution?: FlowSeries;
  retail?: FlowSeries;
  netBuy?: FlowSeries;
  metrics: SupplyAnalysisState["metrics"];
  recentWindow: number;
  smartMoneyNet: number;
  recentNet: number;
  conflict: boolean;
  participantCount: number;
  coverageConfidenceLabel: SupplyAnalysisState["confidence"];
}) {
  const { metrics } = input;
  const foreignMean = recentMean(input.foreign, input.recentWindow);
  const institutionMean = recentMean(input.institution, input.recentWindow);
  const smartScale = Math.max(mean([input.foreign, input.institution].filter(Boolean).flatMap((item) => (item as FlowSeries).values.slice(-input.recentWindow).map(Math.abs))), 1);
  const foreignPositive = Boolean(input.foreign && foreignMean > smartScale * 0.06 && metrics.foreignParticipation >= 52);
  const institutionPositive = Boolean(input.institution && institutionMean > smartScale * 0.06 && metrics.institutionStrength >= 52);
  const foreignBearish = Boolean(input.foreign && foreignMean < -smartScale * 0.06 && metrics.foreignParticipation <= 44);
  const institutionBearish = Boolean(input.institution && institutionMean < -smartScale * 0.06 && metrics.institutionStrength <= 44);
  const netPositive = Boolean(input.netBuy && input.recentNet > 0 && metrics.netBuyMomentum >= 52);
  const netBearish = Boolean(input.netBuy && input.recentNet < 0 && metrics.netBuyMomentum <= 46);
  const smartPositiveCount = [foreignPositive, institutionPositive].filter(Boolean).length;
  const smartNegativeCount = [foreignBearish, institutionBearish].filter(Boolean).length;
  const bearishConfirmations = [
    foreignBearish,
    institutionBearish,
    netBearish,
    metrics.accumulationStrength < 45,
    metrics.distributionPressure >= 68,
    metrics.netBuyMomentum < 45
  ].filter(Boolean).length;
  const bullishConfirmations = [
    foreignPositive,
    institutionPositive,
    netPositive,
    metrics.accumulationStrength >= 62,
    metrics.distributionPressure < 55,
    metrics.flowStability >= 55
  ].filter(Boolean).length;
  const retailDominatesRisk = Boolean(
    input.retail &&
    metrics.retailPressure >= 78 &&
    smartPositiveCount === 0 &&
    metrics.foreignParticipation < 48 &&
    metrics.institutionStrength < 48
  );
  const mixedForces =
    input.conflict ||
    (smartPositiveCount > 0 && smartNegativeCount > 0) ||
    (metrics.accumulationStrength >= 48 && metrics.distributionPressure >= 55) ||
    (metrics.flowStability < 45 && !netBearish);

  let flowRegime: SupplyAnalysisState["derivedSignals"]["flowRegime"] = "Neutral Flow";
  if (bearishConfirmations >= 5 && smartNegativeCount >= 2 && metrics.accumulationStrength < 42) flowRegime = "Strong Distribution";
  else if (bearishConfirmations >= 4 && smartNegativeCount >= 1 && metrics.distributionPressure >= 62 && !(smartPositiveCount > 0 && netPositive)) flowRegime = "Weak Distribution";
  else if (bullishConfirmations >= 5 && smartPositiveCount >= 1 && metrics.netBuyMomentum >= 62) flowRegime = "Strong Accumulation";
  else if (mixedForces || retailDominatesRisk) flowRegime = "Mixed Rotation";
  else if (smartPositiveCount >= 1 && metrics.accumulationStrength >= 52 && metrics.netBuyMomentum >= 50 && metrics.flowStability >= 45) flowRegime = "Weak Accumulation";

  let flowRisk: SupplyAnalysisState["derivedSignals"]["flowRisk"] = "Neutral";
  if (flowRegime === "Strong Distribution" && metrics.flowStability < 35 && metrics.participantImbalance > 72) flowRisk = "Extreme";
  else if ((flowRegime === "Strong Distribution" || flowRegime === "Weak Distribution") && (netBearish || metrics.distributionPressure >= 72)) flowRisk = "High";
  else if (flowRegime === "Mixed Rotation" || metrics.flowStability < 42 || metrics.participantImbalance > 76) flowRisk = "Neutral";
  else if (flowRegime.includes("Accumulation") && metrics.flowStability >= 45) flowRisk = "Low";

  const smartMoneyBias: SupplyAnalysisState["derivedSignals"]["smartMoneyBias"] =
    flowRegime.includes("Accumulation") ? "Bullish" :
      flowRegime.includes("Distribution") ? "Bearish" :
        flowRegime === "Mixed Rotation" ? "Mixed" : "Neutral";

  let confidence: SupplyAnalysisState["confidence"] = input.coverageConfidenceLabel;
  if (input.coverageConfidenceLabel === "low" || input.participantCount < 1) confidence = "low";
  else if ((flowRegime === "Strong Accumulation" || flowRegime === "Strong Distribution") && metrics.flowStability >= 50 && Math.max(bullishConfirmations, bearishConfirmations) >= 5) confidence = "high";
  else confidence = "medium";

  return { flowRegime, flowRisk, smartMoneyBias, confidence };
}

function buildActiveSignals(input: {
  foreign?: FlowSeries;
  institution?: FlowSeries;
  retail?: FlowSeries;
  netBuy?: FlowSeries;
  metrics: SupplyAnalysisState["metrics"];
  flowRegime: string;
  recentWindow: number;
}) {
  const signals = [
    input.institution && recentMean(input.institution, input.recentWindow) > 0 ? "Institutional accumulation detected" : null,
    input.foreign && recentMean(input.foreign, input.recentWindow) > 0 ? "Foreign net buying increasing" : null,
    input.retail && recentMean(input.retail, input.recentWindow) < 0 ? "Retail selling pressure weakening" : null,
    input.netBuy && input.metrics.netBuyMomentum > 55 ? "Net buy momentum improving" : null,
    input.flowRegime.includes("Accumulation") ? "Smart money inflow active" : null,
    input.flowRegime === "Mixed Rotation" ? "Participant rotation detected" : null,
    input.metrics.flowStability < 38 ? "Flow instability detected" : null,
    input.flowRegime.includes("Distribution") && input.metrics.distributionPressure > 62 ? "Distribution pressure rising" : null
  ].filter(Boolean) as string[];
  return signals.length ? signals : ["Limited participant coverage detected."];
}

function supplyAlpha(metrics: SupplyAnalysisState["metrics"], flowRisk: SupplyAnalysisState["derivedSignals"]["flowRisk"], confidence: SupplyAnalysisState["confidence"]) {
  const base =
    metrics.institutionStrength * 0.25 +
    metrics.foreignParticipation * 0.25 +
    metrics.netBuyMomentum * 0.2 +
    metrics.accumulationStrength * 0.15 +
    metrics.flowStability * 0.15;
  const riskPenalty = flowRisk === "Extreme" ? 15 : flowRisk === "High" ? 10 : flowRisk === "Neutral" ? 4 : 0;
  const score = clamp(Math.round(base - metrics.distributionPressure * 0.2 - riskPenalty - Math.max(0, metrics.participantImbalance - 70) * 0.33), 0, 100);
  const bias: SupplyAnalysisState["alpha"]["bias"] = metrics.accumulationStrength >= 62 && metrics.distributionPressure < 55 ? "Accumulation Bias" : metrics.distributionPressure >= 62 ? "Distribution Bias" : confidence === "low" ? "Neutral Bias" : "Mixed Bias";
  const explanation = bias === "Accumulation Bias"
    ? "기관 또는 외국인 순매수와 순매수 모멘텀이 Alpha 구조를 지지합니다."
    : bias === "Distribution Bias"
      ? "주요 참여자 유출과 분배 압력이 Supply Alpha를 약화시킵니다."
      : "수급 방향성이 혼재되어 제한적 신뢰도로 평가됩니다.";
  return { score, bias, explanation };
}

function supplyInterpretation(input: {
  metrics: SupplyAnalysisState["metrics"];
  dominantBuyer: SupplyAnalysisState["derivedSignals"]["dominantBuyer"];
  dominantSeller: SupplyAnalysisState["derivedSignals"]["dominantSeller"];
  flowDirection: SupplyAnalysisState["derivedSignals"]["flowDirection"];
  flowRegime: string;
  flowRisk: SupplyAnalysisState["derivedSignals"]["flowRisk"];
  smartMoneyBias: SupplyAnalysisState["derivedSignals"]["smartMoneyBias"];
  alpha: SupplyAnalysisState["alpha"];
  warnings: string[];
}): SupplyAnalysisState["interpretation"] {
  const limited = input.warnings.includes("Limited Flow Coverage");
  const summary = limited
    ? "This dataset contains partial supply-flow information. The system generated analysis only from detected participant and net-flow columns."
    : input.flowRegime === "Accumulation"
      ? "현재 수급 구조는 기관 또는 외국인 순매수에 의해 매집 압력이 형성되는 모습입니다."
      : input.flowRegime === "Distribution"
        ? "현재 수급 구조는 주요 참여자 매도와 순자본 유출이 결합된 분배 압력으로 해석됩니다."
        : input.flowRegime === "Rotation"
          ? "현재 수급 구조는 참여자 간 매수와 매도가 엇갈리는 로테이션 국면입니다."
          : "현재 수급 구조는 방향성이 약하거나 중립적인 상태입니다.";
  const strongest = input.dominantBuyer === "Foreign"
    ? "외국인 참여가 현재 수급 구조의 가장 강한 동인입니다."
    : input.dominantBuyer === "Institution"
      ? "기관 흐름이 현재 매집 구조의 가장 강한 동인입니다."
      : input.dominantBuyer === "Retail"
        ? "개인 매수는 감지되지만 retail pressure 지표와 함께 제한적으로 해석해야 합니다."
        : "우세 매수 주체는 혼합적이거나 충분히 명확하지 않습니다.";
  const opportunity = input.flowDirection === "Inflow"
    ? `${strongest} 순매수 모멘텀이 유지되면 안정적인 유입 구조가 강화됩니다.`
    : input.flowDirection === "Outflow"
      ? "유출 압력이 완화되고 순매수 모멘텀이 회복되어야 수급 구조가 개선됩니다."
      : "참여자별 방향성이 정렬될 때까지 수급 기회는 제한적으로 해석됩니다.";
  const risk = input.flowRisk === "Extreme" || input.flowRisk === "High"
    ? "강한 유출, 낮은 안정성, 높은 참여자 쏠림이 동시에 나타나 수급 리스크가 높습니다."
    : input.dominantSeller !== "Mixed" && input.dominantSeller !== "Insufficient Data"
      ? `${input.dominantSeller} 매도 압력이 확대되면 수급 안정성이 약화될 수 있습니다.`
      : "현재 리스크는 통제 가능한 수준이지만 순매수 모멘텀 둔화는 계속 확인해야 합니다.";
  return {
    summary,
    opportunity,
    risk,
    scenarioA: "기관 또는 외국인 매집이 지속되면 Smart Money 우위가 강화됩니다.",
    scenarioB: "외국인 참여가 약화되면 순매수 모멘텀이 둔화되고 혼합 수급으로 전환될 수 있습니다.",
    scenarioC: "개인 중심 변동성과 주요 참여자 유출이 결합되면 분배 압력이 커질 수 있습니다."
  };
}

function contextualSupplyAlpha(
  metrics: SupplyAnalysisState["metrics"],
  flowRisk: SupplyAnalysisState["derivedSignals"]["flowRisk"],
  confidence: SupplyAnalysisState["confidence"],
  flowRegime: SupplyAnalysisState["derivedSignals"]["flowRegime"],
  smartMoneyBias: SupplyAnalysisState["derivedSignals"]["smartMoneyBias"]
) {
  const smartWeighted = metrics.foreignParticipation * 0.56 + metrics.institutionStrength * 0.44;
  const positiveTilt =
    (smartWeighted - 50) * 0.34 +
    (metrics.netBuyMomentum - 50) * 0.24 +
    (metrics.accumulationStrength - 50) * 0.22 +
    (metrics.flowStability - 50) * 0.08;
  const distributionPenalty = Math.max(0, metrics.distributionPressure - 58) * (flowRegime.includes("Distribution") ? 0.28 : 0.12);
  const stabilityPenalty = Math.max(0, 42 - metrics.flowStability) * 0.12;
  const imbalancePenalty = Math.max(0, metrics.participantImbalance - 78) * (flowRegime.includes("Distribution") ? 0.18 : 0.08);
  const riskPenalty = flowRisk === "Extreme" ? 10 : flowRisk === "High" ? 7 : flowRisk === "Neutral" ? 2 : 0;
  let score = Math.round(50 + positiveTilt - distributionPenalty - stabilityPenalty - imbalancePenalty - riskPenalty);

  if (flowRegime === "Strong Accumulation") score = clamp(score, 81, 100);
  else if (flowRegime === "Weak Accumulation") score = clamp(score, 61, 80);
  else if (flowRegime === "Mixed Rotation" || flowRegime === "Neutral Flow") score = clamp(score, 41, 60);
  else if (flowRegime === "Weak Distribution") score = clamp(score, 21, 45);
  else if (flowRegime === "Strong Distribution") score = clamp(score, 0, confidence === "high" ? 28 : 38);

  const bias: SupplyAnalysisState["alpha"]["bias"] =
    smartMoneyBias === "Bullish" ? "Accumulation Bias" :
      smartMoneyBias === "Bearish" ? "Distribution Bias" :
        smartMoneyBias === "Mixed" ? "Mixed Bias" : "Neutral Bias";
  const explanation = bias === "Accumulation Bias"
    ? "외국인/기관 중심의 순유입과 순매수 모멘텀이 Supply Alpha를 지지합니다."
    : bias === "Distribution Bias"
      ? "주요 참여자의 실제 유출 확인이 누적되며 Supply Alpha가 약화됩니다."
      : bias === "Mixed Bias"
        ? "참여자 방향성이 엇갈려 혼합 수급 구조로 평가됩니다."
        : "수급 방향성이 중립권에 머물러 제한적 신호로 평가됩니다.";
  return { score, bias, explanation };
}

function contextualSupplyInterpretation(input: {
  metrics: SupplyAnalysisState["metrics"];
  dominantBuyer: SupplyAnalysisState["derivedSignals"]["dominantBuyer"];
  dominantSeller: SupplyAnalysisState["derivedSignals"]["dominantSeller"];
  flowDirection: SupplyAnalysisState["derivedSignals"]["flowDirection"];
  flowRegime: SupplyAnalysisState["derivedSignals"]["flowRegime"];
  flowRisk: SupplyAnalysisState["derivedSignals"]["flowRisk"];
  smartMoneyBias: SupplyAnalysisState["derivedSignals"]["smartMoneyBias"];
  alpha: SupplyAnalysisState["alpha"];
  warnings: string[];
}): SupplyAnalysisState["interpretation"] {
  if (input.warnings.includes("Limited Flow Coverage")) {
    return {
      summary: "이 데이터셋은 부분적인 수급 정보만 포함합니다. 감지된 참여자와 순매수 컬럼만으로 제한 분석을 생성했습니다.",
      opportunity: "추가 참여자 컬럼이 확보되면 스마트머니 매집/분배 구조를 더 안정적으로 판별할 수 있습니다.",
      risk: "컬럼 커버리지가 낮아 우세 주체와 수급 방향성의 신뢰도가 제한됩니다.",
      scenarioA: "외국인 또는 기관 순유입이 확인되면 약한 매집 구조로 전환될 수 있습니다.",
      scenarioB: "순매수 모멘텀이 중립권에 머물면 제한적 Flow 모드가 유지됩니다.",
      scenarioC: "주요 참여자 유출이 함께 확인되기 전까지 강한 분배로 해석하지 않습니다."
    };
  }

  const regimeText: Record<SupplyAnalysisState["derivedSignals"]["flowRegime"], string> = {
    "Strong Accumulation": "외국인/기관 중심의 순유입과 순매수 모멘텀이 함께 정렬된 강한 매집 구조입니다.",
    "Weak Accumulation": "스마트머니 유입은 관찰되지만 일부 참여자 불일치가 남아 있는 약한 매집 구조입니다.",
    "Mixed Rotation": "참여자별 방향성이 엇갈리는 혼합 로테이션 구조입니다.",
    "Neutral Flow": "순매수와 참여자 흐름이 중립권에 머무는 수급 구조입니다.",
    "Weak Distribution": "일부 주요 참여자의 유출과 분배 압력이 확인되지만 강한 분배 확정에는 추가 확인이 필요합니다.",
    "Strong Distribution": "외국인과 기관 유출, 약한 매집, 음의 순매수 모멘텀이 동시에 확인된 강한 분배 구조입니다."
  };
  const buyerText = input.dominantBuyer === "Foreign"
    ? "외국인 흐름이 현재 수급 구조의 핵심 지지 축입니다."
    : input.dominantBuyer === "Institution"
      ? "기관 흐름이 현재 매집 구조의 주요 동인입니다."
      : input.dominantBuyer === "Retail"
        ? "개인 매수세가 감지되지만 외국인/기관 참여가 약할 때만 주도 신호로 해석합니다."
        : "우세 매수 주체는 혼합적이거나 충분히 명확하지 않습니다.";
  const summary = `${regimeText[input.flowRegime]} ${buyerText}`;
  const opportunity = input.flowRegime.includes("Accumulation")
    ? "순매수 모멘텀이 유지되고 외국인/기관 참여가 이어지면 안정적 유입 구조가 강화됩니다."
    : input.flowRegime === "Mixed Rotation"
      ? "혼합 구조에서는 외국인 또는 기관 쪽으로 흐름이 재정렬되는지 확인하는 것이 핵심입니다."
      : input.flowRegime.includes("Distribution")
        ? "분배 압력이 완화되고 순매수 모멘텀이 중립권을 회복해야 구조 개선을 기대할 수 있습니다."
        : "중립 수급에서는 순매수 방향성과 스마트머니 참여 확대가 다음 확인 조건입니다.";
  const risk = input.flowRisk === "High" || input.flowRisk === "Extreme"
    ? "리스크는 실제 유출 확인과 분배 압력이 함께 나타나는 구간에 집중됩니다."
    : input.metrics.flowStability < 42
      ? "수급 안정성은 낮지만 이는 즉각적인 약세가 아니라 참여자 로테이션 리스크로 해석합니다."
      : input.dominantSeller !== "Mixed" && input.dominantSeller !== "Insufficient Data"
        ? `${input.dominantSeller} 매도 압력이 확대될 경우 수급 안정성이 약화될 수 있습니다.`
        : "현재 분배 리스크는 제한적이며 추가 유출 확인이 필요합니다.";

  return {
    summary,
    opportunity,
    risk,
    scenarioA: input.smartMoneyBias === "Bullish" ? "외국인/기관 매집이 지속되면 누적 순유입 구조가 강화됩니다." : "외국인/기관 유입이 재개되면 약한 매집 시나리오로 회복될 수 있습니다.",
    scenarioB: "참여자 방향성이 계속 엇갈리면 혼합 로테이션 구간이 이어질 수 있습니다.",
    scenarioC: input.smartMoneyBias === "Bearish" ? "외국인과 기관 유출이 동시에 확대되면 강한 분배 리스크가 커집니다." : "순매수 모멘텀이 음전환하고 주요 참여자 유출이 겹치면 분배 압력이 상승합니다."
  };
}

function alignLength(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  return Array.from({ length }, (_item, index) => [left[left.length - length + index], right[right.length - length + index]] as [number, number]);
}

function clipSeries(series: FlowSeries, length: number) {
  return makeSeries(series.category, series.column, series.label, series.values.slice(-length), series.confidence);
}

function recentMean(series: FlowSeries | undefined, window: number) {
  return series ? mean(series.values.slice(-window)) : 0;
}

function flowScale(series: FlowSeries[]) {
  return Math.max(mean(series.flatMap((item) => item.values.slice(-20).map(Math.abs))), 1);
}

function linearSlope(values: number[]) {
  if (values.length < 2) return 0;
  return (values.at(-1)! - values[0]) / (values.length - 1);
}

function reversalRate(values: number[]) {
  if (values.length < 3) return 0;
  let reversals = 0;
  for (let i = 2; i < values.length; i += 1) {
    const a = Math.sign(values[i - 1] - values[i - 2]);
    const b = Math.sign(values[i] - values[i - 1]);
    if (a && b && a !== b) reversals += 1;
  }
  return reversals / Math.max(values.length - 2, 1);
}

function cumulativeSum(values: number[]) {
  let total = 0;
  return values.map((value) => {
    total += value;
    return total;
  });
}

function rollingRank(values: number[], index: number) {
  const window = values.slice(Math.max(0, index - 29), index + 1);
  const current = values[index] ?? 0;
  if (window.length < 2) return 0.5;
  const min = Math.min(...window);
  const max = Math.max(...window);
  return max === min ? 0.5 : (current - min) / (max - min);
}

function scoreBand(score: number) {
  if (score >= 80) return "Strong Inflow";
  if (score >= 60) return "Positive Flow";
  if (score >= 40) return "Neutral";
  if (score >= 20) return "Weak";
  return "Outflow";
}

function scoreTone(score: number): SupplyFlowAnalysis["scoreTone"] {
  if (score >= 80) return "good";
  if (score >= 60) return "positive";
  if (score >= 40) return "neutral";
  if (score >= 20) return "weak";
  return "bad";
}

function numericValues(rows: Row[], column: string) {
  return rows.map((row) => toNumber(row[column])).filter(Number.isFinite);
}

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/[\s_\-./()[\]{}:]+/g, "");
}

function toNumber(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;
  const negative = /^\(.*\)$/.test(raw) || raw.startsWith("-");
  let multiplier = 1;
  if (/억/.test(raw)) multiplier *= 100000000;
  if (/만/.test(raw)) multiplier *= 10000;
  const cleaned = raw
    .replace(/[(),₩원,%\s]/g, "")
    .replace(/억|만/g, "")
    .replace(/[^\d.+-]/g, "");
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return NaN;
  return negative ? -Math.abs(number) * multiplier : number * multiplier;
}

function mean(values: number[]) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

function std(values: number[]) {
  const avg = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - avg) ** 2)));
}

function directionalConsistency(values: number[]) {
  const clean = values.filter((value) => value !== 0);
  if (!clean.length) return 0.5;
  const positive = clean.filter((value) => value > 0).length / clean.length;
  return Math.max(positive, 1 - positive);
}

function normalizedVolatility(values: number[]) {
  const absMean = Math.abs(mean(values)) || 1;
  return clamp(std(values) / absMean, 0, 2) / 2;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
