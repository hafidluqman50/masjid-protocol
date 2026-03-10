package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/masjid-chain/back-end/src/config"
	"github.com/masjid-chain/back-end/src/service"
)

// InternalKey validates X-Internal-Key against INTERNAL_SECRET env var.
func InternalKey() gin.HandlerFunc {
	secret := config.GetEnv("INTERNAL_SECRET", "")
	return func(c *gin.Context) {
		if secret == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "internal secret not configured"})
			c.Abort()
			return
		}
		if c.GetHeader("X-Internal-Key") != secret {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// JWTAuth validates Bearer JWT and sets wallet_address, role, name in context.
func JWTAuth(auth *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims, err := auth.ParseJWT(tokenStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}
		c.Set("wallet_address", claims.Address)
		c.Set("wallet_role", claims.Role)
		c.Set("wallet_name", claims.Name)
		c.Next()
	}
}

// RequireRole aborts if the JWT role does not match any of the allowed roles.
func RequireRole(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c *gin.Context) {
		role := c.GetString("wallet_role")
		if !allowed[role] {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			c.Abort()
			return
		}
		c.Next()
	}
}
