package indexer

import (
	"context"
	"log"
	"strings"

	"github.com/masjid-chain/back-end/src/http/request"
)

// processInstances indexes events from all known MasjidInstance contracts.
func (idx *Indexer) processInstances(ctx context.Context, head uint64) error {
	// Load all known instance addresses from DB on each tick so newly
	// registered masjids are picked up automatically.
	instances, err := idx.repos.Masjid.ListInstanceAddresses(ctx)
	if err != nil || len(instances) == 0 {
		return err
	}

	from := idx.fromBlock(ctx, "MasjidInstance")
	if from > head {
		return nil
	}

	allTopics := []interface{}{[]interface{}{
		topicCashIn,
		topicCashOutProposed,
		topicCashOutApproved,
		topicCashOutExecuted,
		topicCashOutCanceled,
		topicBoardMemberUpdated,
	}}

	for from <= head {
		to := from + chunkSize - 1
		if to > head {
			to = head
		}

		logs, err := idx.rpc.getLogs(ctx, LogFilter{
			FromBlock: uint64ToHex(from),
			ToBlock:   uint64ToHex(to),
			Address:   instances,
			Topics:    allTopics,
		})
		if err != nil {
			return err
		}

		for _, l := range logs {
			if len(l.Topics) == 0 {
				continue
			}
			switch l.Topics[0] {
			case topicCashIn:
				if err := idx.handleCashIn(ctx, l); err != nil {
					log.Printf("[indexer] handleCashIn tx=%s: %v", l.TxHash, err)
				}
			case topicCashOutProposed:
				if err := idx.handleCashOutProposed(ctx, l); err != nil {
					log.Printf("[indexer] handleCashOutProposed tx=%s: %v", l.TxHash, err)
				}
			case topicCashOutApproved:
				if err := idx.handleCashOutApproved(ctx, l); err != nil {
					log.Printf("[indexer] handleCashOutApproved tx=%s: %v", l.TxHash, err)
				}
			case topicCashOutExecuted:
				if err := idx.handleCashOutExecuted(ctx, l); err != nil {
					log.Printf("[indexer] handleCashOutExecuted tx=%s: %v", l.TxHash, err)
				}
			case topicCashOutCanceled:
				if err := idx.handleCashOutCanceled(ctx, l); err != nil {
					log.Printf("[indexer] handleCashOutCanceled tx=%s: %v", l.TxHash, err)
				}
			case topicBoardMemberUpdated:
				if err := idx.handleBoardMemberUpdated(ctx, l); err != nil {
					log.Printf("[indexer] handleBoardMemberUpdated tx=%s: %v", l.TxHash, err)
				}
			}
		}

		idx.saveCheckpoint(ctx, "MasjidInstance", "multi", to)
		from = to + 1
	}
	return nil
}

// ---------------------------------------------------------------------------
// MasjidInstance event handlers
// ---------------------------------------------------------------------------

func (idx *Indexer) handleCashIn(ctx context.Context, l Log) error {
	if len(l.Topics) < 2 {
		return nil
	}
	data       := stripData(l.Data)
	instanceAddr := strings.ToLower(l.Address)
	donor      := topicToAddr(l.Topics[1])
	amount     := slotToUint256Str(data, 0)
	newBalance := slotToUint256Str(data, 1)
	noteHash   := slotToBytes32(data, 2)

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.CashInEvent{
		InstanceAddr: instanceAddr,
		Donor:        donor,
		Amount:       amount,
		NewBalance:   newBalance,
		NoteHash:     noteHash,
		BlockNumber:  int64(blockNum),
		TxHash:       strings.ToLower(l.TxHash),
		Timestamp:    ts,
	}
	return idx.eventSvc.HandleCashIn(ctx, ev)
}

func (idx *Indexer) handleCashOutProposed(ctx context.Context, l Log) error {
	if len(l.Topics) < 4 {
		return nil
	}
	data         := stripData(l.Data)
	instanceAddr := strings.ToLower(l.Address)
	requestID    := topicToBigInt(l.Topics[1]).Int64()
	proposer     := topicToAddr(l.Topics[2])
	toAddr       := topicToAddr(l.Topics[3])
	amount       := slotToUint256Str(data, 0)
	noteHash     := slotToBytes32(data, 1)
	expiresAt    := slotToInt64(data, 2)

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.CashOutProposedEvent{
		InstanceAddr: instanceAddr,
		RequestID:    requestID,
		ToAddr:       toAddr,
		Amount:       amount,
		NoteHash:     noteHash,
		Proposer:     proposer,
		ExpiresAt:    expiresAt,
		BlockNumber:  int64(blockNum),
		TxHash:       strings.ToLower(l.TxHash),
		Timestamp:    ts,
	}
	return idx.eventSvc.HandleCashOutProposed(ctx, ev)
}

func (idx *Indexer) handleCashOutApproved(ctx context.Context, l Log) error {
	if len(l.Topics) < 3 {
		return nil
	}
	data         := stripData(l.Data)
	instanceAddr := strings.ToLower(l.Address)
	requestID    := topicToBigInt(l.Topics[1]).Int64()
	approver     := topicToAddr(l.Topics[2])
	approvals    := slotToInt(data, 0)

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.CashOutApprovedEvent{
		InstanceAddr: instanceAddr,
		RequestID:    requestID,
		Approver:     approver,
		Approvals:    approvals,
		BlockNumber:  int64(blockNum),
		TxHash:       strings.ToLower(l.TxHash),
		Timestamp:    ts,
	}
	return idx.eventSvc.HandleCashOutApproved(ctx, ev)
}

func (idx *Indexer) handleCashOutExecuted(ctx context.Context, l Log) error {
	if len(l.Topics) < 3 {
		return nil
	}
	instanceAddr := strings.ToLower(l.Address)
	requestID    := topicToBigInt(l.Topics[1]).Int64()
	executor     := topicToAddr(l.Topics[2])

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.CashOutExecutedEvent{
		InstanceAddr: instanceAddr,
		RequestID:    requestID,
		Executor:     executor,
		BlockNumber:  int64(blockNum),
		TxHash:       strings.ToLower(l.TxHash),
		Timestamp:    ts,
	}
	return idx.eventSvc.HandleCashOutExecuted(ctx, ev)
}

func (idx *Indexer) handleCashOutCanceled(ctx context.Context, l Log) error {
	if len(l.Topics) < 3 {
		return nil
	}
	instanceAddr := strings.ToLower(l.Address)
	requestID    := topicToBigInt(l.Topics[1]).Int64()
	canceledBy   := topicToAddr(l.Topics[2])

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.CashOutCanceledEvent{
		InstanceAddr: instanceAddr,
		RequestID:    requestID,
		CanceledBy:   canceledBy,
		BlockNumber:  int64(blockNum),
		TxHash:       strings.ToLower(l.TxHash),
		Timestamp:    ts,
	}
	return idx.eventSvc.HandleCashOutCanceled(ctx, ev)
}

func (idx *Indexer) handleBoardMemberUpdated(ctx context.Context, l Log) error {
	if len(l.Topics) < 2 {
		return nil
	}
	data         := stripData(l.Data)
	instanceAddr := strings.ToLower(l.Address)
	member       := topicToAddr(l.Topics[1])
	allowed      := slotToBool(data, 0)

	blockNum := blockNumFromLog(l)
	ts       := idx.timestamp(ctx, blockNum)

	ev := request.BoardMemberUpdatedEvent{
		InstanceAddr: instanceAddr,
		Member:       member,
		Allowed:      allowed,
		BlockNumber:  int64(blockNum),
		TxHash:       strings.ToLower(l.TxHash),
		Timestamp:    ts,
	}
	return idx.eventSvc.HandleBoardMemberUpdated(ctx, ev)
}
