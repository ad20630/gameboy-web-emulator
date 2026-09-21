"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadEmulatorModule } from "@/lib/wasm/loadEmulator";
import { GbAudioPlayer } from "@/lib/audio/GbAudioPlayer";
import { TouchControls } from "@/components/TouchControls";
import type { EmulatorInstance, EmulatorModule } from "@/lib/wasm/types";

type LoadStatus = "loading" | "ready" | "error";

const SCREEN_WIDTH = 160;
const SCREEN_HEIGHT = 144;

//runs at the gameboy frame rate independent of refresh rate
const GB_FRAME_MS = (70224 / 4194304) * 1000;
const MAX_FRAMES_PER_RAF = 4;

const SPEED_OPTIONS = [1, 2, 4] as const;
type Speed = (typeof SPEED_OPTIONS)[number];

const SAVE_KEY_PREFIX = "gb-save-";
const AUTOSAVE_INTERVAL_MS = 5000;

const SAVE_STATE_KEY_PREFIX = "gb-savestate-";
const SAVE_STATE_SLOT_COUNT = 10;

function saveStateKey(cartridgeId: string, slot: number): string {
  return `${SAVE_STATE_KEY_PREFIX}${cartridgeId}-${slot}`;
}


function readCartridgeId(bytes: Uint8Array): string {
  let title = "";
  for (let i = 0x134; i <= 0x143 && i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte < 0x20 || byte > 0x7e) break; // stop at the null/padding byte
    title += String.fromCharCode(byte);
  }
  title = title.trim() || "untitled";

  const checksum =
    bytes.length > 0x14f ? (bytes[0x14e] << 8) | bytes[0x14f] : 0;

  return `${title}-${checksum.toString(16).padStart(4, "0")}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

type Palette = readonly [number, number, number][];

// Shade index (0 = lightest) -> RGB, as produced by Ppu::framebuffer().
const PALETTES: Record<string, Palette> = {
  "grayscale": [
    [255, 255, 255],
    [170, 170, 170],
    [85, 85, 85],
    [0, 0, 0],
  ],
  "dmg": [
    [155, 188, 15],
    [139, 172, 15],
    [48, 98, 48],
    [15, 56, 15],
  ],
  "light": [
    [29, 222, 206],
    [25, 199, 179],
    [22, 165, 150],
    [11, 122, 109],
  ],
  "pocket": [
    [196, 207, 161],
    [139, 149, 109],
    [77, 83, 60],
    [31, 31, 31],
  ],
  "inverted": [
    [0, 0, 0],
    [85, 85, 85],
    [170, 170, 170],
    [255, 255, 255],
  ],
  "splash-down": [
    [255, 255, 165],
    [255, 148, 148],
    [148, 148, 255],
    [0, 0, 0],
  ],
  "splash-down-a": [
    [255, 255, 255],
    [255, 255, 0],
    [255, 0, 0],
    [0, 0, 0],
  ],
  "splash-down-b": [
    [255, 255, 255],
    [255, 255, 0],
    [123, 74, 0],
    [0, 0, 0],
  ],
  "splash-left": [
    [255, 255, 255],
    [99, 165, 255],
    [0, 0, 255],
    [0, 0, 0],
  ],
  "splash-left-a": [
    [255, 255, 255],
    [140, 140, 222],
    [82, 82, 140],
    [0, 0, 0],
  ],
  "splash-left-b": [
    [255, 255, 255],
    [165, 165, 165],
    [82, 82, 82],
    [0, 0, 0],
  ],
  "splash-right": [
    [255, 255, 255],
    [82, 255, 0],
    [255, 66, 0],
    [0, 0, 0],
  ],
  "splash-right-a": [
    [255, 255, 255],
    [123, 255, 49],
    [0, 99, 197],
    [0, 0, 0],
  ],
  "splash-right-b": [
    [0, 0, 0],
    [0, 132, 132],
    [255, 222, 0],
    [255, 255, 255],
  ],
  "splash-up": [
    [255, 255, 255],
    [255, 173, 99],
    [132, 49, 0],
    [0, 0, 0],
  ],
  "splash-up-a": [
    [255, 255, 255],
    [255, 132, 132],
    [148, 58, 58],
    [0, 0, 0],
  ],
  "splash-up-b": [
    [255, 230, 197],
    [206, 156, 132],
    [132, 107, 41],
    [90, 49, 8],
  ],
  "soft-dmg": [
    [218, 251, 221],
    [173, 211, 172],
    [82, 156, 144],
    [16, 87, 97],
  ],
  "red": [
    [253, 238, 238],
    [232, 180, 180],
    [185, 101, 101],
    [92, 38, 38],
  ],
  "blue": [
    [237, 243, 250],
    [175, 201, 224],
    [95, 132, 172],
    [38, 65, 92],
  ],
  "green": [
    [238, 253, 238],
    [180, 232, 180],
    [101, 185, 101],
    [38, 92, 38],
  ],
  "orange": [
    [253, 232, 210],
    [240, 175, 110],
    [200, 120, 60],
    [110, 60, 25],
  ],
  "purple": [
    [247, 238, 253],
    [208, 180, 232],
    [143, 101, 185],
    [62, 38, 92],
  ],
  "yellow": [
    [253, 251, 230],
    [230, 220, 150],
    [185, 170, 80],
    [92, 85, 35],
  ],
  "pink": [
    [253, 238, 245],
    [235, 170, 195],
    [185, 90, 130],
    [92, 35, 60],
  ],
  "brown": [
    [245, 230, 210],
    [210, 175, 140],
    [150, 110, 75],
    [75, 50, 30],
  ],
  "amber-dusk": [
    [255, 240, 214],
    [240, 165, 90],
    [50, 90, 110],
    [15, 30, 45],
  ],
  "coral-reef": [
    [255, 235, 205],
    [250, 140, 110],
    [40, 120, 130],
    [10, 40, 55],
  ],
  "neon-tide": [
    [255, 214, 240],
    [255, 110, 190],
    [40, 130, 180],
    [10, 20, 60],
  ],
  "frostbite": [
    [214, 230, 255],
    [140, 170, 210],
    [150, 90, 60],
    [80, 30, 20],
  ],
  "tundra": [
    [205, 245, 240],
    [120, 180, 175],
    [150, 100, 60],
    [70, 35, 15],
  ],
  "nightfire": [
    [230, 220, 255],
    [150, 140, 200],
    [170, 80, 70],
    [70, 20, 30],
  ],
};

const PALETTE_LABELS: Record<keyof typeof PALETTES, string> = {
  "grayscale": "Grayscale",
  "dmg": "DMG",
  "light": "Gameboy Light",
  "pocket": "Gameboy Pocket",
  "inverted": "Inverted",
  "splash-down": "Down",
  "splash-down-a": "Down + A",
  "splash-down-b": "Down + B",
  "splash-left": "Left",
  "splash-left-a": "Left + A",
  "splash-left-b": "Left + B",
  "splash-right": "Right",
  "splash-right-a": "Right + A",
  "splash-right-b": "Right + B",
  "splash-up": "Up",
  "splash-up-a": "Up + A",
  "splash-up-b": "Up + B",
  "soft-dmg": "Soft DMG",
  "red": "Red",
  "blue": "Blue",
  "green": "Green",
  "orange": "Orange",
  "purple": "Purple",
  "yellow": "Yellow",
  "pink": "Pink",
  "brown": "Brown",
  "amber-dusk": "Amber Dusk",
  "coral-reef": "Coral Reef",
  "neon-tide": "Neon Tide",
  "frostbite": "Frostbite",
  "tundra": "Tundra",
  "nightfire": "Nightfire",
};

const DEFAULT_PALETTE = "grayscale";

const CUSTOM_PALETTE_KEYS = new Set([
  "soft-dmg",
  "red",
  "blue",
  "green",
  "orange",
  "purple",
  "yellow",
  "pink",
  "brown",
  "amber-dusk",
  "coral-reef",
  "neon-tide",
  "frostbite",
  "tundra",
  "nightfire",
]);

type PaletteGroup = "hardware" | "boot" | "custom";

function paletteGroup(key: string): PaletteGroup {
  if (key.startsWith("splash-")) return "boot";
  if (CUSTOM_PALETTE_KEYS.has(key)) return "custom";
  return "hardware";
}

const PALETTE_GROUP_LABELS: Record<PaletteGroup, string> = {
  hardware: "Hardware",
  boot: "GBC Boot Palettes",
  custom: "Custom",
};

// Bundled ROMs served from web/public/roms, selectable without a file picker.
const TEST_ROM_GROUPS: { label: string; roms: Record<string, string> }[] = [
  {
    label: "Hardware Tests",
    roms: {
      "cpu_instrs.gb": "/roms/cpu_instrs.gb",
      "dmg-acid2.gb": "/roms/dmg-acid2.gb",
    },
  },
  {
    label: "Homebrew Games",
    roms: {
      "Snake.gb": "/roms/Snake.gb",
      "PandorasBlocks.gbc": "/roms/PandorasBlocks.gbc",
    },
  },
];

const KEY_TO_BUTTON: Record<string, keyof EmulatorModule["Button"]> = {
  ArrowRight: "Right",
  ArrowLeft: "Left",
  ArrowUp: "Up",
  ArrowDown: "Down",
  z: "B",
  x: "A",
  Shift: "Select",
  Enter: "Start",
};

export function EmulatorScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moduleRef = useRef<EmulatorModule | null>(null);
  const emulatorRef = useRef<EmulatorInstance | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const audioPlayerRef = useRef<GbAudioPlayer | null>(null);
  const saveKeyRef = useRef<string | null>(null);
  const cartridgeIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [romLoaded, setRomLoaded] = useState(false);
  const [paletteKey, setPaletteKey] = useState<keyof typeof PALETTES>(DEFAULT_PALETTE);
  const [selectedTestRom, setSelectedTestRom] = useState("");
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [muted, setMuted] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [filledSlots, setFilledSlots] = useState<boolean[]>(() =>
    Array(SAVE_STATE_SLOT_COUNT).fill(false)
  );
  const [saveFlash, setSaveFlash] = useState(false);
  const [loadFlash, setLoadFlash] = useState(false);
  const saveFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveFlashTimeoutRef.current) clearTimeout(saveFlashTimeoutRef.current);
      if (loadFlashTimeoutRef.current) clearTimeout(loadFlashTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const audioPlayer = new GbAudioPlayer();
    audioPlayerRef.current = audioPlayer;

    Promise.all([loadEmulatorModule(), audioPlayer.waitUntilReady()])
      .then(([module]) => {
        if (cancelled) return;
        moduleRef.current = module;
        const emulator = new module.Emulator();
        // Set before any runFrame() so the core generates audio at the
        // device's exact native rate - no resampling needed downstream.
        emulator.setAudioSampleRate(audioPlayer.sampleRate);
        emulatorRef.current = emulator;
        audioPlayer.setMuted(muted);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
      audioPlayerRef.current?.close();
      audioPlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    audioPlayerRef.current?.setMuted(muted);
  }, [muted]);

  const drawFrame = useCallback(() => {
    const emulator = emulatorRef.current;
    const canvas = canvasRef.current;
    if (!emulator || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!imageDataRef.current) {
      imageDataRef.current = ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    }
    const imageData = imageDataRef.current;
    const framebuffer = emulator.getFramebuffer();
    const palette = PALETTES[paletteKey];

    for (let i = 0; i < framebuffer.length; i++) {
      const [r, g, b] = palette[framebuffer[i] & 0x03];
      const offset = i * 4;
      imageData.data[offset] = r;
      imageData.data[offset + 1] = g;
      imageData.data[offset + 2] = b;
      imageData.data[offset + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [paletteKey]);

  useEffect(() => {
    // Paused: cancel the loop outright (rather than running it in place)
    // so the frozen frame stays on screen and no CPU/battery is spent.
    if (!romLoaded || paused) return;

    let running = true;
    let frameId: number;
    let lastTimestamp: number | null = null;
    let accumulatedMs = 0;
    const maxFramesPerRaf = MAX_FRAMES_PER_RAF * speed;

    const loop = (timestamp: number) => {
      if (!running) return;

      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      let deltaMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      // If the tab was backgrounded or a huge stall happened, don't try to
      // burn through minutes of emulated frames catching up.
      if (deltaMs > 1000) {
        deltaMs = GB_FRAME_MS;
      }
      // Fast-forward by feeding the loop sped-up wall-clock time, rather
      // than running extra frames per emulated frame's worth of time.
      accumulatedMs += deltaMs * speed;

      let framesRun = 0;
      while (
        accumulatedMs >= GB_FRAME_MS &&
        framesRun < maxFramesPerRaf
      ) {
        emulatorRef.current?.runFrame();
        accumulatedMs -= GB_FRAME_MS;
        framesRun++;
      }
      // Dropped time from an oversaturated frame budget shouldn't linger and
      // cause a burst of catch-up frames later.
      if (framesRun === maxFramesPerRaf) {
        accumulatedMs = 0;
      }

      if (framesRun > 0) {
        drawFrame();
        // Drain every tick regardless of speed/mute so the core's sample
        // buffer doesn't grow unbounded; GbAudioPlayer drops chunks itself
        // if they'd push playback too far ahead of real time (e.g. during
        // fast-forward, which generates audio faster than it plays).
        const samples = emulatorRef.current?.getAudioSamples();
        if (samples) audioPlayerRef.current?.push(samples);
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
    };
  }, [romLoaded, paused, speed, drawFrame]);

  // Repaint the current frame immediately when the palette changes, even if
  // the emulator isn't running (e.g. before a ROM is loaded).
  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  const setButton = useCallback(
    (buttonName: keyof EmulatorModule["Button"], pressed: boolean) => {
      const emulatorModule = moduleRef.current;
      const emulator = emulatorRef.current;
      if (!emulatorModule || !emulator) return;
      emulator.setButtonPressed(emulatorModule.Button[buttonName], pressed);
    },
    []
  );

  useEffect(() => {
    const handleKey = (pressed: boolean) => (event: KeyboardEvent) => {
      const buttonName = KEY_TO_BUTTON[event.key];
      if (!buttonName) return;

      event.preventDefault();
      setButton(buttonName, pressed);
    };

    const onKeyDown = handleKey(true);
    const onKeyUp = handleKey(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setButton]);

  const saveCartRam = useCallback(() => {
    const emulator = emulatorRef.current;
    const key = saveKeyRef.current;
    if (!emulator || !key) return;
    const ram = emulator.getCartRam();
    if (ram.length === 0) return; // nothing battery-backed to persist
    try {
      localStorage.setItem(key, bytesToBase64(ram));
    } catch {
      // Storage full/unavailable (e.g. private browsing) - not fatal.
    }
  }, []);

  useEffect(() => {
    if (!romLoaded) return;
    const interval = setInterval(saveCartRam, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [romLoaded, saveCartRam]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveCartRam();
    };
    window.addEventListener("beforeunload", saveCartRam);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", saveCartRam);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [saveCartRam]);

  const refreshFilledSlots = useCallback((cartridgeId: string | null) => {
    if (!cartridgeId) {
      setFilledSlots(Array(SAVE_STATE_SLOT_COUNT).fill(false));
      return;
    }
    const next: boolean[] = [];
    for (let slot = 0; slot < SAVE_STATE_SLOT_COUNT; slot++) {
      next.push(localStorage.getItem(saveStateKey(cartridgeId, slot)) !== null);
    }
    setFilledSlots(next);
  }, []);

  const loadRomBytes = (bytes: Uint8Array) => {
    const emulator = emulatorRef.current;
    if (!emulator) return;

    saveCartRam(); // flush whatever ROM was previously running
    audioPlayerRef.current?.resume(); // called from a user gesture - satisfies autoplay policy

    emulator.reset();
    emulator.loadRom(bytes);

    const cartridgeId = readCartridgeId(bytes);
    cartridgeIdRef.current = cartridgeId;
    saveKeyRef.current = SAVE_KEY_PREFIX + cartridgeId;
    const saved = localStorage.getItem(saveKeyRef.current);
    if (saved) {
      try {
        emulator.loadCartRam(base64ToBytes(saved));
      } catch {
        // Corrupted/incompatible save data - start fresh instead of crashing.
      }
    }
    refreshFilledSlots(cartridgeId);

    setPaused(false);
    setRomLoaded(true);
  };

  const handleSaveState = useCallback(() => {
    const emulator = emulatorRef.current;
    const cartridgeId = cartridgeIdRef.current;
    if (!emulator || !cartridgeId) return;
    try {
      localStorage.setItem(
        saveStateKey(cartridgeId, selectedSlot),
        bytesToBase64(emulator.getSaveState())
      );
      refreshFilledSlots(cartridgeId);

      setSaveFlash(true);
      if (saveFlashTimeoutRef.current) clearTimeout(saveFlashTimeoutRef.current);
      saveFlashTimeoutRef.current = setTimeout(() => setSaveFlash(false), 1500);
    } catch {
      // Storage full/unavailable (e.g. private browsing) - not fatal.
    }
  }, [selectedSlot, refreshFilledSlots]);

  const handleLoadState = useCallback(() => {
    const emulator = emulatorRef.current;
    const cartridgeId = cartridgeIdRef.current;
    if (!emulator || !cartridgeId) return;
    const saved = localStorage.getItem(saveStateKey(cartridgeId, selectedSlot));
    if (!saved) return;
    try {
      emulator.loadSaveState(base64ToBytes(saved));
      drawFrame(); // repaint immediately, even while paused

      setLoadFlash(true);
      if (loadFlashTimeoutRef.current) clearTimeout(loadFlashTimeoutRef.current);
      loadFlashTimeoutRef.current = setTimeout(() => setLoadFlash(false), 1500);
    } catch {
      // Corrupted save data - ignore rather than crash.
    }
  }, [selectedSlot, drawFrame]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadRomBytes(new Uint8Array(await file.arrayBuffer()));
  };

  const handleLoadTestRom = async () => {
    if (!selectedTestRom) return;
    const response = await fetch(selectedTestRom);
    loadRomBytes(new Uint8Array(await response.arrayBuffer()));
    // Clear any locally-picked file so the input doesn't keep showing its
    // name once a test ROM has taken over.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Soft-reset, like the console's reset button: reboots CPU/PPU/APU state
  // but leaves the cartridge (ROM + cart RAM) alone, so the current game
  // and any unsaved battery RAM survive the reset.
  const handleReset = useCallback(() => {
    const emulator = emulatorRef.current;
    if (!emulator || !romLoaded) return;
    emulator.reset();
    drawFrame(); // repaint immediately, even while paused
  }, [romLoaded, drawFrame]);

  return (
    <div className="flex w-full max-w-[480px] flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        className="w-full border border-neutral-700 bg-black"
        style={{ imageRendering: "pixelated", aspectRatio: `${SCREEN_WIDTH} / ${SCREEN_HEIGHT}` }}
      />
      <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
        <select
          value={selectedTestRom}
          disabled={status !== "ready"}
          onChange={(event) => setSelectedTestRom(event.target.value)}
          autoComplete="off"
          className="min-w-0 flex-1 truncate rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-300"
        >
          <option value="" disabled>
            Select test ROM...
          </option>
          {TEST_ROM_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {Object.entries(group.roms).map(([label, url]) => (
                <option key={url} value={url}>
                  {label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={handleLoadTestRom}
          disabled={status !== "ready" || !selectedTestRom}
          title="Load test ROM"
          className="shrink-0 rounded border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm text-neutral-300 disabled:opacity-50"
        >
          Load
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!romLoaded}
          title="Reset"
          className="shrink-0 rounded border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm text-neutral-300 disabled:opacity-50"
        >
          Reset
        </button>
      </div>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".gb,.gbc"
          disabled={status !== "ready"}
          onChange={handleFileChange}
          autoComplete="off"
          className="min-w-0 flex-1 overflow-hidden text-sm text-neutral-300"
        />
        <select
          value={paletteKey}
          onChange={(event) =>
            setPaletteKey(event.target.value as keyof typeof PALETTES)
          }
          className="min-w-0 shrink-0 truncate rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-300"
        >
          {(["hardware", "boot", "custom"] as const).map((group) => (
            <optgroup key={group} label={PALETTE_GROUP_LABELS[group]}>
              {Object.entries(PALETTE_LABELS)
                .filter(([key]) => paletteGroup(key) === group)
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            audioPlayerRef.current?.resume();
            setPaused((prev) => !prev);
          }}
          disabled={!romLoaded}
          aria-pressed={paused}
          title="Pause game"
          className={`w-18 shrink-0 whitespace-nowrap rounded border px-2 py-1 text-center text-sm disabled:opacity-50 ${
            paused
              ? "border-neutral-400 bg-neutral-700 text-neutral-100"
              : "border-neutral-700 bg-neutral-900 text-neutral-300"
          }`}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={() => setMuted((prev) => !prev)}
          disabled={!romLoaded}
          aria-pressed={muted}
          title={muted ? "Unmute" : "Mute"}
          className={`w-16 shrink-0 whitespace-nowrap rounded border px-2 py-1 text-center text-sm disabled:opacity-50 ${
            muted
              ? "border-neutral-400 bg-neutral-700 text-neutral-100"
              : "border-neutral-700 bg-neutral-900 text-neutral-300"
          }`}
        >
          {muted ? "Unmute" : "Mute"}
        </button>
        <div className="mr-auto flex shrink-0 gap-1" role="group" aria-label="Emulation speed">
          {SPEED_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSpeed(option)}
              disabled={!romLoaded}
              aria-pressed={speed === option}
              className={`rounded border px-2 py-1 text-sm disabled:opacity-50 ${
                speed === option
                  ? "border-neutral-400 bg-neutral-700 text-neutral-100"
                  : "border-neutral-700 bg-neutral-900 text-neutral-300"
              }`}
            >
              {option}x
            </button>
          ))}
        </div>
        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-center gap-2">
          <select
            value={selectedSlot}
            onChange={(event) => setSelectedSlot(Number(event.target.value))}
            disabled={!romLoaded}
            aria-label="Save state slot"
            className="min-w-0 shrink-0 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-300 disabled:opacity-50"
          >
            {Array.from({ length: SAVE_STATE_SLOT_COUNT }, (_, slot) => (
              <option key={slot} value={slot}>
                Slot {slot + 1}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSaveState}
            disabled={!romLoaded}
            title="Save state"
            className={`shrink-0 whitespace-nowrap rounded border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
              saveFlash
                ? "border-emerald-500 bg-emerald-900 text-emerald-200"
                : "border-neutral-700 bg-neutral-900 text-neutral-300"
            }`}
          >
            {saveFlash ? "Saved!" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleLoadState}
            disabled={!romLoaded || !filledSlots[selectedSlot]}
            title="Load state"
            className={`shrink-0 whitespace-nowrap rounded border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
              loadFlash
                ? "border-emerald-500 bg-emerald-900 text-emerald-200"
                : "border-neutral-700 bg-neutral-900 text-neutral-300"
            }`}
          >
            {loadFlash ? "Loaded!" : "Load"}
          </button>
        </div>
      </div>
      <p className="text-sm text-neutral-400">
        Status: {status}
        {romLoaded ? (paused ? " · paused" : ` · running${speed !== 1 ? ` (${speed}x)` : ""}`) : ""}
      </p>
      <TouchControls disabled={!romLoaded} onButtonChange={setButton} />
    </div>
  );
}
