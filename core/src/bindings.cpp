#include <cstddef>
#include <cstdint>
#include <vector>

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "gb/emulator.hpp"
#include "gb/joypad.hpp"
#include "gb/ppu.hpp"

using namespace emscripten;

namespace {

// Copies a JS Uint8Array into a std::vector via a typed_memory_view, since
// the ROM bytes need to live in a contiguous buffer we can hand to
// Cartridge::load.
void loadRom(gb::Emulator& emulator, const val& data) {
    const size_t length = data["length"].as<size_t>();
    std::vector<uint8_t> bytes(length);
    val memoryView{typed_memory_view(length, bytes.data())};
    memoryView.call<void>("set", data);
    emulator.loadRom(bytes.data(), bytes.size());
}

// Returns a view directly into wasm memory; callers should re-fetch this
// after every runFrame() rather than caching it, since the underlying
// ArrayBuffer can be replaced if the heap grows.
val getFramebuffer(gb::Emulator& emulator) {
    return val(typed_memory_view(
        static_cast<size_t>(gb::Ppu::kScreenWidth) * gb::Ppu::kScreenHeight,
        emulator.ppu().framebuffer()));
}

} // namespace

EMSCRIPTEN_BINDINGS(gb_core) {
    enum_<gb::Joypad::Button>("Button")
        .value("Right", gb::Joypad::Button::kRight)
        .value("Left", gb::Joypad::Button::kLeft)
        .value("Up", gb::Joypad::Button::kUp)
        .value("Down", gb::Joypad::Button::kDown)
        .value("A", gb::Joypad::Button::kA)
        .value("B", gb::Joypad::Button::kB)
        .value("Select", gb::Joypad::Button::kSelect)
        .value("Start", gb::Joypad::Button::kStart);

    class_<gb::Emulator>("Emulator")
        .constructor<>()
        .function("reset", &gb::Emulator::reset)
        .function("loadRom", &loadRom)
        .function("runFrame", &gb::Emulator::runFrame)
        .function("getFramebuffer", &getFramebuffer)
        .function("setButtonPressed", &gb::Emulator::setButtonPressed);
}
