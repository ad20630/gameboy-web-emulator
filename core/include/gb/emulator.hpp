#pragma once

#include <cstddef>
#include <cstdint>

#include "gb/apu.hpp"
#include "gb/cartridge.hpp"
#include "gb/cpu.hpp"
#include "gb/joypad.hpp"
#include "gb/mmu.hpp"
#include "gb/ppu.hpp"
#include "gb/timer.hpp"

namespace gb {

class Emulator {
public:
    Emulator();
    ~Emulator();

    void reset();
    void loadRom(const uint8_t* data, size_t size);
    int step();

    Cpu& cpu() { return cpu_; }
    Mmu& mmu() { return mmu_; }

private:
    Cpu cpu_;
    Ppu ppu_;
    Mmu mmu_;
    Apu apu_;
    Timer timer_;
    Joypad joypad_;
    Cartridge cartridge_;
};

} // namespace gb
