"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Compass,
  ArrowRight,
  Layers,
  Sparkles,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  Disc3,
  Satellite,
  Activity,
} from "lucide-react";
import { PresetLocation } from "@/types/api";

interface AralSitesWheelProps {
  presets: PresetLocation[];
  activePresetId: string | null;
  onSelectPreset: (preset: PresetLocation) => void;
  onLaunchCockpit?: () => void;
}

// Geometric & Mathematical Constants based on works-wheel-3d
const STEP = 42; // Degrees between successive cards on the drum
const DRUM_R = 360; // Cylinder radius in px
const BOW = 85; // Lateral parabolic bow offset in px
const DAMPING = 0.12; // Inertial lerp decay factor
const FRUSTUM_CUTOFF = 85; // Angular cutoff in degrees for frustum culling

const rad = (deg: number) => (deg * Math.PI) / 180;
const bowAt = (drumDeg: number, bow: number) =>
  -bow * (1 - Math.cos(rad(drumDeg)));

function computeTransform(drumDeg: number): string {
  const bowOffset = bowAt(drumDeg, BOW);
  return (
    `translateX(${bowOffset.toFixed(2)}px) ` +
    `rotateX(${drumDeg.toFixed(2)}deg) ` +
    `translateZ(${DRUM_R.toFixed(2)}px)`
  );
}

export default function AralSitesWheel({
  presets,
  activePresetId,
  onSelectPreset,
  onLaunchCockpit,
}: AralSitesWheelProps) {
  const [viewMode, setViewMode] = useState<"reel" | "grid">("reel");
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const currentOffsetRef = useRef<number>(0);
  const targetOffsetRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Sync activeIndex with external activePresetId
  useEffect(() => {
    if (!activePresetId || presets.length === 0) return;
    const foundIdx = presets.findIndex((p) => p.id === activePresetId);
    if (foundIdx !== -1 && foundIdx !== activeIndex) {
      setActiveIndex(foundIdx);
      targetOffsetRef.current = -foundIdx * STEP;
      // Trigger animation frame if not already running
      if (!animFrameIdRef.current) {
        animFrameIdRef.current = requestAnimationFrame(tick);
      }
    }
  }, [activePresetId, presets]);

  // Imperative render loop: directly mutates card transforms without React VDOM re-renders
  const renderCards = useCallback(
    (offset: number) => {
      const total = presets.length;
      if (total === 0) return;

      presets.forEach((_, idx) => {
        const cardEl = cardRefs.current[idx];
        if (!cardEl) return;

        const baseAngle = idx * STEP;
        const drumDeg = baseAngle + offset;

        // Angular Frustum Culling: Hide cards rotated beyond visible front hemisphere
        if (Math.abs(drumDeg) > FRUSTUM_CUTOFF) {
          cardEl.style.display = "none";
          return;
        }

        cardEl.style.display = "block";
        const transform = computeTransform(drumDeg);
        cardEl.style.transform = transform;

        // Cosine distance factor for depth-based opacity and scale decay
        const cosFactor = Math.cos(rad(drumDeg));
        const opacity = Math.max(0.18, Math.pow(cosFactor, 2.2));
        cardEl.style.opacity = opacity.toFixed(3);

        const isCenter = Math.abs(drumDeg) < STEP * 0.45;
        cardEl.style.zIndex = isCenter ? "30" : "10";
      });
    },
    [presets]
  );

  const tick = useCallback(() => {
    animFrameIdRef.current = null;
    const diff = targetOffsetRef.current - currentOffsetRef.current;

    if (Math.abs(diff) > 0.04) {
      currentOffsetRef.current += diff * DAMPING;
      renderCards(currentOffsetRef.current);
      animFrameIdRef.current = requestAnimationFrame(tick);
    } else {
      currentOffsetRef.current = targetOffsetRef.current;
      renderCards(currentOffsetRef.current);

      // Determine settled active item index
      const settledIdx = Math.round(-targetOffsetRef.current / STEP);
      const clampedIdx = Math.max(0, Math.min(presets.length - 1, settledIdx));
      if (clampedIdx !== activeIndex && presets[clampedIdx]) {
        setActiveIndex(clampedIdx);
        onSelectPreset(presets[clampedIdx]);
      }
    }
  }, [activeIndex, presets, onSelectPreset, renderCards]);

  const snapToNearest = useCallback(() => {
    const rawIndex = -targetOffsetRef.current / STEP;
    const clampedIndex = Math.max(0, Math.min(presets.length - 1, Math.round(rawIndex)));
    targetOffsetRef.current = -clampedIndex * STEP;
    if (!animFrameIdRef.current) {
      animFrameIdRef.current = requestAnimationFrame(tick);
    }
  }, [presets.length, tick]);

  const spinToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(presets.length - 1, index));
      targetOffsetRef.current = -clamped * STEP;
      if (!animFrameIdRef.current) {
        animFrameIdRef.current = requestAnimationFrame(tick);
      }
    },
    [presets.length, tick]
  );

  // Wheel listener: converts vertical mouse wheel into smooth drum spin
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      const speed = (delta / 250) * STEP;
      const minOffset = -(presets.length - 1) * STEP;
      const maxOffset = 0;

      targetOffsetRef.current = Math.max(
        minOffset - STEP * 0.5,
        Math.min(maxOffset + STEP * 0.5, targetOffsetRef.current - speed)
      );

      if (!animFrameIdRef.current) {
        animFrameIdRef.current = requestAnimationFrame(tick);
      }

      // Settle snap after wheel stops
      clearTimeout((handleWheel as any)._timeout);
      (handleWheel as any)._timeout = setTimeout(() => {
        snapToNearest();
      }, 140);
    },
    [presets.length, snapToNearest, tick]
  );

  // Pointer drag listeners for touch and mouse
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startOffsetRef.current = targetOffsetRef.current;
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      const deltaY = e.clientY - startYRef.current;
      const angleDelta = (deltaY / 220) * STEP;
      const minOffset = -(presets.length - 1) * STEP;
      const maxOffset = 0;

      targetOffsetRef.current = Math.max(
        minOffset - STEP * 0.6,
        Math.min(maxOffset + STEP * 0.6, startOffsetRef.current + angleDelta)
      );

      if (!animFrameIdRef.current) {
        animFrameIdRef.current = requestAnimationFrame(tick);
      }
    },
    [presets.length, tick]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (containerRef.current) {
        try {
          containerRef.current.releasePointerCapture(e.pointerId);
        } catch {}
      }
      snapToNearest();
    },
    [snapToNearest]
  );

  // Bind native non-passive wheel event to container
  useEffect(() => {
    const el = containerRef.current;
    if (!el || viewMode !== "reel") return;

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel, viewMode]);

  // Initial card layout render
  useEffect(() => {
    if (viewMode === "reel") {
      renderCards(currentOffsetRef.current);
    }
  }, [viewMode, presets, renderCards]);

  const activePreset = presets[activeIndex] || presets[0];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Reel HUD Header & Viewport Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-harvest-500/10 text-harvest-600 border border-harvest-500/20">
            <Disc3 className="w-3.5 h-3.5 animate-spin-slow" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-espresso-900 uppercase">
            3D Field Site Reel //{" "}
            <span className="text-harvest-600">
              [{String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(presets.length).padStart(2, "0")}]
            </span>
          </span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center p-1 rounded-full bg-paper-200 border border-paper-300 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("reel")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono transition-all ${
              viewMode === "reel"
                ? "bg-white text-espresso-950 font-bold shadow-sm"
                : "text-espresso-600 hover:text-espresso-900"
            }`}
          >
            <Disc3 className="w-3 h-3 text-harvest-600" />
            <span>3D Reel</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono transition-all ${
              viewMode === "grid"
                ? "bg-white text-espresso-950 font-bold shadow-sm"
                : "text-espresso-600 hover:text-espresso-900"
            }`}
          >
            <LayoutGrid className="w-3 h-3 text-espresso-600" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* Main Mode View */}
      {viewMode === "reel" ? (
        <div className="relative w-full h-[520px] rounded-3xl bg-espresso-950 border border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between select-none">
          {/* Subtle 3D perspective grid backdrop */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, rgba(200, 155, 60, 0.25) 0%, transparent 60%), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: "100% 100%, 36px 36px, 36px 36px",
            }}
          />

          {/* Top HUD Telemetry Strip */}
          <div className="relative z-20 flex items-center justify-between p-4 sm:p-6 border-b border-white/[0.08] backdrop-blur-md bg-espresso-950/40 text-[11px] font-mono text-bone-300">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-harvest-400" />
              <span>
                {activePreset?.lat.toFixed(4)}°N, {activePreset?.lon.toFixed(4)}°E
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-harvest-500/20 text-harvest-300 border border-harvest-500/30 text-[10px] font-bold">
                {activePreset?.default_salinity.toUpperCase()} SALINITY
              </span>
            </div>
          </div>

          {/* 3D Cylindrical Drum Stage */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative z-10 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            style={{
              perspective: "1150px",
              perspectiveOrigin: "50% 50%",
            }}
          >
            <div
              className="relative w-[340px] sm:w-[420px] h-[310px] flex items-center justify-center"
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {presets.map((preset, idx) => {
                const isSelected = activeIndex === idx;
                return (
                  <div
                    key={preset.id}
                    ref={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    onClick={() => {
                      spinToIndex(idx);
                      onSelectPreset(preset);
                    }}
                    className={`absolute inset-0 rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-colors duration-200 border backdrop-blur-xl ${
                      isSelected
                        ? "bg-stone-900/95 border-harvest-500 shadow-[0_0_35px_rgba(200,155,60,0.3)] ring-1 ring-harvest-500/50"
                        : "bg-stone-950/85 border-white/10 hover:border-harvest-500/40"
                    }`}
                    style={{
                      transformStyle: "preserve-3d",
                      willChange: "transform, opacity",
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono tracking-widest text-harvest-400 uppercase font-semibold">
                          {preset.region}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">
                          DEFAULT: {preset.default_crop.toUpperCase()}
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-sans">
                        {preset.name}
                      </h3>

                      <p className="mt-2 text-xs sm:text-sm text-stone-300 font-serif leading-relaxed line-clamp-3">
                        {preset.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-3 text-stone-400 text-[11px]">
                        <span>NDVI: {(preset.modis_mean_ndvi || 0.18).toFixed(2)}</span>
                        <span>•</span>
                        <span>
                          SM: {(preset.smap_soil_moisture_cm3 || 0.12).toFixed(2)} cm³
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          spinToIndex(idx);
                          onSelectPreset(preset);
                          onLaunchCockpit?.();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-harvest-500 hover:bg-harvest-400 text-espresso-950 font-bold text-[11px] tracking-wide transition-all shadow-md active:scale-95"
                      >
                        <span>Cockpit</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom HUD Stage Controls */}
          <div className="relative z-20 flex items-center justify-between p-4 sm:p-5 border-t border-white/[0.08] backdrop-blur-md bg-espresso-950/40 text-[11px] font-mono text-stone-400">
            <span className="flex items-center gap-2 text-stone-400 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-harvest-400 animate-pulse" />
              <span>Drag vertically or scroll wheel to rotate 3D drum</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => spinToIndex(activeIndex - 1)}
                disabled={activeIndex <= 0}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white transition-all"
                aria-label="Previous Site"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => spinToIndex(activeIndex + 1)}
                disabled={activeIndex >= presets.length - 1}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white transition-all"
                aria-label="Next Site"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Classic 2-Column Grid Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {presets.map((preset, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  setActiveIndex(idx);
                  onSelectPreset(preset);
                  onLaunchCockpit?.();
                }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white border-harvest-500 shadow-md ring-2 ring-harvest-500/20"
                    : "bg-paper-50 border-paper-300 hover:border-harvest-500/50 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-sans font-bold text-espresso-950">
                    {preset.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-paper-200 border border-paper-300 text-espresso-700 font-medium">
                    {preset.default_salinity.toUpperCase()} ECe
                  </span>
                </div>

                <p className="text-xs text-espresso-600 font-serif line-clamp-2 mb-3">
                  {preset.description}
                </p>

                <div className="flex items-center justify-between text-[11px] font-mono text-espresso-500 pt-3 border-t border-paper-200">
                  <span>NDVI: {(preset.modis_mean_ndvi || 0.15).toFixed(2)}</span>
                  <span className="text-harvest-600 font-semibold flex items-center gap-1">
                    Query Region <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
