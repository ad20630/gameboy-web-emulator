"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadEmulatorModule } from "@/lib/wasm/loadEmulator";
import type { EmulatorInstance, EmulatorModule } from "@/lib/wasm/types";

type LoadStatus = "loading" | "ready" | "error";

const SCREEN_WIDTH = 160;
const SCREEN_HEIGHT = 144;

// Shade index (0 = lightest) -> RGB, as produced by Ppu::framebuffer().
const SHADE_COLORS: ReadonlyArray<readonly [number, number, number]> = [
  [255, 255, 255],
  [170, 170, 170],
  [85, 85, 85],
  [0, 0, 0],
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
  const moduleRef = useRef<EmulatorModule | null>(null);
  const emulatorRef = useRef<EmulatorInstance | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [romLoaded, setRomLoaded] = useState(false);

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

    for (let i = 0; i < framebuffer.length; i++) {
      const [r, g, b] = SHADE_COLORS[framebuffer[i] & 0x03];
      const offset = i * 4;
      imageData.data[offset] = r;
      imageData.data[offset + 1] = g;
      imageData.data[offset + 2] = b;
      imageData.data[offset + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, []);

  useEffect(() => {
    if (!romLoaded) return;

    let running = true;
    let frameId: number;

    const loop = () => {
      if (!running) return;
      emulatorRef.current?.runFrame();
      drawFrame();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
    };
  }, [romLoaded, drawFrame]);

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
      <input
        type="file"
        accept=".gb,.gbc"
        disabled={status !== "ready"}
        onChange={handleFileChange}
        className="text-sm text-neutral-300"
      />
      <p className="text-sm text-neutral-400">
        Status: {status}
        {romLoaded ? " · running" : ""}
      </p>
    </div>
  );
}
