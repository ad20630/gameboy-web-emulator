#pragma once

#include <array>
#include <cstddef>
#include <cstdint>

namespace gb {

class Mmu {
public:
    Mmu();
    ~Mmu();

    uint8_t read8(uint16_t address) const;
    void write8(uint16_t address, uint8_t value);

//loads a rom directly into ram, only supports 32kb without bank switching atm
    void loadRom(const uint8_t* data, size_t size);

private:
    std::array<uint8_t, 0x10000> memory_{};
};

} // namespace gb
