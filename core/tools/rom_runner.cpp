// Headless CLI runner for Blargg-style test ROMs.
//
// Usage: rom_runner <path-to-rom.gb> [max-cycles]
//
// Runs the ROM and prints anything it writes to the serial port (the
// convention Blargg's test ROMs use to report PASS/FAIL text without
// needing a screen). Exits 0 if "Passed" appears in the output, 1
// otherwise (including on timeout).

#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

#include "gb/emulator.hpp"

namespace {

constexpr uint16_t kSerialData = 0xFF01;   // SB
constexpr uint16_t kSerialControl = 0xFF02; // SC
constexpr uint8_t kSerialTransferRequested = 0x81;

std::vector<uint8_t> readFile(const std::string& path) {
    std::ifstream file(path, std::ios::binary | std::ios::ate);
    if (!file) {
        throw std::runtime_error("could not open rom: " + path);
    }
    const std::streamsize size = file.tellg();
    file.seekg(0, std::ios::beg);

    std::vector<uint8_t> data(static_cast<size_t>(size));
    if (!file.read(reinterpret_cast<char*>(data.data()), size)) {
        throw std::runtime_error("failed to read rom: " + path);
    }
    return data;
}

} // namespace

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "usage: rom_runner <path-to-rom.gb> [max-cycles]\n";
        return 2;
    }

    const long long maxCycles = argc >= 3 ? std::stoll(argv[2]) : 200'000'000LL;

    std::vector<uint8_t> rom;
    try {
        rom = readFile(argv[1]);
    } catch (const std::exception& e) {
        std::cerr << e.what() << "\n";
        return 2;
    }

    gb::Emulator emulator;
    emulator.reset();
    emulator.loadRom(rom.data(), rom.size());

    std::string output;
    long long cyclesRun = 0;

    while (cyclesRun < maxCycles) {
        cyclesRun += emulator.step();

        gb::Mmu& mmu = emulator.mmu();
        if (mmu.read8(kSerialControl) == kSerialTransferRequested) {
            output += static_cast<char>(mmu.read8(kSerialData));
            std::cout << output.back() << std::flush;
            mmu.write8(kSerialControl, 0x01);

            if (output.find("Passed") != std::string::npos) {
                std::cout << "\n" << argv[1] << ": PASSED (" << cyclesRun << " cycles)\n";
                return 0;
            }
            if (output.find("Failed") != std::string::npos) {
                std::cout << "\n" << argv[1] << ": FAILED (" << cyclesRun << " cycles)\n";
                return 1;
            }
        }
    }

    std::cout << "\n" << argv[1] << ": TIMED OUT after " << cyclesRun << " cycles\n";
    return 1;
}
