"use client";

import { useSyncExternalStore } from "react";

import type { Rgb } from "@/lib/gameBoyColorPalettes";

// Palettes the user makes themselves, kept in localStorage. Shared between
// PalettePicker (which edits them) and EmulatorScreen (which draws with the
// selected one), so it uses the same listener-set pattern as settings.ts.
// This file only imports types from the palette modules: palettes.ts imports
// CUSTOM_KEY_PREFIX from here.

export const CUSTOM_KEY_PREFIX = "custom:";
export const CUSTOM_COLOR_COUNT = 12; // 4 BG, 4 OBJ0, 4 OBJ1
export const CUSTOM_NAME_MAX_LENGTH = 20;

export interface CustomPalette {
  id: string;
  name: string;
  colors: Rgb[]; // always CUSTOM_COLOR_COUNT long
}

const STORAGE_KEY = "customPalettes";
const EMPTY: readonly CustomPalette[] = [];

export function customKey(id: string): string {
  return CUSTOM_KEY_PREFIX + id;
}

export function newCustomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function isRgb(value: unknown): value is Rgb {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
  );
}

// Storage can hold anything (old versions, hand edits), so keep only entries
// that are well-formed rather than trusting the JSON.
function parseStored(raw: string | null): CustomPalette[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (p) =>
          p &&
          typeof p.id === "string" &&
          typeof p.name === "string" &&
          Array.isArray(p.colors) &&
          p.colors.length === CUSTOM_COLOR_COUNT &&
          p.colors.every(isRgb)
      )
      .map((p) => ({
        id: p.id,
        name: p.name.slice(0, CUSTOM_NAME_MAX_LENGTH),
        colors: p.colors,
      }));
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

// Cached in memory so palettes still work for the session when storage is
// unavailable; `null` means not read from storage yet.
let palettes: readonly CustomPalette[] | null = null;

function getPalettes(): readonly CustomPalette[] {
  if (palettes === null) {
    try {
      palettes = parseStored(localStorage.getItem(STORAGE_KEY));
    } catch {
      palettes = EMPTY;
    }
  }
  return palettes;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab edited the list: drop the cache so the next read picks it up.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      palettes = null;
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: readonly CustomPalette[]) {
  palettes = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full/unavailable (e.g. private browsing) - just won't persist.
  }
  emit();
}

// Adds the palette, or replaces the one with the same id.
export function saveCustomPalette(palette: CustomPalette) {
  const current = getPalettes();
  write(
    current.some((p) => p.id === palette.id)
      ? current.map((p) => (p.id === palette.id ? palette : p))
      : [...current, palette]
  );
}

export function deleteCustomPalette(id: string) {
  write(getPalettes().filter((p) => p.id !== id));
}

export function useCustomPalettes(): readonly CustomPalette[] {
  return useSyncExternalStore(subscribe, getPalettes, () => EMPTY);
}

export function rgbToHex([r, g, b]: Rgb): string {
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

// The colors as text, one row of four per layer (BG, OBJ0, OBJ1 for 12
// colors; a single row for 4).
export function formatHexCodes(hexColors: readonly string[]): string {
  const rows: string[] = [];
  for (let i = 0; i < hexColors.length; i += 4) {
    rows.push(
      hexColors
        .slice(i, i + 4)
        .map((hex) => hex.toUpperCase())
        .join(" ")
    );
  }
  return rows.join("\n");
}

export interface ParsedHexCodes {
  colors: string[] | null; // "#rrggbb" when the text is exactly the expected number of valid codes
  count: number; // how many codes were in the text
  invalid: string[]; // the codes that weren't valid hex colors
}

// Accepts codes separated by whitespace, commas or semicolons, with or
// without a leading "#", so a list pasted from anywhere works.
export function parseHexCodes(
  text: string,
  expected: number = CUSTOM_COLOR_COUNT
): ParsedHexCodes {
  const tokens = text.split(/[\s,;]+/).filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    if (/^#?[0-9a-fA-F]{6}$/.test(token)) {
      valid.push("#" + token.replace("#", "").toLowerCase());
    } else {
      invalid.push(token);
    }
  }
  const ok = invalid.length === 0 && valid.length === expected;
  return { colors: ok ? valid : null, count: tokens.length, invalid };
}
