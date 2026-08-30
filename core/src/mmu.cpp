#include "gb/mmu.hpp"

namespace gb {

Mmu::Mmu() = default;
Mmu::~Mmu() = default;

uint8_t Mmu::read8(uint16_t address) const {
    return memory_[address];
}

void Mmu::write8(uint16_t address, uint8_t value) {
    memory_[address] = value;
}

} // namespace gb
