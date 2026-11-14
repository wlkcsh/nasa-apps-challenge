### 1. Verification Notes (`package.json`, React/Next Versions & `@/` Alias)

Before installing or merging, run this one-liner from the repo root (or `frontend/` if your Next.js app lives in `frontend/`) to verify your workspace layout, `@/` alias, and React major version:

```bash
node -e '
const fs = require("fs");
const pkgPath = fs.existsSync("./package.json") ? "./package.json" : "./frontend/package.json";
const tsconfigPath = fs.existsSync("./tsconfig.json") ? "./tsconfig.json" : "./frontend/tsconfig.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
console.log({
  pkgPath,
  react: pkg.dependencies?.react,
  next: pkg.dependencies?.next,
  paths: tsconfig.compilerOptions?.paths
});
'

```

* **Directory & `@/` Alias**: If `tsconfig.json` maps `"@/*": ["./*"]` (or `"./src/*"`), place `lib/config.ts` and `components/...` under that root (`./` or `./src/`).
* **Dependency Installation**:
* **If React is 18.x** (standard Next.js 14 setup):
```bash
npm install three@^0.163.0 @types/three @react-three/fiber@^8.17.10 @react-three/drei@^9.114.0 gsap@^3.12.5

```


* **If React is 19.x** (Next.js 15 setup):
```bash
npm install three@^0.163.0 @types/three @react-three/fiber@^9.0.0 @react-three/drei@^10.0.0 gsap@^3.12.5

```





---

### 2. Targeted Merge Snippets for Existing Files (Do Not Overwrite)

#### A. `tailwind.config.ts` (or `tailwind.config.js`)

Merge these color tokens and font families into `theme.extend` inside your existing Tailwind config:

```typescript
// Inside theme.extend:
colors: {
  // ...keep your existing colors, and add:
  void: "#040711",
  obsidian: "#070709",
  orbit: "#06B6D4",
  soil: "#C9A24A",
  vigor: "#10B981",
  rust: "#C1440E",
  heart: "#E11D48",
  bone: "#FAF8F5",
},
fontFamily: {
  // ...keep your existing font families, and add:
  display: ["var(--font-display)", "serif"],
  ui: ["var(--font-ui)", "sans-serif"],
  mono: ["var(--font-mono)", "monospace"],
},

```

#### B. `app/globals.css`

Append these utility classes to the bottom of your existing `globals.css` (and remove the old `#intro-ssr-cover` rules from Batch 1 if you added them earlier, since `SESSION_KEY` is removed):

```css
/* Field Shift UZ — Hero & Intro Backdrop Utilities */
.bg-hero-backdrop {
  background-color: #070709;
  background-image:
    radial-gradient(circle at 18% 45%, rgba(6, 182, 212, 0.12) 0%, transparent 45%),
    radial-gradient(circle at 82% 55%, rgba(193, 68, 14, 0.14) 0%, transparent 48%),
    radial-gradient(circle at 50% 50%, rgba(4, 7, 17, 0.9) 0%, #040711 100%);
}

```

#### C. `app/layout.tsx`

Merge the Google Fonts (`Cormorant_Garamond`, `Inter`, `JetBrains_Mono`) into your root `<html>` className. Remove any `SESSION_KEY` inline `<script>` or `#intro-ssr-cover` `<div>` from Batch 1:

```tsx
// 1. Add font imports at the top of app/layout.tsx:
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

// 2. Append the CSS variables onto your existing <html> className:
// <html lang="en" className={`${cormorant.variable} ${inter.variable} ${jetbrainsMono.variable} ...`}>

```

#### D. `app/page.tsx`

Mount `<IntroGate/>` at the top of your landing page above your `#farm-map` section (do not delete your existing map/dashboard sections below it):

```tsx
// 1. Import IntroGate at the top of app/page.tsx:
import IntroGate from "@/components/intro/IntroGate";

// 2. Render <IntroGate /> at the top of your page component:
// <IntroGate
//   tagline="Climate-adaptive crop rotation powered by NASA Earth observations"
//   ctaHref="#farm-map"
// />
// <section id="farm-map">...your existing Field Shift UZ map/dashboard...</section>

```

---

### 3. Complete New & Updated Modules (Batch 1B + Batch 2)

### `lib/config.ts`

```typescript
export const COLORS = {
  void: "#040711",
  obsidian: "#070709",
  orbit: "#06B6D4",
  soil: "#C9A24A",
  vigor: "#10B981",
  rust: "#C1440E",
  heart: "#E11D48",
  bone: "#FAF8F5",
} as const;

export const WORDS = ["From", "Heart", "To", "Mars"] as const;

export const GLOW_COLORS = [
  COLORS.orbit, // From
  COLORS.heart, // Heart
  COLORS.soil,  // To
  COLORS.rust,  // Mars
] as const;

// Scroll-driven tunables
export const PIN_VH = 500;
export const SCRUB = 0.8;

export const LETTER_RAMP = {
  landscape: 0.12,
  portrait: 0.08,
} as const;

export const P_NOMINAL = {
  landscape: [0.22, 0.34, 0.46, 0.58] as const,
  portrait: [0.20, 0.33, 0.46, 0.59] as const,
} as const;

export const P_RAMP = 0.06;
export const HOLD = 0.3;
export const CANVAS_DIM = 0.3;
export const NUDGE_DELAY_MS = 4000;
export const PORTRAIT_STACK_SPAN = 0.45;

// 8.0s master timeline labels + 1.2s boot duration
export const LABELS = {
  boot: 1.2,
  liftoff: 0.0,
  cruise: 0.8,
  mars: 5.6,
  settle: 6.8,
  hold: 7.1,
  morph: 7.4,
  end: 8.0,
} as const;

export const DURATIONS = {
  total: 8.0,
  boot: 1.2,
  capitalMove: 0.6,
  tailLetter: 0.35,
  glowDecay: 0.9,
} as const;

export const EASINGS = {
  EASE_LIFTOFF: "power2.in",
  EASE_CRUISE: "none",
  EASE_LAND: "power3.out",
  EASE_LETTER: "back.out(1.6)",
  EASE_TAIL: "power2.out",
  EASE_SETTLE: "power3.inOut",
} as const;

// Displacement magnitudes in em for landscape vs portrait
export const LETTER_DISP = {
  landscape: {
    initial: 0.55,
    fired: 0.95,
  },
  portrait: {
    initial: 0.45,
    fired: 0.85,
  },
} as const;

// F and T are negative (-1: up in landscape, left in portrait);
// H and M are positive (+1: down in landscape, right in portrait).
export const LETTER_SIGNS = [-1, 1, -1, 1] as const;

// Portrait & landscape both fire in reading order F (0), H (1), T (2), M (3) with dir = +1
export const LAYOUT_PARAMS = {
  landscape: {
    axis: "x" as const,
    dir: 1 as const,
    order: [0, 1, 2, 3] as const,
  },
  portrait: {
    axis: "y" as const,
    dir: 1 as const,
    order: [0, 1, 2, 3] as const,
  },
} as const;

export const TAIL_STAGGER = 0.04;
export const DIM_OPACITY = 0.35;

export const DPR_MAX = {
  landscape: 2,
  portrait: 1.5,
} as const;

export const TRAIL_COUNT = {
  landscape: 600,
  portrait: 180,
} as const;

export const STAR_COUNT = {
  landscape: 1500,
  portrait: 500,
} as const;

export const PARALLAX = {
  x: 0.25,
  y: 0.15,
  lerp: 0.06,
} as const;

export const CAMERA = {
  fov: 42,
  z: [10.8, 10.0, 10.5] as const,
  track: 0.06,
} as const;

export const SUN_INTENSITY = 2.2;
export const RIM_LIGHT_INTENSITY = 0.8;
export const RIM_POWER = 3.0;
export const HEART_BPM = 72;

export const TASHKENT = {
  lat: 41.31,
  lon: 69.24,
} as const;

export const DEFAULT_TAGLINE =
  "Climate-adaptive crop rotation powered by NASA Earth observations";
export const DEFAULT_CTA_HREF = "#farm-map";

```

### `components/intro/lib/config.ts`

```typescript
export * from "@/lib/config";

```

### `components/intro/introState.ts`

```typescript
import { CAMERA } from "@/lib/config";

export interface IntroState {
  letter: [number, number, number, number];
  sceneLive: boolean;
  p: number;
  deltaP: number;
  beat: number;
  rumble: number;
  trailRate: number;
  marsRipple: number;
  triggerPx: [number, number, number, number];
  // Auxiliary visual progress fields driven by Boot & Master timelines
  rim: number;
  stars: number;
  marsIn: number;
  marsHeart: number;
  camZ: number;
  camX: number;
  rocketPx: { x: number; y: number };
}

export function createIntroState(): IntroState {
  return {
    letter: [0, 0, 0, 0],
    sceneLive: false,
    p: 0,
    deltaP: 0,
    beat: 1,
    rumble: 0,
    trailRate: 0,
    marsRipple: 0,
    triggerPx: [0, 0, 0, 0],
    rim: 0,
    stars: 0,
    marsIn: 2.5,
    marsHeart: 0,
    camZ: CAMERA.z[0],
    camX: 0,
    rocketPx: { x: -9999, y: -9999 },
  };
}

export const introState: IntroState = createIntroState();

export function resetIntroState(target: IntroState = introState): IntroState {
  const fresh = createIntroState();
  target.letter = [...fresh.letter];
  target.sceneLive = fresh.sceneLive;
  target.p = fresh.p;
  target.deltaP = fresh.deltaP;
  target.beat = fresh.beat;
  target.rumble = fresh.rumble;
  target.trailRate = fresh.trailRate;
  target.marsRipple = fresh.marsRipple;
  target.triggerPx = [...fresh.triggerPx];
  target.rim = fresh.rim;
  target.stars = fresh.stars;
  target.marsIn = fresh.marsIn;
  target.marsHeart = fresh.marsHeart;
  target.camZ = fresh.camZ;
  target.camX = fresh.camX;
  target.rocketPx = { ...fresh.rocketPx };
  return target;
}

```

### `components/intro/lib/webgl.ts`

```typescript
export function isWebGL2Available(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    return Boolean(gl);
  } catch {
    return false;
  }
}

```

### `components/intro/hooks/useIntroMode.ts`

```typescript
"use client";

import { useEffect, useState } from "react";
import { isWebGL2Available } from "../lib/webgl";

export type IntroMode = "pending" | "full" | "poster";

export function useIntroMode(): [IntroMode, (mode: IntroMode) => void] {
  const [mode, setMode] = useState<IntroMode>("pending");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const evaluate = () => {
      if (mq.matches || !isWebGL2Available()) {
        setMode("poster");
      } else {
        setMode("full");
      }
    };

    evaluate();
    mq.addEventListener("change", evaluate);
    return () => {
      mq.removeEventListener("change", evaluate);
    };
  }, []);

  return [mode, setMode];
}

```

### `components/intro/hooks/useLayoutMode.ts`

```typescript
"use client";

import { useEffect, useState } from "react";

export type LayoutMode = "landscape" | "portrait";

const PORTRAIT_QUERY = "(orientation: portrait) and (max-width: 767px)";

export function useLayoutMode(): LayoutMode {
  const [layout, setLayout] = useState<LayoutMode>("landscape");

  useEffect(() => {
    const mql = window.matchMedia(PORTRAIT_QUERY);
    setLayout(mql.matches ? "portrait" : "landscape");

    const handleChange = (e: MediaQueryListEvent) => {
      setLayout(e.matches ? "portrait" : "landscape");
    };

    mql.addEventListener("change", handleChange);
    return () => {
      mql.removeEventListener("change", handleChange);
    };
  }, []);

  return layout;
}

```

### `components/hero/TeamBadge.tsx`

```tsx
"use client";

import React, { forwardRef } from "react";

interface TeamBadgeProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Empty measuring slot target inside Hero.tsx with exact badge chrome and dimensions.
 * Contains no duplicate "From Heart To Mars" text so screen readers announce the phrase only once.
 */
const TeamBadge = forwardRef<HTMLDivElement, TeamBadgeProps>(
  ({ children, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`inline-flex items-center gap-2.5 rounded-full border border-bone/15 bg-void/70 px-4 py-1.5 backdrop-blur-md ${className}`}
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full bg-heart shadow-[0_0_8px_#E11D48]"
        />
        <span
          aria-hidden="true"
          className="font-mono text-xs uppercase tracking-widest text-bone/60"
        >
          TEAM //
        </span>
        {/* Target slot box matching the exact width/height of settled "From Heart To Mars" */}
        <div
          data-badge-text-slot
          className="relative flex min-h-[1.5rem] min-w-[10.75rem] items-center justify-center"
        >
          {children}
        </div>
      </div>
    );
  }
);

TeamBadge.displayName = "TeamBadge";

export default TeamBadge;

```

### `components/hero/Hero.tsx`

```tsx
"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import TeamBadge from "./TeamBadge";
import { DEFAULT_CTA_HREF, DEFAULT_TAGLINE } from "@/lib/config";

interface HeroProps {
  tagline?: string;
  ctaHref?: string;
  badgeSlotRef: React.RefObject<HTMLDivElement | null>;
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
            Field Shift UZ
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

```

### `components/intro/FhtmPhrase.tsx`

```tsx
"use client";

import React, { forwardRef } from "react";
import {
  DIM_OPACITY,
  GLOW_COLORS,
  LETTER_DISP,
  LETTER_SIGNS,
  WORDS,
} from "@/lib/config";
import type { LayoutMode } from "./hooks/useLayoutMode";

interface FhtmPhraseProps {
  layout: LayoutMode;
  staticPoster?: boolean;
}

const FhtmPhrase = forwardRef<HTMLDivElement, FhtmPhraseProps>(
  ({ layout, staticPoster = false }, ref) => {
    const isPortrait = layout === "portrait";
    const dispMag = isPortrait
      ? LETTER_DISP.portrait.initial
      : LETTER_DISP.landscape.initial;

    return (
      <div
        ref={ref}
        role="img"
        aria-label="From Heart to Mars"
        style={
          {
            "--settle": staticPoster ? 1 : 0,
            fontSize: staticPoster
              ? "1rem"
              : isPortrait
              ? "clamp(2.5rem, 13vw, 4rem)"
              : "clamp(2.25rem, 5.2vw, 5.5rem)",
          } as React.CSSProperties
        }
        className={`select-none font-display leading-none tracking-tight text-bone will-change-transform ${
          staticPoster
            ? "inline-flex flex-row items-center justify-center gap-[0.3em] font-semibold"
            : isPortrait
            ? "flex flex-col items-center justify-center gap-6 font-medium"
            : "flex flex-row items-center justify-center gap-[0.38em] font-medium"
        }`}
      >
        {WORDS.map((word, wordIdx) => {
          const capital = word[0];
          const tails = word.slice(1).split("");
          const sign = LETTER_SIGNS[wordIdx];
          const initialDisp = staticPoster ? 0 : sign * dispMag;
          const glowColor = GLOW_COLORS[wordIdx];

          const wordTransform = staticPoster
            ? "none"
            : isPortrait
            ? "translateX(calc(var(--disp, 0) * (1 - var(--settle, 0)) * 1em))"
            : "translateY(calc(var(--disp, 0) * (1 - var(--settle, 0)) * 1em))";

          return (
            <span
              key={word}
              data-word-index={wordIdx}
              aria-hidden="true"
              style={
                {
                  "--disp": initialDisp,
                  "--glow": 0,
                  "--glow-color": glowColor,
                  transform: wordTransform,
                  textShadow: staticPoster
                    ? "none"
                    : "0 0 calc(28px * var(--glow, 0)) var(--glow-color), 0 0 calc(10px * var(--glow, 0)) var(--glow-color)",
                } as React.CSSProperties
              }
              className="inline-block whitespace-nowrap will-change-transform"
            >
              <span
                data-capital-index={wordIdx}
                aria-hidden="true"
                style={{
                  opacity: staticPoster ? 1 : DIM_OPACITY,
                }}
                className="inline-block will-change-[transform,opacity]"
              >
                {capital}
              </span>
              {tails.map((char, charIdx) => (
                <span
                  key={charIdx}
                  data-tail-word={wordIdx}
                  data-tail-index={charIdx}
                  aria-hidden="true"
                  style={{
                    opacity: staticPoster ? 1 : 0,
                  }}
                  className="inline-block will-change-[transform,opacity]"
                >
                  {char}
                </span>
              ))}
            </span>
          );
        })}
      </div>
    );
  }
);

FhtmPhrase.displayName = "FhtmPhrase";

export default FhtmPhrase;

```

### `components/intro/SkipButton.tsx`

```tsx
"use client";

import React, { forwardRef } from "react";

interface SkipButtonProps {
  onSkip: () => void;
  hidden?: boolean;
}

const SkipButton = forwardRef<HTMLButtonElement, SkipButtonProps>(
  ({ onSkip, hidden = false }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onSkip}
        tabIndex={hidden ? -1 : 0}
        aria-hidden={hidden ? "true" : undefined}
        className={`pointer-events-auto fixed bottom-6 right-6 z-50 rounded-full border border-bone/20 bg-void/80 px-4 py-2 font-mono text-xs uppercase tracking-widest text-bone/80 backdrop-blur-md transition-opacity duration-300 hover:border-bone/50 hover:text-bone focus:outline-none focus-visible:ring-2 focus-visible:ring-orbit ${
          hidden ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        Skip intro
      </button>
    );
  }
);

SkipButton.displayName = "SkipButton";

export default SkipButton;

```

### `components/intro/IntroOverlay.tsx`

```tsx
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

```

### `components/intro/useIntroTimeline.ts`

```typescript
"use client";

import { RefObject, useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  CAMERA,
  CANVAS_DIM,
  DIM_OPACITY,
  DURATIONS,
  EASINGS,
  LABELS,
  LETTER_DISP,
  LETTER_SIGNS,
  NUDGE_DELAY_MS,
  P_NOMINAL,
  P_RAMP,
  SCRUB,
  TAIL_STAGGER,
} from "@/lib/config";
import { introState, resetIntroState } from "./introState";

export interface UseIntroTimelineParams {
  enabled: boolean;
  wrapperRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLElement | null>;
  phraseRef: RefObject<HTMLElement | null>;
  badgeSlotRef: RefObject<HTMLElement | null>;
  isPortrait: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function useIntroTimeline({
  enabled,
  wrapperRef,
  stageRef,
  phraseRef,
  badgeSlotRef,
  isPortrait,
}: UseIntroTimelineParams) {
  const stRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    if (!enabled || !wrapperRef.current || !phraseRef.current) return;

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const wrapperEl = wrapperRef.current;
    const stageEl = stageRef.current;
    const phraseEl = phraseRef.current;
    const layoutKey = isPortrait ? "portrait" : "landscape";
    const dispConfig = LETTER_DISP[layoutKey];

    resetIntroState(introState);

    let teaseTimer: ReturnType<typeof setTimeout> | null = null;
    let teaseTween: gsap.core.Timeline | null = null;
    let teaseCancelled = false;

    // Measure capital centers in screen pixels via ResizeObserver + window scroll/resize
    const measureTriggers = () => {
      const capEls = phraseEl.querySelectorAll<HTMLElement>(
        "[data-capital-index]"
      );
      capEls.forEach((capEl, idx) => {
        if (idx >= 0 && idx < 4) {
          const rect = capEl.getBoundingClientRect();
          introState.triggerPx[idx] = isPortrait
            ? rect.top + rect.height * 0.5
            : rect.left + rect.width * 0.5;
        }
      });
    };

    measureTriggers();
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(measureTriggers).catch(() => {});
    }

    const ro = new ResizeObserver(() => {
      measureTriggers();
    });
    ro.observe(phraseEl);
    if (stageEl) ro.observe(stageEl);

    const cancelTease = () => {
      if (teaseCancelled) return;
      teaseCancelled = true;
      if (teaseTimer) {
        clearTimeout(teaseTimer);
        teaseTimer = null;
      }
      if (teaseTween) {
        teaseTween.kill();
        teaseTween = null;
      }
      introState.rumble = 0;
    };

    const letterTimelines: gsap.core.Timeline[] = [];

    const ctx = gsap.context(() => {
      const wordEls = Array.from(
        phraseEl.querySelectorAll<HTMLElement>("[data-word-index]")
      );
      const capitalEls = Array.from(
        phraseEl.querySelectorAll<HTMLElement>("[data-capital-index]")
      );
      const allTails = phraseEl.querySelectorAll<HTMLElement>(
        "[data-tail-word]"
      );

      const scrollCueEl =
        stageEl?.querySelector<HTMLElement>("[data-scroll-cue]") ?? null;
      const scrollHairlineEl =
        stageEl?.querySelector<HTMLElement>("[data-scroll-hairline]") ?? null;
      const skipBtnWrapEl =
        stageEl?.querySelector<HTMLElement>("[data-skip-btn-wrap]") ?? null;
      const canvasContainerEl =
        stageEl?.querySelector<HTMLElement>("[data-canvas-wrap]") ?? null;
      const heroSectionEl =
        stageEl?.querySelector<HTMLElement>("section") ?? null;
      const heroTitleEl =
        stageEl?.querySelector<HTMLElement>("[data-hero-title]") ?? null;
      const heroTaglineEl =
        stageEl?.querySelector<HTMLElement>("[data-hero-tagline]") ?? null;
      const heroCtaEl =
        stageEl?.querySelector<HTMLElement>("[data-hero-cta]") ?? null;

      // Initialize phrase & word custom properties
      gsap.set(phraseEl, {
        "--settle": 0,
        x: 0,
        y: 0,
        scale: 1,
      });

      wordEls.forEach((wordEl, i) => {
        const sign = LETTER_SIGNS[i];
        gsap.set(wordEl, {
          "--disp": sign * dispConfig.initial,
          "--glow": 0,
        });
      });

      capitalEls.forEach((capEl) => {
        gsap.set(capEl, { opacity: DIM_OPACITY });
      });

      gsap.set(allTails, {
        opacity: 0,
        y: "0.16em",
      });

      if (heroSectionEl) {
        gsap.set(heroSectionEl, { opacity: 0 });
      }
      const heroItems = [heroTitleEl, heroTaglineEl, heroCtaEl].filter(Boolean);
      if (heroItems.length > 0) {
        gsap.set(heroItems, { opacity: 0, y: 16 });
      }

      // Build 4 paused reversible letter timelines (scrubbed 0..1 by ticker)
      for (let i = 0; i < 4; i++) {
        const wordEl = wordEls[i];
        const capEl = capitalEls[i];
        const tailEls = Array.from(
          phraseEl.querySelectorAll<HTMLElement>(`[data-tail-word="${i}"]`)
        );
        const sign = LETTER_SIGNS[i];

        const ltl = gsap.timeline({ paused: true });

        if (wordEl) {
          ltl.fromTo(
            wordEl,
            { "--disp": sign * dispConfig.initial, "--glow": 0 },
            {
              "--disp": sign * dispConfig.fired,
              "--glow": 0.65,
              duration: DURATIONS.capitalMove,
              ease: EASINGS.EASE_LETTER,
            },
            0
          );
        }

        if (capEl) {
          ltl.fromTo(
            capEl,
            { opacity: DIM_OPACITY },
            {
              opacity: 1,
              duration: DURATIONS.capitalMove * 0.6,
              ease: "power2.out",
            },
            0
          );
        }

        if (tailEls.length > 0) {
          ltl.fromTo(
            tailEls,
            { opacity: 0, y: "0.16em" },
            {
              opacity: 1,
              y: "0em",
              duration: DURATIONS.tailLetter,
              stagger: TAIL_STAGGER,
              ease: EASINGS.EASE_TAIL,
            },
            0.06
          );
        }

        letterTimelines.push(ltl);
      }

      // 1. BOOT TIMELINE (1.2s, non-scrubbed, runs once on mount)
      const bootTl = gsap.timeline();
      bootTl.fromTo(
        introState,
        { stars: 0, rim: 0, beat: 0.4, camZ: CAMERA.z[0] },
        {
          stars: 1,
          rim: 1,
          beat: 1,
          camZ: CAMERA.z[1],
          duration: LABELS.boot,
          ease: "power2.out",
        },
        0
      );

      if (scrollCueEl) {
        bootTl.fromTo(
          scrollCueEl,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power2.out",
          },
          0.45
        );
      }

      // 2. MASTER TIMELINE (8.0s, scrubbed via ScrollTrigger)
      const master = gsap.timeline({
        scrollTrigger: {
          trigger: wrapperEl,
          start: "top top",
          end: "bottom bottom",
          scrub: SCRUB,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            introState.deltaP = Math.max(0, self.progress - introState.p);
            introState.p = self.progress;

            if (self.progress > 0.001) {
              cancelTease();
            }

            if (skipBtnWrapEl) {
              skipBtnWrapEl.style.opacity = self.progress > 0.95 ? "0" : "1";
              skipBtnWrapEl.style.pointerEvents =
                self.progress > 0.95 ? "none" : "auto";
            }
          },
        },
      });

      stRef.current = master.scrollTrigger ?? null;

      master.addLabel("liftoff", LABELS.liftoff); // 0.0
      master.addLabel("cruise", LABELS.cruise);   // 0.8
      master.addLabel("mars", LABELS.mars);       // 5.6
      master.addLabel("settle", LABELS.settle);   // 6.8
      master.addLabel("hold", LABELS.hold);       // 7.1
      master.addLabel("morph", LABELS.morph);     // 7.4
      master.addLabel("end", LABELS.end);         // 8.0

      // 0.0 - 0.16s (first 2% of scroll): "Scroll to launch" cue fades out
      if (scrollCueEl) {
        master.fromTo(
          scrollCueEl,
          { opacity: 1 },
          { opacity: 0, duration: 0.16, ease: "none", immediateRender: false },
          0.0
        );
      }

      // 0.0 - 0.8s: Heart beat spike, trail emission starts, liftoff & bank
      master.to(
        introState,
        { beat: 1.8, duration: 0.2, yoyo: true, repeat: 1 },
        0.0
      );
      master.set(introState, { trailRate: 1 }, 0.2);

      // 0.8 - 5.6s: Cruise phase (camera subtle track)
      master.to(
        introState,
        {
          camX: 0.18,
          duration: LABELS.mars - LABELS.cruise,
          ease: EASINGS.EASE_CRUISE,
        },
        "cruise"
      );

      // 5.6 - 6.8s: Mars slides in, landing, marsRipple 0 -> 1
      master.fromTo(
        introState,
        { marsIn: 2.5 },
        {
          marsIn: 0,
          camX: 0.3,
          trailRate: 0,
          duration: LABELS.settle - LABELS.mars,
          ease: EASINGS.EASE_LAND,
        },
        "mars"
      );

      master.fromTo(
        introState,
        { marsHeart: 0, marsRipple: 0 },
        {
          marsHeart: 1,
          marsRipple: 1,
          duration: 0.9,
          ease: "power2.out",
        },
        5.9
      );

      // 6.8 - 7.1s (settle): --settle 0 -> 1 aligns words onto single baseline
      master.fromTo(
        phraseEl,
        { "--settle": 0 },
        {
          "--settle": 1,
          duration: LABELS.hold - LABELS.settle,
          ease: EASINGS.EASE_SETTLE,
        },
        "settle"
      );

      master.to(
        wordEls,
        {
          "--glow": 0,
          duration: LABELS.hold - LABELS.settle,
          ease: "power2.out",
        },
        "settle"
      );

      master.to(
        introState,
        {
          camX: 0,
          duration: LABELS.hold - LABELS.settle,
          ease: EASINGS.EASE_SETTLE,
        },
        "settle"
      );

      // 7.1 - 7.4s (hold): 0.3s hold on baseline (~18vh of scroll, no snap)

      // 7.4 - 8.0s (morph): FhtmPhrase morphs into TeamBadge's slot; Hero fades in; Canvas dims to CANVAS_DIM (0.3)
      const morphDuration = LABELS.end - LABELS.morph;

      master.to(
        phraseEl,
        {
          x: () => {
            const badgeEl = badgeSlotRef.current;
            if (!badgeEl) return 0;
            const slotEl =
              badgeEl.querySelector<HTMLElement>("[data-badge-text-slot]") ??
              badgeEl;
            const bRect = slotEl.getBoundingClientRect();
            const stageRect = (
              stageEl ?? document.documentElement
            ).getBoundingClientRect();
            const stageCenterX = stageRect.left + stageRect.width * 0.5;
            const targetCenterX = bRect.left + bRect.width * 0.5;
            return targetCenterX - stageCenterX;
          },
          y: () => {
            const badgeEl = badgeSlotRef.current;
            if (!badgeEl) return -160;
            const slotEl =
              badgeEl.querySelector<HTMLElement>("[data-badge-text-slot]") ??
              badgeEl;
            const bRect = slotEl.getBoundingClientRect();
            const stageRect = (
              stageEl ?? document.documentElement
            ).getBoundingClientRect();
            const stageCenterY = stageRect.top + stageRect.height * 0.5;
            const targetCenterY = bRect.top + bRect.height * 0.5;
            return targetCenterY - stageCenterY;
          },
          scale: () => {
            const badgeEl = badgeSlotRef.current;
            if (!badgeEl) return 0.28;
            const slotEl =
              badgeEl.querySelector<HTMLElement>("[data-badge-text-slot]") ??
              badgeEl;
            const bRect = slotEl.getBoundingClientRect();
            const naturalWidth = Math.max(1, phraseEl.offsetWidth);
            return clamp(bRect.width / naturalWidth, 0.16, 0.55);
          },
          duration: morphDuration,
          ease: EASINGS.EASE_SETTLE,
        },
        "morph"
      );

      if (canvasContainerEl) {
        master.to(
          canvasContainerEl,
          {
            opacity: CANVAS_DIM,
            duration: morphDuration,
            ease: "power2.inOut",
          },
          "morph"
        );
      }

      master.to(
        introState,
        {
          camZ: CAMERA.z[2],
          duration: morphDuration,
          ease: EASINGS.EASE_SETTLE,
        },
        "morph"
      );

      if (heroSectionEl) {
        master.to(
          heroSectionEl,
          {
            opacity: 1,
            duration: morphDuration * 0.75,
            ease: "power2.out",
          },
          "morph"
        );
      }

      if (heroTitleEl) {
        master.to(
          heroTitleEl,
          { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
          7.45
        );
      }
      if (heroTaglineEl) {
        master.to(
          heroTaglineEl,
          { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
          7.55
        );
      }
      if (heroCtaEl) {
        master.to(
          heroCtaEl,
          { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
          7.65
        );
      }

      // 4s Idle Tease (NUDGE_DELAY_MS = 4000)
      if (NUDGE_DELAY_MS > 0) {
        teaseTimer = setTimeout(() => {
          if (teaseCancelled || introState.p > 0.001) return;
          teaseTween = gsap.timeline();
          teaseTween.to(introState, {
            rumble: 1,
            beat: 1.5,
            duration: 0.35,
            yoyo: true,
            repeat: 3,
            ease: "sine.inOut",
            onComplete: () => {
              introState.rumble = 0;
              introState.beat = 1;
            },
          });

          if (scrollCueEl) {
            gsap.fromTo(
              scrollCueEl,
              { scale: 1 },
              {
                scale: 1.08,
                duration: 0.35,
                yoyo: true,
                repeat: 3,
                ease: "sine.inOut",
              }
            );
          }
          if (scrollHairlineEl) {
            gsap.fromTo(
              scrollHairlineEl,
              { scaleY: 1 },
              {
                scaleY: 1.45,
                duration: 0.35,
                yoyo: true,
                repeat: 3,
                ease: "sine.inOut",
              }
            );
          }
        }, NUDGE_DELAY_MS);
      }
    }, stageEl ?? wrapperEl);

    // 3. LETTER TICKER (gsap.ticker)
    const tickLetters = () => {
      const nominals = P_NOMINAL[layoutKey];
      for (let i = 0; i < 4; i++) {
        if (!introState.sceneLive) {
          introState.letter[i] = clamp(
            (introState.p - nominals[i]) / P_RAMP,
            0,
            1
          );
        }
        // Smoothly drive letter progress to full completion once settling begins
        const settleForce = clamp((introState.p - 0.82) / 0.04, 0, 1);
        const progress = Math.max(introState.letter[i], settleForce);
        letterTimelines[i]?.progress(progress);
      }
    };

    gsap.ticker.add(tickLetters);

    return () => {
      cancelTease();
      gsap.ticker.remove(tickLetters);
      ro.disconnect();
      ctx.revert();
      stRef.current = null;
    };
  }, [enabled, isPortrait, wrapperRef, stageRef, phraseRef, badgeSlotRef]);

  const skip = useCallback(() => {
    const st = stRef.current;
    if (st && typeof window !== "undefined") {
      window.scrollTo({ top: st.end, behavior: "smooth" });
    } else if (wrapperRef.current && typeof window !== "undefined") {
      const rect = wrapperRef.current.getBoundingClientRect();
      const targetTop =
        window.scrollY + rect.top + wrapperRef.current.offsetHeight - window.innerHeight;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }
  }, [wrapperRef]);

  return { skip };
}

```

### `components/intro/IntroGate.tsx`

```tsx
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

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const phraseRef = useRef<HTMLDivElement | null>(null);
  const badgeSlotRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

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
        className="sticky top-0 h-[100svh] w-full overflow-hidden bg-hero-backdrop"
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

```

---

### Part 2: Batch 2 — 3D Scene Modules (`components/intro/scene/`)

### `components/intro/scene/Starfield.tsx`

```tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { STAR_COUNT } from "@/lib/config";
import { introState } from "../introState";

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;

uniform float uTime;
uniform float uPixelRatio;

varying float vTwinkle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float twinkle = 0.65 + 0.35 * sin(uTime * 2.2 + aPhase);
  vTwinkle = twinkle;

  gl_PointSize = aSize * uPixelRatio * (18.0 / max(1.0, -mvPosition.z));
}
`;

const STAR_FRAG = /* glsl */ `
uniform float uOpacity;
varying float vTwinkle;

void main() {
  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  float r = dot(cxy, cxy);
  if (r > 1.0) discard;

  float soft = pow(1.0 - r, 1.8);
  vec3 bone = vec3(0.98, 0.973, 0.961);
  vec3 cyanTint = vec3(0.024, 0.714, 0.831);
  vec3 col = mix(bone, cyanTint, 0.18 * (1.0 - vTwinkle));

  gl_FragColor = vec4(col, soft * vTwinkle * uOpacity);
}
`;

interface StarfieldProps {
  isPortrait: boolean;
}

export default function Starfield({ isPortrait }: StarfieldProps) {
  const { gl } = useThree();
  const count = isPortrait ? STAR_COUNT.portrait : STAR_COUNT.landscape;

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Deterministic pseudo-random distribution across camera frustum depth
      const seed = i * 12.9898;
      const rx = Math.sin(seed) * 43758.5453;
      const ry = Math.sin(seed + 1.23) * 23421.6312;
      const rz = Math.sin(seed + 2.47) * 65432.1234;
      const rs = Math.sin(seed + 3.91) * 19283.4756;

      const ux = rx - Math.floor(rx);
      const uy = ry - Math.floor(ry);
      const uz = rz - Math.floor(rz);
      const us = rs - Math.floor(rs);

      positions[i * 3 + 0] = (ux - 0.5) * 32.0;
      positions[i * 3 + 1] = (uy - 0.5) * 22.0;
      positions[i * 3 + 2] = -2.5 - uz * 14.0;

      sizes[i] = 1.2 + us * 2.4;
      phases[i] = ux * Math.PI * 2.0;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      },
    });

    return { geometry: geo, material: mat };
  }, [count, gl]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime();
    material.uniforms.uOpacity.value = introState.stars;
    material.uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

```

### `components/intro/scene/Earth.tsx`

```tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, RIM_POWER, TASHKENT } from "@/lib/config";
import { introState } from "../introState";

const EARTH_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocalPos;

void main() {
  vLocalPos = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosW = worldPos.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const EARTH_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uRimColor;
uniform float uRimIntensity;
uniform float uRimPower;
uniform float uTime;
uniform vec3 uLand;
uniform vec3 uOcean;
uniform vec3 uTashkentLocal;

varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocalPos;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.04;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 nLocal = normalize(vLocalPos);
  float n = fbm(nLocal * 2.8 + vec3(0.4, -0.2, 0.7));
  float landMask = smoothstep(0.47, 0.53, n);

  // Faint cyan lat/lon graticule
  float lat = asin(clamp(nLocal.y, -1.0, 1.0));
  float lon = atan(nLocal.z, nLocal.x);
  float gridLat = abs( fract(lat * 6.0 / 3.14159265) - 0.5 );
  float gridLon = abs( fract(lon * 12.0 / 3.14159265) - 0.5 );
  float graticule = 1.0 - smoothstep(0.0, 0.035, min(gridLat, gridLon));

  vec3 surfaceColor = mix(uOcean, uLand * 0.45, landMask);
  surfaceColor += uRimColor * graticule * 0.14;

  // Glowing marker ring at Tashkent (41.31N, 69.24E)
  float distTashkent = distance(nLocal, normalize(uTashkentLocal));
  float tashkentGlow = exp(-distTashkent * 26.0) * 0.85;
  surfaceColor += vec3(0.882, 0.114, 0.282) * tashkentGlow;

  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  float fres = pow(1.0 - max(dot(N, V), 0.0), uRimPower);
  float day = smoothstep(-0.15, 0.35, dot(N, uSunDir));
  float rim = fres * mix(0.35, 1.0, day) * uRimIntensity;
  vec3 color = surfaceColor * (0.08 + day * 0.92) + uRimColor * rim;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const EARTH_RADIUS = 1.85;

export function latLonToUnitVector(latDeg: number, lonDeg: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon)
  ).normalize();
}

export function getEarthPosition(
  viewportWidth: number,
  viewportHeight: number,
  isPortrait: boolean
): THREE.Vector3 {
  if (isPortrait) {
    return new THREE.Vector3(0, viewportHeight * 0.46, -0.6);
  }
  return new THREE.Vector3(-viewportWidth * 0.46, -viewportHeight * 0.12, -0.5);
}

export function getTashkentWorldAnchor(
  viewportWidth: number,
  viewportHeight: number,
  isPortrait: boolean
): { position: THREE.Vector3; normal: THREE.Vector3; earthQuat: THREE.Quaternion } {
  const earthCenter = getEarthPosition(viewportWidth, viewportHeight, isPortrait);
  const localTashkent = latLonToUnitVector(TASHKENT.lat, TASHKENT.lon);

  // Orient the globe so Tashkent faces toward the camera & flight corridor
  const desiredWorldNormal = isPortrait
    ? new THREE.Vector3(0.08, -0.55, 0.83).normalize()
    : new THREE.Vector3(0.58, 0.22, 0.78).normalize();

  const earthQuat = new THREE.Quaternion().setFromUnitVectors(
    localTashkent,
    desiredWorldNormal
  );

  const worldNormal = localTashkent.clone().applyQuaternion(earthQuat).normalize();
  const anchorPos = earthCenter
    .clone()
    .addScaledVector(worldNormal, EARTH_RADIUS * 1.02);

  return { position: anchorPos, normal: worldNormal, earthQuat };
}

interface EarthProps {
  isPortrait: boolean;
}

export default function Earth({ isPortrait }: EarthProps) {
  const { viewport } = useThree();

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(EARTH_RADIUS, 4);
    const localTashkent = latLonToUnitVector(TASHKENT.lat, TASHKENT.lon);

    const mat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.65, 0.4, 0.65).normalize() },
        uRimColor: { value: new THREE.Color(COLORS.orbit) },
        uRimIntensity: { value: 0 },
        uRimPower: { value: RIM_POWER },
        uTime: { value: 0 },
        uLand: { value: new THREE.Color(COLORS.vigor) },
        uOcean: { value: new THREE.Color(COLORS.void) },
        uTashkentLocal: { value: localTashkent },
      },
    });

    return { geometry: geo, material: mat };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const earthCenter = getEarthPosition(
    viewport.width,
    viewport.height,
    isPortrait
  );
  const { earthQuat } = getTashkentWorldAnchor(
    viewport.width,
    viewport.height,
    isPortrait
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime();
    material.uniforms.uRimIntensity.value = introState.rim;
  });

  return (
    <mesh
      position={earthCenter}
      quaternion={earthQuat}
      geometry={geometry}
      material={material}
    />
  );
}

```

### `components/intro/scene/HeartBeacon.tsx`

```tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, HEART_BPM } from "@/lib/config";
import { introState } from "../introState";
import { getTashkentWorldAnchor } from "./Earth";
import { getMarsLandingAnchor } from "./Mars";

const HEART_VERT = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const HEART_FRAG = /* glsl */ `
uniform float uTime;
uniform float uBpm;
uniform float uBeatAmp;
uniform float uOpacity;
uniform vec3 uColor;

varying vec2 vUv;

void main() {
  vec2 p = (vUv - 0.5) * 2.6;
  float t = fract(uTime * uBpm / 60.0);
  float beat = exp(-pow((t - 0.08) / 0.05, 2.0))
             + 0.6 * exp(-pow((t - 0.30) / 0.06, 2.0));
  p /= 1.0 + 0.12 * beat * uBeatAmp;
  float a = dot(p, p) - 1.0;
  float d = a * a * a - p.x * p.x * p.y * p.y * p.y;
  float core = smoothstep(0.02, -0.02, d);
  float halo = exp(-3.0 * length(p)) * (0.4 + 0.6 * beat);
  vec3 rgb = uColor * (1.0 + 0.8 * beat * core);
  float alpha = (core + 0.8 * halo) * uOpacity;

  if (alpha < 0.005) discard;
  gl_FragColor = vec4(rgb, alpha);
}
`;

interface HeartBeaconProps {
  isPortrait: boolean;
}

export default function HeartBeacon({ isPortrait }: HeartBeaconProps) {
  const { viewport, camera } = useThree();
  const earthHeartGroupRef = useRef<THREE.Group | null>(null);
  const marsHeartMeshRef = useRef<THREE.Mesh | null>(null);

  const {
    quadGeo,
    lowPolyHeartGeo,
    earthBillboardMat,
    marsBillboardMat,
    lowPolyMat,
  } = useMemo(() => {
    const qGeo = new THREE.PlaneGeometry(0.65, 0.65);

    // Procedural low-poly 3D heart core that detaches into the rocket on liftoff
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, -0.14);
    heartShape.bezierCurveTo(0, -0.1, -0.16, 0.02, -0.16, 0.11);
    heartShape.bezierCurveTo(-0.16, 0.19, -0.04, 0.22, 0, 0.12);
    heartShape.bezierCurveTo(0.04, 0.22, 0.16, 0.19, 0.16, 0.11);
    heartShape.bezierCurveTo(0.16, 0.02, 0, -0.1, 0, -0.14);

    const extrudeGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    });
    extrudeGeo.center();

    const makeHeartShader = () =>
      new THREE.ShaderMaterial({
        vertexShader: HEART_VERT,
        fragmentShader: HEART_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uBpm: { value: HEART_BPM },
          uBeatAmp: { value: 1 },
          uOpacity: { value: 1 },
          uColor: { value: new THREE.Color(COLORS.heart) },
        },
      });

    const lpMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.heart),
      emissive: new THREE.Color(COLORS.heart),
      emissiveIntensity: 0.9,
      flatShading: true,
      transparent: true,
      opacity: 1,
    });

    return {
      quadGeo: qGeo,
      lowPolyHeartGeo: extrudeGeo,
      earthBillboardMat: makeHeartShader(),
      marsBillboardMat: makeHeartShader(),
      lowPolyMat: lpMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      quadGeo.dispose();
      lowPolyHeartGeo.dispose();
      earthBillboardMat.dispose();
      marsBillboardMat.dispose();
      lowPolyMat.dispose();
    };
  }, [
    quadGeo,
    lowPolyHeartGeo,
    earthBillboardMat,
    marsBillboardMat,
    lowPolyMat,
  ]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const { position: tashkentPos, normal: tashkentNormal } =
      getTashkentWorldAnchor(viewport.width, viewport.height, isPortrait);

    // Detach into rocket during liftoff (0.0 - 0.8s -> p in 0.0..0.10)
    const detachProgress = THREE.MathUtils.clamp(introState.p / 0.1, 0, 1);

    if (earthHeartGroupRef.current) {
      earthHeartGroupRef.current.position
        .copy(tashkentPos)
        .addScaledVector(tashkentNormal, detachProgress * 0.35);
      earthHeartGroupRef.current.quaternion.copy(camera.quaternion);
      const scalePulse =
        1 + 0.08 * Math.sin(elapsed * (HEART_BPM / 60) * Math.PI * 2) * introState.beat;
      earthHeartGroupRef.current.scale.setScalar(
        scalePulse * (1 - detachProgress * 0.45)
      );
    }

    earthBillboardMat.uniforms.uTime.value = elapsed;
    earthBillboardMat.uniforms.uBeatAmp.value = introState.beat;
    earthBillboardMat.uniforms.uOpacity.value =
      introState.rim * (1 - detachProgress * 0.65);
    lowPolyMat.opacity = introState.rim * (1 - detachProgress * 0.85);

    // Mars landing heart marker
    const marsAnchor = getMarsLandingAnchor(
      viewport.width,
      viewport.height,
      isPortrait,
      introState.marsIn
    );
    if (marsHeartMeshRef.current) {
      marsHeartMeshRef.current.position.copy(marsAnchor.position);
      marsHeartMeshRef.current.quaternion.copy(camera.quaternion);
    }
    marsBillboardMat.uniforms.uTime.value = elapsed;
    marsBillboardMat.uniforms.uBeatAmp.value = 1;
    marsBillboardMat.uniforms.uOpacity.value = introState.marsHeart;
  });

  return (
    <>
      <group ref={earthHeartGroupRef}>
        <mesh geometry={quadGeo} material={earthBillboardMat} />
        <mesh
          geometry={lowPolyHeartGeo}
          material={lowPolyMat}
          scale={[0.55, 0.55, 0.55]}
        />
      </group>
      <mesh
        ref={marsHeartMeshRef}
        geometry={quadGeo}
        material={marsBillboardMat}
      />
    </>
  );
}

```

### `components/intro/scene/Mars.tsx`

```tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "@/lib/config";
import { introState } from "../introState";

const MARS_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocalPos;

void main() {
  vLocalPos = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosW = worldPos.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const MARS_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform float uTime;
uniform vec3 uRust;
uniform vec3 uSoil;
uniform vec3 uDark;
uniform float uRimIntensity;

varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocalPos;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm2(vec3 p) {
  return 0.65 * noise(p) + 0.35 * noise(p * 2.1);
}

void main() {
  vec3 nLocal = normalize(vLocalPos);
  float n = fbm2(nLocal * 3.1 + vec3(1.2, 0.5, -0.7));
  vec3 base = mix(uDark, uRust, smoothstep(0.25, 0.7, n));
  base = mix(base, uSoil, smoothstep(0.65, 0.9, n) * 0.55);

  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.2);
  float day = smoothstep(-0.2, 0.4, dot(N, uSunDir));
  vec3 rim = uSoil * fres * uRimIntensity * 0.75;

  vec3 col = base * (0.1 + 0.9 * day) + rim;
  gl_FragColor = vec4(col, 1.0);
}
`;

const RIPPLE_VERT = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RIPPLE_FRAG = /* glsl */ `
uniform float uRipple;
uniform vec3 uColor;

varying vec2 vUv;

void main() {
  if (uRipple <= 0.001 || uRipple >= 0.999) discard;
  vec2 p = (vUv - 0.5) * 2.0;
  float dist = length(p);
  float ring = exp(-pow((dist - uRipple) / 0.065, 2.0));
  float alpha = ring * pow(1.0 - uRipple, 2.0);
  if (alpha < 0.005) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

export const MARS_RADIUS = 1.45;

export function getMarsPosition(
  viewportWidth: number,
  viewportHeight: number,
  isPortrait: boolean,
  marsInOffset: number
): THREE.Vector3 {
  if (isPortrait) {
    return new THREE.Vector3(
      0,
      -viewportHeight * 0.44 - marsInOffset * 0.9,
      -0.6
    );
  }
  return new THREE.Vector3(
    viewportWidth * 0.45 + marsInOffset,
    viewportHeight * 0.1,
    -0.5
  );
}

export function getMarsLandingAnchor(
  viewportWidth: number,
  viewportHeight: number,
  isPortrait: boolean,
  marsInOffset = 0
): { position: THREE.Vector3; normal: THREE.Vector3 } {
  const marsCenter = getMarsPosition(
    viewportWidth,
    viewportHeight,
    isPortrait,
    marsInOffset
  );

  const landingNormal = isPortrait
    ? new THREE.Vector3(-0.08, 0.62, 0.78).normalize()
    : new THREE.Vector3(-0.62, -0.14, 0.77).normalize();

  const position = marsCenter
    .clone()
    .addScaledVector(landingNormal, MARS_RADIUS * 1.02);

  return { position, normal: landingNormal };
}

interface MarsProps {
  isPortrait: boolean;
}

export default function Mars({ isPortrait }: MarsProps) {
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);
  const rippleMeshRef = useRef<THREE.Mesh | null>(null);

  const { marsGeo, marsMat, rippleGeo, rippleMat } = useMemo(() => {
    const mGeo = new THREE.IcosahedronGeometry(MARS_RADIUS, 4);
    const mMat = new THREE.ShaderMaterial({
      vertexShader: MARS_VERT,
      fragmentShader: MARS_FRAG,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.65, 0.4, 0.65).normalize() },
        uTime: { value: 0 },
        uRust: { value: new THREE.Color(COLORS.rust) },
        uSoil: { value: new THREE.Color(COLORS.soil) },
        uDark: { value: new THREE.Color("#4A1806") },
        uRimIntensity: { value: 1 },
      },
    });

    const rGeo = new THREE.PlaneGeometry(1.3, 1.3);
    const rMat = new THREE.ShaderMaterial({
      vertexShader: RIPPLE_VERT,
      fragmentShader: RIPPLE_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uRipple: { value: 0 },
        uColor: { value: new THREE.Color(COLORS.heart) },
      },
    });

    return {
      marsGeo: mGeo,
      marsMat: mMat,
      rippleGeo: rGeo,
      rippleMat: rMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      marsGeo.dispose();
      marsMat.dispose();
      rippleGeo.dispose();
      rippleMat.dispose();
    };
  }, [marsGeo, marsMat, rippleGeo, rippleMat]);

  useFrame(({ clock }) => {
    const marsCenter = getMarsPosition(
      viewport.width,
      viewport.height,
      isPortrait,
      introState.marsIn
    );
    if (groupRef.current) {
      groupRef.current.position.copy(marsCenter);
    }

    const { position: landingPos, normal: landingNormal } =
      getMarsLandingAnchor(
        viewport.width,
        viewport.height,
        isPortrait,
        introState.marsIn
      );

    if (rippleMeshRef.current) {
      rippleMeshRef.current.position.copy(landingPos);
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        landingNormal
      );
      rippleMeshRef.current.quaternion.copy(q);
    }

    marsMat.uniforms.uTime.value = clock.getElapsedTime();
    rippleMat.uniforms.uRipple.value = introState.marsRipple;
  });

  return (
    <>
      <group ref={groupRef}>
        <mesh geometry={marsGeo} material={marsMat} />
      </group>
      <mesh ref={rippleMeshRef} geometry={rippleGeo} material={rippleMat} />
    </>
  );
}

```

### `components/intro/scene/Rocket.tsx`

```tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, LAYOUT_PARAMS, LETTER_RAMP } from "@/lib/config";
import { introState } from "../introState";
import { getTashkentWorldAnchor } from "./Earth";
import { getMarsLandingAnchor } from "./Mars";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function buildFlightCurve(
  viewportWidth: number,
  viewportHeight: number,
  isPortrait: boolean
): THREE.CubicBezierCurve3 {
  const startAnchor = getTashkentWorldAnchor(
    viewportWidth,
    viewportHeight,
    isPortrait
  );
  const endAnchor = getMarsLandingAnchor(
    viewportWidth,
    viewportHeight,
    isPortrait,
    0
  );

  const p0 = startAnchor.position.clone();
  const p3 = endAnchor.position.clone();

  if (isPortrait) {
    // Top-to-bottom flight corridor along the vertical phrase stack
    const p1 = p0
      .clone()
      .add(new THREE.Vector3(0.12, -viewportHeight * 0.18, 0.75));
    const p2 = p3
      .clone()
      .add(new THREE.Vector3(-0.08, viewportHeight * 0.18, 0.75));
    return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
  }

  // Left-to-right flight corridor between the raised & lowered letters
  const p1 = p0
    .clone()
    .add(new THREE.Vector3(viewportWidth * 0.18, 0.35, 0.85));
  const p2 = p3
    .clone()
    .add(new THREE.Vector3(-viewportWidth * 0.18, -0.15, 0.85));
  return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
}

interface RocketProps {
  isPortrait: boolean;
  rocketGroupRef: React.RefObject<THREE.Group | null>;
}

export default function Rocket({ isPortrait, rocketGroupRef }: RocketProps) {
  const { viewport, camera, size } = useThree();

  const curve = useMemo(
    () => buildFlightCurve(viewport.width, viewport.height, isPortrait),
    [viewport.width, viewport.height, isPortrait]
  );

  const {
    noseGeo,
    bodyGeo,
    finGeo,
    canopyGeo,
    hullMat,
    finMat,
    canopyMat,
    heartCoreMat,
  } = useMemo(() => {
    const nGeo = new THREE.ConeGeometry(0.11, 0.26, 6);
    nGeo.translate(0, 0.25, 0);

    const bGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.34, 6);
    bGeo.translate(0, -0.05, 0);

    const fGeo = new THREE.BoxGeometry(0.03, 0.16, 0.14);
    const cGeo = new THREE.OctahedronGeometry(0.055, 0);

    const hMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.bone),
      roughness: 0.35,
      metalness: 0.15,
      flatShading: true,
    });

    const fnMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.rust),
      roughness: 0.45,
      metalness: 0.2,
      flatShading: true,
    });

    const cnMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.orbit),
    });

    const hcMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.heart),
    });

    return {
      noseGeo: nGeo,
      bodyGeo: bGeo,
      finGeo: fGeo,
      canopyGeo: cGeo,
      hullMat: hMat,
      finMat: fnMat,
      canopyMat: cnMat,
      heartCoreMat: hcMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      noseGeo.dispose();
      bodyGeo.dispose();
      finGeo.dispose();
      canopyGeo.dispose();
      hullMat.dispose();
      finMat.dispose();
      canopyMat.dispose();
      heartCoreMat.dispose();
    };
  }, [
    noseGeo,
    bodyGeo,
    finGeo,
    canopyGeo,
    hullMat,
    finMat,
    canopyMat,
    heartCoreMat,
  ]);

  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const projVec = useMemo(() => new THREE.Vector3(), []);
  const posVec = useMemo(() => new THREE.Vector3(), []);
  const tanVec = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(({ clock }) => {
    const group = rocketGroupRef.current;
    if (!group) return;

    // Flight occupies 0.0 - 6.8s of the 8.0s master timeline (p = 0.0 -> 0.85)
    const flightT = clamp(introState.p / 0.85, 0, 1);

    curve.getPointAt(flightT, posVec);
    curve.getTangentAt(flightT, tanVec).normalize();

    // Subtle high-frequency ignition jitter offset during 4s idle tease
    if (introState.rumble > 0.001) {
      const t = clock.getElapsedTime() * 55.0;
      const amp = 0.035 * introState.rumble;
      posVec.x += Math.sin(t) * amp;
      posVec.y += Math.cos(t * 1.3) * amp;
    }

    group.position.copy(posVec);
    quat.setFromUnitVectors(upVec, tanVec);
    group.quaternion.copy(quat);

    // Project 3D rocket position to screen CSS pixels
    projVec.copy(posVec).project(camera);
    const px = (projVec.x * 0.5 + 0.5) * size.width;
    const py = (-projVec.y * 0.5 + 0.5) * size.height;
    introState.rocketPx.x = px;
    introState.rocketPx.y = py;

    // Continuous screen-space letter progress computation
    const layoutKey = isPortrait ? "portrait" : "landscape";
    const { axis, dir } = LAYOUT_PARAMS[layoutKey];
    const viewportAxis = axis === "x" ? size.width : size.height;
    const ramp = Math.max(1, viewportAxis * LETTER_RAMP[layoutKey]);
    const rocketCoord = axis === "x" ? px : py;

    for (let i = 0; i < 4; i++) {
      const triggerCoord = introState.triggerPx[i];
      introState.letter[i] = clamp(
        (dir * (rocketCoord - triggerCoord)) / ramp,
        0,
        1
      );
    }
    introState.sceneLive = true;
  });

  return (
    <group ref={rocketGroupRef}>
      <mesh geometry={noseGeo} material={hullMat} />
      <mesh geometry={bodyGeo} material={hullMat} />
      {/* 3 radial low-poly fins */}
      {[0, 1, 2].map((idx) => {
        const angle = (idx * Math.PI * 2) / 3;
        return (
          <group key={idx} rotation={[0, angle, 0]}>
            <mesh
              position={[0, -0.14, 0.12]}
              geometry={finGeo}
              material={finMat}
            />
          </group>
        );
      })}
      {/* Orbit cyan canopy & thruster */}
      <mesh
        position={[0, 0.06, 0.1]}
        geometry={canopyGeo}
        material={canopyMat}
      />
      <mesh
        position={[0, -0.23, 0]}
        geometry={canopyGeo}
        material={canopyMat}
      />
      {/* Heart-red emissive core */}
      <mesh
        position={[0, -0.02, 0]}
        scale={[0.8, 0.8, 0.8]}
        geometry={canopyGeo}
        material={heartCoreMat}
      />
    </group>
  );
}

```

### `components/intro/scene/Trail.tsx`

```tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, TRAIL_COUNT } from "@/lib/config";
import { introState } from "../introState";

interface ParticleData {
  active: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  isCyan: boolean;
}

interface TrailProps {
  isPortrait: boolean;
  rocketGroupRef: React.RefObject<THREE.Group | null>;
  qualityScale?: number;
}

export default function Trail({
  isPortrait,
  rocketGroupRef,
  qualityScale = 1,
}: TrailProps) {
  const maxCount = isPortrait ? TRAIL_COUNT.portrait : TRAIL_COUNT.landscape;
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const cursorRef = useRef(0);

  const { planeGeo, mat, particles, dummy, cyanColor, soilColor } =
    useMemo(() => {
      const geo = new THREE.PlaneGeometry(0.11, 0.11);
      const m = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });

      const pool: ParticleData[] = Array.from({ length: maxCount }, (_, i) => ({
        active: false,
        age: 0,
        life: 0.55,
        pos: new THREE.Vector3(0, 0, -9999),
        vel: new THREE.Vector3(),
        isCyan: i % 2 === 0,
      }));

      return {
        planeGeo: geo,
        mat: m,
        particles: pool,
        dummy: new THREE.Object3D(),
        cyanColor: new THREE.Color(COLORS.orbit),
        soilColor: new THREE.Color(COLORS.soil),
      };
    }, [maxCount]);

  useEffect(() => {
    return () => {
      planeGeo.dispose();
      mat.dispose();
    };
  }, [planeGeo, mat]);

  useFrame(({ camera }, delta) => {
    const instanced = meshRef.current;
    const rocket = rocketGroupRef.current;
    if (!instanced) return;

    const dt = Math.min(delta, 0.1);

    // Emit particles strictly proportional to forward scroll deltaP (zero when stationary or reverse scrolling)
    if (
      rocket &&
      introState.deltaP > 0.00005 &&
      introState.p > 0.01 &&
      introState.p < 0.85
    ) {
      const rawSpawn = Math.ceil(introState.deltaP * 420 * qualityScale);
      const spawnCount = Math.min(rawSpawn, 16);

      for (let s = 0; s < spawnCount; s++) {
        const idx = cursorRef.current % maxCount;
        cursorRef.current += 1;

        const p = particles[idx];
        p.active = true;
        p.age = 0;
        p.life = 0.4 + (idx % 5) * 0.08;

        // Spawn slightly behind rocket nozzle with subtle spread
        const spreadX = ((idx % 7) - 3) * 0.022;
        const spreadY = ((idx % 5) - 2) * 0.022;
        p.pos.copy(rocket.position).add(new THREE.Vector3(spreadX, spreadY, 0));
        p.vel.set(spreadX * 0.6, spreadY * 0.6, 0);
      }
    }

    // Consume deltaP for this frame so pausing scroll immediately stops emission
    introState.deltaP = 0;

    let needsColorUpdate = false;
    for (let i = 0; i < maxCount; i++) {
      const p = particles[i];
      if (!p.active) {
        dummy.position.set(0, 0, -9999);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
        continue;
      }

      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        dummy.position.set(0, 0, -9999);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const lifeRatio = 1 - p.age / p.life;
      p.pos.addScaledVector(p.vel, dt);

      dummy.position.copy(p.pos);
      dummy.quaternion.copy(camera.quaternion);
      dummy.scale.setScalar(lifeRatio);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);

      instanced.setColorAt(
        i,
        (p.isCyan ? cyanColor : soilColor).clone().multiplyScalar(lifeRatio)
      );
      needsColorUpdate = true;
    }

    instanced.instanceMatrix.needsUpdate = true;
    if (needsColorUpdate && instanced.instanceColor) {
      instanced.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[planeGeo, mat, maxCount]}
      frustumCulled={false}
    />
  );
}

```

### `components/intro/scene/IntroCamera.tsx`

```tsx
"use client";

import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  CAMERA,
  COLORS,
  PARALLAX,
  PORTRAIT_STACK_SPAN,
  RIM_LIGHT_INTENSITY,
  SUN_INTENSITY,
} from "@/lib/config";
import { introState } from "../introState";

interface IntroCameraProps {
  isPortrait: boolean;
  rocketGroupRef: React.RefObject<THREE.Group | null>;
}

export default function IntroCamera({
  isPortrait,
  rocketGroupRef,
}: IntroCameraProps) {
  const { camera } = useThree();
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerCurrent = useRef({ x: 0, y: 0 });
  const isCoarsePointer = useRef(false);

  useEffect(() => {
    isCoarsePointer.current = window.matchMedia("(pointer: coarse)").matches;
    if (isCoarsePointer.current) return;

    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
      pointerTarget.current.x = nx * PARALLAX.x;
      pointerTarget.current.y = ny * PARALLAX.y;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  useFrame(() => {
    if (!isCoarsePointer.current) {
      pointerCurrent.current.x = THREE.MathUtils.lerp(
        pointerCurrent.current.x,
        pointerTarget.current.x,
        PARALLAX.lerp
      );
      pointerCurrent.current.y = THREE.MathUtils.lerp(
        pointerCurrent.current.y,
        pointerTarget.current.y,
        PARALLAX.lerp
      );
    }

    const rocket = rocketGroupRef.current;
    const rocketTrackX = rocket ? rocket.position.x * CAMERA.track : 0;
    const portraitFramingY = isPortrait
      ? (0.5 - introState.p) * PORTRAIT_STACK_SPAN
      : 0;

    camera.position.x =
      introState.camX + rocketTrackX + pointerCurrent.current.x;
    camera.position.y = portraitFramingY + pointerCurrent.current.y;
    camera.position.z = introState.camZ;
    camera.lookAt(0, portraitFramingY * 0.35, 0);
  });

  return (
    <>
      <ambientLight color={COLORS.void} intensity={1.0} />
      <directionalLight
        color={COLORS.bone}
        intensity={SUN_INTENSITY}
        position={[6, 4, 6]}
      />
      <directionalLight
        color={COLORS.orbit}
        intensity={RIM_LIGHT_INTENSITY}
        position={[-6, 2, -4]}
      />
    </>
  );
}

```

### `components/intro/scene/IntroCanvas.tsx`

```tsx
"use client";

import React, { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { CAMERA, COLORS, DPR_MAX } from "@/lib/config";
import IntroCamera from "./IntroCamera";
import Starfield from "./Starfield";
import Earth from "./Earth";
import HeartBeacon from "./HeartBeacon";
import Rocket from "./Rocket";
import Trail from "./Trail";
import Mars from "./Mars";

interface IntroCanvasProps {
  isPortrait: boolean;
  inView: boolean;
  onContextLost?: () => void;
}

export default function IntroCanvas({
  isPortrait,
  inView,
  onContextLost,
}: IntroCanvasProps) {
  const rocketGroupRef = useRef<THREE.Group | null>(null);
  const [degraded, setDegraded] = useState(false);

  const maxDpr = isPortrait ? DPR_MAX.portrait : DPR_MAX.landscape;
  const dpr: [number, number] = degraded ? [1, 1] : [1, maxDpr];

  return (
    <Canvas
      aria-hidden="true"
      dpr={dpr}
      frameloop={inView ? "always" : "never"}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0, 10], fov: CAMERA.fov }}
      onCreated={({ gl }) => {
        gl.setClearColor(COLORS.void, 1);
        const domEl = gl.domElement;
        domEl.setAttribute("aria-hidden", "true");
        const handleContextLost = (e: Event) => {
          e.preventDefault();
          onContextLost?.();
        };
        domEl.addEventListener("webglcontextlost", handleContextLost, {
          once: true,
        });
      }}
    >
      <color attach="background" args={[COLORS.void]} />
      <PerformanceMonitor onDecline={() => setDegraded(true)} />
      <IntroCamera isPortrait={isPortrait} rocketGroupRef={rocketGroupRef} />
      <Starfield isPortrait={isPortrait} />
      <Earth isPortrait={isPortrait} />
      <Mars isPortrait={isPortrait} />
      <HeartBeacon isPortrait={isPortrait} />
      <Rocket isPortrait={isPortrait} rocketGroupRef={rocketGroupRef} />
      <Trail
        isPortrait={isPortrait}
        rocketGroupRef={rocketGroupRef}
        qualityScale={degraded ? 0.5 : 1}
      />
    </Canvas>
  );
}

```

---

### Terminal Commands to Test Batch 1B + Batch 2

```bash
# 1. Start the development server
npm run dev

# 2. Verify in your browser:
# - On load: 1.2s boot timeline fades in twinkling stars, Earth cyan rim, beating Tashkent heart, and "Scroll to launch" cue.
# - Wait 4s without scrolling: subtle rocket ignition rumble + "Scroll to launch" pulse (cancels immediately on first scroll).
# - Scroll down & up: rocket scrubs smoothly along the Bezier path from Tashkent to Mars; F, H, T, M open and close reversibly as the rocket crosses each capital's screen coordinate; trail emits only during forward scroll.
# - Scroll past 85%: words settle onto a single baseline (held for ~18vh), then morph cleanly into the empty TeamBadge slot inside Hero while the canvas dims to 0.3 opacity.
# - Click "Skip intro" or press Esc: smooth-scrolls to the end of the pin wrapper.
# - Emulate prefers-reduced-motion: reduce in DevTools: renders normal 100svh poster Hero immediately with FhtmPhrase inside TeamBadge and zero WebGL canvas.

```

Reply **"next"** when you are ready for **Batch 3 (steps 13–15: portrait verification, disposal/memory stress check, bundle/performance measurement, and full hand-test acceptance checklist)**.
