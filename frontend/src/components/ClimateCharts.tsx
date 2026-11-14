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
  Sprout,
} from "lucide-react";
import { ClimateSummary } from "@/types/api";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

function CustomClimateTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const precip = payload.find((p) => p.dataKey === "prectotcorr_mm")?.value ?? 0;
  const temp = payload.find((p) => p.dataKey === "t2m_c")?.value ?? 0;
  const moisture = payload.find((p) => p.dataKey === "soil_moisture_pct")?.value ?? 0;

  return (
    <div className="bg-white border border-paper-300 rounded-xl p-3.5 shadow-xl text-xs min-w-[200px] space-y-2">
      <div className="flex items-center justify-between border-b border-paper-200 pb-1.5">
        <span className="font-bold text-espresso-950 uppercase tracking-wider text-[11px] font-mono">
          {label}
        </span>
        <span className="text-[9px] text-harvest-600 font-mono font-bold">NASA POWER</span>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between text-espresso-700">
          <span className="flex items-center gap-1.5 text-clay-600 font-medium">
            <CloudRain className="w-3.5 h-3.5" /> Precip:
          </span>
          <span className="font-mono font-bold text-espresso-950">{precip} mm</span>
        </div>

        <div className="flex items-center justify-between text-espresso-700">
          <span className="flex items-center gap-1.5 text-harvest-600 font-medium">
            <ThermometerSun className="w-3.5 h-3.5" /> Temp:
          </span>
          <span className="font-mono font-bold text-espresso-950">{temp}°C</span>
        </div>

        <div className="flex items-center justify-between text-espresso-700">
          <span className="flex items-center gap-1.5 text-sage-600 font-medium">
            <Layers className="w-3.5 h-3.5" /> Topsoil Wetness:
          </span>
          <span className="font-mono font-bold text-sage-700">{moisture}%</span>
        </div>
      </div>
    </div>
  );
}

export default function ClimateCharts({ climate }: { climate: ClimateSummary }) {
  const [showGlossary, setShowGlossary] = useState(false);

  const chartData = climate.monthly_series.map((pt) => ({
    ...pt,
    soil_moisture_pct: Math.round(pt.gwettop_ratio * 100),
  }));

  const isPrecipDeficit = climate.precip_anomaly_pct < 0;
  const isTempElevated = climate.temp_anomaly_c > 0;

  return (
    <div className="bg-white border border-paper-300 rounded-2xl p-6 shadow-sm space-y-4">
      {/* Header Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 pb-3">
        <div>
          <span className="block text-[10px] font-mono tracking-widest text-harvest-600 uppercase font-semibold">
            Agro-Climatology Trends
          </span>
          <h3 className="text-base font-serif font-bold text-espresso-950">
            Precipitation and Thermal Cycles
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Precip Anomaly */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
              isPrecipDeficit
                ? "bg-clay-50 border-clay-500/30 text-clay-700"
                : "bg-sage-50 border-sage-500/30 text-sage-700"
            }`}
          >
            <CloudRain className="w-3 h-3" />
            <span>Rain {climate.precip_anomaly_pct > 0 ? `+${climate.precip_anomaly_pct}%` : `${climate.precip_anomaly_pct}%`}</span>
            {isPrecipDeficit ? (
              <TrendingDown className="w-2.5 h-2.5 text-clay-600" />
            ) : (
              <TrendingUp className="w-2.5 h-2.5 text-sage-600" />
            )}
          </span>

          {/* Summer Heat Anomaly */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
              isTempElevated
                ? "bg-clay-50 border-clay-500/30 text-clay-700"
                : "bg-sage-50 border-sage-500/30 text-sage-700"
            }`}
          >
            <ThermometerSun className="w-3 h-3" />
            <span>Summer {climate.temp_anomaly_c > 0 ? `+${climate.temp_anomaly_c}°C` : `${climate.temp_anomaly_c}°C`}</span>
          </span>

          {/* Spring Frost Risk Badge */}
          {climate.spring_frost_risk && (
            <span
              title={`April T2M_MIN: ${climate.april_t2m_min_c ?? "< 2.0"}°C (Late-Spring Frost Hazard)`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border bg-paper-100 border-paper-300 text-espresso-700"
            >
              <span>Apr Frost ({climate.april_t2m_min_c !== undefined && climate.april_t2m_min_c !== null ? `${climate.april_t2m_min_c}°C` : "Risk"})</span>
            </span>
          )}
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ede8dd" opacity={0.9} />

            <XAxis
              dataKey="month"
              tick={{ fill: "#695349", fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: "#e0d8ca" }}
              tickLine={{ stroke: "#e0d8ca" }}
            />

            <YAxis
              yAxisId="left"
              tick={{ fill: "#c89b3c", fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: "#e0d8ca" }}
              tickLine={{ stroke: "#e0d8ca" }}
              label={{
                value: "°C / mm",
                angle: -90,
                position: "insideLeft",
                fill: "#695349",
                fontSize: 10,
              }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: "#336b46", fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: "#e0d8ca" }}
              tickLine={{ stroke: "#e0d8ca" }}
              label={{
                value: "Wetness %",
                angle: 90,
                position: "insideRight",
                fill: "#336b46",
                fontSize: 10,
              }}
            />

            <Tooltip content={<CustomClimateTooltip />} />

            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              formatter={(value) => <span className="text-espresso-800 font-medium">{value}</span>}
            />

            <Bar
              yAxisId="left"
              dataKey="prectotcorr_mm"
              name="Precip (mm)"
              fill="#bf5634"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
              opacity={0.85}
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="t2m_c"
              name="Temp (°C)"
              stroke="#c89b3c"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#c89b3c", stroke: "#ffffff", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "#ad812c" }}
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="soil_moisture_pct"
              name="Wetness (%)"
              stroke="#336b46"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 3, fill: "#336b46", stroke: "#ffffff", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "#265435" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Collapsible Plain-Language Scientific Glossary Bar */}
      <div className="pt-2 border-t border-paper-200">
        <button
          type="button"
          onClick={() => setShowGlossary((prev) => !prev)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-paper-50 border border-paper-300 hover:border-harvest-500/50 text-xs text-espresso-700 transition-all cursor-pointer group"
        >
          <span className="flex items-center gap-2 font-medium text-espresso-900">
            <BookOpen className="w-4 h-4 text-harvest-600 group-hover:rotate-12 transition-transform" />
            <span>Farmer&apos;s Guide to NASA Metrics</span>
          </span>
          <div className="flex items-center gap-1 text-[11px] text-harvest-700 font-mono font-medium">
            <span>{showGlossary ? "Hide Guide" : "Explain Metrics"}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                showGlossary ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {showGlossary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 mt-2 bg-paper-50 border border-paper-300 rounded-xl text-xs text-espresso-700">
            <div>
              <span className="font-bold text-espresso-950 font-mono block mb-1">
                PRECTOTCORR
              </span>
              <span>
                Precipitation total corrected for gauge undercatch. Models monthly rainwater available to topsoil without irrigation.
              </span>
            </div>
            <div>
              <span className="font-bold text-espresso-950 font-mono block mb-1">
                T2M (Air Temperature)
              </span>
              <span>
                2-meter daily mean temperature. Guides thermal degree-day windows and warns against summer heat scorching.
              </span>
            </div>
            <div>
              <span className="font-bold text-espresso-950 font-mono block mb-1">
                GWETTOP (Soil Moisture)
              </span>
              <span>
                Surface soil wetness (0-5 cm) modeled via NASA MERRA-2 assimilation, estimating irrigation intervals.
              </span>
            </div>
            <div>
              <span className="font-bold text-espresso-950 font-mono block mb-1">
                ECe Salinity
              </span>
              <span>
                Electrical conductivity of soil salts (dS/m). Values above 8 dS/m require salt-pioneers like Alfalfa or Sorghum.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
