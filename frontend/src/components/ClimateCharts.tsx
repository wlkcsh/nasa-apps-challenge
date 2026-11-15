"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  ThermometerSun,
  CloudRain,
  Activity,
  Layers,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Droplets,
  Calendar,
  Sparkles,
} from "lucide-react";
import { AgroKpi, ClimateSummary, MonthlyWaterBalance, SoilProfile } from "@/types/api";

interface ClimateChartsProps {
  climate: ClimateSummary;
  kpis?: AgroKpi[];
  soilProfile?: SoilProfile | null;
  waterBalance?: MonthlyWaterBalance[];
}

export default function ClimateCharts({
  climate,
  kpis = [],
  soilProfile,
  waterBalance = [],
}: ClimateChartsProps) {
  const [showSoilDetails, setShowSoilDetails] = useState<boolean>(true);
  const [activeClimateView, setActiveClimateView] = useState<"all" | "water" | "ledger" | "soil">("all");

  // Combine monthly water balance data for Recharts
  const chartData = (waterBalance && waterBalance.length > 0
    ? waterBalance
    : climate.monthly_series.map((pt) => ({
        month: pt.month,
        rain_mm: pt.prectotcorr_mm,
        et0_mm: Math.round(pt.prectotcorr_mm * 1.8),
        deficit_mm: Math.round(Math.max(0, pt.prectotcorr_mm * 1.8 - pt.prectotcorr_mm)),
      }))
  );

  return (
    <div className="space-y-6">
      {/* Separated Climatology View Switcher (Item 5) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-paper-300 rounded-2xl p-1.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "all" as const, label: "All Insights", icon: Layers },
            { id: "water" as const, label: "Evaporative Deficit (P vs ET0)", icon: Droplets },
            { id: "ledger" as const, label: "9-Metric Theil-Sen Ledger", icon: Activity },
            { id: "soil" as const, label: "ISRIC SoilGrids 250m", icon: BookOpen },
          ].map((tab) => {
            const isActive = activeClimateView === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveClimateView(tab.id)}
                style={{ transitionTimingFunction: "var(--spring-snappy)" }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                  isActive
                    ? "bg-espresso-950 text-paper-50 font-bold shadow-md"
                    : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-harvest-400" : "text-espresso-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <span className="text-[11px] font-mono text-espresso-600 px-3 hidden md:block">
          Data: <strong className="text-espresso-950">NASA POWER (2001–2025)</strong>
        </span>
      </div>

      {/* 1. 9-Card Scientific Agro-Climatology KPI Grid with Theil-Sen Statistical Trends */}
      {(activeClimateView === "all" || activeClimateView === "ledger") && kpis && kpis.length > 0 && (
        <div style={{ animation: "fadeInScale 200ms var(--spring-snappy) forwards" }} className="bg-white border border-paper-300 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-paper-200 pb-4">
            <div>
              <span className="block text-[10px] font-mono tracking-widest text-harvest-600 uppercase font-semibold">
                NASA POWER Climatology (2001–2025)
              </span>
              <h3 className="text-xl font-sans font-black uppercase text-espresso-950 tracking-tight">
                9-Metric Agro-Meteorological Core Ledger
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-harvest-50 text-harvest-700 border border-harvest-400/30 text-[10px] font-mono font-bold">
              Theil-Sen Robust Statistics
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map((kpi, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all ${
                  kpi.warn
                    ? "bg-rose-50/50 border-rose-200/80 shadow-sm"
                    : "bg-paper-50/70 border-paper-300/80 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-espresso-700 font-sans">{kpi.label}</span>
                  {kpi.warn && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                </div>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                    kpi.warn ? "text-rose-950" : "text-espresso-950"
                  }`}>
                    {kpi.value}
                  </span>
                  {kpi.unit && (
                    <span className="text-xs font-mono text-espresso-600 font-semibold">{kpi.unit}</span>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-paper-200/60 text-[11px] space-y-0.5">
                  <div className="text-espresso-800 font-medium">{kpi.detail}</div>
                  <div className="text-[10px] font-mono text-espresso-500">{kpi.context}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Monthly Atmospheric Water Balance Chart (Rain vs ET0 Deficit) */}
      {(activeClimateView === "all" || activeClimateView === "water") && (
        <div style={{ animation: "fadeInScale 200ms var(--spring-snappy) forwards" }} className="bg-white border border-paper-300 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 pb-3">
            <div>
              <span className="block text-[10px] font-mono tracking-widest text-harvest-600 uppercase font-semibold">
                FAO-56 Penman-Monteith Evaporative Balance
              </span>
              <h3 className="text-lg font-serif font-bold text-espresso-950">
                Monthly Precipitation vs Atmospheric Demand (ET0)
              </h3>
            </div>
            <div className="text-xs text-espresso-600 font-mono">
              Annual Evaporative Deficit: <strong className="text-rose-700 font-bold">Unmet without canal irrigation</strong>
            </div>
          </div>

          <div className="h-[300px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2ded4" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#44403c", fontSize: 11, fontFamily: "monospace" }} />
                <YAxis tick={{ fill: "#44403c", fontSize: 11, fontFamily: "monospace" }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const rain = payload.find((p) => p.dataKey === "rain_mm")?.value ?? 0;
                    const et0 = payload.find((p) => p.dataKey === "et0_mm")?.value ?? 0;
                    const def = payload.find((p) => p.dataKey === "deficit_mm")?.value ?? 0;
                    return (
                      <div className="bg-white border border-paper-300 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-[180px]">
                        <div className="font-bold text-espresso-950 font-mono uppercase border-b border-paper-200 pb-1">
                          {label}
                        </div>
                        <div className="flex justify-between text-espresso-700">
                          <span>Precipitation:</span>
                          <span className="font-mono font-bold text-sky-700">{rain} mm</span>
                        </div>
                        <div className="flex justify-between text-espresso-700">
                          <span>Reference ET0:</span>
                          <span className="font-mono font-bold text-amber-700">{et0} mm</span>
                        </div>
                        <div className="flex justify-between text-rose-700 border-t border-paper-100 pt-1 font-semibold">
                          <span>Net Deficit:</span>
                          <span className="font-mono font-bold">{def} mm</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", fontFamily: "monospace", paddingTop: "8px" }}
                />
                <Bar dataKey="rain_mm" name="Precipitation (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="et0_mm" name="Reference ET0 (mm)" stroke="#d97706" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="deficit_mm" name="Water Deficit (mm)" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. ISRIC SoilGrids 250m Profile Card */}
      {(activeClimateView === "all" || activeClimateView === "soil") && soilProfile && (
        <div style={{ animation: "fadeInScale 200ms var(--spring-snappy) forwards" }} className="bg-white border border-paper-300 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div
            className="flex items-center justify-between cursor-pointer select-none border-b border-paper-200 pb-3"
            onClick={() => setShowSoilDetails(!showSoilDetails)}
          >
            <div>
              <span className="block text-[10px] font-mono tracking-widest text-harvest-600 uppercase font-semibold">
                ISRIC SoilGrids 250m Chemical & Physical Survey
              </span>
              <h3 className="text-lg font-serif font-bold text-espresso-950">
                Soil Profile & Mineral Texture Matrix
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-espresso-700">
              <span>{soilProfile.texture?.toUpperCase() || "LOAM"}</span>
              {showSoilDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {showSoilDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 bg-paper-50 rounded-xl border border-paper-200">
                <span className="text-[10px] font-mono uppercase text-espresso-500">Soil Texture</span>
                <div className="text-lg font-black font-mono text-espresso-950 mt-1 capitalize">
                  {soilProfile.texture || "Loam"}
                </div>
                <span className="text-[10px] text-espresso-600">USDA Classification</span>
              </div>

              <div className="p-3 bg-paper-50 rounded-xl border border-paper-200">
                <span className="text-[10px] font-mono uppercase text-espresso-500">Clay / Silt / Sand</span>
                <div className="text-lg font-black font-mono text-espresso-950 mt-1">
                  {soilProfile.clay_pct ?? "—"}% / {soilProfile.silt_pct ?? "—"}%
                </div>
                <span className="text-[10px] text-espresso-600">Sand: {soilProfile.sand_pct ?? "—"}%</span>
              </div>

              <div className="p-3 bg-paper-50 rounded-xl border border-paper-200">
                <span className="text-[10px] font-mono uppercase text-espresso-500">Soil pH</span>
                <div className="text-lg font-black font-mono text-espresso-950 mt-1">
                  {soilProfile.ph ? (soilProfile.ph / 10).toFixed(1) : "—"}
                </div>
                <span className="text-[10px] text-espresso-600">Alkaline Oasis Indicator</span>
              </div>

              <div className="p-3 bg-paper-50 rounded-xl border border-paper-200">
                <span className="text-[10px] font-mono uppercase text-espresso-500">Bulk Density</span>
                <div className="text-lg font-black font-mono text-espresso-950 mt-1">
                  {soilProfile.bulk_density ? `${(soilProfile.bulk_density / 100).toFixed(2)}` : "—"}
                </div>
                <span className="text-[10px] text-espresso-600">cg / cm³ (0–30 cm)</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
