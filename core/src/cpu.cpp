#include "gb/cpu.hpp"
#include "gb/mmu.hpp"

namespace gb {

Cpu::Cpu() = default;
Cpu::~Cpu() = default;

void Cpu::reset() {
    a = 0;
    f = 0;
    b = 0;
    c = 0;
    d = 0;
    e = 0;
    h = 0;
    l = 0;
    sp = 0xFFFE;
    pc = 0x0100;
    halted = false;
}

uint8_t Cpu::fetch8(Mmu& mmu) {
    return mmu.read8(pc++);
}

uint16_t Cpu::fetch16(Mmu& mmu) {
    const uint8_t lo = fetch8(mmu);
    const uint8_t hi = fetch8(mmu);
    return static_cast<uint16_t>((hi << 8) | lo);
}

void Cpu::ld_r_d8(uint8_t& reg, uint8_t value) {
    reg = value;
}

void Cpu::inc_r(uint8_t& reg) {
    setFlag(kFlagHalfCarry, (reg & 0x0F) == 0x0F);
    ++reg;
    setFlag(kFlagZero, reg == 0);
    setFlag(kFlagSubtract, false);
}

void Cpu::dec_r(uint8_t& reg) {
    setFlag(kFlagHalfCarry, (reg & 0x0F) == 0x00);
    --reg;
    setFlag(kFlagZero, reg == 0);
    setFlag(kFlagSubtract, true);
}

void Cpu::add_a(uint8_t value) {
    const uint16_t result = static_cast<uint16_t>(a) + value;
    setFlag(kFlagHalfCarry, ((a & 0x0F) + (value & 0x0F)) > 0x0F);
    setFlag(kFlagCarry, result > 0xFF);
    a = static_cast<uint8_t>(result);
    setFlag(kFlagZero, a == 0);
    setFlag(kFlagSubtract, false);
}

void Cpu::xor_a(uint8_t value) {
    a ^= value;
    f = 0;
    setFlag(kFlagZero, a == 0);
}

int Cpu::step(Mmu& mmu) {
    if (halted) {
        return 4;
    }

    const uint8_t opcode = fetch8(mmu);

    switch (opcode) {
    case 0x00: // NOP
        return 4;

    case 0x01: // LD BC,d16
        setBc(fetch16(mmu));
        return 12;

    case 0x02: // LD (BC),A
        mmu.write8(bc(), a);
        return 8;

    case 0x04: // INC B
        inc_r(b);
        return 4;

    case 0x05: // DEC B
        dec_r(b);
        return 4;

    case 0x06: // LD B,d8
        ld_r_d8(b, fetch8(mmu));
        return 8;

    case 0x0E: // LD C,d8
        ld_r_d8(c, fetch8(mmu));
        return 8;

    case 0x21: // LD HL,d16
        setHl(fetch16(mmu));
        return 12;

    case 0x31: // LD SP,d16
        sp = fetch16(mmu);
        return 12;

    case 0x3E: // LD A,d8
        ld_r_d8(a, fetch8(mmu));
        return 8;

    case 0x76: // HALT
        halted = true;
        return 4;

    case 0x80: // ADD A,B
        add_a(b);
        return 4;

    case 0xAF: // XOR A
        xor_a(a);
        return 4;

    case 0xC3: // JP a16
        pc = fetch16(mmu);
        return 16;

    default:
        // unimplemented opcodes are noop
        return 4;
    }
}

} // namespace gb
