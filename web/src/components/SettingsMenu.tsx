"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "gameboy";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "gameboy", label: "Game Boy" },
];

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Storage full/unavailable (e.g. private browsing) - just won't persist.
  }
}

function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" || attr === "gameboy" ? attr : "dark";
}

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  // Matches whatever the inline theme-init script in layout.tsx already
  // applied before this component mounted, rather than assuming dark. That
  // script runs pre-hydration and isn't React state, so there's no way to
  // know its result during SSR/initial render - syncing from it here is a
  // legitimate effect (reading an external, non-React-owned source), not a
  // value derivable from props/state.
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readTheme());
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const selectTheme = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show settings"
        title="Settings"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline bg-surface text-xs text-foreground-secondary"
      >
        ⚙
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-sm border border-outline bg-surface p-4 text-sm text-foreground-secondary phone-landscape:max-h-full phone-landscape:overflow-y-auto"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Theme</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-outline text-foreground-secondary"
              >
                ×
              </button>
            </div>
            <div className="flex gap-2" role="group" aria-label="Theme">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectTheme(option.value)}
                  aria-pressed={theme === option.value}
                  className={`flex-1 rounded border px-3 py-1 text-sm ${
                    theme === option.value
                      ? "border-outline-strong bg-surface-strong text-foreground"
                      : "border-outline bg-surface text-foreground-secondary"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
