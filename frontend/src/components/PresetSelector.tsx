"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { PresetLocation } from "@/types/api";

interface PresetSelectorProps {
  presets: PresetLocation[];
  activeId: string | null;
  onSelectPreset: (preset: PresetLocation) => void;
}

const PRESET_METRICS: Record<
  string,
  { label: string; salinityBadge: string; ndvi: string; smap: string }
> = {
  nukus: {
    label: "Nukus",
    salinityBadge: "Severe ECe",
    ndvi: "0.22",
    smap: "14%",
  },
  bukhara: {
    label: "Bukhara",
    salinityBadge: "High ECe",
    ndvi: "0.09",
    smap: "15%",
  },
  samarkand: {
    label: "Samarkand",
    salinityBadge: "Moderate",
    ndvi: "0.18",
    smap: "17%",
  },
  fergana: {
    label: "Fergana",
    salinityBadge: "Low",
    ndvi: "0.19",
    smap: "20%",
  },
};

export default function PresetSelector({
  presets,
  activeId,
  onSelectPreset,
}: PresetSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      {presets.map((preset) => {
        const isSelected = activeId === preset.id;
        const meta = PRESET_METRICS[preset.id] || {
          label: preset.name.split(" ")[0],
          salinityBadge: preset.default_salinity.toUpperCase(),
          ndvi: (preset.modis_mean_ndvi || 0.15).toFixed(2),
          smap: `${Math.round((preset.smap_soil_moisture_cm3 || 0.15) * 100)}%`,
        };

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset)}
            className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              isSelected
                ? "bg-espresso-950 text-paper-50 font-semibold shadow-md"
                : "bg-white border border-paper-300 text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <MapPin
                className={`w-3.5 h-3.5 transition-colors ${
                  isSelected ? "text-harvest-400" : "text-espresso-500 group-hover:text-espresso-800"
                }`}
              />
              <span className={`font-medium ${isSelected ? "text-paper-50 font-semibold" : ""}`}>
                {meta.label}
              </span>
            </div>

            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                isSelected
                  ? "bg-harvest-500 text-espresso-950 font-bold"
                  : "bg-paper-100 text-espresso-600 border border-paper-200"
              }`}
            >
              {meta.salinityBadge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
