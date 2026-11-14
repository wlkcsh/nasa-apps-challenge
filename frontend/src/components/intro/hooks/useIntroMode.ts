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
