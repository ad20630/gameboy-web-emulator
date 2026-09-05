#pragma once

#include <array>
#include <cstdint>

namespace gb {

class Cartridge;
class Ppu;

class Mmu {
public:
    Mmu(Cartridge& cartridge, Ppu& ppu);
    ~Mmu();

    uint8_t read8(uint16_t address) const;
    void write8(uint16_t address, uint8_t value);

private:
    Cartridge& cartridge_;
    Ppu& ppu_;

    std::array<uint8_t, 0x2000> wram_{};
    std::array<uint8_t, 0x80> hram_{};
    // Backing store for I/O registers not yet owned by a real subsystem
    // (serial, timer, joypad, sound, IF, ...); behaves as plain read/write
    // memory until Timer/Joypad/Apu are wired in here directly.
    std::array<uint8_t, 0x80> io_{};
    uint8_t ie_ = 0;

    uint8_t readIo(uint16_t address) const;
    void writeIo(uint16_t address, uint8_t value);
    void performOamDma(uint8_t sourceHigh);
};

} // namespace gb
