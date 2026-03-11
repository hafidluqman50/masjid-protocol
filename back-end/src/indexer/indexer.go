package indexer

import (
	"context"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/masjid-chain/back-end/src/config"
	"github.com/masjid-chain/back-end/src/repository"
	"github.com/masjid-chain/back-end/src/service"
)

const (
	chunkSize    = uint64(500)
	pollInterval = 5 * time.Second
)

// event topics — computed once at init
var (
	topicMasjidRegistered    string
	topicMasjidAttested      string
	topicMasjidStatusUpdated string
	topicCashIn              string
	topicCashOutProposed     string
	topicCashOutApproved     string
	topicCashOutExecuted     string
	topicCashOutCanceled     string
	topicBoardMemberUpdated  string
	topicVerifierAdded       string
	topicVerifierRemoved     string

	selMasjidName  string
	selMetadataUri string
)

func init() {
	topicMasjidRegistered    = eventTopic("MasjidRegistered(bytes32,bytes32,address,address,address,address,address)")
	topicMasjidAttested      = eventTopic("MasjidAttested(bytes32,address,bool,bytes32,uint32,uint32)")
	topicMasjidStatusUpdated = eventTopic("MasjidStatusUpdated(bytes32,uint8,uint8)")
	topicCashIn              = eventTopic("CashIn(address,uint256,uint256,bytes32)")
	topicCashOutProposed     = eventTopic("CashOutProposed(uint256,address,address,uint256,bytes32,uint64)")
	topicCashOutApproved     = eventTopic("CashOutApproved(uint256,address,uint32)")
	topicCashOutExecuted     = eventTopic("CashOutExecuted(uint256,address)")
	topicCashOutCanceled     = eventTopic("CashOutCanceled(uint256,address)")
	topicBoardMemberUpdated  = eventTopic("BoardMemberUpdated(address,bool)")
	topicVerifierAdded       = eventTopic("VerifierAdded(address,string)")
	topicVerifierRemoved     = eventTopic("VerifierRemoved(address)")

	selMasjidName  = fnSelector("masjidName()")
	selMetadataUri = fnSelector("metadataUri()")
}

// Indexer polls Base Sepolia and pushes decoded events into the EventService.
type Indexer struct {
	rpc      *RPCClient
	repos    repository.Registry
	eventSvc *service.EventService

	protocol   string // lowercase hex address
	registry   string // lowercase hex address
	startBlock uint64

	tsCache   map[uint64]int64
	tsCacheMu sync.Mutex
}

func New(repos repository.Registry, eventSvc *service.EventService) *Indexer {
	rpcURL     := config.GetEnv("RPC_URL", "")
	protocol   := strings.ToLower(config.GetEnv("MASJID_PROTOCOL_ADDRESS", ""))
	registry   := strings.ToLower(config.GetEnv("VERIFIER_REGISTRY_ADDRESS", ""))
	startStr   := config.GetEnv("INDEXER_START_BLOCK", "0")
	startBlock, _ := strconv.ParseUint(startStr, 10, 64)

	return &Indexer{
		rpc:        newRPCClient(rpcURL),
		repos:      repos,
		eventSvc:   eventSvc,
		protocol:   protocol,
		registry:   registry,
		startBlock: startBlock,
		tsCache:    make(map[uint64]int64),
	}
}

// Run starts the polling loop. It blocks until ctx is cancelled.
func (idx *Indexer) Run(ctx context.Context) {
	if idx.rpc.url == "" || idx.protocol == "" {
		log.Println("[indexer] RPC_URL or MASJID_PROTOCOL_ADDRESS not set — indexer disabled")
		return
	}

	log.Printf("[indexer] starting (protocol=%s registry=%s startBlock=%d)",
		idx.protocol, idx.registry, idx.startBlock)

	// run once immediately, then on ticker
	idx.tick(ctx)

	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[indexer] stopped")
			return
		case <-ticker.C:
			idx.tick(ctx)
		}
	}
}

func (idx *Indexer) tick(ctx context.Context) {
	head, err := idx.rpc.blockNumber(ctx)
	if err != nil {
		log.Printf("[indexer] blockNumber: %v", err)
		return
	}
	if head < 2 {
		return
	}
	safeHead := head - 1

	if err := idx.processProtocol(ctx, safeHead); err != nil {
		log.Printf("[indexer] protocol: %v", err)
	}
	if idx.registry != "" {
		if err := idx.processRegistry(ctx, safeHead); err != nil {
			log.Printf("[indexer] registry: %v", err)
		}
	}
	if err := idx.processInstances(ctx, safeHead); err != nil {
		log.Printf("[indexer] instances: %v", err)
	}
}

// fromBlock returns the next block to process for the given contract.
func (idx *Indexer) fromBlock(ctx context.Context, name string) uint64 {
	cp, found, err := idx.repos.Checkpoint.Get(ctx, name)
	if err != nil || !found {
		return idx.startBlock
	}
	next := uint64(cp.LastBlock) + 1
	if next < idx.startBlock {
		return idx.startBlock
	}
	return next
}

// saveCheckpoint advances the checkpoint for a contract.
func (idx *Indexer) saveCheckpoint(ctx context.Context, name, addr string, block uint64) {
	cp, _, _ := idx.repos.Checkpoint.Get(ctx, name)
	cp.ContractName = name
	cp.ContractAddr = addr
	cp.LastBlock = int64(block)
	if err := idx.repos.Checkpoint.Upsert(ctx, &cp); err != nil {
		log.Printf("[indexer] checkpoint save %s: %v", name, err)
	}
}

// timestamp fetches (with cache) the block timestamp as Unix seconds.
func (idx *Indexer) timestamp(ctx context.Context, blockNum uint64) int64 {
	idx.tsCacheMu.Lock()
	if ts, ok := idx.tsCache[blockNum]; ok {
		idx.tsCacheMu.Unlock()
		return ts
	}
	idx.tsCacheMu.Unlock()

	ts, err := idx.rpc.blockTimestamp(ctx, blockNum)
	if err != nil {
		return 0
	}

	idx.tsCacheMu.Lock()
	if len(idx.tsCache) > 300 {
		idx.tsCache = make(map[uint64]int64)
	}
	idx.tsCache[blockNum] = ts
	idx.tsCacheMu.Unlock()

	return ts
}

// blockNumFromLog parses the hex blockNumber field in a Log.
func blockNumFromLog(l Log) uint64 {
	n, _ := parseHexUint64(l.BlockNumber)
	return n
}
