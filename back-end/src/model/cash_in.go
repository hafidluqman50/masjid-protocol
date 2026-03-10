package model

import "time"

type CashIn struct {
	ID           int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	InstanceAddr string    `gorm:"column:instance_addr" json:"instance_addr"`
	MasjidID     *string   `gorm:"column:masjid_id" json:"masjid_id"`
	Donor        string    `gorm:"column:donor" json:"donor"`
	Amount       string    `gorm:"column:amount;type:numeric(38)" json:"amount"`
	NewBalance   string    `gorm:"column:new_balance;type:numeric(38)" json:"new_balance"`
	NoteHash     string    `gorm:"column:note_hash" json:"note_hash"`
	BlockNumber  int64     `gorm:"column:block_number" json:"block_number"`
	TxHash       string    `gorm:"column:tx_hash" json:"tx_hash"`
	DonatedAt    time.Time `gorm:"column:donated_at" json:"donated_at"`
}

func (CashIn) TableName() string {
	return "cash_ins"
}
