"use client";

import React from "react";
import SkipButton from "./SkipButton";

interface IntroOverlayProps {
  onSkip: () => void;
  hideSkip?: boolean;
}

export default function IntroOverlay({
  onSkip,
  hideSkip = false,
}: IntroOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {/* Freight-style Bilateral Axial Telemetry HUD flanking the central flight corridor */}
      <div
        data-axial-hud
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 items-center justify-between px-8 opacity-0 md:flex lg:px-14"
      >
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-orbit/80">
            ORIGIN // TASHKENT UZ
          </span>
          <span className="font-mono text-[10px] tracking-[0.18em] text-bone/45">
            41.31°N · 69.24°E · ARAL BASIN
          </span>
        </div>

        {/* Central faint axial slipstream hairline */}
        <div className="mx-8 h-[1px] flex-1 bg-gradient-to-r from-orbit/25 via-bone/10 to-rust/25" />

        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-soil/85">
            VECTOR // ARES VALLIS
          </span>
          <span className="font-mono text-[10px] tracking-[0.18em] text-bone/45">
            REGOLITH BIOSIGNATURE · 0.38G
          </span>
        </div>
      </div>

      {/* Freight-style 34vh Atmospheric Horizon Handoff at bottom of stage */}
      <div
        data-atmo-handoff
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(to top, #040711 0%, rgba(193, 68, 14, 0.14) 45%, transparent 100%)",
        }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[34vh] opacity-0"
      />

      {/* Scroll to launch cue (fades in during 1.2s boot timeline, fades out in first 2% of scroll) */}
      <div
        data-scroll-cue
        aria-hidden="true"
        className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5 opacity-0"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.26em] text-bone/90">
          Scroll to launch
        </span>
        <span
          data-scroll-hairline
          className="h-8 w-[1px] origin-top bg-gradient-to-b from-orbit via-orbit/60 to-transparent shadow-[0_0_8px_#06B6D4]"
        />
      </div>

      {/* Skip intro button (hidden when scroll progress p > 0.95) */}
      <div data-skip-btn-wrap>
        <SkipButton hidden={hideSkip} onSkip={onSkip} />
      </div>
    </div>
  );
}
