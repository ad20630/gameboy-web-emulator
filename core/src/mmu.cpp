#include "gb/mmu.hpp"

#include "gb/cartridge.hpp"
#include "gb/ppu.hpp"

namespace gb {

namespace {
constexpr uint16_t kDmaRegister = 0xFF46;
}

Mmu::Mmu(Cartridge& cartridge, Ppu& ppu) : cartridge_(cartridge), ppu_(ppu) {}
Mmu::~Mmu() = default;

uint8_t Mmu::read8(uint16_t address) const {
    if (address < 0x8000) {
        return cartridge_.read8(address);
    }
    if (address < 0xA000) {
        return ppu_.read8(address); // VRAM
    }
    if (address < 0xC000) {
        return cartridge_.read8(address); // external RAM
    }
    if (address < 0xE000) {
        return wram_[address - 0xC000];
    }
    if (address < 0xFE00) {
        return wram_[address - 0xE000]; // echo RAM mirrors 0xC000-0xDDFF
    }
    if (address < 0xFEA0) {
        return ppu_.read8(address); // OAM
    }
    if (address < 0xFF00) {
        return 0xFF; // unusable
    }
    if (address < 0xFF80) {
        return readIo(address);
    }
    if (address < 0xFFFF) {
        return hram_[address - 0xFF80];
    }
    return ie_;
}

void Mmu::write8(uint16_t address, uint8_t value) {
    if (address < 0x8000) {
        cartridge_.write8(address, value);
    } else if (address < 0xA000) {
        ppu_.write8(address, value); // VRAM
    } else if (address < 0xC000) {
        cartridge_.write8(address, value); // external RAM
    } else if (address < 0xE000) {
        wram_[address - 0xC000] = value;
    } else if (address < 0xFE00) {
        wram_[address - 0xE000] = value; // echo RAM
    } else if (address < 0xFEA0) {
        ppu_.write8(address, value); // OAM
    } else if (address < 0xFF00) {
        // unusable, writes ignored
    } else if (address < 0xFF80) {
        writeIo(address, value);
    } else if (address < 0xFFFF) {
        hram_[address - 0xFF80] = value;
    } else {
        ie_ = value;
    }
}

uint8_t Mmu::readIo(uint16_t address) const {
    if (address >= 0xFF40 && address <= 0xFF4B) {
        return ppu_.readRegister(address);
    }
    return io_[address - 0xFF00];
}

void Mmu::writeIo(uint16_t address, uint8_t value) {
    if (address == kDmaRegister) {
        ppu_.writeRegister(address, value);
        performOamDma(value);
        return;
    }
    if (address >= 0xFF40 && address <= 0xFF4B) {
        ppu_.writeRegister(address, value);
        return;
    }
    io_[address - 0xFF00] = value;
}

void Mmu::performOamDma(uint8_t sourceHigh) {
    const uint16_t sourceBase = static_cast<uint16_t>(sourceHigh) << 8;
    for (uint16_t i = 0; i < 0xA0; ++i) {
        ppu_.write8(static_cast<uint16_t>(0xFE00 + i), read8(static_cast<uint16_t>(sourceBase + i)));
    }
}

} // namespace gb
