package repository

import (
	"context"
	"time"

	"github.com/masjid-chain/back-end/src/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

func (r *CashOutRepository) ListPendingByMasjid(ctx context.Context, masjidID string) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	err := r.DB.WithContext(ctx).Table("v_pending_cashouts").
		Where("masjid_id = ?", masjidID).
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

func (r *CashOutRepository) UpsertRequest(ctx context.Context, req *model.CashOutRequest) error {
	return r.DB.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "instance_addr"}, {Name: "request_id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"masjid_id", "to_addr", "amount", "note_hash", "proposer",
				"expires_at", "approvals", "executed", "canceled",
				"executor", "canceled_by", "block_number", "tx_hash",
				"proposed_at", "settled_at",
			}),
		}).
		Create(req).Error
}

func (r *CashOutRepository) UpsertApproval(ctx context.Context, approval *model.CashOutApproval) error {
	return r.DB.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "instance_addr"}, {Name: "request_id"}, {Name: "approver"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"approvals", "block_number", "tx_hash", "approved_at",
			}),
		}).
		Create(approval).Error
}

func (r *CashOutRepository) MarkExecuted(ctx context.Context, instanceAddr string, requestID int64, executor string, settledAt time.Time) error {
	return r.DB.WithContext(ctx).
		Model(&model.CashOutRequest{}).
		Where("instance_addr = ? AND request_id = ?", instanceAddr, requestID).
		Updates(map[string]interface{}{
			"executed":   true,
			"executor":   executor,
			"settled_at": settledAt,
		}).Error
}

func (r *CashOutRepository) MarkCanceled(ctx context.Context, instanceAddr string, requestID int64, canceledBy string, settledAt time.Time) error {
	return r.DB.WithContext(ctx).
		Model(&model.CashOutRequest{}).
		Where("instance_addr = ? AND request_id = ?", instanceAddr, requestID).
		Updates(map[string]interface{}{
			"canceled":    true,
			"canceled_by": canceledBy,
			"settled_at":  settledAt,
		}).Error
}
