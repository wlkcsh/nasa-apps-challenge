# Scroll-Driven Rocket Intro: Design Notes

Nov 14, 2026 · @Atabek Raxmanov

## Verdict

A scroll-driven intro fits better than autoplay: the viewer controls the rocket, can pause on any beat and can read the letters, which suits a jury demo. The current architecture already supports it, because one GSAP timeline owns all intro state. The change touches about 20% of the spec, and the letter-sync logic is the main part. Decide it now, before Batch 2.

## What changes

The timeline stays the source of truth; scroll becomes its clock.

- **Pin and scrub.** The intro section pins for about 500vh of scroll (600vh in portrait). `ScrollTrigger` with `pin: true`, `scrub: 0.8` and `animation: master` maps scroll progress onto the same 8s timeline. It ships with `gsap`, so there is no new dependency.
- **Reversible letter triggers.** The latched `>=` check breaks when the user scrolls back up, because a fired letter stays fired. Replace it with a pure function of the rocket's position: letter progress = clamp((rocketPx - trigger) / ramp), with ramp about 12% of the viewport width. Scrolling backwards folds the words back to "F H T M". The 6.4s safety net becomes unnecessary.
- **Idle start.** Before the user scrolls, only the heart beats and a "Scroll to launch" cue pulses. Without it, the first screen looks frozen.
- **No session flag.** Remove the once-per-session flag, since users can scroll past anyway. Keep a "Skip intro" button that smooth-scrolls to the hero.
- **End of the pin.** Handoff happens as the pin releases and the hero scrolls up naturally. Pause rendering (`frameloop="never"`) when the section is off screen, instead of unmounting at 8.0s.
- **Reduced motion.** No pin at all; the static poster stays.

## Pacing

Beats should not get equal scroll distance; the cruise carries the letters, so it gets the most.

| Scroll progress | Beat |
| --- | --- |
| 0-10% | Heart pulses, cue visible, liftoff |
| 10-70% | Cruise, with letters firing in sequence |
| 70-85% | Mars arrival, landing, ripple |
| 85-100% | Align on one baseline and morph into the badge |

Optional: snap to the "From Heart To Mars" baseline moment, so the full phrase gets a readable hold.

## Risks

The biggest risks are scroll fatigue and mobile pinning; the rest have cheap fixes.

| Risk | Mitigation |
| --- | --- |
| Scroll-jacking fatigue | Keep the pin at 400-500vh and never slow the user's native scroll speed. |
| Mobile address bar | `100dvh` pinning can jitter on iOS. Use `invalidateOnRefresh`, test on a real phone, and avoid `normalizeScroll` unless needed. |
| Fast scrolling and flicks | Per-frame mapping from the rocket's position handles jumps; scrub smoothing covers the rest. |
| No-scroll viewers | A jury member might sit and wait. A gentle auto-nudge (no scroll for about 4s plays the first beat) helps, at the cost of pure user control. |
| Smooth-scroll libraries (Lenis etc.) | Skip them. They add a dependency and a source of bugs for little gain. |

## What to do now

1. Finish testing Batch 1 first. The DOM pieces (phrase, letters, badge morph) are reusable.
2. Do not start Batch 2 as written. Have Fable produce a short delta spec for the scroll version, not a full redo.
3. The delta covers three files: `useIntroTimeline` (ScrollTrigger plus reversible letters), `Rocket` (continuous letter progress instead of `onCross`) and `IntroGate` (pin wrapper, no session flag).
4. Argon then redoes Batch 1's timeline hook and builds Batch 2 on the new base.

## Open decisions

Two choices are needed before the delta prompt for Fable can be written.

- [ ] Include the 4s auto-nudge when there is no scroll, or keep pure user control?
- [ ] Does scroll replace autoplay entirely, or does autoplay stay as the fallback for reduced motion only?
