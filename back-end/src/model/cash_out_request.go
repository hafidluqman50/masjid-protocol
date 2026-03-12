package model

import "time"

type CashOutRequest struct {
	ID           int64      `gorm:"primaryKey;autoIncrement" json:"id"`
	InstanceAddr string     `gorm:"column:instance_addr" json:"instance_addr"`
	RequestID    int64      `gorm:"column:request_id" json:"request_id"`
	MasjidID     *int64     `gorm:"column:masjid_id" json:"masjid_id"`
	ToAddr       string     `gorm:"column:to_addr" json:"to_addr"`
	Amount       string     `gorm:"column:amount;type:numeric(38)" json:"amount"`
	NoteHash     string     `gorm:"column:note_hash" json:"note_hash"`
	Proposer     string     `gorm:"column:proposer" json:"proposer"`
	ExpiresAt    time.Time  `gorm:"column:expires_at" json:"expires_at"`
	Approvals    int        `gorm:"column:approvals;default:0" json:"approvals"`
	Executed     bool       `gorm:"column:executed;default:false" json:"executed"`
	Canceled     bool       `gorm:"column:canceled;default:false" json:"canceled"`
	Executor     *string    `gorm:"column:executor" json:"executor"`
	CanceledBy   *string    `gorm:"column:canceled_by" json:"canceled_by"`
	BlockNumber  int64      `gorm:"column:block_number" json:"block_number"`
	TxHash       string     `gorm:"column:tx_hash" json:"tx_hash"`
	ProposedAt   time.Time  `gorm:"column:proposed_at" json:"proposed_at"`
	SettledAt    *time.Time `gorm:"column:settled_at" json:"settled_at"`
}

func (CashOutRequest) TableName() string {
	return "cash_outs"
}
