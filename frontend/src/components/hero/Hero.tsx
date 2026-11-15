"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import TeamBadge from "./TeamBadge";
import { DEFAULT_CTA_HREF, DEFAULT_TAGLINE } from "@/lib/config";

interface HeroProps {
  tagline?: string;
  ctaHref?: string;
  badgeSlotRef: React.RefObject<HTMLDivElement>;
  posterMode?: boolean;
  badgeChildren?: React.ReactNode;
}

const Hero = forwardRef<HTMLElement, HeroProps>(
  (
    {
      tagline = DEFAULT_TAGLINE,
      ctaHref = DEFAULT_CTA_HREF,
      badgeSlotRef,
      posterMode = false,
      badgeChildren,
    },
    heroRef
  ) => {
    return (
      <section
        ref={heroRef}
        style={{ opacity: posterMode ? 1 : 0 }}
        className={`relative flex min-h-[100svh] w-full flex-col items-center justify-center px-6 py-16 text-center overflow-hidden ${
          posterMode ? "bg-hero-backdrop" : "bg-transparent"
        }`}
      >
        {/* Subtle CSS grain layer */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 flex max-w-3xl flex-col items-center gap-6">
          <TeamBadge ref={badgeSlotRef}>{badgeChildren}</TeamBadge>

          <h1
            data-hero-title
            className="font-display text-5xl font-semibold tracking-tight text-bone sm:text-7xl md:text-8xl"
          >
            Agriverto
          </h1>

          <p
            data-hero-tagline
            className="max-w-xl font-ui text-lg font-normal leading-relaxed text-bone/80 sm:text-xl"
          >
            {tagline}
          </p>

          <div data-hero-cta className="mt-4">
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-full bg-vigor px-8 py-3.5 font-ui text-sm font-semibold tracking-wide text-void shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-transform duration-200 hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-bone focus-visible:ring-offset-2 focus-visible:ring-offset-void"
            >
              Explore the map
            </Link>
          </div>
        </div>
      </section>
    );
  }
);

Hero.displayName = "Hero";

export default Hero;
