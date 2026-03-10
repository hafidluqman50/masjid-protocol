package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/masjid-chain/back-end/src/service"
)

type BoardHandler struct {
	Masjid  *service.MasjidService
	CashIn  *service.CashInService
	CashOut *service.CashOutService
}

// GET /board/masjid
func (h *BoardHandler) GetMyMasjid(c *gin.Context) {
	addr := c.GetString("wallet_address")
	reg, ok, err := h.Masjid.GetByAdmin(c.Request.Context(), addr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "no masjid found for this wallet"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": reg})
}

// GET /board/stats
func (h *BoardHandler) GetMyStats(c *gin.Context) {
	addr := c.GetString("wallet_address")
	reg, ok, err := h.Masjid.GetByAdmin(c.Request.Context(), addr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "no masjid found for this wallet"})
		return
	}
	stats, err := h.Masjid.GetDonationStats(c.Request.Context(), reg.MasjidID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// GET /board/attests
func (h *BoardHandler) GetMyAttests(c *gin.Context) {
	addr := c.GetString("wallet_address")
	reg, ok, err := h.Masjid.GetByAdmin(c.Request.Context(), addr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "no masjid found for this wallet"})
		return
	}
	attests, err := h.Masjid.ListAttests(c.Request.Context(), reg.MasjidID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": attests})
}

// GET /board/donations?limit=
func (h *BoardHandler) GetMyDonations(c *gin.Context) {
	addr := c.GetString("wallet_address")
	reg, ok, err := h.Masjid.GetByAdmin(c.Request.Context(), addr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "no masjid found for this wallet"})
		return
	}
	limit := 20
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	items, err := h.CashIn.ListByMasjid(c.Request.Context(), reg.MasjidID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

// GET /board/cashouts
func (h *BoardHandler) GetMyCashouts(c *gin.Context) {
	addr := c.GetString("wallet_address")
	reg, ok, err := h.Masjid.GetByAdmin(c.Request.Context(), addr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "no masjid found for this wallet"})
		return
	}
	items, err := h.CashOut.ListByMasjid(c.Request.Context(), reg.MasjidID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

// GET /board/cashouts/pending
func (h *BoardHandler) GetMyPendingCashouts(c *gin.Context) {
	addr := c.GetString("wallet_address")
	reg, ok, err := h.Masjid.GetByAdmin(c.Request.Context(), addr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "no masjid found for this wallet"})
		return
	}
	items, err := h.CashOut.ListPendingByMasjid(c.Request.Context(), reg.MasjidID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}
