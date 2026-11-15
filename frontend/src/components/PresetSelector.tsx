"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { PresetLocation } from "@/types/api";

interface PresetSelectorProps {
  presets: PresetLocation[];
  activeId: string | null;
  onSelectPreset: (preset: PresetLocation) => void;
}

const SALINITY_BADGES: Record<string, string> = {
  severe: "Severe ECe",
  high: "High ECe",
  moderate: "Moderate",
  low: "Low",
};

export default function PresetSelector({
  presets,
  activeId,
  onSelectPreset,
}: PresetSelectorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Smooth mouse-wheel horizontal panning
  const handleWheel = (e: React.WheelEvent) => {
    if (containerRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      containerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Keep active preset in view
  React.useEffect(() => {
    if (!activeId || !containerRef.current) return;
    const activeEl = containerRef.current.querySelector<HTMLElement>(`[data-preset-id="${activeId}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
    }
  }, [activeId]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      className="w-full max-w-full min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth"
    >
      {presets.map((preset) => {
        const isSelected = activeId === preset.id;
        const shortName = preset.name.split("(")[0].trim() || preset.name.split(" ")[0];
        const salinityBadge = SALINITY_BADGES[preset.default_salinity] || preset.default_salinity.toUpperCase();

        return (
          <button
            key={preset.id}
            data-preset-id={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset)}
            style={{
              transitionTimingFunction: "var(--spring-snappy)",
            }}
            className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-[0.95] ${
              isSelected
                ? "bg-espresso-950 text-paper-50 font-semibold shadow-md ring-2 ring-harvest-500/40"
                : "bg-white border border-paper-300 text-espresso-700 hover:text-espresso-950 hover:bg-paper-50 hover:border-paper-400 hover:-translate-y-0.5"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <MapPin
                className={`w-3.5 h-3.5 transition-colors ${
                  isSelected ? "text-harvest-400" : "text-espresso-500 group-hover:text-espresso-800"
                }`}
              />
              <span className={`font-medium ${isSelected ? "text-paper-50 font-semibold" : ""}`}>
                {shortName}
              </span>
            </div>

            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full transition-colors ${
                isSelected
                  ? "bg-harvest-500 text-espresso-950 font-bold"
                  : preset.default_salinity === "severe"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : preset.default_salinity === "high"
                  ? "bg-orange-100 text-orange-900 border border-orange-200"
                  : "bg-paper-100 text-espresso-600 border border-paper-200"
              }`}
            >
              {salinityBadge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
