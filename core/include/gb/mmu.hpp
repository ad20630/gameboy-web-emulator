#pragma once

#include <array>
#include <cstdint>

#include "gb/save_state.hpp"

namespace gb {

class Cartridge;
class Ppu;
class Timer;
class Joypad;

class Mmu {
public:
    Mmu(Cartridge& cartridge, Ppu& ppu, Timer& timer, Joypad& joypad);
    ~Mmu();

    uint8_t read8(uint16_t address) const;
    void write8(uint16_t address, uint8_t value);
    void requestInterrupt(uint8_t mask);

    void saveState(StateWriter& writer) const;
    void loadState(StateReader& reader);

private:
    Cartridge& cartridge_;
    Ppu& ppu_;
    Timer& timer_;
    Joypad& joypad_;

    std::array<uint8_t, 0x2000> wram_{};
    std::array<uint8_t, 0x80> hram_{};
    // Backing store for I/O registers not yet owned by a real subsystem
    // (serial, sound, IF, ...); behaves as plain read/write memory until
    // Apu is wired in here directly.
    std::array<uint8_t, 0x80> io_{};
    uint8_t ie_ = 0;

    uint8_t readIo(uint16_t address) const;
    void writeIo(uint16_t address, uint8_t value);
    void performOamDma(uint8_t sourceHigh);
};

} // namespace gb
