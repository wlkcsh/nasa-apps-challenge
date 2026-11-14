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
          className="relative flex min-h-[1.5rem] items-center justify-center font-display text-sm tracking-wide text-bone font-medium"
        >
          {children || <span>From Heart To Mars</span>}
        </div>
      </div>
    );
  }
);

TeamBadge.displayName = "TeamBadge";

export default TeamBadge;
