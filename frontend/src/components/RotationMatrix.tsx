"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from "recharts";
import {
  Sparkles,
  ShieldAlert,
  Droplets,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  Wheat,
  Leaf,
  Scale,
  Calendar,
  FileText,
  LayoutGrid,
  Eye,
  Check,
} from "lucide-react";
import { ImpactMetrics, RotationCandidateSummary, RotationStrategy, SeasonStep } from "@/types/api";
import RotationTimeline from "./RotationTimeline";

interface RotationMatrixProps {
  candidates: RotationCandidateSummary[];
  recommendationSummary?: Record<string, string>;
  contractsDisclaimer?: string;
  lowYieldRiskNote?: string | null;
  strategies?: RotationStrategy[];
  steps?: SeasonStep[];
  metrics?: ImpactMetrics;
  modisNdvi?: number;
  smapMoisture?: number;
}

/**
 * Safely renders markdown bold (**text**) as styled <strong> tags,
 * eliminating raw asterisks and font compilation artifacts.
 */
function FormattedMarkdown({ text, className = "" }: { text?: string; className?: string }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          const content = part.slice(2, -2);
          return (
            <strong key={idx} className="font-bold text-espresso-950">
              {content}
            </strong>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
}

/**
 * Strips duplicate markdown prefixes (e.g. **Why:** or **Main trade-off:**)
 * when rendered beside dedicated UI badges.
 */
function cleanMarkdownPrefix(text?: string, prefixes: string[] = []): string {
  if (!text) return "";
  let cleaned = text.trim();
  for (const prefix of prefixes) {
    const regex = new RegExp(`^\\*\\*${prefix}:?\\*\\*:?\\s*`, "i");
    cleaned = cleaned.replace(regex, "");
    const plainRegex = new RegExp(`^${prefix}:?\\s*`, "i");
    cleaned = cleaned.replace(plainRegex, "");
  }
  return cleaned;
}

const CANDIDATE_COLORS = ["#78716c", "#16a34a", "#2563eb", "#d97706", "#9333ea"];

export default function RotationMatrix({
  candidates = [],
  recommendationSummary,
  contractsDisclaimer,
  lowYieldRiskNote,
  strategies = [],
  steps = [],
  metrics,
  modisNdvi = 0.22,
  smapMoisture = 0.14,
}: RotationMatrixProps) {
  // Navigation Tabs for Chapter 03 (Progressive Disclosure)
  const [activeTab, setActiveTab] = useState<"matrix" | "radar" | "timeline" | "evidence">("matrix");

  // Separated Radar View State (Item 5)
  const [activeRadarCandidateIdx, setActiveRadarCandidateIdx] = useState<number>(1); // Default Strategy 01 (Best Fit)
  const [radarDisplayMode, setRadarDisplayMode] = useState<"focused" | "multiples" | "all">("focused");

  // Detailed Evidence Accordion State
  const [expandedCardIdx, setExpandedCardIdx] = useState<number | null>(1);

  if (!candidates || candidates.length === 0) return null;

  // 6-Axis definitions
  const radarAxes = [
    { key: "Water Saving", label: "Water Saving", unit: "pts", desc: "Canal water conservation vs cotton monoculture" },
    { key: "Soil Organic Matter", label: "Soil OM", unit: "pts", desc: "Humus formation & microbial biomass replenishment" },
    { key: "Nitrogen Fixation", label: "Nitrogen", unit: "pts", desc: "Biological atmospheric nitrogen fixation credit" },
    { key: "Erosion Control", label: "Erosion", unit: "pts", desc: "Canopy ground cover days reducing toxic salt storms" },
    { key: "Forage Yield", label: "Forage Yield", unit: "pts", desc: "High-protein biomass for livestock integration" },
    { key: "Cash Income", label: "Cash Income", unit: "pts", desc: "Farmgate gross margin and market trade resilience" },
  ];

  // Prepare Radar Data across all candidates
  const radarDataAll = radarAxes.map((axis) => {
    const point: Record<string, string | number> = { axis: axis.label };
    candidates.forEach((cand, idx) => {
      const score = cand.radar_scores?.[axis.key] ?? 50;
      point[`opt_${idx}`] = score;
    });
    return point;
  });

  // Current baseline candidate (usually index 0)
  const baselineCandidate = candidates[0];
  const activeCandidate = candidates[activeRadarCandidateIdx] || candidates[1];

  return (
    <div className="space-y-6">
      {/* Chapter 03 Sub-Navigation Tabs (Kinetics Springs) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-paper-300 rounded-2xl p-1.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "matrix" as const, label: "Decision Matrix", icon: Scale, count: candidates.length },
            { id: "radar" as const, label: "Separated Radar Trade-Offs", icon: Layers, highlight: true },
            { id: "timeline" as const, label: "3-Year Multi-Year Plan", icon: Calendar, count: strategies.length || 3 },
            { id: "evidence" as const, label: "NASA Evidence Dossier", icon: FileText },
          ].map((tab) => {
            const isTabActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  transitionTimingFunction: "var(--spring-snappy)",
                }}
                className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                  isTabActive
                    ? "bg-espresso-950 text-paper-50 font-semibold shadow-md"
                    : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isTabActive ? "text-harvest-400" : "text-espresso-500"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isTabActive ? "bg-harvest-600 text-white" : "bg-paper-200 text-espresso-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.highlight && !isTabActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-harvest-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-mono text-espresso-600 px-3 hidden md:block">
          Evaluated with <strong className="text-espresso-950">NASA POWER Climatology</strong>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DECISION MATRIX (AT-A-GLANCE)                            */}
      {/* ============================================================== */}
      {activeTab === "matrix" && (
        <div style={{ animation: "fadeInScale 200ms var(--spring-snappy) forwards" }} className="space-y-6">
          {/* AI Recommendation Highlight Card */}
          {recommendationSummary && recommendationSummary.best && (
            <div className="bg-white border-2 border-harvest-500/60 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-paper-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-harvest-100 text-harvest-700">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-harvest-700 uppercase font-bold">
                      Agronomic Transition Recommendation
                    </span>
                    <h3 className="text-xl font-sans font-black uppercase text-espresso-950">
                      Optimal Transition Strategy
                    </h3>
                  </div>
                </div>

                <span className="px-3.5 py-1.5 rounded-full bg-harvest-600 text-white font-mono text-xs font-bold shadow-sm">
                  Highest Goal Alignment
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm font-sans">
                {/* 1. Best fit recommendation headline */}
                <div className="p-4 rounded-2xl bg-paper-50 border border-paper-200 text-espresso-950 text-sm sm:text-base leading-relaxed font-sans">
                  <FormattedMarkdown text={recommendationSummary.best} />
                </div>

                {/* 2. Rationale */}
                {recommendationSummary.reason && (
                  <div className="flex items-start gap-3 text-espresso-800 text-xs sm:text-sm font-sans">
                    <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                      Rationale
                    </span>
                    <div className="flex-1 leading-relaxed pt-0.5">
                      <FormattedMarkdown text={cleanMarkdownPrefix(recommendationSummary.reason, ["Why", "Sababi"])} />
                    </div>
                  </div>
                )}

                {/* 3. Trade-off */}
                {recommendationSummary.tradeoff && (
                  <div className="flex items-start gap-3 text-espresso-800 text-xs sm:text-sm font-sans">
                    <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                      Trade-off
                    </span>
                    <div className="flex-1 leading-relaxed pt-0.5">
                      <FormattedMarkdown text={cleanMarkdownPrefix(recommendationSummary.tradeoff, ["Main trade-off", "Asosiy kamchilik"])} />
                    </div>
                  </div>
                )}

                {/* 4. Local Agronomist Check */}
                {recommendationSummary.check && (
                  <div className="flex items-start gap-3 text-espresso-800 text-xs sm:text-sm font-sans">
                    <span className="shrink-0 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 border border-sky-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                      Local Check
                    </span>
                    <div className="flex-1 leading-relaxed pt-0.5">
                      <FormattedMarkdown text={cleanMarkdownPrefix(recommendationSummary.check, ["Check with a local agronomist", "Mahalliy agronom bilan tekshiring"])} />
                    </div>
                  </div>
                )}

                {/* 5. Scientific Caveat */}
                {recommendationSummary.caveat && (
                  <p className="text-[11px] font-sans text-espresso-500 italic pt-2 border-t border-paper-200/80">
                    <FormattedMarkdown text={recommendationSummary.caveat} />
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Legal / Policy Disclaimers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contractsDisclaimer && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-300 text-xs text-amber-950 font-sans">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold uppercase font-sans tracking-wide">Planting Contracts: </strong>
                  <FormattedMarkdown text={contractsDisclaimer} />
                </div>
              </div>
            )}
            {lowYieldRiskNote && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-sky-50/70 border border-sky-300 text-xs text-sky-950 font-sans">
                <Droplets className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold uppercase font-sans tracking-wide">Irrigation Notice: </strong>
                  <FormattedMarkdown text={lowYieldRiskNote} />
                </div>
              </div>
            )}
          </div>

          {/* 4-Column Side-by-Side Comparison Matrix */}
          <div className="bg-white border border-paper-300 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-paper-200 pb-4">
              <div>
                <span className="block text-[10px] font-mono tracking-widest text-harvest-600 uppercase font-semibold">
                  Multi-Criteria Decision Analysis
                </span>
                <h3 className="text-xl font-sans font-black uppercase text-espresso-950 tracking-tight">
                  At-A-Glance Rotation Evaluation Matrix
                </h3>
              </div>
              <span className="text-xs font-mono text-espresso-600">
                Current Farm Baseline vs Top 4 Scientific Alternatives
              </span>
            </div>

            <div className="overflow-x-auto w-full max-w-full min-w-0 no-scrollbar">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-paper-300">
                    <th className="py-3 px-4 font-mono uppercase text-espresso-500 font-bold w-1/4">
                      Evaluation Metric
                    </th>
                    {candidates.map((cand, idx) => (
                      <th
                        key={idx}
                        className={`py-3 px-4 text-center font-sans ${
                          cand.is_best_fit
                            ? "bg-harvest-50 border-t-2 border-harvest-600 text-espresso-950 font-bold"
                            : "text-espresso-800 font-semibold"
                        }`}
                      >
                        <div className="text-[10px] font-mono uppercase tracking-wider text-harvest-700">
                          {cand.is_current ? "Baseline (Now)" : `Option 0${idx}`}
                        </div>
                        <div className="text-xs font-bold mt-0.5">{cand.crop_names.join(" → ")}</div>
                        {cand.is_best_fit && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-harvest-600 text-white text-[9px] font-mono font-bold">
                            Top Fit
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-paper-200">
                  {/* Group 1: Overall Fit */}
                  <tr className="bg-paper-100/60">
                    <td colSpan={candidates.length + 1} className="py-2 px-4 font-mono font-bold text-[10px] uppercase text-harvest-800 tracking-wider">
                      Overall Goal Alignment & Climate Robustness
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-espresso-900">Priority Fit Score (0–100)</td>
                    {candidates.map((c, i) => (
                      <td key={i} className={`py-3 px-4 text-center font-mono font-bold text-sm ${c.is_best_fit ? "text-harvest-700 bg-harvest-50/40" : "text-espresso-950"}`}>
                        {c.fit_score.toFixed(0)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-espresso-700">Fit in Dry / Normal / Wet Years</td>
                    {candidates.map((c, i) => (
                      <td key={i} className="py-3 px-4 text-center font-mono text-[11px] text-espresso-700">
                        <span className="text-amber-700 font-bold">{c.fit_dry.toFixed(0)}</span> / {c.fit_normal.toFixed(0)} / <span className="text-sky-700 font-bold">{c.fit_wet.toFixed(0)}</span>
                      </td>
                    ))}
                  </tr>

                  {/* Group 2: Water Demand */}
                  <tr className="bg-paper-100/60">
                    <td colSpan={candidates.length + 1} className="py-2 px-4 font-mono font-bold text-[10px] uppercase text-harvest-800 tracking-wider">
                      Water Demand & Shortage Yield Risk
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-espresso-900">Net Irrigation Need (mm/yr)</td>
                    {candidates.map((c, i) => (
                      <td key={i} className="py-3 px-4 text-center font-mono font-bold text-xs text-espresso-950">
                        {c.irrigation_demand_mm.toFixed(0)} mm
                        {c.irrigation_vs_now_pct !== null && c.irrigation_vs_now_pct !== undefined && (
                          <span className={`block text-[10px] font-normal ${c.irrigation_vs_now_pct < 0 ? "text-emerald-700 font-semibold" : "text-rose-700"}`}>
                            {c.irrigation_vs_now_pct > 0 ? `+${c.irrigation_vs_now_pct}%` : `${c.irrigation_vs_now_pct}%`} vs now
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-espresso-700">Yield Loss in Drought (Median / P90)</td>
                    {candidates.map((c, i) => (
                      <td key={i} className="py-3 px-4 text-center font-mono text-xs text-espresso-900">
                        <span className={c.yield_loss_pct > 15 ? "text-rose-700 font-bold" : "text-emerald-700 font-bold"}>
                          {c.yield_loss_pct.toFixed(0)}%
                        </span>{" "}
                        / {c.yield_loss_p90_pct.toFixed(0)}%
                      </td>
                    ))}
                  </tr>

                  {/* Group 3: Soil Health */}
                  <tr className="bg-paper-100/60">
                    <td colSpan={candidates.length + 1} className="py-2 px-4 font-mono font-bold text-[10px] uppercase text-harvest-800 tracking-wider">
                      Soil Health & Protective Ground Cover
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-espresso-900">Bare Soil Days per Year</td>
                    {candidates.map((c, i) => (
                      <td key={i} className="py-3 px-4 text-center font-mono text-xs text-espresso-900">
                        <span className={c.bare_days_per_year < 120 ? "text-emerald-700 font-bold" : "text-amber-800"}>
                          {c.bare_days_per_year} d/yr
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-espresso-700">Legume Nitrogen Credit</td>
                    {candidates.map((c, i) => (
                      <td key={i} className="py-3 px-4 text-center font-mono text-xs text-espresso-900">
                        <span className={c.nitrogen_kg_ha > 0 ? "text-emerald-700 font-bold" : "text-espresso-600"}>
                          {c.nitrogen_kg_ha > 0 ? `+${c.nitrogen_kg_ha} kg/ha` : `${c.nitrogen_kg_ha} kg/ha`}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SEPARATED RADAR FINGERPRINTS (ITEM 5 FIX)               */}
      {/* ============================================================== */}
      {activeTab === "radar" && (
        <div style={{ animation: "fadeInScale 200ms var(--spring-snappy) forwards" }} className="space-y-6">
          {/* Top Controls: Candidate Selector Pills & Display Mode Toggle */}
          <div className="bg-white border border-paper-300 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-harvest-600 uppercase font-semibold">
                Separated Candidate Lenses
              </span>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {candidates.map((cand, idx) => {
                  const isCandActive = activeRadarCandidateIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveRadarCandidateIdx(idx);
                        if (radarDisplayMode === "all") setRadarDisplayMode("focused");
                      }}
                      style={{ transitionTimingFunction: "var(--spring-snappy)" }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer active:scale-[0.96] ${
                        isCandActive && radarDisplayMode !== "multiples" && radarDisplayMode !== "all"
                          ? "bg-espresso-950 text-paper-50 font-bold shadow-sm"
                          : "bg-paper-100 text-espresso-800 hover:bg-paper-200"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length] }}
                      />
                      <span>{cand.is_current ? "Baseline (Status Quo)" : `Strategy 0${idx}`}</span>
                      {cand.is_best_fit && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-harvest-500 text-espresso-950 font-bold">
                          Best Fit
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Display Mode Toggles */}
            <div className="flex items-center gap-1 bg-paper-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setRadarDisplayMode("focused")}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  radarDisplayMode === "focused" ? "bg-white text-espresso-950 font-bold shadow-sm" : "text-espresso-600 hover:text-espresso-950"
                }`}
              >
                1-on-1 vs Baseline
              </button>
              <button
                type="button"
                onClick={() => setRadarDisplayMode("multiples")}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  radarDisplayMode === "multiples" ? "bg-white text-espresso-950 font-bold shadow-sm" : "text-espresso-600 hover:text-espresso-950"
                }`}
              >
                Small Multiples Grid
              </button>
              <button
                type="button"
                onClick={() => setRadarDisplayMode("all")}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  radarDisplayMode === "all" ? "bg-white text-espresso-950 font-bold shadow-sm" : "text-espresso-600 hover:text-espresso-950"
                }`}
              >
                All Overlay
              </button>
            </div>
          </div>

          {/* Mode A: Focused 1-on-1 Comparison (Crystal Clear) */}
          {radarDisplayMode === "focused" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Clean Uncluttered Radar Chart */}
              <div className="lg:col-span-6 bg-white border border-paper-300 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-paper-200 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-harvest-600 uppercase font-semibold">
                      Focused 1-on-1 Trade-Off Radar
                    </span>
                    <h4 className="text-base font-bold font-sans text-espresso-950">
                      {activeCandidate.crop_names.join(" → ")}
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-harvest-700 bg-harvest-50 px-2.5 py-1 rounded-full border border-harvest-400/30">
                    Fit Score: {activeCandidate.fit_score.toFixed(0)}/100
                  </span>
                </div>

                <div className="h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      data={radarAxes.map((ax) => ({
                        axis: ax.label,
                        baseline: baselineCandidate?.radar_scores?.[ax.key] ?? 50,
                        candidate: activeCandidate?.radar_scores?.[ax.key] ?? 50,
                      }))}
                    >
                      <PolarGrid stroke="#e2ded4" />
                      <PolarAngleAxis dataKey="axis" tick={{ fill: "#292524", fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#a8a29e" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div className="bg-white border border-paper-300 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
                              <div className="font-bold text-espresso-950 font-mono uppercase border-b border-paper-200 pb-1">
                                {payload[0]?.payload?.axis}
                              </div>
                              <div className="flex justify-between text-espresso-600">
                                <span>Baseline:</span>
                                <span className="font-mono font-bold">{payload[0]?.payload?.baseline}/100</span>
                              </div>
                              <div className="flex justify-between text-emerald-700 font-bold">
                                <span>Candidate:</span>
                                <span className="font-mono">{payload[0]?.payload?.candidate}/100</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-sans)", paddingTop: "10px" }} />
                      {/* Dotted Reference Baseline */}
                      <Radar
                        name="Baseline Status Quo"
                        dataKey="baseline"
                        stroke="#78716c"
                        fill="#78716c"
                        fillOpacity={0.08}
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                      />
                      {/* Bold Candidate Radar */}
                      <Radar
                        name={activeCandidate.crop_names.join(" → ")}
                        dataKey="candidate"
                        stroke={CANDIDATE_COLORS[activeRadarCandidateIdx % CANDIDATE_COLORS.length]}
                        fill={CANDIDATE_COLORS[activeRadarCandidateIdx % CANDIDATE_COLORS.length]}
                        fillOpacity={0.35}
                        strokeWidth={2.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column: 6-Axis Trade-Off Delta Cards */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-espresso-600 font-bold">
                    6-Axis Performance Ledger vs Baseline
                  </h4>
                  <span className="text-[11px] font-mono text-espresso-500">
                    Net Delta Analysis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {radarAxes.map((ax) => {
                    const baseScore = baselineCandidate?.radar_scores?.[ax.key] ?? 50;
                    const candScore = activeCandidate?.radar_scores?.[ax.key] ?? 50;
                    const delta = Math.round(candScore - baseScore);
                    const isPositive = delta > 0;
                    const isNeutral = delta === 0;

                    return (
                      <div
                        key={ax.key}
                        className="p-4 bg-white rounded-2xl border border-paper-300 shadow-sm space-y-2 hover:border-harvest-400 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-espresso-950 font-sans">{ax.label}</span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              isPositive
                                ? "bg-emerald-100 text-emerald-800"
                                : isNeutral
                                ? "bg-paper-200 text-espresso-700"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {isPositive ? `+${delta}` : `${delta}`}
                          </span>
                        </div>

                        {/* Progress Bar comparison */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-espresso-500">
                            <span>Score: <strong className="text-espresso-950">{candScore}/100</strong></span>
                            <span>Base: {baseScore}</span>
                          </div>
                          <div className="h-1.5 w-full bg-paper-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isPositive ? "bg-emerald-600" : isNeutral ? "bg-espresso-400" : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, candScore))}%` }}
                            />
                          </div>
                        </div>

                        <p className="text-[10px] text-espresso-600 font-serif leading-tight">
                          {ax.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Mode B: Small Multiples Grid (Separated Cards Side-by-Side) */}
          {radarDisplayMode === "multiples" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {candidates.filter(c => !c.is_current).map((cand, idx) => {
                const realIdx = idx + 1;
                return (
                  <div key={realIdx} className="bg-white border border-paper-300 rounded-3xl p-5 shadow-sm space-y-3">
                    <div className="border-b border-paper-200 pb-2 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-mono uppercase text-harvest-700 font-bold">
                          Strategy 0{realIdx}
                        </span>
                        <h5 className="text-xs font-bold font-sans text-espresso-950 truncate max-w-[160px]">
                          {cand.crop_names.join(" → ")}
                        </h5>
                      </div>
                      <span className="text-xs font-mono font-bold text-espresso-950 bg-paper-100 px-2 py-0.5 rounded-full">
                        {cand.fit_score.toFixed(0)}
                      </span>
                    </div>

                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="75%"
                          data={radarAxes.map((ax) => ({
                            axis: ax.label,
                            baseline: baselineCandidate?.radar_scores?.[ax.key] ?? 50,
                            candidate: cand.radar_scores?.[ax.key] ?? 50,
                          }))}
                        >
                          <PolarGrid stroke="#ede8dd" />
                          <PolarAngleAxis dataKey="axis" tick={{ fill: "#57534e", fontSize: 9 }} />
                          <Radar
                            name="Baseline"
                            dataKey="baseline"
                            stroke="#a8a29e"
                            fill="#a8a29e"
                            fillOpacity={0.05}
                            strokeDasharray="2 2"
                          />
                          <Radar
                            name={cand.crop_names.join(" → ")}
                            dataKey="candidate"
                            stroke={CANDIDATE_COLORS[realIdx % CANDIDATE_COLORS.length]}
                            fill={CANDIDATE_COLORS[realIdx % CANDIDATE_COLORS.length]}
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="text-[11px] font-mono text-center text-espresso-600 bg-paper-50 py-1 rounded-xl">
                      Net Water: <strong>{cand.irrigation_demand_mm.toFixed(0)} mm</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mode C: All Superimposed Radar Overlay */}
          {radarDisplayMode === "all" && (
            <div className="bg-white border border-paper-300 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-paper-200 pb-3">
                <h4 className="text-base font-bold font-sans text-espresso-950">
                  Global Superimposed 5-Candidate Overlay
                </h4>
                <span className="text-xs font-mono text-espresso-600">Normalized 0–100 Scale</span>
              </div>

              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarDataAll}>
                    <PolarGrid stroke="#e2ded4" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: "#292524", fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#a8a29e" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-sans)", paddingTop: "12px" }} />
                    {candidates.map((cand, idx) => (
                      <Radar
                        key={idx}
                        name={cand.is_current ? "Baseline" : cand.crop_names.join(" → ")}
                        dataKey={`opt_${idx}`}
                        stroke={CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length]}
                        fill={CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length]}
                        fillOpacity={idx === 0 ? 0.08 : 0.2}
                        strokeWidth={idx === 0 ? 1.5 : 2}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: 3-YEAR MULTI-YEAR PROGRESSION TIMELINE                   */}
      {/* ============================================================== */}
      {activeTab === "timeline" && (
        <div style={{ animation: "fadeInScale 200ms var(--spring-snappy) forwards" }}>
          <RotationTimeline
            strategies={strategies}
            steps={steps}
            metrics={metrics}
            modisNdvi={modisNdvi}
            smapMoisture={smapMoisture}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SCIENTIFIC EVIDENCE & REGIONAL RISKS DOSSIER             */}
      {/* ============================================================== */}
      {activeTab === "evidence" && (
        <div style={{ animation: "fadeInScale 200ms var(--spring-snappy) forwards" }} className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-base font-sans font-black uppercase tracking-tight text-espresso-950">
              Scientific Ground-Truthing & NASA Satellite Evidence Dossier
            </h4>
            <span className="text-xs font-mono text-espresso-600">
              Verified against FAO-56 and Uzbek Dehqon Agronomy
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {candidates.map((cand, idx) => {
              const isExpanded = expandedCardIdx === idx;
              return (
                <div
                  key={idx}
                  className={`bg-white border rounded-3xl p-6 transition-all ${
                    cand.is_best_fit
                      ? "border-2 border-harvest-500 shadow-md"
                      : "border-paper-300 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-paper-200 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-paper-200 font-bold text-espresso-800">
                          {cand.is_current ? "Current Baseline" : `Strategy 0${idx}`}
                        </span>
                        {cand.is_best_fit && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-harvest-600 text-white font-bold">
                            Best Fit
                          </span>
                        )}
                      </div>
                      <h5 className="text-base font-bold text-espresso-950 font-sans mt-1">
                        {cand.crop_names.join(" → ")}
                      </h5>
                      <span className="text-xs text-harvest-700 font-serif italic">{cand.rule_label}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black font-mono text-espresso-950">
                        {cand.fit_score.toFixed(0)}
                      </span>
                      <span className="block text-[9px] font-mono text-espresso-500 uppercase">Fit Score</span>
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-b border-paper-100 text-center">
                    <div className="p-2 bg-paper-50 rounded-xl">
                      <span className="text-[9px] font-mono uppercase text-espresso-500">Net Irrigation</span>
                      <div className="font-mono font-bold text-xs text-espresso-950 mt-0.5">
                        {cand.irrigation_demand_mm.toFixed(0)} mm
                      </div>
                    </div>
                    <div className="p-2 bg-paper-50 rounded-xl">
                      <span className="text-[9px] font-mono uppercase text-espresso-500">Bare Days</span>
                      <div className="font-mono font-bold text-xs text-espresso-950 mt-0.5">
                        {cand.bare_days_per_year} d/yr
                      </div>
                    </div>
                    <div className="p-2 bg-paper-50 rounded-xl">
                      <span className="text-[9px] font-mono uppercase text-espresso-500">Nitrogen Credit</span>
                      <div className="font-mono font-bold text-xs text-espresso-950 mt-0.5">
                        {cand.nitrogen_kg_ha > 0 ? `+${cand.nitrogen_kg_ha}` : cand.nitrogen_kg_ha} kg/ha
                      </div>
                    </div>
                  </div>

                  {/* Progressive Disclosure Toggle */}
                  <button
                    type="button"
                    onClick={() => setExpandedCardIdx(isExpanded ? null : idx)}
                    className="w-full mt-3 flex items-center justify-between text-xs font-mono font-semibold text-harvest-700 hover:text-harvest-900 transition-colors cursor-pointer pt-1"
                  >
                    <span>{isExpanded ? "Collapse Evidence" : "Inspect Detailed Satellite Evidence"}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-paper-200 space-y-3.5 text-xs">
                      {/* 1. Sequence Rationale */}
                      {cand.why.length > 0 && (
                        <div className="p-3 bg-paper-50 rounded-xl border border-paper-200">
                          <strong className="block font-mono text-[10px] uppercase text-espresso-600 mb-1">
                            Scientific Selection Rationale:
                          </strong>
                          <ul className="list-disc pl-4 space-y-1 text-espresso-800">
                            {cand.why.map((w, wIdx) => (
                              <li key={wIdx}>
                                <FormattedMarkdown text={w} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 2. NASA Satellite Telemetry */}
                      {cand.evidence.length > 0 && (
                        <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-200">
                          <strong className="block font-mono text-[10px] uppercase text-sky-800 mb-1">
                            NASA Earth Observation Evidence:
                          </strong>
                          <ul className="list-disc pl-4 space-y-1 text-sky-950">
                            {cand.evidence.map((ev, evIdx) => (
                              <li key={evIdx}>
                                <FormattedMarkdown text={ev} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 3. Agronomic Benefits & Trade-offs */}
                      {cand.benefits.length > 0 && (
                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                          <strong className="block font-mono text-[10px] uppercase text-emerald-800 mb-1">
                            Agronomic Benefits & Trade-offs:
                          </strong>
                          <ul className="list-disc pl-4 space-y-1 text-emerald-950">
                            {cand.benefits.map((b, bIdx) => (
                              <li key={bIdx}>
                                <FormattedMarkdown text={b} />
                              </li>
                            ))}
                            {cand.tradeoffs.map((tr, trIdx) => (
                              <li key={trIdx} className="text-amber-900 font-semibold">
                                ⚠️ <FormattedMarkdown text={tr} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 4. Local Ground-Truthing Risks */}
                      {cand.risks.length > 0 && (
                        <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
                          <strong className="block font-mono text-[10px] uppercase text-rose-800 mb-1">
                            Regional Agronomic Risks to Validate Locally:
                          </strong>
                          <ul className="list-disc pl-4 space-y-1 text-rose-950">
                            {cand.risks.map((rk, rkIdx) => (
                              <li key={rkIdx}>
                                <FormattedMarkdown text={rk} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}