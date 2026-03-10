package model

import "time"

type User struct {
	Address   string    `gorm:"primaryKey;column:address" json:"address"`
	Name      string    `gorm:"column:name" json:"name"`
	Role      string    `gorm:"column:role;type:user_role;default:'guest'" json:"role"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}
