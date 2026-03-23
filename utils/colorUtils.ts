import type { CardPalette } from "@/types/card";
import { getContrastColor } from "@/types/card";

/** Convert a 6-digit hex color to [hue(0-360), saturation(0-1), lightness(0-1)]. */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
  }
  return [h * 360, s, l];
}

function hue2rgb(p: number, q: number, t: number): number {
  const tNorm = ((t % 1) + 1) % 1;
  if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
  if (tNorm < 1 / 2) return q;
  if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
  return p;
}

/** Convert HSL (h: 0-360, s: 0-1, l: 0-1) to a hex color string. */
export function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360;
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Derive a 2-stop gradient from a base color.
 * End color is a subtly lighter, slightly desaturated version of the start.
 */
export function deriveGradient(hex: string): [string, string] {
  const [h, s, l] = hexToHsl(hex);
  const lighterL = Math.min(0.88, l + 0.12);
  const lighterS = Math.max(0, s - 0.06);
  return [hex, hslToHex(h, lighterS, lighterL)];
}

/** Build a full CardPalette from a pre-computed gradient pair. */
export function buildPaletteFromGradient(
  gradient: [string, string],
): CardPalette {
  const [start] = gradient;
  const primaryText = getContrastColor(start);
  const mutedText =
    primaryText === "#1D1D1D"
      ? "rgba(29,29,29,0.65)"
      : "rgba(255,255,255,0.65)";
  const r = parseInt(start.slice(1, 3), 16);
  const g = parseInt(start.slice(3, 5), 16);
  const b = parseInt(start.slice(5, 7), 16);
  return {
    id: `custom-${start.slice(1)}`,
    background: start,
    mutedText,
    primaryText,
    shadow: `rgba(${r},${g},${b},0.25)`,
    gradient,
  };
}
