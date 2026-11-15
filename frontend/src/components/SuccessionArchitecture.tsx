"use client";

import React, { useState } from "react";
import {
  Droplets,
  Sprout,
  Wheat,
  ArrowRight,
  ArrowDown,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface SuccessionArchitectureProps {
  onLaunchCockpit?: () => void;
}

interface SuccessionStage {
  year: string;
  phaseNum: string;
  badge: string;
  badgeColor: string;
  badgeRing: string;
  title: string;
  uzbekName: string;
  crops: string[];
  role: string;
  icon: React.ElementType;
  metrics: { label: string; value: string; unit?: string }[];
  highlight: string;
}

const SUCCESSION_STAGES: SuccessionStage[] = [
  {
    year: "Year 01",
    phaseNum: "Phase 01",
    badge: "Pioneer Bio-Drainage",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    badgeRing: "hover:border-amber-400 hover:ring-amber-400/10",
    title: "Deep Aquifer Bio-Drainage & Hardpan Fracture",
    uzbekName: "Tuzsizlantirish va bio-drenaj bosqichi",
    crops: ["Sorghum (Jo'xori)", "Halophytic Alfalfa (Beda)", "Sudangrass"],
    role: "Deep-rooted halophytes penetrate >2.2m into compacted plow pans, drawing directly from shallow saline groundwater. This lowers the water table and prevents capillary salt crusting without wasting fresh canal water.",
    icon: Droplets,
    metrics: [
      { label: "Taproot Depth", value: ">2.2", unit: "m" },
      { label: "Salt Halt", value: "100%", unit: "capillary" },
      { label: "Irrigation Need", value: "Low", unit: "rain+aquifer" },
    ],
    highlight: "Halts toxic capillary salinization at the root zone",
  },
  {
    year: "Year 02",
    phaseNum: "Phase 02",
    badge: "Soil Regeneration",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    badgeRing: "hover:border-emerald-400 hover:ring-emerald-400/10",
    title: "Biological Nitrogen Fixation & Humus Rebuilding",
    uzbekName: "Biologik azot to'plash va gumus tiklash",
    crops: ["Hairy Vetch (Tukli vika)", "Mung Bean (Mosh)", "Winter Rye Cover"],
    role: "Symbiotic Rhizobium root nodules fix +40 to +65 kg N/ha of organic nitrogen from the air. Dense vegetative cover shields delicate sandy loess from ferocious dust storms, reducing bare soil from 155 to <55 days/year.",
    icon: Sprout,
    metrics: [
      { label: "Free Nitrogen", value: "+55", unit: "kg N/ha" },
      { label: "Bare Soil Days", value: "-100", unit: "d/yr" },
      { label: "Organic Carbon", value: "+1.8x", unit: "humus" },
    ],
    highlight: "Replaces expensive synthetic nitrogen fertilizers naturally",
  },
  {
    year: "Year 03",
    phaseNum: "Phase 03",
    badge: "Commercial Harvest",
    badgeColor: "bg-sky-100 text-sky-900 border-sky-300",
    badgeRing: "hover:border-sky-400 hover:ring-sky-400/10",
    title: "High-Value Sustainable Commercial Harvest",
    uzbekName: "Yuqori daromadli toza hosil yig'imi",
    crops: ["Winter Wheat (Kuzgi Bug'doy)", "Soybean (Soya)", "Food-Grade Maize"],
    role: "On remediated, structurally resilient and nutrient-rich soil, farmers plant high-yield cash crops. The established root channels and biological fertility yield bumper harvests with 34% lower seasonal irrigation demand.",
    icon: Wheat,
    metrics: [
      { label: "Water Savings", value: "34%", unit: "net saved" },
      { label: "Yield Potential", value: "92", unit: "score/100" },
      { label: "Secondary Salt", value: "Zero", unit: "re-salinization" },
    ],
    highlight: "Delivers maximum farmer income while permanently restoring soil",
  },
];

export default function SuccessionArchitecture({
  onLaunchCockpit,
}: SuccessionArchitectureProps) {
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);

  const renderCard = (stg: SuccessionStage, idx: number, isGrid = false) => {
    const Icon = stg.icon;
    const isSelected = activeStageIdx === idx;

    return (
      <div
        key={stg.year}
        onClick={() => setActiveStageIdx(idx)}
        style={{ transitionTimingFunction: "var(--spring-snappy)" }}
        className={`group p-6 rounded-2xl bg-white border border-paper-300 shadow-sm flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${stg.badgeRing} ${
          isSelected
            ? "ring-2 ring-harvest-500/30 border-harvest-500 shadow-md"
            : "hover:shadow-md"
        }`}
      >
        <div>
          {/* Top Meta Line: Phase Badge and Stage Status */}
          <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-paper-200">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-espresso-950 uppercase tracking-wide bg-paper-100 border border-paper-300 px-2.5 py-1 rounded-full">
                {stg.phaseNum} • {stg.year}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${stg.badgeColor}`}
              >
                {stg.badge}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-paper-100 text-espresso-700 border border-paper-200 group-hover:border-harvest-400 group-hover:bg-harvest-50 transition-colors">
              <Icon className="w-4 h-4 text-harvest-700" />
            </div>
          </div>

          {/* Titles */}
          <div className="mt-3.5 mb-2">
            <h4 className="text-base sm:text-lg font-sans font-black uppercase tracking-tight text-espresso-950 leading-snug">
              {stg.title}
            </h4>
            <p className="text-xs font-sans text-espresso-600 mt-1 font-medium">
              {stg.uzbekName}
            </p>
          </div>

          {/* Pioneer Crops List */}
          <div className="flex flex-wrap items-center gap-1.5 my-3">
            <span className="text-[10px] font-mono uppercase text-espresso-500 font-bold mr-0.5">
              Pioneer Crops:
            </span>
            {stg.crops.map((crp) => (
              <span
                key={crp}
                className="text-[11px] font-sans px-2.5 py-0.5 rounded-lg bg-paper-100 border border-paper-200 text-espresso-900 font-medium"
              >
                {crp}
              </span>
            ))}
          </div>

          {/* Agronomic Mechanism Narrative */}
          <p className="text-xs sm:text-sm font-sans text-espresso-700 leading-relaxed mb-5">
            {stg.role}
          </p>
        </div>

        {/* Telemetry Impact Grid (Pinned to Card Bottom) */}
        <div className="pt-3 border-t border-paper-200/90 mt-auto">
          <div className="text-[10px] font-mono text-harvest-700 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Soil Recovery Telemetry</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-harvest-600" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {stg.metrics.map((m) => (
              <div
                key={m.label}
                className="p-2 rounded-xl bg-paper-50 border border-paper-200 text-center"
              >
                <span className="block text-[9px] font-mono uppercase text-espresso-500 font-semibold tracking-wider truncate">
                  {m.label}
                </span>
                <div className="text-sm font-black font-mono text-espresso-950 mt-0.5 tabular-nums">
                  {m.value}{" "}
                  {m.unit && (
                    <span className="text-[10px] font-normal font-sans text-espresso-600">
                      {m.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Container Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-paper-300 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-harvest-50 text-harvest-600 border border-harvest-500/20">
            <Layers className="w-5 h-5 text-harvest-700" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-harvest-700 font-bold">
              3-Year Agro-Ecological Transition Model
            </div>
            <h3 className="text-base sm:text-lg font-sans font-black uppercase text-espresso-950 tracking-tight">
              Aral Basin Soil Succession Architecture
            </h3>
          </div>
        </div>

        {/* Desktop Pipeline Telemetry Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-espresso-700 bg-paper-100 px-3.5 py-1.5 rounded-full border border-paper-200">
          <span className="font-bold text-harvest-700">Chronological Progression:</span>
          <span>Bio-Drainage</span>
          <ArrowRight className="w-3.5 h-3.5 text-harvest-600" />
          <span>Nitrogen Fixation</span>
          <ArrowRight className="w-3.5 h-3.5 text-harvest-600" />
          <span className="font-bold text-espresso-950">Commercial Harvest</span>
        </div>

        {/* Mobile Tab Selector */}
        <div className="flex md:hidden items-center gap-1.5 p-1 rounded-full bg-paper-100 border border-paper-200 text-xs font-mono">
          {SUCCESSION_STAGES.map((stg, idx) => {
            const isSelected = activeStageIdx === idx;
            return (
              <button
                key={stg.year}
                type="button"
                onClick={() => setActiveStageIdx(idx)}
                style={{ transitionTimingFunction: "var(--spring-snappy)" }}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer text-[11px] ${
                  isSelected
                    ? "bg-espresso-950 text-paper-50 shadow-sm"
                    : "text-espresso-600 hover:text-espresso-950 hover:bg-white"
                }`}
              >
                {stg.year}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop View: Wide 3-Column Parallel Succession Pipeline */}
      <div className="hidden md:grid md:grid-cols-3 gap-5 items-stretch">
        {SUCCESSION_STAGES.map((stg, idx) => renderCard(stg, idx, true))}
      </div>

      {/* Mobile View: Active Stage Card with Instant Tab Switch */}
      <div className="block md:hidden">
        {renderCard(SUCCESSION_STAGES[activeStageIdx], activeStageIdx, false)}
      </div>

      {/* Bottom Action Strip: Immediate Flow into Decision Cockpit */}
      <div className="p-4 sm:p-5 rounded-2xl bg-espresso-950 text-paper-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2 rounded-xl bg-harvest-500/20 text-harvest-400 border border-harvest-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold tracking-wide text-harvest-400 uppercase">
              Agriverto NASA POWER Algorithm
            </div>
            <p className="text-xs text-stone-300 font-sans mt-0.5">
              Simulate this 3-year transition for your exact coordinate in the interactive cockpit below.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLaunchCockpit}
          className="group shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full bg-harvest-500 hover:bg-harvest-400 text-espresso-950 font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <span>Launch Satellite Cockpit</span>
          <ArrowDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
