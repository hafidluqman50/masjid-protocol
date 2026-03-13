package repository

import (
	"context"
	"errors"
	"time"

	"github.com/masjid-chain/back-end/src/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type VerifierRepository struct {
	DB *gorm.DB
}

func (r *VerifierRepository) List(ctx context.Context) ([]model.Verifier, error) {
	var verifiers []model.Verifier
	err := r.DB.WithContext(ctx).Order("added_at ASC").Find(&verifiers).Error
	return verifiers, err
}

func (r *VerifierRepository) ListActive(ctx context.Context) ([]model.Verifier, error) {
	var verifiers []model.Verifier
	err := r.DB.WithContext(ctx).
		Where("is_active = ?", true).
		Order("added_at ASC").
		Find(&verifiers).Error
	return verifiers, err
}

func (r *VerifierRepository) FindByAddress(ctx context.Context, address string) (model.Verifier, bool, error) {
	var v model.Verifier
	err := r.DB.WithContext(ctx).
		Where("LOWER(address) = LOWER(?)", address).
		First(&v).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return v, false, nil
	}
	return v, err == nil, err
}

func (r *VerifierRepository) Upsert(ctx context.Context, v *model.Verifier) error {
	return r.DB.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "address"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"label", "is_active", "removed_at", "block_number", "tx_hash",
			}),
		}).
		Create(v).Error
}

func (r *VerifierRepository) UpdateLabel(ctx context.Context, address string, label string) error {
	return r.DB.WithContext(ctx).
		Model(&model.Verifier{}).
		Where("LOWER(address) = LOWER(?)", address).
		Update("label", label).Error
}

func (r *VerifierRepository) Deactivate(ctx context.Context, address string, removedAt time.Time) error {
	return r.DB.WithContext(ctx).
		Model(&model.Verifier{}).
		Where("LOWER(address) = LOWER(?)", address).
		Updates(map[string]interface{}{
			"is_active":  false,
			"removed_at": removedAt,
		}).Error
}
