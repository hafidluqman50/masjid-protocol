package repository

import (
	"context"

	"github.com/masjid-chain/back-end/src/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type BoardMemberRepository struct {
	DB *gorm.DB
}

func (r *BoardMemberRepository) Upsert(ctx context.Context, m *model.BoardMember) error {
	return r.DB.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "member_addr"}, {Name: "instance_addr"}},
			DoUpdates: clause.AssignmentColumns([]string{"is_active", "block_number", "tx_hash"}),
		}).
		Create(m).Error
}

func (r *BoardMemberRepository) ListByInstance(ctx context.Context, instanceAddr string) ([]model.BoardMember, error) {
	var members []model.BoardMember
	err := r.DB.WithContext(ctx).
		Where("LOWER(instance_addr) = LOWER(?) AND is_active = TRUE", instanceAddr).
		Order("added_at ASC").
		Find(&members).Error
	return members, err
}

func (r *BoardMemberRepository) FindInstancesByMember(ctx context.Context, memberAddr string) ([]string, error) {
	var addrs []string
	err := r.DB.WithContext(ctx).
		Model(&model.BoardMember{}).
		Where("LOWER(member_addr) = LOWER(?) AND is_active = TRUE", memberAddr).
		Pluck("instance_addr", &addrs).Error
	return addrs, err
}
