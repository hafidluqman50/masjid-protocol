package model

import "time"

type MasjidAttest struct {
	ID          int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	MasjidID    int64     `gorm:"column:masjid_id" json:"masjid_id"`
	Verifier    string    `gorm:"column:verifier" json:"verifier"`
	Support     bool      `gorm:"column:support" json:"support"`
	YesCount    int       `gorm:"column:yes_count;default:0" json:"yes_count"`
	NoCount     int       `gorm:"column:no_count;default:0" json:"no_count"`
	BlockNumber int64     `gorm:"column:block_number" json:"block_number"`
	TxHash      string    `gorm:"column:tx_hash" json:"tx_hash"`
	AttestedAt  time.Time `gorm:"column:attested_at" json:"attested_at"`
}

func (MasjidAttest) TableName() string {
	return "masjid_attests"
}
