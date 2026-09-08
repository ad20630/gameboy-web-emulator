#include "gb/ppu.hpp"

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
    setLy(0);
    setMode(kModeOamScan);
    setLycFlag(ly() == lyc());
}

uint8_t Ppu::tick(int tCycles) {
    if (!lcdEnabled()) {
        lineDots_ = 0;
        statLine_ = false;
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
            if (nextLy == kVBlankStartLine) {
                interrupts |= kVBlankInterruptBit;
            }
        }

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

} // namespace gb
