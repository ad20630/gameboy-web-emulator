#include <emscripten/bind.h>

#include "gb/emulator.hpp"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(gb_core) {
    class_<gb::Emulator>("Emulator")
        .constructor<>()
        .function("reset", &gb::Emulator::reset);
}
