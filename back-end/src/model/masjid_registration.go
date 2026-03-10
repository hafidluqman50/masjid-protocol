package model

import "time"

type MasjidRegistration struct {
	MasjidID     string    `gorm:"primaryKey;column:masjid_id" json:"masjid_id"`
	NameHash     string    `gorm:"column:name_hash" json:"name_hash"`
	Proposer     string    `gorm:"column:proposer" json:"proposer"`
	MasjidAdmin  string    `gorm:"column:masjid_admin" json:"masjid_admin"`
	InstanceAddr string    `gorm:"column:instance_addr;uniqueIndex" json:"instance_addr"`
	VaultAddr    string    `gorm:"column:vault_addr" json:"vault_addr"`
	Stablecoin   string    `gorm:"column:stablecoin" json:"stablecoin"`
	MasjidName   string    `gorm:"column:masjid_name" json:"masjid_name"`
	MetadataUri  string    `gorm:"column:metadata_uri" json:"metadata_uri"`
	AttestYes    int       `gorm:"column:attest_yes;default:0" json:"attest_yes"`
	AttestNo     int       `gorm:"column:attest_no;default:0" json:"attest_no"`
	Status       string    `gorm:"column:status;type:registration_status;default:'pending'" json:"status"`
	BlockNumber  int64     `gorm:"column:block_number" json:"block_number"`
	TxHash       string    `gorm:"column:tx_hash" json:"tx_hash"`
	RegisteredAt time.Time `gorm:"column:registered_at" json:"registered_at"`
	VerifiedAt   *time.Time `gorm:"column:verified_at" json:"verified_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (MasjidRegistration) TableName() string {
	return "masjid_registrations"
}
