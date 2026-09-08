#include "gb/timer.hpp"

namespace gb {

namespace {
constexpr uint16_t kDivAddress = 0xFF04;
constexpr uint16_t kTimaAddress = 0xFF05;
constexpr uint16_t kTmaAddress = 0xFF06;
constexpr uint16_t kTacAddress = 0xFF07;
}

Timer::Timer() = default;
Timer::~Timer() = default;

void Timer::reset() {
    systemCounter_ = 0;
    tima_ = 0;
    tma_ = 0;
    tac_ = 0;
}

int Timer::timerInputBit() const {
    switch (tac_ & 0x03) {
        case 0: return 9;  // every 1024 T-cycles (4096 Hz)
        case 1: return 3;  // every 16 T-cycles (262144 Hz)
        case 2: return 5;  // every 64 T-cycles (65536 Hz)
        default: return 7; // every 256 T-cycles (16384 Hz)
    }
}

bool Timer::selectedBit() const {
    return (systemCounter_ & (1u << timerInputBit())) != 0;
}

bool Timer::tick(int tCycles) {
    bool overflowed = false;
    for (int i = 0; i < tCycles; ++i) {
        const bool before = timerEnabled() && selectedBit();
        ++systemCounter_;
        const bool after = timerEnabled() && selectedBit();

        if (before && !after) {
            if (tima_ == 0xFF) {
                tima_ = tma_;
                overflowed = true;
            } else {
                ++tima_;
            }
        }
    }
    return overflowed;
}

uint8_t Timer::read8(uint16_t address) const {
    switch (address) {
        case kDivAddress: return static_cast<uint8_t>(systemCounter_ >> 8);
        case kTimaAddress: return tima_;
        case kTmaAddress: return tma_;
        case kTacAddress: return tac_;
        default: return 0xFF;
    }
}

void Timer::write8(uint16_t address, uint8_t value) {
    switch (address) {
        case kDivAddress:
            systemCounter_ = 0; // any write resets the internal counter
            break;
        case kTimaAddress:
            tima_ = value;
            break;
        case kTmaAddress:
            tma_ = value;
            break;
        case kTacAddress:
            tac_ = value & 0x07;
            break;
        default:
            break;
    }
}

} // namespace gb
