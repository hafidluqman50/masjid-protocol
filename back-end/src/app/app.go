package app

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/masjid-chain/back-end/src/config"
)

func Run() error {
	handler, cleanup, err := buildHandler(context.Background())
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := cleanup(); closeErr != nil {
			log.Printf("close db: %v", closeErr)
		}
	}()

	port := strings.TrimSpace(config.GetEnv("PORT", "8080"))
	if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}

	server := &http.Server{
		Addr:              port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("server listening on %s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("server: %w", err)
	}

	return nil
}
