package model

import "time"

type Verifier struct {
	Address     string     `gorm:"primaryKey;column:address" json:"address"`
	Label       string     `gorm:"column:label" json:"label"`
	IsActive    bool       `gorm:"column:is_active;default:true" json:"is_active"`
	AddedAt     time.Time  `gorm:"column:added_at" json:"added_at"`
	RemovedAt   *time.Time `gorm:"column:removed_at" json:"removed_at"`
	BlockNumber int64      `gorm:"column:block_number" json:"block_number"`
	TxHash      string     `gorm:"column:tx_hash" json:"tx_hash"`
}

func (Verifier) TableName() string {
	return "verifiers"
}
