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
    ime = false;
    imeScheduled = false;
}

uint8_t Cpu::fetch8(Mmu& mmu) {
    return mmu.read8(pc++);
}

uint16_t Cpu::fetch16(Mmu& mmu) {
    const uint8_t lo = fetch8(mmu);
    const uint8_t hi = fetch8(mmu);
    return static_cast<uint16_t>((hi << 8) | lo);
}

void Cpu::push16(Mmu& mmu, uint16_t value) {
    --sp;
    mmu.write8(sp, static_cast<uint8_t>(value >> 8));
    --sp;
    mmu.write8(sp, static_cast<uint8_t>(value & 0xFF));
}

uint16_t Cpu::pop16(Mmu& mmu) {
    const uint8_t lo = mmu.read8(sp);
    ++sp;
    const uint8_t hi = mmu.read8(sp);
    ++sp;
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

void Cpu::adc_a(uint8_t value) {
    const uint8_t carryIn = getFlag(kFlagCarry) ? 1 : 0;
    const uint16_t result = static_cast<uint16_t>(a) + value + carryIn;
    setFlag(kFlagHalfCarry, ((a & 0x0F) + (value & 0x0F) + carryIn) > 0x0F);
    setFlag(kFlagCarry, result > 0xFF);
    a = static_cast<uint8_t>(result);
    setFlag(kFlagZero, a == 0);
    setFlag(kFlagSubtract, false);
}

void Cpu::sub_a(uint8_t value) {
    setFlag(kFlagHalfCarry, (a & 0x0F) < (value & 0x0F));
    setFlag(kFlagCarry, a < value);
    a = static_cast<uint8_t>(a - value);
    setFlag(kFlagZero, a == 0);
    setFlag(kFlagSubtract, true);
}

void Cpu::sbc_a(uint8_t value) {
    const uint8_t carryIn = getFlag(kFlagCarry) ? 1 : 0;
    const int result = static_cast<int>(a) - value - carryIn;
    setFlag(kFlagHalfCarry, (static_cast<int>(a & 0x0F) - (value & 0x0F) - carryIn) < 0);
    setFlag(kFlagCarry, result < 0);
    a = static_cast<uint8_t>(result);
    setFlag(kFlagZero, a == 0);
    setFlag(kFlagSubtract, true);
}

void Cpu::and_a(uint8_t value) {
    a &= value;
    setFlag(kFlagZero, a == 0);
    setFlag(kFlagSubtract, false);
    setFlag(kFlagHalfCarry, true);
    setFlag(kFlagCarry, false);
}

void Cpu::xor_a(uint8_t value) {
    a ^= value;
    f = 0;
    setFlag(kFlagZero, a == 0);
}

void Cpu::or_a(uint8_t value) {
    a |= value;
    setFlag(kFlagZero, a == 0);
    setFlag(kFlagSubtract, false);
    setFlag(kFlagHalfCarry, false);
    setFlag(kFlagCarry, false);
}

void Cpu::cp_a(uint8_t value) {
    setFlag(kFlagHalfCarry, (a & 0x0F) < (value & 0x0F));
    setFlag(kFlagCarry, a < value);
    setFlag(kFlagZero, a == value);
    setFlag(kFlagSubtract, true);
}

int Cpu::serviceInterrupt(Mmu& mmu, uint8_t mask, uint16_t vector) {
    mmu.write8(kIfAddress, static_cast<uint8_t>(mmu.read8(kIfAddress) & ~mask));
    ime = false;
    push16(mmu, pc);
    pc = vector;
    return 20;
}

int Cpu::handleInterrupts(Mmu& mmu) {
    const uint8_t pending = mmu.read8(kIeAddress) & mmu.read8(kIfAddress) & 0x1F;
    if (pending == 0) {
        return 0;
    }
    halted = false;
    if (!ime) {
        return 0;
    }
    if (pending & kInterruptVBlank) return serviceInterrupt(mmu, kInterruptVBlank, 0x40);
    if (pending & kInterruptLcdStat) return serviceInterrupt(mmu, kInterruptLcdStat, 0x48);
    if (pending & kInterruptTimer) return serviceInterrupt(mmu, kInterruptTimer, 0x50);
    if (pending & kInterruptSerial) return serviceInterrupt(mmu, kInterruptSerial, 0x58);
    return serviceInterrupt(mmu, kInterruptJoypad, 0x60);
}

int Cpu::step(Mmu& mmu) {
    if (const int interruptCycles = handleInterrupts(mmu); interruptCycles != 0) {
        return interruptCycles;
    }

    if (halted) {
        return 4;
    }

    const bool applyImeAfterThisInstruction = imeScheduled;
    imeScheduled = false;

    const uint8_t opcode = fetch8(mmu);
    const int cycles = executeOpcode(mmu, opcode);

    if (applyImeAfterThisInstruction) {
        ime = true;
    }

    return cycles;
}

int Cpu::executeOpcode(Mmu& mmu, uint8_t opcode) {
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

    case 0x18: { // JR r8
      const int8_t offset = static_cast<int8_t>(fetch8(mmu));
      pc = static_cast<uint16_t>(pc + offset);
      return 12;
    }

    case 0x20: // JR NZ,r8
        if (!getFlag(kFlagZero)) {
            const int8_t offset = static_cast<int8_t>(fetch8(mmu));
            pc = static_cast<uint16_t>(pc + offset);
            return 12;
        } else {
            fetch8(mmu);
            return 8;
        }

    case 0x21: // LD HL,d16
        setHl(fetch16(mmu));
        return 12;

    case 0x28: // JR Z,r8
        if (getFlag(kFlagZero)) {
            const int8_t offset = static_cast<int8_t>(fetch8(mmu));
            pc = static_cast<uint16_t>(pc + offset);
            return 12;
        } else {
            fetch8(mmu);
            return 8;
        }

    case 0x30: // JR NC,r8
        if (!getFlag(kFlagCarry)) {
            const int8_t offset = static_cast<int8_t>(fetch8(mmu));
            pc = static_cast<uint16_t>(pc + offset);
            return 12;
        } else {
            fetch8(mmu);
            return 8;
        }

    case 0x31: // LD SP,d16
        sp = fetch16(mmu);
        return 12;

    case 0x38: // JR C,r8
        if (getFlag(kFlagCarry)) {
            const int8_t offset = static_cast<int8_t>(fetch8(mmu));
            pc = static_cast<uint16_t>(pc + offset);
            return 12;
        } else {
            fetch8(mmu);
            return 8;
        }

    case 0x3E: // LD A,d8
        ld_r_d8(a, fetch8(mmu));
        return 8;

    case 0x03: // INC BC
        setBc(static_cast<uint16_t>(bc() + 1));
        return 8;
    case 0x0B: // DEC BC
        setBc(static_cast<uint16_t>(bc() - 1));
        return 8;
    case 0x13: // INC DE
        setDe(static_cast<uint16_t>(de() + 1));
        return 8;
    case 0x1B: // DEC DE
        setDe(static_cast<uint16_t>(de() - 1));
        return 8;
    case 0x23: // INC HL
        setHl(static_cast<uint16_t>(hl() + 1));
        return 8;
    case 0x2B: // DEC HL
        setHl(static_cast<uint16_t>(hl() - 1));
        return 8;
    case 0x33: // INC SP
        ++sp;
        return 8;
    case 0x3B: // DEC SP
        --sp;
        return 8;

    case 0x0C: // INC C
        inc_r(c);
        return 4;
    case 0x0D: // DEC C
        dec_r(c);
        return 4;
    case 0x14: // INC D
        inc_r(d);
        return 4;
    case 0x15: // DEC D
        dec_r(d);
        return 4;
    case 0x1C: // INC E
        inc_r(e);
        return 4;
    case 0x1D: // DEC E
        dec_r(e);
        return 4;
    case 0x24: // INC H
        inc_r(h);
        return 4;
    case 0x25: // DEC H
        dec_r(h);
        return 4;
    case 0x2C: // INC L
        inc_r(l);
        return 4;
    case 0x2D: // DEC L
        dec_r(l);
        return 4;
    case 0x3C: // INC A
        inc_r(a);
        return 4;
    case 0x3D: // DEC A
        dec_r(a);
        return 4;

    case 0x34: { // INC (HL)
        uint8_t value = mmu.read8(hl());
        inc_r(value);
        mmu.write8(hl(), value);
        return 12;
    }
    case 0x35: { // DEC (HL)
        uint8_t value = mmu.read8(hl());
        dec_r(value);
        mmu.write8(hl(), value);
        return 12;
    }

    case 0x40: // LD B,B
        b = b;
        return 4;
    case 0x41: // LD B,C
        b = c;
        return 4;
    case 0x42: // LD B,D
        b = d;
        return 4;
    case 0x43: // LD B,E
        b = e;
        return 4;
    case 0x44: // LD B,H
        b = h;
        return 4;
    case 0x45: // LD B,L
        b = l;
        return 4;
    case 0x46: // LD B,(HL)
        b = mmu.read8(hl());
        return 8;
    case 0x47: // LD B,A
        b = a;
        return 4;

    case 0x48: // LD C,B
        c = b;
        return 4;
    case 0x49: // LD C,C
        c = c;
        return 4;
    case 0x4A: // LD C,D
        c = d;
        return 4;
    case 0x4B: // LD C,E
        c = e;
        return 4;
    case 0x4C: // LD C,H
        c = h;
        return 4;
    case 0x4D: // LD C,L
        c = l;
        return 4;
    case 0x4E: // LD C,(HL)
        c = mmu.read8(hl());
        return 8;
    case 0x4F: // LD C,A
        c = a;
        return 4;

    case 0x50: // LD D,B
        d = b;
        return 4;
    case 0x51: // LD D,C
        d = c;
        return 4;
    case 0x52: // LD D,D
        d = d;
        return 4;
    case 0x53: // LD D,E
        d = e;
        return 4;
    case 0x54: // LD D,H
        d = h;
        return 4;
    case 0x55: // LD D,L
        d = l;
        return 4;
    case 0x56: // LD D,(HL)
        d = mmu.read8(hl());
        return 8;
    case 0x57: // LD D,A
        d = a;
        return 4;

    case 0x58: // LD E,B
        e = b;
        return 4;
    case 0x59: // LD E,C
        e = c;
        return 4;
    case 0x5A: // LD E,D
        e = d;
        return 4;
    case 0x5B: // LD E,E
        e = e;
        return 4;
    case 0x5C: // LD E,H
        e = h;
        return 4;
    case 0x5D: // LD E,L
        e = l;
        return 4;
    case 0x5E: // LD E,(HL)
        e = mmu.read8(hl());
        return 8;
    case 0x5F: // LD E,A
        e = a;
        return 4;

    case 0x60: // LD H,B
        h = b;
        return 4;
    case 0x61: // LD H,C
        h = c;
        return 4;
    case 0x62: // LD H,D
        h = d;
        return 4;
    case 0x63: // LD H,E
        h = e;
        return 4;
    case 0x64: // LD H,H
        h = h;
        return 4;
    case 0x65: // LD H,L
        h = l;
        return 4;
    case 0x66: // LD H,(HL)
        h = mmu.read8(hl());
        return 8;
    case 0x67: // LD H,A
        h = a;
        return 4;

    case 0x68: // LD L,B
        l = b;
        return 4;
    case 0x69: // LD L,C
        l = c;
        return 4;
    case 0x6A: // LD L,D
        l = d;
        return 4;
    case 0x6B: // LD L,E
        l = e;
        return 4;
    case 0x6C: // LD L,H
        l = h;
        return 4;
    case 0x6D: // LD L,L
        l = l;
        return 4;
    case 0x6E: // LD L,(HL)
        l = mmu.read8(hl());
        return 8;
    case 0x6F: // LD L,A
        l = a;
        return 4;

    case 0x70: // LD (HL),B
        mmu.write8(hl(), b);
        return 8;
    case 0x71: // LD (HL),C
        mmu.write8(hl(), c);
        return 8;
    case 0x72: // LD (HL),D
        mmu.write8(hl(), d);
        return 8;
    case 0x73: // LD (HL),E
        mmu.write8(hl(), e);
        return 8;
    case 0x74: // LD (HL),H
        mmu.write8(hl(), h);
        return 8;
    case 0x75: // LD (HL),L
        mmu.write8(hl(), l);
        return 8;

    case 0x76: // HALT
        halted = true;
        return 4;

    case 0x77: // LD (HL),A
        mmu.write8(hl(), a);
        return 8;

    case 0x78: // LD A,B
        a = b;
        return 4;
    case 0x79: // LD A,C
        a = c;
        return 4;
    case 0x7A: // LD A,D
        a = d;
        return 4;
    case 0x7B: // LD A,E
        a = e;
        return 4;
    case 0x7C: // LD A,H
        a = h;
        return 4;
    case 0x7D: // LD A,L
        a = l;
        return 4;
    case 0x7E: // LD A,(HL)
        a = mmu.read8(hl());
        return 8;
    case 0x7F: // LD A,A
        a = a;
        return 4;

    case 0x80: // ADD A,B
        add_a(b);
        return 4;
    case 0x81: // ADD A,C
        add_a(c);
        return 4;
    case 0x82: // ADD A,D
        add_a(d);
        return 4;
    case 0x83: // ADD A,E
        add_a(e);
        return 4;
    case 0x84: // ADD A,H
        add_a(h);
        return 4;
    case 0x85: // ADD A,L
        add_a(l);
        return 4;
    case 0x86: // ADD A,(HL)
        add_a(mmu.read8(hl()));
        return 8;
    case 0x87: // ADD A,A
        add_a(a);
        return 4;

    case 0x88: // ADC A,B
        adc_a(b);
        return 4;
    case 0x89: // ADC A,C
        adc_a(c);
        return 4;
    case 0x8A: // ADC A,D
        adc_a(d);
        return 4;
    case 0x8B: // ADC A,E
        adc_a(e);
        return 4;
    case 0x8C: // ADC A,H
        adc_a(h);
        return 4;
    case 0x8D: // ADC A,L
        adc_a(l);
        return 4;
    case 0x8E: // ADC A,(HL)
        adc_a(mmu.read8(hl()));
        return 8;
    case 0x8F: // ADC A,A
        adc_a(a);
        return 4;

    case 0x90: // SUB B
        sub_a(b);
        return 4;
    case 0x91: // SUB C
        sub_a(c);
        return 4;
    case 0x92: // SUB D
        sub_a(d);
        return 4;
    case 0x93: // SUB E
        sub_a(e);
        return 4;
    case 0x94: // SUB H
        sub_a(h);
        return 4;
    case 0x95: // SUB L
        sub_a(l);
        return 4;
    case 0x96: // SUB (HL)
        sub_a(mmu.read8(hl()));
        return 8;
    case 0x97: // SUB A
        sub_a(a);
        return 4;

    case 0x98: // SBC A,B
        sbc_a(b);
        return 4;
    case 0x99: // SBC A,C
        sbc_a(c);
        return 4;
    case 0x9A: // SBC A,D
        sbc_a(d);
        return 4;
    case 0x9B: // SBC A,E
        sbc_a(e);
        return 4;
    case 0x9C: // SBC A,H
        sbc_a(h);
        return 4;
    case 0x9D: // SBC A,L
        sbc_a(l);
        return 4;
    case 0x9E: // SBC A,(HL)
        sbc_a(mmu.read8(hl()));
        return 8;
    case 0x9F: // SBC A,A
        sbc_a(a);
        return 4;

    case 0xA0: // AND B
        and_a(b);
        return 4;
    case 0xA1: // AND C
        and_a(c);
        return 4;
    case 0xA2: // AND D
        and_a(d);
        return 4;
    case 0xA3: // AND E
        and_a(e);
        return 4;
    case 0xA4: // AND H
        and_a(h);
        return 4;
    case 0xA5: // AND L
        and_a(l);
        return 4;
    case 0xA6: // AND (HL)
        and_a(mmu.read8(hl()));
        return 8;
    case 0xA7: // AND A
        and_a(a);
        return 4;

    case 0xA8: // XOR B
        xor_a(b);
        return 4;
    case 0xA9: // XOR C
        xor_a(c);
        return 4;
    case 0xAA: // XOR D
        xor_a(d);
        return 4;
    case 0xAB: // XOR E
        xor_a(e);
        return 4;
    case 0xAC: // XOR H
        xor_a(h);
        return 4;
    case 0xAD: // XOR L
        xor_a(l);
        return 4;
    case 0xAE: // XOR (HL)
        xor_a(mmu.read8(hl()));
        return 8;
    case 0xAF: // XOR A
        xor_a(a);
        return 4;

    case 0xB0: // OR B
        or_a(b);
        return 4;
    case 0xB1: // OR C
        or_a(c);
        return 4;
    case 0xB2: // OR D
        or_a(d);
        return 4;
    case 0xB3: // OR E
        or_a(e);
        return 4;
    case 0xB4: // OR H
        or_a(h);
        return 4;
    case 0xB5: // OR L
        or_a(l);
        return 4;
    case 0xB6: // OR (HL)
        or_a(mmu.read8(hl()));
        return 8;
    case 0xB7: // OR A
        or_a(a);
        return 4;

    case 0xB8: // CP B
        cp_a(b);
        return 4;
    case 0xB9: // CP C
        cp_a(c);
        return 4;
    case 0xBA: // CP D
        cp_a(d);
        return 4;
    case 0xBB: // CP E
        cp_a(e);
        return 4;
    case 0xBC: // CP H
        cp_a(h);
        return 4;
    case 0xBD: // CP L
        cp_a(l);
        return 4;
    case 0xBE: // CP (HL)
        cp_a(mmu.read8(hl()));
        return 8;
    case 0xBF: // CP A
        cp_a(a);
        return 4;

    case 0xC6: // ADD A,d8
        add_a(fetch8(mmu));
        return 8;
    case 0xCE: // ADC A,d8
        adc_a(fetch8(mmu));
        return 8;
    case 0xD6: // SUB d8
        sub_a(fetch8(mmu));
        return 8;
    case 0xDE: // SBC A,d8
        sbc_a(fetch8(mmu));
        return 8;
    case 0xE6: // AND d8
        and_a(fetch8(mmu));
        return 8;
    case 0xEE: // XOR d8
        xor_a(fetch8(mmu));
        return 8;
    case 0xF6: // OR d8
        or_a(fetch8(mmu));
        return 8;
    case 0xFE: // CP d8
        cp_a(fetch8(mmu));
        return 8;

    case 0xC1: // POP BC
      setBc(pop16(mmu));
      return 12;

    case 0xC3: // JP a16
        pc = fetch16(mmu);
        return 16;

    case 0xC5: //PUSH BC
        push16(mmu, bc());
        return 16;

    case 0xD1: // POP DE
      setDe(pop16(mmu));
      return 12;

    case 0xD5: //PUSH DE
        push16(mmu, de());
        return 16;

    case 0xE1: // POP HL
      setHl(pop16(mmu));
      return 12;

    case 0xE5: //PUSH HL
        push16(mmu, hl());
        return 16;

    case 0xF1: { // POP AF
      const uint16_t af = pop16(mmu);
      a = static_cast<uint8_t>(af >> 8);
      f = static_cast<uint8_t>(af & 0xF0);
      return 12;
    }

    case 0xF5: // PUSH AF
      push16(mmu, static_cast<uint16_t>((a << 8) | f));
      return 16;

    case 0xC9: // RET
        pc = pop16(mmu);
        return 16;

    case 0xD9: // RETI
        pc = pop16(mmu);
        ime = true;
        return 16;

    case 0xF3: // DI
        ime = false;
        imeScheduled = false;
        return 4;

    case 0xFB: // EI
        imeScheduled = true;
        return 4;

    default:
        // unimplemented opcodes are noop
        return 4;
    }
}

} // namespace gb
