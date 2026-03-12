package model

import "time"

type User struct {
	ID        int64     `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	Address   string    `gorm:"uniqueIndex;column:address;not null" json:"address"`
	Name      string    `gorm:"column:name" json:"name"`
	Role      string    `gorm:"column:role;type:user_role;default:'guest'" json:"role"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}
