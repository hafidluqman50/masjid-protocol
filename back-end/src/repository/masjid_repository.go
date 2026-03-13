package repository

import (
	"context"
	"errors"
	"time"

	"github.com/masjid-chain/back-end/src/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type MasjidRepository struct {
	DB *gorm.DB
}

type MasjidSummary struct {
	model.Masjid
	TotalDonors     int    `json:"total_donors"`
	TotalDonated    string `json:"total_donated"`
	LatestBalance   string `json:"latest_balance"`
	PendingCashouts int    `json:"pending_cashouts"`
}

func (r *MasjidRepository) FindByID(ctx context.Context, masjidID string) (model.Masjid, bool, error) {
	var m model.Masjid
	err := r.DB.WithContext(ctx).Where("masjid_id = ?", masjidID).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return m, false, nil
	}
	return m, err == nil, err
}

func (r *MasjidRepository) FindByAdmin(ctx context.Context, adminAddr string) (model.Masjid, bool, error) {
	var m model.Masjid
	err := r.DB.WithContext(ctx).
		Where("LOWER(masjid_admin) = LOWER(?)", adminAddr).
		First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return m, false, nil
	}
	return m, err == nil, err
}

func (r *MasjidRepository) FindByInstance(ctx context.Context, instanceAddr string) (model.Masjid, bool, error) {
	var m model.Masjid
	err := r.DB.WithContext(ctx).
		Where("LOWER(instance_addr) = LOWER(?)", instanceAddr).
		First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return m, false, nil
	}
	return m, err == nil, err
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

func (r *MasjidRepository) Upsert(ctx context.Context, m *model.Masjid) error {
	return r.DB.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "masjid_id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"name_hash", "masjid_name", "metadata_uri", "masjid_admin",
				"instance_addr", "vault_addr", "stablecoin", "cash_out_threshold",
				"status", "attest_yes", "attest_no", "block_number", "tx_hash",
				"registered_at", "verified_at", "updated_at",
			}),
		}).
		Create(m).Error
}

func (r *MasjidRepository) UpdateStatus(ctx context.Context, masjidID string, status string, verifiedAt *time.Time) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now().UTC(),
	}
	if verifiedAt != nil {
		updates["verified_at"] = verifiedAt
	}
	return r.DB.WithContext(ctx).
		Model(&model.Masjid{}).
		Where("masjid_id = ?", masjidID).
		Updates(updates).Error
}

func (r *MasjidRepository) UpdateVerified(ctx context.Context, masjidID string, instanceAddr string, verifiedAt time.Time) error {
	return r.DB.WithContext(ctx).
		Model(&model.Masjid{}).
		Where("masjid_id = ?", masjidID).
		Updates(map[string]interface{}{
			"instance_addr": instanceAddr,
			"status":        "verified",
			"verified_at":   verifiedAt,
			"updated_at":    verifiedAt,
		}).Error
}

func (r *MasjidRepository) UpdateAttestCounts(ctx context.Context, masjidID string, yesCount, noCount int) error {
	return r.DB.WithContext(ctx).
		Model(&model.Masjid{}).
		Where("masjid_id = ?", masjidID).
		Updates(map[string]interface{}{
			"attest_yes": yesCount,
			"attest_no":  noCount,
			"updated_at": time.Now().UTC(),
		}).Error
}

func (r *MasjidRepository) Create(ctx context.Context, m *model.Masjid) error {
	return r.DB.WithContext(ctx).Create(m).Error
}

func (r *MasjidRepository) Update(ctx context.Context, m *model.Masjid) error {
	return r.DB.WithContext(ctx).Save(m).Error
}

func (r *MasjidRepository) ListInstanceAddresses(ctx context.Context) ([]string, error) {
	var addrs []string
	err := r.DB.WithContext(ctx).
		Model(&model.Masjid{}).
		Where("instance_addr IS NOT NULL").
		Pluck("instance_addr", &addrs).Error
	return addrs, err
}
