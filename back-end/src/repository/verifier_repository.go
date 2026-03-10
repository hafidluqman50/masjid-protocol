package repository

import (
	"context"
	"errors"

	"github.com/masjid-chain/back-end/src/model"
	"gorm.io/gorm"
)

type VerifierRepository struct {
	DB *gorm.DB
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
	err := r.DB.WithContext(ctx).Where("address = ?", address).First(&v).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return v, false, nil
	}
	return v, err == nil, err
}

func (r *VerifierRepository) Upsert(ctx context.Context, v *model.Verifier) error {
	return r.DB.WithContext(ctx).Save(v).Error
}
