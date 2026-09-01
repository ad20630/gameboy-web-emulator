#include "gb/mmu.hpp"

#include <algorithm>

namespace gb {

Mmu::Mmu() = default;
Mmu::~Mmu() = default;

uint8_t Mmu::read8(uint16_t address) const {
    return memory_[address];
}

void Mmu::write8(uint16_t address, uint8_t value) {
    memory_[address] = value;
}

void Mmu::loadRom(const uint8_t* data, size_t size) {
    std::copy_n(data, std::min(size, static_cast<size_t>(0x8000)), memory_.begin());
}

} // namespace gb
