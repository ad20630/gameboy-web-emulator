import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
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
