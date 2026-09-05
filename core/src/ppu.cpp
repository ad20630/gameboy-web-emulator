#include "gb/ppu.hpp"

namespace gb {

Ppu::Ppu() = default;
Ppu::~Ppu() = default;

uint8_t Ppu::read8(uint16_t address) const {
    if (address < 0xA000) {
        return vram_[address - 0x8000];
    }
    return oam_[address - 0xFE00];
}

void Ppu::write8(uint16_t address, uint8_t value) {
    if (address < 0xA000) {
        vram_[address - 0x8000] = value;
    } else {
        oam_[address - 0xFE00] = value;
    }
}

uint8_t Ppu::readRegister(uint16_t address) const {
    return registers_[address - 0xFF40];
}

void Ppu::writeRegister(uint16_t address, uint8_t value) {
    registers_[address - 0xFF40] = value;
}

} // namespace gb
