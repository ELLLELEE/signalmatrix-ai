"use client";

import { Component, Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnalysisResult, EconomicCalendarAnalysis, EtfFlowAnalysis, FinancialAnalysis, MacroAnalysis, NewsEventAnalysis, OnchainAnalysis, OptionsAnalysis, PortfolioAnalysis, Row, SentimentAnalysis, ShortAlphaContext, ShortAnalysis, ValuationAnalysis, analyzeFile, analyzeSample } from "@/lib/dataPipeline";
import { INDICATOR_CONFIG, MacroCanonicalColumn } from "@/lib/macroEngine";
import { FINANCIAL_INDICATOR_CONFIG, FinancialCanonicalColumn } from "@/lib/financialEngine";
import { VALUATION_INDICATOR_CONFIG, VALUATION_STATE_LABEL, ValuationCanonicalColumn } from "@/lib/valuationEngine";
import { VisualizationEngine, buildVisualizationEngine } from "@/lib/intelligentEngine";
import { FlowCategory, SupplyFlowAnalysis, SupplyScenario } from "@/lib/supplyFlowEngine";

type Tone = "good" | "warn" | "bad" | "muted";
type Scenario = {
  price: number;
  volume: number;
  foreign: number;
  institution: number;
  vix: number;
  institutionalFlow: number;
  foreignFlow: number;
  retailFlow: number;
  aggregateFlow: number;
  dealerFlow: number;
  etfFlow: number;
  whaleFlow: number;
};
type SimulationStatus = "active" | "limited" | "unavailable";
type SimulationKey = "price" | "volume" | "foreign" | "institution" | "vix";
type SimulationCapability = {
  status: SimulationStatus;
  tone: Tone;
  matchedColumn: string | null;
  confidence: number;
  reason: string;
};
type SimulationCapabilities = Record<SimulationKey, SimulationCapability>;
type DrawTool = "cursor" | "trend" | "support" | "fib" | "zone" | "channel" | "ray" | "rect" | "label";
type ChartDrawing = {
  id: number;
  tool: Exclude<DrawTool, "cursor">;
  start: { x: number; y: number };
  end: { x: number; y: number };
  text?: string;
};
type DatasetAnalysisKind =
  | "ohlcv"
  | "supply"
  | "short"
  | "options"
  | "macro"
  | "etf"
  | "fundamental"
  | "valuation"
  | "portfolio"
  | "sentiment"
  | "onchain"
  | "news"
  | "factor"
  | "alternative"
  | "generic";
type OhlcvWorkspaceTab = "overview" | "signals" | "risk" | "insight";
type SupplyWorkspaceTab = "overview" | "signals" | "risk" | "insight";
type ShortWorkspaceTab = "visualization" | "features" | "summary";
type OptionsWorkspaceTab = "visualization" | "signals" | "analytics" | "interpretation";
type MacroWorkspaceTab = "indicators" | "regime" | "risk" | "report";
type EtfFlowWorkspaceTab = "overview" | "features" | "risk" | "summary";
type FinancialWorkspaceTab = "visualization" | "features" | "risks" | "report";
type ValuationWorkspaceTab = "overview" | "characteristics" | "risk" | "interpretation";
type PortfolioWorkspaceTab = "overview" | "structure" | "risk" | "analysis";
type SentimentWorkspaceTab = "overview" | "features" | "risk" | "interpretation";
type AdaptiveOverview = {
  label: string;
  title: string;
  dataDescription: string;
  visualizationDescription: string;
  tags: string[];
  confidence: number;
};

function qualityTone(score: number): Tone {
  return score >= 60 ? "good" : score >= 40 ? "warn" : "bad";
}

function riskLabel(status: VisualizationEngine["riskStatus"]) {
  if (status === "LOW") return "낮음";
  if (status === "ELEVATED") return "주의";
  return "높음";
}

function hasFullOhlcv(analysis: AnalysisResult) {
  const columns = new Set(analysis.mapping.map((mapping) => mapping.canonical));
  return ["open", "high", "low", "close", "volume"].every((column) => columns.has(column as AnalysisResult["mapping"][number]["canonical"]));
}

function datasetType(analysis: AnalysisResult) {
  const columns = new Set(analysis.mapping.map((m) => m.canonical));
  const ohlcv: Array<AnalysisResult["mapping"][number]["canonical"]> = ["open", "high", "low", "close", "volume"];
  if (ohlcv.every((key) => columns.has(key))) return "OHLCV Detected";
  if (columns.has("close") && columns.has("volume")) return "Price/Volume Detected";
  if (columns.has("close")) return "Close Price Detected";
  return "Limited Dataset";
}

function recoveryStatus(analysis: AnalysisResult) {
  if (analysis.forcedRecoveryApplied) return "Forced Recovery Applied";
  if (analysis.liteMode) return "Lite Mode Active";
  return "Full Signal Mode";
}

function recoveryTone(analysis: AnalysisResult): Tone {
  if (analysis.forcedRecoveryApplied || analysis.liteMode) return "warn";
  return "good";
}

function displayDelimiter(delimiter: string) {
  if (delimiter === "\t") return "Tab";
  if (delimiter === " ") return "Space";
  return delimiter;
}

function importDetails(analysis: AnalysisResult) {
  const details = [
    `Encoding: ${analysis.parsed.encoding}`,
    `Delimiter: ${displayDelimiter(analysis.parsed.delimiter)}`,
    `Rows: ${analysis.rows.length}`,
    "Timezone normalized"
  ];

  if (analysis.sanitizeLog.rowsBefore > analysis.sanitizeLog.rowsAfter) details.push("Duplicate dates removed");
  if (analysis.sanitizeLog.droppedColumns.length) details.push("Constant column removed");
  else details.push("No constant columns removed");
  details.push(analysis.forcedRecoveryApplied ? "Forced recovery applied" : "Forced recovery not applied");

  return details;
}

class FinancialDashboardErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || "알 수 없는 렌더링 오류" };
  }

  componentDidCatch(error: Error) {
    console.warn("[Stability] Dashboard render fallback activated", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <section className="rounded-xl border border-amber-300/25 bg-amber-300/[0.055] p-6 shadow-[0_0_45px_rgba(251,191,36,0.12)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-200">Lite Analysis Fallback</p>
        <h2 className="mt-3 text-2xl font-black text-white">렌더링 오류를 격리하고 제한 분석으로 전환했습니다</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          일부 시각화 컴포넌트가 필요한 컬럼 또는 계산 결과를 받지 못했습니다. 대시보드는 중단하지 않고 진단 정보를 표시합니다.
        </p>
        <p className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-400">{this.state.message}</p>
      </section>
    );
  }
}

function TrustBlock({ title, items, tone }: { title: string; items: string[]; tone: Tone }) {
  const color = tone === "good" ? "text-mint border-mint/20 bg-mint/[0.04]" : tone === "warn" ? "text-amber-200 border-amber-300/20 bg-amber-300/[0.04]" : "text-rose-300 border-rose-400/20 bg-rose-400/[0.04]";
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em]">{title}</p>
      <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-300">
        {items.slice(0, 5).map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </div>
  );
}

function SystemDiagnosticsPanel({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const status = engine.systemStatus;
  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">시스템 진단 / Debug Visibility</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">데이터셋 락, 정규화, 누락 신호, 충돌 패널티를 최종 Alpha 계층 기준으로 노출합니다.</p>
        </div>
        <MiniBadge tone={status.confidence >= 70 ? "good" : status.confidence >= 45 ? "warn" : "bad"}>{status.confidenceLabel} Confidence</MiniBadge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {status.diagnostics.map((item) => (
          <div key={item.label} className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
            <p className="mt-2 text-sm font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SignalBucket title="사용 가능 신호" items={status.availableSignals} tone="good" />
        <SignalBucket title="누락 신호" items={status.missingSignals} tone="warn" />
        <SignalBucket title="충돌 패널티" items={status.conflictPenalties.map((penalty) => `${penalty.label} (-${penalty.points})`)} tone="bad" />
      </div>
      {analysis.metricPipeline?.warnings?.length ? (
        <p className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs leading-6 text-slate-300">
          데이터 품질 경고: {analysis.metricPipeline.warnings.slice(0, 4).join(" ")}
        </p>
      ) : null}
    </section>
  );
}

function TrustAwareAISection({ engine }: { engine: VisualizationEngine }) {
  const status = engine.systemStatus;
  return (
    <section className="rounded-xl border border-cyan/15 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">AI 분석 / 신뢰도 분리</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">결론을 사실, 추론, 낮은 신뢰도 가정으로 분리해 과장 해석을 방지합니다.</p>
        </div>
        <MiniBadge tone={status.weakSignalEnvironment ? "warn" : "good"}>{status.weakSignalEnvironment ? "Weak Signal" : "Trust Aware"}</MiniBadge>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <TrustBlock title="FACT" items={status.facts} tone="good" />
        <TrustBlock title="INFERENCE" items={status.inferences} tone="warn" />
        <TrustBlock title="LOW CONFIDENCE" items={status.lowConfidenceNotes.length ? status.lowConfidenceNotes : ["현재 추가 제한 사항은 감지되지 않았습니다."]} tone="bad" />
      </div>
      <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-slate-300">{status.explanation}</p>
    </section>
  );
}

function PremiumVisualizationHero({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const status = engine.systemStatus;
  const confidenceTone = status.confidence >= 70 ? "text-mint" : status.confidence >= 45 ? "text-amber-300" : "text-rose-300";
  const riskTone = engine.riskTone === "good" ? "border-mint/30 bg-mint/10 text-mint" : engine.riskTone === "warn" ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : "border-rose-400/30 bg-rose-400/10 text-rose-300";
  const keySignals = status.availableSignals.slice(0, 3);

  useEffect(() => {
    console.log("[Stability] universal system status", status);
  }, [status]);

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-cyan/20 bg-[linear-gradient(135deg,rgba(2,6,23,0.98),rgba(8,47,73,0.34)_50%,rgba(2,6,23,0.98))] p-4 shadow-[0_30px_110px_rgba(0,0,0,0.48),0_0_70px_rgba(34,211,238,0.14)]">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent opacity-80" />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">Institutional Hero Visualization</p>
            <p className="mt-1 text-xs text-slate-500">업로드된 CSV에 맞는 최상위 고급 차트를 먼저 렌더링합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MiniBadge tone="good">Premium Chart First</MiniBadge>
            <MiniBadge tone="muted">{status.detectedDatasetType}</MiniBadge>
          </div>
        </div>
        <PremiumHeroChart analysis={analysis} engine={engine} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="rounded-xl border border-cyan/15 bg-slate-950/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${riskTone}`}>{status.weakSignalEnvironment ? "Weak Signal Environment" : engine.riskStatus}</span>
            <MiniBadge tone={status.fallbackMode ? "warn" : "good"}>{status.fallbackMode ? "Lite Analysis" : "Locked Mode"}</MiniBadge>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Alpha</p>
              <p className="mt-1 text-4xl font-black text-white">{status.alphaScore}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Confidence</p>
              <p className={`mt-1 text-3xl font-black ${confidenceTone}`}>{status.confidence}%</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Regime</p>
              <p className="mt-1 truncate text-xl font-black text-cyan">{status.lockedDatasetType}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(keySignals.length ? keySignals : ["핵심 신호 부족", "전용 차트 우선", "제한 신뢰도"]).map((signal, index) => (
            <div key={`${signal}-${index}`} className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Key Signal {index + 1}</p>
              <p className="mt-2 truncate text-sm font-black text-white">{signal}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PremiumHeroChart({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const kind = datasetAnalysisKind(analysis, engine);
  if (kind === "ohlcv") return analysis.chart.length ? <MarketChartSection analysis={analysis} engine={engine} /> : <PrimaryVisualizationPanel analysis={analysis} engine={engine} />;
  if (kind === "supply") return (
    <Card title="Smart Money Flow / Institutional Cumulative Pressure">
      <SmartMoneyFlowChart supply={engine.supply} />
    </Card>
  );
  if (kind === "short") return (
    <Card title="Short Pressure Institutional Chart">
      <ShortHoverableMainChart short={analysis.shortAnalysis} chart={analysis.chart} />
    </Card>
  );
  if (kind === "options") return <OptionsPremiumHero options={analysis.optionsAnalysis} />;
  if (kind === "macro") {
    if (analysis.datasetClassification.primaryType === "economic_calendar") return <EconomicCalendarOverviewTab calendar={analysis.economicCalendarAnalysis} />;
    return <MacroSemanticCategoryCharts macro={analysis.macroAnalysis} />;
  }
  if (kind === "etf") return <EtfFlowOverviewTab etf={analysis.etfFlowAnalysis} />;
  if (kind === "fundamental") return <FinancialVisualizationTab financial={analysis.financialAnalysis} />;
  if (kind === "valuation") return <ValuationHistoricalBandChart valuation={analysis.valuationAnalysis} />;
  if (kind === "portfolio") return <PortfolioOverviewTab portfolio={analysis.portfolioAnalysis} />;
  if (kind === "sentiment") return <SentimentOverviewTab sentiment={analysis.sentimentAnalysis} />;
  if (kind === "onchain") return <OnchainWorkspace onchain={analysis.onchainAnalysis} />;
  if (kind === "news") return <NewsEventWorkspace news={analysis.newsEventAnalysis} />;
  return <PrimaryVisualizationPanel analysis={analysis} engine={engine} />;
}

function OptionsPremiumHero({ options }: { options: OptionsAnalysis }) {
  if (options.gammaExposureSeries.length > 1) return <OptionsGEXChart series={options.gammaExposureSeries} gammaFlipZone={options.gammaFlipZone} />;
  if (options.gammaSeries.length > 1) return <OptionsGammaChart series={options.gammaSeries} />;
  if (options.ivSeries.length > 1) return <OptionsIVChart series={options.ivSeries} ivPercentile={options.ivPercentile} ivTrend={options.ivTrend} />;
  if (options.oiSeries.length > 1) return <OptionsOIChart series={options.oiSeries} callPutSeries={options.callPutVolSeries} oiChange={options.oiChange} />;
  if (options.pcrSeries.length > 1) return <OptionsPCRChart series={options.pcrSeries} pcrDerived={options.pcrDerived} pcrTrend={options.pcrTrend} />;
  return (
    <div className="flex min-h-80 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.04] text-sm font-bold text-slate-400">
      옵션 고급 차트에 필요한 시계열이 부족합니다. IV, Gamma, OI, PCR 중 하나 이상의 시계열 컬럼이 필요합니다.
    </div>
  );
}

const adaptiveDatasetSpecs: Array<{
  label: string;
  title: string;
  dataDescription: string;
  visualizationDescription: string;
  tags: string[];
  patterns: RegExp[];
}> = [
  {
    label: "OHLCV Price Data",
    title: "Market Structure & Price Action Analysis",
    dataDescription: "시가, 고가, 저가, 종가, 거래량 중심의 가격 구조 데이터가 들어왔습니다.",
    visualizationDescription: "캔들 차트, 거래량 추세, 변동성 밴드, 추세 강도, 수익률 분포를 우선 표시합니다.",
    tags: ["MARKET STRUCTURE", "PRICE ACTION", "VOLUME", "VOLATILITY"],
    patterns: [/^open$/, /^high$/, /^low$/, /^close$/, /^volume$/, /시가|고가|저가|종가|거래량/]
  },
  {
    label: "Supply / Smart Money Data",
    title: "Smart Money Flow Analysis",
    dataDescription: "외국인·기관·개인 수급 데이터를 감지했습니다. 누적 순매수와 Smart Money 흐름 중심으로 분석합니다.",
    visualizationDescription: "누적 순매수 / 수급 Heatmap / Flow 분석을 우선 표시합니다.",
    tags: ["SMART MONEY", "FLOW ANALYSIS", "NET BUY", "PARTICIPANT MAP"],
    patterns: [/foreign|foreigner|institution|institutional|retail|net.?buy|net.?flow|capital.?flow|inflow|outflow|dealer|broker|whale|smart.?money|외국인|기관|개인|순매수|수급|유입|유출|자본/]
  },
  {
    label: "Short Selling Data",
    title: "Short Pressure & Squeeze Analysis",
    dataDescription: "공매도 거래량 및 공매도 비율 데이터를 감지했습니다. Bearish 압력과 숏 스퀴즈 가능성을 분석합니다.",
    visualizationDescription: "Short Ratio / Squeeze Risk / Pressure Heatmap을 우선 표시합니다.",
    tags: ["SHORT INTEREST", "BORROW FEE", "SQUEEZE RISK", "PRESSURE"],
    patterns: [/short.?volume|short.?ratio|borrow.?fee|days.?to.?cover|공매도|대차/]
  },
  {
    label: "Options Data",
    title: "Volatility & Dealer Positioning Analysis",
    dataDescription: "옵션 변동성 및 Put/Call 데이터를 감지했습니다. 시장 공포도와 Gamma Exposure 중심으로 분석합니다.",
    visualizationDescription: "IV Surface / PCR Gauge / Gamma Exposure를 우선 표시합니다.",
    tags: ["OPTIONS FLOW", "IMPLIED VOL", "GAMMA", "OPEN INTEREST"],
    patterns: [/put.?call|pcr|implied.?volatility|open.?interest|gamma|delta|vega|옵션|내재.?변동성|감마/]
  },
  {
    label: "Macro Data",
    title: "Macro Regime Analysis",
    dataDescription: "금리·VIX·환율 등 거시경제 데이터를 감지했습니다. 시장 환경과 Risk-On/Off 상태를 분석합니다.",
    visualizationDescription: "Macro Trend / Yield Curve / Regime Heatmap을 우선 표시합니다.",
    tags: ["MACRO REGIME", "RISK ENVIRONMENT", "LIQUIDITY", "VIX"],
    patterns: [/^vix$|interest.?rate|cpi|yield|dxy|fx|oil|금리|물가|환율|유가|달러/]
  },
  {
    label: "Financial Statement Data",
    title: "Fundamental Growth Analysis",
    dataDescription: "매출·EPS·ROE 기반 재무 데이터를 감지했습니다. 기업 성장성과 수익성을 분석합니다.",
    visualizationDescription: "Revenue Trend / Margin / Financial Radar를 우선 표시합니다.",
    tags: ["FUNDAMENTALS", "EARNINGS", "PROFITABILITY", "CASHFLOW"],
    patterns: [/revenue|operating.?income|eps|roe|cash.?flow|cashflow|net.?income|debt|매출|영업이익|순이익|현금흐름|부채/]
  },
  {
    label: "Valuation Data",
    title: "Valuation & Relative Pricing Analysis",
    dataDescription: "PER/PBR 기반 가치평가 데이터를 감지했습니다. 고평가·저평가 상태를 분석합니다.",
    visualizationDescription: "Valuation Band / Discount Gauge / Relative Scatter를 우선 표시합니다.",
    tags: ["VALUATION", "MULTIPLES", "PEG", "DISCOUNT PREMIUM"],
    patterns: [/^per$|^pbr$|^peg$|^psr$|ev.?ebitda|valuation|multiple|밸류|가치/]
  },
  {
    label: "Portfolio Data",
    title: "Portfolio Allocation & Risk Analysis",
    dataDescription: "포트폴리오 비중 및 섹터 데이터를 감지했습니다. 분산도와 리스크 구조를 분석합니다.",
    visualizationDescription: "Treemap / Allocation / Exposure Map을 우선 표시합니다.",
    tags: ["PORTFOLIO MAP", "ALLOCATION", "SECTOR", "EXPOSURE"],
    patterns: [/ticker|symbol|weight|allocation|sector|return.?pct|avg.?price|portfolio|종목|비중|배분|섹터|업종/]
  },
  {
    label: "Sentiment Data",
    title: "Market Sentiment & Hype Analysis",
    dataDescription: "뉴스 및 커뮤니티 감성 데이터를 감지했습니다. 시장 심리와 과열 흐름을 분석합니다.",
    visualizationDescription: "Sentiment Gauge / Mention Trend / Fear & Greed를 우선 표시합니다.",
    tags: ["SENTIMENT AI", "ATTENTION", "NEWS SCORE", "SOCIAL SIGNAL"],
    patterns: [/sentiment|mentions?|reddit.?score|twitter.?score|news.?score|social|감성|심리|언급|소셜/]
  },
  {
    label: "On-chain Data",
    title: "On-chain Network Activity Analysis",
    dataDescription: "활성 지갑, 거래소 유입, 고래 거래, 해시레이트 등 온체인 활동 데이터가 감지되었습니다.",
    visualizationDescription: "활성 지갑 추세, 거래소 유입 압력, 고래 거래 급증, 네트워크 강도를 보여줍니다.",
    tags: ["ONCHAIN SIGNAL", "WALLET ACTIVITY", "WHALE FLOW", "NETWORK"],
    patterns: [/active.?wallets?|exchange.?inflow|whale.?tx|hash.?rate|hashrate|staking|on.?chain|wallet|온체인|지갑|고래|해시/]
  },
  {
    label: "News / Event Data",
    title: "Event & Narrative Impact Analysis",
    dataDescription: "뉴스 및 이벤트 데이터를 감지했습니다. 시장 영향력과 이벤트 강도를 분석합니다.",
    visualizationDescription: "Event Timeline / Impact Gauge / Topic Cluster를 우선 표시합니다.",
    tags: ["NEWS IMPACT", "EVENT RISK", "HEADLINE AI", "IMPACT SCORE"],
    patterns: [/headline|impact.?score|published.?at|event.?type|category|news|title|뉴스|헤드라인|이벤트|발행/]
  },
  {
    label: "Economic Calendar Data",
    title: "Economic Event Risk Analysis",
    dataDescription: "경제 이벤트 및 발표 데이터를 감지했습니다. 시장 충격 가능성과 이벤트 리스크를 분석합니다.",
    visualizationDescription: "Event Timeline / Surprise Bar / Importance Heatmap을 우선 표시합니다.",
    tags: ["ECON EVENT", "SURPRISE", "IMPORTANCE", "EVENT RISK"],
    patterns: [/^event$|forecast|actual|previous|importance|calendar|경제|발표|예상|실제|이전|중요도/]
  },
  {
    label: "ETF Flow Data",
    title: "ETF Capital Rotation Analysis",
    dataDescription: "ETF 자금 유입/유출 데이터를 감지했습니다. 시장 유동성과 섹터 순환을 분석합니다.",
    visualizationDescription: "ETF Flow Trend / Sector Rotation / Liquidity Map을 우선 표시합니다.",
    tags: ["ETF FLOW", "LIQUIDITY", "SECTOR ROTATION", "AUM"],
    patterns: [/etf.?inflow|etf.?outflow|netflow|aum|sector.?rotation|etf|creation|redemption|섹터.?순환|자금.?유입|자금.?유출/]
  }
];

function adaptiveOverview(analysis: AnalysisResult, engine: VisualizationEngine): AdaptiveOverview {
  const columns = Array.from(new Set([...rawColumns(analysis), ...analysis.mapping.flatMap((mapping) => [mapping.canonical, mapping.source])])).filter(Boolean);
  const normalizedColumns = columns.map((column) => normalizeColumnName(String(column)));
  const scored = adaptiveDatasetSpecs.map((spec) => {
    const matches = normalizedColumns.filter((column) => spec.patterns.some((pattern) => pattern.test(column))).length;
    const confidence = matches / Math.max(3, Math.min(spec.patterns.length, columns.length || 1));
    return { spec, matches, confidence };
  }).sort((a, b) => b.confidence - a.confidence || b.matches - a.matches);

  const best = scored[0];
  if (engine.supply.active && best?.spec.label === "Supply / Smart Money Data") {
    return { ...best.spec, confidence: Math.max(best.confidence, engine.supply.confidence) };
  }
  if (best && best.matches >= 2 && best.confidence >= 0.35) return { ...best.spec, confidence: Math.min(1, best.confidence) };

  return {
    label: "Auto Classified Mixed Dataset",
    title: "Multi-Factor Financial Dataset Analysis",
    dataDescription: "업로드된 데이터셋은 혼합 금융 지표와 이질적인 피처 구조를 포함합니다. 대시보드가 피처 그룹을 자동 분류해 교차 팩터 분석 뷰를 구성합니다.",
    visualizationDescription: "자동 분류된 피처 그룹을 기반으로 적응형 시각화, 다중 팩터 비교, 통합 Alpha 분석 화면을 생성합니다.",
    tags: ["AUTO CLASSIFICATION", "ADAPTIVE VISUAL", "MULTI FACTOR", "FALLBACK MODE"],
    confidence: 0.24
  };
}

function preprocessingStatusItems(analysis: AnalysisResult, engine: VisualizationEngine) {
  const items = [
    `인코딩 ${analysis.parsed.encoding}`,
    `구분자 ${displayDelimiter(analysis.parsed.delimiter)}`,
    `${analysis.rows.length.toLocaleString()}개 행 분석`,
    engine.supply.active ? "수급 컬럼 감지" : "수급 컬럼 미감지",
    analysis.forcedRecoveryApplied ? "강제 복구 적용" : "강제 복구 없음",
    analysis.liteMode ? "Lite 분석" : "정규 분석"
  ];
  if (analysis.sanitizeLog.droppedColumns.length) items.push(`${analysis.sanitizeLog.droppedColumns.length}개 상수/빈 컬럼 제거`);
  if (analysis.sanitizeLog.preprocessingLog.length) items.push(`${analysis.sanitizeLog.preprocessingLog.length}개 전처리 단계 완료`);
  return items;
}

function normalizeColumnName(value: string) {
  return value.toLowerCase().replace(/[\s_\-./()[\]{}]+/g, "");
}

type MetricType = "percentage" | "count" | "amount" | "score" | "days" | "price" | "text";

function classifyMetricType(column: string): MetricType {
  const key = column.toLowerCase();
  if (/ticker|sector|regime|date|sentiment|label|tag|country|exchange|type/.test(key)) return "text";
  if (/days_to_cover|daystocover|\bdtc\b|duration/.test(key)) return "days";
  if (/score|zscore|signal|rank|pressure|squeeze|covering_score/.test(key)) return "score";
  if (/price|close|vwap|open|high|low|nav/.test(key)) return "price";
  if (/volume|shares|count|contracts|거래량|잔고수량/.test(key)) return "count";
  if (/value|amount|notional|balance|market_cap|대금|금액/.test(key)) return "amount";
  if (/ratio|pct|percent|rate|fee|공매도비율|차입비용/.test(key)) return "percentage";
  return "text";
}

function normalizeDisplayMetric(column: string, raw: unknown) {
  const metricType = classifyMetricType(column);
  const value = Number(raw);
  if (raw == null || raw === "" || !Number.isFinite(value)) return { metricType, rawValue: String(raw ?? "N/A"), displayValue: "N/A", status: "insufficient", alphaStatus: "제외", numeric: null as number | null };
  if (metricType === "percentage") {
    if (value < 0) return { metricType, rawValue: String(raw), displayValue: "N/A", status: "invalid", alphaStatus: "제외", numeric: null };
    if (value <= 1) return { metricType, rawValue: String(raw), displayValue: `${(value * 100).toFixed(2)}%`, status: "normal", alphaStatus: "포함", numeric: value };
    if (value <= 100) return { metricType, rawValue: String(raw), displayValue: `${value.toFixed(2)}%`, status: "normal", alphaStatus: "포함", numeric: value / 100 };
    return { metricType, rawValue: String(raw), displayValue: "100%+ 이상치", status: "anomaly", alphaStatus: "제외", numeric: null };
  }
  if (metricType === "days") {
    if (value < 0) return { metricType, rawValue: String(raw), displayValue: "N/A", status: "invalid", alphaStatus: "제외", numeric: null };
    if (value > 100) return { metricType, rawValue: String(raw), displayValue: "100+일 이상치", status: "anomaly", alphaStatus: "제외 / 패널티만", numeric: null };
    const status = value > 30 ? "extreme" : "normal";
    return { metricType, rawValue: String(raw), displayValue: `${value.toFixed(value < 10 ? 2 : 1)}일`, status, alphaStatus: "포함", numeric: value };
  }
  if (metricType === "score") return { metricType, rawValue: String(raw), displayValue: `${Math.max(0, Math.min(100, value)).toFixed(0)}/100`, status: value > 100 || value < 0 ? "anomaly" : "normal", alphaStatus: value > 100 || value < 0 ? "제외" : "포함", numeric: Math.max(0, Math.min(100, value)) };
  if (metricType === "count" || metricType === "amount") return { metricType, rawValue: String(raw), displayValue: formatAxis(value), status: "normal", alphaStatus: "포함", numeric: value };
  if (metricType === "price") return { metricType, rawValue: String(raw), displayValue: value.toLocaleString(undefined, { maximumFractionDigits: 2 }), status: "normal", alphaStatus: "포함", numeric: value };
  return { metricType, rawValue: String(raw), displayValue: String(raw), status: "normal", alphaStatus: "제외", numeric: null };
}

function rawColumns(analysis: AnalysisResult) {
  return Object.keys(analysis.parsed.rows[0] ?? {});
}

function bestColumnMatch(analysis: AnalysisResult, canonical: AnalysisResult["mapping"][number]["canonical"], aliases: RegExp[]) {
  const mapped = analysis.mapping.find((m) => m.canonical === canonical);
  if (mapped) return { column: mapped.source, confidence: mapped.confidence };

  const raw = rawColumns(analysis);
  const fuzzy = raw.find((column) => {
    const normalized = normalizeColumnName(column);
    return aliases.some((alias) => alias.test(column) || alias.test(normalized));
  });

  return fuzzy ? { column: fuzzy, confidence: 0.62 } : null;
}

function simulationCapability(match: { column: string; confidence: number } | null, unavailableReason: string): SimulationCapability {
  if (!match) {
    return {
      status: "unavailable",
      tone: "warn",
      matchedColumn: null,
      confidence: 0,
      reason: unavailableReason
    };
  }

  if (match.confidence < 0.7) {
    return {
      status: "limited",
      tone: "warn",
      matchedColumn: match.column,
      confidence: match.confidence,
      reason: `컬럼 신뢰도가 낮습니다. 감지된 컬럼: ${match.column} (${Math.round(match.confidence * 100)}%)`
    };
  }

  return {
    status: "active",
    tone: "good",
    matchedColumn: match.column,
    confidence: match.confidence,
    reason: `감지된 컬럼: ${match.column}`
  };
}

function simulationCapabilities(analysis: AnalysisResult): SimulationCapabilities {
  return {
    price: simulationCapability(
      bestColumnMatch(analysis, "close", [/^close$/i, /^price$/i, /adjclose/i, /종가|현재가|가격/]),
      "가격 또는 종가(close/price) 컬럼이 감지되지 않아 가격 변화율 시뮬레이션을 사용할 수 없습니다."
    ),
    volume: simulationCapability(
      bestColumnMatch(analysis, "volume", [/^volume$/i, /tradingvolume/i, /^vol$/i, /거래량|거래대금/]),
      "거래량(volume/trading_volume) 컬럼이 감지되지 않아 거래량 배율 시뮬레이션을 사용할 수 없습니다."
    ),
    foreign: simulationCapability(
      bestColumnMatch(analysis, "foreign", [/foreignbuy/i, /foreignnetbuy/i, /foreignerflow/i, /foreigner/i, /foreign/i, /netforeign/i, /외국인|외인|순매수/]),
      "외국인 순매수 데이터가 포함되지 않았습니다. 현재 업로드된 데이터셋에서는 해당 시뮬레이션을 사용할 수 없습니다."
    ),
    institution: simulationCapability(
      bestColumnMatch(analysis, "institution", [/institutionbuy/i, /institutionnetbuy/i, /institutionflow/i, /institution/i, /netinstitution/i, /기관|순매수|매수|수급/]),
      "기관 순매수 관련 컬럼이 감지되지 않아 기관 수급 시뮬레이션을 사용할 수 없습니다."
    ),
    vix: simulationCapability(
      bestColumnMatch(analysis, "vix", [/^vix$/i, /volatilityindex/i, /변동성지수|변동성/]),
      "VIX 또는 변동성 지수(vix/volatility_index) 컬럼이 감지되지 않아 VIX 시뮬레이션을 사용할 수 없습니다."
    )
  };
}

function supportedScenario(scenario: Scenario, capabilities: SimulationCapabilities): Scenario {
  return {
    price: capabilities.price.status === "unavailable" ? 0 : scenario.price,
    volume: capabilities.volume.status === "unavailable" ? 1 : scenario.volume,
    foreign: capabilities.foreign.status === "unavailable" ? 0 : scenario.foreign,
    institution: capabilities.institution.status === "unavailable" ? 0 : scenario.institution,
    vix: capabilities.vix.status === "unavailable" ? 0 : scenario.vix,
    institutionalFlow: scenario.institutionalFlow,
    foreignFlow: scenario.foreignFlow,
    retailFlow: scenario.retailFlow,
    aggregateFlow: scenario.aggregateFlow,
    dealerFlow: scenario.dealerFlow,
    etfFlow: scenario.etfFlow,
    whaleFlow: scenario.whaleFlow
  };
}

function supplyScenario(scenario: Scenario): SupplyScenario {
  return {
    institutional: scenario.institutionalFlow,
    foreign: scenario.foreignFlow,
    retail: scenario.retailFlow,
    aggregate: scenario.aggregateFlow,
    dealer: scenario.dealerFlow,
    etf: scenario.etfFlow,
    whale: scenario.whaleFlow
  };
}

export default function Dashboard() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [ohlcvTab, setOhlcvTab] = useState<OhlcvWorkspaceTab>("overview");
  const [supplyTab, setSupplyTab] = useState<SupplyWorkspaceTab>("overview");
  const [shortTab, setShortTab] = useState<ShortWorkspaceTab>("visualization");
  const [optionsTab, setOptionsTab] = useState<OptionsWorkspaceTab>("visualization");
  const [macroTab, setMacroTab] = useState<MacroWorkspaceTab>("indicators");
  const [etfFlowTab, setEtfFlowTab] = useState<EtfFlowWorkspaceTab>("overview");
  const [financialTab, setFinancialTab] = useState<FinancialWorkspaceTab>("visualization");
  const [valuationTab, setValuationTab] = useState<ValuationWorkspaceTab>("overview");
  const [portfolioTab, setPortfolioTab] = useState<PortfolioWorkspaceTab>("overview");
  const [sentimentTab, setSentimentTab] = useState<SentimentWorkspaceTab>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeSample().then(setAnalysis).finally(() => setLoading(false));
  }, []);

  const engine = useMemo(() => analysis ? buildVisualizationEngine(analysis) : null, [analysis]);

  async function onUpload(file?: File) {
    if (!file) return;
    setLoading(true);
    try {
      setAnalysis(await analyzeFile(file));
      setOhlcvTab("overview");
      setSupplyTab("overview");
      setShortTab("visualization");
      setOptionsTab("visualization");
      setMacroTab("indicators");
      setFinancialTab("visualization");
      setValuationTab("overview");
      setPortfolioTab("overview");
      setSentimentTab("overview");
    } catch (error) {
      const fallback = await analyzeSample();
      fallback.sanitizeLog.warnings.unshift(`업로드 처리 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}. 샘플 기반 제한 분석으로 전환했습니다.`);
      fallback.quality.total = Math.min(fallback.quality.total, 39);
      fallback.finalDecision = "분석 제한";
      setAnalysis(fallback);
      setOhlcvTab("overview");
      setSupplyTab("overview");
      setShortTab("visualization");
      setOptionsTab("visualization");
      setMacroTab("indicators");
      setFinancialTab("visualization");
      setValuationTab("overview");
      setPortfolioTab("overview");
      setSentimentTab("overview");
    } finally {
      setLoading(false);
    }
  }

  async function onSample() {
    setLoading(true);
    try {
      setAnalysis(await analyzeSample());
      setOhlcvTab("overview");
      setSupplyTab("overview");
      setShortTab("visualization");
      setOptionsTab("visualization");
      setMacroTab("indicators");
      setFinancialTab("visualization");
      setValuationTab("overview");
      setPortfolioTab("overview");
      setSentimentTab("overview");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.2),transparent_31%),radial-gradient(circle_at_82%_12%,rgba(65,214,163,0.13),transparent_28%),linear-gradient(135deg,#05070c_0%,#071018_46%,#05070c_100%)] px-5 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className={`mx-auto text-center ${analysis ? "max-w-7xl py-1" : "max-w-5xl py-2"}`}>
          <div>
            {analysis ? (
              <div className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-white/10 bg-slate-950/45 px-6 py-6 text-left shadow-[0_0_42px_rgba(34,211,238,0.08)]">
                <div>
                  <h1 className="text-4xl font-black uppercase leading-none tracking-[0.14em] text-white md:text-6xl">ALPHA SIGNAL TERMINAL</h1>
                  <p className="mt-3 text-base font-semibold text-slate-300 md:text-xl">Universal AI-Powered Investment Dashboard</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <MiniBadge tone="good">Result Mode</MiniBadge>
                  <MiniBadge tone="muted">Premium Chart First</MiniBadge>
                </div>
              </div>
            ) : (
              <>
                <h1 className="mt-3 text-4xl font-black uppercase leading-tight tracking-[0.12em] text-white md:text-6xl">
                  ALPHA SIGNAL TERMINAL
                </h1>
                <p className="mt-4 text-lg font-semibold leading-8 text-slate-100 md:text-2xl">
                  Universal AI-Powered Investment Dashboard
                </p>
              </>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-mint px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(65,214,163,0.25)] transition hover:bg-cyan hover:shadow-[0_0_38px_rgba(56,189,248,0.28)]">
              CSV 업로드
              <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(e) => onUpload(e.target.files?.[0])} />
            </label>
            <button type="button" onClick={onSample} className="rounded-md border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-slate-100 backdrop-blur transition hover:border-mint/60 hover:text-mint">
              샘플 데이터로 보기
            </button>
          </div>
        </header>

        {loading ? <LoadingSkeleton /> : analysis && engine ? (
          <FinancialDashboardErrorBoundary>
            <PremiumVisualizationHero analysis={analysis} engine={engine} />
            <DatasetClassificationBanner analysis={analysis} />
            <UniversalSemanticPipelinePanel analysis={analysis} />
            <SystemDiagnosticsPanel analysis={analysis} engine={engine} />
            <TrustAwareAISection engine={engine} />
            {datasetAnalysisKind(analysis, engine) === "ohlcv" ? (
              <OhlcvInstitutionalWorkspace analysis={analysis} engine={engine} activeTab={ohlcvTab} setActiveTab={setOhlcvTab} />
            ) : datasetAnalysisKind(analysis, engine) === "supply" ? (
              <SupplyInstitutionalWorkspace analysis={analysis} engine={engine} activeTab={supplyTab} setActiveTab={setSupplyTab} />
            ) : datasetAnalysisKind(analysis, engine) === "short" ? (
              <ShortSellingWorkspace analysis={analysis} engine={engine} activeTab={shortTab} setActiveTab={setShortTab} />
            ) : datasetAnalysisKind(analysis, engine) === "options" ? (
              <OptionsWorkspace options={analysis.optionsAnalysis} analysis={analysis} engine={engine} activeTab={optionsTab} setActiveTab={setOptionsTab} />
            ) : datasetAnalysisKind(analysis, engine) === "macro" ? (
              <MacroWorkspace macro={analysis.macroAnalysis} analysis={analysis} engine={engine} activeTab={macroTab} setActiveTab={setMacroTab} />
            ) : datasetAnalysisKind(analysis, engine) === "etf" ? (
              <EtfFlowWorkspace etf={analysis.etfFlowAnalysis} activeTab={etfFlowTab} setActiveTab={setEtfFlowTab} />
            ) : datasetAnalysisKind(analysis, engine) === "fundamental" ? (
              <FinancialWorkspace financial={analysis.financialAnalysis} analysis={analysis} engine={engine} activeTab={financialTab} setActiveTab={setFinancialTab} />
            ) : datasetAnalysisKind(analysis, engine) === "valuation" ? (
              <ValuationWorkspace valuation={analysis.valuationAnalysis} activeTab={valuationTab} setActiveTab={setValuationTab} />
            ) : datasetAnalysisKind(analysis, engine) === "portfolio" ? (
              <PortfolioWorkspace portfolio={analysis.portfolioAnalysis} activeTab={portfolioTab} setActiveTab={setPortfolioTab} />
            ) : datasetAnalysisKind(analysis, engine) === "sentiment" ? (
              <SentimentWorkspace sentiment={analysis.sentimentAnalysis} activeTab={sentimentTab} setActiveTab={setSentimentTab} />
            ) : datasetAnalysisKind(analysis, engine) === "onchain" ? (
              <OnchainWorkspace onchain={analysis.onchainAnalysis} />
            ) : datasetAnalysisKind(analysis, engine) === "news" ? (
              <NewsEventWorkspace news={analysis.newsEventAnalysis} />
            ) : (
              <>
                <PrimaryVisualizationPanel analysis={analysis} engine={engine} />
                <DataInterpretationPanel analysis={analysis} engine={engine} />
                <AlphaScoreSection analysis={analysis} engine={engine} />
                <SignalIntelligencePanel analysis={analysis} engine={engine} />
                <DatasetSpecificAnalysis analysis={analysis} engine={engine} />
              </>
            )}
          </FinancialDashboardErrorBoundary>
        ) : null}
      </div>
    </main>
  );
}

function DatasetClassificationBanner({ analysis }: { analysis: AnalysisResult }) {
  const cls = analysis.datasetClassification;
  return (
    <section className="rounded-xl border border-cyan/15 bg-slate-950/70 p-4 shadow-[0_0_42px_rgba(34,211,238,0.1)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">데이터셋 구조 분류</p>
          <h2 className="mt-2 text-2xl font-black text-white">{cls.primaryLabelKo}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{cls.reasonKo}</p>
          <p className="mt-3 text-sm leading-7 text-slate-200">{cls.orchestrationNarrativeKo}</p>
        </div>
        <div className="min-w-[220px]">
          <div className="flex items-center justify-between text-xs font-black text-slate-400">
            <span>기본 템플릿 신뢰도</span>
            <span className="text-cyan">{cls.confidence}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan via-sky-400 to-mint" style={{ width: `${cls.confidence}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {cls.scores.slice(0, 4).map((score) => (
          <div key={score.type} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 transition hover:border-cyan/25 hover:bg-cyan/[0.035]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-black text-white">{score.labelKo}</span>
              <span className="text-[10px] font-black text-cyan">{score.confidence}%</span>
            </div>
          </div>
        ))}
      </div>
      {cls.supportingMetadataKo.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {cls.supportingMetadataKo.map((item) => <MiniBadge key={item} tone="muted">{item}</MiniBadge>)}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-cyan/10 bg-cyan/[0.035] p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan">1차 구조</p>
          <p className="mt-2 text-xs leading-5 text-slate-200">{cls.primaryStructureKo}</p>
        </div>
        <div className="rounded-lg border border-cyan/10 bg-cyan/[0.035] p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan">해석 모드</p>
          <p className="mt-2 text-xs leading-5 text-slate-200">{cls.interpretationModeKo}</p>
        </div>
        <div className="rounded-lg border border-cyan/10 bg-cyan/[0.035] p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan">히어로 시각화</p>
          <p className="mt-2 text-xs leading-5 text-slate-200">{cls.heroVisualKo}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">매칭 컬럼</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{cls.matchedColumns.length ? cls.matchedColumns.join(", ") : "구조 점수 기반"}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">선택 엔진</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{cls.selectedEngine}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">보조 신호</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{cls.secondarySignals.length ? cls.secondarySignals.map((s) => `${s.labelKo} ${s.confidence}%`).join(", ") : "없음"}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">차단 타입</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{cls.blockedTypes.length ? cls.blockedTypes.map((type) => type === "short" ? "공매도" : type === "ohlcv" ? "OHLCV" : type).join(", ") : "없음"}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">보조 컨텍스트</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{cls.secondaryContextKo.length ? cls.secondaryContextKo.join(" ") : "없음"}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">도메인 관계</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{cls.relationshipsKo.join(" ")}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">모순/신뢰도 체크</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{cls.contradictionsKo.length ? cls.contradictionsKo.join(" ") : "뚜렷한 구조적 모순은 아직 감지되지 않았습니다."}</p>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">분류 사유 / 억제 엔진</p>
        <p className="mt-2 text-xs leading-5 text-slate-300">{cls.classificationReason}</p>
        <p className="mt-2 text-[10px] leading-5 text-slate-500">억제 엔진: {cls.suppressedEngines.slice(0, 8).join(", ")}{cls.suppressedEngines.length > 8 ? " ..." : ""}</p>
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-[620px] animate-pulse rounded-lg border border-cyan/10 bg-white/[0.035] p-5">
        <div className="h-3 w-40 rounded bg-white/10" />
        <div className="mt-5 h-[520px] rounded bg-cyan/5" />
      </div>
      <div className="h-40 animate-pulse rounded-lg border border-white/10 bg-white/[0.035] p-5">
        <div className="h-3 w-56 rounded bg-white/10" />
        <div className="mt-6 h-6 w-3/4 rounded bg-mint/20" />
      </div>
    </div>
  );
}

function DataInterpretationPanel({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const overview = adaptiveOverview(analysis, engine);
  const tags = [...overview.tags.slice(0, 3), "AUTO PARSED"];
  const statusItems = [
    "Column normalization completed",
    "Temporal structure detected",
    "Missing values processed",
    "Visualization mode activated"
  ];
  return (
    <section className="relative overflow-hidden rounded-lg border border-cyan/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.58),rgba(2,6,23,0.84)_58%,rgba(8,47,73,0.25))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.4),0_0_45px_rgba(56,189,248,0.08)] backdrop-blur">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/60 to-transparent" />
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan">AUTO DATA INTERPRETATION</p>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white">{overview.label}</h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-200">
            {overview.dataDescription} 현재 워크스페이스는 {overview.visualizationDescription} 분석 엔진은 {activeAnalysisMode(engine.primaryModule.alphaLabel, engine.primaryModule.mode)} 모드로 실행 중이며, 추세 구조, 모멘텀, 변동성 레짐, 유동성 행동을 시각적으로 해석합니다.
          </p>
        </div>
        <aside className="flex flex-wrap content-start gap-2 lg:justify-end">
          {tags.map((tag) => <MiniBadge key={tag} tone="good">{tag}</MiniBadge>)}
        </aside>
      </div>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-4">
        {statusItems.map((item) => (
          <span key={item} className="inline-flex items-center gap-2 text-xs font-bold text-slate-300">
            <span className="text-mint">✓</span>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

type ShortAlphaResult = {
  score: number;
  label: string;
  confidence: "Low" | "Medium" | "High";
  shortPressureScore: number;
  squeezeRiskScore: number;
  dataQualityScore: number;
  components: {
    baseScore: number;
    priceMomentumScore: number | null;
    bearishPressureScore: number;
    shortAdjustment: number;
    dataQualityCap: number;
    dtcAvailable: boolean;
    anomalyCount: number;
  };
  explanation: string;
};

function computeShortAlphaResult(analysis: AnalysisResult, engine: VisualizationEngine): ShortAlphaResult {
  const short = analysis.shortAnalysis;
  const pressure = short.shortPressure;
  const hasPrice = analysis.chart.length >= 3;
  const shortPressureScore = pressure?.score ?? 0;
  const squeezeRiskScore = pressure?.coveringScore ?? pressure?.coveringSignal ?? pressure?.components.squeezeRank ?? 0;
  const dtcAvailable = short.shortRows.some((row) => Number.isFinite(Number(row.days_to_cover)));
  const anomalyCount = short.shortRows.reduce((sum, row) => sum + Object.keys(row).filter((key) => key.endsWith("__status") && row[key] === "anomaly").length, 0);
  const missingPenalty = Math.max(0, 6 - short.availableFields.length) * 5 + (dtcAvailable ? 0 : 12) + Math.min(24, anomalyCount * 3);
  const dataQualityScore = Math.max(25, Math.min(100, Math.round(analysis.quality.total - missingPenalty)));

  const closes = analysis.chart.map((point) => point.close).filter(Number.isFinite);
  const volumes = analysis.chart.map((point) => point.volume ?? 0).filter(Number.isFinite);
  const priceMomentum = closes.length >= 5 ? closes.at(-1)! / Math.max(closes.at(-5)!, 1e-9) - 1 : 0;
  const volumeExpansion = volumes.length >= 10 ? (meanUi(volumes.slice(-3)) / Math.max(meanUi(volumes.slice(-10, -3)), 1e-9)) - 1 : 0;
  const shortRatios = short.shortRows.map((row) => Number(row.short_ratio)).filter(Number.isFinite);
  const shortVolumes = short.shortRows.map((row) => Number(row.short_volume)).filter(Number.isFinite);
  const shortRatioTrend = shortRatios.length >= 5 ? shortRatios.at(-1)! / Math.max(shortRatios.at(-5)!, 1e-9) - 1 : 0;
  const shortVolumeTrend = shortVolumes.length >= 5 ? shortVolumes.at(-1)! / Math.max(shortVolumes.at(-5)!, 1e-9) - 1 : 0;
  const priceMomentumScore = hasPrice ? Math.max(0, Math.min(100, Math.round(50 + priceMomentum * 500))) : null;
  const baseScore = hasPrice ? analysis.rawAlphaScore : 50;

  const squeezeOpportunity = hasPrice && priceMomentum > 0 && (shortRatioTrend > 0 || shortPressureScore >= 50)
    ? Math.min(15, squeezeRiskScore * 0.12 + shortPressureScore * 0.05)
    : 0;
  const bearishPressureScore = hasPrice && priceMomentum < 0 && (shortVolumeTrend > 0 || shortRatioTrend > 0) && volumeExpansion > 0
    ? Math.min(100, Math.round(45 + Math.abs(priceMomentum) * 420 + Math.max(shortVolumeTrend, shortRatioTrend, 0) * 45 + volumeExpansion * 35))
    : 0;
  const bearishPenalty = bearishPressureScore >= 60 ? Math.min(18, bearishPressureScore * 0.18) : 0;
  const confidencePenalty = shortPressureScore > 65 && squeezeRiskScore < 50 ? 5 : 0;
  const shortAdjustment = Math.round(squeezeOpportunity - bearishPenalty - confidencePenalty);
  const dataQualityCap = dataQualityScore < 45 ? 70 : !dtcAvailable ? 82 : 100;
  const shortOnlyCap = hasPrice ? 100 : 65;
  const anomalyCap = anomalyCount >= 5 ? 72 : 100;
  const cappedScore = Math.min(dataQualityCap, shortOnlyCap, anomalyCap);
  const score = Math.max(0, Math.min(cappedScore, Math.round(baseScore + shortAdjustment)));

  const label = score >= 70 && hasPrice ? "Bullish Bias" : score <= 44 ? "Bearish Pressure" : score >= 58 ? "Watchlist" : "Neutral Bias";
  const confidence: ShortAlphaResult["confidence"] = dataQualityScore >= 72 && dtcAvailable ? "High" : dataQualityScore >= 50 ? "Medium" : "Low";
  const explanation = !hasPrice
    ? "가격 확인이 없어 공매도 데이터는 단독 Alpha가 아니라 40~65 범위의 관찰 점수로만 해석합니다."
    : score >= 70
    ? "가격 확인과 공매도 압력/차입 비용이 함께 맞물려 기회 점수가 높아졌습니다."
    : shortPressureScore < 45 && squeezeRiskScore >= 50
    ? "공매도 압력은 제한적이지만 차입 비용 또는 스퀴즈 위험은 모니터링이 필요합니다."
    : "가격, 거래량, 공매도 압력이 혼재되어 중립 또는 관찰 구간으로 해석합니다.";

  const alphaResult = { score, label, confidence, shortPressureScore, squeezeRiskScore, dataQualityScore, components: { baseScore, priceMomentumScore, bearishPressureScore, shortAdjustment, dataQualityCap: cappedScore, dtcAvailable, anomalyCount }, explanation };
  if (typeof console !== "undefined") {
    console.log("[Short debug] alphaResult", alphaResult);
    console.log("[Short debug] Alpha Score component weights", { base: "price/momentum/volume or neutral 50", squeezeOpportunity, bearishPenalty, confidencePenalty, dataQualityCap, shortOnlyCap, anomalyCap });
    console.log("[Short debug] score used by large Alpha Score display", score);
    console.log("[Short debug] score used by narrative text", score);
    console.log("[Short debug] shortPressureScore", shortPressureScore);
    console.log("[Short debug] squeezeRiskScore", squeezeRiskScore);
    console.log("[Short debug] DTC availability", dtcAvailable);
    console.log("[Short debug] dataQualityScore", dataQualityScore);
  }
  return alphaResult;
}

function meanUi(values: number[]) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

function AlphaScoreSection({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const alphaResult = computeShortAlphaResult(analysis, engine);
  const ctx = analysis.shortAlphaContext;
  const hasShortConflict = alphaResult.components.bearishPressureScore >= 60 || (ctx && (ctx.state === "Alpha Conflicted" || ctx.state === "High Short Crowding Risk"));
  const hasShortWeak = alphaResult.shortPressureScore >= 45 || (ctx && ctx.state === "Alpha Weakened");
  const borderColor = hasShortConflict ? "border-amber/30" : "border-mint/20";
  const glowColor = hasShortConflict ? "rgba(251,191,36,0.10)" : "rgba(65,214,163,0.12)";

  return (
    <section className={`relative overflow-hidden rounded-lg border ${borderColor} bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(8,47,73,0.32)_58%,rgba(2,6,23,0.96))] px-6 py-10 shadow-[0_28px_100px_rgba(0,0,0,0.42)] transition`} style={{ boxShadow: `0 28px 100px rgba(0,0,0,0.42), 0 0 55px ${glowColor}` }}>
      <div className="pointer-events-none absolute left-10 top-0 h-px w-1/2 bg-gradient-to-r from-mint via-cyan to-transparent opacity-70" />
      <p className="text-xs font-black uppercase tracking-[0.32em] text-mint">ALPHA SCORE</p>

      {/* Main score row */}
      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-end gap-6">
          {/* Adjusted alpha (primary) */}
          <div>
            <strong className="block text-8xl font-black leading-none text-white md:text-9xl">{alphaResult.score}</strong>
            {alphaResult.components.baseScore !== alphaResult.score && (
              <p className="mt-1 text-xs text-slate-500">
                기준 점수 <span className="font-bold text-slate-300">{alphaResult.components.baseScore}</span>
                <span className="ml-1 text-amber">→ 공매도/품질 조정 {alphaResult.components.shortAdjustment >= 0 ? "+" : ""}{alphaResult.components.shortAdjustment}pt</span>
              </p>
            )}
          </div>
          {/* Short pressure badge when active */}
          {alphaResult.shortPressureScore > 0 && (
            <div className={`rounded-lg border px-4 py-3 ${hasShortConflict ? "border-rose/30 bg-rose/5" : hasShortWeak ? "border-amber/25 bg-amber/5" : "border-mint/20 bg-mint/5"}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">공매도 압력</p>
              <p className={`text-3xl font-black ${hasShortConflict ? "text-rose" : hasShortWeak ? "text-amber" : "text-mint"}`}>{alphaResult.shortPressureScore}</p>
              <p className={`mt-0.5 text-[10px] font-bold uppercase ${hasShortConflict ? "text-rose" : hasShortWeak ? "text-amber" : "text-mint"}`}>0-100 점수</p>
            </div>
          )}
        </div>

        {/* Bias + confidence */}
        <div className="lg:text-right">
          <p className={`text-2xl font-black ${hasShortConflict ? "text-amber" : "text-cyan"}`}>{alphaResult.label}</p>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.22em] text-slate-400">{alphaResult.confidence} Confidence</p>
        </div>
      </div>

      {/* Interpretation text — short-adjusted when conflict exists */}
      <p className="mt-5 max-w-3xl text-[15px] font-semibold leading-7 text-slate-200">{alphaResult.explanation}</p>
      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
        <ShortReportCard label="Alpha Score" value={`${alphaResult.score}/100`} detail={alphaResult.label} tone={alphaResult.score >= 70 ? "good" : alphaResult.score < 45 ? "bad" : "warn"} />
        <ShortReportCard label="공매도 압력" value={`${alphaResult.shortPressureScore}/100`} detail="Short Pressure Score" tone={alphaResult.shortPressureScore >= 65 ? "bad" : alphaResult.shortPressureScore >= 45 ? "warn" : "good"} />
        <ShortReportCard label="스퀴즈 위험" value={`${alphaResult.squeezeRiskScore.toFixed(0)}/100`} detail={alphaResult.components.dtcAvailable ? "DTC 포함" : "DTC 미확인"} tone={alphaResult.squeezeRiskScore >= 70 ? "bad" : alphaResult.squeezeRiskScore >= 50 ? "warn" : "muted"} />
        <ShortReportCard label="데이터 신뢰도" value={alphaResult.confidence} detail={`${alphaResult.dataQualityScore}/100`} tone={alphaResult.confidence === "High" ? "good" : alphaResult.confidence === "Medium" ? "warn" : "bad"} />
      </div>
      {!alphaResult.components.dtcAvailable ? (
        <p className="mt-3 rounded-lg border border-amber/20 bg-amber/5 px-4 py-3 text-xs font-semibold text-amber">Days to Cover는 유효한 short interest와 average daily volume 컬럼이 함께 감지되지 않아 신뢰도에서 차감했습니다.</p>
      ) : null}

      {/* Conflict banner */}
      {hasShortConflict && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber/25 bg-amber/5 px-4 py-3 text-sm font-semibold text-amber">
          <span className="shrink-0 text-base">⚠</span>
          <span>Alpha Score와 공매도 압력이 충돌합니다. 최종 판단은 순수 강세가 아닌 <strong>조건부 강세(Conditional Bullish)</strong>로 해석하세요.</span>
        </div>
      )}
      {hasShortWeak && !hasShortConflict && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber/20 bg-amber/5 px-4 py-3 text-sm text-amber">
          <span className="shrink-0">ℹ</span>
          <span>공매도 압력이 상승 중입니다. Alpha 방향은 유지되나 신뢰도가 낮아집니다.</span>
        </div>
      )}
    </section>
  );
}

function alphaInterpretation(score: number, analysis: AnalysisResult) {
  if (score >= 72) return "강한 추세 지속 구조와 안정적인 모멘텀 참여가 함께 감지됩니다.";
  if (score >= 52) return "선별적 확인 신호를 동반한 건설적인 시장 구조입니다.";
  if (score >= 38) return "모멘텀과 방향성이 혼재된 중립 레짐입니다.";
  return analysis.risk.method || "변동성 부담과 약한 신호 품질이 우세한 방어적 레짐입니다.";
}

function marketBias(score: number) {
  if (score >= 70) return "Bullish Bias";
  if (score <= 39) return "Bearish Bias";
  return "Neutral Bias";
}

function alphaConfidenceLabel(engine: VisualizationEngine, ctx: ShortAlphaContext | null | undefined) {
  if (ctx?.confidenceOverride === "CAUTION") return "Caution — Short Risk";
  if (ctx?.confidenceOverride === "MEDIUM") return "Medium Confidence";
  const confidence = Math.max(engine.primaryModule.confidence, engine.columnCoverage / 100);
  if (confidence >= 0.72) return "High Confidence";
  if (confidence >= 0.48) return "Medium Confidence";
  return "Low Confidence";
}

function confidenceLevel(engine: VisualizationEngine) {
  const confidence = Math.max(engine.primaryModule.confidence, engine.columnCoverage / 100);
  if (confidence >= 0.72) return "High Confidence";
  if (confidence >= 0.48) return "Medium Confidence";
  return "Low Confidence";
}

function activeAnalysisMode(alphaLabel: string, mode: string) {
  const label = `${alphaLabel} ${mode}`.toLowerCase();
  if (label.includes("flow") || label.includes("smart") || label.includes("supply")) return "Smart Money";
  if (label.includes("macro")) return "Macro Regime";
  if (label.includes("option") || label.includes("volatility")) return "Options Flow";
  if (label.includes("onchain") || label.includes("on-chain")) return "On-chain";
  if (label.includes("portfolio") || label.includes("valuation") || label.includes("fundamental")) return "Multi-Factor";
  return "Market Structure";
}

function AdaptiveOverviewPanel({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const overview = adaptiveOverview(analysis, engine);
  const statusItems = preprocessingStatusItems(analysis, engine);
  return (
    <section className="relative overflow-hidden rounded-lg border border-cyan/20 bg-[linear-gradient(135deg,rgba(8,47,73,0.42),rgba(15,23,42,0.82)_42%,rgba(2,6,23,0.88))] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.42),0_0_52px_rgba(56,189,248,0.12)] backdrop-blur transition hover:border-cyan/35">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/70 to-transparent" />
      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <MiniBadge tone={overview.confidence >= 0.6 ? "good" : overview.confidence >= 0.35 ? "warn" : "muted"}>{overview.label}</MiniBadge>
            <MiniBadge tone="muted">신뢰도 {Math.round(overview.confidence * 100)}%</MiniBadge>
            {engine.supply.active && !hasFullOhlcv(analysis) ? <MiniBadge tone="good">Supply Analysis Mode</MiniBadge> : null}
          </div>
          <h2 className="mt-4 text-2xl font-black leading-tight text-white md:text-3xl">{overview.title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{overview.dataDescription}</p>
          <p className="mt-2 text-sm leading-6 text-cyan">{overview.visualizationDescription}</p>
          {engine.supply.active && !hasFullOhlcv(analysis) ? (
            <p className="mt-3 rounded-md border border-amber/20 bg-amber/5 p-3 text-xs leading-5 text-amber">
              이 데이터셋은 완전한 가격 구조가 없어 캔들/ATR/백테스트 중심 화면을 축소하고, 자본 흐름과 참여자 행동 분석을 우선합니다.
            </p>
          ) : null}
        </div>
        <aside className="flex flex-col justify-between gap-4 rounded-md border border-white/10 bg-slate-950/35 p-4">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Adaptive Tags</p>
            <div className="flex flex-wrap gap-2">
              {overview.tags.map((tag) => <MiniBadge key={tag} tone="good">{tag}</MiniBadge>)}
            </div>
          </div>
          <div className="rounded-md border border-cyan/10 bg-cyan/5 p-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan">분석 경로</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {engine.blendMode === "weighted" ? "복수 Alpha 모듈을 가중 결합합니다." : "가장 적합한 Alpha 모듈을 중심으로 분석합니다."}
            </p>
          </div>
        </aside>
      </div>
      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {statusItems.map((item) => (
            <span key={item} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_12px_rgba(56,189,248,0.65)]" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrimaryVisualizationPanel({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const overview = adaptiveOverview(analysis, engine);
  const label = overview.label;
  if ((label === "Supply / Smart Money Data" || label === "ETF Flow Data") && engine.supply.active) {
    return (
      <Card title={label === "ETF Flow Data" ? "ETF Flow Trend / Sector Rotation" : "Cumulative Net Buy / Smart Money Flow"}>
        <SmartMoneyFlowChart supply={engine.supply} />
      </Card>
    );
  }
  if (label === "OHLCV Price Data" && analysis.chart.length) {
    return <MarketChartSection analysis={analysis} engine={engine} />;
  }
  return (
    <Card title={primaryVisualizationTitle(label)}>
      <GenericAdaptiveVisualization analysis={analysis} overview={overview} />
    </Card>
  );
}

function primaryVisualizationTitle(label: string) {
  const titles: Record<string, string> = {
    "Short Selling Data": "Short Pressure Heatmap",
    "Options Data": "IV Surface / Gamma Exposure",
    "Macro Data": "Macro Multi-Line Chart",
    "Financial Statement Data": "Revenue Trend",
    "Valuation Data": "Valuation Band",
    "Portfolio Data": "Portfolio Treemap",
    "Sentiment Data": "Fear & Greed Gauge",
    "On-chain Data": "Whale Flow Chart",
    "News / Event Data": "Event Timeline",
    "Economic Calendar Data": "Event Timeline / Surprise Bar"
  };
  return titles[label] ?? "Adaptive Financial Visualization";
}

function GenericAdaptiveVisualization({ analysis, overview }: { analysis: AnalysisResult; overview: AdaptiveOverview }) {
  const rows = analysis.parsed.rows.slice(-48);
  const columns = Object.keys(rows[0] ?? {}).filter((column) => rows.some((row) => Number.isFinite(Number(String(row[column] ?? "").replace(/,/g, ""))))).slice(0, 5);
  const width = 860;
  const height = 280;
  if (!rows.length || !columns.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-md border border-white/10 bg-slate-950/55 text-sm text-slate-400">
        시각화 가능한 숫자형 컬럼이 부족합니다. 감지된 구조를 기반으로 Alpha 메타데이터만 표시합니다.
      </div>
    );
  }
  const values = columns.flatMap((column) => rows.map((row) => Number(String(row[column] ?? "").replace(/,/g, ""))).filter(Number.isFinite));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  const xFor = (index: number) => rows.length <= 1 ? width / 2 : (index / (rows.length - 1)) * width;
  const yFor = (value: number) => height - 24 - ((value - min) / span) * (height - 48);
  const colors = ["#41d6a3", "#38bdf8", "#f8bf4c", "#fb7185", "#a3e635"];
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">{overview.tags.slice(0, 4).map((tag) => <MiniBadge key={tag} tone="good">{tag}</MiniBadge>)}</div>
        <p className="text-xs font-bold text-slate-500">동적 스케일 · 숫자형 피처 자동 선택</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full overflow-visible">
        <line x1="0" y1={yFor(0)} x2={width} y2={yFor(0)} stroke="rgba(148,163,184,0.18)" strokeDasharray="4 5" />
        {columns.map((column, columnIndex) => {
          const points = rows.map((row) => Number(String(row[column] ?? "").replace(/,/g, "")));
          const path = points.map((value, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(1)},${yFor(Number.isFinite(value) ? value : 0).toFixed(1)}`).join(" ");
          return <path key={column} d={path} fill="none" stroke={colors[columnIndex]} strokeWidth="2.5" strokeLinecap="round"><title>{column}</title></path>;
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        {columns.map((column, index) => <span key={column} className="text-xs font-bold text-slate-300"><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colors[index] }} />{column}</span>)}
      </div>
    </div>
  );
}

function SignalIntelligencePanel({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const signals = compactSignalMetrics(analysis, engine);
  return (
    <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
      <Card title="ALPHA SIGNAL METER">
        <SignalRadar signals={signals} />
      </Card>
      <Card title="AI Signal Matrix">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {signals.map((signal) => (
            <div key={signal.label} className="relative min-h-44 overflow-hidden rounded-lg border border-cyan/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.56),rgba(2,6,23,0.86))] p-4">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <CircularMiniMeter value={signal.value} />
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">{signal.label}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function CircularMiniMeter({ value }: { value: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const color = value >= 68 ? "#41d6a3" : value >= 42 ? "#38bdf8" : "#fb7185";
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20">
      <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="7" />
      <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} transform="rotate(-90 40 40)" />
      <text x="40" y="45" textAnchor="middle" fill="white" fontSize="18" fontWeight="900">{value}</text>
    </svg>
  );
}

function SignalRadar({ signals }: { signals: Array<{ label: string; value: number; note: string }> }) {
  const size = 300;
  const center = size / 2;
  const radius = 82;
  const labelRadius = 112;
  const points = signals.map((signal, index) => radarPoint(index, signals.length, center, radius * (signal.value / 100)));
  const grid = [0.35, 0.68, 1].map((scale) => signals.map((_signal, index) => radarPoint(index, signals.length, center, radius * scale)).join(" "));
  return (
    <div className="relative flex min-h-[390px] items-center justify-center overflow-hidden rounded-lg border border-cyan/10 bg-[radial-gradient(circle_at_50%_42%,rgba(56,189,248,0.18),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.62),rgba(2,6,23,0.92))] p-6">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full max-h-96 w-full max-w-96">
        {grid.map((polygon) => <polygon key={polygon} points={polygon} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />)}
        {signals.map((_signal, index) => {
          const outer = radarPoint(index, signals.length, center, radius);
          return <line key={index} x1={center} y1={center} x2={outer.split(",")[0]} y2={outer.split(",")[1]} stroke="rgba(148,163,184,0.16)" strokeWidth="1" />;
        })}
        <polygon points={points.join(" ")} fill="rgba(56,189,248,0.22)" stroke="#38bdf8" strokeWidth="2.5" />
        <polygon points={points.join(" ")} fill="url(#radarGlow)" opacity="0.65" />
        <defs>
          <radialGradient id="radarGlow">
            <stop offset="0%" stopColor="#41d6a3" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.08" />
          </radialGradient>
        </defs>
        {signals.map((signal, index) => {
          const [x, y] = radarPoint(index, signals.length, center, labelRadius).split(",").map(Number);
          return (
            <text key={signal.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#cbd5e1" fontSize="12" fontWeight="800">
              {signal.label}
            </text>
          );
        })}
        <circle cx={center} cy={center} r="4" fill="#41d6a3" />
      </svg>
    </div>
  );
}

function radarPoint(index: number, total: number, center: number, radius: number) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  const x = center + Math.cos(angle) * radius;
  const y = center + Math.sin(angle) * radius;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function compactSignalMetrics(analysis: AnalysisResult, engine: VisualizationEngine) {
  const moduleScores = engine.modules.flatMap((module) => module.scores);
  return [
    {
      label: "Trend",
      value: metricValue(moduleScores, analysis.features, [/trend|추세/i], engine.unifiedAlphaScore),
      note: "가격 구조와 방향성 정렬"
    },
    {
      label: "Momentum",
      value: metricValue(moduleScores, analysis.features, [/momentum|모멘텀/i], Math.round((analysis.alphaScore + engine.primaryModule.moduleAlphaScore) / 2)),
      note: "최근 신호 가속도와 지속성"
    },
    {
      label: "Volatility",
      value: metricValue(moduleScores, analysis.features, [/volatility|변동/i], engine.riskStatus === "LOW" ? 76 : engine.riskStatus === "ELEVATED" ? 54 : 32),
      note: "변동성 부담을 반전 점수로 압축"
    },
    {
      label: "Liquidity",
      value: engine.supply.active ? Math.round(58 + engine.supply.confidence * 34) : metricValue(moduleScores, analysis.features, [/volume|liquidity|유동|거래/i], hasFullOhlcv(analysis) ? 68 : 42),
      note: engine.supply.active ? "수급 컬럼 기반 유동성 신뢰도" : "거래량 및 데이터 커버리지 기반"
    },
    {
      label: "Relative Strength",
      value: Math.max(0, Math.min(100, Math.round((engine.unifiedAlphaScore * 0.72) + (engine.primaryModule.confidence * 28)))),
      note: "통합 Alpha와 주 모듈 신뢰도 결합"
    }
  ];
}

function metricValue(
  moduleScores: Array<{ label: string; value: number }>,
  features: AnalysisResult["features"],
  patterns: RegExp[],
  fallback: number
) {
  const moduleScore = moduleScores.find((score) => patterns.some((pattern) => pattern.test(score.label)));
  if (moduleScore) return Math.max(0, Math.min(100, Math.round(moduleScore.value)));
  const feature = features.find((item) => patterns.some((pattern) => pattern.test(item.name) || pattern.test(item.note)));
  if (feature) return Math.max(0, Math.min(100, Math.round(feature.score * 100)));
  return Math.max(0, Math.min(100, Math.round(fallback)));
}

function DatasetSpecificAnalysis({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const kind = datasetAnalysisKind(analysis, engine);
  if (kind === "ohlcv") return <OhlcvMarketAnalysis analysis={analysis} engine={engine} />;
  return <GenericDatasetAnalysis analysis={analysis} engine={engine} kind={kind} />;
}

function OhlcvInstitutionalWorkspace({
  analysis,
  engine,
  activeTab,
  setActiveTab
}: {
  analysis: AnalysisResult;
  engine: VisualizationEngine;
  activeTab: OhlcvWorkspaceTab;
  setActiveTab: (tab: OhlcvWorkspaceTab) => void;
}) {
  const state = ohlcvMarketState(analysis);
  const tabs: Array<{ id: OhlcvWorkspaceTab; label: string; kicker: string }> = [
    { id: "overview", label: "MARKET OVERVIEW", kicker: "차트 워크스페이스" },
    { id: "signals", label: "TECHNICAL SIGNALS", kicker: "감지 신호" },
    { id: "risk", label: "RISK & VOLATILITY", kicker: "리스크 구조" },
    { id: "insight", label: "AI INSIGHT", kicker: "AI 리포트" }
  ];
  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-2 overflow-x-auto rounded-full border border-cyan/15 bg-slate-950/60 p-1.5 shadow-[0_0_38px_rgba(56,189,248,0.08)] backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-max rounded-full px-5 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${
                activeTab === tab.id
                  ? "bg-cyan/15 text-white shadow-[0_0_28px_rgba(56,189,248,0.18)] ring-1 ring-cyan/35"
                  : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"
              }`}
            >
              <span className="block text-[11px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
              <span className="mt-1 block text-[10px] font-bold text-slate-500">{tab.kicker}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="transition-all duration-500">
        {activeTab === "overview" ? <OhlcvMarketOverviewTab analysis={analysis} engine={engine} state={state} /> : null}
        {activeTab === "signals" ? <OhlcvTechnicalSignalsTab analysis={analysis} engine={engine} state={state} /> : null}
        {activeTab === "risk" ? <OhlcvRiskVolatilityTab analysis={analysis} engine={engine} state={state} /> : null}
        {activeTab === "insight" ? <OhlcvAiInsightTab analysis={analysis} engine={engine} state={state} /> : null}
      </div>
    </section>
  );
}

function OhlcvMarketOverviewTab({ analysis, engine, state }: { analysis: AnalysisResult; engine: VisualizationEngine; state: ReturnType<typeof ohlcvMarketState> }) {
  return (
    <div className="space-y-5">
      <MarketChartSection analysis={analysis} engine={engine} />
      <AnalysisPanelShell title="MARKET STRUCTURE SUMMARY" tags={state.tags} accent={state.label}>
        <div className="grid gap-6 lg:grid-cols-[1.28fr_0.72fr]">
          <div>
            <h2 className="text-3xl font-black leading-tight text-white">{state.label}</h2>
            <p className="mt-4 text-base leading-8 text-slate-200">{state.summary}</p>
          </div>
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">KEY MARKET TAGS</p>
            <div className="flex flex-wrap gap-2">
              {state.tags.map((tag) => <MiniBadge key={tag} tone="good">{tag}</MiniBadge>)}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-4">
              {["OHLCV 구조 감지", "시계열 파싱 완료", "결측값 처리 완료", "시각화 엔진 활성화"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-xs font-bold text-slate-300">
                  <span className="text-mint">✓</span>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </AnalysisPanelShell>
    </div>
  );
}

function OhlcvTechnicalSignalsTab({ analysis, engine, state }: { analysis: AnalysisResult; engine: VisualizationEngine; state: ReturnType<typeof ohlcvMarketState> }) {
  const signalSuite = ohlcvSignalSuite(state, analysis, engine);
  const contributions = ohlcvSignalContributions(state, engine);
  return (
    <div className="space-y-5">
      <AnalysisPanelShell title="ALPHA SIGNAL METER" tags={["AI TECHNICAL MODEL", "OHLCV ONLY"]}>
        <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
          <SignalRadar signals={signalSuite.map((metric) => ({ ...metric, note: metric.label }))} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {signalSuite.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-cyan/10 bg-slate-950/35 p-4 text-center">
                <CircularMiniMeter value={metric.value} />
                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </AnalysisPanelShell>

      {state.signals.length ? (
        <AnalysisPanelShell title="ACTIVE TECHNICAL SIGNALS PANEL" tags={["DETECTED", "CALCULATED"]}>
          <div className="grid gap-2 md:grid-cols-2">
            {state.signals.map((signal) => (
              <div key={signal} className="flex items-center gap-3 rounded-lg border border-mint/15 bg-mint/5 px-4 py-3 text-sm font-semibold text-slate-100">
                <span className="text-mint">✓</span>
                {signal}
              </div>
            ))}
          </div>
        </AnalysisPanelShell>
      ) : null}

      {contributions.length ? (
        <AnalysisPanelShell title="SIGNAL CONTRIBUTION BREAKDOWN" tags={["ALPHA ATTRIBUTION", "DYNAMIC"]}>
          <div className="grid gap-3 lg:grid-cols-4">
            {contributions.map((item) => (
              <div key={item.label} className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                  <p className="text-xl font-black text-mint">+{item.value}</p>
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-white/10">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-cyan to-mint shadow-[0_0_14px_rgba(56,189,248,0.32)]" style={{ width: `${Math.min(100, item.value * 3)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </AnalysisPanelShell>
      ) : null}
    </div>
  );
}

function OhlcvRiskVolatilityTab({ analysis, engine, state }: { analysis: AnalysisResult; engine: VisualizationEngine; state: ReturnType<typeof ohlcvMarketState> }) {
  const risk = ohlcvRiskState(state, engine);
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <AnalysisPanelShell title="VOLATILITY REGIME PANEL" tags={[risk.volatilityLabel.toUpperCase(), "ATR ENVIRONMENT"]} accent={risk.regime}>
          <div className="grid gap-4 md:grid-cols-2">
            {state.structureFacts.map((fact) => (
              <div key={fact.label} className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{fact.label}</p>
                <p className={`mt-2 text-2xl font-black ${fact.tone === "good" ? "text-mint" : fact.tone === "warn" ? "text-amber" : fact.tone === "bad" ? "text-rose" : "text-cyan"}`}>{fact.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-300">{risk.explanation}</p>
        </AnalysisPanelShell>
        <AnalysisPanelShell title="RISK METER" tags={["DRAWDOWN", "INSTABILITY"]}>
          <div className="flex min-h-56 flex-col items-center justify-center text-center">
            <CircularRiskMeter value={risk.score} label={risk.regime} />
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">{risk.explanation}</p>
          </div>
        </AnalysisPanelShell>
      </div>

      <AnalysisPanelShell title="RISK STRUCTURE VISUALIZATION" tags={["DRAWDOWN ZONES", "VOLATILITY SPIKES", "LIQUIDITY"]}>
        <RiskStructureVisualization analysis={analysis} state={state} />
      </AnalysisPanelShell>

      <AnalysisPanelShell title="SUPPORT / RESISTANCE MAP" tags={["SUPPORT", "RESISTANCE", "INVALIDATION"]}>
        <SupportResistanceMap state={state} />
      </AnalysisPanelShell>
    </div>
  );
}

function OhlcvAiInsightTab({ analysis, engine, state }: { analysis: AnalysisResult; engine: VisualizationEngine; state: ReturnType<typeof ohlcvMarketState> }) {
  const scenarios = ohlcvScenarios(state);
  const labels = [state.label, ...state.tags].slice(0, 6);
  return (
    <div className="space-y-5">
      <AnalysisPanelShell title="AI MARKET INTERPRETATION" tags={["INSTITUTIONAL ANALYST REPORT", "OHLCV"]}>
        <div className="grid gap-5 lg:grid-cols-3">
          <InterpretationBlock label="현재 시장 구조" text={state.interpretation.condition} />
          <InterpretationBlock label="확인 조건" text={state.interpretation.opportunity} />
          <InterpretationBlock label="리스크 요인" text={state.interpretation.risk} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <InterpretationBlock label="단기 시나리오" text={scenarios.shortTerm} />
          <InterpretationBlock label="중기 시나리오" text={scenarios.mediumTerm} />
        </div>
      </AnalysisPanelShell>
      <AlphaScoreSection analysis={analysis} engine={engine} />
      <AnalysisPanelShell title="AI SCENARIO ENGINE" tags={["SCENARIO A", "SCENARIO B", "SCENARIO C"]}>
        <div className="grid gap-4 lg:grid-cols-3">
          {scenarios.paths.map((path) => <InterpretationBlock key={path.label} label={path.label} text={path.text} />)}
        </div>
      </AnalysisPanelShell>
      <AnalysisPanelShell title="MARKET CONDITION LABELS" tags={labels}>
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => <MiniBadge key={label} tone="good">{label}</MiniBadge>)}
        </div>
      </AnalysisPanelShell>
    </div>
  );
}

function datasetAnalysisKind(analysis: AnalysisResult, engine: VisualizationEngine): DatasetAnalysisKind {
  const primary = analysis.datasetClassification.primaryType;
  if (primary === "ohlcv") return "ohlcv";
  if (primary === "etf_flow") return "etf";
  if (primary === "flow") return "supply";
  if (primary === "short") return "short";
  if (primary === "options") return "options";
  if (primary === "macro" || primary === "economic_calendar") return "macro";
  if (primary === "financial") return "fundamental";
  if (primary === "valuation") return "valuation";
  if (primary === "portfolio") return "portfolio";
  if (primary === "sentiment") return "sentiment";
  if (primary === "onchain") return "onchain";
  if (primary === "news") return "news";
  if (primary === "price_only") return "generic";
  const overview = adaptiveOverview(analysis, engine);
  const label = overview.label;
  const flowColumns = rawColumns(analysis).map(normalizeColumnName).join(" ");
  const explicitSupply = /foreignbuy|institutionbuy|retailbuy|netbuy|foreignnetbuy|institutionnetbuy|retailnetbuy|smartmoney|supply|수급|외국인|기관|개인|순매수/.test(flowColumns);
  const explicitShort = /short.?volume|short.?ratio|borrow.?fee|공매도|대차/.test(flowColumns);
  const explicitOptions = /put.?call|implied.?vol|open.?interest|gamma|delta|theta|vega|풋콜|내재변동성|미결제/.test(flowColumns);
  const explicitMacro = /\bvix\b|interest.?rate|inflation|\bcpi\b|\byield\b|\bdxy\b|\bgdp\b|unemployment|\bpmi\b|기준금리|물가|국채|달러인덱스/.test(flowColumns);
  const explicitValuation = /\bper\b|\bpbr\b|\bpeg\b|\bp.?e\b|\bp.?b\b|price.?earnings|price.?book|ev.?ebitda|enterprise.?multiple|valuation.?multiple|growth.?adjusted.?pe|밸류|가치평가/.test(flowColumns);
  const explicitPortfolio = /portfolio.?weight|\bweight\b|allocation|position.?size|exposure|holding|ticker|symbol|sector|return.?pct|비중|배분|보유|종목|섹터|수익률/.test(flowColumns);
  const explicitFinancial = /\brevenue\b|operating.?income|net.?income|\beps\b|\broe\b|operating.?margin|free.?cash|ebitda|매출액?|영업이익|순이익|주당순이익|자기자본이익률|영업이익률/.test(flowColumns);
  if (explicitOptions || label === "Options Data" || analysis.optionsAnalysis.detected) return "options";
  if (explicitShort || label === "Short Selling Data" || analysis.shortAnalysis.detected) return "short";
  if (explicitMacro || label === "Macro Data" || label === "Economic Calendar Data" || analysis.macroAnalysis.detected) return "macro";
  if (explicitValuation || label === "Valuation Data" || analysis.valuationAnalysis.detected) return "valuation";
  if ((explicitPortfolio && analysis.portfolioAnalysis.detected) || label === "Portfolio Data") return "portfolio";
  if (explicitFinancial || label === "Financial Statement Data" || analysis.financialAnalysis.detected) return "fundamental";
  if (engine.supply.active && (explicitSupply || !hasFullOhlcv(analysis))) return "supply";
  if (label === "OHLCV Price Data") return "ohlcv";
  if (label === "Supply / Smart Money Data" || label === "ETF Flow Data") return "supply";
  if (label === "Short Selling Data") return "short";
  if (label === "Options Data") return "options";
  if (label === "Macro Data" || label === "Economic Calendar Data") return "macro";
  if (label === "Financial Statement Data") return "fundamental";
  if (label === "Portfolio Data") return "portfolio";
  if (label === "Sentiment Data") return "sentiment";
  if (label === "On-chain Data") return "onchain";
  if (label === "News / Event Data") return "news";
  const normalized = rawColumns(analysis).map(normalizeColumnName).join(" ");
  if (/momentum|value|quality|growth|beta|factor/.test(normalized)) return "factor";
  if (/webtraffic|apprank|googletrend|searchvolume|transactionproxy|alternative/.test(normalized)) return "alternative";
  return "generic";
}

function SupplyInstitutionalWorkspace({
  analysis,
  engine,
  activeTab,
  setActiveTab
}: {
  analysis: AnalysisResult;
  engine: VisualizationEngine;
  activeTab: SupplyWorkspaceTab;
  setActiveTab: (tab: SupplyWorkspaceTab) => void;
}) {
  const state = supplyFlowState(engine.supply, engine);
  const tabs: Array<{ id: SupplyWorkspaceTab; label: string; kicker: string }> = [
    { id: "overview", label: "FLOW OVERVIEW", kicker: "자본 흐름" },
    { id: "signals", label: "PARTICIPANT SIGNALS", kicker: "참여자 신호" },
    { id: "risk", label: "FLOW RISK & PRESSURE", kicker: "수급 압력" },
    { id: "insight", label: "AI FLOW INSIGHT", kicker: "AI 수급 리포트" }
  ];
  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-2 overflow-x-auto rounded-full border border-cyan/15 bg-slate-950/60 p-1.5 shadow-[0_0_38px_rgba(56,189,248,0.08)] backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-max rounded-full px-5 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${
                activeTab === tab.id
                  ? "bg-cyan/15 text-white shadow-[0_0_28px_rgba(56,189,248,0.18)] ring-1 ring-cyan/35"
                  : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"
              }`}
            >
              <span className="block text-[11px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
              <span className="mt-1 block text-[10px] font-bold text-slate-500">{tab.kicker}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="transition-all duration-500">
        {activeTab === "overview" ? <SupplyFlowOverviewTab supply={engine.supply} state={state} /> : null}
        {activeTab === "signals" ? <SupplyParticipantSignalsTab engine={engine} state={state} /> : null}
        {activeTab === "risk" ? <SupplyFlowRiskTab supply={engine.supply} state={state} /> : null}
        {activeTab === "insight" ? <SupplyAiInsightTab analysis={analysis} engine={engine} state={state} /> : null}
      </div>
    </section>
  );
}

function SupplyFlowOverviewTab({ supply, state }: { supply: SupplyFlowAnalysis; state: ReturnType<typeof supplyFlowState> }) {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-lg border border-cyan/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.94)_52%,rgba(8,47,73,0.56))] p-4 shadow-[0_32px_130px_rgba(0,0,0,0.58),0_0_65px_rgba(56,189,248,0.14)] transition duration-300 hover:border-cyan/35">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mint/70 to-transparent" />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan">INSTITUTIONAL FLOW WORKSPACE</p>
            <h2 className="mt-1 text-2xl font-black text-white">Main Flow Visualization · 누적 순매수 / 참여자 비교</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <MiniBadge tone="good">Smart Money Flow</MiniBadge>
            <MiniBadge tone={supply.lite ? "warn" : "good"}>{supply.lite ? "Lite Flow" : "Full Flow"}</MiniBadge>
            <MiniBadge tone="muted">신뢰도 {Math.round(supply.confidence * 100)}%</MiniBadge>
          </div>
        </div>
        <SmartMoneyFlowChart supply={supply} />
      </section>
      <AnalysisPanelShell title="CAPITAL FLOW SUMMARY" tags={state.tags} accent={state.label}>
        <div className="grid gap-6 lg:grid-cols-[1.28fr_0.72fr]">
          <div>
            <h2 className="text-3xl font-black leading-tight text-white">{state.label}</h2>
            <p className="mt-4 text-base leading-8 text-slate-200">{state.summary}</p>
          </div>
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">FLOW TAGS</p>
            <div className="flex flex-wrap gap-2">
              {state.tags.map((tag) => <MiniBadge key={tag} tone="good">{tag}</MiniBadge>)}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-4">
              {["수급 구조 감지", "참여자 그룹 분류 완료", "Flow 엔진 활성화", "순매수 지표 계산 완료"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-xs font-bold text-slate-300">
                  <span className="text-mint">✓</span>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </AnalysisPanelShell>
      <SupplyParsingDebugPanel state={state} />
    </div>
  );
}

function SupplyParsingDebugPanel({ state }: { state: ReturnType<typeof supplyFlowState> }) {
  const debug = state.analysisState.parsingDebug;
  if (!debug.length) return null;
  return (
    <details className="rounded-lg border border-white/10 bg-slate-950/40 p-4 text-slate-200">
      <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.22em] text-cyan">Parsing Debug / 컬럼 의미 검증</summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2">원본 컬럼</th>
              <th>의미 해석</th>
              <th>참여자</th>
              <th>방향 규칙</th>
              <th>최근 값</th>
              <th>신뢰도</th>
            </tr>
          </thead>
          <tbody>
            {debug.map((item) => (
              <tr key={item.sourceColumn} className="border-t border-white/10">
                <td className="py-2 font-semibold text-white">{item.sourceColumn}</td>
                <td>{item.semanticRole}</td>
                <td>{item.participant}</td>
                <td>{item.signDirection}</td>
                <td>{item.recentValues.map((value) => formatAxis(value)).join(", ")}</td>
                <td>{Math.round(item.confidence * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function SupplyParticipantSignalsTab({ engine, state }: { engine: VisualizationEngine; state: ReturnType<typeof supplyFlowState> }) {
  const contributions = supplyFlowContributions(state, engine);
  return (
    <div className="space-y-5">
      <AnalysisPanelShell title="FLOW SIGNAL METER" tags={["AI FLOW MODEL", "SUPPLY ONLY"]}>
        <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
          <SignalRadar signals={state.metrics.map((metric) => ({ ...metric, note: metric.label }))} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-cyan/10 bg-slate-950/35 p-4 text-center">
                <CircularMiniMeter value={metric.value} />
                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </AnalysisPanelShell>

      {state.signals.length ? (
        <AnalysisPanelShell title="ACTIVE FLOW SIGNALS PANEL" tags={["DETECTED", "CALCULATED"]}>
          <div className="grid gap-2 md:grid-cols-2">
            {state.signals.map((signal) => (
              <div key={signal} className="flex items-center gap-3 rounded-lg border border-mint/15 bg-mint/5 px-4 py-3 text-sm font-semibold text-slate-100">
                <span className="text-mint">✓</span>
                {signal}
              </div>
            ))}
          </div>
        </AnalysisPanelShell>
      ) : null}

      {contributions.length ? (
        <AnalysisPanelShell title="FLOW CONTRIBUTION BREAKDOWN" tags={["ALPHA ATTRIBUTION", "DYNAMIC"]}>
          <div className="grid gap-3 lg:grid-cols-4">
            {contributions.map((item) => (
              <div key={item.label} className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                  <p className="text-xl font-black text-mint">+{item.value}</p>
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-white/10">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-cyan to-mint shadow-[0_0_14px_rgba(56,189,248,0.32)]" style={{ width: `${Math.min(100, item.value * 3)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </AnalysisPanelShell>
      ) : null}
    </div>
  );
}

function SupplyFlowRiskTab({ supply, state }: { supply: SupplyFlowAnalysis; state: ReturnType<typeof supplyFlowState> }) {
  const risk = supplyFlowRiskState(state);
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <AnalysisPanelShell title="FLOW PRESSURE PANEL" tags={[risk.pressureLabel, "PARTICIPANT IMBALANCE"]} accent={risk.regime}>
          <div className="grid gap-4 md:grid-cols-2">
            {state.facts.map((fact) => (
              <div key={fact.label} className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{fact.label}</p>
                <p className={`mt-2 text-2xl font-black ${fact.tone === "good" ? "text-mint" : fact.tone === "warn" ? "text-amber" : fact.tone === "bad" ? "text-rose" : "text-cyan"}`}>{fact.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-300">{risk.explanation}</p>
        </AnalysisPanelShell>
        <AnalysisPanelShell title="FLOW RISK METER" tags={risk.tags}>
          <div className="grid min-h-[22rem] items-center gap-6 md:grid-cols-[minmax(13rem,0.9fr)_minmax(0,1fr)]">
            <div className="flex items-center justify-center">
              <CircularRiskMeter value={risk.score} label={risk.regime} />
            </div>
            <div className="mx-auto max-w-xl text-center md:mx-0 md:text-left">
              <p className={`text-xs font-black uppercase tracking-[0.26em] ${risk.tone === "bad" ? "text-rose" : risk.tone === "warn" ? "text-amber" : risk.tone === "good" ? "text-mint" : "text-cyan"}`}>FLOW RISK STATE</p>
              <h3 className="mt-3 text-4xl font-black leading-none text-white md:text-5xl">{risk.regime}</h3>
              <p className="mt-3 text-lg font-black text-slate-400">{risk.score}/100</p>
              <p className="mt-5 text-sm leading-7 text-slate-300">{risk.explanation}</p>
            </div>
          </div>
        </AnalysisPanelShell>
      </div>

      <AnalysisPanelShell title="PARTICIPANT RISK VISUALIZATION" tags={["DOMINANT SELLER", "OUTFLOW SPIKES", "WEAK ZONES"]}>
        <SupplyPressureVisualization supply={supply} state={state} />
      </AnalysisPanelShell>

      <AnalysisPanelShell title="PARTICIPANT DOMINANCE MAP" tags={["BUYER", "SELLER", "ACCUMULATION"]}>
        <SupplyDominanceMap state={state} />
      </AnalysisPanelShell>
    </div>
  );
}

function SupplyAiInsightTab({ analysis, engine, state }: { analysis: AnalysisResult; engine: VisualizationEngine; state: ReturnType<typeof supplyFlowState> }) {
  const scenarios = supplyFlowScenarios(state);
  const labels = [state.label, ...state.tags].slice(0, 6);
  return (
    <div className="space-y-5">
      <AnalysisPanelShell title="AI FLOW INTERPRETATION" tags={["INSTITUTIONAL FLOW REPORT", "SMART MONEY"]}>
        <div className="grid gap-5 lg:grid-cols-3">
          <InterpretationBlock label="현재 자본 흐름" text={state.interpretation.condition} />
          <InterpretationBlock label="강한 참여자" text={state.interpretation.opportunity} />
          <InterpretationBlock label="약한 참여자 / 리스크" text={state.interpretation.risk} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <InterpretationBlock label="단기 수급 시나리오" text={scenarios.shortTerm} />
          <InterpretationBlock label="중기 참여 구조" text={scenarios.mediumTerm} />
        </div>
      </AnalysisPanelShell>
      <SupplyAlphaScoreSection analysis={analysis} engine={engine} state={state} />
      <AnalysisPanelShell title="AI FLOW SCENARIO ENGINE" tags={["SCENARIO A", "SCENARIO B", "SCENARIO C"]}>
        <div className="grid gap-4 lg:grid-cols-3">
          {scenarios.paths.map((path) => <InterpretationBlock key={path.label} label={path.label} text={path.text} />)}
        </div>
      </AnalysisPanelShell>
      <AnalysisPanelShell title="FLOW CONDITION LABELS" tags={labels}>
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => <MiniBadge key={label} tone="good">{label}</MiniBadge>)}
        </div>
      </AnalysisPanelShell>
    </div>
  );
}

function OhlcvMarketAnalysis({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const state = ohlcvMarketState(analysis);
  return (
    <section className="space-y-5">
      <AnalysisPanelShell title="MARKET STRUCTURE SUMMARY" tags={state.tags} accent={state.label}>
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <h2 className="text-3xl font-black leading-tight text-white">{state.label}</h2>
            <p className="mt-4 text-base leading-8 text-slate-200">{state.summary}</p>
          </div>
          <div className="grid gap-3">
            {state.structureFacts.map((fact) => (
              <div key={fact.label} className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{fact.label}</p>
                <p className={`mt-2 text-xl font-black ${fact.tone === "good" ? "text-mint" : fact.tone === "warn" ? "text-amber" : fact.tone === "bad" ? "text-rose" : "text-cyan"}`}>{fact.value}</p>
              </div>
            ))}
          </div>
        </div>
      </AnalysisPanelShell>

      {state.metrics.length ? (
        <AnalysisPanelShell title="KEY MARKET SIGNALS" tags={["TREND", "MOMENTUM", "VOLATILITY", "LIQUIDITY"]}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {state.metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-cyan/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.54),rgba(2,6,23,0.9))] p-4 text-center">
                <CircularMiniMeter value={metric.value} />
                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">{metric.label}</p>
              </div>
            ))}
          </div>
        </AnalysisPanelShell>
      ) : null}

      {state.signals.length ? (
        <AnalysisPanelShell title="ACTIVE TECHNICAL SIGNALS" tags={["DETECTED ONLY", "NO SYNTHETIC SIGNALS"]}>
          <div className="grid gap-2 md:grid-cols-2">
            {state.signals.map((signal) => (
              <div key={signal} className="flex items-center gap-3 rounded-lg border border-mint/15 bg-mint/5 px-4 py-3 text-sm font-semibold text-slate-100">
                <span className="text-mint">✓</span>
                {signal}
              </div>
            ))}
          </div>
        </AnalysisPanelShell>
      ) : null}

      <AnalysisPanelShell title="AI MARKET INTERPRETATION" tags={["ANALYST READOUT", activeAnalysisMode(engine.primaryModule.alphaLabel, engine.primaryModule.mode).toUpperCase()]}>
        <div className="grid gap-5 lg:grid-cols-3">
          <InterpretationBlock label="현재 조건" text={state.interpretation.condition} />
          <InterpretationBlock label="핵심 기회" text={state.interpretation.opportunity} />
          <InterpretationBlock label="리스크 / 확인 조건" text={state.interpretation.risk} />
        </div>
      </AnalysisPanelShell>
    </section>
  );
}

function AnalysisPanelShell({ title, tags, accent, children }: { title: string; tags: string[]; accent?: string; children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-cyan/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.62),rgba(2,6,23,0.9)_62%,rgba(8,47,73,0.24))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.38),0_0_42px_rgba(56,189,248,0.08)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/55 to-transparent" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan">{title}</p>
          {accent ? <p className="mt-2 text-sm font-bold text-slate-400">{accent}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 5).map((tag) => <MiniBadge key={tag} tone="good">{tag}</MiniBadge>)}
        </div>
      </div>
      {children}
    </section>
  );
}

function InterpretationBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/35 p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan">{label}</p>
      <p className="mt-3 text-sm leading-7 text-slate-200">{text}</p>
    </div>
  );
}

function GenericDatasetAnalysis({ analysis, engine, kind }: { analysis: AnalysisResult; engine: VisualizationEngine; kind: DatasetAnalysisKind }) {
  const config = datasetPanelConfig(kind);
  const detectedColumns = engine.primaryModule.matchedColumns.length ? engine.primaryModule.matchedColumns : rawColumns(analysis).slice(0, 8);
  const activeSignals = engine.primaryModule.availableSignals.length ? engine.primaryModule.availableSignals : engine.modules.flatMap((module) => module.availableSignals).slice(0, 8);
  const metrics = compactSignalMetrics(analysis, engine).slice(0, 5);
  return (
    <section className="space-y-5">
      <AnalysisPanelShell title={config.summaryTitle} tags={config.tags} accent={config.focus}>
        <p className="max-w-5xl text-base leading-8 text-slate-200">{config.summary}</p>
      </AnalysisPanelShell>
      {metrics.length ? (
        <AnalysisPanelShell title={config.signalTitle} tags={["SUPPORTED METRICS", "ADAPTIVE"]}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-cyan/10 bg-slate-950/35 p-4 text-center">
                <CircularMiniMeter value={metric.value} />
                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">{metric.label}</p>
              </div>
            ))}
          </div>
        </AnalysisPanelShell>
      ) : null}
      {(activeSignals.length || detectedColumns.length) ? (
        <AnalysisPanelShell title={config.activeTitle} tags={["DETECTED COLUMNS", "AVAILABLE SIGNALS"]}>
          <div className="grid gap-3 md:grid-cols-2">
            {activeSignals.slice(0, 10).map((signal) => (
              <div key={signal} className="flex items-center gap-3 rounded-lg border border-mint/15 bg-mint/5 px-4 py-3 text-sm font-semibold text-slate-100">
                <span className="text-mint">✓</span>
                {signal}
              </div>
            ))}
            {!activeSignals.length ? detectedColumns.slice(0, 10).map((column) => (
              <div key={column} className="flex items-center gap-3 rounded-lg border border-cyan/15 bg-cyan/5 px-4 py-3 text-sm font-semibold text-slate-100">
                <span className="text-cyan">✓</span>
                {column}
              </div>
            )) : null}
          </div>
        </AnalysisPanelShell>
      ) : null}
      <AnalysisPanelShell title={config.interpretationTitle} tags={["AI READOUT", "DATASET SPECIFIC"]}>
        <p className="max-w-5xl text-base leading-8 text-slate-200">{config.interpretation}</p>
      </AnalysisPanelShell>
    </section>
  );
}

function UniversalSemanticPipelinePanel({ analysis }: { analysis: AnalysisResult }) {
  const pipeline = analysis.metricPipeline;
  if (!pipeline) return null;
  const topGroups = pipeline.semanticGroups.filter((group) => group.category !== "identifier" && group.category !== "temporal").slice(0, 5);
  const anomalies = pipeline.metrics.filter((metric) => metric.validationStatus === "anomaly" || metric.validationStatus === "invalid");
  const confirming = pipeline.relationships.filter((rel) => rel.status === "confirming");
  const confidenceTone = pipeline.confidence >= 75 ? "text-mint" : pipeline.confidence >= 45 ? "text-amber-300" : "text-rose-300";

  return (
    <section className="rounded-xl border border-mint/15 bg-slate-950/70 p-4 shadow-[0_0_42px_rgba(65,214,163,0.08)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-mint">Universal Semantic Pipeline</p>
          <h2 className="mt-2 text-2xl font-black text-white">{pipeline.regime.labelKo}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{pipeline.narrativeKo}</p>
        </div>
        <div className="grid min-w-[260px] grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">엔진 신뢰도</p>
            <p className={`mt-1 text-2xl font-black ${confidenceTone}`}>{pipeline.confidence}</p>
            <p className="text-[10px] text-slate-400">{pipeline.regime.confidenceKo}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">통합 압력</p>
            <p className="mt-1 text-2xl font-black text-cyan">{pipeline.totalScore ?? "N/A"}</p>
            <p className="text-[10px] text-slate-400">0-100 내부 점수</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-cyan/10 bg-cyan/[0.035] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan">시각화 선택</p>
          <p className="mt-2 text-sm font-bold text-white">{pipeline.visualizationPlan.layoutKo}</p>
          <p className="mt-1 text-xs text-slate-300">우선 화면: {pipeline.visualizationPlan.primaryView}</p>
          <p className="mt-1 text-[10px] leading-5 text-slate-500">{pipeline.visualizationPlan.secondaryViews.join(" · ")}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">관계 확인</p>
          {confirming.length ? confirming.slice(0, 3).map((rel) => (
            <p key={rel.id} className="mt-2 text-xs leading-5 text-slate-200">
              <span className="font-black text-mint">확인</span> {rel.labelKo}
            </p>
          )) : (
            <p className="mt-2 text-xs leading-5 text-slate-400">아직 다중 지표 확인이 부족해 개별 지표 결론을 제한합니다.</p>
          )}
        </div>
        <div className="rounded-lg border border-amber/15 bg-amber/[0.035] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">이상치 처리</p>
          <p className="mt-2 text-sm font-black text-white">{anomalies.length}개 제외</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            이상치는 원시값을 보존하지만 점수, 기여도, 차트 스케일에서 제외합니다.
          </p>
        </div>
      </div>

      {topGroups.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {topGroups.map((group) => (
            <div key={group.category} className="rounded-lg border border-white/[0.07] bg-black/15 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-black text-white">{group.labelKo}</p>
                <span className="text-[10px] font-black text-cyan">{group.averageScore ?? "N/A"}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan to-mint" style={{ width: `${Math.min(100, Math.max(0, group.averageScore ?? 0))}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[9px] text-slate-500">
                <span>유효 {group.validCount}/{group.metricCount}</span>
                <span>기여 {group.contribution}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function datasetPanelConfig(kind: DatasetAnalysisKind) {
  const configs: Record<DatasetAnalysisKind, { summaryTitle: string; signalTitle: string; activeTitle: string; interpretationTitle: string; tags: string[]; focus: string; summary: string; interpretation: string }> = {
    ohlcv: {
      summaryTitle: "MARKET STRUCTURE SUMMARY",
      signalTitle: "KEY MARKET SIGNALS",
      activeTitle: "ACTIVE TECHNICAL SIGNALS",
      interpretationTitle: "AI MARKET INTERPRETATION",
      tags: ["MARKET STRUCTURE"],
      focus: "Price, volume, volatility",
      summary: "",
      interpretation: ""
    },
    supply: {
      summaryTitle: "CAPITAL FLOW SUMMARY",
      signalTitle: "PARTICIPANT DOMINANCE SIGNALS",
      activeTitle: "ACTIVE FLOW SIGNALS",
      interpretationTitle: "AI FLOW INTERPRETATION",
      tags: ["SMART MONEY", "NET FLOW", "PARTICIPANTS"],
      focus: "Foreign, institution, retail flow, net buying pressure, accumulation/distribution",
      summary: "Detected capital-flow fields are being evaluated through participant behavior, net flow direction, and smart-money dominance.",
      interpretation: "The flow engine prioritizes confirmed participant and net buying fields. Unsupported flow dimensions remain hidden until the uploaded dataset provides the required columns."
    },
    short: {
      summaryTitle: "SHORT PRESSURE SUMMARY",
      signalTitle: "BORROWING COST SIGNALS",
      activeTitle: "ACTIVE SHORT INTEREST SIGNALS",
      interpretationTitle: "AI SQUEEZE RISK INTERPRETATION",
      tags: ["SHORT PRESSURE", "SQUEEZE RISK"],
      focus: "Short ratio, short volume spikes, borrow fee pressure, squeeze risk",
      summary: "Detected short-selling fields are evaluated for pressure buildup, crowding, and potential squeeze conditions.",
      interpretation: "The short-interest view emphasizes confirmed short volume, ratio, and borrow-cost signals while avoiding unsupported squeeze claims."
    },
    options: {
      summaryTitle: "OPTIONS POSITIONING SUMMARY",
      signalTitle: "VOLATILITY & GAMMA SIGNALS",
      activeTitle: "ACTIVE DERIVATIVES SIGNALS",
      interpretationTitle: "AI OPTIONS INTERPRETATION",
      tags: ["OPTIONS", "IV", "GAMMA"],
      focus: "Put-call ratio, implied volatility, open interest, gamma exposure",
      summary: "Detected derivatives fields are interpreted through positioning, volatility pressure, and exposure concentration.",
      interpretation: "The options engine surfaces only available derivatives signals such as PCR, IV, open interest, or gamma exposure."
    },
    macro: {
      summaryTitle: "MACRO REGIME SUMMARY",
      signalTitle: "RISK ENVIRONMENT SIGNALS",
      activeTitle: "ACTIVE MACRO SIGNALS",
      interpretationTitle: "AI MACRO INTERPRETATION",
      tags: ["MACRO", "RISK ENVIRONMENT", "LIQUIDITY"],
      focus: "VIX, interest rates, CPI, yield, DXY, liquidity pressure",
      summary: "Detected macro indicators are organized into risk environment, liquidity pressure, and regime direction.",
      interpretation: "The macro readout focuses on confirmed economic and risk variables and avoids price-action language when OHLCV structure is unavailable."
    },
    etf: {
      summaryTitle: "ETF LIQUIDITY SUMMARY",
      signalTitle: "FUND FLOW & ROTATION SIGNALS",
      activeTitle: "ACTIVE ETF FLOW SIGNALS",
      interpretationTitle: "AI ETF FLOW INTERPRETATION",
      tags: ["ETF FLOW", "LIQUIDITY", "SECTOR ROTATION"],
      focus: "ETF inflow, outflow, netflow, AUM, sector rotation, smart money pressure",
      summary: "Detected ETF flow fields are interpreted through liquidity expansion, institutional participation, and sector capital rotation.",
      interpretation: "The ETF flow engine emphasizes confirmed fund-flow and AUM signals while keeping unsupported rotation or premium/discount claims disabled."
    },
    fundamental: {
      summaryTitle: "FUNDAMENTAL PERFORMANCE SUMMARY",
      signalTitle: "PROFITABILITY & GROWTH SIGNALS",
      activeTitle: "ACTIVE FUNDAMENTAL SIGNALS",
      interpretationTitle: "AI FUNDAMENTAL INTERPRETATION",
      tags: ["FUNDAMENTALS", "GROWTH", "PROFITABILITY"],
      focus: "Revenue, operating income, EPS, ROE, cashflow",
      summary: "Detected financial statement fields are interpreted through growth quality, margin profile, profitability, and cash generation.",
      interpretation: "The fundamental engine emphasizes available reported fields and hides unsupported profitability or growth claims."
    },
    valuation: {
      summaryTitle: "VALUATION SUMMARY",
      signalTitle: "MULTIPLE COMPARISON SIGNALS",
      activeTitle: "ACTIVE VALUATION SIGNALS",
      interpretationTitle: "AI VALUATION INTERPRETATION",
      tags: ["VALUATION", "MULTIPLES", "DISCOUNT"],
      focus: "PER, PBR, PEG, EV/EBITDA, discount/premium",
      summary: "Detected valuation fields are grouped into multiple-based pricing, relative discount, and premium pressure.",
      interpretation: "The valuation readout compares only the multiples available in the uploaded dataset."
    },
    portfolio: {
      summaryTitle: "PORTFOLIO EXPOSURE SUMMARY",
      signalTitle: "ALLOCATION RISK SIGNALS",
      activeTitle: "ACTIVE PORTFOLIO SIGNALS",
      interpretationTitle: "AI PORTFOLIO INTERPRETATION",
      tags: ["PORTFOLIO", "EXPOSURE", "ALLOCATION"],
      focus: "Ticker weight, sector allocation, return contribution, concentration risk",
      summary: "Detected portfolio fields are evaluated through exposure concentration, allocation balance, and return contribution.",
      interpretation: "The portfolio engine highlights supported allocation and exposure dimensions while hiding missing sector or weight analytics."
    },
    sentiment: {
      summaryTitle: "SENTIMENT & ATTENTION SUMMARY",
      signalTitle: "SOCIAL/NEWS SIGNAL METER",
      activeTitle: "ACTIVE SENTIMENT SIGNALS",
      interpretationTitle: "AI SENTIMENT INTERPRETATION",
      tags: ["SENTIMENT", "ATTENTION", "NEWS"],
      focus: "Sentiment, mentions, reddit_score, news_score, attention spikes",
      summary: "Detected sentiment fields are interpreted through attention intensity, tone, and news/social signal pressure.",
      interpretation: "The sentiment engine separates confirmed attention signals from unsupported narrative conclusions."
    },
    onchain: {
      summaryTitle: "NETWORK ACTIVITY SUMMARY",
      signalTitle: "WHALE/EXCHANGE FLOW SIGNALS",
      activeTitle: "ACTIVE ON-CHAIN SIGNALS",
      interpretationTitle: "AI ON-CHAIN INTERPRETATION",
      tags: ["ON-CHAIN", "WALLETS", "EXCHANGE FLOW"],
      focus: "Active wallets, exchange inflow, whale transactions, hashrate",
      summary: "Detected network fields are evaluated through activity, exchange pressure, and whale transaction behavior.",
      interpretation: "The on-chain engine renders only the network and flow measures present in the uploaded dataset."
    },
    news: {
      summaryTitle: "EVENT IMPACT SUMMARY",
      signalTitle: "NEWS RISK SIGNALS",
      activeTitle: "ACTIVE EVENT SIGNALS",
      interpretationTitle: "AI EVENT INTERPRETATION",
      tags: ["NEWS", "EVENT RISK", "IMPACT"],
      focus: "Headline impact, published_at timeline, event type distribution, impact score",
      summary: "Detected event fields are organized by timing, category, and potential market impact.",
      interpretation: "The event engine reads confirmed headline and impact fields without converting them into unsupported trading conclusions."
    },
    factor: {
      summaryTitle: "FACTOR EXPOSURE SUMMARY",
      signalTitle: "FACTOR STRENGTH SIGNALS",
      activeTitle: "ACTIVE FACTOR SIGNALS",
      interpretationTitle: "AI FACTOR INTERPRETATION",
      tags: ["FACTOR", "EXPOSURE", "MULTI-FACTOR"],
      focus: "Momentum, value, quality, growth, volatility, beta",
      summary: "Detected factor fields are grouped into exposure, strength, and cross-factor balance.",
      interpretation: "The factor engine classifies available factor groups and avoids unsupported style rotation claims."
    },
    alternative: {
      summaryTitle: "ALTERNATIVE SIGNAL SUMMARY",
      signalTitle: "DEMAND/ACTIVITY SIGNALS",
      activeTitle: "ACTIVE ALTERNATIVE DATA SIGNALS",
      interpretationTitle: "AI ALTERNATIVE INTERPRETATION",
      tags: ["ALTERNATIVE DATA", "DEMAND", "ACTIVITY"],
      focus: "Web traffic, app rank, google trend, search volume, transaction proxy",
      summary: "Detected alternative-data fields are interpreted through demand proxy, activity change, and attention behavior.",
      interpretation: "The alternative-data engine surfaces only supported proxy signals and keeps unsupported causal claims hidden."
    },
    generic: {
      summaryTitle: "ADAPTIVE DATASET SUMMARY",
      signalTitle: "DETECTED FEATURE GROUPS",
      activeTitle: "AVAILABLE SIGNAL COVERAGE",
      interpretationTitle: "AI MULTI-FACTOR INTERPRETATION",
      tags: ["MIXED DATASET", "ADAPTIVE", "AUTO CLASSIFIED"],
      focus: "Mixed financial indicators",
      summary: "The uploaded dataset contains mixed financial indicators. The system will classify available feature groups and generate only the visual and analytical modules supported by the detected columns.",
      interpretation: "This adaptive view prioritizes detected feature groups and avoids dataset-specific wording until the uploaded columns support a clearer classification."
    }
  };
  return configs[kind];
}

function ohlcvMarketState(analysis: AnalysisResult) {
  const points = analysis.chart.filter((point) => Number.isFinite(point.close));
  const closes = points.map((point) => point.close);
  const last = points.at(-1);
  const ma20 = simpleAverage(closes.slice(-20));
  const ma60 = simpleAverage(closes.slice(-60));
  const latestVolume = points.at(-1)?.volume;
  const avgVolume20 = simpleAverage(points.slice(-20).map((point) => point.volume ?? NaN).filter(Number.isFinite));
  const recentHigh = Math.max(...points.slice(-20, -1).map((point) => point.high ?? point.close));
  const recentLow = Math.min(...points.slice(-20, -1).map((point) => point.low ?? point.close));
  const rangeNow = averageRange(points.slice(-14));
  const rangePrev = averageRange(points.slice(-28, -14));
  const returns = closes.length >= 2 ? ((closes.at(-1)! - closes.at(-Math.min(21, closes.length))!) / closes.at(-Math.min(21, closes.length))!) * 100 : null;
  const aboveMa20 = last && ma20 ? last.close > ma20 : null;
  const aboveMa60 = last && ma60 ? last.close > ma60 : null;
  const ma20AboveMa60 = ma20 && ma60 ? ma20 > ma60 : null;
  const volumeExpansion = latestVolume && avgVolume20 ? latestVolume > avgVolume20 * 1.12 : null;
  const volatilityExpansion = rangeNow && rangePrev ? rangeNow > rangePrev * 1.12 : null;
  const breakout = last && Number.isFinite(recentHigh) ? last.close > recentHigh : null;
  const pullback = last && ma20 && ma60 ? last.close < ma20 && last.close > ma60 : null;
  const consolidation = last && Number.isFinite(recentHigh) && Number.isFinite(recentLow) ? Math.abs(recentHigh - recentLow) / Math.max(last.close, 1) < 0.08 && !breakout : null;
  const drawdown = maxDrawdown(closes.slice(-90));
  const abnormalCandles = abnormalCandleCount(points.slice(-30));
  const support = Number.isFinite(recentLow) ? recentLow : null;
  const resistance = Number.isFinite(recentHigh) ? recentHigh : null;
  const invalidation = support && rangeNow && last ? Math.max(0, support - rangeNow * last.close) : support;
  const label = marketStructureLabel({ ma20AboveMa60, aboveMa20, aboveMa60, breakout, pullback, consolidation, volatilityExpansion });
  const tags = [
    ma20AboveMa60 || aboveMa20 ? "TRENDING" : null,
    returns !== null && returns > 0 ? "MOMENTUM ACTIVE" : null,
    volumeExpansion ? "VOLUME EXPANSION" : null,
    volatilityExpansion ? "VOLATILITY RISING" : null,
    consolidation ? "CONSOLIDATION" : null
  ].filter(Boolean) as string[];
  const summary = marketStructureSummary({ label, aboveMa20, aboveMa60, ma20AboveMa60, breakout, pullback, consolidation, volumeExpansion, volatilityExpansion });
  const metrics = [
    ma20AboveMa60 !== null || aboveMa20 !== null ? { label: "추세 강도", value: scoreFromBooleans([ma20AboveMa60, aboveMa20, aboveMa60], 30) } : null,
    returns !== null ? { label: "모멘텀", value: Math.max(0, Math.min(100, Math.round(50 + returns * 3))) } : null,
    volatilityExpansion !== null ? { label: "변동성 레짐", value: volatilityExpansion ? 76 : 44 } : null,
    volumeExpansion !== null ? { label: "거래량 압력", value: volumeExpansion ? 78 : 46 } : null,
    ma20AboveMa60 !== null && returns !== null ? { label: "상대 강도", value: Math.max(0, Math.min(100, Math.round((scoreFromBooleans([ma20AboveMa60, aboveMa20], 40) + (50 + returns * 2)) / 2))) } : null
  ].filter(Boolean) as Array<{ label: string; value: number }>;
  const signals = [
    ma20AboveMa60 ? "MA20이 MA60 위에 위치" : null,
    ma20AboveMa60 ? "강세 이동평균 정렬 감지" : null,
    aboveMa20 ? "가격이 이동평균 지지 위에서 유지" : null,
    breakout ? "저항 돌파 시도 감지" : null,
    volumeExpansion ? "거래량 확장 확인" : null,
    higherHigh(points) ? "고점 갱신 패턴 활성화" : null,
    returns !== null && returns > 0 ? "모멘텀 지속 신호 감지" : null,
    volatilityExpansion ? "변동성 확장 감지" : null
  ].filter(Boolean) as string[];
  const structureFacts = [
    { label: "추세 방향", value: ma20AboveMa60 || aboveMa20 ? "건설적" : aboveMa20 === false && aboveMa60 === false ? "방어적" : "중립", tone: ma20AboveMa60 || aboveMa20 ? "good" : aboveMa20 === false && aboveMa60 === false ? "bad" : "muted" as Tone },
    { label: "MA Structure", value: ma20AboveMa60 ? "MA20 > MA60" : ma20 && ma60 ? "MA20 <= MA60" : "Insufficient", tone: ma20AboveMa60 ? "good" : ma20 && ma60 ? "warn" : "muted" as Tone },
    { label: "거래량 확인", value: volumeExpansion ? "확장" : volumeExpansion === false ? "미확인" : "계산 불가", tone: volumeExpansion ? "good" : volumeExpansion === false ? "warn" : "muted" as Tone },
    { label: "변동성", value: volatilityExpansion ? "확장" : volatilityExpansion === false ? "수축" : "계산 불가", tone: volatilityExpansion ? "warn" : volatilityExpansion === false ? "good" : "muted" as Tone }
  ];
  const interpretation = marketInterpretation({ label, aboveMa20, breakout, volumeExpansion, volatilityExpansion, pullback });
  return {
    label,
    tags: tags.length ? tags : ["MARKET STRUCTURE"],
    summary,
    metrics,
    signals,
    structureFacts,
    interpretation,
    flags: { aboveMa20, aboveMa60, ma20AboveMa60, volumeExpansion, volatilityExpansion, breakout, pullback, consolidation },
    values: { returns, rangeNow, rangePrev, drawdown, abnormalCandles, support, resistance, invalidation, ma20, ma60, latestClose: last?.close ?? null }
  };
}

function simpleAverage(values: number[]) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function mean(values: number[]) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

function normalizedVolatility(values: number[]) {
  const avg = mean(values);
  const absMean = Math.abs(avg) || 1;
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.max(0, Math.min(1, Math.sqrt(variance) / absMean / 2));
}

function averageRange(points: AnalysisResult["chart"]) {
  const ranges = points.map((point) => ((point.high ?? point.close) - (point.low ?? point.close)) / Math.max(point.close, 1)).filter(Number.isFinite);
  return simpleAverage(ranges);
}

function scoreFromBooleans(values: Array<boolean | null>, floor: number) {
  const available = values.filter((value) => value !== null) as boolean[];
  if (!available.length) return floor;
  return Math.round(floor + (available.filter(Boolean).length / available.length) * (100 - floor));
}

function higherHigh(points: AnalysisResult["chart"]) {
  if (points.length < 12) return false;
  const recent = Math.max(...points.slice(-6).map((point) => point.high ?? point.close));
  const previous = Math.max(...points.slice(-12, -6).map((point) => point.high ?? point.close));
  return recent > previous;
}

function marketStructureLabel(state: {
  ma20AboveMa60: boolean | null;
  aboveMa20: boolean | null;
  aboveMa60: boolean | null;
  breakout: boolean | null;
  pullback: boolean | null;
  consolidation: boolean | null;
  volatilityExpansion: boolean | null;
}) {
  if (state.aboveMa20 === false && state.aboveMa60 === false) return "하락 압력 구조";
  if (state.breakout && state.volatilityExpansion) return "변동성 확장 국면";
  if (state.breakout || (state.ma20AboveMa60 && state.aboveMa20)) return "상승 추세 지속 구조";
  if (state.pullback) return "상승 추세 내 되돌림";
  if (state.consolidation) return "저항 부근 횡보 구조";
  return "중립 시장 구조";
}

function marketStructureSummary(state: {
  label: string;
  aboveMa20: boolean | null;
  aboveMa60: boolean | null;
  ma20AboveMa60: boolean | null;
  breakout: boolean | null;
  pullback: boolean | null;
  consolidation: boolean | null;
  volumeExpansion: boolean | null;
  volatilityExpansion: boolean | null;
}) {
  const maText = state.aboveMa20 && state.aboveMa60
    ? "가격이 MA20/MA60 구조 위에서 유지되며 중기 추세가 아직 훼손되지 않은 상태입니다."
    : state.aboveMa20 === false && state.aboveMa60 === false
      ? "가격이 주요 이동평균 구조 아래에서 거래되며 방어적 압력이 우세합니다."
      : "가격이 혼재된 이동평균 구조 안에서 움직이고 있어 방향 확인은 아직 선별적입니다.";
  const phaseText = state.breakout
    ? "최근 가격 움직임은 단기 범위 상단 돌파를 시도하고 있습니다."
    : state.pullback
      ? "현재 움직임은 큰 추세 안에서의 되돌림 구조에 가깝습니다."
      : state.consolidation
        ? "가격은 뚜렷한 방향 확장보다 정의된 범위 근처에서 횡보하고 있습니다."
        : "현재 구조는 아직 명확한 돌파나 이탈 국면을 보여주지 않습니다.";
  const volumeText = state.volumeExpansion
    ? "거래량 확장은 현재 움직임에 실제 참여가 붙고 있음을 뒷받침합니다."
    : state.volumeExpansion === false
      ? "거래량 확인은 아직 제한적이므로 후속 참여가 필요합니다."
      : "현재 데이터로는 거래량 확인을 평가하기 어렵습니다.";
  const volatilityText = state.volatilityExpansion
    ? "변동성은 확장 국면으로 진입하고 있습니다."
    : state.volatilityExpansion === false
      ? "변동성은 직전 구간 대비 비교적 억제되어 있습니다."
      : "현재 데이터로는 변동성 국면을 평가하기 어렵습니다.";
  return `${maText} ${phaseText} ${volumeText} ${volatilityText}`;
}

function marketInterpretation(state: {
  label: string;
  aboveMa20: boolean | null;
  breakout: boolean | null;
  volumeExpansion: boolean | null;
  volatilityExpansion: boolean | null;
  pullback: boolean | null;
}) {
  const condition = state.label === "하락 압력 구조"
    ? "현재 시장 조건은 방어적이며, 가격 구조가 넓은 추세 지지를 충분히 확인하지 못하고 있습니다."
    : state.pullback
      ? "현재 조건은 완전한 레짐 전환보다는 큰 추세 안에서의 되돌림에 가깝습니다."
      : "현재 구조는 추세와 참여 품질을 계속 시각적으로 확인해야 하는 구간입니다.";
  const opportunity = state.breakout
    ? "핵심 확인 조건은 최근 저항 구간 위에서의 종가 안착과 지속적인 거래 참여입니다."
    : state.aboveMa20
      ? "가격이 단기 이동평균 지지 위에서 유지된다면 추세 지속 구조가 강화될 수 있습니다."
      : "방향 신뢰도가 개선되려면 이동평균 구조 회복이 먼저 필요합니다.";
  const risk = state.volatilityExpansion && !state.volumeExpansion
    ? "주요 리스크는 거래량 확인 없이 변동성만 확장되는 구조입니다. 더 명확한 종가와 참여 지속성이 필요합니다."
    : state.volatilityExpansion
      ? "가격이 MA20에서 과도하게 이격되면 단기 과열 리스크가 커질 수 있습니다. 질서 있는 되돌림 또는 거래량 지지가 확인 조건입니다."
      : "다음 확인은 거래량을 동반한 돌파 또는 이동평균 지지 위에서의 안정적인 유지에서 나와야 합니다.";
  return { condition, opportunity, risk };
}

function ohlcvSignalSuite(state: ReturnType<typeof ohlcvMarketState>, analysis: AnalysisResult, engine: VisualizationEngine) {
  const trend = state.metrics.find((metric) => metric.label === "추세 강도")?.value;
  const momentum = state.metrics.find((metric) => metric.label === "모멘텀")?.value;
  const relative = state.metrics.find((metric) => metric.label === "상대 강도")?.value;
  const liquidity = state.metrics.find((metric) => metric.label === "거래량 압력")?.value;
  const breakout = state.flags.breakout === null ? null : state.flags.breakout ? 82 : state.flags.consolidation ? 46 : 58;
  const volume = state.flags.volumeExpansion === null ? null : state.flags.volumeExpansion ? 80 : 44;
  return [
    trend !== undefined ? { label: "추세 강도", value: trend } : null,
    momentum !== undefined ? { label: "모멘텀", value: momentum } : null,
    relative !== undefined ? { label: "상대 강도", value: relative } : null,
    liquidity !== undefined ? { label: "유동성", value: liquidity } : null,
    breakout !== null ? { label: "돌파 가능성", value: breakout } : null,
    volume !== null ? { label: "거래량 확인", value: volume } : null
  ].filter(Boolean) as Array<{ label: string; value: number }>;
}

function ohlcvSignalContributions(state: ReturnType<typeof ohlcvMarketState>, engine: VisualizationEngine) {
  const base = [
    { label: "추세 구조", active: state.flags.ma20AboveMa60 || state.flags.aboveMa20, value: Math.round(engine.unifiedAlphaScore * 0.28) },
    { label: "모멘텀", active: (state.values.returns ?? 0) > 0, value: Math.round(engine.unifiedAlphaScore * 0.22) },
    { label: "거래량 확인", active: state.flags.volumeExpansion, value: Math.round(engine.unifiedAlphaScore * 0.18) },
    { label: "변동성 안정성", active: state.flags.volatilityExpansion !== null, value: Math.round(engine.unifiedAlphaScore * 0.12) }
  ];
  return base.filter((item) => item.active && item.value > 0);
}

function ohlcvRiskState(state: ReturnType<typeof ohlcvMarketState>, engine: VisualizationEngine) {
  const drawdownPressure = Math.min(40, Math.round(state.values.drawdown * 2));
  const volatilityPressure = state.flags.volatilityExpansion ? 24 : 10;
  const trendPressure = state.flags.aboveMa20 === false && state.flags.aboveMa60 === false ? 24 : state.flags.aboveMa20 === false ? 14 : 4;
  const abnormalPressure = Math.min(12, state.values.abnormalCandles * 4);
  const score = Math.max(0, Math.min(100, drawdownPressure + volatilityPressure + trendPressure + abnormalPressure));
  const regime = score >= 75 ? "EXTREME" : score >= 55 ? "HIGH" : score >= 32 ? "NEUTRAL" : "LOW";
  const volatilityLabel = state.flags.volatilityExpansion ? "확장" : state.flags.volatilityExpansion === false ? "수축" : "판단 제한";
  const explanation = state.flags.volatilityExpansion
    ? "최근 변동폭이 이전 구간보다 커지고 있어 돌파 실패 또는 과열 구간에서 리스크가 빠르게 커질 수 있습니다."
    : "변동성은 상대적으로 억제되어 있으나, 지지선 이탈이나 거래량 약화가 동반되면 리스크 레짐이 바뀔 수 있습니다.";
  return { score, regime, volatilityLabel, explanation, engineTone: engine.riskTone };
}

function RiskStructureVisualization({ analysis, state }: { analysis: AnalysisResult; state: ReturnType<typeof ohlcvMarketState> }) {
  const points = analysis.chart.slice(-72);
  const width = 860;
  const height = 220;
  const closes = points.map((point) => point.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const xFor = (index: number) => points.length <= 1 ? width / 2 : (index / (points.length - 1)) * width;
  const yFor = (value: number) => height - 24 - ((value - min) / span) * (height - 48);
  const path = closes.map((value, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(1)},${yFor(value).toFixed(1)}`).join(" ");
  const supportY = state.values.support ? yFor(state.values.support) : null;
  const resistanceY = state.values.resistance ? yFor(state.values.resistance) : null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible">
        <rect x="0" y="0" width={width} height={height} fill="rgba(2,6,23,0.55)" />
        {supportY ? <rect x="0" y={supportY} width={width} height={height - supportY} fill="rgba(251,113,133,0.1)" /> : null}
        {resistanceY ? <line x1="0" y1={resistanceY} x2={width} y2={resistanceY} stroke="#f8bf4c" strokeWidth="1.5" strokeDasharray="8 6" /> : null}
        {supportY ? <line x1="0" y1={supportY} x2={width} y2={supportY} stroke="#41d6a3" strokeWidth="1.5" strokeDasharray="8 6" /> : null}
        <path d={path} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        {points.map((point, index) => {
          const range = ((point.high ?? point.close) - (point.low ?? point.close)) / Math.max(point.close, 1);
          return range > (state.values.rangeNow ?? 0) * 1.6 ? <circle key={point.date} cx={xFor(index)} cy={yFor(point.close)} r="4" fill="#fb7185" opacity="0.85" /> : null;
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        <MiniBadge tone="bad">드로다운 영역</MiniBadge>
        <MiniBadge tone="warn">비정상 캔들 {state.values.abnormalCandles}개</MiniBadge>
        <MiniBadge tone={state.flags.volumeExpansion ? "good" : "warn"}>{state.flags.volumeExpansion ? "거래량 확인" : "거래량 미확인"}</MiniBadge>
      </div>
    </div>
  );
}

function SupportResistanceMap({ state }: { state: ReturnType<typeof ohlcvMarketState> }) {
  const levels = [
    state.values.resistance ? { label: "주요 저항", value: state.values.resistance, tone: "warn" as Tone } : null,
    state.values.support ? { label: "주요 지지", value: state.values.support, tone: "good" as Tone } : null,
    state.values.latestClose ? { label: "현재 종가", value: state.values.latestClose, tone: "muted" as Tone } : null,
    state.values.invalidation ? { label: "무효화 레벨", value: state.values.invalidation, tone: "bad" as Tone } : null
  ].filter(Boolean) as Array<{ label: string; value: number; tone: Tone }>;
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {levels.map((level) => (
        <div key={level.label} className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{level.label}</p>
          <p className={`mt-3 text-2xl font-black ${level.tone === "good" ? "text-mint" : level.tone === "warn" ? "text-amber" : level.tone === "bad" ? "text-rose" : "text-cyan"}`}>{formatAxis(level.value)}</p>
        </div>
      ))}
    </div>
  );
}

function CircularRiskMeter({ value, label }: { value: number; label: string }) {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const color = value >= 81 ? "#fb3d66" : value >= 66 ? "#fb7185" : value >= 46 ? "#f8bf4c" : value >= 26 ? "#38bdf8" : "#41d6a3";
  return (
    <svg viewBox="0 0 190 190" className="h-60 w-60 max-w-full md:h-64 md:w-64">
      <defs>
        <filter id="riskArcGlow">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="95" cy="95" r={radius} fill="rgba(2,6,23,0.34)" stroke="rgba(148,163,184,0.13)" strokeWidth="14" />
      <circle cx="95" cy="95" r={radius} fill="none" stroke="rgba(15,23,42,0.95)" strokeWidth="8" />
      <circle
        cx="95"
        cy="95"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 95 95)"
        filter="url(#riskArcGlow)"
      />
      <text x="95" y="88" textAnchor="middle" fill="white" fontSize={label.length > 10 ? "17" : "22"} fontWeight="900">{label}</text>
      <text x="95" y="115" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="900">{value}/100</text>
    </svg>
  );
}

function ohlcvScenarios(state: ReturnType<typeof ohlcvMarketState>) {
  const resistance = state.values.resistance ? formatAxis(state.values.resistance) : "최근 저항";
  const support = state.values.support ? formatAxis(state.values.support) : "MA20 지지";
  return {
    shortTerm: state.flags.breakout
      ? "단기적으로는 돌파 이후 안착 여부가 핵심입니다. 거래량이 유지되면 추세 지속 시나리오가 강화됩니다."
      : "단기적으로는 저항 돌파 전까지 박스권 또는 MA20 주변 되돌림을 확인하는 구간입니다.",
    mediumTerm: state.flags.ma20AboveMa60
      ? "중기 구조는 MA20/MA60 정렬이 유지되는 동안 추세 지속 가능성을 우선 관찰합니다."
      : "중기 구조는 주요 이동평균 회복과 거래량 개선이 확인되어야 방향성이 더 선명해집니다.",
    paths: [
      { label: "Scenario A", text: `${resistance} 상단에서 종가 안착이 나오면 돌파 지속 구조가 강화됩니다.` },
      { label: "Scenario B", text: `${support} 부근으로 단기 조정이 발생하되 거래량이 안정되면 추세 내 풀백으로 해석할 수 있습니다.` },
      { label: "Scenario C", text: "돌파 실패와 변동성 확장이 동시에 나타나면 단기 리스크 레짐이 상승할 수 있습니다." }
    ]
  };
}

function maxDrawdown(values: number[]) {
  let peak = values[0] ?? 0;
  let maxDd = 0;
  values.forEach((value) => {
    peak = Math.max(peak, value);
    if (peak > 0) maxDd = Math.max(maxDd, ((peak - value) / peak) * 100);
  });
  return maxDd;
}

function abnormalCandleCount(points: AnalysisResult["chart"]) {
  const ranges = points.map((point) => ((point.high ?? point.close) - (point.low ?? point.close)) / Math.max(point.close, 1)).filter(Number.isFinite);
  const avg = simpleAverage(ranges);
  if (!avg) return 0;
  return ranges.filter((range) => range > avg * 1.8).length;
}

function supplyFlowState(supply: SupplyFlowAnalysis, engine: VisualizationEngine) {
  const state = supply.analysisState;
  const label = flowRegimeLabel(state.derivedSignals.flowRegime);
  const tags = [
    state.derivedSignals.smartMoneyBias === "Bullish" ? "SMART MONEY" : null,
    state.metrics.foreignParticipation > 55 ? "FOREIGN BUYING" : null,
    state.derivedSignals.flowRegime.includes("Accumulation") ? "ACCUMULATION" : null,
    state.metrics.netBuyMomentum > 55 ? "FLOW EXPANSION" : null,
    state.derivedSignals.flowDirection === "Inflow" ? "NET BUY ACTIVE" : null,
    state.derivedSignals.flowRegime.includes("Distribution") ? "DISTRIBUTION PRESSURE" : null,
    state.confidence === "low" ? "LIMITED FLOW COVERAGE" : null
  ].filter(Boolean) as string[];
  const metrics = [
    state.detectedColumns.institution ? { label: "기관 강도", value: state.metrics.institutionStrength } : null,
    state.detectedColumns.foreign ? { label: "외국인 참여", value: state.metrics.foreignParticipation } : null,
    state.detectedColumns.retail ? { label: "개인 압력", value: state.metrics.retailPressure } : null,
    state.detectedColumns.netBuy ? { label: "순매수 모멘텀", value: state.metrics.netBuyMomentum } : null,
    { label: "매집 강도", value: state.metrics.accumulationStrength },
    { label: "수급 안정성", value: state.metrics.flowStability }
  ].filter(Boolean) as Array<{ label: string; value: number }>;
  const signals = state.activeSignals.map(koreanFlowSignal);
  const facts = [
    { label: "우세 매수 주체", value: participantLabel(state.derivedSignals.dominantBuyer), tone: state.derivedSignals.dominantBuyer === "Insufficient Data" || state.derivedSignals.dominantBuyer === "Mixed" ? "muted" : "good" as Tone },
    { label: "우세 매도 주체", value: participantLabel(state.derivedSignals.dominantSeller), tone: state.derivedSignals.dominantSeller === "Insufficient Data" || state.derivedSignals.dominantSeller === "Mixed" ? "muted" : "bad" as Tone },
    { label: "순매수 압력", value: flowDirectionLabel(state.derivedSignals.flowDirection), tone: state.derivedSignals.flowDirection === "Inflow" ? "good" : state.derivedSignals.flowDirection === "Outflow" ? "bad" : "muted" as Tone },
    { label: "수급 안정성", value: state.metrics.flowStability >= 65 ? "안정" : state.metrics.flowStability >= 38 ? "중립" : "불안정", tone: state.metrics.flowStability >= 65 ? "good" : state.metrics.flowStability >= 38 ? "warn" : "bad" as Tone }
  ];
  const interpretation = {
    condition: state.interpretation.summary,
    opportunity: state.interpretation.opportunity,
    risk: state.interpretation.risk
  };
  return {
    label,
    tags: tags.length ? tags : ["FLOW STRUCTURE"],
    metrics,
    signals,
    facts,
    summary: state.interpretation.summary,
    interpretation,
    analysisState: state,
    values: {
      aggregateRecent: state.derivedSignals.flowDirection === "Inflow" ? 1 : state.derivedSignals.flowDirection === "Outflow" ? -1 : 0,
      aggregatePrev: 0,
      flowMomentum: state.metrics.netBuyMomentum - 50,
      flowVolatility: (100 - state.metrics.flowStability) / 100,
      institutionalMean: state.metrics.institutionStrength - 50,
      foreignMean: state.metrics.foreignParticipation - 50,
      retailMean: state.metrics.retailPressure - 50,
      dominantBuyer: state.derivedSignals.dominantBuyer,
      dominantSeller: state.derivedSignals.dominantSeller
    }
  };
}

function participantLabel(value: string) {
  const labels: Record<string, string> = {
    Foreign: "외국인",
    Institution: "기관",
    Retail: "개인",
    Mixed: "혼합",
    "Insufficient Data": "데이터 부족"
  };
  return labels[value] ?? value;
}

function flowDirectionLabel(value: string) {
  const labels: Record<string, string> = { Inflow: "유입", Outflow: "유출", Mixed: "혼합", Neutral: "중립" };
  return labels[value] ?? value;
}

function flowRegimeLabel(value: string) {
  const labels: Record<string, string> = {
    "Strong Accumulation": "강한 스마트머니 매집",
    "Weak Accumulation": "약한 매집 구조",
    "Mixed Rotation": "혼합 로테이션 구조",
    "Neutral Flow": "중립 수급 구조",
    "Weak Distribution": "약한 분배 압력",
    "Strong Distribution": "강한 분배 구조",
    Accumulation: "매집 구조",
    Distribution: "분배 압력 구조",
    Rotation: "참여자 로테이션",
    Neutral: "중립 수급 구조"
  };
  return labels[value] ?? value;
}

function koreanFlowSignal(signal: string) {
  const labels: Record<string, string> = {
    "Institutional accumulation detected": "기관성 매집 감지",
    "Foreign net buying increasing": "외국인 순매수 증가",
    "Retail selling pressure weakening": "개인 매도 압력 약화",
    "Net buy momentum improving": "순매수 모멘텀 개선",
    "Smart money inflow active": "스마트머니 유입 활성화",
    "Participant rotation detected": "참여자 로테이션 감지",
    "Flow instability detected": "수급 불안정성 감지",
    "Distribution pressure rising": "분배 압력 상승",
    "Limited participant coverage detected.": "제한적 참여자 커버리지 감지"
  };
  return labels[signal] ?? signal;
}

function supplyFlowContributions(state: ReturnType<typeof supplyFlowState>, engine: VisualizationEngine) {
  const rows = [
    { label: "기관 Flow", active: state.analysisState.detectedColumns.institution !== null, value: Math.round(state.analysisState.metrics.institutionStrength * 0.3) },
    { label: "외국인 참여", active: state.analysisState.detectedColumns.foreign !== null, value: Math.round(state.analysisState.metrics.foreignParticipation * 0.24) },
    { label: "순매수 강도", active: state.analysisState.detectedColumns.netBuy !== null, value: Math.round(state.analysisState.metrics.netBuyMomentum * 0.18) },
    { label: "수급 안정성", active: true, value: Math.round(state.analysisState.metrics.flowStability * 0.12) }
  ];
  return rows.filter((item) => item.active && item.value > 0);
}

function supplyFlowRiskState(state: ReturnType<typeof supplyFlowState>) {
  const metrics = state.analysisState.metrics;
  const confirmedOutflow = state.analysisState.derivedSignals.flowDirection === "Outflow" && state.analysisState.derivedSignals.flowRegime.includes("Distribution");
  const rotationStructure = state.analysisState.derivedSignals.flowRegime === "Mixed Rotation" || metrics.flowStability < 45;
  const rawScore =
    (100 - metrics.flowStability) * 0.26 +
    metrics.distributionPressure * 0.28 +
    metrics.participantImbalance * 0.18 +
    Math.max(0, 55 - state.analysisState.alpha.score) * 0.2 +
    (confirmedOutflow ? 12 : 0) +
    (state.analysisState.derivedSignals.flowRisk === "Extreme" ? 10 : state.analysisState.derivedSignals.flowRisk === "High" ? 6 : 0);
  const cappedScore = !confirmedOutflow && rotationStructure ? Math.min(rawScore, 65) : rawScore;
  const score = Math.round(Math.max(0, Math.min(100, cappedScore)));
  const regime = riskMeterLabel(score, rotationStructure);
  const tone: Tone = score <= 25 ? "good" : score <= 65 ? "warn" : "bad";
  const pressureLabel = state.analysisState.derivedSignals.flowDirection === "Outflow" ? "유출 압력" : state.analysisState.derivedSignals.flowDirection === "Inflow" ? "유입 개선" : "혼합 압력";
  const explanation = riskMeterExplanation(state, regime, confirmedOutflow, rotationStructure);
  const tags = [
    confirmedOutflow ? "OUTFLOW" : null,
    rotationStructure ? "ROTATION" : null,
    metrics.flowStability < 45 ? "INSTABILITY" : null,
    metrics.participantImbalance > 70 ? "IMBALANCE" : null
  ].filter(Boolean) as string[];
  return { score, regime, pressureLabel, explanation, tone, tags: tags.length ? tags : ["STABLE FLOW"] };
}

function riskMeterLabel(score: number, rotationStructure: boolean) {
  if (score <= 25) return "LOW";
  if (score <= 45) return "NEUTRAL";
  if (score <= 65) return rotationStructure ? "ROTATION RISK" : "NEUTRAL";
  if (score <= 80) return "HIGH";
  return "EXTREME";
}

function riskMeterExplanation(state: ReturnType<typeof supplyFlowState>, regime: string, confirmedOutflow: boolean, rotationStructure: boolean) {
  if (regime === "LOW") return "스마트머니 유입과 수급 안정성이 유지되며 구조적 유출 리스크는 제한적입니다.";
  if (regime === "NEUTRAL") return "분배 압력은 통제 가능한 범위이며, 강한 유출 확인 전까지 중립 수급으로 해석합니다.";
  if (regime === "ROTATION RISK" || rotationStructure) return "수급 안정성은 약하지만 확정 유출보다 참여자 로테이션 구조로 해석하는 편이 적절합니다.";
  if (regime === "HIGH" && confirmedOutflow) return "주요 참여자 유출과 분배 압력이 함께 나타나 수급 리스크가 높아졌습니다.";
  if (regime === "EXTREME") return "강한 유출, 높은 불균형, 낮은 안정성이 동시에 확인된 극단 리스크 구간입니다.";
  return state.analysisState.interpretation.risk;
}

function SupplyPressureVisualization({ supply, state }: { supply: SupplyFlowAnalysis; state: ReturnType<typeof supplyFlowState> }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const riskMap = buildFlowRiskMap(supply, state);
  const values = riskMap.aggregate;
  const width = 860;
  const height = 340;
  if (!values.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-slate-950/45 p-5">
        <p className="text-sm leading-7 text-slate-300">수급 리스크 맵을 구성할 순매수 또는 참여자 흐름 데이터가 부족합니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {state.analysisState.warnings.map((warning) => <MiniBadge key={warning} tone="warn">{warning}</MiniBadge>)}
        </div>
      </div>
    );
  }
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  const absScale = Math.max(mean(values.map(Math.abs)), 1);
  const xFor = (index: number) => values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width;
  const yFor = (value: number) => height - 46 - ((value - min) / span) * (height - 82);
  const path = values.map((value, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(1)},${yFor(value).toFixed(1)}`).join(" ");
  const chartDates = supply.dates.slice(-Math.min(72, supply.dates.length));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || values.length < 2) return;
    const rect = svg.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverIdx(Math.round(relX * (values.length - 1)));
  };

  const zeroY = yFor(0);
  const confidenceHeight = Math.max(14, state.analysisState.preprocessing.coverageScore * 38);
  return (
    <div className="relative overflow-hidden rounded-lg border border-cyan/10 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.11),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.78),rgba(2,6,23,0.98))] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.42),0_0_34px_rgba(56,189,248,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:86px_68px] opacity-36" />
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="relative z-[1] h-[430px] w-full overflow-visible md:h-[500px]" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id="flowAccumulation" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#41d6a3" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#41d6a3" stopOpacity="0.025" />
          </linearGradient>
          <linearGradient id="flowDistribution" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.025" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0.14" />
          </linearGradient>
          <filter id="flowGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width={width} height={Math.max(0, zeroY - 18)} fill="url(#flowAccumulation)" />
        <rect x="0" y={Math.max(0, zeroY - 14)} width={width} height="28" fill="rgba(148,163,184,0.055)" />
        <rect x="0" y={zeroY + 18} width={width} height={Math.max(0, height - zeroY - 18)} fill="url(#flowDistribution)" />
        <rect x="0" y="18" width={width} height={confidenceHeight} fill="rgba(56,189,248,0.035)" />
        <text x="16" y="31" fill="#41d6a3" fontSize="10" fontWeight="900" opacity="0.78">ACCUMULATION</text>
        <text x="16" y={zeroY + 4} fill="#94a3b8" fontSize="10" fontWeight="900" opacity="0.76">NEUTRAL</text>
        <text x="16" y={height - 18} fill="#fb7185" fontSize="10" fontWeight="900" opacity="0.78">DISTRIBUTION</text>
        {riskMap.weakZones.slice(-2).map((zone) => (
          <rect key={`weak-${zone.start}-${zone.end}`} x={xFor(zone.start)} y="34" width={Math.max(5, xFor(zone.end) - xFor(zone.start))} height={height - 88} fill="rgba(148,163,184,0.045)" stroke="rgba(148,163,184,0.11)" strokeDasharray="5 7" />
        ))}
        {riskMap.instabilityZones.slice(-2).map((zone) => (
          <rect key={`instability-${zone.start}-${zone.end}`} x={xFor(zone.start)} y="34" width={Math.max(5, xFor(zone.end) - xFor(zone.start))} height={height - 88} fill="rgba(248,191,76,0.055)" stroke="rgba(248,191,76,0.14)" />
        ))}
        {riskMap.dominance.map((item, index) => (
          <rect key={`dominance-${index}`} x={xFor(index) - 1.5} y={height - 28} width="3" height="11" rx="1" fill={participantColor(item.category)} opacity={item.strength > 0 ? 0.48 : 0.12} />
        ))}
        <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="rgba(226,232,240,0.42)" strokeWidth="1.5" />
        <path d={path} fill="none" stroke="#38bdf8" strokeWidth="3.6" strokeLinecap="round" filter="url(#flowGlow)" />
        {riskMap.spikes.map((spike) => (
          <g key={`spike-${spike.index}`}>
            <line x1={xFor(spike.index)} y1={zeroY} x2={xFor(spike.index)} y2={yFor(values[spike.index])} stroke={spike.direction === "inflow" ? "#41d6a3" : "#fb7185"} strokeWidth="1.4" strokeDasharray="3 7" opacity="0.5" />
            <circle cx={xFor(spike.index)} cy={yFor(values[spike.index])} r="4.5" fill={spike.direction === "inflow" ? "#41d6a3" : "#fb7185"} opacity="0.82" />
            <title>{spike.label}</title>
          </g>
        ))}
        {riskMap.reversals.map((reversal) => (
          <g key={`reversal-${reversal.index}`}>
            <circle cx={xFor(reversal.index)} cy={zeroY} r="4" fill="#f8bf4c" opacity="0.7" />
            <title>수급 방향 전환</title>
          </g>
        ))}
        {riskMap.annotations.map((annotation, offset) => {
          const x = Math.min(width - 118, Math.max(10, xFor(annotation.index) - 54));
          const y = Math.max(38, Math.min(height - 82, yFor(values[annotation.index]) - 34 - offset * 5));
          return (
            <g key={`${annotation.label}-${annotation.index}`}>
              <line x1={x + 54} y1={y + 25} x2={xFor(annotation.index)} y2={yFor(values[annotation.index])} stroke={annotation.tone === "good" ? "#41d6a3" : annotation.tone === "bad" ? "#fb7185" : "#f8bf4c"} strokeWidth="1" opacity="0.45" />
              <rect x={x} y={y} width="118" height="26" rx="5" fill="rgba(2,6,23,0.86)" stroke={annotation.tone === "good" ? "#41d6a3" : annotation.tone === "bad" ? "#fb7185" : "#f8bf4c"} opacity="0.9" />
              <text x={x + 59} y={y + 17} fill="#e5edf7" fontSize="10" fontWeight="900" textAnchor="middle">{annotation.label}</text>
            </g>
          );
        })}
        {hoverIdx !== null && (() => {
          const val = values[hoverIdx];
          const dom = riskMap.dominance[hoverIdx];
          const date = chartDates[hoverIdx] ?? "";
          const hx = xFor(hoverIdx);
          const hy = yFor(val);
          const isSpike = riskMap.spikes.some((s) => s.index === hoverIdx);
          const isReversal = riskMap.reversals.some((r) => r.index === hoverIdx);
          const zone = val > absScale * 0.15 ? "Accumulation" : val < -absScale * 0.15 ? "Distribution" : "Neutral";
          const valColor = val >= 0 ? "#41d6a3" : "#fb7185";
          const domColor = participantColor(dom?.category ?? "aggregate");
          const domLabel = participantLabel(String(dom?.category ?? "aggregate"));
          const onRight = hx > width * 0.58;
          const tw = 148;
          const th = isSpike || isReversal ? 88 : 76;
          const tx = onRight ? hx - tw - 10 : hx + 10;
          const ty = Math.max(36, Math.min(height - th - 10, hy - th / 2));
          return (
            <g>
              <line x1={hx} y1="10" x2={hx} y2={height - 28} stroke="rgba(125,211,252,0.35)" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx={hx} cy={hy} r="5.5" fill={valColor} stroke="rgba(2,6,23,0.85)" strokeWidth="2.5" />
              <rect x={tx} y={ty} width={tw} height={th} rx="6" fill="rgba(2,6,23,0.94)" stroke="rgba(125,211,252,0.28)" strokeWidth="1" />
              <text x={tx + 10} y={ty + 15} fill="#64748b" fontSize="9" fontWeight="700">{String(date).length >= 10 ? String(date).slice(2, 10) : String(date)}</text>
              <text x={tx + 10} y={ty + 32} fill={valColor} fontSize="13" fontWeight="900">{val >= 0 ? "▲" : "▼"} {Math.abs(val) >= 1000 ? Math.round(Math.abs(val)).toLocaleString() : Math.abs(val).toFixed(1)}</text>
              <text x={tx + 10} y={ty + 49} fill={domColor} fontSize="9" fontWeight="700">우세: {domLabel}</text>
              <text x={tx + 10} y={ty + 63} fill={zone === "Accumulation" ? "#41d6a3" : zone === "Distribution" ? "#fb7185" : "#94a3b8"} fontSize="9" fontWeight="700">{zone}{isSpike ? " · SPIKE" : ""}{isReversal ? " · REVERSAL" : ""}</text>
              {(isSpike || isReversal) && <text x={tx + 10} y={ty + 78} fill="#f8bf4c" fontSize="9" fontWeight="700">{isSpike ? riskMap.spikes.find((s) => s.index === hoverIdx)?.label ?? "" : "수급 방향 전환"}</text>}
            </g>
          );
        })()}
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
      </svg>
      <div className="relative z-[1] mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap gap-2">
          <MiniBadge tone="good">누적 순자본 오버레이</MiniBadge>
          <MiniBadge tone="muted">우세 참여자 추세</MiniBadge>
          <MiniBadge tone={state.analysisState.preprocessing.coverageScore >= 0.7 ? "good" : "warn"}>신뢰 밴드 {Math.round(state.analysisState.preprocessing.coverageScore * 100)}%</MiniBadge>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <MiniBadge tone="bad">우세 매도 {participantLabel(String(state.values.dominantSeller))}</MiniBadge>
          <MiniBadge tone={state.analysisState.derivedSignals.flowDirection === "Inflow" ? "good" : "warn"}>{flowDirectionLabel(state.analysisState.derivedSignals.flowDirection)}</MiniBadge>
        </div>
      </div>
      <div className="relative z-[1] mt-4 rounded-lg border border-cyan/15 bg-cyan/5 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan">AI FLOW RISK READOUT</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {riskMap.insights.map((insight) => <p key={insight} className="text-sm leading-6 text-slate-200">{insight}</p>)}
        </div>
      </div>
    </div>
  );
}

function buildFlowRiskMap(supply: SupplyFlowAnalysis, state: ReturnType<typeof supplyFlowState>) {
  const windowSize = 72;
  const aggregate = supply.aggregate.slice(-windowSize);
  const offset = Math.max(0, supply.aggregate.length - aggregate.length);
  const cumulative = cumulativeFrom(aggregate);
  const absScale = Math.max(mean(aggregate.map(Math.abs)), 1);
  const participantSeries = supply.columns.filter((series) => ["foreign", "institutional", "retail"].includes(series.category));
  const dominance = aggregate.map((_value, index) => {
    const globalIndex = index + offset;
    const ranked = participantSeries
      .map((series) => ({ category: series.category, value: series.values[globalIndex + series.values.length - supply.aggregate.length] ?? 0 }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    return { category: ranked[0]?.category ?? "aggregate", strength: Math.abs(ranked[0]?.value ?? 0), value: ranked[0]?.value ?? 0 };
  });
  const spikes = aggregate
    .map((value, index) => {
      const direction = value >= 0 ? "inflow" as const : "outflow" as const;
      const dominant = dominance[index];
      return { index, value, direction, impact: Math.abs(value) + (dominant?.strength ?? 0) * 0.35, label: flowAnnotationLabel(dominant?.category ?? "aggregate", direction, dominant?.value ?? value) };
    })
    .filter((item) => Math.abs(item.value) > absScale * 1.7)
    .sort((a, b) => b.impact - a.impact);
  const majorSpikes = deClusterEvents(spikes, 5, 5);
  const reversals = aggregate
    .map((value, index) => index > 0 && Math.sign(value) !== Math.sign(aggregate[index - 1]) && Math.abs(value - aggregate[index - 1]) > absScale * 0.9 ? { index } : null)
    .filter(Boolean)
    .slice(-3) as Array<{ index: number }>;
  const instabilityIndexes = aggregate
    .map((_value, index) => {
      const local = aggregate.slice(Math.max(0, index - 4), index + 5);
      return normalizedVolatility(local) > 0.72 ? index : null;
    })
    .filter((index): index is number => index !== null);
  const weakIndexes = aggregate
    .map((value, index) => Math.abs(value) < absScale * 0.28 && dominance[index]?.strength < absScale * 0.45 ? index : null)
    .filter((index): index is number => index !== null);
  const instabilityZones = compactIndexZones(instabilityIndexes);
  const weakZones = compactIndexZones(weakIndexes);
  const annotations = buildFlowAnnotations(majorSpikes, dominance, aggregate, state);
  const insights = buildFlowRiskInsights(state, majorSpikes, reversals, instabilityZones, weakZones);
  return { aggregate, cumulative, dominance, spikes: majorSpikes, reversals, instabilityZones, weakZones, annotations, insights };
}

function buildFlowAnnotations(
  spikes: Array<{ index: number; value: number; direction: "inflow" | "outflow"; impact: number; label: string }>,
  dominance: Array<{ category: FlowCategory; strength: number; value: number }>,
  aggregate: number[],
  state: ReturnType<typeof supplyFlowState>
) {
  const annotations = spikes.slice(0, 3).map((spike) => {
    const dominant = dominance[spike.index];
    return {
      index: spike.index,
      label: spike.label || flowAnnotationLabel(dominant?.category ?? "aggregate", spike.direction, dominant?.value ?? spike.value),
      tone: spike.direction === "inflow" ? "good" as Tone : "bad" as Tone
    };
  });
  const rotationIndex = dominance.findIndex((item, index) => index > 0 && item.category !== dominance[index - 1].category && Math.abs(aggregate[index]) > mean(aggregate.map(Math.abs)) * 0.7);
  if (rotationIndex >= 0 && annotations.length < 4) annotations.push({ index: rotationIndex, label: "주요 로테이션", tone: "warn" as Tone });
  if (state.analysisState.derivedSignals.flowRegime.includes("Accumulation") && annotations.length < 4) {
    const strongest = aggregate.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value)[0];
    if (strongest) annotations.push({ index: strongest.index, label: "스마트머니 매집", tone: "good" as Tone });
  }
  return annotations.slice(0, 4);
}

function flowAnnotationLabel(category: FlowCategory, direction: "inflow" | "outflow", value: number) {
  if (category === "foreign" && direction === "outflow") return "외국인 이탈 스파이크";
  if (category === "foreign" && direction === "inflow") return "외국인 유입 강화";
  if (category === "institutional" && direction === "inflow") return "기관 매집";
  if (category === "institutional" && direction === "outflow") return "기관 유출 압력";
  if (category === "retail" && direction === "outflow") return "개인 패닉 매도";
  if (category === "retail" && direction === "inflow") return value > 0 ? "개인 추격 매수" : "개인 압력";
  return direction === "inflow" ? "순유입 스파이크" : "순유출 스파이크";
}

function buildFlowRiskInsights(
  state: ReturnType<typeof supplyFlowState>,
  spikes: Array<{ index: number; value: number; direction: "inflow" | "outflow"; impact: number; label: string }>,
  reversals: Array<{ index: number }>,
  instabilityZones: Array<{ start: number; end: number }>,
  weakZones: Array<{ start: number; end: number }>
) {
  const insights = [
    state.analysisState.derivedSignals.flowRisk === "High" || state.analysisState.derivedSignals.flowRisk === "Extreme"
      ? "주요 참여자 유출 압력이 증가합니다."
      : "스마트머니 리스크는 통제권 안에 있습니다.",
    state.analysisState.metrics.foreignParticipation >= 55
      ? "외국인 참여는 안정적입니다."
      : state.analysisState.detectedColumns.foreign
        ? "외국인 참여 강도는 제한적입니다."
        : "외국인 데이터는 미감지입니다.",
    spikes.some((spike) => spike.direction === "outflow")
      ? "핵심 순유출 스파이크가 감지됩니다."
      : reversals.length
        ? "로테이션 리스크가 관찰됩니다."
        : instabilityZones.length
          ? "불안정 수급 구간이 있습니다."
          : weakZones.length
            ? "약한 참여 구간이 남아 있습니다."
            : "분배 리스크 신호는 제한적입니다."
  ];
  return insights;
}

function deClusterEvents<T extends { index: number }>(events: T[], limit: number, distance: number) {
  const selected: T[] = [];
  for (const event of events) {
    if (selected.length >= limit) break;
    if (selected.every((item) => Math.abs(item.index - event.index) > distance)) selected.push(event);
  }
  return selected.sort((a, b) => a.index - b.index);
}

function compactIndexZones(indexes: number[]) {
  if (!indexes.length) return [];
  const zones: Array<{ start: number; end: number }> = [];
  let start = indexes[0];
  let prev = indexes[0];
  indexes.slice(1).forEach((index) => {
    if (index === prev + 1) {
      prev = index;
      return;
    }
    zones.push({ start, end: prev });
    start = index;
    prev = index;
  });
  zones.push({ start, end: prev });
  return zones.filter((zone) => zone.end - zone.start >= 1).slice(-5);
}

function participantColor(category: FlowCategory) {
  const colors: Record<FlowCategory, string> = {
    institutional: "#41d6a3",
    foreign: "#38bdf8",
    retail: "#fb923c",
    dealer: "#60a5fa",
    broker: "#22c55e",
    whale: "#14b8a6",
    etf: "#a3e635",
    aggregate: "#94a3b8",
    inflow: "#84cc16",
    outflow: "#fb7185"
  };
  return colors[category];
}

function cumulativeFrom(values: number[]) {
  let total = 0;
  return values.map((value) => {
    total += value;
    return total;
  });
}

function SupplyDominanceMap({ state }: { state: ReturnType<typeof supplyFlowState> }) {
  const levels = [
    { label: "우세 매수 주체", value: participantLabel(String(state.values.dominantBuyer)), tone: state.analysisState.derivedSignals.dominantBuyer === "Mixed" || state.analysisState.derivedSignals.dominantBuyer === "Insufficient Data" ? "muted" : "good" as Tone },
    { label: "우세 매도 주체", value: participantLabel(String(state.values.dominantSeller)), tone: state.analysisState.derivedSignals.dominantSeller === "Mixed" || state.analysisState.derivedSignals.dominantSeller === "Insufficient Data" ? "muted" : "bad" as Tone },
    { label: "최강 매집 참여자", value: participantLabel(String(state.values.dominantBuyer)), tone: state.analysisState.derivedSignals.dominantBuyer === "Mixed" || state.analysisState.derivedSignals.dominantBuyer === "Insufficient Data" ? "muted" : "good" as Tone },
    { label: "약한 참여 지지", value: state.analysisState.metrics.retailPressure > 55 ? "개인 압력 높음" : "개인 압력 제한", tone: state.analysisState.metrics.retailPressure > 55 ? "warn" : "good" as Tone }
  ];
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {levels.map((level) => (
        <div key={level.label} className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{level.label}</p>
          <p className={`mt-3 text-2xl font-black ${level.tone === "good" ? "text-mint" : level.tone === "warn" ? "text-amber" : level.tone === "bad" ? "text-rose" : "text-cyan"}`}>{level.value}</p>
        </div>
      ))}
    </div>
  );
}

function SupplyAlphaScoreSection({ analysis, engine, state }: { analysis: AnalysisResult; engine: VisualizationEngine; state: ReturnType<typeof supplyFlowState> }) {
  const bias = state.analysisState.alpha.bias === "Accumulation Bias" ? "매집 Bias" : state.analysisState.alpha.bias === "Distribution Bias" ? "분배 Bias" : state.analysisState.alpha.bias === "Mixed Bias" ? "혼합 Bias" : "중립 Bias";
  return (
    <section className="relative overflow-hidden rounded-lg border border-mint/20 bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(8,47,73,0.32)_58%,rgba(2,6,23,0.96))] px-6 py-10 shadow-[0_28px_100px_rgba(0,0,0,0.42),0_0_55px_rgba(65,214,163,0.12)]">
      <div className="pointer-events-none absolute left-10 top-0 h-px w-1/2 bg-gradient-to-r from-mint via-cyan to-transparent opacity-70" />
      <p className="text-xs font-black uppercase tracking-[0.32em] text-mint">ALPHA SCORE</p>
      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <strong className="block text-8xl font-black leading-none text-white md:text-9xl">{state.analysisState.alpha.score}</strong>
          <p className="mt-5 max-w-3xl text-xl font-semibold leading-8 text-slate-200">{flowAlphaInterpretation(state, analysis)}</p>
        </div>
        <div className="lg:text-right">
          <p className="text-2xl font-black text-cyan">{bias}</p>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.22em] text-slate-400">{confidenceLevel(engine)}</p>
        </div>
      </div>
    </section>
  );
}

function flowAlphaInterpretation(state: ReturnType<typeof supplyFlowState>, analysis: AnalysisResult) {
  return state.analysisState.alpha.explanation || analysis.interpretation || "수급 구조는 혼합적이며, 참여자별 방향성이 더 명확해질 때 신뢰도가 높아집니다.";
}

function supplyFlowScenarios(state: ReturnType<typeof supplyFlowState>) {
  const buyer = participantLabel(String(state.values.dominantBuyer));
  const seller = participantLabel(String(state.values.dominantSeller));
  return {
    shortTerm: state.analysisState.interpretation.scenarioA,
    mediumTerm: state.analysisState.interpretation.scenarioB,
    paths: [
      { label: "Scenario A", text: state.analysisState.interpretation.scenarioA.replace("기관 또는 외국인", buyer === "혼합" || buyer === "데이터 부족" ? "스마트머니" : buyer) },
      { label: "Scenario B", text: state.analysisState.interpretation.scenarioB },
      { label: "Scenario C", text: state.analysisState.interpretation.scenarioC.replace("개인 중심", `${seller} 중심`) }
    ]
  };
}

function AISummaryStrip({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const overview = adaptiveOverview(analysis, engine);
  const chips = [
    `${overview.label} 감지`,
    engine.supply.active ? `Smart Money ${engine.supply.scoreLabel}` : `${engine.primaryModule.alphaLabel} 활성화`,
    engine.supply.active ? `수급 Alpha ${engine.supply.alphaAdjustment >= 0 ? "+" : ""}${engine.supply.alphaAdjustment}` : `신뢰도 ${engine.columnCoverage}%`,
    engine.supply.conflicts.length ? `수급 충돌 ${engine.supply.conflicts.length}건` : "중대 충돌 없음",
    engine.primaryModule.missingSignals.length ? `누락 신호 ${engine.primaryModule.missingSignals.length}개` : "핵심 신호 충분"
  ];
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/55 p-3 backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip, index) => (
          <span key={chip} className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-xs font-bold ${index === 0 ? "border-mint/30 bg-mint/10 text-mint" : "border-cyan/20 bg-cyan/5 text-cyan"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
}

function SupplyModeNotice({ supply }: { supply: SupplyFlowAnalysis }) {
  return (
    <section className="rounded-lg border border-cyan/20 bg-[linear-gradient(135deg,rgba(8,47,73,0.42),rgba(15,23,42,0.76))] p-5 shadow-glow">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan">Supply Analysis Mode</p>
          <h2 className="mt-2 text-2xl font-black text-white">Smart Money / 자본 흐름 전용 분석</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            이 데이터셋은 완전한 OHLCV 가격 구조를 포함하지 않습니다. 캔들차트, ATR 진입가, 백테스트 중심 화면은 비활성화하고 자본 흐름과 참여자 행동 분석에 집중합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MiniBadge tone={supply.lite ? "warn" : "good"}>{supply.lite ? "Lite Supply Analysis" : "Institutional Flow Terminal"}</MiniBadge>
          <MiniBadge tone="good">Smart Money {supply.smartMoneyScore}</MiniBadge>
        </div>
      </div>
    </section>
  );
}

function MarketFlowSummaryTab({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const supply = engine.supply;
  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <SmartMoneyGauge supply={supply} />
        <Card title="중앙 수급 인텔리전스">
          <SmartMoneyFlowChart supply={supply} />
        </Card>
      </section>
      <SupplySummaryCards analysis={analysis} supply={supply} />
      <Card title="자동 인사이트">
        <List items={supply.insights} />
      </Card>
    </div>
  );
}

function FlowDetailAnalysisTab({ supply }: { supply: SupplyFlowAnalysis }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="투자자 구성">
        <InvestorComposition supply={supply} />
      </Card>
      <Card title="수급 강도 히트맵">
        <SupplyHeatmap supply={supply} />
      </Card>
      <Card title="수급 충돌 감지">
        <SupplyConflictPanel supply={supply} />
      </Card>
      <Card title="사용 가능 / 누락 신호">
        <div className="grid gap-3 md:grid-cols-2">
          <SignalBucket title="사용 가능 신호" items={supply.availableSignals} tone="good" />
          <SignalBucket title="누락 신호" items={supply.missingSignals} tone="warn" />
        </div>
      </Card>
    </div>
  );
}

function FlowSimulatorTab(props: {
  analysis: AnalysisResult;
  engine: VisualizationEngine;
  scenario: Scenario;
  effectiveScenario: Scenario;
  capabilities: SimulationCapabilities;
  setScenario: (s: Scenario) => void;
  simulatedScore: number;
  simulatedSupply: SupplyFlowAnalysis;
}) {
  return (
    <div className="space-y-5">
      <WhatIfTab {...props} />
      <section className="grid gap-5 lg:grid-cols-2">
        <SmartMoneyGauge supply={props.simulatedSupply} />
        <Card title="시나리오 충돌 엔진">
          <SupplyConflictPanel supply={props.simulatedSupply} />
        </Card>
      </section>
    </div>
  );
}

function SupplySummaryCards({ analysis, supply }: { analysis: AnalysisResult; supply: SupplyFlowAnalysis }) {
  const dominant = supply.composition[0];
  const net = supply.aggregate.at(-1) ?? 0;
  const retail = supply.columns.find((series) => series.category === "retail");
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <SignalCard label="주도 참여자" value={dominant?.label ?? "미감지"} detail={dominant ? `${Math.round(dominant.share * 100)}% 비중` : "부분 데이터"} tone="good" />
      <SignalCard label="기관 정렬" value={supply.columns.some((series) => ["institutional", "foreign", "dealer", "broker"].includes(series.category) && series.recentMean > 0) ? "양호" : "약함"} detail="스마트머니 방향" tone={supply.smartMoneyScore >= 60 ? "good" : "warn"} />
      <SignalCard label="리테일 모멘텀" value={retail ? (retail.recentMean > 0 ? "추격" : "축소") : "미감지"} detail="개인성 자금" tone={retail?.recentMean && retail.recentMean > 0 && supply.smartMoneyScore < 50 ? "bad" : "muted"} />
      <SignalCard label="순자본 방향" value={net >= 0 ? "순유입" : "순유출"} detail={formatAxis(net)} tone={net >= 0 ? "good" : "bad"} />
      <SignalCard label="자본 모멘텀" value={supply.alphaAdjustment >= 0 ? "강화" : "약화"} detail={`Alpha ${supply.alphaAdjustment >= 0 ? "+" : ""}${supply.alphaAdjustment}`} tone={supply.alphaAdjustment >= 0 ? "good" : "warn"} />
      <SignalCard label="Flow 신뢰도" value={`${Math.round(supply.confidence * 100)}%`} detail={analysis.backtestEnabled ? "장기 표본" : "제한 표본"} tone={supply.confidence >= 0.65 ? "good" : "warn"} />
    </section>
  );
}

function InsightSummary({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_1.25fr_0.8fr]">
      <Card title="AI 인사이트 요약">
        <p className="text-sm leading-7 text-slate-300">{engine.insights[0]}</p>
        <p className="mt-3 rounded-md border border-cyan/20 bg-cyan/5 p-3 text-sm leading-6 text-cyan">{engine.insights[1]}</p>
      </Card>
      <Card title="시각화 전략 선택">
        <div className="flex flex-wrap gap-2">
          {engine.primaryModule.charts.slice(0, 8).map((chart) => <Pill key={chart} tone="good">{chart}</Pill>)}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-300">주요 Alpha 모듈: <span className="font-bold text-white">{engine.primaryModule.alphaLabel}</span></p>
        <p className="mt-2 text-sm leading-6 text-slate-400">합성 방식: {engine.blendMode === "weighted" ? "복수 모듈 가중 결합" : "단일 모듈 Primary Alpha"}</p>
      </Card>
      <Card title="리스크 상태">
        <div className={`text-5xl font-black ${engine.riskTone === "good" ? "text-mint" : engine.riskTone === "warn" ? "text-amber" : "text-rose"}`}>{riskLabel(engine.riskStatus)}</div>
        <p className="mt-3 text-sm leading-6 text-slate-300">{analysis.risk.stopLoss ? `${analysis.risk.method}: ${analysis.risk.stopLoss.toLocaleString()}` : analysis.risk.method}</p>
      </Card>
    </section>
  );
}

function ActiveModules({ engine }: { engine: VisualizationEngine }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {engine.modules.map((module) => (
        <article key={module.id} className="rounded-lg border border-white/10 bg-white/[0.045] p-4 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-mint/40 hover:bg-white/[0.07]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan">{module.alphaLabel}</p>
              <h3 className="mt-2 text-sm font-black text-white">{module.mode}</h3>
            </div>
            <StatusChip status={module.confidence > 0.72 ? "active" : "limited"} />
          </div>
          <div className="mt-4 flex items-end justify-between gap-3 rounded-md border border-mint/20 bg-mint/5 p-3">
            <span className="text-xs font-bold text-slate-300">모듈 Alpha Score</span>
            <strong className="text-3xl font-black text-mint">{module.moduleAlphaScore}</strong>
          </div>
          <div className="mt-4 space-y-2">
            {module.scores.slice(0, 3).map((score) => <Meter key={score.label} label={score.label} value={score.value} />)}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">{module.scoreReason}</p>
        </article>
      ))}
    </section>
  );
}

function SupplyFlowSection({ supply }: { supply: SupplyFlowAnalysis }) {
  if (!supply.active) {
    return (
      <Card title="수급 / 자본 흐름 분석">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm leading-6 text-slate-300">{supply.insights[0]}</p>
            <p className="mt-2 text-xs text-slate-500">{supply.degradation[0]}</p>
          </div>
          <MiniBadge tone="warn">Lite Supply Analysis</MiniBadge>
        </div>
      </Card>
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
      <Card title="Smart Money Flow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <MiniBadge tone={supply.lite ? "warn" : "good"}>{supply.mode}</MiniBadge>
            <MiniBadge tone="good">Alpha 조정 {supply.alphaAdjustment >= 0 ? "+" : ""}{supply.alphaAdjustment}</MiniBadge>
          </div>
          <p className="text-xs font-bold text-slate-400">최근 구간 강조 · 범례 토글 · 동적 스케일</p>
        </div>
        <SmartMoneyFlowChart supply={supply} />
      </Card>
      <div className="grid gap-5">
        <SmartMoneyGauge supply={supply} />
        <Card title="참여자 구성">
          <InvestorComposition supply={supply} />
        </Card>
      </div>
      <Card title="수급 강도 히트맵">
        <SupplyHeatmap supply={supply} />
      </Card>
      <Card title="수급 충돌 진단">
        <SupplyConflictPanel supply={supply} />
      </Card>
    </section>
  );
}

function SmartMoneyGauge({ supply }: { supply: SupplyFlowAnalysis }) {
  const score = supply.smartMoneyScore;
  const color = supplyColor(supply.scoreTone);
  const angle = -180 + (score / 100) * 180;
  const needleX = 100 + Math.cos((angle * Math.PI) / 180) * 68;
  const needleY = 96 + Math.sin((angle * Math.PI) / 180) * 68;
  return (
    <section className="rounded-lg border border-white/10 bg-panel/75 p-5 shadow-glow backdrop-blur transition hover:border-mint/35">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Smart Money Score</h2>
        <MiniBadge tone={supply.scoreTone === "bad" ? "bad" : supply.scoreTone === "weak" ? "warn" : "good"}>{supply.scoreLabel}</MiniBadge>
      </div>
      <svg viewBox="0 0 200 120" className="h-36 w-full">
        <path d="M30 96 A70 70 0 0 1 170 96" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="16" strokeLinecap="round" />
        <path d="M30 96 A70 70 0 0 1 170 96" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${score * 2.2} 220`} />
        <line x1="100" y1="96" x2={needleX} y2={needleY} stroke="white" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="96" r="5" fill={color} />
        <text x="100" y="70" textAnchor="middle" fill="white" fontSize="30" fontWeight="900">{score}</text>
        <text x="100" y="88" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="700">{Math.round(supply.confidence * 100)}% 신뢰도</text>
      </svg>
      <div className="mt-3 space-y-2">
        {supply.insights.slice(0, 3).map((insight) => <p key={insight} className="text-xs leading-5 text-slate-300">{insight}</p>)}
      </div>
    </section>
  );
}

function SmartMoneyFlowChart({ supply }: { supply: SupplyFlowAnalysis }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(70);
  const [pan, setPan] = useState(100);
  const visible = supply.columns.filter((series) => !hidden.has(series.key));
  const windowSize = Math.max(12, Math.round((zoom / 100) * supply.dates.length));
  const maxStart = Math.max(0, supply.dates.length - windowSize);
  const start = Math.round((pan / 100) * maxStart);
  const end = start + windowSize;
  const dates = supply.dates.slice(start, end);
  const aggregate = supply.aggregate.slice(start, end);
  const seriesValues = visible.map((series) => ({ ...series, values: series.values.slice(start, end) }));
  const width = 860;
  const PAD_RIGHT = 12;
  const chartHeight = 290;
  const xAxisTop = chartHeight + 16;
  const totalHeight = xAxisTop + 18;
  const allValues = [...aggregate, ...seriesValues.flatMap((series) => series.values)];
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 1);
  const span = max - min || 1;
  const xFor = (index: number) => dates.length <= 1 ? width / 2 : (index / (dates.length - 1)) * width;
  const yFor = (value: number) => chartHeight - 8 - ((value - min) / span) * (chartHeight - 24);
  const linePath = aggregate.length ? aggregate.map((value, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(1)},${yFor(value).toFixed(1)}`).join(" ") : "";
  const areaPath = linePath ? `${linePath} L${xFor(aggregate.length - 1)},${chartHeight - 8} L0,${chartHeight - 8} Z` : "";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {supply.columns.map((series) => (
            <button
              key={series.key}
              type="button"
              onClick={() => setHidden((prev) => {
                const next = new Set(prev);
                if (next.has(series.key)) next.delete(series.key);
                else next.add(series.key);
                return next;
              })}
              className={`rounded border px-2 py-1 text-xs font-bold transition ${hidden.has(series.key) ? "border-white/10 text-slate-500" : "border-white/20 text-slate-100 hover:border-mint/40"}`}
            >
              {series.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            확대
            <input type="range" min="25" max="100" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            이동
            <input type="range" min="0" max="100" value={pan} onChange={(event) => setPan(Number(event.target.value))} />
          </label>
        </div>
      </div>
      <div className="rounded-md border border-white/10 bg-slate-950/60 p-4 pb-2">
        <svg viewBox={`0 0 ${width + PAD_RIGHT} ${totalHeight}`} className="w-full" style={{ height: `${totalHeight * 0.72}px` }}>
          <path d={areaPath} fill="rgba(65,214,163,0.10)" stroke="none">
            <title>총 순자본 흐름</title>
          </path>
          <path d={linePath} fill="none" stroke="rgba(65,214,163,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {seriesValues.map((series) => {
            const color = flowCategoryColor(series.category);
            const d = series.values.map((value, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(1)},${yFor(value).toFixed(1)}`).join(" ");
            return <path key={series.key} d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><title>{series.label}</title></path>;
          })}
          {dates.slice(-8).map((date, offset) => {
            const index = dates.length - 8 + offset;
            return index >= 0 ? <rect key={`${date}-recent`} x={xFor(index) - 3} y="8" width="6" height={chartHeight - 20} fill="rgba(56,189,248,0.05)" /> : null;
          })}
          <line x1="0" y1={xAxisTop - 4} x2={width} y2={xAxisTop - 4} stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
          {dates.map((date, index) => {
            const step = Math.max(1, Math.ceil(dates.length / 9));
            if (index % step !== 0) return null;
            const label = String(date).length >= 10 ? String(date).slice(5, 10) : String(date).slice(0, 7);
            return (
              <g key={`${date}-${index}`}>
                <line x1={xFor(index)} y1="8" x2={xFor(index)} y2={chartHeight - 8} stroke="rgba(148,163,184,0.07)" strokeWidth="1" />
                <text x={xFor(index)} y={xAxisTop + 12} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">{label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function InvestorComposition({ supply }: { supply: SupplyFlowAnalysis }) {
  if (!supply.composition.length) return <p className="text-sm text-slate-400">구성 분석에 필요한 수급 컬럼이 부족합니다.</p>;
  return (
    <div>
      <div className="flex h-10 overflow-hidden rounded-md border border-white/10 bg-slate-950">
        {supply.composition.map((item) => (
          <div key={item.category} style={{ width: `${item.share * 100}%`, backgroundColor: item.color }} title={`${item.label}: ${Math.round(item.share * 100)}%`} />
        ))}
      </div>
      <div className="mt-4 grid gap-2">
        {supply.composition.map((item) => (
          <div key={item.category} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
            <span className="font-bold text-white">{Math.round(item.share * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SupplyHeatmap({ supply }: { supply: SupplyFlowAnalysis }) {
  if (!supply.heatmap.length) return <p className="text-sm text-slate-400">히트맵을 만들 수 있는 수급 시계열이 없습니다.</p>;
  return (
    <div className="grid grid-cols-12 gap-1 md:grid-cols-24">
      {supply.heatmap.slice(-72).map((cell, index) => (
        <div
          key={`${cell.date}-${index}`}
          title={`${cell.date}: ${formatAxis(cell.value)}`}
          className="h-6 rounded border border-white/5 transition hover:scale-110 hover:border-white/30"
          style={{ backgroundColor: heatColor(cell.intensity) }}
        />
      ))}
    </div>
  );
}

function SupplyConflictPanel({ supply }: { supply: SupplyFlowAnalysis }) {
  if (!supply.conflicts.length) {
    return <p className="rounded-md border border-mint/20 bg-mint/5 p-4 text-sm text-mint">심각한 수급 충돌은 감지되지 않았습니다. 현재 흐름은 Alpha Score를 크게 훼손하지 않습니다.</p>;
  }
  return (
    <div className="space-y-3">
      <MiniBadge tone="warn">Supply Conflict Detected</MiniBadge>
      {supply.conflicts.map((conflict) => (
        <div key={`${conflict.title}-${conflict.severity}`} className="rounded-md border border-amber/20 bg-amber/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-white">{conflict.title}</h3>
            <MiniBadge tone={conflict.severity === "HIGH" ? "bad" : conflict.severity === "MEDIUM" ? "warn" : "muted"}>{conflict.severity}</MiniBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{conflict.message}</p>
          <p className="mt-2 text-xs leading-5 text-amber">{conflict.guidance}</p>
        </div>
      ))}
    </div>
  );
}

function ModuleList({ modules }: { modules: VisualizationEngine["modules"] }) {
  return (
    <div className="space-y-4">
      {modules.map((module) => (
        <div key={module.id} className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan">{module.alphaLabel}</p>
              <h3 className="mt-1 font-bold text-white">{module.mode}</h3>
            </div>
            <MiniBadge tone={module.confidence > 0.72 ? "good" : "warn"}>{Math.round(module.confidence * 100)}%</MiniBadge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Info label="모듈 점수" value={`${module.moduleAlphaScore}점`} />
            <Info label="통합 기여" value={`${Math.round(module.unifiedContribution)}점`} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {module.charts.slice(0, 6).map((chart) => <Pill key={chart}>{chart}</Pill>)}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <SignalBucket title="사용 가능 신호" items={module.availableSignals} tone="good" />
            <SignalBucket title="누락 신호" items={module.missingSignals} tone="warn" />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">{module.scoreReason}</p>
        </div>
      ))}
    </div>
  );
}

function SignalBucket({ title, items, tone }: { title: string; items: string[]; tone: Tone }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <p className={`mb-2 text-xs font-black uppercase tracking-[0.16em] ${tone === "good" ? "text-mint" : "text-amber"}`}>{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {(items.length ? items : ["없음"]).slice(0, 10).map((item) => <Pill key={item} tone={tone}>{item}</Pill>)}
      </div>
    </div>
  );
}

function ColumnTable({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-slate-400"><tr><th className="py-2">표준 컬럼</th><th>원본 컬럼</th><th>방식</th><th>신뢰도</th></tr></thead>
        <tbody>
          {analysis.mapping.map((m) => <tr key={`${m.canonical}-${m.source}`} className="border-t border-line"><td className="py-2 text-white">{m.canonical}</td><td>{m.source}</td><td>{m.method}</td><td>{Math.round(m.confidence * 100)}%</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function TechnicalTab({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const technicalModules = engine.modules.filter((m) => ["ohlcv", "flow", "short", "options", "valuation", "sentiment"].includes(m.id));
  return (
    <div className="space-y-5">
      <SupplyFlowSection supply={engine.supply} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="기술적·수급 Alpha 모듈">
          <ModuleList modules={technicalModules.length ? technicalModules : engine.modules} />
        </Card>
      <Card title="피처 기여도">
        <div className="space-y-4">
          {analysis.features.map((f) => <Meter key={f.name} label={`${f.name} · ${f.note}`} value={Math.round(f.score * 100)} suffix={`${f.contribution}점`} />)}
        </div>
      </Card>
      <Card title="활성화된 시각화">
        <div className="flex flex-wrap gap-2">{engine.activatedCharts.map((chart) => <Pill key={chart}>{chart}</Pill>)}</div>
      </Card>
      <Card title="컬럼 매핑 결과">
        <ColumnTable analysis={analysis} />
      </Card>
      </div>
    </div>
  );
}

function RiskTab({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  const riskModules = engine.modules.filter((m) => ["macro", "short", "options", "portfolio", "onchain", "calendar", "news"].includes(m.id));
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="리스크·매크로 Alpha 모듈">
        <ModuleList modules={riskModules.length ? riskModules : engine.modules} />
      </Card>
      <Card title="신호 검증">
        <div className="grid gap-3">
          {analysis.validations.map((v) => <Badge key={v.label} label={v.label} value={v.value} tone={v.status} />)}
        </div>
      </Card>
      <Card title="신호 충돌">
        {analysis.conflicts.length ? <List items={analysis.conflicts.map((c) => `[${c.severity}] ${c.message}`)} /> : <p className="text-sm text-slate-300">감지된 충돌이 없습니다.</p>}
      </Card>
      <Card title="가져오기 상세">
        <List items={importDetails(analysis)} />
      </Card>
    </div>
  );
}

function InsightTab(props: {
  analysis: AnalysisResult;
  engine: VisualizationEngine;
  scenario: Scenario;
  effectiveScenario: Scenario;
  capabilities: SimulationCapabilities;
  setScenario: (s: Scenario) => void;
  simulatedScore: number;
  simulatedSupply: SupplyFlowAnalysis;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="AI 인사이트 렌더링">
          <List items={props.engine.insights} />
        </Card>
        <Card title="왜 이 점수인가">
          <List items={props.engine.modules.map((module) => `${module.alphaLabel}: ${module.scoreReason}`)} />
        </Card>
        <Card title="판단 추론 로그">
          <List items={props.analysis.reasoningLog} ordered />
          <p className="mt-5 rounded-md border border-line bg-slate-950 p-4 text-sm leading-6 text-slate-300">{props.analysis.interpretation}</p>
        </Card>
      </div>
      <WhatIfTab {...props} />
    </div>
  );
}

function BuyTab({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="투자 판단 요약">
        <div className="grid gap-3">
          <Info label="최종 판단" value={analysis.finalDecision} strong />
          <Info label="기본 판단" value={analysis.baseDecision} />
          <Info label="레짐" value={analysis.regime.label} />
          <Info label="리스크 기준" value={analysis.risk.stopLoss ? `${analysis.risk.method}: ${analysis.risk.stopLoss.toLocaleString()}` : analysis.risk.method} />
        </div>
      </Card>
      <Card title="보정 사유">
        <List items={analysis.adjustmentReasons} />
      </Card>
      <Card title="판단 추론 로그">
        <List items={analysis.reasoningLog} ordered />
        <p className="mt-5 rounded-md border border-line bg-slate-950 p-4 text-sm leading-6 text-slate-300">{analysis.interpretation}</p>
      </Card>
    </div>
  );
}

function MarketChartSection({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-cyan/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.94)_52%,rgba(8,47,73,0.56))] p-4 shadow-[0_32px_130px_rgba(0,0,0,0.58),0_0_65px_rgba(56,189,248,0.14)] transition duration-300 hover:border-cyan/35">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mint/70 to-transparent" />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan">INSTITUTIONAL CHART WORKSPACE</p>
          <h2 className="mt-1 text-2xl font-black text-white">Market Structure Analysis · {engine.primaryModule.charts[0]}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <MiniBadge tone="good">{engine.primaryModule.mode}</MiniBadge>
          <MiniBadge tone={recoveryTone(analysis)}>{recoveryStatus(analysis).toUpperCase()}</MiniBadge>
          <MiniBadge tone={qualityTone(analysis.quality.total)}>AUTO PARSED</MiniBadge>
        </div>
      </div>
      <LineChart data={analysis.chart} />
      <div className="mt-4 flex flex-wrap gap-2">
        {engine.primaryModule.chips.map((chip) => <Pill key={chip} tone="good">{chip}</Pill>)}
        {analysis.forcedRecoveryApplied ? <Pill tone="warn">Forced Recovery Applied</Pill> : null}
        {analysis.liteMode ? <Pill tone="warn">Lite Alpha Score</Pill> : null}
        {[...engine.primaryModule.degradation, ...analysis.degradation].slice(0, 6).map((item) => <Pill key={item} tone="muted">{item}</Pill>)}
      </div>
    </section>
  );
}

function CoreSignals({ analysis, engine }: { analysis: AnalysisResult; engine: VisualizationEngine }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <SignalCard label="통합 Alpha Score" value={String(engine.unifiedAlphaScore)} detail={engine.blendMode === "weighted" ? "가중 결합" : "단일 모듈"} tone={qualityTone(engine.unifiedAlphaScore)} />
      <SmartMoneyMiniCard supply={engine.supply} />
      <SignalCard label="활성 Alpha 모듈" value={engine.primaryModule.alphaLabel.replace(" Alpha", "")} detail={`${engine.primaryModule.moduleAlphaScore}점`} tone="good" />
      <SignalCard label="리스크 상태" value={riskLabel(engine.riskStatus)} detail={analysis.regime.label} tone={engine.riskTone} />
      <SignalCard label="모듈 수" value={String(engine.modules.length)} detail={`${engine.columnCoverage}% 커버리지`} tone={engine.modules.length > 1 ? "good" : "warn"} />
    </section>
  );
}

function SmartMoneyMiniCard({ supply }: { supply: SupplyFlowAnalysis }) {
  const tone: Tone = supply.scoreTone === "bad" ? "bad" : supply.scoreTone === "weak" || supply.scoreTone === "neutral" ? "warn" : "good";
  return (
    <article className="group rounded-lg border border-cyan/25 bg-[linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.72))] p-4 text-cyan transition duration-300 hover:-translate-y-0.5 hover:bg-slate-900/95">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Smart Money Score</p>
        <MiniBadge tone={tone}>{supply.active ? supply.scoreLabel : "비활성"}</MiniBadge>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <strong className="text-3xl font-black leading-none text-current md:text-4xl">{supply.smartMoneyScore}</strong>
        <span className="max-w-[9rem] text-right text-xs font-bold leading-5 text-slate-300">Alpha {supply.alphaAdjustment >= 0 ? "+" : ""}{supply.alphaAdjustment}</span>
      </div>
    </article>
  );
}

function WhyTab({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="피처 기여도">
        <div className="space-y-4">
          {analysis.features.map((f) => <Meter key={f.name} label={`${f.name} · ${f.note}`} value={Math.round(f.score * 100)} suffix={`${f.contribution}점`} />)}
        </div>
      </Card>
      <Card title="신호 검증">
        <div className="grid gap-3">
          {analysis.validations.map((v) => <Badge key={v.label} label={v.label} value={v.value} tone={v.status} />)}
        </div>
      </Card>
      <Card title="신호 충돌">
        {analysis.conflicts.length ? <List items={analysis.conflicts.map((c) => `[${c.severity}] ${c.message}`)} /> : <p className="text-sm text-slate-300">감지된 충돌이 없습니다.</p>}
        <div className="mt-4"><Pill tone={analysis.backtestEnabled ? "good" : "warn"}>백테스트 {analysis.backtestEnabled ? "가능" : "비활성"}</Pill></div>
      </Card>
      <Card title="Import Details">
        <List items={importDetails(analysis)} />
      </Card>
      {analysis.sanitizeLog.preprocessingLog.length > 0 && (
        <Card title="데이터 전처리 로그">
          <List items={analysis.sanitizeLog.preprocessingLog} />
        </Card>
      )}
      <Card title="Data Sanitize Log">
        <List items={[...analysis.sanitizeLog.steps, ...analysis.sanitizeLog.warnings]} />
      </Card>
      <Card title="Quality Penalty Breakdown">
        <div className="space-y-3">
          <Meter label="완전성" value={analysis.quality.completeness} />
          <Meter label="기간 충분성" value={analysis.quality.period} />
          <Meter label="이상치 안정성" value={analysis.quality.outlier} />
          <Info label="Sanitize penalty" value={`${analysis.quality.sanitizePenalty}점`} />
          <Info label="Forced recovery penalty" value={`${analysis.quality.forcedRecoveryPenalty}점`} />
        </div>
      </Card>
      <Card title="Column Mapping Result">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400"><tr><th className="py-2">표준 컬럼</th><th>원본 컬럼</th><th>방식</th><th>신뢰도</th></tr></thead>
            <tbody>
              {analysis.mapping.map((m) => <tr key={`${m.canonical}-${m.source}`} className="border-t border-line"><td className="py-2 text-white">{m.canonical}</td><td>{m.source}</td><td>{m.method}</td><td>{Math.round(m.confidence * 100)}%</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function WhatIfTab({
  analysis,
  engine,
  scenario,
  effectiveScenario,
  capabilities,
  setScenario,
  simulatedScore,
  simulatedSupply
}: {
  analysis: AnalysisResult;
  engine: VisualizationEngine;
  scenario: Scenario;
  effectiveScenario: Scenario;
  capabilities: SimulationCapabilities;
  setScenario: (s: Scenario) => void;
  simulatedScore: number;
  simulatedSupply: SupplyFlowAnalysis;
}) {
  const adjustedScore = Math.max(0, Math.min(100, simulatedScore + simulatedSupply.alphaAdjustment));
  const delta = adjustedScore - analysis.alphaScore;
  const smartDelta = simulatedSupply.smartMoneyScore - engine.supply.smartMoneyScore;
  const hasFlowData = capabilities.foreign.status === "active" && capabilities.institution.status === "active";
  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card title="시뮬레이션 입력">
        {hasFlowData && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">
            <div className="h-1.5 w-1.5 rounded-full bg-mint" />
            수급 데이터 기반 시뮬레이션 활성화
          </div>
        )}
        <div className="space-y-4">
          <Slider label="가격 변화율" value={scenario.price} min={-20} max={20} step={1} suffix="%" capability={capabilities.price} onChange={(price) => setScenario({ ...scenario, price })} />
          <Slider label="거래량 배율" value={scenario.volume} min={0.2} max={3} step={0.1} suffix="x" capability={capabilities.volume} onChange={(volume) => setScenario({ ...scenario, volume })} />
          <Slider label="외국인 순매수" value={scenario.foreign} min={-1000000} max={1000000} step={50000} suffix="" capability={capabilities.foreign} onChange={(foreign) => setScenario({ ...scenario, foreign })} />
          <Slider label="기관 순매수" value={scenario.institution} min={-1000000} max={1000000} step={50000} suffix="" capability={capabilities.institution} onChange={(institution) => setScenario({ ...scenario, institution })} />
          <Slider label="VIX 변화" value={scenario.vix} min={-10} max={10} step={1} suffix="pt" capability={capabilities.vix} onChange={(vix) => setScenario({ ...scenario, vix })} />
          <FlowSlider label="기관성 자금 유입" value={scenario.institutionalFlow} onChange={(institutionalFlow) => setScenario({ ...scenario, institutionalFlow })} />
          <FlowSlider label="외국인 자금 흐름" value={scenario.foreignFlow} onChange={(foreignFlow) => setScenario({ ...scenario, foreignFlow })} />
          <FlowSlider label="개인 추격 매수" value={scenario.retailFlow} onChange={(retailFlow) => setScenario({ ...scenario, retailFlow })} />
          <FlowSlider label="총 자본 흐름" value={scenario.aggregateFlow} onChange={(aggregateFlow) => setScenario({ ...scenario, aggregateFlow })} />
          <FlowSlider label="딜러 포지셔닝" value={scenario.dealerFlow} onChange={(dealerFlow) => setScenario({ ...scenario, dealerFlow })} />
          <FlowSlider label="ETF 유입/유출" value={scenario.etfFlow} onChange={(etfFlow) => setScenario({ ...scenario, etfFlow })} />
          <FlowSlider label="고래 매집" value={scenario.whaleFlow} onChange={(whaleFlow) => setScenario({ ...scenario, whaleFlow })} />
        </div>
      </Card>
      <Card title="Alpha Score 변화">
        <div className="flex items-end gap-4">
          <span className="text-6xl font-bold text-white">{adjustedScore}</span>
          <span className={`pb-3 text-2xl font-bold ${delta >= 0 ? "text-mint" : "text-rose"}`}>{delta >= 0 ? "+" : ""}{delta}</span>
        </div>
        <div className="mt-5 rounded-md border border-cyan/20 bg-cyan/5 p-4">
          <p className="text-sm leading-6 text-cyan">Smart Money Score {simulatedSupply.smartMoneyScore}점 ({smartDelta >= 0 ? "+" : ""}{smartDelta}) · 수급 Alpha 조정 {simulatedSupply.alphaAdjustment >= 0 ? "+" : ""}{simulatedSupply.alphaAdjustment}점</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{flowActionBanner(delta, simulatedSupply)}</p>
        </div>
        <LineChart data={analysis.chart.map((p, i, arr) => i === arr.length - 1 ? { ...p, close: p.close * (1 + effectiveScenario.price / 100) } : p)} />
      </Card>
    </div>
  );
}

function LineChart({ data }: { data: AnalysisResult["chart"] }) {
  const [zoom, setZoom] = useState(72);
  const [pan, setPan] = useState(100);
  const [tool, setTool] = useState<DrawTool>("cursor");
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [draft, setDraft] = useState<ChartDrawing | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; index: number } | null>(null);
  const [showMa, setShowMa] = useState(true);
  const [showTrend, setShowTrend] = useState(true);
  const [showVolatility, setShowVolatility] = useState(true);
  const windowSize = Math.max(24, Math.round((zoom / 100) * data.length));
  const maxStart = Math.max(0, data.length - windowSize);
  const start = Math.round((pan / 100) * maxStart);
  const points = data.slice(start, start + windowSize);
  const width = 860;
  const PAD_RIGHT = 82;  // space for y-axis price labels
  const height = 560;
  const priceTop = 24;
  const priceHeight = 365;
  const volumeTop = 430;
  const volumeHeight = 72;
  const xAxisTop = volumeTop + volumeHeight + 10;
  const priceValues = points.flatMap((p) => [p.high ?? p.close, p.low ?? p.close, p.open ?? p.close, p.close]);
  const min = Math.min(...priceValues);
  const max = Math.max(...priceValues);
  const span = max - min || 1;
  const volumes = points.map((p) => p.volume ?? 0);
  const maxVolume = Math.max(...volumes, 1);
  const slot = width / Math.max(points.length, 1);
  const candleWidth = Math.max(4, Math.min(14, slot * 0.58));
  const volumeWidth = Math.max(3, Math.min(12, slot * 0.64));
  const xFor = (i: number) => points.length === 1 ? width / 2 : (i / (points.length - 1)) * width;
  const yFor = (price: number) => priceTop + priceHeight - ((price - min) / span) * priceHeight;
  const ma20Path = movingAveragePath(points.map((p) => p.close), 20, xFor, yFor);
  const trend = linearTrend(points.map((p) => p.close));
  const trendColor = trend && trend.end < trend.start ? "#fb3d66" : "#3b82f6";
  const trendPath = trend
    ? `M${xFor(0).toFixed(1)},${yFor(trend.start).toFixed(1)} L${xFor(points.length - 1).toFixed(1)},${yFor(trend.end).toFixed(1)}`
    : "";
  const volatilityBand = volatilityBandPath(points, xFor, yFor);
  const last = points[points.length - 1];
  const lastY = last ? yFor(last.close) : 0;
  const axisTicks = Array.from({ length: 5 }, (_item, i) => max - (span / 4) * i);
  const activePoint = crosshair ? points[crosshair.index] : null;
  const tools: Array<{ id: DrawTool; label: string }> = [
    { id: "cursor", label: "Cursor" },
    { id: "trend", label: "Trend" },
    { id: "support", label: "S/R" },
    { id: "fib", label: "Fib" },
    { id: "zone", label: "Zone" },
    { id: "channel", label: "Channel" },
    { id: "ray", label: "Ray" },
    { id: "rect", label: "Rect" },
    { id: "label", label: "Label" }
  ];
  const pointerPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height
    };
  };
  const updateCrosshair = (point: { x: number; y: number }) => {
    const index = Math.max(0, Math.min(points.length - 1, Math.round((point.x / width) * (points.length - 1))));
    setCrosshair({ ...point, index });
  };
  const beginDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = pointerPoint(event);
    updateCrosshair(point);
    if (tool === "cursor") return;
    setDraft({ id: Date.now(), tool, start: point, end: point, text: tool === "label" ? "AI NOTE" : undefined });
  };
  const moveDrawing = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = pointerPoint(event);
    updateCrosshair(point);
    if (draft) setDraft({ ...draft, end: point });
  };
  const commitDrawing = () => {
    if (!draft) return;
    const distance = Math.hypot(draft.end.x - draft.start.x, draft.end.y - draft.start.y);
    if (distance > 8 || draft.tool === "support" || draft.tool === "label") setDrawings((items) => [...items, draft]);
    setDraft(null);
  };
  return (
    <div className="group/chart relative mt-3 overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.16),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.74),rgba(2,6,23,0.98))] p-3 shadow-inner transition duration-300 hover:border-mint/30">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {tools.map((item) => (
            <button key={item.id} type="button" onClick={() => setTool(item.id)} className={`rounded border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] transition ${tool === item.id ? "border-cyan/60 bg-cyan/15 text-cyan shadow-[0_0_18px_rgba(56,189,248,0.16)]" : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan/30 hover:text-white"}`}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => setDrawings([])} className="rounded border border-rose/25 bg-rose/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-rose transition hover:border-rose/50">Clear</button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showMa} onChange={(event) => setShowMa(event.target.checked)} />MA</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showTrend} onChange={(event) => setShowTrend(event.target.checked)} />Trend</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showVolatility} onChange={(event) => setShowVolatility(event.target.checked)} />Volatility</label>
        </div>
      </div>
      <div className="relative h-[580px] overflow-hidden rounded-md border border-cyan/10 bg-slate-950/70 md:h-[700px]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:64px_58px] opacity-55 transition group-hover/chart:opacity-70" />
        {activePoint ? (
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-md border border-cyan/20 bg-slate-950/85 px-3 py-2 text-xs shadow-[0_0_24px_rgba(56,189,248,0.12)] backdrop-blur">
            <p className="font-black uppercase tracking-[0.18em] text-cyan">{activePoint.date}</p>
            <p className="mt-1 text-slate-300">O {formatAxis(activePoint.open ?? activePoint.close)} · H {formatAxis(activePoint.high ?? activePoint.close)} · L {formatAxis(activePoint.low ?? activePoint.close)} · C {formatAxis(activePoint.close)}</p>
          </div>
        ) : null}
        <svg
          viewBox={`0 0 ${width + PAD_RIGHT} ${height}`}
          className="relative z-[1] h-full w-full cursor-crosshair overflow-visible"
          onPointerDown={beginDrawing}
          onPointerMove={moveDrawing}
          onPointerUp={commitDrawing}
          onPointerLeave={() => { setCrosshair(null); setDraft(null); }}
        >
        {axisTicks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line x1="0" y1={y} x2={width} y2={y} stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
              <text x={width + 10} y={y + 4} fill="#94a3b8" fontSize="12" fontWeight="700">{formatAxis(tick)}</text>
            </g>
          );
        })}
        {points.map((_p, i) => i % Math.max(1, Math.ceil(points.length / 9)) === 0 ? <line key={i} x1={xFor(i)} y1="0" x2={xFor(i)} y2={volumeTop + volumeHeight} stroke="rgba(148,163,184,0.09)" strokeWidth="1" /> : null)}
        {last ? (
          <g>
            <line x1="0" y1={lastY} x2={width} y2={lastY} stroke="#fb3d66" strokeWidth="1" strokeDasharray="2 4" />
            <rect x={width + 8} y={lastY - 13} width="70" height="26" rx="4" fill="#fb3d66" />
            <text x={width + 43} y={lastY + 5} fill="white" fontSize="12" fontWeight="800" textAnchor="middle">{formatAxis(last.close)}</text>
          </g>
        ) : null}
        {showVolatility && volatilityBand ? <path d={volatilityBand} fill="rgba(56,189,248,0.09)" stroke="rgba(56,189,248,0.26)" strokeWidth="1.5" /> : null}
        {showTrend && trendPath ? <path d={trendPath} fill="none" stroke={trendColor} strokeWidth="3" strokeDasharray="9 9" strokeLinecap="round" opacity="0.9" /> : null}
        {showMa && ma20Path ? <path d={ma20Path} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {points.map((p, i) => {
          const x = xFor(i);
          const open = p.open ?? points[i - 1]?.close ?? p.close;
          const high = p.high ?? Math.max(open, p.close);
          const low = p.low ?? Math.min(open, p.close);
          const rising = p.close >= open;
          const color = rising ? "#22d3ee" : "#fb3d66";
          const bodyTop = yFor(Math.max(open, p.close));
          const bodyBottom = yFor(Math.min(open, p.close));
          const bodyHeight = Math.max(2, bodyBottom - bodyTop);
          return (
            <g key={`${p.date}-candle-${i}`}>
              <line x1={x} y1={yFor(high)} x2={x} y2={yFor(low)} stroke={color} strokeWidth="2" strokeLinecap="round" />
              <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1.5" fill={color} />
            </g>
          );
        })}
        {points.map((p, i) => {
          const volume = p.volume ?? 0;
          const barHeight = Math.max(2, (volume / maxVolume) * volumeHeight);
          const open = p.open ?? points[i - 1]?.close ?? p.close;
          const fill = p.close >= open ? "rgba(34,211,238,0.54)" : "rgba(251,61,102,0.54)";
          return <rect key={`${p.date}-volume-${i}`} x={xFor(i) - volumeWidth / 2} y={volumeTop + volumeHeight - barHeight} width={volumeWidth} height={barHeight} rx="1.5" fill={fill} />;
        })}
        {[...drawings, ...(draft ? [draft] : [])].map((drawing) => <DrawingObject key={drawing.id} drawing={drawing} width={width} />)}
        {crosshair ? (
          <g pointerEvents="none">
            <line x1={crosshair.x} y1="0" x2={crosshair.x} y2={height} stroke="rgba(125,211,252,0.48)" strokeWidth="1" strokeDasharray="3 5" />
            <line x1="0" y1={crosshair.y} x2={width} y2={crosshair.y} stroke="rgba(125,211,252,0.38)" strokeWidth="1" strokeDasharray="3 5" />
          </g>
        ) : null}
        <line x1="0" y1={volumeTop - 12} x2={width} y2={volumeTop - 12} stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
        <text x="0" y={volumeTop + volumeHeight + 15} fill="#64748b" fontSize="11" fontWeight="800">VOLUME</text>
        {showTrend ? <text x={width - 6} y="16" fill={trendColor} fontSize="11" fontWeight="800" textAnchor="end">TREND</text> : null}
        {showMa ? <text x={width - 80} y="16" fill="#3b82f6" fontSize="11" fontWeight="800" textAnchor="end">MA20</text> : null}
        {/* X-axis date labels */}
        <line x1="0" y1={xAxisTop - 4} x2={width} y2={xAxisTop - 4} stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
        {points.map((p, i) => {
          const step = Math.max(1, Math.ceil(points.length / 10));
          if (i % step !== 0) return null;
          const label = String(p.date).length >= 10 ? String(p.date).slice(5, 10) : String(p.date).slice(0, 7);
          return (
            <text key={`xdate-${i}`} x={xFor(i)} y={xAxisTop + 12} fill="#64748b" fontSize="10" fontWeight="600" textAnchor="middle">{label}</text>
          );
        })}
        </svg>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          Zoom
          <input className="w-full" type="range" min="24" max="100" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
        </label>
        <label className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          Pan
          <input className="w-full" type="range" min="0" max="100" value={pan} onChange={(event) => setPan(Number(event.target.value))} />
        </label>
      </div>
    </div>
  );
}

function DrawingObject({ drawing, width }: { drawing: ChartDrawing; width: number }) {
  const { start, end } = drawing;
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  if (drawing.tool === "support") {
    return <line x1="0" y1={start.y} x2={width} y2={start.y} stroke="#38bdf8" strokeWidth="2" strokeDasharray="8 6" opacity="0.8" />;
  }
  if (drawing.tool === "fib") {
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    return (
      <g>
        {levels.map((level) => {
          const yy = start.y + (end.y - start.y) * level;
          return (
            <g key={level}>
              <line x1={Math.min(start.x, end.x)} y1={yy} x2={Math.max(start.x, end.x)} y2={yy} stroke="#f8bf4c" strokeWidth="1.2" opacity="0.76" />
              <text x={Math.max(start.x, end.x) + 6} y={yy + 4} fill="#f8bf4c" fontSize="10" fontWeight="800">{Math.round(level * 100)}%</text>
            </g>
          );
        })}
      </g>
    );
  }
  if (drawing.tool === "zone" || drawing.tool === "rect") {
    return <rect x={x} y={y} width={Math.max(4, w)} height={Math.max(4, h)} fill="rgba(56,189,248,0.12)" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray={drawing.tool === "zone" ? "7 5" : undefined} />;
  }
  if (drawing.tool === "channel") {
    const offset = 34;
    return (
      <g stroke="#41d6a3" strokeWidth="2" opacity="0.78">
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
        <line x1={start.x} y1={start.y + offset} x2={end.x} y2={end.y + offset} strokeDasharray="7 6" />
      </g>
    );
  }
  if (drawing.tool === "ray") {
    const dx = end.x - start.x || 1;
    const dy = end.y - start.y;
    const rayEndY = start.y + dy * ((width - start.x) / dx);
    return <line x1={start.x} y1={start.y} x2={width} y2={rayEndY} stroke="#38bdf8" strokeWidth="2" opacity="0.78" />;
  }
  if (drawing.tool === "label") {
    return (
      <g>
        <rect x={start.x} y={start.y - 22} width="78" height="24" rx="4" fill="rgba(15,23,42,0.92)" stroke="#38bdf8" />
        <text x={start.x + 39} y={start.y - 6} fill="#e0f2fe" fontSize="10" fontWeight="900" textAnchor="middle">{drawing.text}</text>
      </g>
    );
  }
  return <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#38bdf8" strokeWidth="2.4" opacity="0.82" />;
}

function movingAveragePath(values: number[], period: number, xFor: (i: number) => number, yFor: (price: number) => number) {
  const points = values
    .map((value, i) => {
      if (i < period - 1) return null;
      const slice = values.slice(i - period + 1, i + 1);
      const average = slice.reduce((sum, item) => sum + item, 0) / period;
      return `${i === period - 1 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(average).toFixed(1)}`;
    })
    .filter(Boolean);
  return points.join(" ");
}

function volatilityBandPath(points: AnalysisResult["chart"], xFor: (i: number) => number, yFor: (price: number) => number) {
  if (points.length < 20) return "";
  const closes = points.map((point) => point.close);
  const upper: string[] = [];
  const lower: string[] = [];
  closes.forEach((_close, index) => {
    if (index < 19) return;
    const slice = closes.slice(index - 19, index + 1);
    const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    const variance = slice.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / slice.length;
    const deviation = Math.sqrt(variance);
    upper.push(`${index === 19 ? "M" : "L"}${xFor(index).toFixed(1)},${yFor(mean + deviation * 1.8).toFixed(1)}`);
    lower.unshift(`L${xFor(index).toFixed(1)},${yFor(mean - deviation * 1.8).toFixed(1)}`);
  });
  return upper.length ? `${upper.join(" ")} ${lower.join(" ")} Z` : "";
}

function formatAxis(value: number) {
  return value >= 1000 ? Math.round(value).toLocaleString() : value.toFixed(2);
}

function linearTrend(values: number[]) {
  if (values.length < 2) return null;
  const n = values.length;
  const sumX = values.reduce((sum, _value, i) => sum + i, 0);
  const sumY = values.reduce((sum, value) => sum + value, 0);
  const sumXY = values.reduce((sum, value, i) => sum + i * value, 0);
  const sumXX = values.reduce((sum, _value, i) => sum + i * i, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (!denominator) return null;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { start: intercept, end: slope * (n - 1) + intercept };
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-white/10 bg-panel/75 p-5 shadow-glow backdrop-blur transition hover:border-slate-500/80">{title ? <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2> : null}{children}</section>;
}

function Badge({ label, value, tone = "muted" }: { label: string; value: string; tone?: Tone }) {
  const color = tone === "good" ? "border-mint/40 text-mint" : tone === "warn" ? "border-amber/50 text-amber" : tone === "bad" ? "border-rose/50 text-rose" : "border-line text-slate-300";
  return <div className={`rounded-lg border bg-panel/80 p-4 ${color}`}><div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-1 text-sm font-bold">{value}</div></div>;
}

function MiniBadge({ children, tone = "muted" }: { children: React.ReactNode; tone?: Tone }) {
  const color = tone === "good" ? "border-mint/40 bg-mint/10 text-mint shadow-[0_0_18px_rgba(65,214,163,0.16)]" : tone === "warn" ? "border-amber/40 bg-amber/10 text-amber shadow-[0_0_18px_rgba(248,191,76,0.12)]" : tone === "bad" ? "border-rose/40 bg-rose/10 text-rose shadow-[0_0_18px_rgba(251,113,133,0.12)]" : "border-white/10 bg-white/5 text-slate-300";
  return <span className={`rounded border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${color}`}>{children}</span>;
}

function SignalCard({ label, value, detail, tone }: { label: string; value: string; detail: React.ReactNode; tone: Tone }) {
  const color = tone === "good" ? "text-mint border-mint/30 shadow-[0_0_34px_rgba(65,214,163,0.12)]" : tone === "warn" ? "text-amber border-amber/30 shadow-[0_0_34px_rgba(248,191,76,0.1)]" : tone === "bad" ? "text-rose border-rose/30 shadow-[0_0_34px_rgba(251,113,133,0.1)]" : "text-cyan border-cyan/25";
  return (
    <article className={`group rounded-lg border bg-[linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.72))] p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-slate-900/95 ${color}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_18px_currentColor]" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <strong className="text-3xl font-black leading-none text-current md:text-4xl">{value}</strong>
        <span className="max-w-[9rem] text-right text-xs font-bold leading-5 text-slate-300">{detail}</span>
      </div>
    </article>
  );
}

function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: Tone }) {
  const color = tone === "good" ? "bg-mint/15 text-mint" : tone === "warn" ? "bg-amber/15 text-amber" : tone === "bad" ? "bg-rose/15 text-rose" : "bg-slate-700 text-slate-200";
  return <span className={`rounded px-3 py-1 text-xs font-bold ${color}`}>{children}</span>;
}

function Info({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-slate-950 px-4 py-3"><span className="text-sm text-slate-400">{label}</span><span className={`${strong ? "text-xl text-mint" : "text-sm text-white"} font-bold text-right`}>{value}</span></div>;
}

function Meter({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return <div><div className="mb-2 flex justify-between text-sm"><span className="text-slate-300">{label}</span><span className="font-bold text-white">{suffix ?? `${value}%`}</span></div><div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-mint" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}

function List({ items, ordered }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return <Tag className={`space-y-2 text-sm leading-6 text-slate-300 ${ordered ? "list-decimal" : "list-disc"} pl-5`}>{items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>기록 없음</li>}</Tag>;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  capability,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  capability: SimulationCapability;
  onChange: (n: number) => void;
}) {
  const disabled = capability.status === "unavailable";
  return (
    <label className={`block rounded-lg border p-4 transition ${disabled ? "border-amber/20 bg-slate-950/45 opacity-70 shadow-[0_0_24px_rgba(248,191,76,0.06)]" : "border-white/10 bg-slate-950/25 hover:border-mint/30"}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className={disabled ? "text-slate-400" : "text-slate-200"}>{label}</span>
          <StatusChip status={capability.status} />
        </div>
        <span className={`font-bold ${disabled ? "text-slate-500" : "text-white"}`}>{value.toLocaleString()}{suffix}</span>
      </div>
      <input
        className={`w-full ${disabled ? "cursor-not-allowed opacity-55 grayscale" : ""}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className={`mt-3 text-xs leading-5 ${disabled ? "text-amber" : capability.status === "limited" ? "text-amber" : "text-slate-500"}`}>
        {disabled ? "Warning: " : capability.status === "limited" ? "Limited: " : "Active: "}
        {capability.reason}
      </p>
    </label>
  );
}

function FlowSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block rounded-lg border border-white/10 bg-slate-950/25 p-4 transition hover:border-cyan/30">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-200">{label}</span>
        <span className="font-bold text-white">{value >= 0 ? "+" : ""}{value.toLocaleString()}</span>
      </div>
      <input className="w-full" type="range" min={-1000000} max={1000000} step={50000} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <p className="mt-2 text-xs leading-5 text-slate-500">수급 What-if 입력은 Smart Money Score, Alpha delta, 수급 충돌 진단에 반영됩니다.</p>
    </label>
  );
}

function flowActionBanner(delta: number, supply: SupplyFlowAnalysis) {
  if (!supply.active) return "수급 데이터가 부족해 가격/거래량 중심 시뮬레이션만 반영됩니다.";
  if (supply.conflicts.some((conflict) => conflict.severity === "HIGH")) return "강한 수급 충돌이 감지되어 액션 강도가 하향될 수 있습니다.";
  if (delta >= 7) return "강한 자본 유입이 Alpha Score를 의미 있게 끌어올립니다.";
  if (delta <= -7) return "자본 유출 또는 충돌로 최종 액션 강도가 약해질 수 있습니다.";
  return "수급 변화는 감지되지만 현재 액션을 크게 뒤집을 정도는 아닙니다.";
}

function supplyColor(tone: SupplyFlowAnalysis["scoreTone"]) {
  if (tone === "good") return "#22c55e";
  if (tone === "positive") return "#38bdf8";
  if (tone === "neutral") return "#f8bf4c";
  if (tone === "weak") return "#fb923c";
  return "#fb3d66";
}

function flowCategoryColor(category: string) {
  const colors: Record<string, string> = {
    institutional: "#41d6a3",
    foreign: "#38bdf8",
    retail: "#fb923c",
    dealer: "#60a5fa",
    broker: "#22c55e",
    whale: "#14b8a6",
    etf: "#a3e635",
    aggregate: "#94a3b8",
    inflow: "#84cc16",
    outflow: "#fb7185"
  };
  return colors[category] ?? "#94a3b8";
}

function heatColor(intensity: number) {
  if (intensity >= 0.72) return "rgba(34,197,94,0.85)";
  if (intensity >= 0.55) return "rgba(65,214,163,0.55)";
  if (intensity >= 0.45) return "rgba(148,163,184,0.36)";
  if (intensity >= 0.28) return "rgba(251,146,60,0.58)";
  return "rgba(251,61,102,0.76)";
}

function StatusChip({ status }: { status: SimulationStatus }) {
  const style = status === "active"
    ? "border-mint/40 bg-mint/10 text-mint"
    : status === "limited"
      ? "border-amber/40 bg-amber/10 text-amber"
      : "border-slate-500/40 bg-slate-600/10 text-slate-300";
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${style}`}>{status}</span>;
}

function signalLevel(score: number, inverseGood = false): { value: string; tone: Tone } {
  const normalized = inverseGood ? score : 1 - score;
  if (normalized >= 0.68) return { value: "LOW", tone: "good" };
  if (normalized >= 0.42) return { value: "MEDIUM", tone: "warn" };
  return { value: "HIGH", tone: "bad" };
}

function trendSignal(analysis: AnalysisResult): { value: string; tone: Tone } {
  if (analysis.regime.value === 2 || analysis.alphaScore >= 70) return { value: "BULLISH", tone: "good" };
  if (analysis.regime.value === 0 || analysis.alphaScore < 45) return { value: "BEARISH", tone: "bad" };
  return { value: "NEUTRAL", tone: "warn" };
}

// ─────────────────────────────────────────────────────────────────────────────
// 공매도 분석 워크스페이스 — 3탭 구조
// ─────────────────────────────────────────────────────────────────────────────

function ShortSellingWorkspace({
  analysis,
  engine,
  activeTab,
  setActiveTab
}: {
  analysis: AnalysisResult;
  engine: VisualizationEngine;
  activeTab: ShortWorkspaceTab;
  setActiveTab: (tab: ShortWorkspaceTab) => void;
}) {
  const tabs: Array<{ id: ShortWorkspaceTab; label: string; kicker: string }> = [
    { id: "visualization", label: "Visualization", kicker: "공매도 압력 히트맵" },
    { id: "features", label: "Short Features", kicker: "지표 분석" },
    { id: "summary", label: "AI Analysis", kicker: "투자 해석" }
  ];
  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-2 overflow-x-auto rounded-full border border-rose/15 bg-slate-950/60 p-1.5 shadow-[0_0_38px_rgba(251,113,133,0.08)] backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-max rounded-full px-5 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${
                activeTab === tab.id
                  ? "bg-rose/15 text-white shadow-[0_0_28px_rgba(251,113,133,0.18)] ring-1 ring-rose/35"
                  : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"
              }`}
            >
              <span className="block text-[11px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
              <span className="mt-1 block text-[10px] font-bold text-slate-500">{tab.kicker}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="transition-all duration-500">
        {activeTab === "visualization" ? <ShortVisualizationTab analysis={analysis} short={analysis.shortAnalysis} /> : null}
        {activeTab === "features" ? <ShortFeaturesTab analysis={analysis} engine={engine} short={analysis.shortAnalysis} /> : null}
        {activeTab === "summary" ? <ShortAISummaryTab analysis={analysis} engine={engine} short={analysis.shortAnalysis} /> : null}
      </div>
    </section>
  );
}

// ─── 탭 1: 시각화 ──────────────────────────────────────────────────────────

function ShortVisualizationTab({ analysis, short }: { analysis: AnalysisResult; short: ShortAnalysis }) {
  const pressure = short.shortPressure;
  const pressureScore = pressure?.score ?? 0;
  const pressureTone: Tone = pressureScore >= 70 ? "bad" : pressureScore >= 45 ? "warn" : "good";
  const lastRow = short.shortRows.at(-1);
  const has = (f: ShortAnalysis["availableFields"][number]) => short.availableFields.includes(f);
  const hasPrice = analysis.chart.length > 0;

  const fmtPct = (v: unknown) => normalizeDisplayMetric("short_ratio", v).displayValue.replace("N/A", "—");
  const fmtFee = (v: unknown) => normalizeDisplayMetric("borrow_fee", v).displayValue.replace("N/A", "—");
  const fmtDays = (v: unknown) => normalizeDisplayMetric("days_to_cover", v).displayValue.replace("N/A", "—").replace("일", "");
  const fmtNum = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v).toFixed(1) : "—");

  const toneColor: Record<Tone, string> = { good: "text-mint border-mint/25 bg-mint/5", warn: "text-amber border-amber/25 bg-amber/5", bad: "text-rose border-rose/25 bg-rose/5", muted: "text-slate-300 border-white/10 bg-white/[0.03]" };

  const summaryCards = [
    { label: "공매도 압력 점수", value: pressure ? `${pressureScore}` : "—", unit: "/100", detail: pressure?.label ?? "데이터 부족", tone: pressureTone },
    { label: "신뢰도", value: `${Math.round(short.confidence * 100)}`, unit: "%", detail: `${short.availableFields.length}개 컬럼 감지`, tone: (short.confidence >= 0.7 ? "good" : short.confidence >= 0.4 ? "warn" : "muted") as Tone },
    { label: "공매도 비율", value: has("short_ratio") ? fmtPct(lastRow?.short_ratio) : "—", unit: "", detail: has("short_ratio") ? "최신 기준" : "컬럼 미감지", tone: (has("short_ratio") && Number(lastRow?.short_ratio) >= 0.5 ? "bad" : has("short_ratio") ? "warn" : "muted") as Tone },
    { label: "차입 비용", value: has("borrow_fee") ? fmtFee(lastRow?.borrow_fee) : "—", unit: "", detail: has("borrow_fee") ? "Borrow Fee" : "컬럼 미감지", tone: ((pressure?.components.borrowFeeRank ?? 0) >= 75 ? "bad" : "muted") as Tone },
    { label: "스퀴즈 점수", value: has("squeeze_score") ? fmtNum(lastRow?.squeeze_score) : "—", unit: "", detail: has("squeeze_score") ? "Squeeze Risk" : "컬럼 미감지", tone: (has("squeeze_score") && Number(lastRow?.squeeze_score) >= 70 ? "bad" : has("squeeze_score") ? "warn" : "muted") as Tone },
    { label: "커버링 점수", value: pressure?.coveringScore != null ? `${pressure.coveringScore}` : "—", unit: pressure?.coveringScore != null ? "/100" : "", detail: "Days/비용/활용률 복합", tone: ((pressure?.coveringScore ?? 0) >= 70 ? "bad" : (pressure?.coveringScore ?? 0) >= 45 ? "warn" : "muted") as Tone },
    { label: "커버링 일수", value: has("days_to_cover") ? fmtDays(lastRow?.days_to_cover__raw ?? lastRow?.days_to_cover) : "—", unit: has("days_to_cover") ? "일" : "", detail: has("days_to_cover") ? "Days to Cover" : "컬럼 미감지", tone: (has("days_to_cover") && Number(lastRow?.days_to_cover) >= 10 ? "bad" : "muted") as Tone },
  ];

  return (
    <div className="space-y-5">
      {/* 메인 인터랙티브 차트 */}
      <section className="relative overflow-hidden rounded-xl border border-rose/18 bg-[linear-gradient(135deg,rgba(15,23,42,0.97),rgba(2,6,23,0.95)_52%,rgba(40,8,8,0.35))] p-5 shadow-[0_32px_130px_rgba(0,0,0,0.6),0_0_70px_rgba(251,113,133,0.12)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose/65 to-transparent" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-rose">{hasPrice ? "가격 + 공매도 오버레이" : "공매도 멀티라인 차트"}</p>
            <h2 className="mt-1 text-xl font-black text-white">{hasPrice ? "종가 & 공매도 비율 인터랙티브 분석" : "공매도 압력 지표 시각화"}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <MiniBadge tone={short.isShortOnlyMode ? "warn" : "good"}>{short.isShortOnlyMode ? "리포트 모드" : "통합 모드"}</MiniBadge>
            <MiniBadge tone={pressureTone}>{pressure?.label ?? "압력 산출 중"}</MiniBadge>
            <MiniBadge tone="muted">신뢰도 {Math.round(short.confidence * 100)}%</MiniBadge>
          </div>
        </div>
        <ShortHoverableMainChart short={short} chart={analysis.chart} />
      </section>

      {/* 요약 지표 카드 */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${toneColor[card.tone]}`}>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
            <p className="mt-2 text-xl font-black leading-none">
              {card.value}<span className="ml-0.5 text-xs font-bold opacity-60">{card.unit}</span>
            </p>
            <p className="mt-1 text-[10px] text-slate-500">{card.detail}</p>
          </div>
        ))}
      </div>

      {/* 압력 히트맵 */}
      <section className="rounded-xl border border-white/10 bg-slate-950/50 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">기간별 공매도 압력 히트맵</p>
          <div className="flex flex-wrap gap-1.5">
            {shortConditionTags(short).slice(0, 3).map((tag) => <MiniBadge key={tag} tone={pressureTone}>{tag}</MiniBadge>)}
          </div>
        </div>
        <ShortPressureHeatmap short={short} analysis={analysis} />
      </section>
    </div>
  );
}

// ─── 탭 2: 공매도 특성 분석 ────────────────────────────────────────────────

function ShortFeaturesTab({ analysis, engine, short }: { analysis: AnalysisResult; engine: VisualizationEngine; short: ShortAnalysis }) {
  const pressure = short.shortPressure;
  const hasPrice = analysis.chart.length > 0;
  const has = (f: ShortAnalysis["availableFields"][number]) => short.availableFields.includes(f);
  const allConflicts = [...short.conflicts, ...analysis.conflicts];

  const componentEntries = pressure ? Object.entries(pressure.components) : [];
  const totalComponent = componentEntries.reduce((sum, [, v]) => sum + Math.max(0, v), 0) || 1;
  const contributions = componentEntries
    .map(([key, val]) => ({ label: shortComponentLabel(key), value: Math.max(0, val), pct: Math.round((Math.max(0, val) / totalComponent) * 100) }))
    .sort((a, b) => b.value - a.value);

  const trendCards = shortTrendCards(short);

  return (
    <div className="space-y-5">
      {/* 압력 점수 분해 */}
      {pressure ? (
        <AnalysisPanelShell title="공매도 압력 점수 분해" tags={["롤링 퍼센타일", "실시간 계산"]}>
          <div className="grid gap-6 lg:grid-cols-[1fr_0.5fr]">
            <div className="space-y-3.5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">구성 요소별 기여도</p>
              {contributions.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <p className="w-28 shrink-0 text-xs font-bold text-slate-300">{item.label}</p>
                  <div className="flex-1 h-2 rounded-full bg-white/8">
                    <div className="h-2 rounded-full bg-gradient-to-r from-rose/85 to-rose/35 transition-all duration-500" style={{ width: `${item.pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-black text-rose">{item.value.toFixed(0)}</span>
                  <span className="w-9 text-right text-[10px] text-slate-500">{item.pct}%</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center gap-3">
              <CircularRiskMeter value={pressure.score} label={shortPressureShortLabel(pressure.score)} />
              {pressure.coveringSignal !== null ? (
                <div className="w-full rounded-lg border border-mint/20 bg-mint/5 p-3 text-center">
                  <p className="text-[10px] font-black text-mint">커버링 신호</p>
                  <p className="mt-1 text-xl font-black text-mint">{pressure.coveringSignal}/100</p>
                  <p className="text-[10px] text-slate-400">{pressure.coveringSignal >= 70 ? "스퀴즈 가능성" : "정상 범위"}</p>
                </div>
              ) : null}
            </div>
          </div>
        </AnalysisPanelShell>
      ) : (
        <AnalysisPanelShell title="공매도 압력 점수" tags={["데이터 부족"]}>
          <p className="text-sm text-slate-400">압력 점수 계산에 충분한 공매도 컬럼이 없습니다. 감지된 필드: {short.availableFields.join(", ") || "없음"}</p>
        </AnalysisPanelShell>
      )}

      {/* Alpha Score 연계 (가격 데이터 존재 시) */}
      {hasPrice ? (
        <AnalysisPanelShell title="Alpha Score 연계 분석" tags={["가격 연동", "통합 모드"]}>
          <div className="flex items-start gap-3 rounded-lg border border-mint/20 bg-mint/5 px-4 py-3 text-sm font-semibold text-mint">
            <span>✓</span>
            <span>가격 데이터가 감지되었습니다. 공매도 데이터는 Alpha Score에 리스크 레이어로 적용됩니다. Alpha Score 조정은 AI 리스크 요약 탭에서 확인할 수 있습니다.</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InterpretationBlock label="단기 시나리오" text={shortScenarioA(short)} />
            <InterpretationBlock label="중기 시나리오" text={shortScenarioB(short)} />
          </div>
        </AnalysisPanelShell>
      ) : null}

      {/* 추세 분석 카드 */}
      {trendCards.length ? (
        <AnalysisPanelShell title="지표별 추세 분석" tags={["실제 데이터", "계산값"]}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trendCards.map((card) => {
              const border = card.tone === "bad" ? "border-rose/25 bg-rose/5" : card.tone === "warn" ? "border-amber/20 bg-amber/5" : card.tone === "good" ? "border-mint/20 bg-mint/5" : "border-white/10 bg-slate-950/35";
              const text = card.tone === "bad" ? "text-rose" : card.tone === "warn" ? "text-amber" : card.tone === "good" ? "text-mint" : "text-slate-300";
              return (
                <div key={card.label} className={`rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02] ${border}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
                  <p className={`mt-2 text-xl font-black ${text}`}>{card.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{card.detail}</p>
                </div>
              );
            })}
          </div>
        </AnalysisPanelShell>
      ) : null}

      {/* 개별 지표 차트 */}
      {(has("short_ratio") || has("borrow_fee") || has("short_balance") || has("borrow_balance") || has("cover_volume") || has("short_volume") || has("utilization_rate")) ? (
        <AnalysisPanelShell title="공매도 지표 차트" tags={["감지된 필드만 표시"]}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {has("short_ratio") ? <div><p className="mb-2 text-[10px] font-black uppercase text-slate-500">공매도비율</p><ShortRatioLineChart short={short} /><ShortChartExplanation short={short} kind="short_ratio" /></div> : null}
            {has("borrow_fee") ? <div><p className="mb-2 text-[10px] font-black uppercase text-slate-500">차입비용</p><BorrowFeeLineChart short={short} /><ShortChartExplanation short={short} kind="borrow_fee" /></div> : null}
            {(has("short_balance") || has("borrow_balance")) ? <div><p className="mb-2 text-[10px] font-black uppercase text-slate-500">잔고 추세</p><ShortBalanceAreaChart short={short} /><ShortChartExplanation short={short} kind="balance" /></div> : null}
            {has("cover_volume") ? <div><p className="mb-2 text-[10px] font-black uppercase text-slate-500">커버링 거래량</p><CoverVolumeBarChart short={short} /><ShortChartExplanation short={short} kind="cover_volume" /></div> : null}
            {has("short_volume") ? <div><p className="mb-2 text-[10px] font-black uppercase text-slate-500">공매도 거래량</p><ShortVolumeBarChart short={short} /><ShortChartExplanation short={short} kind="short_volume" /></div> : null}
            {has("utilization_rate") ? <div><p className="mb-2 text-[10px] font-black uppercase text-slate-500">활용률</p><UtilizationRateChart short={short} /><ShortChartExplanation short={short} kind="utilization_rate" /></div> : null}
          </div>
        </AnalysisPanelShell>
      ) : null}

      {/* 신호 충돌 테이블 */}
      {allConflicts.length ? (
        <AnalysisPanelShell title="신호 충돌 감지" tags={["충돌 발생", `${allConflicts.length}건`]}>
          <div className="space-y-2">
            {allConflicts.map((c, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${c.severity === "HIGH" ? "border-rose/30 bg-rose/5 text-rose" : c.severity === "MEDIUM" ? "border-amber/20 bg-amber/5 text-amber" : "border-cyan/15 bg-cyan/5 text-cyan"}`}>
                <span className="mt-0.5 shrink-0 rounded border border-current px-1.5 py-0.5 text-[9px] font-black uppercase">{c.severity}</span>
                <span>{c.message}</span>
              </div>
            ))}
          </div>
        </AnalysisPanelShell>
      ) : (
        <AnalysisPanelShell title="신호 충돌 감지" tags={["충돌 없음"]}>
          <div className="flex items-center gap-2 rounded-lg border border-mint/20 bg-mint/5 px-4 py-3 text-sm font-semibold text-mint">
            <span>✓</span> 현재 감지된 신호 충돌이 없습니다.
          </div>
        </AnalysisPanelShell>
      )}

      {/* 롤링 상관관계 (가격 데이터 존재 시) */}
      {hasPrice ? (
        <AnalysisPanelShell title="롤링 상관관계 분석" tags={["가격 상관", "공매도 데이터"]}>
          <ShortRollingRelationshipTable short={short} analysis={analysis} />
        </AnalysisPanelShell>
      ) : (
        <AnalysisPanelShell title="롤링 상관관계 분석" tags={["가격 없음"]}>
          <p className="text-sm text-amber">가격 데이터가 없어 상관관계 분석이 제한됩니다. close 컬럼을 포함한 데이터를 업로드하면 활성화됩니다.</p>
        </AnalysisPanelShell>
      )}
    </div>
  );
}

// ─── 탭 3: AI 리스크 요약 ──────────────────────────────────────────────────

function ShortAISummaryTab({ analysis, engine, short }: { analysis: AnalysisResult; engine: VisualizationEngine; short: ShortAnalysis }) {
  const pressure = short.shortPressure;
  const pressureScore = pressure?.score ?? 0;
  const pressureTone: Tone = pressureScore >= 70 ? "bad" : pressureScore >= 45 ? "warn" : "good";
  const hasPrice = analysis.chart.length > 0;
  const alphaResult = computeShortAlphaResult(analysis, engine);
  const findings = shortKeyFindings(short);
  const allWarnings = [...short.preprocessingWarnings, ...(pressure?.warnings ?? [])];

  return (
    <div className="space-y-5">
      {/* 전체 리스크 요약 */}
      <AnalysisPanelShell title="공매도 리스크 종합 요약" tags={[pressure?.label ?? "계산 중", short.isShortOnlyMode ? "리포트 모드" : "통합 분석"]} accent={pressure?.label}>
        <div className="grid gap-5 lg:grid-cols-[0.4fr_1fr]">
          <div className="flex items-center justify-center">
            <CircularRiskMeter value={pressureScore} label={shortPressureShortLabel(pressureScore)} />
          </div>
          <div>
            <h3 className={`text-2xl font-black leading-tight ${pressureTone === "bad" ? "text-rose" : pressureTone === "warn" ? "text-amber" : "text-mint"}`}>{shortStructureLabel(short)}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{shortRiskInterpretation(short)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {shortConditionTags(short).map((tag) => <MiniBadge key={tag} tone={pressureTone}>{tag}</MiniBadge>)}
            </div>
          </div>
        </div>
      </AnalysisPanelShell>

      {/* 핵심 발견사항 */}
      <AnalysisPanelShell title="핵심 발견사항" tags={["실제 데이터 기반", `${findings.length}개 인사이트`]}>
        {findings.length ? (
          <div className="space-y-2.5">
            {findings.map((f, i) => {
              const cls = f.tone === "bad" ? "border-rose/25 bg-rose/5 text-rose" : f.tone === "warn" ? "border-amber/20 bg-amber/5 text-amber" : f.tone === "good" ? "border-mint/20 bg-mint/5 text-mint" : "border-white/10 bg-slate-950/35 text-slate-300";
              return (
                <div key={i} className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${cls}`}>
                  <span className="mt-0.5 shrink-0 text-[10px] font-black opacity-50">{i + 1}.</span>
                  <span>{f.text}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            {short.availableFields.length >= 2
              ? `${short.availableFields.length}개 공매도 필드 감지됨 (${short.availableFields.join(", ")}). 더 많은 기간의 데이터가 있으면 추가 인사이트를 생성할 수 있습니다.`
              : "충분한 공매도 데이터가 없어 인사이트를 생성할 수 없습니다."}
          </p>
        )}
      </AnalysisPanelShell>

      {/* AI 리스크 해석 */}
      <AnalysisPanelShell title="AI 리스크 해석" tags={["압력 현황", "기회 요인", "리스크 요인"]}>
        <div className="grid gap-5 lg:grid-cols-3">
          <InterpretationBlock label="공매도 압력 현황" text={shortConditionText(short)} />
          <InterpretationBlock label="기회 요인" text={shortOpportunityText(short)} />
          <InterpretationBlock label="리스크 요인" text={shortRiskText(short)} />
        </div>
      </AnalysisPanelShell>

      {/* 경고 신호 */}
      {allWarnings.length ? (
        <AnalysisPanelShell title="감지된 경고 신호" tags={[`${allWarnings.length}개 경고`]}>
          <div className="space-y-2">
            {allWarnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-amber/20 bg-amber/5 px-4 py-2.5 text-sm font-semibold text-amber">
                <span>⚠</span>{w}
              </div>
            ))}
          </div>
        </AnalysisPanelShell>
      ) : null}

      {/* What-If 시뮬레이션 */}
      <AnalysisPanelShell title="What-If 시뮬레이션" tags={["가상 시나리오", "동적 계산"]}>
        <ShortWhatIfPanel short={short} />
      </AnalysisPanelShell>

      {/* 최종 투자 판단 */}
      <AnalysisPanelShell title="최종 투자 해석" tags={hasPrice ? ["가격 연동 모드"] : ["공매도 전용 모드"]}>
        <div className="space-y-4">
          <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${hasPrice ? "border-mint/20 bg-mint/5 text-mint" : "border-amber/30 bg-amber/5 text-amber"}`}>
            <span className="shrink-0">{hasPrice ? "✓" : "⚠"}</span>
            <span>{hasPrice ? "가격 데이터가 감지되어 Alpha Score와 공매도 분석이 통합됩니다. 공매도 데이터는 방향성 판단을 보조하는 리스크 레이어로 작동합니다." : "가격(close) 데이터가 없어 Alpha Score는 중립 기준 50에서 시작하며, 공매도 데이터만으로 강한 매수/매도 판단을 생성하지 않습니다."}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ShortReportCard label="Alpha Score" value={`${alphaResult.score}/100`} detail={alphaResult.label} tone={alphaResult.score >= 70 ? "good" : alphaResult.score < 45 ? "bad" : "warn"} />
            <ShortReportCard label="공매도 압력" value={`${alphaResult.shortPressureScore}/100`} detail={pressure?.label ?? "계산 불가"} tone={pressureTone} />
            <ShortReportCard label="스퀴즈 위험" value={`${alphaResult.squeezeRiskScore.toFixed(0)}/100`} detail={alphaResult.components.dtcAvailable ? "DTC 반영" : "DTC 신뢰도 낮음"} tone={alphaResult.squeezeRiskScore >= 70 ? "bad" : alphaResult.squeezeRiskScore >= 50 ? "warn" : "muted"} />
            <ShortReportCard label="신뢰도" value={alphaResult.confidence} detail={`품질 ${alphaResult.dataQualityScore}/100`} tone={alphaResult.confidence === "High" ? "good" : alphaResult.confidence === "Medium" ? "warn" : "bad"} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <InterpretationBlock label="주요 이유" text={alphaResult.explanation} />
            <InterpretationBlock label="리스크 경고" text={alphaResult.components.dtcAvailable ? shortRiskText(short) : "Days to Cover를 신뢰성 있게 산출하지 못해 스퀴즈 확신도는 낮춰 해석합니다."} />
            <InterpretationBlock label="시나리오 A" text={shortScenarioA(short)} />
            <InterpretationBlock label="시나리오 B" text={shortScenarioB(short)} />
          </div>
          <AlphaScoreSection analysis={analysis} engine={engine} />
        </div>
      </AnalysisPanelShell>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OPTIONS WORKSPACE
// ═══════════════════════════════════════════════════════════════════════════

function OptionsWorkspace({
  options,
  analysis,
  engine,
  activeTab,
  setActiveTab,
}: {
  options: OptionsAnalysis;
  analysis: AnalysisResult;
  engine: VisualizationEngine;
  activeTab: OptionsWorkspaceTab;
  setActiveTab: (tab: OptionsWorkspaceTab) => void;
}) {
  const tabs: Array<{ id: OptionsWorkspaceTab; label: string; kicker: string }> = [
    { id: "visualization", label: "Visualization", kicker: "PCR · IV · OI 차트" },
    { id: "signals", label: "Market Signals", kicker: "심리 · 포지션 구조" },
    { id: "analytics", label: "Advanced Analytics", kicker: "감마 · 스트라이크 분석" },
    { id: "interpretation", label: "AI Interpretation", kicker: "옵션 시장 해석" },
  ];
  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-2 overflow-x-auto rounded-full border border-violet-500/15 bg-slate-950/60 p-1.5 shadow-[0_0_38px_rgba(139,92,246,0.08)] backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-max rounded-full px-5 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${
                activeTab === tab.id
                  ? "bg-violet-500/15 text-white shadow-[0_0_28px_rgba(139,92,246,0.18)] ring-1 ring-violet-400/35"
                  : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"
              }`}
            >
              <span className="block text-[11px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
              <span className="mt-1 block text-[10px] font-bold text-slate-500">{tab.kicker}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="transition-all duration-500">
        {activeTab === "visualization" ? <OptionsVisualizationTab options={options} analysis={analysis} engine={engine} /> : null}
        {activeTab === "signals" ? <OptionsSignalsTab options={options} /> : null}
        {activeTab === "analytics" ? <OptionsAdvancedTab options={options} /> : null}
        {activeTab === "interpretation" ? <OptionsInterpretationTab options={options} analysis={analysis} engine={engine} /> : null}
      </div>
    </section>
  );
}

// ─── Options Tab 1: Visualization ──────────────────────────────────────────

function OptionsVisualizationTab({ options, analysis, engine }: { options: OptionsAnalysis; analysis: AnalysisResult; engine: VisualizationEngine }) {
  const risk = options.riskScore;
  const tone: Tone = risk ? (risk.score >= 70 ? "bad" : risk.score >= 50 ? "warn" : "good") : "muted";
  const accentColor = tone === "bad" ? "#fb7185" : tone === "warn" ? "#f8bf4c" : "#41d6a3";

  const summaryCards: { label: string; value: string; sub: string; tone: Tone }[] = [];
  if (options.latestPCR !== null)
    summaryCards.push({ label: "Put/Call Ratio", value: options.latestPCR.toFixed(2), sub: options.pcrDerived ? "볼륨 기반 계산" : options.latestPCR >= 1.2 ? "방어적" : options.latestPCR >= 0.8 ? "중립" : "리스크온", tone: options.latestPCR >= 1.2 ? "bad" : options.latestPCR >= 0.8 ? "warn" : "good" });
  if (options.latestIV !== null)
    summaryCards.push({ label: "Implied Volatility", value: `${options.latestIV.toFixed(1)}%`, sub: options.ivPercentile !== null ? `${options.ivPercentile}th 백분위` : "내재변동성", tone: (options.ivPercentile ?? 50) >= 70 ? "bad" : (options.ivPercentile ?? 50) >= 45 ? "warn" : "good" });
  if (options.latestOI !== null)
    summaryCards.push({ label: "Open Interest", value: options.latestOI >= 1000000 ? `${(options.latestOI / 1000000).toFixed(1)}M` : options.latestOI >= 1000 ? `${Math.round(options.latestOI / 1000)}K` : String(options.latestOI), sub: options.oiChange !== null ? `${options.oiChange >= 0 ? "+" : ""}${options.oiChange.toFixed(1)}% 변화` : "미결제약정 합계", tone: "muted" });
  if (options.latestGamma !== null)
    summaryCards.push({ label: "Gamma Regime", value: options.latestGamma < 0 ? "Negative" : "Positive", sub: options.latestGamma < 0 ? "딜러 리스크 증폭" : "딜러 안정화", tone: options.latestGamma < 0 ? "bad" : "good" });
  if (risk)
    summaryCards.push({ label: "Option Risk Score", value: String(risk.score), sub: risk.label, tone });
  summaryCards.push({ label: "Data Confidence", value: `${options.confidenceScore}%`, sub: options.confidenceLabel || `${options.availableFields.length}개 필드 감지`, tone: options.confidenceScore >= 70 ? "good" : options.confidenceScore >= 40 ? "warn" : "bad" });

  return (
    <div className="space-y-5">
      {/* Dataset type + PCR derived badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
          {options.datasetType}
        </span>
        {options.pcrDerived && (
          <span className="rounded-full border border-amber/25 bg-amber/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber">
            PCR: derived from volume
          </span>
        )}
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {options.rowCount} rows
        </span>
        {options.gammaFlipZone !== null && (
          <span className="rounded-full border border-rose/25 bg-rose/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-rose">
            Gamma Flip ≈ {options.gammaFlipZone.toLocaleString()}
          </span>
        )}
        {options.topCallStrikeDetail && (
          <span className="rounded-full border border-mint/20 bg-mint/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-mint">
            Top Call Strike: {options.topCallStrikeDetail.strike.toLocaleString()} · OI {Math.round(options.topCallStrikeDetail.dominance)}%
          </span>
        )}
        {options.topPutStrikeDetail && (
          <span className="rounded-full border border-rose/20 bg-rose/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-rose">
            Top Put Strike: {options.topPutStrikeDetail.strike.toLocaleString()} · OI {Math.round(options.topPutStrikeDetail.dominance)}%
          </span>
        )}
        {options.strikeData.length > 0 && (!options.topCallStrikeDetail || !options.topPutStrikeDetail) && (
          <span className="rounded-full border border-amber/25 bg-amber/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber">
            CALL/PUT 구분 부족: Top Strike 제한 표시
          </span>
        )}
      </div>

      {/* AI 요약 배너 */}
      {options.insights.length > 0 && (
        <div className="rounded-lg border border-violet-400/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.07),rgba(2,6,23,0.9))] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-violet-400">AI Options Readout</p>
          <div className="mt-3 space-y-1.5">
            {options.insights.map((ins, i) => (
              <p key={i} className="text-sm leading-6 text-slate-200">{ins}</p>
            ))}
          </div>
        </div>
      )}

      {/* 요약 카드 */}
      {summaryCards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {summaryCards.map((card) => {
            const cls = card.tone === "bad" ? "border-rose/25 bg-rose/5" : card.tone === "warn" ? "border-amber/20 bg-amber/5" : card.tone === "good" ? "border-mint/20 bg-mint/5" : "border-white/10 bg-slate-950/40";
            const valCls = card.tone === "bad" ? "text-rose" : card.tone === "warn" ? "text-amber" : card.tone === "good" ? "text-mint" : "text-white";
            return (
              <div key={card.label} className={`rounded-lg border p-4 ${cls}`}>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
                <p className={`mt-2 text-2xl font-black leading-none ${valCls}`}>{card.value}</p>
                <p className="mt-1 text-[10px] font-bold text-slate-500">{card.sub}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts */}
      {options.pcrSeries.length > 1 && <OptionsPCRChart series={options.pcrSeries} pcrDerived={options.pcrDerived} pcrTrend={options.pcrTrend} />}
      {options.ivSeries.length > 1 && <OptionsIVChart series={options.ivSeries} ivPercentile={options.ivPercentile} ivTrend={options.ivTrend} />}
      {options.oiSeries.length > 1 && <OptionsOIChart series={options.oiSeries} callPutSeries={options.callPutVolSeries} oiChange={options.oiChange} />}
      {options.gammaSeries.length > 1 && <OptionsGammaChart series={options.gammaSeries} />}
      {options.gammaExposureSeries.length > 1 && <OptionsGEXChart series={options.gammaExposureSeries} gammaFlipZone={options.gammaFlipZone} />}

      {/* 감지된 필드 없을 때 */}
      {!options.detected && (
        <div className="flex min-h-48 items-center justify-center rounded-lg border border-white/8 bg-slate-950/40 text-sm text-slate-400">
          옵션 데이터가 감지되지 않았습니다. put_call_ratio, implied_volatility, open_interest, gamma 등의 컬럼이 포함된 CSV를 업로드하세요.
        </div>
      )}
    </div>
  );
}

// ─── PCR Chart ─────────────────────────────────────────────────────────────

function OptionsPCRChart({ series, pcrDerived, pcrTrend }: { series: { date: string; value: number }[]; pcrDerived: boolean; pcrTrend: number | null }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 860;
  const PAD_RIGHT = 12;
  const chartH = 300;
  const xAxisTop = chartH + 14;
  const totalH = xAxisTop + 18;
  const vals = series.map((p) => p.value);
  const minV = Math.min(...vals, 0.4);
  const maxV = Math.max(...vals, 1.6);
  const span = maxV - minV || 1;
  const xFor = (i: number) => series.length <= 1 ? width / 2 : (i / (series.length - 1)) * width;
  const yFor = (v: number) => chartH - 8 - ((v - minV) / span) * (chartH - 24);
  const y07 = yFor(0.7);
  const y10 = yFor(1.0);
  const y12 = yFor(1.2);
  const linePath = vals.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || series.length < 2) return;
    const rect = svg.getBoundingClientRect();
    setHoverIdx(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (series.length - 1)));
  };

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-400">PUT / CALL RATIO</p>
          <p className="text-xs text-slate-500">풋 수요 ÷ 콜 수요 · 1.0 이상 = 방어적</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold">
          {pcrDerived && <span className="rounded-full border border-amber/25 bg-amber/10 px-2 py-0.5 text-amber">derived</span>}
          {pcrTrend !== null && <span className={pcrTrend >= 0 ? "text-rose" : "text-mint"}>{pcrTrend >= 0 ? "▲" : "▼"} {Math.abs(pcrTrend).toFixed(1)}%</span>}
          <span className="text-mint">{"<0.7"} 리스크온</span>
          <span className="text-amber">0.7–1.2 중립</span>
          <span className="text-rose">{">1.2"} 방어적</span>
        </div>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${width + PAD_RIGHT} ${totalH}`} className="w-full" style={{ height: "280px" }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
        {/* Zone fills */}
        <rect x="0" y={y12} width={width} height={Math.max(0, y10 - y12)} fill="rgba(251,113,133,0.07)" />
        <rect x="0" y={y10} width={width} height={Math.max(0, y07 - y10)} fill="rgba(248,191,76,0.06)" />
        <rect x="0" y={y07} width={width} height={Math.max(0, chartH - 8 - y07)} fill="rgba(65,214,163,0.06)" />
        {/* Threshold lines */}
        <line x1="0" y1={y07} x2={width} y2={y07} stroke="rgba(65,214,163,0.35)" strokeWidth="1" strokeDasharray="6 5" />
        <line x1="0" y1={y10} x2={width} y2={y10} stroke="rgba(148,163,184,0.3)" strokeWidth="1" strokeDasharray="4 5" />
        <line x1="0" y1={y12} x2={width} y2={y12} stroke="rgba(251,113,133,0.35)" strokeWidth="1" strokeDasharray="6 5" />
        <text x={width - 4} y={y07 - 4} fill="rgba(65,214,163,0.6)" fontSize="9" textAnchor="end">0.7</text>
        <text x={width - 4} y={y10 - 4} fill="rgba(148,163,184,0.6)" fontSize="9" textAnchor="end">1.0</text>
        <text x={width - 4} y={y12 - 4} fill="rgba(251,113,133,0.6)" fontSize="9" textAnchor="end">1.2</text>
        {/* PCR line */}
        <path d={linePath} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* X-axis */}
        <line x1="0" y1={xAxisTop - 4} x2={width} y2={xAxisTop - 4} stroke="rgba(148,163,184,0.10)" strokeWidth="1" />
        {series.map((p, i) => {
          if (i % Math.max(1, Math.ceil(series.length / 9)) !== 0) return null;
          const label = String(p.date).length >= 10 ? String(p.date).slice(5, 10) : String(p.date).slice(0, 7);
          return <text key={i} x={xFor(i)} y={xAxisTop + 12} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">{label}</text>;
        })}
        {/* Hover */}
        {hoverIdx !== null && (() => {
          const p = series[hoverIdx];
          const hx = xFor(hoverIdx);
          const hy = yFor(p.value);
          const color = p.value >= 1.2 ? "#fb7185" : p.value >= 0.7 ? "#f8bf4c" : "#41d6a3";
          const onRight = hx > width * 0.6;
          return (
            <g>
              <line x1={hx} y1="8" x2={hx} y2={chartH} stroke="rgba(167,139,250,0.3)" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx={hx} cy={hy} r="5" fill={color} stroke="rgba(2,6,23,0.8)" strokeWidth="2" />
              <rect x={onRight ? hx - 112 : hx + 8} y={Math.max(10, hy - 30)} width="104" height="44" rx="5" fill="rgba(2,6,23,0.93)" stroke="rgba(167,139,250,0.3)" strokeWidth="1" />
              <text x={onRight ? hx - 108 : hx + 12} y={Math.max(10, hy - 30) + 16} fill="#94a3b8" fontSize="9" fontWeight="700">{String(p.date).slice(0, 10)}</text>
              <text x={onRight ? hx - 108 : hx + 12} y={Math.max(10, hy - 30) + 32} fill={color} fontSize="13" fontWeight="900">PCR {p.value.toFixed(2)}</text>
            </g>
          );
        })()}
        <rect x="0" y="0" width={width} height={totalH} fill="transparent" />
      </svg>
    </div>
  );
}

// ─── IV Chart ──────────────────────────────────────────────────────────────

function OptionsIVChart({ series, ivPercentile, ivTrend }: { series: { date: string; value: number }[]; ivPercentile: number | null; ivTrend: number | null }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 860;
  const PAD_RIGHT = 12;
  const chartH = 300;
  const xAxisTop = chartH + 14;
  const totalH = xAxisTop + 18;
  const vals = series.map((p) => p.value);
  const minV = Math.min(...vals) * 0.92;
  const maxV = Math.max(...vals) * 1.08;
  const span = maxV - minV || 1;
  const xFor = (i: number) => series.length <= 1 ? width / 2 : (i / (series.length - 1)) * width;
  const yFor = (v: number) => chartH - 8 - ((v - minV) / span) * (chartH - 24);
  const areaPath = `${vals.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ")} L${xFor(vals.length - 1)},${chartH - 8} L0,${chartH - 8} Z`;
  const linePath = vals.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || series.length < 2) return;
    const rect = svg.getBoundingClientRect();
    setHoverIdx(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (series.length - 1)));
  };

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber">IMPLIED VOLATILITY</p>
          <p className="text-xs text-slate-500">내재변동성 추세 {ivPercentile !== null ? `· 현재 ${ivPercentile}th 백분위` : ""}{ivTrend !== null ? ` · 추세 ${ivTrend >= 0 ? "▲" : "▼"}${Math.abs(ivTrend).toFixed(1)}%` : ""}</p>
        </div>
        {ivPercentile !== null && (
          <div className={`rounded-full border px-3 py-1 text-[10px] font-black ${ivPercentile >= 70 ? "border-rose/30 text-rose" : ivPercentile >= 45 ? "border-amber/30 text-amber" : "border-mint/30 text-mint"}`}>
            IV Pct {ivPercentile}th
          </div>
        )}
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${width + PAD_RIGHT} ${totalH}`} className="w-full" style={{ height: "280px" }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id="ivGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f8bf4c" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f8bf4c" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#ivGrad)" stroke="none" />
        <path d={linePath} fill="none" stroke="#f8bf4c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="0" y1={xAxisTop - 4} x2={width} y2={xAxisTop - 4} stroke="rgba(148,163,184,0.10)" strokeWidth="1" />
        {series.map((p, i) => {
          if (i % Math.max(1, Math.ceil(series.length / 9)) !== 0) return null;
          const label = String(p.date).length >= 10 ? String(p.date).slice(5, 10) : String(p.date).slice(0, 7);
          return <text key={i} x={xFor(i)} y={xAxisTop + 12} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">{label}</text>;
        })}
        {hoverIdx !== null && (() => {
          const p = series[hoverIdx];
          const hx = xFor(hoverIdx);
          const hy = yFor(p.value);
          const onRight = hx > width * 0.6;
          return (
            <g>
              <line x1={hx} y1="8" x2={hx} y2={chartH} stroke="rgba(248,191,76,0.3)" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx={hx} cy={hy} r="5" fill="#f8bf4c" stroke="rgba(2,6,23,0.8)" strokeWidth="2" />
              <rect x={onRight ? hx - 120 : hx + 8} y={Math.max(10, hy - 30)} width="112" height="44" rx="5" fill="rgba(2,6,23,0.93)" stroke="rgba(248,191,76,0.3)" strokeWidth="1" />
              <text x={onRight ? hx - 116 : hx + 12} y={Math.max(10, hy - 30) + 16} fill="#94a3b8" fontSize="9" fontWeight="700">{String(p.date).slice(0, 10)}</text>
              <text x={onRight ? hx - 116 : hx + 12} y={Math.max(10, hy - 30) + 32} fill="#f8bf4c" fontSize="13" fontWeight="900">IV {p.value.toFixed(1)}%</text>
            </g>
          );
        })()}
        <rect x="0" y="0" width={width} height={totalH} fill="transparent" />
      </svg>
    </div>
  );
}

// ─── OI Chart ──────────────────────────────────────────────────────────────

function OptionsOIChart({ series, callPutSeries, oiChange }: { series: { date: string; value: number }[]; callPutSeries: { date: string; call: number; put: number }[]; oiChange: number | null }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 860;
  const PAD_RIGHT = 12;
  const chartH = 280;
  const xAxisTop = chartH + 14;
  const totalH = xAxisTop + 18;
  const vals = series.map((p) => p.value);
  const minV = Math.min(...vals) * 0.9;
  const maxV = Math.max(...vals) * 1.1;
  const span = maxV - minV || 1;
  const xFor = (i: number) => series.length <= 1 ? width / 2 : (i / (series.length - 1)) * width;
  const yFor = (v: number) => chartH - 8 - ((v - minV) / span) * (chartH - 24);
  const areaPath = `${vals.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ")} L${xFor(vals.length - 1)},${chartH - 8} L0,${chartH - 8} Z`;
  const linePath = vals.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || series.length < 2) return;
    const rect = svg.getBoundingClientRect();
    setHoverIdx(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (series.length - 1)));
  };

  const fmtOI = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(Math.round(v));

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">OPEN INTEREST FLOW</p>
          <p className="text-xs text-slate-500">미결제약정 추이 · 증가 = 포지션 축적{oiChange !== null ? ` · ${oiChange >= 0 ? "▲" : "▼"}${Math.abs(oiChange).toFixed(1)}%` : ""}</p>
        </div>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${width + PAD_RIGHT} ${totalH}`} className="w-full" style={{ height: "260px" }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id="oiGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#oiGrad)" stroke="none" />
        <path d={linePath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="0" y1={xAxisTop - 4} x2={width} y2={xAxisTop - 4} stroke="rgba(148,163,184,0.10)" strokeWidth="1" />
        {series.map((p, i) => {
          if (i % Math.max(1, Math.ceil(series.length / 9)) !== 0) return null;
          const label = String(p.date).length >= 10 ? String(p.date).slice(5, 10) : String(p.date).slice(0, 7);
          return <text key={i} x={xFor(i)} y={xAxisTop + 12} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">{label}</text>;
        })}
        {hoverIdx !== null && (() => {
          const p = series[hoverIdx];
          const hx = xFor(hoverIdx);
          const hy = yFor(p.value);
          const onRight = hx > width * 0.6;
          const cpPoint = callPutSeries[hoverIdx];
          const hasCP = cpPoint && (cpPoint.call > 0 || cpPoint.put > 0);
          const boxH = hasCP ? 60 : 44;
          return (
            <g>
              <line x1={hx} y1="8" x2={hx} y2={chartH} stroke="rgba(56,189,248,0.3)" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx={hx} cy={hy} r="5" fill="#38bdf8" stroke="rgba(2,6,23,0.8)" strokeWidth="2" />
              <rect x={onRight ? hx - 130 : hx + 8} y={Math.max(10, hy - 30)} width="122" height={boxH} rx="5" fill="rgba(2,6,23,0.93)" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
              <text x={onRight ? hx - 126 : hx + 12} y={Math.max(10, hy - 30) + 16} fill="#94a3b8" fontSize="9" fontWeight="700">{String(p.date).slice(0, 10)}</text>
              <text x={onRight ? hx - 126 : hx + 12} y={Math.max(10, hy - 30) + 32} fill="#38bdf8" fontSize="13" fontWeight="900">OI {fmtOI(p.value)}</text>
              {hasCP && <text x={onRight ? hx - 126 : hx + 12} y={Math.max(10, hy - 30) + 50} fill="#64748b" fontSize="9" fontWeight="700">C:{fmtOI(cpPoint.call)} P:{fmtOI(cpPoint.put)}</text>}
            </g>
          );
        })()}
        <rect x="0" y="0" width={width} height={totalH} fill="transparent" />
      </svg>
    </div>
  );
}

// ─── Gamma Chart ────────────────────────────────────────────────────────────

function OptionsGammaChart({ series }: { series: { date: string; value: number }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 860;
  const PAD_RIGHT = 12;
  const chartH = 280;
  const xAxisTop = chartH + 14;
  const totalH = xAxisTop + 18;
  const vals = series.map((p) => p.value);
  const absMax = Math.max(Math.max(...vals.map(Math.abs)), 0.001);
  const minV = -absMax * 1.1;
  const maxV = absMax * 1.1;
  const span = maxV - minV;
  const xFor = (i: number) => series.length <= 1 ? width / 2 : (i / (series.length - 1)) * width;
  const yFor = (v: number) => chartH - 8 - ((v - minV) / span) * (chartH - 24);
  const zeroY = yFor(0);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || series.length < 2) return;
    const rect = svg.getBoundingClientRect();
    setHoverIdx(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (series.length - 1)));
  };

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose">GAMMA REGIME</p>
          <p className="text-xs text-slate-500">양수 감마 = 딜러 안정화 · 음수 감마 = 추세 증폭</p>
        </div>
        <div className="flex gap-3 text-[10px] font-bold">
          <span className="text-mint">양수 — 안정</span>
          <span className="text-rose">음수 — 증폭</span>
        </div>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${width + PAD_RIGHT} ${totalH}`} className="w-full" style={{ height: "260px" }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
        <rect x="0" y="8" width={width} height={Math.max(0, zeroY - 8)} fill="rgba(65,214,163,0.06)" />
        <rect x="0" y={zeroY} width={width} height={Math.max(0, chartH - 8 - zeroY)} fill="rgba(251,113,133,0.07)" />
        <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="rgba(148,163,184,0.35)" strokeWidth="1.5" />
        <text x="8" y={zeroY - 5} fill="rgba(65,214,163,0.55)" fontSize="9" fontWeight="700">POSITIVE</text>
        <text x="8" y={zeroY + 14} fill="rgba(251,113,133,0.55)" fontSize="9" fontWeight="700">NEGATIVE</text>
        {vals.map((v, i) => {
          if (i === 0) return null;
          const prev = vals[i - 1];
          const color = v >= 0 ? "#41d6a3" : "#fb7185";
          return <line key={i} x1={xFor(i - 1)} y1={yFor(prev)} x2={xFor(i)} y2={yFor(v)} stroke={color} strokeWidth="2.5" strokeLinecap="round" />;
        })}
        <line x1="0" y1={xAxisTop - 4} x2={width} y2={xAxisTop - 4} stroke="rgba(148,163,184,0.10)" strokeWidth="1" />
        {series.map((p, i) => {
          if (i % Math.max(1, Math.ceil(series.length / 9)) !== 0) return null;
          const label = String(p.date).length >= 10 ? String(p.date).slice(5, 10) : String(p.date).slice(0, 7);
          return <text key={i} x={xFor(i)} y={xAxisTop + 12} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">{label}</text>;
        })}
        {hoverIdx !== null && (() => {
          const p = series[hoverIdx];
          const hx = xFor(hoverIdx);
          const hy = yFor(p.value);
          const color = p.value >= 0 ? "#41d6a3" : "#fb7185";
          const onRight = hx > width * 0.6;
          return (
            <g>
              <line x1={hx} y1="8" x2={hx} y2={chartH} stroke="rgba(148,163,184,0.25)" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx={hx} cy={hy} r="5" fill={color} stroke="rgba(2,6,23,0.8)" strokeWidth="2" />
              <rect x={onRight ? hx - 128 : hx + 8} y={Math.max(10, hy - 30)} width="120" height="44" rx="5" fill="rgba(2,6,23,0.93)" stroke={`${color}55`} strokeWidth="1" />
              <text x={onRight ? hx - 124 : hx + 12} y={Math.max(10, hy - 30) + 16} fill="#94a3b8" fontSize="9" fontWeight="700">{String(p.date).slice(0, 10)}</text>
              <text x={onRight ? hx - 124 : hx + 12} y={Math.max(10, hy - 30) + 32} fill={color} fontSize="13" fontWeight="900">{p.value >= 0 ? "+" : ""}{p.value.toFixed(4)}</text>
            </g>
          );
        })()}
        <rect x="0" y="0" width={width} height={totalH} fill="transparent" />
      </svg>
    </div>
  );
}

// ─── GEX Chart ──────────────────────────────────────────────────────────────

function OptionsGEXChart({ series, gammaFlipZone }: { series: { date: string; value: number }[]; gammaFlipZone: number | null }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 860;
  const PAD_RIGHT = 12;
  const chartH = 280;
  const xAxisTop = chartH + 14;
  const totalH = xAxisTop + 18;
  const vals = series.map((p) => p.value);
  const absMax = Math.max(Math.max(...vals.map(Math.abs)), 0.001);
  const minV = -absMax * 1.1;
  const maxV = absMax * 1.1;
  const span = maxV - minV;
  const xFor = (i: number) => series.length <= 1 ? width / 2 : (i / (series.length - 1)) * width;
  const yFor = (v: number) => chartH - 8 - ((v - minV) / span) * (chartH - 24);
  const zeroY = yFor(0);

  const fmtGEX = (v: number) => {
    const abs = Math.abs(v);
    const sign = v >= 0 ? "+" : "-";
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
    return `${sign}${abs.toFixed(2)}`;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || series.length < 2) return;
    const rect = svg.getBoundingClientRect();
    setHoverIdx(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (series.length - 1)));
  };

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-400">GAMMA EXPOSURE (GEX)</p>
          <p className="text-xs text-slate-500">딜러 감마 익스포저 · 양수 = 시장 안정화 · 음수 = 추세 증폭{gammaFlipZone !== null ? ` · Flip Zone ≈ ${gammaFlipZone.toLocaleString()}` : ""}</p>
        </div>
        <div className="flex gap-3 text-[10px] font-bold">
          <span className="text-mint">양수 — 핀</span>
          <span className="text-rose">음수 — 증폭</span>
        </div>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${width + PAD_RIGHT} ${totalH}`} className="w-full" style={{ height: "260px" }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
        <rect x="0" y="8" width={width} height={Math.max(0, zeroY - 8)} fill="rgba(65,214,163,0.05)" />
        <rect x="0" y={zeroY} width={width} height={Math.max(0, chartH - 8 - zeroY)} fill="rgba(251,113,133,0.06)" />
        <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" />
        <text x="8" y={zeroY - 5} fill="rgba(65,214,163,0.55)" fontSize="9" fontWeight="700">POSITIVE GEX</text>
        <text x="8" y={zeroY + 14} fill="rgba(251,113,133,0.55)" fontSize="9" fontWeight="700">NEGATIVE GEX</text>
        {/* Area fill */}
        {vals.map((v, i) => {
          if (i === 0) return null;
          const prev = vals[i - 1];
          const color = v >= 0 ? "#41d6a3" : "#fb7185";
          return <line key={i} x1={xFor(i - 1)} y1={yFor(prev)} x2={xFor(i)} y2={yFor(v)} stroke={color} strokeWidth="2.5" strokeLinecap="round" />;
        })}
        <line x1="0" y1={xAxisTop - 4} x2={width} y2={xAxisTop - 4} stroke="rgba(148,163,184,0.10)" strokeWidth="1" />
        {series.map((p, i) => {
          if (i % Math.max(1, Math.ceil(series.length / 9)) !== 0) return null;
          const label = String(p.date).length >= 10 ? String(p.date).slice(5, 10) : String(p.date).slice(0, 7);
          return <text key={i} x={xFor(i)} y={xAxisTop + 12} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">{label}</text>;
        })}
        {hoverIdx !== null && (() => {
          const p = series[hoverIdx];
          const hx = xFor(hoverIdx);
          const hy = yFor(p.value);
          const color = p.value >= 0 ? "#41d6a3" : "#fb7185";
          const onRight = hx > width * 0.6;
          return (
            <g>
              <line x1={hx} y1="8" x2={hx} y2={chartH} stroke="rgba(167,139,250,0.25)" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx={hx} cy={hy} r="5" fill={color} stroke="rgba(2,6,23,0.8)" strokeWidth="2" />
              <rect x={onRight ? hx - 136 : hx + 8} y={Math.max(10, hy - 30)} width="128" height="44" rx="5" fill="rgba(2,6,23,0.93)" stroke={`${color}55`} strokeWidth="1" />
              <text x={onRight ? hx - 132 : hx + 12} y={Math.max(10, hy - 30) + 16} fill="#94a3b8" fontSize="9" fontWeight="700">{String(p.date).slice(0, 10)}</text>
              <text x={onRight ? hx - 132 : hx + 12} y={Math.max(10, hy - 30) + 32} fill={color} fontSize="13" fontWeight="900">GEX {fmtGEX(p.value)}</text>
            </g>
          );
        })()}
        <rect x="0" y="0" width={width} height={totalH} fill="transparent" />
      </svg>
    </div>
  );
}

function optionRiskBadge(score: number) {
  if (score >= 75) return { label: "HIGH RISK", cls: "border-rose/30 bg-rose/10 text-rose" };
  if (score >= 55) return { label: "MEDIUM RISK", cls: "border-amber/30 bg-amber/10 text-amber" };
  if (score >= 35) return { label: "LOW-MEDIUM", cls: "border-cyan/25 bg-cyan/10 text-cyan" };
  return { label: "LOW RISK", cls: "border-mint/25 bg-mint/10 text-mint" };
}

function buildOptionsSignalExplanation(sig: OptionsAnalysis["signals"][number], options: OptionsAnalysis) {
  const risk = options.riskScore;
  const value = `${sig.value}/100`;
  const trend = sig.label.includes("PCR")
    ? options.pcrTrend !== null ? (options.pcrTrend > 0.05 ? "상승: 방어적 풋 수요가 빨라지는 구간" : options.pcrTrend < -0.05 ? "하락: 콜 수요 또는 방어 완화" : "안정: 최근 변화 제한적") : "추세 데이터 부족"
    : sig.label.includes("Volatility")
    ? options.ivTrend !== null ? (options.ivTrend > 0.05 ? "상승: 옵션 프리미엄 확대" : options.ivTrend < -0.05 ? "하락: 변동성 프리미엄 완화" : "안정: IV 변화 제한적") : "추세 데이터 부족"
    : sig.label.includes("Gamma")
    ? options.latestGamma !== null ? (options.latestGamma < 0 ? "음수 감마: 가격 움직임 증폭 가능" : "양수 감마: 딜러 헤지가 완충 역할") : "감마 데이터 부족"
    : sig.label.includes("Expiry")
    ? options.expiryData.length ? "단기 만기 OI·거래량·감마 집중도로 산출" : "Expiry data unavailable"
    : sig.label.includes("Strike")
    ? "행사가별 OI와 거래량 집중도를 비교" : "최근 컴포넌트 흐름 기준";
  const meaning = sig.label.includes("PCR")
    ? "풋/콜 수요의 비대칭을 보며 방어 수요 또는 헤지 과밀을 판단합니다."
    : sig.label.includes("Volatility")
    ? "IV는 방향성이 아니라 시장이 가격에 반영한 불확실성의 크기입니다."
    : sig.label.includes("Gamma")
    ? "감마 환경은 딜러 헤지가 가격 변동을 누르는지 키우는지 보여줍니다."
    : sig.label.includes("Expiry")
    ? "만기 근처 포지션이 몰리면 핀 리스크와 강제 헤지 민감도가 커집니다."
    : sig.label.includes("Position")
    ? "OI 변화는 신규 포지션 유입, 청산, 행사가 이동을 구분하는 핵심 층입니다."
    : "옵션 플로우가 최종 리스크 점수에 어떤 압력으로 연결되는지 보여줍니다.";
  const connection = risk
    ? `최종 Option Risk ${risk.score}/100에는 PCR ${risk.components.pcrStress}, IV ${risk.components.ivStress}, 감마 ${risk.components.gammaInstability}, 만기 ${risk.components.expiryPressure}가 함께 반영됩니다.`
    : "최종 리스크 점수 계산에는 아직 충분한 컴포넌트가 없습니다.";
  const insight = sig.label.includes("PCR") && options.latestPCR !== null && options.latestPCR >= 1.2
    ? "방어적 포지셔닝은 강하지만 IV와 감마가 함께 높아야 시스템 리스크로 격상됩니다."
    : sig.label.includes("Volatility")
    ? "높은 IV만으로 방향을 단정하지 말고 PCR·감마·만기 집중과 함께 봐야 합니다."
    : sig.label.includes("Gamma")
    ? "음수 감마는 같은 뉴스에도 가격 반응을 더 크게 만들 수 있습니다."
    : sig.label.includes("Expiry")
    ? "단기 만기 집중은 같은 행사가에 몰릴수록 헤지 압력이 더 선명해집니다."
    : "단일 지표가 아니라 가격, IV, OI, 만기 구조가 같은 방향인지 확인해야 합니다.";
  if (typeof console !== "undefined") console.log("[Options debug] chart card explanation data", { label: sig.label, value, trend, meaning, connection, insight });
  return { value, trend, meaning, connection, insight };
}

// ─── Options Tab 2: Market Signals ─────────────────────────────────────────

function OptionsSignalsTab({ options }: { options: OptionsAnalysis }) {
  const signals = options.signals;
  if (!signals.length) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-white/8 bg-slate-950/40 text-sm text-slate-400">
        시그널 계산에 충분한 옵션 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {signals.map((sig) => {
          const border = sig.tone === "bad" ? "border-rose/25 bg-rose/5" : sig.tone === "warn" ? "border-amber/20 bg-amber/5" : "border-mint/20 bg-mint/5";
          const valColor = sig.tone === "bad" ? "text-rose" : sig.tone === "warn" ? "text-amber" : "text-mint";
          const barColor = sig.tone === "bad" ? "#fb7185" : sig.tone === "warn" ? "#f8bf4c" : "#41d6a3";
          const badge = optionRiskBadge(sig.value);
          const explain = buildOptionsSignalExplanation(sig, options);
          return (
            <div key={sig.label} className={`rounded-lg border p-5 ${border}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">{sig.label}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${badge.cls}`}>{badge.label}</span>
              </div>
              <div className="mt-3 flex items-end gap-3">
                <strong className={`text-4xl font-black leading-none ${valColor}`}>{sig.value}</strong>
                <span className="mb-1 text-xs font-bold text-slate-500">/ 100</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${sig.value}%`, backgroundColor: barColor }} />
              </div>
              <div className="mt-3 space-y-1.5 text-[11px] leading-5 text-slate-400">
                <p><span className="font-black text-slate-200">현재:</span> {explain.value}</p>
                <p><span className="font-black text-slate-200">추세:</span> {explain.trend}</p>
                <p><span className="font-black text-slate-200">의미:</span> {explain.meaning}</p>
                <p><span className="font-black text-slate-200">연결:</span> {explain.connection}</p>
                <p className="border-t border-white/8 pt-1.5 text-slate-300"><span className="font-black text-white">한 줄 해석:</span> {explain.insight}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Call vs Put volume comparison */}
      {options.callPutVolSeries.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-slate-950/50 p-5">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">CALL vs PUT VOLUME</p>
          <div className="space-y-2">
            {options.callPutVolSeries.slice(-10).map((p, i) => {
              const total = p.call + p.put || 1;
              const callPct = (p.call / total) * 100;
              return (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-20 shrink-0 truncate text-slate-500">{String(p.date).slice(5, 10)}</span>
                  <div className="flex h-5 flex-1 overflow-hidden rounded-sm">
                    <div style={{ width: `${callPct}%` }} className="bg-mint/60 transition-all" />
                    <div style={{ width: `${100 - callPct}%` }} className="bg-rose/50 transition-all" />
                  </div>
                  <span className="w-20 shrink-0 text-right text-slate-500">C:{Math.round(callPct)}% P:{Math.round(100 - callPct)}%</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[10px] font-bold">
            <span className="flex items-center gap-1.5 text-mint"><span className="h-2.5 w-2.5 rounded-sm bg-mint/60" />콜 거래량</span>
            <span className="flex items-center gap-1.5 text-rose"><span className="h-2.5 w-2.5 rounded-sm bg-rose/50" />풋 거래량</span>
          </div>
        </div>
      )}

      {/* Cross-Signal Composite Interpretations */}
      {options.crossSignals.length > 0 && (
        <div className="rounded-lg border border-violet-400/15 bg-violet-500/5 p-5">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">CROSS-SIGNAL COMPOSITE</p>
          <div className="space-y-2">
            {options.crossSignals.map((cs, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-md border border-violet-500/15 bg-violet-500/8 px-4 py-2.5 text-sm text-slate-200">
                <span className="mt-0.5 shrink-0 text-[10px] font-black text-violet-400 opacity-70">◆</span>
                {cs}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Options Tab 3: Advanced Analytics ──────────────────────────────────────

function OptionsAdvancedTab({ options }: { options: OptionsAnalysis }) {
  const hasStrike = options.strikeData.length > 0;
  const hasExpiry = options.expiryData.length > 0;

  if (!hasStrike && !hasExpiry && !options.riskScore) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-white/8 bg-slate-950/40 text-sm text-slate-400">
        스트라이크·만기 데이터가 없습니다. strike_price, expiration_date 컬럼이 있는 계약별 데이터를 업로드하면 이 탭이 활성화됩니다.
      </div>
    );
  }

  const risk = options.riskScore;

  return (
    <div className="space-y-5">
      {/* Risk Score Breakdown */}
      {risk && (
        <AnalysisPanelShell title="Option Risk Score 분해" tags={[risk.label, `${risk.score}/100`]}>
          {risk.activeComponentCount > 0 && (
            <p className="mb-3 text-xs text-slate-500">{risk.activeComponentCount}개 활성 컴포넌트 기반 가중 산출 · 신뢰도 {risk.confidence} · {risk.explanation}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "PCR Stress", value: risk.components.pcrStress, desc: "PCR 기반 방어 포지셔닝 압력" },
              { label: "IV Stress", value: risk.components.ivStress, desc: "변동성 백분위 / IV Rank" },
              { label: "Gamma Risk", value: risk.components.gammaInstability, desc: "음수 감마 비율 (낮을수록 안정)" },
              { label: "Put Dominance", value: risk.components.putDominanceStress, desc: "풋/콜 거래량 우세 비율" },
              { label: "OI Instability", value: risk.components.oiConcentration, desc: "미결제약정 변화 불안정도" },
              { label: "Expiry Pressure", value: risk.components.expiryPressure, desc: hasExpiry ? "단기 만기 OI·거래량·감마 집중" : "Expiry data unavailable" },
              { label: "Unusual Activity", value: risk.components.unusualActivity, desc: "거래량 이상 탐지 Z-score" },
              { label: "Flow Imbalance", value: risk.components.flowImbalance, desc: "콜/풋 플로우 비대칭" },
            ].map((item) => {
              const tone: Tone = item.value >= 70 ? "bad" : item.value >= 45 ? "warn" : "good";
              const barColor = tone === "bad" ? "#fb7185" : tone === "warn" ? "#f8bf4c" : "#41d6a3";
              return (
                <div key={item.label} className="rounded-lg border border-white/8 bg-slate-950/40 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <strong className="text-2xl font-black text-white">{item.value}</strong>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: barColor }} />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </AnalysisPanelShell>
      )}

      {/* Key Strike / Gamma Flip indicators */}
      {(options.topCallStrikeDetail || options.topPutStrikeDetail || options.gammaFlipZone !== null || hasStrike) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {options.topCallStrikeDetail ? (
            <div className="rounded-lg border border-mint/20 bg-mint/5 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Top Call Strike</p>
              <p className="mt-2 text-2xl font-black text-mint">{options.topCallStrikeDetail.strike.toLocaleString()}</p>
              <p className="mt-1 text-[10px] text-slate-500">OI {Math.round(options.topCallStrikeDetail.oi).toLocaleString()} · 거래량 {Math.round(options.topCallStrikeDetail.volume).toLocaleString()} · 지배도 {options.topCallStrikeDetail.dominance.toFixed(1)}%</p>
            </div>
          ) : hasStrike ? (
            <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Top Call Strike</p>
              <p className="mt-2 text-lg font-black text-slate-400">N/A</p>
              <p className="mt-1 text-[10px] text-slate-500">CALL/C 또는 call_oi 컬럼이 없어 콜 행사가를 임의 추정하지 않았습니다.</p>
            </div>
          ) : null}
          {options.topPutStrikeDetail ? (
            <div className="rounded-lg border border-rose/20 bg-rose/5 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Top Put Strike</p>
              <p className="mt-2 text-2xl font-black text-rose">{options.topPutStrikeDetail.strike.toLocaleString()}</p>
              <p className="mt-1 text-[10px] text-slate-500">OI {Math.round(options.topPutStrikeDetail.oi).toLocaleString()} · 거래량 {Math.round(options.topPutStrikeDetail.volume).toLocaleString()} · 지배도 {options.topPutStrikeDetail.dominance.toFixed(1)}%</p>
            </div>
          ) : hasStrike ? (
            <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Top Put Strike</p>
              <p className="mt-2 text-lg font-black text-slate-400">N/A</p>
              <p className="mt-1 text-[10px] text-slate-500">PUT/P 또는 put_oi 컬럼이 없어 풋 행사가를 임의 추정하지 않았습니다.</p>
            </div>
          ) : null}
          {options.gammaFlipZone !== null && (
            <div className="rounded-lg border border-amber/20 bg-amber/5 p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Gamma Flip Zone</p>
              <p className="mt-2 text-2xl font-black text-amber">{options.gammaFlipZone.toLocaleString()}</p>
              <p className="mt-1 text-[10px] text-slate-500">GEX 부호 전환 추정 구간</p>
            </div>
          )}
        </div>
      )}

      {/* Strike-level OI */}
      {hasStrike && (
        <AnalysisPanelShell title="Strike Concentration Heatmap" tags={[`${options.strikeData.length}개 행사가`, "콜/풋 집중도"]}>
          <div className="space-y-1.5">
            {options.strikeData.slice(-20).map((row) => {
              const totalOI = row.callOI + row.putOI || row.totalOI || 1;
              const callPct = (row.callOI / totalOI) * 100;
              const maxOI = Math.max(...options.strikeData.map((r) => r.totalOI || r.callOI + r.putOI), 1);
              const barWidth = ((row.totalOI || row.callOI + row.putOI) / maxOI) * 100;
              return (
                <div key={row.strike} className="flex items-center gap-3 text-xs">
                  <span className="w-16 shrink-0 text-right font-bold text-slate-300">{row.strike.toLocaleString()}</span>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex h-3 overflow-hidden rounded-sm bg-white/5" style={{ width: `${barWidth}%` }}>
                      <div style={{ width: `${callPct}%` }} className="bg-mint/55" />
                      <div style={{ width: `${100 - callPct}%` }} className="bg-rose/50" />
                    </div>
                  </div>
                  <span className="w-28 shrink-0 text-slate-500">C:{Math.round(row.callOI / 1000)}K P:{Math.round(row.putOI / 1000)}K</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[10px] font-bold">
            <span className="flex items-center gap-1.5 text-mint"><span className="h-2.5 w-2.5 rounded-sm bg-mint/55" />콜 OI</span>
            <span className="flex items-center gap-1.5 text-rose"><span className="h-2.5 w-2.5 rounded-sm bg-rose/50" />풋 OI</span>
            <span className="text-slate-500">사이드 구분이 없는 계약은 총 OI에는 반영되지만 Top Call/Put에는 쓰지 않습니다.</span>
          </div>
        </AnalysisPanelShell>
      )}

      {/* IV Smile (if strike + IV exists) */}
      {hasStrike && options.strikeData.some((r) => r.iv !== null) && (
        <AnalysisPanelShell title="IV Smile / Skew" tags={["행사가별 내재변동성"]}>
          <IVSmileChart data={options.strikeData.filter((r) => r.iv !== null) as Array<{ strike: number; iv: number; callOI: number; putOI: number; callVol: number; putVol: number; gamma: number | null }>} />
        </AnalysisPanelShell>
      )}

      {/* Expiry distribution */}
      {hasExpiry ? (
        <AnalysisPanelShell title="Expiration Ladder" tags={[`${options.expiryData.length}개 만기`, `Expiry Pressure ${risk?.components.expiryPressure ?? options.nearTermPressure}/100`]}>
          <div className="space-y-2">
            {options.expiryData.slice(0, 12).map((row) => {
              const maxOI = Math.max(...options.expiryData.map((r) => r.totalOI), 1);
              const barW = (row.totalOI / maxOI) * 100;
              const urgency: Tone = row.daysLeft <= 3 ? "bad" : row.daysLeft <= 7 ? "warn" : "good";
              const barColor = urgency === "bad" ? "bg-rose/60" : urgency === "warn" ? "bg-amber/55" : "bg-cyan/50";
              return (
                <div key={row.expiry} className="flex items-center gap-3 text-xs">
                  <span className={`w-24 shrink-0 font-bold ${urgency === "bad" ? "text-rose" : urgency === "warn" ? "text-amber" : "text-slate-300"}`}>{String(row.expiry).slice(0, 10)}</span>
                  <div className="flex-1">
                    <div className={`h-4 rounded-sm ${barColor}`} style={{ width: `${barW}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-slate-500">{row.daysLeft}일 남음</span>
                  <span className="w-20 shrink-0 text-right text-slate-400">{row.totalOI >= 1000 ? `${Math.round(row.totalOI / 1000)}K` : Math.round(row.totalOI)}</span>
                </div>
              );
            })}
          </div>
        </AnalysisPanelShell>
      ) : (
        <AnalysisPanelShell title="Expiration Ladder" tags={["Expiry data unavailable"]}>
          <p className="text-sm leading-6 text-slate-400">expiration, expiry_date, dte, days_to_expiry, 만기일, 잔존일수 컬럼이 함께 감지되지 않아 만기 압력을 0으로 숨기지 않고 데이터 부족으로 표시합니다.</p>
        </AnalysisPanelShell>
      )}
    </div>
  );
}

// ─── IV Smile Chart ─────────────────────────────────────────────────────────

function IVSmileChart({ data }: { data: Array<{ strike: number; iv: number; callOI: number; putOI: number; callVol: number; putVol: number; gamma: number | null }> }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sorted = [...data].sort((a, b) => a.strike - b.strike);
  const width = 860;
  const PAD_RIGHT = 12;
  const chartH = 250;
  const xAxisTop = chartH + 14;
  const totalH = xAxisTop + 18;
  const strikes = sorted.map((d) => d.strike);
  const ivs = sorted.map((d) => d.iv);
  const minS = Math.min(...strikes), maxS = Math.max(...strikes);
  const minIV = Math.min(...ivs) * 0.9, maxIV = Math.max(...ivs) * 1.1;
  const spanS = maxS - minS || 1, spanIV = maxIV - minIV || 1;
  const xFor = (s: number) => ((s - minS) / spanS) * width;
  const yFor = (iv: number) => chartH - 8 - ((iv - minIV) / spanIV) * (chartH - 24);
  const linePath = sorted.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(d.strike).toFixed(1)},${yFor(d.iv).toFixed(1)}`).join(" ");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || sorted.length < 2) return;
    const rect = svg.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetStrike = minS + relX * spanS;
    let closest = 0;
    sorted.forEach((d, i) => { if (Math.abs(d.strike - targetStrike) < Math.abs(sorted[closest].strike - targetStrike)) closest = i; });
    setHoverIdx(closest);
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${width + PAD_RIGHT} ${totalH}`} className="w-full" style={{ height: "230px" }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
      <path d={linePath} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {sorted.map((d, i) => (
        <circle key={i} cx={xFor(d.strike)} cy={yFor(d.iv)} r="3.5" fill="#a78bfa" opacity="0.7" />
      ))}
      <line x1="0" y1={xAxisTop - 4} x2={width} y2={xAxisTop - 4} stroke="rgba(148,163,184,0.10)" strokeWidth="1" />
      {sorted.map((d, i) => {
        if (i % Math.max(1, Math.ceil(sorted.length / 8)) !== 0) return null;
        return <text key={i} x={xFor(d.strike)} y={xAxisTop + 12} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="600">{d.strike.toLocaleString()}</text>;
      })}
      {hoverIdx !== null && (() => {
        const d = sorted[hoverIdx];
        const hx = xFor(d.strike);
        const hy = yFor(d.iv);
        const onRight = hx > width * 0.6;
        return (
          <g>
            <line x1={hx} y1="8" x2={hx} y2={chartH} stroke="rgba(167,139,250,0.3)" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx={hx} cy={hy} r="5.5" fill="#a78bfa" stroke="rgba(2,6,23,0.8)" strokeWidth="2" />
            <rect x={onRight ? hx - 132 : hx + 8} y={Math.max(10, hy - 35)} width="124" height="54" rx="5" fill="rgba(2,6,23,0.93)" stroke="rgba(167,139,250,0.3)" strokeWidth="1" />
            <text x={onRight ? hx - 128 : hx + 12} y={Math.max(10, hy - 35) + 16} fill="#94a3b8" fontSize="9" fontWeight="700">Strike {d.strike.toLocaleString()}</text>
            <text x={onRight ? hx - 128 : hx + 12} y={Math.max(10, hy - 35) + 32} fill="#a78bfa" fontSize="13" fontWeight="900">IV {d.iv.toFixed(1)}%</text>
            <text x={onRight ? hx - 128 : hx + 12} y={Math.max(10, hy - 35) + 48} fill="#64748b" fontSize="9" fontWeight="700">C:{Math.round(d.callOI / 1000)}K P:{Math.round(d.putOI / 1000)}K</text>
          </g>
        );
      })()}
      <rect x="0" y="0" width={width} height={totalH} fill="transparent" />
    </svg>
  );
}

// ─── Options Tab 4: AI Interpretation ───────────────────────────────────────

function OptionsInterpretationTab({ options, analysis, engine }: { options: OptionsAnalysis; analysis: AnalysisResult; engine: VisualizationEngine }) {
  const summary = options.aiSummary;
  const risk = options.riskScore;
  const impact = risk?.alphaImpact ?? "neutral";
  const impactColor = impact === "risk-off" ? "text-rose border-rose/30 bg-rose/5" : impact === "cautionary" ? "text-amber border-amber/25 bg-amber/5" : impact === "supportive" ? "text-mint border-mint/20 bg-mint/5" : "text-slate-300 border-white/10 bg-white/5";

  return (
    <div className="space-y-5">
      {/* Market Condition */}
      <div className="rounded-lg border border-violet-400/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.08),rgba(2,6,23,0.95))] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-violet-400">MARKET CONDITION</p>
        {risk && (
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-md border border-white/8 bg-white/[0.04] p-3"><p className="text-slate-500">Option Risk</p><p className="mt-1 text-xl font-black text-white">{risk.score}/100</p></div>
            <div className="rounded-md border border-white/8 bg-white/[0.04] p-3"><p className="text-slate-500">Confidence</p><p className="mt-1 text-xl font-black text-cyan">{risk.confidence}</p></div>
            <div className="rounded-md border border-white/8 bg-white/[0.04] p-3"><p className="text-slate-500">Expiry</p><p className="mt-1 text-xl font-black text-amber">{options.expiryData.length ? `${risk.components.expiryPressure}/100` : "N/A"}</p></div>
            <div className="rounded-md border border-white/8 bg-white/[0.04] p-3"><p className="text-slate-500">Flow</p><p className="mt-1 text-xl font-black text-rose">{risk.components.flowImbalance}/100</p></div>
          </div>
        )}
        <p className="mt-3 text-base leading-7 text-slate-200">{summary.condition || "옵션 데이터를 업로드하면 AI 해석이 생성됩니다."}</p>
        {summary.riskExplanation && (
          <p className="mt-3 border-t border-white/8 pt-3 text-sm leading-6 text-slate-400">{summary.riskExplanation}</p>
        )}
        {risk?.explanation && (
          <p className="mt-2 text-sm leading-6 text-slate-300">{risk.explanation}</p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Key Observations */}
        {summary.observations.length > 0 && (
          <AnalysisPanelShell title="Key Observations" tags={["실시간 데이터 기반"]}>
            <div className="space-y-2.5">
              {summary.observations.map((obs, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-cyan/15 bg-cyan/5 px-4 py-3 text-sm text-slate-200">
                  <span className="mt-0.5 shrink-0 text-xs font-black text-cyan opacity-70">{i + 1}.</span>
                  {obs}
                </div>
              ))}
            </div>
          </AnalysisPanelShell>
        )}

        {/* Potential Scenarios */}
        {summary.scenarios.length > 0 && (
          <AnalysisPanelShell title="Potential Scenarios" tags={["확률 기반 시나리오"]}>
            <div className="space-y-3">
              {summary.scenarios.map((sc, i) => {
                const isBullish = sc.type === "bullish";
                const isRisk = sc.type === "risk";
                const borderCls = isBullish ? "border-mint/20 bg-mint/5" : isRisk ? "border-rose/20 bg-rose/5" : "border-amber/15 bg-amber/5";
                const labelCls = isBullish ? "text-mint" : isRisk ? "text-rose" : "text-amber";
                const badge = isBullish ? "BULLISH" : isRisk ? "RISK" : "NEUTRAL";
                return (
                  <div key={i} className={`rounded-lg border p-4 ${borderCls}`}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${labelCls}`}>{badge}</span>
                      <span className="text-xs font-black text-slate-200">{sc.title}</span>
                    </div>
                    <p className="mb-2 text-xs text-slate-400">{sc.condition}</p>
                    {sc.signals.length > 0 && (
                      <ul className="mb-2 space-y-0.5">
                        {sc.signals.map((s, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                            <span className={`mt-0.5 shrink-0 text-[9px] ${labelCls}`}>▸</span>{s}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-[10px] text-slate-500">무효화: {sc.invalidation}</p>
                  </div>
                );
              })}
            </div>
          </AnalysisPanelShell>
        )}
      </div>

      {/* Option Alpha Contribution — options data is a layer, not a standalone bullish signal */}
      <AnalysisPanelShell title="Option Alpha Contribution" tags={[impact.toUpperCase(), risk ? `Risk ${risk.score}/100` : "—"]}>
        <div className={`flex items-start gap-4 rounded-lg border p-4 ${impactColor}`}>
          <div className="mt-0.5 shrink-0 text-xl">{impact === "risk-off" ? "⚠" : impact === "cautionary" ? "◈" : impact === "supportive" ? "✓" : "◇"}</div>
          <div className="flex-1">
            <p className="text-sm font-black uppercase tracking-[0.15em]">
              {impact === "risk-off" ? "Risk-Off — Alpha 하향 조정" : impact === "cautionary" ? "Cautionary — 강세 신호 약화" : impact === "supportive" ? "Supportive — 포지셔닝 우호적" : "Neutral — 방향성 중립"}
            </p>
            <p className="mt-2 text-sm leading-6 opacity-85">{summary.alphaNote}</p>
          </div>
        </div>
        {/* Options data is a sentiment/volatility layer — cannot independently produce a bullish Alpha Score */}
        <div className="mt-4 rounded-lg border border-white/8 bg-slate-950/50 p-4">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">OPTIONS DATA SCOPE</p>
          <p className="text-xs leading-6 text-slate-400">
            옵션 데이터는 시장 심리·변동성·포지셔닝 레이어로 기능합니다.
            단독으로 가격 방향 Alpha를 생성하지 않습니다.
            강한 Alpha 신호는 OHLCV 또는 수급 데이터와 결합될 때 신뢰할 수 있습니다.
          </p>
          {risk && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-white/8 bg-white/4 p-2">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">PCR Stress</p>
                <p className={`mt-1 text-lg font-black ${risk.components.pcrStress >= 65 ? "text-rose" : risk.components.pcrStress >= 45 ? "text-amber" : "text-mint"}`}>{risk.components.pcrStress}</p>
              </div>
              <div className="rounded-md border border-white/8 bg-white/4 p-2">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Put Dom</p>
                <p className={`mt-1 text-lg font-black ${risk.components.putDominanceStress >= 70 ? "text-rose" : risk.components.putDominanceStress >= 50 ? "text-amber" : "text-mint"}`}>{risk.components.putDominanceStress}</p>
              </div>
              <div className="rounded-md border border-white/8 bg-white/4 p-2">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Gamma Risk</p>
                <p className={`mt-1 text-lg font-black ${risk.components.gammaInstability >= 50 ? "text-rose" : "text-mint"}`}>{risk.components.gammaInstability}</p>
              </div>
            </div>
          )}
        </div>
      </AnalysisPanelShell>

      {/* Warnings */}
      {options.preprocessingWarnings.length > 0 && (
        <AnalysisPanelShell title="처리 경고" tags={[`${options.preprocessingWarnings.length}개 경고`]}>
          <div className="space-y-2">
            {options.preprocessingWarnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-amber/20 bg-amber/5 px-4 py-2.5 text-sm font-semibold text-amber">
                <span>⚠</span>{w}
              </div>
            ))}
          </div>
        </AnalysisPanelShell>
      )}
    </div>
  );
}

// ─── 공매도 압력 히트맵 ─────────────────────────────────────────────────────

type ShortHeatmapHover = {
  idx: number;
  rect: DOMRect;
  row: Row;
  field: string;
  normalized: number | null;
  label: string;
  color: string;
};

function ShortHeatmapTooltip({ hover }: { hover: ShortHeatmapHover }) {
  const [pos, setPos] = useState({ left: 16, top: 16, placement: "bottom" as "top" | "bottom" });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const width = tooltipRef.current?.offsetWidth ?? 300;
    const height = tooltipRef.current?.offsetHeight ?? 260;
    const margin = 16;
    const below = window.innerHeight - hover.rect.bottom;
    const above = hover.rect.top;
    const placement = below < height + margin && above > below ? "top" : "bottom";
    const rawTop = placement === "top" ? hover.rect.top - height - 12 : hover.rect.bottom + 12;
    const rawLeft = hover.rect.left + hover.rect.width / 2 - width / 2;
    const left = Math.max(margin, Math.min(window.innerWidth - width - margin, rawLeft));
    const top = Math.max(margin, Math.min(window.innerHeight - height - margin, rawTop));
    setPos({ left, top, placement });
    if (typeof console !== "undefined") console.log("[Short debug] tooltip portal mount target", document.body);
    if (typeof console !== "undefined") console.log("[Short debug] tooltip final position", { left, top, placement, cell: hover.idx });
  }, [hover]);

  const date = String(hover.row.date ?? `기간 ${hover.idx + 1}`).slice(0, 10);
  const ticker = String(hover.row.ticker ?? hover.row.symbol ?? "N/A");
  const fields = ["short_ratio", "borrow_fee", "utilization_rate", "days_to_cover", "squeeze_score", "short_volume", "short_balance", "short_value"].filter((field) => hover.row[field] != null || hover.row[`${field}__raw`] != null);

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[99999] max-h-[min(360px,calc(100vh-32px))] w-[min(340px,calc(100vw-32px))] overflow-y-auto rounded-lg border border-white/15 bg-slate-950/98 p-3 text-xs text-slate-200 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur"
      style={{ left: pos.left, top: pos.top, pointerEvents: "auto", position: "fixed" }}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">공매도 히트맵</p>
          <p className="mt-1 font-black text-white">{date}</p>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-black text-slate-300">{pos.placement === "top" ? "위로 표시" : "아래로 표시"}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 border-b border-white/10 pb-2 text-[11px]">
        <span className="text-slate-500">티커</span><span className="text-right font-bold text-slate-100">{ticker}</span>
        <span className="text-slate-500">기준 지표</span><span className="text-right font-bold text-slate-100">{hover.field}</span>
        <span className="text-slate-500">압력 상태</span><span className="text-right font-bold" style={{ color: hover.color }}>{hover.label}</span>
      </div>
      <div className="mt-2 space-y-2">
        {fields.map((field) => {
          const raw = hover.row[`${field}__raw`] ?? hover.row[field];
          const metric = normalizeDisplayMetric(field, raw);
          return (
            <div key={field} className="rounded-md border border-white/[0.07] bg-white/[0.03] p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-black text-white">{field}</p>
                <span className={metric.status === "anomaly" ? "text-rose" : metric.status === "extreme" ? "text-amber" : "text-cyan"}>{metric.displayValue}</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                <span>Raw Value</span><span className="text-right text-slate-300">{metric.rawValue}</span>
                <span>Type</span><span className="text-right text-slate-300">{metric.metricType}</span>
                <span>Status</span><span className="text-right text-slate-300">{metric.status}</span>
                <span>Alpha Contribution</span><span className="text-right text-slate-300">{metric.alphaStatus}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

function ShortPressureHeatmap({ short, analysis }: { short: ShortAnalysis; analysis?: AnalysisResult }) {
  const [hover, setHover] = useState<ShortHeatmapHover | null>(null);
  const [selectedHover, setSelectedHover] = useState<ShortHeatmapHover | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // shortRows 없으면 analysis.rows에서 short 컬럼을 직접 추출
  const rawRows = short.shortRows.length > 0 ? short.shortRows : (analysis?.rows ?? []);
  const rows = rawRows.slice(-72);

  const has = (f: string) => short.availableFields.includes(f as ShortAnalysis["availableFields"][number]);
  // 우선순위 순서로 dominant field 선택
  const dominantField = has("short_ratio") ? "short_ratio"
    : has("borrow_fee") ? "borrow_fee"
    : has("utilization_rate") ? "utilization_rate"
    : has("squeeze_score") ? "squeeze_score"
    : has("days_to_cover") ? "days_to_cover"
    : has("dark_pool_short_ratio") ? "dark_pool_short_ratio"
    : has("short_balance_ratio") ? "short_balance_ratio"
    : null;

  // dominant field가 없어도 숫자 데이터가 있으면 렌더링
  const numericCols = rows.length > 0 ? Object.keys(rows[0]).filter(k => {
    const vals = rows.map(r => Number(r[k])).filter(Number.isFinite);
    return vals.length >= rows.length * 0.5;
  }) : [];
  const fallbackField = dominantField ?? numericCols.find(c => /short|borrow|squeeze|dtc|utilization/i.test(c)) ?? numericCols[0] ?? null;
  const activeField = fallbackField;

  if (!rows.length || !activeField) {
    return <div className="flex h-32 items-center justify-center rounded-lg border border-white/8 bg-slate-950/40 text-sm text-slate-500">유효한 공매도 데이터가 없습니다.</div>;
  }

  const rawVals = rows.map((r) => (activeField ? Number(r[activeField]) : NaN));
  const validVals = rawVals.filter(Number.isFinite);
  const sortedVals = [...validVals].sort((a, b) => a - b);
  const percentile = (p: number) => sortedVals.length ? sortedVals[Math.min(sortedVals.length - 1, Math.max(0, Math.floor((sortedVals.length - 1) * p)))] : 0;
  const vMin = percentile(0.05);
  const vMax = Math.max(percentile(0.95), vMin + 0.001);
  const vSpan = vMax - vMin || 1;
  const normalized = rawVals.map((v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, (v - vMin) / vSpan)) : null));
  const anomalySet = new Set(rawVals.map((v, i) => Number.isFinite(v) && (v < vMin || v > vMax) ? i : -1).filter((i) => i >= 0));

  const pressureColor = (n: number | null) => {
    if (n === null) return "#1e293b";
    if (n >= 0.8) return "#fb3d66";
    if (n >= 0.6) return "#fb7185";
    if (n >= 0.4) return "#f8bf4c";
    if (n >= 0.2) return "#38bdf8";
    return "#41d6a3";
  };
  const pressureLabel = (n: number | null) => {
    if (n === null) return "데이터 없음";
    if (n >= 0.8) return "극단";
    if (n >= 0.6) return "높음";
    if (n >= 0.4) return "주의";
    if (n >= 0.2) return "보통";
    return "낮음";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/8 bg-slate-950/50 p-4 overflow-visible" style={{ overflow: "visible", transform: "none", contain: "none", isolation: "auto" }}>
        <div className="overflow-auto scroll-smooth p-3">
          <div className="grid min-w-[690px] gap-2 overflow-visible" style={{ gridTemplateColumns: "repeat(12, minmax(52px, 1fr))", minHeight: `${Math.ceil(rows.length / 12) * 38}px` }}>
            {normalized.map((n, i) => {
              const color = pressureColor(n);
              const label = pressureLabel(n);
              const selected = selectedIdx === i;
              const anomaly = anomalySet.has(i) || rows[i]?.[`${activeField}__status`] === "anomaly";
              return (
                <button
                  key={i}
                  type="button"
                  className={`relative min-h-8 min-w-[52px] rounded-md border text-[10px] font-black transition focus:outline-none ${selected ? "border-white text-white" : "border-white/[0.05] text-slate-950"} ${anomaly ? "ring-1 ring-amber/60" : ""}`}
                  style={{ backgroundColor: color, opacity: n === null ? 0.22 : 0.72, boxShadow: hover?.idx === i ? `0 0 18px ${color}` : "none" }}
                  onMouseEnter={(e) => setHover({ idx: i, rect: e.currentTarget.getBoundingClientRect(), row: rows[i], field: activeField, normalized: n, label, color })}
                  onMouseMove={(e) => setHover({ idx: i, rect: e.currentTarget.getBoundingClientRect(), row: rows[i], field: activeField, normalized: n, label, color })}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => {
                    const nextHover = { idx: i, rect: e.currentTarget.getBoundingClientRect(), row: rows[i], field: activeField, normalized: n, label, color };
                    setSelectedIdx(i);
                    setSelectedHover(nextHover);
                    e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
                    if (typeof console !== "undefined") console.log("[Short debug] selected row visibility status", { index: i, rect: e.currentTarget.getBoundingClientRect() });
                  }}
                >
                  {n === null ? "N/A" : `${(n * 100).toFixed(0)}`}
                  {anomaly ? <span className="absolute right-1 top-0.5 text-[9px] text-amber-950">!</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {hover || selectedHover ? <ShortHeatmapTooltip hover={(hover ?? selectedHover)!} /> : null}

      {/* 범례 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-400">
        {[
          { color: "#41d6a3", label: "낮음 (0–20)" },
          { color: "#38bdf8", label: "보통 (20–40)" },
          { color: "#f8bf4c", label: "주의 (40–60)" },
          { color: "#fb7185", label: "높음 (60–80)" },
          { color: "#fb3d66", label: "극단 (80–100)" }
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded" style={{ background: color, opacity: 0.75 }} />
            {label}
          </span>
        ))}
        {activeField ? <span className="ml-auto text-[10px] text-slate-600">기준 지표: {activeField}</span> : null}
      </div>
    </div>
  );
}

function ShortHoverableMainChart({ short, chart }: { short: ShortAnalysis; chart: AnalysisResult["chart"] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const W = 860;
  const H = 280;
  const PAD = { t: 18, b: 22, l: 8, r: 8 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const ratioRows = short.shortRows.filter((r) => Number.isFinite(Number(r.short_ratio)) && Number(r.short_ratio) > 0).slice(-80);
  const hasPrice = chart.length > 0;
  const hasRatio = ratioRows.length > 0;

  if (!hasPrice && !hasRatio) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-white/10 bg-slate-950/55 text-sm text-slate-400">
        시각화 가능한 데이터가 부족합니다.
      </div>
    );
  }

  const normalizeDateKey = (value: unknown, fallback: number) => {
    const s = String(value ?? "").trim();
    const d = s ? new Date(s) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : `row-${fallback}`;
  };
  const priceMap = new Map(chart.map((p, i) => [normalizeDateKey(p.date, i), p.close]));
  const ratioMap = new Map(ratioRows.map((r, i) => [normalizeDateKey(r.date, i), r]));
  const allDates = Array.from(new Set([...priceMap.keys(), ...ratioMap.keys()])).sort().slice(-80);
  const prices = allDates.map((date) => priceMap.get(date) ?? null);
  const ratios = allDates.map((date) => {
    const row = ratioMap.get(date);
    const value = row ? Number(row.short_ratio) : NaN;
    return Number.isFinite(value) ? value : null;
  });
  const n = Math.max(allDates.length, 1);

  const finitePrices = prices.filter((v): v is number => v !== null && Number.isFinite(v));
  const finiteRatios = ratios.filter((v): v is number => v !== null && Number.isFinite(v));
  const pMin = finitePrices.length ? Math.min(...finitePrices) : 0;
  const pMax = finitePrices.length ? Math.max(...finitePrices, pMin + 1) : 1;
  const rMin = finiteRatios.length ? Math.min(...finiteRatios, 0) : 0;
  const rMax = finiteRatios.length ? Math.max(...finiteRatios, rMin + 0.01) : 0.01;
  const pSpan = pMax - pMin || 1;
  const rSpan = rMax - rMin || 0.01;

  const xFor = (i: number, tot: number) => PAD.l + (tot <= 1 ? cW / 2 : (i / (tot - 1)) * cW);
  const yForP = (v: number) => PAD.t + cH - ((v - pMin) / pSpan) * cH;
  const yForR = (v: number) => PAD.t + cH - ((v - rMin) / rSpan) * cH;

  const pathFor = (series: Array<number | null>, yFor: (v: number) => number) => {
    let d = "";
    series.forEach((v, i) => {
      if (v === null) return;
      const prev = i === 0 || series[i - 1] === null;
      d += `${prev ? "M" : "L"}${xFor(i, n).toFixed(1)},${yFor(v).toFixed(1)} `;
    });
    return d.trim();
  };
  const pricePath = pathFor(prices, yForP);
  const ratioPath = pathFor(ratios, yForR);
  const high50 = finiteRatios.filter((v) => v >= 0.5);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (W / rect.width);
    const plotX = Math.max(0, Math.min(cW, svgX - PAD.l));
    const idx = Math.max(0, Math.min(n - 1, Math.round((plotX / cW) * (n - 1))));
    setHoveredIdx(idx);
    if (typeof console !== "undefined") console.log("[Short debug] chart hover", { activeIndex: idx, activeDate: allDates[idx], mouseX: e.clientX - rect.left, plotX });
  };

  const hasBorrow = short.availableFields.includes("borrow_fee");
  const hasSqueeze = short.availableFields.includes("squeeze_score");
  const hasDtc = short.availableFields.includes("days_to_cover");

  const hov = hoveredIdx;
  const hovX = hov !== null ? xFor(hov, n) : null;
  const hovPrice = hov !== null ? prices[hov] : null;
  const hovRatio = hov !== null ? ratios[hov] : null;
  const hovDate = hov !== null ? allDates[hov] : null;
  const hovShortRow = hov !== null ? ratioMap.get(allDates[hov]) : null;
  const hovBorrow = hovShortRow && hasBorrow ? Number(hovShortRow.borrow_fee__raw ?? hovShortRow.borrow_fee) : null;
  const hovSqueeze = hovShortRow && hasSqueeze ? Number(hovShortRow.squeeze_score) : null;
  const hovDtc = hovShortRow && hasDtc ? Number(hovShortRow.days_to_cover__raw ?? hovShortRow.days_to_cover) : null;
  const ttX = hovX !== null ? Math.max(PAD.l, Math.min(W - PAD.r - 148, hovX - 74)) : 0;
  const ttLines = [
    hovDate && hovDate !== "undefined" ? hovDate.slice(0, 12) : null,
    hovPrice !== null ? `종가  ${hovPrice.toLocaleString()}` : null,
    hovRatio !== null ? `공매도비율  ${normalizeDisplayMetric("short_ratio", hovRatio).displayValue}` : null,
    hovBorrow !== null && Number.isFinite(hovBorrow) ? `차입비용  ${normalizeDisplayMetric("borrow_fee", hovBorrow).displayValue}` : null,
    hovSqueeze !== null && Number.isFinite(hovSqueeze) ? `스퀴즈  ${hovSqueeze.toFixed(1)}` : null,
    hovDtc !== null && Number.isFinite(hovDtc) ? `DTC  ${normalizeDisplayMetric("days_to_cover", hovDtc).displayValue}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3 transition duration-300 hover:shadow-[0_0_40px_rgba(251,113,133,0.14)]">
      <div className="mb-2 flex flex-wrap gap-2">
        {hasPrice ? <MiniBadge tone="good">종가</MiniBadge> : null}
        {hasRatio ? <MiniBadge tone="bad">공매도비율</MiniBadge> : null}
        {hasBorrow ? <MiniBadge tone="warn">차입비용</MiniBadge> : null}
        {hasSqueeze ? <MiniBadge tone="warn">스퀴즈점수</MiniBadge> : null}
        {hasDtc ? <MiniBadge tone="muted">DTC</MiniBadge> : null}
        {high50.length > 0 ? <MiniBadge tone="warn">50%+ 구간 {high50.length}개</MiniBadge> : null}
        <span className="ml-auto text-[10px] text-slate-500">마우스 오버 → 실제 값 표시</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-64 w-full cursor-crosshair overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {hasRatio && ratios.map((v, i) => v !== null && v >= 0.5 ? <rect key={i} x={xFor(i, n) - 4} y={PAD.t} width="8" height={cH} fill="rgba(251,113,133,0.07)" /> : null)}
        {hasPrice ? <line x1={PAD.l} y1={yForP(pMin + pSpan / 2)} x2={W - PAD.r} y2={yForP(pMin + pSpan / 2)} stroke="rgba(148,163,184,0.10)" strokeDasharray="4 6" /> : null}
        {hasPrice ? <path d={pricePath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" /> : null}
        {hasRatio ? <path d={ratioPath} fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeDasharray={hasPrice ? "6 4" : "0"} /> : null}
        {hov !== null && hovX !== null ? (
          <g>
            <line x1={hovX} y1={PAD.t} x2={hovX} y2={H - PAD.b} stroke="rgba(148,163,184,0.3)" strokeWidth="1" strokeDasharray="3 3" />
            {hovPrice !== null ? <circle cx={hovX} cy={yForP(hovPrice)} r="5" fill="#38bdf8" stroke="white" strokeWidth="1.5" /> : null}
            {hovRatio !== null ? <circle cx={hovX} cy={yForR(hovRatio)} r="5" fill="#fb7185" stroke="white" strokeWidth="1.5" /> : null}
            <rect x={ttX} y="6" width="136" height={10 + ttLines.length * 16} rx="5" fill="rgba(8,12,28,0.96)" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
            {ttLines.map((line, li) => {
              const colors = ["#94a3b8", "#38bdf8", "#fb7185", "#fbbf24", "#a78bfa", "#6ee7b7"];
              return <text key={li} x={ttX + 8} y={16 + li * 15} fill={colors[li] ?? "#e2e8f0"} fontSize={li === 0 ? "9" : "10"} fontWeight={li === 0 ? "600" : "900"}>{line}</text>;
            })}
          </g>
        ) : null}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-400">
        {hasPrice ? <span><span className="mr-1.5 inline-block h-2 w-5 rounded bg-cyan/80" />가격</span> : null}
        {hasRatio ? <span><span className="mr-1.5 inline-block h-2 w-5 rounded bg-rose/80" />공매도비율</span> : null}
      </div>
    </div>
  );
}

function ShortVolumeBarChart({ short }: { short: ShortAnalysis }) {
  const rows = short.shortRows.filter((r) => Number.isFinite(Number(r.short_volume)) && Number(r.short_volume) > 0).slice(-60);
  const W = 400; const H = 150;
  if (!rows.length) return <div className="flex h-28 items-center justify-center text-xs text-slate-500">공매도 거래량 없음</div>;
  const vals = rows.map((r) => Number(r.short_volume));
  const maxVal = Math.max(...vals, 1);
  const avgVal = vals.reduce((a, b) => a + b, 0) / vals.length;
  const bw = Math.max(3, Math.min(12, W / vals.length * 0.6));
  const xf = (i: number) => vals.length <= 1 ? W / 2 : (i / (vals.length - 1)) * W;
  const yf = (v: number) => H - 16 - (v / maxVal) * (H - 32);
  return (
    <div className="rounded-lg border border-white/8 bg-slate-950/40 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full">
        <line x1="0" y1={yf(avgVal)} x2={W} y2={yf(avgVal)} stroke="rgba(148,163,184,0.22)" strokeDasharray="3 4" />
        {vals.map((v, i) => <rect key={i} x={xf(i) - bw / 2} y={yf(v)} width={bw} height={H - 16 - yf(v)} rx="1.5" fill="rgba(251,113,133,0.55)" />)}
      </svg>
      <div className="mt-1 flex gap-1.5 flex-wrap">
        <MiniBadge tone="bad">공매도량</MiniBadge>
        <MiniBadge tone="muted">{formatAxis(vals.at(-1) ?? 0)}</MiniBadge>
      </div>
    </div>
  );
}

function shortTrendCards(short: ShortAnalysis): Array<{ label: string; value: string; detail: string; tone: Tone }> {
  const cards: Array<{ label: string; value: string; detail: string; tone: Tone }> = [];
  const rows = short.shortRows;
  const calcTrend = (field: string) => {
    const vals = rows.map((r) => Number(r[field])).filter(Number.isFinite);
    if (vals.length < 6) return null;
    const n5 = Math.min(5, Math.floor(vals.length / 3));
    const recent = vals.slice(-n5).reduce((a, b) => a + b, 0) / n5;
    const prev = vals.slice(-n5 * 4, -n5);
    const prevAvg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : recent;
    return prevAvg === 0 ? 0 : ((recent - prevAvg) / Math.abs(prevAvg)) * 100;
  };
  if (short.availableFields.includes("short_ratio")) {
    const delta = calcTrend("short_ratio");
    if (delta !== null) {
      const vals = rows.map((r) => Number(r.short_ratio)).filter(Number.isFinite);
      const latest = vals.at(-1) ?? 0;
      cards.push({ label: "Short Ratio Trend", value: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`, detail: `최근 ${normalizeDisplayMetric("short_ratio", latest).displayValue}`, tone: delta > 20 ? "bad" : delta > 5 ? "warn" : delta < -10 ? "good" : "muted" });
    }
  }
  if (short.availableFields.includes("borrow_fee")) {
    const delta = calcTrend("borrow_fee");
    if (delta !== null) {
      const vals = rows.map((r) => Number(r.borrow_fee)).filter(Number.isFinite);
      const latest = vals.at(-1) ?? 0;
      cards.push({ label: "Borrow Fee Trend", value: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`, detail: `최근 ${normalizeDisplayMetric("borrow_fee", latest).displayValue}`, tone: delta > 30 ? "bad" : delta > 10 ? "warn" : "good" });
    }
  }
  if (short.availableFields.includes("short_balance")) {
    const delta = calcTrend("short_balance");
    if (delta !== null) {
      cards.push({ label: "Short Balance Trend", value: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`, detail: "공매도 잔고 추세", tone: delta > 20 ? "warn" : delta < -15 ? "good" : "muted" });
    }
  }
  if (short.availableFields.includes("cover_volume")) {
    const vals = rows.map((r) => Number(r.cover_volume)).filter((v) => Number.isFinite(v) && v > 0);
    if (vals.length >= 3) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const spikes = vals.filter((v) => v > avg * 1.5);
      cards.push({ label: "Cover Volume Spikes", value: `${spikes.length}건`, detail: "평균 대비 1.5× 초과", tone: spikes.length >= 3 ? "good" : spikes.length >= 1 ? "warn" : "muted" });
    }
  }
  if (short.availableFields.includes("utilization_rate")) {
    const vals = rows.map((r) => Number(r.utilization_rate)).filter(Number.isFinite);
    if (vals.length >= 2) {
      const latest = vals.at(-1) ?? 0;
      cards.push({ label: "Utilization Rate", value: normalizeDisplayMetric("utilization_rate", latest).displayValue, detail: "대차 활용률 최근값", tone: latest >= 0.9 ? "bad" : latest >= 0.7 ? "warn" : "good" });
    }
  }
  return cards;
}

function ShortRollingRelationshipTable({ short, analysis }: { short: ShortAnalysis; analysis: AnalysisResult }) {
  const prices = analysis.chart.map((p) => p.close);
  const corr = (xs: number[], ys: number[]) => {
    const len = Math.min(xs.length, ys.length);
    if (len < 5) return null;
    const xa = xs.slice(-len); const ya = ys.slice(-len);
    const mx = xa.reduce((a, b) => a + b, 0) / len; const my = ya.reduce((a, b) => a + b, 0) / len;
    const num = xa.reduce((acc, x, i) => acc + (x - mx) * (ya[i] - my), 0);
    const den = Math.sqrt(xa.reduce((acc, x) => acc + (x - mx) ** 2, 0) * ya.reduce((acc, y) => acc + (y - my) ** 2, 0));
    return den === 0 ? null : num / den;
  };
  const futRet = prices.slice(5).map((p, i) => (p - prices[i]) / (prices[i] || 1));
  const vol = prices.slice(1).map((p, i) => Math.abs(p - prices[i]) / (prices[i] || 1));
  const get = (f: string) => short.shortRows.map((r) => Number(r[f])).filter(Number.isFinite);
  const rows: Array<{ label: string; r: number | null; desc: string }> = [
    { label: "short_ratio vs 미래 수익률", r: corr(get("short_ratio"), futRet), desc: "공매도비율이 높을수록 미래 수익률과의 관계" },
    { label: "borrow_fee vs 변동성", r: corr(get("borrow_fee"), vol), desc: "차입 비용과 일중 가격 변동성의 관계" },
    { label: "cover_volume vs 반등 확률", r: corr(get("cover_volume"), futRet), desc: "커버링 거래량 급증 이후 가격 반등 경향" },
    { label: "short_balance vs 하락 위험", r: corr(get("short_balance"), futRet.map((v) => -v)), desc: "공매도 잔고와 하락 위험의 관계" }
  ];
  const noneAvailable = rows.every((row) => row.r === null);
  if (noneAvailable) return <p className="text-sm text-slate-400">공매도 데이터 부족으로 상관관계 분석이 어렵습니다.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            <th className="py-3 pr-4">지표 관계</th>
            <th className="py-3 pr-4 text-center">r (상관계수)</th>
            <th className="py-3">설명</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rStr = row.r === null ? "N/A" : row.r.toFixed(3);
            const tone = row.r === null ? "muted" : Math.abs(row.r) >= 0.5 ? (row.r < 0 ? "bad" : "good") : "warn";
            const textCls = tone === "bad" ? "text-rose" : tone === "good" ? "text-mint" : tone === "warn" ? "text-amber" : "text-slate-500";
            return (
              <tr key={row.label} className="border-b border-white/8 hover:bg-white/[0.015] transition">
                <td className="py-3 pr-4 font-semibold text-slate-200">{row.label}</td>
                <td className={`py-3 pr-4 text-center font-black ${textCls}`}>{rStr}</td>
                <td className="py-3 text-slate-400">{row.desc}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function shortKeyFindings(short: ShortAnalysis): Array<{ text: string; tone: Tone }> {
  const findings: Array<{ text: string; tone: Tone }> = [];
  const rows = short.shortRows;
  const p = short.shortPressure;
  if (short.availableFields.includes("short_ratio")) {
    const vals = rows.map((r) => Number(r.short_ratio)).filter(Number.isFinite);
    if (vals.length >= 5) {
      const n = Math.min(5, Math.floor(vals.length / 3));
      const rAvg = vals.slice(-n).reduce((a, b) => a + b, 0) / n;
      const pArr = vals.slice(-n * 4, -n);
      const pAvg = pArr.length ? pArr.reduce((a, b) => a + b, 0) / pArr.length : rAvg;
      const delta = pAvg === 0 ? 0 : (rAvg - pAvg) / Math.abs(pAvg);
      if (Math.abs(delta) > 0.05) {
        findings.push({ text: `short_ratio가 최근 ${n}개 기간 동안 ${delta > 0 ? "상승" : "하락"}하였습니다 (${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)}%). 현재 ${normalizeDisplayMetric("short_ratio", rAvg).displayValue} 수준.`, tone: delta > 0.15 ? "bad" : delta > 0.05 ? "warn" : "good" });
      }
    }
  }
  if (p && p.components.borrowFeeRank >= 70) {
    findings.push({ text: `차입 비용(borrow_fee)이 Rolling Percentile 기준 ${p.components.borrowFeeRank.toFixed(0)}% 구간에 위치합니다. 역사적 상위 구간으로 공매도 포지션 유지 비용이 높습니다.`, tone: p.components.borrowFeeRank >= 85 ? "bad" : "warn" });
  }
  if (p && p.components.utilizationRank >= 70) {
    findings.push({ text: `이용률(utilization_rate) 랭크 ${p.components.utilizationRank}% — 대차 가능 주식 대비 실제 차입 비율이 높아 추가 공매도 포지셔닝이 어려워질 수 있습니다.`, tone: p.components.utilizationRank >= 85 ? "bad" : "warn" });
  }
  if (p && p.components.squeezeRank >= 65) {
    findings.push({ text: `스퀴즈 점수 랭크 ${p.components.squeezeRank}% — 이 수준에서 급격한 커버링 매수 시 단기 숏 스퀴즈가 발생할 수 있습니다.`, tone: p.components.squeezeRank >= 80 ? "bad" : "warn" });
  }
  if (p && p.components.daysToCovertRank >= 65) {
    findings.push({ text: `커버링 일수(Days to Cover) 랭크 ${p.components.daysToCovertRank}% — 포지션 청산에 필요한 일수가 역사적 상위 구간입니다. 청산 이벤트 발생 시 급반등 가능성이 높습니다.`, tone: p.components.daysToCovertRank >= 80 ? "bad" : "warn" });
  }
  if (short.availableFields.includes("cover_volume")) {
    const vals = rows.map((r) => Number(r.cover_volume)).filter((v) => Number.isFinite(v) && v > 0);
    if (vals.length >= 3) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const spikes = vals.filter((v) => v > avg * 1.5);
      if (spikes.length >= 2) findings.push({ text: `cover_volume 스파이크가 ${spikes.length}번 감지되었습니다. 공매도 청산(숏 커버링)이 활발히 일어나고 있을 가능성을 시사합니다.`, tone: "good" });
    }
  }
  if (p) {
    if (p.score >= 70) findings.push({ text: `공매도 압력 점수가 ${p.score}/100으로 극단 구간에 있습니다. 과밀 포지셔닝 상황에서 반대 방향 이벤트 시 Short Squeeze 위험이 있습니다.`, tone: "bad" });
    else if (p.score < 30) findings.push({ text: `공매도 압력 점수가 ${p.score}/100으로 낮은 수준입니다. 현재 공매도 포지셔닝 강도는 제한적입니다.`, tone: "good" });
    if (p.coveringSignal !== null && p.coveringSignal >= 65) findings.push({ text: `커버링 신호 강도 ${p.coveringSignal}/100 — 공매도 청산 압력이 증가하고 있습니다. 단기 가격 반등 가능성을 모니터링할 필요가 있습니다.`, tone: "warn" });
  }
  return findings.slice(0, 5);
}

function shortRiskInterpretation(short: ShortAnalysis): string {
  const p = short.shortPressure;
  const n = short.availableFields.length;
  if (!p) return n >= 2
    ? `${n}개 공매도 필드 감지 (${short.availableFields.join(", ")}). 압력 점수 계산을 위해 추가 데이터를 업로드하면 더 정확한 해석이 가능합니다.`
    : "공매도 압력 계산을 위한 충분한 데이터가 없습니다. 공매도 비율, 차입 비용, 이용률 등의 컬럼을 포함한 데이터셋이 필요합니다.";
  const detailParts: string[] = [];
  if (short.availableFields.includes("short_ratio")) detailParts.push(`비율 랭크 ${p.components.shortRatioRank}%`);
  if (short.availableFields.includes("borrow_fee")) detailParts.push(`차입비용 랭크 ${p.components.borrowFeeRank}%`);
  if (short.availableFields.includes("utilization_rate")) detailParts.push(`이용률 랭크 ${p.components.utilizationRank}%`);
  if (short.availableFields.includes("days_to_cover")) detailParts.push(`커버링일수 랭크 ${p.components.daysToCovertRank}%`);
  if (short.availableFields.includes("squeeze_score")) detailParts.push(`스퀴즈 랭크 ${p.components.squeezeRank}%`);
  const detail = detailParts.length ? ` (${detailParts.join(", ")})` : "";
  if (p.score >= 80) return `공매도 압력이 극단 수준(${p.score}/100)${detail}. 과밀 포지셔닝으로, 트리거 이벤트 발생 시 Short Squeeze 위험이 높습니다. 긍정적 촉매 발생 시 대규모 커버링 매수가 나타날 수 있습니다.`;
  if (p.score >= 60) return `공매도 압력이 높은 수준(${p.score}/100)${detail}. 공매도 포지셔닝이 역사적 상위 구간에 위치하며 변동성 확대 위험이 있습니다. 차입 비용 추이와 커버링 신호를 주시하세요.`;
  if (p.score >= 40) return `공매도 압력이 보통 수준(${p.score}/100)${detail}. 활성화된 포지셔닝이 있으나 극단적 수준은 아닙니다. 추세 변화 신호에 주의가 필요합니다.`;
  if (p.coveringSignal !== null && p.coveringSignal >= 60) return `전반적인 공매도 압력은 낮지만(${p.score}/100), 커버링 신호(${p.coveringSignal}/100)가 강화되고 있습니다. 공매도 청산 반등 가능성을 모니터링하세요.`;
  return `현재 공매도 압력은 제한적인 수준(${p.score}/100)${detail}. 전반적인 공매도 포지셔닝이 안정적이며, 단기 Short Squeeze 위험은 낮습니다.`;
}

type ShortChartKind = "short_ratio" | "borrow_fee" | "balance" | "cover_volume" | "short_volume" | "utilization_rate";

function shortChartExplanation(short: ShortAnalysis, kind: ShortChartKind) {
  const rows = short.shortRows;
  const valuesFor = (field: string) => rows.map((row) => Number(row[field])).filter(Number.isFinite);
  const trendLabel = (values: number[]) => {
    if (values.length < 5) return "데이터 부족";
    const recent = meanUi(values.slice(-3));
    const previous = meanUi(values.slice(-10, -3));
    if (!Number.isFinite(previous) || Math.abs(previous) < 1e-9) return "혼재";
    const change = recent / previous - 1;
    if (change > 0.12) return "상승";
    if (change < -0.12) return "하락";
    return "안정";
  };
  const riskBadge = (risk: "LOW RISK" | "MEDIUM RISK" | "HIGH RISK" | "SQUEEZE WATCH" | "BEARISH PRESSURE" | "DATA INSUFFICIENT") => risk;
  const priceValues = rows.map((row) => Number(row.close)).filter(Number.isFinite);
  const priceRising = priceValues.length >= 5 ? priceValues.at(-1)! > priceValues.at(-5)! : false;
  const priceFalling = priceValues.length >= 5 ? priceValues.at(-1)! < priceValues.at(-5)! : false;

  if (kind === "short_ratio") {
    const vals = valuesFor("short_ratio");
    const latest = vals.at(-1);
    const over50 = vals.filter((value) => value >= 0.5).length;
    const trend = trendLabel(vals);
    const risk = over50 > 0 || (latest ?? 0) >= 0.35 ? "HIGH RISK" : (latest ?? 0) >= 0.15 ? "MEDIUM RISK" : "LOW RISK";
    return {
      title: "공매도비율 라인",
      current: latest == null ? "N/A" : normalizeDisplayMetric("short_ratio", latest).displayValue,
      trend: `${trend}${over50 ? `, 50% 초과 ${over50}개` : ""}`,
      meaning: "활성 공매도 압력이 어느 정도 시장 거래에 섞여 있는지 보여줍니다.",
      risk: riskBadge(risk),
      interpretation: "DTC 확장이나 가격 약세 확인 없이 단독 약세 신호로 보지 않고 리스크 레이어로 해석합니다.",
      insight: "가격이 버티는 중 공매도비율이 오르면 스퀴즈 긴장이 생깁니다."
    };
  }
  if (kind === "borrow_fee") {
    const vals = valuesFor("borrow_fee");
    const latest = vals.at(-1);
    const trend = trendLabel(vals);
    const latestPct = latest == null ? 0 : latest * 100;
    const risk = latestPct >= 50 ? "SQUEEZE WATCH" : latestPct >= 20 ? "HIGH RISK" : latestPct >= 5 ? "MEDIUM RISK" : "LOW RISK";
    return {
      title: "차입 비용",
      current: latest == null ? "N/A" : normalizeDisplayMetric("borrow_fee", latest).displayValue,
      trend,
      meaning: "공매도 포지션을 유지하는 비용 부담입니다.",
      risk: riskBadge(risk),
      interpretation: "차입 비용이 높고 가격이 상승하면 숏 포지션 유지 부담이 커져 커버링 압력이 높아집니다.",
      insight: "높은 비용은 방향 신호가 아니라 포지션 스트레스 신호입니다."
    };
  }
  if (kind === "balance") {
    const field = short.availableFields.includes("short_balance") ? "short_balance" : "borrow_balance";
    const vals = valuesFor(field);
    const trend = trendLabel(vals);
    return {
      title: "공매도/대차 잔고 추세",
      current: vals.at(-1) == null ? "N/A" : formatAxis(vals.at(-1)!),
      trend,
      meaning: "누적 숏 노출이 증가하는지 감소하는지 확인합니다.",
      risk: riskBadge(trend === "상승" ? "MEDIUM RISK" : "LOW RISK"),
      interpretation: "잔고 상승은 가격과 거래량 확인이 붙을 때만 스퀴즈 또는 약세 압력으로 강하게 해석합니다.",
      insight: "잔고만 상승하고 가격 확인이 없으면 관찰 신호입니다."
    };
  }
  if (kind === "cover_volume") {
    const vals = valuesFor("cover_volume");
    const latest = vals.at(-1);
    const avg = meanUi(vals);
    const spike = latest != null && avg > 0 && latest > avg * 1.5;
    return {
      title: "커버링 거래량",
      current: latest == null ? "N/A" : formatAxis(latest),
      trend: spike ? "스파이크 감지" : trendLabel(vals),
      meaning: "숏 포지션 청산 매수 가능성을 보여줍니다.",
      risk: riskBadge(spike && priceRising ? "SQUEEZE WATCH" : spike ? "MEDIUM RISK" : "LOW RISK"),
      interpretation: "커버링 거래량은 가격 상승과 숏 잔고 감소가 함께 있을 때 가장 의미가 큽니다.",
      insight: priceRising ? "가격 반등과 함께라면 커버링 진행 가능성을 봅니다." : "가격 확인 전에는 단순 거래량 변화일 수 있습니다."
    };
  }
  if (kind === "short_volume") {
    const vals = valuesFor("short_volume");
    const trend = trendLabel(vals);
    const risk = priceFalling && trend === "상승" ? "BEARISH PRESSURE" : priceRising && trend === "상승" ? "SQUEEZE WATCH" : trend === "상승" ? "MEDIUM RISK" : "LOW RISK";
    return {
      title: "공매도 거래량",
      current: vals.at(-1) == null ? "N/A" : formatAxis(vals.at(-1)!),
      trend,
      meaning: "실제로 신규 공매도 압력이 들어오는 강도입니다.",
      risk: riskBadge(risk),
      interpretation: "가격 약세 중 증가하면 약세 압력, 가격 강세 중 증가하면 스퀴즈 긴장으로 해석합니다.",
      insight: "가격 방향과 함께 봐야 의미가 확정됩니다."
    };
  }
  const vals = valuesFor("utilization_rate");
  const latest = vals.at(-1);
  const latestPct = latest == null ? 0 : latest * 100;
  return {
    title: "대차 활용률",
    current: latest == null ? "N/A" : normalizeDisplayMetric("utilization_rate", latest).displayValue,
    trend: trendLabel(vals),
    meaning: "빌릴 수 있는 주식 대비 실제 차입 수요의 포화도입니다.",
    risk: riskBadge(latestPct >= 80 ? "HIGH RISK" : latestPct >= 50 ? "MEDIUM RISK" : "LOW RISK"),
    interpretation: "활용률이 높으면 추가 차입 여력이 줄어들어 가격 상승 시 스퀴즈 민감도가 커집니다.",
    insight: "80% 이상은 대차 수급 과열 신호로 봅니다."
  };
}

function ShortChartExplanation({ short, kind }: { short: ShortAnalysis; kind: ShortChartKind }) {
  const item = shortChartExplanation(short, kind);
  const tone: Tone = item.risk === "LOW RISK" ? "good" : item.risk === "DATA INSUFFICIENT" ? "muted" : item.risk === "HIGH RISK" || item.risk === "BEARISH PRESSURE" ? "bad" : "warn";
  if (typeof console !== "undefined") console.log("[Short debug] chart card explanation data", { kind, ...item });
  return (
    <div className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.035] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{item.title}</p>
        <MiniBadge tone={tone}>{item.risk}</MiniBadge>
      </div>
      <div className="grid gap-1 text-[11px] leading-5 text-slate-300">
        <p><span className="font-black text-white">현재:</span> {item.current} · <span className="font-black text-white">추세:</span> {item.trend}</p>
        <p><span className="font-black text-white">의미:</span> {item.meaning}</p>
        <p><span className="font-black text-white">해석:</span> {item.interpretation}</p>
        <p className="text-cyan"><span className="font-black">한 줄 인사이트:</span> {item.insight}</p>
      </div>
    </div>
  );
}


function ShortRatioLineChart({ short }: { short: ShortAnalysis }) {
  const rows = short.shortRows.filter((r) => Number.isFinite(Number(r.short_ratio))).slice(-80);
  const width = 860;
  const height = 200;
  if (!rows.length) return <div className="flex h-40 items-center justify-center text-sm text-slate-400">공매도비율 데이터 없음</div>;
  const vals = rows.map((r) => Number(r.short_ratio));
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 0.01);
  const span = max - min || 0.01;
  const xFor = (i: number) => rows.length <= 1 ? width / 2 : (i / (rows.length - 1)) * width;
  const yFor = (v: number) => height - 20 - ((v - min) / span) * (height - 40);
  const path = vals.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");
  const areaPath = `M0,${yFor(min)} ${vals.map((v, i) => `L${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ")} L${xFor(vals.length - 1).toFixed(1)},${yFor(min)} Z`;
  const overHeat = vals.filter((v) => v >= 0.5);
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/55 p-3">
      {overHeat.length > 0 ? <div className="mb-2 text-xs font-bold text-amber">⚠ 50%+ 과열 구간 {overHeat.length}개 포인트 감지</div> : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full overflow-visible">
        <defs>
          <linearGradient id="shortRatioGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {vals.map((v, i) => v >= 0.5 ? <rect key={i} x={xFor(i) - 4} y="0" width="8" height={height} fill="rgba(251,113,133,0.07)" /> : null)}
        <line x1="0" y1={yFor(0.5)} x2={width} y2={yFor(0.5)} stroke="#f8bf4c" strokeWidth="1" strokeDasharray="5 6" opacity="0.6" />
        <path d={areaPath} fill="url(#shortRatioGrad)" />
        <path d={path} fill="none" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" />
        <text x={width - 10} y={yFor(0.5) - 5} fill="#f8bf4c" fontSize="10" fontWeight="800" textAnchor="end">50% threshold</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-2">
        <MiniBadge tone="bad">공매도비율 라인</MiniBadge>
        <MiniBadge tone="muted">최근 {vals.at(-1) !== undefined ? normalizeDisplayMetric("short_ratio", vals.at(-1)).displayValue : "N/A"}</MiniBadge>
      </div>
    </div>
  );
}

function ShortBalanceAreaChart({ short }: { short: ShortAnalysis }) {
  const has = (f: ShortAnalysis["availableFields"][number]) => short.availableFields.includes(f);
  const field = has("short_balance") ? "short_balance" : "borrow_balance";
  const rows = short.shortRows.filter((r) => Number.isFinite(Number(r[field]))).slice(-80);
  const width = 860;
  const height = 200;
  if (!rows.length) return <div className="flex h-40 items-center justify-center text-sm text-slate-400">잔고 데이터 없음</div>;
  const vals = rows.map((r) => Number(r[field]));
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 1);
  const span = max - min || 1;
  const xFor = (i: number) => rows.length <= 1 ? width / 2 : (i / (rows.length - 1)) * width;
  const yFor = (v: number) => height - 20 - ((v - min) / span) * (height - 40);
  const areaPath = `M0,${yFor(min)} ${vals.map((v, i) => `L${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ")} L${xFor(vals.length - 1).toFixed(1)},${yFor(min)} Z`;
  const linePath = vals.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/55 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full overflow-visible">
        <defs>
          <linearGradient id="balanceGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#balanceGrad)" />
        <path d={linePath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="mt-2 flex flex-wrap gap-2">
        <MiniBadge tone="good">{field === "short_balance" ? "공매도 잔고" : "대차 잔고"}</MiniBadge>
        <MiniBadge tone="muted">최근 {vals.at(-1) !== undefined ? formatAxis(vals.at(-1)!) : "N/A"}</MiniBadge>
      </div>
    </div>
  );
}

function BorrowFeeLineChart({ short }: { short: ShortAnalysis }) {
  const rows = short.shortRows.filter((r) => Number.isFinite(Number(r.borrow_fee))).slice(-80);
  const width = 860;
  const height = 200;
  if (!rows.length) return <div className="flex h-40 items-center justify-center text-sm text-slate-400">차입 비용 데이터 없음</div>;
  const vals = rows.map((r) => Number(r.borrow_fee));
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 0.001);
  const span = max - min || 0.001;
  const xFor = (i: number) => rows.length <= 1 ? width / 2 : (i / (rows.length - 1)) * width;
  const yFor = (v: number) => height - 20 - ((v - min) / span) * (height - 40);
  const path = vals.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");
  const recentMean = vals.slice(-5).reduce((a, b) => a + b, 0) / Math.max(vals.slice(-5).length, 1);
  const histMean = vals.slice(-20).reduce((a, b) => a + b, 0) / Math.max(vals.slice(-20).length, 1);
  const rising = recentMean > histMean * 1.2;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/55 p-3">
      {rising ? <div className="mb-2 text-xs font-bold text-amber">⚠ 차입 비용 급등 감지 — 최근 평균 {normalizeDisplayMetric("borrow_fee", recentMean).displayValue}</div> : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full overflow-visible">
        {vals.map((v, i) => {
          const rank = vals.slice(0, i + 1).filter((x) => x <= v).length / (i + 1);
          return rank >= 0.8 ? <rect key={i} x={xFor(i) - 4} y="0" width="8" height={height} fill="rgba(251,61,102,0.09)" /> : null;
        })}
        <path d={path} fill="none" stroke="#f8bf4c" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="mt-2 flex flex-wrap gap-2">
        <MiniBadge tone={rising ? "warn" : "good"}>차입 수수료 {rising ? "상승 추세" : "안정적"}</MiniBadge>
        <MiniBadge tone="muted">최근 {normalizeDisplayMetric("borrow_fee", recentMean).displayValue}</MiniBadge>
      </div>
    </div>
  );
}

function CoverVolumeBarChart({ short }: { short: ShortAnalysis }) {
  const rows = short.shortRows.filter((r) => Number.isFinite(Number(r.cover_volume)) && Number(r.cover_volume) > 0).slice(-60);
  const width = 860;
  const height = 180;
  if (!rows.length) return <div className="flex h-40 items-center justify-center text-sm text-slate-400">커버링 데이터 없음</div>;
  const vals = rows.map((r) => Number(r.cover_volume));
  const maxVal = Math.max(...vals, 1);
  const avgVal = vals.reduce((a, b) => a + b, 0) / vals.length;
  const barW = Math.max(4, Math.min(14, width / vals.length * 0.6));
  const xFor = (i: number) => vals.length <= 1 ? width / 2 : (i / (vals.length - 1)) * width;
  const yFor = (v: number) => height - 20 - (v / maxVal) * (height - 40);
  const spikes = vals.filter((v) => v > avgVal * 1.5);
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/55 p-3">
      {spikes.length > 0 ? <div className="mb-2 text-xs font-bold text-mint">✓ 커버링 스파이크 {spikes.length}개 — 숏 스퀴즈 가능성 확인</div> : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full overflow-visible">
        <line x1="0" y1={yFor(avgVal)} x2={width} y2={yFor(avgVal)} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 6" />
        {vals.map((v, i) => {
          const isSpike = v > avgVal * 1.5;
          return (
            <g key={i}>
              <rect x={xFor(i) - barW / 2} y={yFor(v)} width={barW} height={height - 20 - yFor(v)} rx="2" fill={isSpike ? "#41d6a3" : "rgba(56,189,248,0.45)"} />
              {isSpike ? <circle cx={xFor(i)} cy={yFor(v) - 8} r="4" fill="#41d6a3" /> : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2">
        <MiniBadge tone="good">커버링 상환량</MiniBadge>
        <MiniBadge tone="muted">평균 대비 스파이크 {spikes.length}건</MiniBadge>
      </div>
    </div>
  );
}

function UtilizationRateChart({ short }: { short: ShortAnalysis }) {
  const rows = short.shortRows.filter((r) => Number.isFinite(Number(r.utilization_rate))).slice(-80);
  const width = 860;
  const height = 180;
  if (!rows.length) return <div className="flex h-40 items-center justify-center text-sm text-slate-400">활용률 데이터 없음</div>;
  const vals = rows.map((r) => Number(r.utilization_rate));
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 0.01);
  const span = max - min || 0.01;
  const xFor = (i: number) => rows.length <= 1 ? width / 2 : (i / (rows.length - 1)) * width;
  const yFor = (v: number) => height - 20 - ((v - min) / span) * (height - 40);
  const path = vals.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/55 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full overflow-visible">
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="mt-2 flex flex-wrap gap-2">
        <MiniBadge tone="good">대차 활용률</MiniBadge>
        <MiniBadge tone="muted">최근 {vals.at(-1) !== undefined ? normalizeDisplayMetric("utilization_rate", vals.at(-1)).displayValue : "N/A"}</MiniBadge>
      </div>
    </div>
  );
}

function ShortWhatIfPanel({ short }: { short: ShortAnalysis }) {
  const [simRatio, setSimRatio] = useState(short.shortPressure?.components.shortRatioRank ?? 50);
  const [simFee, setSimFee] = useState(short.shortPressure?.components.borrowFeeRank ?? 50);
  const [simUtil, setSimUtil] = useState(short.shortPressure?.components.utilizationRank ?? 50);
  const [simCover, setSimCover] = useState(short.shortPressure?.coveringSignal ?? 20);
  const simulatedScore = Math.round(
    simRatio * 0.25 + simFee * 0.20 + simUtil * 0.20 + (100 - simCover) * 0.15 + 50 * 0.20
  );
  const tone: Tone = simulatedScore >= 70 ? "bad" : simulatedScore >= 45 ? "warn" : "good";
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-400 mb-2">공매도비율 랭크</label>
          <input type="range" min="0" max="100" value={simRatio} onChange={(e) => setSimRatio(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>0 (낮음)</span><span className="font-bold text-white">{simRatio}</span><span>100 (극단)</span></div>
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-400 mb-2">차입 비용 랭크</label>
          <input type="range" min="0" max="100" value={simFee} onChange={(e) => setSimFee(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>0 (저렴)</span><span className="font-bold text-white">{simFee}</span><span>100 (고가)</span></div>
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-400 mb-2">이용률 랭크</label>
          <input type="range" min="0" max="100" value={simUtil} onChange={(e) => setSimUtil(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>0 (낮음)</span><span className="font-bold text-white">{simUtil}</span><span>100 (포화)</span></div>
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-400 mb-2">커버링 신호</label>
          <input type="range" min="0" max="100" value={simCover} onChange={(e) => setSimCover(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>0 (없음)</span><span className="font-bold text-white">{simCover}</span><span>100 (급증)</span></div>
        </div>
      </div>
      <div className="rounded-lg border border-white/10 bg-slate-950/40 p-4 flex flex-col items-center justify-center gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">시뮬레이션 압력 점수</p>
        <span className={`text-6xl font-black ${tone === "bad" ? "text-rose" : tone === "warn" ? "text-amber" : "text-mint"}`}>{simulatedScore}</span>
        <MiniBadge tone={tone}>{simulatedScore >= 80 ? "EXTREME" : simulatedScore >= 60 ? "HIGH" : simulatedScore >= 40 ? "ELEVATED" : "LOW"}</MiniBadge>
        <p className="text-center text-xs leading-5 text-slate-400">{simCover >= 70 ? "커버링 급증 — 스퀴즈 환경" : simulatedScore >= 60 ? "높은 공매도 집중 — 반등 리스크" : "공매도 압력 제한적"}</p>
      </div>
    </div>
  );
}

function ShortReportCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: Tone }) {
  const color = tone === "good" ? "text-mint border-mint/30" : tone === "warn" ? "text-amber border-amber/30" : tone === "bad" ? "text-rose border-rose/30" : "text-cyan border-cyan/25";
  return (
    <div className={`rounded-lg border bg-slate-950/55 p-4 ${color}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-black ${color.split(" ")[0]}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function shortPressureShortLabel(score: number) {
  if (score >= 80) return "EXTREME";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "ELEVATED";
  if (score >= 20) return "NORMAL";
  return "LOW";
}

function shortStructureLabel(short: ShortAnalysis) {
  const p = short.shortPressure;
  if (!p) return "공매도 데이터 감지";
  if (p.score >= 80) return "극단적 공매도 집중 구조";
  if (p.score >= 60) return "높은 공매도 압력 구조";
  if (p.coveringSignal !== null && p.coveringSignal >= 70) return "숏 커버링 반등 가능 구조";
  if (p.score >= 40) return "공매도 포지셔닝 활성화";
  return "공매도 압력 제한적 구조";
}

function shortStructureSummary(short: ShortAnalysis) {
  const p = short.shortPressure;
  const fields = short.availableFields.join(", ");
  const base = `감지된 공매도 관련 필드: ${fields}. `;
  if (!p) return base + "공매도 압력 점수 계산에 충분한 데이터가 없습니다.";
  if (p.score >= 70) return base + `공매도 압력이 극도로 높습니다 (${p.score}/100). 과밀 포지셔닝 또는 차입 비용 급등이 감지되고 있으며, 단기 숏 스퀴즈 위험이 있습니다.`;
  if (p.score >= 45) return base + `공매도 압력이 보통 이상 수준입니다 (${p.score}/100). 공매도 포지션이 활성화된 상태이나 아직 극단 구간은 아닙니다.`;
  if (p.coveringSignal !== null && p.coveringSignal >= 60) return base + `공매도 압력은 낮지만 커버링 신호가 강화되고 있습니다. 숏 청산 반등 가능성을 모니터링할 필요가 있습니다.`;
  return base + `공매도 압력은 현재 제한적인 수준입니다 (${p.score}/100). 추가 신호 확인이 필요합니다.`;
}

function shortConditionText(short: ShortAnalysis) {
  const p = short.shortPressure;
  if (!p) return "공매도 압력 산출을 위한 충분한 컬럼이 감지되지 않았습니다. 공매도 비율, 잔고, 차입 비용 중 최소 2개가 필요합니다.";
  if (p.score >= 70) return `공매도 압력 점수 ${p.score}/100으로 과밀 포지셔닝이 확인됩니다. 비율 랭크 ${p.components.shortRatioRank}%, 차입비용 랭크 ${p.components.borrowFeeRank}%, 이용률 랭크 ${p.components.utilizationRank}%가 역사적 상위 구간에 위치합니다.`;
  return `공매도 압력 점수 ${p.score}/100. 현재 구간은 ${p.label} 상태로, 특별한 과열 신호는 제한적입니다.`;
}

function shortOpportunityText(short: ShortAnalysis) {
  const p = short.shortPressure;
  if (!p) return "공매도 데이터만으로 진입 기회를 판단하기 어렵습니다. 가격 데이터와 함께 분석할 것을 권장합니다.";
  if (p.coveringSignal !== null && p.coveringSignal >= 65) return `커버링 신호가 ${p.coveringSignal}/100으로 강합니다. 공매도 청산 반등(숏 스퀴즈) 가능성을 확인하세요.`;
  if (p.score >= 70) return "극단적 공매도 집중은 반등 트리거가 발생할 경우 급격한 커버링 매수를 유발할 수 있습니다.";
  return "현재 공매도 압력 수준에서의 직접 신호는 제한적입니다. 추세 확인 후 판단을 권장합니다.";
}

function shortRiskText(short: ShortAnalysis) {
  const p = short.shortPressure;
  if (!p) return "공매도 데이터 부족으로 정확한 리스크 산출이 어렵습니다.";
  const risks: string[] = [];
  if (p.components.borrowFeeRank >= 75) risks.push("차입 비용 급등");
  if (p.components.shortRatioRank >= 70 && p.components.utilizationRank >= 70) risks.push("비율·이용률 동시 과밀");
  if (p.components.squeezeRank >= 75) risks.push("스퀴즈 위험 상승");
  if (p.components.daysToCovertRank >= 70) risks.push("커버링 일수 증가");
  if (p.score >= 60) risks.push("반대 방향 급등 위험");
  return risks.length ? `주요 리스크: ${risks.join(", ")}. 가격 데이터와 함께 확인하세요.` : "현재 뚜렷한 단기 리스크 신호는 제한적입니다.";
}

function shortScenarioA(short: ShortAnalysis) {
  const p = short.shortPressure;
  if (!p) return "데이터 부족으로 시나리오 생성 불가.";
  if (p.score >= 65 || (p.coveringSignal !== null && p.coveringSignal >= 65)) return "시나리오 A: 공매도 압력이 고점에 도달하고 커버링이 가속되면 단기 급반등(숏 스퀴즈)이 나타날 수 있습니다.";
  return `시나리오 A: 현재 공매도 압력 ${p.score}점 유지 시 별다른 이벤트 없이 횡보 또는 완만한 하방 압력이 지속될 수 있습니다.`;
}

function shortScenarioB(short: ShortAnalysis) {
  const p = short.shortPressure;
  if (!p) return "데이터 부족으로 시나리오 생성 불가.";
  if (p.components.borrowFeeRank >= 75) return "시나리오 B: 차입 비용 추가 상승 시 공매도 포지션 유지 비용 증가로 자발적 청산이 나타날 수 있습니다.";
  return "시나리오 B: 공매도 비율이 추가 상승하면 압력 점수가 극단 구간으로 진입하며 과밀 포지셔닝 위험이 높아질 수 있습니다.";
}

function shortConditionTags(short: ShortAnalysis) {
  const p = short.shortPressure;
  const tags: string[] = ["SHORT DETECTED"];
  if (short.isShortOnlyMode) tags.push("REPORT MODE");
  if (p) {
    if (p.score >= 70) tags.push("HIGH PRESSURE");
    if (p.coveringSignal !== null && p.coveringSignal >= 65) tags.push("SQUEEZE RISK");
    if (p.components.borrowFeeRank >= 75) tags.push("RISING BORROW COST");
    if (p.components.squeezeRank >= 75) tags.push("SQUEEZE SIGNAL");
    if (p.components.utilizationRank >= 80) tags.push("HIGH UTILIZATION");
  }
  if (short.availableFields.includes("short_ratio")) tags.push("RATIO TRACKED");
  if (short.availableFields.includes("borrow_fee")) tags.push("FEE TRACKED");
  return tags;
}

function borrowCostTrend(short: ShortAnalysis) {
  const rows = short.shortRows.map((r) => Number(r.borrow_fee)).filter(Number.isFinite);
  if (rows.length < 6) return "N/A";
  const recent = rows.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prev = rows.slice(-20, -5).reduce((a, b) => a + b, 0) / Math.max(rows.slice(-20, -5).length, 1);
  if (prev === 0) return "N/A";
  const delta = ((recent - prev) / prev) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
}

function borrowCostTone(short: ShortAnalysis): Tone {
  const rows = short.shortRows.map((r) => Number(r.borrow_fee)).filter(Number.isFinite);
  if (rows.length < 6) return "muted";
  const recent = rows.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prev = rows.slice(-20, -5).reduce((a, b) => a + b, 0) / Math.max(rows.slice(-20, -5).length, 1);
  if (prev === 0) return "muted";
  return recent > prev * 1.3 ? "bad" : recent > prev * 1.1 ? "warn" : "good";
}

function coverProbability(short: ShortAnalysis) {
  const cs = short.shortPressure?.coveringSignal;
  if (cs === null || cs === undefined) return "N/A";
  if (cs >= 80) return "높음";
  if (cs >= 55) return "보통";
  return "낮음";
}

function crowdingRisk(short: ShortAnalysis) {
  const p = short.shortPressure;
  if (!p) return "N/A";
  if (p.components.shortRatioRank >= 70 && p.components.utilizationRank >= 70) return "높음";
  if (p.score >= 55) return "보통";
  return "낮음";
}

function crowdingTone(short: ShortAnalysis): Tone {
  const p = short.shortPressure;
  if (!p) return "muted";
  if (p.components.shortRatioRank >= 70 && p.components.utilizationRank >= 70) return "bad";
  if (p.score >= 55) return "warn";
  return "good";
}

function shortComponentLabel(key: string) {
  const labels: Record<string, string> = {
    shortRatioRank: "비율 랭크",
    borrowFeeRank: "차입비용 랭크",
    utilizationRank: "이용률 랭크",
    daysToCovertRank: "커버링일수 랭크",
    squeezeRank: "스퀴즈 랭크",
    shortVolumeRatioRank: "거래량 비율",
    darkPoolRank: "다크풀 랭크",
    accelerationScore: "가속 점수"
  };
  return labels[key] ?? key;
}


// ─── Macro Workspace ──────────────────────────────────────────────────────────

const FREQ_KO: Record<string, string> = { daily: "일별", weekly: "주별", monthly: "월별", quarterly: "분기별", irregular: "불규칙", unknown: "불명" };
const MODE_KO: Record<string, string> = { full: "전체 모드", standard: "표준 모드", lite: "경량 모드", summary: "요약 모드" };

function MacroWorkspace({
  macro,
  analysis,
  engine,
  activeTab,
  setActiveTab,
}: {
  macro: MacroAnalysis;
  analysis: AnalysisResult;
  engine: VisualizationEngine;
  activeTab: MacroWorkspaceTab;
  setActiveTab: (tab: MacroWorkspaceTab) => void;
}) {
  if (analysis.datasetClassification.primaryType === "economic_calendar") {
    return <EconomicCalendarWorkspace calendar={analysis.economicCalendarAnalysis} activeTab={activeTab} setActiveTab={setActiveTab} />;
  }
  const tabs: Array<{ id: MacroWorkspaceTab; label: string; kicker: string }> = [
    { id: "indicators", label: "시각화 & 데이터 분석", kicker: "VISUALIZATION" },
    { id: "regime",     label: "주요 거시 특성",        kicker: "KEY FEATURES" },
    { id: "risk",       label: "리스크 & 압력 분석",    kicker: "RISK DETAIL" },
    { id: "report",     label: "AI 거시 리포트",        kicker: "AI REPORT" },
  ];
  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-2 overflow-x-auto rounded-full border border-cyan/15 bg-slate-950/60 p-1.5 shadow-[0_0_38px_rgba(56,189,248,0.08)] backdrop-blur">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`min-w-max rounded-full px-5 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${
                activeTab === tab.id
                  ? "bg-cyan/15 text-white shadow-[0_0_28px_rgba(56,189,248,0.18)] ring-1 ring-cyan/35"
                  : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"}`}>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan/70">{tab.kicker}</div>
              <div className="mt-0.5 text-xs font-bold tracking-wide">{tab.label}</div>
            </button>
          ))}
        </div>
      </div>
      {activeTab === "indicators" && <MacroVisualizationTab macro={macro} />}
      {activeTab === "regime"     && <MacroFeaturesTab     macro={macro} />}
      {activeTab === "risk"       && <MacroPressureTab     macro={macro} />}
      {activeTab === "report"     && <MacroReportTab       macro={macro} />}
    </section>
  );
}

function EconomicCalendarWorkspace({ calendar, activeTab, setActiveTab }: { calendar: EconomicCalendarAnalysis; activeTab: MacroWorkspaceTab; setActiveTab: (tab: MacroWorkspaceTab) => void }) {
  const tabs: Array<{ id: MacroWorkspaceTab; label: string; kicker: string }> = [
    { id: "indicators", label: "Macro Event Map", kicker: "이벤트 지도" },
    { id: "regime", label: "Event Signal Chain", kicker: "연결 체인" },
    { id: "risk", label: "Macro Risk & Conflict", kicker: "충돌/압력" },
    { id: "report", label: "AI Macro Summary", kicker: "AI 요약" },
  ];
  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-2 overflow-x-auto rounded-full border border-cyan/15 bg-slate-950/60 p-1.5 shadow-[0_0_38px_rgba(56,189,248,0.08)] backdrop-blur">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`min-w-max rounded-full px-5 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${activeTab === tab.id ? "bg-cyan/15 text-white shadow-[0_0_28px_rgba(56,189,248,0.18)] ring-1 ring-cyan/35" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"}`}>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan/70">{tab.label}</div>
              <div className="mt-0.5 text-xs font-bold tracking-wide">{tab.kicker}</div>
            </button>
          ))}
        </div>
      </div>
      {activeTab === "indicators" && <EconomicCalendarOverviewTab calendar={calendar} />}
      {activeTab === "regime" && <EconomicCalendarChainTab calendar={calendar} />}
      {activeTab === "risk" && <EconomicCalendarRiskTab calendar={calendar} />}
      {activeTab === "report" && <EconomicCalendarReportTab calendar={calendar} />}
    </section>
  );
}

function EconomicCalendarOverviewTab({ calendar }: { calendar: EconomicCalendarAnalysis }) {
  const events = [...calendar.eventSignals].sort((a, b) => b.eventPriorityScore - a.eventPriorityScore);
  const dominantEvent = events[0];
  const pressure = macroPressureItems(calendar);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MacroHeroSignalCard title="Macro Alpha" value={`${calendar.macroAlphaScore}`} subtitle={calendar.macroAlphaLabelKo} delta={calendar.macroAlphaScore - 50} tone={calendar.macroAlphaScore >= 60 ? "good" : calendar.macroAlphaScore < 40 ? "bad" : "muted"} points={calendar.eventSignals.map((event) => event.riskOnPressure - event.riskOffPressure + 50)} />
        <MacroHeroSignalCard title="Regime" value={calendar.macroRegime.labelKo} subtitle={calendar.macroRegime.riskBiasKo} delta={calendar.macroConflicts.length ? -calendar.macroConflicts.length * 8 : 6} tone={calendar.macroConflicts.length ? "warn" : "good"} points={calendar.eventSignals.map((event) => event.volatilityImpact)} />
        <MacroHeroSignalCard title="Dominant Pressure" value={calendar.dominantPressureKo} subtitle={`${calendar.pressureScores.total} / 100`} delta={calendar.pressureScores.total - 50} tone={calendar.pressureScores.total >= 60 ? "warn" : "muted"} points={pressure.map((item) => item.value)} />
        <MacroHeroSignalCard title="Volatility State" value={calendar.macroStressLevelKo} subtitle={dominantEvent ? `${dominantEvent.eventName} 주도` : "이벤트 부족"} delta={calendar.clusterRiskScore - 50} tone={calendar.clusterRiskScore >= 65 ? "bad" : calendar.clusterRiskScore >= 45 ? "warn" : "good"} points={calendar.eventSignals.map((event) => event.volatilityImpact)} />
      </div>
      <RegimeShiftCard calendar={calendar} />
      <AnalysisPanelShell title="PRESSURE NETWORK" tags={["EVENTS → PRESSURE → REGIME"]}>
        <EconomicPressureNetwork calendar={calendar} />
      </AnalysisPanelShell>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <AnalysisPanelShell title="EVENT IMPACT MAP" tags={["CLUSTERED SIGNAL MATRIX"]}>
          <EconomicEventImpactMap calendar={calendar} />
        </AnalysisPanelShell>
        <AnalysisPanelShell title="SIGNAL DISTRIBUTION" tags={["PRESSURE METERS"]}>
          <div className="space-y-4">
            {pressure.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-black text-slate-200">{item.label}</span>
                  <span className={`font-black ${item.color}`}>{item.value}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <SignalMiniGauge label="Risk-On" value={Math.round(calendar.macroAlphaScore)} color="cyan" />
              <SignalMiniGauge label="Risk-Off" value={Math.round(100 - calendar.macroAlphaScore)} color="rose" />
            </div>
          </div>
        </AnalysisPanelShell>
      </div>
      <AnalysisPanelShell title="MACRO FLOW TIMELINE" tags={["TRIGGER → REGIME"]}>
        <MacroFlowTimeline calendar={calendar} />
      </AnalysisPanelShell>
    </div>
  );
}

function EconomicCalendarChainTab({ calendar }: { calendar: EconomicCalendarAnalysis }) {
  const groups = calendar.eventClusters.length ? calendar.eventClusters : groupEconomicEvents(calendar.eventSignals).map((group) => ({
    clusterName: economicCategoryKo(group.category),
    category: group.category as EconomicEvent["eventCategory"],
    eventCount: group.events.length,
    avgSurprise: Math.round(group.events.reduce((sum, event) => sum + event.surpriseScore, 0) / Math.max(1, group.events.length)),
    pressureTrend: "중립" as const,
    latestDirection: (group.events[0]?.surpriseDirection ?? "Neutral") as EconomicEvent["surpriseDirection"],
    pressureAcceleration: 0,
    clusterConfidence: 45,
    clusterPressure: group.pressure,
    events: group.events,
  }));
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <AnalysisPanelShell key={`${group.category}-${group.clusterName}`} title={`${group.clusterName} CLUSTER`} tags={[`압력 ${group.clusterPressure}`, `${group.eventCount} EVENTS`, `추세 ${group.pressureTrend}`]}>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <SignalMiniGauge label="Surprise" value={group.avgSurprise} color="cyan" />
            <SignalMiniGauge label="Pressure" value={group.clusterPressure} color={group.clusterPressure >= 55 ? "rose" : "cyan"} />
            <SignalMiniGauge label="Confidence" value={group.clusterConfidence} color="cyan" />
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Latest Direction</p>
              <p className="mt-2 text-lg font-black text-white">{group.latestDirection}</p>
              <p className={`mt-1 text-xs font-bold ${group.pressureAcceleration >= 0 ? "text-rose-400" : "text-mint"}`}>{group.pressureAcceleration >= 0 ? "+" : ""}{group.pressureAcceleration} 압력 변화</p>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {group.events.filter((event) => event.priorityTier !== "COMPRESSED").map((event) => <EconomicEventSignalCard key={`${event.index}-${event.eventName}`} event={event} />)}
          </div>
          {group.events.some((event) => event.priorityTier === "COMPRESSED") ? (
            <details className="mt-4 rounded-lg border border-white/10 bg-slate-950/35 p-3">
              <summary className="cursor-pointer text-xs font-black text-slate-300">압축된 약한 신호 {group.events.filter((event) => event.priorityTier === "COMPRESSED").length}개 보기</summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.events.filter((event) => event.priorityTier === "COMPRESSED").map((event) => (
                  <span key={`${event.index}-${event.eventName}`} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold text-slate-400">{event.eventName} · {event.riskContribution}</span>
                ))}
              </div>
            </details>
          ) : null}
        </AnalysisPanelShell>
      ))}
      {!groups.length ? (
        <AnalysisPanelShell title="EVENT SIGNALS" tags={["NO DATA"]}>
          <p className="text-sm text-slate-400">경제 이벤트 신호가 충분하지 않습니다.</p>
        </AnalysisPanelShell>
      ) : null}
    </div>
  );
}

function RegimeShiftCard({ calendar }: { calendar: EconomicCalendarAnalysis }) {
  const transition = calendar.regimeTransition;
  const catalysts = transition.catalystEventsKo.length ? transition.catalystEventsKo : calendar.eventSignals.slice(0, 3).map((event) => event.eventName);
  return (
    <div className="relative overflow-hidden rounded-xl border border-cyan/15 bg-gradient-to-r from-slate-950 via-cyan/[0.04] to-slate-950 p-4 shadow-[0_0_34px_rgba(34,211,238,0.08)]">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-cyan/20" />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.4fr_0.8fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">이전 레짐</p>
          <p className="mt-2 text-xl font-black text-slate-100">{transition.previousRegimeKo}</p>
          <p className="mt-2 text-xs font-bold text-slate-500">{transition.pressureRotationKo.split("→")[0]?.trim() || "중립 압력"}</p>
        </div>
        <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.045] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">REGIME SHIFT CATALYSTS</p>
            <MiniBadge tone={calendar.confidenceDecayFactor >= 18 ? "warn" : "muted"}>신뢰도 훼손 {calendar.confidenceDecayFactor}</MiniBadge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {catalysts.map((name, index) => (
              <Fragment key={`${name}-${index}`}>
                <span className="rounded-full border border-amber-300/20 bg-slate-950/45 px-3 py-1.5 text-xs font-black text-white">{name}</span>
                {index < catalysts.length - 1 ? <span className="text-amber-300/70">→</span> : null}
              </Fragment>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-300">{transition.confidenceDeteriorationKo}. {transition.volatilityExpansionKo} 상태에서 압력 회전이 현재 레짐을 만들었습니다.</p>
        </div>
        <div className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-300/[0.045] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">현재 레짐</p>
          <p className="mt-2 text-xl font-black text-white">{transition.currentRegimeKo}</p>
          <p className="mt-2 text-xs font-bold text-fuchsia-200">{transition.pressureRotationKo.split("→")[1]?.trim() || calendar.macroRegime.riskBiasKo}</p>
        </div>
      </div>
    </div>
  );
}

function MacroHeroSignalCard({ title, value, subtitle, delta, tone, points }: { title: string; value: string; subtitle: string; delta: number; tone: Tone; points: number[] }) {
  const toneCls = tone === "good" ? "border-mint/25 text-mint shadow-[0_0_32px_rgba(52,211,153,0.12)]" : tone === "bad" ? "border-rose/25 text-rose-400 shadow-[0_0_32px_rgba(244,63,94,0.12)]" : tone === "warn" ? "border-amber-300/25 text-amber-300 shadow-[0_0_32px_rgba(251,191,36,0.12)]" : "border-cyan/20 text-cyan shadow-[0_0_32px_rgba(34,211,238,0.1)]";
  return (
    <div className={`group relative overflow-hidden rounded-xl border bg-white/[0.035] p-4 transition hover:-translate-y-0.5 ${toneCls}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-60" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-2 line-clamp-2 text-2xl font-black text-white">{value}</p>
      <div className="mt-3 h-10"><MiniSignalSparkline points={points} tone={tone} /></div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-400">{subtitle}</p>
        <span className={`rounded-full border border-current/20 bg-current/10 px-2 py-1 text-[10px] font-black ${delta >= 0 ? "text-mint" : "text-rose-400"}`}>{delta >= 0 ? "↑" : "↓"} {Math.abs(Math.round(delta))}</span>
      </div>
    </div>
  );
}

type EconomicEvent = EconomicCalendarAnalysis["eventSignals"][number];

function macroPressureItems(calendar: EconomicCalendarAnalysis) {
  return [
    { label: "Inflation Signals", value: calendar.pressureScores.inflation, color: "text-orange-300", bar: "bg-gradient-to-r from-orange-500 to-rose-500" },
    { label: "Growth Signals", value: calendar.pressureScores.growth, color: "text-mint", bar: "bg-gradient-to-r from-mint to-cyan" },
    { label: "Liquidity Signals", value: calendar.pressureScores.liquidity, color: "text-blue-300", bar: "bg-gradient-to-r from-blue-500 to-cyan" },
    { label: "Employment Signals", value: calendar.pressureScores.employment, color: "text-cyan", bar: "bg-gradient-to-r from-cyan to-mint" },
    { label: "Volatility Signals", value: calendar.pressureScores.volatility, color: "text-fuchsia-300", bar: "bg-gradient-to-r from-fuchsia-500 to-rose-500" },
  ];
}

function economicCategoryKo(category: string) {
  const map: Record<string, string> = {
    Inflation: "인플레이션",
    Employment: "고용",
    "Central Bank": "중앙은행",
    Growth: "성장",
    Manufacturing: "제조업",
    Consumer: "소비",
    Liquidity: "유동성",
    Housing: "주택",
    "Bond/Yield": "채권/금리",
    Currency: "통화/달러",
    Energy: "에너지",
    Geopolitical: "지정학",
    "Generic Macro Event": "일반 매크로",
  };
  return map[category] ?? category;
}

function economicCategoryStyle(category: string) {
  if (category === "Inflation" || category === "Energy") return { text: "text-orange-300", border: "border-orange-300/25", bg: "bg-orange-400/[0.055]", dot: "bg-orange-400" };
  if (category === "Growth" || category === "Manufacturing" || category === "Consumer" || category === "Employment") return { text: "text-mint", border: "border-mint/25", bg: "bg-mint/[0.05]", dot: "bg-mint" };
  if (category === "Central Bank" || category === "Liquidity" || category === "Bond/Yield" || category === "Currency") return { text: "text-cyan", border: "border-cyan/25", bg: "bg-cyan/[0.05]", dot: "bg-cyan" };
  return { text: "text-fuchsia-300", border: "border-fuchsia-300/25", bg: "bg-fuchsia-300/[0.05]", dot: "bg-fuchsia-400" };
}

function MiniSignalSparkline({ points, tone }: { points: number[]; tone: Tone }) {
  const vals = points.filter(Number.isFinite).slice(-12);
  if (vals.length < 2) return <div className="h-full rounded bg-white/[0.03]" />;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const coords = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(" ");
  const stroke = tone === "good" ? "#34d399" : tone === "bad" ? "#fb7185" : tone === "warn" ? "#f59e0b" : "#22d3ee";
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
      <polyline points={coords} fill="none" stroke={stroke} strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EconomicEventImpactMap({ calendar }: { calendar: EconomicCalendarAnalysis }) {
  const groups = calendar.eventClusters.length ? calendar.eventClusters : groupEconomicEvents(calendar.eventSignals).map((group) => ({
    clusterName: economicCategoryKo(group.category),
    category: group.category as EconomicEvent["eventCategory"],
    eventCount: group.events.length,
    avgSurprise: Math.round(group.events.reduce((sum, event) => sum + event.surpriseScore, 0) / Math.max(1, group.events.length)),
    pressureTrend: "중립" as const,
    latestDirection: (group.events[0]?.surpriseDirection ?? "Neutral") as EconomicEvent["surpriseDirection"],
    pressureAcceleration: 0,
    clusterConfidence: 45,
    clusterPressure: group.pressure,
    events: group.events,
  }));
  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const style = economicCategoryStyle(group.category);
        return (
          <div key={`${group.category}-${group.clusterName}`}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                <p className={`text-sm font-black ${style.text}`}>{group.clusterName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">압력 {group.clusterPressure}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${style.border} ${style.text}`}>{group.pressureTrend}</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className={`rounded-lg border ${style.border} ${style.bg} p-3`}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Cluster Intelligence</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-black text-white">{group.eventCount}</p><p className="text-[9px] text-slate-500">이벤트</p></div>
                  <div><p className="text-lg font-black text-white">{group.avgSurprise}</p><p className="text-[9px] text-slate-500">평균 서프라이즈</p></div>
                  <div><p className="text-lg font-black text-white">{group.clusterConfidence}</p><p className="text-[9px] text-slate-500">클러스터 신뢰</p></div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-800">
                  <div className={`h-full rounded-full ${group.clusterPressure >= 55 ? "bg-gradient-to-r from-orange-400 to-rose-500" : "bg-gradient-to-r from-cyan to-mint"}`} style={{ width: `${Math.max(4, group.clusterPressure)}%` }} />
                </div>
              </div>
              {group.events.slice(0, 5).map((event) => <MacroImpactCard key={`${event.index}-${event.eventName}`} event={event} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MacroImpactCard({ event }: { event: EconomicEvent }) {
  const style = economicCategoryStyle(event.eventCategory);
  const hawkish = /인플레이션|매파|금리|달러|약화|둔화|압박|Risk-Off|긴축/.test(`${event.marketPressure} ${event.regimeEffect} ${event.interpretationKo}`);
  const tierCls = event.priorityTier === "DOMINANT" ? "scale-[1.015] opacity-100" : event.priorityTier === "SECONDARY" ? "opacity-85" : "opacity-45";
  const glow = event.priorityTier === "DOMINANT"
    ? (event.surpriseDirection === "Negative Surprise" ? "shadow-[0_0_32px_rgba(251,146,60,0.18)]" : "shadow-[0_0_32px_rgba(34,211,238,0.16)]")
    : event.surpriseDirection === "Positive Surprise" ? "shadow-[0_0_18px_rgba(34,211,238,0.08)]" : event.surpriseDirection === "Negative Surprise" ? "shadow-[0_0_18px_rgba(251,146,60,0.09)]" : "";
  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-3 transition hover:-translate-y-0.5 hover:bg-white/[0.06] ${glow} ${tierCls}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="line-clamp-1 text-sm font-black text-white">{event.eventName}</p>
          <p className={`mt-1 text-[10px] font-bold ${style.text}`}>{economicCategoryKo(event.eventCategory)} · {event.importanceLevel} · {event.priorityTier}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${style.border} text-xs font-black ${style.text}`} style={{ boxShadow: `inset 0 0 0 ${event.importanceLevel === "HIGH" ? 4 : event.importanceLevel === "MEDIUM" ? 2 : 1}px rgba(255,255,255,0.05)` }}>
          {event.surpriseScore}
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${hawkish ? "bg-gradient-to-r from-orange-400 to-rose-500" : "bg-gradient-to-r from-cyan to-mint"}`} style={{ width: `${Math.max(5, event.riskContribution)}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px] font-bold">
        {macroEffectTokens(event).map((token) => <span key={token} className="rounded border border-white/10 bg-slate-950/40 px-1.5 py-1 text-slate-300">{token}</span>)}
      </div>
    </div>
  );
}

function macroEffectTokens(event: EconomicEvent) {
  const text = `${event.marketPressure} ${event.regimeEffect} ${event.interpretationKo}`;
  if (/인플레이션|물가|금리|매파|채권/.test(text)) return ["Yield ↑", "USD ↑", "Growth ↓"];
  if (/완화|유동성|Risk-On|위험자산에 우호/.test(text)) return ["Liquidity ↑", "Risk ↑", "USD ↓"];
  if (/성장|회복|고용 탄력|경기/.test(text)) return ["Growth ↑", "Cycle ↑", "Risk ↑"];
  if (/둔화|약화|위험회피|방어/.test(text)) return ["Growth ↓", "Vol ↑", "Risk-Off"];
  return ["Macro", "Signal", "Watch"];
}

function EconomicPressureNetwork({ calendar }: { calendar: EconomicCalendarAnalysis }) {
  const top = [...calendar.eventSignals].sort((a, b) => b.eventPriorityScore - a.eventPriorityScore).slice(0, 6);
  const pressures = macroPressureItems(calendar).slice(0, 4);
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-slate-950/50 p-4">
      <svg viewBox="0 0 900 340" className="h-[360px] w-full">
        <defs>
          <filter id="macroGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {top.map((event, i) => {
          const y = 42 + i * 48;
          const target = 42 + (i % pressures.length) * 70;
          return (
            <g key={`${event.index}-${event.eventName}`}>
              <line x1="190" y1={y} x2="430" y2={target} stroke={event.surpriseDirection === "Negative Surprise" ? "#fb7185" : "#22d3ee"} strokeOpacity={event.priorityTier === "DOMINANT" ? "0.62" : "0.28"} strokeWidth={Math.max(1.5, event.eventPriorityScore / 18)} />
              <circle cx="105" cy={y} r={10 + (event.priorityTier === "DOMINANT" ? 10 : event.importanceLevel === "HIGH" ? 6 : event.importanceLevel === "MEDIUM" ? 3 : 1)} fill={event.surpriseDirection === "Negative Surprise" ? "#fb7185" : "#22d3ee"} filter="url(#macroGlow)" opacity={event.priorityTier === "DOMINANT" ? "0.95" : "0.62"} />
              <text x="128" y={y - 4} fill="#e2e8f0" fontSize="12" fontWeight="800">{event.eventName.slice(0, 20)}</text>
              <text x="128" y={y + 11} fill="#94a3b8" fontSize="9">{economicCategoryKo(event.eventCategory)} · priority {event.eventPriorityScore}</text>
            </g>
          );
        })}
        {pressures.map((pressure, i) => {
          const y = 42 + i * 70;
          return (
            <g key={pressure.label}>
              <line x1="560" y1={y} x2="725" y2="165" stroke="#a78bfa" strokeOpacity="0.38" strokeWidth={Math.max(2, pressure.value / 22)} />
              <rect x="410" y={y - 20} width="160" height="40" rx="12" fill="rgba(15,23,42,0.95)" stroke="rgba(34,211,238,0.28)" />
              <text x="430" y={y - 3} fill="#e2e8f0" fontSize="12" fontWeight="800">{pressure.label.replace(" Signals", "")}</text>
              <text x="430" y={y + 12} fill="#22d3ee" fontSize="10" fontWeight="800">{pressure.value}% pressure</text>
            </g>
          );
        })}
        <rect x="705" y="120" width="170" height="90" rx="18" fill="rgba(88,28,135,0.35)" stroke="rgba(216,180,254,0.35)" filter="url(#macroGlow)" />
        <text x="730" y="152" fill="#f8fafc" fontSize="15" fontWeight="900">{calendar.macroRegime.labelKo.slice(0, 24)}</text>
        <text x="730" y="174" fill="#d8b4fe" fontSize="12" fontWeight="800">{calendar.macroRegime.riskBiasKo}</text>
        <text x="730" y="193" fill="#94a3b8" fontSize="10">Alpha {calendar.macroAlphaScore} · Pressure {calendar.pressureScores.total}</text>
        {calendar.macroConflicts.slice(0, 2).map((conflict, i) => (
          <g key={conflict.labelKo}>
            <line x1="575" y1={75 + i * 80} x2="705" y2="150" stroke="#fb7185" strokeOpacity="0.45" strokeWidth={Math.max(2, conflict.collisionScore / 28)} strokeDasharray="6 4" />
            <circle cx={620} cy={75 + i * 80} r={12 + conflict.collisionScore / 18} fill="rgba(244,63,94,0.22)" stroke="#fb7185" filter="url(#macroGlow)" />
            <text x={640} y={72 + i * 80} fill="#fecdd3" fontSize="10" fontWeight="900">{conflict.labelKo.slice(0, 18)}</text>
            <text x={640} y={86 + i * 80} fill="#fb7185" fontSize="9">{conflict.severity} collision</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function SignalMiniGauge({ label, value, color }: { label: string; value: number; color: "cyan" | "rose" }) {
  const stroke = color === "cyan" ? "#22d3ee" : "#fb7185";
  const dash = `${Math.PI * 70 * value / 100} ${Math.PI * 70}`;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <svg viewBox="0 0 90 50" className="h-12 w-16">
        <path d="M10 45 A35 35 0 0 1 80 45" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="8" />
        <path d="M10 45 A35 35 0 0 1 80 45" fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={dash} />
      </svg>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="text-xl font-black text-white">{value}%</p>
      </div>
    </div>
  );
}

function MacroFlowTimeline({ calendar }: { calendar: EconomicCalendarAnalysis }) {
  const top = [...calendar.eventSignals].sort((a, b) => b.eventPriorityScore - a.eventPriorityScore)[0];
  const catalyst = calendar.regimeTransition.catalystEventsKo[0] ?? top?.eventName;
  const steps = top ? [
    `${catalyst} ${top.surpriseDirection === "Positive Surprise" ? "예상 상회" : top.surpriseDirection === "Negative Surprise" ? "예상 하회" : "예상 부합"}`,
    top.marketPressure,
    top.regimeEffect,
    calendar.regimeTransition.pressureRotationKo,
    calendar.macroRegime.labelKo,
  ] : ["이벤트 부족", "압력 제한", "레짐 중립", calendar.macroRegime.labelKo];
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {steps.map((step, index) => (
        <div key={`${step}-${index}`} className="relative rounded-lg border border-white/10 bg-white/[0.035] p-4 text-center transition hover:-translate-y-0.5 hover:border-cyan/30 hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]">
          {index < steps.length - 1 ? <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-gradient-to-r from-cyan/70 to-amber-300/60 md:block" /> : null}
          <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10 text-xs font-black text-cyan">{index + 1}</div>
          <p className="text-sm font-black text-white">{step}</p>
        </div>
      ))}
    </div>
  );
}

function groupEconomicEvents(events: EconomicEvent[]) {
  const map = new Map<string, EconomicEvent[]>();
  events.forEach((event) => map.set(event.eventCategory, [...(map.get(event.eventCategory) ?? []), event]));
  return Array.from(map.entries()).map(([category, grouped]) => ({
    category,
    pressure: Math.round(grouped.reduce((sum, event) => sum + event.riskContribution, 0) / Math.max(1, grouped.length)),
    events: grouped.sort((a, b) => b.riskContribution - a.riskContribution),
  })).sort((a, b) => b.pressure - a.pressure);
}

function EconomicEventSignalCard({ event }: { event: EconomicEvent }) {
  const style = economicCategoryStyle(event.eventCategory);
  const maxVal = Math.max(Math.abs(event.actualValue ?? 0), Math.abs(event.forecastValue ?? 0), Math.abs(event.previousValue ?? 0), 1);
  const actualPct = Math.min(100, Math.abs(event.actualValue ?? 0) / maxVal * 100);
  const forecastPct = Math.min(100, Math.abs(event.forecastValue ?? 0) / maxVal * 100);
  const previousDelta = event.previousChange ?? 0;
  const tierBorder = event.priorityTier === "DOMINANT" ? "shadow-[0_0_28px_rgba(34,211,238,0.10)]" : event.priorityTier === "COMPRESSED" ? "opacity-60" : "";
  return (
    <details className={`group rounded-xl border ${style.border} ${style.bg} p-4 transition open:bg-white/[0.055] hover:-translate-y-0.5 ${tierBorder}`}>
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black text-white">{event.eventName}</p>
            <p className={`mt-1 text-xs font-bold ${style.text}`}>{economicCategoryKo(event.eventCategory)} · {event.importanceLevel} · {event.priorityTier}</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-black ${event.eventPriorityScore >= 70 ? "text-rose-400" : event.eventPriorityScore >= 45 ? "text-amber-300" : "text-mint"}`}>{event.eventPriorityScore}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Priority</p>
          </div>
        </div>
      </summary>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_0.9fr]">
        <div className="space-y-3">
          <DualBar label="Actual" value={event.actualValue} pct={actualPct} color="bg-cyan" />
          <DualBar label="Forecast" value={event.forecastValue} pct={forecastPct} color="bg-slate-500" />
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
            <span className="text-xs font-bold text-slate-400">Actual vs Previous</span>
            <span className={`text-sm font-black ${previousDelta >= 0 ? "text-mint" : "text-rose-400"}`}>{previousDelta >= 0 ? "↑" : "↓"} {Math.abs(previousDelta).toFixed(2)}</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Surprise Meter</p>
          <div className="mt-2 h-3 rounded-full bg-slate-800">
            <div className={`h-full rounded-full ${event.surpriseDirection === "Negative Surprise" ? "bg-gradient-to-r from-orange-400 to-rose-500" : "bg-gradient-to-r from-cyan to-mint"}`} style={{ width: `${Math.max(4, event.surpriseScore)}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {macroEffectTokens(event).map((token) => <MiniBadge key={token} tone={token.includes("↓") || token.includes("Off") ? "warn" : "good"}>{token}</MiniBadge>)}
          </div>
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-300">{event.interpretationKo}</p>
        </div>
      </div>
    </details>
  );
}

function DualBar({ label, value, pct, color }: { label: string; value: number | null; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-bold text-slate-400">{label}</span>
        <span className="font-black text-slate-200">{value ?? "대기"}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, pct)}%` }} /></div>
    </div>
  );
}

function EconomicCalendarRiskTab({ calendar }: { calendar: EconomicCalendarAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <NewsMetricCard label="Cluster Risk" value={`${calendar.clusterRiskScore}`} detail={calendar.macroStressLevelKo} tone={calendar.clusterRiskScore >= 65 ? "warn" : "muted"} />
        <NewsMetricCard label="Event Density" value={`${calendar.eventDensity}`} detail="분석된 이벤트 수" tone="muted" />
        <NewsMetricCard label="Confidence" value={calendar.confidenceLabelKo} detail={`분석 신뢰도 ${calendar.confidence}%`} tone={calendar.confidenceLabelKo === "HIGH" ? "good" : calendar.confidenceLabelKo === "MEDIUM" ? "warn" : "bad"} />
      </div>
      <AnalysisPanelShell title="MACRO CONFLICT CARDS" tags={["CONFLICT DETECTION"]}>
        <div className="grid gap-3 md:grid-cols-2">
          {(calendar.macroConflicts.length ? calendar.macroConflicts : [{ labelKo: "주요 충돌 제한", severity: "LOW" as const, collisionScore: 0, eventsKo: [], explanationKo: "현재 이벤트 신호는 심각한 상호 충돌보다 혼합 또는 중립 흐름에 가깝습니다." }]).map((conflict) => (
            <div key={conflict.labelKo} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-black text-white">{conflict.labelKo}</p>
                <MiniBadge tone={conflict.severity === "EXTREME" || conflict.severity === "HIGH" ? "bad" : conflict.severity === "MEDIUM" ? "warn" : "good"}>{conflict.severity} · {conflict.collisionScore}</MiniBadge>
              </div>
              <p className="text-sm leading-6 text-slate-300">{conflict.explanationKo}</p>
              {conflict.eventsKo.length ? <p className="mt-2 text-xs text-slate-500">관련 이벤트: {conflict.eventsKo.join(", ")}</p> : null}
            </div>
          ))}
        </div>
      </AnalysisPanelShell>
    </div>
  );
}

function EconomicCalendarReportTab({ calendar }: { calendar: EconomicCalendarAnalysis }) {
  return (
    <div className="space-y-5">
      <AnalysisPanelShell title="AI MACRO SUMMARY" tags={[calendar.macroRegime.labelKo, calendar.macroAlphaLabelKo]}>
        <div className="grid gap-5 lg:grid-cols-2">
          <InterpretationBlock label="현재 매크로 레짐" text={`${calendar.macroRegime.labelKo}: ${calendar.macroRegime.reasonKo}`} />
          <InterpretationBlock label="지배 압력" text={`${calendar.dominantPressureKo}. ${calendar.narrativeSummaryKo}`} />
          <InterpretationBlock label="전술적 해석" text={calendar.tacticalInterpretationKo} />
          <InterpretationBlock label="최종 AI 결론" text={`Macro Alpha Score ${calendar.macroAlphaScore}점(${calendar.macroAlphaLabelKo})입니다. ${calendar.supportingEvidenceKo[0] ?? "확인 증거는 제한적입니다."} ${calendar.conflictingEvidenceKo[0] ?? "주요 충돌 증거는 제한적입니다."}`} />
        </div>
      </AnalysisPanelShell>
      <div className="grid gap-5 lg:grid-cols-2">
        <AnalysisPanelShell title="SUPPORTING EVIDENCE" tags={["CONNECTED SIGNALS"]}>
          <div className="space-y-2">{calendar.supportingEvidenceKo.map((text) => <p key={text} className="rounded-lg border border-mint/15 bg-mint/[0.04] p-3 text-sm text-slate-200">{text}</p>)}</div>
        </AnalysisPanelShell>
        <AnalysisPanelShell title="WARNINGS / LIMITATIONS" tags={["FALLBACK"]}>
          <div className="space-y-2">{(calendar.warningsKo.length ? calendar.warningsKo : ["필수 이벤트 컬럼이 충분해 제한 사항은 크지 않습니다."]).map((text) => <p key={text} className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 text-sm text-slate-200">{text}</p>)}</div>
        </AnalysisPanelShell>
      </div>
    </div>
  );
}

// ─── ETF Flow Workspace ───────────────────────────────────────────────────────

function EtfFlowWorkspace({ etf, activeTab, setActiveTab }: { etf: EtfFlowAnalysis; activeTab: EtfFlowWorkspaceTab; setActiveTab: (tab: EtfFlowWorkspaceTab) => void }) {
  const tabs: Array<{ id: EtfFlowWorkspaceTab; label: string; kicker: string }> = [
    { id: "overview", label: "ETF 플로우 개요", kicker: "유동성 지도" },
    { id: "features", label: "피처 분석", kicker: "강도·지속성" },
    { id: "risk", label: "리스크 / 압력", kicker: "충돌·유출" },
    { id: "summary", label: "AI ETF 요약", kicker: "전술 결론" },
  ];
  if (!etf.detected) {
    return (
      <section className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-8 text-center">
        <p className="text-2xl font-black text-white">ETF 플로우 구조 미감지</p>
        <p className="mt-3 text-sm leading-6 text-slate-300">ETF 유입, 유출, 순유입, AUM, 섹터 회전 중 하나 이상이 필요합니다. 데이터가 부분적이면 가능한 신호만으로 정성 유동성 모드가 활성화됩니다.</p>
      </section>
    );
  }
  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-2 overflow-x-auto rounded-full border border-lime-300/15 bg-slate-950/65 p-1.5 shadow-[0_0_38px_rgba(163,230,53,0.08)] backdrop-blur">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`min-w-max rounded-full px-5 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${activeTab === tab.id ? "bg-lime-300/15 text-white shadow-[0_0_28px_rgba(163,230,53,0.18)] ring-1 ring-lime-300/35" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"}`}>
              <span className="block text-[11px] font-black tracking-[0.08em]">{tab.label}</span>
              <span className="mt-1 block text-[10px] font-bold text-slate-500">{tab.kicker}</span>
            </button>
          ))}
        </div>
      </div>
      {activeTab === "overview" ? <EtfFlowOverviewTab etf={etf} /> : null}
      {activeTab === "features" ? <EtfFlowFeaturesTab etf={etf} /> : null}
      {activeTab === "risk" ? <EtfFlowRiskTab etf={etf} /> : null}
      {activeTab === "summary" ? <EtfFlowSummaryTab etf={etf} /> : null}
    </section>
  );
}

function etfRegimeKo(regime: EtfFlowAnalysis["liquidityRegime"]) {
  const map: Record<EtfFlowAnalysis["liquidityRegime"], string> = {
    "Bullish Liquidity": "강세 유동성",
    "Neutral Liquidity": "중립 유동성",
    "Bearish Liquidity": "약세 유동성",
    "Risk-On Expansion": "위험선호 확장",
    "Defensive Rotation": "방어적 로테이션",
    "Liquidity Stress": "유동성 스트레스",
    "Generic ETF Flow Environment": "일반 ETF 플로우 환경",
  };
  return map[regime] ?? regime;
}

function etfFlowClassKo(label: EtfFlowAnalysis["classification"]) {
  const map: Record<EtfFlowAnalysis["classification"], string> = {
    "Strong Inflow": "강한 순유입",
    "Moderate Inflow": "완만한 순유입",
    "Neutral Flow": "중립 플로우",
    "Moderate Outflow": "완만한 순유출",
    "Strong Outflow": "강한 순유출",
  };
  return map[label] ?? label;
}

function etfUiRiskOnText(text: string) {
  return /ai|tech|semiconductor|software|internet|growth|innovation|nasdaq|cloud|cyber|digital|robot|테크|기술|반도체|성장|인터넷|혁신/i.test(text);
}

function etfUiDefensiveText(text: string) {
  return /utilities|bond|gold|defensive|consumer.?staples|staples|healthcare|treasury|cash|dividend|유틸|채권|금|방어|필수소비|헬스케어|현금|배당/i.test(text);
}

function etfShareLabel(value: number) {
  return `${Math.round(clampUi(value))}%`;
}

function EtfFlowOverviewTab({ etf }: { etf: EtfFlowAnalysis }) {
  return (
    <div className="space-y-5">
      <AnalysisPanelShell title="주도 유동성 내러티브" tags={[etfRegimeKo(etf.liquidityRegime), etf.dominance.dominantLiquidityDirectionKo]} accent="기관 ETF 유동성 터미널">
          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="relative overflow-hidden rounded-lg border border-cyan/25 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.20),transparent_28%),linear-gradient(145deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))] p-6 shadow-[0_0_70px_rgba(34,211,238,0.13)]">
              <div className="pointer-events-none absolute -right-16 top-2 h-44 w-44 rounded-full bg-cyan/10 blur-3xl" />
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan">Dominant Capital Migration</p>
              <p className="mt-4 text-4xl font-black leading-tight text-white">{etf.dominance.dominantLiquidityDirectionKo}</p>
              <p className="mt-3 text-base font-bold leading-7 text-slate-200">{etf.dominance.dominantSectorClusterKo}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <TerminalStat label="자본 집중도" value={etfShareLabel(etf.dominance.capitalConcentrationScore)} tone="good" />
                <TerminalStat label="기관 축적" value={etfShareLabel(etf.smartMoney.accumulationProbability)} tone={etf.smartMoney.accumulationProbability >= 60 ? "good" : etf.smartMoney.accumulationProbability < 35 ? "bad" : "warn"} />
                <TerminalStat label="AUM 확장" value={`${etf.features.aumExpansionStrength}`} tone={etf.features.aumExpansionStrength >= 62 ? "good" : etf.features.aumExpansionStrength < 45 ? "bad" : "warn"} />
              </div>
            </div>
            <EtfDominanceMap etf={etf} />
          </div>
      </AnalysisPanelShell>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <AnalysisPanelShell title="ETF 순유입 타임라인" tags={["NETFLOW", "AUM", "SMART MONEY", "SECTOR"]} accent="다층 유동성 플로우">
          <EtfFlowTimeline etf={etf} />
        </AnalysisPanelShell>
        <AnalysisPanelShell title="스마트머니 배너" tags={["INSTITUTIONAL"]} accent="lime">
          <div className="rounded-xl border border-lime-300/20 bg-lime-300/[0.055] p-5 shadow-[0_0_35px_rgba(163,230,53,0.10)]">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-300">기관성 유동성 신호</p>
            <p className="mt-3 text-2xl font-black text-white">{etf.smartMoney.stateKo}</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">{etf.smartMoney.interpretationKo}</p>
          </div>
        </AnalysisPanelShell>
      </div>
      <AnalysisPanelShell title="유동성 전파 경로" tags={["FLOW PROPAGATION", "REGIME PATH"]} accent="순유입이 레짐으로 번지는 과정">
        <EtfPropagationFlow etf={etf} />
      </AnalysisPanelShell>
      <div className="grid gap-5 xl:grid-cols-2">
        <AnalysisPanelShell title="방어 회전 / 위험선호 맵" tags={[etf.rotation.liquidityShiftDirectionKo]}>
          <EtfRotationMap etf={etf} />
        </AnalysisPanelShell>
        <AnalysisPanelShell title="플로우 모멘텀 카드" tags={["FLOW FEATURES"]}>
          <EtfFeatureBars etf={etf} />
        </AnalysisPanelShell>
      </div>
    </div>
  );
}

function EtfHeroCard({ label, value, detail, tone, points }: { label: string; value: string; detail: string; tone: Tone; points: number[] }) {
  const toneCls = tone === "good" ? "border-lime-300/25 text-lime-300" : tone === "bad" ? "border-rose-400/25 text-rose-400" : tone === "warn" ? "border-amber-300/25 text-amber-300" : "border-cyan/20 text-cyan";
  return (
    <div className={`group rounded-xl border bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.055] ${toneCls}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 line-clamp-2 text-2xl font-black text-white">{value}</p>
      <div className="mt-3 h-10"><MiniSignalSparkline points={points.map((point) => Number.isFinite(point) ? point : 0)} tone={tone} /></div>
      <p className="mt-3 text-xs font-bold text-slate-400">{detail}</p>
    </div>
  );
}

function TerminalStat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const color = tone === "good" ? "text-lime-300 border-lime-300/20 bg-lime-300/[0.06]" : tone === "bad" ? "text-rose-300 border-rose-300/20 bg-rose-300/[0.06]" : tone === "warn" ? "text-amber-300 border-amber-300/20 bg-amber-300/[0.06]" : "text-cyan border-cyan/20 bg-cyan/[0.06]";
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function EtfDominanceMap({ etf }: { etf: EtfFlowAnalysis }) {
  const riskOn = etf.rotation.riskOnProbability;
  const defensive = etf.rotation.defensiveProbability;
  const concentration = etf.dominance.capitalConcentrationScore;
  const institutional = etf.smartMoney.institutionalPressure;
  const defensiveLow = defensive < 12;
  const sectors = etf.rotation.dominantSectorsKo.length ? etf.rotation.dominantSectorsKo : ["일반 ETF"];
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-slate-950/55 p-5">
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Liquidity Dominance Map</p>
            <p className="mt-2 text-xl font-black text-white">{sectors.slice(0, 3).join(" / ")}</p>
          </div>
          <div className="rounded-full border border-cyan/25 bg-cyan/[0.08] px-3 py-1 text-xs font-black text-cyan">{etfShareLabel(concentration)} 지배</div>
        </div>
        <div className="mt-5 grid grid-cols-[1fr_0.72fr] gap-4">
          <div className="space-y-3">
            {[
              { label: "위험선호 지배력", value: riskOn, tone: "cyan" },
              { label: "방어 비중", value: defensive, tone: defensiveLow ? "muted" : "amber" },
              { label: "기관 참여", value: institutional, tone: "lime" },
            ].map(({ label, value, tone }) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-[11px] font-black">
                  <span className="text-slate-300">{label}</span>
                  <span className={tone === "muted" ? "text-slate-500" : tone === "amber" ? "text-amber-300" : tone === "lime" ? "text-lime-300" : "text-cyan"}>{value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className={tone === "muted" ? "h-full rounded-full bg-slate-600/70" : tone === "amber" ? "h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400" : tone === "lime" ? "h-full rounded-full bg-gradient-to-r from-lime-300 to-emerald-300" : "h-full rounded-full bg-gradient-to-r from-cyan to-lime-300"} style={{ width: `${clampUi(value)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="relative flex min-h-36 items-center justify-center">
            <div className="absolute h-28 w-28 rounded-full border border-cyan/30 bg-cyan/[0.06] shadow-[0_0_36px_rgba(34,211,238,0.18)]" />
            <div className="absolute h-20 w-20 rounded-full border border-lime-300/30 bg-lime-300/[0.07] shadow-[0_0_28px_rgba(163,230,53,0.16)]" style={{ transform: `scale(${0.75 + concentration / 180})` }} />
            <div className={`absolute h-12 w-12 rounded-full border ${defensiveLow ? "border-slate-500/30 bg-slate-500/10 shadow-[0_0_18px_rgba(245,158,11,0.08)]" : "border-amber-300/35 bg-amber-300/10 shadow-[0_0_24px_rgba(245,158,11,0.15)]"}`} />
            <p className="relative text-center text-2xl font-black text-white">{etfShareLabel(concentration)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EtfFlowTimeline({ etf }: { etf: EtfFlowAnalysis }) {
  const points = etf.points.slice(-44);
  const values = points.map((point) => point.netflow);
  const maxAbs = Math.max(1, ...values.map((value) => Math.abs(value)));
  const aumValues = points.map((point) => point.aum ?? 0);
  const aumMin = Math.min(...aumValues);
  const aumRange = Math.max(1, Math.max(...aumValues) - aumMin);
  const curvePoints = points.map((point, index) => {
    const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * 100;
    const y = 84 - (((point.aum ?? aumMin) - aumMin) / aumRange) * 58;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return (
    <div className="relative h-80 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(15,23,42,0.72))] p-4">
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
      <svg className="pointer-events-none absolute inset-x-4 top-7 h-[calc(100%-3.5rem)] w-[calc(100%-2rem)] overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={curvePoints} fill="none" stroke="rgba(34,211,238,0.85)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <polyline points={`${curvePoints} 100,100 0,100`} fill="rgba(34,211,238,0.06)" stroke="none" />
      </svg>
      <div className="relative flex h-full items-center gap-1 pt-8">
        {points.map((point) => {
          const height = Math.max(8, Math.abs(point.netflow) / maxAbs * 88);
          const positive = point.netflow >= 0;
          const sectorText = `${point.sectorRotation} ${point.etfName}`;
          const riskOn = etfUiRiskOnText(sectorText);
          const defensive = etfUiDefensiveText(sectorText);
          const glow = point.smartMoneyFlow ?? etf.features.smartMoneySignal;
          return (
            <div key={`${point.index}-${point.date}`} className="group relative flex h-full flex-1 items-center justify-center">
              {riskOn ? <div className="absolute inset-y-5 w-full rounded-full bg-cyan/10 blur-sm" /> : null}
              {defensive ? <div className="absolute inset-y-7 w-full rounded-full bg-amber-300/10 blur-sm" /> : null}
              <div className="absolute top-1/2 h-px w-full bg-white/12" />
              <div className={`absolute h-10 w-full max-w-[18px] rounded-full blur-md ${positive ? "bg-cyan/35" : "bg-rose-400/30"}`} style={{ opacity: clampUi(glow) / 120, transform: positive ? "translateY(-52%)" : "translateY(52%)" }} />
              <div className={`z-10 w-full max-w-[13px] rounded-sm ${positive ? "bg-gradient-to-t from-emerald-400 via-lime-300 to-cyan shadow-[0_0_16px_rgba(34,211,238,0.35)]" : "bg-gradient-to-b from-amber-300 via-orange-400 to-rose-500 shadow-[0_0_16px_rgba(251,113,133,0.26)]"}`} style={{ height: `${height / 2}%`, transform: positive ? "translateY(-50%)" : "translateY(50%)" }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-44 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950/95 p-2 text-[10px] text-slate-200 shadow-xl group-hover:block">
                <p className="font-black text-white">{point.date}</p>
                <p>순유입: {point.netflow.toLocaleString()}</p>
                <p>AUM: {point.aum == null ? "없음" : point.aum.toLocaleString()}</p>
                <p>섹터: {point.sectorRotation || "미감지"}</p>
                <p>스마트머니 강도: {Math.round(glow)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute left-4 top-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
        <span className="rounded-full border border-cyan/25 bg-cyan/[0.08] px-2 py-1 text-cyan">AUM Expansion Curve</span>
        <span className="rounded-full border border-lime-300/25 bg-lime-300/[0.08] px-2 py-1 text-lime-300">Inflow</span>
        <span className="rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-2 py-1 text-amber-300">Outflow</span>
      </div>
    </div>
  );
}

function EtfPropagationFlow({ etf }: { etf: EtfFlowAnalysis }) {
  const intensity = [etf.features.netflowStrength, etf.features.sectorRotationScore, etf.smartMoney.institutionalPressure, etf.features.liquidityPressure, etf.etfPressureScore];
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {etf.dominance.propagationChainKo.map((step, index) => {
        const value = intensity[index] ?? etf.etfPressureScore;
        const tone = value >= 60 ? "cyan" : value < 40 ? "rose" : "amber";
        return (
          <div key={`${step}-${index}`} className={`relative rounded-lg border p-4 text-center transition hover:-translate-y-0.5 ${tone === "cyan" ? "border-cyan/25 bg-cyan/[0.055] shadow-[0_0_28px_rgba(34,211,238,0.10)]" : tone === "rose" ? "border-rose-300/25 bg-rose-300/[0.045]" : "border-amber-300/25 bg-amber-300/[0.045]"}`}>
            {index < etf.dominance.propagationChainKo.length - 1 ? <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-gradient-to-r from-cyan/70 to-lime-300/50 md:block" /> : null}
            <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-slate-950/45 text-xs font-black text-white">{index + 1}</div>
            <p className="text-xs font-black leading-5 text-white">{step}</p>
            <div className="mt-3 h-1.5 rounded-full bg-slate-900">
              <div className={`h-full rounded-full ${tone === "cyan" ? "bg-gradient-to-r from-cyan to-lime-300" : tone === "rose" ? "bg-gradient-to-r from-orange-400 to-rose-500" : "bg-gradient-to-r from-amber-300 to-cyan"}`} style={{ width: `${clampUi(value)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EtfRotationMap({ etf }: { etf: EtfFlowAnalysis }) {
  const riskOn = etf.rotation.riskOnProbability;
  const defensive = etf.rotation.defensiveProbability;
  const minimalDefensive = defensive < 12;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <SignalMiniGauge label="위험선호" value={riskOn} color="cyan" />
        <div className={`relative rounded-lg border p-3 ${minimalDefensive ? "border-slate-500/20 bg-slate-500/[0.04]" : "border-amber-300/20 bg-amber-300/[0.04]"}`}>
          <div className={`absolute right-4 top-4 h-9 w-9 rounded-full ${minimalDefensive ? "bg-amber-300/10 shadow-[0_0_18px_rgba(245,158,11,0.12)]" : "bg-amber-300/15 shadow-[0_0_26px_rgba(245,158,11,0.20)]"}`} />
          <SignalMiniGauge label={minimalDefensive ? "방어 자본 부재" : "방어 회전"} value={defensive} color="rose" />
          <p className="mt-2 text-xs font-bold text-slate-400">{minimalDefensive ? "Minimal Defensive Capital · 위험선호 우위 신호" : "방어성 자금 유입 감지"}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(etf.rotation.dominantSectorsKo.length ? etf.rotation.dominantSectorsKo : ["일반 ETF"]).map((sector) => (
          <div key={sector} className="rounded-lg border border-white/10 bg-white/[0.035] p-3 transition hover:border-lime-300/30">
            <p className="text-sm font-black text-white">{sector}</p>
            <p className="mt-1 text-[10px] text-slate-500">로테이션 기여 신호</p>
          </div>
        ))}
      </div>
      <p className="text-sm leading-7 text-slate-300">{etf.rotation.liquidityShiftDirectionKo}입니다. 위험선호 확률 {riskOn}%, 방어 확률 {defensive}%로 ETF 자금의 섹터 이동 방향을 추정했습니다. {minimalDefensive ? "방어 회전이 낮은 것은 빈 값이 아니라 위험선호 자본이 상대적으로 강하다는 구조적 신호입니다." : ""}</p>
    </div>
  );
}

function EtfFeatureBars({ etf }: { etf: EtfFlowAnalysis }) {
  const rows = [
    ["순유입 강도", etf.features.netflowStrength],
    ["유입 강도", etf.features.inflowStrength],
    ["유출 압력", etf.features.outflowPressure],
    ["AUM 확장 강도", etf.features.aumExpansionStrength],
    ["섹터 회전 점수", etf.features.sectorRotationScore],
    ["스마트머니 신호", etf.features.smartMoneySignal],
    ["유동성 압력", etf.features.liquidityPressure],
  ] as const;
  const rowTone = (label: string, value: number) => {
    if (label === "순유입 강도" && value >= 50) return "good";
    if (value >= 60) return "good";
    if (value < 40) return "bad";
    return "neutral";
  };
  return (
    <div className="space-y-3">
      {rows.map(([label, value]) => {
        const tone = rowTone(label, value);
        return (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-black text-slate-200">{label}</span>
              <span className={`font-black ${tone === "good" ? "text-lime-300" : tone === "bad" ? "text-rose-400" : "text-amber-300"}`}>{value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full shadow-[0_0_12px_rgba(34,211,238,0.24)] ${tone === "good" ? "bg-gradient-to-r from-lime-400 to-cyan" : tone === "bad" ? "bg-gradient-to-r from-orange-400 to-rose-500" : "bg-gradient-to-r from-amber-300 to-cyan"}`}
                style={{ width: `${clampUi(value)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EtfFlowFeaturesTab({ etf }: { etf: EtfFlowAnalysis }) {
  const contribution = [
    ["순유입", etf.features.netflowStrength, "ETF 자금이 시장으로 들어오는 힘"],
    ["AUM 확장 강도", etf.features.aumExpansionStrength, "운용자산 변화가 정규화된 유동성 강도로 반영되는 정도"],
    ["지속성", clampUi(etf.features.flowPersistence * 12), "같은 방향의 플로우가 이어진 기간"],
    ["로테이션 품질", etf.features.sectorRotationScore, "성장/방어 섹터 이동의 질"],
    ["기관 압력", etf.smartMoney.institutionalPressure, "스마트머니 축적 또는 이탈 압력"],
  ] as const;
  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <AnalysisPanelShell title="피처 기여도 분석" tags={["CONTRIBUTION"]}>
        <div className="space-y-4">
          {contribution.map(([label, value, desc]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <p className="font-black text-white">{label}</p>
                <p className="text-lg font-black text-lime-300">{Math.round(value)}</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-lime-400 to-cyan" style={{ width: `${Math.round(value)}%` }} /></div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </AnalysisPanelShell>
      <AnalysisPanelShell title="AUM / 지속성 / 스마트머니" tags={["FEATURE ENGINE"]}>
        <div className="grid gap-4 sm:grid-cols-2">
          <NewsMetricCard label="AUM 확장 강도" value={`${etf.features.aumExpansionStrength} / 100`} detail={`${etf.features.aumMomentumStateKo}${etf.features.aumMomentum == null ? "" : ` · 원시 성장률 ${etf.features.aumMomentum.toFixed(1)}%`}`} tone={etf.features.aumMomentum == null ? "muted" : etf.features.aumExpansionStrength >= 62 ? "good" : etf.features.aumExpansionStrength < 45 ? "bad" : "warn"} />
          <NewsMetricCard label="플로우 지속성" value={`${etf.features.flowPersistence}구간`} detail="동일 방향 순유입/순유출 지속" tone={etf.features.flowPersistence >= 3 ? "good" : "muted"} />
          <NewsMetricCard label="축적 확률" value={`${etf.smartMoney.accumulationProbability}%`} detail={etf.smartMoney.stateKo} tone={etf.smartMoney.accumulationProbability >= 60 ? "good" : etf.smartMoney.accumulationProbability < 35 ? "bad" : "warn"} />
          <NewsMetricCard label="레짐 신뢰도" value={`${etf.regimeConfidence}%`} detail={etf.confidenceLabelKo} tone={etf.regimeConfidence >= 70 ? "good" : etf.regimeConfidence >= 45 ? "warn" : "bad"} />
        </div>
        <div className="mt-5 rounded-lg border border-lime-300/15 bg-lime-300/[0.04] p-4 text-sm leading-7 text-slate-200">{etf.smartMoney.interpretationKo}</div>
      </AnalysisPanelShell>
    </div>
  );
}

function clampUi(value: number) {
  return Math.max(0, Math.min(100, value));
}

function EtfFlowRiskTab({ etf }: { etf: EtfFlowAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <NewsMetricCard label="유출 압력" value={`${etf.features.outflowPressure}`} detail="ETF 환매/유출 압력" tone={etf.features.outflowPressure >= 60 ? "bad" : etf.features.outflowPressure >= 35 ? "warn" : "good"} />
        <NewsMetricCard label="방어 회전" value={`${etf.rotation.defensiveProbability}%`} detail={etf.rotation.liquidityShiftDirectionKo} tone={etf.rotation.defensiveProbability >= 60 ? "warn" : "muted"} />
        <NewsMetricCard label="충돌 수" value={`${etf.conflicts.length}`} detail={`신뢰도 ${etf.confidence}%`} tone={etf.conflicts.some((conflict) => conflict.severity === "HIGH") ? "bad" : etf.conflicts.length ? "warn" : "good"} />
      </div>
      <AnalysisPanelShell title="유동성 충돌 패널" tags={["CONFLICTS"]}>
        <div className="grid gap-3 md:grid-cols-2">
          {(etf.conflicts.length ? etf.conflicts : [{ conflictType: "주요 충돌 제한", severity: "LOW" as const, liquidityWarningKo: "ETF 플로우, AUM, 섹터 회전 사이의 강한 충돌은 감지되지 않았습니다.", confidencePenalty: 0 }]).map((conflict) => (
            <div key={conflict.conflictType} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-white">{conflict.conflictType}</p>
                <MiniBadge tone={conflict.severity === "HIGH" ? "bad" : conflict.severity === "MEDIUM" ? "warn" : "good"}>{conflict.severity}</MiniBadge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{conflict.liquidityWarningKo}</p>
              <p className="mt-2 text-[10px] font-bold text-slate-500">신뢰도 차감 {conflict.confidencePenalty}점</p>
            </div>
          ))}
        </div>
      </AnalysisPanelShell>
      <AnalysisPanelShell title="ETF 압력 지도" tags={["PRESSURE MAP"]}>
        <EtfFeatureBars etf={etf} />
      </AnalysisPanelShell>
    </div>
  );
}

function EtfFlowSummaryTab({ etf }: { etf: EtfFlowAnalysis }) {
  return (
    <div className="space-y-5">
      <AnalysisPanelShell title="AI ETF 유동성 요약" tags={[etfRegimeKo(etf.liquidityRegime), etf.etfPressureLabelKo]}>
        <div className="grid gap-5 lg:grid-cols-2">
          <InterpretationBlock label="ETF Pressure Score" text={`${etf.etfPressureScore}점입니다. ${etf.etfPressureLabelKo}로 분류되며, 현재 플로우 상태는 ${etfFlowClassKo(etf.classification)}입니다.`} />
          <InterpretationBlock label="Liquidity Regime" text={`${etfRegimeKo(etf.liquidityRegime)}입니다. 레짐 강도 ${etf.regimeStrength}, 레짐 신뢰도 ${etf.regimeConfidence}로 계산되었습니다.`} />
          <InterpretationBlock label="Smart Money State" text={etf.smartMoney.interpretationKo} />
          <InterpretationBlock label="Dominant Liquidity" text={`${etf.dominance.dominantLiquidityDirectionKo}. ${etf.dominance.dominantSectorClusterKo}로 자금이 집중되고 있으며, 기관 플로우 편향은 ${etf.dominance.institutionalFlowBiasKo}입니다.`} />
          <InterpretationBlock label="Rotation State" text={`${etf.rotation.liquidityShiftDirectionKo}. 지배 섹터 신호는 ${etf.rotation.dominantSectorsKo.join(", ") || "제한적"}입니다.`} />
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-5">
          {etf.dominance.propagationChainKo.map((step, index) => (
            <div key={`${step}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">STEP {index + 1}</p>
              <p className="mt-1 text-xs font-black text-white">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-cyan/15 bg-cyan/[0.04] p-4 text-sm leading-7 text-slate-200">{etf.aiSummaryKo}</div>
        <div className="mt-3 rounded-lg border border-lime-300/15 bg-lime-300/[0.04] p-4 text-sm leading-7 text-slate-200">{etf.tacticalConclusionKo}</div>
      </AnalysisPanelShell>
      <div className="grid gap-5 lg:grid-cols-2">
        <AnalysisPanelShell title="시각화 매핑" tags={["DYNAMIC UI"]}>
          <div className="space-y-2">{etf.visualizationMappingKo.map((item) => <p key={item} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">{item}</p>)}</div>
        </AnalysisPanelShell>
        <AnalysisPanelShell title="경고 / 제한사항" tags={["FALLBACK"]}>
          <div className="space-y-2">{(etf.warningsKo.length ? etf.warningsKo : ["핵심 ETF 플로우 컬럼이 충분해 주요 제한 사항은 크지 않습니다."]).map((item) => <p key={item} className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 text-sm text-slate-300">{item}</p>)}</div>
        </AnalysisPanelShell>
      </div>
    </div>
  );
}

// ─── Shared chart helpers ─────────────────────────────────────────────────────

function MacroSparkline({ pts, color }: { pts: { date: string; value: number }[]; color: string }) {
  const W = 180; const H = 52; const P = 4;
  const vals = pts.map(p => p.value).filter(Number.isFinite);
  if (vals.length < 2) return <div className="h-[52px] flex items-center justify-center text-[10px] text-slate-600">데이터 부족</div>;
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
  const xs = vals.map((_, i) => P + (i / (vals.length - 1)) * (W - P * 2));
  const ys = vals.map(v => H - P - ((v - mn) / rng) * (H - P * 2));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${d} L${xs[xs.length - 1].toFixed(1)},${(H - P).toFixed(1)} L${xs[0].toFixed(1)},${(H - P).toFixed(1)} Z`;
  const gId = `spg${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[52px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill={color} />
    </svg>
  );
}

type NormMode = "minmax" | "zscore" | "percentile";
type ChartPeriod = "1M" | "3M" | "6M" | "1Y" | "ALL";
const PRIMARY_COLS: MacroCanonicalColumn[] = ["vix", "interest_rate", "cpi", "yield_10y", "dxy"];
const NORM_LABELS: Record<NormMode, string> = { minmax: "Min-Max", zscore: "Z-Score (롤링)", percentile: "백분위" };
const MACRO_UI_CATEGORY: Record<MacroCanonicalColumn, "VOLATILITY" | "RATES" | "INFLATION" | "GROWTH" | "LABOR" | "CREDIT" | "CURRENCY" | "LIQUIDITY"> = {
  vix: "VOLATILITY",
  interest_rate: "RATES",
  yield_10y: "RATES",
  cpi: "INFLATION",
  gdp_growth: "GROWTH",
  pmi: "GROWTH",
  unemployment: "LABOR",
  credit_spread: "CREDIT",
  dxy: "CURRENCY",
  m2_growth: "LIQUIDITY",
};
const MACRO_UI_CATEGORY_LABEL: Record<(typeof MACRO_UI_CATEGORY)[MacroCanonicalColumn], string> = {
  VOLATILITY: "변동성",
  RATES: "금리",
  INFLATION: "물가",
  GROWTH: "성장",
  LABOR: "고용",
  CREDIT: "신용",
  CURRENCY: "달러/환율",
  LIQUIDITY: "유동성",
};

function macroValidatedMetricsByKey(macro: MacroAnalysis) {
  return Object.fromEntries(
    macro.availableIndicators.map((key) => {
      const feature = macro.features[key];
      const metric = feature?.metric;
      return [key, {
        key,
        displayValue: metric?.displayValue ?? "N/A",
        validationStatus: metric?.anomalyStatus ?? "insufficient",
        unitType: metric?.unit ?? "",
        anomalyReason: metric?.anomalyStatus === "anomaly" ? "현실적 검증 범위를 벗어나 점수와 차트에서 제외됨" : null,
        rawValue: metric?.rawValue ?? null,
        scoreValue: metric?.scoreValue ?? null,
        validatedSeries: macro.normalizedSeries[key] ?? [],
        feature,
      }];
    })
  ) as Record<MacroCanonicalColumn, {
    key: MacroCanonicalColumn;
    displayValue: string;
    validationStatus: string;
    unitType: string;
    anomalyReason: string | null;
    rawValue: number | null;
    scoreValue: number | null;
    validatedSeries: { date: string; value: number }[];
    feature: MacroAnalysis["features"][MacroCanonicalColumn] | undefined;
  }>;
}

function warnRawMetricRender(componentName: string, columnName: string) {
  if (typeof console !== "undefined") console.warn(`Raw metric render detected: ${componentName} ${columnName}`);
}

function applyNorm(val: number, vals: number[], mode: NormMode): number {
  if (mode === "minmax") {
    const mn = vals.reduce((a, b) => Math.min(a, b), Infinity);
    const mx = vals.reduce((a, b) => Math.max(a, b), -Infinity);
    if (mx - mn < 1e-10) return 50;
    return Math.max(0, Math.min(100, ((val - mn) / (mx - mn)) * 100));
  }
  if (mode === "zscore") {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    if (std < 1e-10) return 50;
    return Math.max(0, Math.min(100, ((val - mean) / std) * 15 + 50));
  }
  let rank = 0;
  for (const v of vals) if (v <= val) rank++;
  return (rank / vals.length) * 100;
}

function MacroNormalizedChart({ macro }: { macro: MacroAnalysis }) {
  const [normMode, setNormMode] = useState<NormMode>("minmax");
  const [period, setPeriod] = useState<ChartPeriod>("1Y");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showNormMenu, setShowNormMenu] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const cols = macro.availableIndicators;

  const allDates = useMemo(() => {
    const s = new Set<string>();
    for (const col of cols) (macro.series[col] ?? []).forEach(p => s.add(p.date));
    return [...s].sort();
  }, [cols, macro.series]);

  const filteredDates = useMemo(() => {
    if (period === "ALL" || !allDates.length) return allDates;
    const latest = allDates[allDates.length - 1];
    const days = period === "1M" ? 31 : period === "3M" ? 92 : period === "6M" ? 183 : 365;
    const cutoff = new Date(latest);
    cutoff.setDate(cutoff.getDate() - days);
    const cutStr = cutoff.toISOString().slice(0, 10);
    return allDates.filter(d => d >= cutStr);
  }, [allDates, period]);

  const rawValueMap = useMemo(() => {
    const out: Partial<Record<MacroCanonicalColumn, (number | null)[]>> = {};
    for (const col of cols) {
      const ptMap = new Map((macro.series[col] ?? []).map(p => [p.date, p.value]));
      out[col] = filteredDates.map(d => {
        const v = ptMap.get(d);
        return v !== undefined && Number.isFinite(v) ? v : null;
      });
    }
    return out;
  }, [cols, macro.series, filteredDates]);

  const normalizedMap = useMemo(() => {
    const out: Partial<Record<MacroCanonicalColumn, (number | null)[]>> = {};
    for (const col of cols) {
      const raw = rawValueMap[col] ?? [];
      const finite = raw.filter((v): v is number => v !== null);
      if (finite.length < 2) { out[col] = raw.map(() => null); continue; }
      out[col] = raw.map(v => v === null ? null : applyNorm(v, finite, normMode));
    }
    return out;
  }, [cols, rawValueMap, normMode]);

  const latestValues = useMemo(() => {
    const out: Partial<Record<MacroCanonicalColumn, { curr: number | null; prev: number | null }>> = {};
    for (const col of cols) {
      const raw = rawValueMap[col] ?? [];
      let curr: number | null = null, prev: number | null = null;
      for (let i = raw.length - 1; i >= 0; i--) {
        if (raw[i] !== null) { if (curr === null) curr = raw[i]; else { prev = raw[i]; break; } }
      }
      out[col] = { curr, prev };
    }
    return out;
  }, [cols, rawValueMap]);

  const xLabels = useMemo(() => {
    const nd = filteredDates.length;
    if (!nd) return [] as { date: string; idx: number }[];
    const step = Math.max(1, Math.floor(nd / 6));
    const labels: { date: string; idx: number }[] = [];
    for (let i = 0; i < nd; i += step) labels.push({ date: filteredDates[i], idx: i });
    if (labels[labels.length - 1]?.idx !== nd - 1) labels.push({ date: filteredDates[nd - 1], idx: nd - 1 });
    return labels;
  }, [filteredDates]);

  const W = 800, H = 250, PL = 48, PR = 12, PT = 16, PB = 32;
  const IW = W - PL - PR, IH = H - PT - PB;
  const nd = filteredDates.length;
  const xOf = (i: number) => PL + (nd <= 1 ? IW / 2 : (i / (nd - 1)) * IW);
  const yOf = (v: number) => PT + IH * (1 - v / 100);

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || nd === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) * (W / rect.width) - PL;
    setHoveredIdx(Math.max(0, Math.min(nd - 1, Math.round((relX / IW) * (nd - 1)))));
  }

  const visibleCols = cols.filter(c => !hiddenCols.has(c));

  if (!cols.length) return (
    <div className="flex items-center justify-center h-48 text-slate-500 text-sm">차트 데이터 없음</div>
  );

  return (
    <div>
      {/* Header: title + norm selector + period buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white">정규화 거시 지표 추이 (0~100)</span>
          <span className="text-[10px] text-slate-500 cursor-default select-none" title="각 지표를 선택한 정규화 방식으로 0~100 범위로 변환한 차트입니다.">ℹ</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowNormMenu(m => !m)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-200 hover:border-white/20 transition">
              {NORM_LABELS[normMode]}<span className="text-slate-500 ml-0.5">▾</span>
            </button>
            {showNormMenu && (
              <div className="absolute right-0 top-8 z-50 min-w-[148px] rounded-xl border border-white/10 bg-[#0f172a] shadow-2xl overflow-hidden">
                {(Object.entries(NORM_LABELS) as [NormMode, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => { setNormMode(v); setShowNormMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition ${normMode === v ? "bg-cyan/10 text-cyan font-bold" : "text-slate-300 hover:bg-white/[0.04]"}`}>{l}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-0.5">
            {(["1M", "3M", "6M", "1Y", "ALL"] as ChartPeriod[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition ${period === p ? "bg-cyan/15 text-cyan" : "text-slate-500 hover:text-slate-300"}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart + Right panel */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]"
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={onMouseMove} onMouseLeave={() => setHoveredIdx(null)}>
            {/* Gridlines + Y labels */}
            {[0, 25, 50, 75, 100].map(y => (
              <g key={y}>
                <line x1={PL} y1={yOf(y)} x2={PL + IW} y2={yOf(y)} stroke="rgba(255,255,255,0.06)" strokeDasharray={y === 50 ? undefined : "2 5"} />
                <text x={PL - 6} y={yOf(y) + 4} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.55)">{y}</text>
              </g>
            ))}
            {/* X labels */}
            {xLabels.map(({ date, idx }) => (
              <text key={idx} x={xOf(idx)} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.45)">{date.slice(0, 7)}</text>
            ))}
            {/* Series lines */}
            {cols.map(col => {
              if (hiddenCols.has(col)) return null;
              const nVals = normalizedMap[col] ?? [];
              const color = INDICATOR_CONFIG[col]?.color ?? "#94a3b8";
              const isPrimary = PRIMARY_COLS.includes(col);
              let d = "";
              for (let i = 0; i < nd; i++) {
                const v = nVals[i];
                if (v !== null && v !== undefined) {
                  const prevNull = i === 0 || nVals[i - 1] === null || nVals[i - 1] === undefined;
                  d += (prevNull ? ` M${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}` : ` L${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`);
                }
              }
              if (!d.trim()) return null;
              return (
                <path key={col} d={d.trim()} fill="none" stroke={color}
                  strokeWidth={isPrimary ? 2 : 1}
                  strokeDasharray={isPrimary ? undefined : "4 3"}
                  strokeLinecap="round" strokeLinejoin="round"
                  opacity={hoveredIdx !== null ? 0.35 : 0.88} />
              );
            })}
            {/* Hover dots */}
            {hoveredIdx !== null && visibleCols.map(col => {
              const v = (normalizedMap[col] ?? [])[hoveredIdx];
              if (v == null) return null;
              return <circle key={col} cx={xOf(hoveredIdx)} cy={yOf(v)} r="3.5" fill={INDICATOR_CONFIG[col]?.color ?? "#94a3b8"} />;
            })}
            {/* Crosshair */}
            {hoveredIdx !== null && (
              <line x1={xOf(hoveredIdx)} y1={PT} x2={xOf(hoveredIdx)} y2={PT + IH} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
            )}
            {/* Tooltip */}
            {hoveredIdx !== null && (() => {
              const date = filteredDates[hoveredIdx];
              const tcols = visibleCols.filter(c => (normalizedMap[c] ?? [])[hoveredIdx] != null);
              const tw = 132, th = 18 + tcols.length * 13;
              const tx = Math.min(xOf(hoveredIdx) + 12, W - tw - 4);
              return (
                <g>
                  <rect x={tx} y={PT + 4} width={tw} height={th} rx="6" fill="rgba(10,18,35,0.94)" stroke="rgba(255,255,255,0.1)" />
                  <text x={tx + 8} y={PT + 16} fontSize="8" fontWeight="bold" fill="rgba(148,163,184,0.8)">{date}</text>
                  {tcols.map((col, i) => {
                    const rv = (rawValueMap[col] ?? [])[hoveredIdx];
                    return (
                      <g key={col}>
                        <circle cx={tx + 10} cy={PT + 24 + i * 13} r="2.5" fill={INDICATOR_CONFIG[col]?.color ?? "#94a3b8"} />
                        <text x={tx + 18} y={PT + 28 + i * 13} fontSize="8" fill="rgba(226,232,240,0.88)">{INDICATOR_CONFIG[col]?.labelKo}: {rv != null ? fmtMacroVal(rv, col) : "—"}</text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </svg>

          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {cols.map(col => {
              const cfg = INDICATOR_CONFIG[col];
              const isPrimary = PRIMARY_COLS.includes(col);
              const hidden = hiddenCols.has(col);
              const lv = latestValues[col];
              return (
                <button key={col}
                  onClick={() => setHiddenCols(s => { const ns = new Set(s); ns.has(col) ? ns.delete(col) : ns.add(col); return ns; })}
                  className={`flex items-center gap-1.5 transition-opacity ${hidden ? "opacity-30" : "opacity-100"}`}>
                  <svg width="16" height="6" className="shrink-0">
                    {isPrimary
                      ? <line x1="0" y1="3" x2="16" y2="3" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" />
                      : <line x1="0" y1="3" x2="16" y2="3" stroke={cfg.color} strokeWidth="1" strokeDasharray="4 2" strokeLinecap="round" />}
                  </svg>
                  <span className="text-[10px] text-slate-400">{cfg.labelKo}</span>
                  {lv?.curr != null && <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{fmtMacroVal(lv.curr, col)}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel: 최신 값 요약 */}
        <div className="w-44 shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan mb-2.5">최신 값 요약</p>
          <div className="space-y-2.5">
            {cols.map(col => {
              const cfg = INDICATOR_CONFIG[col];
              const lv = latestValues[col];
              const diff = lv?.curr != null && lv.prev != null ? lv.curr - lv.prev : null;
              const pct = diff != null && lv?.prev != null && Math.abs(lv.prev) > 1e-9 ? (diff / Math.abs(lv.prev)) * 100 : null;
              const up = diff != null && diff > 1e-9;
              const dn = diff != null && diff < -1e-9;
              return (
                <div key={col}>
                  <p className="text-[9px] font-bold truncate" style={{ color: cfg.color }}>{cfg.labelKo}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-black text-white">{lv?.curr != null ? fmtMacroVal(lv.curr, col) : "—"}</span>
                    {diff != null && (
                      <span className={`text-[9px] font-bold ${up ? "text-rose-400" : dn ? "text-emerald-400" : "text-slate-500"}`}>
                        {up ? "↑" : dn ? "↓" : "→"} {Math.abs(diff) > 1e-9 ? fmtMacroVal(Math.abs(diff), col) : ""}
                      </span>
                    )}
                  </div>
                  {pct != null && (
                    <p className={`text-[8px] ${up ? "text-rose-400/60" : dn ? "text-emerald-400/60" : "text-slate-600"}`}>
                      전일 대비 {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: 시각화 & 데이터 분석 ─────────────────────────────────────────────

function MacroVisualizationTab({ macro }: { macro: MacroAnalysis }) {
  const { riskScore, regime, availableIndicators, dateRange, frequency, rowCount, confidenceLabel, dataMode, visualizationPlanKo } = macro;

  const levelColor =
    riskScore.level === "극단적 거시 스트레스" ? { ring: "stroke-rose-400",   text: "text-rose-400"   } :
    riskScore.level === "고압력 거시 환경"     ? { ring: "stroke-orange-400", text: "text-orange-400" } :
    riskScore.level === "혼재 / 중립"         ? { ring: "stroke-amber-400",  text: "text-amber-300"  } :
    riskScore.level === "완만한 압박"          ? { ring: "stroke-cyan",       text: "text-cyan"       } :
                                                  { ring: "stroke-mint",       text: "text-mint"       };
  const regimeColor =
    regime.label === "Risk-On" || regime.label === "Liquidity Supportive" ? "border-mint/25 bg-mint/5 text-mint" :
    regime.label === "Risk-Off" || regime.label === "Volatility Spike"    ? "border-rose/25 bg-rose/5 text-rose-400" :
    regime.label === "Inflation Pressure" || regime.label === "Rate Pressure" ? "border-amber/25 bg-amber/5 text-amber-300" :
    regime.label === "Liquidity Tightening" ? "border-orange-500/25 bg-orange-500/5 text-orange-400" :
    regime.label === "Dollar Strength Pressure" ? "border-blue-400/25 bg-blue-400/5 text-blue-400" :
    "border-white/10 bg-white/[0.025] text-slate-300";

  if (!macro.detected || !availableIndicators.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.025] p-10 text-center">
        <p className="text-2xl font-black text-white">거시 지표 미감지</p>
        <p className="mt-3 text-sm text-slate-400">VIX, 금리, CPI, 국채금리, DXY 등의 열이 포함된 데이터셋을 업로드하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top row: gauge + regime + dataset info */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Risk Gauge */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">거시 리스크 점수</p>
          <div className="mt-3 relative w-32 h-32">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" className={levelColor.ring}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${Math.PI * 100 * riskScore.score / 100} ${Math.PI * 100 * (1 - riskScore.score / 100)}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black ${levelColor.text}`}>{riskScore.score}</span>
              <span className="text-[9px] text-slate-400">/100</span>
            </div>
          </div>
          <p className={`mt-2 text-sm font-black ${levelColor.text}`}>{riskScore.level}</p>
          <p className="mt-1 text-[10px] text-slate-400">{riskScore.activeComponentCount}개 지표 활성</p>
        </div>

        {/* Regime Card */}
        <div className={`rounded-xl border p-5 ${regimeColor}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">현재 거시 체제</p>
          <p className="mt-2 text-2xl font-black">{regime.labelKo}</p>
          <p className="mt-3 text-[11px] leading-6 opacity-80">{regime.descriptionKo}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {regime.signalsKo.slice(0, 3).map((s, i) => (
              <span key={i} className="rounded-full border border-current/20 bg-current/10 px-2 py-0.5 text-[9px] font-bold opacity-90">{s}</span>
            ))}
          </div>
        </div>

        {/* Dataset Summary */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">데이터셋 정보</p>
          <div className="mt-3 space-y-2">
            {[
              ["감지 지표", `${availableIndicators.length}개`],
              ["데이터 모드", MODE_KO[dataMode] ?? dataMode],
              ["데이터 빈도", FREQ_KO[frequency] ?? frequency],
              ["총 행 수", `${rowCount.toLocaleString()}행`],
              ["기간", dateRange ? `${dateRange.start} ~ ${dateRange.end}` : "날짜 미감지"],
              ["신뢰도", confidenceLabel],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-slate-400">{label}</span>
                <span className="font-bold text-slate-100">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive normalized chart */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <MacroSemanticCategoryCharts macro={macro} />
      </div>

      {/* Visualization plan */}
      <div className="rounded-xl border border-cyan/10 bg-cyan/[0.03] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-2">시각화 해석</p>
        <p className="text-sm leading-7 text-slate-200">{visualizationPlanKo}</p>
      </div>
    </div>
  );
}

// ─── Tab 2: 주요 거시 특성 ────────────────────────────────────────────────────

function MacroFeaturesTab({ macro }: { macro: MacroAnalysis }) {
  const { availableIndicators, features } = macro;

  if (!macro.detected || !availableIndicators.length) {
    return <div className="rounded-xl border border-white/10 p-10 text-center text-slate-400">감지된 거시 지표 없음</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan">주요 거시 특성</p>
        <h2 className="mt-1 text-xl font-black text-white">감지된 {availableIndicators.length}개 지표 세부 분석</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {availableIndicators.map(col => {
          const cfg = INDICATOR_CONFIG[col as MacroCanonicalColumn];
          const feat = features[col as MacroCanonicalColumn];
          if (!feat) return null;
          const isInvalidMetric = feat.metric.anomalyStatus === "anomaly";
          const pressBar = Math.max(0, Math.min(100, Math.round(feat.pressureLevel)));
          const pressColor = pressBar >= 65 ? "#fb7185" : pressBar >= 50 ? "#f8bf4c" : pressBar >= 35 ? "#38bdf8" : "#41d6a3";
          const pressGradient = pressBar >= 65
            ? "linear-gradient(90deg, #f8bf4c 0%, #fb7185 100%)"
            : pressBar >= 50
            ? "linear-gradient(90deg, #38bdf8 0%, #f8bf4c 100%)"
            : pressBar >= 35
            ? "linear-gradient(90deg, #41d6a3 0%, #38bdf8 100%)"
            : "linear-gradient(90deg, #1fd8a4 0%, #41d6a3 100%)";
          const confColor = feat.signalConfidence >= 75 ? "text-mint" : feat.signalConfidence >= 50 ? "text-amber-300" : "text-rose-400";
          const isHighPress = feat.pressureLevel >= 60;
          const cardBorder = isInvalidMetric ? "border-amber/25" : isHighPress ? "border-rose/15" : feat.pressureLevel <= 35 ? "border-mint/15" : "border-white/10";

          return (
            <div key={col} className={`rounded-xl border bg-white/[0.025] p-5 ${cardBorder}`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <p className="text-sm font-black text-white">{cfg.labelKo}</p>
                </div>
                <div className="flex gap-1.5">
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${isInvalidMetric ? "bg-amber/15 text-amber-200" : feat.pressureLevel >= 65 ? "bg-rose/15 text-rose-400" : feat.pressureLevel >= 45 ? "bg-amber/15 text-amber-300" : "bg-mint/15 text-mint"}`}>{isInvalidMetric ? "Invalid / anomaly" : feat.pressureTag}</span>
                  {!isInvalidMetric && <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${feat.trendDirection === "상승" ? "bg-orange-400/15 text-orange-400" : feat.trendDirection === "하락" ? "bg-cyan/15 text-cyan" : "bg-white/10 text-slate-300"}`}>{feat.trendDirection} {feat.momentumTag}</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">최근값</p>
                  <p className={`mt-0.5 text-lg font-black ${isInvalidMetric ? "text-amber-200" : "text-white"}`}>{isInvalidMetric ? "Invalid / anomaly" : feat.metric.displayValue}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">z-점수</p>
                  <p className={`mt-0.5 text-lg font-black ${feat.zScore !== null && Math.abs(feat.zScore) > 1.5 ? "text-rose-400" : "text-slate-100"}`}>
                    {isInvalidMetric ? "제외" : feat.zScore !== null ? (feat.zScore > 0 ? "+" : "") + feat.zScore.toFixed(2) : "N/A"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">백분위</p>
                  <p className={`mt-0.5 text-lg font-black ${isInvalidMetric ? "text-slate-500" : feat.percentileRank >= 75 ? "text-rose-400" : feat.percentileRank <= 25 ? "text-mint" : "text-slate-100"}`}>{isInvalidMetric ? "제외" : `${feat.percentileRank}위`}</p>
                </div>
              </div>

              {feat.metric.anomalyStatus !== "normal" && (
                <div className={`mb-3 rounded-lg border px-3 py-2 text-[10px] leading-5 ${feat.metric.anomalyStatus === "anomaly" ? "border-rose/25 bg-rose/10 text-rose-200" : "border-amber/25 bg-amber/10 text-amber-100"}`}>
                  <span className="font-black">데이터 품질:</span> {feat.metric.anomalyStatus === "anomaly" ? "현실적 검증 범위를 벗어나 최종 점수에서 제외되었습니다." : "주의가 필요한 값입니다."}
                  <span className="ml-2 text-slate-400">raw {feat.metric.rawValue ?? "N/A"} · type {feat.metric.metricType} · score {feat.metric.scoreValue ?? "제외"}</span>
                </div>
              )}

              {/* Pressure bar */}
              {!isInvalidMetric && <div className="mb-3">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-slate-400 font-bold">압력 수준</span>
                  <span className="font-black text-slate-200">{pressBar} / 100</span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pressBar}%`,
                      minWidth: pressBar > 0 ? "6px" : "0px",
                      background: pressGradient,
                      boxShadow: `0 0 14px ${pressColor}66`,
                    }}
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/20" />
                  <div className="pointer-events-none absolute inset-y-0 left-[75%] w-px bg-white/15" />
                </div>
              </div>}

              {/* Historical range */}
              {!isInvalidMetric && feat.historicalMin !== null && feat.historicalMax !== null && (
                <div className="text-[10px] text-slate-400 mb-3">
                  역사적 범위: {fmtMacroVal(feat.historicalMin, col as MacroCanonicalColumn)} – {fmtMacroVal(feat.historicalMax, col as MacroCanonicalColumn)}
                </div>
              )}

              <div className="flex items-center justify-between text-[9px]">
                <div>
                  <span className="text-slate-500">단기 변화: </span>
                  <span className={`font-bold ${feat.shortTermChange !== null ? feat.shortTermChange > 0 ? "text-orange-400" : feat.shortTermChange < 0 ? "text-mint" : "text-slate-300" : "text-slate-500"}`}>
                    {isInvalidMetric ? "제외" : feat.shortTermChange !== null ? (feat.shortTermChange > 0 ? "+" : "") + feat.shortTermChange.toFixed(3) : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">신호 신뢰도: </span>
                  <span className={`font-bold ${confColor}`}>{feat.signalConfidence}%</span>
                </div>
                <div>
                  <span className="text-slate-500">데이터: </span>
                  <span className="text-slate-300 font-bold">{feat.dataPoints}개</span>
                </div>
              </div>

              {feat.hasReliabilityWarning && (
                <div className="mt-3 flex items-center gap-1.5 rounded bg-amber/10 px-2.5 py-1.5 text-[9px] text-amber-300 font-bold border border-amber/15">
                  ⚠ {feat.reliabilityNote}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmtMacroVal(val: number, col: MacroCanonicalColumn): string {
  const cfg = INDICATOR_CONFIG[col];
  if (!cfg) return val.toFixed(2);
  if (cfg.isRaw) return val.toFixed(col === "pmi" || col === "dxy" ? 2 : 1);
  if (cfg.isPercent) { const pct = Math.abs(val) < 1.5 ? val * 100 : val; return `${pct.toFixed(2)}%`; }
  return `${Math.round(val)} bps`;
}

// ─── Tab 3: 리스크 & 압력 분석 ───────────────────────────────────────────────

function MacroPressureTab({ macro }: { macro: MacroAnalysis }) {
  const { riskScore, pressureContributions, regime, warnings, semantic } = macro;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan">리스크 & 압력 분석</p>
        <h2 className="mt-1 text-xl font-black text-white">거시 압력 기여도 분석</h2>
      </div>

      {semantic.categories.length > 0 && (
        <div className="rounded-xl border border-cyan/15 bg-cyan/[0.035] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan">Macro Semantic Engine</p>
              <p className="mt-1 text-sm font-bold text-slate-200">{semantic.regimeKo} · 전체 압력 {semantic.overallPressure}/100 · 확인 강도 {Math.round(semantic.confirmationStrength * 100)}%</p>
            </div>
            <MiniBadge tone={semantic.confidence >= 0.65 ? "good" : semantic.confidence >= 0.45 ? "warn" : "bad"}>신뢰도 {Math.round(semantic.confidence * 100)}%</MiniBadge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {semantic.categories.slice().sort((a, b) => b.contributionPct - a.contributionPct).map((cat) => {
              const color = cat.score >= 70 ? "#fb7185" : cat.score >= 55 ? "#f8bf4c" : cat.score >= 40 ? "#38bdf8" : "#41d6a3";
              return (
                <div key={cat.category} className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-black text-white">{cat.labelKo}</p>
                    <span className="text-[10px] font-black text-slate-400">기여 {cat.contributionPct}%</span>
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-2xl font-black" style={{ color }}>{cat.score}</span>
                    <span className="mb-1 text-xs font-bold text-slate-500">/100</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${cat.score}%`, background: `linear-gradient(90deg, #41d6a3, ${color})`, boxShadow: `0 0 14px ${color}55` }} />
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-slate-400">{cat.confirms[0] ?? cat.contradicts[0] ?? "독립 신호: 추가 확인 필요"}</p>
                </div>
              );
            })}
          </div>
          {(semantic.contradictions.length > 0 || semantic.excludedMetrics.length > 0) && (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {semantic.contradictions.length > 0 && (
                <div className="rounded-lg border border-amber/20 bg-amber/[0.04] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">반증 / 제한 요인</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">{semantic.contradictions.map((c, i) => <li key={i}>- {c}</li>)}</ul>
                </div>
              )}
              {semantic.excludedMetrics.length > 0 && (
                <div className="rounded-lg border border-rose/20 bg-rose/[0.04] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-300">제외된 이상치</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">{semantic.excludedMetrics.map((c, i) => <li key={i}>- {c}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        {/* Score summary */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan mb-4">종합 리스크 요약</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-xs text-slate-400">거시 리스크 점수</span>
              <span className={`text-xl font-black ${riskScore.score >= 66 ? "text-rose-400" : riskScore.score >= 46 ? "text-amber-300" : "text-mint"}`}>{riskScore.score}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-xs text-slate-400">리스크 수준</span>
              <span className="text-xs font-black text-slate-100">{riskScore.level}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-xs text-slate-400">체제</span>
              <span className="text-xs font-black text-slate-100">{regime.labelKo}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-slate-400">체제 신뢰도</span>
              <span className="text-xs font-black text-slate-100">{Math.round(regime.confidence * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Contribution bars */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan mb-4">지표별 압력 기여도</p>
          <div className="space-y-3">
            {pressureContributions.length === 0 ? (
              <p className="text-sm text-slate-400">데이터 없음</p>
            ) : pressureContributions.map(c => {
              const pressure = Math.max(0, Math.min(100, Math.round(c.pressureScore)));
              const contribution = Math.max(0, Math.min(100, Math.round(c.contributionPct)));
              const barColor = pressure >= 70 ? "#fb7185" : pressure >= 55 ? "#fb923c" : pressure >= 40 ? "#f8bf4c" : pressure >= 25 ? "#38bdf8" : "#41d6a3";
              const barGradient = pressure >= 70
                ? "linear-gradient(90deg, #f8bf4c 0%, #fb923c 48%, #fb7185 100%)"
                : pressure >= 55
                ? "linear-gradient(90deg, #f8bf4c 0%, #fb923c 100%)"
                : pressure >= 40
                ? "linear-gradient(90deg, #38bdf8 0%, #f8bf4c 100%)"
                : pressure >= 25
                ? "linear-gradient(90deg, #41d6a3 0%, #38bdf8 100%)"
                : "linear-gradient(90deg, #1fd8a4 0%, #41d6a3 100%)";
              const cfg = INDICATOR_CONFIG[c.canonical];
              return (
                <div key={c.canonical}>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg?.color ?? "#94a3b8" }} />
                      <span className="text-slate-200 font-medium">{c.labelKo}</span>
                    </div>
                    <div className="flex gap-3 text-slate-400">
                      <span>압력 <span className={`font-black ${pressure >= 65 ? "text-rose-400" : pressure >= 45 ? "text-amber-300" : "text-mint"}`}>{pressure}</span></span>
                      <span>기여 <span className="font-black text-slate-200">{contribution}%</span></span>
                    </div>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pressure}%`,
                        minWidth: pressure > 0 ? "6px" : "0px",
                        background: barGradient,
                        boxShadow: `0 0 14px ${barColor}66`,
                      }}
                    />
                    {contribution > 0 ? (
                      <div
                        className="absolute inset-y-0 rounded-full bg-white/35"
                        style={{
                          left: `${Math.max(0, Math.min(99, contribution))}%`,
                          width: "2px",
                          boxShadow: "0 0 8px rgba(255,255,255,0.45)",
                        }}
                        title={`기여도 ${contribution}%`}
                      />
                    ) : null}
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/15" />
                    <div className="pointer-events-none absolute inset-y-0 left-[75%] w-px bg-white/10" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed contribution table */}
      {pressureContributions.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.025] overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">지표별 압력 세부 테이블</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[9px] uppercase text-slate-500 font-bold">
                  {["지표", "압력점수", "비중 (%)", "기여도 (%)", "백분위", "z-점수"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pressureContributions.map((c, i) => (
                  <tr key={c.canonical} className={`border-b border-white/[0.04] ${i % 2 === 0 ? "" : "bg-white/[0.015]"}`}>
                    <td className="px-4 py-2.5 font-medium text-slate-200">{c.labelKo}</td>
                    <td className={`px-4 py-2.5 font-black ${c.pressureScore >= 65 ? "text-rose-400" : c.pressureScore >= 45 ? "text-amber-300" : "text-mint"}`}>{c.pressureScore}</td>
                    <td className="px-4 py-2.5 text-slate-300">{c.effectiveWeight}%</td>
                    <td className="px-4 py-2.5 font-bold text-slate-100">{c.contributionPct}%</td>
                    <td className="px-4 py-2.5 text-slate-300">{c.percentileRank}위</td>
                    <td className={`px-4 py-2.5 font-bold ${c.zScore !== null && Math.abs(c.zScore) > 1.5 ? "text-rose-400" : "text-slate-300"}`}>
                      {c.zScore !== null ? (c.zScore > 0 ? "+" : "") + c.zScore.toFixed(2) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Explanations */}
      {pressureContributions.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-3">주요 압력 요인 설명</p>
          <div className="space-y-2">
            {pressureContributions.slice(0, 4).map(c => (
              <div key={c.canonical} className="flex items-start gap-2.5 rounded-lg bg-white/[0.02] px-3 py-2.5 border border-white/[0.04]">
                <span className="shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full" style={{ backgroundColor: INDICATOR_CONFIG[c.canonical]?.color ?? "#94a3b8" }} />
                <p className="text-[11px] leading-5 text-slate-300">{c.explanationKo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber/15 bg-amber/[0.04] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300 mb-3">데이터 경고</p>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-200">
                <span className="shrink-0 text-amber-300 font-bold">⚠</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: AI 거시 리포트 ────────────────────────────────────────────────────

function MacroReportTab({ macro }: { macro: MacroAnalysis }) {
  const { aiSummary, regime, riskScore, alphaAdjustment, confidenceLabel, dataMode, semantic } = macro;
  const validMetrics = macro.availableIndicators.filter((col) => macro.features[col]?.metric.anomalyStatus !== "anomaly");
  const excludedMetrics = macro.availableIndicators.filter((col) => macro.features[col]?.metric.anomalyStatus === "anomaly");
  const dominantDriver = macro.pressureContributions[0];

  const regimeBadgeCls =
    regime.label === "Risk-On" || regime.label === "Liquidity Supportive" ? "bg-mint/15 text-mint border-mint/25" :
    regime.label === "Risk-Off" || regime.label === "Volatility Spike"    ? "bg-rose/15 text-rose-400 border-rose/25" :
    regime.label === "Inflation Pressure" || regime.label === "Rate Pressure" ? "bg-amber/15 text-amber-300 border-amber/25" :
    regime.label === "Liquidity Tightening" ? "bg-orange-500/15 text-orange-400 border-orange-500/25" :
    regime.label === "Dollar Strength Pressure" ? "bg-blue-500/15 text-blue-400 border-blue-500/25" :
    "bg-white/5 text-slate-300 border-white/10";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-cyan/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.7),rgba(2,6,23,0.9)_60%,rgba(8,47,73,0.3))] p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan">AI 거시 분석 리포트</p>
            <h2 className="mt-2 text-xl font-black leading-tight text-white">{aiSummary.headlineKo}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${regimeBadgeCls}`}>{regime.labelKo}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">리스크 {riskScore.score}/100</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">{confidenceLabel} 신뢰 · {MODE_KO[dataMode]}</span>
          </div>
        </div>
      </div>

      {/* Overall + Regime */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">전체 거시 해석</p>
          <p className="mt-3 text-sm leading-7 text-slate-200">{aiSummary.overallKo}</p>
          <p className="mt-3 border-t border-white/8 pt-3 text-xs leading-6 text-slate-400">레짐 판단은 개별 raw 값이 아니라 카테고리별 scoreValue, 확인 강도, 신뢰도, 기여도 cap을 결합한 semantic engine 결과입니다.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">체제 컨텍스트</p>
          <p className="mt-3 text-sm leading-7 text-slate-200">{regime.descriptionKo}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {semantic.dominantDrivers.map((driver) => <MiniBadge key={driver} tone="warn">{driver}</MiniBadge>)}
            {semantic.contradictions.length ? <MiniBadge tone="muted">반증 {semantic.contradictions.length}개</MiniBadge> : null}
          </div>
        </div>
      </div>

      {semantic.categories.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">카테고리 상호작용</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {semantic.categories.slice().sort((a, b) => b.contributionPct - a.contributionPct).map((cat) => (
              <div key={cat.category} className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white">{cat.labelKo}</p>
                  <span className="text-xs font-black text-cyan">{cat.score}/100 · 기여 {cat.contributionPct}%</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">확인 강도 {Math.round(cat.confirmation * 100)}% · 신뢰도 {Math.round(cat.confidence * 100)}% · 유효 지표 {cat.validMetricCount}개</p>
                {cat.confirms.length > 0 ? <p className="mt-2 text-xs leading-5 text-mint">확인: {cat.confirms[0]}</p> : null}
                {cat.contradicts.length > 0 ? <p className="mt-1 text-xs leading-5 text-amber-200">반증: {cat.contradicts[0]}</p> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`rounded-xl border p-5 ${excludedMetrics.length ? "border-amber/25 bg-amber/[0.045]" : "border-mint/15 bg-mint/[0.035]"}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">계산 품질 요약</p>
        <div className="mt-3 grid gap-3 text-xs leading-6 lg:grid-cols-3">
          <div>
            <p className="font-black text-slate-200">유효 지표</p>
            <p className="text-slate-400">{validMetrics.length ? validMetrics.map((col) => INDICATOR_CONFIG[col].labelKo).join(", ") : "없음"}</p>
          </div>
          <div>
            <p className="font-black text-slate-200">제외 지표</p>
            <p className={excludedMetrics.length ? "text-amber-200" : "text-slate-400"}>{excludedMetrics.length ? excludedMetrics.map((col) => `${INDICATOR_CONFIG[col].labelKo} raw ${macro.features[col]?.metric.rawValue}`).join(", ") : "없음"}</p>
          </div>
          <div>
            <p className="font-black text-slate-200">최종 점수 근거</p>
            <p className="text-slate-400">리스크 점수는 rawValue가 아니라 검증된 scoreValue만 가중했습니다. 주도 요인: {dominantDriver ? `${dominantDriver.labelKo} ${dominantDriver.pressureScore}/100` : "없음"}.</p>
          </div>
        </div>
        {excludedMetrics.length > 1 ? (
          <p className="mt-3 border-t border-white/10 pt-3 text-xs font-bold text-amber-200">Data quality warning: several macro metrics were excluded due to unrealistic ranges.</p>
        ) : null}
      </div>

      {/* Scenarios */}
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { label: "강세 시나리오", text: aiSummary.bullScenarioKo, cls: "border-mint/20 bg-mint/[0.04]", badge: "bg-mint/15 text-mint" },
          { label: "기본 시나리오", text: aiSummary.baseScenarioKo, cls: "border-amber/15 bg-amber/[0.03]", badge: "bg-amber/15 text-amber-300" },
          { label: "약세 시나리오", text: aiSummary.bearScenarioKo, cls: "border-rose/20 bg-rose/[0.04]",  badge: "bg-rose/15 text-rose-400" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.cls}`}>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${s.badge}`}>{s.label}</span>
            <p className="mt-3 text-xs leading-6 text-slate-200">{s.text}</p>
          </div>
        ))}
      </div>

      {/* Key risks + supports */}
      <div className="grid gap-4 lg:grid-cols-2">
        {aiSummary.keyRisksKo.length > 0 && (
          <div className="rounded-xl border border-rose/15 bg-rose/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-400 mb-3">핵심 리스크 요인</p>
            <div className="space-y-2">
              {aiSummary.keyRisksKo.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                  <span className="shrink-0 text-rose-400 font-black">▲</span><span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {aiSummary.keySupportsKo.length > 0 && (
          <div className="rounded-xl border border-mint/15 bg-mint/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-mint mb-3">지지 요인</p>
            <div className="space-y-2">
              {aiSummary.keySupportsKo.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                  <span className="shrink-0 text-mint font-black">▼</span><span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Investment implication */}
      <div className="rounded-xl border border-cyan/15 bg-cyan/[0.04] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">투자 시사점</p>
        <p className="mt-3 text-sm leading-7 text-slate-100">{aiSummary.investmentImplicationKo}</p>
      </div>

      {/* Alpha adjustment */}
      <div className={`rounded-xl border p-5 ${alphaAdjustment.adjustment >= 5 ? "border-mint/20 bg-mint/[0.04]" : alphaAdjustment.adjustment <= -10 ? "border-rose/20 bg-rose/[0.04]" : "border-amber/15 bg-amber/[0.03]"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">거시 알파 조정</p>
            <p className="mt-2 text-xs leading-6 text-slate-200">{alphaAdjustment.reasonKo}</p>
            <p className="mt-2 text-xs text-slate-400 italic">참고: 거시 체제는 전체 신호의 하나입니다. 기업 펀더멘털·기술적 분석과 함께 종합 판단하세요.</p>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-3xl font-black ${alphaAdjustment.adjustment >= 0 ? "text-mint" : "text-rose-400"}`}>
              {alphaAdjustment.adjustment >= 0 ? "+" : ""}{alphaAdjustment.adjustment}
            </span>
            <p className="text-[9px] text-slate-400 mt-1">신뢰도: {alphaAdjustment.confidence}</p>
          </div>
        </div>
      </div>

      {/* Final condition label */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-950 p-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan mb-2">최종 거시 상태 레이블</p>
        <p className="text-2xl font-black text-white">{aiSummary.finalConditionLabelKo}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL STATEMENT WORKSPACE
// ═══════════════════════════════════════════════════════════════════════════════

const FIN_PRIMARY_COLS: FinancialCanonicalColumn[] = ["revenue", "operating_income", "net_income", "eps", "operating_cashflow", "free_cashflow"];

const METRIC_TIER: Partial<Record<FinancialCanonicalColumn, 1 | 2 | 3 | 4>> = {
  revenue: 1, operating_income: 1, net_income: 1, eps: 1, operating_cashflow: 1, free_cashflow: 1,
  roe: 2, operating_margin: 2, gross_margin: 2, net_margin: 2, ebitda: 2, gross_profit: 2, yoy_growth: 2,
  debt: 3, equity: 3, assets: 3, liabilities: 3, book_value: 3,
  debt_equity: 3, debt_ratio: 3, interest_coverage: 3, current_ratio: 3, quick_ratio: 3,
  capex: 4, dividend: 4, dividend_yield: 4, payout_ratio: 4, dividend_per_share: 4, total_dividend: 4, shares_outstanding: 4, market_cap: 4,
};

type EngineSection = { id: string; titleKo: string; icon: string; accentColor: string; cols: FinancialCanonicalColumn[] };
const ENGINE_SECTIONS: EngineSection[] = [
  { id: "growth",   titleKo: "성장 엔진",     icon: "📈", accentColor: "#3B82F6", cols: ["revenue","operating_income","net_income","eps","yoy_growth","gross_profit"] },
  { id: "margin",   titleKo: "수익성 엔진",   icon: "💰", accentColor: "#8B5CF6", cols: ["roe","operating_margin","gross_margin","net_margin","ebitda"] },
  { id: "cashflow", titleKo: "현금흐름 엔진", icon: "💧", accentColor: "#06B6D4", cols: ["operating_cashflow","free_cashflow","capex"] },
  { id: "balance",  titleKo: "재무구조 엔진", icon: "🏛",  accentColor: "#94A3B8", cols: ["debt","equity","assets","liabilities","book_value"] },
  { id: "leverage", titleKo: "레버리지 안정성", icon: "⚖", accentColor: "#FB7185", cols: ["debt_equity","debt_ratio","interest_coverage","current_ratio","quick_ratio","shares_outstanding"] },
  { id: "return",   titleKo: "주주환원 / 배당", icon: "◈", accentColor: "#F59E0B", cols: ["dividend_yield","payout_ratio","dividend_per_share","total_dividend","dividend"] },
];

function fmtFinancialVal(val: number, col: FinancialCanonicalColumn): string {
  const cfg = FINANCIAL_INDICATOR_CONFIG[col];
  if (!cfg) return val.toFixed(2);
  if (cfg.isMargin || cfg.isGrowthMetric) return `${val.toFixed(1)}%`;
  if (col === "eps" || col === "book_value" || col === "dividend" || col === "dividend_per_share") return val.toFixed(2);
  if (col === "debt_equity" || col === "interest_coverage" || col === "current_ratio" || col === "quick_ratio") return `${val.toFixed(Math.abs(val) < 10 ? 2 : 1)}x`;
  const abs = Math.abs(val);
  if (abs >= 1e12) return `${(val / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${(val / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${(val / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${(val / 1e3).toFixed(1)}K`;
  return val.toFixed(2);
}

function FinancialSparkline({ pts, color }: { pts: { date: string; value: number }[]; color: string }) {
  const valid = pts.filter(p => Number.isFinite(p.value));
  if (valid.length < 2) return <div className="h-10 w-full rounded bg-white/[0.03]" />;
  const W = 120, H = 40, pad = 2;
  const xs = valid.map((_, i) => pad + (i / (valid.length - 1)) * (W - pad * 2));
  const vals = valid.map(p => p.value);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn;
  const ys = vals.map(v => H - pad - (rng < 1e-9 ? (H - pad * 2) / 2 : ((v - mn) / rng) * (H - pad * 2)));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const gId = `fsg-${Math.random().toString(36).slice(2, 8)}`;
  const area = d + ` L${xs[xs.length - 1]},${H} L${xs[0]},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10">
      <defs><linearGradient id={gId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${gId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill={color} />
    </svg>
  );
}

function FinancialHeroMetric({ col, financial }: { col: FinancialCanonicalColumn; financial: FinancialAnalysis }) {
  const cfg = FINANCIAL_INDICATOR_CONFIG[col];
  const feat = financial.features[col];
  const pts = financial.series[col] ?? [];
  const trendUp = feat?.trendDirection === "상승";
  const trendDn = feat?.trendDirection === "하락";
  const goodUp = cfg.higherIsBetter ? trendUp : trendDn;
  const goodDn = cfg.higherIsBetter ? trendDn : trendUp;
  const trendColor = goodUp ? "#10B981" : goodDn ? "#EF4444" : "#64748B";
  const trendIcon = trendUp ? "↑" : trendDn ? "↓" : "→";
  const yoyGood = feat?.yoyGrowth != null ? (cfg.higherIsBetter ? feat.yoyGrowth >= 0 : feat.yoyGrowth <= 0) : null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-5 hover:border-white/[0.16] transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{cfg.labelKo}</p>
          <p className="mt-1 text-3xl font-black text-white leading-none">{feat?.displayValue ?? "—"}</p>
        </div>
        <span className="text-2xl font-black shrink-0 mt-0.5" style={{ color: trendColor }}>{trendIcon}</span>
      </div>
      <FinancialSparkline pts={pts} color={cfg.color} />
      <div className="mt-2.5 flex items-center justify-between">
        {feat?.yoyGrowth != null ? (
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${yoyGood ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-rose-500/15 border-rose-500/30 text-rose-400"}`}>
            {feat.yoyGrowth >= 0 ? "+" : ""}{feat.yoyGrowth.toFixed(1)}% YoY
          </span>
        ) : <span />}
        <span className={`text-[8px] font-bold ${feat?.growthAcceleration === "가속" ? "text-emerald-400" : feat?.growthAcceleration === "둔화" ? "text-rose-400" : "text-slate-500"}`}>
          {feat?.growthAcceleration ?? "—"}
        </span>
      </div>
    </div>
  );
}

function FinancialSectionChart({ financial, cols }: { financial: FinancialAnalysis; cols: FinancialCanonicalColumn[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hiddenCols, setHiddenCols] = useState<Set<FinancialCanonicalColumn>>(new Set());
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 600, H = 130, PT = 8, PB = 22, PL = 6, PR = 6;
  const IW = W - PL - PR, IH = H - PT - PB;

  const allDates = useMemo(() => {
    const s = new Set<string>();
    for (const col of cols) (financial.series[col] ?? []).forEach(p => s.add(p.date));
    return Array.from(s).sort();
  }, [cols, financial.series]);

  const rawMap = useMemo(() => {
    const out: Partial<Record<FinancialCanonicalColumn, (number | null)[]>> = {};
    for (const col of cols) {
      const ptMap = new Map((financial.series[col] ?? []).map(p => [p.date, p.value]));
      out[col] = allDates.map(d => ptMap.get(d) ?? null);
    }
    return out;
  }, [cols, financial.series, allDates]);

  const normMap = useMemo(() => {
    const out: Partial<Record<FinancialCanonicalColumn, (number | null)[]>> = {};
    for (const col of cols) {
      const vals = rawMap[col] ?? [];
      const nums = vals.filter(v => v !== null) as number[];
      if (!nums.length) { out[col] = vals; continue; }
      const lo = Math.min(...nums), hi = Math.max(...nums), rng = hi - lo;
      out[col] = vals.map(v => v === null ? null : rng < 1e-10 ? 0.5 : (v - lo) / rng);
    }
    return out;
  }, [rawMap, cols]);

  if (!allDates.length) return null;
  const n = allDates.length;
  const xOf = (i: number) => PL + (i / Math.max(n - 1, 1)) * IW;
  const yOf = (v: number) => PT + (1 - v) * IH;
  const visible = cols.filter(c => !hiddenCols.has(c));

  return (
    <div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair"
        onMouseLeave={() => setHoveredIdx(null)}
        onMouseMove={e => {
          const rect = svgRef.current!.getBoundingClientRect();
          const xi = Math.round(((e.clientX - rect.left) / rect.width * W - PL) / IW * (n - 1));
          setHoveredIdx(Math.max(0, Math.min(n - 1, xi)));
        }}>
        {[0.25, 0.5, 0.75].map(v => (
          <line key={v} x1={PL} y1={yOf(v)} x2={PL + IW} y2={yOf(v)} stroke="rgba(255,255,255,0.04)" />
        ))}
        {visible.map(col => {
          const color = FINANCIAL_INDICATOR_CONFIG[col]?.color ?? "#94a3b8";
          const nVals = normMap[col] ?? [];
          let d = "";
          for (let i = 0; i < n; i++) {
            const v = nVals[i];
            if (v !== null) {
              d += (i === 0 || nVals[i - 1] === null
                ? ` M${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`
                : ` L${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`);
            }
          }
          if (!d.trim()) return null;
          return <path key={col} d={d.trim()} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={hoveredIdx !== null ? 0.25 : 0.85} />;
        })}
        {hoveredIdx !== null && <line x1={xOf(hoveredIdx)} y1={PT} x2={xOf(hoveredIdx)} y2={PT + IH} stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />}
        {hoveredIdx !== null && visible.map(col => {
          const v = (normMap[col] ?? [])[hoveredIdx];
          if (v == null) return null;
          return <circle key={col} cx={xOf(hoveredIdx)} cy={yOf(v)} r="2.5" fill={FINANCIAL_INDICATOR_CONFIG[col]?.color ?? "#94a3b8"} />;
        })}
        {hoveredIdx !== null && (() => {
          const date = allDates[hoveredIdx];
          const tcols = visible.filter(c => (rawMap[c] ?? [])[hoveredIdx] != null);
          if (!tcols.length) return null;
          const tw = 136, th = 14 + tcols.length * 11;
          const tx = Math.min(xOf(hoveredIdx) + 8, W - tw - 4);
          return (
            <g>
              <rect x={tx} y={PT} width={tw} height={th} rx="4" fill="rgba(10,18,35,0.95)" stroke="rgba(255,255,255,0.07)" />
              <text x={tx + 6} y={PT + 10} fontSize="7" fontWeight="600" fill="rgba(148,163,184,0.75)">{date}</text>
              {tcols.map((col, i) => {
                const rv = (rawMap[col] ?? [])[hoveredIdx];
                return (
                  <g key={col}>
                    <circle cx={tx + 8} cy={PT + 17 + i * 11} r="2" fill={FINANCIAL_INDICATOR_CONFIG[col]?.color ?? "#94a3b8"} />
                    <text x={tx + 15} y={PT + 20 + i * 11} fontSize="6.5" fill="rgba(226,232,240,0.82)">{FINANCIAL_INDICATOR_CONFIG[col]?.labelKo}: {rv != null ? fmtFinancialVal(rv, col) : "—"}</text>
                  </g>
                );
              })}
            </g>
          );
        })()}
        {[0, Math.floor(n / 2), n - 1].filter(i => allDates[i]).map(i => (
          <text key={i} x={xOf(i)} y={H - 5} fontSize="6.5" textAnchor="middle" fill="rgba(148,163,184,0.4)">{allDates[i]}</text>
        ))}
      </svg>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {cols.map(col => {
          const cfg = FINANCIAL_INDICATOR_CONFIG[col];
          const feat = financial.features[col];
          const hidden = hiddenCols.has(col);
          return (
            <button key={col}
              onClick={() => setHiddenCols(s => { const ns = new Set(s); ns.has(col) ? ns.delete(col) : ns.add(col); return ns; })}
              className={`flex items-center gap-1.5 transition-opacity ${hidden ? "opacity-25" : "opacity-100"}`}>
              <span className="w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
              <span className="text-[9px] text-slate-400">{cfg.labelKo}</span>
              {feat?.latestValue != null && <span className="text-[9px] font-bold" style={{ color: cfg.color }}>{fmtFinancialVal(feat.latestValue, col)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Interactive Chart ────────────────────────────────────────────────────────

type FinNormMode = "minmax" | "zscore" | "percentile";
type FinPeriod = "1Y" | "3Y" | "5Y" | "ALL";
const FIN_NORM_LABELS: Record<FinNormMode, string> = { minmax: "Min-Max", zscore: "Z-Score", percentile: "백분위" };

function applyFinNorm(val: number, vals: number[], mode: FinNormMode): number {
  if (mode === "minmax") {
    const mn = vals.reduce((a, b) => Math.min(a, b), Infinity);
    const mx = vals.reduce((a, b) => Math.max(a, b), -Infinity);
    if (mx - mn < 1e-10) return 50;
    return Math.max(0, Math.min(100, ((val - mn) / (mx - mn)) * 100));
  }
  if (mode === "zscore") {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    if (std < 1e-10) return 50;
    return Math.max(0, Math.min(100, ((val - mean) / std) * 15 + 50));
  }
  let rank = 0;
  for (const v of vals) if (v <= val) rank++;
  return (rank / vals.length) * 100;
}

function FinancialMultiChart({ financial }: { financial: FinancialAnalysis }) {
  const [normMode, setNormMode] = useState<FinNormMode>("minmax");
  const [period, setPeriod] = useState<FinPeriod>("ALL");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showNormMenu, setShowNormMenu] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const cols = financial.availableColumns;

  const allDates = useMemo(() => {
    const s = new Set<string>();
    for (const col of cols) (financial.series[col] ?? []).forEach(p => s.add(p.date));
    return [...s].sort();
  }, [cols, financial.series]);

  const filteredDates = useMemo(() => {
    if (period === "ALL" || !allDates.length) return allDates;
    const latest = allDates[allDates.length - 1];
    const years = period === "1Y" ? 1 : period === "3Y" ? 3 : 5;
    const cutoff = new Date(latest);
    cutoff.setFullYear(cutoff.getFullYear() - years);
    const cutStr = cutoff.toISOString().slice(0, 10);
    return allDates.filter(d => d >= cutStr);
  }, [allDates, period]);

  const rawValueMap = useMemo(() => {
    const out: Partial<Record<FinancialCanonicalColumn, (number | null)[]>> = {};
    for (const col of cols) {
      const ptMap = new Map((financial.series[col] ?? []).map(p => [p.date, p.value]));
      out[col] = filteredDates.map(d => { const v = ptMap.get(d); return v !== undefined && Number.isFinite(v) ? v : null; });
    }
    return out;
  }, [cols, financial.series, filteredDates]);

  const normalizedMap = useMemo(() => {
    const out: Partial<Record<FinancialCanonicalColumn, (number | null)[]>> = {};
    for (const col of cols) {
      const raw = rawValueMap[col] ?? [];
      const finite = raw.filter((v): v is number => v !== null);
      if (finite.length < 2) { out[col] = raw.map(() => null); continue; }
      out[col] = raw.map(v => v === null ? null : applyFinNorm(v, finite, normMode));
    }
    return out;
  }, [cols, rawValueMap, normMode]);

  const latestValues = useMemo(() => {
    const out: Partial<Record<FinancialCanonicalColumn, { curr: number | null; prev: number | null }>> = {};
    for (const col of cols) {
      const raw = rawValueMap[col] ?? [];
      let curr: number | null = null, prev: number | null = null;
      for (let i = raw.length - 1; i >= 0; i--) {
        if (raw[i] !== null) { if (curr === null) curr = raw[i]; else { prev = raw[i]; break; } }
      }
      out[col] = { curr, prev };
    }
    return out;
  }, [cols, rawValueMap]);

  const xLabels = useMemo(() => {
    const nd = filteredDates.length;
    if (!nd) return [] as { date: string; idx: number }[];
    const step = Math.max(1, Math.floor(nd / 6));
    const labels: { date: string; idx: number }[] = [];
    for (let i = 0; i < nd; i += step) labels.push({ date: filteredDates[i], idx: i });
    if (labels[labels.length - 1]?.idx !== nd - 1) labels.push({ date: filteredDates[nd - 1], idx: nd - 1 });
    return labels;
  }, [filteredDates]);

  const W = 800, H = 250, PL = 48, PR = 12, PT = 16, PB = 32;
  const IW = W - PL - PR, IH = H - PT - PB;
  const nd = filteredDates.length;
  const xOf = (i: number) => PL + (nd <= 1 ? IW / 2 : (i / (nd - 1)) * IW);
  const yOf = (v: number) => PT + IH * (1 - v / 100);

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || nd === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) * (W / rect.width) - PL;
    setHoveredIdx(Math.max(0, Math.min(nd - 1, Math.round((relX / IW) * (nd - 1)))));
  }

  const visibleCols = cols.filter(c => !hiddenCols.has(c));

  if (!cols.length) return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">차트 데이터 없음</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white">재무 지표 정규화 추이 (0~100)</span>
          <span className="text-[10px] text-slate-500 cursor-default" title="각 지표를 0~100으로 정규화하여 비교합니다.">ℹ</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowNormMenu(m => !m)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-200 hover:border-white/20 transition">
              {FIN_NORM_LABELS[normMode]}<span className="text-slate-500 ml-0.5">▾</span>
            </button>
            {showNormMenu && (
              <div className="absolute right-0 top-8 z-50 min-w-[140px] rounded-xl border border-white/10 bg-[#0f172a] shadow-2xl overflow-hidden">
                {(Object.entries(FIN_NORM_LABELS) as [FinNormMode, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => { setNormMode(v); setShowNormMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition ${normMode === v ? "bg-cyan/10 text-cyan font-bold" : "text-slate-300 hover:bg-white/[0.04]"}`}>{l}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-0.5">
            {(["1Y", "3Y", "5Y", "ALL"] as FinPeriod[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition ${period === p ? "bg-cyan/15 text-cyan" : "text-slate-500 hover:text-slate-300"}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]"
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={onMouseMove} onMouseLeave={() => setHoveredIdx(null)}>
            {[0, 25, 50, 75, 100].map(y => (
              <g key={y}>
                <line x1={PL} y1={yOf(y)} x2={PL + IW} y2={yOf(y)} stroke="rgba(255,255,255,0.06)" strokeDasharray={y === 50 ? undefined : "2 5"} />
                <text x={PL - 6} y={yOf(y) + 4} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.55)">{y}</text>
              </g>
            ))}
            {xLabels.map(({ date, idx }) => (
              <text key={idx} x={xOf(idx)} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.45)">{date.slice(0, 7)}</text>
            ))}
            {cols.map(col => {
              if (hiddenCols.has(col)) return null;
              const nVals = normalizedMap[col] ?? [];
              const color = FINANCIAL_INDICATOR_CONFIG[col]?.color ?? "#94a3b8";
              const isPrimary = FIN_PRIMARY_COLS.includes(col);
              let d = "";
              for (let i = 0; i < nd; i++) {
                const v = nVals[i];
                if (v !== null && v !== undefined) {
                  const prevNull = i === 0 || nVals[i - 1] === null || nVals[i - 1] === undefined;
                  d += (prevNull ? ` M${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}` : ` L${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`);
                }
              }
              if (!d.trim()) return null;
              return <path key={col} d={d.trim()} fill="none" stroke={color}
                strokeWidth={isPrimary ? 2 : 1} strokeDasharray={isPrimary ? undefined : "4 3"}
                strokeLinecap="round" strokeLinejoin="round"
                opacity={hoveredIdx !== null ? 0.35 : 0.88} />;
            })}
            {hoveredIdx !== null && visibleCols.map(col => {
              const v = (normalizedMap[col] ?? [])[hoveredIdx];
              if (v == null) return null;
              return <circle key={col} cx={xOf(hoveredIdx)} cy={yOf(v)} r="3.5" fill={FINANCIAL_INDICATOR_CONFIG[col]?.color ?? "#94a3b8"} />;
            })}
            {hoveredIdx !== null && <line x1={xOf(hoveredIdx)} y1={PT} x2={xOf(hoveredIdx)} y2={PT + IH} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />}
            {hoveredIdx !== null && (() => {
              const date = filteredDates[hoveredIdx];
              const tcols = visibleCols.filter(c => (normalizedMap[c] ?? [])[hoveredIdx] != null);
              const tw = 140, th = 18 + tcols.length * 13;
              const tx = Math.min(xOf(hoveredIdx) + 12, W - tw - 4);
              return (
                <g>
                  <rect x={tx} y={PT + 4} width={tw} height={th} rx="6" fill="rgba(10,18,35,0.94)" stroke="rgba(255,255,255,0.1)" />
                  <text x={tx + 8} y={PT + 16} fontSize="8" fontWeight="bold" fill="rgba(148,163,184,0.8)">{date}</text>
                  {tcols.map((col, i) => {
                    const rv = (rawValueMap[col] ?? [])[hoveredIdx];
                    return (
                      <g key={col}>
                        <circle cx={tx + 10} cy={PT + 24 + i * 13} r="2.5" fill={FINANCIAL_INDICATOR_CONFIG[col]?.color ?? "#94a3b8"} />
                        <text x={tx + 18} y={PT + 28 + i * 13} fontSize="8" fill="rgba(226,232,240,0.88)">{FINANCIAL_INDICATOR_CONFIG[col]?.labelKo}: {rv != null ? fmtFinancialVal(rv, col) : "—"}</text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </svg>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {cols.map(col => {
              const cfg = FINANCIAL_INDICATOR_CONFIG[col];
              const isPrimary = FIN_PRIMARY_COLS.includes(col);
              const hidden = hiddenCols.has(col);
              const lv = latestValues[col];
              return (
                <button key={col}
                  onClick={() => setHiddenCols(s => { const ns = new Set(s); ns.has(col) ? ns.delete(col) : ns.add(col); return ns; })}
                  className={`flex items-center gap-1.5 transition-opacity ${hidden ? "opacity-30" : "opacity-100"}`}>
                  <svg width="16" height="6" className="shrink-0">
                    {isPrimary
                      ? <line x1="0" y1="3" x2="16" y2="3" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" />
                      : <line x1="0" y1="3" x2="16" y2="3" stroke={cfg.color} strokeWidth="1" strokeDasharray="4 2" strokeLinecap="round" />}
                  </svg>
                  <span className="text-[10px] text-slate-400">{cfg.labelKo}</span>
                  {lv?.curr != null && <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{fmtFinancialVal(lv.curr, col)}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-44 shrink-0 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan mb-2.5">최신 값 요약</p>
          <div className="space-y-2.5">
            {cols.map(col => {
              const cfg = FINANCIAL_INDICATOR_CONFIG[col];
              const lv = latestValues[col];
              const diff = lv?.curr != null && lv.prev != null ? lv.curr - lv.prev : null;
              const pct = diff != null && lv?.prev != null && Math.abs(lv.prev) > 1e-9 ? (diff / Math.abs(lv.prev)) * 100 : null;
              const up = diff != null && diff > 1e-9;
              const dn = diff != null && diff < -1e-9;
              return (
                <div key={col}>
                  <p className="text-[9px] font-bold truncate" style={{ color: cfg.color }}>{cfg.labelKo}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-black text-white">{lv?.curr != null ? fmtFinancialVal(lv.curr, col) : "—"}</span>
                    {diff != null && (
                      <span className={`text-[9px] font-bold ${up ? cfg.higherIsBetter ? "text-emerald-400" : "text-rose-400" : dn ? cfg.higherIsBetter ? "text-rose-400" : "text-emerald-400" : "text-slate-500"}`}>
                        {up ? "↑" : dn ? "↓" : "→"} {Math.abs(diff) > 1e-9 ? fmtFinancialVal(Math.abs(diff), col) : ""}
                      </span>
                    )}
                  </div>
                  {pct != null && <p className="text-[8px] text-slate-500">전기 대비 {pct > 0 ? "+" : ""}{pct.toFixed(1)}%</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: 시각화 & 데이터 분석 ─────────────────────────────────────────────

function FinancialVisualizationTab({ financial }: { financial: FinancialAnalysis }) {
  const { score, availableColumns, dateRange, rowCount, confidenceLabel, dataTypeKo, warnings, structure, crossSignals } = financial;
  const invalidMetrics = (financial.metricAudit ?? []).filter((m) => m.validationStatus === "anomaly" || m.validationStatus === "invalid");
  const pipelineConfidence = financial.metricPipeline?.confidence ?? null;
  const financialAnomalies = Object.values(financial.financialMetrics ?? {}).filter((metric) => metric.validationStatus === "anomaly" || metric.validationStatus === "invalid");
  const semanticGroupRows = Object.values(financial.semanticGroups ?? {}).filter((group) => group.metrics.length > 0);

  const scoreColor =
    score.total >= 75 ? { ring: "stroke-emerald-400", text: "text-emerald-400" } :
    score.total >= 60 ? { ring: "stroke-cyan",        text: "text-cyan"        } :
    score.total >= 45 ? { ring: "stroke-amber-400",   text: "text-amber-300"  } :
                        { ring: "stroke-rose-400",     text: "text-rose-400"   };

  const qualityColor =
    score.level === "High Quality Compounder" || score.level === "Stable Cash Generator" ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400" :
    score.level === "Growth Accelerator" ? "border-cyan/25 bg-cyan/5 text-cyan" :
    score.level === "Weakening Growth" || score.level === "Financially Fragile" ||
    score.level === "Earnings Quality Risk" || score.level === "Leverage Distortion" ||
    score.level === "Weak Profitability Structure" || score.level === "Cash-Burning Growth" ||
    score.level === "Operational Deterioration" ? "border-rose-500/25 bg-rose-500/5 text-rose-400" :
    score.level === "Unstable Expansion" || score.level === "Turnaround Candidate" ? "border-amber/25 bg-amber/5 text-amber-300" :
    "border-white/10 bg-white/[0.025] text-slate-300";

  if (!financial.detected || !availableColumns.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.025] p-10 text-center">
        <p className="text-2xl font-black text-white">재무 지표 미감지</p>
        <p className="mt-3 text-sm text-slate-400">Revenue, EPS, ROE, 영업이익 등의 열이 포함된 재무 데이터셋을 업로드하세요.</p>
      </div>
    );
  }

  // Tier 1 hero metrics present in dataset
  const heroMetrics = FIN_PRIMARY_COLS.filter(c => availableColumns.includes(c));

  // Dynamic engine section ordering
  const hasDangerSignals = structure.dangerPairs > 0;
  const cfDanger = crossSignals.some(s => s.severity === "danger" &&
    (s.metricA === "operating_cashflow" || s.metricA === "free_cashflow" ||
     s.metricB === "operating_cashflow" || s.metricB === "free_cashflow"));
  const balanceRisk = crossSignals.some(s => s.severity === "danger" &&
    (s.metricA === "debt" || s.metricB === "debt"));

  const activeSections = ENGINE_SECTIONS
    .map(sec => ({ ...sec, activeCols: sec.cols.filter(c => availableColumns.includes(c)) }))
    .filter(sec => sec.activeCols.length > 0)
    .sort((a, b) => {
      if (a.id === "growth") return -1;
      if (b.id === "growth") return 1;
      if (cfDanger && a.id === "cashflow") return -1;
      if (cfDanger && b.id === "cashflow") return 1;
      if (balanceRisk && a.id === "balance") return -1;
      if (balanceRisk && b.id === "balance") return 1;
      return b.activeCols.length - a.activeCols.length;
    });

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Alpha Score Gauge */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">펀더멘탈 알파 점수</p>
          <div className="mt-3 relative w-32 h-32">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              {score.penaltyApplied && (
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(239,68,68,0.18)"
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${Math.PI * 100 * score.rawTotal / 100} ${Math.PI * 100 * (1 - score.rawTotal / 100)}`} />
              )}
              <circle cx="60" cy="60" r="50" fill="none" className={scoreColor.ring}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${Math.PI * 100 * score.total / 100} ${Math.PI * 100 * (1 - score.total / 100)}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black ${scoreColor.text}`}>{score.total}</span>
              <span className="text-[9px] text-slate-400">/100</span>
            </div>
          </div>
          <p className={`mt-2 text-sm font-black ${scoreColor.text}`}>{score.levelKo}</p>
          <p className="mt-1 text-[10px] text-slate-400">{score.activeComponents}개 지표 활성</p>
          {score.penaltyApplied && (
            <div className="mt-2 w-full rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 text-center">
              <p className="text-[9px] text-rose-400 font-bold">원점수 {score.rawTotal} → 패널티 {score.total}</p>
            </div>
          )}
        </div>

        {/* Quality + Signal Consistency */}
        <div className={`rounded-xl border p-5 ${qualityColor}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">재무 품질 등급</p>
          <p className="mt-2 text-xl font-black leading-tight">{score.levelKo}</p>
          <div className="mt-3 space-y-1.5">
            {(["growth","profitability","stability","cashflow"] as const).map(k => {
              const v = score.components[k];
              const labels: Record<string, string> = { growth: "성장성", profitability: "수익성", stability: "안정성", cashflow: "현금흐름" };
              return (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-[9px] opacity-70 w-14 shrink-0">{labels[k]}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-current/10">
                    <div className="h-1.5 rounded-full bg-current opacity-80 transition-all" style={{ width: `${v}%` }} />
                  </div>
                  <span className="text-[9px] font-bold w-6 text-right">{v}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-current/10">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60 mb-1.5">시그널 일관성</p>
            <div className="flex gap-3 text-[9px]">
              <span className="text-emerald-400 font-bold">✓ {structure.confirmingPairs}확인</span>
              <span className="text-rose-400 font-bold">✗ {structure.contradictingPairs}모순</span>
              {structure.dangerPairs > 0 && <span className="text-orange-400 font-bold">⚠ {structure.dangerPairs}위험</span>}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex-1 h-1 rounded-full bg-current/10">
                <div className="h-1 rounded-full bg-current opacity-60 transition-all" style={{ width: `${structure.scoreMultiplier * 100}%` }} />
              </div>
              <span className="text-[9px] opacity-60 shrink-0">×{structure.scoreMultiplier.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Dataset Info */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">데이터셋 정보</p>
          <div className="mt-3 space-y-2">
            {[
              ["데이터 유형", dataTypeKo],
              ["감지 지표", `${availableColumns.length}개`],
              ["총 행 수", `${rowCount.toLocaleString()}행`],
              ["기간", dateRange ? `${dateRange.start} ~ ${dateRange.end}` : "날짜 미감지"],
              ["신뢰도", confidenceLabel],
              ["파이프라인", pipelineConfidence !== null ? `${pipelineConfidence}/100` : "N/A"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-slate-400">{label}</span>
                <span className="font-bold text-slate-100">{val}</span>
              </div>
            ))}
          </div>
          {warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {warnings.map((w, i) => (
                <p key={i} className="text-[9px] text-amber-400/80 flex gap-1"><span>⚠</span>{w}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contradiction alert — shown when danger signals exist */}
      {hasDangerSignals && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.05] p-4">
          <div className="flex items-start gap-3">
            <span className="text-rose-400 text-base mt-0.5 shrink-0">⚠</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-400 mb-1">
                시그널 모순 감지 — 신뢰도 패널티 적용됨
              </p>
              <p className="text-[10px] text-rose-300/80 leading-5">{structure.contradictionSummaryKo}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-cyan/15 bg-cyan/[0.03] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">Financial Semantic Engine</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              재무 지표를 규모/수익성/성장/주당/배당/레버리지/현금흐름 품질로 분리해 단위가 맞는 그룹 안에서만 해석합니다.
            </p>
          </div>
          <MiniBadge tone={financialAnomalies.length ? "warn" : "good"}>{financialAnomalies.length ? `이상치 ${financialAnomalies.length}개 제외` : "단위 검증 통과"}</MiniBadge>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {semanticGroupRows.map((group) => (
            <div key={group.labelKo} className="rounded-lg border border-white/[0.07] bg-slate-950/35 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-black text-white">{group.labelKo}</p>
                <span className="text-[10px] font-black text-cyan">{group.score ?? "N/A"}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan to-mint" style={{ width: `${Math.max(0, Math.min(100, group.score ?? 0))}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[9px] text-slate-500">
                <span>유효 {group.validCount}/{group.metrics.length}</span>
                <span>제외 {group.anomalyCount}</span>
              </div>
            </div>
          ))}
        </div>
        {financial.structuralPenalties?.length ? (
          <div className="mt-4 rounded-lg border border-amber/20 bg-amber/[0.04] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">구조적 패널티</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {financial.structuralPenalties.slice(0, 4).map((penalty) => (
                <p key={penalty.id} className="rounded border border-white/10 bg-black/15 p-2 text-xs leading-5 text-slate-300">
                  <span className="font-black text-white">{penalty.labelKo}</span> · {penalty.explanationKo}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {invalidMetrics.length > 0 && (
        <div className="rounded-xl border border-amber/25 bg-amber/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">엄격 지표 파이프라인 경고</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                아래 지표는 원시값을 보존했지만 검증 실패로 표시값/점수/기여도 계산에서 분리했습니다.
              </p>
            </div>
            <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 text-[10px] font-black text-amber-200">
              제외 {invalidMetrics.length}개
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {invalidMetrics.slice(0, 6).map((metric) => (
              <div key={metric.originalColumnName} className="rounded-lg border border-white/10 bg-black/15 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-black text-white">{metric.originalColumnName}</p>
                  <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold text-rose-300">{metric.validationStatus}</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">원시값: <span className="text-slate-200">{String(metric.rawValue ?? "N/A")}</span></p>
                <p className="mt-1 text-[10px] text-slate-400">표시값: <span className="text-amber-200">{metric.displayValue}</span></p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">{metric.anomalyReason ?? "검증 기준을 통과하지 못했습니다."}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIER 1: Core Business Metrics — hero cards */}
      {heroMetrics.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan">핵심 비즈니스 지표</p>
            <span className="rounded-full border border-cyan/25 bg-cyan/10 text-cyan text-[8px] font-black px-2 py-0.5">TIER 1 — CORE ENGINE</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {heroMetrics.map(col => <FinancialHeroMetric key={col} col={col} financial={financial} />)}
          </div>
        </div>
      )}

      {/* Engine Sections — separated by meaning */}
      {activeSections.map(section => {
        // Check if this section has any cross-signal issues
        const sectionIssues = crossSignals.filter(s =>
          (section.activeCols.includes(s.metricA) || section.activeCols.includes(s.metricB)) &&
          (s.severity === "danger" || s.severity === "warning")
        );
        const hasSectionIssue = sectionIssues.length > 0;
        const hasDanger = sectionIssues.some(s => s.severity === "danger");
        const borderCls = hasDanger
          ? "border-rose-500/20 bg-rose-500/[0.025]"
          : hasSectionIssue
          ? "border-amber/15 bg-amber/[0.02]"
          : "border-white/[0.07] bg-white/[0.02]";

        return (
          <div key={section.id} className={`rounded-xl border p-5 ${borderCls}`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">{section.icon}</span>
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: section.accentColor }}>
                {section.titleKo}
              </p>
              <span className="text-[9px] text-slate-500">{section.activeCols.length}개 지표</span>
              {hasDanger && (
                <span className="ml-auto rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[8px] font-bold text-rose-400">⚠ 위험 시그널</span>
              )}
              {!hasDanger && hasSectionIssue && (
                <span className="ml-auto rounded-full border border-amber/25 bg-amber/10 px-2 py-0.5 text-[8px] font-bold text-amber-400">▲ 주의</span>
              )}
            </div>
            <FinancialSectionChart financial={financial} cols={section.activeCols} />
          </div>
        );
      })}

      {/* AI narrative */}
      <div className="rounded-xl border border-cyan/10 bg-cyan/[0.03] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-2">AI 시각화 해석</p>
        <p className="text-sm leading-7 text-slate-200">{financial.aiSummary.overallKo}</p>
      </div>
    </div>
  );
}

// ─── Tab 2: 재무 특성 분석 ────────────────────────────────────────────────────

function FinancialFeaturesTab({ financial }: { financial: FinancialAnalysis }) {
  const { availableColumns, features, series, score, crossSignals, structure } = financial;

  if (!financial.detected || !availableColumns.length) {
    return <div className="rounded-xl border border-white/10 p-10 text-center text-slate-400">감지된 재무 지표 없음</div>;
  }

  const tier1 = availableColumns.filter(c => (METRIC_TIER[c] ?? 4) === 1);
  const tier2 = availableColumns.filter(c => (METRIC_TIER[c] ?? 4) === 2);
  const tier34 = availableColumns.filter(c => (METRIC_TIER[c] ?? 4) >= 3);

  const SCORE_META: { key: keyof typeof score.components; labelKo: string; icon: string }[] = [
    { key: "growth",          labelKo: "성장성",   icon: "📈" },
    { key: "profitability",   labelKo: "수익성",   icon: "💰" },
    { key: "stability",       labelKo: "안정성",   icon: "🛡"  },
    { key: "cashflow",        labelKo: "현금흐름", icon: "💧"  },
    { key: "efficiency",      labelKo: "효율성",   icon: "⚙"  },
    { key: "valuationSupport",labelKo: "밸류",     icon: "📊"  },
  ];

  const SEV: Record<string, { badge: string; border: string; bg: string; icon: string }> = {
    positive: { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]", icon: "✓" },
    warning:  { badge: "bg-amber-500/15 text-amber-300 border-amber/30",           border: "border-amber/20",        bg: "bg-amber/[0.04]",        icon: "▲" },
    danger:   { badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",          border: "border-rose-500/20",     bg: "bg-rose-500/[0.04]",     icon: "⚠" },
    neutral:  { badge: "bg-white/[0.06] text-slate-400 border-white/10",           border: "border-white/[0.07]",    bg: "bg-white/[0.02]",        icon: "→" },
  };

  function MetricCard({ col, large }: { col: FinancialCanonicalColumn; large?: boolean }) {
    const cfg = FINANCIAL_INDICATOR_CONFIG[col];
    const feat = features[col];
    const pts = series[col] ?? [];
    const trendUp = feat?.trendDirection === "상승";
    const trendDn = feat?.trendDirection === "하락";
    const goodUp = cfg.higherIsBetter ? trendUp : trendDn;
    const goodDn = cfg.higherIsBetter ? trendDn : trendUp;
    const trendCls = goodUp ? "text-emerald-400" : goodDn ? "text-rose-400" : "text-slate-400";
    const trendIcon = trendUp ? "↑" : trendDn ? "↓" : "→";
    const accelBg = feat?.growthAcceleration === "가속" ? "bg-emerald-500/15 text-emerald-400" :
                    feat?.growthAcceleration === "둔화" ? "bg-rose-500/15 text-rose-400" :
                    "bg-white/[0.06] text-slate-400";
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 hover:border-white/20 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-black leading-tight ${large ? "text-[11px]" : "text-[10px]"}`} style={{ color: cfg.color }}>{cfg.labelKo}</p>
          <span className={`font-black shrink-0 ${large ? "text-xl" : "text-base"} ${trendCls}`}>{trendIcon}</span>
        </div>
        <p className={`mt-1.5 font-black text-white ${large ? "text-3xl" : "text-2xl"}`}>{feat?.displayValue ?? "—"}</p>
        <div className="mt-2"><FinancialSparkline pts={pts} color={cfg.color} /></div>
        <div className="mt-2 flex items-center justify-between">
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${accelBg}`}>{feat?.growthAcceleration ?? "—"}</span>
          {feat?.yoyGrowth != null && (
            <span className={`text-[9px] font-bold ${feat.yoyGrowth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {feat.yoyGrowth >= 0 ? "+" : ""}{feat.yoyGrowth.toFixed(1)}% YoY
            </span>
          )}
        </div>
        {large && feat?.qualityNote && <p className="mt-1.5 text-[8px] text-slate-500 leading-4">{feat.qualityNote}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score breakdown */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan mb-3">점수 구성 요소</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCORE_META.map(({ key, labelKo, icon }) => {
            const v = score.components[key];
            const cls = v >= 65 ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.06]"
              : v >= 50 ? "text-cyan border-cyan/20 bg-cyan/[0.06]"
              : v >= 35 ? "text-amber-300 border-amber/20 bg-amber/[0.06]"
              : "text-rose-400 border-rose-500/20 bg-rose-500/[0.06]";
            return (
              <div key={key} className={`rounded-xl border p-4 ${cls}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{icon} {labelKo}</span>
                  <span className="text-2xl font-black">{v}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-current/10">
                  <div className="h-1.5 rounded-full bg-current opacity-70 transition-all" style={{ width: `${v}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-signal relationship panel */}
      {crossSignals.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">크로스 시그널 관계 분석</p>
            <div className="flex gap-2 text-[9px]">
              <span className="text-emerald-400 font-bold">✓ {structure.confirmingPairs}확인</span>
              <span className="text-rose-400 font-bold">✗ {structure.contradictingPairs}모순</span>
              {structure.dangerPairs > 0 && <span className="text-orange-400 font-bold">⚠ {structure.dangerPairs}위험</span>}
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {crossSignals.map(sig => {
              const s = SEV[sig.severity] ?? SEV.neutral;
              return (
                <div key={sig.id} className={`rounded-lg border p-3 ${s.border} ${s.bg}`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[11px] font-black text-white leading-tight">{sig.labelKo}</p>
                    <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold shrink-0 ${s.badge}`}>
                      {s.icon} {sig.consistent ? "일관됨" : "모순"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5 text-[9px]">
                    <span className="font-bold text-slate-300">{FINANCIAL_INDICATOR_CONFIG[sig.metricA]?.labelKo}</span>
                    <span className={sig.directionA === "상승" ? "text-emerald-400" : sig.directionA === "하락" ? "text-rose-400" : "text-slate-500"}>
                      {sig.directionA === "상승" ? "↑" : sig.directionA === "하락" ? "↓" : "→"}
                    </span>
                    <span className="text-slate-600">vs</span>
                    <span className="font-bold text-slate-300">{FINANCIAL_INDICATOR_CONFIG[sig.metricB]?.labelKo}</span>
                    <span className={sig.directionB === "상승" ? "text-emerald-400" : sig.directionB === "하락" ? "text-rose-400" : "text-slate-500"}>
                      {sig.directionB === "상승" ? "↑" : sig.directionB === "하락" ? "↓" : "→"}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-300 leading-4">{sig.assessmentKo}</p>
                  {sig.impactKo && <p className="mt-1 text-[9px] text-slate-500 leading-4 italic">{sig.impactKo}</p>}
                </div>
              );
            })}
          </div>
          {structure.contradictionSummaryKo && (
            <div className="mt-3 rounded-lg border border-amber/20 bg-amber/[0.05] px-3 py-2">
              <p className="text-[9px] text-amber-300 leading-5">{structure.contradictionSummaryKo}</p>
            </div>
          )}
        </div>
      )}

      {/* TIER 1 — Core Business Engine: large hero cards */}
      {tier1.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan">핵심 비즈니스 지표</p>
            <span className="rounded-full border border-cyan/25 bg-cyan/10 text-cyan text-[8px] font-black px-2 py-0.5">TIER 1</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tier1.map(col => <MetricCard key={col} col={col} large />)}
          </div>
        </div>
      )}

      {/* TIER 2 — Profitability & Efficiency: medium cards */}
      {tier2.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-purple-400">수익성 & 효율성 지표</p>
            <span className="rounded-full border border-purple-400/25 bg-purple-400/10 text-purple-400 text-[8px] font-black px-2 py-0.5">TIER 2</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tier2.map(col => <MetricCard key={col} col={col} />)}
          </div>
        </div>
      )}

      {/* TIER 3–4 — Balance Sheet & Operational Details: compact rows */}
      {tier34.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">재무구조 & 세부 지표</p>
            <span className="rounded-full border border-slate-500/25 bg-slate-500/10 text-slate-400 text-[8px] font-black px-2 py-0.5">TIER 3–4</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {tier34.map(col => {
              const cfg = FINANCIAL_INDICATOR_CONFIG[col];
              const feat = features[col];
              const trendUp = feat?.trendDirection === "상승";
              const trendDn = feat?.trendDirection === "하락";
              const trendCls = (cfg.higherIsBetter ? trendUp : trendDn) ? "text-emerald-400" :
                               (cfg.higherIsBetter ? trendDn : trendUp) ? "text-rose-400" : "text-slate-500";
              return (
                <div key={col} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-bold truncate" style={{ color: cfg.color }}>{cfg.labelKo}</p>
                    <span className={`text-[10px] font-black ${trendCls}`}>{trendUp ? "↑" : trendDn ? "↓" : "→"}</span>
                  </div>
                  <p className="text-base font-black text-white">{feat?.displayValue ?? "—"}</p>
                  {feat?.yoyGrowth != null && (
                    <p className={`mt-0.5 text-[8px] font-bold ${feat.yoyGrowth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {feat.yoyGrowth >= 0 ? "+" : ""}{feat.yoyGrowth.toFixed(1)}% YoY
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Narratives */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-2">성장성 & 수익성 내러티브</p>
        <p className="text-sm leading-7 text-slate-200">{financial.aiSummary.growthNarrativeKo}</p>
        <p className="mt-3 text-sm leading-7 text-slate-200">{financial.aiSummary.profitabilityNarrativeKo}</p>
      </div>
    </div>
  );
}

// ─── Tab 3: 시그널 & 리스크 ───────────────────────────────────────────────────

function FinancialRisksTab({ financial }: { financial: FinancialAnalysis }) {
  const { risks, score, aiSummary, structure } = financial;
  const detected = risks.filter(r => r.detected);
  const highRisks = detected.filter(r => r.severity === "HIGH");
  const medRisks  = detected.filter(r => r.severity === "MEDIUM");

  const overallRiskColor =
    highRisks.length >= 2 ? "border-rose-500/25 bg-rose-500/5 text-rose-400" :
    highRisks.length >= 1 ? "border-orange-500/25 bg-orange-500/5 text-orange-400" :
    medRisks.length >= 2  ? "border-amber/25 bg-amber/5 text-amber-300" :
    "border-emerald-500/25 bg-emerald-500/5 text-emerald-400";

  const overallRiskLabel =
    highRisks.length >= 2 ? "고위험" : highRisks.length >= 1 ? "중고위험" :
    medRisks.length >= 2  ? "중위험" : detected.length > 0 ? "저위험" : "위험 없음";

  return (
    <div className="space-y-5">
      {/* Contradiction summary banner */}
      {(structure.contradictingPairs > 0 || structure.dangerPairs > 0) && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.05] p-4">
          <div className="flex items-start gap-3">
            <span className="text-rose-400 text-lg mt-0.5">⚠</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-400">크로스 시그널 모순 감지</p>
                <div className="flex gap-1.5">
                  {structure.contradictingPairs > 0 && (
                    <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[8px] font-bold text-rose-400">
                      {structure.contradictingPairs}쌍 모순
                    </span>
                  )}
                  {structure.dangerPairs > 0 && (
                    <span className="rounded-full bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.5 text-[8px] font-bold text-orange-400">
                      {structure.dangerPairs}쌍 위험
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-rose-300/80 leading-5">{structure.contradictionSummaryKo}</p>
              {structure.confidencePenaltyKo && (
                <p className="mt-1.5 text-[9px] text-slate-400 leading-4 italic">{structure.confidencePenaltyKo}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Risk summary */}
      <div className={`rounded-xl border p-5 ${overallRiskColor}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">종합 재무 위험 등급</p>
            <p className="mt-1 text-2xl font-black">{overallRiskLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{detected.length}</p>
            <p className="text-[10px] opacity-70">/{risks.length} 위험 감지</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 opacity-80">{aiSummary.riskNarrativeKo}</p>
      </div>

      {/* Risk cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {risks.map(risk => {
          const sev = risk.severity;
          const color =
            !risk.detected ? "border-white/[0.06] bg-white/[0.02] text-slate-500" :
            sev === "HIGH"   ? "border-rose-500/25 bg-rose-500/[0.07] text-rose-400" :
            sev === "MEDIUM" ? "border-amber/25 bg-amber/[0.07] text-amber-300" :
            "border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-400";
          const icon = !risk.detected ? "✓" : sev === "HIGH" ? "⚠" : sev === "MEDIUM" ? "▲" : "●";
          return (
            <div key={risk.id} className={`rounded-xl border p-4 ${color}`}>
              <div className="flex items-start gap-2.5">
                <span className="text-sm mt-0.5">{icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black">{risk.labelKo}</p>
                    {risk.detected && (
                      <span className="rounded-full px-2 py-0.5 text-[8px] font-bold border border-current/20 bg-current/10">{sev === "HIGH" ? "고위험" : sev === "MEDIUM" ? "중위험" : "저위험"}</span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] leading-5 opacity-80">{risk.descriptionKo}</p>
                  {risk.value && <p className="mt-1 text-[9px] font-bold opacity-60">현재값: {risk.value}</p>}
                  {risk.detected && risk.relatedSignals && risk.relatedSignals.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {risk.relatedSignals.map(sig => (
                        <span key={sig} className="rounded px-1 py-0.5 text-[8px] font-bold bg-current/10 border border-current/15 opacity-70">{sig}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stress summary */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-3">재무 건전성 지표</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: "성장 위험", val: 100 - score.components.growth, color: score.components.growth > 55 ? "text-emerald-400" : "text-rose-400" },
            { label: "수익성 위험", val: 100 - score.components.profitability, color: score.components.profitability > 55 ? "text-emerald-400" : "text-amber-300" },
            { label: "재무 안정성", val: score.components.stability, color: score.components.stability > 55 ? "text-emerald-400" : "text-rose-400" },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <p className="text-[9px] text-slate-400 mb-1">{label}</p>
              <p className={`text-xl font-black ${color}`}>{val}</p>
              <div className="mt-1 h-1 rounded-full bg-white/[0.06]">
                <div className="h-1 rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: val > 55 ? "#10B981" : val > 35 ? "#F59E0B" : "#EF4444" }} />
              </div>
            </div>
          ))}
        </div>
        {structure.scoreMultiplier < 1.0 && (
          <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">구조적 패널티</p>
              <p className="text-[9px] text-slate-500 leading-4">{score.penaltyReasonKo}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] text-slate-500">원점수 <span className="font-bold text-slate-300">{score.rawTotal}</span></p>
              <p className="text-[9px] text-slate-500">× <span className="font-bold text-amber-400">{structure.scoreMultiplier.toFixed(2)}</span> = <span className="font-bold text-rose-400">{score.total}</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 4: AI 재무 리포트 ────────────────────────────────────────────────────

function FinancialReportTab({ financial }: { financial: FinancialAnalysis }) {
  const { score, aiSummary, structure } = financial;

  const scoreColor =
    score.total >= 75 ? "text-emerald-400" : score.total >= 60 ? "text-cyan" :
    score.total >= 45 ? "text-amber-300"   : "text-rose-400";

  const CASE_STYLE: Record<string, string> = {
    bull: "border-emerald-500/25 bg-emerald-500/[0.07]",
    base: "border-cyan/20 bg-cyan/[0.05]",
    bear: "border-rose-500/25 bg-rose-500/[0.07]",
  };

  return (
    <div className="space-y-5">
      {/* Score + label hero */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 flex flex-col items-center text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan">펀더멘탈 알파 점수</p>
        {score.penaltyApplied ? (
          <div className="mt-3 flex items-end gap-3 justify-center">
            <div className="text-center">
              <p className="text-[9px] text-slate-500 mb-0.5">원점수</p>
              <p className="text-3xl font-black text-slate-500 line-through">{score.rawTotal}</p>
            </div>
            <p className="text-slate-600 text-2xl mb-1">→</p>
            <div className="text-center">
              <p className="text-[9px] text-rose-400/60 mb-0.5">패널티 적용</p>
              <p className={`text-7xl font-black ${scoreColor}`}>{score.total}</p>
            </div>
          </div>
        ) : (
          <p className={`mt-3 text-7xl font-black ${scoreColor}`}>{score.total}</p>
        )}
        <p className="text-slate-400 text-sm mt-1">/ 100</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span className={`rounded-full border border-current/20 bg-current/10 px-3 py-1 text-xs font-bold ${scoreColor}`}>{score.levelKo}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">{aiSummary.growthClassKo}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">{aiSummary.riskClassKo}</span>
        </div>
      </div>

      {/* Score explanation */}
      <div className="rounded-xl border border-cyan/10 bg-cyan/[0.03] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-2">점수 산출 근거</p>
        <p className="text-sm leading-7 text-slate-200">{aiSummary.scoreExplanationKo}</p>
        {score.penaltyApplied && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2">
            <span className="text-rose-400 text-sm">⚠</span>
            <div>
              <p className="text-[9px] font-black text-rose-400 mb-0.5">구조적 패널티 적용됨</p>
              <p className="text-[9px] text-rose-300/70 leading-4">{score.penaltyReasonKo}</p>
            </div>
            <div className="ml-auto text-right shrink-0">
              <p className="text-[10px] text-slate-400">{score.rawTotal} × {structure.scoreMultiplier.toFixed(2)}</p>
              <p className={`text-sm font-black ${scoreColor}`}>= {score.total}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cross-signal narrative */}
      {aiSummary.crossSignalNarrativeKo && (
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-400">크로스 시그널 해석</p>
            <div className="flex gap-1.5 text-[8px]">
              <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 font-bold">✓ {structure.confirmingPairs}확인</span>
              {structure.contradictingPairs > 0 && <span className="rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 font-bold">✗ {structure.contradictingPairs}모순</span>}
            </div>
          </div>
          <p className="text-sm leading-7 text-slate-200">{aiSummary.crossSignalNarrativeKo}</p>
        </div>
      )}

      {/* AI narrative */}
      <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5 space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-2">종합 분석</p>
          <p className="text-sm leading-7 text-slate-200">{aiSummary.overallKo}</p>
        </div>
        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-2">성장성 분석</p>
          <p className="text-sm leading-7 text-slate-300">{aiSummary.growthNarrativeKo}</p>
        </div>
        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-2">수익성 분석</p>
          <p className="text-sm leading-7 text-slate-300">{aiSummary.profitabilityNarrativeKo}</p>
        </div>
        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400 mb-2">리스크 분석</p>
          <p className="text-sm leading-7 text-slate-300">{aiSummary.riskNarrativeKo}</p>
        </div>
      </div>

      {/* Bull/Base/Bear scenarios */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-3">시나리오 분석</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {aiSummary.scenarios.map(s => (
            <div key={s.case} className={`rounded-xl border p-4 ${CASE_STYLE[s.case]}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-black text-white">{s.labelKo}</p>
                <span className="text-[9px] text-slate-400 font-bold">{s.probability.toFixed(0)}%</span>
              </div>
              <ul className="space-y-0.5 mb-3">
                {s.driversKo.map((d, i) => (
                  <li key={i} className="text-[10px] text-slate-300 flex gap-1.5"><span className="text-slate-500">·</span>{d}</li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-400 leading-5 border-t border-white/[0.06] pt-2">{s.outlookKo}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LT / ST outlook */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-2">장기 전망</p>
          <p className="text-sm leading-6 text-slate-200">{aiSummary.ltOutlookKo}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan mb-2">단기 전망</p>
          <p className="text-sm leading-6 text-slate-200">{aiSummary.stOutlookKo}</p>
        </div>
      </div>

      {/* Final label */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-950 p-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan mb-2">최종 재무 품질 레이블</p>
        <p className={`text-2xl font-black ${scoreColor}`}>{score.levelKo}</p>
      </div>
    </div>
  );
}

// ─── Financial Workspace Shell ────────────────────────────────────────────────

function FinancialWorkspace({
  financial,
  analysis,
  engine,
  activeTab,
  setActiveTab,
}: {
  financial: FinancialAnalysis;
  analysis: AnalysisResult;
  engine: VisualizationEngine;
  activeTab: FinancialWorkspaceTab;
  setActiveTab: (tab: FinancialWorkspaceTab) => void;
}) {
  const tabs: Array<{ id: FinancialWorkspaceTab; label: string; kicker: string }> = [
    { id: "visualization", label: "시각화 & 데이터 분석",  kicker: "VISUALIZATION" },
    { id: "features",      label: "재무 특성 분석",        kicker: "FEATURES" },
    { id: "risks",         label: "시그널 & 리스크",       kicker: "RISK SIGNALS" },
    { id: "report",        label: "AI 재무 리포트",        kicker: "AI REPORT" },
  ];

  return (
    <div className="w-full">
      {/* Tab navigation */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1.5 gap-1 backdrop-blur-sm">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative rounded-xl px-5 py-2.5 transition-all duration-200 group ${activeTab === tab.id ? "bg-white/[0.08] shadow-lg" : "hover:bg-white/[0.04]"}`}>
              <div className={`text-[8px] font-black uppercase tracking-[0.22em] mb-0.5 ${activeTab === tab.id ? "text-cyan" : "text-slate-500 group-hover:text-slate-400"}`}>{tab.kicker}</div>
              <div className={`text-xs font-bold ${activeTab === tab.id ? "text-white" : "text-slate-400 group-hover:text-slate-300"}`}>{tab.label}</div>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "visualization" && <FinancialVisualizationTab financial={financial} />}
      {activeTab === "features"      && <FinancialFeaturesTab financial={financial} />}
      {activeTab === "risks"         && <FinancialRisksTab financial={financial} />}
      {activeTab === "report"        && <FinancialReportTab financial={financial} />}
    </div>
  );
}

function MacroSemanticCategoryCharts({ macro }: { macro: MacroAnalysis }) {
  const [period, setPeriod] = useState<ChartPeriod>("1Y");
  const registry = useMemo(() => macroValidatedMetricsByKey(macro), [macro]);
  const validCols = macro.availableIndicators.filter((col) => registry[col]?.validationStatus !== "anomaly" && registry[col]?.validatedSeries.length);
  const anomalyCols = macro.availableIndicators.filter((col) => registry[col]?.validationStatus === "anomaly");

  useEffect(() => {
    for (const col of anomalyCols) {
      if ((macro.series[col] ?? []).length) warnRawMetricRender("MacroSemanticCategoryCharts blocked raw series", col);
    }
  }, [anomalyCols, macro.series]);

  const grouped = useMemo(() => {
    const out: Partial<Record<(typeof MACRO_UI_CATEGORY)[MacroCanonicalColumn], MacroCanonicalColumn[]>> = {};
    for (const col of validCols) {
      const category = MACRO_UI_CATEGORY[col];
      out[category] = [...(out[category] ?? []), col];
    }
    return out;
  }, [validCols]);

  const filteredSeries = (col: MacroCanonicalColumn) => {
    const points = registry[col]?.validatedSeries ?? [];
    if (period === "ALL" || !points.length) return points;
    const latest = points.at(-1)?.date;
    if (!latest) return points;
    const days = period === "1M" ? 31 : period === "3M" ? 92 : period === "6M" ? 183 : 365;
    const cutoff = new Date(latest);
    cutoff.setDate(cutoff.getDate() - days);
    const cutStr = cutoff.toISOString().slice(0, 10);
    return points.filter((point) => point.date >= cutStr);
  };

  if (!validCols.length) {
    return (
      <div className="rounded-xl border border-amber/20 bg-amber/[0.04] p-5">
        <p className="text-sm font-black text-amber-200">검증된 매크로 차트 데이터가 없습니다.</p>
        <p className="mt-2 text-xs leading-6 text-slate-400">이상치 또는 검증 실패 지표는 차트 축과 스케일에서 제외했습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">의미 그룹별 매크로 차트</p>
          <p className="mt-1 text-xs text-slate-400">검증된 scoreValue 시리즈만 사용하며, 서로 다른 단위는 같은 축에 섞지 않습니다.</p>
        </div>
        <div className="flex gap-0.5">
          {(["1M", "3M", "6M", "1Y", "ALL"] as ChartPeriod[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition ${period === p ? "bg-cyan/15 text-cyan" : "text-slate-500 hover:text-slate-300"}`}>{p}</button>
          ))}
        </div>
      </div>

      {anomalyCols.length ? (
        <div className="rounded-lg border border-amber/20 bg-amber/[0.04] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">차트 제외 이상치</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {anomalyCols.map((col) => {
              const metric = registry[col];
              return (
                <span key={col} className="rounded-full border border-amber/25 bg-slate-950/35 px-2.5 py-1 text-[10px] font-bold text-slate-300">
                  {INDICATOR_CONFIG[col].labelKo}: Invalid / anomaly · raw {String(metric.rawValue ?? "N/A")} · Excluded from score
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {(Object.keys(grouped) as Array<(typeof MACRO_UI_CATEGORY)[MacroCanonicalColumn]>).map((category) => (
          <MacroCategoryChartCard
            key={category}
            category={category}
            cols={grouped[category] ?? []}
            registry={registry}
            getSeries={filteredSeries}
          />
        ))}
      </div>
    </div>
  );
}

function MacroCategoryChartCard({
  category,
  cols,
  registry,
  getSeries,
}: {
  category: (typeof MACRO_UI_CATEGORY)[MacroCanonicalColumn];
  cols: MacroCanonicalColumn[];
  registry: ReturnType<typeof macroValidatedMetricsByKey>;
  getSeries: (col: MacroCanonicalColumn) => { date: string; value: number }[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dates = useMemo(() => {
    const s = new Set<string>();
    for (const col of cols) getSeries(col).forEach((point) => s.add(point.date));
    return [...s].sort();
  }, [cols, getSeries]);
  const valueMap = useMemo(() => {
    const out: Partial<Record<MacroCanonicalColumn, (number | null)[]>> = {};
    for (const col of cols) {
      const ptMap = new Map(getSeries(col).map((point) => [point.date, point.value]));
      out[col] = dates.map((date) => {
        const value = ptMap.get(date);
        return value !== undefined && Number.isFinite(value) ? value : null;
      });
    }
    return out;
  }, [cols, dates, getSeries]);

  const W = 560, H = 210, PL = 38, PR = 14, PT = 16, PB = 28;
  const IW = W - PL - PR, IH = H - PT - PB;
  const nd = dates.length;
  const xOf = (i: number) => PL + (nd <= 1 ? IW / 2 : (i / (nd - 1)) * IW);
  const yOf = (v: number) => PT + IH * (1 - v / 100);

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || nd === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) * (W / rect.width) - PL;
    setHoveredIdx(Math.max(0, Math.min(nd - 1, Math.round((relX / IW) * (nd - 1)))));
  }

  const latestRows = cols.map((col) => {
    const metric = registry[col];
    const points = getSeries(col);
    const latestScore = points.at(-1)?.value ?? metric.scoreValue;
    return { col, metric, latestScore };
  });

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">{category}</p>
          <h3 className="mt-1 text-base font-black text-white">{MACRO_UI_CATEGORY_LABEL[category]}</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-bold text-slate-400">{cols.length}개 지표</span>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="mt-3 h-[190px] w-full"
        preserveAspectRatio="xMidYMid meet" onMouseMove={onMouseMove} onMouseLeave={() => setHoveredIdx(null)}>
        {[0, 25, 50, 75, 100].map((y) => (
          <g key={y}>
            <line x1={PL} y1={yOf(y)} x2={PL + IW} y2={yOf(y)} stroke="rgba(255,255,255,0.06)" strokeDasharray={y === 50 ? undefined : "2 5"} />
            <text x={PL - 6} y={yOf(y) + 3} textAnchor="end" fontSize="8" fill="rgba(148,163,184,0.55)">{y}</text>
          </g>
        ))}
        {cols.map((col) => {
          const vals = valueMap[col] ?? [];
          const color = INDICATOR_CONFIG[col]?.color ?? "#94a3b8";
          let d = "";
          for (let i = 0; i < nd; i++) {
            const v = vals[i];
            if (v !== null && v !== undefined) {
              const prevNull = i === 0 || vals[i - 1] === null || vals[i - 1] === undefined;
              d += (prevNull ? ` M${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}` : ` L${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`);
            }
          }
          return d.trim() ? <path key={col} d={d.trim()} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.88" /> : null;
        })}
        {hoveredIdx !== null ? (
          <line x1={xOf(hoveredIdx)} y1={PT} x2={xOf(hoveredIdx)} y2={PT + IH} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
        ) : null}
        {hoveredIdx !== null ? cols.map((col) => {
          const v = (valueMap[col] ?? [])[hoveredIdx];
          if (v == null) return null;
          return <circle key={col} cx={xOf(hoveredIdx)} cy={yOf(v)} r="3.5" fill={INDICATOR_CONFIG[col]?.color ?? "#94a3b8"} />;
        }) : null}
      </svg>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {latestRows.map(({ col, metric, latestScore }) => {
          const invalid = metric.validationStatus === "anomaly";
          return (
            <div key={col} className={`rounded-lg border p-3 ${invalid ? "border-amber/20 bg-amber/[0.04]" : "border-white/[0.07] bg-slate-950/35"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-black" style={{ color: INDICATOR_CONFIG[col]?.color }}>{INDICATOR_CONFIG[col]?.labelKo}</p>
                <span className="text-[9px] font-bold text-slate-500">{metric.unitType || "raw"}</span>
              </div>
              {invalid ? (
                <>
                  <p className="mt-1 text-sm font-black text-amber-200">Invalid / anomaly</p>
                  <p className="mt-1 text-[10px] text-slate-400">raw: {String(metric.rawValue ?? "N/A")}</p>
                  <p className="mt-1 text-[10px] font-bold text-rose-300">Excluded from score</p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm font-black text-white">{metric.displayValue}</p>
                  <p className="mt-1 text-[10px] text-slate-400">검증 점수 {latestScore == null ? "N/A" : Math.round(latestScore)}/100</p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PortfolioWorkspace({
  portfolio,
  activeTab,
  setActiveTab,
}: {
  portfolio: PortfolioAnalysis;
  activeTab: PortfolioWorkspaceTab;
  setActiveTab: (tab: PortfolioWorkspaceTab) => void;
}) {
  const tabs: Array<{ id: PortfolioWorkspaceTab; label: string; ko: string }> = [
    { id: "overview", label: "시각 개요", ko: "전체 구조" },
    { id: "structure", label: "구조 분석", ko: "집중·분산" },
    { id: "risk", label: "위험·기여도", ko: "압력 분석" },
    { id: "analysis", label: "AI 종합 분석", ko: "기관식 리포트" },
  ];

  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-cyan/15 bg-slate-950/70 p-1.5 shadow-[0_0_42px_rgba(34,211,238,0.12)] backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-5 py-2.5 text-left transition duration-200 ${
                activeTab === tab.id
                  ? "bg-cyan/15 text-white shadow-[0_0_28px_rgba(34,211,238,0.18)]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-cyan"
              }`}
            >
              <div className="text-xs font-black">{tab.label}</div>
              <div className={`mt-0.5 text-[8px] font-black tracking-[0.16em] ${activeTab === tab.id ? "text-cyan/80" : "text-slate-500"}`}>{tab.ko}</div>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && <PortfolioOverviewTab portfolio={portfolio} />}
      {activeTab === "structure" && <PortfolioStructureTab portfolio={portfolio} />}
      {activeTab === "risk" && <PortfolioRiskPerformanceTab portfolio={portfolio} />}
      {activeTab === "analysis" && <PortfolioMasterAnalysisTab portfolio={portfolio} />}
    </section>
  );
}

function PortfolioOverviewTab({ portfolio }: { portfolio: PortfolioAnalysis }) {
  return (
    <div className="space-y-5">
      <PortfolioInsightPanel title="연결된 포트폴리오 스토리" text={portfolio.connectedNarrativeKo} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <PortfolioScoreCard portfolio={portfolio} />
        <PortfolioMetricCard label="분산 점수" value={`${portfolio.score.diversificationScore}`} detail={portfolio.concentrationLevelKo} />
        <PortfolioMetricCard label="가중 수익률" value={portfolio.weightedReturn == null ? "제한" : `${portfolio.weightedReturn.toFixed(2)}%`} detail={`기여도 폭 ${portfolio.score.contributionBreadthScore}`} />
        <PortfolioMetricCard label="총 노출" value={`${portfolio.grossExposure.toFixed(1)}%`} detail={portfolio.exposureLabelKo} />
        <PortfolioMetricCard label="레버리지" value={`+${portfolio.leverageAmount.toFixed(1)}%`} detail={`순 노출 ${portfolio.netExposure.toFixed(1)}%`} />
        <PortfolioMetricCard label="주도 섹터" value={portfolio.dominantSector ?? "추정 제한"} detail="최대 노출" />
        <PortfolioMetricCard label="취약성" value={portfolio.fragilityLevelKo} detail={`압력 ${portfolio.score.fragilityScore}`} />
      </div>

      <PortfolioExposureStructure portfolio={portfolio} />

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <PortfolioTreemap portfolio={portfolio} />
        <PortfolioSectorDonut portfolio={portfolio} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <PortfolioWeightedReturnBars portfolio={portfolio} />
        <PortfolioScatter portfolio={portfolio} />
      </div>

      <PortfolioInsightPanel title="AI 포트폴리오 요약" text={portfolio.aiSummaryKo} />
    </div>
  );
}

function PortfolioStructureTab({ portfolio }: { portfolio: PortfolioAnalysis }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <PortfolioAllocationLadder portfolio={portfolio} />
      <PortfolioHeatmap portfolio={portfolio} />
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">상위 10개 보유자산</p>
        <div className="mt-4 space-y-2">
          {portfolio.holdings.slice(0, 10).map((h) => (
            <div key={h.ticker} className="grid grid-cols-[80px_1fr_58px_58px] items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 transition hover:border-cyan/25 hover:bg-cyan/[0.035]">
              <span className="text-xs font-black text-white">{h.ticker}</span>
              <span className="text-[10px] font-bold text-slate-400">{h.sector.replace(/_/g, " ")}</span>
              <span className="text-right text-xs font-black text-cyan">{h.normalizedWeight.toFixed(1)}%</span>
              <span className={`text-right text-xs font-black ${h.returnPct == null ? "text-slate-500" : h.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{h.returnPct == null ? "-" : `${h.returnPct.toFixed(1)}%`}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-cyan/15 bg-slate-950/55 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">스타일 분류 / 숨은 중복 위험</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {portfolio.style.map((style) => <MiniBadge key={style} tone="good">{style}</MiniBadge>)}
          <MiniBadge tone={portfolio.leverageAmount > 10 ? "warn" : "muted"}>레버리지 +{portfolio.leverageAmount.toFixed(1)}%</MiniBadge>
          <MiniBadge tone={portfolio.top5Weight > 65 ? "warn" : "good"}>상위5 {portfolio.top5Weight.toFixed(1)}%</MiniBadge>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-300">{portfolio.dominantSector ? `${portfolio.dominantSector} 섹터가 가장 큰 비중을 차지합니다. ` : ""}HHI {portfolio.hhi.toFixed(0)} 기준 {portfolio.concentrationLevelKo} 구조이며, 상위 보유자산 의존도 {portfolio.topHoldingWeight.toFixed(1)}%, 섹터 의존 점수 {portfolio.score.sectorDependencyScore}, 취약성 {portfolio.fragilityLevelKo}이 같은 구조를 가리킵니다.</p>
      </div>
    </div>
  );
}

function PortfolioRiskPerformanceTab({ portfolio }: { portfolio: PortfolioAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <PortfolioRiskRadar portfolio={portfolio} />
        <PortfolioContributionWaterfall portfolio={portfolio} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">핵심 위험 신호</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {portfolio.risks.length ? portfolio.risks.map((risk) => (
              <div key={risk.label} className={`rounded-lg border p-3 ${risk.severity === "HIGH" ? "border-rose-400/25 bg-rose-400/[0.06]" : "border-amber-400/20 bg-amber-400/[0.05]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-white">{risk.label}</p>
                  <span className="text-[9px] font-black text-cyan">{risk.value}</span>
                </div>
                <p className="mt-2 text-[10px] leading-5 text-slate-400">{risk.descriptionKo}</p>
              </div>
            )) : <p className="text-sm text-slate-400">주요 위험 신호는 제한적입니다.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">성과 비대칭 / 분산 효율</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PortfolioMetricCard label="최고 기여" value={portfolio.bestHolding?.ticker ?? "-"} detail={portfolio.bestHolding ? `${portfolio.bestHolding.contribution.toFixed(2)}%p` : "수익률 없음"} />
            <PortfolioMetricCard label="최저 기여" value={portfolio.weakestHolding?.ticker ?? "-"} detail={portfolio.weakestHolding ? `${portfolio.weakestHolding.contribution.toFixed(2)}%p` : "수익률 없음"} />
            <PortfolioMetricCard label="강한 섹터" value={portfolio.strongestSector ?? "-"} detail="기여도 기준" />
            <PortfolioMetricCard label="약한 섹터" value={portfolio.weakestSector ?? "-"} detail="기여도 기준" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioMasterAnalysisTab({ portfolio }: { portfolio: PortfolioAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-cyan/20 bg-slate-950/80 p-6 shadow-[0_0_55px_rgba(34,211,238,0.1)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan">AI 포트폴리오 마스터 분석</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <TerminalLine label="알파 점수" value={String(portfolio.score.alpha)} />
          <TerminalLine label="상태" value={portfolio.score.conditionLabel} />
          <TerminalLine label="성향" value={portfolio.riskProfileKo} />
          <TerminalLine label="집중도" value={portfolio.concentrationLevelKo} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <TerminalLine label="기여도 폭" value={String(portfolio.score.contributionBreadthScore)} />
          <TerminalLine label="섹터 의존" value={String(portfolio.score.sectorDependencyScore)} />
          <TerminalLine label="레버리지 압력" value={String(portfolio.score.leveragePressureScore)} />
          <TerminalLine label="자본 효율" value={String(portfolio.score.capitalEfficiencyScore)} />
          <TerminalLine label="취약성" value={portfolio.fragilityLevelKo} />
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-200">{portfolio.aiSummaryKo}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TerminalList title="구조적 강점" items={portfolio.strengthsKo.length ? portfolio.strengthsKo : ["확인 가능한 구조적 강점이 제한적입니다."]} />
        <TerminalList title="구조적 약점" items={portfolio.weaknessesKo.length ? portfolio.weaknessesKo : ["중대한 구조적 약점은 제한적으로 감지됩니다."]} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {[
          { title: "강세 시나리오", text: "상위 보유자산과 주도 섹터가 동반 상승하면 집중 구조가 초과수익으로 작동할 수 있습니다." },
          { title: "기준 시나리오", text: "현재 배분 구조가 유지되며 성과는 주도 섹터와 상위 보유자산 기여도에 의해 결정됩니다." },
          { title: "방어 시나리오", text: "섹터 충격 또는 상위 종목 약세 시 분산 점수와 현금/방어 섹터 비중이 회복력을 좌우합니다." },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan/25 hover:bg-cyan/[0.035]">
            <p className="text-sm font-black text-white">{item.title}</p>
            <p className="mt-3 text-xs leading-6 text-slate-400">{item.text}</p>
          </div>
        ))}
      </div>
      <TerminalList title="최적화 방향" items={portfolio.optimizationKo} />
      {portfolio.warningsKo.length ? <TerminalList title="신뢰도 / 데이터 제한" items={portfolio.warningsKo} /> : null}
    </div>
  );
}

function PortfolioScoreCard({ portfolio }: { portfolio: PortfolioAnalysis }) {
  const tone = portfolio.score.alpha >= 70 ? "text-emerald-400" : portfolio.score.alpha >= 45 ? "text-cyan" : "text-rose-400";
  return (
    <div className="group relative overflow-hidden rounded-xl border border-cyan/15 bg-slate-950/70 p-5 shadow-[0_0_50px_rgba(34,211,238,0.12)] transition duration-300 hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[0_0_75px_rgba(34,211,238,0.18)] lg:col-span-1">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">포트폴리오 알파</p>
      <p className={`mt-3 text-6xl font-black ${tone}`}>{portfolio.score.alpha}</p>
      <p className="mt-2 text-xs font-bold text-slate-400">{portfolio.score.conditionLabel}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan via-sky-400 to-emerald-400" style={{ width: `${portfolio.score.alpha}%` }} />
      </div>
    </div>
  );
}

function PortfolioMetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 transition duration-200 hover:-translate-y-1 hover:border-cyan/25 hover:bg-cyan/[0.035] hover:shadow-[0_0_28px_rgba(34,211,238,0.12)]">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold text-slate-400">{detail}</p>
    </div>
  );
}

function PortfolioExposureStructure({ portfolio }: { portfolio: PortfolioAnalysis }) {
  const max = Math.max(100, portfolio.grossExposure, portfolio.longExposure + portfolio.shortExposure, 1);
  const longW = Math.min(100, portfolio.longExposure / max * 100);
  const shortW = Math.min(100, portfolio.shortExposure / max * 100);
  const grossW = Math.min(100, portfolio.grossExposure / max * 100);
  const netW = Math.min(100, Math.abs(portfolio.netExposure) / max * 100);
  return (
    <section
      className="group rounded-xl border border-cyan/15 bg-slate-950/65 p-5 shadow-[0_0_55px_rgba(34,211,238,0.08)] transition duration-300 hover:-translate-y-1 hover:border-cyan/35 hover:shadow-[0_0_75px_rgba(34,211,238,0.14)]"
      title="총 노출은 롱 비중과 숏 비중의 절댓값 합계입니다. 순 노출은 롱 노출에서 숏 노출을 차감한 방향성 노출입니다. 총 노출이 100%를 넘으면 완전 투자 자본을 초과한 레버리지 또는 합성 노출로 해석합니다."
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">노출 구조 분석</p>
          <h3 className="mt-2 text-2xl font-black text-white">{portfolio.exposureLabelKo}</h3>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-300">{portfolio.exposureInterpretationKo}</p>
        </div>
        <div className="grid min-w-[260px] grid-cols-2 gap-2 text-right">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[9px] font-black text-slate-500">롱 노출</p>
            <p className="text-lg font-black text-emerald-400">{portfolio.longExposure.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[9px] font-black text-slate-500">숏 노출</p>
            <p className="text-lg font-black text-rose-400">{portfolio.shortExposure.toFixed(1)}%</p>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-4">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-400">총 노출</span>
            <span className="text-cyan">{portfolio.grossExposure.toFixed(1)}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan to-violet-400" style={{ width: `${grossW}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-4">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-400">순 노출</span>
            <span className="text-sky-300">{portfolio.netExposure.toFixed(1)}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-sky-400" style={{ width: `${netW}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-4">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-400">레버리지</span>
            <span className={portfolio.leverageAmount > 10 ? "text-amber-300" : "text-mint"}>+{portfolio.leverageAmount.toFixed(1)}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
            <div className={`h-full rounded-full ${portfolio.leverageAmount > 10 ? "bg-amber-300" : "bg-mint"}`} style={{ width: `${Math.min(100, portfolio.leverageAmount / 50 * 100)}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-slate-800">
        <div className="bg-emerald-400/85" style={{ width: `${longW}%` }} />
        <div className="bg-rose-400/85" style={{ width: `${shortW}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-500">
        <span>롱 {portfolio.longExposure.toFixed(1)}%</span>
        <span>숏 {portfolio.shortExposure.toFixed(1)}%</span>
      </div>
    </section>
  );
}

function PortfolioTreemap({ portfolio }: { portfolio: PortfolioAnalysis }) {
  const top = portfolio.holdings.slice(0, 12);
  const total = top.reduce((sum, h) => sum + Math.abs(h.normalizedWeight), 0) || 1;
  return (
    <section className="rounded-xl border border-cyan/15 bg-slate-950/65 p-5 shadow-[0_0_55px_rgba(34,211,238,0.08)]">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">보유자산 배분 트리맵 / {portfolio.primaryChartFocusKo}</p>
      <div className="mt-4 grid h-[360px] grid-cols-4 grid-rows-3 gap-2">
        {top.map((h, i) => (
          <div key={h.ticker} className={`rounded-lg border border-white/[0.07] bg-cyan/[0.04] p-3 transition hover:-translate-y-1 hover:border-cyan/30 hover:shadow-[0_0_24px_rgba(34,211,238,0.18)] ${i < 2 ? "col-span-2 row-span-1" : ""}`} style={{ opacity: 0.45 + Math.abs(h.normalizedWeight) / total }}>
            <p className="text-sm font-black text-white">{h.ticker}</p>
            <p className="mt-1 text-xs font-bold text-cyan">{h.normalizedWeight.toFixed(1)}%</p>
            <p className="mt-1 text-[10px] text-slate-400">{h.sector.replace(/_/g, " ")}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">이 차트는 알파 점수의 핵심 입력인 상위 보유자산 의존도와 분산 신뢰도를 한 화면에서 확인하기 위해 선택되었습니다.</p>
    </section>
  );
}

function PortfolioSectorDonut({ portfolio }: { portfolio: PortfolioAnalysis }) {
  const colors = ["#38BDF8", "#22D3EE", "#A78BFA", "#34D399", "#F472B6", "#F59E0B", "#60A5FA"];
  let cursor = 0;
  const gradient = portfolio.sectorAllocation.map((s, i) => {
    const start = cursor;
    const end = cursor + Math.abs(s.weight);
    cursor = end;
    return `${colors[i % colors.length]} ${start}% ${end}%`;
  }).join(", ");
  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/65 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">섹터 배분 도넛</p>
      <div className="mt-5 flex items-center justify-center">
        <div className="grid h-56 w-56 place-items-center rounded-full" style={{ background: `conic-gradient(${gradient || "#334155 0% 100%"})` }}>
          <div className="grid h-32 w-32 place-items-center rounded-full bg-slate-950 text-center">
            <div>
              <p className="text-2xl font-black text-white">{portfolio.sectorAllocation.length}</p>
              <p className="text-[10px] font-bold text-slate-400">섹터</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {portfolio.sectorAllocation.slice(0, 6).map((s, i) => (
          <div key={s.sector} className="flex items-center justify-between text-xs">
            <span className="font-bold" style={{ color: colors[i % colors.length] }}>{s.sector}</span>
            <span className="font-black text-white">{s.weight.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">이 차트는 주도 섹터가 분산 점수를 실제로 보강하는지, 아니면 숨은 섹터 의존도를 만드는지 보여줍니다.</p>
    </section>
  );
}

function PortfolioWeightedReturnBars({ portfolio }: { portfolio: PortfolioAnalysis }) {
  const items = portfolio.holdings.filter((h) => h.returnPct != null).sort((a, b) => b.contribution - a.contribution).slice(0, 10);
  const max = Math.max(...items.map((h) => Math.abs(h.contribution)), 1);
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">가중 수익 기여도</p>
      <div className="mt-4 space-y-2">
        {items.length ? items.map((h) => (
          <div key={h.ticker} className="grid grid-cols-[76px_1fr_56px] items-center gap-3">
            <span className="text-xs font-black text-white">{h.ticker}</span>
            <div className="h-2 rounded-full bg-slate-800">
              <div className={`h-2 rounded-full ${h.contribution >= 0 ? "bg-emerald-400" : "bg-rose-400"}`} style={{ width: `${Math.abs(h.contribution) / max * 100}%` }} />
            </div>
            <span className={`text-right text-xs font-black ${h.contribution >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{h.contribution.toFixed(2)}</span>
          </div>
        )) : <p className="text-sm text-slate-400">수익률 컬럼이 없어 기여도 차트를 제한합니다.</p>}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">이 차트는 가중 수익률이 넓게 분산된 결과인지, 특정 보유자산이 만든 착시인지 확인합니다.</p>
    </section>
  );
}

function PortfolioScatter({ portfolio }: { portfolio: PortfolioAnalysis }) {
  const items = portfolio.holdings.filter((h) => h.returnPct != null);
  const maxW = Math.max(...items.map((h) => Math.abs(h.normalizedWeight)), 1);
  const minR = Math.min(...items.map((h) => h.returnPct ?? 0), -5);
  const maxR = Math.max(...items.map((h) => h.returnPct ?? 0), 5);
  const rangeR = Math.max(maxR - minR, 1);
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">비중 vs 수익률 산점도</p>
      <div className="mt-4 h-72 rounded-lg border border-white/[0.06] bg-black/20 p-3">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" x2="100" y1="50" y2="50" stroke="rgba(148,163,184,0.18)" strokeDasharray="2 2" />
          {items.map((h) => {
            const x = Math.abs(h.normalizedWeight) / maxW * 94 + 3;
            const y = 96 - (((h.returnPct ?? 0) - minR) / rangeR * 92 + 2);
            return <circle key={h.ticker} cx={x} cy={y} r={2 + Math.abs(h.normalizedWeight) / maxW * 3} fill={h.contribution >= 0 ? "#34D399" : "#F43F5E"} opacity="0.85" />;
          })}
        </svg>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">이 차트는 비중, 수익률, 기여도가 같은 방향인지 비교해 자본 효율과 취약성을 연결합니다.</p>
    </section>
  );
}

function PortfolioInsightPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-cyan/15 bg-[linear-gradient(135deg,rgba(8,47,73,0.22),rgba(2,6,23,0.74))] p-5 shadow-[0_0_45px_rgba(34,211,238,0.08)]">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-200">{text}</p>
    </div>
  );
}

function PortfolioAllocationLadder({ portfolio }: { portfolio: PortfolioAnalysis }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">배분 래더</p>
      <div className="mt-4 space-y-2">
        {portfolio.holdings.slice(0, 12).map((h) => (
          <div key={h.ticker} className="grid grid-cols-[78px_1fr_56px] items-center gap-3">
            <span className="text-xs font-black text-white">{h.ticker}</span>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-cyan" style={{ width: `${Math.min(100, Math.abs(h.normalizedWeight) * 4)}%` }} />
            </div>
            <span className="text-right text-xs font-black text-cyan">{h.normalizedWeight.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PortfolioHeatmap({ portfolio }: { portfolio: PortfolioAnalysis }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">집중도 히트맵</p>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {portfolio.holdings.slice(0, 25).map((h) => {
          const intensity = Math.min(0.85, 0.12 + Math.abs(h.normalizedWeight) / Math.max(portfolio.topHoldingWeight, 1) * 0.65);
          return (
            <div key={h.ticker} className="h-16 rounded-lg border border-white/[0.06] p-2 transition hover:-translate-y-1 hover:border-cyan/30" style={{ backgroundColor: `rgba(34,211,238,${intensity})` }}>
              <p className="truncate text-[10px] font-black text-white">{h.ticker}</p>
              <p className="text-[9px] font-bold text-slate-900">{h.normalizedWeight.toFixed(1)}%</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PortfolioRiskRadar({ portfolio }: { portfolio: PortfolioAnalysis }) {
  const metrics = [
    { label: "집중", value: portfolio.score.concentrationScore },
    { label: "레버리지", value: portfolio.score.leveragePressureScore },
    { label: "성과분산", value: Math.max(0, 100 - portfolio.score.consistencyScore) },
    { label: "섹터압력", value: 100 - portfolio.score.sectorDependencyScore },
    { label: "기여집중", value: 100 - portfolio.score.contributionBreadthScore },
  ];
  const points = metrics.map((m, i) => {
    const angle = -Math.PI / 2 + i * (Math.PI * 2 / metrics.length);
    const r = 8 + m.value * 0.38;
    return `${50 + Math.cos(angle) * r},${50 + Math.sin(angle) * r}`;
  }).join(" ");
  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/65 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">위험 레이더</p>
      <svg className="mt-4 h-72 w-full" viewBox="0 0 100 100">
        {[20, 35, 50].map((r) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(148,163,184,0.12)" />)}
        <polygon points={points} fill="rgba(34,211,238,0.18)" stroke="#22D3EE" strokeWidth="0.8" />
        {metrics.map((m, i) => {
          const angle = -Math.PI / 2 + i * (Math.PI * 2 / metrics.length);
          return <text key={m.label} x={50 + Math.cos(angle) * 46} y={53 + Math.sin(angle) * 46} fill="#CBD5E1" fontSize="4" textAnchor="middle">{m.label}</text>;
        })}
      </svg>
    </section>
  );
}

function PortfolioContributionWaterfall({ portfolio }: { portfolio: PortfolioAnalysis }) {
  const items = portfolio.holdings.filter((h) => h.returnPct != null).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 10);
  const max = Math.max(...items.map((h) => Math.abs(h.contribution)), 1);
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">기여도 워터폴</p>
      <div className="mt-4 flex h-72 items-end gap-2">
        {items.length ? items.map((h) => (
          <div key={h.ticker} className="flex flex-1 flex-col items-center justify-end gap-2">
            <div className={`w-full rounded-t-md ${h.contribution >= 0 ? "bg-emerald-400" : "bg-rose-400"}`} style={{ height: `${Math.max(8, Math.abs(h.contribution) / max * 220)}px` }} />
            <span className="max-w-[48px] truncate text-[9px] font-black text-slate-400">{h.ticker}</span>
          </div>
        )) : <p className="text-sm text-slate-400">수익률 데이터가 없어 워터폴이 제한됩니다.</p>}
      </div>
    </section>
  );
}

function SentimentWorkspace({
  sentiment,
  activeTab,
  setActiveTab,
}: {
  sentiment: SentimentAnalysis;
  activeTab: SentimentWorkspaceTab;
  setActiveTab: (tab: SentimentWorkspaceTab) => void;
}) {
  const tabs: Array<{ id: SentimentWorkspaceTab; label: string; ko: string }> = [
    { id: "overview", label: "센티먼트 개요", ko: "감정 상태" },
    { id: "features", label: "특징 분석", ko: "변화 원인" },
    { id: "risk", label: "위험 압력", ko: "군중 리스크" },
    { id: "interpretation", label: "AI 전략 해석", ko: "최종 리포트" },
  ];

  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-fuchsia-400/15 bg-slate-950/70 p-1.5 shadow-[0_0_42px_rgba(217,70,239,0.12)] backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-5 py-2.5 text-left transition duration-200 ${
                activeTab === tab.id
                  ? "bg-fuchsia-400/15 text-white shadow-[0_0_28px_rgba(217,70,239,0.18)]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-fuchsia-300"
              }`}
            >
              <div className="text-xs font-black">{tab.label}</div>
              <div className={`mt-0.5 text-[8px] font-black tracking-[0.16em] ${activeTab === tab.id ? "text-fuchsia-300/80" : "text-slate-500"}`}>{tab.ko}</div>
            </button>
          ))}
        </div>
      </div>
      {activeTab === "overview" && <SentimentOverviewTab sentiment={sentiment} />}
      {activeTab === "features" && <SentimentFeatureTab sentiment={sentiment} />}
      {activeTab === "risk" && <SentimentRiskTab sentiment={sentiment} />}
      {activeTab === "interpretation" && <SentimentInterpretationTab sentiment={sentiment} />}
    </section>
  );
}

function sentimentToneClasses(sentiment: SentimentAnalysis) {
  if (sentiment.narrative.colorTone === "bullish") {
    return { text: "text-cyan", panel: "border-cyan/20 bg-slate-950/75 hover:border-cyan/40" };
  }
  if (sentiment.narrative.colorTone === "fear") {
    return { text: "text-amber-300", panel: "border-amber-300/20 bg-slate-950/75 hover:border-amber-300/40" };
  }
  if (sentiment.narrative.colorTone === "panic") {
    return { text: "text-rose-400", panel: "border-rose-400/25 bg-slate-950/80 hover:border-rose-400/45" };
  }
  return { text: "text-fuchsia-300", panel: "border-fuchsia-300/20 bg-slate-950/75 hover:border-fuchsia-300/40" };
}

function SentimentOverviewTab({ sentiment }: { sentiment: SentimentAnalysis }) {
  const tone = sentimentToneClasses(sentiment);
  return (
    <div className="space-y-5">
      <section className={`rounded-xl border p-5 shadow-[0_0_55px_rgba(217,70,239,0.1)] ${tone.panel}`}>
        <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${tone.text}`}>중심 감정 내러티브</p>
        <h2 className="mt-2 text-2xl font-black text-white">{sentiment.narrative.coreRegimeKo}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-200">{sentiment.narrative.overviewKo}</p>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SentimentScoreCard sentiment={sentiment} />
        <PortfolioMetricCard label="소셜 열기" value={`${sentiment.hypeStrength.toFixed(2)}x`} detail="최근 평균 대비 언급량" />
        <PortfolioMetricCard label="공포/탐욕" value={sentiment.fearGreedState} detail={sentiment.psychologyKo} />
        <PortfolioMetricCard label="커뮤니티 압력" value={`${sentiment.crowdPressure.toFixed(0)}%`} detail="레딧/커뮤니티 분위기" />
        <PortfolioMetricCard label="미디어 압력" value={`${sentiment.mediaPressure.toFixed(0)}%`} detail="뉴스 톤 위치" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SentimentTimeline sentiment={sentiment} />
        <SentimentEmotionMeter sentiment={sentiment} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <SentimentMentionsSpike sentiment={sentiment} />
        <SentimentRedditNewsCompare sentiment={sentiment} />
      </div>
      <PortfolioInsightPanel title="AI 감성 요약" text={sentiment.explanation.finalInterpretation} />
    </div>
  );
}

function SentimentFeatureTab({ sentiment }: { sentiment: SentimentAnalysis }) {
  const tone = sentimentToneClasses(sentiment);
  const features = [
    { label: "감성 모멘텀", value: sentiment.socialMomentum, detail: "최근 감정 개선 속도" },
    { label: "하이프 확장", value: Math.min(100, sentiment.hypeStrength * 45), detail: "언급량/최근 평균" },
    { label: "커뮤니티 압력", value: sentiment.crowdPressure, detail: "레딧/커뮤니티 백분위" },
    { label: "뉴스 압력", value: sentiment.mediaPressure, detail: "뉴스 점수 백분위" },
    { label: "내러티브 강도", value: sentiment.narrativeStrength, detail: "소셜+뉴스 결합" },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <PortfolioInsightPanel title="왜 감성이 변했는가" text={sentiment.narrative.featureKo} />
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${tone.text}`}>감성 변화 기여 요인</p>
        <div className="mt-5 space-y-4">
          {features.map((f) => (
            <div key={f.label}>
              <div className="flex justify-between text-xs font-black">
                <span className="text-white">{f.label}</span>
                <span className="text-fuchsia-300">{Math.round(f.value)}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-gradient-to-r from-cyan to-fuchsia-400" style={{ width: `${Math.min(100, f.value)}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{f.detail}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-white/10 bg-slate-950/65 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-300">동적 인사이트</p>
        <div className="mt-4 space-y-3">
          {sentiment.insightsKo.map((item) => (
            <div key={item} className="rounded-lg border border-fuchsia-300/10 bg-fuchsia-300/[0.04] p-3 text-sm leading-6 text-slate-200">{item}</div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <TerminalList title="강세 요인" items={sentiment.bullishFactorsKo.length ? sentiment.bullishFactorsKo : ["강세 감성 요인은 제한적입니다."]} />
          <TerminalList title="약세 요인" items={sentiment.bearishFactorsKo.length ? sentiment.bearishFactorsKo : ["뚜렷한 약세 감성 요인은 제한적입니다."]} />
        </div>
      </section>
    </div>
  );
}

function SentimentRiskTab({ sentiment }: { sentiment: SentimentAnalysis }) {
  const tone = sentimentToneClasses(sentiment);
  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-xl border border-white/10 bg-slate-950/65 p-5">
        <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${tone.text}`}>군중 심리 위험 레이더</p>
        <SentimentRiskRadar sentiment={sentiment} />
      </section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-300">위험 라벨</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sentiment.risks.length ? sentiment.risks.map((risk) => (
            <div key={risk.label} className={`rounded-lg border p-4 ${risk.severity === "HIGH" ? "border-rose-400/25 bg-rose-400/[0.06]" : "border-amber-300/20 bg-amber-300/[0.05]"}`}>
              <div className="flex justify-between gap-2">
                <p className="text-sm font-black text-white">{risk.label}</p>
                <span className="text-xs font-black text-fuchsia-300">{risk.value}</span>
              </div>
              <p className="mt-2 text-xs leading-6 text-slate-400">{risk.descriptionKo}</p>
            </div>
          )) : (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 sm:col-span-2">
              <p className="text-sm font-black text-white">극단 위험 신호 제한</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">{sentiment.narrative.riskKo}</p>
            </div>
          )}
        </div>
      </section>
      <PortfolioInsightPanel title="감성 위험 해석" text={sentiment.narrative.riskKo} />
    </div>
  );
}

function SentimentInterpretationTab({ sentiment }: { sentiment: SentimentAnalysis }) {
  const tone = sentimentToneClasses(sentiment);
  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-6 shadow-[0_0_55px_rgba(217,70,239,0.1)] ${tone.panel}`}>
        <p className={`text-[10px] font-black uppercase tracking-[0.28em] ${tone.text}`}>AI 감성 전략 리포트</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <TerminalLine label="감성 점수" value={String(sentiment.score)} />
          <TerminalLine label="감정 체제" value={sentiment.psychologyKo} />
          <TerminalLine label="신뢰도" value={sentiment.confidence} />
          <TerminalLine label="레짐" value={sentiment.regimeKo} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <TerminalLine label="강세 확률" value={`${sentiment.bullishProbability}%`} />
          <TerminalLine label="약세 확률" value={`${sentiment.bearishProbability}%`} />
          <TerminalLine label="내러티브 강도" value={String(sentiment.narrativeStrength)} />
          <TerminalLine label="소셜 모멘텀" value={String(sentiment.socialMomentum)} />
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-200">{sentiment.narrative.strategyKo}</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {[
          { title: "강세 시나리오", text: sentiment.scenarioKo.bull },
          { title: "기준 시나리오", text: sentiment.scenarioKo.base },
          { title: "약세 시나리오", text: sentiment.scenarioKo.bear },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-fuchsia-300/25 hover:bg-fuchsia-300/[0.035]">
            <p className="text-sm font-black text-white">{item.title}</p>
            <p className="mt-3 text-xs leading-6 text-slate-400">{item.text}</p>
          </div>
        ))}
      </div>
      <PortfolioInsightPanel title="전략 제안" text={sentiment.strategicActionKo} />
      {sentiment.degradationKo.length ? <TerminalList title="신뢰도 조정 사유" items={sentiment.degradationKo} /> : null}
    </div>
  );
}

function SentimentScoreCard({ sentiment }: { sentiment: SentimentAnalysis }) {
  const tone = sentimentToneClasses(sentiment);
  return (
    <div className={`group relative overflow-hidden rounded-xl border p-5 shadow-[0_0_50px_rgba(217,70,239,0.12)] transition duration-300 hover:-translate-y-1 ${tone.panel}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${tone.text}`}>감성 점수</p>
      <p className={`mt-3 text-6xl font-black ${tone.text}`}>{sentiment.score}</p>
      <p className="mt-2 text-xs font-bold text-slate-400">{sentiment.psychologyKo} / {sentiment.regimeKo}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-400 to-emerald-400" style={{ width: `${sentiment.score}%` }} />
      </div>
    </div>
  );
}

function SentimentTimeline({ sentiment }: { sentiment: SentimentAnalysis }) {
  const [hover, setHover] = useState<{ x: number; y: number; point: SentimentAnalysis["series"][number] } | null>(null);
  const points = sentiment.series.slice(-80);
  const poly = points.map((p, i) => `${points.length <= 1 ? 0 : i / (points.length - 1) * 100},${100 - p.sentiment}`).join(" ");
  return (
    <section className="relative rounded-xl border border-fuchsia-300/15 bg-slate-950/65 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-300">감성 타임라인</p>
      <svg className="mt-4 h-80 w-full rounded-lg border border-white/[0.06] bg-black/20 p-2" viewBox="0 0 100 100" preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="sentimentLine" x1="0" x2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="50%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <line x1="0" x2="100" y1="50" y2="50" stroke="rgba(148,163,184,0.16)" strokeDasharray="2 2" />
        <polyline points={poly} fill="none" stroke="url(#sentimentLine)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => {
          const x = points.length <= 1 ? 0 : i / (points.length - 1) * 100;
          const y = 100 - p.sentiment;
          return <circle key={`${p.index}-${p.label}`} cx={x} cy={y} r="2.4" fill="transparent" stroke="transparent" strokeWidth="8" onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, point: p })} onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, point: p })} />;
        })}
      </svg>
      {hover ? <SentimentTooltip x={hover.x} y={hover.y} lines={[
        `날짜: ${hover.point.label}`,
        `감성 점수: ${hover.point.sentiment.toFixed(1)}`,
        `변화: ${hover.point.momentum.toFixed(1)}`,
        `레짐: ${sentiment.narrative.coreRegimeKo}`,
        `의미: ${hover.point.momentum < -1 ? "감성 둔화가 확인됩니다." : hover.point.momentum > 1 ? "감성 개선이 확인됩니다." : "중립권 압축 흐름입니다."}`,
      ]} /> : null}
      <p className="mt-3 text-xs leading-5 text-slate-400">{sentiment.explanation.timelineCommentary}</p>
    </section>
  );
}

function SentimentEmotionMeter({ sentiment }: { sentiment: SentimentAnalysis }) {
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  return (
    <section className="relative rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-300">감정 온도계</p>
      <div className="mt-8 h-8 overflow-hidden rounded-full bg-gradient-to-r from-rose-500 via-slate-500 to-emerald-400" onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY })} onMouseLeave={() => setHover(null)}>
        <div className="h-full w-1 bg-white shadow-[0_0_18px_white]" style={{ marginLeft: `${Math.min(98, sentiment.score)}%` }} />
      </div>
      {hover ? <SentimentTooltip x={hover.x} y={hover.y} lines={[
        `현재 점수: ${sentiment.score}`,
        `레짐: ${sentiment.narrative.coreRegimeKo}`,
        `신뢰도: ${sentiment.confidence}`,
        `의미: ${sentiment.explanation.gaugeCommentary}`,
      ]} /> : null}
      <div className="mt-3 flex justify-between text-[10px] font-black text-slate-500">
        <span>패닉</span><span>중립</span><span>도취</span>
      </div>
      <p className="mt-8 text-3xl font-black text-white">{sentiment.psychologyKo}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{sentiment.explanation.gaugeCommentary}</p>
    </section>
  );
}

function SentimentMentionsSpike({ sentiment }: { sentiment: SentimentAnalysis }) {
  const [hover, setHover] = useState<{ x: number; y: number; point: SentimentAnalysis["series"][number] } | null>(null);
  const points = sentiment.series.slice(-40);
  const max = Math.max(...points.map((p) => p.mentions), 1);
  return (
    <section className="relative rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-300">언급량 스파이크</p>
      <div className="mt-4 flex h-64 items-end gap-1">
        {points.map((p) => (
          <div key={`${p.index}-${p.label}`} className={`flex-1 rounded-t transition hover:brightness-125 ${p.hypeStrength > 1.3 ? "bg-fuchsia-400" : "bg-cyan/70"}`} style={{ height: `${Math.max(4, p.mentions / max * 240)}px` }} onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, point: p })} onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, point: p })} onMouseLeave={() => setHover(null)} />
        ))}
      </div>
      {hover ? <SentimentTooltip x={hover.x} y={hover.y} lines={[
        `날짜: ${hover.point.label}`,
        `언급량: ${hover.point.mentions.toFixed(0)}`,
        `소셜 열기: ${hover.point.hypeStrength.toFixed(2)}x`,
        `상태: ${hover.point.hypeStrength < 0.8 ? "평균 이하" : hover.point.hypeStrength <= 1.2 ? "평균권" : hover.point.hypeStrength <= 1.6 ? "확대" : "높은 하이프"}`,
        `의미: ${hover.point.hypeStrength < 1 ? "군중 관심 확산은 제한적입니다." : "군중 참여가 평균 대비 확대됩니다."}`,
      ]} /> : null}
      <p className="mt-3 text-xs leading-5 text-slate-400">{sentiment.explanation.mentionsCommentary}</p>
    </section>
  );
}

function SentimentRedditNewsCompare({ sentiment }: { sentiment: SentimentAnalysis }) {
  const [hover, setHover] = useState<{ x: number; y: number; point: SentimentAnalysis["series"][number] } | null>(null);
  const points = sentiment.series.slice(-40);
  const reddit = points.map((p, i) => `${points.length <= 1 ? 0 : i / (points.length - 1) * 100},${100 - p.reddit}`).join(" ");
  const news = points.map((p, i) => `${points.length <= 1 ? 0 : i / (points.length - 1) * 100},${100 - p.news}`).join(" ");
  return (
    <section className="relative rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-300">커뮤니티 vs 뉴스</p>
      <svg className="mt-4 h-64 w-full rounded-lg border border-white/[0.06] bg-black/20 p-2" viewBox="0 0 100 100" preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <polyline points={reddit} fill="none" stroke="#22d3ee" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        <polyline points={news} fill="none" stroke="#f0abfc" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => {
          const x = points.length <= 1 ? 0 : i / (points.length - 1) * 100;
          return <rect key={`${p.index}-${p.label}`} x={Math.max(0, x - 1.2)} y="0" width="2.4" height="100" fill="transparent" onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, point: p })} onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, point: p })} />;
        })}
      </svg>
      {hover ? <SentimentTooltip x={hover.x} y={hover.y} lines={[
        `날짜: ${hover.point.label}`,
        `커뮤니티: ${hover.point.reddit.toFixed(1)}`,
        `뉴스: ${hover.point.news.toFixed(1)}`,
        `괴리: ${Math.abs(hover.point.reddit - hover.point.news).toFixed(1)}`,
        `우위: ${hover.point.reddit > hover.point.news + 15 ? "커뮤니티" : hover.point.news > hover.point.reddit + 15 ? "뉴스" : "균형"}`,
        `의미: ${Math.abs(hover.point.reddit - hover.point.news) <= 15 ? "큰 괴리 없이 움직입니다." : "내러티브 확인이 필요합니다."}`,
      ]} /> : null}
      <div className="mt-3 flex gap-4 text-xs font-bold">
        <span className="text-cyan">커뮤니티</span>
        <span className="text-fuchsia-300">뉴스</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{sentiment.explanation.communityNewsCommentary}</p>
    </section>
  );
}

function SentimentTooltip({ x, y, lines }: { x: number; y: number; lines: string[] }) {
  return (
    <div className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-fuchsia-300/25 bg-slate-950/95 p-3 text-[11px] leading-5 text-slate-200 shadow-[0_0_30px_rgba(217,70,239,0.22)] backdrop-blur" style={{ left: Math.min(x + 14, window.innerWidth - 300), top: Math.max(12, y - 18) }}>
      {lines.map((line) => <div key={line}>{line}</div>)}
    </div>
  );
}

function SentimentRiskRadar({ sentiment }: { sentiment: SentimentAnalysis }) {
  const metrics = [
    { label: "FOMO", value: sentiment.score >= 70 ? Math.min(100, sentiment.hypeStrength * 45) : 20 },
    { label: "패닉", value: sentiment.score <= 35 ? 100 - sentiment.score : 20 },
    { label: "과밀", value: sentiment.crowdPressure },
    { label: "변동성", value: Math.min(100, sentiment.sentimentVolatility * 4) },
    { label: "미디어", value: sentiment.mediaPressure },
  ];
  const points = metrics.map((m, i) => {
    const angle = -Math.PI / 2 + i * (Math.PI * 2 / metrics.length);
    const r = 8 + m.value * 0.38;
    return `${50 + Math.cos(angle) * r},${50 + Math.sin(angle) * r}`;
  }).join(" ");
  return (
    <svg className="mt-4 h-80 w-full" viewBox="0 0 100 100">
      {[20, 35, 50].map((r) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(148,163,184,0.12)" />)}
      <polygon points={points} fill="rgba(217,70,239,0.18)" stroke="#d946ef" strokeWidth="0.8" />
      {metrics.map((m, i) => {
        const angle = -Math.PI / 2 + i * (Math.PI * 2 / metrics.length);
        return <text key={m.label} x={50 + Math.cos(angle) * 46} y={53 + Math.sin(angle) * 46} fill="#CBD5E1" fontSize="4" textAnchor="middle">{m.label}</text>;
      })}
    </svg>
  );
}

function NewsEventWorkspace({ news }: { news: NewsEventAnalysis }) {
  const [tab, setTab] = useState<"overview" | "analysis" | "risk" | "interpretation">("overview");
  const tabs = [
    { id: "overview" as const, title: "Narrative Overview", ko: "무슨 일이 일어나는가" },
    { id: "analysis" as const, title: "Signal Analysis", ko: "왜 반응하는가" },
    { id: "risk" as const, title: "Hidden Risks", ko: "숨은 불안정성" },
    { id: "interpretation" as const, title: "AI Interpretation", ko: "최종 해석" },
  ];
  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-cyan/15 bg-slate-950/70 p-1.5 shadow-[0_0_42px_rgba(34,211,238,0.12)] backdrop-blur">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-5 py-2.5 text-left transition duration-200 ${tab === item.id ? "bg-cyan/15 text-white ring-1 ring-cyan/35" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"}`}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.2em]">{item.title}</span>
              <span className="mt-1 block text-[10px] font-bold">{item.ko}</span>
            </button>
          ))}
        </div>
      </div>
      {tab === "overview" ? <NewsOverviewTab news={news} /> : null}
      {tab === "analysis" ? <NewsSignalAnalysisTab news={news} /> : null}
      {tab === "risk" ? <NewsRiskTab news={news} /> : null}
      {tab === "interpretation" ? <NewsInterpretationTab news={news} /> : null}
    </section>
  );
}

function NewsOverviewTab({ news }: { news: NewsEventAnalysis }) {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-cyan/20 bg-[linear-gradient(135deg,rgba(2,6,23,0.98),rgba(12,18,32,0.95)_45%,rgba(49,46,129,0.36))] p-5 shadow-[0_34px_130px_rgba(0,0,0,0.58),0_0_70px_rgba(34,211,238,0.12)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/70 to-transparent" />
        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan">NARRATIVE OVERVIEW</p>
            <h2 className="mt-3 text-3xl font-black text-white">{news.dominantNarrativeKo}</h2>
            <p className="mt-4 text-base leading-8 text-slate-200">{news.aiSummaryKo}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <MiniBadge tone="good">{news.eventRegimeKo}</MiniBadge>
              <MiniBadge tone="muted">{news.compositeModeKo}</MiniBadge>
              <MiniBadge tone={news.pressureScore >= 65 ? "warn" : "good"}>이벤트 압력 {news.pressureScore}</MiniBadge>
              <MiniBadge tone={news.engagementHeat >= 1.25 ? "warn" : "muted"}>참여 열기 {news.engagementHeat.toFixed(2)}x</MiniBadge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <NewsMetricCard label="Event Pressure" value={`${news.pressureScore}`} detail="내러티브 밀도, 참여도, 반응, 신규성을 연결" tone={news.pressureScore >= 65 ? "warn" : "good"} />
            <NewsMetricCard label="Regime Stability" value={`${news.regimeStability}`} detail="확인 신호와 충돌 신호의 균형" tone={news.regimeStability >= 60 ? "good" : "warn"} />
          </div>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <NewsNarrativePressureMap news={news} />
        <NewsPropagationFlow news={news} />
      </div>
    </div>
  );
}

function NewsSignalAnalysisTab({ news }: { news: NewsEventAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AnalysisPanelShell title="NARRATIVE CHAIN" tags={["EVENT → REACTION → PROPAGATION"]}>
          <div className="space-y-3">
            {news.narrativeChainKo.map((step, index) => (
              <div key={`${step}-${index}`} className="group flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 transition hover:-translate-y-0.5 hover:border-cyan/35 hover:bg-cyan/[0.06]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan/35 bg-cyan/10 text-xs font-black text-cyan">{index + 1}</div>
                <p className="text-sm leading-6 text-slate-200">{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-300">헤드라인을 개별 행으로 보지 않고 이벤트가 반응, 증폭, 레짐 전환 압력으로 이어지는 순서를 재구성합니다.</p>
        </AnalysisPanelShell>
        <AnalysisPanelShell title="CROSS-SIGNAL RELATIONSHIP" tags={["CONFIRMATION", "CONFLICT"]}>
          <div className="space-y-3">
            {(news.relationshipsKo.length ? news.relationshipsKo : ["헤드라인, 영향도, 시간, 참여도, 시장 반응의 관계를 기준으로 이벤트 구조를 해석합니다."]).map((text) => (
              <div key={text} className="rounded-lg border border-cyan/15 bg-cyan/[0.045] p-3 text-sm leading-6 text-slate-200 transition hover:border-cyan/35">{text}</div>
            ))}
            {news.confirmationsKo.map((text) => <div key={text} className="rounded-lg border border-mint/20 bg-mint/[0.045] p-3 text-sm leading-6 text-slate-200">{text}</div>)}
            {news.conflictsKo.map((text) => <div key={text} className="rounded-lg border border-amber-300/20 bg-amber-300/[0.055] p-3 text-sm leading-6 text-slate-200">{text}</div>)}
          </div>
        </AnalysisPanelShell>
      </div>
      <AnalysisPanelShell title="EVENT CORRELATION MATRIX" tags={["AMPLIFICATION", "DIVERGENCE", "DELAYED REACTION"]}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {news.correlationMatrix.map((item) => (
            <div key={item.pairKo} className="rounded-lg border border-white/10 bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-cyan/30">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{item.pairKo}</p>
              <p className={`mt-2 text-2xl font-black ${item.value > 0.3 ? "text-mint" : item.value < -0.25 ? "text-rose" : "text-cyan"}`}>{item.value.toFixed(2)}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">신뢰도 {item.confidenceKo}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{item.interpretationKo}</p>
            </div>
          ))}
        </div>
      </AnalysisPanelShell>
    </div>
  );
}

function NewsRiskTab({ news }: { news: NewsEventAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <NewsMetricCard label="Noise Ratio" value={`${news.noiseRatio}`} detail="반복 내러티브와 결측 보정이 만든 잡음" tone={news.noiseRatio >= 45 ? "warn" : "good"} />
        <NewsMetricCard label="Signal Strength" value={`${news.signalStrength}`} detail="압력, 참여도, 변동성 반응의 결합 강도" tone={news.signalStrength >= 60 ? "warn" : "muted"} />
        <NewsMetricCard label="Data Quality" value={`${news.dataQualityScore}`} detail="컬럼 인식, 길이, 구조 다양성 기반" tone={news.dataQualityScore >= 65 ? "good" : "warn"} />
        <NewsMetricCard label="Reliability" value={`${news.narrativeReliability}`} detail="확인 신호와 반복 피로를 함께 반영" tone={news.narrativeReliability >= 60 ? "good" : "warn"} />
      </div>
      <AnalysisPanelShell title="STRUCTURAL STRESS WARNINGS" tags={["PANIC", "SATURATION", "OVERHEATING"]}>
        <div className="grid gap-3 md:grid-cols-2">
          {news.risksKo.map((risk) => (
            <div key={risk.label} className="rounded-lg border border-white/10 bg-slate-950/55 p-4 transition hover:border-amber-300/35">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-black text-white">{risk.label}</p>
                <MiniBadge tone={risk.severity === "HIGH" ? "bad" : risk.severity === "MEDIUM" ? "warn" : "good"}>{risk.severity}</MiniBadge>
              </div>
              <p className="text-sm leading-6 text-slate-300">{risk.description}</p>
            </div>
          ))}
        </div>
      </AnalysisPanelShell>
      {news.degradationKo.length ? (
        <AnalysisPanelShell title="QUALITY WARNINGS" tags={["GRACEFUL DEGRADATION"]}>
          <div className="grid gap-3 md:grid-cols-2">
            {news.degradationKo.map((warning) => <p key={warning} className="rounded-lg border border-amber-300/20 bg-amber-300/[0.045] p-3 text-sm leading-6 text-slate-200">{warning}</p>)}
          </div>
        </AnalysisPanelShell>
      ) : null}
    </div>
  );
}

function NewsInterpretationTab({ news }: { news: NewsEventAnalysis }) {
  const topEvents = [...news.events].sort((a, b) => b.pressure - a.pressure).slice(0, 5);
  return (
    <div className="space-y-5">
      <AnalysisPanelShell title="AI FINAL INTERPRETATION" tags={["INSTITUTIONAL NARRATIVE DESK", news.eventRegimeKo]}>
        <p className="text-base leading-8 text-slate-200">{news.aiSummaryKo}</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <InterpretationBlock label="Bull Case" text={news.scenarioKo.bull} />
          <InterpretationBlock label="Base Case" text={news.scenarioKo.base} />
          <InterpretationBlock label="Bear Case" text={news.scenarioKo.bear} />
        </div>
      </AnalysisPanelShell>
      <AnalysisPanelShell title="TOP EVENT PRESSURE" tags={["HEADLINE SHOCK", "MARKET NARRATIVE"]}>
        <div className="space-y-3">
          {topEvents.map((event) => (
            <div key={`${event.index}-${event.headline}`} className="grid gap-3 rounded-lg border border-white/10 bg-slate-950/55 p-4 transition hover:border-cyan/30 hover:bg-cyan/[0.04] md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-bold text-slate-500">{event.publishedAt} · {event.category}{event.ticker ? ` · ${event.ticker}` : ""}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-white">{event.headline}</p>
                <p className="mt-2 text-xs text-slate-500">신규성 {event.novelty.toFixed(0)} · 반복 감쇠 {event.repetitionPenalty.toFixed(0)}</p>
              </div>
              <div className="min-w-32 text-right">
                <p className="text-2xl font-black text-cyan">{Math.round(event.pressure)}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">pressure</p>
              </div>
            </div>
          ))}
        </div>
      </AnalysisPanelShell>
    </div>
  );
}

function NewsNarrativePressureMap({ news }: { news: NewsEventAnalysis }) {
  return (
    <AnalysisPanelShell title="NARRATIVE PRESSURE MAP" tags={["CLUSTERS", "DIVERSITY"]}>
      <div className="space-y-3">
        {news.narrativeClusters.map((item) => (
          <div key={item.nameKo} className="rounded-lg border border-white/10 bg-slate-950/50 p-3 transition hover:border-cyan/35 hover:bg-cyan/[0.04]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-black text-white">{item.nameKo}</span>
              <span className="text-xs font-bold text-slate-400">{item.share}% · {item.count}건 · 압력 {item.pressure}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan via-blue-400 to-fuchsia-400" style={{ width: `${Math.max(6, item.share)}%` }} />
            </div>
            {item.keywords.length ? <p className="mt-2 text-[11px] text-slate-500">키워드: {item.keywords.join(", ")}</p> : null}
            <p className="mt-2 text-xs leading-5 text-slate-400">{item.whyKo}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300">카테고리가 없어도 헤드라인 의미를 분류해 Macro, ETF, AI, Crypto, Risk-Off 같은 실제 내러티브 다양성을 복원합니다.</p>
    </AnalysisPanelShell>
  );
}

function NewsPropagationFlow({ news }: { news: NewsEventAnalysis }) {
  return (
    <AnalysisPanelShell title="REAL-TIME SIGNAL FLOW" tags={["PRESSURE → REGIME"]}>
      <div className="space-y-3">
        {news.propagationFlowKo.map((step, index) => (
          <div key={`${step}-${index}`} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 transition hover:border-mint/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-mint/30 bg-mint/10 text-xs font-black text-mint">{index + 1}</div>
            <p className="text-sm font-bold text-slate-200">{step}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300">이 플로우는 이벤트가 반응, 증폭, 전파, 레짐 변화로 이동하는 경로를 요약합니다.</p>
    </AnalysisPanelShell>
  );
}

function NewsMetricCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: Tone }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-0.5 hover:border-cyan/30 hover:bg-white/[0.065]">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${tone === "good" ? "text-mint" : tone === "warn" ? "text-amber" : tone === "bad" ? "text-rose" : "text-cyan"}`}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  );
}

function OnchainWorkspace({ onchain }: { onchain: OnchainAnalysis }) {
  const [page, setPage] = useState<"structure" | "layers">("structure");
  return (
    <section className="space-y-5">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-emerald-300/15 bg-slate-950/70 p-1.5 shadow-[0_0_42px_rgba(52,211,153,0.12)] backdrop-blur">
          {[
            { id: "structure" as const, title: "시장 구조", sub: "Market Intelligence" },
            { id: "layers" as const, title: "온체인 레이어", sub: "Signal Decomposition" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPage(tab.id)}
              className={`rounded-full px-5 py-2.5 text-left transition duration-200 ${
                page === tab.id
                  ? "bg-emerald-300/15 text-white shadow-[0_0_28px_rgba(52,211,153,0.18)]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-emerald-300"
              }`}
            >
              <div className="text-xs font-black">{tab.title}</div>
              <div className={`mt-0.5 text-[8px] font-black tracking-[0.16em] ${page === tab.id ? "text-emerald-300/80" : "text-slate-500"}`}>{tab.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {page === "structure" ? <OnchainMarketStructurePage onchain={onchain} /> : <OnchainLayersPage onchain={onchain} />}
    </section>
  );
}

function OnchainMarketStructurePage({ onchain }: { onchain: OnchainAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-300/20 bg-slate-950/75 p-6 shadow-[0_0_55px_rgba(52,211,153,0.1)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">온체인 시장 구조</p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <PortfolioMetricCard label="지배 세력" value={onchain.dominantForceKo} detail={onchain.regimeKo} />
          <PortfolioMetricCard label="구조적 편향" value={onchain.structuralBiasKo} detail={onchain.smartMoneyStateKo} />
          <PortfolioMetricCard label="구조 안정성" value={onchain.structuralStabilityKo} detail={onchain.confidenceReasonKo.slice(0, 24)} />
          <PortfolioMetricCard label="숨은 위험" value={onchain.riskLevelKo} detail={onchain.hiddenRiskKo.slice(0, 24)} />
          <PortfolioMetricCard label="위험" value={onchain.riskLevelKo} detail={`신뢰도 ${onchain.confidence}`} />
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-200">{onchain.narrativeKo}</p>
      </div>

      <OnchainStructureSummary onchain={onchain} />
      <OnchainTransitionMap onchain={onchain} />
      <OnchainConflictCards onchain={onchain} />
      <section className="rounded-xl border border-white/10 bg-slate-950/65 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">AI 최종 해석</p>
        <div className="mt-4 space-y-3">
          {onchain.insightsKo.slice(0, 3).map((item) => (
            <div key={item} className="rounded-lg border border-emerald-300/10 bg-emerald-300/[0.04] p-3 text-sm leading-6 text-slate-200">{item}</div>
          ))}
        </div>
      </section>
    </div>
  );
}

function OnchainLayersPage({ onchain }: { onchain: OnchainAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-300/15 bg-slate-950/70 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">온체인 레이어 분해</p>
        <h2 className="mt-2 text-2xl font-black text-white">왜 이 시장 구조가 형성되었는가</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">{onchain.scoreReasonKo}</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <OnchainPressureMeters onchain={onchain} />
        <OnchainHeatmap onchain={onchain} />
      </div>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">레이어별 신호 융합</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {onchain.layerScores.map((layer) => (
            <div key={layer.layer} className="rounded-lg border border-white/[0.06] bg-black/20 p-3 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.035]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-white">{layer.layer}</span>
                <span className="text-xs font-black text-emerald-300">{layer.score}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-gradient-to-r from-cyan to-emerald-300" style={{ width: `${layer.score}%` }} />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{layer.interpretationKo}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-white/10 bg-slate-950/65 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">상세 인사이트 / 위험 경고</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {onchain.insightsKo.map((item) => (
            <div key={item} className="rounded-lg border border-emerald-300/10 bg-emerald-300/[0.04] p-3 text-sm leading-6 text-slate-200">{item}</div>
          ))}
        </div>
        {onchain.warningsKo.length ? <TerminalList title="위험 경고" items={onchain.warningsKo} /> : null}
      </section>
    </div>
  );
}

function OnchainStructureSummary({ onchain }: { onchain: OnchainAnalysis }) {
  const items = [
    ["구조적 편향", onchain.structuralBiasKo],
    ["스마트머니", onchain.smartMoneyStateKo],
    ["유동성 조건", onchain.liquidityConditionKo],
    ["네트워크 참여", onchain.networkParticipationKo],
    ["투기 조건", onchain.speculativeConditionKo],
    ["구조 안정성", onchain.structuralStabilityKo],
  ];
  return (
    <section className="rounded-xl border border-emerald-300/15 bg-slate-950/65 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">시장 구조 요약</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[9px] font-black text-slate-500">{label}</p>
            <p className="mt-2 text-sm font-black text-white">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300">{onchain.causalSummaryKo}</p>
      <p className="mt-2 text-xs leading-6 text-slate-500">{onchain.confidenceReasonKo}</p>
    </section>
  );
}

function OnchainTransitionMap({ onchain }: { onchain: OnchainAnalysis }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">압력 전이 맵</p>
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        {onchain.transitionFlow.map((node, index) => (
          <div key={`${node}-${index}`} className="flex flex-1 items-center gap-3">
            <div className="min-h-20 flex-1 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4 transition hover:-translate-y-1 hover:border-emerald-300/35">
              <p className="text-[10px] font-black text-emerald-300">STEP {index + 1}</p>
              <p className="mt-2 text-sm font-black text-white">{node}</p>
            </div>
            {index < onchain.transitionFlow.length - 1 ? <span className="hidden text-2xl font-black text-emerald-300 lg:block">→</span> : null}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-6 text-slate-400">{onchain.scoreReasonKo}</p>
    </section>
  );
}

function OnchainConflictCards({ onchain }: { onchain: OnchainAnalysis }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/65 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">구조적 충돌 / 숨은 위험</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {onchain.conflicts.length ? onchain.conflicts.map((conflict) => (
          <div key={conflict.title} className={`rounded-lg border p-4 ${conflict.severity === "HIGH" ? "border-rose-400/25 bg-rose-400/[0.06]" : conflict.severity === "MEDIUM" ? "border-amber-300/20 bg-amber-300/[0.05]" : "border-cyan/15 bg-cyan/[0.035]"}`}>
            <p className="text-sm font-black text-white">{conflict.title}</p>
            <p className="mt-2 text-xs leading-6 text-slate-400">{conflict.descriptionKo}</p>
          </div>
        )) : (
          <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.04] p-4 md:col-span-3">
            <p className="text-sm font-black text-white">뚜렷한 구조적 충돌 제한</p>
            <p className="mt-2 text-xs leading-6 text-slate-400">현재 감지된 온체인 레이어는 큰 충돌 없이 해석됩니다. 다만 추가 데이터가 들어오면 스마트머니와 거래소 흐름의 관계를 계속 재평가합니다.</p>
          </div>
        )}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <PortfolioMetricCard label="축적 확률" value={`${onchain.accumulationProbability}%`} detail="출금·고래 축적·네트워크" />
        <PortfolioMetricCard label="분배 확률" value={`${onchain.distributionProbability}%`} detail="유입·분배·투기 압력" />
      </div>
    </section>
  );
}

function OnchainPressureMeters({ onchain }: { onchain: OnchainAnalysis }) {
  const items = [
    ["매수 압력", onchain.pressure.buyPressure, "from-cyan to-emerald-300"],
    ["매도 압력", onchain.pressure.sellPressure, "from-amber-300 to-rose-400"],
    ["네트워크 강도", onchain.pressure.networkStrength, "from-sky-400 to-cyan"],
    ["투기 압력", onchain.pressure.speculationPressure, "from-fuchsia-400 to-rose-400"],
    ["유동성 상태", onchain.pressure.liquidityState, "from-emerald-300 to-mint"],
  ] as const;
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">압력 미터</p>
      <div className="mt-5 space-y-4">
        {items.map(([label, value, color]) => (
          <div key={label}>
            <div className="flex justify-between text-xs font-black">
              <span className="text-white">{label}</span>
              <span className="text-emerald-300">{value}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OnchainHeatmap({ onchain }: { onchain: OnchainAnalysis }) {
  const color = (tone: OnchainAnalysis["heatmap"][number]["tone"]) =>
    tone === "good" ? "bg-emerald-300/20 border-emerald-300/25 text-emerald-200" :
    tone === "bad" ? "bg-rose-400/15 border-rose-400/25 text-rose-200" :
    tone === "warn" ? "bg-amber-300/15 border-amber-300/25 text-amber-100" :
    "bg-white/[0.04] border-white/[0.08] text-slate-300";
  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/65 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">온체인 압력 히트맵</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {onchain.heatmap.map((cell) => (
          <div key={cell.label} className={`rounded-lg border p-4 transition hover:-translate-y-1 ${color(cell.tone)}`}>
            <p className="text-xs font-black">{cell.label}</p>
            <p className="mt-2 text-3xl font-black">{cell.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">히트맵은 개별 컬럼이 아니라 매수·매도·네트워크·투기·유동성 압력의 결합 상태를 보여줍니다.</p>
    </section>
  );
}

function ValuationWorkspace({
  valuation,
  activeTab,
  setActiveTab,
}: {
  valuation: ValuationAnalysis;
  activeTab: ValuationWorkspaceTab;
  setActiveTab: (tab: ValuationWorkspaceTab) => void;
}) {
  const tabs: Array<{ id: ValuationWorkspaceTab; label: string; ko: string }> = [
    { id: "overview", label: "Valuation Overview", ko: "밸류에이션 개요" },
    { id: "characteristics", label: "Characteristics", ko: "특성 분석" },
    { id: "risk", label: "Risk / Pressure", ko: "위험 압력" },
    { id: "interpretation", label: "AI Interpretation", ko: "AI 해석" },
  ];

  return (
    <section className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-cyan/15 bg-slate-950/70 p-1.5 shadow-[0_0_42px_rgba(34,211,238,0.12)] backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-5 py-2.5 text-left transition duration-200 ${
                activeTab === tab.id
                  ? "bg-cyan/15 text-white shadow-[0_0_28px_rgba(34,211,238,0.18)]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-cyan"
              }`}
            >
              <div className="text-xs font-black">{tab.label}</div>
              <div className={`mt-0.5 text-[8px] font-black tracking-[0.16em] ${activeTab === tab.id ? "text-cyan/80" : "text-slate-500"}`}>{tab.ko}</div>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && <ValuationOverviewTab valuation={valuation} />}
      {activeTab === "characteristics" && <ValuationCharacteristicsTab valuation={valuation} />}
      {activeTab === "risk" && <ValuationRiskTab valuation={valuation} />}
      {activeTab === "interpretation" && <ValuationInterpretationTab valuation={valuation} />}
    </section>
  );
}

function ValuationOverviewTab({ valuation }: { valuation: ValuationAnalysis }) {
  const stateTone = valuation.score.total >= 60 ? "text-emerald-400" : valuation.score.total >= 40 ? "text-cyan" : "text-rose-400";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.75fr)]">
        <div className="space-y-5">
          <ValuationHistoricalBandChart valuation={valuation} />
          <ValuationExpansionTimeline valuation={valuation} />
        </div>

        <aside className="space-y-5">
          <div className="group relative overflow-hidden rounded-xl border border-cyan/15 bg-slate-950/70 p-5 shadow-[0_0_50px_rgba(34,211,238,0.12)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-cyan/40 hover:bg-cyan/[0.035] hover:shadow-[0_0_80px_rgba(34,211,238,0.22)]">
            <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-cyan/10 to-transparent opacity-0 transition duration-700 group-hover:left-full group-hover:opacity-100" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan">실시간 밸류에이션 판독</p>
                <p className={`mt-3 text-6xl font-black ${stateTone}`}>{valuation.score.total}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">레짐</p>
                <p className="mt-1 max-w-[150px] text-lg font-black leading-5 text-white">{koRegime(valuation.regime)}</p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan via-sky-400 to-fuchsia-500 transition-all duration-700 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.75)]" style={{ width: `${valuation.score.total}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MetricPill label="평균회귀" value={`${valuation.meanReversionProbability}%`} />
              <MetricPill label="리레이팅" value={`${valuation.expansion.reratingScore}`} />
              <MetricPill label="압력" value={koExpansion(valuation.expansion.label)} />
            </div>
          </div>

          <ValuationPercentileSpectrum valuation={valuation} />
          <ValuationRegimeTimeline valuation={valuation} />
        </aside>
      </div>

      <div className="group rounded-xl border border-cyan/15 bg-[linear-gradient(135deg,rgba(8,47,73,0.22),rgba(2,6,23,0.74))] p-5 shadow-[0_0_45px_rgba(34,211,238,0.08)] transition duration-300 hover:border-cyan/35 hover:bg-cyan/[0.04] hover:shadow-[0_0_70px_rgba(34,211,238,0.14)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">기관형 밸류에이션 요약</p>
          <div className="flex flex-wrap gap-2">
            <MiniBadge tone={valuation.score.confidence === "HIGH" ? "good" : valuation.score.confidence === "MEDIUM" ? "warn" : "bad"}>신뢰도 {koConfidence(valuation.score.confidence)}</MiniBadge>
            <MiniBadge tone="muted">{koDataMode(valuation.dataTypeLabel)}</MiniBadge>
          </div>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-200">{valuationOverviewNarrative(valuation)}</p>
        <p className="mt-2 text-sm leading-7 text-slate-300">{koExpansionNarrative(valuation)}</p>
      </div>
    </div>
  );
}

const VALUATION_COLUMNS = ["per", "pbr", "peg", "ev_ebitda"] as const satisfies readonly ValuationCanonicalColumn[];
const VALUATION_SCORE_KEY: Record<ValuationCanonicalColumn, keyof ValuationAnalysis["score"]["components"]> = {
  per: "perScore",
  pbr: "pbrScore",
  peg: "pegScore",
  ev_ebitda: "evEbitdaScore",
};

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function valuationZone(percentile: number) {
  const pct = clampPct(percentile);
  if (pct < 20) return { label: "딥 디스카운트", en: "Deep Discount", color: "#22D3EE", glow: "shadow-[0_0_18px_rgba(34,211,238,0.32)]" };
  if (pct < 40) return { label: "가치 구간", en: "Value Zone", color: "#2DD4BF", glow: "shadow-[0_0_18px_rgba(45,212,191,0.26)]" };
  if (pct < 60) return { label: "적정 가치", en: "Fair Value", color: "#38BDF8", glow: "shadow-[0_0_18px_rgba(56,189,248,0.24)]" };
  if (pct < 80) return { label: "프리미엄", en: "Premium Zone", color: "#FB923C", glow: "shadow-[0_0_18px_rgba(251,146,60,0.30)]" };
  return { label: "극단 프리미엄", en: "Extreme Premium", color: "#F43F5E", glow: "shadow-[0_0_22px_rgba(244,63,94,0.45)]" };
}

function valuationMetricReason(valuation: ValuationAnalysis, column: ValuationCanonicalColumn) {
  const feature = valuation.features[column];
  if (!feature) return "해당 멀티플의 검증된 시계열이 부족해 기여도를 산출하지 않았습니다.";
  const zone = valuationZone(feature.historicalPercentile).label;
  const trend = koTrend(feature.trendDirection);
  if (column === "peg" && feature.historicalPercentile >= 70 && feature.trendDirection === "rising") {
    return "성장 프리미엄이 이익 성장의 지지보다 빠르게 가격에 반영되는 구간입니다.";
  }
  if (column === "ev_ebitda" && feature.historicalPercentile <= 35 && feature.trendDirection !== "falling") {
    return "현금창출력 대비 기업가치 부담이 낮아 회복 리레이팅 여지를 제공합니다.";
  }
  if (column === "pbr" && feature.historicalPercentile <= 35 && valuation.risks.some((risk) => risk.id === "value_trap" && risk.detected)) {
    return "자산가치 할인은 존재하지만 수익성 약화가 동반되면 가치 함정으로 해석됩니다.";
  }
  if (feature.historicalPercentile >= 80) return `${zone}에 위치해 멀티플 압축 민감도가 커졌습니다. 최근 방향은 ${trend}입니다.`;
  if (feature.historicalPercentile <= 25) return `${zone}에 위치해 상대 저평가 신호가 있으나 성장과 현금흐름 확인이 필요합니다.`;
  return `${zone}이며 ${trend} 흐름입니다. 단독 신호보다 다른 멀티플과 성장 대체 지표의 확인이 중요합니다.`;
}

function valuationRelationshipFindings(valuation: ValuationAnalysis) {
  const per = valuation.features.per;
  const pbr = valuation.features.pbr;
  const peg = valuation.features.peg;
  const ev = valuation.features.ev_ebitda;
  const growthMomentum = valuation.expansion.growthMomentum;
  const findings: Array<{ label: string; tone: "good" | "warn" | "bad" | "muted"; text: string }> = [];

  if (per && per.historicalPercentile >= 70 && growthMomentum != null && growthMomentum > 0) {
    findings.push({ label: "프리미엄 지지", tone: "good", text: "PER 프리미엄이 높지만 성장 모멘텀이 동반되어 일부 프리미엄은 정당화됩니다." });
  }
  if (per && per.historicalPercentile >= 70 && (growthMomentum == null || growthMomentum < 0)) {
    findings.push({ label: "압축 위험", tone: "bad", text: "PER 프리미엄이 높은데 성장 확인이 약해지면 멀티플 압축 위험이 커집니다." });
  }
  if (ev && ev.historicalPercentile <= 35 && valuation.expansion.compressionScore < 55) {
    findings.push({ label: "딥 밸류", tone: "good", text: "EV/EBITDA가 낮고 압축 압력이 지배적이지 않아 회복 리레이팅 후보로 볼 수 있습니다." });
  }
  if (pbr && pbr.historicalPercentile <= 35 && valuation.risks.some((risk) => risk.id === "value_trap" && risk.detected)) {
    findings.push({ label: "가치 함정", tone: "warn", text: "낮은 PBR은 할인 신호지만 수익성/성장 약화가 결합되면 가치 함정 위험이 우선됩니다." });
  }
  if (peg && peg.historicalPercentile >= 75 && valuation.expansion.growthPremiumAcceleration > 55) {
    findings.push({ label: "투기 프리미엄", tone: "bad", text: "PEG와 성장 프리미엄 가속이 함께 높아 기대가 실적 지지보다 빠르게 확장되는 구간입니다." });
  }
  if (!findings.length) {
    findings.push({ label: "혼합 구간", tone: "muted", text: "프리미엄, 성장, 평균회귀 신호가 한 방향으로 강하게 정렬되지는 않았습니다." });
  }
  return findings;
}

function valuationRegimeEngine(valuation: ValuationAnalysis) {
  const available = valuation.availableColumns.filter((column) => valuation.features[column]);
  const avgPct = available.length
    ? available.reduce((sum, column) => sum + valuation.features[column]!.historicalPercentile, 0) / available.length
    : 50;
  const confirmations = valuationRelationshipFindings(valuation);
  const highPremium = available.filter((column) => valuation.features[column]!.historicalPercentile >= 70).map((column) => VALUATION_INDICATOR_CONFIG[column].label);
  const discounts = available.filter((column) => valuation.features[column]!.historicalPercentile <= 35).map((column) => VALUATION_INDICATOR_CONFIG[column].label);
  const compression = valuation.expansion.label === "COMPRESSION" || valuation.expansion.compressionScore >= 60;
  const speculative = valuation.expansion.label === "SPECULATIVE_EXPANSION" || valuation.expansion.growthPremiumAcceleration >= 70;

  let regime = "Fair Value";
  let expected = "현재 밸류에이션 밴드 근처에서 성장과 할인율 확인을 기다리는 구간입니다.";
  if (compression && avgPct >= 60) {
    regime = valuation.expansion.multipleMomentum < -3 ? "Multiple Reset" : "Compression Risk";
    expected = "성장 기대가 약해지거나 할인율 부담이 커지면 멀티플 압축이 이어질 수 있습니다.";
  } else if (speculative && avgPct >= 65) {
    regime = "Speculative Expansion";
    expected = "프리미엄 확장이 실적 확인보다 빠르면 변동성 높은 리레이팅이 나타날 수 있습니다.";
  } else if (avgPct >= 60 && valuation.expansion.reratingScore >= 55) {
    regime = "Growth Premium Expansion";
    expected = "성장 기대가 유지되는 동안 프리미엄 레짐은 지속될 수 있지만 실적 둔화에 민감합니다.";
  } else if (avgPct <= 25 && valuation.expansion.reratingScore >= 45) {
    regime = "Value Recovery";
    expected = "압축된 멀티플이 정상화되면 회복 리프라이싱 여지가 있습니다.";
  } else if (avgPct <= 25) {
    regime = "Deep Discount";
    expected = "가격은 싸지만 성장과 현금흐름 확인 전까지 할인 해소는 제한될 수 있습니다.";
  } else if (avgPct >= 55 && valuation.score.total >= 60) {
    regime = "Quality Premium";
    expected = "프리미엄은 품질/성장 신뢰가 유지될 때 방어되며, 기대 훼손 시 압축됩니다.";
  }

  return {
    regime,
    dominantDriver: highPremium[0] ? `${highPremium[0]} 프리미엄` : discounts[0] ? `${discounts[0]} 할인` : koExpansion(valuation.expansion.label),
    confirming: confirmations.slice(0, 3).map((item) => item.text),
    opposing: valuation.risks.filter((risk) => risk.detected).slice(0, 2).map((risk) => koRiskDescription(risk.description)),
    historicalSimilarity: `${Math.round(avgPct)}번째 백분위 기반 ${valuationZone(avgPct).label}`,
    expected,
  };
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.035] p-2 transition duration-200 hover:-translate-y-0.5 hover:border-cyan/25 hover:bg-cyan/[0.06] hover:shadow-[0_0_18px_rgba(34,211,238,0.16)]">
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
    </div>
  );
}

function ValuationHistoricalBandChart({ valuation }: { valuation: ValuationAnalysis }) {
  const columns = (["per", "pbr", "peg", "ev_ebitda"] as ValuationCanonicalColumn[]).filter((column) => valuation.features[column]);
  const [activeColumn, setActiveColumn] = useState<ValuationCanonicalColumn>((columns[0] ?? "per") as ValuationCanonicalColumn);
  const primary = columns.includes(activeColumn) ? activeColumn : columns[0] ?? "per";
  const feature = valuation.features[primary];
  const points = (valuation.series[primary] ?? []).slice(-90);
  const values = points.map((point) => point.value).filter(Number.isFinite);
  const minBand = Math.min(feature?.lowerBand ?? 0, values.length ? Math.min(...values) : 0);
  const maxBand = Math.max(feature?.upperBand ?? 1, values.length ? Math.max(...values) : 1);
  const range = Math.max(maxBand - minBand, 1e-9);
  const y = (value: number) => 100 - ((value - minBand) / range) * 100;
  const polyline = values.map((value, index) => `${values.length <= 1 ? 0 : (index / (values.length - 1)) * 100},${y(value)}`).join(" ");
  const medianY = feature?.historicalMedian == null ? 50 : y(feature.historicalMedian);
  const upperY = feature?.upperBand == null ? 25 : y(feature.upperBand);
  const lowerY = feature?.lowerBand == null ? 75 : y(feature.lowerBand);
  const latest = values.at(-1);

  return (
    <section className="group relative overflow-hidden rounded-xl border border-cyan/15 bg-slate-950/70 p-5 shadow-[0_0_60px_rgba(14,165,233,0.10)] transition duration-300 hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[0_0_95px_rgba(14,165,233,0.20)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12),transparent_30%),radial-gradient(circle_at_20%_70%,rgba(34,211,238,0.12),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 -translate-x-full bg-gradient-to-r from-transparent via-cyan/10 to-transparent transition duration-700 group-hover:translate-x-[980px]" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan">역사적 밸류에이션 밴드</p>
          <h3 className="mt-2 text-2xl font-black text-white">{VALUATION_INDICATOR_CONFIG[primary].label} 상대 밴드</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {columns.map((column) => (
            <button
              key={column}
              type="button"
              onClick={() => setActiveColumn(column)}
              className={`rounded-full border px-2.5 py-1 text-[9px] font-black transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgba(34,211,238,0.18)] ${column === primary ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-cyan/25 hover:text-cyan"}`}
            >
              {VALUATION_INDICATOR_CONFIG[column].label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-5 h-[360px] rounded-lg border border-white/[0.06] bg-black/25 p-4 transition duration-300 group-hover:border-cyan/20 group-hover:bg-cyan/[0.025]">
        <div className="absolute inset-x-4 top-4 h-[32%] rounded-t-lg bg-gradient-to-b from-rose-500/18 to-fuchsia-500/5" />
        <div className="absolute inset-x-4 top-[38%] h-[26%] bg-sky-500/8" />
        <div className="absolute inset-x-4 bottom-4 h-[32%] rounded-b-lg bg-gradient-to-t from-cyan/20 to-cyan/5" />
        {feature ? (
          <svg className="relative h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="0" x2="100" y1={upperY} y2={upperY} stroke="rgba(244,63,94,0.65)" strokeDasharray="2 2" strokeWidth="0.45" />
            <line x1="0" x2="100" y1={medianY} y2={medianY} stroke="rgba(56,189,248,0.7)" strokeDasharray="3 2" strokeWidth="0.45" />
            <line x1="0" x2="100" y1={lowerY} y2={lowerY} stroke="rgba(34,211,238,0.6)" strokeDasharray="2 2" strokeWidth="0.45" />
            {polyline ? <polyline className="transition duration-300 group-hover:opacity-100" points={polyline} fill="none" stroke={VALUATION_INDICATOR_CONFIG[primary].color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" filter="drop-shadow(0 0 6px rgba(34,211,238,0.65))" /> : null}
            {latest != null ? <circle className="transition duration-300 group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.95)]" cx="100" cy={y(latest)} r="1.8" fill="#fff" stroke={VALUATION_INDICATOR_CONFIG[primary].color} strokeWidth="0.8" vectorEffect="non-scaling-stroke" /> : null}
          </svg>
        ) : (
          <div className="relative flex h-full items-center justify-center text-sm font-bold text-slate-500">밸류에이션 시계열이 감지되지 않았습니다</div>
        )}
        <div className="absolute right-5 top-6 text-right text-[10px] font-black uppercase tracking-[0.14em] text-rose-300">고평가 밴드</div>
        <div className="absolute right-5 top-1/2 text-right text-[10px] font-black uppercase tracking-[0.14em] text-sky-300">중앙값 / 적정 구간</div>
        <div className="absolute right-5 bottom-6 text-right text-[10px] font-black uppercase tracking-[0.14em] text-cyan">저평가 밴드</div>
      </div>

      <div className="relative mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <ValuationBandMiniMap
            key={column}
            valuation={valuation}
            column={column}
            active={column === primary}
            onSelect={() => setActiveColumn(column)}
          />
        ))}
        {!columns.length ? <FallbackNotice text="검증된 밸류에이션 시계열이 부족해 밴드 미니맵을 숨겼습니다." /> : null}
      </div>
    </section>
  );
}

function ValuationBandMiniMap({
  valuation,
  column,
  active,
  onSelect,
}: {
  valuation: ValuationAnalysis;
  column: ValuationCanonicalColumn;
  active: boolean;
  onSelect: () => void;
}) {
  const cfg = VALUATION_INDICATOR_CONFIG[column];
  const feature = valuation.features[column];
  const values = (valuation.series[column] ?? []).slice(-42).map((point) => point.value).filter(Number.isFinite);
  const min = values.length ? Math.min(...values, feature?.lowerBand ?? values[0]) : 0;
  const max = values.length ? Math.max(...values, feature?.upperBand ?? values[0]) : 1;
  const range = Math.max(max - min, 1e-9);
  const y = (value: number) => 32 - ((value - min) / range) * 32;
  const points = values.map((value, index) => `${values.length <= 1 ? 0 : (index / (values.length - 1)) * 100},${y(value)}`).join(" ");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group/minimap rounded-lg border p-3 text-left transition duration-200 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(34,211,238,0.16)] ${
        active ? "border-cyan/35 bg-cyan/[0.07]" : "border-white/[0.07] bg-white/[0.025] hover:border-cyan/20 hover:bg-cyan/[0.035]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black" style={{ color: cfg.color }}>{cfg.label}</p>
        <p className="text-[9px] font-black text-slate-500">{feature ? `${feature.percentiles.fullHistory.toFixed(0)}th` : "없음"}</p>
      </div>
      <div className="mt-2 h-10 rounded-md bg-black/25 px-1 py-1">
        {values.length ? (
          <svg className="h-full w-full overflow-visible" viewBox="0 0 100 32" preserveAspectRatio="none">
            <rect x="0" y="0" width="100" height="10" fill="rgba(244,63,94,0.10)" />
            <rect x="0" y="11" width="100" height="10" fill="rgba(56,189,248,0.07)" />
            <rect x="0" y="22" width="100" height="10" fill="rgba(34,211,238,0.12)" />
            <polyline points={points} fill="none" stroke={cfg.color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" filter="drop-shadow(0 0 4px rgba(34,211,238,0.55))" />
            <circle cx="100" cy={y(values.at(-1)!)} r="1.4" fill="#fff" stroke={cfg.color} strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] font-bold text-slate-600">데이터 없음</div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-slate-500">
        <span>저평가</span>
        <span className={active ? "text-cyan" : "text-slate-400"}>{feature?.displayValue ?? "-"}</span>
        <span>고평가</span>
      </div>
    </button>
  );
}

function ValuationExpansionTimeline({ valuation }: { valuation: ValuationAnalysis }) {
  const columns = (["per", "peg", "ev_ebitda"] as ValuationCanonicalColumn[]).filter((column) => valuation.series[column]?.length);
  const allValues = columns.flatMap((column) => (valuation.series[column] ?? []).slice(-70).map((point) => point.value));
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 1;
  const range = Math.max(max - min, 1e-9);
  const line = (column: ValuationCanonicalColumn) => {
    const values = (valuation.series[column] ?? []).slice(-70).map((point) => point.value);
    return values.map((value, index) => `${values.length <= 1 ? 0 : (index / (values.length - 1)) * 100},${100 - ((value - min) / range) * 100}`).join(" ");
  };
  const markers = [
    { label: "ACCELERATION", active: valuation.expansion.multipleMomentum > 3 },
    { label: "RERATING", active: valuation.expansion.reratingScore > 55 },
    { label: "SPECULATIVE", active: valuation.expansion.label === "SPECULATIVE_EXPANSION" },
    { label: "COMPRESSION", active: valuation.expansion.label === "COMPRESSION" },
  ];
  const activeMarkers = markers.filter((marker) => marker.active);
  const regime = valuationRegimeEngine(valuation);

  return (
    <section className="group rounded-xl border border-white/10 bg-slate-950/65 p-5 shadow-[0_0_55px_rgba(168,85,247,0.08)] transition duration-300 hover:-translate-y-1 hover:border-fuchsia-400/30 hover:bg-fuchsia-400/[0.025] hover:shadow-[0_0_80px_rgba(168,85,247,0.16)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan">동적 밸류에이션 레짐 엔진</p>
          <h3 className="mt-2 text-xl font-black text-white">{koRegime(regime.regime)}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeMarkers.map((marker) => (
            <span key={marker.label} className="rounded-full border border-fuchsia-400/35 bg-fuchsia-400/12 px-2.5 py-1 text-[9px] font-black text-fuchsia-200 shadow-[0_0_16px_rgba(217,70,239,0.18)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(217,70,239,0.28)]">{koMarker(marker.label)}</span>
          ))}
          {!activeMarkers.length ? <span className="rounded-full border border-white/10 bg-white/[0.025] px-2.5 py-1 text-[9px] font-black text-slate-400">확정 트리거 부족</span> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-cyan/15 bg-cyan/[0.04] p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan">지배 동인</p>
          <p className="mt-2 text-lg font-black text-white">{regime.dominantDriver}</p>
          <p className="mt-2 text-xs leading-6 text-slate-300">역사적 유사도: {regime.historicalSimilarity}</p>
          <p className="mt-1 text-xs leading-6 text-slate-400">{regime.expected}</p>
        </div>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">확인 / 반대 신호</p>
          <div className="mt-2 space-y-1.5 text-xs leading-5 text-slate-300">
            {regime.confirming.map((item) => <p key={item}>+ {item}</p>)}
            {regime.opposing.map((item) => <p key={item} className="text-amber-200">- {item}</p>)}
            {!regime.opposing.length ? <p className="text-slate-500">주요 반대 신호는 제한적입니다.</p> : null}
          </div>
        </div>
      </div>
      <div className="mt-5 h-64 rounded-lg border border-white/[0.06] bg-black/25 p-4 transition duration-300 group-hover:border-fuchsia-400/20 group-hover:bg-fuchsia-400/[0.02]">
        {columns.length ? (
          <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[25, 50, 75].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(148,163,184,0.12)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />)}
            {columns.map((column) => (
              <polyline key={column} points={line(column)} fill="none" stroke={VALUATION_INDICATOR_CONFIG[column].color} strokeWidth="1.15" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" filter="drop-shadow(0 0 5px rgba(56,189,248,0.45))" />
            ))}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">확장/압축 시계열이 부족합니다</div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {columns.map((column) => <span key={column} style={{ color: VALUATION_INDICATOR_CONFIG[column].color }}>{VALUATION_INDICATOR_CONFIG[column].label}</span>)}
      </div>
    </section>
  );
}

function ValuationPercentileSpectrum({ valuation }: { valuation: ValuationAnalysis }) {
  const avgPercentile = valuation.availableColumns.length
    ? Math.round(valuation.availableColumns.reduce((sum, column) => sum + (valuation.features[column]?.historicalPercentile ?? 50), 0) / valuation.availableColumns.length)
    : 50;
  const avgZone = valuationZone(avgPercentile);
  return (
    <section className="group rounded-xl border border-white/10 bg-slate-950/65 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan/35 hover:bg-cyan/[0.025] hover:shadow-[0_0_60px_rgba(34,211,238,0.13)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">밸류에이션 백분위 스펙트럼</p>
        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${avgZone.glow}`} style={{ borderColor: `${avgZone.color}66`, backgroundColor: `${avgZone.color}18`, color: avgZone.color }}>{avgZone.label}</span>
      </div>
      <div className="relative mt-7 h-5 rounded-full bg-gradient-to-r from-cyan via-sky-500 via-orange-400 to-rose-500 shadow-[0_0_18px_rgba(34,211,238,0.22)] transition duration-300 group-hover:shadow-[0_0_30px_rgba(34,211,238,0.36)]">
        <div className="absolute -top-2 h-9 w-1 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.8)] transition-all duration-700 group-hover:scale-y-125" style={{ left: `calc(${avgPercentile}% - 2px)` }} />
        <div className="absolute -bottom-7 text-xs font-black text-white transition-all duration-700" style={{ left: `calc(${avgPercentile}% - 18px)` }}>{avgPercentile}th</div>
      </div>
      <div className="mt-10 grid grid-cols-5 text-[8px] font-black uppercase tracking-[0.08em]">
        <span className="text-cyan">딥 디스카운트</span>
        <span className="text-teal-300">가치 구간</span>
        <span className="text-center text-sky-300">적정</span>
        <span className="text-right text-orange-300">프리미엄</span>
        <span className="text-right text-rose-300">극단</span>
      </div>
      <div className="mt-5 space-y-2">
        {valuation.availableColumns.map((column) => {
          const pct = valuation.features[column]?.historicalPercentile ?? 50;
          const zone = valuationZone(pct);
          const scoreKey = VALUATION_SCORE_KEY[column];
          const contribution = valuation.score.contribution[scoreKey] ?? 0;
          const markerLeft = clampPct(pct);
          const contributionWidth = clampPct(contribution * 3);
          return (
            <div key={column} className="grid grid-cols-[82px_1fr_88px] items-center gap-2 rounded-md px-1 py-1.5 transition duration-200 hover:bg-white/[0.035]">
              <span className="text-[10px] font-black text-slate-300">{VALUATION_INDICATOR_CONFIG[column].label}</span>
              <div className="relative h-3 rounded-full bg-slate-800/90">
                <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${contributionWidth}%`, backgroundColor: "#fff" }} />
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${zone.glow}`}
                  style={{
                    width: `${Math.max(3, pct)}%`,
                    background: `linear-gradient(90deg, ${zone.color}66, ${zone.color})`,
                  }}
                />
                <span className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-white shadow-[0_0_14px_rgba(255,255,255,0.6)] transition-all duration-700" style={{ left: `calc(${markerLeft}% - 8px)` }} />
              </div>
              <span className="text-right text-[9px] font-black text-white">{pct.toFixed(0)}th · 기여 {contribution.toFixed(1)}</span>
            </div>
          );
        })}
        {!valuation.availableColumns.length ? <FallbackNotice text="검증된 밸류에이션 백분위 데이터가 부족합니다." /> : null}
      </div>
    </section>
  );
}

function ValuationRegimeTimeline({ valuation }: { valuation: ValuationAnalysis }) {
  const steps = regimeTimelineSteps(valuation);
  return (
    <section className="group rounded-xl border border-white/10 bg-slate-950/65 p-5 transition duration-300 hover:-translate-y-1 hover:border-fuchsia-400/30 hover:bg-fuchsia-400/[0.025] hover:shadow-[0_0_60px_rgba(168,85,247,0.13)]">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">레짐 타임라인</p>
      <div className="relative mt-6 space-y-4">
        <div className="absolute bottom-4 left-[10px] top-4 w-px bg-gradient-to-b from-cyan via-sky-500 to-fuchsia-500 shadow-[0_0_14px_rgba(34,211,238,0.45)]" />
        {steps.map((step, index) => (
          <div key={`${step.year}-${index}`} className="relative grid grid-cols-[26px_72px_1fr] items-center gap-2 rounded-md py-1 transition duration-200 hover:bg-white/[0.035]">
            <span className={`relative z-10 h-5 w-5 rounded-full border transition duration-300 ${index === steps.length - 1 ? "border-cyan bg-cyan shadow-[0_0_18px_rgba(34,211,238,0.7)] group-hover:scale-125 group-hover:shadow-[0_0_28px_rgba(34,211,238,0.9)]" : "border-white/20 bg-slate-900 hover:border-cyan/40"}`} />
            <span className="text-xs font-black text-slate-400">{step.year}</span>
            <span className={`rounded-md border px-2 py-1 text-[10px] font-black transition duration-200 ${index === steps.length - 1 ? "border-cyan/30 bg-cyan/10 text-cyan shadow-[0_0_16px_rgba(34,211,238,0.12)]" : "border-white/10 bg-white/[0.025] text-slate-300 hover:border-fuchsia-400/20 hover:text-fuchsia-100"}`}>{koRegime(step.regime)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function regimeTimelineSteps(valuation: ValuationAnalysis) {
  const primary = valuation.availableColumns[0];
  const points = primary ? (valuation.series[primary] ?? []) : [];
  if (points.length < 4) {
    return [
      { year: "T-3", regime: "Deep Value" },
      { year: "T-2", regime: "Recovery Repricing" },
      { year: "T-1", regime: valuation.expansion.label === "SPECULATIVE_EXPANSION" ? "Growth Premium" : "Fair Value" },
      { year: "Now", regime: valuation.regime },
    ];
  }
  const chunks = [0.25, 0.5, 0.75, 1].map((ratio) => points.slice(0, Math.max(1, Math.round(points.length * ratio))));
  return chunks.map((chunk, index) => {
    const latest = chunk.at(-1)?.value ?? 0;
    const vals = chunk.map((point) => point.value).filter(Number.isFinite);
    const pct = percentileFromValues(vals, latest);
    const regime = pct < 25 ? "Deep Value" : pct < 45 ? "Recovery Repricing" : pct < 70 ? "Fair Value" : pct < 88 ? "Growth Premium" : "Speculative Expansion";
    const date = chunk.at(-1)?.date ?? `T-${3 - index}`;
    const year = /^\d{4}/.test(date) ? date.slice(0, 4) : index === 3 ? "Now" : `T-${3 - index}`;
    return { year, regime: index === 3 ? valuation.regime : regime };
  });
}

function percentileFromValues(values: number[], value: number) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return 50;
  return (clean.filter((item) => item <= value).length / clean.length) * 100;
}

function koRegime(regime: string) {
  const map: Record<string, string> = {
    "Deep Value": "딥 밸류",
    "Fair Value": "적정 가치",
    "Growth Premium": "성장 프리미엄",
    "Speculative Bubble": "투기적 버블",
    "Distressed": "디스트레스",
    "Recovery Repricing": "회복 리프라이싱",
    "Deep Discount": "딥 디스카운트",
    "Growth Premium Expansion": "성장 프리미엄 확장",
    "Speculative Expansion": "투기적 확장",
    "Compression Risk": "압축 위험",
    "Multiple Reset": "멀티플 리셋",
    "Quality Premium": "퀄리티 프리미엄",
    "Value Recovery": "가치 회복",
  };
  return map[regime] ?? regime;
}

function koExpansion(label: string) {
  const map: Record<string, string> = {
    HEALTHY_EXPANSION: "건전한 멀티플 확장",
    SPECULATIVE_EXPANSION: "투기적 멀티플 확장",
    COMPRESSION: "멀티플 압축",
    VALUE_ROTATION: "가치주 순환 / 리레이팅",
  };
  return map[label] ?? label.replace(/_/g, " ");
}

function koMarker(label: string) {
  const map: Record<string, string> = {
    ACCELERATION: "가속",
    RERATING: "리레이팅",
    SPECULATIVE: "투기적",
    COMPRESSION: "압축",
  };
  return map[label] ?? label;
}

function koConfidence(confidence: string) {
  if (confidence === "HIGH") return "높음";
  if (confidence === "MEDIUM") return "보통";
  return "낮음";
}

function koSeverity(severity: string) {
  if (severity === "HIGH") return "높음";
  if (severity === "MEDIUM") return "보통";
  return "낮음";
}

function koTrend(trend: string) {
  if (trend === "rising") return "상승";
  if (trend === "falling") return "하락";
  return "보합";
}

function koDataMode(label: string) {
  return label
    .replace("MULTI FACTOR", "멀티팩터")
    .replace("SINGLE PER", "PER 단일")
    .replace("SINGLE PBR", "PBR 단일")
    .replace("SINGLE PEG", "PEG 단일")
    .replace("SINGLE EV EBITDA", "EV/EBITDA 단일")
    .replace("SNAPSHOT", "스냅샷")
    .replace("PARTIAL", "부분 데이터")
    .replace("NORMAL", "일반")
    .replace("GROWTH", "성장")
    .replace("DISTRESS", "디스트레스")
    .replace("LIMITED DATA", "제한 데이터");
}

function valuationOverviewNarrative(valuation: ValuationAnalysis) {
  const primary = valuation.availableColumns[0];
  const feature = primary ? valuation.features[primary] : null;
  const primaryLabel = primary ? VALUATION_INDICATOR_CONFIG[primary].label : "주요 멀티플";
  const pct = feature ? `${feature.percentiles.fullHistory.toFixed(0)}번째 백분위` : "제한된 구간";
  return `현재 ${primaryLabel} 기준 밸류에이션은 역사적 ${pct}에 위치하며, 시장은 ${koRegime(valuation.regime)} 레짐을 가격에 반영하고 있습니다. 밸류에이션 점수는 ${valuation.score.total}점이고 평균회귀 가능성은 ${valuation.meanReversionProbability}%로 산출됩니다.`;
}

function koExpansionNarrative(valuation: ValuationAnalysis) {
  const expansion = koExpansion(valuation.expansion.label);
  const pressure =
    valuation.expansion.label === "SPECULATIVE_EXPANSION"
      ? "PEG와 멀티플 상승 속도가 커져 성장 프리미엄 부담과 투기적 리레이팅 압력이 확대되고 있습니다."
      : valuation.expansion.label === "COMPRESSION"
      ? "멀티플이 압축되는 구간으로, 가격보다 이익 또는 성장 기대의 재조정이 더 빠르게 반영되고 있습니다."
      : valuation.expansion.label === "HEALTHY_EXPANSION"
      ? "멀티플 확장이 진행 중이나 현재 데이터상 과열 신호는 제한적입니다."
      : "압축된 밸류에이션에서 회복 리프라이싱 가능성이 관찰됩니다.";
  return `${expansion} 국면입니다. ${pressure} 리레이팅 점수는 ${valuation.expansion.reratingScore}, 압축 압력은 ${valuation.expansion.compressionScore}로 측정됩니다.`;
}

function koRiskLabel(label: string) {
  const map: Record<string, string> = {
    "Value Trap Risk": "가치 함정 위험",
    "Bubble Risk": "버블 위험",
    "Overvaluation Pressure": "고평가 압력",
    "Multiple Compression Risk": "멀티플 압축 위험",
    "Growth Premium Instability": "성장 프리미엄 불안정",
    "Re-Rating Potential": "리레이팅 가능성",
  };
  return map[label] ?? label;
}

function koRiskDescription(text: string) {
  return koValuationSentence(text);
}

function ValuationPressureMatrix({ valuation }: { valuation: ValuationAnalysis }) {
  const rows = VALUATION_COLUMNS.filter((column) => valuation.features[column]);
  const columns = [
    { key: "level", label: "가치 수준" },
    { key: "momentum", label: "모멘텀" },
    { key: "expansion", label: "확장 압력" },
    { key: "compression", label: "압축 압력" },
    { key: "premium", label: "상대 프리미엄" },
    { key: "percentile", label: "역사 백분위" },
  ] as const;
  const cellValue = (column: ValuationCanonicalColumn, key: (typeof columns)[number]["key"]) => {
    const feature = valuation.features[column]!;
    if (key === "level") return feature.historicalPercentile;
    if (key === "momentum") return feature.trendDirection === "rising" ? 70 : feature.trendDirection === "falling" ? 30 : 50;
    if (key === "expansion") return clampPct(50 + feature.expansionRate * 3 + (valuation.expansion.reratingScore - 50) * 0.35);
    if (key === "compression") return clampPct((feature.historicalPercentile > 65 ? 35 : 10) + valuation.expansion.compressionScore * 0.55 + (feature.trendDirection === "falling" ? 18 : 0));
    if (key === "premium") return clampPct(50 + (feature.premiumDiscount ?? 0));
    return feature.percentiles.fullHistory;
  };
  const tooltip = (metric: ValuationCanonicalColumn, key: (typeof columns)[number]["key"], value: number) => {
    const feature = valuation.features[metric]!;
    const label = VALUATION_INDICATOR_CONFIG[metric].label;
    const zone = valuationZone(value).label;
    const driver =
      key === "compression"
        ? `압축 점수 ${valuation.expansion.compressionScore}/100과 ${koTrend(feature.trendDirection)} 추세가 결합됩니다.`
        : key === "expansion"
        ? `확장률 ${feature.expansionRate.toFixed(1)}%와 리레이팅 점수 ${valuation.expansion.reratingScore}/100을 반영합니다.`
        : key === "premium"
        ? `역사 평균 대비 ${feature.premiumDiscount == null ? "계산 불가" : `${feature.premiumDiscount.toFixed(1)}%`} 위치입니다.`
        : `${feature.percentiles.fullHistory.toFixed(0)}번째 백분위와 ${koTrend(feature.trendDirection)} 추세를 반영합니다.`;
    return `${label} ${zone}: ${driver} 값이 높을수록 프리미엄/압축 민감도가 큽니다.`;
  };

  if (!rows.length) return <FallbackNotice text="검증된 밸류에이션 팩터가 부족해 압력 매트릭스를 표시하지 않습니다." />;

  return (
    <section className="rounded-xl border border-cyan/15 bg-slate-950/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">밸류에이션 압력 매트릭스</p>
          <p className="mt-1 text-xs text-slate-400">각 셀은 멀티플의 수준, 방향, 압축/확장 민감도를 분리해 보여줍니다.</p>
        </div>
        <div className="flex gap-2 text-[8px] font-black uppercase">
          <span className="text-cyan">할인</span>
          <span className="text-sky-300">적정</span>
          <span className="text-orange-300">프리미엄</span>
          <span className="text-rose-300">극단</span>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[110px_repeat(6,1fr)] gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            <span>지표</span>
            {columns.map((item) => <span key={item.key} className="text-center">{item.label}</span>)}
          </div>
          <div className="mt-2 space-y-2">
            {rows.map((metric) => (
              <div key={metric} className="grid grid-cols-[110px_repeat(6,1fr)] gap-2">
                <div className="flex items-center rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-xs font-black text-white">{VALUATION_INDICATOR_CONFIG[metric].label}</div>
                {columns.map((item) => {
                  const value = cellValue(metric, item.key);
                  const zone = valuationZone(value);
                  const intensity = 0.12 + clampPct(value) / 150;
                  return (
                    <div key={item.key} className="group/cell relative min-h-[58px] rounded-lg border p-2 text-center transition duration-200 hover:-translate-y-0.5" style={{ borderColor: `${zone.color}44`, backgroundColor: `${zone.color}${Math.round(intensity * 255).toString(16).padStart(2, "0")}` }}>
                      <p className="text-lg font-black text-white">{value.toFixed(0)}</p>
                      <p className="text-[8px] font-black uppercase" style={{ color: zone.color }}>{zone.label}</p>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-56 -translate-x-1/2 rounded-lg border border-cyan/25 bg-slate-950 p-3 text-left text-[10px] leading-5 text-slate-200 shadow-[0_0_28px_rgba(34,211,238,0.25)] group-hover/cell:block">
                        {tooltip(metric, item.key, value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function koScenarioLabel(label: string) {
  const map: Record<string, string> = {
    "Bull Case": "강세 시나리오",
    "Base Case": "기준 시나리오",
    "Bear Case": "약세 시나리오",
    "Bullish case": "강세 시나리오",
    "Base case": "기준 시나리오",
    "Bearish case": "약세 시나리오",
  };
  return map[label] ?? label;
}

function koScenarioOutlook(text: string) {
  return koValuationSentence(text);
}

function koValuationSentence(text: string) {
  const replacements: Array<[RegExp, string]> = [
    [/PER is in the historical lower ([\d.]+)% zone, indicating relative cheapness\./, "PER은 역사적 하위 $1% 구간에 위치해 상대적 저평가 신호를 보입니다."],
    [/PBR is in an asset discount zone, supporting asset-based undervaluation\./, "PBR은 자산가치 대비 할인 구간에 있어 자산 기반 저평가를 지지합니다."],
    [/PEG indicates possible underpriced growth\./, "PEG는 성장 대비 가격이 낮게 형성됐을 가능성을 시사합니다."],
    [/Compressed valuation plus improving growth creates rerating potential\./, "압축된 밸류에이션과 성장 개선이 리레이팅 가능성을 만듭니다."],
    [/PER is above 60x, indicating speculative premium\./, "PER이 60배를 넘어 투기적 프리미엄 구간으로 분류됩니다."],
    [/PEG suggests expensive growth premium\./, "PEG는 성장 프리미엄 부담이 높아졌음을 시사합니다."],
    [/PEG is above 4x, indicating overheating growth valuation\./, "PEG가 4배를 넘어 성장 밸류에이션 과열 구간입니다."],
    [/PBR is above 8x, indicating premium valuation regime\./, "PBR이 8배를 넘어 프리미엄 밸류에이션 레짐입니다."],
    [/Valuation regime is classified as Speculative Bubble\./, "현재 밸류에이션 레짐은 투기적 버블로 분류됩니다."],
    [/Low PER is paired with falling growth proxy, raising value-trap risk\./, "낮은 PER이 성장 둔화와 함께 나타나 가치 함정 위험이 커집니다."],
    [/No decisive relative-undervaluation driver was detected\./, "결정적인 상대 저평가 동인은 감지되지 않았습니다."],
    [/No major stretched-multiple warning was detected\./, "주요 멀티플 과열 경고는 감지되지 않았습니다."],
    [/Single-factor PER valuation mode active\./, "PER 단일 팩터 밸류에이션 모드가 활성화되었습니다."],
    [/Asset-based PBR valuation mode active\./, "PBR 기반 자산가치 평가 모드가 활성화되었습니다."],
    [/No historical series detected: static snapshot cards only\./, "과거 시계열이 없어 정적 스냅샷 중심으로 표시합니다."],
    [/Data length < 20: rolling z-score analysis disabled\./, "데이터 길이가 20개 미만이라 롤링 Z-점수 분석은 비활성화됩니다."],
    [/Price column missing: multiple expansion uses valuation multiples only\./, "가격 컬럼이 없어 멀티플 확장은 밸류에이션 지표만으로 추정합니다."],
    [/Growth column missing: growth-premium and value-trap inference uses PEG\/multiple proxy\./, "성장 컬럼이 없어 성장 프리미엄과 가치 함정은 PEG/멀티플 대체 지표로 추정합니다."],
    [/Missing valuation factors: (.+)\./, "누락된 밸류에이션 팩터: $1."],
    [/No explicit bullish valuation driver was detected\./, "명확한 강세 밸류에이션 동인은 감지되지 않았습니다."],
    [/No major stretched-multiple or premium-instability factor detected\./, "주요 멀티플 과열 또는 프리미엄 불안정 요인은 감지되지 않았습니다."],
    [/No major valuation-specific risk trigger was detected\./, "주요 밸류에이션 특화 위험 신호는 감지되지 않았습니다."],
    [/Low PER is not enough: growth proxy and momentum are deteriorating, making cheapness potentially deceptive\./, "낮은 PER만으로는 충분하지 않습니다. 성장 대체 지표와 모멘텀이 악화되어 저평가가 착시일 수 있습니다."],
    [/No strong value-trap pattern from relative PER, growth proxy, and momentum\./, "상대 PER, 성장 대체 지표, 모멘텀 기준으로 강한 가치 함정 패턴은 없습니다."],
    [/PEG is extreme and multiples are expanding, indicating accelerated growth-premium pricing\./, "PEG가 극단적이고 멀티플이 확장되어 성장 프리미엄 가격 반영이 가속되고 있습니다."],
    [/Growth premium does not meet bubble conditions\./, "성장 프리미엄은 버블 조건에 도달하지 않았습니다."],
    [/At least one valuation multiple is above the 85th percentile with z-score above 2\./, "하나 이상의 밸류에이션 멀티플이 85번째 백분위 이상이며 Z-점수도 2를 초과합니다."],
    [/No high-percentile plus high-z-score overvaluation pressure detected\./, "높은 백분위와 높은 Z-점수가 결합된 고평가 압력은 감지되지 않았습니다."],
    [/Multiples are falling faster than the available earnings\/growth proxy can absorb\./, "멀티플이 이익/성장 대체 지표가 흡수할 수 있는 속도보다 빠르게 하락하고 있습니다."],
    [/Compression pressure is not dominant\./, "멀티플 압축 압력은 지배적이지 않습니다."],
    [/PEG and premium acceleration are unstable, increasing rerating volatility\./, "PEG와 프리미엄 가속도가 불안정해 리레이팅 변동성이 커지고 있습니다."],
    [/Growth premium appears stable or unsupported by available data\./, "성장 프리미엄은 안정적이거나 현재 데이터만으로는 불안정성이 확인되지 않습니다."],
    [/Compressed valuation with improving growth supports recovery repricing potential\./, "압축된 밸류에이션과 성장 개선은 회복 리프라이싱 가능성을 지지합니다."],
    [/Rerating potential is limited by current relative valuation structure\./, "현재 상대 밸류에이션 구조상 리레이팅 가능성은 제한적입니다."],
    [/Rerating occurs if compressed multiples normalize while growth does not deteriorate\./, "압축된 멀티플이 정상화되고 성장이 훼손되지 않으면 리레이팅이 발생할 수 있습니다."],
    [/Market continues pricing current growth and risk assumptions without a decisive rerating\./, "시장은 뚜렷한 리레이팅 없이 현재 성장과 위험 가정을 계속 가격에 반영합니다."],
    [/Multiple compression accelerates if growth premium fades or high-percentile multiples revert\./, "성장 프리미엄이 약화되거나 고백분위 멀티플이 되돌려지면 멀티플 압축이 가속될 수 있습니다."],
    [/Valuation remains close to current historical band/, "밸류에이션이 현재 역사적 밴드 근처에 머무름"],
  ];

  let output = text;
  for (const [pattern, replacement] of replacements) output = output.replace(pattern, replacement);
  return output
    .replace(/Value Trap Risk:/g, "가치 함정 위험:")
    .replace(/Bubble Risk:/g, "버블 위험:")
    .replace(/Overvaluation Pressure:/g, "고평가 압력:")
    .replace(/Multiple Compression Risk:/g, "멀티플 압축 위험:")
    .replace(/Growth Premium Instability:/g, "성장 프리미엄 불안정:")
    .replace(/Re-Rating Potential:/g, "리레이팅 가능성:")
    .replace(/HEALTHY EXPANSION/g, "건전한 멀티플 확장")
    .replace(/SPECULATIVE EXPANSION/g, "투기적 멀티플 확장")
    .replace(/COMPRESSION/g, "멀티플 압축")
    .replace(/VALUE ROTATION/g, "가치주 순환")
    .replace(/N\/A/g, "계산 불가")
    .replace(/Proxy/g, "대체 추정");
}

function ValuationCharacteristicsTab({ valuation }: { valuation: ValuationAnalysis }) {
  const componentRows = VALUATION_COLUMNS
    .filter((column) => valuation.features[column])
    .map((column) => {
      const scoreKey = VALUATION_SCORE_KEY[column];
      const feature = valuation.features[column]!;
      const zone = valuationZone(feature.historicalPercentile);
      return {
        column,
        label: VALUATION_INDICATOR_CONFIG[column].label,
        score: valuation.score.components[scoreKey] ?? 0,
        contribution: valuation.score.contribution[scoreKey] ?? 0,
        weight: valuation.score.dynamicWeights[scoreKey] ?? 0,
        color: zone.color,
        zone,
        feature,
        reason: valuationMetricReason(valuation, column),
      };
    });
  const relationships = valuationRelationshipFindings(valuation);

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">팩터별 기여도</p>
        <div className="mt-5 space-y-4">
          {componentRows.map((row) => (
            <div key={row.label} className="rounded-lg border border-white/[0.07] bg-slate-950/35 p-3">
              <div className="mb-2 flex items-start justify-between gap-3 text-xs font-bold">
                <div>
                  <span className="text-slate-200">{row.label}</span>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: row.color }}>{row.zone.label} · {koTrend(row.feature.trendDirection)}</p>
                </div>
                <span className="text-right text-white">점수 {row.score} · 기여 {row.contribution.toFixed(1)}</span>
              </div>
              <div className="relative h-3 overflow-visible rounded-full bg-slate-800">
                <div className="absolute inset-y-0 left-0 rounded-full bg-white/15" style={{ width: `${clampPct(row.contribution * 3)}%` }} />
                <div className={`h-3 rounded-full transition-all duration-700 ${row.zone.glow}`} style={{ width: `${Math.max(4, clampPct(row.score))}%`, background: `linear-gradient(90deg, ${row.color}55, ${row.color})` }} />
                <span className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-white shadow-[0_0_12px_rgba(255,255,255,0.65)]" style={{ left: `calc(${clampPct(row.feature.historicalPercentile)}% - 8px)` }} />
                <span className="absolute -top-5 text-[9px] font-black text-slate-300" style={{ left: `calc(${clampPct(row.feature.historicalPercentile)}% - 12px)` }}>{row.feature.historicalPercentile.toFixed(0)}th</span>
              </div>
              <div className="mt-3 grid gap-2 text-[10px] leading-5 text-slate-400 sm:grid-cols-[1fr_auto]">
                <p>{row.reason}</p>
                <p className="font-black text-slate-300">가중치 {(row.weight * 100).toFixed(0)}%</p>
              </div>
            </div>
          ))}
          {!componentRows.length ? <FallbackNotice text="검증된 밸류에이션 팩터가 없어 기여도 막대를 표시하지 않습니다." /> : null}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">롤링 Z-점수 / 평균회귀</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {valuation.availableColumns.map((column) => {
            const feature = valuation.features[column]!;
            return (
              <div key={column} className="rounded-lg border border-white/[0.07] bg-slate-950/45 p-4">
                <p className="text-xs font-black text-white">{VALUATION_INDICATOR_CONFIG[column].label}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {(["z20", "z60", "z120"] as const).map((key) => (
                    <div key={key} className="rounded-md bg-white/[0.04] p-2">
                      <p className="text-[9px] font-bold uppercase text-slate-500">{key}</p>
                      <p className="mt-1 text-sm font-black text-cyan">{feature.zScores[key] == null ? "계산 불가" : feature.zScores[key]!.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-cyan via-sky-400 via-orange-400 to-rose-500">
                  <div className="relative h-2">
                    <span className="absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]" style={{ left: `calc(${clampPct(feature.percentiles.threeYear)}% - 3px)` }} />
                  </div>
                </div>
                <p className="mt-2 text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: valuationZone(feature.percentiles.threeYear).color }}>{valuationZone(feature.percentiles.threeYear).label}</p>
                <p className="mt-3 text-[10px] leading-5 text-slate-400">평균회귀 강도 {feature.meanReversionStrength}/100. 프리미엄/디스카운트 {feature.premiumDiscount == null ? "계산 불가" : `${feature.premiumDiscount.toFixed(1)}%`}.</p>
                <p className="mt-1 text-[10px] leading-5 text-slate-500">3년 백분위 {feature.percentiles.threeYear.toFixed(0)}번째. 확장률 {feature.expansionRate.toFixed(1)}%.</p>
              </div>
            );
          })}
          {!valuation.availableColumns.length ? <FallbackNotice text="사용 가능한 밸류에이션 팩터가 없어 정적 요약만 표시합니다." /> : null}
        </div>
      </div>

      <div className="rounded-xl border border-cyan/15 bg-slate-950/55 p-5 lg:col-span-2">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">밸류에이션 관계 엔진</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {relationships.map((item) => (
            <div key={item.label} className={`rounded-lg border p-3 ${item.tone === "good" ? "border-emerald-400/20 bg-emerald-400/[0.045]" : item.tone === "bad" ? "border-rose-400/20 bg-rose-400/[0.045]" : item.tone === "warn" ? "border-amber-400/20 bg-amber-400/[0.045]" : "border-white/10 bg-white/[0.03]"}`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${item.tone === "good" ? "text-emerald-300" : item.tone === "bad" ? "text-rose-300" : item.tone === "warn" ? "text-amber-300" : "text-slate-400"}`}>{item.label}</p>
              <p className="mt-2 text-xs leading-6 text-slate-300">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">저평가 요인</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
          {valuation.signals.bullish.map((item) => <li key={item}>- {koValuationSentence(item)}</li>)}
          {!valuation.signals.bullish.length ? <li>- 현재 데이터에서는 명확한 저평가 요인이 제한적입니다.</li> : null}
        </ul>
      </div>

      <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.04] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-300">고평가 / 역사적 비교</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
          {[...valuation.signals.warnings, ...valuation.signals.valueTrapWarnings].map((item) => <li key={item}>- {koValuationSentence(item)}</li>)}
          {!valuation.signals.warnings.length && !valuation.signals.valueTrapWarnings.length ? <li>- 주요 고평가 신호는 감지되지 않았습니다.</li> : null}
        </ul>
      </div>
      <div className="rounded-xl border border-cyan/15 bg-slate-950/55 p-5 lg:col-span-2">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">멀티플 확장 매트릭스</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            ["가격 모멘텀", valuation.expansion.priceMomentum == null ? "계산 불가" : `${valuation.expansion.priceMomentum.toFixed(1)}%`],
            ["성장 모멘텀", valuation.expansion.growthMomentum == null ? "대체 추정" : `${valuation.expansion.growthMomentum.toFixed(1)}%`],
            ["멀티플 모멘텀", `${valuation.expansion.multipleMomentum.toFixed(1)}%`],
            ["리레이팅 점수", String(valuation.expansion.reratingScore)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-300">{koExpansionNarrative(valuation)}</p>
      </div>
    </div>
  );
}

function ValuationRiskTab({ valuation }: { valuation: ValuationAnalysis }) {
  const regime = valuationRegimeEngine(valuation);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {valuation.risks.map((risk) => (
          <div key={risk.id} className={`rounded-xl border p-4 ${risk.detected ? "border-rose-400/25 bg-rose-400/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">{koRiskLabel(risk.label)}</p>
              <span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${risk.severity === "HIGH" ? "bg-rose-500/15 text-rose-300" : risk.severity === "MEDIUM" ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}>{koSeverity(risk.severity)}</span>
            </div>
            <p className="mt-4 text-3xl font-black text-white">{risk.probability}%</p>
            <div className="relative mt-3 h-3 rounded-full bg-slate-800">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${risk.probability >= 75 ? "shadow-[0_0_18px_rgba(244,63,94,0.55)]" : ""}`}
                style={{
                  width: `${Math.max(4, risk.probability)}%`,
                  background: risk.probability >= 65 ? "linear-gradient(90deg,#FB923C,#F43F5E)" : risk.probability >= 40 ? "linear-gradient(90deg,#38BDF8,#FB923C)" : "linear-gradient(90deg,#22D3EE,#38BDF8)",
                }}
              />
              <span className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-white shadow-[0_0_12px_rgba(255,255,255,0.65)]" style={{ left: `calc(${clampPct(risk.probability)}% - 8px)` }} />
            </div>
            <p className="mt-3 text-[10px] leading-5 text-slate-400">{koRiskDescription(risk.description)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <ValuationPressureMatrix valuation={valuation} />

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">압축 / 확장 레짐 엔진</p>
          <div className="mt-3 rounded-lg border border-cyan/10 bg-cyan/[0.04] px-3 py-2">
            <p className="text-sm font-black text-white">{koRegime(regime.regime)}</p>
            <p className="mt-1 text-[10px] leading-5 text-slate-400">지배 동인: {regime.dominantDriver}. 압축 점수 {valuation.expansion.compressionScore}/100, 리레이팅 점수 {valuation.expansion.reratingScore}/100.</p>
          </div>
          <div className="mt-4 space-y-3">
            {valuation.availableColumns.map((column) => {
              const feature = valuation.features[column]!;
              const pressure = feature.trendDirection === "rising" ? Math.min(100, 50 + feature.historicalPercentile / 2) : Math.max(5, feature.historicalPercentile / 2);
              const zone = valuationZone(pressure);
              return (
                <div key={column}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">{VALUATION_INDICATOR_CONFIG[column].label}</span>
                    <span className="font-black" style={{ color: zone.color }}>{koTrend(feature.trendDirection)} · {zone.label}</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-slate-800">
                    <div className={`h-3 rounded-full transition-all duration-700 ${zone.glow}`} style={{ width: `${Math.max(4, pressure)}%`, background: `linear-gradient(90deg, ${zone.color}55, ${zone.color})` }} />
                    <span className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-white" style={{ left: `calc(${clampPct(pressure)}% - 8px)` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-lg border border-amber-400/15 bg-amber-400/[0.04] p-3 text-xs leading-6 text-slate-300">
            {valuation.degradation.length ? valuation.degradation.map(koValuationSentence).join(" ") : "네 가지 밸류에이션 팩터가 모두 감지되어 멀티팩터 분석이 활성화되었습니다."}
          </div>
        </div>
      </div>
    </div>
  );
}

function ValuationInterpretationTab({ valuation }: { valuation: ValuationAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-cyan/20 bg-slate-950/80 p-6 font-mono shadow-[0_0_55px_rgba(34,211,238,0.1)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan">AI 밸류에이션 터미널</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <TerminalLine label="밸류에이션 점수" value={String(valuation.score.total)} />
          <TerminalLine label="레짐" value={koRegime(valuation.regime)} />
          <TerminalLine label="신뢰도" value={koConfidence(valuation.score.confidence)} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <TerminalList title="강세 요인" items={valuation.aiSummary.bullishFactors.map(koValuationSentence)} />
          <TerminalList title="약세 요인" items={valuation.aiSummary.bearishFactors.map(koValuationSentence)} />
        </div>
        <div className="mt-5 rounded-lg border border-cyan/10 bg-cyan/[0.035] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">AI 해석</p>
          <p className="mt-3 text-sm leading-7 text-slate-200">{valuationOverviewNarrative(valuation)}</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">{koExpansionNarrative(valuation)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {valuation.aiSummary.scenarios.map((scenario) => (
          <div key={scenario.case} className={`rounded-xl border p-4 ${scenario.case === "bull" ? "border-emerald-400/20 bg-emerald-400/[0.05]" : scenario.case === "bear" ? "border-rose-400/20 bg-rose-400/[0.05]" : "border-cyan/15 bg-cyan/[0.04]"}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">{koScenarioLabel(scenario.label)}</p>
              <span className="text-xs font-black text-cyan">{scenario.probability}%</span>
            </div>
            <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-300">
              {scenario.drivers.map((driver) => <li key={driver}>- {koValuationSentence(driver)}</li>)}
            </ul>
            <p className="mt-3 border-t border-white/[0.08] pt-3 text-xs leading-5 text-slate-400">{koScenarioOutlook(scenario.outlook)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan">위험 경고</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
          {valuation.aiSummary.riskWarnings.map((warning) => <li key={warning}>- {koValuationSentence(warning)}</li>)}
        </ul>
      </div>
    </div>
  );
}

function ValuationMiniChart({ valuation, column }: { valuation: ValuationAnalysis; column: ValuationCanonicalColumn }) {
  const cfg = VALUATION_INDICATOR_CONFIG[column];
  const points = valuation.series[column] ?? [];
  const values = points.map((point) => point.value).filter(Number.isFinite).slice(-28);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = Math.max(max - min, 1e-9);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: cfg.color }}>{cfg.label}</p>
        <span className="text-[9px] font-bold text-slate-500">{values.length ? `${values.length} pts` : "missing"}</span>
      </div>
      <div className="mt-4 flex h-28 items-end gap-1">
        {values.length ? values.map((value, index) => (
          <div key={`${value}-${index}`} className="flex-1 rounded-t-sm opacity-90 transition hover:opacity-100" style={{ height: `${18 + ((value - min) / range) * 82}%`, backgroundColor: cfg.color }} />
        )) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-white/10 text-xs font-bold text-slate-600">No data</div>
        )}
      </div>
    </div>
  );
}

function TerminalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cyan/10 bg-black/30 p-3">
      <p className="text-[9px] uppercase tracking-[0.22em] text-cyan/70">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function TerminalList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan">{title}</p>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-300">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </div>
  );
}

function FallbackNotice({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-400/15 bg-amber-400/[0.05] p-4 text-sm leading-6 text-amber-100">
      {text}
    </div>
  );
}
