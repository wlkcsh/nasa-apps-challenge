"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Satellite,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  ArrowDown,
  Sparkles,
  Layers,
  ThermometerSun,
  Droplets,
  Sprout,
  Activity,
  Compass,
  ArrowRight,
} from "lucide-react";
import {
  AnalyzeFieldResponse,
  CropId,
  FarmerPriority,
  PresetLocation,
  SalinityLevel,
} from "@/types/api";
import PresetSelector from "@/components/PresetSelector";
import ClimateCharts from "@/components/ClimateCharts";
import RotationTimeline from "@/components/RotationTimeline";
import AgronomicControls from "@/components/AgronomicControls";
import MissionSeal from "@/components/MissionSeal";
import IntroGate from "@/components/intro/IntroGate";
import AralSitesWheel from "@/components/AralSitesWheel";

const FarmMap = dynamic(() => import("@/components/FarmMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] lg:h-[580px] w-full rounded-2xl bg-paper-200/80 border border-paper-300 flex flex-col items-center justify-center text-xs text-espresso-600 gap-3">
      <div className="p-3.5 rounded-full bg-harvest-100 text-harvest-700 border border-harvest-400/30 animate-spin">
        <Satellite className="w-6 h-6 text-harvest-600" />
      </div>
      <span className="font-mono text-espresso-700 text-xs tracking-wider">
        Initializing Planetary Satellite Canvas...
      </span>
    </div>
  ),
});

const API_BASE = "http://localhost:8000";

export default function DashboardPage() {
  const [presets, setPresets] = useState<PresetLocation[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>("nukus");
  const [lat, setLat] = useState<number>(42.4602);
  const [lon, setLon] = useState<number>(59.6166);
  const [currentCrop, setCurrentCrop] = useState<CropId>("cotton");
  const [salinity, setSalinity] = useState<SalinityLevel>("severe");
  const [priority, setPriority] = useState<FarmerPriority>("conserve_water");
  const [climateStress, setClimateStress] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AnalyzeFieldResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [shouldFlyTo, setShouldFlyTo] = useState<boolean>(false);

  const engineSectionRef = useRef<HTMLDivElement>(null);

  const runAnalysis = useCallback(
    async (
      qLat: number,
      qLon: number,
      qCrop: CropId,
      qSalinity: SalinityLevel,
      qPriority: FarmerPriority,
      qStress: boolean = false
    ) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/analyze-field`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: qLat,
            lon: qLon,
            current_crop: qCrop,
            soil_salinity_level: qSalinity,
            farmer_priority: qPriority,
            climate_stress_scenario: qStress,
          }),
        });
        const data: AnalyzeFieldResponse = await res.json();
        setAnalysis(data);
      } catch (err) {
        console.error("Failed to analyze field:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetch(`${API_BASE}/api/presets`)
      .then((r) => r.json())
      .then((list: PresetLocation[]) => setPresets(list))
      .catch(console.error);
    runAnalysis(42.4602, 59.6166, "cotton", "severe", "conserve_water", false);
  }, [runAnalysis]);

  const handleSelectPreset = (p: PresetLocation) => {
    setShouldFlyTo(true);
    setActivePresetId(p.id);
    setLat(p.lat);
    setLon(p.lon);
    setCurrentCrop(p.default_crop);
    setSalinity(p.default_salinity);
    runAnalysis(p.lat, p.lon, p.default_crop, p.default_salinity, priority, climateStress);
  };

  const handleMapClick = (newLat: number, newLon: number) => {
    setShouldFlyTo(false);
    setActivePresetId(null);
    setLat(newLat);
    setLon(newLon);
    runAnalysis(newLat, newLon, currentCrop, salinity, priority, climateStress);
  };

  const handleClimateStressToggle = (checked: boolean) => {
    setClimateStress(checked);
    runAnalysis(lat, lon, currentCrop, salinity, priority, checked);
  };

  const scrollToEngine = () => {
    engineSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const activePreset = presets.find((p) => p.id === activePresetId);
  const hazards = analysis?.regional_hazards || [];

  return (
    <div className="min-h-screen bg-paper-100 text-espresso-900 selection:bg-harvest-500 selection:text-white font-sans antialiased relative">
      {/* 0. FROM HEART TO MARS - SCROLL-DRIVEN 3D INTRO & HERO */}
      <IntroGate />

      {/* 1. FLOATING NAVIGATION BAR (Delta Cafés Colontitle Style) */}
      <header className="fixed top-0 left-0 right-0 z-50 p-3 sm:p-4 pointer-events-none transition-opacity duration-500">
        <div className="max-w-[1680px] mx-auto flex items-center justify-between gap-3">
          {/* Brand Kicker with Mission Seal Pill */}
          <div className="pointer-events-auto flex items-center gap-2.5 bg-white/95 border border-paper-300 px-3.5 py-2 rounded-full shadow-md backdrop-blur-md">
            <div className="p-1 rounded-full bg-harvest-50 text-harvest-600 border border-harvest-500/20">
              <Satellite className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-black tracking-tight text-espresso-950 uppercase font-sans">
                Field Shift
              </span>
              <span className="text-xs font-serif italic text-harvest-600 font-normal">
                Uzbekistan
              </span>
            </div>
            <span className="hidden md:inline-block text-[9px] font-mono px-2 py-0.5 rounded-full bg-paper-200 border border-paper-300 text-espresso-700">
              FHTM • Space Apps 2026
            </span>
          </div>

          {/* Center: Navigation Chapters */}
          <nav className="pointer-events-auto hidden lg:flex items-center gap-1 bg-white/95 border border-paper-300 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md text-xs font-medium">
            <a
              href="#overview"
              className="px-3 py-1 rounded-full text-espresso-700 hover:text-espresso-950 hover:bg-paper-100 transition-colors"
            >
              01. Challenge
            </a>
            <a
              href="#engine"
              className="px-3 py-1 rounded-full text-espresso-700 hover:text-espresso-950 hover:bg-paper-100 transition-colors"
            >
              02. Satellite Cockpit
            </a>
            <a
              href="#rotation"
              className="px-3 py-1 rounded-full text-espresso-700 hover:text-espresso-950 hover:bg-paper-100 transition-colors"
            >
              03. 3-Year Plan
            </a>
            <a
              href="#climatology"
              className="px-3 py-1 rounded-full text-espresso-700 hover:text-espresso-950 hover:bg-paper-100 transition-colors"
            >
              04. Climatology
            </a>
          </nav>

          {/* Right: Telemetry & Live Coordinates Pill */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/95 border border-paper-300 px-3.5 py-1.5 rounded-full text-xs shadow-md backdrop-blur-md">
              <MapPin className="w-3.5 h-3.5 text-harvest-600" />
              <span className="font-mono text-espresso-950 font-semibold text-[11px]">
                {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-harvest-50 border-harvest-500/30 text-harvest-700 text-[10px] font-mono font-bold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-harvest-600 animate-pulse" />
              <span>NASA POWER LIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. GRAND EDITORIAL HERO (Delta Cafés Bürocratik Scale) */}
      <section
        id="overview"
        className="relative min-h-[92dvh] flex flex-col justify-between pt-24 pb-12 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto border-b border-paper-300"
      >
        {/* Top Eyebrow Strip */}
        <div className="flex items-center justify-between gap-4 pt-6 border-t border-paper-300">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tracking-[0.2em] text-harvest-600 uppercase font-semibold">
              NASA Space Apps 2026 Global Challenge
            </span>
            <span className="h-1 w-1 rounded-full bg-harvest-500" />
            <span className="text-[11px] font-mono text-espresso-500 uppercase tracking-widest hidden sm:inline">
              Aral Sea Basin Soil Resilience
            </span>
          </div>

          <div className="text-[11px] font-mono text-espresso-600 hidden sm:block">
            Team: <strong className="text-espresso-950 font-bold">From Heart to Mars (FHTM)</strong>
          </div>
        </div>

        {/* Colossal Display Statement (Delta Cafés Headline Scale) */}
        <div className="my-auto py-10 relative">
          {/* Rotating Mission Seal in Upper Corner */}
          <div className="absolute -top-4 right-2 sm:right-6 lg:right-12 hidden md:block">
            <MissionSeal size={140} />
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-[7.25rem] xl:text-[8.5rem] font-black uppercase tracking-tighter leading-[0.88] text-espresso-950 max-w-[1500px]">
            Turning Arid Dust <br />
            <span className="font-serif italic font-normal text-harvest-600 tracking-tight">
              into Living Fields.
            </span>
          </h1>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <p className="md:col-span-7 text-base sm:text-lg lg:text-xl text-espresso-700 font-serif leading-relaxed">
              Earth Observation and adaptive crop rotation decision platform. Transforming 
              salinized Aral Sea landscapes through NASA POWER agro-climatology and generational 
              Uzbek dehqon agro-ecology.
            </p>

            <div className="md:col-span-5 flex flex-wrap items-center gap-3 md:justify-end">
              <button
                type="button"
                onClick={scrollToEngine}
                className="group flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-espresso-950 hover:bg-espresso-800 text-paper-50 font-bold text-xs uppercase tracking-widest cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
              >
                <span>Launch Satellite Cockpit</span>
                <ArrowDown className="w-4 h-4 text-harvest-400 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom 4-Column Planetary Telemetry Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-paper-300">
          <div className="space-y-1">
            <div className="text-[10px] font-mono tracking-widest text-espresso-500 uppercase font-semibold">
              Aralkum Salt Desert
            </div>
            <div className="text-2xl sm:text-3xl font-serif text-espresso-950 font-bold tabular-nums">
              5.5M <span className="text-xs font-sans text-espresso-600 font-normal">ha</span>
            </div>
            <p className="text-[11px] text-espresso-600">Exposed salinized seabed floor</p>
          </div>

          <div className="space-y-1 md:border-l md:border-paper-300 md:pl-6">
            <div className="text-[10px] font-mono tracking-widest text-clay-600 uppercase font-semibold">
              Cotton Monoculture Deficit
            </div>
            <div className="text-2xl sm:text-3xl font-serif text-clay-600 font-bold tabular-nums">
              900 <span className="text-xs font-sans text-clay-500 font-normal">mm</span>
            </div>
            <p className="text-[11px] text-espresso-600">Unsustainable seasonal irrigation</p>
          </div>

          <div className="space-y-1 md:border-l md:border-paper-300 md:pl-6">
            <div className="text-[10px] font-mono tracking-widest text-sage-600 uppercase font-semibold">
              Water Recovery Target
            </div>
            <div className="text-2xl sm:text-3xl font-serif text-sage-600 font-bold tabular-nums">
              34% <span className="text-xs font-sans text-sage-500 font-normal">saved</span>
            </div>
            <p className="text-[11px] text-espresso-600">+1,400 mm/ha net savings over 3 yrs</p>
          </div>

          <div className="space-y-1 md:border-l md:border-paper-300 md:pl-6">
            <div className="text-[10px] font-mono tracking-widest text-harvest-600 uppercase font-semibold">
              Root-Zone ECe Index
            </div>
            <div className="text-2xl sm:text-3xl font-serif text-espresso-950 font-bold tabular-nums">
              8+ <span className="text-xs font-sans text-espresso-600 font-normal">dS/m</span>
            </div>
            <p className="text-[11px] text-espresso-600">Critical solonchak salinity threshold</p>
          </div>
        </div>
      </section>

      {/* 3. CHAPTER 01: THE ARAL BASIN DOSSIER */}
      <section className="py-20 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto border-b border-paper-300">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-harvest-100 border border-harvest-500/30 text-[10px] font-mono text-harvest-700 uppercase tracking-widest font-semibold">
              <span>Chapter 01</span>
              <span>•</span>
              <span>Terrestrial Mars Analog</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-espresso-950 leading-[0.95]">
              Where A Sea Vanished, <br />
              <span className="font-serif italic font-normal text-harvest-600">
                Pioneering Crops Rise.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-espresso-700 font-serif leading-relaxed">
              The desiccated Aral Sea basin has become the youngest desert on Earth, the Aralkum. 
              Salt storms blow toxic dust across thousands of kilometers. Traditional flood 
              irrigation on upland cotton accelerates secondary salinization.
            </p>

            <p className="text-sm text-espresso-600 leading-relaxed">
              Field Shift models an adaptive 3-year succession: deep-taprooted pioneer crops 
              bio-drain shallow saline aquifers in Year 1, leguminous cover crops fix atmospheric 
              nitrogen in Year 2, and high-value cash crops yield clean harvests in Year 3.
            </p>
          </div>

          <div className="lg:col-span-7">
            <AralSitesWheel
              presets={presets}
              activePresetId={activePresetId}
              onSelectPreset={handleSelectPreset}
              onLaunchCockpit={scrollToEngine}
            />
          </div>
        </div>
      </section>

      {/* 4. CHAPTER 02: THE PLANETARY DECISION ENGINE & SATELLITE CANVAS */}
      <div id="farm-map" className="relative -top-24 scroll-mt-24" />
      <section
        id="engine"
        ref={engineSectionRef}
        className="py-16 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto border-b border-paper-300"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-harvest-100 border border-harvest-500/30 text-[10px] font-mono text-harvest-700 uppercase tracking-widest mb-2 font-semibold">
              <span>Chapter 02</span>
              <span>•</span>
              <span>Interactive Decision Cockpit</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-espresso-950">
              Planetary Observation Canvas
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <PresetSelector
              presets={presets}
              activeId={activePresetId}
              onSelectPreset={handleSelectPreset}
            />
          </div>
        </div>

        {/* 12-Column Asymmetric Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Full Satellite Map Window (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="h-[480px] lg:h-[580px] w-full rounded-2xl overflow-hidden border border-paper-300 shadow-md relative">
              <FarmMap
                lat={lat}
                lon={lon}
                presets={presets}
                hazards={hazards}
                onSelectCoord={handleMapClick}
                shouldFlyTo={shouldFlyTo}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-espresso-600 font-mono">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-harvest-600" />
                <span>Click map to inspect any field across Central Asia</span>
              </span>
              <span>
                Target: <strong className="text-espresso-950">{lat.toFixed(4)}°N, {lon.toFixed(4)}°E</strong>
              </span>
            </div>
          </div>

          {/* Right Column: Agronomic Input Console (lg:col-span-5) */}
          <div className="lg:col-span-5">
            <AgronomicControls
              currentCrop={currentCrop}
              salinity={salinity}
              priority={priority}
              climateStress={climateStress}
              loading={loading}
              onCropChange={setCurrentCrop}
              onSalinityChange={setSalinity}
              onPriorityChange={setPriority}
              onClimateStressChange={handleClimateStressToggle}
              onSubmit={() => runAnalysis(lat, lon, currentCrop, salinity, priority, climateStress)}
            />
          </div>
        </div>
      </section>

      {/* 5. CHAPTER 03: THE 4 CORE AGRO-STAT PILLARS & 3-YEAR ROTATION PLAN */}
      <section
        id="rotation"
        className="border-b border-paper-300"
      >
        <div className="pt-16 pb-8 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-harvest-100 border border-harvest-500/30 text-[10px] font-mono text-harvest-700 uppercase tracking-widest mb-2 font-semibold">
            <span>Chapter 03</span>
            <span>•</span>
            <span>Adaptive Progression</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-espresso-950">
            3-Year Successional Architecture
          </h2>
          <p className="mt-2 text-sm sm:text-base text-espresso-700 font-serif max-w-2xl">
            Derived from NASA POWER climatology and root-zone salinity thresholds. 
            Select between water conservation, soil restoration, or cash-flow optimization.
          </p>
        </div>

        {analysis && (
          <RotationTimeline
            strategies={analysis.strategies}
            steps={analysis.rotation_plan}
            metrics={analysis.impact_metrics}
            modisNdvi={activePreset?.modis_mean_ndvi || 0.22}
            smapMoisture={activePreset?.smap_soil_moisture_cm3 || 0.14}
          />
        )}
      </section>

      {/* 6. CHAPTER 04: AGRO-CLIMATOLOGY TRENDS & 2035 SIMULATOR */}
      <section
        id="climatology"
        className="py-16 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto border-b border-paper-300"
      >
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-harvest-100 border border-harvest-500/30 text-[10px] font-mono text-harvest-700 uppercase tracking-widest mb-2 font-semibold">
            <span>Chapter 04</span>
            <span>•</span>
            <span>NASA POWER Climatology</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-espresso-950">
            Thermal and Hydrological Cycles
          </h2>
          <p className="mt-2 text-sm sm:text-base text-espresso-700 font-serif max-w-2xl">
            Monthly solar irradiance, 2-meter air temperature, precipitation totals, 
            and root-zone soil wetness ratios across the selected field coordinates.
          </p>
        </div>

        {analysis && (
          <div className="space-y-4">
            <ClimateCharts climate={analysis.climate} />
          </div>
        )}
      </section>

      {/* 7. EDITORIAL FOOTER & COLOPHON */}
      <footer className="py-16 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 text-xs text-espresso-700 border-t border-paper-300">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-espresso-950 uppercase font-sans">
              Field Shift Uzbekistan
            </span>
            <span className="text-xs font-serif italic text-harvest-600">
              NASA Space Apps 2026
            </span>
          </div>
          <p className="text-xs text-espresso-600 max-w-md">
            Developed by team From Heart to Mars (FHTM). Engineered for arid soil 
            remediation in the Aral Sea Basin and future planetary agro-ecosystems.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <MissionSeal size={90} />
          <div className="text-left font-mono text-[10px] space-y-1">
            <div className="text-harvest-700 font-bold uppercase">Mission Ready</div>
            <div className="text-espresso-800">Status: NASA POWER Verified</div>
            <div className="text-espresso-600">Aral Sea Basin (ECe &gt; 8 dS/m)</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
