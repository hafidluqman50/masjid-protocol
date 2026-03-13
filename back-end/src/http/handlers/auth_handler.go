package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/masjid-chain/back-end/src/config"
	"github.com/masjid-chain/back-end/src/http/request"
	"github.com/masjid-chain/back-end/src/service"
)

type AuthHandler struct {
	Auth *service.AuthService
}

func (h *AuthHandler) Nonce(c *gin.Context) {
	var q request.NonceRequest
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address required"})
		return
	}
	nonce, err := h.Auth.GenerateNonce(q.Address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	uri := config.GetEnv("APP_URI", "http://localhost:3000")
	domain := config.GetEnv("APP_DOMAIN", "localhost")
	message := h.Auth.BuildMessage(q.Address, nonce, uri, domain)
	c.JSON(http.StatusOK, gin.H{
		"nonce":   nonce,
		"message": message,
	})
}

func (h *AuthHandler) Verify(c *gin.Context) {
	var body request.VerifyRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	token, err := h.Auth.VerifyAndLogin(c.Request.Context(), body.Address, body.Message, body.Signature)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (h *AuthHandler) Me(c *gin.Context) {
	address := c.GetString("wallet_address")
	user, ok, err := h.Auth.GetMe(c.Request.Context(), address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": user})
}

func (h *AuthHandler) ClaimBoardRole(c *gin.Context) {
	address := c.GetString("wallet_address")
	token, err := h.Auth.ClaimBoardRole(c.Request.Context(), address)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (h *AuthHandler) UpdateName(c *gin.Context) {
	address := c.GetString("wallet_address")
	var body request.UpdateNameRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.Auth.UpdateName(c.Request.Context(), address, body.Name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	token, err := h.Auth.RefreshToken(c.Request.Context(), address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token})
}
