import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Theme-aware colors - each variable resolves (via `theme()`) to an
      // actual color from Tailwind's own neutral scale in globals.css
      // (`:root` = dark, `:root[data-theme="light"]` = light), so switching
      // the attribute repaints everything using these without a re-render.
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-translucent": "var(--color-surface-translucent)",
        "surface-strong": "var(--color-surface-strong)",
        pad: "var(--color-pad)",
        "pad-active": "var(--color-pad-active)",
        "pad-foreground": "var(--color-pad-foreground)",
        // A/B get their own tokens (distinct from the d-pad/Select/Start
        // "pad" ones) so a theme can color them separately - the gameboy
        // theme is the reason this split exists.
        "ab-button": "var(--color-ab-button)",
        "ab-button-active": "var(--color-ab-button-active)",
        "ab-foreground": "var(--color-ab-foreground)",
        outline: "var(--color-outline)",
        "outline-strong": "var(--color-outline-strong)",
        foreground: "var(--color-foreground)",
        "foreground-secondary": "var(--color-foreground-secondary)",
        "foreground-muted": "var(--color-foreground-muted)",
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      // Coarse-pointer (touch) devices - more reliable than a width
      // breakpoint, since phones/tablets in landscape can exceed `md`.
      addVariant("touch", "@media (pointer: coarse)");
      // Any landscape touch device (phone or tablet) - the d-pad/buttons
      // dock to the screen edges here instead of stacking below the canvas,
      // since landscape always has the spare side width for it.
      addVariant(
        "touch-landscape",
        "@media (pointer: coarse) and (orientation: landscape)"
      );
      // Landscape touch devices too short to fit the normal stacked layout
      // (phones). Gated on height, not width - a phone in landscape can be
      // wider than a small tablet, but tablets have the vertical room the
      // stacked layout needs and phones don't. Registered after
      // `touch-landscape` so its rules win the tie on phones, which match
      // both.
      addVariant(
        "phone-landscape",
        "@media (pointer: coarse) and (orientation: landscape) and (max-height: 500px)"
      );
    }),
  ],
};

export default config;
