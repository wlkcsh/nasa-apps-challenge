"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Satellite, Compass, Layers, Plus, Minus } from "lucide-react";
import { HazardEvent, PresetLocation } from "@/types/api";

interface FarmMapProps {
  lat: number;
  lon: number;
  presets: PresetLocation[];
  hazards?: HazardEvent[];
  onSelectCoord: (lat: number, lon: number) => void;
  shouldFlyTo?: boolean;
}

export default function FarmMap({
  lat,
  lon,
  presets,
  hazards = [],
  onSelectCoord,
  shouldFlyTo = false,
}: FarmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pulseRingRef = useRef<L.CircleMarker | null>(null);
  const activeCoreRef = useRef<L.CircleMarker | null>(null);

  const [activeLayer, setActiveLayer] = useState<"esri" | "modis" | "radar">("esri");

  // Keep a ref to onSelectCoord to avoid map re-init when callback changes
  const onSelectCoordRef = useRef(onSelectCoord);
  useEffect(() => {
    onSelectCoordRef.current = onSelectCoord;
  }, [onSelectCoord]);

  // 1. Initialize Map Instance with Free Panning (no brick-wall maxBounds viscosity)
  useEffect(() => {
    if (!containerRef.current) return;

    // Fast-Refresh safety guard: clean orphaned leaflet id if present
    if ((containerRef.current as unknown as { _leaflet_id?: number | null })._leaflet_id) {
      (containerRef.current as unknown as { _leaflet_id?: number | null })._leaflet_id = null;
    }

    // Bounding Box strictly pinning the viewport to Uzbekistan and the Aral Basin
    const UZBEKISTAN_BOUNDS: L.LatLngBoundsLiteral = [
      [35.0, 52.0], // South-West (southern border & Turkmenistan buffer)
      [47.5, 76.0], // North-East (Aral Sea, Karakalpakstan & Fergana valley)
    ];
    const UZBEKISTAN_CENTER: L.LatLngExpression = [41.3, 64.5];

    const map = L.map(containerRef.current, {
      center: UZBEKISTAN_CENTER,
      zoom: 6,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: UZBEKISTAN_BOUNDS,
      maxBoundsViscosity: 0.85,
      zoomControl: false,
      worldCopyJump: false,
      scrollWheelZoom: false,
    });

    // Initial Base Layer: Esri World Imagery (Satellite)
    const base = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
        maxZoom: 18,
      }
    ).addTo(map);
    baseLayerRef.current = base;

    // Clean Reference Labels Overlay for Satellite (Esri - zero API key, zero watermarks)
    const labels = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Esri Boundaries",
        maxZoom: 18,
        opacity: 0.85,
      }
    ).addTo(map);
    labelsLayerRef.current = labels;

    // Marker Group
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    // Map Click Listener: select coordinates cleanly without dragging interruptions
    map.on("click", (e: L.LeafletMouseEvent) => {
      const clickedLat = Number(e.latlng.lat.toFixed(4));
      const clickedLon = Number(e.latlng.lng.toFixed(4));
      onSelectCoordRef.current(clickedLat, clickedLon);
    });

    mapRef.current = map;

    // Invalidate size once DOM settles and on resize
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

  // 2. Handle Layer Switching (Esri Satellite vs NASA MODIS vs Dark Radar)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
    }
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    if (activeLayer === "esri") {
      baseLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri Satellite", maxZoom: 18 }
      ).addTo(map);

      labelsLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri Boundaries", maxZoom: 18, opacity: 0.85 }
      ).addTo(map);
    } else if (activeLayer === "modis") {
      baseLayerRef.current = L.tileLayer(
        "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-07-15/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
        {
          attribution: "NASA EOSDIS GIBS",
          maxNativeZoom: 9,
          maxZoom: 18,
        }
      ).addTo(map);

      labelsLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri Boundaries", maxZoom: 18, opacity: 0.9 }
      ).addTo(map);
    } else {
      // Dark Radar (Esri Dark Gray Canvas - free, unwatermarked)
      baseLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri Dark Gray", maxZoom: 16 }
      ).addTo(map);

      labelsLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri Reference", maxZoom: 16, opacity: 0.9 }
      ).addTo(map);
    }
  }, [activeLayer]);

  // 3. Handle FlyTo ONLY when requested (e.g. preset selection), not on casual map click
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !shouldFlyTo) return;

    map.flyTo([lat, lon], 8, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [lat, lon, shouldFlyTo]);

  // 4. Render Markers (Target Marker + Preset Hotspots)
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    // Preset Location Marker Dots
    presets.forEach((p) => {
      const isTarget = Math.abs(p.lat - lat) < 0.05 && Math.abs(p.lon - lon) < 0.05;
      if (isTarget) return;

      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 6,
        color: "#c9a24a",
        fillColor: "#0c1017",
        fillOpacity: 0.85,
        weight: 1.5,
      });

      marker.bindTooltip(
        `<span style="font-family: var(--font-sans); font-size: 11px; font-weight: 600; color: #efe9f2;">${p.name.split(" ")[0]}</span>`,
        { permanent: false, direction: "top", offset: [0, -6] }
      );

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectCoordRef.current(p.lat, p.lon);
      });

      markersGroup.addLayer(marker);
    });

    // Active Target Crosshair with Obsidian and Warm Gold Glow
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
        <div style="color: #a19ea8; font-size: 10px; margin-top: 4px;">NASA POWER & Agro-Climatology Live Sync</div>
      </div>
    `);

    markersGroup.addLayer(pulseRing);
    markersGroup.addLayer(activeCore);
  }, [lat, lon, presets]);

  // Zoom handlers
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-paper-200 cursor-crosshair">
      {/* Floating Dedicated Zoom Controls (always visible, unobstructed) */}
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
      <div className="absolute bottom-5 left-4 sm:left-6 z-[400] flex items-center gap-1.5 bg-white/95 border border-paper-300 rounded-full p-1.5 shadow-lg">
        <div className="flex items-center gap-1 pl-2 pr-1 text-harvest-600">
          <Layers className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-harvest-600 font-semibold hidden sm:inline">
            Layer
          </span>
        </div>

        <button
          type="button"
          onClick={() => setActiveLayer("esri")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-tight transition-all cursor-pointer ${
            activeLayer === "esri"
              ? "bg-espresso-950 text-paper-50 font-semibold shadow-sm"
              : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
          }`}
        >
          <Satellite className="w-3 h-3" />
          Esri Satellite
        </button>

        <button
          type="button"
          onClick={() => setActiveLayer("modis")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium tracking-tight transition-all cursor-pointer ${
            activeLayer === "modis"
              ? "bg-espresso-950 text-paper-50 font-semibold shadow-sm"
              : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
          }`}
        >
          NASA MODIS
        </button>

        <button
          type="button"
          onClick={() => setActiveLayer("radar")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium tracking-tight transition-all cursor-pointer ${
            activeLayer === "radar"
              ? "bg-espresso-950 text-paper-50 font-semibold shadow-sm"
              : "text-espresso-700 hover:text-espresso-950 hover:bg-paper-100"
          }`}
        >
          Dark Radar
        </button>
      </div>

      {/* Floating Bottom Hint Badge */}
      <div className="absolute bottom-5 right-4 sm:right-6 z-[400] hidden md:flex items-center gap-2 bg-white/95 border border-paper-300 px-3.5 py-1.5 rounded-full text-[11px] text-espresso-700 shadow-md">
        <Compass className="w-3.5 h-3.5 text-harvest-600" />
        <span>Click anywhere to select coordinates freely</span>
      </div>

      {/* Leaflet Map DOM Node */}
      <div ref={containerRef} className="h-full w-full z-0 bg-paper-200" />
    </div>
  );
}
