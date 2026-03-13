package indexer

import (
	"context"
	"log"
	"strings"

	"github.com/masjid-chain/back-end/src/http/request"
)

func (idx *Indexer) processProtocol(ctx context.Context, head uint64) error {
	from := idx.fromBlock(ctx, "MasjidProtocol")
	if from > head {
		return nil
	}

	topics := []interface{}{[]interface{}{
		topicMasjidRegistered,
		topicMasjidAttested,
		topicMasjidRejected,
		topicMasjidVerified,
		topicMasjidStatusUpdated,
	}}

	for from <= head {
		to := from + chunkSize - 1
		if to > head {
			to = head
		}

		logs, err := idx.rpc.getLogs(ctx, LogFilter{
			FromBlock: uint64ToHex(from),
			ToBlock:   uint64ToHex(to),
			Address:   []string{idx.protocol},
			Topics:    topics,
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
				if err := idx.handleMasjidRegistered(ctx, l); err != nil {
					log.Printf("[indexer] handleMasjidRegistered tx=%s: %v", l.TxHash, err)
				}
			case topicMasjidAttested:
				if err := idx.handleMasjidAttested(ctx, l); err != nil {
					log.Printf("[indexer] handleMasjidAttested tx=%s: %v", l.TxHash, err)
				}
			case topicMasjidRejected:
				if err := idx.handleMasjidRejected(ctx, l); err != nil {
					log.Printf("[indexer] handleMasjidRejected tx=%s: %v", l.TxHash, err)
				}
			case topicMasjidVerified:
				if err := idx.handleMasjidVerified(ctx, l); err != nil {
					log.Printf("[indexer] handleMasjidVerified tx=%s: %v", l.TxHash, err)
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

func (idx *Indexer) handleMasjidRegistered(ctx context.Context, l Log) error {
	if len(l.Topics) < 4 {
		return nil
	}
	data := stripData(l.Data)

	masjidID    := topicToBytes32(l.Topics[1])
	nameHash    := topicToBytes32(l.Topics[2])
	proposer    := topicToAddr(l.Topics[3])
	masjidName  := decodeABIString(data, 0)
	metadataUri := decodeABIString(data, 1)
	stablecoin  := slotToAddr(data, 2)
	boardMembersLen := decodeABIArrayLength(data, 3)
	cashOutThreshold := int64(boardMembersLen/2 + 1)

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.MasjidRegisteredEvent{
		MasjidID:         masjidID,
		NameHash:         nameHash,
		Proposer:         proposer,
		MasjidName:       masjidName,
		MetadataUri:      metadataUri,
		Stablecoin:       stablecoin,
		CashOutThreshold: cashOutThreshold,
		BlockNumber:      int64(blockNum),
		TxHash:           strings.ToLower(l.TxHash),
		Timestamp:        ts,
	}
	return idx.eventSvc.HandleMasjidRegistered(ctx, ev)
}

func (idx *Indexer) handleMasjidAttested(ctx context.Context, l Log) error {
	if len(l.Topics) < 3 {
		return nil
	}
	data := stripData(l.Data)

	masjidID := topicToBytes32(l.Topics[1])
	verifier  := topicToAddr(l.Topics[2])
	support   := slotToBool(data, 0)
	yesCount  := slotToInt(data, 1)
	noCount   := slotToInt(data, 2)

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.MasjidAttestedEvent{
		MasjidID:    masjidID,
		Verifier:    verifier,
		Support:     support,
		YesCount:    yesCount,
		NoCount:     noCount,
		BlockNumber: int64(blockNum),
		TxHash:      strings.ToLower(l.TxHash),
		Timestamp:   ts,
	}
	return idx.eventSvc.HandleMasjidAttested(ctx, ev)
}

func (idx *Indexer) handleMasjidRejected(ctx context.Context, l Log) error {
	if len(l.Topics) < 2 {
		return nil
	}
	data := stripData(l.Data)

	masjidID := topicToBytes32(l.Topics[1])
	yesCount  := slotToInt(data, 1)
	noCount   := slotToInt(data, 2)

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.MasjidRejectedEvent{
		MasjidID:    masjidID,
		YesCount:    yesCount,
		NoCount:     noCount,
		BlockNumber: int64(blockNum),
		TxHash:      strings.ToLower(l.TxHash),
		Timestamp:   ts,
	}
	return idx.eventSvc.HandleMasjidRejected(ctx, ev)
}

func (idx *Indexer) handleMasjidVerified(ctx context.Context, l Log) error {
	if len(l.Topics) < 3 {
		return nil
	}
	data := stripData(l.Data)

	masjidID := topicToBytes32(l.Topics[1])
	instance  := topicToAddr(l.Topics[2])
	yesCount  := slotToInt(data, 1)
	noCount   := slotToInt(data, 2)

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.MasjidVerifiedEvent{
		MasjidID:     masjidID,
		InstanceAddr: instance,
		YesCount:     yesCount,
		NoCount:      noCount,
		BlockNumber:  int64(blockNum),
		TxHash:       strings.ToLower(l.TxHash),
		Timestamp:    ts,
	}
	return idx.eventSvc.HandleMasjidVerified(ctx, ev)
}

func (idx *Indexer) handleStatus(ctx context.Context, l Log) error {
	if len(l.Topics) < 2 {
		return nil
	}
	data := stripData(l.Data)

	masjidID  := topicToBytes32(l.Topics[1])
	newStatus := masjidStatusStr(uint8(slotToInt(data, 1)))

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

func masjidStatusStr(v uint8) string {
	switch v {
	case 1:
		return "pending"
	case 2:
		return "rejected"
	case 3:
		return "verified"
	case 4:
		return "flagged"
	case 5:
		return "revoked"
	default:
		return "none"
	}
}
