package repository

import (
	"context"

	"github.com/masjid-chain/back-end/src/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

func (r *CashInRepository) ListByDonor(ctx context.Context, donorAddr string, limit int) ([]DonationFeedItem, error) {
	var items []DonationFeedItem
	q := r.DB.WithContext(ctx).Table("v_donation_feed").
		Where("LOWER(donor) = LOWER(?)", donorAddr).
		Order("donated_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	err := q.Scan(&items).Error
	return items, err
}

func (r *CashInRepository) Upsert(ctx context.Context, cashIn *model.CashIn) error {
	return r.DB.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "tx_hash"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"instance_addr", "masjid_id", "donor", "amount",
				"new_balance", "note_hash", "block_number", "donated_at",
			}),
		}).
		Create(cashIn).Error
}
