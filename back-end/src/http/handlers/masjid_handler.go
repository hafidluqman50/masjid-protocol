package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/masjid-chain/back-end/src/service"
)

type MasjidHandler struct {
	Masjid  *service.MasjidService
	CashIn  *service.CashInService
	CashOut *service.CashOutService
}

// GET /public/masjids?status=
func (h *MasjidHandler) List(c *gin.Context) {
	status := c.Query("status")
	list, err := h.Masjid.List(c.Request.Context(), status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}

// GET /public/masjids/:id
func (h *MasjidHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	reg, ok, err := h.Masjid.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": reg})
}

// GET /public/masjids/:id/attests
func (h *MasjidHandler) GetAttests(c *gin.Context) {
	id := c.Param("id")
	attests, err := h.Masjid.ListAttests(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": attests})
}

// GET /public/masjids/:id/stats
func (h *MasjidHandler) GetStats(c *gin.Context) {
	id := c.Param("id")
	stats, err := h.Masjid.GetDonationStats(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// GET /public/masjids/:id/donations?limit=
func (h *MasjidHandler) GetDonations(c *gin.Context) {
	id := c.Param("id")
	limit := 20
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	items, err := h.CashIn.ListByMasjid(c.Request.Context(), id, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

// GET /public/masjids/:id/cashouts
func (h *MasjidHandler) GetCashouts(c *gin.Context) {
	id := c.Param("id")
	items, err := h.CashOut.ListByMasjid(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}
