package repository

import (
	"context"
	"errors"

	"github.com/masjid-chain/back-end/src/model"
	"gorm.io/gorm"
)

type MasjidRepository struct {
	DB *gorm.DB
}

type MasjidSummary struct {
	model.MasjidRegistration
	TotalDonors     int    `json:"total_donors"`
	TotalDonated    string `json:"total_donated"`
	LatestBalance   string `json:"latest_balance"`
	PendingCashouts int    `json:"pending_cashouts"`
}

func (r *MasjidRepository) FindByID(ctx context.Context, masjidID string) (model.MasjidRegistration, bool, error) {
	var reg model.MasjidRegistration
	err := r.DB.WithContext(ctx).Where("masjid_id = ?", masjidID).First(&reg).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return reg, false, nil
	}
	return reg, err == nil, err
}

func (r *MasjidRepository) List(ctx context.Context, status string) ([]MasjidSummary, error) {
	var results []MasjidSummary
	q := r.DB.WithContext(ctx).Table("v_masjid_summary")
	if status != "" {
		q = q.Where("status = ?", status)
	}
	err := q.Order("registered_at DESC").Scan(&results).Error
	return results, err
}

func (r *MasjidRepository) ListPending(ctx context.Context) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	err := r.DB.WithContext(ctx).Table("v_pending_registrations").
		Order("registered_at DESC").
		Find(&results).Error
	return results, err
}

func (r *MasjidRepository) GetDonationStats(ctx context.Context, masjidID string) (map[string]interface{}, error) {
	var result map[string]interface{}
	err := r.DB.WithContext(ctx).Table("v_masjid_donation_stats").
		Where("masjid_id = ?", masjidID).
		Take(&result).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return result, err
}

func (r *MasjidRepository) Create(ctx context.Context, reg *model.MasjidRegistration) error {
	return r.DB.WithContext(ctx).Create(reg).Error
}

func (r *MasjidRepository) Update(ctx context.Context, reg *model.MasjidRegistration) error {
	return r.DB.WithContext(ctx).Save(reg).Error
}
