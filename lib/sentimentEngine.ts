import type { Row } from "@/lib/dataPipeline";

export type SentimentCanonicalColumn =
  | "date"
  | "price"
  | "sentiment"
  | "mentions"
  | "reddit_score"
  | "news_score"
  | "twitter_score"
  | "social_volume"
  | "fear_greed"
  | "bullish_ratio"
  | "bearish_ratio"
  | "engagement"
  | "sentiment_change"
  | "positive_posts"
  | "negative_posts"
  | "influencer_score"
  | "media_impact"
  | "article_count"
  | "headline_score"
  | "trend_score"
  | "buzz_score"
  | "community_score";

export type SentimentMapping = {
  canonical: SentimentCanonicalColumn;
  source: string;
  category: "감정 방향" | "관심/하이프" | "소셜 모멘텀" | "미디어 압력" | "공포/탐욕" | "가격/시간";
  confidence: number;
};

export type SentimentPoint = {
  index: number;
  label: string;
  sentiment: number;
  mentions: number;
  reddit: number;
  news: number;
  hypeStrength: number;
  momentum: number;
  volatility: number;
  divergence: number;
};

export type SentimentRisk = {
  label: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  value: string;
  descriptionKo: string;
};

export type SentimentAnalysis = {
  detected: boolean;
  mappings: SentimentMapping[];
  rowCount: number;
  score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  psychology: "Euphoric" | "Bullish" | "Neutral" | "Fearful" | "Panic";
  psychologyKo: string;
  regime: "Panic Selloff" | "Fear Compression" | "Neutral Consolidation" | "Retail FOMO" | "Euphoric Blowoff";
  regimeKo: string;
  bullishProbability: number;
  bearishProbability: number;
  narrativeStrength: number;
  socialMomentum: number;
  hypeStrength: number;
  sentimentVolatility: number;
  crowdPressure: number;
  mediaPressure: number;
  fearGreedState: string;
  narrative: {
    coreRegimeKo: string;
    mainDriverKo: string;
    riskFactorKo: string;
    momentumStateKo: string;
    confidenceKo: string;
    colorTone: "bullish" | "neutral" | "fear" | "panic";
    overviewKo: string;
    featureKo: string;
    riskKo: string;
    strategyKo: string;
  };
  explanation: {
    scoreReason: string;
    regimeReason: string;
    socialHeatReason: string;
    communityPressureReason: string;
    mediaPressureReason: string;
    divergenceReason: string;
    confidenceReason: string;
    finalInterpretation: string;
    timelineCommentary: string;
    mentionsCommentary: string;
    communityNewsCommentary: string;
    gaugeCommentary: string;
  };
  latest: SentimentPoint | null;
  series: SentimentPoint[];
  risks: SentimentRisk[];
  bullishFactorsKo: string[];
  bearishFactorsKo: string[];
  insightsKo: string[];
  scenarioKo: { bull: string; base: string; bear: string };
  aiSummaryKo: string;
  strategicActionKo: string;
  degradationKo: string[];
};

const CONFIG: Record<SentimentCanonicalColumn, { aliases: string[]; regex: RegExp[]; category: SentimentMapping["category"] }> = {
  date: { aliases: ["date", "datetime", "time", "published_at", "날짜", "일자"], regex: [/date|datetime|time|published|날짜|일자/i], category: "가격/시간" },
  price: { aliases: ["close", "price", "adj_close", "last", "종가", "가격"], regex: [/close|price|adj.?close|last|종가|가격/i], category: "가격/시간" },
  sentiment: { aliases: ["sentiment", "sentiment_score", "bullish_sentiment", "polarity", "감성", "심리"], regex: [/sentiment|polarity|tone|감성|심리/i], category: "감정 방향" },
  mentions: { aliases: ["mentions", "social_mentions", "buzz", "mention_count", "언급량"], regex: [/mentions?|buzz|hype|discussion|언급|화제/i], category: "관심/하이프" },
  reddit_score: { aliases: ["reddit_score", "reddit_sentiment", "reddit"], regex: [/reddit|subreddit|레딧/i], category: "소셜 모멘텀" },
  news_score: { aliases: ["news_score", "media_sentiment", "news_sentiment"], regex: [/news.?score|media.?sentiment|news.?sentiment|뉴스|미디어/i], category: "미디어 압력" },
  twitter_score: { aliases: ["twitter_score", "x_score", "twitter_sentiment"], regex: [/twitter|xscore|tweet|트위터/i], category: "소셜 모멘텀" },
  social_volume: { aliases: ["social_volume", "social_activity"], regex: [/social.?volume|social.?activity|소셜/i], category: "관심/하이프" },
  fear_greed: { aliases: ["fear_greed", "fear_greed_index"], regex: [/fear.?greed|공포|탐욕/i], category: "공포/탐욕" },
  bullish_ratio: { aliases: ["bullish_ratio", "bull_ratio"], regex: [/bullish.?ratio|bull.?ratio|강세.?비율/i], category: "감정 방향" },
  bearish_ratio: { aliases: ["bearish_ratio", "bear_ratio"], regex: [/bearish.?ratio|bear.?ratio|약세.?비율/i], category: "감정 방향" },
  engagement: { aliases: ["engagement"], regex: [/engagement|likes|shares|comments|참여/i], category: "관심/하이프" },
  sentiment_change: { aliases: ["sentiment_change", "change"], regex: [/sentiment.?change|tone.?change|감성.?변화/i], category: "감정 방향" },
  positive_posts: { aliases: ["positive_posts", "positive"], regex: [/positive.?posts|positive|긍정/i], category: "감정 방향" },
  negative_posts: { aliases: ["negative_posts", "negative"], regex: [/negative.?posts|negative|부정/i], category: "감정 방향" },
  influencer_score: { aliases: ["influencer_score"], regex: [/influencer|opinion.?leader|인플루언서/i], category: "소셜 모멘텀" },
  media_impact: { aliases: ["media_impact"], regex: [/media.?impact|impact.?score|미디어.?영향/i], category: "미디어 압력" },
  article_count: { aliases: ["article_count", "articles"], regex: [/article.?count|articles?|기사.?수/i], category: "미디어 압력" },
  headline_score: { aliases: ["headline_score"], regex: [/headline.?score|headline|헤드라인/i], category: "미디어 압력" },
  trend_score: { aliases: ["trend_score"], regex: [/trend.?score|trend|트렌드/i], category: "소셜 모멘텀" },
  buzz_score: { aliases: ["buzz_score"], regex: [/buzz.?score|buzz|hype.?index/i], category: "관심/하이프" },
  community_score: { aliases: ["community_score"], regex: [/community.?score|community|커뮤니티/i], category: "소셜 모멘텀" },
};

function norm(value: string) {
  return value.toLowerCase().replace(/[\s_\-./()[\]{}%]+/g, "");
}

function parseNumber(value: unknown) {
  if (value == null) return NaN;
  const text = String(value).trim().replace(/,/g, "").replace(/%$/, "");
  if (!text || /^(nan|null|none|n\/a|na|-|--|\.)$/i.test(text)) return NaN;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

function mean(values: number[]) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : 0;
}

function std(values: number[]) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return 0;
  const m = mean(clean);
  return Math.sqrt(mean(clean.map((v) => (v - m) ** 2)));
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function percentile(values: number[], current: number) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length || !Number.isFinite(current)) return 50;
  return clean.filter((v) => v <= current).length / clean.length * 100;
}

function normalizeScore(value: number, fallback = 50) {
  if (!Number.isFinite(value)) return fallback;
  if (value >= -1 && value <= 1) return clamp((value + 1) * 50);
  if (value >= 0 && value <= 1) return clamp(value * 100);
  if (value >= 0 && value <= 100) return value;
  return clamp(50 + value);
}

function weightedAvailable(parts: Array<{ value: number; weight: number }>, fallback = 50) {
  const clean = parts.filter((p) => Number.isFinite(p.value));
  const total = clean.reduce((sum, p) => sum + p.weight, 0);
  return total ? clean.reduce((sum, p) => sum + p.value * p.weight, 0) / total : fallback;
}

function detectColumns(rows: Row[]) {
  const headers = Object.keys(rows[0] ?? {});
  const mappings: SentimentMapping[] = [];
  (Object.keys(CONFIG) as SentimentCanonicalColumn[]).forEach((canonical) => {
    const cfg = CONFIG[canonical];
    const exact = headers.find((h) => cfg.aliases.map(norm).includes(norm(h)));
    if (exact) {
      mappings.push({ canonical, source: exact, category: cfg.category, confidence: 0.96 });
      return;
    }
    const fuzzy = headers.find((h) => cfg.regex.some((rx) => rx.test(h)));
    if (fuzzy) mappings.push({ canonical, source: fuzzy, category: cfg.category, confidence: 0.76 });
  });
  return mappings;
}

function psychology(score: number): SentimentAnalysis["psychology"] {
  if (score >= 80) return "Euphoric";
  if (score >= 65) return "Bullish";
  if (score >= 40) return "Neutral";
  if (score >= 30) return "Fearful";
  return "Panic";
}

function psychologyKo(value: SentimentAnalysis["psychology"]) {
  return { Euphoric: "강한 낙관", Bullish: "관심 확대 / 긍정 우위", Neutral: "혼합 중립", Fearful: "중립 약세 / 방어적 심리", Panic: "공포 확산" }[value];
}

function regimeKo(value: SentimentAnalysis["regime"]) {
  return {
    "Panic Selloff": "패닉 매도",
    "Fear Compression": "공포 압축",
    "Neutral Consolidation": "중립 수렴",
    "Retail FOMO": "리테일 FOMO",
    "Euphoric Blowoff": "도취 과열",
  }[value];
}

export function buildSentimentAnalysis(inputRows: Row[]): SentimentAnalysis {
  const rows = inputRows.filter((row) => Object.values(row).some((v) => String(v ?? "").trim() !== ""));
  const mappings = rows.length ? detectColumns(rows) : [];
  const get = (c: SentimentCanonicalColumn) => mappings.find((m) => m.canonical === c)?.source;
  const sentimentCol = get("sentiment");
  const mentionsCol = get("mentions") ?? get("social_volume") ?? get("buzz_score") ?? get("engagement");
  const redditCol = get("reddit_score") ?? get("community_score");
  const newsCol = get("news_score") ?? get("media_impact") ?? get("headline_score");
  const priceCol = get("price");
  const dateCol = get("date");
  const fearGreedCol = get("fear_greed");
  const fomoCol = mappings.find((m) => /fomo/i.test(m.source))?.source;
  const panicCol = mappings.find((m) => /panic/i.test(m.source))?.source;
  const bullishCol = get("bullish_ratio");
  const bearishCol = get("bearish_ratio");
  const positiveCol = get("positive_posts");
  const negativeCol = get("negative_posts");
  const trendCol = get("trend_score") ?? get("twitter_score") ?? get("influencer_score");
  const detected = !!(sentimentCol || mentionsCol || redditCol || newsCol || fearGreedCol || bullishCol || positiveCol);

  const degradationKo: string[] = [];
  if (!sentimentCol) degradationKo.push("대표 감성 컬럼이 없어 소셜/뉴스/비율 신호로 감성 방향을 추정합니다.");
  if (!mentionsCol) degradationKo.push("언급량 컬럼이 없어 하이프 강도는 중립값으로 보정합니다.");
  if (!redditCol) degradationKo.push("레딧/커뮤니티 신호가 없어 군중 압력 분석은 제한됩니다.");
  if (!newsCol) degradationKo.push("뉴스/미디어 신호가 없어 미디어 압력 분석은 제한됩니다.");

  if (!detected) {
    return {
      detected: false,
      mappings,
      rowCount: rows.length,
      score: 50,
      confidence: "LOW",
      psychology: "Neutral",
      psychologyKo: "중립",
      regime: "Neutral Consolidation",
      regimeKo: "중립 수렴",
      bullishProbability: 50,
      bearishProbability: 50,
      narrativeStrength: 50,
      socialMomentum: 50,
      hypeStrength: 1,
      sentimentVolatility: 0,
      crowdPressure: 50,
      mediaPressure: 50,
      fearGreedState: "중립",
      narrative: {
        coreRegimeKo: "중립 수렴",
        mainDriverKo: "감성 데이터 부족",
        riskFactorKo: "신호 부족",
        momentumStateKo: "불확실",
        confidenceKo: "낮음",
        colorTone: "neutral",
        overviewKo: "감성 데이터가 충분하지 않아 시장 심리의 방향성을 단정하기 어렵습니다. 현재 해석은 중립값을 기반으로 한 제한적 판단입니다.",
        featureKo: "감성 변화의 원인을 분해할 수 있는 소셜·뉴스·언급량 컬럼이 부족합니다. 데이터 보강 전까지는 개별 신호보다 신뢰도 제한을 우선 반영해야 합니다.",
        riskKo: "극단적 위험 신호를 확인할 근거도 제한적이지만, 위험이 없다고 판단할 근거도 충분하지 않습니다. 감성 방향과 관심도 컬럼이 추가되면 위험 해석의 안정성이 높아집니다.",
        strategyKo: "감성 신호 확인 전까지는 가격·거래량 등 다른 도메인 신호와 함께 보수적으로 해석하는 편이 적절합니다.",
      },
      explanation: {
        scoreReason: "감성 점수는 중립값으로 보정되었습니다. 감성, 언급량, 뉴스, 커뮤니티 신호가 충분하지 않아 실제 방향성보다는 데이터 부족을 반영합니다.",
        regimeReason: "레짐은 중립 수렴으로 처리됩니다. 극단 공포나 과열을 확인할 독립 신호가 부족하기 때문입니다.",
        socialHeatReason: "언급량 컬럼이 없어 소셜 열기는 중립값으로 보정되었습니다.",
        communityPressureReason: "커뮤니티 신호가 없어 군중 압력은 제한적으로만 해석됩니다.",
        mediaPressureReason: "뉴스 신호가 없어 미디어 확인 여부는 판단할 수 없습니다.",
        divergenceReason: "가격 또는 감성 변화 데이터가 부족해 다이버전스 판단은 제한됩니다.",
        confidenceReason: "신뢰도는 낮음입니다. 감성 해석을 지지할 독립 소스가 부족합니다.",
        finalInterpretation: "현재는 감성 대시보드가 구조를 유지하되 중립적 보정값 중심으로 표시됩니다. 추가 소스가 들어오면 점수와 레짐이 재계산됩니다.",
        timelineCommentary: "감성 타임라인은 데이터 부족으로 제한됩니다.",
        mentionsCommentary: "언급량 스파이크 분석은 데이터 부족으로 제한됩니다.",
        communityNewsCommentary: "커뮤니티와 뉴스 비교는 데이터 부족으로 제한됩니다.",
        gaugeCommentary: "게이지는 중립 보정 상태를 나타냅니다.",
      },
      latest: null,
      series: [],
      risks: [],
      bullishFactorsKo: [],
      bearishFactorsKo: [],
      insightsKo: ["센티먼트 관련 컬럼이 충분히 감지되지 않았습니다."],
      scenarioKo: { bull: "감성 데이터가 보강되면 강세 확인이 가능합니다.", base: "현재는 중립 해석이 적절합니다.", bear: "부정 신호 확인이 제한됩니다." },
      aiSummaryKo: "감성 데이터 구조가 제한적이어서 중립 상태로 해석합니다.",
      strategicActionKo: "감성 컬럼, 언급량, 뉴스 점수 중 최소 2개 이상을 추가해 신뢰도를 높이세요.",
      degradationKo,
    };
  }

  const rawSentiments = rows.map((r) => {
    const direct = sentimentCol ? normalizeScore(parseNumber(r[sentimentCol])) : NaN;
    const fg = fearGreedCol ? normalizeScore(parseNumber(r[fearGreedCol])) : NaN;
    const bull = bullishCol ? normalizeScore(parseNumber(r[bullishCol]), NaN) : NaN;
    const bear = bearishCol ? normalizeScore(parseNumber(r[bearishCol]), NaN) : NaN;
    const pos = positiveCol ? parseNumber(r[positiveCol]) : NaN;
    const neg = negativeCol ? parseNumber(r[negativeCol]) : NaN;
    const ratio = Number.isFinite(pos) && Number.isFinite(neg) && pos + neg > 0 ? pos / (pos + neg) * 100 : NaN;
    const directional = Number.isFinite(bull) && Number.isFinite(bear) ? clamp(50 + (bull - bear) / 2) : NaN;
    return mean([direct, fg, directional, ratio].filter(Number.isFinite));
  });
  const mentions = rows.map((r) => mentionsCol ? Math.max(0, parseNumber(r[mentionsCol])) : 0);
  const reddit = rows.map((r) => redditCol ? normalizeScore(parseNumber(r[redditCol])) : 50);
  const news = rows.map((r) => newsCol ? normalizeScore(parseNumber(r[newsCol])) : 50);
  const trend = rows.map((r) => trendCol ? normalizeScore(parseNumber(r[trendCol])) : 50);
  const community = rows.map((r, i) => {
    const c = get("community_score") ? normalizeScore(parseNumber(r[get("community_score")!])) : NaN;
    return Number.isFinite(c) ? c : mean([reddit[i], trend[i]].filter(Number.isFinite));
  });
  const fearGreed = rows.map((r) => fearGreedCol ? normalizeScore(parseNumber(r[fearGreedCol])) : NaN);
  const fomo = rows.map((r) => fomoCol ? normalizeScore(parseNumber(r[fomoCol])) : NaN);
  const panic = rows.map((r) => panicCol ? normalizeScore(parseNumber(r[panicCol])) : NaN);
  const bullish = rows.map((r) => bullishCol ? normalizeScore(parseNumber(r[bullishCol]), NaN) : NaN);
  const bearish = rows.map((r) => bearishCol ? normalizeScore(parseNumber(r[bearishCol]), NaN) : NaN);
  const prices = rows.map((r) => priceCol ? parseNumber(r[priceCol]) : NaN);

  const narrativeBase = rows.map((_, i) => weightedAvailable([
    { value: trend[i], weight: 0.35 },
    { value: community[i], weight: 0.25 },
    { value: news[i], weight: 0.25 },
    { value: fearGreed[i], weight: 0.15 },
  ]));
  const filledSentiments = rawSentiments.map((v, i) => Number.isFinite(v) && v > 0 ? v : weightedAvailable([
    { value: reddit[i], weight: 0.25 },
    { value: news[i], weight: 0.25 },
    { value: community[i], weight: 0.25 },
    { value: trend[i], weight: 0.15 },
    { value: fearGreed[i], weight: 0.10 },
  ]));
  const series: SentimentPoint[] = rows.map((r, i) => {
    const start = Math.max(0, i - 19);
    const sentimentWindow = filledSentiments.slice(start, i + 1);
    const mentionWindow = mentions.slice(start, i + 1);
    const mentionMean = mean(mentionWindow) || mentions[i] || 1;
    const momentum = i >= 3 ? filledSentiments[i] - filledSentiments[Math.max(0, i - 3)] : 0;
    const priceMove = i >= 3 && Number.isFinite(prices[i]) && Number.isFinite(prices[Math.max(0, i - 3)]) ? prices[i] - prices[Math.max(0, i - 3)] : 0;
    const divergence = priceCol ? (priceMove > 0 && momentum < 0 ? -1 : priceMove < 0 && momentum > 0 ? 1 : 0) : 0;
    return {
      index: i,
      label: dateCol ? String(r[dateCol] ?? i + 1) : String(i + 1),
      sentiment: filledSentiments[i],
      mentions: mentions[i],
      reddit: reddit[i],
      news: news[i],
      hypeStrength: mentionsCol ? mentions[i] / mentionMean : 1,
      momentum,
      volatility: std(sentimentWindow),
      divergence,
    };
  });

  const latest = series.at(-1) ?? null;
  const latestSentiment = latest?.sentiment ?? 50;
  const latestHype = latest?.hypeStrength ?? 1;
  const latestCommunity = community.at(-1) ?? 50;
  const latestReddit = reddit.at(-1) ?? 50;
  const latestNews = news.at(-1) ?? 50;
  const latestFearGreed = fearGreed.at(-1);
  const latestFomo = fomo.at(-1);
  const latestPanic = panic.at(-1);
  const latestBullish = bullish.at(-1) ?? NaN;
  const latestBearish = bearish.at(-1) ?? NaN;
  const sentimentPercentile = percentile(filledSentiments, latestSentiment);
  const newsPercentile = percentile(news, latestNews);
  const communityPercentile = percentile(community, latestCommunity);
  const sentimentVolatility = std(filledSentiments.slice(-30));
  const socialMomentum = clamp(50 + (latest?.momentum ?? 0) * 3 + (sentimentPercentile - 50) * 0.25);
  const crowdPressure = communityPercentile;
  const mediaPressure = newsPercentile;
  const mentionMean30 = mean(mentions.slice(-30)) || mentions.at(-1) || 1;
  const socialHeat = mentionsCol ? (mentions.at(-1) ?? 0) / mentionMean30 : 1;
  const narrativeStrength = clamp(weightedAvailable([
    { value: narrativeBase.at(-1) ?? 50, weight: 0.35 },
    { value: socialMomentum, weight: 0.25 },
    { value: mediaPressure, weight: 0.20 },
    { value: clamp(50 + (socialHeat - 1) * 25), weight: 0.20 },
  ]) - Math.max(0, sentimentVolatility - 15) * 0.5);
  const score = Math.round(clamp(weightedAvailable([
    { value: latestSentiment, weight: 0.30 },
    { value: latestCommunity, weight: 0.18 },
    { value: latestReddit, weight: 0.14 },
    { value: latestNews, weight: 0.14 },
    { value: latestFearGreed ?? NaN, weight: 0.12 },
    { value: narrativeStrength, weight: 0.12 },
  ])));
  const recentMomentum = latest?.momentum ?? 0;
  const communityNewsGap = Math.abs(latestCommunity - latestNews);
  const bearishDominance = Number.isFinite(latestBearish) && Number.isFinite(latestBullish) ? latestBearish - latestBullish : 0;
  const bullishDominance = Number.isFinite(latestBearish) && Number.isFinite(latestBullish) ? latestBullish - latestBearish : 0;
  const sentimentFallingWithMentions = recentMomentum < 0 && socialHeat > 1.1;
  const fearConfirmations = [
    score < 40,
    (latestPanic ?? 0) > 60,
    Number.isFinite(latestFearGreed) && latestFearGreed! < 35,
    bearishDominance >= 15,
    latestNews < 35 || newsPercentile <= 20,
    recentMomentum < 0,
    sentimentFallingWithMentions,
  ].filter(Boolean).length;
  const fomoConfirmations = [
    score > 65,
    (latestFomo ?? 0) > 65,
    socialHeat > 1.3,
    latestCommunity - latestNews >= 15,
    bullishDominance >= 15,
    Number.isFinite(latestFearGreed) && latestFearGreed! > 65,
    sentimentPercentile >= 80 && recentMomentum > 0,
  ].filter(Boolean).length;
  const mixedSignals = communityNewsGap >= 15 && fearConfirmations < 4 && fomoConfirmations < 4;
  const psych: SentimentAnalysis["psychology"] =
    fearConfirmations >= 4 && score < 30 ? "Panic" :
    fearConfirmations >= 3 && score < 40 ? "Fearful" :
    fomoConfirmations >= 4 && score >= 80 ? "Euphoric" :
    fomoConfirmations >= 3 && score >= 65 ? "Bullish" :
    score >= 65 ? "Bullish" :
    score < 40 ? "Fearful" :
    "Neutral";
  const regime: SentimentAnalysis["regime"] =
    fearConfirmations >= 5 && score < 30 ? "Panic Selloff" :
    fearConfirmations >= 4 && score < 35 && socialHeat > 1.1 && latestNews < 35 ? "Fear Compression" :
    fomoConfirmations >= 4 && score >= 80 && socialHeat > 1.6 ? "Euphoric Blowoff" :
    fomoConfirmations >= 3 && score >= 65 ? "Retail FOMO" :
    "Neutral Consolidation";

  const sourceCount = [sentimentCol, mentionsCol, redditCol, newsCol, fearGreedCol].filter(Boolean).length;
  const divergenceCount = series.slice(-10).filter((p) => p.divergence !== 0).length;
  const alignedSignals = [latestSentiment, latestCommunity, latestReddit, latestNews, latestFearGreed ?? NaN]
    .filter(Number.isFinite)
    .filter((v) => Math.abs(v - score) <= 12).length;
  const divergenceScore = Math.max(communityNewsGap, divergenceCount * 8, sentimentVolatility * 1.2);
  let confidence: SentimentAnalysis["confidence"] =
    rows.length >= 90 && alignedSignals >= 4 && divergenceScore < 20 ? "HIGH" :
    rows.length >= 15 && sourceCount >= 2 && divergenceScore <= 45 ? "MEDIUM" : "LOW";
  if (mixedSignals && confidence === "HIGH") confidence = "MEDIUM";

  const risks: SentimentRisk[] = [];
  if (fomoConfirmations >= 4) risks.push({ label: "FOMO 확인 필요", severity: "HIGH", value: `${fomoConfirmations}개`, descriptionKo: "긍정 감성, 하이프, 참여 확장이 여러 신호에서 동시에 확인되어 과열 가능성이 있습니다." });
  if (fearConfirmations >= 4) risks.push({ label: "공포 확산 확인", severity: "HIGH", value: `${fearConfirmations}개`, descriptionKo: "약세 감성, 뉴스 약화, 참여 변화가 함께 나타나 방어적 심리가 강화되고 있습니다." });
  if (crowdPressure >= 85 && socialHeat > 1.2) risks.push({ label: "리테일 과밀", severity: "MEDIUM", value: `${crowdPressure.toFixed(0)}%`, descriptionKo: "커뮤니티 압력이 데이터셋 내 상단 구간이며 언급량도 평균을 웃돌고 있습니다." });
  if (sentimentVolatility >= 18) risks.push({ label: "감성 변동성 확대", severity: "MEDIUM", value: sentimentVolatility.toFixed(1), descriptionKo: "감정 방향이 빠르게 흔들려 신호 신뢰도가 낮아질 수 있습니다." });
  if (communityNewsGap >= 15) risks.push({ label: "커뮤니티/뉴스 괴리", severity: "MEDIUM", value: `${communityNewsGap.toFixed(0)}p`, descriptionKo: "커뮤니티와 뉴스 신호가 같은 방향으로 정렬되지 않아 내러티브 확인이 필요합니다." });

  const bullishFactorsKo = [
    score >= 60 && fomoConfirmations >= 2 ? "상대 감성 점수와 참여 신호가 긍정 쪽으로 기울어 있습니다." : null,
    socialMomentum >= 60 ? "감성 모멘텀이 개선되고 있습니다." : null,
    latest?.divergence === 1 ? "가격 약세에도 감성이 개선되어 숨은 축적 가능성이 있습니다." : null,
    mediaPressure >= 60 && (news.at(-1) ?? 50) >= 55 ? "뉴스 톤이 긍정 방향을 지지합니다." : null,
  ].filter(Boolean) as string[];
  const bearishFactorsKo = [
    score <= 40 && fearConfirmations >= 2 ? "상대 감성 점수가 약세 쪽으로 기울어 있습니다." : null,
    latest?.divergence === -1 ? "가격 상승에도 감성이 둔화되어 상승 신뢰도가 낮아질 수 있습니다." : null,
    socialHeat > 1.4 && score >= 70 ? "소셜 하이프가 감성보다 빠르게 확장될 경우 과열 리스크가 커집니다." : null,
    sentimentVolatility >= 18 ? "감성 변동성이 높아 신호 지속성이 약합니다." : null,
  ].filter(Boolean) as string[];
  const insightsKo = [
    latest?.divergence === 1 ? "가격이 약한 동안 감성이 개선되어 역발상 축적 신호가 나타납니다." : null,
    latest?.divergence === -1 ? "가격 상승과 달리 감성이 약화되어 랠리 지속성 확인이 필요합니다." : null,
    socialHeat > 1.25 ? "언급량이 최근 평균을 웃돌며 시장 관심이 확대되고 있습니다." : socialHeat < 1 ? "소셜 언급량이 평균을 밑돌아 관심 회복 전 단계로 해석됩니다." : null,
    crowdPressure >= 80 ? "커뮤니티 참여가 상단 구간에 있어 리테일 참여 급증을 시사합니다." : null,
    mediaPressure <= 25 ? "뉴스 톤이 낮은 분위기에 머물러 미디어 기반 부담이 남아 있습니다." : null,
  ].filter(Boolean) as string[];

  const bullishProbability = clamp(Math.round(score * 0.62 + socialMomentum * 0.24 + (100 - sentimentVolatility * 2) * 0.14));
  const bearishProbability = 100 - bullishProbability;
  const fearGreedState = score >= 75 && fomoConfirmations >= 3 ? "탐욕 우위" : score <= 35 && fearConfirmations >= 3 ? "공포 우위" : "중립";
  const colorTone: SentimentAnalysis["narrative"]["colorTone"] =
    psych === "Panic" ? "panic" : psych === "Fearful" ? "fear" : psych === "Bullish" || psych === "Euphoric" ? "bullish" : "neutral";
  const mainDriverKo =
    mixedSignals ? "커뮤니티와 뉴스 신호의 불일치" :
    socialHeat > 1.2 ? "언급량 확장" :
    socialHeat < 0.8 ? "관심 둔화" :
    Math.abs(latest?.momentum ?? 0) >= 4 ? ((latest?.momentum ?? 0) > 0 ? "감성 모멘텀 개선" : "감성 모멘텀 둔화") :
    Math.abs(crowdPressure - mediaPressure) >= 25 ? "커뮤니티와 뉴스 톤의 괴리" :
    mediaPressure >= 65 ? "미디어 톤 개선" :
    "완만한 감성 균형";
  const riskFactorKo =
    mixedSignals ? "내러티브 확인 부족" :
    sentimentVolatility >= 18 ? "감성 변동성 확대" :
    socialHeat > 1.35 && score >= 65 && fomoConfirmations >= 3 ? "하이프 과열 가능성" :
    Math.abs(crowdPressure - mediaPressure) >= 25 ? "뉴스 확인 부족" :
    score <= 39 && fearConfirmations >= 2 ? "약세 심리 잔존" :
    "극단 신호 부재";
  const momentumStateKo =
    sentimentVolatility >= 18 ? "불안정" :
    socialMomentum >= 62 ? "개선" :
    socialMomentum <= 38 ? "약화" :
    "안정적 중립";
  const confidenceKo = confidence === "HIGH" ? "높음" : confidence === "MEDIUM" ? "중간" : "낮음";
  const coreRegimeKo = `${psychologyKo(psych)} / ${regimeKo(regime)}`;
  const heatLabelKo = socialHeat < 0.8 ? "관심 둔화" : socialHeat <= 1.2 ? "정상 관심" : socialHeat <= 1.6 ? "관심 확대" : "높은 하이프";
  const overviewKo = `현재 시장 심리는 ${coreRegimeKo} 상태입니다. 감성 점수 ${score}점은 데이터셋 내부 분포와 최신 모멘텀을 함께 반영한 값이며, 중심 동인은 ${mainDriverKo}입니다. 소셜 열기는 ${socialHeat.toFixed(2)}배로 ${heatLabelKo} 구간에 있어, 군중 참여가 강하게 붙었는지 여부를 함께 확인해야 합니다. ${riskFactorKo}이 남아 있어 현재 신호는 ${confidenceKo} 신뢰도로 해석하는 것이 적절합니다.`;
  const featureKo = `감성 변화는 ${mainDriverKo}에서 출발합니다. 커뮤니티 압력은 ${crowdPressure.toFixed(0)}%, 미디어 압력은 ${mediaPressure.toFixed(0)}%이며 두 신호 차이는 ${communityNewsGap.toFixed(0)}포인트입니다. 이 차이가 15포인트 이상이면 하이프가 실제 뉴스 기반 내러티브로 확인되지 않은 상태로 간주합니다. 모멘텀은 ${momentumStateKo}이고, 감성 변동성 ${sentimentVolatility.toFixed(1)}이 지속성 판단을 조정합니다.`;
  const riskKo = `위험 구조는 ${riskFactorKo}을 중심으로 형성됩니다. ${socialHeat > 1.2 ? "언급량은 평균을 웃돌지만, FOMO 판단은 긍정 감성·커뮤니티·뉴스·공포/탐욕 신호가 함께 확인될 때만 강화됩니다." : "언급량 과열은 확인되지 않아 군중 쏠림 위험은 중간 이하로 해석됩니다."} ${fearConfirmations >= 3 ? "약세 확인 신호가 복수로 존재해 방어적 심리가 강화될 수 있습니다." : "공포 신호는 단일 지표만으로 확정되지 않아 극단적 패닉으로 보지 않습니다."} 이 해석은 커뮤니티와 뉴스 점수가 같은 방향으로 재정렬되면 강화되고, 서로 반대로 벌어지면 약화됩니다.`;
  const strategicActionKo = regime === "Retail FOMO" || regime === "Euphoric Blowoff"
    ? "추격 매수보다 하이프 지속성과 가격 확인을 함께 점검하는 전략이 적절합니다."
    : regime === "Panic Selloff" || regime === "Fear Compression"
    ? "공포 완화와 거래 관심 회복을 확인하며 분할 접근하는 전략이 적절합니다."
    : "감성 신호가 중립 수렴 중이므로 가격·거래량 확인과 함께 판단하는 것이 적절합니다.";
  const strategyKo = `${strategicActionKo} 현재 판단의 핵심은 ${mainDriverKo}이 지속 가능한 내러티브로 연결되는지 여부입니다. ${riskFactorKo}이 완화되면 감성 신뢰도는 높아지고, 반대로 모멘텀 상태가 ${momentumStateKo}에서 약화로 전환되면 방어적 해석이 필요합니다.`;
  const aiSummaryKo = overviewKo;
  const socialHeatReason = socialHeat < 0.8
    ? `소셜 열기는 ${socialHeat.toFixed(2)}배로 최근 평균 대비 낮은 수준입니다. 이는 군중 참여가 급격히 확장되는 구간이 아니라 관심 둔화 또는 이슈 소강 상태에 가까운 흐름으로 해석됩니다.`
    : socialHeat <= 1.2
    ? `소셜 열기는 ${socialHeat.toFixed(2)}배로 평균권에 위치합니다. 특별한 군중 확산은 제한적이지만 기본적인 시장 관심은 유지되고 있습니다.`
    : `소셜 열기는 ${socialHeat.toFixed(2)}배로 평균 대비 높아지며 군중 참여가 확대되고 있습니다. 다만 감성 점수와 뉴스 확인 신호가 함께 상승하는지 확인해야 합니다.`;
  const communityPressureReason = latestCommunity > latestNews + 15
    ? `커뮤니티 감성 ${latestCommunity.toFixed(0)}점이 뉴스 ${latestNews.toFixed(0)}점보다 앞서 있습니다. 이는 개인 투자자 또는 커뮤니티 기반 기대감이 먼저 움직이는 구조이며, 뉴스 확인이 뒤따르지 않으면 단기 과열 또는 되돌림 위험이 존재합니다.`
    : latestNews > latestCommunity + 15
    ? `뉴스 기반 감성 ${latestNews.toFixed(0)}점이 커뮤니티 ${latestCommunity.toFixed(0)}점보다 강합니다. 공식 내러티브는 개선되고 있으나 개인 투자자 반응은 아직 충분히 확산되지 않은 상태로 해석됩니다.`
    : `커뮤니티 ${latestCommunity.toFixed(0)}점과 뉴스 ${latestNews.toFixed(0)}점은 큰 괴리 없이 움직이고 있습니다. 다만 두 신호 모두 강하지 않다면 방향성은 제한적입니다.`;
  const mediaPressureReason = mediaPressure < 35
    ? `미디어 압력은 ${mediaPressure.toFixed(0)}%로 데이터셋 내부 하단권입니다. 뉴스 기반 확인 신호가 약해 감성 확장이 시장 전반의 내러티브로 번졌다고 보기는 어렵습니다.`
    : mediaPressure > 65
    ? `미디어 압력은 ${mediaPressure.toFixed(0)}%로 상단권입니다. 뉴스 톤이 감성 방향을 확인해 주는지에 따라 신호 신뢰도가 높아질 수 있습니다.`
    : `미디어 압력은 ${mediaPressure.toFixed(0)}%로 중간권입니다. 뉴스가 감성 방향을 강하게 끌고 가기보다는 보조 확인 신호로 작동합니다.`;
  const scoreReason = `감성 점수는 ${score}점입니다. 데이터 내부 분위수 기준 최근 감성은 ${sentimentPercentile.toFixed(0)}% 위치이며, 커뮤니티 압력은 ${crowdPressure.toFixed(0)}%, 미디어 압력은 ${mediaPressure.toFixed(0)}%입니다. ${socialHeatReason} 최근 감성 모멘텀은 ${recentMomentum.toFixed(1)}로 ${momentumStateKo} 상태이며, 커뮤니티와 뉴스 차이는 ${communityNewsGap.toFixed(0)}포인트입니다.`;
  const regimeReason = `${psychologyKo(psych)} 레짐은 감성 점수, 상대 분위수, 모멘텀, 참여 강도, 커뮤니티/뉴스 확인 여부를 함께 반영한 결과입니다. ${mixedSignals ? "커뮤니티와 뉴스 신호가 충분히 정렬되지 않아 극단 레짐 대신 혼합 중립 또는 확인 필요 쪽으로 보정되었습니다." : "독립 신호들이 현재 레짐과 대체로 같은 방향을 가리키는지 확인해 결정했습니다."} 즉 현재 해석은 단일 지표가 아니라 복수 신호의 합의 정도를 반영합니다.`;
  const divergenceReason = communityNewsGap >= 15
    ? `커뮤니티와 뉴스 괴리는 ${communityNewsGap.toFixed(0)}포인트입니다. 두 신호가 같은 방향으로 정렬되지 않아 내러티브 확인이 필요하며, 이 때문에 신뢰도는 보수적으로 조정됩니다.`
    : `커뮤니티와 뉴스 괴리는 ${communityNewsGap.toFixed(0)}포인트로 제한적입니다. 두 신호가 크게 충돌하지 않아 감성 해석의 일관성은 비교적 유지됩니다.`;
  const confidenceReason = `신뢰도는 ${confidence}입니다. 데이터 길이 ${rows.length}개, 주요 소스 ${sourceCount}개, 커뮤니티/뉴스 괴리 ${communityNewsGap.toFixed(0)}포인트, 감성 변동성 ${sentimentVolatility.toFixed(1)}을 함께 반영했습니다. HIGH는 감성 방향, 소셜 열기, 커뮤니티와 뉴스 확인, 낮은 변동성이 동시에 충족될 때만 허용됩니다.`;
  const finalInterpretation = `${coreRegimeKo} 상태입니다. ${scoreReason} ${communityPressureReason} 따라서 현재 신호는 확정적 매수·매도보다 추가 가격/거래량 확인이 필요한 감성 신호로 해석하는 것이 적절합니다.`;
  const timelineCommentary = recentMomentum > 2
    ? "감성 타임라인은 최근 개선 흐름을 보입니다. 다만 개선이 소셜 참여와 뉴스 확인으로 이어지는지 확인해야 합니다."
    : recentMomentum < -2
    ? "감성 타임라인은 최근 둔화 흐름을 보입니다. 단기적으로 감정 모멘텀이 약해지고 있어 방어적 해석이 필요합니다."
    : "감성 타임라인은 뚜렷한 방향성보다 압축 또는 횡보에 가깝습니다. 현재 레짐은 확인 신호를 기다리는 구간입니다.";
  const mentionsCommentary = socialHeat < 0.8
    ? "언급량은 평균 이하로, 군중 관심 확산은 제한적입니다."
    : socialHeat <= 1.2
    ? "언급량은 평균권으로, 시장 관심은 유지되지만 급격한 확산은 아직 확인되지 않습니다."
    : "언급량은 평균을 웃돌며 관심이 확대되고 있습니다. 감성 점수와 뉴스 확인이 함께 따라오는지가 지속성의 핵심입니다.";
  const communityNewsCommentary = communityPressureReason;
  const gaugeCommentary = `게이지는 ${score}점으로 ${psychologyKo(psych)} 위치에 있습니다. 이 위치는 감성 점수뿐 아니라 소셜 열기 ${socialHeat.toFixed(2)}배, 커뮤니티/뉴스 괴리 ${communityNewsGap.toFixed(0)}포인트, 신뢰도 ${confidence}를 함께 반영합니다.`;

  return {
    detected,
    mappings,
    rowCount: rows.length,
    score,
    confidence,
    psychology: psych,
    psychologyKo: psychologyKo(psych),
    regime,
    regimeKo: regimeKo(regime),
    bullishProbability,
    bearishProbability,
    narrativeStrength: Math.round(narrativeStrength),
    socialMomentum: Math.round(socialMomentum),
    hypeStrength: socialHeat,
    sentimentVolatility,
    crowdPressure,
    mediaPressure,
    fearGreedState,
    narrative: { coreRegimeKo, mainDriverKo, riskFactorKo, momentumStateKo, confidenceKo, colorTone, overviewKo, featureKo, riskKo, strategyKo },
    explanation: { scoreReason, regimeReason, socialHeatReason, communityPressureReason, mediaPressureReason, divergenceReason, confidenceReason, finalInterpretation, timelineCommentary, mentionsCommentary, communityNewsCommentary, gaugeCommentary },
    latest,
    series,
    risks,
    bullishFactorsKo,
    bearishFactorsKo,
    insightsKo: insightsKo.length ? insightsKo : ["감성 신호는 현재 중립적이며 추가 확인이 필요합니다."],
    scenarioKo: {
      bull: "감성 개선과 언급량 증가가 가격 흐름과 동행하면 내러티브 확산이 이어질 수 있습니다.",
      base: "현재 감성 구조가 유지되면 중립적 관심과 선택적 모멘텀 장세가 예상됩니다.",
      bear: "하이프가 둔화되거나 뉴스 톤이 악화되면 군중 심리가 빠르게 식을 수 있습니다.",
    },
    aiSummaryKo,
    strategicActionKo,
    degradationKo,
  };
}
