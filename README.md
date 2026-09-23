# Web DMG

  ## Overview
  - Web DMG is a Game Boy Emulator written in C++, compiled to WebAssembly and running in a Next.js frontend.
  - You can try a demo [here.](https://web-dmg.vercel.app/)
  <img width="400" height="400" alt="main" src="https://github.com/user-attachments/assets/cfb184c4-f309-4a3d-86a6-c19239223242" />


  ## Features
  - Accurately emulates the Game Boy's CPU, PPU, MMU, and timer.
  - Supports almost the entire Game Boy library. (No Game Boy Color exclusives.)
  - Controlled via keyboard or mobile friendly touch controls.
  - Persistent cartidge saves stored in browser localStorage.
  - Save states, speedup, and pausing.
  - Several palette options.

  <table>
    <tr>
      <td align="center">Touch controls</td>
      <td align="center">Persistent saves</td>
      <td align="center">Save states</td>
      <td align="center">Palette options</td>
    </tr>
    <tr>
      <td align="center"><img height="400" alt="mobile" src="https://github.com/user-attachments/assets/4cf471e1-70b4-459d-b6e1-a0e3e98c8fa0" /></td>
      <td align="center"><img height="400" alt="save" src="https://github.com/user-attachments/assets/954e1df8-ed2b-49a3-a9f7-667662f88fa8" /></td>
      <td align="center"><img height="400" alt="savestates" src="https://github.com/user-attachments/assets/c97710ab-5235-4159-8c9d-d6dda72ed61b" /></td>
      <td align="center"><img height="400" alt="palettes" src="https://github.com/user-attachments/assets/0c523654-b6a7-4223-92b5-2ccbc0157c86" /></td>
    </tr>
  </table>

  ## Disclaimer
  - This emulator does not condone piracy. Please only use it to play your own legal backups, or free to distribute homebrew games.

    ## Project Structure
  ```
  core/
    include/gb/
      cpu.hpp          LR35902 CPU: registers, instruction execution, interrupts
      ppu.hpp          Pixel pipeline: BG/window/sprites, produces the framebuffer
      mmu.hpp          Memory map, routes reads/writes to the right component
      apu.hpp          4-channel sound generation + mixing
      timer.hpp        DIV/TIMA timer and its interrupt
      joypad.hpp       Button state and the joypad interrupt
      cartridge.hpp    ROM header parsing, MBC1/2/3/5 banking, battery RAM, MBC3 RTC
      emulator.hpp     Owns all the above, drives step(), save state read/write
      save_state.hpp   Byte-stream reader/writer used for save states
    src/               Implementations of the above
      bindings.cpp     Embind bridge exposing Emulator to JS (wasm build only)
    tools/
      rom_runner.cpp   Headless CLI: runs a ROM, reports Blargg-style pass/fail

  web/
    src/
      app/             Next.js App Router entry (layout.tsx, page.tsx)
      components/
        EmulatorScreen.tsx   Main loop, canvas rendering, input/save-state wiring
        TouchControls.tsx    On-screen D-pad/buttons for mobile
      lib/
        wasm/
          loadEmulator.ts    Loads the compiled wasm module
          types.ts           TS types for the wasm module's exposed API
        audio/
          GbAudioPlayer.ts   Sets up the AudioWorklet + pushes samples to it
    public/
      wasm/            Compiled gb_core.js/.wasm (committed, see Architecture)
      audio/
        gb-audio-processor.js   AudioWorklet processor: ring buffer + playback
      roms/            Bundled test ROMs (cpu_instrs.gb, dmg-acid2.gb)
  ```

  ## Architecture
  - core/ - a dependency-free C++20 emulation core (CPU, PPU, MMU, APU, timer, joypad, cartridge/MBC), compiled from the same sources into two targets via core/CMakeLists.txt.
  - Native build: a static library linked into rom_runner, a headless CLI for running test ROMs without a browser.
  - Wasm build: compiled via Emscripten (core/src/bindings.cpp, using Embind) into the module the web frontend loads.
  - web/ - a Next.js frontend. loadEmulator.ts loads the compiled wasm glue; EmulatorScreen.tsx drives the main loop (requestAnimationFrame, paced to the real ~59.7Hz Game Boy frame rate), reads the framebuffer into a canvas, and wires up input/save states.
  - Audio streams through GbAudioPlayer.ts and an AudioWorklet-backed ring buffer (public/audio/gb-audio-processor.js), generated at the AudioContext's native sample rate so nothing needs resampling.
  - The framebuffer and audio samples are exposed from wasm to JS as zero-copy typed memory views, copied out once per rendered frame.
  - Cartridge RAM and save states are serialized to a byte snapshot by the core and persisted as base64 in localStorage, keyed by cartridge title + header checksum.
  - The compiled wasm binaries (web/public/wasm/gb_core.js/.wasm) are committed to the repo, since the deploy target (Vercel) can't run the Emscripten toolchain - rebuild and recommit them after any core/ change (see Building the Core below).

  ## Getting Started
  - Prerequisites: Node.js 18+ and npm (developed against Node 22). Emscripten (emsdk) is only needed if you're modifying core/ - running the app as-is doesn't require it, since the compiled wasm binaries are already committed.
  - Install dependencies (npm workspace, installs web/ too): npm install
  - Run the dev server: npm run dev, then open http://localhost:3000
  - Load a ROM: use the file picker to load your own .gb/.gbc dump, or pick a bundled test ROM from the dropdown and click Load.

  ## Building the Core (wasm)
  - Only needed when you change anything under core/ - skip this if you're just running the app, since prebuilt binaries are already committed.
  - Install and activate emsdk (see emscripten.org/docs/getting_started/downloads.html): ./emsdk install latest && ./emsdk activate latest
  - Set up emsdk's env vars in your current shell (only applies to that shell session): `. emsdk_env.ps1` in PowerShell, or `source emsdk_env.sh` in bash.
  - From the repo root, build: npm run build:wasm (PowerShell) or npm run build:wasm:sh (bash).
  - Both configure and build core/build-wasm via CMake with the Emscripten toolchain (see scripts/build-wasm.ps1/.sh). Output lands at web/public/wasm/gb_core.js and gb_core.wasm.
  - Since those files are committed, remember to git add/commit the rebuilt .js/.wasm files after making core changes.

  ## Building/Testing the Native Core
  - A native (non-wasm) build exists for fast iteration and correctness testing without a browser - it links the same core/ sources into rom_runner, a headless CLI that runs a ROM and reports pass/fail from anything it writes to the serial port (the convention Blargg's test ROMs use to report results without a screen).
  - Configure and build: cmake -S core -B core/build && cmake --build core/build. On Windows with MinGW, if cmake --build doesn't pick up a generator, configure with -G "MinGW Makefiles" and build directly with mingw32-make from core/build.
  - Run a test ROM: ./core/build/rom_runner <path-to-rom.gb> [max-cycles], e.g. ./core/build/rom_runner web/public/roms/cpu_instrs.gb 250000000 - prints each sub-test's result as it streams over serial, then a final PASSED/FAILED/TIMED OUT.
  - The bundled test ROMs in web/public/roms/ (cpu_instrs.gb - Blargg's CPU instruction tests; dmg-acid2.gb - a PPU rendering accuracy test) work with both rom_runner and the web UI's test ROM dropdown.

  ## Planned Features
  - Gamepad support
  - Improve Audio
  - Improve shimmering/screen tearing
  - Seperate sprite/background palettes as featured on the Game Boy Color
  - Custom palette maker
  - Support for ROMs in .zip archives

  ## Credits/License
  - cpu_instrs by Blargg.
  - dmg-acid2 by Matt Curie.
  - Snake by Yvar de Goffau.
  - Pandora's Blocks by Pandora Nova.
  - This software is published under the MIT licence.
