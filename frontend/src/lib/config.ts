export const COLORS = {
  void: "#040711",
  obsidian: "#070709",
  orbit: "#06B6D4",
  soil: "#C9A24A",
  vigor: "#10B981",
  rust: "#C1440E",
  heart: "#E11D48",
  bone: "#FAF8F5",
} as const;

export const WORDS = ["From", "Heart", "To", "Mars"] as const;

export const GLOW_COLORS = [
  COLORS.orbit, // From
  COLORS.heart, // Heart
  COLORS.soil,  // To
  COLORS.rust,  // Mars
] as const;

// Scroll-driven tunables
export const PIN_VH = 500;
export const SCRUB = 0.8;

export const LETTER_RAMP = {
  landscape: 0.12,
  portrait: 0.08,
} as const;

export const P_NOMINAL = {
  landscape: [0.24, 0.34, 0.44, 0.54] as const,
  portrait: [0.22, 0.34, 0.46, 0.58] as const,
} as const;

export const P_RAMP = 0.06;
export const HOLD = 0.3;
export const CANVAS_DIM = 0.3;
export const NUDGE_DELAY_MS = 4000;
export const PORTRAIT_STACK_SPAN = 0.45;

// 8.0s master timeline labels + 1.2s boot duration
export const LABELS = {
  boot: 1.2,
  liftoff: 0.0,
  cruise: 0.8,
  mars: 5.6,
  settle: 6.8,
  hold: 7.1,
  morph: 7.4,
  end: 8.0,
} as const;

export const DURATIONS = {
  total: 8.0,
  boot: 1.2,
  capitalMove: 0.6,
  tailLetter: 0.35,
  glowDecay: 0.9,
} as const;

export const EASINGS = {
  EASE_LIFTOFF: "power2.in",
  EASE_CRUISE: "none",
  EASE_LAND: "power3.out",
  EASE_LETTER: "back.out(1.6)",
  EASE_TAIL: "power2.out",
  EASE_SETTLE: "power3.inOut",
} as const;

// Displacement magnitudes in em for landscape vs portrait
export const LETTER_DISP = {
  landscape: {
    initial: 0.0,
    fired: 0.72,
  },
  portrait: {
    initial: 0.0,
    fired: 0.78,
  },
} as const;

// F and T are negative (-1: up in landscape, left in portrait);
// H and M are positive (+1: down in landscape, right in portrait).
export const LETTER_SIGNS = [-1, 1, -1, 1] as const;

// Portrait & landscape both fire in reading order F (0), H (1), T (2), M (3) with dir = +1
export const LAYOUT_PARAMS = {
  landscape: {
    axis: "x" as const,
    dir: 1 as const,
    order: [0, 1, 2, 3] as const,
  },
  portrait: {
    axis: "y" as const,
    dir: 1 as const,
    order: [0, 1, 2, 3] as const,
  },
} as const;

export const TAIL_STAGGER = 0.04;
export const DIM_OPACITY = 0.55;

export const DPR_MAX = {
  landscape: 2,
  portrait: 1.5,
} as const;

export const TRAIL_COUNT = {
  landscape: 600,
  portrait: 180,
} as const;

export const STAR_COUNT = {
  landscape: 1500,
  portrait: 500,
} as const;

export const PARALLAX = {
  x: 0.25,
  y: 0.15,
  lerp: 0.06,
} as const;

export const CAMERA = {
  fov: 42,
  z: [10.8, 10.0, 10.5] as const,
  track: 0.06,
} as const;

export const SUN_INTENSITY = 2.2;
export const RIM_LIGHT_INTENSITY = 0.8;
export const RIM_POWER = 3.0;
export const HEART_BPM = 72;

export const TASHKENT = {
  lat: 41.31,
  lon: 69.24,
} as const;

export const DEFAULT_TAGLINE =
  "Satellite-driven crop rotation and soil intelligence - from Uzbekistan's Aral Sea basin to Martian regolith.";
export const DEFAULT_CTA_HREF = "#farm-map";
