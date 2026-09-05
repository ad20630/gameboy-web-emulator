#include "gb/cartridge.hpp"

#include <algorithm>

namespace gb {

namespace {

constexpr uint16_t kMbcTypeAddress = 0x0147;
constexpr uint16_t kRamSizeAddress = 0x0149;

size_t ramSizeForCode(uint8_t code) {
    switch (code) {
    case 0x01: return 2 * 1024;   // unofficial, some carts use a partial bank
    case 0x02: return 8 * 1024;
    case 0x03: return 32 * 1024;
    case 0x04: return 128 * 1024;
    case 0x05: return 64 * 1024;
    default: return 0;
    }
}

} // namespace

Cartridge::Cartridge() = default;
Cartridge::~Cartridge() = default;

void Cartridge::load(const uint8_t* data, size_t size) {
    rom_.assign(data, data + size);

    const uint8_t mbcType = rom_.size() > kMbcTypeAddress ? rom_[kMbcTypeAddress] : 0;
    isMbc1_ = mbcType == 0x01 || mbcType == 0x02 || mbcType == 0x03;

    const uint8_t ramSizeCode = rom_.size() > kRamSizeAddress ? rom_[kRamSizeAddress] : 0;
    ram_.assign(ramSizeForCode(ramSizeCode), 0);

    ramEnabled_ = !isMbc1_; // non-MBC1 carts have no enable gate
    romBankLow_ = 1;
    ramBank_ = 0;
}

uint16_t Cartridge::romBank() const {
    if (!isMbc1_) {
        return 1;
    }
    return romBankLow_;
}

uint8_t Cartridge::read8(uint16_t address) const {
    if (address < 0x4000) {
        return address < rom_.size() ? rom_[address] : 0xFF;
    }
    if (address < 0x8000) {
        const size_t offset = static_cast<size_t>(romBank()) * 0x4000 + (address - 0x4000);
        return offset < rom_.size() ? rom_[offset] : 0xFF;
    }
    // 0xA000-0xBFFF: cartridge RAM
    if (!ramEnabled_ || ram_.empty()) {
        return 0xFF;
    }
    const size_t offset = (static_cast<size_t>(ramBank_) * 0x2000 + (address - 0xA000)) % ram_.size();
    return ram_[offset];
}

void Cartridge::write8(uint16_t address, uint8_t value) {
    if (address < 0x8000) {
        if (!isMbc1_) {
            return; // ROM-only carts ignore bank-control writes
        }
        if (address < 0x2000) {
            ramEnabled_ = (value & 0x0F) == 0x0A;
        } else if (address < 0x4000) {
            romBankLow_ = value & 0x1F;
            if (romBankLow_ == 0) {
                romBankLow_ = 1;
            }
        } else if (address < 0x6000) {
            ramBank_ = value & 0x03;
        }
        // 0x6000-0x7FFF (banking mode select) is not yet implemented.
        return;
    }

    // 0xA000-0xBFFF: cartridge RAM
    if (!ramEnabled_ || ram_.empty()) {
        return;
    }
    const size_t offset = (static_cast<size_t>(ramBank_) * 0x2000 + (address - 0xA000)) % ram_.size();
    ram_[offset] = value;
}

} // namespace gb
