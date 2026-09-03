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

void Cpu::xor_a(uint8_t value) {
    a ^= value;
    f = 0;
    setFlag(kFlagZero, a == 0);
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

    case 0xAF: // XOR A
        xor_a(a);
        return 4;

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
