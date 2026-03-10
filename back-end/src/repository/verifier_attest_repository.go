package repository

import (
	"context"

	"github.com/masjid-chain/back-end/src/model"
	"gorm.io/gorm"
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

func (r *VerifierAttestRepository) Create(ctx context.Context, attest *model.VerifierAttest) error {
	return r.DB.WithContext(ctx).Create(attest).Error
}
