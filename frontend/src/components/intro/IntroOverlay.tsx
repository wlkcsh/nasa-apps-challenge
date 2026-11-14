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
        <SkipButton onSkip={onSkip} hidden={hideSkip} />
      </div>
    </div>
  );
}
