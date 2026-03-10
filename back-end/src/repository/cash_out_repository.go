package repository

import (
	"context"

	"gorm.io/gorm"
)

type CashOutRepository struct {
	DB *gorm.DB
}

func (r *CashOutRepository) ListPending(ctx context.Context) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	err := r.DB.WithContext(ctx).Table("v_pending_cashouts").
		Order("proposed_at DESC").
		Find(&results).Error
	return results, err
}

func (r *CashOutRepository) ListByMasjid(ctx context.Context, masjidID string) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	err := r.DB.WithContext(ctx).Table("v_cashout_history").
		Where("masjid_id = ?", masjidID).
		Order("proposed_at DESC").
		Find(&results).Error
	return results, err
}
