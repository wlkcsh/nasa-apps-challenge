"use client";

import React, { useState, useRef, useEffect } from "react";
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
  ThermometerSun,
  Layers,
  Leaf,
  Coins,
  Shield,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import { CropId, CropTrait, FarmerPriority, PriorityWeights, SalinityLevel, WhatIfScenario } from "@/types/api";

interface AgronomicControlsProps {
  cropsList?: CropTrait[];
  currentRotation: string[];
  salinity: SalinityLevel;
  priorities: PriorityWeights;
  scenario: WhatIfScenario;
  loading: boolean;
  onRotationChange: (rotation: string[]) => void;
  onSalinityChange: (salinity: SalinityLevel) => void;
  onPrioritiesChange: (priorities: PriorityWeights) => void;
  onScenarioChange: (scenario: WhatIfScenario) => void;
  onSubmit: () => void;
}

const DEFAULT_CROPS: CropTrait[] = [
  { id: "cotton", name: "Cotton", uzbek_name: "G'o'za (Paxta)", season: "summer", role: "Cash Crop", water_need_mm: 700, heat_thr_c: 38, salinity_tolerance: 3, nitrogen_delta: -2, sowing_window: "", harvest_window: "" },
  { id: "winter_wheat", name: "Winter Wheat", uzbek_name: "Kuzgi Bug'doy", season: "winter", role: "Grain", water_need_mm: 450, heat_thr_c: 32, salinity_tolerance: 3, nitrogen_delta: -1, sowing_window: "", harvest_window: "" },
  { id: "alfalfa", name: "Alfalfa", uzbek_name: "Beda", season: "perennial", role: "Forage & N-Fixer", water_need_mm: 650, heat_thr_c: 36, salinity_tolerance: 4, nitrogen_delta: 3, sowing_window: "", harvest_window: "" },
  { id: "mung_bean", name: "Mung Bean", uzbek_name: "Mosh", season: "summer", role: "Legume & N-Fixer", water_need_mm: 280, heat_thr_c: 35, salinity_tolerance: 2, nitrogen_delta: 2, sowing_window: "", harvest_window: "" },
  { id: "sorghum", name: "Grain Sorghum", uzbek_name: "Jo'xori", season: "summer", role: "Grain & Forage", water_need_mm: 380, heat_thr_c: 38, salinity_tolerance: 4, nitrogen_delta: 0, sowing_window: "", harvest_window: "" },
  { id: "barley", name: "Barley", uzbek_name: "Arpa", season: "winter", role: "Grain", water_need_mm: 360, heat_thr_c: 30, salinity_tolerance: 4, nitrogen_delta: -1, sowing_window: "", harvest_window: "" },
  { id: "maize", name: "Maize", uzbek_name: "Makkajo'xori", season: "summer", role: "Grain & Feed", water_need_mm: 580, heat_thr_c: 35, salinity_tolerance: 2, nitrogen_delta: -2, sowing_window: "", harvest_window: "" },
  { id: "soybean", name: "Soybean", uzbek_name: "Soya", season: "summer", role: "Oilseed & N-Fixer", water_need_mm: 480, heat_thr_c: 34, salinity_tolerance: 2, nitrogen_delta: 2, sowing_window: "", harvest_window: "" },
  { id: "chickpea", name: "Chickpea", uzbek_name: "No'xat", season: "spring", role: "Food Legume", water_need_mm: 260, heat_thr_c: 32, salinity_tolerance: 2, nitrogen_delta: 2, sowing_window: "", harvest_window: "" },
  { id: "sunflower", name: "Sunflower", uzbek_name: "Kungaboqar", season: "summer", role: "Oilseed", water_need_mm: 460, heat_thr_c: 35, salinity_tolerance: 3, nitrogen_delta: -1, sowing_window: "", harvest_window: "" },
  { id: "safflower", name: "Safflower", uzbek_name: "Maxsar", season: "spring", role: "Drought Oilseed", water_need_mm: 290, heat_thr_c: 36, salinity_tolerance: 4, nitrogen_delta: 0, sowing_window: "", harvest_window: "" },
  { id: "millet", name: "Millet", uzbek_name: "Tariq", season: "summer", role: "Drought Cereal", water_need_mm: 240, heat_thr_c: 38, salinity_tolerance: 3, nitrogen_delta: 0, sowing_window: "", harvest_window: "" },
  { id: "hairy_vetch", name: "Hairy Vetch", uzbek_name: "Tukli vika", season: "cover", role: "Green Manure", water_need_mm: 200, heat_thr_c: 30, salinity_tolerance: 2, nitrogen_delta: 3, sowing_window: "", harvest_window: "" },
  { id: "melon", name: "Melon / Watermelon", uzbek_name: "Qovun / Tarvuz", season: "summer", role: "Cash Fruit", water_need_mm: 420, heat_thr_c: 38, salinity_tolerance: 3, nitrogen_delta: -1, sowing_window: "", harvest_window: "" },
  { id: "potato", name: "Potato", uzbek_name: "Kartoshka", season: "spring", role: "Vegetable", water_need_mm: 450, heat_thr_c: 28, salinity_tolerance: 1, nitrogen_delta: -1, sowing_window: "", harvest_window: "" },
  { id: "sugar_beet", name: "Sugar Beet", uzbek_name: "Qand lavlagi", season: "spring", role: "Industrial", water_need_mm: 680, heat_thr_c: 32, salinity_tolerance: 4, nitrogen_delta: -2, sowing_window: "", harvest_window: "" },
];

const PROFILES: Record<string, { label: string; weights: PriorityWeights }> = {
  balanced: {
    label: "Balanced",
    weights: { water_saving: 5, soil_om: 5, nitrogen: 5, erosion: 5, forage: 5, income: 5 },
  },
  water_saver: {
    label: "Water Saver",
    weights: { water_saving: 9, soil_om: 6, nitrogen: 4, erosion: 5, forage: 3, income: 4 },
  },
  soil_builder: {
    label: "Soil Builder",
    weights: { water_saving: 5, soil_om: 9, nitrogen: 9, erosion: 8, forage: 4, income: 3 },
  },
  cash_cropper: {
    label: "Cash Income",
    weights: { water_saving: 4, soil_om: 4, nitrogen: 3, erosion: 3, forage: 4, income: 9 },
  },
  forage_focus: {
    label: "Livestock Feed",
    weights: { water_saving: 5, soil_om: 5, nitrogen: 6, erosion: 4, forage: 9, income: 5 },
  },
};

export default function AgronomicControls({
  cropsList = DEFAULT_CROPS,
  currentRotation,
  salinity,
  priorities,
  scenario,
  loading,
  onRotationChange,
  onSalinityChange,
  onPrioritiesChange,
  onScenarioChange,
  onSubmit,
}: AgronomicControlsProps) {
  const [activeProfile, setActiveProfile] = useState<string>("balanced");
  const [showAdvancedPriorities, setShowAdvancedPriorities] = useState<boolean>(false);
  const [showWhatIf, setShowWhatIf] = useState<boolean>(scenario.rain_pct !== 0 || scenario.temp_c !== 0 || scenario.supply < 1.0);
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);
  const [cropSearch, setCropSearch] = useState<string>("");
  const [cropCategory, setCropCategory] = useState<string>("all");
  const sequenceContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sequenceContainerRef.current && !sequenceContainerRef.current.contains(e.target as Node)) {
        setOpenSlotIndex(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenSlotIndex(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const availableCrops = cropsList && cropsList.length > 0 ? cropsList : DEFAULT_CROPS;

  const filteredCrops = availableCrops.filter((c) => {
    const q = cropSearch.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      c.name.toLowerCase().includes(q) ||
      c.uzbek_name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (cropCategory === "all") return true;
    if (cropCategory === "legume") {
      return (c.nitrogen_delta ?? 0) > 0 || c.role?.toLowerCase().includes("legume") || c.role?.toLowerCase().includes("n-fixer");
    }
    if (cropCategory === "grain") {
      return c.role?.toLowerCase().includes("grain") || ["wheat", "barley", "maize", "sorghum", "millet"].some((k) => c.id.includes(k));
    }
    if (cropCategory === "cover") {
      return c.role?.toLowerCase().includes("cover") || c.role?.toLowerCase().includes("manure") || c.season === "cover";
    }
    if (cropCategory === "cash") {
      return c.role?.toLowerCase().includes("cash") || c.role?.toLowerCase().includes("oil") || c.role?.toLowerCase().includes("fruit") || c.id === "cotton";
    }
    return true;
  });

  const handleProfileSelect = (pKey: string) => {
    setActiveProfile(pKey);
    const p = PROFILES[pKey];
    if (p) {
      onPrioritiesChange(p.weights);
    }
  };

  const handleCropSlotChange = (index: number, newCropId: string) => {
    const updated = [...currentRotation];
    if (newCropId === "remove") {
      updated.splice(index, 1);
      setOpenSlotIndex(null);
    } else {
      updated[index] = newCropId;
    }
    onRotationChange(updated);
  };

  const handleAddSlot = () => {
    if (currentRotation.length < 3) {
      onRotationChange([...currentRotation, "mung_bean"]);
    }
  };

  const getCropName = (cid: string) => {
    const found = availableCrops.find((c) => c.id === cid);
    return found ? `${found.name} (${found.uzbek_name})` : cid;
  };

  return (
    <div className="bg-white/95 border border-paper-300 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-8">
      {/* 1. Header Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-paper-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-harvest-600 text-xs font-mono font-semibold tracking-wider uppercase">
            <SlidersHorizontal className="w-4 h-4 text-harvest-600" />
            <span>Multi-Crop Sequence & Agronomic Cockpit</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase text-espresso-950 tracking-tight font-sans">
            Field Configuration & Scenario Engine
          </h2>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-espresso-950 hover:bg-espresso-800 text-paper-50 font-bold text-xs uppercase tracking-widest cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-harvest-400" />
              <span>Computing 500+ Simulations...</span>
            </>
          ) : (
            <>
              <span>Run Scientific Analysis</span>
              <ArrowRight className="w-3.5 h-3.5 text-harvest-400" />
            </>
          )}
        </button>
      </div>

      {/* 2. Multi-Crop Rotation Sequence Builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono uppercase tracking-wider text-espresso-700 font-bold flex items-center gap-2">
            <Wheat className="w-3.5 h-3.5 text-harvest-600" />
            <span>Step 1. Your Current Crop Rotation Sequence (1–3 Seasons)</span>
          </label>
          <span className="text-[11px] font-mono text-espresso-500">
            {currentRotation.length} of 3 seasons configured
          </span>
        </div>

        {/* Visual Sequence Chain with Bespoke Option Listing Popover */}
        <div ref={sequenceContainerRef} className="relative p-3.5 bg-paper-100 rounded-2xl border border-paper-300">
          <div className="flex flex-wrap items-center gap-2.5">
            {currentRotation.map((cId, idx) => {
              const cropMeta = availableCrops.find((c) => c.id === cId);
              const isOpen = openSlotIndex === idx;

              return (
                <React.Fragment key={`${cId}-${idx}`}>
                  <div className="flex items-center bg-white rounded-xl border border-paper-300 shadow-sm overflow-hidden hover:border-harvest-400 transition-all">
                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenSlotIndex(isOpen ? null : idx);
                        setCropSearch("");
                        setCropCategory("all");
                      }}
                      style={{ transitionTimingFunction: "var(--spring-snappy)" }}
                      className={`flex items-center gap-2 px-3 py-2 text-xs transition-all cursor-pointer active:scale-[0.98] ${
                        isOpen
                          ? "bg-harvest-50/80 text-espresso-950"
                          : "hover:bg-paper-50 text-espresso-950"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-harvest-100 text-harvest-800 text-[10px] font-bold font-mono flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-xs font-sans text-espresso-950 leading-tight">
                          {cropMeta?.name || cId}
                        </span>
                        <span className="text-[10px] text-espresso-600 font-sans leading-tight">
                          {cropMeta?.uzbek_name}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-espresso-500 transition-transform duration-200 shrink-0 ml-1 ${
                          isOpen ? "rotate-180 text-harvest-600" : ""
                        }`}
                      />
                    </button>

                    {/* Slot Remove Button */}
                    {currentRotation.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleCropSlotChange(idx, "remove")}
                        title="Remove season slot"
                        className="px-2 py-2 text-espresso-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-l border-paper-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {idx < currentRotation.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-harvest-600 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}

            {currentRotation.length < 3 && (
              <button
                type="button"
                onClick={handleAddSlot}
                style={{ transitionTimingFunction: "var(--spring-snappy)" }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-harvest-400 text-harvest-700 hover:bg-harvest-50 text-xs font-semibold font-mono transition-all cursor-pointer active:scale-[0.97]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Season Slot</span>
              </button>
            )}
          </div>

          {/* Bespoke Option Listing Popover */}
          {openSlotIndex !== null && (
            <div
              style={{ animation: "fadeInScale 180ms var(--spring-snappy) forwards" }}
              className="absolute top-full left-0 right-0 mt-2 z-50 w-full rounded-2xl bg-white border border-paper-300 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header with Search */}
              <div className="p-3 bg-paper-50 border-b border-paper-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-harvest-100 text-harvest-800 text-[10px] font-bold font-mono flex items-center justify-center shrink-0">
                      {openSlotIndex + 1}
                    </span>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-harvest-700 font-bold">
                      Select Crop · Season Slot {openSlotIndex + 1}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenSlotIndex(null)}
                    className="p-1 rounded-md text-espresso-400 hover:text-espresso-800 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-espresso-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={cropSearch}
                    onChange={(e) => setCropSearch(e.target.value)}
                    placeholder="Filter 20 crops (wheat, mosh, alfalfa)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-paper-300 text-xs text-espresso-950 placeholder:text-espresso-400 focus:outline-none focus:ring-1 focus:ring-harvest-500 font-sans"
                    autoFocus
                  />
                </div>

                {/* Category Filter Chips */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                  {[
                    { id: "all", label: "All (20)" },
                    { id: "grain", label: "🌾 Grains" },
                    { id: "legume", label: "🌱 Legumes" },
                    { id: "cash", label: "🌻 Cash/Oil" },
                    { id: "cover", label: "🛡️ Cover" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCropCategory(cat.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        cropCategory === cat.id
                          ? "bg-espresso-950 text-paper-50"
                          : "bg-paper-200/70 text-espresso-700 hover:bg-paper-300"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Crop Options List */}
              <div className="max-h-64 overflow-y-auto divide-y divide-paper-100 p-1.5">
                {filteredCrops.length === 0 ? (
                  <div className="p-4 text-center text-xs text-espresso-500 font-mono">
                    No matching crops found.
                  </div>
                ) : (
                  filteredCrops.map((c) => {
                    const isCurrent = c.id === currentRotation[openSlotIndex];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          handleCropSlotChange(openSlotIndex, c.id);
                          setOpenSlotIndex(null);
                        }}
                        className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          isCurrent
                            ? "bg-harvest-50 text-espresso-950 font-bold border border-harvest-400/30"
                            : "hover:bg-paper-100 text-espresso-900"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs font-sans text-espresso-950">
                              {c.name}
                            </span>
                            {c.role && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-paper-200 text-espresso-700">
                                {c.role}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-espresso-600 font-sans mt-0.5">
                            {c.uzbek_name}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-espresso-600 bg-paper-200 px-1.5 py-0.5 rounded">
                            {c.water_need_mm} mm
                          </span>
                          {c.nitrogen_delta !== 0 && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                (c.nitrogen_delta ?? 0) > 0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-paper-200 text-espresso-600"
                              }`}
                            >
                              {(c.nitrogen_delta ?? 0) > 0 ? `+${c.nitrogen_delta}N` : `${c.nitrogen_delta}N`}
                            </span>
                          )}
                          {isCurrent && (
                            <Check className="w-4 h-4 text-harvest-600 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Farmer Priorities Tuning */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono uppercase tracking-wider text-espresso-700 font-bold flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-harvest-600" />
            <span>Step 2. Farmer Optimization Priorities (Goal Weights)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowAdvancedPriorities(!showAdvancedPriorities)}
            className="text-xs font-mono text-harvest-700 hover:underline cursor-pointer"
          >
            {showAdvancedPriorities ? "Hide Detailed Sliders" : "Customize 6 Weights →"}
          </button>
        </div>

        {/* Quick Profile Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(PROFILES).map(([key, prof]) => {
            const isSelected = activeProfile === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleProfileSelect(key)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-espresso-950 text-paper-50 border-espresso-950 shadow-md font-bold"
                    : "bg-paper-50 hover:bg-white text-espresso-700 border-paper-300 hover:border-paper-400"
                }`}
              >
                {prof.label}
              </button>
            );
          })}
        </div>

        {/* Detailed 6 Priority Sliders */}
        {showAdvancedPriorities && (
          <div className="p-5 bg-paper-50 rounded-2xl border border-paper-300 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Environmental Group */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-harvest-700 flex items-center gap-1.5 border-b border-paper-200 pb-1.5">
                <Leaf className="w-3.5 h-3.5" />
                <span>Environmental Resilience</span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-espresso-900 font-medium">
                  <span>Water Conservation</span>
                  <span className="font-mono font-bold text-harvest-600">{priorities.water_saving}/10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={priorities.water_saving}
                  onChange={(e) => onPrioritiesChange({ ...priorities, water_saving: Number(e.target.value) })}
                  className="w-full accent-harvest-600 cursor-pointer mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-espresso-900 font-medium">
                  <span>Soil Organic Matter</span>
                  <span className="font-mono font-bold text-harvest-600">{priorities.soil_om}/10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={priorities.soil_om}
                  onChange={(e) => onPrioritiesChange({ ...priorities, soil_om: Number(e.target.value) })}
                  className="w-full accent-harvest-600 cursor-pointer mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-espresso-900 font-medium">
                  <span>Nitrogen Fixation</span>
                  <span className="font-mono font-bold text-harvest-600">{priorities.nitrogen}/10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={priorities.nitrogen}
                  onChange={(e) => onPrioritiesChange({ ...priorities, nitrogen: Number(e.target.value) })}
                  className="w-full accent-harvest-600 cursor-pointer mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-espresso-900 font-medium">
                  <span>Erosion Reduction (Bare Soil Cover)</span>
                  <span className="font-mono font-bold text-harvest-600">{priorities.erosion}/10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={priorities.erosion}
                  onChange={(e) => onPrioritiesChange({ ...priorities, erosion: Number(e.target.value) })}
                  className="w-full accent-harvest-600 cursor-pointer mt-1"
                />
              </div>
            </div>

            {/* Economic Group */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-harvest-700 flex items-center gap-1.5 border-b border-paper-200 pb-1.5">
                <Coins className="w-3.5 h-3.5" />
                <span>Economic & Livestock Return</span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-espresso-900 font-medium">
                  <span>Cash Crop Income</span>
                  <span className="font-mono font-bold text-harvest-600">{priorities.income}/10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={priorities.income}
                  onChange={(e) => onPrioritiesChange({ ...priorities, income: Number(e.target.value) })}
                  className="w-full accent-harvest-600 cursor-pointer mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-espresso-900 font-medium">
                  <span>Forage & Livestock Feed Yield</span>
                  <span className="font-mono font-bold text-harvest-600">{priorities.forage}/10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={priorities.forage}
                  onChange={(e) => onPrioritiesChange({ ...priorities, forage: Number(e.target.value) })}
                  className="w-full accent-harvest-600 cursor-pointer mt-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. What-If Scenario Stress Testing */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono uppercase tracking-wider text-espresso-700 font-bold flex items-center gap-2">
            <ThermometerSun className="w-3.5 h-3.5 text-harvest-600" />
            <span>Step 3. What-If Stress Scenarios (Simulate Climate & Canal Water Cuts)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowWhatIf(!showWhatIf)}
            className="text-xs font-mono text-harvest-700 hover:underline cursor-pointer"
          >
            {showWhatIf ? "Hide Sliders" : "Configure What-If →"}
          </button>
        </div>

        {showWhatIf && (
          <div className="p-5 bg-paper-50 rounded-2xl border border-paper-300 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between text-xs text-espresso-900 font-medium">
                <span>Rainfall Anomaly</span>
                <span className="font-mono font-bold text-harvest-600">{scenario.rain_pct > 0 ? `+${scenario.rain_pct}` : scenario.rain_pct}%</span>
              </div>
              <input
                type="range"
                min="-30"
                max="20"
                step="5"
                value={scenario.rain_pct}
                onChange={(e) => onScenarioChange({ ...scenario, rain_pct: Number(e.target.value) })}
                className="w-full accent-harvest-600 cursor-pointer mt-1.5"
              />
              <span className="text-[10px] text-espresso-500 font-mono">-30% drought to +20% wet anomaly</span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-espresso-900 font-medium">
                <span>Temperature Warming</span>
                <span className="font-mono font-bold text-harvest-600">+{scenario.temp_c.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="3.0"
                step="0.5"
                value={scenario.temp_c}
                onChange={(e) => onScenarioChange({ ...scenario, temp_c: Number(e.target.value) })}
                className="w-full accent-harvest-600 cursor-pointer mt-1.5"
              />
              <span className="text-[10px] text-espresso-500 font-mono">0.0°C to +3.0°C climate shift</span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-espresso-900 font-medium">
                <span>Irrigation Water Quota</span>
                <span className="font-mono font-bold text-harvest-600">{Math.round(scenario.supply * 100)}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={Math.round(scenario.supply * 100)}
                onChange={(e) => onScenarioChange({ ...scenario, supply: Number(e.target.value) / 100.0 })}
                className="w-full accent-harvest-600 cursor-pointer mt-1.5"
              />
              <span className="text-[10px] text-espresso-500 font-mono">Simulates canal delivery deficits</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
