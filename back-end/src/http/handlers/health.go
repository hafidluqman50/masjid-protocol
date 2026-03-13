package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type HealthHandler struct {
	DB *gorm.DB
}

func (h *HealthHandler) Healthz(c *gin.Context) {
	dbOK := false
	if h.DB != nil {
		sqlDB, err := h.DB.DB()
		if err == nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
			defer cancel()
			dbOK = sqlDB.PingContext(ctx) == nil
		}
	}

	status := http.StatusOK
	if !dbOK {
		status = http.StatusServiceUnavailable
	}

	c.JSON(status, gin.H{
		"status": "ok",
		"db":     gin.H{"connected": dbOK},
	})
}
