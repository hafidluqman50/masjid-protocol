package request

// RegistrationEvent mirrors the MasjidRegistered on-chain event.
type RegistrationEvent struct {
	MasjidID     string `json:"masjid_id" binding:"required"`
	NameHash     string `json:"name_hash" binding:"required"`
	MasjidName   string `json:"masjid_name" binding:"required"`
	Proposer     string `json:"proposer" binding:"required"`
	MasjidAdmin  string `json:"masjid_admin" binding:"required"`
	InstanceAddr string `json:"instance_addr" binding:"required"`
	VaultAddr    string `json:"vault_addr" binding:"required"`
	Stablecoin   string `json:"stablecoin" binding:"required"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

// AttestEvent mirrors the Attested on-chain event.
type AttestEvent struct {
	MasjidID    string `json:"masjid_id" binding:"required"`
	Verifier    string `json:"verifier" binding:"required"`
	Support     bool   `json:"support"`
	NoteHash    string `json:"note_hash" binding:"required"`
	YesCount    int    `json:"yes_count"`
	NoCount     int    `json:"no_count"`
	BlockNumber int64  `json:"block_number" binding:"required"`
	TxHash      string `json:"tx_hash" binding:"required"`
	Timestamp   int64  `json:"timestamp" binding:"required"`
}

// StatusEvent mirrors Verified / Revoked / Flagged on-chain events.
type StatusEvent struct {
	MasjidID    string `json:"masjid_id" binding:"required"`
	Status      string `json:"status" binding:"required"` // verified | revoked | flagged
	BlockNumber int64  `json:"block_number" binding:"required"`
	TxHash      string `json:"tx_hash" binding:"required"`
	Timestamp   int64  `json:"timestamp" binding:"required"`
}

// CashInEvent mirrors the Donated on-chain event.
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

// CashOutProposedEvent mirrors the CashOutProposed on-chain event.
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

// CashOutApprovedEvent mirrors the CashOutApproved on-chain event.
type CashOutApprovedEvent struct {
	InstanceAddr string `json:"instance_addr" binding:"required"`
	RequestID    int64  `json:"request_id" binding:"required"`
	Approver     string `json:"approver" binding:"required"`
	Approvals    int    `json:"approvals"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

// CashOutExecutedEvent mirrors the CashOutExecuted on-chain event.
type CashOutExecutedEvent struct {
	InstanceAddr string `json:"instance_addr" binding:"required"`
	RequestID    int64  `json:"request_id" binding:"required"`
	Executor     string `json:"executor" binding:"required"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

// CashOutCanceledEvent mirrors the CashOutCanceled on-chain event.
type CashOutCanceledEvent struct {
	InstanceAddr string `json:"instance_addr" binding:"required"`
	RequestID    int64  `json:"request_id" binding:"required"`
	CanceledBy   string `json:"canceled_by" binding:"required"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

// VerifierAddedEvent mirrors the VerifierAdded on-chain event.
type VerifierAddedEvent struct {
	Address     string `json:"address" binding:"required"`
	Label       string `json:"label"`
	BlockNumber int64  `json:"block_number" binding:"required"`
	TxHash      string `json:"tx_hash" binding:"required"`
	Timestamp   int64  `json:"timestamp" binding:"required"`
}

// VerifierRemovedEvent mirrors the VerifierRemoved on-chain event.
type VerifierRemovedEvent struct {
	Address     string `json:"address" binding:"required"`
	BlockNumber int64  `json:"block_number" binding:"required"`
	TxHash      string `json:"tx_hash" binding:"required"`
	Timestamp   int64  `json:"timestamp" binding:"required"`
}

// BoardMemberUpdatedEvent mirrors the BoardMemberUpdated on-chain event from MasjidInstance.
type BoardMemberUpdatedEvent struct {
	InstanceAddr string `json:"instance_addr" binding:"required"`
	Member       string `json:"member" binding:"required"`
	Allowed      bool   `json:"allowed"`
	BlockNumber  int64  `json:"block_number" binding:"required"`
	TxHash       string `json:"tx_hash" binding:"required"`
	Timestamp    int64  `json:"timestamp" binding:"required"`
}

// CheckpointUpdate is used to advance the indexer cursor.
type CheckpointUpdate struct {
	ContractAddr string `json:"contract_addr" binding:"required"`
	LastBlock    int64  `json:"last_block" binding:"required"`
}

// VerifierLabelUpdate is used by admin to set/change a verifier's human label.
type VerifierLabelUpdate struct {
	Label string `json:"label" binding:"required"`
}
