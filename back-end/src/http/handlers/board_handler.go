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

func (h *BoardHandler) resolveMasjid(c *gin.Context) (string, bool) {
	addr := c.GetString("wallet_address")
	regs, err := h.Masjid.GetByMember(c.Request.Context(), addr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return "", false
	}
	if len(regs) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "no masjid found for this wallet"})
		return "", false
	}
	if len(regs) == 1 {
		return regs[0].MasjidID, true
	}
	id := c.Query("masjid_id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "multiple masjids found, specify masjid_id query param"})
		return "", false
	}
	for _, r := range regs {
		if r.MasjidID == id {
			return id, true
		}
	}
	c.JSON(http.StatusForbidden, gin.H{"error": "masjid_id not managed by this wallet"})
	return "", false
}

func (h *BoardHandler) GetMyMasjid(c *gin.Context) {
	addr := c.GetString("wallet_address")
	regs, err := h.Masjid.GetByMember(c.Request.Context(), addr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": regs})
}

func (h *BoardHandler) GetMyStats(c *gin.Context) {
	masjidID, ok := h.resolveMasjid(c)
	if !ok {
		return
	}
	stats, err := h.Masjid.GetDonationStats(c.Request.Context(), masjidID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

func (h *BoardHandler) GetMyAttests(c *gin.Context) {
	masjidID, ok := h.resolveMasjid(c)
	if !ok {
		return
	}
	attests, err := h.Masjid.ListAttests(c.Request.Context(), masjidID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": attests})
}

func (h *BoardHandler) GetMyDonations(c *gin.Context) {
	masjidID, ok := h.resolveMasjid(c)
	if !ok {
		return
	}
	limit := 20
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	items, err := h.CashIn.ListByMasjid(c.Request.Context(), masjidID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *BoardHandler) GetMyCashouts(c *gin.Context) {
	masjidID, ok := h.resolveMasjid(c)
	if !ok {
		return
	}
	items, err := h.CashOut.ListByMasjid(c.Request.Context(), masjidID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *BoardHandler) GetMyPendingCashouts(c *gin.Context) {
	masjidID, ok := h.resolveMasjid(c)
	if !ok {
		return
	}
	items, err := h.CashOut.ListPendingByMasjid(c.Request.Context(), masjidID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}
