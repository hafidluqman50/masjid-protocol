package repository

import (
	"context"
	"errors"

	"github.com/masjid-chain/back-end/src/model"
	"gorm.io/gorm"
)

type CheckpointRepository struct {
	DB *gorm.DB
}

func (r *CheckpointRepository) Get(ctx context.Context, contractName string) (model.IndexerCheckpoint, bool, error) {
	var cp model.IndexerCheckpoint
	err := r.DB.WithContext(ctx).Where("contract_name = ?", contractName).First(&cp).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return cp, false, nil
	}
	return cp, err == nil, err
}

func (r *CheckpointRepository) Upsert(ctx context.Context, cp *model.IndexerCheckpoint) error {
	return r.DB.WithContext(ctx).Save(cp).Error
}
