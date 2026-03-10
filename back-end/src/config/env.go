package config

import (
	"fmt"
	"os"
	"strings"
)

func GetEnv(key, fallback string) string {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return fallback
	}
	return val
}

func RequireEnv(key string) (string, error) {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return "", fmt.Errorf("required env var %s is not set", key)
	}
	return val, nil
}
