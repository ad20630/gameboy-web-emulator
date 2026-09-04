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

    static constexpr uint16_t kIfAddress = 0xFF0F;
    static constexpr uint16_t kIeAddress = 0xFFFF;
    static constexpr uint8_t kInterruptVBlank = 0x01;
    static constexpr uint8_t kInterruptLcdStat = 0x02;
    static constexpr uint8_t kInterruptTimer = 0x04;
    static constexpr uint8_t kInterruptSerial = 0x08;
    static constexpr uint8_t kInterruptJoypad = 0x10;

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
    bool ime = false;

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
    bool imeScheduled = false;

    uint8_t fetch8(Mmu& mmu);
    uint16_t fetch16(Mmu& mmu);
    void push16(Mmu& mmu, uint16_t);
    uint16_t pop16(Mmu& mmu);

    void ld_r_d8(uint8_t& reg, uint8_t value);
    void inc_r(uint8_t& reg);
    void dec_r(uint8_t& reg);
    void add_a(uint8_t value);
    void adc_a(uint8_t value);
    void sub_a(uint8_t value);
    void sbc_a(uint8_t value);
    void and_a(uint8_t value);
    void xor_a(uint8_t value);
    void or_a(uint8_t value);
    void cp_a(uint8_t value);

    void rlc_r(uint8_t& reg);
    void rrc_r(uint8_t& reg);
    void rl_r(uint8_t& reg);
    void rr_r(uint8_t& reg);
    void sla_r(uint8_t& reg);
    void sra_r(uint8_t& reg);
    void swap_r(uint8_t& reg);
    void srl_r(uint8_t& reg);
    void bit_b(uint8_t bitIndex, uint8_t value);
    void res_b(uint8_t bitIndex, uint8_t& reg);
    void set_b(uint8_t bitIndex, uint8_t& reg);
    uint8_t* cbRegisterPtr(uint8_t regIndex);

    // Returns cycles for the serviced interrupt, or 0 if none is pending.
    int handleInterrupts(Mmu& mmu);
    int serviceInterrupt(Mmu& mmu, uint8_t mask, uint16_t vector);
    int executeOpcode(Mmu& mmu, uint8_t opcode);
    int executeCbOpcode(Mmu& mmu, uint8_t opcode);
};

} // namespace gb
