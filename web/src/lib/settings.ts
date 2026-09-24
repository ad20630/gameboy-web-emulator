"use client";

import { useSyncExternalStore } from "react";

// Settings shared between SettingsMenu and EmulatorScreen, which live in
// separate trees on the page. Backed by localStorage so they persist, with a
// listener set so every subscriber re-renders when one of them changes it.

const INTEGER_SCALING_KEY = "integerScaling";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Cached in memory so the toggle still works for the session when storage
// is unavailable; `null` means not read from storage yet.
let integerScaling: boolean | null = null;

function getIntegerScaling(): boolean {
  if (integerScaling === null) {
    try {
      integerScaling = localStorage.getItem(INTEGER_SCALING_KEY) === "true";
    } catch {
      integerScaling = false;
    }
  }
  return integerScaling;
}

export function setIntegerScaling(enabled: boolean) {
  integerScaling = enabled;
  try {
    localStorage.setItem(INTEGER_SCALING_KEY, String(enabled));
  } catch {
    // Storage full/unavailable (e.g. private browsing) - just won't persist.
  }
  listeners.forEach((listener) => listener());
}

export function useIntegerScaling(): boolean {
  return useSyncExternalStore(subscribe, getIntegerScaling, () => false);
}
