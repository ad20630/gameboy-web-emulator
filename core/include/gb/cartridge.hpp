#pragma once

#include <cstddef>
#include <cstdint>
#include <vector>

namespace gb {

class Cartridge {
public:
    Cartridge();
    ~Cartridge();

    // Parses the header (MBC type, ROM/RAM size) and stores the ROM image.
    void load(const uint8_t* data, size_t size);

    uint8_t read8(uint16_t address) const;  // 0x0000-0x7FFF, 0xA000-0xBFFF
    void write8(uint16_t address, uint8_t value);

private:
    std::vector<uint8_t> rom_;
    std::vector<uint8_t> ram_;

    // Only MBC1 bank switching is implemented; other MBC types fall back to
    // a fixed bank 1 with always-enabled RAM, which is correct for ROM-only
    // carts but not for MBC2/3/5 titles.
    bool isMbc1_ = false;
    bool ramEnabled_ = false;
    uint8_t romBankLow_ = 1;
    uint8_t ramBank_ = 0;

    uint16_t romBank() const;
};

} // namespace gb
