import type { Row } from "@/lib/dataPipeline";

export type PortfolioCanonicalColumn = "ticker" | "weight" | "return" | "sector" | "asset_class";
export type PortfolioMapping = {
  canonical: PortfolioCanonicalColumn;
  source: string;
  confidence: number;
  method: "alias" | "regex";
};

export type PortfolioHolding = {
  ticker: string;
  sector: string;
  assetClass: string;
  originalWeight: number;
  normalizedWeight: number;
  returnPct: number | null;
  contribution: number;
  isShort: boolean;
  isCash: boolean;
  sourceRows: number;
};

export type PortfolioScore = {
  alpha: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  regimeLabel: string;
  conditionLabel: string;
  diversificationScore: number;
  concentrationScore: number;
  consistencyScore: number;
  riskAdjustedMomentum: number;
  sectorDependencyScore: number;
  contributionBreadthScore: number;
  fragilityScore: number;
  leveragePressureScore: number;
  capitalEfficiencyScore: number;
};

export type PortfolioRisk = {
  label: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  value: string;
  descriptionKo: string;
};

export type PortfolioAnalysis = {
  detected: boolean;
  mappings: PortfolioMapping[];
  rowCount: number;
  holdings: PortfolioHolding[];
  sectorAllocation: Array<{ sector: string; weight: number; contribution: number; returnPct: number | null; risk: number }>;
  assetClassAllocation: Array<{ assetClass: string; weight: number }>;
  totalOriginalWeight: number;
  leverage: number;
  netExposure: number;
  grossExposure: number;
  longExposure: number;
  shortExposure: number;
  leverageAmount: number;
  exposureLabelKo: string;
  exposureInterpretationKo: string;
  weightedReturn: number | null;
  totalReturn: number | null;
  topHolding: PortfolioHolding | null;
  bestHolding: PortfolioHolding | null;
  weakestHolding: PortfolioHolding | null;
  dominantSector: string | null;
  strongestSector: string | null;
  weakestSector: string | null;
  hhi: number;
  topHoldingWeight: number;
  top5Weight: number;
  concentrationLevel: "Highly Concentrated" | "Balanced" | "Diversified" | "Overdiversified";
  concentrationLevelKo: string;
  riskProfile: "aggressive" | "moderate" | "defensive";
  riskProfileKo: string;
  style: string[];
  score: PortfolioScore;
  connectedNarrativeKo: string;
  fragilityLevelKo: string;
  primaryChartFocusKo: string;
  risks: PortfolioRisk[];
  strengthsKo: string[];
  weaknessesKo: string[];
  warningsKo: string[];
  aiSummaryKo: string;
  optimizationKo: string[];
  degradationKo: string[];
};

const ALIASES: Record<PortfolioCanonicalColumn, string[]> = {
  ticker: ["ticker", "symbol", "asset", "code", "stock", "equity", "holding", "name", "종목", "티커", "자산", "코드", "보유"],
  weight: ["normalized_weight", "allocation_pct", "weight_pct", "portfolio_weight", "weight", "allocation", "exposure", "ratio", "percent", "position_size", "비중", "배분", "노출", "편입비", "보유비중"],
  return: ["return", "return_pct", "pnl", "performance", "gain", "yield", "alpha", "수익률", "성과", "손익", "알파"],
  sector: ["sector", "industry", "theme", "category", "group", "섹터", "업종", "테마", "분류", "그룹"],
  asset_class: ["asset_class", "assetclass", "type", "instrument", "security_type", "자산군", "유형", "상품"],
};

const REGEX: Record<PortfolioCanonicalColumn, RegExp[]> = {
  ticker: [/ticker|symbol|asset|holding|stock|equity|종목|티커|자산|코드/i],
  weight: [/weight|allocation|exposure|ratio|percent|position.?size|비중|배분|노출|편입/i],
  return: [/return|pnl|performance|gain|yield|alpha|수익률|성과|손익|알파/i],
  sector: [/sector|industry|theme|category|group|섹터|업종|테마|분류/i],
  asset_class: [/asset.?class|instrument|security.?type|type|자산군|유형|상품/i],
};

const SECTOR_META: Record<string, { ko: string; risk: number; style: string[] }> = {
  technology: { ko: "기술", risk: 82, style: ["growth", "tech-heavy"] },
  tech: { ko: "기술", risk: 82, style: ["growth", "tech-heavy"] },
  communication: { ko: "커뮤니케이션", risk: 72, style: ["growth"] },
  consumer_discretionary: { ko: "경기소비재", risk: 75, style: ["cyclical", "growth"] },
  financials: { ko: "금융", risk: 62, style: ["value", "macro-sensitive"] },
  industrials: { ko: "산업재", risk: 64, style: ["cyclical"] },
  energy: { ko: "에너지", risk: 76, style: ["cyclical", "macro-sensitive"] },
  materials: { ko: "소재", risk: 70, style: ["cyclical", "macro-sensitive"] },
  healthcare: { ko: "헬스케어", risk: 48, style: ["defensive", "growth"] },
  staples: { ko: "필수소비재", risk: 38, style: ["defensive", "dividend"] },
  utilities: { ko: "유틸리티", risk: 34, style: ["defensive", "dividend"] },
  real_estate: { ko: "부동산", risk: 58, style: ["dividend", "macro-sensitive"] },
  cash: { ko: "현금", risk: 5, style: ["defensive"] },
  etf: { ko: "ETF", risk: 48, style: ["mixed"] },
  other: { ko: "기타", risk: 55, style: ["mixed"] },
};

function normHeader(value: string) {
  return value.toLowerCase().replace(/[\s_\-./()[\]{}]+/g, "");
}

function detectColumns(rows: Row[]): PortfolioMapping[] {
  const headers = Object.keys(rows[0] ?? {});
  const mappings: PortfolioMapping[] = [];
  for (const canonical of Object.keys(ALIASES) as PortfolioCanonicalColumn[]) {
    const exactCandidates = headers.filter((header) => ALIASES[canonical].map(normHeader).includes(normHeader(header)));
    const exact = canonical === "weight" ? selectAllocationColumn(exactCandidates) : exactCandidates[0];
    if (exact) {
      mappings.push({ canonical, source: exact, confidence: 0.96, method: "alias" });
      continue;
    }
    const fuzzyCandidates = headers.filter((header) => REGEX[canonical].some((rx) => rx.test(header)));
    const fuzzy = canonical === "weight" ? selectAllocationColumn(fuzzyCandidates) : fuzzyCandidates[0];
    if (fuzzy) mappings.push({ canonical, source: fuzzy, confidence: 0.78, method: "regex" });
  }
  return mappings;
}

function allocationPriority(header: string) {
  const h = normHeader(header);
  if (/normalizedweight/.test(h)) return 1;
  if (/allocationpct|allocationpercent|weightpct|weightpercent/.test(h)) return 2;
  if (/portfolioweight/.test(h)) return 3;
  if (/^weight$|비중|보유비중/.test(h)) return 4;
  if (/allocation|배분/.test(h)) return 5;
  if (/exposure|position|노출/.test(h)) return 6;
  if (/ratio|percent/.test(h)) return 7;
  return 20;
}

function selectAllocationColumn(headers: string[]) {
  return [...headers].sort((a, b) => allocationPriority(a) - allocationPriority(b))[0];
}

function allocationLikeColumns(rows: Row[]) {
  const headers = Object.keys(rows[0] ?? {});
  return headers
    .filter((header) => REGEX.weight.some((rx) => rx.test(header)) || ALIASES.weight.map(normHeader).includes(normHeader(header)))
    .sort((a, b) => allocationPriority(a) - allocationPriority(b));
}

function nullish(value: unknown) {
  if (value == null) return true;
  return /^(|nan|null|none|n\/a|na|-|--|\.)$/i.test(String(value).trim());
}

function looksLikeMetadataRow(row: Row) {
  const values = Object.values(row).map((v) => String(v ?? "").trim()).filter(Boolean);
  if (!values.length) return true;
  const joined = values.join(" ").toLowerCase();
  if (/generated by|portfolio summary|updated:?|as of|note:?|disclaimer|total\b|합계|요약|업데이트|생성/.test(joined)) return true;
  if (values.length === 1 && joined.length > 18 && !/[0-9.%]/.test(joined)) return true;
  return false;
}

function parseNumber(value: unknown, percentMode = false) {
  if (nullish(value)) return NaN;
  let text = String(value).trim().replace(/,/g, "");
  const hadPct = /%$/.test(text);
  text = text.replace(/%$/, "").replace(/[$xX]/g, "");
  const n = Number(text);
  if (!Number.isFinite(n)) return NaN;
  if ((percentMode || hadPct) && Math.abs(n) <= 1 && !hadPct) return n * 100;
  return n;
}

function cleanTicker(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.toUpperCase().replace(/\s+/g, "");
}

function normalizeSector(value: unknown, ticker: string, assetClass: string) {
  const raw = String(value ?? "").trim().toLowerCase();
  const joined = `${raw} ${ticker.toLowerCase()} ${assetClass.toLowerCase()}`;
  if (/cash|mmf|money|현금|예수금/.test(joined)) return "cash";
  if (/etf|fund|trust/.test(joined)) return raw || "etf";
  if (/tech|software|semiconductor|internet|ai|기술|반도체|소프트웨어/.test(joined)) return "technology";
  if (/communication|media|telecom|커뮤니케이션|미디어/.test(joined)) return "communication";
  if (/consumer.*disc|discretionary|retail|경기소비/.test(joined)) return "consumer_discretionary";
  if (/financial|bank|insurance|금융|은행|보험/.test(joined)) return "financials";
  if (/industrial|산업/.test(joined)) return "industrials";
  if (/energy|oil|gas|에너지|정유/.test(joined)) return "energy";
  if (/material|chemical|소재|화학/.test(joined)) return "materials";
  if (/health|bio|pharma|헬스|바이오|제약/.test(joined)) return "healthcare";
  if (/staple|food|필수소비/.test(joined)) return "staples";
  if (/utilit|전력|유틸/.test(joined)) return "utilities";
  if (/real|reit|부동산/.test(joined)) return "real_estate";
  return raw ? raw.replace(/\s+/g, "_") : "other";
}

function sectorKo(sector: string) {
  return SECTOR_META[sector]?.ko ?? sector.replace(/_/g, " ");
}

function normalizeAssetClass(value: unknown, ticker: string) {
  const raw = String(value ?? "").trim().toLowerCase();
  const joined = `${raw} ${ticker.toLowerCase()}`;
  if (/cash|현금|예수금|mmf/.test(joined)) return "현금";
  if (/etf|fund/.test(joined)) return "ETF";
  if (/bond|채권/.test(raw)) return "채권";
  if (/crypto|coin|btc|eth|가상/.test(joined)) return "디지털자산";
  return raw ? raw.toUpperCase() : "주식";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

function classifyConcentration(hhi: number, top: number, count: number): PortfolioAnalysis["concentrationLevel"] {
  if (top >= 30 || hhi >= 1800) return "Highly Concentrated";
  if (count >= 60 && hhi < 350) return "Overdiversified";
  if (hhi < 700 && top < 18) return "Diversified";
  return "Balanced";
}

function concentrationKo(level: PortfolioAnalysis["concentrationLevel"]) {
  return {
    "Highly Concentrated": "고집중",
    Balanced: "균형형",
    Diversified: "분산형",
    Overdiversified: "과분산",
  }[level];
}

function classifyRisk(avgSectorRisk: number, hhi: number, leverage: number, returnDispersion: number) {
  const risk = avgSectorRisk + Math.max(0, hhi - 800) / 55 + Math.max(0, leverage - 100) * 0.45 + returnDispersion * 0.5;
  if (risk >= 78) return "aggressive" as const;
  if (risk <= 45) return "defensive" as const;
  return "moderate" as const;
}

function riskKo(value: PortfolioAnalysis["riskProfile"]) {
  return { aggressive: "공격형", moderate: "중립형", defensive: "방어형" }[value];
}

function fragilityKo(score: number) {
  if (score >= 72) return "높음";
  if (score >= 45) return "중간";
  return "낮음";
}

function exposureLabel(gross: number, leverage: number, shortExposure: number) {
  if (gross <= 100.5 && shortExposure < 1) return "완전 투자";
  if (shortExposure >= 5) return leverage > 25 ? "공격적 롱숏 노출" : "롱숏 노출";
  if (leverage > 25) return "공격적 레버리지";
  if (leverage > 10) return "레버리지 확대";
  if (leverage > 0.5) return "완만한 레버리지";
  return "완전 투자";
}

function exposureInterpretation(gross: number, net: number, longExposure: number, shortExposure: number, leverage: number) {
  if (gross <= 100.5 && shortExposure < 1) {
    return `총 노출 ${gross.toFixed(1)}%, 순 노출 ${net.toFixed(1)}%로 레버리지 없이 대부분 완전 투자된 구조입니다.`;
  }
  if (shortExposure >= 1) {
    return `롱 노출 ${longExposure.toFixed(1)}%, 숏 노출 ${shortExposure.toFixed(1)}%로 총 노출은 ${gross.toFixed(1)}%입니다. 순 노출 ${net.toFixed(1)}%는 방향성 베팅 크기를, 총 노출은 변동성 민감도를 보여줍니다.`;
  }
  return `총 노출 ${gross.toFixed(1)}%는 완전 투자 자본을 ${leverage.toFixed(1)}%p 초과한 구조입니다. 이는 추가 방향성 노출을 의미하며 상승 참여도와 변동성 민감도를 함께 확대합니다.`;
}

function conditionLabel(level: PortfolioAnalysis["concentrationLevel"], risk: PortfolioAnalysis["riskProfile"], score: number, styles: string[]) {
  if (level === "Highly Concentrated" && styles.includes("모멘텀")) return "과집중 모멘텀 포트폴리오";
  if (risk === "defensive") return "방어적 자본보존 구조";
  if (score >= 70 && styles.includes("성장")) return "균형 성장 포트폴리오";
  if (score < 45 && risk === "aggressive") return "고위험 성장 노출";
  if (level === "Diversified") return "분산형 멀티섹터 포트폴리오";
  return "혼합형 포트폴리오 구조";
}

function regimeLabel(score: number, risk: PortfolioAnalysis["riskProfile"], level: PortfolioAnalysis["concentrationLevel"]) {
  if (score >= 68 && risk !== "aggressive") return "Bullish";
  if (risk === "defensive") return "Defensive";
  if (level === "Highly Concentrated" || score < 45) return "Neutral";
  return "Neutral";
}

export function buildPortfolioAnalysis(inputRows: Row[]): PortfolioAnalysis {
  const base: PortfolioAnalysis = {
    detected: false,
    mappings: [],
    rowCount: inputRows.length,
    holdings: [],
    sectorAllocation: [],
    assetClassAllocation: [],
    totalOriginalWeight: 0,
    leverage: 0,
    netExposure: 0,
    grossExposure: 0,
    longExposure: 0,
    shortExposure: 0,
    leverageAmount: 0,
    exposureLabelKo: "노출 제한",
    exposureInterpretationKo: "노출 구조를 계산할 수 있는 비중 데이터가 부족합니다.",
    weightedReturn: null,
    totalReturn: null,
    topHolding: null,
    bestHolding: null,
    weakestHolding: null,
    dominantSector: null,
    strongestSector: null,
    weakestSector: null,
    hhi: 0,
    topHoldingWeight: 0,
    top5Weight: 0,
    concentrationLevel: "Balanced",
    concentrationLevelKo: "균형형",
    riskProfile: "moderate",
    riskProfileKo: "중립형",
    style: ["혼합"],
    score: {
      alpha: 50,
      confidence: "LOW",
      regimeLabel: "Neutral",
      conditionLabel: "분석 제한 포트폴리오",
      diversificationScore: 50,
      concentrationScore: 50,
      consistencyScore: 50,
      riskAdjustedMomentum: 50,
      sectorDependencyScore: 50,
      contributionBreadthScore: 50,
      fragilityScore: 50,
      leveragePressureScore: 0,
      capitalEfficiencyScore: 50,
    },
    connectedNarrativeKo: "분석 가능한 포트폴리오 구조가 제한적입니다.",
    fragilityLevelKo: "중간",
    primaryChartFocusKo: "데이터 보강 필요",
    risks: [],
    strengthsKo: [],
    weaknessesKo: [],
    warningsKo: ["포트폴리오 컬럼이 충분히 감지되지 않았습니다."],
    aiSummaryKo: "포트폴리오 데이터가 충분하지 않아 제한적인 분석만 가능합니다.",
    optimizationKo: ["티커와 비중 컬럼을 추가하면 분석 깊이가 개선됩니다."],
    degradationKo: [],
  };

  const rows = inputRows.filter((row) => Object.values(row).some((v) => !nullish(v)) && !looksLikeMetadataRow(row));
  if (!rows.length) return base;

  const mappings = detectColumns(rows);
  const get = (c: PortfolioCanonicalColumn) => mappings.find((m) => m.canonical === c)?.source;
  const tickerCol = get("ticker");
  const weightCol = get("weight");
  const returnCol = get("return");
  const sectorCol = get("sector");
  const assetClassCol = get("asset_class");
  const detected = !!weightCol || (!!tickerCol && (!!sectorCol || !!returnCol || !!assetClassCol));
  if (!detected) return { ...base, mappings };

  const degradationKo: string[] = [];
  const allocationColumns = allocationLikeColumns(rows);
  const ignoredAllocationColumns = weightCol ? allocationColumns.filter((column) => column !== weightCol) : [];
  const explicitLeverageSource = !!weightCol && /exposure|position|leverage|gross|notional|노출/.test(normHeader(weightCol));
  if (!tickerCol) degradationKo.push("티커 컬럼이 없어 행 번호 기반 보유자산명을 사용합니다.");
  if (!weightCol) degradationKo.push("비중 컬럼이 없어 동일가중을 가정합니다.");
  if (weightCol) degradationKo.push(`비중 입력은 '${weightCol}' 컬럼만 사용합니다. 중복 비중 표현은 합산하지 않습니다.`);
  if (ignoredAllocationColumns.length) degradationKo.push(`중복 가능성이 있는 비중 컬럼(${ignoredAllocationColumns.join(", ")})은 보조 메타데이터로 처리했습니다.`);
  if (!returnCol) degradationKo.push("수익률 컬럼이 없어 성과 분석은 제한됩니다.");
  if (!sectorCol) degradationKo.push("섹터 컬럼이 없어 티커/자산군 기반으로 섹터를 추정합니다.");

  const interim = rows.map((row, index) => {
    const ticker = tickerCol ? cleanTicker(row[tickerCol]) || `자산${index + 1}` : `자산${index + 1}`;
    const weight = weightCol ? parseNumber(row[weightCol], true) : 100 / rows.length;
    const ret = returnCol ? parseNumber(row[returnCol], true) : NaN;
    const ac = normalizeAssetClass(assetClassCol ? row[assetClassCol] : null, ticker);
    const sector = normalizeSector(sectorCol ? row[sectorCol] : null, ticker, ac);
    return { ticker, weight: Number.isFinite(weight) ? weight : 0, ret: Number.isFinite(ret) ? ret : null, sector, assetClass: ac };
  }).filter((item) => item.ticker && Number.isFinite(item.weight));

  const grouped = new Map<string, PortfolioHolding>();
  interim.forEach((item) => {
    const prev = grouped.get(item.ticker);
    if (!prev) {
      grouped.set(item.ticker, {
        ticker: item.ticker,
        sector: item.sector,
        assetClass: item.assetClass,
        originalWeight: item.weight,
        normalizedWeight: 0,
        returnPct: item.ret,
        contribution: 0,
        isShort: item.weight < 0,
        isCash: item.sector === "cash" || item.assetClass === "현금",
        sourceRows: 1,
      });
      return;
    }
    const totalWeight = prev.originalWeight + item.weight;
    const combinedReturn = prev.returnPct != null && item.ret != null && totalWeight !== 0
      ? ((prev.returnPct * prev.originalWeight) + (item.ret * item.weight)) / totalWeight
      : prev.returnPct ?? item.ret;
    prev.originalWeight = totalWeight;
    prev.returnPct = combinedReturn;
    prev.isShort = prev.isShort || item.weight < 0;
    prev.sourceRows += 1;
  });

  const holdings = Array.from(grouped.values());
  const rawLong = holdings.reduce((sum, h) => sum + Math.max(0, h.originalWeight), 0);
  const rawShort = holdings.reduce((sum, h) => sum + Math.abs(Math.min(0, h.originalWeight)), 0);
  const rawGross = rawLong + rawShort;
  const rawNet = rawLong - rawShort;
  const exposureAnomaly = rawGross > 250 && !explicitLeverageSource;
  const longExposure = exposureAnomaly ? 100 : rawLong;
  const shortExposure = exposureAnomaly ? 0 : rawShort;
  const gross = longExposure + shortExposure;
  const net = longExposure - shortExposure;
  const leverageAmount = Math.max(0, gross - 100);
  const exposureLabelKo = exposureLabel(gross, leverageAmount, shortExposure);
  const exposureInterpretationKo = exposureInterpretation(gross, net, longExposure, shortExposure, leverageAmount);
  if (exposureAnomaly) {
    degradationKo.push("원 비중 합계가 비현실적 범위를 벗어나 중복 비중/퍼센트 변환 가능성을 감지했습니다. 대시보드 노출은 정규화 기준 100%로 재계산합니다.");
  }
  const denominator = rawGross || holdings.length || 1;
  holdings.forEach((h) => {
    h.normalizedWeight = (h.originalWeight / denominator) * 100;
    h.contribution = h.returnPct == null ? 0 : h.normalizedWeight * h.returnPct / 100;
  });
  holdings.sort((a, b) => Math.abs(b.normalizedWeight) - Math.abs(a.normalizedWeight));

  const sectorMap = new Map<string, { weight: number; contribution: number; weightedReturn: number; risk: number }>();
  holdings.forEach((h) => {
    const prev = sectorMap.get(h.sector) ?? { weight: 0, contribution: 0, weightedReturn: 0, risk: SECTOR_META[h.sector]?.risk ?? 55 };
    prev.weight += h.normalizedWeight;
    prev.contribution += h.contribution;
    if (h.returnPct != null) prev.weightedReturn += h.returnPct * Math.abs(h.normalizedWeight);
    sectorMap.set(h.sector, prev);
  });
  const sectorAllocation = Array.from(sectorMap.entries()).map(([sector, value]) => ({
    sector: sectorKo(sector),
    weight: value.weight,
    contribution: value.contribution,
    returnPct: Math.abs(value.weight) > 0 ? value.weightedReturn / Math.abs(value.weight) : null,
    risk: value.risk,
  })).sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  const classMap = new Map<string, number>();
  holdings.forEach((h) => classMap.set(h.assetClass, (classMap.get(h.assetClass) ?? 0) + h.normalizedWeight));
  const assetClassAllocation = Array.from(classMap.entries()).map(([assetClass, weight]) => ({ assetClass, weight }));

  const weightedReturn = holdings.some((h) => h.returnPct != null) ? holdings.reduce((sum, h) => sum + h.contribution, 0) : null;
  const totalReturn = holdings.some((h) => h.returnPct != null) ? mean(holdings.map((h) => h.returnPct ?? NaN)) : null;
  const returnDispersion = std(holdings.map((h) => h.returnPct ?? NaN));
  const absWeights = holdings.map((h) => Math.abs(h.normalizedWeight));
  const hhi = absWeights.reduce((sum, w) => sum + w * w, 0);
  const topHoldingWeight = absWeights[0] ?? 0;
  const top5Weight = absWeights.slice(0, 5).reduce((a, b) => a + b, 0);
  const concentrationLevel = classifyConcentration(hhi, topHoldingWeight, holdings.length);
  const avgSectorRisk = sectorAllocation.reduce((sum, s) => sum + s.risk * Math.abs(s.weight) / 100, 0);
  const riskProfile = classifyRisk(avgSectorRisk, hhi, gross, returnDispersion);

  const styleVotes = new Map<string, number>();
  sectorAllocation.forEach((s) => {
    const key = Object.entries(SECTOR_META).find(([, meta]) => meta.ko === s.sector)?.[0] ?? "other";
    (SECTOR_META[key]?.style ?? ["mixed"]).forEach((style) => styleVotes.set(style, (styleVotes.get(style) ?? 0) + Math.abs(s.weight)));
  });
  if ((weightedReturn ?? 0) > 5) styleVotes.set("momentum", (styleVotes.get("momentum") ?? 0) + 25);
  const style = Array.from(styleVotes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => ({
    growth: "성장",
    value: "가치",
    dividend: "배당",
    "tech-heavy": "기술주 중심",
    "macro-sensitive": "매크로 민감",
    cyclical: "경기민감",
    defensive: "방어",
    momentum: "모멘텀",
    mixed: "혼합",
  }[s] ?? s));

  const diversificationScore = clamp(Math.round(100 - hhi / 28 - Math.max(0, topHoldingWeight - 15) * 1.5), 0, 100);
  const concentrationScore = clamp(Math.round(100 - diversificationScore), 0, 100);
  const consistencyScore = holdings.some((h) => h.returnPct != null) ? clamp(Math.round(100 - returnDispersion * 4 - Math.max(0, top5Weight - 55) * 0.5), 0, 100) : 50;
  const riskAdjustedMomentum = weightedReturn == null ? 50 : clamp(Math.round(50 + weightedReturn * 4.2 - returnDispersion * 1.4 - Math.max(0, gross - 100) * 0.18), 0, 100);
  const dominantSectorWeight = Math.abs(sectorAllocation[0]?.weight ?? 0);
  const sectorDependencyScore = clamp(Math.round(100 - Math.max(0, dominantSectorWeight - 25) * 1.7 - Math.max(0, sectorAllocation.length < 4 ? (4 - sectorAllocation.length) * 10 : 0)), 0, 100);
  const contributionAbs = holdings.filter((h) => h.returnPct != null).map((h) => Math.abs(h.contribution));
  const totalContributionAbs = contributionAbs.reduce((a, b) => a + b, 0);
  const contributionHhi = totalContributionAbs > 0 ? contributionAbs.reduce((sum, c) => sum + (c / totalContributionAbs * 100) ** 2, 0) : 1000;
  const contributionBreadthScore = holdings.some((h) => h.returnPct != null) ? clamp(Math.round(100 - contributionHhi / 35 - Math.max(0, topHoldingWeight - 25) * 0.8), 0, 100) : 50;
  const leveragePressureScore = clamp(Math.round(leverageAmount * 1.35 + holdings.filter((h) => h.isShort).length * 8), 0, 100);
  const fragilityScore = clamp(Math.round(
    concentrationScore * 0.28 +
    (100 - sectorDependencyScore) * 0.24 +
    leveragePressureScore * 0.24 +
    (100 - contributionBreadthScore) * 0.16 +
    Math.max(0, returnDispersion - 5) * 1.6
  ), 0, 100);
  const capitalEfficiencyScore = weightedReturn == null
    ? clamp(Math.round(58 - leveragePressureScore * 0.25 - concentrationScore * 0.12), 0, 100)
    : clamp(Math.round(50 + weightedReturn * 3.2 - leveragePressureScore * 0.35 - Math.max(0, topHoldingWeight - 25) * 0.35), 0, 100);
  const concentrationPenalty = Math.max(0, topHoldingWeight - 20) * 0.45 + Math.max(0, hhi - 1000) / 150;
  const leveragePenalty = Math.max(0, gross - 130) * 0.28 + Math.max(0, gross - 180) * 0.18;
  const diversificationBonus = diversificationScore > 70 && contributionBreadthScore > 60 ? 7 : diversificationScore > 55 ? 4 : 0;
  const rawAlpha = Math.round(
    diversificationScore * 0.24 +
    sectorDependencyScore * 0.14 +
    contributionBreadthScore * 0.16 +
    consistencyScore * 0.12 +
    riskAdjustedMomentum * 0.14 +
    capitalEfficiencyScore * 0.12 +
    (100 - fragilityScore) * 0.08 +
    diversificationBonus -
    concentrationPenalty -
    leveragePenalty
  );
  const positiveContributionCount = holdings.filter((h) => h.contribution > 0).length;
  const catastrophic =
    (weightedReturn ?? 0) < 0 &&
    leveragePressureScore >= 85 &&
    diversificationScore < 25 &&
    concentrationScore > 75 &&
    contributionBreadthScore < 25;
  const stabilityFloor =
    weightedReturn != null && weightedReturn > 0 && positiveContributionCount >= 3 && diversificationScore >= 45
      ? 45
      : weightedReturn != null && weightedReturn > 0 && contributionBreadthScore >= 35
      ? 38
      : catastrophic
      ? 0
      : 20;
  const alpha = clamp(Math.max(rawAlpha, stabilityFloor), 0, 100);

  const topHolding = holdings[0] ?? null;
  const bestHolding = holdings.filter((h) => h.returnPct != null).sort((a, b) => b.contribution - a.contribution)[0] ?? null;
  const weakestHolding = holdings.filter((h) => h.returnPct != null).sort((a, b) => a.contribution - b.contribution)[0] ?? null;
  const dominantSector = sectorAllocation[0]?.sector ?? null;
  const strongestSector = sectorAllocation.filter((s) => s.returnPct != null).sort((a, b) => b.contribution - a.contribution)[0]?.sector ?? null;
  const weakestSector = sectorAllocation.filter((s) => s.returnPct != null).sort((a, b) => a.contribution - b.contribution)[0]?.sector ?? null;
  const confidence: PortfolioScore["confidence"] =
    exposureAnomaly ? "LOW" :
    leverageAmount > 25 && alpha >= 70 ? "MEDIUM" :
    leverageAmount > 10 && alpha >= 70 ? "MEDIUM" :
    mappings.length >= 4 && holdings.length >= 5 ? "HIGH" :
    mappings.length >= 2 ? "MEDIUM" : "LOW";
  const regime = regimeLabel(alpha, riskProfile, concentrationLevel);
  const condition = conditionLabel(concentrationLevel, riskProfile, alpha, style);

  const risks: PortfolioRisk[] = [];
  if (topHoldingWeight > 25) risks.push({ label: "단일 종목 의존", severity: "HIGH", value: `${topHoldingWeight.toFixed(1)}%`, descriptionKo: "상위 보유자산이 포트폴리오 성과와 손실을 과도하게 좌우합니다." });
  if (dominantSectorWeight > 40) risks.push({ label: "섹터 과집중", severity: "HIGH", value: `${sectorAllocation[0].weight.toFixed(1)}%`, descriptionKo: `${sectorAllocation[0].sector} 섹터 노출이 높아 섹터 이벤트가 전체 성과와 손실을 동시에 흔들 수 있습니다.` });
  if (leverageAmount > 25) risks.push({ label: "레버리지 확대", severity: "HIGH", value: `+${leverageAmount.toFixed(1)}%`, descriptionKo: `총 노출 ${gross.toFixed(1)}%는 완전 투자 기준을 크게 초과해 변동성 및 손실 민감도를 높입니다.` });
  else if (leverageAmount > 0.5) risks.push({ label: "완만한 레버리지", severity: "MEDIUM", value: `+${leverageAmount.toFixed(1)}%`, descriptionKo: `총 노출 ${gross.toFixed(1)}%로 완전 투자 자본을 소폭 초과합니다. 방향성 참여도는 높아지지만 변동성 민감도도 함께 증가합니다.` });
  if (holdings.some((h) => h.isShort)) risks.push({ label: "숏 포지션 포함", severity: "MEDIUM", value: `${holdings.filter((h) => h.isShort).length}개`, descriptionKo: "음수 비중이 포함되어 롱 또는 롱숏 구조로 해석됩니다." });
  if (returnDispersion > 8) risks.push({ label: "성과 분산 확대", severity: "MEDIUM", value: `${returnDispersion.toFixed(1)}%`, descriptionKo: "보유자산 간 성과 격차가 커 일부 자산 의존도가 높을 수 있습니다." });

  const strengthsKo = [
    diversificationScore >= 65 && contributionBreadthScore >= 55 ? "비중 분산과 기여도 분산이 동시에 확인되어 성과 의존도가 완화됩니다." : null,
    weightedReturn != null && weightedReturn > 0 && capitalEfficiencyScore >= 50 ? `가중 수익률 ${weightedReturn.toFixed(2)}%가 노출 대비 효율을 뒷받침합니다.` : null,
    sectorAllocation.length >= 5 && sectorDependencyScore >= 60 ? "복수 섹터 노출이 주도 섹터 충격을 일부 흡수합니다." : null,
    gross <= 105 ? "총 노출이 100% 부근이라 레버리지 압력이 제한적입니다." : null,
  ].filter(Boolean) as string[];
  const weaknessesKo = [
    concentrationLevel === "Highly Concentrated" ? "상위 보유자산 집중도가 높아 성과와 위험이 같은 자산군에 묶입니다." : null,
    dominantSectorWeight > 35 ? `${dominantSector} 섹터 비중이 높아 분산 점수보다 실제 섹터 의존도가 더 큽니다.` : null,
    weightedReturn != null && weightedReturn < 0 ? "가중 수익률이 마이너스라 현재 배분이 자본 효율을 만들지 못합니다." : null,
    returnDispersion > 8 ? "수익률 분산이 커 승자와 패자의 격차가 포트폴리오 안정성을 낮춥니다." : null,
    leveragePressureScore >= 35 ? "레버리지 사용이 분산 효과를 일부 약화시키며 변동성 확대 구간의 손실 민감도를 높입니다." : null,
  ].filter(Boolean) as string[];

  const warningsKo = [
    ...degradationKo,
    Math.abs(net - 100) > 2 && weightCol ? `원 비중 합계가 ${net.toFixed(1)}%로 100%와 달라 normalized_weight를 별도로 계산했습니다.` : null,
    holdings.some((h) => h.sourceRows > 1) ? "중복 티커가 감지되어 가능한 경우 비중과 수익률을 병합했습니다." : null,
  ].filter(Boolean) as string[];

  const fragilityLevelKo = fragilityKo(fragilityScore);
  const primaryChartFocusKo = leveragePressureScore >= 35
    ? "레버리지 압력과 순/총 노출"
    : concentrationScore >= 55
    ? "상위 보유자산 의존도"
    : sectorDependencyScore < 55
    ? "섹터 의존도와 숨은 클러스터"
    : contributionBreadthScore < 50
    ? "성과 기여도 집중"
    : "분산과 기여도 균형";
  const leverageTone = leverageAmount > 25
    ? "공격적인 레버리지 사용이 상승 참여도를 키우지만 변동성 확대 시 손실 민감도도 크게 높입니다."
    : leverageAmount > 0.5
    ? "완전 투자 자본을 소폭 초과한 완만한 레버리지가 방향성 노출과 변동성 민감도를 함께 높입니다."
    : "레버리지 사용은 제한적이며 성과는 주로 보유자산 선택과 섹터 배분에서 발생합니다.";
  const connectedNarrativeKo = `${exposureLabelKo} 구조가 현재 포트폴리오 해석의 출발점입니다. ${exposureInterpretationKo} ${dominantSector ? `${dominantSector} 중심 노출과 ` : ""}기여도 폭 ${contributionBreadthScore}, 분산 점수 ${diversificationScore}가 결합되어 알파 점수 ${alpha}와 취약성 ${fragilityLevelKo}을 형성합니다.`;
  const aiSummaryKo = `이 포트폴리오는 ${condition}로 분류됩니다. ${exposureInterpretationKo} 상위 보유자산 비중은 ${topHoldingWeight.toFixed(1)}%, HHI는 ${hhi.toFixed(0)}이며 ${dominantSector ?? "추정 제한"} 섹터 노출이 ${dominantSectorWeight.toFixed(1)}%입니다. ${weightedReturn == null ? "수익률 데이터가 없어 성과 평가는 배분 구조 중심으로 제한됩니다." : `가중 수익률은 ${weightedReturn.toFixed(2)}%이고 기여도 폭 점수는 ${contributionBreadthScore}입니다.`} ${leverageTone}`;
  const optimizationKo = [
    topHoldingWeight > 25 ? "상위 단일 보유자산 비중을 낮춰 성과 의존도를 완화하세요." : "상위 보유자산 비중은 현재 구조를 유지해도 무리가 크지 않습니다.",
    dominantSectorWeight > 35 ? `${dominantSector} 섹터 노출을 줄이고 비상관 섹터를 보강하세요.` : "섹터 배분은 비교적 균형적입니다.",
    weightedReturn != null && weakestHolding ? `${weakestHolding.ticker}처럼 기여도가 낮은 보유자산은 리밸런싱 후보로 점검하세요.` : "수익률 컬럼을 추가하면 리밸런싱 후보 선별이 개선됩니다.",
  ];

  return {
    detected: true,
    mappings,
    rowCount: rows.length,
    holdings,
    sectorAllocation,
    assetClassAllocation,
    totalOriginalWeight: net,
    leverage: gross,
    netExposure: net,
    grossExposure: gross,
    longExposure,
    shortExposure,
    leverageAmount,
    exposureLabelKo,
    exposureInterpretationKo,
    weightedReturn,
    totalReturn,
    topHolding,
    bestHolding,
    weakestHolding,
    dominantSector,
    strongestSector,
    weakestSector,
    hhi,
    topHoldingWeight,
    top5Weight,
    concentrationLevel,
    concentrationLevelKo: concentrationKo(concentrationLevel),
    riskProfile,
    riskProfileKo: riskKo(riskProfile),
    style,
    score: {
      alpha,
      confidence,
      regimeLabel: regime,
      conditionLabel: condition,
      diversificationScore,
      concentrationScore,
      consistencyScore,
      riskAdjustedMomentum,
      sectorDependencyScore,
      contributionBreadthScore,
      fragilityScore,
      leveragePressureScore,
      capitalEfficiencyScore,
    },
    connectedNarrativeKo,
    fragilityLevelKo,
    primaryChartFocusKo,
    risks,
    strengthsKo,
    weaknessesKo,
    warningsKo,
    aiSummaryKo,
    optimizationKo,
    degradationKo,
  };
}
