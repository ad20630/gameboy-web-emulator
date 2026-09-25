#pragma once

#include <array>
#include <cstdint>

#include "gb/save_state.hpp"

namespace gb {

class Ppu {
public:
    static constexpr int kScreenWidth = 160;
    static constexpr int kScreenHeight = 144;

    Ppu();
    ~Ppu();

    void reset();

    uint8_t tick(int tCycles);

    uint8_t read8(uint16_t address) const;  // 0x8000-0x9FFF (VRAM), 0xFE00-0xFE9F (OAM)
    void write8(uint16_t address, uint8_t value);

    uint8_t readRegister(uint16_t address) const;  // 0xFF40-0xFF4B
    void writeRegister(uint16_t address, uint8_t value);

    void saveState(StateWriter& writer) const;
    void loadState(StateReader& reader);

    // Which palette a framebuffer pixel was drawn with (bits 2-3 of its byte).
    static constexpr uint8_t kLayerBackground = 0; // BG and window (BGP)
    static constexpr uint8_t kLayerObj0 = 1;       // sprites using OBP0
    static constexpr uint8_t kLayerObj1 = 2;       // sprites using OBP1

    // 160x144 pixels, row-major, one byte per pixel: bits 0-1 hold the final
    // shade index (0-3, 0 = lightest) and bits 2-3 hold the layer above, so
    // callers can give BG/OBJ0/OBJ1 separate 4-color palettes like the Game
    // Boy Color does. Callers apply their own palettes to turn these into
    // RGB -- the PPU never bakes in actual colors.
    const uint8_t* framebuffer() const { return framebuffer_.data(); }

private:
    std::array<uint8_t, 0x2000> vram_{};
    std::array<uint8_t, 0xA0> oam_{};
    std::array<uint8_t, 0x0C> registers_{}; // LCDC, STAT, SCY, SCX, LY, LYC, DMA, BGP, OBP0, OBP1, WY, WX
    std::array<uint8_t, kScreenWidth * kScreenHeight> framebuffer_{};

    int lineDots_ = 0;
    int drawingDots_ = 172; // Mode 3 length for the current line; recomputed at each line start
    bool statLine_ = false;
    uint8_t windowLine_ = 0; // internal line counter for the window, only advances on lines it's drawn

    bool lcdEnabled() const { return (registers_[0] & 0x80) != 0; }
    bool bgWindowEnabled() const { return (registers_[0] & 0x01) != 0; }
    bool windowEnabled() const { return (registers_[0] & 0x20) != 0; }
    bool spritesEnabled() const { return (registers_[0] & 0x02) != 0; }
    bool tallSprites() const { return (registers_[0] & 0x04) != 0; }
    uint16_t bgTileMapBase() const { return (registers_[0] & 0x08) ? 0x9C00 : 0x9800; }
    uint16_t windowTileMapBase() const { return (registers_[0] & 0x40) ? 0x9C00 : 0x9800; }
    bool useSignedTileAddressing() const { return (registers_[0] & 0x10) == 0; }

    uint8_t ly() const { return registers_[4]; }
    void setLy(uint8_t value) { registers_[4] = value; }
    uint8_t lyc() const { return registers_[5]; }
    uint8_t scy() const { return registers_[2]; }
    uint8_t scx() const { return registers_[3]; }
    uint8_t wy() const { return registers_[10]; }
    uint8_t wx() const { return registers_[11]; }
    uint8_t bgp() const { return registers_[7]; }
    uint8_t obp(int index) const { return registers_[8 + index]; }

    uint8_t mode() const { return registers_[1] & 0x03; }
    void setMode(uint8_t mode) { registers_[1] = static_cast<uint8_t>((registers_[1] & ~0x03) | (mode & 0x03)); }
    void setLycFlag(bool set) {
        if (set) registers_[1] |= 0x04;
        else registers_[1] &= ~0x04;
    }

    uint8_t updateStatAndCheckInterrupt();
    int computeDrawingDots(uint8_t line) const;

    void renderScanline(uint8_t line);
    void renderBackgroundAndWindow(uint8_t line, std::array<uint8_t, kScreenWidth>& bgColorIndex);
    void renderSprites(uint8_t line, const std::array<uint8_t, kScreenWidth>& bgColorIndex);
    static uint8_t tilePixel(const uint8_t* tileRow, int xInTile);
    static uint8_t applyPalette(uint8_t palette, uint8_t colorIndex);
};

} // namespace gb
