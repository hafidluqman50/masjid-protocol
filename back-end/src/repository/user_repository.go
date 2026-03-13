package repository

import (
	"context"
	"errors"
	"time"

	"github.com/masjid-chain/back-end/src/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UserRepository struct {
	DB *gorm.DB
}

func (r *UserRepository) FindByAddress(ctx context.Context, address string) (model.User, bool, error) {
	var u model.User
	err := r.DB.WithContext(ctx).
		Where("LOWER(address) = LOWER(?)", address).
		First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return u, false, nil
	}
	return u, err == nil, err
}

func (r *UserRepository) Upsert(ctx context.Context, u *model.User) error {
	return r.DB.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "address"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "role", "updated_at"}),
		}).
		Create(u).Error
}

func (r *UserRepository) UpdateName(ctx context.Context, address string, name string) error {
	return r.DB.WithContext(ctx).
		Model(&model.User{}).
		Where("LOWER(address) = LOWER(?)", address).
		Updates(map[string]interface{}{
			"name":       name,
			"updated_at": time.Now().UTC(),
		}).Error
}

func (r *UserRepository) UpdateRole(ctx context.Context, address string, role string) error {
	return r.DB.WithContext(ctx).
		Model(&model.User{}).
		Where("LOWER(address) = LOWER(?)", address).
		Updates(map[string]interface{}{
			"role":       role,
			"updated_at": time.Now().UTC(),
		}).Error
}
