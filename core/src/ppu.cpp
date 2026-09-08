#include "gb/ppu.hpp"

namespace gb {

namespace {
constexpr int kDotsPerLine = 456;
constexpr int kLinesPerFrame = 154;
constexpr uint8_t kVBlankStartLine = 144;
}

Ppu::Ppu() = default;
Ppu::~Ppu() = default;

void Ppu::reset() {
    lineDots_ = 0;
    setLy(0);
}

bool Ppu::tick(int tCycles) {
    if (!lcdEnabled()) {
        lineDots_ = 0;
        setLy(0);
        return false;
    }

    bool enteredVBlank = false;
    lineDots_ += tCycles;
    while (lineDots_ >= kDotsPerLine) {
        lineDots_ -= kDotsPerLine;
        const uint8_t nextLy = static_cast<uint8_t>((ly() + 1) % kLinesPerFrame);
        setLy(nextLy);
        if (nextLy == kVBlankStartLine) {
            enteredVBlank = true;
        }
    }
    return enteredVBlank;
}

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
    if (address == 0xFF44) {
        // LY is read-only, any write resets it.
        setLy(0);
        lineDots_ = 0;
        return;
    }
    registers_[address - 0xFF40] = value;
}

} // namespace gb
