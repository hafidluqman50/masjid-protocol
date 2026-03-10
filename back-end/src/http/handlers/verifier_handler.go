package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/masjid-chain/back-end/src/service"
)

type VerifierHandler struct {
	Verifier       *service.VerifierService
	VerifierAttest *service.VerifierAttestService
}

// GET /public/verifiers
func (h *VerifierHandler) ListActive(c *gin.Context) {
	verifiers, err := h.Verifier.ListActive(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": verifiers})
}

// GET /verifier/me  (JWT required, role=verifier)
func (h *VerifierHandler) GetMe(c *gin.Context) {
	addr := c.GetString("wallet_address")
	v, ok, err := h.Verifier.FindByAddress(c.Request.Context(), addr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "verifier not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": v})
}

// GET /verifier/queue  (JWT required, role=verifier)
func (h *VerifierHandler) GetQueue(c *gin.Context) {
	addr := c.GetString("wallet_address")
	queue, err := h.VerifierAttest.ListPendingForVerifier(c.Request.Context(), addr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": queue})
}

// GET /verifier/history  (JWT required, role=verifier)
func (h *VerifierHandler) GetHistory(c *gin.Context) {
	addr := c.GetString("wallet_address")
	attests, err := h.VerifierAttest.ListByVerifier(c.Request.Context(), addr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": attests})
}
