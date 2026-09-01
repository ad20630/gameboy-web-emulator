#include "gb/emulator.hpp"

namespace gb {

Emulator::Emulator() = default;
Emulator::~Emulator() = default;

void Emulator::reset() {
    cpu_.reset();
}

void Emulator::loadRom(const uint8_t* data, size_t size) {
    mmu_.loadRom(data, size);
}

int Emulator::step() {
    return cpu_.step(mmu_);
}

} // namespace gb
