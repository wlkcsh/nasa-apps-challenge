All 3 must-fix bugs and the small fixes have been applied to the affected Batch 1 files below:

1. **`useIntroTimeline.ts` & `IntroGate.tsx` (`enabled` gate)**: Added `enabled: boolean` (`mode === "full"`) to `useIntroTimeline` options and dependency array so the timeline builds only after `IntroOverlay` mounts and `phraseRef.current` is populated.
2. **Orientation Change (`IntroGate.tsx`)**: Replaced `skipRef.current()` with `finishIntro()` inside `handleOrientationChangeMidIntro` and removed `skipRef` so rotating mid-intro cleanly ends the intro instead of rebuilding a paused timeline.
3. **Real Route & Tagline (`Hero.tsx`, `app/layout.tsx`, `app/page.tsx`)**: Replaced the literal placeholders with `/map` and `"Satellite-driven crop rotation and soil intelligence — from Uzbekistan's Aral Sea basin to Martian regolith."`
4. **Screen-Reader Double Announcement (`IntroGate.tsx`)**: Changed the badge effect to `if (mode === "off") setBadgeVisible(true);` so `TeamBadge` stays hidden during `poster` mode until `finishIntro` runs.
5. **Trail Flicker (`useIntroTimeline.ts`)**: Separated `master.set(state, { trailRate: 1 }, "liftoff")` from the `yoyo: true` `beat` spike tween.

*(Note: When applying `app/layout.tsx`, `app/page.tsx`, `tailwind.config.ts`, and `app/globals.css`, merge the font variables, gate script, and color tokens into your existing project files if you have other routes or styles set up.)*

---

### `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SESSION_KEY } from "@/components/intro/lib/config";

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

export const metadata: Metadata = {
  title: "Field Shift UZ — From Heart to Mars",
  description:
    "Satellite-driven crop rotation and soil intelligence — from Uzbekistan's Aral Sea basin to Martian regolith.",
};

const gateScript = `
(function() {
  try {
    var seen = sessionStorage.getItem(${JSON.stringify(SESSION_KEY)});
    if (!seen) {
      document.documentElement.setAttribute("data-intro", "pending");
    } else {
      document.documentElement.setAttribute("data-intro", "done");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cormorant.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: gateScript }} />
      </head>
      <body className="bg-void text-bone font-ui selection:bg-orbit/30 selection:text-bone">
        <div
          id="intro-ssr-cover"
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-void transition-opacity duration-300 pointer-events-none"
        />
        {children}
      </body>
    </html>
  );
}

```

### `app/page.tsx`

```tsx
import IntroGate from "@/components/intro/IntroGate";

export default function HomePage() {
  return (
    <main className="relative min-h-[100dvh] w-full bg-void overflow-hidden">
      <IntroGate tagline="Satellite-driven crop rotation and soil intelligence — from Uzbekistan's Aral Sea basin to Martian regolith." />
    </main>
  );
}

```

### `components/hero/Hero.tsx`

```tsx
import React, { forwardRef } from "react";
import Link from "next/link";
import TeamBadge from "./TeamBadge";

interface HeroProps {
  tagline: string;
  badgeVisible: boolean;
  badgeRef: React.RefObject<HTMLDivElement | null>;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  taglineRef: React.RefObject<HTMLParagraphElement | null>;
  ctaRef: React.RefObject<HTMLAnchorElement | null>;
}

const Hero = forwardRef<HTMLElement, HeroProps>(
  (
    { tagline, badgeVisible, badgeRef, titleRef, taglineRef, ctaRef },
    heroRef
  ) => {
    return (
      <section
        ref={heroRef}
        className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 py-16 text-center bg-hero-backdrop overflow-hidden"
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
          <TeamBadge ref={badgeRef} visible={badgeVisible} />

          <h1
            ref={titleRef}
            className="font-display text-5xl font-semibold tracking-tight text-bone sm:text-7xl md:text-8xl"
          >
            Field Shift UZ
          </h1>

          <p
            ref={taglineRef}
            className="max-w-xl font-ui text-lg font-normal leading-relaxed text-bone/80 sm:text-xl"
          >
            {tagline}
          </p>

          <div className="mt-4">
            <Link
              ref={ctaRef}
              href="/map"
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

### `components/intro/hooks/useIntroTimeline.ts`

```typescript
"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  CAMERA,
  DIM_OPACITY,
  DURATIONS,
  EASINGS,
  FLIGHT_P,
  LABELS,
  LETTER_FIRED_EM,
  LETTER_OFFSET_EM,
  LETTER_SIGNS,
  TAIL_STAGGER,
} from "../lib/config";
import type { IntroState } from "../lib/introState";
import type { LayoutMode } from "./useLayoutMode";

export interface IntroTimelineRefs {
  phraseRef: React.RefObject<HTMLDivElement | null>;
  coverRef: React.RefObject<HTMLDivElement | null>;
  skipBtnRef: React.RefObject<HTMLButtonElement | null>;
  canvasWrapRef: React.RefObject<HTMLDivElement | null>;
  badgeRef: React.RefObject<HTMLDivElement | null>;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  taglineRef: React.RefObject<HTMLParagraphElement | null>;
  ctaRef: React.RefObject<HTMLAnchorElement | null>;
}

interface UseIntroTimelineOptions {
  refs: IntroTimelineRefs;
  stateRef: React.MutableRefObject<IntroState>;
  layout: LayoutMode;
  onComplete: () => void;
  enabled: boolean;
  useTempFixedLetterTimes?: boolean;
}

export function useIntroTimeline({
  refs,
  stateRef,
  layout,
  onComplete,
  enabled,
  useTempFixedLetterTimes = false,
}: UseIntroTimelineOptions) {
  const masterRef = useRef<gsap.core.Timeline | null>(null);
  const letterTimelinesRef = useRef<gsap.core.Timeline[]>([]);
  const ctxRef = useRef<gsap.Context | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const fireLetter = useCallback(
    (index: number) => {
      const state = stateRef.current;
      if (index < 0 || index > 3 || state.fired[index]) return;
      state.fired[index] = true;
      const tl = letterTimelinesRef.current[index];
      if (tl) {
        tl.play();
      }
    },
    [stateRef]
  );

  useEffect(() => {
    const phraseEl = refs.phraseRef.current;
    if (!enabled || !phraseEl) return;

    const isPortrait = layout === "portrait";
    const state = stateRef.current;

    const ctx = gsap.context(() => {
      const wordEls = Array.from(
        phraseEl.querySelectorAll<HTMLElement>("[data-word-index]")
      );
      const capitalEls = Array.from(
        phraseEl.querySelectorAll<HTMLElement>("[data-capital-index]")
      );

      // Set initial states on word wrappers, capitals, and tails
      wordEls.forEach((wordEl, i) => {
        const sign = LETTER_SIGNS[i];
        const initialEm = sign * LETTER_OFFSET_EM;
        gsap.set(wordEl, {
          x: isPortrait ? `${initialEm}em` : "0em",
          y: isPortrait ? "0em" : `${initialEm}em`,
          "--glow": 0,
        });
      });

      capitalEls.forEach((capEl) => {
        gsap.set(capEl, { opacity: DIM_OPACITY });
      });

      const allTails = phraseEl.querySelectorAll<HTMLElement>("[data-tail-word]");
      gsap.set(allTails, {
        opacity: 0,
        y: "0.18em",
      });

      // Set initial hero states so handoff animates cleanly
      const heroItems = [
        refs.titleRef.current,
        refs.taglineRef.current,
        refs.ctaRef.current,
      ].filter(Boolean);
      if (heroItems.length > 0) {
        gsap.set(heroItems, { opacity: 0, y: 16 });
      }

      // Build the 4 paused letter timelines
      letterTimelinesRef.current = [0, 1, 2, 3].map((i) => {
        const wordEl = wordEls[i];
        const capEl = capitalEls[i];
        const tailEls = Array.from(
          phraseEl.querySelectorAll<HTMLElement>(`[data-tail-word="${i}"]`)
        );
        const sign = LETTER_SIGNS[i];
        const firedEm = sign * LETTER_FIRED_EM;

        const ltl = gsap.timeline({ paused: true });

        if (wordEl) {
          ltl.to(
            wordEl,
            {
              x: isPortrait ? `${firedEm}em` : "0em",
              y: isPortrait ? "0em" : `${firedEm}em`,
              duration: DURATIONS.capitalMove,
              ease: EASINGS.EASE_LETTER,
            },
            0
          );

          ltl.fromTo(
            wordEl,
            { "--glow": 1 },
            {
              "--glow": 0.25,
              duration: DURATIONS.glowDecay,
              ease: "power2.out",
            },
            0
          );
        }

        if (capEl) {
          ltl.to(
            capEl,
            {
              opacity: 1,
              duration: DURATIONS.capitalMove * 0.6,
              ease: "power2.out",
            },
            0
          );
        }

        if (tailEls.length > 0) {
          ltl.to(
            tailEls,
            {
              opacity: 1,
              y: "0em",
              duration: DURATIONS.tailLetter,
              stagger: TAIL_STAGGER,
              ease: EASINGS.EASE_TAIL,
            },
            0.08
          );
        }

        return ltl;
      });

      // Build the paused Master Timeline
      const master = gsap.timeline({
        paused: true,
        onComplete: () => {
          onCompleteRef.current();
        },
      });

      master.addLabel("void", LABELS.void);
      master.addLabel("liftoff", LABELS.liftoff);
      master.addLabel("cruise", LABELS.cruise);
      master.addLabel("arrival", LABELS.arrival);
      master.addLabel("align", LABELS.align);
      master.addLabel("handoff", LABELS.handoff);
      master.addLabel("end", LABELS.end);

      // 0.0 - 1.2s: Cover fades, stars, rim, beat, camera dolly 11 -> 10
      if (refs.coverRef.current) {
        master.to(
          refs.coverRef.current,
          {
            opacity: 0,
            duration: 1.2,
            ease: "power2.inOut",
          },
          "void"
        );
      }

      if (refs.skipBtnRef.current) {
        master.to(
          refs.skipBtnRef.current,
          {
            opacity: 1,
            duration: 0.4,
            ease: "power2.out",
          },
          0.3
        );
      }

      master.to(
        state,
        {
          rim: 1,
          beat: 1,
          stars: 1,
          camZ: CAMERA.z[1],
          duration: 1.2,
          ease: "power2.out",
        },
        "void"
      );

      // 1.2 - 2.0s: Liftoff p 0 -> 0.12, beat spike, trail starts
      master.to(
        state,
        {
          p: FLIGHT_P[0],
          duration: LABELS.cruise - LABELS.liftoff,
          ease: EASINGS.EASE_LIFTOFF,
        },
        "liftoff"
      );

      master.to(
        state,
        {
          beat: 1.8,
          duration: 0.2,
          yoyo: true,
          repeat: 1,
        },
        "liftoff"
      );

      master.set(state, { trailRate: 1 }, "liftoff");

      // 2.0 - 5.6s: Cruise p 0.12 -> 0.88
      master.to(
        state,
        {
          p: FLIGHT_P[1],
          duration: LABELS.arrival - LABELS.cruise,
          ease: EASINGS.EASE_CRUISE,
        },
        "cruise"
      );

      // Temporary fixed letter triggers for Batch 1 (Step 5) when WebGL scene is not mounted
      if (useTempFixedLetterTimes) {
        const tempTimes = [2.3, 3.1, 3.9, 4.7];
        tempTimes.forEach((t, idx) => {
          master.call(() => fireLetter(idx), [], t);
        });
      }

      // 5.2 - 6.4s: Mars slides in (2.5 -> 0), camera eases +0.3 toward Mars
      master.to(
        state,
        {
          marsIn: 0,
          camX: 0.3,
          duration: LABELS.align - LABELS.marsSlide,
          ease: EASINGS.EASE_LAND,
        },
        LABELS.marsSlide
      );

      // 5.6 - 6.4s: Landing p 0.88 -> 1.0, trailRate -> 0
      master.to(
        state,
        {
          p: 1,
          trailRate: 0,
          duration: LABELS.align - LABELS.arrival,
          ease: EASINGS.EASE_LAND,
        },
        "arrival"
      );

      // 6.1s: Mars heart appears and single ripple expands over 0.8s
      master.to(
        state,
        {
          marsHeart: 1,
          ripple: 1,
          duration: 0.8,
          ease: "power2.out",
        },
        LABELS.marsHeart
      );

      // 6.4s (align): Safety net forces all unfired letters to progress(1), then settles baseline
      master.call(
        () => {
          letterTimelinesRef.current.forEach((ltl, idx) => {
            state.fired[idx] = true;
            ltl.progress(1);
          });
        },
        [],
        "align"
      );

      master.to(
        wordEls,
        {
          x: "0em",
          y: "0em",
          "--glow": 0,
          duration: DURATIONS.baselineEase,
          ease: EASINGS.EASE_SETTLE,
        },
        "align"
      );

      master.to(
        state,
        {
          camX: 0,
          duration: LABELS.handoff - LABELS.align,
          ease: EASINGS.EASE_SETTLE,
        },
        "align"
      );

      // 7.2 - 8.0s (handoff): Phrase shrinks/morphs into TeamBadge slot, canvas fades, hero items stagger in
      master.to(
        state,
        {
          camZ: CAMERA.z[2],
          duration: LABELS.end - LABELS.handoff,
          ease: EASINGS.EASE_SETTLE,
        },
        "handoff"
      );

      if (refs.canvasWrapRef.current) {
        master.to(
          refs.canvasWrapRef.current,
          {
            opacity: 0,
            duration: LABELS.end - LABELS.handoff,
            ease: "power2.inOut",
          },
          "handoff"
        );
      }

      if (refs.skipBtnRef.current) {
        master.to(
          refs.skipBtnRef.current,
          {
            opacity: 0,
            duration: 0.25,
            ease: "power2.out",
          },
          "handoff"
        );
      }

      // Compute delta to morph phrase into the real TeamBadge slot at handoff
      master.to(
        phraseEl,
        {
          x: () => {
            const badgeEl = refs.badgeRef.current;
            if (!badgeEl) return 0;
            const pRect = phraseEl.getBoundingClientRect();
            const bRect = badgeEl.getBoundingClientRect();
            return (
              bRect.left +
              bRect.width / 2 -
              (pRect.left + pRect.width / 2)
            );
          },
          y: () => {
            const badgeEl = refs.badgeRef.current;
            if (!badgeEl) return -180;
            const pRect = phraseEl.getBoundingClientRect();
            const bRect = badgeEl.getBoundingClientRect();
            return (
              bRect.top +
              bRect.height / 2 -
              (pRect.top + pRect.height / 2)
            );
          },
          scale: () => {
            const badgeEl = refs.badgeRef.current;
            if (!badgeEl) return 0.28;
            const pRect = phraseEl.getBoundingClientRect();
            const bRect = badgeEl.getBoundingClientRect();
            return Math.max(
              0.18,
              Math.min(0.45, (bRect.width * 0.65) / Math.max(1, pRect.width))
            );
          },
          opacity: 0,
          duration: DURATIONS.badgeMorph,
          ease: EASINGS.EASE_SETTLE,
        },
        "handoff"
      );

      if (refs.titleRef.current) {
        master.to(
          refs.titleRef.current,
          {
            opacity: 1,
            y: 0,
            duration: DURATIONS.heroStaggerItem,
            ease: "power2.out",
          },
          7.35
        );
      }

      if (refs.taglineRef.current) {
        master.to(
          refs.taglineRef.current,
          {
            opacity: 1,
            y: 0,
            duration: DURATIONS.heroStaggerItem,
            ease: "power2.out",
          },
          7.45
        );
      }

      if (refs.ctaRef.current) {
        master.to(
          refs.ctaRef.current,
          {
            opacity: 1,
            y: 0,
            duration: DURATIONS.heroStaggerItem,
            ease: "power2.out",
          },
          7.55
        );
      }

      masterRef.current = master;
    });

    ctxRef.current = ctx;

    return () => {
      ctx.revert();
      masterRef.current = null;
      letterTimelinesRef.current = [];
    };
  }, [enabled, layout, refs, stateRef, useTempFixedLetterTimes, fireLetter]);

  const start = useCallback(() => {
    masterRef.current?.play(0);
  }, []);

  const skip = useCallback(() => {
    const master = masterRef.current;
    if (!master) {
      onCompleteRef.current();
      return;
    }

    const state = stateRef.current;
    letterTimelinesRef.current.forEach((ltl, idx) => {
      state.fired[idx] = true;
      ltl.progress(1);
    });

    const phraseEl = refs.phraseRef.current;
    if (phraseEl) {
      const wordEls = phraseEl.querySelectorAll<HTMLElement>("[data-word-index]");
      gsap.set(wordEls, { x: "0em", y: "0em", "--glow": 0 });
    }

    if (refs.coverRef.current) {
      gsap.set(refs.coverRef.current, { opacity: 0 });
    }

    master.seek("handoff");
    master.timeScale(2).play();
  }, [refs, stateRef]);

  return { start, fireLetter, skip };
}

```

### `components/intro/IntroGate.tsx`

```tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Note: In Batch 2 we will uncomment the dynamic import for ./scene/IntroScene.
// import dynamic from "next/dynamic";
import Hero from "../hero/Hero";
import IntroOverlay from "./IntroOverlay";
import IntroPoster from "./IntroPoster";
import { SESSION_KEY } from "./lib/config";
import { createIntroState } from "./lib/introState";
import { useIntroMode } from "./hooks/useIntroMode";
import { useLayoutMode } from "./hooks/useLayoutMode";
import { useIntroTimeline } from "./hooks/useIntroTimeline";

interface IntroGateProps {
  tagline: string;
}

export default function IntroGate({ tagline }: IntroGateProps) {
  const [mode, setMode] = useIntroMode();
  const [badgeVisible, setBadgeVisible] = useState(false);

  const stateRef = useRef(createIntroState());

  const heroRef = useRef<HTMLElement | null>(null);
  const phraseRef = useRef<HTMLDivElement | null>(null);
  const coverRef = useRef<HTMLDivElement | null>(null);
  const skipBtnRef = useRef<HTMLButtonElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const taglineRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);

  const timelineRefs = useMemo(
    () => ({
      phraseRef,
      coverRef,
      skipBtnRef,
      canvasWrapRef,
      badgeRef,
      titleRef,
      taglineRef,
      ctaRef,
    }),
    []
  );

  const finishIntro = useCallback(() => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Ignore storage errors
    }
    document.documentElement.setAttribute("data-intro", "done");
    setBadgeVisible(true);
    setMode("off");
  }, [setMode]);

  const handleOrientationChangeMidIntro = useCallback(() => {
    if (mode === "full") {
      finishIntro();
    }
  }, [mode, finishIntro]);

  const layout = useLayoutMode(handleOrientationChangeMidIntro);

  const { start, skip } = useIntroTimeline({
    refs: timelineRefs,
    stateRef,
    layout,
    onComplete: finishIntro,
    enabled: mode === "full",
    // Batch 1 (Step 5): Use temporary fixed letter times until Rocket screen-projection is added in Batch 2
    useTempFixedLetterTimes: true,
  });

  // Reveal TeamBadge immediately only if mode is "off" (finishIntro handles "poster" completion)
  useEffect(() => {
    if (mode === "off") {
      setBadgeVisible(true);
    }
  }, [mode]);

  // Batch 1 start trigger: wait for fonts ready then play timeline
  useEffect(() => {
    if (mode !== "full") return;

    let cancelled = false;
    const readyPromise =
      typeof document !== "undefined" && "fonts" in document
        ? document.fonts.ready
        : Promise.resolve();

    readyPromise.then(() => {
      if (!cancelled) {
        document.documentElement.setAttribute("data-intro", "playing");
        start();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mode, start]);

  // Esc key & focusin inside Hero during intro triggers skip
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

  return (
    <>
      {mode === "full" && (
        <>
          <div
            ref={canvasWrapRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-30"
          />
          <IntroOverlay
            phraseRef={phraseRef}
            coverRef={coverRef}
            skipBtnRef={skipBtnRef}
            onSkip={skip}
            layout={layout}
          />
        </>
      )}

      {mode === "poster" && (
        <IntroPoster layout={layout} onDone={finishIntro} />
      )}

      <Hero
        ref={heroRef}
        tagline={tagline}
        badgeVisible={badgeVisible}
        badgeRef={badgeRef}
        titleRef={titleRef}
        taglineRef={taglineRef}
        ctaRef={ctaRef}
      />
    </>
  );
}

```

---

### Terminal Commands to Test Fixed Batch 1

```bash
# Run the dev server and test items 1–6 in your browser:
npm run dev

```

Reply **"next"** once your checks pass to proceed to **Batch 2 (steps 7–12)**.
