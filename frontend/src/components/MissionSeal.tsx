"use client";

import React from "react";
import { Sparkles, Globe2 } from "lucide-react";

interface MissionSealProps {
  className?: string;
  size?: number;
}

export default function MissionSeal({ className = "", size = 110 }: MissionSealProps) {
  const text = "FROM HEART TO MARS • FHTM • NASA SPACE APPS • ARAL RESILIENCE • ";

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {/* Rotating SVG circular text path */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full animate-[spin_24s_linear_infinite]"
        aria-hidden="true"
      >
        <path
          id="sealCirclePath"
          d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
          fill="none"
        />
        <text className="text-[7.2px] font-mono uppercase tracking-[0.22em] fill-espresso-900 font-bold">
          <textPath href="#sealCirclePath" startOffset="0%">
            {text}
          </textPath>
        </text>
      </svg>

      {/* Center stationary core badge */}
      <div className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-white border border-harvest-500/40 flex items-center justify-center shadow-md">
        <Globe2 className="w-5 h-5 text-harvest-600" />
      </div>
    </div>
  );
}
