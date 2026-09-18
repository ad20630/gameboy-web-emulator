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
      className={`select-none disabled:opacity-40 ${className}`}
      style={{ touchAction: "none", WebkitTouchCallout: "none" }}
    >
      {children}
    </button>
  );
}

const padButtonClass =
  "flex items-center justify-center border border-neutral-700 bg-neutral-800 text-neutral-200 active:bg-neutral-600";

// Visible up to the `md` breakpoint; a physical keyboard is assumed above it.
export function TouchControls({ disabled, onButtonChange }: TouchControlsProps) {
  return (
    <div className="flex w-full max-w-[480px] select-none items-center justify-between gap-4 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div
        className="grid grid-cols-3 grid-rows-3 gap-1"
        style={{ width: 132, height: 132 }}
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
          className={`${padButtonClass} mt-6 h-14 w-14 rounded-full text-lg font-semibold`}
        >
          B
        </PadButton>
        <PadButton
          button="A"
          disabled={disabled}
          onButtonChange={onButtonChange}
          className={`${padButtonClass} h-14 w-14 rounded-full text-lg font-semibold`}
        >
          A
        </PadButton>
      </div>
    </div>
  );
}
