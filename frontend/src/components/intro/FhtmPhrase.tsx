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
            fontFamily:
              "var(--font-display), 'Cormorant Garamond', Georgia, serif",
            fontSize: staticPoster
              ? "1rem"
              : isPortrait
              ? "clamp(2.5rem, 13vw, 4rem)"
              : "clamp(2.75rem, 5.6vw, 5.75rem)",
          } as React.CSSProperties
        }
        className={`select-none font-display leading-none tracking-[0.04em] text-bone will-change-transform ${
          staticPoster
            ? "inline-flex flex-row items-center justify-center gap-[0.32em] font-semibold"
            : "flex flex-row items-center justify-center gap-[0.14em] font-semibold"
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
            ? "translate3d(calc((var(--stack-x, 0px) + var(--kick-x, 0px) + var(--disp, 0) * 1em) * (1 - var(--settle, 0))), calc(var(--stack-y, 0px) * (1 - var(--settle, 0))), 0px) rotate(calc(var(--tilt, 0deg) * (1 - var(--settle, 0))))"
            : "translate3d(calc(var(--kick-x, 0px) * (1 - var(--settle, 0))), calc(var(--disp, 0) * (1 - var(--settle, 0)) * 1em), 0px) rotate(calc(var(--tilt, 0deg) * (1 - var(--settle, 0))))";

          return (
            <span
              key={word}
              data-word-index={wordIdx}
              aria-hidden="true"
              style={
                {
                  "--disp": initialDisp,
                  "--kick-x": "0px",
                  "--tilt": "0deg",
                  "--stack-x": "0px",
                  "--stack-y": "0px",
                  "--glow": 0,
                  "--glow-color": glowColor,
                  transform: wordTransform,
                  textShadow: staticPoster
                    ? "none"
                    : "0 0 calc(22px * var(--glow, 0)) var(--glow-color), 0 0 calc(5px * var(--glow, 0)) var(--glow-color)",
                } as React.CSSProperties
              }
              className="inline-flex items-baseline whitespace-nowrap will-change-transform"
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
              <span
                data-tail-wrap={wordIdx}
                aria-hidden="true"
                style={{
                  maxWidth: staticPoster ? "none" : "0em",
                  marginRight: staticPoster ? "0em" : "0em",
                  overflow: "hidden",
                }}
                className="inline-flex items-baseline will-change-[max-width,margin-right]"
              >
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
            </span>
          );
        })}
      </div>
    );
  }
);

FhtmPhrase.displayName = "FhtmPhrase";

export default FhtmPhrase;
