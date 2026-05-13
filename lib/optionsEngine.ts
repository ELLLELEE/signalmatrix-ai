import type { Row } from "@/lib/dataPipeline";

// ─── Column Types ─────────────────────────────────────────────────────────────

export type OptionCanonicalColumn =
  | "put_call_ratio" | "implied_volatility" | "open_interest" | "gamma"
  | "delta" | "theta" | "vega" | "call_volume" | "put_volume"
  | "call_oi" | "put_oi" | "strike_price" | "expiration_date"
  | "contract_type" | "option_price" | "underlying_price"
  | "days_to_expiry" | "gamma_exposure" | "iv_percentile"
  | "dealer_gamma" | "net_gamma" | "volume" | "bid" | "ask";

export type OptionColumnMapping = {
  canonical: OptionCanonicalColumn;
  source: string;
  confidence: number;
};

export type DatasetType = "aggregated" | "contract-level" | "mixed" | "snapshot";

export type OptionRiskLabel =
  | "Low Option Risk" | "Moderate Option Risk" | "High Option Risk" | "Extreme Option Risk";

export type OptionAlphaImpact = "supportive" | "neutral" | "cautionary" | "risk-off";

export type OptionsRiskScore = {
  score: number;
  label: OptionRiskLabel;
  confidence: "Low" | "Medium" | "High";
  alphaImpact: OptionAlphaImpact;
  components: {
    pcrStress: number;
    ivStress: number;
    gammaInstability: number;   // gammaRisk: high = more risk, low = stable positive gamma
    putDominanceStress: number; // derived from put/call volume ratio
    oiConcentration: number;
    expiryPressure: number;
    strikeConcentration: number;
    unusualActivity: number;
    liquidityStability: number;
    skewPressure: number;
    flowImbalance: number;
  };
  activeComponentCount: number;
  explanation: string;
  warnings: string[];
};

export type OptionSeriesPoint = { date: string; value: number };

export type OptionScenario = {
  type: "bullish" | "neutral" | "risk";
  title: string;
  condition: string;
  signals: string[];
  invalidation: string;
};

export type OptionsAnalysis = {
  detected: boolean;
  datasetType: DatasetType;
  confidence: number;          // 0–1
  confidenceScore: number;     // 0–100
  confidenceLabel: string;
  mapping: OptionColumnMapping[];
  availableFields: OptionCanonicalColumn[];
  rowCount: number;
  rows: Row[];
  dates: string[];
  pcrDerived: boolean;         // true if PCR was computed from put/call volumes

  // Aggregated time-series (date-deduplicated)
  pcrSeries: OptionSeriesPoint[];
  ivSeries: OptionSeriesPoint[];
  oiSeries: OptionSeriesPoint[];
  gammaSeries: OptionSeriesPoint[];
  gammaExposureSeries: OptionSeriesPoint[];
  callPutVolSeries: { date: string; call: number; put: number; total: number }[];

  // Latest snapshot values
  latestPCR: number | null;
  pcrTrend: number | null;        // 5-period change
  latestIV: number | null;
  ivTrend: number | null;
  latestOI: number | null;
  oiChange: number | null;        // pct change latest vs prev
  latestGamma: number | null;
  latestGammaExposure: number | null;
  latestDelta: number | null;
  latestUnderlying: number | null;
  ivPercentile: number | null;

  // Strike-level data (contract-level)
  strikeData: {
    strike: number;
    callOI: number; putOI: number;
    callVol: number; putVol: number;
    totalOI: number;
    totalVol: number;
    gammaExposure: number;
    iv: number | null;
    gamma: number | null;
  }[];
  topCallStrike: number | null;
  topPutStrike: number | null;
  topCallStrikeDetail: { strike: number; oi: number; volume: number; dominance: number } | null;
  topPutStrikeDetail: { strike: number; oi: number; volume: number; dominance: number } | null;
  gammaFlipZone: number | null;

  // Expiry distribution
  expiryData: { expiry: string; totalOI: number; callOI: number; putOI: number; totalVolume: number; gammaExposure: number; daysLeft: number }[];
  nearTermPressure: number;    // 0–100

  // Scores
  riskScore: OptionsRiskScore | null;

  // Signals
  signals: {
    label: string;
    value: number;
    tone: "good" | "warn" | "bad";
    note: string;
    confidence: "high" | "medium" | "low";
    impact: string;
  }[];
  crossSignals: string[];      // composite multi-signal interpretations

  // AI outputs
  insights: string[];
  aiSummary: {
    condition: string;
    riskExplanation: string;
    observations: string[];
    scenarios: OptionScenario[];
    alphaNote: string;
  };

  preprocessingWarnings: string[];
};

// ─── Detection Dictionaries ───────────────────────────────────────────────────

const EXACT_OPTIONS: Record<OptionCanonicalColumn, string[]> = {
  put_call_ratio: ["put_call_ratio", "pcr", "put/call", "put_call", "p/c_ratio", "p/cratio", "putcallratio", "put call ratio", "풋콜비율", "풋/콜", "풋콜"],
  implied_volatility: ["implied_volatility", "iv", "impl_vol", "impliedvol", "imp_vol", "option_iv", "내재변동성", "변동성", "암묵적변동성"],
  open_interest: ["open_interest", "oi", "openinterest", "total_oi", "option_interest", "outstanding_contracts", "미결제약정", "미결제", "오픈인터레스트"],
  gamma: ["gamma", "option_gamma", "감마"],
  delta: ["delta", "δ", "델타"],
  theta: ["theta", "θ", "세타"],
  vega: ["vega", "베가"],
  call_volume: ["call_volume", "call_vol", "callvolume", "calls_volume", "call vol", "콜거래량", "콜볼륨"],
  put_volume: ["put_volume", "put_vol", "putvolume", "puts_volume", "put vol", "풋거래량", "풋볼륨"],
  call_oi: ["call_oi", "call_open_interest", "calloi", "call_interest", "콜미결제", "call oi"],
  put_oi: ["put_oi", "put_open_interest", "putoi", "put_interest", "풋미결제", "put oi"],
  strike_price: ["strike", "strike_price", "strikeprice", "strike_px", "exercise_price", "행사가", "행사가격"],
  expiration_date: ["expiration_date", "expiry", "expiration", "exp_date", "expiry_date", "maturity", "만기일", "만기"],
  contract_type: ["contract_type", "option_type", "type", "call_put", "cp", "call/put", "옵션종류", "콜풋", "구분", "옵션구분"],
  option_price: ["option_price", "premium", "옵션가격", "프리미엄"],
  underlying_price: ["underlying_price", "underlying", "spot", "spot_price", "stock_price", "기초자산가격", "현물가"],
  days_to_expiry: ["days_to_expiry", "dte", "days_left", "days_to_exp", "잔존일수", "만기일수"],
  gamma_exposure: ["gamma_exposure", "gex", "gammaex", "gamma_exp", "net_gex", "dealer_gex", "감마노출", "감마익스포저"],
  iv_percentile: ["iv_percentile", "iv_rank", "ivp", "iv_pct", "변동성백분위", "iv순위"],
  dealer_gamma: ["dealer_gamma", "dealer_gex", "딜러감마"],
  net_gamma: ["net_gamma", "netgamma", "순감마"],
  volume: ["volume", "option_volume", "total_volume", "거래량"],
  bid: ["bid", "bid_price", "매수호가"],
  ask: ["ask", "ask_price", "매도호가"],
};

const REGEX_OPTIONS: Partial<Record<OptionCanonicalColumn, RegExp>> = {
  put_call_ratio: /p[_\s]?c[_\s]?ratio|put[_\s]?call|pcr\b/i,
  implied_volatility: /impl[_\s]?vol|implied[_\s]?vol|iv[_\s]|[_\s]iv\b/i,
  open_interest: /open[_\s]?int|[_\s]oi\b|미결제/i,
  gamma_exposure: /gamma[_\s]?exp|gex\b/i,
  call_volume: /call[_\s]?vol/i,
  put_volume: /put[_\s]?vol/i,
  iv_percentile: /iv[_\s]?p(ct|ercentile|rank)|ivr\b/i,
  dealer_gamma: /dealer[_\s]?gamma/i,
  net_gamma: /net[_\s]?gamma/i,
};

// ─── Normalization Helpers ────────────────────────────────────────────────────

function normKey(s: string) {
  return s.toLowerCase().replace(/[\s_()\[\]{}\-.]/g, "");
}

const NULL_SET = new Set(["nan", "null", "none", "na", "n/a", "n.a.", "#n/a", "-", "--", "", "결측", "없음"]);

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  let s = String(v).trim();
  if (NULL_SET.has(s.toLowerCase())) return null;
  const isPct = s.endsWith("%");
  s = s.replace(/,/g, "").replace(/%$/, "").trim();
  const n = parseFloat(s);
  if (!isFinite(n)) return null;
  // percentage strings: keep as-is (let caller decide unit)
  return isPct ? n : n;
}

function parseStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s && !NULL_SET.has(s.toLowerCase()) ? s : null;
}

function optionSide(raw: unknown): "call" | "put" | null {
  const s = parseStr(raw)?.toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  if (["call", "c", "calls", "콜", "콜옵션"].includes(s)) return "call";
  if (["put", "p", "puts", "풋", "풋옵션"].includes(s)) return "put";
  return null;
}

function cleanPositive(v: number | null): number {
  return v !== null && Number.isFinite(v) ? Math.max(0, v) : 0;
}

function percentileOfLast(vals: number[]): number | null {
  if (!vals.length) return null;
  const last = vals[vals.length - 1];
  const sorted = [...vals].sort((a, b) => a - b);
  const rank = sorted.filter((v) => v <= last).length - 1;
  return Math.max(0, Math.min(100, Math.round((rank / Math.max(1, sorted.length - 1)) * 100)));
}

function mean(vals: number[]): number {
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
}

function std(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  return Math.sqrt(mean(vals.map((v) => (v - m) ** 2)));
}

function validPct(v: number | null): number | null {
  return v !== null && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null;
}

// ─── Column Detection ─────────────────────────────────────────────────────────

function detectColumns(rows: Row[]): OptionColumnMapping[] {
  if (!rows.length) return [];
  const cols = Object.keys(rows[0]);
  const result: OptionColumnMapping[] = [];
  const used = new Set<string>();

  for (const col of cols) {
    const norm = normKey(col);
    let best: OptionColumnMapping | null = null;

    for (const [canonical, synonyms] of Object.entries(EXACT_OPTIONS) as [OptionCanonicalColumn, string[]][]) {
      if (synonyms.some((s) => normKey(s) === norm)) {
        best = { canonical, source: col, confidence: 0.97 };
        break;
      }
    }

    if (!best) {
      for (const [canonical, regex] of Object.entries(REGEX_OPTIONS) as [OptionCanonicalColumn, RegExp][]) {
        if (regex.test(col)) {
          if (!used.has(canonical)) {
            best = { canonical, source: col, confidence: 0.78 };
          }
          break;
        }
      }
    }

    if (best && !used.has(best.canonical)) {
      result.push(best);
      used.add(best.canonical);
    }
  }

  return result;
}

// ─── Value Extraction ─────────────────────────────────────────────────────────

function getNumCol(rows: Row[], mapping: OptionColumnMapping[], canonical: OptionCanonicalColumn): (number | null)[] {
  const m = mapping.find((x) => x.canonical === canonical);
  if (!m) return rows.map(() => null);
  return rows.map((row) => parseNum(row[m.source]));
}

function getStrCol(rows: Row[], mapping: OptionColumnMapping[], canonical: OptionCanonicalColumn): (string | null)[] {
  const m = mapping.find((x) => x.canonical === canonical);
  if (!m) return rows.map(() => null);
  return rows.map((row) => parseStr(row[m.source]));
}

// ─── Date Detection ───────────────────────────────────────────────────────────

function detectDateColumn(rows: Row[]): string | null {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  const dateCandidates = ["date", "datetime", "time", "날짜", "일자", "거래일", "기준일", "trade_date", "trading_date"];
  for (const cand of dateCandidates) {
    const key = keys.find((k) => normKey(k) === normKey(cand));
    if (key) return key;
  }
  // Heuristic: column whose values look like dates
  for (const key of keys) {
    const sample = rows.slice(0, 5).map((r) => String(r[key] ?? "")).filter(Boolean);
    if (sample.some((s) => /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s))) return key;
  }
  return null;
}

// ─── Date Aggregation ────────────────────────────────────────────────────────

type AggRow = { date: string; values: Map<string, number[]> };

function aggregateByDate(
  rows: Row[],
  dateCol: string,
  mapping: OptionColumnMapping[]
): { date: string; agg: Record<string, number | null> }[] {
  const buckets = new Map<string, AggRow>();

  for (const row of rows) {
    const date = parseStr(row[dateCol]) ?? "unknown";
    if (!buckets.has(date)) buckets.set(date, { date, values: new Map() });
    const bucket = buckets.get(date)!;

    for (const m of mapping) {
      const v = parseNum(row[m.source]);
      if (v === null) continue;
      if (!bucket.values.has(m.canonical)) bucket.values.set(m.canonical, []);
      bucket.values.get(m.canonical)!.push(v);
    }
  }

  const sumFields = new Set<OptionCanonicalColumn>(["open_interest", "call_oi", "put_oi", "call_volume", "put_volume", "volume", "gamma_exposure"]);
  const lastFields = new Set<OptionCanonicalColumn>(["underlying_price", "days_to_expiry"]);

  return Array.from(buckets.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ date, values }) => {
      const agg: Record<string, number | null> = {};
      for (const m of mapping) {
        const arr = values.get(m.canonical) ?? [];
        if (!arr.length) { agg[m.canonical] = null; continue; }
        if (sumFields.has(m.canonical)) {
          agg[m.canonical] = arr.reduce((s, v) => s + v, 0);
        } else if (lastFields.has(m.canonical)) {
          agg[m.canonical] = arr[arr.length - 1];
        } else {
          agg[m.canonical] = arr.reduce((s, v) => s + v, 0) / arr.length;
        }
      }
      return { date, agg };
    });
}

// ─── Dataset Type Detection ───────────────────────────────────────────────────

function detectDatasetType(fields: OptionCanonicalColumn[], rowCount: number): DatasetType {
  const hasTimeSeries = fields.some((f) => ["put_call_ratio", "implied_volatility", "open_interest", "gamma", "call_volume", "put_volume"].includes(f));
  const hasContractLevel = fields.some((f) => ["strike_price", "expiration_date", "contract_type"].includes(f));
  if (rowCount <= 1) return "snapshot";
  if (hasContractLevel && hasTimeSeries) return "mixed";
  if (hasContractLevel) return "contract-level";
  return "aggregated";
}

// ─── Confidence Scoring ──────────────────────────────────────────────────────

function computeConfidence(
  fields: OptionCanonicalColumn[],
  rowCount: number,
  missingRatio: number,
  hasDate: boolean
): { score: number; label: string; confidence: number } {
  const keyFields: OptionCanonicalColumn[] = ["put_call_ratio", "implied_volatility", "open_interest", "gamma", "delta", "call_volume", "put_volume"];
  const matched = keyFields.filter((f) => fields.includes(f)).length;
  const fieldScore = Math.min(50, (matched / keyFields.length) * 50);
  const rowScore = Math.min(25, Math.log10(Math.max(rowCount, 1)) * 12);
  const missingPenalty = missingRatio * 20;
  const dateBonus = hasDate ? 5 : 0;
  const extraFields = fields.filter((f) => !keyFields.includes(f)).length;
  const extraBonus = Math.min(20, extraFields * 4);
  const raw = Math.max(0, Math.min(100, Math.round(fieldScore + rowScore - missingPenalty + dateBonus + extraBonus)));
  const label = raw >= 80 ? "High Confidence" : raw >= 60 ? "Medium Confidence" : raw >= 40 ? "Low Confidence" : "Very Low Confidence";
  return { score: raw, label, confidence: raw / 100 };
}

// ─── Rolling Percentile ───────────────────────────────────────────────────────

function rollingPct(vals: (number | null)[]): number | null {
  const valid = vals.filter((v): v is number => v !== null);
  if (valid.length < 20) return null;
  const last = valid[valid.length - 1];
  const sorted = [...valid].sort((a, b) => a - b);
  const rank = sorted.findIndex((v) => v >= last);
  return Math.round((rank / sorted.length) * 100);
}

// ─── PCR Computation ─────────────────────────────────────────────────────────

function derivePCR(
  pcrDirect: (number | null)[],
  callVol: (number | null)[],
  putVol: (number | null)[]
): { values: (number | null)[]; derived: boolean } {
  const hasDirect = pcrDirect.some((v) => v !== null);
  if (hasDirect) return { values: pcrDirect, derived: false };

  const hasVols = callVol.some((v) => v !== null) && putVol.some((v) => v !== null);
  if (!hasVols) return { values: pcrDirect.map(() => null), derived: false };

  const derived = pcrDirect.map((_, i) => {
    const c = callVol[i], p = putVol[i];
    if (c === null || p === null || c === 0) return null;
    const ratio = p / c;
    return isFinite(ratio) ? Math.round(ratio * 10000) / 10000 : null;
  });
  return { values: derived, derived: true };
}

// ─── Gamma Exposure Computation ──────────────────────────────────────────────

function computeGammaExposure(
  gammaVals: (number | null)[],
  oiVals: (number | null)[],
  underlyingVals: (number | null)[],
  directGEX: (number | null)[]
): (number | null)[] {
  // Use direct GEX if available
  if (directGEX.some((v) => v !== null)) return directGEX;
  // Approximate: gamma * OI * underlying^2 * 0.01 (standard approximation)
  return gammaVals.map((g, i) => {
    if (g === null) return null;
    const oi = oiVals[i] ?? 1;
    const underlying = underlyingVals[i];
    if (underlying !== null) return g * oi * underlying * underlying * 0.01;
    return g * oi;
  });
}

// ─── Trend Calculation ───────────────────────────────────────────────────────

function trendChange(vals: (number | null)[], periods = 5): number | null {
  const valid = vals.filter((v): v is number => v !== null);
  if (valid.length < 2) return null;
  const last = valid[valid.length - 1];
  const prev = valid.slice(-Math.min(periods + 1, valid.length), -1);
  if (!prev.length) return null;
  const avg = prev.reduce((s, v) => s + v, 0) / prev.length;
  return avg !== 0 ? (last - avg) / Math.abs(avg) : 0;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function legacyScorePCRStress(pcr: (number | null)[]): number {
  const valid = pcr.filter((v): v is number => v !== null);
  if (!valid.length) return 50;
  const last = valid[valid.length - 1];
  const trend = trendChange(valid) ?? 0;
  // PCR scale: <0.5 complacency, 0.5-0.7 greed, 0.7-0.85 mild bullish, 0.85-1.0 neutral,
  // 1.0-1.2 neutral-defensive, 1.2-1.5 defensive/fear, 1.5-1.8 fear, >1.8 extreme fear
  let base: number;
  if (last >= 1.8) base = 90;
  else if (last >= 1.5) base = 80;
  else if (last >= 1.2) base = 70;
  else if (last >= 1.0) base = 58; // neutral-defensive: 55-62 range
  else if (last >= 0.85) base = 42;
  else if (last >= 0.7) base = 30;
  else if (last >= 0.5) base = 40; // complacency
  else base = 52;
  // Trend adjustment: don't let it wipe out the signal, cap at ±5
  base = Math.min(100, Math.max(10, base + (trend > 0.15 ? 5 : trend < -0.15 ? -3 : 0)));
  return Math.round(base);
}

function scorePCRStress(pcr: (number | null)[]): number {
  const valid = pcr.filter((v): v is number => v !== null && Number.isFinite(v) && v > 0);
  if (!valid.length) return 50;
  const last = valid[valid.length - 1];
  const clipped = valid.map((v) => Math.min(v, 10));
  const pct = percentileOfLast(clipped) ?? 50;
  const sigma = std(clipped) || 0.1;
  const zScore = Math.abs((Math.min(last, 10) - mean(clipped)) / sigma);
  const trend = trendChange(clipped, 5) ?? 0;
  const absoluteStress = last >= 2 ? 25 : last >= 1.35 ? 18 : last <= 0.55 ? 16 : last <= 0.7 ? 10 : 4;
  const score = Math.max(0, Math.min(100, Math.round(pct * 0.52 + Math.min(28, zScore * 11) + absoluteStress + (trend > 0.2 ? 7 : trend < -0.2 ? -4 : 0))));
  if (typeof console !== "undefined") console.log("[Options debug] PCR normalization", { last, percentile: pct, zScore, trend, score });
  return score;
}

function scoreIVStress(iv: (number | null)[], externalPct?: number | null): number {
  const valid = iv.filter((v): v is number => v !== null);
  if (!valid.length) return 50;
  // Prefer explicit iv_rank/iv_percentile column — it IS the authoritative percentile for this data
  if (validPct(externalPct ?? null) !== null) {
    const trend = trendChange(valid) ?? 0;
    const score = Math.min(100, Math.max(0, Math.round((externalPct ?? 50) + (trend > 0.15 ? 5 : 0))));
    if (typeof console !== "undefined") console.log("[Options debug] IV rank calculation", { mode: "explicit", externalPct, trend, score });
    return score;
  }
  if (valid.length < 20) {
    const last = valid[valid.length - 1];
    const mn = Math.min(...valid), mx = Math.max(...valid);
    const score = mn === mx ? 50 : Math.round(((last - mn) / (mx - mn)) * 100);
    if (typeof console !== "undefined") console.log("[Options debug] IV rank calculation", { mode: "range", last, score });
    return score;
  }
  const last = valid[valid.length - 1];
  const sorted = [...valid].sort((a, b) => a - b);
  const rank = sorted.findIndex((v) => v >= last);
  const pct = Math.round((rank / sorted.length) * 100);
  const trend = trendChange(valid) ?? 0;
  const score = Math.min(100, Math.max(0, pct + (trend > 0.15 ? 5 : 0)));
  if (typeof console !== "undefined") console.log("[Options debug] IV rank calculation", { mode: "rolling", pct, trend, score });
  return score;
}

function scoreGammaInstability(gamma: (number | null)[]): number {
  // Returns GAMMA RISK score: high = risky (negative gamma), low = stable (positive gamma).
  // "Gamma Stability" displayed in UI = 100 - this score.
  const valid = gamma.filter((v): v is number => v !== null);
  if (!valid.length) return 50;
  const last = valid[valid.length - 1];
  const negCount = valid.filter((v) => v < 0).length;
  const negRatio = negCount / valid.length;
  const avgAbs = valid.reduce((s, v) => s + Math.abs(v), 0) / valid.length || 1;
  const spike = Math.min(1, Math.abs(last) / (avgAbs * 3));
  // Current gamma sign is weighted 60%, historical negative ratio is 40%.
  // Positive current gamma gives large base reduction; negative gives large addition.
  const currentRisk = last < 0 ? 78 : 12;
  const historicalRisk = negRatio * 58;
  return Math.max(0, Math.min(100, Math.round(currentRisk * 0.60 + historicalRisk * 0.40 + spike * 8)));
}

function scoreOIConcentration(oi: (number | null)[]): number {
  const valid = oi.filter((v): v is number => v !== null);
  if (valid.length < 3) return 50;
  const last = valid[valid.length - 1];
  const avg = valid.reduce((s, v) => s + v, 0) / valid.length;
  const ratio = avg > 0 ? last / avg : 1;
  const chg = valid.length >= 2 ? (last - valid[valid.length - 2]) / Math.abs(valid[valid.length - 2] || 1) : 0;
  if (ratio > 2.0) return 85;
  if (ratio > 1.5) return 72;
  if (ratio > 1.2) return 60;
  if (chg > 0.15) return 65;
  if (chg < -0.15) return 30;
  return 50;
}

function scoreExpiryPressure(expiryData: OptionsAnalysis["expiryData"]): number {
  if (!expiryData.length) return 50;
  const weightOf = (e: OptionsAnalysis["expiryData"][number]) => e.totalOI + e.totalVolume * 0.35 + Math.abs(e.gammaExposure) * 0.000001;
  const total = expiryData.reduce((s, e) => s + weightOf(e), 0) || 1;
  const near14 = expiryData.filter((e) => e.daysLeft <= 14).reduce((s, e) => s + weightOf(e), 0) / total;
  const near7 = expiryData.filter((e) => e.daysLeft <= 7).reduce((s, e) => s + weightOf(e), 0) / total;
  const veryNear = expiryData.filter((e) => e.daysLeft <= 2).reduce((s, e) => s + weightOf(e), 0) / total;
  const topShare = Math.max(...expiryData.map((e) => weightOf(e) / total));
  const score = Math.min(100, Math.round(near14 * 45 + near7 * 35 + veryNear * 20 + topShare * 25));
  if (typeof console !== "undefined") console.log("[Options debug] expiry clustering calculation", { near14, near7, veryNear, topShare, score, expiryData });
  return score;
}

function scoreStrikeConcentration(strikeData: OptionsAnalysis["strikeData"]): number {
  if (strikeData.length < 3) return 50;
  const totalOI = strikeData.reduce((s, r) => s + r.totalOI, 0) || 1;
  const top1OI = Math.max(...strikeData.map((r) => r.totalOI));
  const herfindahl = strikeData.reduce((s, r) => s + Math.pow(r.totalOI / totalOI, 2), 0);
  const top1Share = top1OI / totalOI;
  return Math.min(100, Math.round(top1Share * 60 + herfindahl * 80));
}

function scorePutDominance(callVol: (number | null)[], putVol: (number | null)[]): { score: number; hasData: boolean } {
  const callValid = callVol.filter((v): v is number => v !== null);
  const putValid = putVol.filter((v): v is number => v !== null);
  if (!callValid.length || !putValid.length) return { score: 50, hasData: false };
  // Use recent 5-period average to smooth spikes
  const recentC = callValid.slice(-5).reduce((s, v) => s + v, 0) / Math.min(5, callValid.length);
  const recentP = putValid.slice(-5).reduce((s, v) => s + v, 0) / Math.min(5, putValid.length);
  if (recentC === 0) return { score: 85, hasData: true };
  const ratio = recentP / recentC;
  // Ratio scale: <0.8 call-dominant (bullish), 1.0 balanced, >1.5 put-dominant (hedging), >2.5 extreme hedge
  let score: number;
  if (ratio > 3.0) score = 88;
  else if (ratio > 2.5) score = 80;
  else if (ratio > 2.0) score = 72;
  else if (ratio > 1.5) score = 62;
  else if (ratio > 1.2) score = 50;
  else if (ratio > 1.0) score = 42;
  else if (ratio > 0.8) score = 30;
  else score = 16;
  return { score: Math.min(100, Math.max(0, score)), hasData: true };
}

function scoreUnusualActivity(
  callVol: (number | null)[], putVol: (number | null)[],
  oiVals: (number | null)[], pcrVals: (number | null)[]
): number {
  let score = 0;
  const pcrValid = pcrVals.filter((v): v is number => v !== null);
  if (pcrValid.length >= 5) {
    const last = pcrValid[pcrValid.length - 1];
    const mu = pcrValid.reduce((s, v) => s + v, 0) / pcrValid.length;
    const sigma = Math.sqrt(pcrValid.reduce((s, v) => s + (v - mu) ** 2, 0) / pcrValid.length) || 0.1;
    const zScore = Math.abs(last - mu) / sigma;
    score += Math.min(40, zScore * 14);
  }
  const callValid = callVol.filter((v): v is number => v !== null);
  const putValid = putVol.filter((v): v is number => v !== null);
  if (callValid.length >= 3) {
    const lastC = callValid[callValid.length - 1];
    const avgC = callValid.slice(0, -1).reduce((s, v) => s + v, 0) / (callValid.length - 1);
    if (avgC > 0) score += Math.min(30, (lastC / avgC - 1) * 20);
  }
  if (putValid.length >= 3) {
    const lastP = putValid[putValid.length - 1];
    const avgP = putValid.slice(0, -1).reduce((s, v) => s + v, 0) / (putValid.length - 1);
    if (avgP > 0) score += Math.min(30, (lastP / avgP - 1) * 20);
  }
  return Math.min(100, Math.max(0, Math.round(score)));
}

function scoreLiquidityStability(volumeVals: (number | null)[], bidVals: (number | null)[], askVals: (number | null)[]): number {
  const spreads = bidVals.map((bid, i) => {
    const ask = askVals[i];
    if (bid === null || ask === null || bid <= 0 || ask <= 0) return null;
    return Math.max(0, (ask - bid) / ((ask + bid) / 2));
  }).filter((v): v is number => v !== null);
  if (spreads.length) {
    const last = spreads[spreads.length - 1];
    return Math.max(0, Math.min(100, Math.round(last * 500)));
  }
  const validVol = volumeVals.filter((v): v is number => v !== null && v > 0);
  if (validVol.length < 3) return 50;
  const last = validVol[validVol.length - 1];
  const avg = mean(validVol);
  return last < avg * 0.35 ? 70 : last < avg * 0.7 ? 55 : 25;
}

function scoreFlowImbalance(callVol: (number | null)[], putVol: (number | null)[]): number {
  const callValid = callVol.filter((v): v is number => v !== null && v >= 0);
  const putValid = putVol.filter((v): v is number => v !== null && v >= 0);
  if (!callValid.length || !putValid.length) return 50;
  const c = mean(callValid.slice(-5));
  const p = mean(putValid.slice(-5));
  const total = c + p;
  if (total <= 0) return 50;
  return Math.round(Math.abs(p - c) / total * 100);
}

function buildRiskExplanation(score: number, components: OptionsRiskScore["components"], expiryAvailable: boolean): string {
  const drivers = [
    ["PCR", components.pcrStress],
    ["IV", components.ivStress],
    ["감마", components.gammaInstability],
    ["만기", components.expiryPressure],
    ["이상거래", components.unusualActivity],
    ["플로우", components.flowImbalance],
  ].sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 3);
  const driverText = drivers.map(([name, value]) => `${name} ${value}/100`).join(", ");
  const level = score >= 70 ? "높은 옵션 리스크" : score >= 45 ? "중간 옵션 리스크" : "낮은 옵션 리스크";
  const expiryText = expiryAvailable ? "만기 집중도까지 점수에 반영했습니다." : "만기 데이터가 없어 Expiry Pressure는 신뢰도 조정 레이어로만 처리했습니다.";
  return `${level}입니다. 최종 점수는 ${driverText}를 중심으로 PCR, IV, 감마, OI, 만기, 플로우를 함께 가중한 값입니다. ${expiryText}`;
}

function riskScoreToLabel(score: number): OptionRiskLabel {
  if (score >= 81) return "Extreme Option Risk";
  if (score >= 61) return "High Option Risk";
  if (score >= 31) return "Moderate Option Risk";
  return "Low Option Risk";
}

function alphaImpact(score: number, pcr: number | null, gammaLast: number | null, putDomScore: number): OptionAlphaImpact {
  if (score >= 75 || (gammaLast !== null && gammaLast < 0 && score >= 62)) return "risk-off";
  if (score >= 60) return "cautionary";
  // Put dominance (high put/call vol ratio) weakens bullish confidence even if overall score is moderate
  if (score >= 46 && putDomScore >= 70) return "cautionary";
  if (score >= 38 || (pcr !== null && pcr >= 1.0)) return "neutral";
  if (pcr !== null && pcr < 0.65) return "cautionary"; // complacency
  return "supportive";
}

// ─── Signal Building ─────────────────────────────────────────────────────────

function buildSignals(
  fields: OptionCanonicalColumn[],
  pcrVals: (number | null)[],
  ivVals: (number | null)[],
  oiVals: (number | null)[],
  gammaVals: (number | null)[],
  deltaVals: (number | null)[],
  callVol: (number | null)[],
  putVol: (number | null)[],
  ivPct: number | null,
  expiryData: OptionsAnalysis["expiryData"],
  strikeData: OptionsAnalysis["strikeData"],
  confidenceScore: number
): OptionsAnalysis["signals"] {
  const out: OptionsAnalysis["signals"] = [];

  // PCR
  const pcrValid = pcrVals.filter((v): v is number => v !== null);
  if (pcrValid.length) {
    const last = pcrValid[pcrValid.length - 1];
    const trend5 = trendChange(pcrVals, 5) ?? 0;
    const score = scorePCRStress(pcrVals);
    const tone: "good" | "warn" | "bad" = last >= 1.2 ? "bad" : last >= 0.85 ? "warn" : "good";
    out.push({
      label: "Fear vs Greed (PCR)",
      value: score,
      tone,
      note: `PCR ${last.toFixed(2)} ${trend5 > 0.05 ? "↑ 방어 포지셔닝 확대" : trend5 < -0.05 ? "↓ 콜 수요 회복" : "횡보"} · ${last >= 1.2 ? "공포 우세" : last >= 0.85 ? "중립" : "탐욕 우세"}`,
      confidence: pcrValid.length >= 10 ? "high" : pcrValid.length >= 4 ? "medium" : "low",
      impact: last >= 1.2 ? "Alpha 하방 압력" : last < 0.7 ? "과열 주의 — Alpha 경계" : "중립",
    });
  }

  // IV — use shared ivPct (from iv_rank column or rolling percentile computed once in main)
  const ivValid = ivVals.filter((v): v is number => v !== null);
  if (ivValid.length) {
    const last = ivValid[ivValid.length - 1];
    const pct = ivPct ?? Math.round(((last - Math.min(...ivValid)) / (Math.max(...ivValid) - Math.min(...ivValid) || 1)) * 100);
    const expanding = ivValid.length > 1 && ivValid[ivValid.length - 1] > ivValid[Math.max(0, ivValid.length - 5)];
    const tone: "good" | "warn" | "bad" = pct >= 70 ? "bad" : pct >= 45 ? "warn" : "good";
    const ivLabel = pct >= 80 ? "극단적 변동성 압력" : pct >= 65 ? "상승 변동성 압력" : pct >= 45 ? "중간 변동성 압력" : "낮은 변동성 압력";
    out.push({
      label: "Volatility Pressure",
      value: scoreIVStress(ivVals, ivPct), // uses shared ivPct — same source as summary cards
      tone,
      note: `IV ${last.toFixed(1)}% · IV Rank ${pct}th · ${ivLabel} · ${expanding ? "상승 확장 중" : "수축/안정 중"}`,
      confidence: ivValid.length >= 20 ? "high" : ivValid.length >= 8 ? "medium" : "low",
      impact: pct >= 70 ? "변동성 프리미엄 고점 — 리스크 경계" : pct <= 25 ? "변동성 저점 — 돌파 준비 가능" : "중립",
    });
  }

  // OI
  const oiValid = oiVals.filter((v): v is number => v !== null);
  if (oiValid.length >= 2) {
    const last = oiValid[oiValid.length - 1];
    const prev = oiValid[oiValid.length - 2];
    const chg = prev > 0 ? (last - prev) / prev : 0;
    const tone: "good" | "warn" | "bad" = chg > 0.1 ? "warn" : chg < -0.1 ? "good" : "warn";
    out.push({
      label: "Position Buildup",
      value: scoreOIConcentration(oiVals),
      tone,
      note: `OI ${chg >= 0 ? "+" : ""}${(chg * 100).toFixed(1)}% · ${chg > 0.05 ? "포지션 신규 유입" : chg < -0.05 ? "포지션 청산 진행" : "포지션 유지"}`,
      confidence: oiValid.length >= 10 ? "high" : "medium",
      impact: chg > 0.15 ? "신규 리스크 축적" : chg < -0.15 ? "포지션 해소 — 리스크 감소" : "중립",
    });
  }

  // Gamma — display as STABILITY (high = stable positive gamma), which is 100 - gammaRisk
  const gammaValid = gammaVals.filter((v): v is number => v !== null);
  if (gammaValid.length) {
    const last = gammaValid[gammaValid.length - 1];
    const gammaRiskScore = scoreGammaInstability(gammaVals);
    const stabilityScore = Math.max(0, 100 - gammaRiskScore); // invert: stability = 100 - risk
    const tone: "good" | "warn" | "bad" = last < 0 ? "bad" : stabilityScore >= 60 ? "good" : "warn";
    const regimeLabel = last < 0
      ? `음수 감마 (${last.toFixed(4)}) — 딜러가 추세 증폭`
      : `양수 감마 (${last.toFixed(4)}) — 딜러가 변동성 억제`;
    out.push({
      label: "Gamma Stability",
      value: stabilityScore, // HIGH = more stable (positive gamma environment)
      tone,
      note: `${regimeLabel}`,
      confidence: gammaValid.length >= 5 ? "high" : "medium",
      impact: last < 0 ? "변동성 증폭 위험 — 리스크-오프" : "변동성 안정화 — Alpha 방향 지지",
    });
  }

  // Hedging Intensity — PCR (40%) + IV percentile (25%) + put/call volume ratio (35%)
  // Each component has calibrated caps to prevent any single factor from dominating
  if (pcrValid.length) {
    const pcrLast = pcrValid[pcrValid.length - 1];
    const ivPct2 = ivPct ?? 50;
    // PCR component: max 65 (PCR alone cannot push hedging to 100)
    const pcrComp = pcrLast >= 1.8 ? 65 : pcrLast >= 1.5 ? 58 : pcrLast >= 1.2 ? 50 : pcrLast >= 1.0 ? 40 : pcrLast >= 0.85 ? 28 : pcrLast >= 0.7 ? 18 : 8;
    // IV component: max 22 (elevated but not extreme IV adds moderate pressure)
    const ivComp = ivPct2 >= 85 ? 22 : ivPct2 >= 70 ? 17 : ivPct2 >= 55 ? 13 : ivPct2 >= 35 ? 8 : 3;
    // Put/call volume ratio component: max 22
    const callV = callVol.filter((v): v is number => v !== null);
    const putV = putVol.filter((v): v is number => v !== null);
    let putDomComp = 0;
    if (callV.length && putV.length) {
      const recentC = callV.slice(-5).reduce((s, v) => s + v, 0) / Math.min(5, callV.length);
      const recentP = putV.slice(-5).reduce((s, v) => s + v, 0) / Math.min(5, putV.length);
      const ratio = recentC > 0 ? recentP / recentC : 1;
      putDomComp = ratio > 3.0 ? 22 : ratio > 2.5 ? 19 : ratio > 2.0 ? 15 : ratio > 1.5 ? 11 : ratio > 1.2 ? 7 : ratio > 1.0 ? 4 : 0;
    }
    const hedgeScore = Math.min(100, pcrComp + ivComp + putDomComp);
    const hedgeLabel = hedgeScore >= 80 ? "극단적 헤징 수요" : hedgeScore >= 65 ? "강한 헤징 수요 / 풋 우세" : hedgeScore >= 45 ? "중간 수준 헤징" : "헤징 수요 낮음";
    const tone: "good" | "warn" | "bad" = hedgeScore >= 70 ? "bad" : hedgeScore >= 45 ? "warn" : "good";
    out.push({
      label: "Hedging Intensity",
      value: hedgeScore,
      tone,
      note: `PCR ${pcrLast.toFixed(2)} + IV ${ivPct2}th pct + 풋/콜 비율 복합 — ${hedgeLabel}`,
      confidence: callV.length && putV.length ? "high" : "medium",
      impact: hedgeScore >= 70 ? "강한 하방 보호 수요 — 조건부 약세" : "헤징 중립",
    });
  }

  // Expiry Pressure
  if (expiryData.length) {
    const score = scoreExpiryPressure(expiryData);
    const nearest = expiryData.filter((e) => e.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft)[0];
    const tone: "good" | "warn" | "bad" = score >= 65 ? "bad" : score >= 35 ? "warn" : "good";
    out.push({
      label: "Expiry Pressure",
      value: score,
      tone,
      note: `${nearest ? `가장 가까운 만기: ${nearest.expiry} (${nearest.daysLeft}일 남음)` : "만기 분포 감지됨"}`,
      confidence: "medium",
      impact: score >= 65 ? "단기 이벤트 리스크 고조" : "만기 압력 낮음",
    });
  }

  // Strike Concentration
  if (strikeData.length >= 3) {
    const score = scoreStrikeConcentration(strikeData);
    const topStrike = [...strikeData].sort((a, b) => (b.callOI + b.putOI) - (a.callOI + a.putOI))[0];
    const tone: "good" | "warn" | "bad" = score >= 65 ? "warn" : "good";
    out.push({
      label: "Strike Concentration",
      value: score,
      tone,
      note: `최고 OI 집중 행사가: ${topStrike?.strike.toLocaleString() ?? "—"} · ${score >= 65 ? "강한 핀 마그넷 가능성" : "분산된 포지션"}`,
      confidence: "medium",
      impact: score >= 65 ? "가격 고착 또는 만기 핀 가능성" : "중립",
    });
  }

  // Data Reliability — use the single shared confidenceScore (same value shown in summary cards)
  const hasContractLevel = fields.some((f) => ["strike_price", "expiration_date"].includes(f));
  const reliabilityNote = hasContractLevel
    ? `집계 + 계약별 분석 가능 · ${fields.length}개 필드 감지`
    : `집계 분석 신뢰도 높음 · 계약별(스트라이크/만기) 분석 불가 · ${fields.length}개 필드`;
  out.push({
    label: "Data Reliability",
    value: confidenceScore, // single source of truth — same as summary card
    tone: confidenceScore >= 75 ? "good" : confidenceScore >= 50 ? "warn" : "bad",
    note: reliabilityNote,
    confidence: "high",
    impact: confidenceScore < 50 ? "분석 신뢰도 제한적" : "충분한 데이터",
  });

  return out;
}

// ─── Cross-Signal Interpretation ─────────────────────────────────────────────

function buildCrossSignals(
  latestPCR: number | null,
  latestIV: number | null,
  ivPct: number | null,
  latestGamma: number | null,
  oiChange: number | null,
  latestOI: number | null
): string[] {
  const signals: string[] = [];
  const pct = ivPct ?? 50;

  if (latestPCR !== null && latestIV !== null) {
    if (latestPCR >= 1.0 && pct >= 60)
      signals.push("PCR 상승 + IV 고점 동시 발생 — 방어적 변동성 민감 시장, 강한 하방 헤징 수요 확인");
    else if (latestPCR <= 0.75 && pct <= 35)
      signals.push("PCR 하락 + IV 저점 — 리스크 선호도 개선, 낙관론 증가 (과열 주의)");
    else if (latestPCR >= 1.0 && pct <= 30)
      signals.push("PCR 높음 + IV 낮음 — 방어 포지션은 늘었으나 시장이 아직 낮은 비용으로 헤징 가능한 상태");
  }

  if (oiChange !== null && latestIV !== null) {
    if (oiChange > 0.1 && pct >= 55)
      signals.push("OI 증가 + IV 상승 — 신규 리스크 포지션 축적 중, 이벤트 전 포지셔닝 가능성");
    else if (oiChange < -0.1 && pct >= 55)
      signals.push("OI 감소 + IV 상승 — 포지션 청산 과정에서 변동성 증폭, 불안정한 환경");
    else if (oiChange > 0.1 && pct <= 35)
      signals.push("OI 증가 + IV 낮음 — 저비용 헤징 또는 레버리지 포지션 구축 중");
  }

  if (latestGamma !== null) {
    if (latestGamma < 0 && latestIV !== null && pct >= 55)
      signals.push("음수 감마 + IV 상승 — 불안정 변동성 레짐. 딜러 헤징이 가격 움직임을 추가로 증폭시킬 위험");
    else if (latestGamma > 0 && latestPCR !== null && latestPCR >= 1.2)
      signals.push("양수 감마 + 높은 PCR — 딜러가 안정화 역할을 하더라도 방어 심리가 지배적");
  }

  return signals.slice(0, 4);
}

// ─── Insight Generation ───────────────────────────────────────────────────────

function buildInsights(
  latestPCR: number | null,
  latestIV: number | null,
  latestGamma: number | null,
  latestOI: number | null,
  oiChange: number | null,
  ivPct: number | null,
  pcrDerived: boolean,
  strikeData: OptionsAnalysis["strikeData"]
): string[] {
  const lines: string[] = [];
  const pct = ivPct ?? 50;

  if (latestPCR !== null) {
    const tag = pcrDerived ? " (콜/풋 거래량으로 산출)" : "";
    if (latestPCR >= 1.3) lines.push(`Put/Call Ratio ${latestPCR.toFixed(2)}${tag} — 방어적 헤징 수요 급증. 공포 심리 우세.`);
    else if (latestPCR >= 1.0) lines.push(`Put/Call Ratio ${latestPCR.toFixed(2)}${tag} — 하방 위험 경계 심리 우세.`);
    else if (latestPCR <= 0.65) lines.push(`Put/Call Ratio ${latestPCR.toFixed(2)}${tag} — 콜 수요 과열. 과도한 낙관론 경계.`);
    else lines.push(`Put/Call Ratio ${latestPCR.toFixed(2)}${tag} — 중립적 포지셔닝.`);
  }

  if (latestIV !== null) {
    if (pct >= 75) lines.push(`내재변동성 ${latestIV.toFixed(1)}% (${pct}th 백분위) — 역사적 고점. 변동성 프리미엄 과열.`);
    else if (pct >= 50) lines.push(`내재변동성 ${latestIV.toFixed(1)}% (${pct}th 백분위) — 불확실성 상승 국면.`);
    else lines.push(`내재변동성 ${latestIV.toFixed(1)}% (${pct}th 백분위) — 변동성 압축 상태. 돌파 시 급변 가능.`);
  }

  if (latestGamma !== null) {
    if (latestGamma < 0) lines.push("음수 감마 환경 — 딜러 헤징이 추세를 증폭. 급격한 가격 변동 가능성 높음.");
    else lines.push("양수 감마 환경 — 딜러 헤징이 가격 안정화에 기여. 변동성 억제 경향.");
  }

  if (latestOI !== null && oiChange !== null) {
    if (oiChange > 0.1) lines.push(`미결제약정 ${(oiChange * 100).toFixed(1)}% 증가 — 신규 포지션 유입 확인.`);
    else if (oiChange < -0.1) lines.push(`미결제약정 ${Math.abs(oiChange * 100).toFixed(1)}% 감소 — 포지션 청산 진행 중.`);
  }

  if (strikeData.length >= 3) {
    const top = [...strikeData].sort((a, b) => (b.callOI + b.putOI) - (a.callOI + a.putOI))[0];
    if (top) lines.push(`가장 높은 OI 집중 행사가: ${top.strike.toLocaleString()} — 만기 핀 또는 지지/저항 마그넷 가능성.`);
  }

  return lines.slice(0, 5);
}

// ─── Scenario Generation ─────────────────────────────────────────────────────

function buildScenarios(
  riskScore: number,
  latestPCR: number | null,
  latestGamma: number | null,
  ivPct: number | null,
  oiChange: number | null
): OptionScenario[] {
  const pct = ivPct ?? 50;
  const scenarios: OptionScenario[] = [];

  // Bullish
  scenarios.push({
    type: "bullish",
    title: "Bullish Scenario",
    condition: latestGamma !== null && latestGamma > 0 && (latestPCR ?? 1) < 0.85
      ? "PCR 안정 + 양수 감마 — 딜러 안정화 효과와 함께 상승 모멘텀 가능"
      : "변동성 안정 및 방어 포지션 감소 시 반등 가능",
    signals: [
      latestPCR !== null ? `PCR ${latestPCR.toFixed(2)} ${latestPCR < 0.85 ? "(콜 우세 — 강세 지지)" : "(중립)"}` : "PCR 데이터 없음",
      pct <= 40 ? "IV 낮음 — 저비용 상승 포지션 유리" : "IV 상승 — 상승 포지션 비용 증가",
    ],
    invalidation: latestPCR !== null && latestPCR >= 1.3
      ? "PCR 1.3 이상 유지 또는 IV 추가 상승 시 무효"
      : "PCR 급등 또는 IV 상승 지속 시 무효",
  });

  // Neutral
  scenarios.push({
    type: "neutral",
    title: "Neutral Scenario",
    condition: "PCR 0.85–1.10 유지, IV 안정 — 방향성 없는 레인지 장세",
    signals: [
      "거래량 감소 및 OI 변화 미미",
      latestGamma !== null ? `감마 ${latestGamma > 0 ? "양수 — 핀 효과 강화" : "음수 — 돌파 가능성"}` : "감마 데이터 없음",
    ],
    invalidation: "OI 급증 또는 PCR 1.2 이상/0.7 이하 이탈 시 무효",
  });

  // Risk
  scenarios.push({
    type: "risk",
    title: "Risk Scenario",
    condition: riskScore >= 65
      ? "높은 Option Risk Score — 변동성 확대 및 헤징 급증 가능성"
      : "PCR 상승 + IV 고점 도달 시 하방 리스크 실현 가능",
    signals: [
      latestPCR !== null ? `PCR ${latestPCR.toFixed(2)} ${latestPCR >= 1.2 ? "(공포 신호)" : ""}` : "PCR 없음",
      latestGamma !== null && latestGamma < 0 ? "음수 감마 — 하락 시 딜러 손절 증폭 가능" : "감마 리스크 제한적",
      pct >= 70 ? "IV 고점 — 변동성 과열" : `IV ${pct}th 백분위`,
    ],
    invalidation: "PCR 1.0 이하 복귀 + IV 급락 시 무효",
  });

  return scenarios;
}

// ─── AI Summary ───────────────────────────────────────────────────────────────

function buildAISummary(
  riskScore: OptionsRiskScore | null,
  latestPCR: number | null,
  latestIV: number | null,
  latestGamma: number | null,
  ivPct: number | null,
  oiChange: number | null,
  strikeData: OptionsAnalysis["strikeData"]
): OptionsAnalysis["aiSummary"] {
  const score = riskScore?.score ?? 50;
  const label = riskScore?.label ?? "Moderate Option Risk";
  const impact = riskScore?.alphaImpact ?? "neutral";
  const pct = ivPct ?? 50;

  // Build a connected condition statement using actual metric values
  let condition: string;
  if (score >= 81) {
    condition = `옵션 시장은 Extreme Risk 상태입니다. 헤징 수요와 변동성이 동시에 급등하며 극단적 리스크 환경입니다.`;
  } else if (score >= 61) {
    condition = `옵션 시장은 High Risk 구간입니다. 방어적 포지셔닝이 심화되고 있으며 단기 변동성 확대 가능성이 높습니다.`;
  } else if (score >= 31) {
    const pcrPart = latestPCR !== null
      ? latestPCR >= 1.2 ? `PCR ${latestPCR.toFixed(2)}로 방어 심리 우세`
        : latestPCR >= 1.0 ? `PCR ${latestPCR.toFixed(2)}로 중립에서 경미한 방어 포지셔닝`
        : `PCR ${latestPCR.toFixed(2)}로 콜 수요 우세`
      : "PCR 데이터 없음";
    const gammaPart = latestGamma !== null
      ? latestGamma > 0 ? "양수 감마 환경으로 딜러가 변동성 안정화에 기여"
        : "음수 감마 환경으로 추세 증폭 위험 존재"
      : null;
    const oiPart = oiChange !== null
      ? oiChange < -0.1 ? "미결제약정 감소로 포지션 청산이 진행 중"
        : oiChange > 0.1 ? "미결제약정 증가로 신규 포지션 유입 중"
        : null
      : null;
    const parts = [pcrPart, gammaPart, oiPart].filter(Boolean);
    condition = `옵션 시장은 극단적 위험 상태가 아니지만 방어적 수요가 관찰됩니다. ${parts.join(". ")}. IV Rank ${pct}th로 변동성 압력이 ${pct >= 65 ? "상승해 있으나 극단적이지 않습니다" : pct >= 45 ? "중간 수준입니다" : "낮습니다"}.`;
  } else {
    condition = `옵션 시장은 Low Risk 상태입니다. 변동성 프리미엄이 낮고 포지셔닝이 안정적입니다.`;
  }

  // Risk explanation: connect each component to its measured value
  const riskExplanation = (() => {
    const parts: string[] = [];
    if (riskScore?.components.pcrStress !== undefined)
      parts.push(`PCR 스트레스 ${riskScore.components.pcrStress}/100 (${riskScore.components.pcrStress >= 65 ? "방어 포지션 우세" : riskScore.components.pcrStress >= 45 ? "중립-방어" : "콜 우세"})`);
    if (riskScore?.components.ivStress !== undefined)
      parts.push(`IV 스트레스 ${riskScore.components.ivStress}/100 (${riskScore.components.ivStress >= 70 ? "변동성 과열" : riskScore.components.ivStress >= 50 ? "변동성 상승 중" : "변동성 안정"})`);
    if (riskScore?.components.gammaInstability !== undefined)
      parts.push(`감마 리스크 ${riskScore.components.gammaInstability}/100 (${riskScore.components.gammaInstability >= 50 ? "음수 감마 — 증폭 위험" : "양수 감마 — 안정화"})`);
    if (riskScore?.components.putDominanceStress !== undefined && riskScore.components.putDominanceStress > 0)
      parts.push(`풋 지배력 ${riskScore.components.putDominanceStress}/100 (${riskScore.components.putDominanceStress >= 70 ? "강한 풋 우세 — 하방 헤징" : "보통 수준"})`);
    return parts.length ? parts.join(" · ") : `Option Risk Score ${score}점 — ${label}`;
  })();

  // Observations: one fact per signal, all from pre-computed metrics
  const observations: string[] = [];
  if (latestPCR !== null) {
    const pcrDesc = latestPCR >= 1.5 ? "강한 방어 헤징" : latestPCR >= 1.2 ? "방어 헤징 우세" : latestPCR >= 1.0 ? "중립-방어" : latestPCR >= 0.75 ? "중립" : "콜 수요 우세";
    observations.push(`PCR ${latestPCR.toFixed(2)} — ${pcrDesc}`);
  }
  if (latestIV !== null)
    observations.push(`IV ${latestIV.toFixed(1)}% · IV Rank ${ivPct !== null ? `${ivPct}th 백분위 (${ivPct >= 65 ? "상승 압력" : ivPct >= 45 ? "중간" : "저점"})` : "백분위 계산 불가"}`);
  if (latestGamma !== null)
    observations.push(`감마 ${latestGamma > 0 ? `양수 (${latestGamma.toFixed(4)}) — 딜러 안정화, 변동성 억제 경향` : `음수 (${latestGamma.toFixed(4)}) — 딜러 추세 증폭 위험`}`);
  if (oiChange !== null)
    observations.push(`미결제약정 ${oiChange >= 0 ? "+" : ""}${(oiChange * 100).toFixed(1)}% — ${oiChange < -0.1 ? "포지션 청산 진행 중" : oiChange > 0.1 ? "신규 포지션 유입" : "포지션 유지"}`);
  if (strikeData.length) {
    const top = [...strikeData].sort((a, b) => (b.callOI + b.putOI) - (a.callOI + a.putOI))[0];
    if (top) observations.push(`최고 OI 행사가 ${top.strike.toLocaleString()}`);
  }

  const scenarios = buildScenarios(score, latestPCR, latestGamma, ivPct, oiChange);

  // Options data is a sentiment/positioning/volatility layer only — never a standalone bullish signal
  const alphaNote = impact === "risk-off"
    ? "옵션 시장이 강한 위험 경계 신호를 보냅니다. 옵션 데이터는 가격 방향 신호가 아니라 리스크/포지셔닝 레이어로 기능합니다. Alpha 점수에 하방 조정을 적용합니다."
    : impact === "cautionary"
    ? "옵션 데이터가 중립-경계 신호를 보냅니다. PCR 상승, 풋 거래량 우세, IV 상승이 강세 신호를 약화시킵니다. 양수 감마가 단기 충격을 완화하더라도, 옵션 단독으로 강세 Alpha를 확인할 수 없습니다."
    : impact === "supportive"
    ? "옵션 구조가 현재 포지셔닝에 우호적입니다. 단, 옵션 데이터만으로 방향성 Alpha 신호를 확인할 수는 없습니다."
    : "옵션 데이터는 가격 방향 신호가 아닌 시장 심리·변동성·포지셔닝 레이어입니다. 강한 Alpha 신호는 OHLCV 또는 수급 데이터와 결합될 때 신뢰할 수 있습니다.";

  return { condition, riskExplanation, observations, scenarios, alphaNote };
}

// ─── Strike-Level Builder ─────────────────────────────────────────────────────

function buildStrikeData(
  rows: Row[],
  mapping: OptionColumnMapping[],
  gammaVals: (number | null)[],
  oiVals: (number | null)[],
  underlyingVals: (number | null)[]
): OptionsAnalysis["strikeData"] {
  const strikeM = mapping.find((m) => m.canonical === "strike_price");
  if (!strikeM) return [];

  const callOIM = mapping.find((m) => m.canonical === "call_oi");
  const putOIM = mapping.find((m) => m.canonical === "put_oi");
  const callVolM = mapping.find((m) => m.canonical === "call_volume");
  const putVolM = mapping.find((m) => m.canonical === "put_volume");
  const ivM = mapping.find((m) => m.canonical === "implied_volatility");
  const gammaM = mapping.find((m) => m.canonical === "gamma");
  const gexM = mapping.find((m) => m.canonical === "gamma_exposure");
  const ctM = mapping.find((m) => m.canonical === "contract_type");
  const oiM = mapping.find((m) => m.canonical === "open_interest");
  const volM = mapping.find((m) => m.canonical === "volume");
  const underlyingM = mapping.find((m) => m.canonical === "underlying_price");

  type Bucket = { callOI: number; putOI: number; callVol: number; putVol: number; totalOI: number; totalVol: number; ivs: number[]; gammas: number[]; gex: number[] };
  const byStrike = new Map<number, Bucket>();
  const latestUnderlying = underlyingVals.filter((v): v is number => v !== null && v > 0).at(-1) ?? null;

  rows.forEach((row, i) => {
    const strike = parseNum(row[strikeM.source]);
    if (strike === null || !Number.isFinite(strike) || strike <= 0) return;
    const underlying = underlyingM ? parseNum(row[underlyingM.source]) : latestUnderlying;
    if (underlying && (strike < underlying * 0.05 || strike > underlying * 8)) return;
    if (!byStrike.has(strike)) byStrike.set(strike, { callOI: 0, putOI: 0, callVol: 0, putVol: 0, totalOI: 0, totalVol: 0, ivs: [], gammas: [], gex: [] });
    const b = byStrike.get(strike)!;

    const side = ctM ? optionSide(row[ctM.source]) : null;

    const oi = cleanPositive(oiM ? parseNum(row[oiM.source]) : null);
    const vol = cleanPositive(volM ? parseNum(row[volM.source]) : null);
    const iv = ivM ? parseNum(row[ivM.source]) : null;
    const gm = gammaM ? parseNum(row[gammaM.source]) : null;

    b.totalOI += oi;
    b.totalVol += vol;
    if (callOIM) b.callOI += cleanPositive(parseNum(row[callOIM.source]));
    else if (side === "call") b.callOI += oi;
    if (putOIM) b.putOI += cleanPositive(parseNum(row[putOIM.source]));
    else if (side === "put") b.putOI += oi;
    if (callVolM) b.callVol += cleanPositive(parseNum(row[callVolM.source]));
    else if (side === "call") b.callVol += vol;
    if (putVolM) b.putVol += cleanPositive(parseNum(row[putVolM.source]));
    else if (side === "put") b.putVol += vol;

    if (iv !== null) b.ivs.push(iv);
    if (gm !== null) b.gammas.push(gm);

    const directGex = gexM ? parseNum(row[gexM.source]) : null;
    if (directGex !== null) b.gex.push(directGex);
    else {
      const g = gammaVals[i], o = oiVals[i], u = underlyingVals[i];
      if (g !== null && o !== null) b.gex.push(u !== null ? g * Math.max(0, o) * u * u * 0.01 : g * Math.max(0, o));
    }
  });

  const result = Array.from(byStrike.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([strike, d]) => ({
      strike,
      callOI: d.callOI, putOI: d.putOI,
      callVol: d.callVol, putVol: d.putVol,
      totalOI: d.totalOI || d.callOI + d.putOI,
      totalVol: d.totalVol || d.callVol + d.putVol,
      gammaExposure: d.gex.length ? d.gex.reduce((s, v) => s + v, 0) : 0,
      iv: d.ivs.length ? d.ivs.reduce((s, v) => s + v, 0) / d.ivs.length : null,
      gamma: d.gammas.length ? d.gammas.reduce((s, v) => s + v, 0) / d.gammas.length : null,
    }));
  if (typeof console !== "undefined") console.log("[Options debug] strike aggregation results", { strikeColumn: strikeM.source, sideColumn: ctM?.source ?? null, count: result.length, sample: result.slice(0, 8) });
  return result;
}

function selectTopStrike(strikeData: OptionsAnalysis["strikeData"], side: "call" | "put"): OptionsAnalysis["topCallStrikeDetail"] {
  const totalSideOI = strikeData.reduce((s, r) => s + (side === "call" ? r.callOI : r.putOI), 0);
  const totalSideVol = strikeData.reduce((s, r) => s + (side === "call" ? r.callVol : r.putVol), 0);
  if (totalSideOI <= 0 && totalSideVol <= 0) return null;
  const ranked = [...strikeData]
    .map((r) => {
      const oi = side === "call" ? r.callOI : r.putOI;
      const volume = side === "call" ? r.callVol : r.putVol;
      const concentration = oi * 0.7 + volume * 0.25 + Math.abs(r.gammaExposure) * 0.000001;
      return { strike: r.strike, oi, volume, dominance: totalSideOI > 0 ? (oi / totalSideOI) * 100 : (volume / Math.max(1, totalSideVol)) * 100, concentration };
    })
    .filter((r) => r.oi > 0 || r.volume > 0)
    .sort((a, b) => b.concentration - a.concentration);
  const top = ranked[0] ? { strike: ranked[0].strike, oi: ranked[0].oi, volume: ranked[0].volume, dominance: ranked[0].dominance } : null;
  if (typeof console !== "undefined") console.log("[Options debug] top strike selection", { side, totalSideOI, totalSideVol, top, ranked: ranked.slice(0, 5) });
  return top;
}

// ─── Expiry Builder ───────────────────────────────────────────────────────────

function buildExpiryData(rows: Row[], mapping: OptionColumnMapping[], dateCol: string | null): OptionsAnalysis["expiryData"] {
  const expiryM = mapping.find((m) => m.canonical === "expiration_date");
  const dteM = mapping.find((m) => m.canonical === "days_to_expiry");
  if (!expiryM && !dteM) return [];

  const callOIM = mapping.find((m) => m.canonical === "call_oi");
  const putOIM = mapping.find((m) => m.canonical === "put_oi");
  const oiM = mapping.find((m) => m.canonical === "open_interest");
  const volM = mapping.find((m) => m.canonical === "volume");
  const gexM = mapping.find((m) => m.canonical === "gamma_exposure");
  const gammaM = mapping.find((m) => m.canonical === "gamma");
  const underlyingM = mapping.find((m) => m.canonical === "underlying_price");
  const ctM = mapping.find((m) => m.canonical === "contract_type");

  type ExBucket = { callOI: number; putOI: number; totalOI: number; totalVolume: number; gammaExposure: number; daysLeft: number };
  const byExpiry = new Map<string, ExBucket>();

  rows.forEach((row) => {
    const expKey = expiryM ? parseStr(row[expiryM.source]) : null;
    const dte = dteM ? parseNum(row[dteM.source]) : null;
    const normalizedDte = dte !== null && Number.isFinite(dte) && dte >= 0 && dte <= 3650 ? Math.round(dte) : null;
    const key = expKey ?? (normalizedDte !== null ? `DTE-${normalizedDte}` : null);
    if (!key) return;

    const tradeDate = dateCol ? parseStr(row[dateCol]) : null;
    const tradeTime = tradeDate ? new Date(tradeDate).getTime() : NaN;
    const expiryTime = expKey ? new Date(expKey).getTime() : NaN;
    const dateDiff = Number.isFinite(tradeTime) && Number.isFinite(expiryTime)
      ? Math.max(0, Math.round((expiryTime - tradeTime) / 86400000))
      : null;
    const daysLeft = normalizedDte ?? dateDiff ?? 30;

    if (!byExpiry.has(key)) byExpiry.set(key, { callOI: 0, putOI: 0, totalOI: 0, totalVolume: 0, gammaExposure: 0, daysLeft });

    const b = byExpiry.get(key)!;
    b.daysLeft = Math.min(b.daysLeft, daysLeft);
    const side = ctM ? optionSide(row[ctM.source]) : null;
    const oi = cleanPositive(oiM ? parseNum(row[oiM.source]) : null);
    const vol = cleanPositive(volM ? parseNum(row[volM.source]) : null);
    const directGex = gexM ? parseNum(row[gexM.source]) : null;
    const gamma = gammaM ? parseNum(row[gammaM.source]) : null;
    const underlying = underlyingM ? parseNum(row[underlyingM.source]) : null;

    b.totalOI += oi;
    b.totalVolume += vol;
    b.gammaExposure += directGex ?? (gamma !== null ? gamma * oi * (underlying ? underlying * underlying * 0.01 : 1) : 0);
    if (callOIM) b.callOI += cleanPositive(parseNum(row[callOIM.source]));
    else if (side === "call") b.callOI += oi;
    if (putOIM) b.putOI += cleanPositive(parseNum(row[putOIM.source]));
    else if (side === "put") b.putOI += oi;
  });

  const result = Array.from(byExpiry.entries())
    .sort((a, b) => a[1].daysLeft - b[1].daysLeft)
    .map(([expiry, d]) => ({
      expiry,
      callOI: d.callOI, putOI: d.putOI,
      totalOI: d.totalOI || d.callOI + d.putOI,
      totalVolume: d.totalVolume,
      gammaExposure: d.gammaExposure,
      daysLeft: d.daysLeft,
    }));
  if (typeof console !== "undefined") console.log("[Options debug] expiry clustering calculation input", { expiryColumn: expiryM?.source ?? null, dteColumn: dteM?.source ?? null, result });
  return result;
}

// ─── Gamma Flip Estimation ────────────────────────────────────────────────────

function estimateGammaFlip(strikeData: OptionsAnalysis["strikeData"]): number | null {
  if (strikeData.length < 3) return null;
  // The gamma flip zone is where cumulative GEX transitions from positive to negative
  let cumGEX = 0;
  let lastPositive: number | null = null;
  let firstNegative: number | null = null;
  for (const d of strikeData) {
    const gex = d.gammaExposure;
    cumGEX += gex;
    if (cumGEX > 0) lastPositive = d.strike;
    else if (cumGEX <= 0 && firstNegative === null) firstNegative = d.strike;
  }
  if (lastPositive !== null && firstNegative !== null) {
    return Math.round((lastPositive + firstNegative) / 2);
  }
  return null;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function buildOptionsAnalysis(rows: Row[]): OptionsAnalysis {
  const NULL_RESULT: OptionsAnalysis = {
    detected: false, datasetType: "aggregated", confidence: 0, confidenceScore: 0,
    confidenceLabel: "Very Low Confidence", mapping: [], availableFields: [], rowCount: 0,
    rows: [], dates: [], pcrDerived: false,
    pcrSeries: [], ivSeries: [], oiSeries: [], gammaSeries: [], gammaExposureSeries: [], callPutVolSeries: [],
    latestPCR: null, pcrTrend: null, latestIV: null, ivTrend: null,
    latestOI: null, oiChange: null, latestGamma: null, latestGammaExposure: null,
    latestDelta: null, latestUnderlying: null, ivPercentile: null,
    strikeData: [], topCallStrike: null, topPutStrike: null, topCallStrikeDetail: null, topPutStrikeDetail: null, gammaFlipZone: null,
    expiryData: [], nearTermPressure: 0,
    riskScore: null, signals: [], crossSignals: [],
    insights: [], aiSummary: { condition: "", riskExplanation: "", observations: [], scenarios: [], alphaNote: "" },
    preprocessingWarnings: [],
  };

  if (!rows.length) return NULL_RESULT;

  // 1. Column detection
  const mapping = detectColumns(rows);
  const availableFields = mapping.map((m) => m.canonical);
  if (typeof console !== "undefined") console.log("[Options debug] detected columns", {
    strikeColumn: mapping.find((m) => m.canonical === "strike_price")?.source ?? null,
    optionSideColumn: mapping.find((m) => m.canonical === "contract_type")?.source ?? null,
    expiryColumn: mapping.find((m) => m.canonical === "expiration_date")?.source ?? null,
    dteColumn: mapping.find((m) => m.canonical === "days_to_expiry")?.source ?? null,
  });

  // 2. Trigger check — must have at least one key option metric
  const TRIGGER_FIELDS: OptionCanonicalColumn[] = [
    "put_call_ratio", "implied_volatility", "open_interest", "gamma",
    "delta", "vega", "call_volume", "put_volume", "call_oi", "put_oi",
    "gamma_exposure", "strike_price", "expiration_date",
  ];
  if (!availableFields.some((f) => TRIGGER_FIELDS.includes(f))) return NULL_RESULT;

  const warnings: string[] = [];

  // 3. Date detection & aggregation
  const dateCol = detectDateColumn(rows);
  let aggRows: { date: string; agg: Record<string, number | null> }[] = [];
  let dates: string[] = [];

  if (dateCol) {
    aggRows = aggregateByDate(rows, dateCol, mapping);
    dates = aggRows.map((r) => r.date);
    if (aggRows.length < rows.length) {
      warnings.push(`중복 날짜 ${rows.length - aggRows.length}개를 집계했습니다.`);
    }
  } else {
    dates = rows.map((_, i) => `T-${i + 1}`);
    warnings.push("날짜 컬럼이 감지되지 않아 인덱스 기반 차트를 사용합니다.");
  }

  // 4. Extract aggregated series from aggRows (or direct rows if no date)
  const getAggSeries = (canonical: OptionCanonicalColumn): (number | null)[] => {
    if (aggRows.length) return aggRows.map((r) => r.agg[canonical] ?? null);
    return getNumCol(rows, mapping, canonical);
  };

  let pcrValsRaw = getAggSeries("put_call_ratio");
  const callVolVals = getAggSeries("call_volume");
  const putVolVals = getAggSeries("put_volume");

  // 5. PCR derivation from volumes if not direct
  const { values: pcrVals, derived: pcrDerived } = derivePCR(pcrValsRaw, callVolVals, putVolVals);
  if (pcrDerived) warnings.push("put_call_ratio 컬럼 없음 — 콜/풋 거래량으로 PCR을 산출했습니다.");

  const ivVals = getAggSeries("implied_volatility");
  const oiVals = getAggSeries("open_interest");
  const gammaRawVals = getAggSeries("gamma");
  const deltaVals = getAggSeries("delta");
  const underlyingVals = getAggSeries("underlying_price");
  const directGEXVals = getAggSeries("gamma_exposure");
  const dealerGammaVals = getAggSeries("dealer_gamma");
  const netGammaVals = getAggSeries("net_gamma");
  const volumeVals = getAggSeries("volume");
  const bidVals = getAggSeries("bid");
  const askVals = getAggSeries("ask");

  // Use best gamma source
  const effectiveGammaVals = gammaRawVals.some((v) => v !== null) ? gammaRawVals
    : dealerGammaVals.some((v) => v !== null) ? dealerGammaVals
    : netGammaVals;

  // 6. Gamma exposure
  const gexVals = computeGammaExposure(effectiveGammaVals, oiVals, underlyingVals, directGEXVals);

  // 7. IV percentile (requires 20+ valid rows)
  const ivPct = availableFields.includes("iv_percentile")
    ? getAggSeries("iv_percentile").filter((v): v is number => validPct(v) !== null).at(-1) ?? null
    : rollingPct(ivVals);

  // 8. Latest values
  const lastValid = <T>(arr: (T | null)[]): T | null => arr.filter((v): v is T => v !== null).at(-1) ?? null;
  const latestPCR = lastValid(pcrVals);
  const latestIV = lastValid(ivVals);
  const latestOI = lastValid(oiVals);
  const latestGamma = lastValid(effectiveGammaVals);
  const latestGammaExposure = lastValid(gexVals);
  const latestDelta = lastValid(deltaVals);
  const latestUnderlying = lastValid(underlyingVals);

  // 9. Trends
  const pcrTrend = trendChange(pcrVals, 5);
  const ivTrend = trendChange(ivVals, 5);
  const oiValid = oiVals.filter((v): v is number => v !== null);
  const oiChange = oiValid.length >= 2 ? (oiValid.at(-1)! - oiValid.at(-2)!) / Math.abs(oiValid.at(-2)! || 1) : null;

  // 10. Series for charts
  const toSeries = (vals: (number | null)[], ds: string[]): OptionSeriesPoint[] =>
    vals.map((v, i) => ({ date: ds[i] ?? `T-${i}`, value: v! })).filter((_, i) => vals[i] !== null);

  const pcrSeries = toSeries(pcrVals, dates);
  const ivSeries = toSeries(ivVals, dates);
  const oiSeries = toSeries(oiVals, dates);
  const gammaSeries = toSeries(effectiveGammaVals, dates);
  const gammaExposureSeries = toSeries(gexVals, dates);
  const callPutVolSeries = dates.map((date, i) => ({
    date, call: callVolVals[i] ?? 0, put: putVolVals[i] ?? 0,
    total: (callVolVals[i] ?? 0) + (putVolVals[i] ?? 0),
  })).filter((p) => p.call > 0 || p.put > 0);

  // 11. Strike-level data (use original rows for multi-row contract datasets)
  const strikeData = buildStrikeData(rows, mapping, effectiveGammaVals, oiVals, underlyingVals);
  const topCallStrikeDetail = selectTopStrike(strikeData, "call");
  const topPutStrikeDetail = selectTopStrike(strikeData, "put");
  const topCallStrike = topCallStrikeDetail?.strike ?? null;
  const topPutStrike = topPutStrikeDetail?.strike ?? null;
  const gammaFlipZone = estimateGammaFlip(strikeData);

  // 12. Expiry data
  const expiryData = buildExpiryData(rows, mapping, dateCol);
  const nearTermPressure = scoreExpiryPressure(expiryData);

  // 13. Dataset type
  const datasetType = detectDatasetType(availableFields, rows.length);

  // 14. Confidence
  const validVals = (arr: (number | null)[]) => arr.filter((v) => v !== null).length;
  const totalValues = availableFields.reduce((s, f) => {
    const m = mapping.find((x) => x.canonical === f);
    if (!m) return s;
    return s + rows.filter((r) => parseNum(r[m.source]) !== null).length;
  }, 0);
  const missingRatio = availableFields.length > 0
    ? 1 - totalValues / (rows.length * availableFields.length)
    : 1;
  const { score: confidenceScore, label: confidenceLabel, confidence } = computeConfidence(
    availableFields, rows.length, missingRatio, dateCol !== null
  );

  // 15. Risk scoring — all components derived from the same series computed above
  const pcrStress = latestPCR !== null ? scorePCRStress(pcrVals) : 50;
  const ivStress = latestIV !== null ? scoreIVStress(ivVals, ivPct) : 50; // uses shared ivPct
  const gammaInstability = latestGamma !== null ? scoreGammaInstability(effectiveGammaVals) : 50; // gammaRisk score
  const oiConcentration = latestOI !== null ? scoreOIConcentration(oiVals) : 50;
  const expiryPressure = expiryData.length ? nearTermPressure : 50;
  const strikeConcentration = strikeData.length >= 3 ? scoreStrikeConcentration(strikeData) : 50;
  const unusualActivity = scoreUnusualActivity(callVolVals, putVolVals, oiVals, pcrVals);
  const { score: putDominanceStress, hasData: putDomHasData } = scorePutDominance(callVolVals, putVolVals);
  const liquidityStability = scoreLiquidityStability(volumeVals, bidVals, askVals);
  const skewPressure = 50;
  const flowImbalance = scoreFlowImbalance(callVolVals, putVolVals);
  // Data quality penalty: 0 (high confidence) to 30 (very low confidence)
  const dataQualityPenalty = Math.max(0, Math.min(30, Math.round((100 - confidenceScore) * 0.4)));

  // Weighted formula per spec: PCR 25% + IV 25% + GammaRisk 20% + PutDom 15% + OI 10% + DataQualPenalty 5%
  // Only include components that have real underlying data
  type Comp = { label: string; v: number; hasData: boolean; weight: number };
  const comps: Comp[] = [
    { label: "pcr",      v: pcrStress,          hasData: latestPCR !== null,     weight: 0.18 },
    { label: "iv",       v: ivStress,            hasData: latestIV !== null,      weight: 0.14 },
    { label: "gamma",    v: gammaInstability,    hasData: latestGamma !== null,   weight: 0.16 },
    { label: "putDom",   v: putDominanceStress,  hasData: putDomHasData,          weight: 0.12 },
    { label: "oi",       v: oiConcentration,     hasData: latestOI !== null,      weight: 0.10 },
    { label: "expiry",   v: expiryPressure,      hasData: expiryData.length > 0,  weight: 0.12 },
    { label: "strike",   v: strikeConcentration, hasData: strikeData.length >= 3, weight: 0.07 },
    { label: "unusual",  v: unusualActivity,     hasData: true,                   weight: 0.08 },
    { label: "liquidity",v: liquidityStability,  hasData: volumeVals.some((v) => v !== null) || bidVals.some((v) => v !== null), weight: 0.04 },
    { label: "flow",     v: flowImbalance,       hasData: putDomHasData,          weight: 0.04 },
    { label: "dataQual", v: dataQualityPenalty,  hasData: true,                   weight: 0.05 },
  ];
  const activeComps = comps.filter((c) => c.hasData);
  const totalWeight = activeComps.reduce((s, c) => s + c.weight, 0) || 1;
  const rawScore = Math.round(activeComps.reduce((s, c) => s + c.v * (c.weight / totalWeight), 0));
  const confidenceForRisk: OptionsRiskScore["confidence"] = confidenceScore >= 75 && activeComps.length >= 5 ? "High" : confidenceScore >= 50 && activeComps.length >= 3 ? "Medium" : "Low";
  const components = { pcrStress, ivStress, gammaInstability, putDominanceStress, oiConcentration, expiryPressure, strikeConcentration, unusualActivity, liquidityStability, skewPressure, flowImbalance };

  const riskScore: OptionsRiskScore = {
    score: rawScore,
    label: riskScoreToLabel(rawScore),
    confidence: confidenceForRisk,
    alphaImpact: alphaImpact(rawScore, latestPCR, latestGamma, putDominanceStress),
    components,
    activeComponentCount: activeComps.length,
    explanation: buildRiskExplanation(rawScore, components, expiryData.length > 0),
    warnings,
  };
  if (typeof console !== "undefined") console.log("[Options debug] final optionRiskResult object", { riskScore, componentWeights: activeComps, expiryAvailable: expiryData.length > 0 });

  // 16. Signals — pass confidenceScore so Data Reliability uses the same value as summary cards
  const signals = buildSignals(
    availableFields, pcrVals, ivVals, oiVals, effectiveGammaVals,
    deltaVals, callVolVals, putVolVals, ivPct, expiryData, strikeData, confidenceScore
  );

  // 17. Cross-signals
  const crossSignals = buildCrossSignals(latestPCR, latestIV, ivPct, latestGamma, oiChange, latestOI);

  // 18. Insights
  const insights = buildInsights(latestPCR, latestIV, latestGamma, latestOI, oiChange, ivPct, pcrDerived, strikeData);

  // 19. AI Summary
  const aiSummary = buildAISummary(riskScore, latestPCR, latestIV, latestGamma, ivPct, oiChange, strikeData);

  if (!pcrSeries.length && !ivSeries.length && !oiSeries.length && !gammaSeries.length && !strikeData.length) {
    warnings.push("시계열 데이터를 추출할 수 없습니다. 스냅샷 모드로 전환합니다.");
  }

  return {
    detected: true, datasetType, confidence, confidenceScore, confidenceLabel,
    mapping, availableFields, rowCount: rows.length, rows, dates, pcrDerived,
    pcrSeries, ivSeries, oiSeries, gammaSeries, gammaExposureSeries, callPutVolSeries,
    latestPCR, pcrTrend, latestIV, ivTrend, latestOI, oiChange,
    latestGamma, latestGammaExposure, latestDelta, latestUnderlying, ivPercentile: ivPct,
    strikeData, topCallStrike, topPutStrike, topCallStrikeDetail, topPutStrikeDetail, gammaFlipZone,
    expiryData, nearTermPressure,
    riskScore, signals, crossSignals, insights, aiSummary,
    preprocessingWarnings: warnings,
  };
}
