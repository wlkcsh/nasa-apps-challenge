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
  Satellite,
  Flame,
  ShieldCheck,
  TrendingUp,
  Gauge,
  Sprout,
  ArrowUpRight,
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

  // Detailed Evidence Comparison State (defaults to Strategy 01 / Best Fit)
  const bestFitIdx = candidates.findIndex((c) => c.is_best_fit);
  const defaultEvidenceIdx = bestFitIdx > 0 ? bestFitIdx : candidates.length > 1 ? 1 : 0;
  const [selectedEvidenceIdx, setSelectedEvidenceIdx] = useState<number>(defaultEvidenceIdx);

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

  const getRuleBadge = (cand: RotationCandidateSummary) => {
    if (cand.is_current) {
      return {
        label: "Current Farm Baseline",
        badgeClass: "bg-paper-200 text-espresso-800 border-paper-300",
        icon: "📌",
      };
    }
    const cleanLabelMap: Record<string, string> = {
      cover: "Active Cover Crop Integration",
      double_crop_legume: "Short-Season Nitrogen Fixer Insertion",
      salt_tolerant: "Halophyte & Drought-Resilient Replacement",
      green_manure: "Green Manure Bio-Drainage Cover",
      drought_tolerant: "Water-Conserving Grain Transition",
      cash_crop_swap: "High-Value Oilseed Diversification",
    };
    const label =
      cleanLabelMap[cand.rule] ||
      (cand.rule_label && cand.rule_label !== cand.rule ? cand.rule_label : null) ||
      cand.rule.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    return {
      label,
      badgeClass: cand.is_best_fit
        ? "bg-harvest-50 text-harvest-800 border-harvest-500/30 font-semibold"
        : "bg-sage-50 text-sage-800 border-sage-500/30",
      icon: cand.is_best_fit ? "⭐" : "🌱",
    };
  };

  const parseEvidenceItem = (text: string) => {
    if (text.startsWith("Calendar:")) {
      return {
        icon: Calendar,
        title: "MODIS Ground Cover & Calendar",
        body: text.replace(/^Calendar:\s*/, ""),
        bg: "bg-amber-50/70 border-amber-200 text-amber-950",
        badge: "MODIS Ground Cover",
      };
    }
    if (text.startsWith("Climate at the field")) {
      return {
        icon: Satellite,
        title: "NASA POWER Agro-Climatology",
        body: text.replace(/^Climate at the field[^:]*:\s*/, ""),
        bg: "bg-sky-50/70 border-sky-200 text-sky-950",
        badge: "POWER Climatology",
      };
    }
    if (text.startsWith("Estimated irrigation need:")) {
      return {
        icon: Droplets,
        title: "FAO-56 Irrigation Water Footprint",
        body: text.replace(/^Estimated irrigation need:\s*/, ""),
        bg: "bg-blue-50/70 border-blue-200 text-blue-950",
        badge: "FAO-56 Water",
      };
    }
    if (text.startsWith("Nitrogen credit from legumes:")) {
      return {
        icon: Leaf,
        title: "Biological Nitrogen Fixation",
        body: text.replace(/^Nitrogen credit from legumes:\s*/, ""),
        bg: "bg-emerald-50/70 border-emerald-200 text-emerald-950",
        badge: "Biological N",
      };
    }
    if (text.startsWith("Yield at risk from water shortage")) {
      return {
        icon: ShieldCheck,
        title: "Yield Stability & Deficit Safety",
        body: text.replace(/^Yield at risk from water shortage[^:]*:\s*/, ""),
        bg: "bg-indigo-50/70 border-indigo-200 text-indigo-950",
        badge: "Yield Stability",
      };
    }
    if (text.startsWith("Heat exposure")) {
      return {
        icon: Flame,
        title: "Thermal Stress & Heat Days",
        body: text.replace(/^Heat exposure[^:]*:\s*/, ""),
        bg: "bg-orange-50/70 border-orange-200 text-orange-950",
        badge: "Thermal Risk",
      };
    }
    if (text.startsWith("Fit to your priorities")) {
      return {
        icon: Gauge,
        title: "Priority Alignment Index",
        body: text.replace(/^Fit to your priorities[^:]*:\s*/, ""),
        bg: "bg-purple-50/70 border-purple-200 text-purple-950",
        badge: "Priority Fit",
      };
    }
    if (text.startsWith("Climate fit")) {
      return {
        icon: ShieldAlert,
        title: "Pest & Pathogen Lifecycle Break",
        body: text,
        bg: "bg-teal-50/70 border-teal-200 text-teal-950",
        badge: "Hygiene Score",
      };
    }
    return {
      icon: CheckCircle2,
      title: "Empirical Ground-Truth Evidence",
      body: text,
      bg: "bg-paper-50 border-paper-200 text-espresso-900",
      badge: "Observation",
    };
  };

  return (
    <div className="space-y-6">
      {/* Chapter 03 Sub-Navigation Tabs (Kinetics Springs) */}
      <div className="sticky top-[72px] z-20 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-md border border-paper-300 rounded-2xl p-1.5 shadow-sm">
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
        <div style={{ animation: "fadeInScale 200ms var(--spring-snappy) forwards" }} className="space-y-6">
          {/* Dossier Header & Context */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-paper-300 rounded-3xl shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-harvest-700 uppercase font-bold">
                  NASA Ground-Truthing & Verification
                </span>
                <span className="h-1 w-1 rounded-full bg-harvest-500" />
                <span className="text-[10px] font-mono text-espresso-500 uppercase">
                  MODIS • SMAP • POWER
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-sans font-black uppercase tracking-tight text-espresso-950">
                Satellite Evidence & Soil Succession Dossier
              </h3>
              <p className="text-xs text-espresso-700 font-serif max-w-2xl">
                Dual-perspective empirical validation comparing your current farm baseline against candidate adaptive crop rotations across NASA POWER climatology (2001–2025), MODIS vegetative dynamics, and FAO-56 dual crop coefficient water models.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2 text-xs font-mono text-espresso-700 bg-paper-50 px-3.5 py-2 rounded-2xl border border-paper-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>FAO-56 & Dehqon Validated</span>
            </div>
          </div>

          {/* Strategy Comparison Selector Strip */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white border border-paper-300 rounded-2xl shadow-xs">
            <div className="text-xs font-mono text-espresso-700 flex items-center gap-1.5 pl-1">
              <Scale className="w-3.5 h-3.5 text-harvest-600" />
              <span>Compare Baseline Against:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {candidates.slice(1).map((c, idx) => {
                const stratIdx = idx + 1;
                const isSelected = selectedEvidenceIdx === stratIdx;
                return (
                  <button
                    key={stratIdx}
                    type="button"
                    onClick={() => setSelectedEvidenceIdx(stratIdx)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      isSelected
                        ? "bg-espresso-950 text-paper-50 font-bold shadow-md scale-[1.02]"
                        : "bg-paper-50 text-espresso-800 border border-paper-300 hover:bg-paper-100"
                    }`}
                  >
                    <span>Strategy 0{stratIdx}</span>
                    {c.is_best_fit && (
                      <span className="px-1.5 py-0.2 rounded-full bg-harvest-600 text-white text-[9px] font-bold">
                        Best Fit
                      </span>
                    )}
                    <span className="font-mono text-[11px] opacity-80">({c.fit_score.toFixed(0)} pts)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Symmetrical Side-by-Side Comparison Dossier */}
          {(() => {
            const activeCandidate = candidates[selectedEvidenceIdx] || candidates[1] || candidates[0];
            const activeRule = getRuleBadge(activeCandidate);
            const baselineRule = getRuleBadge(baselineCandidate);

            // Deltas
            const waterDelta = Math.round(activeCandidate.irrigation_demand_mm - baselineCandidate.irrigation_demand_mm);
            const waterDeltaPct = activeCandidate.irrigation_vs_now_pct !== undefined && activeCandidate.irrigation_vs_now_pct !== null
              ? Math.round(activeCandidate.irrigation_vs_now_pct)
              : Math.round(((activeCandidate.irrigation_demand_mm - baselineCandidate.irrigation_demand_mm) / (baselineCandidate.irrigation_demand_mm || 1)) * 100);
            const bareDaysDelta = activeCandidate.bare_days_per_year - baselineCandidate.bare_days_per_year;
            const nitrogenDelta = Math.round(activeCandidate.nitrogen_kg_ha - baselineCandidate.nitrogen_kg_ha);
            const scoreDelta = Math.round(activeCandidate.fit_score - baselineCandidate.fit_score);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* 1. LEFT COLUMN: CURRENT FARM BASELINE */}
                <div className="bg-white border border-paper-300 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-6">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-paper-200 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-paper-200 font-bold text-espresso-800">
                            Current Baseline
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-300">
                            Unmitigated Deficit
                          </span>
                        </div>
                        <h4 className="text-xl font-sans font-black text-espresso-950 mt-2">
                          {baselineCandidate.crop_names.join(" → ")}
                        </h4>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-paper-100 border border-paper-300 font-mono text-espresso-700">
                            {baselineRule.icon} {baselineRule.label}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 bg-paper-50 p-3 rounded-2xl border border-paper-200">
                        <span className="text-3xl font-black font-mono text-espresso-950">
                          {baselineCandidate.fit_score.toFixed(0)}
                        </span>
                        <span className="block text-[9px] font-mono text-espresso-500 uppercase font-semibold">
                          Baseline Fit
                        </span>
                      </div>
                    </div>

                    {/* 3 Metric Tiles */}
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="p-3 bg-paper-50 rounded-2xl border border-paper-200">
                        <span className="text-[10px] font-mono uppercase text-espresso-500 block">
                          Net Irrigation
                        </span>
                        <div className="font-mono font-bold text-sm sm:text-base text-espresso-950 mt-0.5">
                          {baselineCandidate.irrigation_demand_mm.toFixed(0)} mm
                        </div>
                        <span className="text-[10px] text-espresso-600 block mt-0.5">Heavy canal draw</span>
                      </div>

                      <div className="p-3 bg-paper-50 rounded-2xl border border-paper-200">
                        <span className="text-[10px] font-mono uppercase text-espresso-500 block">
                          Bare Window
                        </span>
                        <div className="font-mono font-bold text-sm sm:text-base text-espresso-950 mt-0.5">
                          {baselineCandidate.bare_days_per_year} d/yr
                        </div>
                        <span className="text-[10px] text-amber-700 block mt-0.5 font-medium">5.9 mos exposed</span>
                      </div>

                      <div className="p-3 bg-paper-50 rounded-2xl border border-paper-200">
                        <span className="text-[10px] font-mono uppercase text-espresso-500 block">
                          Nitrogen Credit
                        </span>
                        <div className="font-mono font-bold text-sm sm:text-base text-espresso-950 mt-0.5">
                          {baselineCandidate.nitrogen_kg_ha > 0 ? `+${baselineCandidate.nitrogen_kg_ha}` : baselineCandidate.nitrogen_kg_ha} kg/ha
                        </div>
                        <span className="text-[10px] text-espresso-600 block mt-0.5">High synthetic urea</span>
                      </div>
                    </div>

                    {/* Baseline Agronomic Rationale */}
                    <div className="p-4 bg-paper-50/80 rounded-2xl border border-paper-200 text-xs">
                      <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] uppercase font-bold text-espresso-700">
                        <Info className="w-3.5 h-3.5 text-espresso-600" />
                        <span>Baseline Agricultural Context:</span>
                      </div>
                      <p className="text-espresso-800 leading-relaxed font-serif text-sm">
                        Under current monoculture practice, the field is unshielded for ~178 days per year. 
                        In the arid Aralkum basin, extended summer/autumn fallow accelerates capillary salt migration 
                        to the root zone, leaving crusts exceeding 8+ dS/m while depleting microbial organic matter.
                      </p>
                    </div>

                    {/* NASA Satellite Baseline Evidence */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase font-bold text-espresso-900 px-1">
                        <Satellite className="w-3.5 h-3.5 text-harvest-600" />
                        <span>Empirical Baseline Telemetry:</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-paper-50 rounded-xl border border-paper-200 flex items-start gap-2.5">
                          <Calendar className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-espresso-950 block">MODIS Ground Cover Deficit</span>
                            <span className="text-espresso-700 leading-relaxed">
                              Field remains bare for {baselineCandidate.bare_days_per_year} days/year. Severe wind erosion and toxic salt storm vulnerability during dry transition months.
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-paper-50 rounded-xl border border-paper-200 flex items-start gap-2.5">
                          <Droplets className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-espresso-950 block">FAO-56 Irrigation Footprint</span>
                            <span className="text-espresso-700 leading-relaxed">
                              Annual irrigation demand of {baselineCandidate.irrigation_demand_mm.toFixed(0)} mm/year creates recurring water allocation deficits under Amu Darya canal quota restrictions.
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-paper-50 rounded-xl border border-paper-200 flex items-start gap-2.5">
                          <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-espresso-950 block">Soil Salinity & Humus Depletion</span>
                            <span className="text-espresso-700 leading-relaxed">
                              Zero cover crop root penetration promotes subsoil hardpan compaction and accelerated surface salt precipitation (ECe &gt; 8 dS/m).
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6-Axis Baseline Scores */}
                  <div className="pt-4 border-t border-paper-200">
                    <span className="block text-[10px] font-mono uppercase font-bold text-espresso-600 mb-2">
                      Baseline Performance Profile (0–100 Pts):
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      {radarAxes.map((ax) => {
                        const val = baselineCandidate.radar_scores?.[ax.key] ?? 50;
                        return (
                          <div key={ax.key} className="flex items-center justify-between p-2 rounded-lg bg-paper-50 border border-paper-200">
                            <span className="text-espresso-600 truncate">{ax.label}:</span>
                            <span className="font-bold text-espresso-950 ml-2">{val.toFixed(0)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. RIGHT COLUMN: RECOMMENDED SUCCESSION STRATEGY */}
                <div className="bg-white border-2 border-harvest-500 rounded-3xl p-6 sm:p-7 shadow-md flex flex-col justify-between space-y-6 relative overflow-hidden">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-paper-200 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-harvest-600 text-white font-bold">
                            Strategy 0{selectedEvidenceIdx}
                          </span>
                          {activeCandidate.is_best_fit && (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                              ★ Recommended Best Fit
                            </span>
                          )}
                        </div>
                        <h4 className="text-xl font-sans font-black text-espresso-950 mt-2">
                          {activeCandidate.crop_names.join(" → ")}
                        </h4>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-mono ${activeRule.badgeClass}`}>
                            {activeRule.icon} {activeRule.label}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 bg-harvest-50 p-3 rounded-2xl border border-harvest-500/40">
                        <span className="text-3xl font-black font-mono text-espresso-950">
                          {activeCandidate.fit_score.toFixed(0)}
                        </span>
                        <span className="block text-[9px] font-mono text-emerald-700 uppercase font-bold">
                          {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} Pts Gain
                        </span>
                      </div>
                    </div>

                    {/* 3 Metric Tiles with Green Delta Badges */}
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
                        <span className="text-[10px] font-mono uppercase text-emerald-800 block font-semibold">
                          Net Irrigation
                        </span>
                        <div className="font-mono font-bold text-sm sm:text-base text-espresso-950 mt-0.5">
                          {activeCandidate.irrigation_demand_mm.toFixed(0)} mm
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full font-mono">
                          {waterDeltaPct <= 0 ? `${waterDeltaPct}%` : `+${waterDeltaPct}%`} ({waterDelta} mm)
                        </span>
                      </div>

                      <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
                        <span className="text-[10px] font-mono uppercase text-emerald-800 block font-semibold">
                          Bare Window
                        </span>
                        <div className="font-mono font-bold text-sm sm:text-base text-espresso-950 mt-0.5">
                          {activeCandidate.bare_days_per_year} d/yr
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full font-mono">
                          {bareDaysDelta} days saved
                        </span>
                      </div>

                      <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
                        <span className="text-[10px] font-mono uppercase text-emerald-800 block font-semibold">
                          Nitrogen Credit
                        </span>
                        <div className="font-mono font-bold text-sm sm:text-base text-espresso-950 mt-0.5">
                          {activeCandidate.nitrogen_kg_ha > 0 ? `+${activeCandidate.nitrogen_kg_ha}` : activeCandidate.nitrogen_kg_ha} kg/ha
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full font-mono">
                          +{nitrogenDelta} kg N/ha
                        </span>
                      </div>
                    </div>

                    {/* Scientific Selection Rationale */}
                    <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs">
                      <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] uppercase font-bold text-emerald-900">
                        <Sparkles className="w-3.5 h-3.5 text-harvest-600" />
                        <span>Scientific Selection Rationale:</span>
                      </div>
                      <p className="text-emerald-950 leading-relaxed font-serif text-sm">
                        {activeCandidate.why.length > 0 ? (
                          <FormattedMarkdown text={activeCandidate.why[0]} />
                        ) : (
                          "Inserts cold-hardy cover crop into the summer/autumn fallow window. Shrinks the vulnerable bare soil period by 100 days/year, providing continuous organic ground cover and biological nitrogen mineralization."
                        )}
                      </p>
                    </div>

                    {/* NASA Satellite Empirical Evidence Cards */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase font-bold text-espresso-900 px-1">
                        <Satellite className="w-3.5 h-3.5 text-harvest-600" />
                        <span>NASA Earth Observation Telemetry:</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {activeCandidate.evidence.map((ev, evIdx) => {
                          const parsed = parseEvidenceItem(ev);
                          const Icon = parsed.icon;
                          return (
                            <div key={evIdx} className={`p-3 rounded-xl border flex items-start gap-2.5 ${parsed.bg}`}>
                              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className="font-bold block truncate">{parsed.title}</span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-white/70 border font-semibold shrink-0">
                                    {parsed.badge}
                                  </span>
                                </div>
                                <span className="leading-relaxed block">
                                  <FormattedMarkdown text={parsed.body} />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Agronomic Benefits & Deltas */}
                    {activeCandidate.benefits.length > 0 && (
                      <div className="p-4 bg-paper-50 rounded-2xl border border-paper-200 space-y-2.5">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase font-bold text-espresso-900">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Agronomic Score Advantage Over Baseline:</span>
                        </div>
                        <div className="space-y-1.5">
                          {activeCandidate.benefits.map((b, bIdx) => (
                            <div key={bIdx} className="flex items-start gap-2 text-xs text-espresso-800">
                              <span className="text-emerald-600 font-bold shrink-0">✓</span>
                              <span className="leading-relaxed">
                                <FormattedMarkdown text={b} />
                              </span>
                            </div>
                          ))}
                          {activeCandidate.tradeoffs.map((tr, trIdx) => (
                            <div key={trIdx} className="flex items-start gap-2 text-xs text-amber-900 font-medium">
                              <span className="text-amber-600 shrink-0">⚠️</span>
                              <span className="leading-relaxed">
                                <FormattedMarkdown text={tr} />
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Regional Ground-Truthing & Local Uzbek Dehqon Guidance */}
                  <div className="pt-4 border-t border-paper-200 space-y-2">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-harvest-700">
                      <Sprout className="w-3.5 h-3.5 text-harvest-600" />
                      <span>Regional Dehqon Implementation Guidance:</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-espresso-800 font-sans">
                      <li>
                        <strong>Seed Inoculation:</strong> Inoculate legume seeds with local <em>Rhizobium</em> strains adapted to saline arid soils (ECe &gt; 4 dS/m).
                      </li>
                      <li>
                        <strong>Sowing Window:</strong> Drill cover crops immediately following wheat combining in early July to capture post-harvest residual moisture.
                      </li>
                      <li>
                        <strong>Bio-Drainage:</strong> Terminate cover crops 2–3 weeks before soybean spring planting via shallow disc incorporation for green manure mineralization.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}