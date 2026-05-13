export type DatasetPrimaryType =
  | "ohlcv"
  | "flow"
  | "short"
  | "options"
  | "macro"
  | "financial"
  | "valuation"
  | "portfolio"
  | "sentiment"
  | "onchain"
  | "news"
  | "economic_calendar"
  | "etf_flow"
  | "price_only"
  | "generic";

export type DatasetTypeScore = {
  type: DatasetPrimaryType;
  labelKo: string;
  confidence: number;
  evidenceKo: string[];
};

export type DatasetClassification = {
  primaryType: DatasetPrimaryType;
  primaryLabelKo: string;
  confidence: number;
  confidenceScores: Record<string, number>;
  scores: DatasetTypeScore[];
  secondarySignals: DatasetTypeScore[];
  supportingMetadataKo: string[];
  matchedColumns: string[];
  blockedTypes: DatasetPrimaryType[];
  selectedEngine: string;
  suppressedEngines: string[];
  secondaryContextKo: string[];
  primaryStructureKo: string;
  secondaryStructuresKo: string[];
  dominantDomainKo: string;
  interpretationModeKo: string;
  heroVisualKo: string;
  supportLayersKo: string[];
  relationshipsKo: string[];
  contradictionsKo: string[];
  orchestrationNarrativeKo: string;
  classificationReason: string;
  reasonKo: string;
};

type Row = Record<string, unknown>;

const LABEL_KO: Record<DatasetPrimaryType, string> = {
  ohlcv: "OHLCV 가격 데이터",
  flow: "수급/공급·수요 데이터",
  short: "공매도 데이터",
  options: "옵션 데이터",
  macro: "매크로 데이터",
  financial: "재무제표 데이터",
  valuation: "밸류에이션 데이터",
  portfolio: "포트폴리오 데이터",
  sentiment: "센티먼트 데이터",
  onchain: "온체인 데이터",
  news: "뉴스/이벤트 데이터",
  economic_calendar: "경제 캘린더 데이터",
  etf_flow: "ETF 플로우 데이터",
  price_only: "가격 단일 데이터",
  generic: "범용 데이터",
};

const STRUCTURE_KO: Record<DatasetPrimaryType, string> = {
  ohlcv: "가격 행동 구조",
  flow: "자본 흐름 구조",
  short: "공매도 압력 구조",
  options: "파생 포지셔닝 구조",
  macro: "시장 레짐 구조",
  financial: "기업 실적 구조",
  valuation: "상대가치 평가 구조",
  portfolio: "포트폴리오 배분 구조",
  sentiment: "군중 심리 구조",
  onchain: "온체인 네트워크 구조",
  news: "뉴스/이벤트 충격 구조",
  economic_calendar: "경제 이벤트 구조",
  etf_flow: "ETF 자금 회전 구조",
  price_only: "가격 보조 구조",
  generic: "범용 데이터 구조",
};

const MODE_KO: Record<DatasetPrimaryType, string> = {
  ohlcv: "가격 행동 모드",
  flow: "자본 축적/분산 모드",
  short: "공매도 압력 모드",
  options: "옵션 변동성/포지셔닝 모드",
  macro: "매크로 레짐 모드",
  financial: "펀더멘털 품질 모드",
  valuation: "상대 밸류에이션 모드",
  portfolio: "배분/리스크 구조 모드",
  sentiment: "행동 심리 모드",
  onchain: "네트워크 활동 모드",
  news: "이벤트 내러티브 모드",
  economic_calendar: "경제 서프라이즈 모드",
  etf_flow: "자금 회전 모드",
  price_only: "가격 컨텍스트 모드",
  generic: "탐색 분석 모드",
};

const HERO_KO: Record<DatasetPrimaryType, string> = {
  ohlcv: "가격 추세와 거래량을 히어로 시각화로 승격",
  flow: "누적 순매수와 참여자 압력을 히어로 시각화로 승격",
  short: "공매도 압력과 숏 스퀴즈 위험을 히어로 시각화로 승격",
  options: "IV, Put/Call, 감마 압력을 히어로 시각화로 승격",
  macro: "VIX·금리·물가·달러 레짐을 히어로 시각화로 승격",
  financial: "매출·이익·현금흐름 품질을 히어로 시각화로 승격",
  valuation: "밸류에이션 밴드와 역사적 상대 위치를 히어로 시각화로 승격",
  portfolio: "배분·집중도·기여도 맵을 히어로 시각화로 승격",
  sentiment: "감성 추세와 군중 하이프를 히어로 시각화로 승격",
  onchain: "지갑·거래소·고래 활동을 히어로 시각화로 승격",
  news: "이벤트 타임라인과 영향도 랭킹을 히어로 시각화로 승격",
  economic_calendar: "예상 대비 실제 서프라이즈를 히어로 시각화로 승격",
  etf_flow: "ETF 순유입과 섹터 회전을 히어로 시각화로 승격",
  price_only: "가격 라인 컨텍스트를 보조 시각화로 유지",
  generic: "데이터 구조 탐색 패널을 우선 표시",
};

const ENGINE_BY_TYPE: Record<DatasetPrimaryType, string> = {
  ohlcv: "OHLCV_ENGINE",
  flow: "FLOW_ENGINE",
  short: "SHORT_INTEREST_ENGINE",
  options: "OPTIONS_ENGINE",
  macro: "MACRO_ENGINE",
  financial: "FINANCIAL_STATEMENT_ENGINE",
  valuation: "VALUATION_ENGINE",
  portfolio: "PORTFOLIO_ENGINE",
  sentiment: "SENTIMENT_ENGINE",
  onchain: "ONCHAIN_SUPPORT_ENGINE",
  news: "NEWS_EVENT_ENGINE",
  economic_calendar: "ECONOMIC_CALENDAR_SUPPORT_ENGINE",
  etf_flow: "ETF_FLOW_ENGINE",
  price_only: "PRICE_CONTEXT_ENGINE",
  generic: "GENERIC_EXPLORATION_ENGINE",
};

const PATTERNS: Record<Exclude<DatasetPrimaryType, "generic">, RegExp[]> = {
  ohlcv: [/^date$|datetime|time|날짜|일자/, /^open$|시가/, /^high$|고가/, /^low$|저가/, /^close$|adjclose|price|종가|현재가/, /^volume$|거래량/],
  flow: [/foreign|foreigner|외국인/, /institution|기관/, /retail|individual|개인/, /netbuy|netflow|순매수|수급/, /buy|sell|매수|매도/],
  short: [/shortvolume|shortratio|shortinterest|shortbalance|borrowfee|borrowrate|공매도|대차/],
  options: [/putcall|pcr|impliedvol|iv|openinterest|gamma|delta|strike|expiry|expiration|call|put|옵션|행사가|만기|미결제/],
  macro: [/vix|interestrate|rate|cpi|inflation|yield|dxy|gdp|unemployment|pmi|금리|물가|국채|달러|실업/],
  financial: [/revenue|sales|operatingincome|netincome|eps|roe|roa|cashflow|margin|debt|assets|매출|영업이익|순이익|현금흐름|부채|자산/],
  valuation: [/^per$|^pe$|peratio|priceearnings|^pbr$|^pb$|pbratio|pricebook|^peg$|ev.?ebitda|enterprisevalue|multiple|fairvalue|밸류|가치평가/],
  portfolio: [/ticker|symbol|asset|stock|holding|security|code|종목|티커|자산|보유/, /weight|allocation|ratio|position|exposure|weightpct|비중|배분|노출/, /sector|industry|theme|category|섹터|업종|테마/, /returnpct|return|pnl|gain|performance|profit|수익률|성과|손익/],
  sentiment: [/sentiment|polarity|mentions|buzz|reddit|twitter|social|newsscore|feargreed|engagement|trendscore|communityscore|mediaimpact|headlinescore|감성|심리|언급|소셜/],
  onchain: [/wallet|activewallet|activeaddress|exchangeinflow|exchangeoutflow|netflow|exchangebalance|exchangereserve|whale|large.?tx|hashrate|miner|validator|fundingrate|openinterest|leverage|liquidation|stablecoin|bridge|dex|tvl|mvrv|nupl|sopr|realized|dormancy|token|network|온체인|지갑|고래|해시/],
  news: [/headline|title|body|summary|published|publishedat|impactscore|eventcategory|news|기사|뉴스|제목|본문|발행/],
  economic_calendar: [/^event$|forecast|actual|previous|importance|surprise|calendar|예상|실제|이전|중요도|발표/],
  etf_flow: [/etf|fund|aum|inflow|outflow|netflow|creation|redemption|rotation|자금유입|자금유출|순유입/],
  price_only: [/^close$|adjclose|price|종가|현재가/],
};

function norm(value: string) {
  return value.toLowerCase().replace(/[\s_\-./()[\]{}%]+/g, "");
}

function toNumber(value: unknown) {
  if (value == null) return NaN;
  const text = String(value).trim().replace(/,/g, "").replace(/%$/, "");
  if (!text || /^(nan|null|n\/a|na|-|--|\.)$/i.test(text)) return NaN;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

function find(headers: string[], rx: RegExp) {
  return headers.find((h) => rx.test(norm(h)));
}

function findAll(headers: string[], patterns: RegExp[]) {
  return headers.filter((h) => patterns.some((rx) => rx.test(norm(h))));
}

function countMatches(headers: string[], patterns: RegExp[]) {
  return patterns.reduce((count, rx) => count + (headers.some((h) => rx.test(norm(h))) ? 1 : 0), 0);
}

function uniqueCount(rows: Row[], column?: string) {
  if (!column) return 0;
  return new Set(rows.map((r) => String(r[column] ?? "").trim()).filter(Boolean)).size;
}

function validRatio(rows: Row[], column?: string) {
  if (!column || !rows.length) return 0;
  const sample = rows.slice(0, 80);
  return sample.filter((r) => Number.isFinite(toNumber(r[column]))).length / sample.length;
}

const NARRATIVE_HEADER_RX = /headline|title|news|article|content|summary|description|story|tweet|reddit|telegram|theme|topic|breaking|alert|msg|message|body|text|note|post|caption|memo|research|commentary|transcript/i;
const EVENT_KEYWORD_RX = /fed|fomc|cpi|ppi|inflation|\bai\b|etf|bitcoin|ethereum|crypto|sec|earnings|guidance|bankruptcy|lawsuit|tariff|war|oil|yield|recession|liquidity|volatility|rate hike|soft landing|regulation|geopolitical|nvidia|treasury|interest rate/i;
const SOCIAL_EVENT_RX = /mentions?|engagement|likes|shares|comments|retweets|socialvolume|sentiment|views|impressions|interactions|virality|trend/i;
const ETF_CORE_PATTERNS = [
  /etfinflow|^inflow$|fundinflow|cashinflow/,
  /etfoutflow|^outflow$|fundoutflow|cashoutflow/,
  /^netflow$|netflow|fundflow|moneyflow|capitalflow/,
  /^aum$|assetsundermanagement|totalaum|netassets/,
  /sectorrotation|sectorflow|thematicrotation/,
  /premiumdiscount|navpremium|discountpremium/,
  /creationredemption|^creation$|^redemption$/,
  /smartmoneyflow/,
  /institutionaletfflow/,
  /riskonprobability/,
  /defensiveprobability/,
  /flowpersistence/,
  /liquidityscore/,
] as const;
const ETF_METADATA_ONLY_RX = /^(etfname|etf_name|sector|marketregime|market_regime|alphasignal|alpha_signal|confidencelevel|confidence_level)$/;

function etfCoreColumns(headers: string[]) {
  return headers.filter((header) => ETF_CORE_PATTERNS.some((pattern) => pattern.test(norm(header))));
}

function genuineNewsTextColumn(headers: string[]) {
  return headers.find((header) => /^event$|^headline$|^title$|^news$|^article$|^content$|^body$|^story$|^post$|^tweet$|^narrativetext$|^eventdescription$|breaking|alert/i.test(norm(header)));
}

function newsAssistColumnCount(headers: string[]) {
  const assist = [
    /forecast/,
    /actual/,
    /previous/,
    /importance/,
    /^sentiment$|sentimentscore/,
    /^source$|publisher|provider|platform/,
    /narrativetext/,
    /eventdescription/,
  ];
  return assist.filter((pattern) => headers.some((header) => pattern.test(norm(header)))).length;
}

function narrativeStructure(rows: Row[], headers: string[]) {
  const sample = rows.slice(0, 80);
  const textColumns = headers.filter((header) => {
    if (ETF_METADATA_ONLY_RX.test(norm(header))) return false;
    const values = sample.map((row) => String(row[header] ?? "").trim()).filter(Boolean);
    if (!values.length) return false;
    const avgLength = values.reduce((sum, value) => sum + value.length, 0) / values.length;
    const numericRatio = values.filter((value) => Number.isFinite(toNumber(value))).length / values.length;
    return NARRATIVE_HEADER_RX.test(header) || (avgLength > 20 && numericRatio < 0.25);
  });
  const textValues = textColumns.flatMap((column) => sample.map((row) => String(row[column] ?? "").trim()).filter(Boolean));
  const avgTextLength = textValues.length ? textValues.reduce((sum, value) => sum + value.length, 0) / textValues.length : 0;
  const keywordHits = textValues.filter((value) => EVENT_KEYWORD_RX.test(value)).length;
  const keywordDensity = textValues.length ? keywordHits / textValues.length : 0;
  const normalizedPhrases = textValues
    .map((value) => value.toLowerCase().replace(/[^a-z0-9가-힣 ]+/g, " ").split(/\s+/).filter((word) => word.length >= 3).slice(0, 5).join(" "))
    .filter(Boolean);
  const repeatedPhrases = normalizedPhrases.length - new Set(normalizedPhrases).size;
  const timestampColumn = headers.some((header) => /published|timestamp|datetime|date|created|updated|eventtime|release|time|detected|occurrence/i.test(norm(header)));
  const socialColumns = headers.filter((header) => SOCIAL_EVENT_RX.test(norm(header)));
  const ohlcvContext = headers.some((header) => /^open$|^high$|^low$|^close$|^volume$|price|return|reaction|volatility/i.test(norm(header)));
  const macroContext = headers.some((header) => /cpi|fed|interest|yield|treasury|inflation|gdp|employment|policy|macro/i.test(norm(header)));
  const optionsContext = headers.some((header) => /putcall|impliedvol|openinterest|gamma|strike|expiry|option/i.test(norm(header)));
  const etfContext = headers.some((header) => /etf|aum|inflow|outflow|netflow|creation|redemption/i.test(norm(header)));
  const onchainContext = headers.some((header) => /wallet|exchangeinflow|exchangeoutflow|whale|hashrate|fundingrate|stablecoin|tvl/i.test(norm(header)));
  const textColumnRatio = headers.length ? textColumns.length / headers.length : 0;
  const score = Math.round(Math.min(100,
    textColumnRatio * 80 +
    (avgTextLength > 20 ? 22 : 0) +
    (textColumns.some((header) => NARRATIVE_HEADER_RX.test(header)) ? 30 : 0) +
    (timestampColumn && textColumns.length ? 18 : 0) +
    (socialColumns.length ? 18 : 0) +
    Math.min(18, repeatedPhrases * 4) +
    Math.min(24, keywordDensity * 80)
  ));
  const hybridContexts = [
    ohlcvContext ? "가격 반응" : null,
    macroContext ? "매크로" : null,
    optionsContext ? "옵션/변동성" : null,
    etfContext ? "ETF/자금 흐름" : null,
    onchainContext ? "온체인" : null,
    socialColumns.length ? "소셜/감성" : null,
  ].filter(Boolean) as string[];
  const evidenceKo = [
    `내러티브 신뢰도 ${score}점`,
    textColumns.length ? `텍스트 후보 컬럼: ${textColumns.slice(0, 6).join(", ")}` : "",
    avgTextLength > 20 ? `평균 텍스트 길이 ${avgTextLength.toFixed(1)}자` : "",
    timestampColumn && textColumns.length ? "시간 컬럼과 텍스트 컬럼이 함께 있어 이벤트 시퀀스 구조가 감지되었습니다." : "",
    keywordHits ? `반복 이벤트 키워드 ${keywordHits}건 감지` : "",
    socialColumns.length ? `소셜/참여 신호: ${socialColumns.slice(0, 4).join(", ")}` : "",
    hybridContexts.length ? `하이브리드 이벤트 컨텍스트: ${hybridContexts.join(", ")}` : "",
  ].filter(Boolean);
  return {
    score,
    textColumns,
    avgTextLength,
    repeatedPhrases,
    keywordHits,
    timestampColumn,
    socialColumns,
    hybridContexts,
    hasTextStructure: textColumns.length > 0 || avgTextLength > 20,
    hasSemanticConfirmation: keywordHits > 0 || repeatedPhrases > 0,
    hasAssistSignal: timestampColumn || socialColumns.length > 0 || headers.some((header) => /impact|impactscore|importance|severity|eventscore|marketimpact|shockscore|riskscore|category|eventtype|tag|narrative/i.test(norm(header))),
    evidenceKo,
  };
}

function hasOhlcRelationship(rows: Row[], headers: string[]) {
  const open = find(headers, /^open$|시가/);
  const high = find(headers, /^high$|고가/);
  const low = find(headers, /^low$|저가/);
  const close = find(headers, /^close$|adjclose|price|종가|현재가/);
  if (!open || !high || !low || !close) return false;
  const sample = rows.slice(0, 60);
  const valid = sample.filter((r) => {
    const o = toNumber(r[open]);
    const h = toNumber(r[high]);
    const l = toNumber(r[low]);
    const c = toNumber(r[close]);
    return [o, h, l, c].every(Number.isFinite) && h >= Math.max(o, c) && l <= Math.min(o, c);
  }).length;
  return valid >= Math.max(3, sample.length * 0.55);
}

function pushScore(scores: DatasetTypeScore[], type: DatasetPrimaryType, raw: number, evidenceKo: string[]) {
  scores.push({ type, labelKo: LABEL_KO[type], confidence: Math.max(0, Math.min(100, Math.round(raw))), evidenceKo });
}

function structuralMeta(primary: DatasetPrimaryType, scores: DatasetTypeScore[], headers: string[]) {
  const secondary = scores
    .filter((s) => s.type !== primary && s.confidence >= 30)
    .slice(0, 4);
  const secondaryStructuresKo = secondary.map((s) => STRUCTURE_KO[s.type]);
  const supportLayersKo = secondary.map((s) => `${STRUCTURE_KO[s.type]} 보조 레이어`);
  const relationshipsKo: string[] = [];
  const contradictionsKo: string[] = [];
  const has = (type: DatasetPrimaryType) => scores.some((s) => s.type === type && s.confidence >= 30);

  if (primary === "ohlcv" && has("flow")) relationshipsKo.push("가격 행동과 자본 흐름을 연결해 돌파 신뢰도를 평가합니다.");
  if (primary === "ohlcv" && has("sentiment")) relationshipsKo.push("가격 추세와 군중 심리를 연결해 모멘텀 확인 여부를 평가합니다.");
  if (primary === "ohlcv" && has("options")) relationshipsKo.push("가격 흐름 위에 옵션 포지셔닝 압력을 보조 레이어로 해석합니다.");
  if (primary === "financial" && has("valuation")) relationshipsKo.push("기업 실적 구조와 밸류에이션을 연결해 가격 효율성을 평가합니다.");
  if (primary === "financial" && has("macro")) relationshipsKo.push("실적 흐름의 매크로 민감도를 함께 점검합니다.");
  if (primary === "flow" && has("short")) relationshipsKo.push("수급 흐름과 공매도 압력을 연결해 숏커버링 가능성을 평가합니다.");
  if (primary === "sentiment" && has("ohlcv")) relationshipsKo.push("군중 심리와 가격 흐름의 확인 또는 다이버전스를 평가합니다.");
  if (primary === "portfolio" && has("valuation")) relationshipsKo.push("보유자산 배분 위에 밸류에이션 메타데이터를 보조 신호로 연결합니다.");
  if (!relationshipsKo.length) relationshipsKo.push(`${STRUCTURE_KO[primary]}가 데이터의 기본 해석 축이며, 다른 신호는 보조 확인용으로만 사용합니다.`);

  if (has("ohlcv") && has("flow")) contradictionsKo.push("가격 방향과 자본 흐름이 엇갈릴 경우 돌파 신뢰도를 낮춰야 합니다.");
  if (has("financial") && has("valuation")) contradictionsKo.push("실적 개선과 밸류에이션 부담이 충돌할 수 있어 가격 효율성 확인이 필요합니다.");
  if (has("sentiment") && has("short")) contradictionsKo.push("강한 군중 심리와 공매도 압력이 동시에 존재하면 변동성 확대 가능성이 있습니다.");
  if (primary === "generic") contradictionsKo.push("지배적 구조가 약해 AI 확신도를 낮게 유지합니다.");

  return {
    primaryStructureKo: STRUCTURE_KO[primary],
    secondaryStructuresKo,
    dominantDomainKo: STRUCTURE_KO[primary].replace(" 구조", " 도메인"),
    interpretationModeKo: MODE_KO[primary],
    heroVisualKo: HERO_KO[primary],
    supportLayersKo,
    relationshipsKo,
    contradictionsKo,
    orchestrationNarrativeKo: `${STRUCTURE_KO[primary]}가 이 데이터셋의 1차 목적입니다. ${relationshipsKo[0]} 기존 대시보드는 유지하되, ${HERO_KO[primary]}하고 ${supportLayersKo.length ? supportLayersKo.join(", ") : "보조 신호"}는 해석 신뢰도와 경고 레이어로 배치합니다.`,
  };
}

export function classifyDataset(rowsInput: Row[]): DatasetClassification {
  const rows = rowsInput.filter((row) => Object.values(row).some((v) => String(v ?? "").trim() !== ""));
  const headers = Object.keys(rows[0] ?? {});
  const etfColumns = etfCoreColumns(headers);
  const etfCoreCount = etfColumns.length;
  const hasNetflowAumSector = headers.some((header) => /^netflow$|netflow/.test(norm(header))) && headers.some((header) => /^aum$|assetsundermanagement|totalaum|netassets/.test(norm(header))) && headers.some((header) => /sectorrotation|sectorflow|thematicrotation/.test(norm(header)));
  const hasInflowOutflowNetflow = headers.some((header) => /etfinflow|^inflow$|fundinflow|cashinflow/.test(norm(header))) && headers.some((header) => /etfoutflow|^outflow$|fundoutflow|cashoutflow/.test(norm(header))) && headers.some((header) => /^netflow$|netflow|fundflow|moneyflow|capitalflow/.test(norm(header)));
  const etfFlowRouteLocked = etfCoreCount >= 3 || hasNetflowAumSector || hasInflowOutflowNetflow;
  const etfForcedConfidence = hasNetflowAumSector || hasInflowOutflowNetflow ? 95 : etfCoreCount >= 5 ? 90 : etfCoreCount >= 3 ? 86 : 0;
  const narrative = narrativeStructure(rows, headers);
  const hasGenuineNewsText = Boolean(genuineNewsTextColumn(headers));
  const newsAssistCount = newsAssistColumnCount(headers);
  const narrativePrimaryEligible = !etfFlowRouteLocked && narrative.score > 45 && hasGenuineNewsText && newsAssistCount >= 2 && narrative.hasTextStructure && narrative.hasAssistSignal;
  const scoreBase = (type: Exclude<DatasetPrimaryType, "generic">) => countMatches(headers, PATTERNS[type]);
  const strongGroups: Array<{ type: DatasetPrimaryType; labelKo: string; patterns: RegExp[]; blockers: DatasetPrimaryType[]; reasonKo: string }> = [
    {
      type: "short",
      labelKo: "공매도 데이터",
      patterns: [/shortvolume|shortvol|shortqty|공매도량/, /shortratio|shortfloat|공매도비율/, /borrowfee|borrowrate|대차수수료|대차금리/, /shortinterest|shortbalance|공매도잔고/, /daystocover|dtc/, /loanbalance|대차잔고/, /utilizationrate|utilization/, /coveringvolume|covervolume|상환/, /shortvalue|공매도금액/],
      blockers: ["portfolio", "sentiment"],
      reasonKo: "강한 공매도 컬럼 그룹이 감지되어 공매도 압력 데이터로 타입을 잠급니다.",
    },
    {
      type: "options",
      labelKo: "옵션 데이터",
      patterns: [/putcallratio|pcr/, /impliedvolatility|impliedvol|^iv$/, /openinterest|미결제/, /^gamma$|gammaexposure/, /^delta$/, /^theta$/, /^vega$/, /strike|행사가/, /expiry|expiration|만기/, /optionvolume/, /callvolume/, /putvolume/, /maxpain/],
      blockers: ["portfolio", "macro"],
      reasonKo: "옵션 고유 컬럼 그룹이 감지되어 변동성/포지셔닝 데이터로 타입을 잠급니다.",
    },
    {
      type: "macro",
      labelKo: "매크로 데이터",
      patterns: [/^vix$/, /interestrate|fedrate|기준금리/, /^rate$/, /^cpi$|inflation|물가/, /^yield$|treasury|국채/, /^dxy$|dollarindex/, /usdkrw|fx|환율/, /unemployment|실업/, /^gdp$/, /fedrate/],
      blockers: ["portfolio"],
      reasonKo: "거시경제 지표 컬럼 그룹이 감지되어 매크로 레짐 데이터로 타입을 잠급니다.",
    },
    {
      type: "news",
      labelKo: "뉴스/이벤트 데이터",
      patterns: [/^headline$|^title$|^news$|^article$|^content$|^summary$|^description$|^text$|^body$|^story$|^topic$|^theme$|^subject$|^caption$|breaking|alert/, /impact|impactscore|importance|severity|eventscore|signalstrength|urgency|priority|criticality|marketimpact|eventimpact|shockscore|pressurescore|riskscore|attentionscore|threatlevel/, /publishedat|timestamp|datetime|createdat|eventtime|releasetime|newstime|detectedat|occurrencetime|publishtime|articletime|^date$/, /category|eventtype|sector|industry|group|classification|narrative|marketsegment|eventgroup|macrotype|newstype|tag/, /engagement|mentions|views|clicks|retweets|likes|comments|shares|interactions|reach|impressions|redditmentions|twittermentions|socialvolume/, /pricereaction|marketmove|reactionpct|movepct|pricechange|aftereventreturn|volatilityspike|marketresponse|shockmove/],
      blockers: ["portfolio"],
      reasonKo: "헤드라인·영향도·시간·카테고리·참여도·시장반응 관계가 감지되어 뉴스/이벤트 내러티브 데이터로 우선 해석합니다.",
    },
    {
      type: "sentiment",
      labelKo: "센티먼트 데이터",
      patterns: [/^sentiment$|sentimentscore|polarity|감성/, /mentions?|언급/, /redditscore|reddit/, /newsscore|newssentiment|뉴스/, /twitterscore|twitter/, /socialvolume/, /feargreed/, /buzzscore|buzz/, /fomoindex/, /panicindex/],
      blockers: ["portfolio"],
      reasonKo: "감성/소셜 신호 컬럼 그룹이 감지되어 시장 심리 데이터로 타입을 잠급니다.",
    },
    {
      type: "valuation",
      labelKo: "밸류에이션 데이터",
      patterns: [/^per$|^pe$|peratio/, /^pbr$|^pb$|pbratio/, /^peg$/, /evebitda|evtoebitda/, /^psr$/, /^roe$/, /^eps$/, /^bps$/, /dividendyield/],
      blockers: ["portfolio"],
      reasonKo: "복수 밸류에이션 배수 컬럼이 감지되어 상대가치 데이터로 타입을 잠급니다.",
    },
    {
      type: "financial",
      labelKo: "재무제표 데이터",
      patterns: [/revenue|sales|매출/, /operatingincome|영업이익/, /netincome|순이익/, /^eps$/, /^roe$/, /cashflow|현금흐름/, /^ebitda$/, /grossmargin/, /operatingmargin/, /debtratio|부채비율/],
      blockers: ["portfolio"],
      reasonKo: "재무 성과/수익성 컬럼 그룹이 감지되어 재무제표 데이터로 타입을 잠급니다.",
    },
    {
      type: "onchain",
      labelKo: "온체인 데이터",
      patterns: [/activewallet|activeaddress|dailyactive|transactioncount|txcount|hashrate|exchangeinflow|exchangeoutflow|exchangereserve|whaletx|large.?tx|fundingrate|openinterest|stablecoin|bridgeflow|dexvolume|tvl|mvrv|nupl|sopr|realizedcap|miner|validator/],
      blockers: ["portfolio", "ohlcv"],
      reasonKo: "온체인 네트워크·거래소·고래·파생 신호 그룹이 감지되어 온체인 시장 구조 데이터로 타입을 잠급니다.",
    },
  ];
  const dateCol = find(headers, /^date$|datetime|time|날짜|일자|published|publishedat/);
  const tickerCol = find(headers, /ticker|symbol|asset|stock|holding|security|code|종목|티커|자산|보유/);
  const weightCol = find(headers, /weight|allocation|ratio|position|exposure|weightpct|비중|배분|노출/);
  const qtyCol = find(headers, /^qty$|quantity|shares|units|수량|보유수량/);
  const avgPriceCol = find(headers, /avgprice|averageprice|costbasis|평균단가|매입가/);
  const marketValueCol = find(headers, /mktvalue|marketvalue|market_value|평가금액|시장가치/);
  const returnCol = find(headers, /returnpct|return|pnl|gain|performance|profit|수익률|성과|손익/);
  const sectorCol = find(headers, /sector|industry|theme|category|섹터|업종|테마/);
  const forecastCol = find(headers, /forecast|예상/);
  const actualCol = find(headers, /actual|실제/);
  const previousCol = find(headers, /previous|이전/);
  const inflowCol = find(headers, /inflow|자금유입/);
  const outflowCol = find(headers, /outflow|자금유출/);
  const netflowCol = find(headers, /netflow|순유입|netbuy|순매수/);
  const aumCol = find(headers, /aum|assetsundermanagement|운용자산/);
  const ohlcvMatches = findAll(headers, [/^open$|시가/, /^high$|고가/, /^low$|저가/, /^close$|adjclose|종가/, /^volume$|거래량/]);
  const priceOnlyMatch = ohlcvMatches.length === 1 && !!find(headers, /^close$|adjclose|price|종가|현재가/);
  const strongMatches = strongGroups
    .map((group) => ({ ...group, matched: findAll(headers, group.patterns) }))
    .filter((group) => group.matched.length >= 2 && (group.type !== "news" || narrativePrimaryEligible));
  const newsIntentCols = [
    find(headers, /^headline$|^title$|^news$|^article$|^content$|^summary$|^description$|^body$|^story$|^post$|^tweet$|researchnote|analystnote|breaking|alert/),
    find(headers, /impact|impactscore|importance|severity|eventscore|marketimpact|shockscore|riskscore|attentionscore|threatlevel/),
    find(headers, /publishedat|timestamp|datetime|eventtime|releasetime|articletime|publishtime|detectedat|occurrencetime/),
    find(headers, /category|eventtype|narrativegroup|storytype|macrotype|newstype|tag/),
    find(headers, /pricereaction|marketreaction|volatilityspike|shockmove|drawdown|pricevelocity/),
  ].filter(Boolean);
  const sentimentIntentCols = [
    find(headers, /^sentiment$|sentimentscore|bullishsentiment|polarity|감성|심리/),
    find(headers, /mentions?|socialmentions|언급/),
    find(headers, /reddit|communityscore|레딧|커뮤니티/),
    find(headers, /newsscore|newssentiment|mediaimpact|headlinescore|뉴스|미디어|헤드라인/),
    find(headers, /socialvolume|buzzscore|buzz|hype|engagement|trendscore|feargreed|공포|탐욕/),
  ].filter(Boolean);
  const hasSentimentSemantic = sentimentIntentCols.length > 0;
  const socialPriorityBoost = sentimentIntentCols.length >= 2 ? 25 : 0;
  const portfolioFieldCount = [
    weightCol,
    qtyCol,
    avgPriceCol,
    marketValueCol,
    returnCol && /portfolio/.test(norm(returnCol)) ? returnCol : null,
    find(headers, /holdingvalue|holding_value|보유금액/),
    find(headers, /buyprice|purchaseprice|매수가/),
  ].filter(Boolean).length;
  const portfolioStructureExists = !!tickerCol && portfolioFieldCount >= 2;
  const portfolioFalsePositiveBlock = (hasSentimentSemantic || narrativePrimaryEligible) && !portfolioStructureExists;
  const scores: DatasetTypeScore[] = [];
  const rowCount = rows.length;
  const entityCount = uniqueCount(rows, tickerCol);
  const hasDate = !!dateCol;
  const ohlc = hasOhlcRelationship(rows, headers);
  const multiHolding = entityCount >= Math.min(5, Math.max(2, rowCount * 0.45));
  const weightQuality = validRatio(rows, weightCol);
  const returnQuality = validRatio(rows, returnCol);

  pushScore(scores, "ohlcv", ohlcvMatches.length >= 3 ? scoreBase("ohlcv") * 12 + (hasDate ? 16 : 0) + (ohlc ? 34 : 0) + (find(headers, /^volume$|거래량/) ? 10 : 0) - (weightCol ? 12 : 0) : 0, [
    ohlc ? "시가·고가·저가·종가 관계가 성립합니다." : "",
    hasDate ? "시간 축이 존재합니다." : "",
  ].filter(Boolean));
  pushScore(scores, "portfolio", !portfolioStructureExists || portfolioFalsePositiveBlock ? 0 : scoreBase("portfolio") * 8 + (weightCol && weightQuality > 0.55 ? 30 : 0) + (qtyCol ? 14 : 0) + (avgPriceCol || marketValueCol ? 12 : 0) + (multiHolding ? 18 : 0) + (sectorCol ? 8 : 0) + (returnCol && returnQuality > 0.45 ? 8 : 0) - (ohlc ? 28 : 0) - (hasSentimentSemantic ? 18 : 0), [
    weightCol ? "비중/노출 컬럼이 반복 보유자산과 연결됩니다." : "",
    portfolioStructureExists ? "티커와 2개 이상의 포트폴리오 구조 컬럼이 함께 존재합니다." : "티커만으로는 포트폴리오로 분류하지 않습니다.",
    portfolioFalsePositiveBlock ? "감성 신호가 존재하고 비중·수량·배분 구조가 없어 포트폴리오 후보를 차단했습니다." : "",
    multiHolding && portfolioStructureExists ? "행 의미가 여러 보유자산에 가깝습니다." : "",
    returnCol ? "비중과 수익률을 연결해 기여도를 계산할 수 있습니다." : "",
  ].filter(Boolean));
  pushScore(scores, "valuation", scoreBase("valuation") * 15 + (scoreBase("valuation") >= 2 ? 24 : 0) - (weightCol ? 32 : 0), [
    scoreBase("valuation") >= 2 ? "복수의 밸류에이션 배수가 존재합니다." : "",
    weightCol ? "단, 비중 구조가 있어 밸류에이션은 보조 메타데이터일 가능성이 큽니다." : "",
  ].filter(Boolean));
  pushScore(scores, "financial", scoreBase("financial") * 13 + (scoreBase("financial") >= 3 ? 20 : 0) + (hasDate ? 6 : 0), ["재무 성과/수익성 컬럼 비중을 평가했습니다."]);
  pushScore(scores, "flow", scoreBase("flow") * 14 + ((inflowCol || outflowCol || netflowCol) ? 18 : 0) - (weightCol ? 12 : 0), ["투자자 그룹 또는 순매수 관계를 평가했습니다."]);
  pushScore(scores, "short", scoreBase("short") * 22 + (find(headers, /borrowfee|borrowrate|대차/) ? 16 : 0), ["공매도 압력 및 대차 비용 컬럼을 평가했습니다."]);
  pushScore(scores, "options", scoreBase("options") * 13 + (find(headers, /strike|expiry|expiration|행사가|만기/) ? 16 : 0) + (find(headers, /openinterest|gamma|미결제/) ? 14 : 0), ["옵션 포지셔닝 고유 필드를 평가했습니다."]);
  pushScore(scores, "macro", scoreBase("macro") * 12 + (hasDate ? 8 : 0) - (weightCol ? 16 : 0), ["경제/시장 레짐 지표의 지배력을 평가했습니다."]);
  pushScore(scores, "sentiment", Math.min(100, (scoreBase("sentiment") * 16 + (find(headers, /mentions|buzz|언급/) ? 10 : 0) + (hasSentimentSemantic ? 18 : 0) + socialPriorityBoost) * (hasSentimentSemantic ? 1.45 : 1)), [
    hasSentimentSemantic ? "감성/소셜/미디어 신호가 데이터의 의미를 주도합니다." : "",
    socialPriorityBoost ? "둘 이상의 소셜 신호가 동시에 감지되어 센티먼트 우선순위를 높였습니다." : "",
    portfolioFalsePositiveBlock ? "비중·수량 구조가 없어 포트폴리오가 아니라 시장 심리 데이터로 해석합니다." : "",
  ].filter(Boolean));
  pushScore(scores, "onchain", scoreBase("onchain") * 16, ["블록체인 네트워크 활동 컬럼을 평가했습니다."]);
  pushScore(
    scores,
    "news",
    etfFlowRouteLocked
      ? 0
      : narrativePrimaryEligible
      ? Math.max(scoreBase("news") * 14 + (find(headers, /headline|title|제목/) ? 18 : 0) + (dateCol ? 6 : 0) - (weightCol ? 18 : 0), narrative.score)
      : Math.min(44, Math.max(scoreBase("news") * 14 + (find(headers, /headline|title|제목/) ? 18 : 0) + (dateCol ? 6 : 0) - (weightCol ? 18 : 0), narrative.score)),
    [
      ...(narrative.evidenceKo.length ? narrative.evidenceKo : ["뉴스/이벤트 내러티브 구조를 평가했습니다."]),
      narrativePrimaryEligible
        ? "뉴스 primary 승격 조건을 충족했습니다: 텍스트 구조, 의미 반복/키워드, 보조 이벤트 신호가 함께 존재합니다."
        : "단일 headline/title/text/timestamp만으로는 뉴스 primary를 고정하지 않고 보조 신호로만 반영합니다.",
    ]
  );
  pushScore(scores, "economic_calendar", scoreBase("economic_calendar") * 13 + (forecastCol && actualCol ? 30 : 0) + (previousCol ? 10 : 0), ["예상·실제·이전치 관계를 평가했습니다."]);
  pushScore(scores, "etf_flow", Math.max(etfForcedConfidence, scoreBase("etf_flow") * 11 + ((inflowCol || outflowCol || netflowCol) ? 24 : 0) + (aumCol ? 14 : 0) - (weightCol && !inflowCol && !outflowCol ? 20 : 0)), [
    etfFlowRouteLocked ? `ETF 코어 컬럼 ${etfCoreCount}개 감지: ${etfColumns.join(", ")}` : "ETF 자금 유입/유출 및 AUM 관계를 평가했습니다.",
    hasNetflowAumSector ? "netflow + AUM + sector_rotation 구조가 확인되어 ETF 플로우로 고정합니다." : "",
    hasInflowOutflowNetflow ? "etf_inflow + etf_outflow + netflow 관계가 확인되어 ETF 플로우로 고정합니다." : "",
  ].filter(Boolean));

  if (priceOnlyMatch) pushScore(scores, "price_only", 55, ["close/price만 존재하여 OHLCV가 아니라 가격 단일 컨텍스트로 처리합니다."]);
  strongMatches.forEach((match) => {
    const target = scores.find((s) => s.type === match.type);
    if (target) {
      target.confidence = Math.max(target.confidence, Math.min(100, 82 + match.matched.length * 4));
      target.evidenceKo = [`매칭 컬럼: ${match.matched.join(", ")}`, match.reasonKo];
    }
    match.blockers.forEach((blocked) => {
      const blockedScore = scores.find((s) => s.type === blocked);
      if (blockedScore && blockedScore.confidence < (target?.confidence ?? 0)) {
        blockedScore.confidence = 0;
        blockedScore.evidenceKo = [`${match.labelKo} 의미 구조가 더 강해 ${LABEL_KO[blocked]} 템플릿을 차단했습니다.`];
      }
    });
  });
  if (etfFlowRouteLocked) {
    const etfScore = scores.find((s) => s.type === "etf_flow");
    const newsScore = scores.find((s) => s.type === "news");
    const portfolioScore = scores.find((s) => s.type === "portfolio");
    const flowScore = scores.find((s) => s.type === "flow");
    if (etfScore) {
      etfScore.confidence = Math.max(etfScore.confidence, etfForcedConfidence);
      etfScore.evidenceKo = [
        `ETF 코어 컬럼 ${etfCoreCount}개가 감지되어 ETF_FLOW_ENGINE 라우팅을 고정했습니다.`,
        `매칭 컬럼: ${etfColumns.join(", ")}`,
        hasNetflowAumSector ? "netflow + AUM + sector_rotation 조합은 ETF 유동성/섹터 회전 구조입니다." : "",
        hasInflowOutflowNetflow ? "etf_inflow + etf_outflow + netflow 조합은 펀드 플로우 관계입니다." : "",
      ].filter(Boolean);
    }
    if (newsScore) {
      newsScore.confidence = 0;
      newsScore.evidenceKo = ["ETF 코어 플로우 구조가 충분해 뉴스/내러티브 엔진을 차단했습니다. etf_name, sector, market_regime, alpha_signal, confidence_level은 ETF 보조 메타데이터입니다."];
    }
    if (portfolioScore && !weightCol) {
      portfolioScore.confidence = Math.min(portfolioScore.confidence, 25);
      portfolioScore.evidenceKo = ["ETF 플로우 구조가 지배적이며 포트폴리오 비중/수량 구조가 없어 포트폴리오 템플릿을 보조 신호로 낮췄습니다."];
    }
    if (flowScore) {
      flowScore.confidence = Math.min(flowScore.confidence, 65);
      flowScore.evidenceKo = ["일반 수급 구조보다 ETF 전용 AUM/순유입/섹터 회전 구조가 더 강해 보조 플로우 신호로만 사용합니다."];
    }
  }
  if (narrativePrimaryEligible) {
    const newsScore = scores.find((s) => s.type === "news");
    const portfolioScore = scores.find((s) => s.type === "portfolio");
    const ohlcvScore = scores.find((s) => s.type === "ohlcv");
    if (newsScore) {
      newsScore.confidence = Math.max(newsScore.confidence, Math.min(100, Math.max(88 + newsIntentCols.length * 4, narrative.score + 35)));
      newsScore.evidenceKo = [
        newsIntentCols.length ? `뉴스/이벤트 매칭 컬럼: ${newsIntentCols.join(", ")}` : "텍스트/내러티브 구조 우선 감지",
        ...narrative.evidenceKo,
        "뉴스 우선 분류 레이어가 숫자 컬럼보다 내러티브·이벤트 흐름을 우선합니다.",
      ];
    }
    if (portfolioScore && !portfolioStructureExists) {
      portfolioScore.confidence = 0;
      portfolioScore.evidenceKo = ["뉴스/이벤트 구조가 강하고 비중·수량·배분 구조가 없어 포트폴리오 템플릿을 차단했습니다."];
    }
    if (ohlcvScore) {
      ohlcvScore.confidence = Math.min(ohlcvScore.confidence, 55);
      ohlcvScore.evidenceKo = ["가격/OHLCV 컬럼이 있더라도 텍스트·이벤트 시퀀스가 지배적이므로 가격 데이터는 하이브리드 보조 컨텍스트로만 사용합니다."];
    }
  }
  const sorted = scores.sort((a, b) => b.confidence - a.confidence);
  if (portfolioFalsePositiveBlock) {
    const portfolioScore = sorted.find((s) => s.type === "portfolio");
    if (portfolioScore) {
      portfolioScore.confidence = 0;
      portfolioScore.evidenceKo = ["감성 신호가 존재하고 포트폴리오 핵심 구조가 없어 포트폴리오 분류를 차단했습니다."];
    }
    sorted.sort((a, b) => b.confidence - a.confidence);
  }
  const primaryCandidate: DatasetTypeScore | undefined = sorted[0]?.type === "news" && !narrativePrimaryEligible
    ? sorted.find((score) => score.type !== "news" && score.confidence >= 30)
    : sorted[0];
  const primary = primaryCandidate && primaryCandidate.confidence > 0 ? primaryCandidate : { type: "generic" as const, labelKo: LABEL_KO.generic, confidence: 25, evidenceKo: ["지배적인 금융/내러티브 구조가 약해 generic을 마지막 수단으로 선택했습니다."] };
  const secondarySignals = sorted.filter((s) => s.type !== primary.type && s.confidence >= 30).slice(0, 4);
  const blockedTypes = Array.from(new Set([
    ...(portfolioFalsePositiveBlock ? ["portfolio" as DatasetPrimaryType] : []),
    ...(etfFlowRouteLocked ? ["news" as DatasetPrimaryType] : []),
    ...scores.filter((s) => s.confidence === 0 && s.evidenceKo.some((e) => /차단/.test(e))).map((s) => s.type),
  ]));
  const confidenceScores = Object.fromEntries(sorted.map((s) => [s.type, s.confidence]));
  const suppressedEngines = (Object.keys(ENGINE_BY_TYPE) as DatasetPrimaryType[])
    .filter((type) => type !== primary.type && type !== "generic")
    .map((type) => ENGINE_BY_TYPE[type]);
  const supportingMetadataKo = [];
  if (primary.type === "portfolio" && scoreBase("valuation") > 0) supportingMetadataKo.push("PER/PBR/PEG 등 밸류에이션 컬럼은 포트폴리오 보조 메타데이터로 처리합니다.");
  if (primary.type === "ohlcv" && tickerCol) supportingMetadataKo.push("티커 컬럼은 가격 시계열의 식별자이며 포트폴리오 분류 근거가 아닙니다.");
  if (primary.type !== "portfolio" && sectorCol) supportingMetadataKo.push("섹터 컬럼은 설명 메타데이터로만 사용합니다.");
  if (primary.type === "sentiment") supportingMetadataKo.push("티커·섹터가 있더라도 비중/수량 구조가 없으면 시장 심리 및 군중 행동 분석으로 처리합니다.");

  if (primary.type === "news") supportingMetadataKo.push("가격·매크로·옵션·소셜 컬럼이 함께 있어도 핵심 구조는 내러티브 흐름이며, 해당 컬럼은 이벤트 반응/증폭 보조 컨텍스트로 처리합니다.");

  const meta = structuralMeta(primary.type, sorted, headers);
  const secondaryContextKo = [
    ...(priceOnlyMatch ? ["단일 가격 컬럼은 보조 컨텍스트이며 OHLCV 템플릿을 활성화하지 않습니다."] : []),
    ...(primary.type === "news" && narrative.hybridContexts.length ? [`하이브리드 이벤트 모드: ${narrative.hybridContexts.join(", ")}`] : []),
    ...(primary.type === "news" ? [`Narrative Confidence: ${narrative.score}%`] : []),
  ];
  return {
    primaryType: primary.type,
    primaryLabelKo: primary.labelKo,
    confidence: primary.confidence,
    scores: sorted,
    secondarySignals,
    supportingMetadataKo,
    matchedColumns: primary.evidenceKo.flatMap((e) => e.startsWith("매칭 컬럼:") ? e.replace("매칭 컬럼:", "").split(",").map((x) => x.trim()) : []),
    blockedTypes,
    selectedEngine: ENGINE_BY_TYPE[primary.type],
    suppressedEngines,
    secondaryContextKo,
    ...meta,
    confidenceScores,
    classificationReason: `${primary.labelKo}로 분류했습니다. ${primary.evidenceKo[0] ?? "가장 높은 구조 confidence를 획득했습니다."}`,
    reasonKo: `${primary.labelKo}로 분류했습니다. ${primary.evidenceKo[0] ?? "가장 높은 구조 confidence를 획득했습니다."}`,
  };
}
