package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/masjid-chain/back-end/src/http/request"
	"github.com/masjid-chain/back-end/src/service"
)

type InternalHandler struct {
	Event *service.EventService
}

// POST /internal/events/registration
func (h *InternalHandler) Registration(c *gin.Context) {
	var ev request.RegistrationEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleRegistration(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /internal/events/attest
func (h *InternalHandler) Attest(c *gin.Context) {
	var ev request.AttestEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleAttest(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /internal/events/status
func (h *InternalHandler) Status(c *gin.Context) {
	var ev request.StatusEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleStatus(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /internal/events/cash-in
func (h *InternalHandler) CashIn(c *gin.Context) {
	var ev request.CashInEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleCashIn(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /internal/events/cashout-proposed
func (h *InternalHandler) CashOutProposed(c *gin.Context) {
	var ev request.CashOutProposedEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleCashOutProposed(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /internal/events/cashout-approved
func (h *InternalHandler) CashOutApproved(c *gin.Context) {
	var ev request.CashOutApprovedEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleCashOutApproved(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /internal/events/cashout-executed
func (h *InternalHandler) CashOutExecuted(c *gin.Context) {
	var ev request.CashOutExecutedEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleCashOutExecuted(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /internal/events/cashout-canceled
func (h *InternalHandler) CashOutCanceled(c *gin.Context) {
	var ev request.CashOutCanceledEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleCashOutCanceled(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /internal/events/board-member-updated
func (h *InternalHandler) BoardMemberUpdated(c *gin.Context) {
	var ev request.BoardMemberUpdatedEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleBoardMemberUpdated(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /internal/events/verifier-added
func (h *InternalHandler) VerifierAdded(c *gin.Context) {
	var ev request.VerifierAddedEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleVerifierAdded(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// POST /internal/events/verifier-removed
func (h *InternalHandler) VerifierRemoved(c *gin.Context) {
	var ev request.VerifierRemovedEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleVerifierRemoved(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GET /internal/checkpoint/:contract
func (h *InternalHandler) GetCheckpoint(c *gin.Context) {
	name := c.Param("contract")
	cp, ok, err := h.Event.GetCheckpoint(c.Request.Context(), name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "checkpoint not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": cp})
}

// PUT /internal/checkpoint/:contract
func (h *InternalHandler) UpdateCheckpoint(c *gin.Context) {
	name := c.Param("contract")
	var body request.CheckpointUpdate
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.UpdateCheckpoint(c.Request.Context(), name, body); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
