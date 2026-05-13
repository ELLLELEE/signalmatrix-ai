import type { Row } from "@/lib/dataPipeline";

export type OnchainLayerKey = "network" | "exchange" | "whale" | "miner" | "derivatives" | "liquidity" | "valuation" | "sentiment";
export type OnchainMapping = {
  layer: OnchainLayerKey;
  canonical: string;
  source: string;
  confidence: number;
};

export type OnchainPressure = {
  buyPressure: number;
  sellPressure: number;
  networkStrength: number;
  speculationPressure: number;
  liquidityState: number;
};

export type OnchainAnalysis = {
  detected: boolean;
  mappings: OnchainMapping[];
  rowCount: number;
  regimeKo: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  pressure: OnchainPressure;
  dominantForceKo: string;
  smartMoneyStateKo: string;
  riskLevelKo: string;
  structuralBiasKo: string;
  liquidityConditionKo: string;
  networkParticipationKo: string;
  speculativeConditionKo: string;
  hiddenRiskKo: string;
  structuralStabilityKo: string;
  confidenceReasonKo: string;
  causalSummaryKo: string;
  scoreReasonKo: string;
  transitionFlow: string[];
  conflicts: Array<{ title: string; descriptionKo: string; severity: "LOW" | "MEDIUM" | "HIGH" }>;
  accumulationProbability: number;
  distributionProbability: number;
  narrativeKo: string;
  insightsKo: string[];
  warningsKo: string[];
  layerScores: Array<{ layer: string; score: number; interpretationKo: string }>;
  heatmap: Array<{ label: string; value: number; tone: "good" | "warn" | "bad" | "muted" }>;
  degradationKo: string[];
};

const LAYERS: Record<OnchainLayerKey, Array<{ canonical: string; patterns: RegExp[] }>> = {
  network: [
    { canonical: "active_wallets", patterns: [/active.?wallet|active.?address|daily.?active|활성.?지갑|활성.?주소/i] },
    { canonical: "new_addresses", patterns: [/new.?address| 신규.?주소/i] },
    { canonical: "transaction_count", patterns: [/transaction.?count|tx.?count|transactions?|전송.?건수|거래.?건수/i] },
    { canonical: "tx_volume", patterns: [/tx.?volume|transfer.?volume|transaction.?volume|전송.?량/i] },
    { canonical: "gas_fee", patterns: [/gas.?fee|gas.?used|gas.?price|transaction.?fee|fee.?revenue|avg.?fee/i] },
    { canonical: "network_usage", patterns: [/block.?size|block.?count|block.?time|mempool|throughput|network.?usage/i] },
  ],
  exchange: [
    { canonical: "exchange_inflow", patterns: [/exchange.*inflow|inflow.*exchange|btc.*to.*exchange|cex.*deposit|exchange.?deposit|spot.?inflow/i] },
    { canonical: "exchange_outflow", patterns: [/exchange.*outflow|outflow.*exchange|exchange.?withdrawal|cex.*withdraw|spot.?outflow/i] },
    { canonical: "netflow", patterns: [/netflow|net.?flow|exchange.?net/i] },
    { canonical: "exchange_reserve", patterns: [/exchange.?balance|exchange.?reserve|exchange.?supply|reserve.?balance|exchange.?wallet/i] },
    { canonical: "exchange_whale_ratio", patterns: [/exchange.?whale.?ratio|whale.*exchange/i] },
  ],
  whale: [
    { canonical: "whale_tx", patterns: [/whale.?tx|whale.?transaction|large.?tx|large.?transfer|gt.?1m|mega.?whale/i] },
    { canonical: "whale_flow", patterns: [/whale.?flow|large.?holder.?netflow|top.?holder.?flow|institutional.?transfer|smart.?money/i] },
    { canonical: "accumulation", patterns: [/accumulation.?address|accumulation|rich.?list/i] },
    { canonical: "distribution", patterns: [/distribution.?address|distribution/i] },
    { canonical: "top_holder_ratio", patterns: [/top10.?wallet|top100.?wallet|whale.?ratio|rich.?list/i] },
  ],
  miner: [
    { canonical: "hashrate", patterns: [/hashrate|hash.?rate/i] },
    { canonical: "difficulty", patterns: [/mining.?difficulty|difficulty/i] },
    { canonical: "miner_reserve", patterns: [/miner.?reserve|miner.?balance/i] },
    { canonical: "miner_outflow", patterns: [/miner.?outflow|mpi|miner.?position.?index/i] },
    { canonical: "validator", patterns: [/validator|staking.?validator|slashing/i] },
  ],
  derivatives: [
    { canonical: "funding_rate", patterns: [/funding.?rate/i] },
    { canonical: "open_interest", patterns: [/open.?interest|^oi$|options.?oi/i] },
    { canonical: "leverage_ratio", patterns: [/leverage.?ratio|estimated.?leverage/i] },
    { canonical: "liquidation", patterns: [/liquidation|long.?liquidation|short.?liquidation/i] },
    { canonical: "long_short_ratio", patterns: [/long.?short.?ratio/i] },
    { canonical: "derivatives_volume", patterns: [/futures.?volume|perpetual.?volume|options.?volume|gamma.?exposure|dealer.?position/i] },
  ],
  liquidity: [
    { canonical: "stablecoin_supply", patterns: [/stablecoin.?supply|stablecoin.?ratio/i] },
    { canonical: "stablecoin_flow", patterns: [/stablecoin.?inflow|stablecoin.?outflow/i] },
    { canonical: "bridge_flow", patterns: [/bridge.?flow|bridge.?volume|crosschain.?volume/i] },
    { canonical: "dex_volume", patterns: [/dex.?volume|amm.?liquidity|liquidity.?pool|lp.?ratio/i] },
    { canonical: "tvl", patterns: [/tvl|total.?value.?locked/i] },
  ],
  valuation: [
    { canonical: "mvrv", patterns: [/mvrv|nupl|sopr|reserve.?risk/i] },
    { canonical: "realized_cap", patterns: [/realized.?cap|realized.?price|realized.?profit|realized.?loss/i] },
    { canonical: "dormancy", patterns: [/dormancy|coin.?days.?destroyed/i] },
    { canonical: "market_cap", patterns: [/market.?cap/i] },
  ],
  sentiment: [
    { canonical: "social_volume", patterns: [/social.?volume|social.?dominance|reddit.?mentions|twitter.?mentions|search.?trend/i] },
    { canonical: "sentiment_score", patterns: [/sentiment.?score|fear.?greed/i] },
  ],
};

function parseNumber(value: unknown) {
  const n = Number(String(value ?? "").replace(/,/g, "").replace(/%$/, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function mean(values: number[]) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : 0;
}

function percentile(values: number[], current: number) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length || !Number.isFinite(current)) return 50;
  return clean.filter((v) => v <= current).length / clean.length * 100;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function detectMappings(rows: Row[]): OnchainMapping[] {
  const headers = Object.keys(rows[0] ?? {});
  const mappings: OnchainMapping[] = [];
  (Object.keys(LAYERS) as OnchainLayerKey[]).forEach((layer) => {
    LAYERS[layer].forEach((item) => {
      const source = headers.find((header) => item.patterns.some((rx) => rx.test(header)));
      if (source && !mappings.some((m) => m.source === source)) mappings.push({ layer, canonical: item.canonical, source, confidence: 0.84 });
    });
  });
  return mappings;
}

function latestPercentile(rows: Row[], mapping?: OnchainMapping) {
  if (!mapping) return 50;
  const values = rows.map((r) => parseNumber(r[mapping.source])).filter(Number.isFinite);
  return percentile(values, values.at(-1) ?? NaN);
}

export function buildOnchainAnalysis(inputRows: Row[]): OnchainAnalysis {
  const rows = inputRows.filter((row) => Object.values(row).some((v) => String(v ?? "").trim() !== ""));
  const mappings = rows.length ? detectMappings(rows) : [];
  const byCanonical = (name: string) => mappings.find((m) => m.canonical === name);
  const byLayer = (layer: OnchainLayerKey) => mappings.filter((m) => m.layer === layer);
  const detected = mappings.length >= 2;
  const degradationKo: string[] = [];
  if (!detected) degradationKo.push("온체인 컬럼이 충분하지 않아 제한 분석 모드로 표시합니다.");

  const exchangeInflow = latestPercentile(rows, byCanonical("exchange_inflow"));
  const exchangeOutflow = latestPercentile(rows, byCanonical("exchange_outflow"));
  const whaleTx = latestPercentile(rows, byCanonical("whale_tx"));
  const whaleAccum = latestPercentile(rows, byCanonical("accumulation"));
  const whaleDist = latestPercentile(rows, byCanonical("distribution"));
  const activeWallets = latestPercentile(rows, byCanonical("active_wallets"));
  const txCount = latestPercentile(rows, byCanonical("transaction_count"));
  const hashrate = latestPercentile(rows, byCanonical("hashrate"));
  const funding = latestPercentile(rows, byCanonical("funding_rate"));
  const oi = latestPercentile(rows, byCanonical("open_interest"));
  const leverage = latestPercentile(rows, byCanonical("leverage_ratio"));
  const stablecoin = latestPercentile(rows, byCanonical("stablecoin_supply"));
  const bridge = latestPercentile(rows, byCanonical("bridge_flow"));
  const reserve = latestPercentile(rows, byCanonical("exchange_reserve"));

  const pressure: OnchainPressure = {
    buyPressure: clamp(mean([exchangeOutflow, whaleAccum, activeWallets, stablecoin])),
    sellPressure: clamp(mean([exchangeInflow, whaleDist, funding, leverage])),
    networkStrength: clamp(mean([activeWallets, txCount, hashrate])),
    speculationPressure: clamp(mean([funding, oi, leverage])),
    liquidityState: clamp(mean([stablecoin, bridge, 100 - reserve, exchangeOutflow])),
  };

  const insightsKo: string[] = [];
  if (exchangeInflow > 65 && whaleTx > 65 && funding > 65) insightsKo.push("고래 거래 증가와 거래소 유입, 펀딩 과열이 동시에 나타나 레버리지 롱 과열 구간의 분배 압력이 커질 수 있습니다.");
  if (exchangeOutflow > 65 && activeWallets > 60 && hashrate > 60) insightsKo.push("거래소 공급은 감소하고 네트워크 참여 및 보안 지표는 강화되어 장기 축적 구조가 개선됩니다.");
  if (activeWallets < 35 && txCount < 35 && hashrate < 35) insightsKo.push("활성 지갑, 거래 건수, 해시레이트가 동시에 약해져 네트워크 신뢰와 사용성이 둔화되는 구조입니다.");
  if (whaleTx > 65 && exchangeOutflow > 65) insightsKo.push("대형 보유자가 거래소 밖으로 유동성을 이동시키며 약세 구간의 물량 흡수 가능성을 시사합니다.");
  if (funding > 75 && oi > 65 && exchangeInflow > 60) insightsKo.push("펀딩과 미결제약정이 과열된 상태에서 거래소 유입이 늘어 단기 청산 위험이 상승합니다.");
  if (stablecoin > 65 && exchangeOutflow > 60 && activeWallets > 60) insightsKo.push("스테이블코인 유동성, 거래소 출금, 네트워크 활동이 함께 개선되어 생태계 유동성 확장 레짐이 형성됩니다.");
  if (!insightsKo.length) insightsKo.push("온체인 신호는 한쪽으로 강하게 정렬되기보다 혼합되어 있습니다. 거래소 흐름, 고래 행동, 네트워크 활동의 추가 확인이 필요합니다.");

  const dominantForceKo =
    exchangeInflow > 65 && whaleTx > 65 && funding > 65 ? "거래소 분배 압력 지배" :
    activeWallets > 65 && hashrate > 65 && exchangeOutflow > 60 ? "네트워크 확장 + 축적 지배" :
    funding > 70 && oi > 65 ? "투기 레버리지 확장 지배" :
    stablecoin > 65 && exchangeOutflow > 60 && activeWallets > 55 ? "유동성 확장 지배" :
    exchangeOutflow > 65 && whaleTx > 60 ? "스마트머니 흡수 지배" :
    pressure.sellPressure > pressure.buyPressure + 15 ? "고래 분배 / 거래소 매도 압력 지배" :
    pressure.buyPressure > pressure.sellPressure + 15 ? "고래 축적 / 매수 압력 지배" :
    pressure.networkStrength < 35 ? "네트워크 약화 지배" :
    "혼합 전환 구조";
  const regimeKo =
    pressure.sellPressure > 70 && pressure.speculationPressure > 65 ? "분배 및 청산 위험 레짐" :
    pressure.buyPressure > 65 && pressure.networkStrength > 60 ? "축적 강화 레짐" :
    pressure.liquidityState > 65 && pressure.networkStrength > 55 ? "유동성 확장 레짐" :
    pressure.networkStrength < 35 ? "네트워크 약화 레짐" :
    "혼합 균형 레짐";
  const smartMoneyStateKo = whaleAccum > whaleDist + 15 || exchangeOutflow > exchangeInflow + 15 ? "축적 우위" : whaleDist > whaleAccum + 15 || exchangeInflow > exchangeOutflow + 15 ? "분배 우위" : "관망/혼합";
  const riskLevelKo = pressure.sellPressure > 70 || pressure.speculationPressure > 75 ? "높음" : pressure.sellPressure > 55 || pressure.speculationPressure > 60 ? "중간" : "낮음";
  const conflicts: OnchainAnalysis["conflicts"] = [];
  if (pressure.networkStrength > 65 && pressure.liquidityState < 45) conflicts.push({ title: "네트워크 강도 vs 유동성 부족", severity: "MEDIUM", descriptionKo: "네트워크 참여는 건강하지만 생태계 유동성 확장이 이를 충분히 따라가지 못하고 있습니다." });
  if (whaleTx > 65 && exchangeInflow < 45) conflicts.push({ title: "고래 활동 vs 낮은 거래소 유입", severity: "LOW", descriptionKo: "대형 보유자는 활발하지만 거래소 매도 공급으로 직접 연결되지 않아 내부 재배치 또는 축적 가능성이 있습니다." });
  if (funding > 65 && pressure.buyPressure < 45) conflicts.push({ title: "레버리지 과열 vs 약한 현물 수요", severity: "HIGH", descriptionKo: "파생 레버리지가 유기적 현물 참여보다 빠르게 확장되어 불안정성이 커질 수 있습니다." });
  if (exchangeInflow > 65 && pressure.networkStrength > 65) conflicts.push({ title: "네트워크 확장 vs 거래소 매도 공급", severity: "MEDIUM", descriptionKo: "네트워크 기반은 양호하지만 단기 거래소 유입이 상승 구조를 압박합니다." });
  const confidence: OnchainAnalysis["confidence"] = mappings.length >= 8 && conflicts.length <= 1 ? "HIGH" : mappings.length >= 4 ? "MEDIUM" : "LOW";
  const structuralBiasKo = pressure.buyPressure > pressure.sellPressure + 12 && pressure.networkStrength > 55 ? "중립 강세" : pressure.sellPressure > pressure.buyPressure + 12 ? "중립 약세" : "중립 전환";
  const liquidityConditionKo = pressure.liquidityState > 65 ? "유동성 확장" : pressure.liquidityState < 40 ? "유동성 수축" : "유동성 중립";
  const networkParticipationKo = pressure.networkStrength > 65 ? "참여 확장" : pressure.networkStrength < 35 ? "참여 약화" : "참여 중립";
  const speculativeConditionKo = pressure.speculationPressure > 70 ? "레버리지 과열" : pressure.speculationPressure > 55 ? "투기 압력 상승" : "투기 압력 제한";
  const hiddenRiskKo = conflicts[0]?.descriptionKo ?? (riskLevelKo === "높음" ? "거래소 매도 압력 또는 파생 레버리지 과열이 단기 변동성 위험을 높입니다." : "뚜렷한 숨은 충돌은 제한적이나 추가 확인이 필요합니다.");
  const structuralStabilityKo = confidence === "HIGH" ? "높음" : confidence === "MEDIUM" ? "중간" : "낮음";
  const confidenceReasonKo = confidence === "HIGH"
    ? "다수의 온체인 레이어가 같은 방향으로 정렬되고 구조적 충돌이 제한적이어서 신뢰도가 높습니다."
    : confidence === "MEDIUM"
    ? "일부 레이어는 정렬되지만 충돌 또는 누락 신호가 있어 중간 신뢰도로 해석합니다."
    : "감지된 온체인 레이어가 부족하거나 신호가 파편화되어 신뢰도가 낮습니다.";
  const accumulationProbability = clamp(mean([pressure.buyPressure, exchangeOutflow, whaleAccum, pressure.networkStrength, pressure.liquidityState]));
  const distributionProbability = clamp(mean([pressure.sellPressure, exchangeInflow, whaleDist, pressure.speculationPressure]));
  const transitionFlow =
    pressure.liquidityState > 65 && exchangeOutflow > 60
      ? ["스테이블코인 유동성 증가", "거래소 출금 확대", "장기 축적 가능성", "강세 확장 레짐"]
      : exchangeInflow > 65 && pressure.speculationPressure > 65
      ? ["고래/거래소 유입 확대", "파생 레버리지 과열", "매도 가능 공급 증가", "분배 및 청산 위험"]
      : pressure.networkStrength > 65 && whaleTx > 60
      ? ["네트워크 참여 확장", "고래 참여 증가", exchangeInflow > exchangeOutflow ? "거래소 유입 압력" : "거래소 출금 우위", "전환 구조 확인 필요"]
      : ["온체인 신호 혼합", "압력 균형", "추가 확인 필요"];
  const causalSummaryKo =
    exchangeInflow > 65 && whaleTx > 65
      ? "거래소 유입 확대는 전송 가능한 공급이 거래소로 이동하고 있음을 의미하며, 고래 거래 증가와 결합될 때 스마트머니 분배 가능성을 높입니다."
      : exchangeOutflow > 65 && pressure.networkStrength > 60
      ? "거래소 출금과 네트워크 활동 증가는 유통 공급 감소와 실제 사용성 개선이 동시에 나타나는 구조로, 축적성 흐름을 강화합니다."
      : funding > 65 && oi > 65
      ? "펀딩과 미결제약정 상승은 파생 포지션이 현물 기반보다 빠르게 확장되고 있음을 의미하며, 청산 민감도를 높입니다."
      : "현재 온체인 구조는 단일 방향보다 여러 압력이 교차하는 전환 구간입니다.";
  const scoreReasonKo = `매수 압력 ${pressure.buyPressure}점은 거래소 출금, 고래 축적, 활성 지갑, 스테이블코인 유동성을 결합한 값입니다. 매도 압력 ${pressure.sellPressure}점은 거래소 유입, 분배 신호, 펀딩 및 레버리지 압력을 반영합니다. 두 압력의 차이가 구조적 편향을 만들고, 네트워크 강도 ${pressure.networkStrength}점이 약세 악화를 완충하거나 강세 구조를 강화합니다.`;
  const narrativeKo = `${regimeKo}입니다. 지배 세력은 ${dominantForceKo}이며, 구조적 편향은 ${structuralBiasKo}입니다. ${causalSummaryKo} ${scoreReasonKo} 현재 숨은 위험은 ${hiddenRiskKo}`;

  const layerScores = [
    { layer: "네트워크 레이어", score: pressure.networkStrength, interpretationKo: "활성 지갑, 거래 건수, 해시레이트가 네트워크 참여와 보안 강도를 설명합니다." },
    { layer: "거래소 레이어", score: clamp(50 + exchangeOutflow - exchangeInflow), interpretationKo: "거래소 유입은 매도 가능 공급, 출금은 축적 또는 장기 보관 압력을 의미합니다." },
    { layer: "고래/스마트머니", score: clamp(mean([whaleTx, whaleAccum, 100 - whaleDist])), interpretationKo: "대형 보유자의 이동은 분배와 흡수 가능성을 동시에 판단하는 핵심 신호입니다." },
    { layer: "파생/레버리지", score: pressure.speculationPressure, interpretationKo: "펀딩, 미결제약정, 레버리지 비율은 단기 과열과 청산 위험을 설명합니다." },
    { layer: "유동성 레이어", score: pressure.liquidityState, interpretationKo: "스테이블코인, 브릿지, DEX/TVL 흐름은 생태계 유동성 확장을 보여줍니다." },
  ];

  const heatmap = [
    { label: "매수 압력", value: pressure.buyPressure, tone: pressure.buyPressure > 60 ? "good" as const : "muted" as const },
    { label: "매도 압력", value: pressure.sellPressure, tone: pressure.sellPressure > 65 ? "bad" as const : "muted" as const },
    { label: "네트워크 강도", value: pressure.networkStrength, tone: pressure.networkStrength > 60 ? "good" as const : pressure.networkStrength < 35 ? "bad" as const : "warn" as const },
    { label: "투기 압력", value: pressure.speculationPressure, tone: pressure.speculationPressure > 70 ? "bad" as const : "warn" as const },
    { label: "유동성 상태", value: pressure.liquidityState, tone: pressure.liquidityState > 60 ? "good" as const : "muted" as const },
  ];

  return {
    detected,
    mappings,
    rowCount: rows.length,
    regimeKo,
    confidence,
    pressure,
    dominantForceKo,
    smartMoneyStateKo,
    riskLevelKo,
    structuralBiasKo,
    liquidityConditionKo,
    networkParticipationKo,
    speculativeConditionKo,
    hiddenRiskKo,
    structuralStabilityKo,
    confidenceReasonKo,
    causalSummaryKo,
    scoreReasonKo,
    transitionFlow,
    conflicts,
    accumulationProbability,
    distributionProbability,
    narrativeKo,
    insightsKo,
    warningsKo: riskLevelKo === "높음" ? ["투기 압력 또는 거래소 매도 압력이 높아 단기 변동성 확대 가능성이 있습니다."] : [],
    layerScores,
    heatmap,
    degradationKo,
  };
}
