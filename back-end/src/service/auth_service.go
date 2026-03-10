package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	dcrececdsa "github.com/decred/dcrd/dcrec/secp256k1/v4/ecdsa"
	"github.com/golang-jwt/jwt/v5"
	"github.com/masjid-chain/back-end/src/model"
	"github.com/masjid-chain/back-end/src/repository"
	"golang.org/x/crypto/sha3"
)

const (
	nonceTTL    = 5 * time.Minute
	jwtTTL      = 24 * time.Hour
	siweVersion = "1"
	siweChainID = "84532" // Base Sepolia
)

type nonceEntry struct {
	address  string
	issuedAt time.Time
}

type Claims struct {
	Address string `json:"address"`
	Name    string `json:"name"`
	Role    string `json:"role"`
	jwt.RegisteredClaims
}

type AuthService struct {
	User      *repository.UserRepository
	JWTSecret []byte
	nonces    sync.Map
}

func (s *AuthService) GenerateNonce(address string) (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	nonce := hex.EncodeToString(b)
	s.nonces.Store(nonce, nonceEntry{
		address:  strings.ToLower(address),
		issuedAt: time.Now(),
	})
	return nonce, nil
}

func (s *AuthService) BuildMessage(address, nonce, uri, domain string) string {
	issuedAt := time.Now().UTC().Format(time.RFC3339)
	return fmt.Sprintf(
		"%s wants you to sign in with your Ethereum account:\n%s\n\nSign in to Masjid Protocol\n\nURI: %s\nVersion: %s\nChain ID: %s\nNonce: %s\nIssued At: %s",
		domain, address, uri, siweVersion, siweChainID, nonce, issuedAt,
	)
}

func (s *AuthService) VerifyAndLogin(ctx context.Context, address, message, signature string) (string, error) {
	// Extract nonce from message
	nonce, err := extractNonce(message)
	if err != nil {
		return "", errors.New("invalid message: nonce not found")
	}

	// Validate nonce
	raw, ok := s.nonces.Load(nonce)
	if !ok {
		return "", errors.New("invalid or expired nonce")
	}
	entry := raw.(nonceEntry)
	if time.Since(entry.issuedAt) > nonceTTL {
		s.nonces.Delete(nonce)
		return "", errors.New("nonce expired")
	}
	if entry.address != strings.ToLower(address) {
		s.nonces.Delete(nonce)
		return "", errors.New("address mismatch")
	}
	s.nonces.Delete(nonce)

	// Verify signature
	recovered, err := recoverAddress(message, signature)
	if err != nil {
		return "", fmt.Errorf("signature verification failed: %w", err)
	}
	if !strings.EqualFold(recovered, address) {
		return "", errors.New("signature does not match address")
	}

	// Upsert user
	user, exists, err := s.User.FindByAddress(ctx, address)
	if err != nil {
		return "", err
	}
	if !exists {
		user = model.User{
			Address:   strings.ToLower(address),
			Role:      "guest",
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
		if err := s.User.Upsert(ctx, &user); err != nil {
			return "", err
		}
	}

	return s.issueJWT(user)
}

func (s *AuthService) ParseJWT(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.JWTSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func (s *AuthService) GetMe(ctx context.Context, address string) (model.User, bool, error) {
	return s.User.FindByAddress(ctx, address)
}

func (s *AuthService) UpdateName(ctx context.Context, address, name string) error {
	return s.User.UpdateName(ctx, address, name)
}

func (s *AuthService) RefreshToken(ctx context.Context, address string) (string, error) {
	user, ok, err := s.User.FindByAddress(ctx, address)
	if err != nil {
		return "", err
	}
	if !ok {
		return "", errors.New("user not found")
	}
	return s.issueJWT(user)
}

func (s *AuthService) issueJWT(user model.User) (string, error) {
	claims := Claims{
		Address: user.Address,
		Name:    user.Name,
		Role:    user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(jwtTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.Address,
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.JWTSecret)
}

// recoverAddress recovers the Ethereum address from an EIP-191 personal_sign signature.
// Signature must be hex-encoded (with or without 0x prefix), 65 bytes: [R | S | V].
func recoverAddress(message, signature string) (string, error) {
	sigBytes, err := hex.DecodeString(strings.TrimPrefix(signature, "0x"))
	if err != nil {
		return "", fmt.Errorf("decode signature: %w", err)
	}
	if len(sigBytes) != 65 {
		return "", errors.New("invalid signature length: expected 65 bytes")
	}

	// Normalize V: Ethereum uses 27/28; secp256k1 recovery expects 0/1
	v := sigBytes[64]
	if v >= 27 {
		v -= 27
	}
	if v > 1 {
		return "", errors.New("invalid recovery id")
	}

	// Compute Ethereum personal_sign hash: keccak256("\x19Ethereum Signed Message:\n{len}{msg}")
	prefix := fmt.Sprintf("\x19Ethereum Signed Message:\n%d", len(message))
	hash := keccak256Hash([]byte(prefix + message))

	// Build secp256k1 compact signature: [27+v | R | S]
	compact := make([]byte, 65)
	compact[0] = 27 + v
	copy(compact[1:33], sigBytes[0:32])  // R
	copy(compact[33:65], sigBytes[32:64]) // S

	pubKey, _, err := dcrececdsa.RecoverCompact(compact, hash)
	if err != nil {
		return "", fmt.Errorf("recover pubkey: %w", err)
	}

	// Derive Ethereum address: keccak256(uncompressed_pub[1:])[12:]
	uncompressed := pubKey.SerializeUncompressed() // 65 bytes, starts with 0x04
	addrBytes := keccak256Hash(uncompressed[1:])[12:]
	return "0x" + hex.EncodeToString(addrBytes), nil
}

func keccak256Hash(data []byte) []byte {
	h := sha3.NewLegacyKeccak256()
	h.Write(data)
	return h.Sum(nil)
}

func extractNonce(message string) (string, error) {
	for _, line := range strings.Split(message, "\n") {
		if strings.HasPrefix(line, "Nonce: ") {
			return strings.TrimPrefix(line, "Nonce: "), nil
		}
	}
	return "", errors.New("nonce not found in message")
}
