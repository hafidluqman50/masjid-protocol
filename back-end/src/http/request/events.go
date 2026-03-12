package request

type MasjidRegisteredEvent struct {
	MasjidID         string `json:"masjid_id" binding:"required"`
	NameHash         string `json:"name_hash" binding:"required"`
	Proposer         string `json:"proposer" binding:"required"`
	MasjidName       string `json:"masjid_name" binding:"required"`
	MetadataUri      string `json:"metadata_uri"`
	Stablecoin       string `json:"stablecoin" binding:"required"`
	CashOutThreshold int64  `json:"cash_out_threshold"`
	BlockNumber      int64  `json:"block_number" binding:"required"`
	TxHash           string `json:"tx_hash" binding:"required"`
	Timestamp        int64  `json:"timestamp" binding:"required"`
}

type MasjidAttestedEvent struct {
	MasjidID    string `json:"masjid_id" binding:"required"`
	Verifier    string `json:"verifier" binding:"required"`
	Support     bool   `json:"support"`
	YesCount    int    `json:"yes_count"`
	NoCount     int    `json:"no_count"`
	BlockNumber int64  `json:"block_number" binding:"required"`
	TxHash      string `json:"tx_hash" binding:"required"`
	Timestamp   int64  `json:"timestamp" binding:"required"`
}

type MasjidRejectedEvent struct {
	MasjidID    string `json:"masjid_id" binding:"required"`
	YesCount    int    `json:"yes_count"`
	NoCount     int    `json:"no_count"`
	BlockNumber int64  `json:"block_number" binding:"required"`
	TxHash      string `json:"tx_hash" binding:"required"`
	Timestamp   int64  `json:"timestamp" binding:"required"`
}

type MasjidVerifiedEvent struct {
	MasjidID     string `json:"masjid_id" binding:"required"`
	InstanceAddr string `json:"instance_addr" binding:"required"`
	YesCount     int    `json:"yes_count"`
	NoCount      int    `json:"no_count"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

type StatusEvent struct {
	MasjidID    string `json:"masjid_id" binding:"required"`
	Status      string `json:"status" binding:"required"`
	BlockNumber int64  `json:"block_number" binding:"required"`
	TxHash      string `json:"tx_hash" binding:"required"`
	Timestamp   int64  `json:"timestamp" binding:"required"`
}

type CashInEvent struct {
	InstanceAddr string `json:"instance_addr" binding:"required"`
	Donor        string `json:"donor" binding:"required"`
	Amount       string `json:"amount" binding:"required"`
	NewBalance   string `json:"new_balance" binding:"required"`
	NoteHash     string `json:"note_hash" binding:"required"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

type CashOutProposedEvent struct {
	InstanceAddr string `json:"instance_addr" binding:"required"`
	RequestID    int64  `json:"request_id" binding:"required"`
	ToAddr       string `json:"to_addr" binding:"required"`
	Amount       string `json:"amount" binding:"required"`
	NoteHash     string `json:"note_hash" binding:"required"`
	Proposer     string `json:"proposer" binding:"required"`
	ExpiresAt    int64  `json:"expires_at" binding:"required"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

type CashOutApprovedEvent struct {
	InstanceAddr string `json:"instance_addr" binding:"required"`
	RequestID    int64  `json:"request_id" binding:"required"`
	Approver     string `json:"approver" binding:"required"`
	Approvals    int    `json:"approvals"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

type CashOutExecutedEvent struct {
	InstanceAddr string `json:"instance_addr" binding:"required"`
	RequestID    int64  `json:"request_id" binding:"required"`
	Executor     string `json:"executor" binding:"required"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

type CashOutCanceledEvent struct {
	InstanceAddr string `json:"instance_addr" binding:"required"`
	RequestID    int64  `json:"request_id" binding:"required"`
	CanceledBy   string `json:"canceled_by" binding:"required"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

type VerifierAddedEvent struct {
	Address     string `json:"address" binding:"required"`
	Label       string `json:"label"`
	BlockNumber int64  `json:"block_number" binding:"required"`
	TxHash      string `json:"tx_hash" binding:"required"`
	Timestamp   int64  `json:"timestamp" binding:"required"`
}

type VerifierRemovedEvent struct {
	Address     string `json:"address" binding:"required"`
	BlockNumber int64  `json:"block_number" binding:"required"`
	TxHash      string `json:"tx_hash" binding:"required"`
	Timestamp   int64  `json:"timestamp" binding:"required"`
}

type BoardMemberUpdatedEvent struct {
	InstanceAddr string `json:"instance_addr" binding:"required"`
	Member       string `json:"member" binding:"required"`
	Allowed      bool   `json:"allowed"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

type CheckpointUpdate struct {
	ContractAddr string `json:"contract_addr" binding:"required"`
	LastBlock    int64  `json:"last_block" binding:"required"`
}

type VerifierLabelUpdate struct {
	Label string `json:"label" binding:"required"`
}
