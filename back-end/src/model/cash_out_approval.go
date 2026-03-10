package model

import "time"

type CashOutApproval struct {
	ID           int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	InstanceAddr string    `gorm:"column:instance_addr" json:"instance_addr"`
	RequestID    int64     `gorm:"column:request_id" json:"request_id"`
	Approver     string    `gorm:"column:approver" json:"approver"`
	Approvals    int       `gorm:"column:approvals" json:"approvals"`
	BlockNumber  int64     `gorm:"column:block_number" json:"block_number"`
	TxHash       string    `gorm:"column:tx_hash" json:"tx_hash"`
	ApprovedAt   time.Time `gorm:"column:approved_at" json:"approved_at"`
}

func (CashOutApproval) TableName() string {
	return "cash_out_approvals"
}
