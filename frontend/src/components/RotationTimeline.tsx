"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Droplets,
  Sprout,
  Activity,
  Calendar,
  Sparkles,
  Satellite,
  HelpCircle,
  ClipboardCheck,
  ShieldCheck,
  TrendingUp,
  Layers,
  ArrowRight,
  MoveRight,
} from "lucide-react";
import { ImpactMetrics, RotationStrategy, SeasonStep } from "@/types/api";

interface RotationTimelineProps {
  strategies?: RotationStrategy[];
  steps?: SeasonStep[];
  metrics?: ImpactMetrics;
  modisNdvi?: number;
  smapMoisture?: number;
}

const YEAR_BORDER_STYLES = [
  {
    border: "border-l-4 border-l-harvest-600",
    badge: "bg-harvest-100 text-harvest-800 border-harvest-300",
    glow: "hover:border-harvest-500",
    phase: "Year 1: Salt Pioneer & Desalination",
    accent: "text-harvest-700",
  },
  {
    border: "border-l-4 border-l-sage-600",
    badge: "bg-sage-100 text-sage-800 border-sage-300",
    glow: "hover:border-sage-500",
    phase: "Year 2: Legume N-Restoration",
    accent: "text-sage-700",
  },
  {
    border: "border-l-4 border-l-clay-600",
    badge: "bg-clay-100 text-clay-800 border-clay-300",
    glow: "hover:border-clay-500",
    phase: "Year 3: Cash Crop Recovery",
    accent: "text-clay-700",
  },
];

const MILESTONES = [
  { id: "synthesis", label: "01. Synthesis", short: "Synthesis" },
  { id: "year1", label: "02. Year 1 Pioneer", short: "Year 1" },
  { id: "year2", label: "03. Year 2 Nitrogen", short: "Year 2" },
  { id: "year3", label: "04. Year 3 Recovery", short: "Year 3" },
  { id: "audit", label: "05. NASA Evidence", short: "Audit" },
];

export default function RotationTimeline({
  strategies = [],
  steps: fallbackSteps = [],
  metrics: fallbackMetrics,
  modisNdvi = 0.22,
  smapMoisture = 0.14,
}: RotationTimelineProps) {
  const defaultIdx = strategies.length > 1 ? 1 : 0;
  const [selectedIdx, setSelectedIdx] = useState<number>(defaultIdx);
  const [isDesktop, setIsDesktop] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hudProgressRef = useRef<HTMLSpanElement>(null);
  const hudProgressBarRef = useRef<HTMLDivElement>(null);
  const hudPhaseRef = useRef<HTMLSpanElement>(null);
  const milestoneRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeStrategy = strategies[selectedIdx];
  const activeSteps = activeStrategy?.steps || fallbackSteps;
  const activeMetrics = activeStrategy?.metrics || fallbackMetrics;

  // Responsive mode check
  useEffect(() => {
    const checkMode = () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setIsDesktop(window.innerWidth >= 1024 && !prefersReducedMotion);
    };
    checkMode();
    window.addEventListener("resize", checkMode);
    return () => window.removeEventListener("resize", checkMode);
  }, []);

  // Hardware-accelerated Horizontal Spatial Scroll Controller (Zero VDOM Re-render Loop)
  useEffect(() => {
    if (!isDesktop) return;

    let rafId: number | null = null;
    let scheduled = false;

    function render() {
      scheduled = false;
      if (!containerRef.current || !stageRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const totalDist = containerRef.current.offsetHeight - window.innerHeight;
      if (totalDist <= 0) return;

      const scrolled = -rect.top;
      const progress = Math.min(Math.max(scrolled / totalDist, 0), 1);
      const stage = stageRef.current;
      const maxScroll = Math.max(stage.scrollWidth - window.innerWidth + 96, 0);

      // Hardware accelerated translation
      stage.style.transform = `translate3d(-${(progress * maxScroll).toFixed(1)}px, 0, 0)`;

      // Direct text node mutations for fixed HUD telemetry
      if (hudProgressRef.current) {
        hudProgressRef.current.textContent = `${Math.round(progress * 100).toString().padStart(2, "0")}%`;
      }
      if (hudProgressBarRef.current) {
        hudProgressBarRef.current.style.width = `${(progress * 100).toFixed(1)}%`;
      }
      if (hudPhaseRef.current) {
        const cardIndex = Math.min(4, Math.floor(progress * 5));
        const labels = [
          "Phase 1: Executive Synthesis",
          "Phase 2: Year 1 Salt Pioneer",
          "Phase 3: Year 2 Legume Nitrogen",
          "Phase 4: Year 3 Cash Crop Recovery",
          "Phase 5: NASA Ground-Truthing",
        ];
        hudPhaseRef.current.textContent = labels[cardIndex] || labels[0];
      }

      // Update milestone pill active styling directly
      const activeMilestoneIndex = Math.min(4, Math.floor(progress * 5));
      milestoneRefs.current.forEach((btn, idx) => {
        if (!btn) return;
        if (idx === activeMilestoneIndex) {
          btn.setAttribute("data-active", "true");
        } else {
          btn.removeAttribute("data-active");
        }
      });
    }

    const onScroll = () => {
      if (!scheduled) {
        scheduled = true;
        rafId = requestAnimationFrame(render);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    render();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isDesktop]);

  // Milestone Click to Smooth-Scroll Vertical Offset
  const handleMilestoneClick = useCallback((index: number) => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.getBoundingClientRect().top + window.scrollY;
    const totalDist = containerRef.current.offsetHeight - window.innerHeight;
    const targetScroll = containerTop + (index / 4) * totalDist;
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  }, []);

  if (!activeMetrics || activeSteps.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isDesktop ? "h-[350vh]" : "py-8"}`}
    >
      {/* Sticky Spatial Stage Container */}
      <div
        className={`w-full bg-paper-100 text-espresso-950 border-y border-paper-300 ${
          isDesktop
            ? "sticky top-0 h-screen overflow-hidden flex flex-col justify-between"
            : "flex flex-col gap-6"
        }`}
      >
        {/* ========================================================= */}
        {/* 1. FIXED HUD HEADER                                       */}
        {/* ========================================================= */}
        <div className="w-full px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-paper-300 bg-paper-100/95 backdrop-blur-md z-30">
          {/* Left: Section Identity & Strategy Selector */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-harvest-100 border border-harvest-400/30 text-[10px] font-mono tracking-widest uppercase text-harvest-800 font-semibold">
              <Layers className="w-3.5 h-3.5 text-harvest-700" />
              <span>Adaptive Progression</span>
            </div>

            {/* Strategy Switcher Pills */}
            {strategies.length > 0 && (
              <div className="flex items-center gap-1 bg-paper-200/80 p-1 rounded-full border border-paper-300">
                {strategies.map((strat, idx) => {
                  const isSelected = selectedIdx === idx;
                  const isRecommended = strat.id === "recommended" || idx === 1;

                  return (
                    <button
                      key={strat.id}
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      className={`flex items-center gap-1.5 py-1 px-3.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                        isSelected
                          ? "bg-espresso-950 text-paper-50 font-bold shadow-sm"
                          : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
                      }`}
                    >
                      <span className="truncate">{strat.title}</span>
                      {isRecommended && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[8px] font-mono uppercase px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected
                              ? "bg-harvest-500 text-espresso-950"
                              : "bg-harvest-200 text-harvest-900 border border-harvest-400"
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          REC
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Center: Interactive Milestone Navigator (Desktop) */}
          {isDesktop && (
            <div className="hidden xl:flex items-center gap-1.5 bg-paper-200/60 p-1 rounded-full border border-paper-300 text-[10px] font-mono">
              {MILESTONES.map((m, idx) => (
                <button
                  key={m.id}
                  ref={(el) => {
                    milestoneRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => handleMilestoneClick(idx)}
                  data-active={idx === 0 ? "true" : undefined}
                  className="px-3 py-1 rounded-full text-espresso-600 hover:text-espresso-950 hover:bg-paper-100 transition-all cursor-pointer [&[data-active=true]]:bg-white [&[data-active=true]]:text-espresso-950 [&[data-active=true]]:font-bold [&[data-active=true]]:border [&[data-active=true]]:border-paper-300 [&[data-active=true]]:shadow-sm"
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Right: Live Progress & Phase Readout */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span
              ref={hudPhaseRef}
              className="text-espresso-700 hidden md:inline text-[11px] tracking-wider uppercase font-semibold"
            >
              Phase 1: Executive Synthesis
            </span>

            <div className="flex items-center gap-2 bg-white border border-paper-300 px-3 py-1 rounded-full shadow-sm">
              <span className="text-[10px] text-espresso-500 uppercase tracking-widest font-semibold">Progress</span>
              <span
                ref={hudProgressRef}
                className="font-bold text-harvest-700 tabular-nums text-xs"
              >
                00%
              </span>
            </div>
          </div>
        </div>

        {/* Micro Progress Line Bar */}
        {isDesktop && (
          <div className="w-full h-[2px] bg-paper-300 relative overflow-hidden">
            <div
              ref={hudProgressBarRef}
              className="h-full bg-gradient-to-r from-harvest-600 via-sage-600 to-clay-600 w-0 transition-[width] duration-75"
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. TRANSLATING HORIZONTAL SPATIAL TRACK                   */}
        {/* ========================================================= */}
        <div
          className={`w-full flex-1 flex items-center ${
            isDesktop
              ? "overflow-hidden px-8"
              : "overflow-x-auto snap-x snap-mandatory px-4 py-4 space-x-6"
          }`}
        >
          <div
            ref={stageRef}
            className={`flex items-stretch gap-8 will-change-transform ${
              isDesktop ? "py-4 pl-4 pr-16" : ""
            }`}
          >
            {/* ----------------------------------------------------- */}
            {/* CARD 0: STRATEGY SYNTHESIS & 4 AGRO PILLARS          */}
            {/* ----------------------------------------------------- */}
            <div className="w-[85vw] max-w-[560px] lg:w-[560px] shrink-0 snap-center rounded-2xl bg-white border border-paper-300 p-7 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-harvest-500 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-harvest-100 border border-harvest-400/40 text-[10px] font-mono text-harvest-800 uppercase tracking-wider font-bold">
                    Executive Synthesis
                  </span>
                  <span className="text-[11px] font-mono text-espresso-500">
                    3-Year Cumulative Delta
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-serif font-bold text-espresso-950 mb-1.5 tracking-tight">
                  {activeStrategy?.title || "Adaptive Successional Architecture"}
                </h3>
                <p className="text-xs text-espresso-700 font-serif leading-relaxed mb-5">
                  {activeStrategy?.subtitle ||
                    "Calibrated from NASA POWER climatology and root-zone salinity thresholds to restore depleted Aral Sea basin soils."}
                </p>

                {/* The 4 Agro-Stat Pillars Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Pillar 1: Water Conservation */}
                  <div className="bg-paper-50 border border-paper-200 rounded-xl p-3.5 flex flex-col justify-between hover:bg-paper-100/70 transition-colors">
                    <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-espresso-800 uppercase">
                      <span className="flex items-center gap-1.5 text-harvest-700">
                        <Droplets className="w-3.5 h-3.5 text-harvest-600" />
                        <span>Water Saved</span>
                      </span>
                      <span className="font-mono text-espresso-400 text-[9px]">Pillar I</span>
                    </div>

                    <div className="my-2">
                      <div className="text-2xl font-serif font-black text-espresso-950 tracking-tight tabular-nums">
                        {activeMetrics.water_saved_pct}%
                        <span className="text-[11px] font-sans text-harvest-700 font-bold ml-1">
                          net
                        </span>
                      </div>
                      <div className="text-[11px] text-harvest-800 font-semibold mt-0.5">
                        +{activeMetrics.water_saved_mm} mm/ha reduction
                      </div>
                    </div>

                    <div className="text-[10px] text-espresso-500 font-mono truncate">
                      {activeMetrics.plan_3yr_water_mm} mm vs {activeMetrics.baseline_3yr_water_mm} mm
                    </div>
                  </div>

                  {/* Pillar 2: Soil Desalination */}
                  <div className="bg-paper-50 border border-paper-200 rounded-xl p-3.5 flex flex-col justify-between hover:bg-paper-100/70 transition-colors">
                    <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-espresso-800 uppercase">
                      <span className="flex items-center gap-1.5 text-harvest-700">
                        <Sprout className="w-3.5 h-3.5 text-harvest-600" />
                        <span>Desalination</span>
                      </span>
                      <span className="font-mono text-espresso-400 text-[9px]">Pillar II</span>
                    </div>

                    <div className="my-2">
                      <div className="text-2xl font-serif font-black text-espresso-950 tracking-tight tabular-nums">
                        {Math.round(activeMetrics.soil_restoration_index)}
                        <span className="text-[11px] font-sans text-espresso-500 font-normal"> / 100</span>
                      </div>
                      <div className="text-[11px] text-harvest-800 font-semibold mt-0.5">
                        Root-Zone Recovery
                      </div>
                    </div>

                    <div className="text-[10px] text-espresso-500 font-mono truncate">
                      {activeMetrics.soil_restoration_index >= 70
                        ? "Optimal Leaching Rate"
                        : "Active Salt Pioneer"}
                    </div>
                  </div>

                  {/* Pillar 3: Nitrogen Restoration */}
                  <div className="bg-paper-50 border border-paper-200 rounded-xl p-3.5 flex flex-col justify-between hover:bg-paper-100/70 transition-colors">
                    <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-espresso-800 uppercase">
                      <span className="flex items-center gap-1.5 text-sage-700">
                        <Activity className="w-3.5 h-3.5 text-sage-600" />
                        <span>N-Fixing</span>
                      </span>
                      <span className="font-mono text-espresso-400 text-[9px]">Pillar III</span>
                    </div>

                    <div className="my-2">
                      <div className="text-2xl font-serif font-black text-espresso-950 tracking-tight tabular-nums">
                        +{activeMetrics.net_nitrogen_score}
                        <span className="text-[11px] font-sans text-sage-700 font-bold ml-1">
                          Score
                        </span>
                      </div>
                      <div className="text-[11px] text-sage-800 font-semibold mt-0.5">
                        Rhizobial Fixation
                      </div>
                    </div>

                    <div className="text-[10px] text-espresso-500 font-mono truncate">
                      Organic biological nodules
                    </div>
                  </div>

                  {/* Pillar 4: NASA Telemetry */}
                  <div className="bg-paper-50 border border-paper-200 rounded-xl p-3.5 flex flex-col justify-between hover:bg-paper-100/70 transition-colors">
                    <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-espresso-800 uppercase">
                      <span className="flex items-center gap-1.5 text-clay-700">
                        <Satellite className="w-3.5 h-3.5 text-clay-600" />
                        <span>EOSDIS Sync</span>
                      </span>
                      <span className="font-mono text-espresso-400 text-[9px]">Pillar IV</span>
                    </div>

                    <div className="my-2">
                      <div className="text-2xl font-serif font-black text-espresso-950 tracking-tight tabular-nums">
                        {modisNdvi.toFixed(2)}
                        <span className="text-[11px] font-sans text-clay-700 font-bold ml-1">
                          NDVI
                        </span>
                      </div>
                      <div className="text-[11px] text-clay-800 font-semibold mt-0.5">
                        SMAP: {Math.round(smapMoisture * 100)}% Moisture
                      </div>
                    </div>

                    <div className="text-[10px] text-espresso-500 font-mono truncate">
                      AppEEARS 250m multi-year
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Cue */}
              <div className="pt-4 border-t border-paper-200 flex items-center justify-between text-[11px] text-espresso-600 font-mono mt-4">
                <span className="flex items-center gap-1.5 text-harvest-700 font-semibold">
                  <MoveRight className="w-3.5 h-3.5 animate-pulse text-harvest-600" />
                  <span>Glide to Year 1 Salt Pioneer</span>
                </span>
                <span>Card 1 of 5</span>
              </div>
            </div>

            {/* ----------------------------------------------------- */}
            {/* CARDS 1 to 3: 3-YEAR PROGRESSIVE STEPS               */}
            {/* ----------------------------------------------------- */}
            {activeSteps.map((step, idx) => {
              const theme = YEAR_BORDER_STYLES[idx] || YEAR_BORDER_STYLES[0];
              const cardNum = idx + 2;

              return (
                <div
                  key={step.year}
                  className={`w-[85vw] max-w-[490px] lg:w-[490px] shrink-0 snap-center rounded-2xl bg-white border border-paper-300 ${theme.border} ${theme.glow} p-7 flex flex-col justify-between shadow-xl relative transition-all`}
                >
                  <div>
                    {/* Header: Year Badge & Suitability */}
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold uppercase text-espresso-950">
                          Year {step.year}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold border ${theme.badge}`}>
                          Score: {step.suitability_score}/100
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-espresso-950">
                          {step.water_need_mm} mm
                        </span>
                        <div className="text-[8px] text-espresso-500 font-mono uppercase tracking-wider">
                          Water Budget
                        </div>
                      </div>
                    </div>

                    {/* Phase Subtitle */}
                    <div className="text-[10px] font-mono uppercase tracking-wider text-espresso-500 mb-1 font-semibold">
                      {theme.phase}
                    </div>

                    {/* Crop Name */}
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-espresso-950 tracking-tight mb-3">
                      {step.crop_name}
                      <span className="text-xs font-serif text-harvest-700 italic ml-2">
                        ({step.uzbek_name})
                      </span>
                    </h3>

                    {/* Sowing / Harvest Windows */}
                    <div className="grid grid-cols-2 gap-2 bg-paper-50 rounded-xl p-3 border border-paper-200 text-[11px] mb-3">
                      <div className="flex items-center gap-2 text-espresso-800">
                        <Calendar className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                        <div>
                          <div className="text-[9px] text-espresso-500 uppercase font-mono">Sow Window</div>
                          <span className="font-mono text-sage-800 font-bold">{step.sowing_window}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-espresso-800">
                        <Calendar className="w-3.5 h-3.5 text-harvest-600 shrink-0" />
                        <div>
                          <div className="text-[9px] text-espresso-500 uppercase font-mono">Harvest</div>
                          <span className="font-mono text-harvest-800 font-bold">{step.harvest_window}</span>
                        </div>
                      </div>
                    </div>

                    {/* Telemetry Metric Strip */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-paper-50 p-2.5 rounded-xl border border-paper-200 mb-3">
                      <div>
                        <div className="text-[9px] text-espresso-500 uppercase">N-Balance</div>
                        <span className="font-bold text-sage-700">
                          {step.nitrogen_delta > 0 ? `+${step.nitrogen_delta}` : step.nitrogen_delta} kg/ha
                        </span>
                      </div>
                      <div>
                        <div className="text-[9px] text-espresso-500 uppercase">Salinity Tol.</div>
                        <span className="font-bold text-harvest-700">{step.salinity_tolerance}/5</span>
                      </div>
                      <div>
                        <div className="text-[9px] text-espresso-500 uppercase">Heat Tol.</div>
                        <span className="font-bold text-clay-700">{step.heat_tolerance}/5</span>
                      </div>
                    </div>

                    {/* Agronomic Rationale */}
                    <p className="text-xs text-espresso-700 leading-relaxed font-serif pt-3 border-t border-paper-200">
                      {step.agronomic_rationale}
                    </p>

                    {/* Pest-Break & Cover Protection Pill */}
                    {step.pest_and_cover_note && (
                      <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-sage-50 border border-sage-200 text-xs leading-relaxed text-sage-900">
                        <ShieldCheck className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-sage-800 font-bold block text-[10px] uppercase tracking-wider">
                            Biological Soil Protection Break
                          </strong>
                          <span className="text-[11px] text-espresso-700">{step.pest_and_cover_note}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-paper-200 flex items-center justify-between text-[11px] text-espresso-500 font-mono mt-4">
                    <span>
                      {idx < 2 ? `Next: Year ${idx + 2}` : "Next: NASA Ground-Truthing"}
                    </span>
                    <span>Card {cardNum} of 5</span>
                  </div>
                </div>
              );
            })}

            {/* ----------------------------------------------------- */}
            {/* CARD 4: NASA GROUND-TRUTHING & LOCAL DEHQON AUDIT     */}
            {/* ----------------------------------------------------- */}
            <div className="w-[85vw] max-w-[540px] lg:w-[540px] shrink-0 snap-center rounded-2xl bg-white border border-paper-300 p-7 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-harvest-500 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-harvest-100 border border-harvest-400/40 text-[10px] font-mono text-harvest-800 uppercase tracking-wider font-bold">
                    Verification & Audit
                  </span>
                  <span className="text-[11px] font-mono text-espresso-500">
                    NASA Space Apps Challenge
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-serif font-bold text-espresso-950 mb-1.5 tracking-tight">
                  Ground-Truthing & Model Audit
                </h3>
                <p className="text-xs text-espresso-700 font-serif leading-relaxed mb-4">
                  Multi-sensor telemetry cross-checked against on-the-ground Central Asian farmer constraints.
                </p>

                <div className="space-y-3 text-xs">
                  {/* EO Evidence */}
                  <div className="bg-paper-50 p-3.5 rounded-xl border border-paper-200">
                    <div className="font-bold text-espresso-950 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wide">
                      <Satellite className="w-3.5 h-3.5 text-harvest-600" />
                      Earth Observation Evidence
                    </div>
                    <ul className="space-y-1 text-espresso-700 text-[11px] pl-3 list-disc marker:text-harvest-600">
                      {activeStrategy?.nasa_evidence?.slice(0, 3).map((e, i) => (
                        <li key={i}>{e}</li>
                      )) || (
                        <>
                          <li>MODIS Terra 250m multi-year NDVI trend verification across delta.</li>
                          <li>SMAP L4 root-zone moisture calibration (0-100cm depth).</li>
                          <li>NASA POWER 40-year agro-climatological growing degree-day base.</li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* Constraints */}
                  <div className="bg-paper-50 p-3.5 rounded-xl border border-paper-200">
                    <div className="font-bold text-espresso-950 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wide">
                      <HelpCircle className="w-3.5 h-3.5 text-harvest-600" />
                      Model Constraints & Unknowns
                    </div>
                    <ul className="space-y-1 text-espresso-700 text-[11px] pl-3 list-disc marker:text-harvest-600">
                      {activeStrategy?.information_gaps?.slice(0, 2).map((g, i) => (
                        <li key={i}>{g}</li>
                      )) || (
                        <>
                          <li>Thermal wind drift over Kyzylkum dunes requires localized windbreak validation.</li>
                          <li>Groundwater table mineralization varies with upstream canal flush cycles.</li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* Dehqon Checkpoints */}
                  <div className="bg-paper-50 p-3.5 rounded-xl border border-paper-200">
                    <div className="font-bold text-espresso-950 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wide">
                      <ClipboardCheck className="w-3.5 h-3.5 text-sage-600" />
                      Local Dehqon Checkpoints
                    </div>
                    <ul className="space-y-1 text-espresso-700 text-[11px] pl-3 list-disc marker:text-sage-600">
                      {activeStrategy?.local_expert_review?.slice(0, 2).map((r, i) => (
                        <li key={i}>{r}</li>
                      )) || (
                        <>
                          <li>Pre-sowing electrical conductivity test (ECe) at 20cm furrow depth.</li>
                          <li>Winter leaching furrow wash-water volume verification.</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-paper-200 flex items-center justify-between text-[11px] text-espresso-600 font-mono mt-4">
                <span className="text-harvest-700 font-semibold">
                  Field Shift UZ - NASA Space Apps 2026
                </span>
                <span>Card 5 of 5</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. FIXED HUD FOOTER                                       */}
        {/* ========================================================= */}
        <div className="w-full px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 border-t border-paper-300 bg-paper-100/95 backdrop-blur-md z-30 text-[11px] font-mono text-espresso-600">
          <div className="flex items-center gap-2">
            <span className="text-harvest-700 font-bold uppercase tracking-widest hidden sm:inline">
              Succession Telemetry
            </span>
            <span className="text-paper-400 hidden sm:inline">•</span>
            <span className="text-espresso-700">
              {isDesktop
                ? "Scroll down to travel through succession - Shift + Wheel to glide horizontally"
                : "Swipe horizontally to inspect cards"}
            </span>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-paper-300 text-espresso-800 shadow-sm">
              Water Saved: <strong className="text-harvest-700">{activeMetrics.water_saved_pct}%</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-paper-300 text-espresso-800 shadow-sm">
              Restoration: <strong className="text-harvest-700">{Math.round(activeMetrics.soil_restoration_index)}/100</strong>
            </span>
            <span className="hidden md:inline px-2.5 py-0.5 rounded-full bg-white border border-paper-300 text-espresso-800 shadow-sm">
              N-Balance: <strong className="text-sage-700">+{activeMetrics.net_nitrogen_score}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
