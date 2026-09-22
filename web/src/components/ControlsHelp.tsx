"use client";

import { useEffect, useState } from "react";

export function ControlsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show controls help"
        title="Controls"
        className="fixed left-4 top-4 z-40 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-xs text-neutral-300"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Controls"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-300 phone-landscape:max-h-full phone-landscape:overflow-y-auto"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-100">Controls</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-700 text-neutral-300"
              >
                ×
              </button>
            </div>

            <p className="mb-3 text-neutral-400">
              Select a ROM from the file picker or test-ROM dropdown to start playing.
            </p>

            <h3 className="mb-1 font-medium text-neutral-200">Keyboard</h3>
            <ul className="mb-3 text-neutral-400 space-y-0.5">
              <li>Arrow keys - D-pad</li>
              <li>Z - B button</li>
              <li>X - A button</li>
              <li>Shift - Select</li>
              <li>Enter - Start</li>
            </ul>

            <h3 className="mb-1 font-medium text-neutral-200">Touch (mobile)</h3>
            <p className="mb-3 text-neutral-400">
              Use the on-screen D-pad and A/B/Select/Start buttons - below the
              game in portrait, or alongside it in landscape (tap the menu
              icon for ROM/save controls).
            </p>

            <h3 className="mb-1 font-medium text-neutral-200">Other</h3>
            <ul className="space-y-0.5 text-neutral-400">
              <li>Pause / Resume - stop and continue emulation</li>
              <li>Mute - silence audio</li>
              <li>1x / 2x / 4x - change emulation speed</li>
              <li>Save / Load - store or restore a save-state in the selected slot</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
