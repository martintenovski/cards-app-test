import type { ColorSchemeName } from "react-native";

export type ResolvedTheme = "light" | "dark";
export type ThemePreference = "system" | ResolvedTheme;

export function resolveTheme(
  preference: ThemePreference,
  deviceScheme: ColorSchemeName,
): ResolvedTheme {
  if (preference === "system") {
    return deviceScheme === "dark" ? "dark" : "light";
  }

  return preference;
}

export const APP_THEME = {
  light: {
    background: "#EFEFEF",
    surface: "#FFFFFF",
    surfaceMuted: "#F6F6F6",
    surfaceStrong: "#ECECEC",
    input: "#FFFFFF",
    inputBorder: "rgba(29,29,29,0.08)",
    text: "#1D1D1D",
    textMuted: "rgba(29,29,29,0.62)",
    textSoft: "rgba(29,29,29,0.38)",
    inverseText: "#FFFFFF",
    accent: "#1D1D1D",
    accentText: "#FFFFFF",
    chip: "#FFFFFF",
    chipActive: "#1D1D1D",
    chipText: "#1D1D1D",
    chipActiveText: "#FFFFFF",
    overlay: "rgba(0,0,0,0.42)",
    border: "rgba(29,29,29,0.08)",
    buttonBorder: "rgba(29,29,29,0.08)",
    success: "#1F9D55",
    danger: "#E5484D",
    dangerSoft: "rgba(229,72,77,0.10)",
    shadow: "#000000",
  },
  dark: {
    background: "#111111",
    surface: "#1D1D1D",
    surfaceMuted: "#252525",
    surfaceStrong: "#303030",
    input: "#303030",
    inputBorder: "rgba(255,255,255,0.10)",
    text: "#FFFFFF",
    textMuted: "rgba(255,255,255,0.66)",
    textSoft: "rgba(255,255,255,0.38)",
    inverseText: "#1D1D1D",
    accent: "#EFEFEF",
    accentText: "#1D1D1D",
    chip: "#FFFFFF",
    chipActive: "#EFEFEF",
    chipText: "#1D1D1D",
    chipActiveText: "#1D1D1D",
    overlay: "rgba(0,0,0,0.55)",
    border: "rgba(255,255,255,0.10)",
    buttonBorder: "rgba(255,255,255,0.14)",
    success: "#4ADE80",
    danger: "#FF6B6B",
    dangerSoft: "rgba(255,107,107,0.12)",
    shadow: "#000000",
  },
} as const;

export const CARD_SIDE_TOGGLE_THEME = {
  light: {
    containerBackground: "#DCDCDC",
    activeBackground: "#FFFFFF",
    activeText: "#1D1D1D",
    inactiveText: "rgba(29,29,29,0.62)",
  },
  dark: {
    containerBackground: "#303030",
    activeBackground: "#F4F4F4",
    activeText: "#1D1D1D",
    inactiveText: "rgba(255,255,255,0.72)",
  },
} as const;
