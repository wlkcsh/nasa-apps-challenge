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
