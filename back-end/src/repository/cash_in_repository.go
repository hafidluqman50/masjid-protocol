package repository

import (
	"context"

	"gorm.io/gorm"
)

type CashInRepository struct {
	DB *gorm.DB
}

type DonationFeedItem struct {
	ID           int64  `json:"id"`
	InstanceAddr string `json:"instance_addr"`
	MasjidID     string `json:"masjid_id"`
	Donor        string `json:"donor"`
	Amount       string `json:"amount"`
	NewBalance   string `json:"new_balance"`
	NoteHash     string `json:"note_hash"`
	DonatedAt    string `json:"donated_at"`
	TxHash       string `json:"tx_hash"`
	BlockNumber  int64  `json:"block_number"`
	MasjidName   string `json:"masjid_name"`
	Stablecoin   string `json:"stablecoin"`
}

func (r *CashInRepository) ListByMasjid(ctx context.Context, masjidID string, limit int) ([]DonationFeedItem, error) {
	var items []DonationFeedItem
	q := r.DB.WithContext(ctx).Table("v_donation_feed").
		Where("masjid_id = ?", masjidID).
		Order("donated_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	err := q.Scan(&items).Error
	return items, err
}
