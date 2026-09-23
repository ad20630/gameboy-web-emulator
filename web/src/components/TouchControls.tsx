"use client";

import { useCallback, useRef } from "react";
import type { ReactNode } from "react";

import type { EmulatorModule } from "@/lib/wasm/types";

type ButtonName = keyof EmulatorModule["Button"];

interface TouchControlsProps {
  disabled: boolean;
  onButtonChange: (button: ButtonName, pressed: boolean) => void;
}

interface PadButtonProps {
  button: ButtonName;
  disabled: boolean;
  onButtonChange: TouchControlsProps["onButtonChange"];
  className?: string;
  children?: ReactNode;
}
function PadButton({
  button,
  disabled,
  onButtonChange,
  className = "",
  children,
}: PadButtonProps) {
  const pointerIdRef = useRef<number | null>(null);

  const release = useCallback(
    (event: React.PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;
      pointerIdRef.current = null;
      onButtonChange(button, false);
    },
    [button, onButtonChange]
  );

  const press = useCallback(
    (event: React.PointerEvent) => {
      if (disabled || pointerIdRef.current !== null) return;
      event.preventDefault();
      pointerIdRef.current = event.pointerId;
      onButtonChange(button, true);
    },
    [button, disabled, onButtonChange]
  );

  return (
    <button
      type="button"
      aria-label={button}
      disabled={disabled}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(event) => event.preventDefault()}
      className={`select-none ${className}`}
      style={{ touchAction: "none", WebkitTouchCallout: "none" }}
    >
      {children}
    </button>
  );
}

const padButtonClass =
  "flex items-center justify-center border border-outline bg-pad text-pad-foreground active:bg-pad-active";

// A/B get their own tokens (see globals.css) instead of the shared pad
// ones, so a theme can color them separately from the d-pad/Select/Start -
// the gameboy theme's magenta buttons are the reason this exists.
const abButtonClass =
  "flex items-center justify-center border border-outline bg-ab-button text-ab-foreground active:bg-ab-button-active";

function DPad({ disabled, onButtonChange, size = 144 }: TouchControlsProps & { size?: number }) {
  return (
    <div
      className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1"
      style={{ width: size, height: size }}
    >
      <div />
      <PadButton
        button="Up"
        disabled={disabled}
        onButtonChange={onButtonChange}
        className={`${padButtonClass} rounded-t-md`}
      />
      <div />
      <PadButton
        button="Left"
        disabled={disabled}
        onButtonChange={onButtonChange}
        className={`${padButtonClass} rounded-l-md`}
      />
      <div />
      <PadButton
        button="Right"
        disabled={disabled}
        onButtonChange={onButtonChange}
        className={`${padButtonClass} rounded-r-md`}
      />
      <div />
      <PadButton
        button="Down"
        disabled={disabled}
        onButtonChange={onButtonChange}
        className={`${padButtonClass} rounded-b-md`}
      />
      <div />
    </div>
  );
}

// Touch controls are shown on any coarse-pointer (touchscreen) device,
// regardless of viewport width - a width breakpoint like `md` doesn't work
// because phones/tablets routinely exceed it in landscape.
export function TouchControls({ disabled, onButtonChange }: TouchControlsProps) {
  return (
    <>
      {/* Portrait / stacked-below-the-screen layout. */}
      <div className="-mt-2 hidden w-full max-w-[480px] shrink-0 select-none items-center justify-between gap-4 pb-[env(safe-area-inset-bottom)] touch:flex touch-landscape:hidden">
        <DPad disabled={disabled} onButtonChange={onButtonChange} />

        <div className="flex gap-2">
          <PadButton
            button="Select"
            disabled={disabled}
            onButtonChange={onButtonChange}
            className={`${padButtonClass} rounded-full px-3 py-1 text-[10px] uppercase tracking-wide`}
          >
            Select
          </PadButton>
          <PadButton
            button="Start"
            disabled={disabled}
            onButtonChange={onButtonChange}
            className={`${padButtonClass} rounded-full px-3 py-1 text-[10px] uppercase tracking-wide`}
          >
            Start
          </PadButton>
        </div>

        <div className="grid grid-cols-2 gap-3" style={{ width: 116 }}>
          <PadButton
            button="B"
            disabled={disabled}
            onButtonChange={onButtonChange}
            className={`${abButtonClass} mt-6 h-14 w-14 rounded-full text-lg font-semibold`}
          >
            B
          </PadButton>
          <PadButton
            button="A"
            disabled={disabled}
            onButtonChange={onButtonChange}
            className={`${abButtonClass} h-14 w-14 rounded-full text-lg font-semibold`}
          >
            A
          </PadButton>
        </div>
      </div>

      {/* Landscape overlay: d-pad pinned to the left edge, A/B/Select/Start
          pinned to the right edge, both anchored toward the bottom
          alongside the canvas rather than stacked below it - this is what
          reclaims the vertical space landscape doesn't have. Applies on
          any landscape touch device, phone or tablet. */}
      <div className="pointer-events-none absolute inset-0 z-10 hidden select-none items-end justify-between pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] touch-landscape:flex">
        <DPad disabled={disabled} onButtonChange={onButtonChange} size={124} />

        <div className="pointer-events-auto flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <PadButton
              button="Select"
              disabled={disabled}
              onButtonChange={onButtonChange}
              className={`${padButtonClass} rounded-full px-3 py-1 text-[10px] uppercase tracking-wide`}
            >
              Select
            </PadButton>
            <PadButton
              button="Start"
              disabled={disabled}
              onButtonChange={onButtonChange}
              className={`${padButtonClass} rounded-full px-3 py-1 text-[10px] uppercase tracking-wide`}
            >
              Start
            </PadButton>
          </div>

          <div className="flex items-center gap-3">
            <PadButton
              button="B"
              disabled={disabled}
              onButtonChange={onButtonChange}
              className={`${abButtonClass} h-14 w-14 rounded-full text-lg font-semibold`}
            >
              B
            </PadButton>
            <PadButton
              button="A"
              disabled={disabled}
              onButtonChange={onButtonChange}
              className={`${abButtonClass} h-14 w-14 rounded-full text-lg font-semibold`}
            >
              A
            </PadButton>
          </div>
        </div>
      </div>
    </>
  );
}
