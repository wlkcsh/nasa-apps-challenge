"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Satellite, Compass, Layers, Plus, Minus, Info, ChevronUp, ChevronDown } from "lucide-react";
import { GibsLayerMeta, HazardEvent, PresetLocation } from "@/types/api";

interface FarmMapProps {
  lat: number;
  lon: number;
  presets: PresetLocation[];
  hazards?: HazardEvent[];
  gibsLayers?: Record<string, GibsLayerMeta>;
  onSelectCoord: (lat: number, lon: number) => void;
  shouldFlyTo?: boolean;
}

type MapLayerKey = "sat" | "ndvi" | "precip" | "temp" | "soil";

export default function FarmMap({
  lat,
  lon,
  presets,
  hazards = [],
  gibsLayers = {},
  onSelectCoord,
  shouldFlyTo = false,
}: FarmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pulseRingRef = useRef<L.CircleMarker | null>(null);
  const activeCoreRef = useRef<L.CircleMarker | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerKey>("sat");
  const [legendExpanded, setLegendExpanded] = useState<boolean>(true);

  const onSelectCoordRef = useRef(onSelectCoord);
  useEffect(() => {
    onSelectCoordRef.current = onSelectCoord;
  }, [onSelectCoord]);

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!containerRef.current) return;

    if ((containerRef.current as unknown as { _leaflet_id?: number | null })._leaflet_id) {
      (containerRef.current as unknown as { _leaflet_id?: number | null })._leaflet_id = null;
    }

    const UZBEKISTAN_CENTER: L.LatLngExpression = [41.8, 62.5];

    const map = L.map(containerRef.current, {
      center: UZBEKISTAN_CENTER,
      zoom: 6,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
      worldCopyJump: true,
      scrollWheelZoom: false,
    });

    const base = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
        maxZoom: 18,
      }
    ).addTo(map);
    baseLayerRef.current = base;

    const labels = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Esri Boundaries",
        maxZoom: 18,
        opacity: 0.85,
      }
    ).addTo(map);
    labelsLayerRef.current = labels;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    map.on("click", (e: L.LeafletMouseEvent) => {
      const clickedLat = Number(e.latlng.lat.toFixed(4));
      const clickedLon = Number(e.latlng.lng.toFixed(4));
      onSelectCoordRef.current(clickedLat, clickedLon);
    });

    mapRef.current = map;

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Handle Layer Switching with live NASA GIBS Overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    if (activeLayer === "sat") {
      // Pure satellite base
      return;
    }

    const gibsMeta = gibsLayers[activeLayer];
    let tileUrl = "";
    let maxNative = 9;

    if (gibsMeta && gibsMeta.tile_url) {
      tileUrl = gibsMeta.tile_url;
      maxNative = gibsMeta.max_zoom || 9;
    } else {
      // Fallback live WMTS templates if metadata is still loading
      if (activeLayer === "ndvi") {
        tileUrl = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png";
        maxNative = 9;
      } else if (activeLayer === "precip") {
        tileUrl = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png";
        maxNative = 6;
      } else if (activeLayer === "temp") {
        tileUrl = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_Land_Surface_Temp_8Day_Day/default/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png";
        maxNative = 7;
      } else if (activeLayer === "soil") {
        tileUrl = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L4_Analyzed_Surface_Soil_Moisture/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png";
        maxNative = 6;
      }
    }

    if (tileUrl) {
      const gibsTileLayer = L.tileLayer(tileUrl, {
        attribution: "NASA GIBS / EOSDIS",
        maxNativeZoom: maxNative,
        maxZoom: 18,
        opacity: 0.82,
      }).addTo(map);

      overlayLayerRef.current = gibsTileLayer;

      // Bring boundaries & labels back to the top
      if (labelsLayerRef.current) {
        labelsLayerRef.current.bringToFront();
      }
    }
  }, [activeLayer, gibsLayers]);

  // 3. Handle FlyTo
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !shouldFlyTo) return;

    map.flyTo([lat, lon], 8, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [lat, lon, shouldFlyTo]);

  // 4. Render Markers
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    presets.forEach((p) => {
      const isTarget = Math.abs(p.lat - lat) < 0.05 && Math.abs(p.lon - lon) < 0.05;
      if (isTarget) return;

      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 7,
        color: "#c9a24a",
        fillColor: "#140e0b",
        fillOpacity: 0.9,
        weight: 2,
      });

      marker.bindTooltip(
        `<div style="font-family: system-ui, sans-serif; font-size: 11px; font-weight: 600; color: #140e0b; line-height: 1.3;">
          <div style="color: #c9a24a; font-weight: 700;">${p.name}</div>
          <div style="font-size: 9px; color: #666; text-transform: uppercase; font-family: monospace;">${p.region} · ${p.default_salinity} ECe</div>
        </div>`,
        { permanent: false, direction: "top", offset: [0, -8] }
      );

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectCoordRef.current(p.lat, p.lon);
      });

      markersGroup.addLayer(marker);
    });

    const pulseRing = L.circleMarker([lat, lon], {
      radius: 20,
      color: "#c9a24a",
      fillColor: "#c9a24a",
      fillOpacity: 0.15,
      weight: 1.5,
      dashArray: "3 3",
    });
    pulseRingRef.current = pulseRing;

    const activeCore = L.circleMarker([lat, lon], {
      radius: 7,
      color: "#f6e3fb",
      fillColor: "#c9a24a",
      fillOpacity: 1,
      weight: 2,
    });
    activeCoreRef.current = activeCore;

    activeCore.bindPopup(`
      <div style="font-family: var(--font-sans); font-size: 11px; line-height: 1.4;">
        <div style="font-weight: 700; color: #c9a24a; letter-spacing: 0.05em; text-transform: uppercase;">Selected Field Coordinates</div>
        <div style="font-family: monospace; color: #faf8f5; font-size: 12px; margin-top: 2px;">${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</div>
        <div style="color: #a19ea8; font-size: 10px; margin-top: 4px;">NASA POWER & GIBS Climatology Live Sync</div>
      </div>
    `);

    markersGroup.addLayer(pulseRing);
    markersGroup.addLayer(activeCore);
  }, [lat, lon, presets]);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const currentGibs = activeLayer !== "sat" ? gibsLayers[activeLayer] : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-paper-200 cursor-crosshair">
      {/* Zoom Controls */}
      <div className="absolute top-24 left-4 z-[400] flex flex-col gap-1 bg-white/95 border border-paper-300 rounded-xl p-1 shadow-md">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom in"
          className="p-2 rounded-lg text-espresso-700 hover:text-harvest-600 hover:bg-paper-100 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="h-[1px] bg-paper-200 mx-1" />
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom out"
          className="p-2 rounded-lg text-espresso-700 hover:text-harvest-600 hover:bg-paper-100 transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Bottom Center Layer Switcher HUD */}
      <div className="absolute bottom-5 left-4 sm:left-6 z-[400] flex flex-wrap items-center gap-1.5 bg-white/95 border border-paper-300 rounded-full p-1.5 shadow-lg max-w-[calc(100vw-40px)]">
        <div className="flex items-center gap-1 pl-2 pr-1 text-harvest-600">
          <Layers className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-harvest-600 font-semibold hidden md:inline">
            NASA Layers
          </span>
        </div>

        <button
          type="button"
          onClick={() => setActiveLayer("sat")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-tight transition-all cursor-pointer ${
            activeLayer === "sat"
              ? "bg-espresso-950 text-paper-50 font-semibold shadow-sm"
              : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
          }`}
        >
          <Satellite className="w-3 h-3" />
          Satellite Base
        </button>

        <button
          type="button"
          onClick={() => setActiveLayer("ndvi")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium tracking-tight transition-all cursor-pointer ${
            activeLayer === "ndvi"
              ? "bg-espresso-950 text-paper-50 font-semibold shadow-sm"
              : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
          }`}
        >
          MODIS NDVI (250m)
        </button>

        <button
          type="button"
          onClick={() => setActiveLayer("precip")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium tracking-tight transition-all cursor-pointer ${
            activeLayer === "precip"
              ? "bg-espresso-950 text-paper-50 font-semibold shadow-sm"
              : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
          }`}
        >
          GPM Rainfall
        </button>

        <button
          type="button"
          onClick={() => setActiveLayer("temp")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium tracking-tight transition-all cursor-pointer ${
            activeLayer === "temp"
              ? "bg-espresso-950 text-paper-50 font-semibold shadow-sm"
              : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
          }`}
        >
          Land Temp (LST)
        </button>

        <button
          type="button"
          onClick={() => setActiveLayer("soil")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium tracking-tight transition-all cursor-pointer ${
            activeLayer === "soil"
              ? "bg-espresso-950 text-paper-50 font-semibold shadow-sm"
              : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
          }`}
        >
          SMAP Moisture
        </button>
      </div>

      {/* Floating Expandable GIBS Legend (Bottom Right) */}
      {activeLayer !== "sat" && (
        <div className="absolute top-24 right-4 z-[400] max-w-[280px] bg-white/95 border border-paper-300 rounded-xl p-3 shadow-lg backdrop-blur-md text-xs">
          <div
            className="flex items-center justify-between gap-2 cursor-pointer select-none font-semibold text-espresso-950 text-[11px]"
            onClick={() => setLegendExpanded(!legendExpanded)}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-harvest-600 animate-pulse" />
              <span className="truncate">{currentGibs?.title || activeLayer.toUpperCase()}</span>
            </div>
            {legendExpanded ? <ChevronUp className="w-3.5 h-3.5 text-espresso-600" /> : <ChevronDown className="w-3.5 h-3.5 text-espresso-600" />}
          </div>

          {legendExpanded && (
            <div className="mt-2 space-y-1.5 pt-2 border-t border-paper-200">
              <div
                className="h-2.5 w-full rounded-sm border border-paper-300 shadow-inner"
                style={{
                  background:
                    currentGibs?.gradient_css && currentGibs.gradient_css !== "none"
                      ? currentGibs.gradient_css
                      : activeLayer === "ndvi"
                      ? "linear-gradient(to right, #8c510a, #d8b365, #f5f5f5, #c7eae5, #01665e)"
                      : activeLayer === "precip"
                      ? "linear-gradient(to right, #eff3ff, #bdd7e7, #6baed6, #2171b5)"
                      : activeLayer === "temp"
                      ? "linear-gradient(to right, #313695, #74add1, #e0f3f8, #fdae61, #d73027)"
                      : "linear-gradient(to right, #f7fbff, #9ecae1, #2171b5, #08306b)",
                }}
              />

              <div className="flex justify-between text-[10px] font-mono text-espresso-600 font-medium">
                <span>{currentGibs?.vmin ?? (activeLayer === "ndvi" ? -0.2 : 0)} {currentGibs?.units}</span>
                <span>{currentGibs?.vmax ?? (activeLayer === "ndvi" ? 1.0 : 100)} {currentGibs?.units}</span>
              </div>

              <div className="text-[9px] text-espresso-500 font-mono flex items-center justify-between pt-1 border-t border-paper-100">
                <span>EOSDIS GIBS WMTS</span>
                <span>{currentGibs?.date || "Live Observation"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Hint Badge */}
      <div className="absolute bottom-5 right-4 sm:right-6 z-[400] hidden md:flex items-center gap-2 bg-white/95 border border-paper-300 px-3.5 py-1.5 rounded-full text-[11px] text-espresso-700 shadow-md">
        <Compass className="w-3.5 h-3.5 text-harvest-600" />
        <span>Click anywhere to select coordinates</span>
      </div>

      {/* Leaflet Map DOM Node */}
      <div ref={containerRef} className="h-full w-full z-0 bg-paper-200" />
    </div>
  );
}
