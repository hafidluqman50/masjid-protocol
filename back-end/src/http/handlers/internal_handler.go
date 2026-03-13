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

func (h *InternalHandler) MasjidRegistered(c *gin.Context) {
	var ev request.MasjidRegisteredEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleMasjidRegistered(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *InternalHandler) MasjidAttested(c *gin.Context) {
	var ev request.MasjidAttestedEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleMasjidAttested(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *InternalHandler) MasjidRejected(c *gin.Context) {
	var ev request.MasjidRejectedEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleMasjidRejected(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *InternalHandler) MasjidVerified(c *gin.Context) {
	var ev request.MasjidVerifiedEvent
	if err := c.ShouldBindJSON(&ev); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Event.HandleMasjidVerified(c.Request.Context(), ev); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

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
