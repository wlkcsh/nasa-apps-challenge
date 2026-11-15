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
  CropTrait,
  FarmerPriority,
  PresetLocation,
  PriorityWeights,
  SalinityLevel,
  WhatIfScenario,
} from "@/types/api";
import PresetSelector from "@/components/PresetSelector";
import ClimateCharts from "@/components/ClimateCharts";
import RotationTimeline from "@/components/RotationTimeline";
import RotationMatrix from "@/components/RotationMatrix";
import AgronomicControls from "@/components/AgronomicControls";
import MissionSeal from "@/components/MissionSeal";
import IntroGate from "@/components/intro/IntroGate";
import SuccessionArchitecture from "@/components/SuccessionArchitecture";

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const [presets, setPresets] = useState<PresetLocation[]>([]);
  const [cropsList, setCropsList] = useState<CropTrait[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>("tashkent");
  const [lat, setLat] = useState<number>(41.3110);
  const [lon, setLon] = useState<number>(69.2405);
  const [currentRotation, setCurrentRotation] = useState<string[]>(["winter_wheat", "soybean"]);
  const [salinity, setSalinity] = useState<SalinityLevel>("low");
  const [priorities, setPriorities] = useState<PriorityWeights>({
    water_saving: 8,
    soil_om: 5,
    nitrogen: 5,
    erosion: 5,
    forage: 4,
    income: 5,
  });
  const [scenario, setScenario] = useState<WhatIfScenario>({
    rain_pct: 0,
    temp_c: 0.0,
    supply: 1.0,
  });
  const [analysis, setAnalysis] = useState<AnalyzeFieldResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [shouldFlyTo, setShouldFlyTo] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const lockedSectionRef = useRef<string | null>(null);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });

  const engineSectionRef = useRef<HTMLDivElement>(null);

  const CHAPTERS = [
    { id: "overview", num: "01", label: "Challenge" },
    { id: "engine", num: "02", label: "Satellite Cockpit" },
    { id: "rotation", num: "03", label: "3-Year Plan" },
    { id: "climatology", num: "04", label: "Climatology" },
  ];

  const scrollToSection = useCallback((id: string) => {
    // 1. Immediately switch the active section and indicator pill
    setActiveSection(id);
    lockedSectionRef.current = id;

    // 2. Lock the Scroll Spy so intermediate sections never hijack the pill while in transit
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      lockedSectionRef.current = null;
    }, 950);

    // 3. Smoothly glide to the target section with native GPU compositor acceleration
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 84;
    const elementTop = el.getBoundingClientRect().top + window.pageYOffset;
    const targetY = Math.max(0, elementTop - headerOffset);

    window.scrollTo({
      top: targetY,
      behavior: "smooth",
    });
  }, []);

  const updateIndicator = useCallback(() => {
    if (!navContainerRef.current) return;
    const activeBtn = navContainerRef.current.querySelector<HTMLElement>(
      `[data-nav-id="${activeSection}"]`
    );
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        opacity: 1,
      });
    }
  }, [activeSection]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  // Scroll Spy to track active section for the top navigation bar
  useEffect(() => {
    const sectionIds = ["overview", "engine", "rotation", "climatology"];

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // While locked onto a clicked chapter, intermediate sections are prevented from hijacking the pill
      if (lockedSectionRef.current) {
        const targetEl = document.getElementById(lockedSectionRef.current);
        if (targetEl) {
          const targetY = Math.max(0, targetEl.getBoundingClientRect().top + window.pageYOffset - 84);
          if (Math.abs(window.pageYOffset - targetY) < 25) {
            lockedSectionRef.current = null;
          }
        }
        return;
      }

      const scrollPos = window.scrollY + 280;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(id);
          break;
        }
      }
    };

    const handleUserInterrupt = () => {
      // If user manually touches or scrolls, release lock immediately
      lockedSectionRef.current = null;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleUserInterrupt, { passive: true });
    window.addEventListener("touchmove", handleUserInterrupt, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleUserInterrupt);
      window.removeEventListener("touchmove", handleUserInterrupt);
    };
  }, []);

  const runAnalysis = useCallback(
    async (
      qLat: number,
      qLon: number,
      qRotation: string[],
      qSalinity: SalinityLevel,
      qPriorities: PriorityWeights,
      qScenario: WhatIfScenario
    ) => {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const res = await fetch(`${API_BASE}/api/analyze-field`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            lat: qLat,
            lon: qLon,
            current_rotation: qRotation,
            soil_salinity_level: qSalinity,
            priorities: qPriorities,
            scenario: qScenario,
          }),
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data: AnalyzeFieldResponse = await res.json();
          setAnalysis(data);
        }
      } catch (err) {
        console.error("Failed to analyze field:", err);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-intro-active", "false");
    fetch(`${API_BASE}/api/presets`)
      .then((r) => r.json())
      .then((list: PresetLocation[]) => setPresets(list))
      .catch(console.error);

    fetch(`${API_BASE}/api/crops`)
      .then((r) => r.json())
      .then((list: CropTrait[]) => setCropsList(list))
      .catch(console.error);

    runAnalysis(
      41.3110,
      69.2405,
      ["winter_wheat", "soybean"],
      "low",
      {
        water_saving: 8,
        soil_om: 5,
        nitrogen: 5,
        erosion: 5,
        forage: 4,
        income: 5,
      },
      { rain_pct: 0, temp_c: 0, supply: 1.0 }
    );
  }, [runAnalysis]);

  const handleSelectPreset = (p: PresetLocation) => {
    setShouldFlyTo(true);
    setActivePresetId(p.id);
    setLat(p.lat);
    setLon(p.lon);
    const newRot = p.default_rotation && p.default_rotation.length > 0 ? p.default_rotation : [p.default_crop || "cotton"];
    setCurrentRotation(newRot);
    setSalinity(p.default_salinity);
    runAnalysis(p.lat, p.lon, newRot, p.default_salinity, priorities, scenario);
  };

  const handleMapClick = (newLat: number, newLon: number) => {
    setShouldFlyTo(false);
    setActivePresetId(null);
    setLat(newLat);
    setLon(newLon);
    runAnalysis(newLat, newLon, currentRotation, salinity, priorities, scenario);
  };

  const scrollToEngine = useCallback(() => {
    scrollToSection("engine");
  }, [scrollToSection]);

  const handleRunScientificAnalysis = useCallback(async () => {
    await runAnalysis(lat, lon, currentRotation, salinity, priorities, scenario);
    // Automatically smooth-scroll down to Chapter 03: 3-Year Plan & Decision Matrix
    setTimeout(() => {
      scrollToSection("rotation");
    }, 120);
  }, [lat, lon, currentRotation, salinity, priorities, scenario, runAnalysis, scrollToSection]);

  const activePreset = presets.find((p) => p.id === activePresetId);
  const hazards = analysis?.regional_hazards || [];

  return (
    <div className="min-h-screen bg-paper-100 text-espresso-900 selection:bg-harvest-500 selection:text-white font-sans antialiased relative w-full max-w-full overflow-x-clip">
      {/* 0. FROM HEART TO MARS - SCROLL-DRIVEN 3D INTRO & HERO (Temporarily disabled) */}
      {/* <IntroGate /> */}

      {/* 1. FLOATING NAVIGATION BAR (Delta Cafés Colontitle Style) */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "py-2 sm:py-2.5 px-3 sm:px-6 bg-paper-100/90 backdrop-blur-md border-b border-paper-300/80 shadow-xs pointer-events-auto"
            : "p-3 sm:p-4 bg-transparent pointer-events-none"
        }`}
      >
        <div className="max-w-[1680px] mx-auto flex items-center justify-between gap-3">
          {/* Brand Kicker with Mission Seal Pill */}
          <div className="pointer-events-auto flex items-center gap-2.5 bg-white/95 border border-paper-300 px-3.5 py-2 rounded-full shadow-md backdrop-blur-md">
            <div className="p-1 rounded-full bg-harvest-50 text-harvest-600 border border-harvest-500/20">
              <Satellite className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-black tracking-tight text-espresso-950 uppercase font-sans">
                Agriverto
              </span>
              <span className="text-xs font-serif italic text-harvest-600 font-normal">
                Uzbekistan
              </span>
            </div>
            <span className="hidden md:inline-block text-[9px] font-mono px-2 py-0.5 rounded-full bg-paper-200 border border-paper-300 text-espresso-700">
              FHTM • Space Apps 2026
            </span>
          </div>

          {/* Center: Navigation Chapters with Animated Sliding Pill */}
          <nav
            ref={navContainerRef}
            className="pointer-events-auto hidden lg:flex items-center gap-1 bg-white/95 border border-paper-300 p-1.5 rounded-full shadow-md backdrop-blur-md text-xs font-medium relative"
          >
            {/* Sliding Active Pill Background with Spring Kinetics */}
            <div
              className="absolute top-1.5 bottom-1.5 rounded-full bg-espresso-950 shadow-sm pointer-events-none transition-all duration-300"
              style={{
                transform: `translateX(${indicatorStyle.left}px)`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity,
                transitionTimingFunction: "var(--spring-snappy)",
              }}
            />

            {CHAPTERS.map((ch) => {
              const isActive = activeSection === ch.id;
              return (
                <button
                  key={ch.id}
                  data-nav-id={ch.id}
                  type="button"
                  onClick={() => scrollToSection(ch.id)}
                  className={`relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors duration-200 cursor-pointer ${
                    isActive
                      ? "text-paper-50 font-bold"
                      : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100/50"
                  }`}
                >
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-harvest-400 shrink-0 animate-pulse" />
                  )}
                  <span>
                    {ch.num}. {ch.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Mobile Active Section Button with Smooth Animated Scroll */}
          <button
            type="button"
            onClick={() => {
              const currIdx = CHAPTERS.findIndex((c) => c.id === activeSection);
              const nextIdx = (currIdx + 1) % CHAPTERS.length;
              scrollToSection(CHAPTERS[nextIdx].id);
            }}
            className="lg:hidden pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-paper-300 shadow-md backdrop-blur-md text-xs font-mono font-bold text-espresso-950 active:scale-95 transition-transform cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-harvest-500 animate-pulse" />
            <span>
              {CHAPTERS.find((c) => c.id === activeSection)?.num}. {CHAPTERS.find((c) => c.id === activeSection)?.label}
            </span>
          </button>

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
        className="relative min-h-[92dvh] flex flex-col justify-between pt-24 pb-12 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto border-b border-paper-300 scroll-mt-24"
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
        <div className="my-auto py-8 sm:py-10 relative">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 lg:gap-8">
            <h1 className="text-4xl sm:text-6xl md:text-[4.75rem] lg:text-[5.5rem] xl:text-[6.5rem] 2xl:text-[7.75rem] font-black uppercase tracking-tighter leading-[0.88] text-espresso-950 flex-1 min-w-0">
              Turning Arid Dust <br />
              <span className="font-serif italic font-normal text-harvest-600 tracking-tight">
                into Living Fields.
              </span>
            </h1>

            {/* Rotating Mission Seal in Upper Corner (Clean Non-Colliding Layout) */}
            <div className="hidden md:flex flex-col items-center justify-center shrink-0 pt-1 lg:pt-2">
              <MissionSeal size={124} />
            </div>
          </div>

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

      {/* 3. CHAPTER 01: THE ARAL BASIN DOSSIER & SUCCESSION BLUEPRINT */}
      <section className="py-20 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto border-b border-paper-300">
        <div className="max-w-4xl mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-harvest-100 border border-harvest-500/30 text-[10px] font-mono text-harvest-700 uppercase tracking-widest font-semibold">
            <span>Chapter 01</span>
            <span>•</span>
            <span>Terrestrial Mars Analog & Soil Succession</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-espresso-950 leading-[0.95]">
            Where A Sea Vanished, <br />
            <span className="font-serif italic font-normal text-harvest-600">
              Pioneering Crops Rise.
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 text-espresso-700 font-serif leading-relaxed">
            <p className="text-sm sm:text-base">
              The desiccated Aral Sea basin has become the youngest desert on Earth, the Aralkum. 
              Salt storms blow toxic dust across thousands of kilometers. Traditional flood 
              irrigation on upland cotton accelerates secondary salinization.
            </p>
            <p className="text-sm sm:text-base text-espresso-600">
              Agriverto models an adaptive 3-year biological succession: deep-taprooted pioneer crops 
              bio-drain shallow saline aquifers in Year 1, leguminous cover crops fix atmospheric 
              nitrogen in Year 2, and high-value cash crops yield clean harvests in Year 3.
            </p>
          </div>
        </div>

        <div className="w-full max-w-full min-w-0">
          <SuccessionArchitecture onLaunchCockpit={scrollToEngine} />
        </div>
      </section>

      {/* 4. CHAPTER 02: THE PLANETARY DECISION ENGINE & SATELLITE CANVAS */}
      <div id="farm-map" className="relative -top-24 scroll-mt-24" />
      <section
        id="engine"
        ref={engineSectionRef}
        className="py-16 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto border-b border-paper-300 w-full max-w-full min-w-0 scroll-mt-24"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8 w-full max-w-full min-w-0">
          <div className="shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-harvest-100 border border-harvest-500/30 text-[10px] font-mono text-harvest-700 uppercase tracking-widest mb-2 font-semibold">
              <span>Chapter 02</span>
              <span>•</span>
              <span>Interactive Decision Cockpit</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-espresso-950">
              Planetary Observation Canvas
            </h2>
          </div>

          <div className="w-full lg:max-w-2xl xl:max-w-3xl min-w-0 overflow-hidden bg-white/80 p-1.5 rounded-2xl sm:rounded-full border border-paper-300 shadow-sm backdrop-blur-sm">
            <PresetSelector
              presets={presets}
              activeId={activePresetId}
              onSelectPreset={handleSelectPreset}
            />
          </div>
        </div>

        {/* 12-Column Asymmetric Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full max-w-full min-w-0">
          {/* Left Column: Full Satellite Map Window (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-3 w-full max-w-full min-w-0 relative z-10">
            <div className="h-[480px] lg:h-[580px] w-full rounded-2xl overflow-hidden border border-paper-300 shadow-md relative">
              <FarmMap
                lat={lat}
                lon={lon}
                presets={presets}
                hazards={hazards}
                gibsLayers={analysis?.gibs_layers}
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
          <div className="lg:col-span-5 w-full max-w-full min-w-0 relative z-20">
            <AgronomicControls
              cropsList={cropsList}
              currentRotation={currentRotation}
              salinity={salinity}
              priorities={priorities}
              scenario={scenario}
              loading={loading}
              onRotationChange={setCurrentRotation}
              onSalinityChange={setSalinity}
              onPrioritiesChange={setPriorities}
              onScenarioChange={setScenario}
              onSubmit={handleRunScientificAnalysis}
            />
          </div>
        </div>
      </section>

      {/* 5. CHAPTER 03: THE 4 CORE AGRO-STAT PILLARS & 3-YEAR ROTATION PLAN */}
      <section
        id="rotation"
        className="border-b border-paper-300 w-full max-w-full min-w-0 scroll-mt-24"
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
          <div className="pb-16 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto">
            {analysis.candidates && analysis.candidates.length > 0 && (
              <RotationMatrix
                candidates={analysis.candidates}
                recommendationSummary={analysis.ai_recommendation_summary}
                contractsDisclaimer={analysis.contracts_disclaimer}
                lowYieldRiskNote={analysis.low_yield_risk_note}
                strategies={analysis.strategies}
                steps={analysis.rotation_plan}
                metrics={analysis.impact_metrics}
                modisNdvi={activePreset?.modis_mean_ndvi || 0.22}
                smapMoisture={activePreset?.smap_soil_moisture_cm3 || 0.14}
              />
            )}
          </div>
        )}
      </section>

      {/* 6. CHAPTER 04: AGRO-CLIMATOLOGY TRENDS & 2035 SIMULATOR */}
      <section
        id="climatology"
        className="py-16 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto border-b border-paper-300 w-full max-w-full min-w-0 scroll-mt-24"
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
            9-metric agro-climatological ledger with Theil-Sen statistical decadal trends, 
            FAO-56 Penman-Monteith evaporative balance, and ISRIC SoilGrids 250m survey.
          </p>
        </div>

        {analysis && (
          <div className="space-y-4">
            <ClimateCharts
              climate={analysis.climate}
              kpis={analysis.kpis}
              soilProfile={analysis.soil_profile}
              waterBalance={analysis.water_balance_monthly}
            />
          </div>
        )}
      </section>

      {/* 7. EDITORIAL FOOTER & COLOPHON */}
      <footer className="py-16 px-4 sm:px-8 lg:px-12 max-w-[1680px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 text-xs text-espresso-700 border-t border-paper-300">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-espresso-950 uppercase font-sans">
              Agriverto Uzbekistan
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
