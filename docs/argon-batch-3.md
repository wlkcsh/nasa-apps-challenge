Batch 3 Updates: Portrait Row Convergence, Zero-Hitch Trail Buffer & WebGL Disposal
In this final batch:

1. Portrait Stack → Horizontal Row Convergence (FhtmPhrase.tsx & useIntroTimeline.ts): FhtmPhrase always stays in a single inline-flex horizontal baseline in DOM layout so that at --settle = 1 it matches the horizontal TeamBadge slot [data-badge-text-slot]. In portrait mode (isPortrait === true), measureTriggers() computes each word's exact pixel offset (--stack-x, --stack-y) needed to place the four words in a vertical column centered on the stage spanning PORTRAIT_STACK_SPAN = 0.45 of the viewport height. Each word's CSS transform interpolates calc((var(--stack-x, 0px) + var(--disp, 0) * 1em) * (1 - var(--settle, 0))) and calc(var(--stack-y, 0px) * (1 - var(--settle, 0))), so as --settle tweens 0 → 1 during 6.8s–7.1s, all four words smoothly converge from their vertical portrait stack into a single centered horizontal row before morphing into TeamBadge during 7.4s–8.0s.   
2. 
3. Pre-Initialized instanceColor Buffer (Trail.tsx): useLayoutEffect initializes instanced.setColorAt(i, cyanColor) across all maxCount instances and sets instanced.instanceColor.needsUpdate = true on mount so Three.js compiles the USE_INSTANCING_COLOR shader program during boot rather than hitching on the first scroll frame. Furthermore, the per-frame loop reuses a pre-allocated tempColor instead of calling .clone() inside useFrame.
4. 
5. Scene-Level WebGL Disposal & Context Loss/Restore (IntroCanvas.tsx): Added an internal SceneDisposalGuard component inside <Canvas> that traverses scene on unmount to dispose any remaining geometries, materials, or textures, resets introState.sceneLive = false, and cleanly removes webglcontextlost and webglcontextrestored listeners.
6. 
components/intro/FhtmPhrase.tsx
TypeScript

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
            : "flex flex-row items-center justify-center gap-[0.38em] font-medium"
        }`}
      >
        {WORDS.map((word, wordIdx) => {
          const capital = word[0];
          const tails = word.slice(1).split("");
          const sign = LETTER_SIGNS[wordIdx];
          const initialDisp = staticPoster ? 0 : sign * dispMag;
          const glowColor = GLOW_COLORS[wordIdx];

          // In landscape: --disp is vertical (Y) zigzag offset.
          // In portrait: --stack-x and --stack-y place the horizontal inline words into a vertical
          // top-to-bottom stack across PORTRAIT_STACK_SPAN when --settle is 0, and smoothly
          // converge them onto the single horizontal baseline as --settle goes 0 -> 1.
          const wordTransform = staticPoster
            ? "none"
            : isPortrait
            ? "translate3d(calc((var(--stack-x, 0px) + var(--disp, 0) * 1em) * (1 - var(--settle, 0))), calc(var(--stack-y, 0px) * (1 - var(--settle, 0))), 0px)"
            : "translate3d(0px, calc(var(--disp, 0) * (1 - var(--settle, 0)) * 1em), 0px)";

          return (
            <span
              key={word}
              data-word-index={wordIdx}
              aria-hidden="true"
              style={
                {
                  "--disp": initialDisp,
                  "--stack-x": "0px",
                  "--stack-y": "0px",
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
components/intro/useIntroTimeline.ts
TypeScript

"use client";import { RefObject, useCallback, useEffect, useRef } from "react";import gsap from "gsap";import { ScrollTrigger } from "gsap/ScrollTrigger";import {
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
  PORTRAIT_STACK_SPAN,
  P_RAMP,
  SCRUB,
  TAIL_STAGGER,
} from "@/lib/config";import { introState, resetIntroState } from "./introState";export interface UseIntroTimelineParams {
  enabled: boolean;
  wrapperRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLElement | null>;
  phraseRef: RefObject<HTMLElement | null>;
  badgeSlotRef: RefObject<HTMLElement | null>;
  isPortrait: boolean;
}function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}export function useIntroTimeline({
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

    const wordEls = Array.from(
      phraseEl.querySelectorAll<HTMLElement>("[data-word-index]")
    );
    const capitalEls = Array.from(
      phraseEl.querySelectorAll<HTMLElement>("[data-capital-index]")
    );

    // Compute portrait vertical stack offsets (--stack-x, --stack-y) across PORTRAIT_STACK_SPAN
    // and measure each capital's screen-space trigger coordinate in CSS pixels.
    const measureTriggers = () => {
      const stageHeight =
        stageEl?.clientHeight || window.innerHeight || 800;

      if (isPortrait) {
        const spanPx = stageHeight * PORTRAIT_STACK_SPAN;
        const phraseCenterX = phraseEl.offsetWidth * 0.5;

        wordEls.forEach((wordEl, idx) => {
          const wordCenterX = wordEl.offsetLeft + wordEl.offsetWidth * 0.5;
          const stackX = phraseCenterX - wordCenterX;
          const stackY = ((idx - 1.5) / 3) * spanPx;
          wordEl.style.setProperty("--stack-x", `${stackX.toFixed(2)}px`);
          wordEl.style.setProperty("--stack-y", `${stackY.toFixed(2)}px`);
        });
      } else {
        wordEls.forEach((wordEl) => {
          wordEl.style.setProperty("--stack-x", "0px");
          wordEl.style.setProperty("--stack-y", "0px");
        });
      }

      // Measure capital trigger coordinates in viewport pixels when settled/unsettled at top of stage
      const stageRect = (
        stageEl ?? document.documentElement
      ).getBoundingClientRect();

      if (isPortrait) {
        const spanPx = stageRect.height * PORTRAIT_STACK_SPAN;
        const stageMidY = stageRect.height * 0.5;
        for (let idx = 0; idx < 4; idx++) {
          introState.triggerPx[idx] = stageMidY + ((idx - 1.5) / 3) * spanPx;
        }
      } else {
        capitalEls.forEach((capEl, idx) => {
          if (idx >= 0 && idx < 4) {
            const rect = capEl.getBoundingClientRect();
            introState.triggerPx[idx] = rect.left + rect.width * 0.5;
          }
        });
      }
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
          onRefresh: () => {
            measureTriggers();
          },
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

      // 6.8 - 7.1s (settle): --settle 0 -> 1 aligns words onto single horizontal baseline
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
            return clamp(bRect.width / naturalWidth, 0.14, 0.55);
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
        window.scrollY +
        rect.top +
        wrapperRef.current.offsetHeight -
        window.innerHeight;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }
  }, [wrapperRef]);

  return { skip };
}
components/intro/scene/Trail.tsx
TypeScript

"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
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

  const {
    planeGeo,
    mat,
    particles,
    dummy,
    cyanColor,
    soilColor,
    tempColor,
    spawnOffset,
  } = useMemo(() => {
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
      tempColor: new THREE.Color(),
      spawnOffset: new THREE.Vector3(),
    };
  }, [maxCount]);

  // Pre-initialize instanceMatrix and instanceColor during mount so Three.js compiles
  // the instanced color vertex/fragment shader on boot rather than hitching on first scroll.
  useLayoutEffect(() => {
    const instanced = meshRef.current;
    if (!instanced) return;

    dummy.position.set(0, 0, -9999);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();

    for (let i = 0; i < maxCount; i++) {
      instanced.setMatrixAt(i, dummy.matrix);
      instanced.setColorAt(i, i % 2 === 0 ? cyanColor : soilColor);
    }

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) {
      instanced.instanceColor.needsUpdate = true;
    }
  }, [maxCount, dummy, cyanColor, soilColor]);

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

        const spreadX = ((idx % 7) - 3) * 0.022;
        const spreadY = ((idx % 5) - 2) * 0.022;
        spawnOffset.set(spreadX, spreadY, 0);
        p.pos.copy(rocket.position).add(spawnOffset);
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

      tempColor.copy(p.isCyan ? cyanColor : soilColor).multiplyScalar(lifeRatio);
      instanced.setColorAt(i, tempColor);
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
components/intro/scene/IntroCanvas.tsx
TypeScript

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { CAMERA, COLORS, DPR_MAX } from "@/lib/config";
import { introState } from "../introState";
import IntroCamera from "./IntroCamera";
import Starfield from "./Starfield";
import Earth from "./Earth";
import HeartBeacon from "./HeartBeacon";
import Rocket from "./Rocket";
import Trail from "./Trail";
import Mars from "./Mars";

interface SceneDisposalGuardProps {
  onContextLost?: () => void;
}

function SceneDisposalGuard({ onContextLost }: SceneDisposalGuardProps) {
  const { gl, scene } = useThree();
  const onContextLostRef = useRef(onContextLost);
  onContextLostRef.current = onContextLost;

  useEffect(() => {
    const domEl = gl.domElement;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      introState.sceneLive = false;
      onContextLostRef.current?.();
    };

    const handleContextRestored = () => {
      gl.setClearColor(COLORS.void, 1);
    };

    domEl.addEventListener("webglcontextlost", handleContextLost);
    domEl.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      domEl.removeEventListener("webglcontextlost", handleContextLost);
      domEl.removeEventListener("webglcontextrestored", handleContextRestored);
      introState.sceneLive = false;

      // Traverse scene on unmount to guarantee zero leaked geometries, materials, or textures
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const mat of materials) {
            for (const value of Object.values(mat)) {
              if (value instanceof THREE.Texture) {
                value.dispose();
              }
            }
            mat.dispose();
          }
        }
      });

      gl.renderLists.dispose();
      gl.dispose();
    };
  }, [gl, scene]);

  return null;
}

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
        gl.domElement.setAttribute("aria-hidden", "true");
      }}
    >
      <color attach="background" args={[COLORS.void]} />
      <SceneDisposalGuard onContextLost={onContextLost} />
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
Terminal Command: TypeScript, Bundle Budget & Isolation Audit
Run this single command from your Next.js app directory (./ or frontend/) to verify zero TypeScript errors, build the production bundle, inspect gzipped chunk sizes against the 1.5 MB gzipped budget, and confirm three is isolated inside the lazy-loaded IntroCanvas chunk:   

Bash

npx tsc --noEmit && npm run build && node -e '
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const chunksDir = path.join(process.cwd(), ".next/static/chunks");
if (!fs.existsSync(chunksDir)) {
  console.error("Could not find .next/static/chunks");
  process.exit(1);
}

let totalIntroGz = 0;
const report = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".js")) {
      const buf = fs.readFileSync(full);
      const gz = zlib.gzipSync(buf).length;
      const content = buf.toString("utf8");
      const hasThree = content.includes("WebGLRenderer") || content.includes("IcosahedronGeometry");
      const hasIntro = content.includes("Scroll to launch") || content.includes("From Heart to Mars");
      if (hasThree || hasIntro) {
        totalIntroGz += gz;
        report.push({
          chunk: path.relative(chunksDir, full),
          gzipKB: (gz / 1024).toFixed(1) + " KB",
          type: hasThree ? "3D Scene (lazy)" : "Intro DOM/GSAP"
        });
      }
    }
  }
}

walk(chunksDir);
console.table(report);
const totalKB = (totalIntroGz / 1024).toFixed(1);
console.log("Total Intro + Three.js Gzipped Size:", totalKB, "KB / 1536.0 KB budget");
if (totalIntroGz > 1536 * 1024) {
  console.error("FAIL: Exceeded 1.5 MB gzipped budget");
  process.exit(1);
} else {
  console.log("PASS: Well within 1.5 MB gzipped budget & 3D scene isolated in lazy chunk.");
}
'
Final Hand-Test Acceptance Checklist
1. [ ] Boot & 4s Idle Tease (
- 0.0s scroll): Load the page and do not scroll. Over 1.2s, twinkling stars, Earth's cyan atmosphere rim (#06B6D4), the beating Tashkent heart (41.31°N, 69.24°E), and the "Scroll to launch" cue fade in. After 4.0s of idle, the rocket briefly rumbles on the pad and the "Scroll to launch" hairline pulses without scrolling the page (and cancels immediately on first scroll).   
- 
- [ ] 2. Reversible Scroll Scrubbing & Letter Ramp (1× and 6× CPU Throttle): Scroll slowly down and back up between 10% and 70%. Each capital (F, H, T, M) displaces further from the flight line (±0.55em → ±0.95em in landscape, ±0.45em → ±0.85em in portrait) and unfolds its tail letters smoothly as the rocket's projected screen coordinate crosses it, reversing cleanly when scrolling back up without shifting adjacent words.   
- 
- [ ] 3. Forward-Only Trail Emission: Scroll downward and observe the cyan (#06B6D4) and soil-gold (#C9A24A) exhaust particles emitting proportional to scroll speed (deltaP), with zero frame hitch on first scroll. Pause scrolling or scroll upward: zero new particles spawn while active particles fade out on the clock.   
- 
- [ ] 4. Mars Arrival, Baseline Hold & Badge Morph (70%–100%): Scroll through 70%–85%: Mars slides in on the right (bottom in portrait), the rocket lands, and a single heart-red ripple (#E11D48) expands across the landing site. From 85%–89% (6.8s–7.1s), --settle tweens 0 → 1 so all four words align onto a single horizontal baseline, hold for ~18vh (7.1s–7.4s), and then (7.4s–8.0s) shrink cleanly into TeamBadge's [data-badge-text-slot] while Field Shift UZ, the tagline, and the #farm-map CTA fade in and the canvas dims to 0.3 opacity.   
- 
- [ ] 5. Portrait Phone Layout & Convergence: Open DevTools Device Toolbar (390×844 portrait): Earth sits at the top, Mars at the bottom, words stack top-to-bottom (From → Heart → To → Mars), and the rocket flies top-to-bottom firing F, H, T, M in order along y. At 85%–89%, the vertical word stack converges into a single horizontal row before shrinking into the TeamBadge slot without clipping.
- 
- [ ] 6. Skip Control, Keyboard Esc & Focus Handling: Click "Skip intro" or press Esc mid-scroll: the window smooth-scrolls to the end of the pin wrapper (st.end). Above 95% scroll progress, the "Skip intro" button hides automatically.   
- 
- [ ] 7. Reduced Motion & No-WebGL Poster Mode: In DevTools → Rendering → emulate prefers-reduced-motion: reduce and reload: the page renders at normal 100svh height with no 600svh scroll pin, FhtmPhrase already settled inside TeamBadge, and zero requests for the IntroCanvas / three JS chunk in the Network tab.   
- 
- [ ] 8. Viewport Pause & WebGL Disposal: Scroll past the hero into #farm-map: IntersectionObserver switches <Canvas frameloop="never"> so GPU usage drops to zero while keeping the context warm for instant reverse scroll. Navigating away from the route disposes all geometries, materials, and render lists cleanly.   
