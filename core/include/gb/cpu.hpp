#pragma once

#include <cstdint>

namespace gb {

class Mmu;

class Cpu {
public:
    Cpu();
    ~Cpu();

    void reset();

    // Executes one instruction; returns the number of machine cycles consumed.
    int step(Mmu& mmu);

    static constexpr uint8_t kFlagZero = 0x80;
    static constexpr uint8_t kFlagSubtract = 0x40;
    static constexpr uint8_t kFlagHalfCarry = 0x20;
    static constexpr uint8_t kFlagCarry = 0x10;

    uint8_t a = 0;
    uint8_t f = 0;
    uint8_t b = 0;
    uint8_t c = 0;
    uint8_t d = 0;
    uint8_t e = 0;
    uint8_t h = 0;
    uint8_t l = 0;
    uint16_t sp = 0;
    uint16_t pc = 0;
    bool halted = false;

    uint16_t bc() const { return static_cast<uint16_t>((b << 8) | c); }
    void setBc(uint16_t value) { b = static_cast<uint8_t>(value >> 8); c = static_cast<uint8_t>(value); }
    uint16_t de() const { return static_cast<uint16_t>((d << 8) | e); }
    void setDe(uint16_t value) { d = static_cast<uint8_t>(value >> 8); e = static_cast<uint8_t>(value); }
    uint16_t hl() const { return static_cast<uint16_t>((h << 8) | l); }
    void setHl(uint16_t value) { h = static_cast<uint8_t>(value >> 8); l = static_cast<uint8_t>(value); }

    bool getFlag(uint8_t mask) const { return (f & mask) != 0; }
    void setFlag(uint8_t mask, bool value) {
        f = value ? static_cast<uint8_t>(f | mask) : static_cast<uint8_t>(f & ~mask);
    }

private:
    uint8_t fetch8(Mmu& mmu);
    uint16_t fetch16(Mmu& mmu);

    void ld_r_d8(uint8_t& reg, uint8_t value);
    void inc_r(uint8_t& reg);
    void dec_r(uint8_t& reg);
    void add_a(uint8_t value);
    void xor_a(uint8_t value);
};

} // namespace gb
