package model

import "time"

type IndexerCheckpoint struct {
	ID           int       `gorm:"primaryKey;autoIncrement" json:"id"`
	ContractName string    `gorm:"column:contract_name;uniqueIndex" json:"contract_name"`
	ContractAddr string    `gorm:"column:contract_addr" json:"contract_addr"`
	LastBlock    int64     `gorm:"column:last_block;default:0" json:"last_block"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (IndexerCheckpoint) TableName() string {
	return "indexer_checkpoints"
}
