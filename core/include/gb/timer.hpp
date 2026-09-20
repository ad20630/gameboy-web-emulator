#pragma once

#include <cstdint>

#include "gb/save_state.hpp"

namespace gb {

class Timer {
public:
    Timer();
    ~Timer();

    void reset();
    bool tick(int tCycles);

    uint8_t read8(uint16_t address) const;  // 0xFF04-0xFF07
    void write8(uint16_t address, uint8_t value);

    void saveState(StateWriter& writer) const;
    void loadState(StateReader& reader);

private:
    uint16_t systemCounter_ = 0; // upper 8 bits are DIV
    uint8_t tima_ = 0;
    uint8_t tma_ = 0;
    uint8_t tac_ = 0;

    bool timerEnabled() const { return (tac_ & 0x04) != 0; }
    int timerInputBit() const;
    bool selectedBit() const;
};

} // namespace gb
