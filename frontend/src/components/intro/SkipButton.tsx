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
