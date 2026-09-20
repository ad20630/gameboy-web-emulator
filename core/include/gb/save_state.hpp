#pragma once

#include <cstddef>
#include <cstdint>
#include <cstring>
#include <vector>

namespace gb {

// Appends primitives to a growable buffer in a fixed little-endian layout.
// Used to build up a save-state snapshot from each subsystem's private state.
class StateWriter {
public:
    explicit StateWriter(std::vector<uint8_t>& buffer) : buffer_(buffer) {}

    void writeU8(uint8_t value) { buffer_.push_back(value); }
    void writeBool(bool value) { writeU8(value ? 1 : 0); }

    void writeU16(uint16_t value) {
        writeU8(static_cast<uint8_t>(value));
        writeU8(static_cast<uint8_t>(value >> 8));
    }

    void writeU32(uint32_t value) {
        for (int shift = 0; shift < 32; shift += 8) {
            writeU8(static_cast<uint8_t>(value >> shift));
        }
    }

    void writeU64(uint64_t value) {
        for (int shift = 0; shift < 64; shift += 8) {
            writeU8(static_cast<uint8_t>(value >> shift));
        }
    }

    void writeBytes(const uint8_t* data, size_t size) {
        buffer_.insert(buffer_.end(), data, data + size);
    }

private:
    std::vector<uint8_t>& buffer_;
};

// Reads primitives back out of a save-state blob written by StateWriter.
// Bounds-checked: reads past the end of the buffer return zero and flip
// ok() to false permanently, rather than reading out of bounds. Callers
// should check ok() before trusting a load.
class StateReader {
public:
    StateReader(const uint8_t* data, size_t size) : data_(data), remaining_(size) {}

    bool ok() const { return ok_; }

    uint8_t readU8() {
        if (remaining_ < 1) {
            ok_ = false;
            return 0;
        }
        const uint8_t value = data_[0];
        data_ += 1;
        remaining_ -= 1;
        return value;
    }

    bool readBool() { return readU8() != 0; }

    uint16_t readU16() {
        const uint16_t low = readU8();
        const uint16_t high = readU8();
        return static_cast<uint16_t>(low | (high << 8));
    }

    uint32_t readU32() {
        uint32_t value = 0;
        for (int shift = 0; shift < 32; shift += 8) {
            value |= static_cast<uint32_t>(readU8()) << shift;
        }
        return value;
    }

    uint64_t readU64() {
        uint64_t value = 0;
        for (int shift = 0; shift < 64; shift += 8) {
            value |= static_cast<uint64_t>(readU8()) << shift;
        }
        return value;
    }

    void readBytes(uint8_t* out, size_t size) {
        if (remaining_ < size) {
            ok_ = false;
            std::memset(out, 0, size);
            return;
        }
        std::memcpy(out, data_, size);
        data_ += size;
        remaining_ -= size;
    }

    size_t remaining() const { return remaining_; }

private:
    const uint8_t* data_;
    size_t remaining_;
    bool ok_ = true;
};

} // namespace gb
