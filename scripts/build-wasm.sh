#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

emcmake cmake -S core -B core/build-wasm -DCMAKE_BUILD_TYPE=Release
cmake --build core/build-wasm
