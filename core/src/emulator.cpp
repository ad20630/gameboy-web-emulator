#include "gb/emulator.hpp"

namespace gb {

Emulator::Emulator() = default;
Emulator::~Emulator() = default;

void Emulator::reset() {
    cpu_.reset();
    timer_.reset();
    ppu_.reset();
}

void Emulator::loadRom(const uint8_t* data, size_t size) {
    cartridge_.load(data, size);
}

int Emulator::step() {
    const int cycles = cpu_.step(mmu_);
    if (timer_.tick(cycles)) {
        mmu_.requestInterrupt(Cpu::kInterruptTimer);
    }
    if (ppu_.tick(cycles)) {
        mmu_.requestInterrupt(Cpu::kInterruptVBlank);
    }
    return cycles;
}

} // namespace gb
