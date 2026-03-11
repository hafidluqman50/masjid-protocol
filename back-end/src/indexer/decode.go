package indexer

import (
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"

	"golang.org/x/crypto/sha3"
)

// eventTopic returns keccak256("EventSig(types...)") as 0x-prefixed hex.
func eventTopic(sig string) string {
	h := sha3.NewLegacyKeccak256()
	h.Write([]byte(sig))
	return "0x" + hex.EncodeToString(h.Sum(nil))
}

// fnSelector returns the first 4 bytes of keccak256(sig) as 0x-prefixed hex.
func fnSelector(sig string) string {
	h := sha3.NewLegacyKeccak256()
	h.Write([]byte(sig))
	return "0x" + hex.EncodeToString(h.Sum(nil)[:4])
}

// topicToAddr extracts a checksummed-lower address from a 32-byte topic.
func topicToAddr(topic string) string {
	t := strings.TrimPrefix(topic, "0x")
	if len(t) < 40 {
		return "0x" + strings.Repeat("0", 40)
	}
	return "0x" + strings.ToLower(t[len(t)-40:])
}

// topicToBytes32 returns the topic as a 0x-prefixed 32-byte hex string.
func topicToBytes32(topic string) string {
	t := strings.TrimPrefix(topic, "0x")
	if len(t) < 64 {
		t = fmt.Sprintf("%064s", t)
	}
	return "0x" + strings.ToLower(t)
}

// topicToBigInt parses a 32-byte topic as a *big.Int.
func topicToBigInt(topic string) *big.Int {
	t := strings.TrimPrefix(topic, "0x")
	n, _ := new(big.Int).SetString(t, 16)
	if n == nil {
		return new(big.Int)
	}
	return n
}

// slotHex returns the idx-th 32-byte (64 hex char) slot from ABI-encoded data.
// data must be WITHOUT the 0x prefix.
func slotHex(data string, idx int) string {
	start := idx * 64
	end := start + 64
	if len(data) < end {
		return strings.Repeat("0", 64)
	}
	return data[start:end]
}

func slotToAddr(data string, idx int) string {
	s := slotHex(data, idx)
	return "0x" + strings.ToLower(s[len(s)-40:])
}

func slotToUint256Str(data string, idx int) string {
	s := slotHex(data, idx)
	n, ok := new(big.Int).SetString(s, 16)
	if !ok {
		return "0"
	}
	return n.String()
}

func slotToBool(data string, idx int) bool {
	s := slotHex(data, idx)
	return strings.HasSuffix(s, "01")
}

func slotToInt(data string, idx int) int {
	s := slotHex(data, idx)
	n, ok := new(big.Int).SetString(s, 16)
	if !ok {
		return 0
	}
	return int(n.Int64())
}

func slotToInt64(data string, idx int) int64 {
	s := slotHex(data, idx)
	n, ok := new(big.Int).SetString(s, 16)
	if !ok {
		return 0
	}
	return n.Int64()
}

func slotToBytes32(data string, idx int) string {
	return "0x" + strings.ToLower(slotHex(data, idx))
}

// decodeABIString decodes a Solidity string that is ABI-encoded at slotIdx
// (slot contains the byte-offset to the length word).
func decodeABIString(data string, slotIdx int) string {
	offsetBytes := slotToInt(data, slotIdx)
	lenSlot := offsetBytes / 32
	length := slotToInt(data, lenSlot)
	if length == 0 {
		return ""
	}
	dataStart := (lenSlot + 1) * 64
	dataEnd := dataStart + length*2
	if len(data) < dataEnd {
		return ""
	}
	b, err := hex.DecodeString(data[dataStart:dataEnd])
	if err != nil {
		return ""
	}
	return string(b)
}

// decodeStringReturn decodes the return value of a solidity function
// that returns a single `string` (ABI: offset word + length word + data).
func decodeStringReturn(data string) string {
	if len(data) < 128 {
		return ""
	}
	// slot 0 = offset (should be 32 = 0x20)
	length := slotToInt(data, 1)
	if length == 0 {
		return ""
	}
	start := 128
	end := start + length*2
	if len(data) < end {
		return ""
	}
	b, err := hex.DecodeString(data[start:end])
	if err != nil {
		return ""
	}
	return string(b)
}

func stripData(raw string) string {
	return strings.TrimPrefix(raw, "0x")
}

func uint64ToHex(n uint64) string {
	return fmt.Sprintf("0x%x", n)
}
