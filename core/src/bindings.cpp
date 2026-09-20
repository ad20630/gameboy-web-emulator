#include <cstddef>
#include <cstdint>
#include <vector>

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "gb/cartridge.hpp"
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

// Empty (zero-length) for carts with no cartridge RAM to save.
val getCartRam(gb::Emulator& emulator) {
    gb::Cartridge& cartridge = emulator.cartridge();
    return val(typed_memory_view(cartridge.ramSize(), cartridge.ramData()));
}

// Restores previously-saved cartridge RAM; call after loadRom(). Sizes
// smaller/larger than the cart's actual RAM are truncated, not rejected.
void loadCartRam(gb::Emulator& emulator, const val& data) {
    const size_t length = data["length"].as<size_t>();
    std::vector<uint8_t> bytes(length);
    val memoryView{typed_memory_view(length, bytes.data())};
    memoryView.call<void>("set", data);
    emulator.cartridge().setRamData(bytes.data(), bytes.size());
}

// Snapshots the full machine state. Like getFramebuffer()/getCartRam(), the
// returned view aliases wasm memory owned by the emulator; callers should
// copy it out (e.g. `new Uint8Array(view)`) before calling into the
// emulator again.
val getSaveState(gb::Emulator& emulator) {
    const std::vector<uint8_t>& state = emulator.captureSaveState();
    return val(typed_memory_view(state.size(), state.data()));
}

// Restores a snapshot produced by getSaveState(); call after loadRom() has
// loaded the same ROM the snapshot was taken from. Returns false if the
// blob is malformed/truncated.
bool loadSaveState(gb::Emulator& emulator, const val& data) {
    const size_t length = data["length"].as<size_t>();
    std::vector<uint8_t> bytes(length);
    val memoryView{typed_memory_view(length, bytes.data())};
    memoryView.call<void>("set", data);
    return emulator.loadState(bytes.data(), bytes.size());
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
        .function("getCartRam", &getCartRam)
        .function("loadCartRam", &loadCartRam)
        .function("getSaveState", &getSaveState)
        .function("loadSaveState", &loadSaveState)
        .function("setButtonPressed", &gb::Emulator::setButtonPressed);
}
