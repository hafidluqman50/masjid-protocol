package model

import "time"

type BoardMember struct {
	ID           int64     `gorm:"primaryKey;column:id;autoIncrement" json:"id"`
	MemberAddr   string    `gorm:"column:member_addr;uniqueIndex:uniq_member_instance" json:"member_addr"`
	InstanceAddr string    `gorm:"column:instance_addr;uniqueIndex:uniq_member_instance" json:"instance_addr"`
	IsActive     bool      `gorm:"column:is_active;default:true" json:"is_active"`
	AddedAt      time.Time `gorm:"column:added_at" json:"added_at"`
	BlockNumber  int64     `gorm:"column:block_number" json:"block_number"`
	TxHash       string    `gorm:"column:tx_hash" json:"tx_hash"`
}

func (BoardMember) TableName() string {
	return "board_members"
}
