package repository

import (
	"context"

	"github.com/masjid-chain/back-end/src/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type VerifierAttestRepository struct {
	DB *gorm.DB
}

func (r *VerifierAttestRepository) ListByMasjid(ctx context.Context, masjidBytes32 string) ([]model.MasjidAttest, error) {
	var attests []model.MasjidAttest
	err := r.DB.WithContext(ctx).
		Joins("JOIN masjids m ON m.id = masjid_attests.masjid_id").
		Where("m.masjid_id = ?", masjidBytes32).
		Order("attested_at ASC").
		Find(&attests).Error
	return attests, err
}

func (r *VerifierAttestRepository) ListByVerifier(ctx context.Context, verifierAddr string) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	err := r.DB.WithContext(ctx).
		Table("masjid_attests ma").
		Select("ma.id, m.masjid_id, m.masjid_name, ma.verifier, ma.support, ma.yes_count, ma.no_count, ma.block_number, ma.tx_hash, ma.attested_at").
		Joins("LEFT JOIN masjids m ON m.id = ma.masjid_id").
		Where("LOWER(ma.verifier) = LOWER(?)", verifierAddr).
		Order("ma.attested_at DESC").
		Find(&results).Error
	return results, err
}

func (r *VerifierAttestRepository) ListPendingForVerifier(ctx context.Context, verifierAddr string) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	err := r.DB.WithContext(ctx).
		Table("v_pending_registrations pr").
		Select("pr.*").
		Where(`NOT EXISTS (
			SELECT 1 FROM masjid_attests ma
			WHERE ma.masjid_id = pr.id
			  AND LOWER(ma.verifier) = LOWER(?)
		)`, verifierAddr).
		Order("pr.registered_at DESC").
		Find(&results).Error
	return results, err
}

func (r *VerifierAttestRepository) Upsert(ctx context.Context, attest *model.MasjidAttest) error {
	return r.DB.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "masjid_id"}, {Name: "verifier"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"support", "yes_count", "no_count",
				"block_number", "tx_hash", "attested_at",
			}),
		}).
		Create(attest).Error
}
