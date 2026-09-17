"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadEmulatorModule } from "@/lib/wasm/loadEmulator";
import type { EmulatorInstance, EmulatorModule } from "@/lib/wasm/types";

type LoadStatus = "loading" | "ready" | "error";

const SCREEN_WIDTH = 160;
const SCREEN_HEIGHT = 144;

//runs at the gameboy frame rate independent of refresh rate
const GB_FRAME_MS = (70224 / 4194304) * 1000;
const MAX_FRAMES_PER_RAF = 4;

type Palette = readonly [number, number, number][];

// Shade index (0 = lightest) -> RGB, as produced by Ppu::framebuffer().
const PALETTES: Record<string, Palette> = {
  grayscale: [
    [255, 255, 255],
    [170, 170, 170],
    [85, 85, 85],
    [0, 0, 0],
  ],
  "dmg-green": [
    [155, 188, 15],
    [139, 172, 15],
    [48, 98, 48],
    [15, 56, 15],
  ],
  pocket: [
    [255, 255, 255],
    [166, 166, 166],
    [99, 99, 99],
    [33, 33, 33],
  ],
  inverted: [
    [0, 0, 0],
    [85, 85, 85],
    [170, 170, 170],
    [255, 255, 255],
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
    [253, 244, 235],
    [232, 196, 166],
    [185, 127, 90],
    [92, 58, 38],
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
};

const PALETTE_LABELS: Record<keyof typeof PALETTES, string> = {
  grayscale: "Grayscale",
  "dmg-green": "DMG Green",
  pocket: "Pocket",
  inverted: "Inverted",
  "red": "Red",
  "blue": "Blue",
  "green": "Green",
  "orange": "Orange",
  "purple": "Purple",
  "yellow": "Yellow",
};

const DEFAULT_PALETTE = "grayscale";

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
  const moduleRef = useRef<EmulatorModule | null>(null);
  const emulatorRef = useRef<EmulatorInstance | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [romLoaded, setRomLoaded] = useState(false);
  const [paletteKey, setPaletteKey] = useState<keyof typeof PALETTES>(DEFAULT_PALETTE);

  useEffect(() => {
    let cancelled = false;

    loadEmulatorModule()
      .then((module) => {
        if (cancelled) return;
        moduleRef.current = module;
        emulatorRef.current = new module.Emulator();
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!romLoaded) return;

    let running = true;
    let frameId: number;
    let lastTimestamp: number | null = null;
    let accumulatedMs = 0;

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
      accumulatedMs += deltaMs;

      let framesRun = 0;
      while (
        accumulatedMs >= GB_FRAME_MS &&
        framesRun < MAX_FRAMES_PER_RAF
      ) {
        emulatorRef.current?.runFrame();
        accumulatedMs -= GB_FRAME_MS;
        framesRun++;
      }
      // Dropped time from an oversaturated frame budget shouldn't linger and
      // cause a burst of catch-up frames later.
      if (framesRun === MAX_FRAMES_PER_RAF) {
        accumulatedMs = 0;
      }

      if (framesRun > 0) drawFrame();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
    };
  }, [romLoaded, drawFrame]);

  // Repaint the current frame immediately when the palette changes, even if
  // the emulator isn't running (e.g. before a ROM is loaded).
  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  useEffect(() => {
    const handleKey = (pressed: boolean) => (event: KeyboardEvent) => {
      const module = moduleRef.current;
      const emulator = emulatorRef.current;
      if (!module || !emulator) return;

      const buttonName = KEY_TO_BUTTON[event.key];
      if (!buttonName) return;

      event.preventDefault();
      emulator.setButtonPressed(module.Button[buttonName], pressed);
    };

    const onKeyDown = handleKey(true);
    const onKeyUp = handleKey(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    const emulator = emulatorRef.current;
    if (!file || !emulator) return;

    const buffer = new Uint8Array(await file.arrayBuffer());
    emulator.reset();
    emulator.loadRom(buffer);
    setRomLoaded(true);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        className="border border-neutral-700 bg-black"
        style={{ imageRendering: "pixelated", width: 480, height: 432 }}
      />
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".gb,.gbc"
          disabled={status !== "ready"}
          onChange={handleFileChange}
          className="text-sm text-neutral-300"
        />
        <select
          value={paletteKey}
          onChange={(event) =>
            setPaletteKey(event.target.value as keyof typeof PALETTES)
          }
          className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-300"
        >
          {Object.entries(PALETTE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-neutral-400">
        Status: {status}
        {romLoaded ? " · running" : ""}
      </p>
    </div>
  );
}
