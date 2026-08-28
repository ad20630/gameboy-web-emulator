"use client";

import { useEffect, useRef, useState } from "react";

import { loadEmulatorModule } from "@/lib/wasm/loadEmulator";
import type { EmulatorModule } from "@/lib/wasm/types";

type LoadStatus = "loading" | "ready" | "error";

export function EmulatorScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moduleRef = useRef<EmulatorModule | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    loadEmulatorModule()
      .then((module) => {
        if (cancelled) return;
        moduleRef.current = module;
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

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={160}
        height={144}
        className="border border-neutral-700 bg-black"
        style={{ imageRendering: "pixelated", width: 480, height: 432 }}
      />
      <p className="text-sm text-neutral-400">Status: {status}</p>
    </div>
  );
}
