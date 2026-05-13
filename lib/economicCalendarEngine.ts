export type EconomicEventCategory =
  | "Inflation"
  | "Employment"
  | "Central Bank"
  | "Growth"
  | "Manufacturing"
  | "Consumer"
  | "Liquidity"
  | "Housing"
  | "Bond/Yield"
  | "Currency"
  | "Energy"
  | "Geopolitical"
  | "Generic Macro Event";

export type ImportanceLevel = "HIGH" | "MEDIUM" | "LOW";
export type SurpriseDirection = "Positive Surprise" | "Neutral" | "Negative Surprise" | "Pending";

export type EconomicEventSignal = {
  index: number;
  eventName: string;
  eventCategory: EconomicEventCategory;
  importanceLevel: ImportanceLevel;
  actualValue: number | null;
  forecastValue: number | null;
  previousValue: number | null;
  surpriseScore: number;
  surpriseDirection: SurpriseDirection;
  surpriseStrength: number;
  previousChange: number | null;
  marketPressure: string;
  volatilityImpact: number;
  regimeEffect: string;
  riskContribution: number;
  riskOnPressure: number;
  riskOffPressure: number;
  liquiditySupport: number;
  eventPriorityScore: number;
  priorityTier: "DOMINANT" | "SECONDARY" | "COMPRESSED";
  interpretationKo: string;
};

export type EconomicEventCluster = {
  clusterName: string;
  category: EconomicEventCategory;
  eventCount: number;
  avgSurprise: number;
  pressureTrend: "상승" | "하락" | "중립";
  latestDirection: SurpriseDirection;
  pressureAcceleration: number;
  clusterConfidence: number;
  clusterPressure: number;
  events: EconomicEventSignal[];
};

export type EconomicCalendarAnalysis = {
  detected: boolean;
  confidence: number;
  columns: Partial<Record<"event" | "forecast" | "actual" | "previous" | "importance" | "date", string>>;
  eventSignals: EconomicEventSignal[];
  pressureScores: {
    inflation: number;
    growth: number;
    liquidity: number;
    employment: number;
    volatility: number;
    total: number;
  };
  macroRegime: {
    labelKo: string;
    reasonKo: string;
    riskBiasKo: string;
  };
  macroConflicts: { labelKo: string; severity: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"; eventsKo: string[]; explanationKo: string; collisionScore: number }[];
  eventClusters: EconomicEventCluster[];
  dominantDriversKo: string[];
  regimeTransition: {
    previousRegimeKo: string;
    currentRegimeKo: string;
    catalystEventsKo: string[];
    pressureRotationKo: string;
    confidenceDeteriorationKo: string;
    volatilityExpansionKo: string;
  };
  macroAlphaScore: number;
  macroAlphaLabelKo: string;
  confidenceLabelKo: "HIGH" | "MEDIUM" | "LOW";
  confidenceDecayFactor: number;
  clusterRiskScore: number;
  eventDensity: number;
  macroStressLevelKo: string;
  dominantPressureKo: string;
  supportingEvidenceKo: string[];
  conflictingEvidenceKo: string[];
  tacticalInterpretationKo: string;
  narrativeSummaryKo: string;
  warningsKo: string[];
};

type Row = Record<string, unknown>;

function norm(value: string) {
  return value.toLowerCase().replace(/[\s_\-./()[\]{}%]+/g, "");
}

function parseNumber(value: unknown): number | null {
  if (value == null) return null;
  const text = String(value).trim().replace(/,/g, "").replace(/%$/, "");
  if (!text || /^(nan|null|n\/a|na|-|--|\.)$/i.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function findColumn(headers: string[], patterns: RegExp[]) {
  return headers.find((header) => patterns.some((rx) => rx.test(norm(header))));
}

function classifyCategory(eventName: string): EconomicEventCategory {
  const text = eventName.toLowerCase();
  if (/cpi|ppi|inflation|price|pce|물가|인플레이션/.test(text)) return "Inflation";
  if (/payroll|nfp|employment|jobless|unemployment|wage|고용|실업|임금/.test(text)) return "Employment";
  if (/fomc|fed|rate|central.?bank|ecb|boj|minutes|powell|금리|연준|중앙은행/.test(text)) return "Central Bank";
  if (/gdp|growth|industrial.?production|생산|성장/.test(text)) return "Growth";
  if (/pmi|ism|manufacturing|factory|제조|공장/.test(text)) return "Manufacturing";
  if (/retail|consumer|spending|confidence|소비|소매/.test(text)) return "Consumer";
  if (/liquidity|m2|credit|money|loan|유동성|신용|대출/.test(text)) return "Liquidity";
  if (/housing|home|building|mortgage|주택|부동산/.test(text)) return "Housing";
  if (/yield|treasury|bond|auction|국채|수익률|채권/.test(text)) return "Bond/Yield";
  if (/dollar|currency|fx|dxy|usd|환율|달러/.test(text)) return "Currency";
  if (/oil|energy|gas|crude|opec|유가|에너지|원유/.test(text)) return "Energy";
  if (/war|geopolitical|sanction|conflict|전쟁|지정학|제재/.test(text)) return "Geopolitical";
  return "Generic Macro Event";
}

function inferImportance(eventName: string, raw?: unknown): ImportanceLevel {
  const text = `${raw ?? ""} ${eventName}`.toLowerCase();
  if (/high|높|상|3|fomc|cpi|ppi|nfp|payroll|rate|gdp|pce|fed/.test(text)) return "HIGH";
  if (/medium|med|중|2|retail|pmi|ism|employment|consumer/.test(text)) return "MEDIUM";
  return "LOW";
}

function importanceWeight(level: ImportanceLevel) {
  return level === "HIGH" ? 1.5 : level === "MEDIUM" ? 1 : 0.6;
}

function sensitivity(category: EconomicEventCategory) {
  const map: Record<EconomicEventCategory, number> = {
    "Central Bank": 1.5,
    Inflation: 1.4,
    Employment: 1.2,
    Growth: 1.1,
    Manufacturing: 1,
    Consumer: 0.9,
    Housing: 0.8,
    "Bond/Yield": 1.25,
    Currency: 1.1,
    Liquidity: 1.25,
    Energy: 1,
    Geopolitical: 1.2,
    "Generic Macro Event": 0.6,
  };
  return map[category];
}

function categoryKo(category: EconomicEventCategory) {
  const map: Record<EconomicEventCategory, string> = {
    Inflation: "인플레이션",
    Employment: "고용",
    "Central Bank": "중앙은행",
    Growth: "성장",
    Manufacturing: "제조업/PMI",
    Consumer: "소비",
    Liquidity: "유동성",
    Housing: "주택",
    "Bond/Yield": "채권/금리",
    Currency: "통화/달러",
    Energy: "에너지",
    Geopolitical: "지정학",
    "Generic Macro Event": "일반 매크로",
  };
  return map[category];
}

function eventInterpretation(category: EconomicEventCategory, dir: SurpriseDirection, previousChange: number | null) {
  if (dir === "Pending") return { pressure: "대기 이벤트", effect: "데이터 발표 대기", riskOn: 0, riskOff: 0, liquidity: 0, text: "actual 값이 없어 아직 시장 압력은 확정되지 않았습니다." };
  if (dir === "Neutral") return { pressure: "중립 압력", effect: "예상 부합", riskOn: 0.2, riskOff: 0.2, liquidity: 0, text: "actual이 forecast와 크게 다르지 않아 시장 방향성 영향은 제한적입니다." };
  const positive = dir === "Positive Surprise";
  switch (category) {
    case "Inflation":
      return positive
        ? { pressure: "인플레이션 압력 상승", effect: "매파 금리 기대 / 위험자산 압박", riskOn: 0, riskOff: 1, liquidity: -0.6, text: "물가가 예상보다 강해 금리와 달러 압력을 높이고 성장주 및 위험자산에 부담을 줍니다." }
        : { pressure: "인플레이션 둔화", effect: "비둘기파 기대 / 위험선호 개선", riskOn: 1, riskOff: 0, liquidity: 0.6, text: "물가가 예상보다 낮아 긴축 부담을 낮추고 위험자산에 우호적입니다." };
    case "Employment":
      return positive
        ? { pressure: "고용 탄력", effect: "성장 지지와 매파 압력 공존", riskOn: 0.55, riskOff: 0.45, liquidity: -0.2, text: "고용이 예상보다 강해 경기 탄력은 지지하지만 금리 경계도 함께 높입니다." }
        : { pressure: "고용 약화", effect: "성장 둔화 / 위험회피", riskOn: 0, riskOff: 0.8, liquidity: 0.15, text: "고용이 예상보다 약해 성장 둔화와 위험회피 압력을 높입니다." };
    case "Central Bank":
    case "Bond/Yield":
      return positive
        ? { pressure: "매파 유동성 압력", effect: "금리/채권 수익률 상승 압력", riskOn: 0, riskOff: 1, liquidity: -0.8, text: "금리 관련 이벤트가 예상보다 강해 유동성 긴축과 위험자산 압박을 만듭니다." }
        : { pressure: "완화적 유동성 신호", effect: "금리 부담 완화", riskOn: 0.9, riskOff: 0, liquidity: 0.8, text: "중앙은행/금리 신호가 완화적으로 해석되어 유동성 기대를 개선합니다." };
    case "Growth":
    case "Manufacturing":
      return positive
        ? { pressure: "성장 회복 신호", effect: "경기민감 위험선호", riskOn: 0.85, riskOff: 0, liquidity: 0.1, text: "성장/PMI 지표가 예상보다 강해 경기 회복과 위험선호를 지지합니다." }
        : { pressure: "성장 둔화 압력", effect: "침체/수요 약화 경계", riskOn: 0, riskOff: 0.85, liquidity: 0.1, text: "성장/PMI 지표가 예상보다 약해 수요 둔화와 경기 리스크를 높입니다." };
    case "Consumer":
    case "Housing":
      return positive
        ? { pressure: "수요 탄력", effect: "경기 지지, 일부 물가 부담", riskOn: 0.65, riskOff: 0.25, liquidity: -0.1, text: "소비/주택 지표가 강해 경기 탄력은 지지하지만 금리 민감 부담을 일부 남깁니다." }
        : { pressure: "민감 수요 약화", effect: "소비/신용 사이클 둔화", riskOn: 0, riskOff: 0.7, liquidity: 0.05, text: "소비/주택 지표 약화는 민간 수요 둔화와 방어적 해석으로 이어집니다." };
    case "Currency":
      return positive
        ? { pressure: "달러 강세 압력", effect: "해외 유동성 압박", riskOn: 0, riskOff: 0.75, liquidity: -0.4, text: "달러 관련 신호가 강하면 글로벌 유동성과 위험자산에 부담입니다." }
        : { pressure: "달러 부담 완화", effect: "위험자산 지원", riskOn: 0.7, riskOff: 0, liquidity: 0.35, text: "달러 부담 완화는 해외 유동성과 위험자산에 보조적입니다." };
    default:
      return positive
        ? { pressure: "긍정 매크로 서프라이즈", effect: "선별적 위험선호", riskOn: 0.45, riskOff: 0.2, liquidity: 0, text: `이전 대비 변화 ${previousChange ?? 0}를 함께 보면 긍정 서프라이즈가 일부 시장 지지를 제공합니다.` }
        : { pressure: "부정 매크로 서프라이즈", effect: "선별적 위험회피", riskOn: 0, riskOff: 0.45, liquidity: 0, text: "부정 서프라이즈가 나타났지만 카테고리 신뢰도가 낮아 보수적으로 해석합니다." };
  }
}

function eventFamily(name: string, category: EconomicEventCategory) {
  const text = name.toLowerCase();
  if (/core.?cpi|core cpi/.test(text)) return "Core CPI";
  if (/cpi|consumer.?price/.test(text)) return "CPI";
  if (/ppi|producer.?price/.test(text)) return "PPI";
  if (/payroll|nfp/.test(text)) return "NFP";
  if (/unemployment/.test(text)) return "Unemployment";
  if (/wage|earnings/.test(text)) return "Wage Growth";
  if (/fomc|rate|fed/.test(text)) return "FOMC / Rate Decision";
  if (/pmi|ism/.test(text)) return "PMI / ISM";
  if (/gdp/.test(text)) return "GDP";
  if (/retail/.test(text)) return "Retail Sales";
  return categoryKo(category);
}

function computePriority(event: Omit<EconomicEventSignal, "eventPriorityScore" | "priorityTier" | "interpretationKo">, totalCount: number) {
  const recency = totalCount <= 1 ? 100 : (event.index / Math.max(1, totalCount - 1)) * 100;
  const conflictContribution = event.riskOffPressure > 0 && event.riskOnPressure > 0 ? 35 : event.riskOffPressure > 35 ? 25 : 10;
  return Math.round(clamp(
    event.surpriseScore * 0.28 +
    event.riskContribution * 0.32 +
    event.volatilityImpact * 0.18 +
    conflictContribution * 0.12 +
    recency * 0.10,
  ));
}

function priorityTier(score: number, rank: number, total: number): EconomicEventSignal["priorityTier"] {
  const dominantCut = Math.max(1, Math.ceil(total * 0.2));
  if (rank < dominantCut || score >= 72) return "DOMINANT";
  if (score >= 40) return "SECONDARY";
  return "COMPRESSED";
}

export function buildEconomicCalendarAnalysis(rowsInput: Row[]): EconomicCalendarAnalysis {
  const rows = rowsInput.filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
  const headers = Object.keys(rows[0] ?? {});
  const columns = {
    event: findColumn(headers, [/^event$|economicevent|indicator|release|macroevent|eventname|발표|이벤트|지표/]),
    forecast: findColumn(headers, [/forecast|consensus|estimate|expected|예상|컨센서스/]),
    actual: findColumn(headers, [/actual|reported|result|실제|발표값|결과/]),
    previous: findColumn(headers, [/previous|prior|last|이전|전월|직전/]),
    importance: findColumn(headers, [/importance|priority|impact|eventimportance|중요도|우선순위/]),
    date: findColumn(headers, [/^date$|datetime|timestamp|time|release|발표일|시간|날짜/]),
  };
  const warningsKo: string[] = [];
  if (!columns.event) warningsKo.push("event 컬럼이 없어 행 번호를 이벤트 이름으로 사용합니다.");
  if (!columns.forecast) warningsKo.push("forecast 컬럼이 없어 actual vs previous 중심으로 서프라이즈를 계산합니다.");
  if (!columns.actual) warningsKo.push("actual 컬럼이 없어 pending-event 모드가 활성화됩니다.");
  if (!columns.importance) warningsKo.push("importance 컬럼이 없어 이벤트 이름으로 중요도를 추론합니다.");

  const rawSignals = rows.map((row, index) => {
    const eventName = String(columns.event ? row[columns.event] ?? "" : `Macro Event ${index + 1}`).trim() || `Macro Event ${index + 1}`;
    const eventCategory = classifyCategory(eventName);
    const importanceLevel = inferImportance(eventName, columns.importance ? row[columns.importance] : undefined);
    const actualValue = parseNumber(columns.actual ? row[columns.actual] : undefined);
    const forecastValue = parseNumber(columns.forecast ? row[columns.forecast] : undefined);
    const previousValue = parseNumber(columns.previous ? row[columns.previous] : undefined);
    const reference = forecastValue ?? previousValue;
    const rawSurprise = actualValue == null || reference == null || Math.abs(reference) < 1e-9 ? 0 : (actualValue - reference) / Math.abs(reference);
    const surpriseStrength = actualValue == null ? 0 : clamp(Math.abs(rawSurprise) * 100, 0, 100);
    const surpriseDirection: SurpriseDirection = actualValue == null ? "Pending" : surpriseStrength < 3 ? "Neutral" : rawSurprise > 0 ? "Positive Surprise" : "Negative Surprise";
    const previousChange = actualValue != null && previousValue != null ? actualValue - previousValue : null;
    const recencyWeight = index >= rows.length - 1 ? 1.2 : index >= rows.length - Math.max(2, Math.ceil(rows.length * 0.3)) ? 1 : 0.7;
    const interp = eventInterpretation(eventCategory, surpriseDirection, previousChange);
    const weightedImpact = surpriseStrength * importanceWeight(importanceLevel) * sensitivity(eventCategory) * recencyWeight;
    const riskContribution = clamp(weightedImpact, 0, 100);
    const base = {
      index,
      eventName,
      eventCategory,
      importanceLevel,
      actualValue,
      forecastValue,
      previousValue,
      surpriseScore: Math.round(surpriseStrength),
      surpriseDirection,
      surpriseStrength,
      previousChange,
      marketPressure: interp.pressure,
      volatilityImpact: Math.round(clamp(riskContribution * 0.7 + (importanceLevel === "HIGH" ? 15 : 0), 0, 100)),
      regimeEffect: interp.effect,
      riskContribution: Math.round(riskContribution),
      riskOnPressure: interp.riskOn * riskContribution,
      riskOffPressure: interp.riskOff * riskContribution,
      liquiditySupport: interp.liquidity * riskContribution,
    };
    return {
      ...base,
      eventPriorityScore: computePriority(base, rows.length),
      priorityTier: "SECONDARY" as const,
      interpretationKo: `${categoryKo(eventCategory)} 이벤트 "${eventName}"는 ${surpriseDirection === "Positive Surprise" ? "예상 상회" : surpriseDirection === "Negative Surprise" ? "예상 하회" : surpriseDirection === "Pending" ? "발표 대기" : "예상 부합"}로 분류됩니다. ${interp.text}`,
    };
  });
  const rankedSignals = [...rawSignals].sort((a, b) => b.eventPriorityScore - a.eventPriorityScore);
  const priorityRank = new Map(rankedSignals.map((event, rank) => [event.index, rank]));
  const eventSignals = rawSignals.map((event) => ({
    ...event,
    priorityTier: priorityTier(event.eventPriorityScore, priorityRank.get(event.index) ?? 999, rawSignals.length),
  }));

  const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const byCat = (cats: EconomicEventCategory[]) => eventSignals.filter((event) => cats.includes(event.eventCategory));
  const inflationEvents = byCat(["Inflation"]);
  const growthEvents = byCat(["Growth", "Manufacturing", "Consumer", "Housing"]);
  const liquidityEvents = byCat(["Central Bank", "Liquidity", "Bond/Yield", "Currency"]);
  const employmentEvents = byCat(["Employment"]);
  const inflation = Math.round(avg(inflationEvents.map((event) => event.riskContribution)));
  const growthWeakness = Math.round(avg(growthEvents.map((event) => event.riskOffPressure)));
  const liquidityPressure = Math.round(clamp(50 - avg(liquidityEvents.map((event) => event.liquiditySupport)), 0, 100));
  const employmentPressure = Math.round(avg(employmentEvents.map((event) => event.riskContribution)));
  const volatility = Math.round(avg(eventSignals.map((event) => event.volatilityImpact)));
  const total = Math.round(avg([inflation, growthWeakness, liquidityPressure, employmentPressure, volatility].filter(Number.isFinite)));

  const conflicts: EconomicCalendarAnalysis["macroConflicts"] = [];
  const inflationHot = inflationEvents.filter((event) => event.surpriseDirection === "Positive Surprise");
  const growthWeak = growthEvents.filter((event) => event.surpriseDirection === "Negative Surprise");
  const employmentStrong = employmentEvents.filter((event) => event.surpriseDirection === "Positive Surprise");
  const centralDovish = liquidityEvents.filter((event) => event.eventCategory === "Central Bank" && event.surpriseDirection === "Negative Surprise");
  if (inflationHot.length && growthWeak.length) conflicts.push({ labelKo: "스태그플레이션형 충돌", severity: "HIGH", collisionScore: 90, eventsKo: [...inflationHot, ...growthWeak].slice(0, 4).map((event) => event.eventName), explanationKo: `${inflationHot[0].eventName}가 예상치를 상회했고 ${growthWeak[0].eventName}가 예상치를 하회해 인플레이션 압력과 성장 둔화가 동시에 발생했습니다.` });
  if (employmentStrong.length && inflationHot.length) conflicts.push({ labelKo: "매파적 성장 충돌", severity: "MEDIUM", collisionScore: 72, eventsKo: [employmentStrong[0].eventName, inflationHot[0].eventName], explanationKo: "고용 탄력과 인플레이션 압력이 동시에 나타나 중앙은행 긴축 경계가 높아집니다." });
  if (centralDovish.length && inflationHot.length) conflicts.push({ labelKo: "정책 신뢰도 충돌", severity: "MEDIUM", collisionScore: 68, eventsKo: [centralDovish[0].eventName, inflationHot[0].eventName], explanationKo: "완화적 중앙은행 신호와 높은 물가 서프라이즈가 충돌해 정책 신뢰도 리스크가 발생합니다." });

  const clusterMap = new Map<string, EconomicEventSignal[]>();
  eventSignals.forEach((event) => {
    const key = eventFamily(event.eventName, event.eventCategory);
    clusterMap.set(key, [...(clusterMap.get(key) ?? []), event]);
  });
  const eventClusters: EconomicEventCluster[] = Array.from(clusterMap.entries()).map(([clusterName, events]) => {
    const chronological = [...events].sort((a, b) => a.index - b.index);
    const first = chronological[0];
    const latest = chronological[chronological.length - 1];
    const avgSurprise = Math.round(avg(events.map((event) => event.surpriseScore)));
    const clusterPressure = Math.round(avg(events.map((event) => event.riskContribution)));
    const pressureAcceleration = Math.round((latest?.riskContribution ?? 0) - (first?.riskContribution ?? 0));
    const clusterConfidence = Math.round(clamp(50 + events.length * 6 + avgSurprise * 0.18 - Math.abs(pressureAcceleration) * 0.08, 0, 100));
    const pressureTrend: EconomicEventCluster["pressureTrend"] = pressureAcceleration > 5 ? "상승" : pressureAcceleration < -5 ? "하락" : "중립";
    return {
      clusterName,
      category: events[0].eventCategory,
      eventCount: events.length,
      avgSurprise,
      pressureTrend,
      latestDirection: latest?.surpriseDirection ?? "Neutral",
      pressureAcceleration,
      clusterConfidence,
      clusterPressure,
      events: [...events].sort((a, b) => b.eventPriorityScore - a.eventPriorityScore),
    };
  }).sort((a, b) => (b.clusterPressure * b.eventCount) - (a.clusterPressure * a.eventCount));

  const dominantEvents = [...eventSignals].sort((a, b) => b.eventPriorityScore - a.eventPriorityScore).slice(0, 3);
  const dominantDriversKo = dominantEvents.map((event, index) => `${index + 1}. ${eventFamily(event.eventName, event.eventCategory)}: ${event.marketPressure} · 우선순위 ${event.eventPriorityScore}점`);
  const densityDecay = eventSignals.length >= 12 ? 10 : eventSignals.length >= 6 ? 5 : 0;
  const conflictDecay = conflicts.reduce((sum, conflict) => sum + (conflict.severity === "EXTREME" ? 18 : conflict.severity === "HIGH" ? 12 : conflict.severity === "MEDIUM" ? 7 : 3), 0);
  const volatilityDecay = volatility >= 70 ? 12 : volatility >= 50 ? 7 : 0;
  const clusterDivergenceDecay = eventClusters.filter((cluster) => cluster.pressureTrend !== "중립").length >= 3 ? 6 : 0;
  const confidenceDecayFactor = Math.round(clamp(densityDecay + conflictDecay + volatilityDecay + clusterDivergenceDecay, 0, 45));

  const riskOn = avg(eventSignals.map((event) => event.riskOnPressure)) / 100;
  const riskOff = avg(eventSignals.map((event) => event.riskOffPressure)) / 100;
  const liquidity = avg(eventSignals.map((event) => event.liquiditySupport)) / 100;
  const conflictPenalty = conflicts.length / Math.max(1, eventSignals.length);
  const macroAlphaScore = Math.round(clamp(50 + riskOn * 20 - riskOff * 20 - (volatility / 100) * 15 - conflictPenalty * 10 + liquidity * 10, 0, 100));
  const macroAlphaLabelKo = macroAlphaScore >= 80 ? "Macro Risk-On" : macroAlphaScore >= 60 ? "완만한 Risk-On" : macroAlphaScore >= 40 ? "중립 / 혼합" : macroAlphaScore >= 20 ? "Macro Caution" : "Macro Risk-Off";

  const macroRegime =
    conflicts.length ? { labelKo: "Mixed / Conflict Regime", reasonKo: conflicts[0].explanationKo, riskBiasKo: "혼합/변동성 확대" } :
    inflation >= 60 ? { labelKo: "Inflation Pressure Regime", reasonKo: "인플레이션 이벤트의 예상 상회와 높은 중요도가 물가 압력을 주도합니다.", riskBiasKo: "Risk-Off / 금리 압력" } :
    growthWeakness >= 55 ? { labelKo: "Growth Slowdown Regime", reasonKo: "성장·PMI·소비 계열 이벤트가 예상보다 약해 성장 둔화 압력이 우세합니다.", riskBiasKo: "Risk-Off / 경기 방어" } :
    liquidityPressure >= 60 ? { labelKo: "Hawkish Liquidity Regime", reasonKo: "중앙은행·금리 이벤트가 유동성 긴축 방향으로 연결됩니다.", riskBiasKo: "유동성 압박" } :
    macroAlphaScore >= 60 ? { labelKo: "Risk-On Recovery Regime", reasonKo: "물가 부담이 낮고 성장/고용 붕괴 신호가 제한적입니다.", riskBiasKo: "Risk-On" } :
    { labelKo: "Mixed / Neutral Macro Regime", reasonKo: "이벤트 서프라이즈가 한 방향으로 강하게 정렬되지 않았습니다.", riskBiasKo: "중립" };

  const highImportanceCount = eventSignals.filter((event) => event.importanceLevel === "HIGH").length;
  const clusterRiskScore = Math.round(clamp((highImportanceCount / Math.max(1, eventSignals.length)) * 45 + volatility * 0.45 + conflicts.length * 12, 0, 100));
  const baseConfidence = clamp(45 + (columns.event ? 12 : 0) + (columns.actual ? 12 : 0) + ((columns.forecast || columns.previous) ? 12 : 0) + (columns.importance ? 8 : 0), 0, 100);
  const confidence = clamp(baseConfidence - confidenceDecayFactor, 0, 100);
  const confidenceLabelKo = confidence >= 70 ? "HIGH" : confidence >= 45 ? "MEDIUM" : "LOW";
  const splitIndex = Math.max(1, Math.floor(eventSignals.length * 0.55));
  const olderSignals = eventSignals.slice(0, splitIndex);
  const recentSignals = eventSignals.slice(splitIndex);
  const olderRiskOn = avg(olderSignals.map((event) => event.riskOnPressure));
  const olderRiskOff = avg(olderSignals.map((event) => event.riskOffPressure));
  const previousRegimeKo = olderRiskOn > olderRiskOff + 10 ? "Risk-On Recovery" : olderRiskOff > olderRiskOn + 10 ? "Macro Caution / Risk-Off" : "Mixed / Neutral";
  const transitionCatalysts = (recentSignals.length ? recentSignals : dominantEvents).sort((a, b) => b.eventPriorityScore - a.eventPriorityScore).slice(0, 3);
  const regimeTransition = {
    previousRegimeKo,
    currentRegimeKo: macroRegime.labelKo,
    catalystEventsKo: transitionCatalysts.map((event) => event.eventName),
    pressureRotationKo: `${olderRiskOn > olderRiskOff ? "위험선호" : olderRiskOff > olderRiskOn ? "방어 압력" : "중립 압력"} → ${macroRegime.riskBiasKo}`,
    confidenceDeteriorationKo: confidenceDecayFactor >= 18 ? `충돌/변동성으로 신뢰도 ${confidenceDecayFactor}점 훼손` : `신뢰도 훼손 제한(${confidenceDecayFactor}점)`,
    volatilityExpansionKo: volatility >= 60 ? "변동성 확장" : volatility >= 40 ? "변동성 중립" : "변동성 제한",
  };
  const dominant = [
    ["인플레이션", inflation],
    ["성장 둔화", growthWeakness],
    ["유동성", liquidityPressure],
    ["고용", employmentPressure],
    ["변동성", volatility],
  ].sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const supportingEvidenceKo = eventSignals.sort((a, b) => b.riskContribution - a.riskContribution).slice(0, 3).map((event) => `${event.eventName}: ${event.marketPressure}, 위험 기여 ${event.riskContribution}점`);
  const conflictingEvidenceKo = conflicts.map((conflict) => conflict.explanationKo);
  const narrativeSummaryKo = `${macroRegime.labelKo}로 분류됩니다. 지배 압력은 ${dominant[0]}(${dominant[1]}점)이며, Macro Alpha Score는 ${macroAlphaScore}점입니다. ${supportingEvidenceKo[0] ?? "핵심 이벤트 증거는 제한적입니다."} ${conflicts[0]?.explanationKo ?? "주요 이벤트 충돌은 제한적입니다."}`;

  return {
    detected: eventSignals.length > 0,
    confidence,
    columns,
    eventSignals,
    pressureScores: { inflation, growth: growthWeakness, liquidity: liquidityPressure, employment: employmentPressure, volatility, total },
    macroRegime,
    macroConflicts: conflicts,
    eventClusters,
    dominantDriversKo,
    regimeTransition,
    macroAlphaScore,
    macroAlphaLabelKo,
    confidenceLabelKo,
    confidenceDecayFactor,
    clusterRiskScore,
    eventDensity: eventSignals.length,
    macroStressLevelKo: clusterRiskScore >= 70 ? "높은 매크로 이벤트 스트레스" : clusterRiskScore >= 45 ? "중간 매크로 이벤트 스트레스" : "낮은 매크로 이벤트 스트레스",
    dominantPressureKo: `${dominant[0]} 압력`,
    supportingEvidenceKo,
    conflictingEvidenceKo,
    tacticalInterpretationKo: macroAlphaScore >= 60 ? "매크로 이벤트 흐름은 위험자산에 우호적이나 고중요도 이벤트 변동성은 계속 확인해야 합니다." : macroAlphaScore >= 40 ? "매크로 이벤트 신호가 혼재되어 방향성 확정보다 서프라이즈 후속 반응 확인이 우선입니다." : "매크로 이벤트가 위험회피와 변동성 확대 쪽으로 기울어 방어적 해석이 필요합니다.",
    narrativeSummaryKo,
    warningsKo,
  };
}
