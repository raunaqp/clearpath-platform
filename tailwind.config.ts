import type { Config } from "tailwindcss";

/**
 * clearpath-platform brand system — the ClearPath "Teal Trust" palette (BUILD_SPEC §10),
 * carried over verbatim so the two products read as one family. The only
 * addition is the `green` verdict token pair the spec calls out for the
 * DEPLOY verdict (ClearPath never needed it).
 *
 * Verdict mapping (BUILD_SPEC §10):
 *   DEPLOY      → green   (#3B6D11 / #EAF3DE)
 *   CONDITIONS  → amber   (#BA7517 / #FAEEDA)
 *   NOT YET     → coral   (#993C1D / #FAECE7)  — coral, never red:
 *                "not yet is a feature, not a failure"
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // lib/ui.ts holds class-name strings (verdict / gate / doc chips); it must
    // be scanned or those utilities are never emitted.
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F7F6F2",
        "bg-card": "#FDFCF8",
        "bg-sink": "#EFECE3",
        ink: "#0E1411",
        "ink-2": "#2A3430",
        muted: "#6B766F",
        line: "#D9D5C8",
        "line-soft": "#E8E4D6",
        teal: {
          deep: "#0F6E56",
          light: "#E1F5EE",
          DEFAULT: "#0F6E56",
        },
        amber: {
          brand: "#BA7517",
          light: "#FAEEDA",
          deep: "#633806",
        },
        coral: {
          brand: "#993C1D",
          light: "#FAECE7",
        },
        green: {
          dark: "#3B6D11",
          light: "#EAF3DE",
        },
        mint: "#E8F5F0",
        cream: "#F5F0E8",
      },
      fontFamily: {
        // Brand system: Georgia headings, Calibri body. Both are named FIRST
        // so a machine that has them uses them; the rest of each stack is a
        // metric-compatible fallback (Carlito for Calibri) and then the
        // webfont that was standing in for them.
        serif: ["Georgia", "Source Serif 4", "Times New Roman", "serif"],
        sans: ["Calibri", "Carlito", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "0.75rem",
        pill: "9999px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: {
        "display-lg": ["clamp(44px, 6.2vw, 84px)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
        "display-sm": ["clamp(32px, 3.6vw, 52px)", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
      },
      maxWidth: {
        content: "1240px",
      },
    },
  },
  /**
   * No `plugins` here. This file is loaded as ESM by @tailwindcss/node, where
   * `require` is not defined — the entry only worked because the config was
   * cached and never re-evaluated. ANY edit to this file took the dev server
   * down with "require is not defined", which is why the font stack below
   * could not be changed without this.
   *
   * The plugin is loaded by `@plugin "tailwindcss-animate"` in globals.css,
   * which is the Tailwind v4 way and was already doing the work.
   */
};

export default config;
