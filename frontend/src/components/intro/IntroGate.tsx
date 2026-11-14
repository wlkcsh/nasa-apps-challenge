"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Hero from "../hero/Hero";
import FhtmPhrase from "./FhtmPhrase";
import IntroOverlay from "./IntroOverlay";
import {
  DEFAULT_CTA_HREF,
  DEFAULT_TAGLINE,
  PIN_VH,
} from "@/lib/config";
import { useIntroMode } from "./hooks/useIntroMode";
import { useLayoutMode } from "./hooks/useLayoutMode";
import { useIntroTimeline } from "./useIntroTimeline";

const IntroCanvas = dynamic(() => import("./scene/IntroCanvas"), {
  ssr: false,
});

interface IntroGateProps {
  tagline?: string;
  ctaHref?: string;
}

export default function IntroGate({
  tagline = DEFAULT_TAGLINE,
  ctaHref = DEFAULT_CTA_HREF,
}: IntroGateProps) {
  const [mode, setMode] = useIntroMode();
  const layout = useLayoutMode();
  const isPortrait = layout === "portrait";

  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phraseRef = useRef<HTMLDivElement>(null);
  const badgeSlotRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const [inView, setInView] = useState(true);

  const { skip } = useIntroTimeline({
    enabled: mode === "full",
    wrapperRef,
    stageRef,
    phraseRef,
    badgeSlotRef,
    isPortrait,
  });

  // Pause R3F frameloop when sticky stage is scrolled completely out of the viewport
  useEffect(() => {
    if (mode !== "full" || !wrapperRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(wrapperRef.current);
    return () => {
      observer.disconnect();
    };
  }, [mode]);

  // Reset data-intro-active when in poster fallback mode
  useEffect(() => {
    if (mode === "poster" && typeof document !== "undefined") {
      document.documentElement.setAttribute("data-intro-active", "false");
    }
  }, [mode]);

  // Esc key & focusin inside Hero triggers smooth scroll skip
  useEffect(() => {
    if (mode !== "full") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const heroEl = heroRef.current;
      if (heroEl && e.target instanceof Node && heroEl.contains(e.target)) {
        skip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [mode, skip]);

  // Poster fallback mode (reduced-motion or no-WebGL):
  // Zero tall scroll wrapper, zero ScrollTrigger, zero 3D scene chunk loaded.
  if (mode === "poster") {
    return (
      <div className="relative min-h-[100svh] w-full bg-void">
        <Hero
          ref={heroRef}
          tagline={tagline}
          ctaHref={ctaHref}
          badgeSlotRef={badgeSlotRef}
          posterMode
          badgeChildren={<FhtmPhrase layout={layout} staticPoster />}
        />
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      style={{ height: `${PIN_VH + 100}svh` }}
      className="relative w-full bg-[#040711]"
    >
      <div
        ref={stageRef}
        className="sticky top-0 h-[100svh] w-full overflow-hidden bg-hero-backdrop z-[60]"
      >
        {/* 3D WebGL Canvas Layer */}
        {mode === "full" && (
          <div
            data-canvas-wrap
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10"
          >
            <IntroCanvas
              isPortrait={isPortrait}
              inView={inView}
              onContextLost={() => setMode("poster")}
            />
          </div>
        )}

        {/* Hero Layer (fades in during 7.4s-8.0s morph) */}
        <div className="relative z-20 h-full w-full">
          <Hero
            ref={heroRef}
            tagline={tagline}
            ctaHref={ctaHref}
            badgeSlotRef={badgeSlotRef}
          />
        </div>

        {/* Centered Phrase Layer (doubles as the TeamBadge text after 7.4s-8.0s morph) */}
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-4">
          <FhtmPhrase ref={phraseRef} layout={layout} />
        </div>

        {/* Scroll Cue + Skip Button Overlay */}
        <IntroOverlay onSkip={skip} />
      </div>
    </div>
  );
}
