package indexer

import (
	"context"
	"log"
	"strings"

	"github.com/masjid-chain/back-end/src/http/request"
)

// processProtocol indexes MasjidProtocol events.
func (idx *Indexer) processProtocol(ctx context.Context, head uint64) error {
	from := idx.fromBlock(ctx, "MasjidProtocol")
	if from > head {
		return nil
	}

	for from <= head {
		to := from + chunkSize - 1
		if to > head {
			to = head
		}

		logs, err := idx.rpc.getLogs(ctx, LogFilter{
			FromBlock: uint64ToHex(from),
			ToBlock:   uint64ToHex(to),
			Address:   []string{idx.protocol},
			Topics:    []interface{}{[]interface{}{topicMasjidRegistered, topicMasjidAttested, topicMasjidStatusUpdated}},
		})
		if err != nil {
			return err
		}

		for _, l := range logs {
			if len(l.Topics) == 0 {
				continue
			}
			switch l.Topics[0] {
			case topicMasjidRegistered:
				if err := idx.handleRegistration(ctx, l); err != nil {
					log.Printf("[indexer] handleRegistration tx=%s: %v", l.TxHash, err)
				}
			case topicMasjidAttested:
				if err := idx.handleAttest(ctx, l); err != nil {
					log.Printf("[indexer] handleAttest tx=%s: %v", l.TxHash, err)
				}
			case topicMasjidStatusUpdated:
				if err := idx.handleStatus(ctx, l); err != nil {
					log.Printf("[indexer] handleStatus tx=%s: %v", l.TxHash, err)
				}
			}
		}

		idx.saveCheckpoint(ctx, "MasjidProtocol", idx.protocol, to)
		from = to + 1
	}
	return nil
}

// processRegistry indexes VerifierRegistry events.
func (idx *Indexer) processRegistry(ctx context.Context, head uint64) error {
	from := idx.fromBlock(ctx, "VerifierRegistry")
	if from > head {
		return nil
	}

	for from <= head {
		to := from + chunkSize - 1
		if to > head {
			to = head
		}

		logs, err := idx.rpc.getLogs(ctx, LogFilter{
			FromBlock: uint64ToHex(from),
			ToBlock:   uint64ToHex(to),
			Address:   []string{idx.registry},
			Topics:    []interface{}{[]interface{}{topicVerifierAdded, topicVerifierRemoved}},
		})
		if err != nil {
			return err
		}

		for _, l := range logs {
			if len(l.Topics) == 0 {
				continue
			}
			switch l.Topics[0] {
			case topicVerifierAdded:
				if err := idx.handleVerifierAdded(ctx, l); err != nil {
					log.Printf("[indexer] handleVerifierAdded tx=%s: %v", l.TxHash, err)
				}
			case topicVerifierRemoved:
				if err := idx.handleVerifierRemoved(ctx, l); err != nil {
					log.Printf("[indexer] handleVerifierRemoved tx=%s: %v", l.TxHash, err)
				}
			}
		}

		idx.saveCheckpoint(ctx, "VerifierRegistry", idx.registry, to)
		from = to + 1
	}
	return nil
}

// ---------------------------------------------------------------------------
// MasjidProtocol event handlers
// ---------------------------------------------------------------------------

func (idx *Indexer) handleRegistration(ctx context.Context, l Log) error {
	if len(l.Topics) < 4 {
		return nil
	}
	data := stripData(l.Data)

	masjidID    := topicToBytes32(l.Topics[1])
	nameHash    := topicToBytes32(l.Topics[2])
	proposer    := topicToAddr(l.Topics[3])
	masjidAdmin := slotToAddr(data, 0)
	vault       := slotToAddr(data, 1)
	stablecoin  := slotToAddr(data, 2)
	instance    := slotToAddr(data, 3)

	// Fetch masjid name from the deployed instance contract
	masjidName, _ := idx.rpc.callString(ctx, instance, selMasjidName)
	metadataUri, _ := idx.rpc.callString(ctx, instance, selMetadataUri)

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.RegistrationEvent{
		MasjidID:     masjidID,
		NameHash:     nameHash,
		MasjidName:   masjidName,
		Proposer:     proposer,
		MasjidAdmin:  masjidAdmin,
		InstanceAddr: instance,
		VaultAddr:    vault,
		Stablecoin:   stablecoin,
		BlockNumber:  int64(blockNum),
		TxHash:       strings.ToLower(l.TxHash),
		Timestamp:    ts,
	}
	_ = metadataUri // stored in instance, backend gets it via API if needed
	return idx.eventSvc.HandleRegistration(ctx, ev)
}

func (idx *Indexer) handleAttest(ctx context.Context, l Log) error {
	if len(l.Topics) < 3 {
		return nil
	}
	data := stripData(l.Data)

	masjidID := topicToBytes32(l.Topics[1])
	verifier  := topicToAddr(l.Topics[2])
	support   := slotToBool(data, 0)
	noteHash  := slotToBytes32(data, 1)
	yesCount  := slotToInt(data, 2)
	noCount   := slotToInt(data, 3)

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.AttestEvent{
		MasjidID:    masjidID,
		Verifier:    verifier,
		Support:     support,
		NoteHash:    noteHash,
		YesCount:    yesCount,
		NoCount:     noCount,
		BlockNumber: int64(blockNum),
		TxHash:      strings.ToLower(l.TxHash),
		Timestamp:   ts,
	}
	return idx.eventSvc.HandleAttest(ctx, ev)
}

func (idx *Indexer) handleStatus(ctx context.Context, l Log) error {
	if len(l.Topics) < 2 {
		return nil
	}
	data := stripData(l.Data)

	masjidID  := topicToBytes32(l.Topics[1])
	// slot 0 = previousStatus, slot 1 = newStatus
	newStatus := registrationStatusStr(uint8(slotToInt(data, 1)))

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.StatusEvent{
		MasjidID:    masjidID,
		Status:      newStatus,
		BlockNumber: int64(blockNum),
		TxHash:      strings.ToLower(l.TxHash),
		Timestamp:   ts,
	}
	return idx.eventSvc.HandleStatus(ctx, ev)
}

// ---------------------------------------------------------------------------
// VerifierRegistry event handlers
// ---------------------------------------------------------------------------

func (idx *Indexer) handleVerifierAdded(ctx context.Context, l Log) error {
	if len(l.Topics) < 2 {
		return nil
	}
	data  := stripData(l.Data)
	addr  := topicToAddr(l.Topics[1])
	label := decodeABIString(data, 0)

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.VerifierAddedEvent{
		Address:     addr,
		Label:       label,
		BlockNumber: int64(blockNum),
		TxHash:      strings.ToLower(l.TxHash),
		Timestamp:   ts,
	}
	return idx.eventSvc.HandleVerifierAdded(ctx, ev)
}

func (idx *Indexer) handleVerifierRemoved(ctx context.Context, l Log) error {
	if len(l.Topics) < 2 {
		return nil
	}
	addr := topicToAddr(l.Topics[1])

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.VerifierRemovedEvent{
		Address:     addr,
		BlockNumber: int64(blockNum),
		TxHash:      strings.ToLower(l.TxHash),
		Timestamp:   ts,
	}
	return idx.eventSvc.HandleVerifierRemoved(ctx, ev)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// registrationStatusStr maps on-chain uint8 to the DB string.
// 0=None 1=Pending 2=Verified 3=Flagged 4=Revoked
func registrationStatusStr(v uint8) string {
	switch v {
	case 2:
		return "verified"
	case 3:
		return "flagged"
	case 4:
		return "revoked"
	default:
		return "pending"
	}
}
