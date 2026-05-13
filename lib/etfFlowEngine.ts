export type EtfFlowRegime =
  | "Bullish Liquidity"
  | "Neutral Liquidity"
  | "Bearish Liquidity"
  | "Risk-On Expansion"
  | "Defensive Rotation"
  | "Liquidity Stress"
  | "Generic ETF Flow Environment";

export type EtfFlowClassification =
  | "Strong Inflow"
  | "Moderate Inflow"
  | "Neutral Flow"
  | "Moderate Outflow"
  | "Strong Outflow";

export type EtfFlowPoint = {
  index: number;
  date: string;
  etfName: string;
  inflow: number | null;
  outflow: number | null;
  netflow: number;
  aum: number | null;
  sectorRotation: string;
  premiumDiscount: number | null;
  creationRedemption: number | null;
  smartMoneyFlow: number | null;
  institutionalEtfFlow: number | null;
  riskOnProbability: number | null;
  defensiveProbability: number | null;
  liquidityScore: number | null;
  flowPersistenceMetric: number | null;
  rotationStrength: number | null;
};

export type EtfFlowConflict = {
  conflictType: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  liquidityWarningKo: string;
  confidencePenalty: number;
};

export type EtfFlowAnalysis = {
  detected: boolean;
  confidence: number;
  confidenceLabelKo: "HIGH" | "MEDIUM" | "LOW";
  columns: Partial<Record<"date" | "etf" | "inflow" | "outflow" | "netflow" | "aum" | "sectorRotation" | "premiumDiscount" | "creationRedemption" | "price" | "smartMoneyFlow" | "institutionalEtfFlow" | "riskOnProbability" | "defensiveProbability" | "liquidityScore" | "flowPersistence" | "rotationStrength", string>>;
  points: EtfFlowPoint[];
  classification: EtfFlowClassification;
  liquidityRegime: EtfFlowRegime;
  regimeStrength: number;
  regimeConfidence: number;
  regimePressure: number;
  etfPressureScore: number;
  etfPressureLabelKo: string;
  features: {
    netflowStrength: number;
    inflowStrength: number;
    outflowPressure: number;
    aumMomentum: number | null;
    aumExpansionStrength: number;
    aumMomentumStateKo: string;
    sectorRotationScore: number;
    flowPersistence: number;
    smartMoneySignal: number;
    liquidityPressure: number;
  };
  rotation: {
    riskOnProbability: number;
    defensiveProbability: number;
    liquidityShiftDirectionKo: string;
    dominantSectorsKo: string[];
  };
  dominance: {
    dominantLiquidityDirectionKo: string;
    dominantSectorClusterKo: string;
    capitalConcentrationScore: number;
    institutionalFlowBiasKo: string;
    propagationChainKo: string[];
  };
  smartMoney: {
    stateKo: string;
    institutionalPressure: number;
    liquidityConfidence: number;
    accumulationProbability: number;
    interpretationKo: string;
  };
  conflicts: EtfFlowConflict[];
  dashboardPlanKo: string[];
  visualizationMappingKo: string[];
  aiSummaryKo: string;
  tacticalConclusionKo: string;
  warningsKo: string[];
};

type Row = Record<string, unknown>;

function norm(value: string) {
  return value.toLowerCase().replace(/[\s_\-./()[\]{}%]+/g, "");
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function parseNumber(value: unknown): number | null {
  if (value == null) return null;
  const text = String(value).trim().replace(/,/g, "").replace(/%$/, "");
  if (!text || /^(nan|null|n\/a|na|-|--|\.)$/i.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function normalizeScore(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  if (Math.abs(value) <= 1.5) return clamp(value * 100, 0, 100);
  return clamp(value, 0, 100);
}

function findColumn(headers: string[], patterns: RegExp[]) {
  return headers.find((header) => patterns.some((rx) => rx.test(norm(header))));
}

function average(values: number[]) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0;
}

function pctChange(current: number | null, previous: number | null) {
  if (current == null || previous == null || Math.abs(previous) < 1e-9) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function riskOnSector(text: string) {
  return /ai|tech|semiconductor|software|internet|growth|innovation|nasdaq|테크|기술|반도체|성장|소프트웨어|인터넷/i.test(text);
}

function defensiveSector(text: string) {
  return /utilities|bond|gold|defensive|consumerstaples|staples|healthcare|treasury|배당|유틸|채권|금|방어|필수소비|헬스케어/i.test(text);
}

function classifyFlow(score: number): EtfFlowClassification {
  if (score >= 80) return "Strong Inflow";
  if (score >= 60) return "Moderate Inflow";
  if (score >= 40) return "Neutral Flow";
  if (score >= 20) return "Moderate Outflow";
  return "Strong Outflow";
}

function pressureLabel(score: number) {
  if (score >= 80) return "강한 유동성 확장";
  if (score >= 60) return "긍정적 ETF 플로우";
  if (score >= 40) return "중립 유동성";
  if (score >= 20) return "유동성 약화";
  return "강한 유출 압력";
}

function confidenceLabel(score: number): EtfFlowAnalysis["confidenceLabelKo"] {
  return score >= 70 ? "HIGH" : score >= 45 ? "MEDIUM" : "LOW";
}

function aumMomentumState(strength: number, rawMomentum: number | null) {
  if (rawMomentum == null) return "AUM 데이터 제한";
  if (strength >= 78) return "강한 AUM 확장";
  if (strength >= 62) return "AUM 확장 우위";
  if (strength >= 45) return "AUM 중립";
  if (strength >= 30) return "AUM 둔화";
  return "AUM 축소 압력";
}

export function buildEtfFlowAnalysis(rowsInput: Row[]): EtfFlowAnalysis {
  const rows = rowsInput.filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
  const headers = Object.keys(rows[0] ?? {});
  const columns = {
    date: findColumn(headers, [/^date$|datetime|timestamp|time|일자|날짜/]),
    etf: findColumn(headers, [/^etf$|fund|ticker|symbol|asset|name|종목|펀드/]),
    inflow: findColumn(headers, [/etfinflow|^inflow$|fundinflow|moneyin|cashinflow|creation|자금유입|유입/]),
    outflow: findColumn(headers, [/etfoutflow|^outflow$|fundoutflow|moneyout|cashoutflow|redemption|자금유출|유출/]),
    netflow: findColumn(headers, [/netflow|netflow|fundflow|moneyflow|capitalflow|순유입|순자금|자금흐름/]),
    aum: findColumn(headers, [/^aum$|assetsundermanagement|totalaum|netassets|순자산|운용자산/]),
    sectorRotation: findColumn(headers, [/sectorrotation|rotation|sectorflow|thematicrotation|sector|theme|category|섹터|테마|회전/]),
    premiumDiscount: findColumn(headers, [/premiumdiscount|navpremium|discountpremium|premium|discount|괴리율|프리미엄|디스카운트/]),
    creationRedemption: findColumn(headers, [/creationredemption|creation|redemption|설정|환매/]),
    price: findColumn(headers, [/^close$|price|return|marketmove|etfprice|종가|가격|수익률/]),
    smartMoneyFlow: findColumn(headers, [/smartmoneyflow|smartmoney|스마트머니/]),
    institutionalEtfFlow: findColumn(headers, [/institutionaletfflow|institutionalflow|기관.*etf|기관/]),
    riskOnProbability: findColumn(headers, [/riskonprobability|riskon|위험선호/]),
    defensiveProbability: findColumn(headers, [/defensiveprobability|defensive|riskoff|방어/]),
    liquidityScore: findColumn(headers, [/liquidityscore|liquidity|유동성/]),
    flowPersistence: findColumn(headers, [/flowpersistence|persistence|지속/]),
    rotationStrength: findColumn(headers, [/rotationstrength|rotation.*strength|회전.*강도/]),
  };
  const warningsKo: string[] = [];
  if (!columns.netflow && !(columns.inflow && columns.outflow)) warningsKo.push("순유입 컬럼이 없어 유입/유출 또는 정성 정보 기반으로 유동성을 추정합니다.");
  if (!columns.aum) warningsKo.push("AUM 컬럼이 없어 운용자산 모멘텀은 비활성화됩니다.");
  if (!columns.sectorRotation) warningsKo.push("섹터 회전 컬럼이 없어 로테이션 분석은 일반 유동성 해석으로 대체됩니다.");

  const points: EtfFlowPoint[] = rows.map((row, index) => {
    const inflow = parseNumber(columns.inflow ? row[columns.inflow] : undefined);
    const outflow = parseNumber(columns.outflow ? row[columns.outflow] : undefined);
    const explicitNetflow = parseNumber(columns.netflow ? row[columns.netflow] : undefined);
    const netflow = explicitNetflow ?? ((inflow ?? 0) - (outflow ?? 0));
    return {
      index,
      date: String(columns.date ? row[columns.date] ?? "" : `T-${rows.length - index}`).trim() || `T-${rows.length - index}`,
      etfName: String(columns.etf ? row[columns.etf] ?? "ETF" : "ETF").trim() || "ETF",
      inflow,
      outflow,
      netflow,
      aum: parseNumber(columns.aum ? row[columns.aum] : undefined),
      sectorRotation: String(columns.sectorRotation ? row[columns.sectorRotation] ?? "" : "").trim(),
      premiumDiscount: parseNumber(columns.premiumDiscount ? row[columns.premiumDiscount] : undefined),
      creationRedemption: parseNumber(columns.creationRedemption ? row[columns.creationRedemption] : undefined),
      smartMoneyFlow: normalizeScore(parseNumber(columns.smartMoneyFlow ? row[columns.smartMoneyFlow] : undefined)),
      institutionalEtfFlow: normalizeScore(parseNumber(columns.institutionalEtfFlow ? row[columns.institutionalEtfFlow] : undefined)),
      riskOnProbability: normalizeScore(parseNumber(columns.riskOnProbability ? row[columns.riskOnProbability] : undefined)),
      defensiveProbability: normalizeScore(parseNumber(columns.defensiveProbability ? row[columns.defensiveProbability] : undefined)),
      liquidityScore: normalizeScore(parseNumber(columns.liquidityScore ? row[columns.liquidityScore] : undefined)),
      flowPersistenceMetric: normalizeScore(parseNumber(columns.flowPersistence ? row[columns.flowPersistence] : undefined)),
      rotationStrength: normalizeScore(parseNumber(columns.rotationStrength ? row[columns.rotationStrength] : undefined)),
    };
  });

  const window = Math.max(3, Math.min(20, Math.floor(points.length / 2) || 3));
  const recent = points.slice(-window);
  const latest = points[points.length - 1];
  const meanAbsNetflow = average(points.slice(-Math.max(window, 1)).map((point) => Math.abs(point.netflow))) || 1;
  const latestNetflow = latest?.netflow ?? 0;
  const normalizedNetflow = latestNetflow / meanAbsNetflow;
  const recentPositiveFlow = recent.reduce((sum, point) => sum + Math.max(point.netflow, point.inflow ?? 0, 0), 0);
  const recentNegativeFlow = recent.reduce((sum, point) => sum + Math.max(-point.netflow, point.outflow ?? 0, 0), 0);
  const grossRecentFlow = Math.max(1, recentPositiveFlow + recentNegativeFlow);
  const positiveFlowShare = (recentPositiveFlow / grossRecentFlow) * 100;
  const negativeFlowShare = (recentNegativeFlow / grossRecentFlow) * 100;
  const averageNetflow = average(recent.map((point) => point.netflow));
  const netflowStrength = Math.round(clamp(50 + (averageNetflow / meanAbsNetflow) * 28 + (positiveFlowShare - 50) * 0.45, 0, 100));
  const inflowStrength = Math.round(clamp(positiveFlowShare * 0.7 + Math.max(0, averageNetflow / meanAbsNetflow) * 20, 0, 100));
  const outflowPressure = Math.round(clamp(negativeFlowShare * 0.75 + Math.max(0, -averageNetflow / meanAbsNetflow) * 20, 0, 100));
  let flowPersistence = 0;
  const latestSign = latestNetflow > 0 ? 1 : latestNetflow < 0 ? -1 : 0;
  for (let i = points.length - 1; i >= 0; i--) {
    const sign = points[i].netflow > 0 ? 1 : points[i].netflow < 0 ? -1 : 0;
    if (!latestSign || sign !== latestSign) break;
    flowPersistence += 1;
  }
  const aumValues = points.map((point) => point.aum).filter((value): value is number => value != null);
  const aumMomentum = aumValues.length >= 2 ? pctChange(aumValues[aumValues.length - 1], aumValues[Math.max(0, aumValues.length - 1 - window)]) : null;
  const rotationTexts = points.map((point) => point.sectorRotation).filter(Boolean);
  const riskOnFlow = recent.reduce((sum, point) => sum + (riskOnSector(`${point.sectorRotation} ${point.etfName}`) ? Math.max(point.netflow, point.inflow ?? 0, 0) : 0), 0);
  const defensiveFlow = recent.reduce((sum, point) => sum + (defensiveSector(`${point.sectorRotation} ${point.etfName}`) ? Math.max(point.netflow, point.inflow ?? 0, 0) : 0), 0);
  const explicitRiskOn = average(recent.map((point) => point.riskOnProbability ?? NaN).filter(Number.isFinite));
  const explicitDefensive = average(recent.map((point) => point.defensiveProbability ?? NaN).filter(Number.isFinite));
  const flowWeightedRiskOn = (riskOnFlow / Math.max(1, recentPositiveFlow)) * 100;
  const flowWeightedDefensive = (defensiveFlow / Math.max(1, recentPositiveFlow)) * 100;
  const riskOnProbability = Math.round(clamp(Math.max(Number.isFinite(explicitRiskOn) ? explicitRiskOn : 0, flowWeightedRiskOn), 0, 100));
  const defensiveProbability = Math.round(clamp(Math.max(Number.isFinite(explicitDefensive) ? explicitDefensive : 0, flowWeightedDefensive), 0, 100));
  const explicitRotationStrength = average(recent.map((point) => point.rotationStrength ?? NaN).filter(Number.isFinite));
  const sectorRotationScore = Math.round(clamp(
    Number.isFinite(explicitRotationStrength) && explicitRotationStrength > 0
      ? explicitRotationStrength
      : columns.sectorRotation || columns.riskOnProbability || columns.defensiveProbability
        ? 45 + riskOnProbability * 0.55 - defensiveProbability * 0.25 + (positiveFlowShare - 50) * 0.20
        : 50,
    0,
    100,
  ));
  const positivePersistenceBonus = latestSign > 0 ? Math.min(15, flowPersistence * 3) : -Math.min(15, flowPersistence * 3);
  const aumComponent = aumMomentum == null ? 0 : clamp(aumMomentum, -25, 25) * 0.8;
  const explicitSmartMoney = average(recent.map((point) => point.smartMoneyFlow ?? NaN).filter(Number.isFinite));
  const explicitInstitutional = average(recent.map((point) => point.institutionalEtfFlow ?? NaN).filter(Number.isFinite));
  const explicitLiquidity = average(recent.map((point) => point.liquidityScore ?? NaN).filter(Number.isFinite));
  const explicitPersistence = average(recent.map((point) => point.flowPersistenceMetric ?? NaN).filter(Number.isFinite));
  const flowPersistenceScore = Math.round(clamp(Number.isFinite(explicitPersistence) && explicitPersistence > 0 ? explicitPersistence : flowPersistence * 12, 0, 100));
  const aumMomentumScore = Math.round(clamp(aumMomentum == null ? 50 : 50 + Math.tanh(aumMomentum / 40) * 42, 0, 100));
  const aumMomentumStateKo = aumMomentumState(aumMomentumScore, aumMomentum);
  const institutionalBase = Number.isFinite(explicitInstitutional) && explicitInstitutional > 0 ? explicitInstitutional : 50 + (netflowStrength - 50) * 0.35;
  const smartBase = Number.isFinite(explicitSmartMoney) && explicitSmartMoney > 0 ? explicitSmartMoney : 50 + (netflowStrength - 50) * 0.35 + aumComponent + (sectorRotationScore - 50) * 0.22 + positivePersistenceBonus;
  const smartMoneySignal = Math.round(clamp(
    smartBase * 0.42 +
    institutionalBase * 0.33 +
    flowPersistenceScore * 0.12 +
    aumMomentumScore * 0.08 +
    sectorRotationScore * 0.05,
    0,
    100,
  ));
  const liquidityPressure = Math.round(clamp(Number.isFinite(explicitLiquidity) && explicitLiquidity > 0 ? explicitLiquidity : 50 + (netflowStrength - 50) * 0.55 - outflowPressure * 0.18 + (aumMomentum ?? 0) * 0.4 + (sectorRotationScore - 50) * 0.25, 0, 100));
  const dominantFlowStrength = Math.round(clamp(netflowStrength * 0.45 + positiveFlowShare * 0.35 + inflowStrength * 0.20, 0, 100));
  const smartMoneyStrength = smartMoneySignal;
  const aumExpansionStrength = aumMomentumScore;
  const riskOnRotationStrength = Math.round(clamp(sectorRotationScore * 0.55 + riskOnProbability * 0.45, 0, 100));
  const broadOutflowPenalty = negativeFlowShare > 55 && (aumMomentum ?? 0) < 0 ? Math.min(22, (negativeFlowShare - 55) * 0.45 + Math.abs(aumMomentum ?? 0) * 0.8) : 0;
  const etfPressureScore = Math.round(clamp(
    dominantFlowStrength * 0.30 +
    smartMoneyStrength * 0.25 +
    aumExpansionStrength * 0.20 +
    riskOnRotationStrength * 0.15 +
    flowPersistenceScore * 0.10 -
    broadOutflowPenalty,
    0,
    100,
  ));
  const classification = classifyFlow(etfPressureScore);
  const liquidityRegime: EtfFlowRegime =
    etfPressureScore >= 68 && riskOnProbability >= defensiveProbability + 10 ? "Risk-On Expansion" :
    etfPressureScore >= 62 ? "Bullish Liquidity" :
    etfPressureScore <= 25 ? "Liquidity Stress" :
    etfPressureScore <= 38 ? "Bearish Liquidity" :
    defensiveProbability >= riskOnProbability + 20 && etfPressureScore < 62 ? "Defensive Rotation" :
    etfPressureScore >= 40 ? "Neutral Liquidity" :
    "Generic ETF Flow Environment";

  const conflicts: EtfFlowConflict[] = [];
  const priceValues = columns.price ? rows.map((row) => parseNumber(row[columns.price!])).filter((value): value is number => value != null) : [];
  const priceMomentum = priceValues.length >= 2 ? pctChange(priceValues[priceValues.length - 1], priceValues[Math.max(0, priceValues.length - 1 - window)]) : null;
  if (priceMomentum != null && priceMomentum > 0 && netflowStrength < 40) conflicts.push({ conflictType: "가격 상승 / ETF 유출", severity: "MEDIUM", confidencePenalty: 10, liquidityWarningKo: "가격은 상승하지만 ETF 순유입이 약해 랠리의 기관 유동성 확인이 부족합니다." });
  if (etfPressureScore >= 60 && aumMomentum != null && aumMomentum < -2) conflicts.push({ conflictType: "긍정 플로우 / AUM 감소", severity: "MEDIUM", confidencePenalty: 8, liquidityWarningKo: "순유입 신호는 양호하지만 AUM이 감소해 가격 또는 환매 압력이 일부 상쇄하고 있습니다." });
  if (defensiveProbability >= 60 && etfPressureScore >= 55) conflicts.push({ conflictType: "유입 지속 / 방어 섹터 회전", severity: "LOW", confidencePenalty: 5, liquidityWarningKo: "자금은 들어오지만 방어 섹터로 향해 위험선호 확장보다는 방어적 로테이션 성격이 강합니다." });
  const latestPremium = latest?.premiumDiscount ?? null;
  const premiumStress = average(points.map((point) => Math.abs(point.premiumDiscount ?? 0)));
  if (latestPremium != null && latestPremium > 2) conflicts.push({ conflictType: "ETF 프리미엄 과열", severity: latestPremium > 5 ? "HIGH" : "MEDIUM", confidencePenalty: latestPremium > 5 ? 14 : 8, liquidityWarningKo: "프리미엄이 2%를 넘어 ETF 수요 과열 또는 추격 매수 압력이 감지됩니다." });
  if (latestPremium != null && latestPremium < -2) conflicts.push({ conflictType: "ETF 디스카운트 유동성 스트레스", severity: latestPremium < -5 ? "HIGH" : "MEDIUM", confidencePenalty: latestPremium < -5 ? 14 : 8, liquidityWarningKo: "디스카운트가 -2% 아래로 확대되어 ETF 유동성 스트레스 또는 환매 압력이 감지됩니다." });
  if (premiumStress >= 3 && latestPremium == null) conflicts.push({ conflictType: "ETF 프리미엄/디스카운트 스트레스", severity: premiumStress >= 6 ? "HIGH" : "MEDIUM", confidencePenalty: premiumStress >= 6 ? 14 : 8, liquidityWarningKo: "NAV 괴리가 확대되어 ETF 유동성 또는 시장 조성 압력이 커졌습니다." });
  const conflictPenalty = conflicts.reduce((sum, conflict) => sum + conflict.confidencePenalty, 0);
  const dataDepth = (columns.netflow || columns.inflow || columns.outflow ? 24 : 0) + (columns.aum ? 18 : 0) + (columns.sectorRotation ? 16 : 0) + (columns.premiumDiscount ? 8 : 0) + Math.min(24, points.length * 2);
  const confidence = Math.round(clamp(34 + dataDepth - conflictPenalty, 0, 100));
  const regimeConfidence = Math.round(clamp(confidence - conflicts.length * 4 + Math.abs(etfPressureScore - 50) * 0.2, 0, 100));
  const regimeStrength = Math.round(clamp(Math.abs(etfPressureScore - 50) * 2, 0, 100));
  const regimePressure = Math.round(clamp((etfPressureScore + liquidityPressure + smartMoneySignal) / 3, 0, 100));
  const dominantSectorsKo = Array.from(new Set(rotationTexts.map((text) => {
    if (riskOnSector(text)) return "성장/테크";
    if (defensiveSector(text)) return "방어/채권";
    return text || "일반 ETF";
  }))).slice(0, 4);
  const accumulationProbability = Math.round(clamp(smartMoneySignal * 0.55 + Math.max(0, normalizedNetflow) * 18 + (aumMomentum == null ? 0 : Math.max(0, aumMomentum)) * 1.2, 0, 100));
  const smartMoneyStateKo =
    accumulationProbability >= 70 ? "스마트머니 축적 우위" :
    smartMoneySignal <= 30 ? "기관 이탈 압력" :
    defensiveProbability > riskOnProbability + 20 ? "방어적 기관 회전" :
    "중립적 기관 포지셔닝";
  const riskLevelKo = conflicts.some((conflict) => conflict.severity === "HIGH") || etfPressureScore < 30 ? "높음" : conflicts.length || etfPressureScore < 45 ? "보통" : "낮음";
  const aiSummaryKo = `${pressureLabel(etfPressureScore)} 국면입니다. 최근 순유입 강도는 ${netflowStrength}점, 유출 압력은 ${outflowPressure}점이며 AUM 모멘텀은 ${aumMomentum == null ? "계산 불가" : `${aumMomentum.toFixed(1)}%`}입니다. ${riskOnProbability >= defensiveProbability ? "성장/위험선호 섹터 회전이 상대적으로 우세" : "방어 섹터 회전이 상대적으로 우세"}해 현재 ETF 플로우는 ${liquidityRegime}로 해석됩니다.`;
  const tacticalConclusionKo = etfPressureScore >= 60
    ? "ETF 유동성은 시장 하방을 완충하는 방향입니다. 다만 방어 섹터 회전이나 AUM 감소 충돌이 있으면 공격적 위험선호보다 선별적 유입으로 해석해야 합니다."
    : etfPressureScore >= 40
      ? "ETF 플로우는 중립권입니다. 순유입 지속성과 AUM 확인이 동반될 때 레짐 확신이 높아집니다."
      : "ETF 유동성은 약화되고 있습니다. 유출 지속과 방어 회전이 함께 나타나면 기관 이탈 또는 리스크 오프 압력이 커질 수 있습니다.";

  const dominantSectorClusterKo =
    riskOnProbability >= defensiveProbability + 15 ? "AI/테크/성장 중심 섹터 클러스터" :
    defensiveProbability >= riskOnProbability + 15 ? "채권/금/방어 중심 섹터 클러스터" :
    "혼합 ETF 섹터 클러스터";
  const dominantLiquidityDirectionKo =
    etfPressureScore >= 68 && riskOnProbability >= defensiveProbability ? "위험선호 유동성 확장" :
    etfPressureScore >= 58 ? "선별적 ETF 유동성 유입" :
    defensiveProbability > riskOnProbability + 15 ? "방어적 유동성 회전" :
    etfPressureScore < 38 ? "ETF 유동성 위축" :
    "중립 유동성 균형";
  const capitalConcentrationScore = Math.round(clamp(Math.max(riskOnProbability, defensiveProbability) * 0.65 + positiveFlowShare * 0.35, 0, 100));
  const institutionalFlowBiasKo =
    smartMoneySignal >= 68 && riskOnProbability >= defensiveProbability ? "기관성 성장 축적" :
    smartMoneySignal >= 58 && defensiveProbability > riskOnProbability ? "기관성 방어 헤지" :
    smartMoneySignal <= 35 ? "기관 이탈/관망 압력" :
    "중립적 기관 포지셔닝";
  const finalSmartMoneyStateKo =
    smartMoneySignal >= 68 && etfPressureScore >= 58 ? "기관성 축적 우위" :
    smartMoneySignal >= 58 && defensiveProbability > riskOnProbability + 15 ? "방어적 기관 헤지" :
    smartMoneySignal <= 35 && negativeFlowShare > 55 ? "기관 이탈 압력" :
    "중립적 기관 포지셔닝";
  const propagationChainKo = [
    averageNetflow >= 0 ? "ETF 순유입 우위" : "ETF 순유출 우위",
    etfPressureScore >= 58 ? "시장 유동성 확장" : "유동성 확인 필요",
    riskOnProbability >= defensiveProbability ? "성장 섹터 집중" : "방어 섹터 회전",
    smartMoneySignal >= 58 ? "기관 참여 확인" : "기관 참여 제한",
    etfPressureScore >= 62 ? "강세 유동성 레짐" : etfPressureScore < 40 ? "약세 유동성 레짐" : "중립 유동성 레짐",
  ];
  const finalAiSummaryKo = `ETF 자금 흐름은 ${dominantLiquidityDirectionKo}로 해석됩니다. 순유입 강도 ${netflowStrength}점과 AUM 모멘텀 ${aumMomentum == null ? "계산 불가" : `${aumMomentum.toFixed(1)}%`}가 결합되어 ${pressureLabel(etfPressureScore)}을 형성하고 있습니다. 자금의 중심은 ${dominantSectorClusterKo}에 있으며, 스마트머니/기관 플로우 점수 ${smartMoneySignal}점은 ${institutionalFlowBiasKo} 신호를 지지합니다. 방어적 ETF 흐름은 일부 존재하지만, AUM 수축과 광범위한 순유출이 동시에 확인되지 않는 한 전체 레짐을 무너뜨리는 신호로 보지 않습니다.`;
  const finalTacticalConclusionKo = etfPressureScore >= 60
    ? "ETF 유동성은 시장 하방을 완충하고 성장 섹터 리레이팅을 지지하는 방향입니다. 다만 방어 섹터 유입과 프리미엄 과열은 선별적 헤지 또는 단기 과열 신호로 함께 감시해야 합니다."
    : etfPressureScore >= 40
      ? "ETF 플로우는 확인 대기 구간입니다. 순유입 지속성과 AUM 확장이 추가로 확인되면 강세 유동성 레짐으로 전환될 수 있습니다."
      : "ETF 유동성은 위축되고 있습니다. 광범위한 순유출과 AUM 감소가 이어지면 기관 이탈 또는 리스크오프 압력이 강화될 수 있습니다.";

  return {
    detected: points.length > 0 && Boolean(columns.netflow || columns.inflow || columns.outflow || columns.aum || columns.sectorRotation),
    confidence,
    confidenceLabelKo: confidenceLabel(confidence),
    columns,
    points,
    classification,
    liquidityRegime,
    regimeStrength,
    regimeConfidence,
    regimePressure,
    etfPressureScore,
    etfPressureLabelKo: pressureLabel(etfPressureScore),
    features: { netflowStrength, inflowStrength, outflowPressure, aumMomentum, aumExpansionStrength: aumMomentumScore, aumMomentumStateKo, sectorRotationScore, flowPersistence, smartMoneySignal, liquidityPressure },
    rotation: {
      riskOnProbability,
      defensiveProbability,
      liquidityShiftDirectionKo: riskOnProbability > defensiveProbability + 15 ? "성장/위험선호 방향" : defensiveProbability > riskOnProbability + 15 ? "방어/리스크오프 방향" : "혼합 로테이션",
      dominantSectorsKo,
    },
    dominance: {
      dominantLiquidityDirectionKo,
      dominantSectorClusterKo,
      capitalConcentrationScore,
      institutionalFlowBiasKo,
      propagationChainKo,
    },
    smartMoney: {
      stateKo: finalSmartMoneyStateKo,
      institutionalPressure: Math.round((smartMoneySignal + netflowStrength) / 2),
      liquidityConfidence: regimeConfidence,
      accumulationProbability,
      interpretationKo: `${smartMoneyStateKo}입니다. 순유입 지속 기간은 ${flowPersistence}개 구간이며, ETF 압력 점수와 AUM 흐름을 함께 보면 ${accumulationProbability >= 60 ? "기관성 축적 가능성이 높습니다." : accumulationProbability <= 35 ? "기관성 축적보다 이탈 또는 관망 가능성이 큽니다." : "축적과 이탈 신호가 혼재되어 있습니다."}`,
    },
    conflicts,
    dashboardPlanKo: ["ETF Flow Overview: 순유입, AUM, 로테이션을 한 화면에서 요약", "ETF Feature Analysis: 플로우 강도와 지속성을 분해", "Risk / Pressure Analysis: 유출, 괴리율, 방어 회전 충돌을 점검", "AI ETF Summary: 유동성 레짐과 전술 결론 생성"],
    visualizationMappingKo: [
      columns.netflow || columns.inflow || columns.outflow ? "순유입 타임라인 활성화" : "순유입 차트 비활성화",
      columns.aum ? "AUM 모멘텀 차트 활성화" : "AUM 모멘텀 카드만 제한 표시",
      columns.sectorRotation ? "섹터 로테이션 맵 활성화" : "섹터 로테이션 정성 해석 비활성화",
      conflicts.length ? "유동성 경고 패널 활성화" : "충돌 패널은 낮은 압력 상태로 표시",
    ],
    aiSummaryKo: finalAiSummaryKo,
    tacticalConclusionKo: finalTacticalConclusionKo,
    warningsKo,
  };
}
