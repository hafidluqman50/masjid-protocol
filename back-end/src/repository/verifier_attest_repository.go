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

func (r *VerifierAttestRepository) ListByMasjid(ctx context.Context, masjidID string) ([]model.VerifierAttest, error) {
	var attests []model.VerifierAttest
	err := r.DB.WithContext(ctx).
		Where("masjid_id = ?", masjidID).
		Order("attested_at ASC").
		Find(&attests).Error
	return attests, err
}

func (r *VerifierAttestRepository) ListByVerifier(ctx context.Context, verifierAddr string) ([]model.VerifierAttest, error) {
	var attests []model.VerifierAttest
	err := r.DB.WithContext(ctx).
		Where("LOWER(verifier) = LOWER(?)", verifierAddr).
		Order("attested_at DESC").
		Find(&attests).Error
	return attests, err
}

// ListPendingForVerifier returns pending masjids this verifier hasn't attested yet.
func (r *VerifierAttestRepository) ListPendingForVerifier(ctx context.Context, verifierAddr string) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	err := r.DB.WithContext(ctx).
		Table("v_pending_registrations pr").
		Select("pr.*").
		Where(`NOT EXISTS (
			SELECT 1 FROM verifier_attests va
			WHERE va.masjid_id = pr.masjid_id
			  AND LOWER(va.verifier) = LOWER(?)
		)`, verifierAddr).
		Order("pr.registered_at DESC").
		Find(&results).Error
	return results, err
}

func (r *VerifierAttestRepository) Upsert(ctx context.Context, attest *model.VerifierAttest) error {
	return r.DB.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "masjid_id"}, {Name: "verifier"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"support", "note_hash", "yes_count", "no_count",
				"block_number", "tx_hash", "attested_at",
			}),
		}).
		Create(attest).Error
}

func (r *VerifierAttestRepository) Create(ctx context.Context, attest *model.VerifierAttest) error {
	return r.DB.WithContext(ctx).Create(attest).Error
}
