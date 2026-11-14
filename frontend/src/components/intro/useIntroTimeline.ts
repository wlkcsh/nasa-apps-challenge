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
  PORTRAIT_STACK_SPAN,
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

    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-intro-active", "true");
    }

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
    const tailWrapEls = Array.from(
      phraseEl.querySelectorAll<HTMLElement>("[data-tail-wrap]")
    );

    // Measure capital triggers across the central flight zone so that F, H, T, M
    // separate sequentially as the rocket slices through the center of the viewport.
    const measureTriggers = () => {
      const stageHeight =
        stageEl?.clientHeight || window.innerHeight || 800;
      const stageWidth =
        stageEl?.clientWidth || window.innerWidth || 1280;

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

        const stageMidY = stageHeight * 0.5;
        for (let idx = 0; idx < 4; idx++) {
          introState.triggerPx[idx] = stageMidY + ((idx - 1.5) / 3) * spanPx;
        }
      } else {
        wordEls.forEach((wordEl) => {
          wordEl.style.setProperty("--stack-x", "0px");
          wordEl.style.setProperty("--stack-y", "0px");
        });

        // Spread the 4 horizontal trigger gates across the central monogram zone (35% -> 57.5% of viewport width)
        // so F, H, T, M separate cleanly one after another as the rocket crosses the center.
        const zoneStart = stageWidth * 0.35;
        const zoneStep = stageWidth * 0.075;
        for (let idx = 0; idx < 4; idx++) {
          introState.triggerPx[idx] = zoneStart + idx * zoneStep;
        }
      }
    };

    measureTriggers();
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(measureTriggers).catch(() => {});
    }

    const ro = new ResizeObserver(() => {
      measureTriggers();
    });
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

      // Initialize compact FHTM monogram: zero vertical displacement, tail wrappers collapsed
      gsap.set(phraseEl, {
        "--settle": 0,
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
      });

      wordEls.forEach((wordEl, i) => {
        const sign = LETTER_SIGNS[i];
        gsap.set(wordEl, {
          "--disp": sign * dispConfig.initial,
          "--glow": 0.15,
        });
      });

      capitalEls.forEach((capEl) => {
        gsap.set(capEl, { opacity: 0.78 });
      });

      tailWrapEls.forEach((twEl) => {
        gsap.set(twEl, { maxWidth: "0em", marginRight: "0em" });
      });

      gsap.set(allTails, {
        opacity: 0,
        y: "0.14em",
      });

      if (heroSectionEl) {
        gsap.set(heroSectionEl, { opacity: 0 });
      }
      const heroItems = [heroTitleEl, heroTaglineEl, heroCtaEl].filter(Boolean);
      if (heroItems.length > 0) {
        gsap.set(heroItems, { opacity: 0, y: 16 });
      }

      // Build 4 paused reversible letter timelines:
      // As the rocket passes, F goes UP (-0.72em), H goes DOWN (+0.72em), T goes UP (-0.72em), M goes DOWN (+0.72em)
      // while the tail wrapper expands horizontally to reveal "rom", "eart", "o", "ars".
      const tailMaxWidths = ["2.6em", "3.1em", "0.95em", "2.3em"];

      for (let i = 0; i < 4; i++) {
        const wordEl = wordEls[i];
        const capEl = capitalEls[i];
        const tailWrapEl = tailWrapEls[i];
        const tailEls = Array.from(
          phraseEl.querySelectorAll<HTMLElement>(`[data-tail-word="${i}"]`)
        );
        const sign = LETTER_SIGNS[i];

        const ltl = gsap.timeline({ paused: true });

        if (wordEl) {
          ltl.fromTo(
            wordEl,
            { "--disp": sign * dispConfig.initial, "--glow": 0.15 },
            {
              "--disp": sign * dispConfig.fired,
              "--glow": 0.85,
              duration: DURATIONS.capitalMove,
              ease: EASINGS.EASE_LETTER,
            },
            0
          );
        }

        if (capEl) {
          ltl.fromTo(
            capEl,
            { opacity: 0.78 },
            {
              opacity: 1,
              duration: DURATIONS.capitalMove * 0.5,
              ease: "power2.out",
            },
            0
          );
        }

        if (tailWrapEl) {
          ltl.fromTo(
            tailWrapEl,
            { maxWidth: "0em", marginRight: "0em" },
            {
              maxWidth: tailMaxWidths[i],
              marginRight: i < 3 ? "0.28em" : "0em",
              duration: DURATIONS.capitalMove * 0.85,
              ease: "power2.out",
            },
            0.02
          );
        }

        if (tailEls.length > 0) {
          ltl.fromTo(
            tailEls,
            { opacity: 0, y: "0.14em" },
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

            if (typeof document !== "undefined") {
              document.documentElement.setAttribute(
                "data-intro-active",
                self.progress < 0.92 ? "true" : "false"
              );
            }

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

      if (scrollCueEl) {
        master.fromTo(
          scrollCueEl,
          { opacity: 1 },
          { opacity: 0, duration: 0.16, ease: "none", immediateRender: false },
          0.0
        );
      }

      master.to(
        introState,
        { beat: 1.8, duration: 0.2, yoyo: true, repeat: 1 },
        0.0
      );
      master.set(introState, { trailRate: 1 }, 0.2);

      master.to(
        introState,
        {
          camX: 0.18,
          duration: LABELS.mars - LABELS.cruise,
          ease: EASINGS.EASE_CRUISE,
        },
        "cruise"
      );

      master.fromTo(
        introState,
        { marsIn: 5.5 },
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

      // 6.8 - 7.1s (settle): --settle 0 -> 1 brings separated words back onto one horizontal line
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
          opacity: 0,
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
        const settleForce = clamp((introState.p - 0.82) / 0.04, 0, 1);
        const progress = Math.max(introState.letter[i], settleForce);
        letterTimelines[i]?.progress(progress);
      }
    };

    gsap.ticker.add(tickLetters);

    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-intro-active", "false");
      }
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
