"use client";

import React, { useState } from "react";
import {
  SlidersHorizontal,
  Droplets,
  Sprout,
  TrendingUp,
  Wheat,
  Activity,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ThermometerSun,
} from "lucide-react";
import { CropId, FarmerPriority, SalinityLevel } from "@/types/api";
import { CustomSelect, CustomSelectItem } from "./ui/CustomSelect";

interface AgronomicControlsProps {
  currentCrop: CropId;
  salinity: SalinityLevel;
  priority: FarmerPriority;
  climateStress: boolean;
  loading: boolean;
  onCropChange: (crop: CropId) => void;
  onSalinityChange: (salinity: SalinityLevel) => void;
  onPriorityChange: (priority: FarmerPriority) => void;
  onClimateStressChange: (stress: boolean) => void;
  onSubmit: () => void;
}

const CROP_OPTIONS: CustomSelectItem<CropId>[] = [
  {
    id: "cotton",
    label: "Upland Cotton",
    sublabel: "G'o'za / Paxta (900mm)",
    badge: "High Water",
    badgeColor: "bg-rose-950/40 text-rose-300 border-rose-800/40",
    icon: Sprout,
  },
  {
    id: "winter_wheat",
    label: "Winter Wheat",
    sublabel: "Kuzgi Bug'doy (550mm)",
    badge: "Moderate",
    badgeColor: "bg-amber-950/40 text-amber-300 border-amber-800/40",
    icon: Wheat,
  },
  {
    id: "alfalfa",
    label: "Alfalfa / Lucerne",
    sublabel: "Beda (600mm)",
    badge: "Bio-Drain",
    badgeColor: "bg-cyan-950/40 text-cyan-300 border-cyan-800/40",
    icon: Sprout,
  },
  {
    id: "mung_bean",
    label: "Mung Bean",
    sublabel: "Mosh (320mm)",
    badge: "N-Fixer",
    badgeColor: "bg-emerald-950/40 text-emerald-300 border-emerald-800/40",
    icon: Sprout,
  },
  {
    id: "sorghum",
    label: "Grain Sorghum",
    sublabel: "Jo'xori (420mm)",
    badge: "Salt Forage",
    badgeColor: "bg-emerald-950/40 text-emerald-300 border-emerald-800/40",
    icon: Wheat,
  },
  {
    id: "melons",
    label: "Melons / Cucurbits",
    sublabel: "Qovun (480mm)",
    badge: "Cash Crop",
    badgeColor: "bg-cyan-950/40 text-cyan-300 border-cyan-800/40",
    icon: Sprout,
  },
];

const SALINITY_OPTIONS: CustomSelectItem<SalinityLevel>[] = [
  {
    id: "low",
    label: "Low (< 2 dS/m)",
    sublabel: "Non-Saline Foothills",
    badge: "Tier 1",
    badgeColor: "bg-emerald-950/40 text-emerald-300 border-emerald-800/40",
    icon: Activity,
  },
  {
    id: "moderate",
    label: "Moderate (2-4 dS/m)",
    sublabel: "Alluvial Oasis",
    badge: "Tier 2",
    badgeColor: "bg-cyan-950/40 text-cyan-300 border-cyan-800/40",
    icon: Activity,
  },
  {
    id: "high",
    label: "High (4-8 dS/m)",
    sublabel: "Secondary Salinization",
    badge: "Tier 3",
    badgeColor: "bg-amber-950/40 text-amber-300 border-amber-800/40",
    icon: ShieldAlert,
  },
  {
    id: "severe",
    label: "Severe (> 8 dS/m)",
    sublabel: "Aral Solonchak",
    badge: "Critical",
    badgeColor: "bg-rose-950/50 text-rose-300 border-rose-800/50",
    icon: ShieldAlert,
  },
];

export default function AgronomicControls({
  currentCrop,
  salinity,
  priority,
  climateStress,
  loading,
  onCropChange,
  onSalinityChange,
  onPriorityChange,
  onClimateStressChange,
  onSubmit,
}: AgronomicControlsProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 border border-paper-300 text-xs font-semibold text-espresso-950 shadow-lg hover:border-harvest-500 transition-all cursor-pointer group"
      >
        <SlidersHorizontal className="w-4 h-4 text-harvest-600 group-hover:rotate-90 transition-transform" />
        <span className="font-serif tracking-wide">Agronomic Controls</span>
        <ChevronRight className="w-3.5 h-3.5 text-espresso-500" />
      </button>
    );
  }

  return (
    <div className="w-full max-w-full sm:max-w-[420px] lg:max-w-none bg-white border border-paper-300 rounded-2xl p-5 shadow-lg space-y-4 pointer-events-auto">
      {/* Header with Title and Collapse Button */}
      <div className="flex items-center justify-between border-b border-paper-200 pb-3">
        <div>
          <span className="block text-[10px] font-mono tracking-widest text-harvest-600 uppercase font-semibold">
            Field Diagnostics
          </span>
          <h2 className="text-base font-serif font-bold text-espresso-950">
            Agronomic Controls
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Minimize HUD"
          className="p-1.5 rounded-lg text-espresso-500 hover:text-espresso-900 hover:bg-paper-100 transition-colors cursor-pointer hidden lg:block"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Selects: Current Crop & Salinity */}
      <div className="space-y-3">
        <CustomSelect
          label="Current Baseline Crop"
          value={currentCrop}
          options={CROP_OPTIONS}
          onChange={onCropChange}
        />
        <CustomSelect
          label="Measured Soil Salinity (ECe)"
          value={salinity}
          options={SALINITY_OPTIONS}
          onChange={onSalinityChange}
        />
      </div>

      {/* Optimization Priority Segmented Control */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-espresso-700">
          <span>Optimization Goal</span>
          <span className="text-[10px] font-mono text-espresso-500">Weighting</span>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-paper-100 p-1 rounded-xl border border-paper-300">
          {(
            [
              { id: "conserve_water", label: "Save Water", icon: Droplets },
              { id: "restore_soil", label: "Restore Soil", icon: Sprout },
              { id: "maximize_yield", label: "Max Revenue", icon: TrendingUp },
            ] as {
              id: FarmerPriority;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
            }[]
          ).map((item) => {
            const Icon = item.icon;
            const isSelected = priority === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPriorityChange(item.id)}
                style={{
                  transition: "all 140ms var(--spring-snappy)",
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-center cursor-pointer active:scale-95 transition-all ${
                  isSelected
                    ? "bg-white text-espresso-950 font-bold border border-paper-300 shadow-sm"
                    : "text-espresso-600 hover:text-espresso-900 hover:bg-paper-200/60"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isSelected ? "text-harvest-600" : "text-espresso-500"
                  }`}
                />
                <span className="text-[10px] font-medium leading-none truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2035 Climate Stress Simulator Toggle */}
      <div className="pt-0.5">
        <label
          htmlFor="climate-stress-toggle"
          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
            climateStress
              ? "bg-clay-50 border-clay-500/50 shadow-sm"
              : "bg-paper-50 border-paper-300 hover:border-paper-400"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ThermometerSun
              className={`w-4 h-4 shrink-0 ${
                climateStress ? "text-clay-600 animate-pulse" : "text-espresso-500"
              }`}
            />
            <div className="text-left">
              <span
                className={`block text-[11px] font-semibold leading-tight ${
                  climateStress ? "text-clay-700" : "text-espresso-900"
                }`}
              >
                Simulate +2°C / -20% Water Stress
              </span>
              <span className="block text-[9px] font-mono text-espresso-500">
                2035 Climate Scenario
              </span>
            </div>
          </div>

          <input
            id="climate-stress-toggle"
            type="checkbox"
            checked={climateStress}
            onChange={(e) => onClimateStressChange(e.target.checked)}
            className="w-4 h-4 rounded border-paper-400 text-clay-600 focus:ring-clay-500 bg-white cursor-pointer accent-clay-600"
          />
        </label>
      </div>

      {/* Primary Action Button */}
      <div className="pt-1">
        <button
          type="button"
          disabled={loading}
          onClick={onSubmit}
          style={{
            transition: "all 150ms var(--spring-snappy)",
          }}
          className="group relative w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-espresso-950 hover:bg-espresso-800 text-paper-50 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-harvest-400 ${
              loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"
            }`}
          />
          <span>
            {loading ? "Syncing NASA POWER..." : "Generate 3-Year Plan"}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-harvest-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
