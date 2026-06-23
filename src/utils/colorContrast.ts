// src/utils/colorContrast.ts

/**
 * Utilities for WCAG 2.1 colour-contrast checking.
 *
 * Supports: hex (#rgb, #rrggbb, #rrggbbaa), rgb(), rgba(), hsl(), hsla(),
 * and the 140 named CSS colours.
 *
 * WCAG thresholds
 * ───────────────
 * Level AA  – normal text ≥ 4.5 : 1  |  large text ≥ 3.0 : 1
 * Level AAA – normal text ≥ 7.0 : 1  |  large text ≥ 4.5 : 1
 *
 * "Large text" = bold ≥ 14 pt OR regular ≥ 18 pt (≈ 24 px / 18.67 px).
 * This implementation does not infer font size from source; callers that
 * cannot determine size should use the normal-text threshold (conservative).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RGB {
  r: number; // 0–255
  g: number; // 0–255
  b: number; // 0–255
}

export type WcagLevel = "AA" | "AAA";
export type TextSize = "normal" | "large";

export interface ContrastResult {
  ratio: number; // e.g. 4.52
  passesAA: boolean;
  passesAAA: boolean;
  requiredAA: number;
  requiredAAA: number;
}

// ─── Named colours ────────────────────────────────────────────────────────────

/** Subset of CSS named colours most likely to appear in source code. */
const NAMED_COLOURS: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  lime: "#00ff00",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  aqua: "#00ffff",
  magenta: "#ff00ff",
  fuchsia: "#ff00ff",
  silver: "#c0c0c0",
  gray: "#808080",
  grey: "#808080",
  maroon: "#800000",
  olive: "#808000",
  green: "#008000",
  purple: "#800080",
  teal: "#008080",
  navy: "#000080",
  orange: "#ffa500",
  coral: "#ff7f50",
  salmon: "#fa8072",
  gold: "#ffd700",
  khaki: "#f0e68c",
  indigo: "#4b0082",
  violet: "#ee82ee",
  pink: "#ffc0cb",
  hotpink: "#ff69b4",
  deeppink: "#ff1493",
  tomato: "#ff6347",
  crimson: "#dc143c",
  firebrick: "#b22222",
  darkred: "#8b0000",
  orangered: "#ff4500",
  darkorange: "#ff8c00",
  goldenrod: "#daa520",
  darkgoldenrod: "#b8860b",
  palegoldenrod: "#eee8aa",
  greenyellow: "#adff2f",
  chartreuse: "#7fff00",
  lawngreen: "#7cfc00",
  limegreen: "#32cd32",
  mediumspringgreen: "#00fa9a",
  springgreen: "#00ff7f",
  mediumseagreen: "#3cb371",
  seagreen: "#2e8b57",
  darkgreen: "#006400",
  yellowgreen: "#9acd32",
  olivedrab: "#6b8e23",
  darkolivegreen: "#556b2f",
  mediumaquamarine: "#66cdaa",
  darkseagreen: "#8fbc8f",
  lightseagreen: "#20b2aa",
  darkcyan: "#008b8b",
  darkturquoise: "#00ced1",
  mediumturquoise: "#48d1cc",
  turquoise: "#40e0d0",
  powderblue: "#b0e0e6",
  lightblue: "#add8e6",
  skyblue: "#87ceeb",
  lightskyblue: "#87cefa",
  deepskyblue: "#00bfff",
  dodgerblue: "#1e90ff",
  cornflowerblue: "#6495ed",
  steelblue: "#4682b4",
  royalblue: "#4169e1",
  mediumblue: "#0000cd",
  darkblue: "#00008b",
  midnightblue: "#191970",
  slateblue: "#6a5acd",
  mediumslateblue: "#7b68ee",
  mediumpurple: "#9370db",
  blueviolet: "#8a2be2",
  darkviolet: "#9400d3",
  darkorchid: "#9932cc",
  mediumorchid: "#ba55d3",
  orchid: "#da70d6",
  plum: "#dda0dd",
  thistle: "#d8bfd8",
  lavender: "#e6e6fa",
  ghostwhite: "#f8f8ff",
  aliceblue: "#f0f8ff",
  mintcream: "#f5fffa",
  honeydew: "#f0fff0",
  lightcyan: "#e0ffff",
  azure: "#f0ffff",
  lightgoldenrodyellow: "#fafad2",
  lemonchiffon: "#fffacd",
  lightyellow: "#ffffe0",
  ivory: "#fffff0",
  floralwhite: "#fffaf0",
  oldlace: "#fdf5e6",
  linen: "#faf0e6",
  antiquewhite: "#faebd7",
  bisque: "#ffe4c4",
  moccasin: "#ffe4b5",
  wheat: "#f5deb3",
  burlywood: "#deb887",
  tan: "#d2b48c",
  rosybrown: "#bc8f8f",
  sandybrown: "#f4a460",
  peru: "#cd853f",
  chocolate: "#d2691e",
  saddlebrown: "#8b4513",
  sienna: "#a0522d",
  brown: "#a52a2a",
  snow: "#fffafa",
  seashell: "#fff5ee",
  mistyrose: "#ffe4e1",
  lightyellow2: "#ffffe0",
  beige: "#f5f5dc",
  whitesmoke: "#f5f5f5",
  gainsboro: "#dcdcdc",
  lightgray: "#d3d3d3",
  lightgrey: "#d3d3d3",
  darkgray: "#a9a9a9",
  darkgrey: "#a9a9a9",
  dimgray: "#696969",
  dimgrey: "#696969",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  slategray: "#708090",
  slategrey: "#708090",
  darkslategray: "#2f4f4f",
  darkslategrey: "#2f4f4f",
  transparent: "#00000000",
};

// ─── Colour parsing ───────────────────────────────────────────────────────────

/** Parse any supported colour string into an RGB triple, or null if unrecognised. */
export function parseColor(raw: string): RGB | null {
  const s = raw.trim().toLowerCase();

  // Named colour
  const named = NAMED_COLOURS[s];
  if (named) return parseColor(named);

  // #rgb
  if (/^#[0-9a-f]{3}$/.test(s)) {
    return {
      r: parseInt(s[1] + s[1], 16),
      g: parseInt(s[2] + s[2], 16),
      b: parseInt(s[3] + s[3], 16),
    };
  }

  // #rrggbb / #rrggbbaa (ignore alpha)
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(s)) {
    return {
      r: parseInt(s.slice(1, 3), 16),
      g: parseInt(s.slice(3, 5), 16),
      b: parseInt(s.slice(5, 7), 16),
    };
  }

  // rgb() / rgba()
  const rgbMatch = s.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/,
  );
  if (rgbMatch) {
    return {
      r: Math.min(255, parseInt(rgbMatch[1], 10)),
      g: Math.min(255, parseInt(rgbMatch[2], 10)),
      b: Math.min(255, parseInt(rgbMatch[3], 10)),
    };
  }

  // hsl() / hsla()
  const hslMatch = s.match(
    /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/,
  );
  if (hslMatch) {
    return hslToRgb(
      parseFloat(hslMatch[1]),
      parseFloat(hslMatch[2]) / 100,
      parseFloat(hslMatch[3]) / 100,
    );
  }

  return null;
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// ─── WCAG luminance & contrast ────────────────────────────────────────────────

/** Relative luminance per WCAG 2.1 §1.4.3. */
export function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two colours (always ≥ 1). */
export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Full WCAG AA + AAA evaluation for a colour pair. */
export function evaluateContrast(
  fg: RGB,
  bg: RGB,
  textSize: TextSize = "normal",
): ContrastResult {
  const ratio = contrastRatio(fg, bg);
  const requiredAA = textSize === "large" ? 3.0 : 4.5;
  const requiredAAA = textSize === "large" ? 4.5 : 7.0;

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= requiredAA,
    passesAAA: ratio >= requiredAAA,
    requiredAA,
    requiredAAA,
  };
}

/** Format a contrast result as a human-readable diagnostic message. */
export function formatContrastMessage(
  result: ContrastResult,
  source: string,
): string {
  const ratio = result.ratio.toFixed(2);
  const base = `Contraste insuficiente detectado em ${source}. Proporção atual: ${ratio}:1.`;

  if (!result.passesAA) {
    return `${base} Mínimo WCAG AA: ${result.requiredAA}:1. Este texto pode ser ilegível para pessoas com baixa visão.`;
  }

  // passes AA but not AAA
  return `${base} Passa no nível AA (${result.requiredAA}:1) mas não no AAA (${result.requiredAAA}:1). Considere aumentar o contraste para melhor acessibilidade.`;
}
