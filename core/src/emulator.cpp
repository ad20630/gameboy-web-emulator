#include "gb/emulator.hpp"

namespace gb {

namespace {
// 4194304 Hz / ~59.7275 Hz refresh rate.
constexpr int kCyclesPerFrame = 70224;
} // namespace

Emulator::Emulator() = default;
Emulator::~Emulator() = default;

void Emulator::reset() {
    cpu_.reset();
    timer_.reset();
    ppu_.reset();
    joypad_.reset();
}

void Emulator::loadRom(const uint8_t* data, size_t size) {
    cartridge_.load(data, size);
}

int Emulator::step() {
    const int cycles = cpu_.step(mmu_);
    if (timer_.tick(cycles)) {
        mmu_.requestInterrupt(Cpu::kInterruptTimer);
    }
    if (const uint8_t ppuInterrupts = ppu_.tick(cycles)) {
        mmu_.requestInterrupt(ppuInterrupts);
    }
    if (joypad_.consumeInterrupt()) {
        mmu_.requestInterrupt(Cpu::kInterruptJoypad);
    }
    return cycles;
}

void Emulator::runFrame() {
    int cyclesThisFrame = 0;
    while (cyclesThisFrame < kCyclesPerFrame) {
        cyclesThisFrame += step();
    }
}

void Emulator::setButtonPressed(Joypad::Button button, bool pressed) {
    joypad_.setButtonPressed(button, pressed);
}

} // namespace gb
