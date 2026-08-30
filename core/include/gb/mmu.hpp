#pragma once

#include <array>
#include <cstdint>

namespace gb {

class Mmu {
public:
    Mmu();
    ~Mmu();

    uint8_t read8(uint16_t address) const;
    void write8(uint16_t address, uint8_t value);

private:
    std::array<uint8_t, 0x10000> memory_{};
};

} // namespace gb
