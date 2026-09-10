#include "gb/ppu.hpp"
#include <algorithm>
#include <array>

namespace gb {

namespace {
constexpr int kDotsPerLine = 456;
constexpr int kLinesPerFrame = 154;
constexpr uint8_t kVBlankStartLine = 144;

// Mode 3 (Drawing) length is fixed here at its minimum; real hardware
// stretches it based on sprites/scroll, which this PPU doesn't model yet.
constexpr int kOamScanDots = 80;
constexpr int kDrawingDots = 172;

constexpr uint8_t kModeHBlank = 0;
constexpr uint8_t kModeVBlank = 1;
constexpr uint8_t kModeOamScan = 2;
constexpr uint8_t kModeDrawing = 3;

// Matches the IF register layout / Cpu::kInterruptVBlank and kInterruptLcdStat.
constexpr uint8_t kVBlankInterruptBit = 0x01;
constexpr uint8_t kLcdStatInterruptBit = 0x02;
}

Ppu::Ppu() = default;
Ppu::~Ppu() = default;

void Ppu::reset() {
    lineDots_ = 0;
    statLine_ = false;
    windowLine_ = 0;
    setLy(0);
    setMode(kModeOamScan);
    setLycFlag(ly() == lyc());
}

uint8_t Ppu::tick(int tCycles) {
    if (!lcdEnabled()) {
        lineDots_ = 0;
        statLine_ = false;
        windowLine_ = 0;
        setLy(0);
        setMode(kModeHBlank);
        return 0;
    }

    uint8_t interrupts = 0;
    for (int i = 0; i < tCycles; ++i) {
        if (++lineDots_ >= kDotsPerLine) {
            lineDots_ -= kDotsPerLine;
            const uint8_t nextLy = static_cast<uint8_t>((ly() + 1) % kLinesPerFrame);
            setLy(nextLy);
            if (nextLy == 0) {
                windowLine_ = 0; // internal window line counter resets each frame
            }
            if (nextLy == kVBlankStartLine) {
                interrupts |= kVBlankInterruptBit;
            }
        }

        const uint8_t prevMode = mode();
        uint8_t currentMode;
        if (ly() >= kVBlankStartLine) {
            currentMode = kModeVBlank;
        } else if (lineDots_ < kOamScanDots) {
            currentMode = kModeOamScan;
        } else if (lineDots_ < kOamScanDots + kDrawingDots) {
            currentMode = kModeDrawing;
        } else {
            currentMode = kModeHBlank;
        }
        setMode(currentMode);
        setLycFlag(ly() == lyc());

        if (currentMode == kModeHBlank && prevMode != kModeHBlank) {
            renderScanline(ly());
        }

        interrupts |= updateStatAndCheckInterrupt();
    }
    return interrupts;
}

uint8_t Ppu::updateStatAndCheckInterrupt() {
    const uint8_t stat = registers_[1];
    const bool lycFlagSet = (stat & 0x04) != 0;
    const bool signal =
        ((mode() == kModeHBlank) && (stat & 0x08)) ||
        ((mode() == kModeOamScan) && (stat & 0x20)) ||
        ((mode() == kModeVBlank) && (stat & 0x10)) ||
        (lycFlagSet && (stat & 0x40));

    const uint8_t result = (signal && !statLine_) ? kLcdStatInterruptBit : 0;
    statLine_ = signal;
    return result;
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
    if (address == 0xFF41) {
        // Mode (bits 0-1) and LYC=LY (bit 2) are hardware-owned; only the
        // interrupt-enable bits (3-6) are writable.
        registers_[1] = static_cast<uint8_t>((registers_[1] & 0x07) | (value & 0xF8));
        return;
    }
    registers_[address - 0xFF40] = value;
}

uint8_t Ppu::tilePixel(const uint8_t* tileRow, int xInTile) {
    const int bit = 7 - xInTile;
    const uint8_t lo = (tileRow[0] >> bit) & 0x01;
    const uint8_t hi = (tileRow[1] >> bit) & 0x01;
    return static_cast<uint8_t>((hi << 1) | lo);
}

uint8_t Ppu::applyPalette(uint8_t palette, uint8_t colorIndex) {
    return static_cast<uint8_t>((palette >> (colorIndex * 2)) & 0x03);
}

void Ppu::renderScanline(uint8_t line) {
    if (line >= kScreenHeight) {
        return;
    }
    std::array<uint8_t, kScreenWidth> bgColorIndex{};
    renderBackgroundAndWindow(line, bgColorIndex);
    renderSprites(line, bgColorIndex);
}

void Ppu::renderBackgroundAndWindow(uint8_t line, std::array<uint8_t, kScreenWidth>& bgColorIndex) {
    bool usedWindow = false;

    for (int x = 0; x < kScreenWidth; ++x) {
        const int winX = x - (static_cast<int>(wx()) - 7);
        const bool windowActive =
            bgWindowEnabled() && windowEnabled() && (wy() <= line) && (winX >= 0);

        uint8_t colorIndex = 0;
        if (bgWindowEnabled()) {
            uint16_t tileMapBase;
            int tileRow, tileCol, fineX, fineY;
            if (windowActive) {
                usedWindow = true;
                tileMapBase = windowTileMapBase();
                tileRow = windowLine_ / 8;
                fineY = windowLine_ % 8;
                tileCol = winX / 8;
                fineX = winX % 8;
            } else {
                const uint8_t bgY = static_cast<uint8_t>(line + scy());
                const uint8_t bgX = static_cast<uint8_t>(x + scx());
                tileMapBase = bgTileMapBase();
                tileRow = bgY / 8;
                fineY = bgY % 8;
                tileCol = bgX / 8;
                fineX = bgX % 8;
            }

            const uint16_t mapAddr = static_cast<uint16_t>(
                tileMapBase + (tileRow % 32) * 32 + (tileCol % 32));
            const uint8_t tileIndex = vram_[mapAddr - 0x8000];

            uint16_t tileDataAddr;
            if (useSignedTileAddressing()) {
                tileDataAddr = static_cast<uint16_t>(0x9000 + static_cast<int8_t>(tileIndex) * 16);
            } else {
                tileDataAddr = static_cast<uint16_t>(0x8000 + tileIndex * 16);
            }
            tileDataAddr = static_cast<uint16_t>(tileDataAddr + fineY * 2);

            colorIndex = tilePixel(&vram_[tileDataAddr - 0x8000], fineX);
        }

        bgColorIndex[x] = colorIndex;
        framebuffer_[line * kScreenWidth + x] = applyPalette(bgp(), colorIndex);
    }

    if (usedWindow) {
        ++windowLine_;
    }
}

void Ppu::renderSprites(uint8_t line, const std::array<uint8_t, kScreenWidth>& bgColorIndex) {
    if (!spritesEnabled()) {
        return;
    }

    const int height = tallSprites() ? 16 : 8;

    struct Candidate {
        int oamIndex;
        int x;
    };
    std::array<Candidate, 10> candidates{};
    int count = 0;
    for (int i = 0; i < 40 && count < 10; ++i) {
        const int spriteY = static_cast<int>(oam_[i * 4 + 0]) - 16;
        if (static_cast<int>(line) < spriteY || static_cast<int>(line) >= spriteY + height) {
            continue;
        }
        candidates[count++] = Candidate{i, static_cast<int>(oam_[i * 4 + 1]) - 8};
    }

    // DMG priority: smaller X wins; ties go to the lower OAM index. A stable
    // sort on X alone preserves OAM order (already ascending) for ties.
    std::stable_sort(candidates.begin(), candidates.begin() + count,
                      [](const Candidate& lhs, const Candidate& rhs) { return lhs.x < rhs.x; });

    for (int x = 0; x < kScreenWidth; ++x) {
        for (int c = 0; c < count; ++c) {
            const int spriteX = candidates[c].x;
            if (x < spriteX || x >= spriteX + 8) {
                continue;
            }

            const int i = candidates[c].oamIndex;
            const int spriteY = static_cast<int>(oam_[i * 4 + 0]) - 16;
            const uint8_t attr = oam_[i * 4 + 3];
            uint8_t tileIndex = oam_[i * 4 + 2];
            if (height == 16) {
                tileIndex &= 0xFE;
            }

            int rowInSprite = static_cast<int>(line) - spriteY;
            if (attr & 0x40) { // Y flip
                rowInSprite = height - 1 - rowInSprite;
            }

            const uint16_t tileAddr =
                static_cast<uint16_t>(0x8000 + tileIndex * 16 + rowInSprite * 2);

            int colInSprite = x - spriteX;
            if (attr & 0x20) { // X flip
                colInSprite = 7 - colInSprite;
            }

            const uint8_t colorIndex = tilePixel(&vram_[tileAddr - 0x8000], colInSprite);
            if (colorIndex == 0) {
                continue; // transparent
            }
            if ((attr & 0x80) && bgColorIndex[x] != 0) {
                continue; // behind non-zero background color
            }

            const uint8_t palette = obp((attr & 0x10) ? 1 : 0);
            framebuffer_[line * kScreenWidth + x] = applyPalette(palette, colorIndex);
            break;
        }
    }
}

} // namespace gb
