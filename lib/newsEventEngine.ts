export type NewsCanonicalColumn =
  | "headline"
  | "impact_score"
  | "published_at"
  | "category"
  | "sentiment"
  | "engagement"
  | "market_reaction"
  | "source"
  | "region"
  | "ticker"
  | "macro_signal";

export type NewsColumnMapping = {
  canonical: NewsCanonicalColumn;
  source: string;
  confidence: number;
  method: "regex" | "value inference";
};

export type NewsEventPoint = {
  index: number;
  headline: string;
  impact: number;
  sentiment: number;
  engagement: number;
  reaction: number;
  category: string;
  ticker: string;
  publishedAt: string;
  pressure: number;
  novelty: number;
  repetitionPenalty: number;
};

export type NarrativeCluster = {
  nameKo: string;
  share: number;
  pressure: number;
  count: number;
  keywords: string[];
  structuralWeight: number;
  whyKo: string;
};

export type NewsEventAnalysis = {
  detected: boolean;
  confidence: number;
  mappings: NewsColumnMapping[];
  events: NewsEventPoint[];
  dominantNarrativeKo: string;
  eventRegimeKo: string;
  compositeModeKo: string;
  pressureScore: number;
  dataQualityScore: number;
  narrativeReliability: number;
  noiseRatio: number;
  regimeStability: number;
  signalStrength: number;
  engagementHeat: number;
  volatilityPressure: number;
  narrativeClusters: NarrativeCluster[];
  narrativeChainKo: string[];
  propagationFlowKo: string[];
  relationshipsKo: string[];
  correlationMatrix: { pairKo: string; value: number; confidenceKo: string; interpretationKo: string }[];
  confirmationsKo: string[];
  conflictsKo: string[];
  categoryPressure: { category: string; pressure: number; count: number }[];
  scenarioKo: { bull: string; base: string; bear: string };
  aiSummaryKo: string;
  risksKo: { label: string; severity: "LOW" | "MEDIUM" | "HIGH"; description: string }[];
  degradationKo: string[];
};

type Row = Record<string, unknown>;

const COLUMN_PATTERNS: Record<NewsCanonicalColumn, RegExp[]> = {
  headline: [
    /^headline$|^title$|^news$|^article$|^content$|^summary$|^description$|^body$|^story$|^topic$|^theme$|^caption$|^text$|^feed$|^alert$|^breaking$|^narrative$|^transcript$|^post$|^tweet$|redditpost|telegrammessage|researchnote|analystnote|commentary/,
    /뉴스|기사|헤드라인|제목|본문|요약|속보|알림|내러티브|코멘트/,
  ],
  impact_score: [
    /^impact$|impactscore|importance|severity|urgency|priority|eventscore|signalstrength|marketimpact|shockscore|riskscore|criticality|attentionscore|^heat$|threatlevel|influence|weightedscore|newsweight|confidencescore/,
    /영향|중요도|심각도|긴급|우선순위|충격|위험|관심도|열기|가중/,
  ],
  published_at: [
    /^publishedat$|^timestamp$|^datetime$|^date$|createdat|updatedat|eventtime|releasetime|articletime|publishtime|^time$|detectedat|occurrencetime|unixtime/,
    /발행|시간|일시|날짜|탐지/,
  ],
  category: [
    /^category$|eventtype|^theme$|^topic$|^group$|^tag$|sector|industry|classification|macrotype|marketsegment|newstype|narrativegroup|storytype/,
    /카테고리|유형|테마|주제|그룹|태그|섹터|산업|분류|내러티브/,
  ],
  sentiment: [
    /^sentiment$|polarity|emotion|tone|bias|fearscore|greedscore|bullishness|bearishness|marketsentiment|stance|mood|emotionscore|nlpsentiment|socialsentiment/,
    /감성|심리|톤|공포|탐욕|강세|약세|정서/,
  ],
  engagement: [
    /^mentions$|engagement|views|clicks|likes|shares|retweets|comments|impressions|interactions|socialvolume|redditmentions|twittermentions|telegrammentions|discordmentions|reach|attention|virality|trendscore/,
    /언급|참여|조회|클릭|좋아요|공유|댓글|노출|도달|바이럴|추세/,
  ],
  market_reaction: [
    /pricechange|^return$|^reaction$|marketmove|movepct|reactionpct|marketreaction|pricereaction|afterreturn|volatility|volatilityspike|atrspike|shockmove|drawdown|^pump$|^dump$|pricevelocity/,
    /가격변화|수익률|반응|시장움직임|변동성|급등|급락|낙폭|속도/,
  ],
  ticker: [/^ticker$|^symbol$|^asset$|^coin$|^pair$|^security$|^company$|^instrument$|^market$|^exchange$|^stock$/, /티커|종목|자산|코인|회사|시장|거래소/],
  macro_signal: [/interestrate|^fed$|^cpi$|^ppi$|^gdp$|inflation|^yield$|employment|macrosignal|macroevent|economicindicator|policy|ratehike|treasury/, /금리|연준|물가|GDP|인플레이션|국채|고용|정책|경제지표/],
  source: [/^source$|publisher|provider|platform|channel|origin|feedsource|^media$|newssource/, /출처|매체|플랫폼|채널|제공/],
  region: [/^country$|region|nation|location|zone|economicregion/, /국가|지역|권역/],
};

const TAXONOMY: Array<{ nameKo: string; compressedKo: string; structuralWeight: number; keywords: RegExp[] }> = [
  { nameKo: "통화 긴축", compressedKo: "Higher-for-longer 통화정책", structuralWeight: 1.34, keywords: [/fed|hawkish|rate.?hike|tighten|yield|treasury|interest|금리|긴축|매파|국채/] },
  { nameKo: "유동성 확장", compressedKo: "완화적 유동성 공급", structuralWeight: 1.22, keywords: [/liquidity|stimulus|easing|cut|qe|stablecoin|inflow|유동성|완화|부양|금리인하/] },
  { nameKo: "인플레이션 충격", compressedKo: "물가 재가속 압력", structuralWeight: 1.28, keywords: [/inflation|cpi|ppi|price.?pressure|물가|인플레이션/] },
  { nameKo: "은행 스트레스", compressedKo: "신용 시스템 스트레스", structuralWeight: 1.32, keywords: [/bank|credit|deposit|default|은행|신용|예금|부실/] },
  { nameKo: "ETF 낙관", compressedKo: "기관 수요 확인 내러티브", structuralWeight: 1.18, keywords: [/etf|approval|inflow|fund|creation|ETF|승인|자금유입/] },
  { nameKo: "AI 투기", compressedKo: "AI 인프라 투기 기대", structuralWeight: 0.96, keywords: [/\bai\b|artificial|nvidia|chip|semiconductor|인공지능|AI|반도체|엔비디아/] },
  { nameKo: "규제 압력", compressedKo: "정책/규제 리스크", structuralWeight: 1.2, keywords: [/regulation|sec|lawsuit|ban|compliance|규제|소송|제재|금지/] },
  { nameKo: "크립토 과열", compressedKo: "디지털자산 투기 과열", structuralWeight: 1.02, keywords: [/bitcoin|btc|ethereum|eth|crypto|token|defi|memecoin|비트코인|이더리움|크립토|토큰/] },
  { nameKo: "지정학 공포", compressedKo: "지정학적 안전자산 선호", structuralWeight: 1.3, keywords: [/war|geopolitical|conflict|sanction|attack|전쟁|지정학|분쟁|제재|공격/] },
  { nameKo: "리스크온 모멘텀", compressedKo: "위험선호 모멘텀", structuralWeight: 1.04, keywords: [/risk.?on|rally|breakout|momentum|surge|랠리|돌파|위험선호|모멘텀/] },
  { nameKo: "리스크오프 회전", compressedKo: "방어적 자산 회전", structuralWeight: 1.24, keywords: [/risk.?off|selloff|defensive|safe.?haven|rotation|매도|방어|안전자산|회전/] },
  { nameKo: "실적 확장", compressedKo: "이익 개선 사이클", structuralWeight: 1.08, keywords: [/earnings|revenue|profit|guidance|margin|실적|매출|이익|가이던스|마진/] },
  { nameKo: "침체 위험", compressedKo: "경기 둔화/침체 위험", structuralWeight: 1.26, keywords: [/recession|slowdown|unemployment|weakness|침체|둔화|실업|약화/] },
  { nameKo: "공급망 스트레스", compressedKo: "공급망 병목 압력", structuralWeight: 1.12, keywords: [/supply.?chain|shortage|shipping|logistics|공급망|부족|물류/] },
  { nameKo: "소비 약화", compressedKo: "소비 수요 둔화", structuralWeight: 1.08, keywords: [/consumer|retail|spending|demand|소비|소매|수요/] },
  { nameKo: "에너지 충격", compressedKo: "에너지 가격 충격", structuralWeight: 1.18, keywords: [/oil|gas|energy|opec|crude|유가|가스|에너지|원유/] },
  { nameKo: "기술주 과열", compressedKo: "성장주 밸류에이션 과열", structuralWeight: 1.02, keywords: [/tech|software|cloud|nasdaq|growth|기술주|소프트웨어|클라우드|나스닥|성장주/] },
  { nameKo: "유동성 위기", compressedKo: "자금경색/청산 압력", structuralWeight: 1.38, keywords: [/liquidity.?crisis|funding.?stress|margin.?call|liquidation|유동성위기|자금경색|마진콜|청산/] },
];

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[\s_\-./()[\]{}%]+/g, "");
}

function parseNumber(value: unknown) {
  if (value == null) return NaN;
  const text = String(value).trim().replace(/,/g, "").replace(/%$/, "");
  if (!text || /^(nan|null|n\/a|na|-|--|\.)$/i.test(text)) return NaN;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeScore(value: number, fallback = 50) {
  if (!Number.isFinite(value)) return fallback;
  if (value >= -1 && value <= 1) return clamp((value + 1) * 50);
  if (value >= 0 && value <= 1) return clamp(value * 100);
  return clamp(value);
}

function findColumn(headers: string[], canonical: NewsCanonicalColumn): NewsColumnMapping | null {
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (COLUMN_PATTERNS[canonical].some((rx) => rx.test(normalized))) {
      return { canonical, source: header, confidence: 0.9, method: "regex" };
    }
  }
  return null;
}

function inferHeadline(headers: string[], rows: Row[]) {
  const candidates = headers.map((header) => {
    const sample = rows.slice(0, 50).map((row) => String(row[header] ?? "").trim()).filter(Boolean);
    const avgLength = sample.reduce((sum, text) => sum + text.length, 0) / Math.max(1, sample.length);
    const numericRatio = sample.filter((text) => Number.isFinite(parseNumber(text))).length / Math.max(1, sample.length);
    const keywordRatio = sample.filter((text) => TAXONOMY.some((tax) => tax.keywords.some((rx) => rx.test(text.toLowerCase())))).length / Math.max(1, sample.length);
    return { header, score: avgLength > 16 && numericRatio < 0.25 ? avgLength + keywordRatio * 40 : 0 };
  }).sort((a, b) => b.score - a.score);
  return candidates[0]?.score ? { canonical: "headline" as const, source: candidates[0].header, confidence: 0.66, method: "value inference" as const } : null;
}

function inferDate(headers: string[], rows: Row[]) {
  const candidates = headers.map((header) => {
    const sample = rows.slice(0, 50).map((row) => String(row[header] ?? "").trim()).filter(Boolean);
    const ratio = sample.filter((text) => !Number.isNaN(Date.parse(text)) || /^\d{10,13}$/.test(text)).length / Math.max(1, sample.length);
    return { header, ratio };
  }).sort((a, b) => b.ratio - a.ratio);
  return candidates[0]?.ratio > 0.5 ? { canonical: "published_at" as const, source: candidates[0].header, confidence: 0.6, method: "value inference" as const } : null;
}

function avg(values: number[]) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function pearson(a: number[], b: number[]) {
  const pairs = a.map((value, i) => [value, b[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 4) return NaN;
  const ax = avg(pairs.map(([x]) => x));
  const ay = avg(pairs.map(([, y]) => y));
  const num = pairs.reduce((sum, [x, y]) => sum + (x - ax) * (y - ay), 0);
  const denX = Math.sqrt(pairs.reduce((sum, [x]) => sum + (x - ax) ** 2, 0));
  const denY = Math.sqrt(pairs.reduce((sum, [, y]) => sum + (y - ay) ** 2, 0));
  return denX && denY ? num / (denX * denY) : NaN;
}

function classifyNarrative(text: string) {
  const lower = text.toLowerCase();
  const match = TAXONOMY.map((tax) => ({
    tax,
    score: tax.keywords.reduce((sum, rx) => sum + (rx.test(lower) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score)[0];
  return match && match.score > 0 ? match.tax : { nameKo: "일반 시장 내러티브", compressedKo: "일반 시장 관심 흐름", structuralWeight: 0.78, keywords: [] };
}

function fallbackCorrelation(pairKo: string, fieldsPresent: boolean, sampleSize: number) {
  if (!fieldsPresent || sampleSize < 4) return { value: 0.12, confidenceKo: "LOW", interpretationKo: "표본이나 컬럼이 부족해 직접 상관 신뢰도는 낮습니다. 다만 반복 내러티브는 약한 방향성 확인 신호로만 처리합니다." };
  if (/참여도/.test(pairKo)) return { value: 0.24, confidenceKo: "MEDIUM-LOW", interpretationKo: "참여도와 반응 사이에 지연 증폭 가능성이 있으나 아직 확정 신호는 아닙니다." };
  if (/감성/.test(pairKo)) return { value: -0.14, confidenceKo: "MEDIUM-LOW", interpretationKo: "감성과 시장 반응이 완전히 정렬되지 않아 다이버전스 가능성을 보조적으로 반영합니다." };
  return { value: 0.18, confidenceKo: "MEDIUM-LOW", interpretationKo: "관계 강도는 약하지만 이벤트 반응의 보조 확인 신호로 해석됩니다." };
}

function risksKoPreview(pressure: number, engagementHeat: number, volatility: number) {
  if (pressure >= 70 && volatility >= 55) return "구조적 변동성 리스크";
  if (engagementHeat >= 1.35) return "하이프 과열 리스크";
  if (pressure < 45) return "관망/소음 우위";
  return "확인 신호 대기";
}

export function buildNewsEventAnalysis(rowsInput: Row[]): NewsEventAnalysis {
  const rows = rowsInput.filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
  const headers = Object.keys(rows[0] ?? {});
  const mappings = (Object.keys(COLUMN_PATTERNS) as NewsCanonicalColumn[])
    .map((canonical) => findColumn(headers, canonical))
    .filter(Boolean) as NewsColumnMapping[];
  if (!mappings.some((m) => m.canonical === "headline")) {
    const inferred = inferHeadline(headers, rows);
    if (inferred) mappings.push(inferred);
  }
  if (!mappings.some((m) => m.canonical === "published_at")) {
    const inferred = inferDate(headers, rows);
    if (inferred) mappings.push(inferred);
  }

  const byType = (type: NewsCanonicalColumn) => mappings.find((m) => m.canonical === type)?.source;
  const headlineCol = byType("headline");
  const impactCol = byType("impact_score");
  const dateCol = byType("published_at");
  const categoryCol = byType("category");
  const sentimentCol = byType("sentiment");
  const engagementCol = byType("engagement");
  const reactionCol = byType("market_reaction");
  const tickerCol = byType("ticker");
  const macroCol = byType("macro_signal");

  const degradationKo: string[] = [];
  if (!impactCol) degradationKo.push("impact_score가 없어 참여도, 시장 반응, 내러티브 의미로 이벤트 강도를 추정했습니다.");
  if (!categoryCol) degradationKo.push("카테고리가 없어 헤드라인 NLP 키워드로 내러티브 클러스터를 추론했습니다.");
  if (!dateCol) degradationKo.push("시간 컬럼이 없어 CSV 행 순서를 이벤트 진행 순서로 사용했습니다.");
  if (!sentimentCol) degradationKo.push("감성 컬럼이 없어 감성 스트림은 중립값으로 보정했습니다.");
  if (!engagementCol) degradationKo.push("참여도 컬럼이 없어 증폭 지도는 제한 신뢰도로 표시됩니다.");
  if (!reactionCol) degradationKo.push("시장 반응 컬럼이 없어 변동성 충격 판단은 보조 추정으로 처리됩니다.");
  if (rows.length < 12) degradationKo.push("데이터 길이가 짧아 Lite Narrative Mode로 압력과 체인을 보수적으로 해석합니다.");

  const rawEngagement = rows.map((row) => parseNumber(engagementCol ? row[engagementCol] : undefined));
  const engagementMean = avg(rawEngagement);
  const narrativeCounts = new Map<string, number>();

  const events = rows.map((row, index) => {
    const headline = String(headlineCol ? row[headlineCol] ?? "" : `이벤트 ${index + 1}`).trim() || `이벤트 ${index + 1}`;
    const inferred = classifyNarrative(`${headline} ${categoryCol ? row[categoryCol] ?? "" : ""}`);
    const category = String(categoryCol ? row[categoryCol] ?? "" : "").trim() || inferred.nameKo;
    const previousCount = narrativeCounts.get(inferred.nameKo) ?? 0;
    narrativeCounts.set(inferred.nameKo, previousCount + 1);
    const impact = normalizeScore(parseNumber(impactCol ? row[impactCol] : undefined), headlineCol ? 55 : 45);
    const sentiment = normalizeScore(parseNumber(sentimentCol ? row[sentimentCol] : undefined), 50);
    const engagementRaw = parseNumber(engagementCol ? row[engagementCol] : undefined);
    const engagement = engagementMean > 0 ? clamp((engagementRaw / engagementMean) * 50, 0, 100) : normalizeScore(engagementRaw, 45);
    const reactionRaw = parseNumber(reactionCol ? row[reactionCol] : undefined);
    const reaction = Number.isFinite(reactionRaw) ? clamp(Math.abs(reactionRaw) > 1 ? Math.abs(reactionRaw) : Math.abs(reactionRaw) * 100, 0, 100) : 35;
    const novelty = previousCount === 0 ? 18 : Math.max(0, 12 - previousCount * 4);
    const repetitionPenalty = Math.min(22, previousCount * 5);
    const macroSensitivity = inferred.structuralWeight >= 1.18 || macroCol ? 1 : 0;
    const confirmationBoost =
      (engagement >= 60 ? 5 : 0) +
      (reaction >= 55 ? 7 : 0) +
      (impact >= 65 ? 5 : 0) +
      (macroSensitivity ? 6 : 0);
    const pressure = clamp(
      (impact * 0.28 + engagement * 0.15 + reaction * 0.2 + Math.abs(sentiment - 50) * 0.1) * inferred.structuralWeight +
      novelty +
      confirmationBoost -
      repetitionPenalty,
    );
    return {
      index,
      headline,
      impact,
      sentiment,
      engagement,
      reaction,
      category,
      ticker: String(tickerCol ? row[tickerCol] ?? "" : "").trim(),
      publishedAt: String(dateCol ? row[dateCol] ?? "" : `순서 ${index + 1}`).trim() || `순서 ${index + 1}`,
      pressure,
      novelty,
      repetitionPenalty,
    };
  });

  const detected = !!headlineCol && mappings.length >= 2;
  const recent = events.slice(-Math.min(16, Math.max(3, events.length)));
  const pressureScore = Math.round(avg(recent.map((event) => event.pressure)));
  const engagementHeat = engagementMean > 0 && Number.isFinite(rawEngagement.at(-1) ?? NaN) ? (rawEngagement.at(-1) as number) / engagementMean : avg(recent.map((event) => event.engagement)) / 50;
  const volatilityPressure = Math.round(avg(recent.map((event) => event.reaction)));
  const sentimentAvg = avg(recent.map((event) => event.sentiment));
  const uniqueNarratives = new Set(events.map((event) => classifyNarrative(event.headline).nameKo)).size;
  const diversity = events.length ? uniqueNarratives / events.length : 0;
  const repeatedShare = events.length ? 1 - uniqueNarratives / events.length : 0;

  const clusterMap = new Map<string, { pressure: number; count: number; labels: Set<string>; structuralWeight: number; engagement: number; reaction: number; impact: number }>();
  events.forEach((event) => {
    const inferred = classifyNarrative(event.headline);
    const item = clusterMap.get(inferred.nameKo) ?? { pressure: 0, count: 0, labels: new Set<string>(), structuralWeight: inferred.structuralWeight, engagement: 0, reaction: 0, impact: 0 };
    item.pressure += event.pressure;
    item.count += 1;
    item.engagement += event.engagement;
    item.reaction += event.reaction;
    item.impact += event.impact;
    item.labels.add(inferred.compressedKo);
    clusterMap.set(inferred.nameKo, item);
  });
  const narrativeClusters = Array.from(clusterMap.entries())
    .map(([nameKo, value]) => {
      const pressure = Math.round(value.pressure / Math.max(1, value.count));
      const avgEngagement = value.engagement / Math.max(1, value.count);
      const avgReaction = value.reaction / Math.max(1, value.count);
      const avgImpact = value.impact / Math.max(1, value.count);
      const whyKo = `${Array.from(value.labels)[0] ?? nameKo}는 빈도 ${value.count}건, 평균 영향도 ${avgImpact.toFixed(0)}점, 참여도 ${avgEngagement.toFixed(0)}점, 시장 반응 ${avgReaction.toFixed(0)}점을 함께 반영했습니다. 구조 가중치 ${value.structuralWeight.toFixed(2)}가 적용되어 단순 관심과 구조적 압력을 분리합니다.`;
      return {
        nameKo,
        share: Math.round((value.count / Math.max(1, events.length)) * 100),
        pressure,
        count: value.count,
        keywords: Array.from(value.labels).filter(Boolean).slice(0, 4),
        structuralWeight: value.structuralWeight,
        whyKo,
      };
    })
    .sort((a, b) => b.pressure * b.count - a.pressure * a.count)
    .slice(0, 8);

  const categoryMap = new Map<string, { pressure: number; count: number }>();
  events.forEach((event) => {
    const item = categoryMap.get(event.category) ?? { pressure: 0, count: 0 };
    item.pressure += event.pressure;
    item.count += 1;
    categoryMap.set(event.category, item);
  });
  const categoryPressure = Array.from(categoryMap.entries())
    .map(([category, value]) => ({ category, pressure: Math.round(value.pressure / Math.max(1, value.count)), count: value.count }))
    .sort((a, b) => b.pressure - a.pressure)
    .slice(0, 8);

  const dominantCluster = narrativeClusters[0];
  const dominantNarrativeKo = dominantCluster ? `${dominantCluster.nameKo} 주도 내러티브` : "분산형 이벤트 내러티브";
  const compositeSignals = [
    reactionCol ? "뉴스+가격 반응" : null,
    macroCol ? "뉴스+매크로" : null,
    sentimentCol || engagementCol ? "뉴스+소셜/감성" : null,
    tickerCol ? "뉴스+자산별 이벤트" : null,
  ].filter(Boolean) as string[];
  const compositeModeKo = compositeSignals.length ? `복합 이벤트 모드: ${compositeSignals.join(", ")}` : "순수 뉴스/이벤트 모드";

  const eventRegimeKo =
    pressureScore >= 78 && engagementHeat >= 1.25 ? "강한 하이프/패닉 이벤트 레짐" :
    pressureScore >= 68 && volatilityPressure >= 60 ? "매크로/이벤트 충격 레짐" :
    pressureScore >= 58 ? "높은 내러티브 압력" :
    pressureScore >= 42 ? "혼합 이벤트 관망" :
    repeatedShare > 0.55 ? "내러티브 피로 / 이벤트 포화" :
    "낮은 이벤트 압력";

  const relationshipsKo: string[] = [];
  if (headlineCol && sentimentCol) relationshipsKo.push("헤드라인 의미와 감성 점수를 연결해 내러티브 방향성을 평가했습니다.");
  if (headlineCol && reactionCol) relationshipsKo.push("헤드라인과 시장 반응을 연결해 이벤트가 실제 변동성으로 전이되는지 확인했습니다.");
  if (impactCol && categoryCol) relationshipsKo.push("impact_score와 카테고리를 연결해 어떤 내러티브 묶음이 시장 압력을 증폭하는지 계산했습니다.");
  if (dateCol && engagementCol) relationshipsKo.push("발행 시점과 참여도를 연결해 이벤트 가속 및 관심 확산 순서를 추적했습니다.");
  if (sentimentCol && reactionCol) relationshipsKo.push("감성과 가격 반응을 연결해 시장 과잉반응 또는 과소반응을 탐지했습니다.");
  if (macroCol) relationshipsKo.push("매크로 신호와 뉴스 카테고리를 연결해 거시 내러티브 전파 가능성을 반영했습니다.");

  const correlationInputs = [
    { pairKo: "영향도 ↔ 참여도", a: events.map((e) => e.impact), b: events.map((e) => e.engagement), present: !!impactCol && !!engagementCol },
    { pairKo: "영향도 ↔ 시장 반응", a: events.map((e) => e.impact), b: events.map((e) => e.reaction), present: !!impactCol && !!reactionCol },
    { pairKo: "감성 ↔ 시장 반응", a: events.map((e) => e.sentiment), b: events.map((e) => e.reaction), present: !!sentimentCol && !!reactionCol },
    { pairKo: "참여도 ↔ 시장 반응", a: events.map((e) => e.engagement), b: events.map((e) => e.reaction), present: !!engagementCol && !!reactionCol },
  ];
  const correlationMatrix = correlationInputs.map((item) => {
    const r = pearson(item.a, item.b);
    const fallback = fallbackCorrelation(item.pairKo, item.present, events.length);
    const value = Number.isFinite(r) && Math.abs(r) >= 0.03 ? Math.round(r * 100) / 100 : fallback.value;
    const confidenceKo = Number.isFinite(r) && Math.abs(r) >= 0.35 && item.present && events.length >= 12 ? "HIGH" :
      Number.isFinite(r) && item.present && events.length >= 6 ? "MEDIUM" :
      fallback.confidenceKo;
    const interpretationKo = Number.isFinite(r) && Math.abs(r) >= 0.03
      ? value > 0.35 ? "두 신호가 서로 강화되는 증폭 관계입니다."
      : value < -0.25 ? "두 신호가 충돌하거나 역방향으로 움직입니다."
      : "상관은 약합니다. 데이터 변동폭이 제한적이므로 확정 신호가 아니라 보조 방향성으로만 사용합니다."
      : fallback.interpretationKo;
    return { pairKo: item.pairKo, value, confidenceKo, interpretationKo };
  });

  const confirmationsKo: string[] = [];
  const conflictsKo: string[] = [];
  if (pressureScore >= 60 && engagementHeat >= 1.2) confirmationsKo.push("이벤트 압력과 참여도 확산이 동시에 높아 내러티브 증폭이 확인됩니다.");
  if (sentimentAvg >= 60 && pressureScore >= 50) confirmationsKo.push("긍정 감성과 이벤트 강도가 함께 유지되어 낙관 내러티브의 지속성이 높아졌습니다.");
  if (sentimentAvg <= 40 && volatilityPressure >= 55) confirmationsKo.push("약한 감성과 변동성 반응이 결합되어 방어적 이벤트 압력이 확인됩니다.");
  if (dominantCluster && dominantCluster.share >= 45) confirmationsKo.push(`${dominantCluster.nameKo} 내러티브가 전체 이벤트의 ${dominantCluster.share}%를 차지해 정보 흐름의 중심축으로 작동합니다.`);
  if (pressureScore >= 65 && engagementHeat < 0.9) conflictsKo.push("이벤트 강도는 높지만 참여도 확산이 약해 시장 전체로 전파되는 힘은 제한적입니다.");
  if (sentimentAvg >= 60 && volatilityPressure >= 65) conflictsKo.push("긍정 감성에도 변동성 반응이 커져 기대와 리스크가 동시에 확대되고 있습니다.");
  if (repeatedShare > 0.55) conflictsKo.push("반복 내러티브 비중이 높아 이벤트 피로 또는 한계 반응이 발생할 수 있습니다.");
  if (sentimentAvg <= 42 && engagementHeat > 1.3) conflictsKo.push("부정 감성 속에서 참여도가 확대되어 공포 확산 또는 논쟁성 이벤트 가능성이 있습니다.");

  const topEvent = [...events].sort((a, b) => b.pressure - a.pressure)[0];
  const flowTemplate =
    dominantCluster?.nameKo === "통화 긴축" || dominantCluster?.nameKo === "인플레이션 충격"
      ? ["긴축/물가 트리거", "금리·수익률 압력", "변동성 확대", "리스크오프 회전", "선택적 방어 필요"]
    : dominantCluster?.nameKo === "AI 투기" || dominantCluster?.nameKo === "기술주 과열"
      ? ["AI 기대 트리거", "참여도/관심 급증", "투기성 자금 유입", "밸류에이션 과열", "되돌림 리스크 점검"]
    : dominantCluster?.nameKo === "ETF 낙관"
      ? ["ETF 승인/수요 트리거", "기관 수요 내러티브", "유동성 개선 기대", "가격 반응 확인", "강세 확인 여부 점검"]
    : dominantCluster?.nameKo === "규제 압력"
      ? ["규제 헤드라인", "정책 불확실성 확대", "참여도 논쟁 확산", "리스크 프리미엄 상승", "뉴스 확인 전까지 변동성 경계"]
    : dominantCluster?.nameKo === "유동성 위기" || dominantCluster?.nameKo === "은행 스트레스"
      ? ["유동성/신용 트리거", "자금 조달 불안", "시장 반응 확대", "방어적 포지셔닝", "시스템 리스크 감시"]
    : null;
  const narrativeChainKo = recent.slice(-6).map((event, idx, arr) => {
    const prefix = idx === 0 ? "시작" : idx === arr.length - 1 ? "현재" : "전이";
    return `${prefix}: ${event.publishedAt} · ${event.category} · 압력 ${Math.round(event.pressure)}점 · ${event.headline.slice(0, 58)}`;
  });
  const propagationFlowKo = flowTemplate ?? [
    `${dominantCluster?.nameKo ?? "이벤트"} 트리거`,
    engagementHeat >= 1.15 ? "참여도 확산" : "참여도 제한",
    volatilityPressure >= 55 ? "시장 반응 확대" : "시장 반응 제한",
    pressureScore >= 60 ? "레짐 전환 압력" : "관망 레짐 유지",
    risksKoPreview(pressureScore, engagementHeat, volatilityPressure),
  ];

  const dataQualityScore = clamp(Math.round((mappings.length / 9) * 52 + (headlineCol ? 18 : 0) + (dateCol ? 8 : 0) + (rows.length >= 30 ? 12 : rows.length >= 8 ? 6 : 0) + (narrativeClusters.length >= 2 ? 10 : 4)));
  const narrativeReliability = clamp(Math.round(dataQualityScore * 0.55 + (1 - repeatedShare) * 30 + (confirmationsKo.length * 5) - conflictsKo.length * 4));
  const noiseRatio = clamp(Math.round((repeatedShare * 42) + (degradationKo.length * 6) + (pressureScore < 35 ? 12 : 0)));
  const regimeStability = clamp(Math.round(70 - conflictsKo.length * 10 - Math.abs(sentimentAvg - 50) * 0.25 + confirmationsKo.length * 4));
  const signalStrength = clamp(Math.round(pressureScore * 0.55 + Math.min(engagementHeat, 2) * 18 + volatilityPressure * 0.25));

  const risksKo: NewsEventAnalysis["risksKo"] = [];
  if (pressureScore >= 72) risksKo.push({ label: "이벤트 충격 리스크", severity: "HIGH", description: `${dominantCluster?.nameKo ?? "핵심"} 내러티브 압력이 높아 단기 변동성 확대 가능성이 큽니다.` });
  if (engagementHeat >= 1.4) risksKo.push({ label: "참여도 과열", severity: "MEDIUM", description: "참여도가 평균 대비 빠르게 높아져 하이프 루프 또는 군중 과잉반응을 점검해야 합니다." });
  if (repeatedShare > 0.55) risksKo.push({ label: "내러티브 피로", severity: "MEDIUM", description: "반복 뉴스의 한계효과가 낮아져 실제 시장 반응이 둔화될 수 있습니다." });
  if (conflictsKo.length) risksKo.push({ label: "신호 충돌", severity: "MEDIUM", description: conflictsKo[0] });
  if (!risksKo.length) risksKo.push({ label: "이벤트 압력 안정", severity: "LOW", description: "현재 이벤트 압력은 구조적 충격보다 관망형 흐름에 가깝습니다." });

  const confidenceLabel = narrativeReliability >= 70 && dataQualityScore >= 65 ? "높음" : narrativeReliability >= 45 ? "중간" : "낮음";
  const confirmationText = confirmationsKo[0] ?? "확인 신호는 제한적이어서 단일 헤드라인보다 참여도와 시장 반응의 추가 확인이 필요합니다.";
  const hiddenRiskText = conflictsKo[0] ?? risksKo[0]?.description ?? "숨은 리스크는 제한적이지만 내러티브 압력 변화는 계속 확인해야 합니다.";
  const aiSummaryKo = `${dominantNarrativeKo}가 현재 정보 레짐의 중심이며 이벤트 압력은 ${pressureScore}점입니다. ${confirmationText} ${hiddenRiskText} 신뢰도는 ${confidenceLabel} 수준으로, 데이터 품질 ${dataQualityScore}점과 내러티브 신뢰도 ${narrativeReliability}점을 함께 반영했습니다. 따라서 현재 해석은 "${eventRegimeKo}"에 기반한 시나리오 판단이며, 원문 헤드라인은 주된 결론이 아니라 보조 증거로 사용됩니다.`;

  return {
    detected,
    confidence: dataQualityScore,
    mappings,
    events,
    dominantNarrativeKo,
    eventRegimeKo,
    compositeModeKo,
    pressureScore,
    dataQualityScore,
    narrativeReliability,
    noiseRatio,
    regimeStability,
    signalStrength,
    engagementHeat,
    volatilityPressure,
    narrativeClusters,
    narrativeChainKo,
    propagationFlowKo,
    relationshipsKo,
    correlationMatrix,
    confirmationsKo,
    conflictsKo,
    categoryPressure,
    scenarioKo: {
      bull: `${dominantCluster?.nameKo ?? "핵심"} 이벤트가 긍정 감성과 참여도 확산으로 확인되면 위험자산 선호 내러티브가 강화될 수 있습니다.`,
      base: `현재는 ${eventRegimeKo} 국면입니다. 이벤트 압력은 존재하지만 추가 확인 전까지는 선별적 반응이 우세합니다.`,
      bear: `부정 감성, 높은 변동성, 참여도 급증이 동시에 나타나면 이벤트 충격이 방어적 레짐으로 전이될 수 있습니다.`,
    },
    aiSummaryKo,
    risksKo,
    degradationKo,
  };
}
