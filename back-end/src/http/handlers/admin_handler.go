package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/masjid-chain/back-end/src/http/request"
	"github.com/masjid-chain/back-end/src/service"
)

type AdminHandler struct {
	Masjid   *service.MasjidService
	Verifier *service.VerifierService
	CashOut  *service.CashOutService
}

func (h *AdminHandler) ListMasjids(c *gin.Context) {
	status := c.Query("status")
	list, err := h.Masjid.List(c.Request.Context(), status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func (h *AdminHandler) ListPendingMasjids(c *gin.Context) {
	list, err := h.Masjid.ListPending(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func (h *AdminHandler) GetMasjid(c *gin.Context) {
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

func (h *AdminHandler) GetMasjidAttests(c *gin.Context) {
	id := c.Param("id")
	attests, err := h.Masjid.ListAttests(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": attests})
}

func (h *AdminHandler) ListVerifiers(c *gin.Context) {
	verifiers, err := h.Verifier.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": verifiers})
}

func (h *AdminHandler) UpdateVerifierLabel(c *gin.Context) {
	address := c.Param("address")
	var body request.VerifierLabelUpdate
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Verifier.UpdateLabel(c.Request.Context(), address, body.Label); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *AdminHandler) ListPendingCashouts(c *gin.Context) {
	list, err := h.CashOut.ListPending(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list})
}
