#pragma once

#include <array>
#include <cstdint>

namespace gb {

class Ppu {
public:
    Ppu();
    ~Ppu();

    uint8_t read8(uint16_t address) const;  // 0x8000-0x9FFF (VRAM), 0xFE00-0xFE9F (OAM)
    void write8(uint16_t address, uint8_t value);

    uint8_t readRegister(uint16_t address) const;  // 0xFF40-0xFF4B
    void writeRegister(uint16_t address, uint8_t value);

private:
    std::array<uint8_t, 0x2000> vram_{};
    std::array<uint8_t, 0xA0> oam_{};
    std::array<uint8_t, 0x0C> registers_{}; // LCDC, STAT, SCY, SCX, LY, LYC, DMA, BGP, OBP0, OBP1, WY, WX
};

} // namespace gb
