package app

import (
	"context"
	"fmt"
	"net/http"

	"github.com/joho/godotenv"
	"github.com/masjid-chain/back-end/src/config"
	"github.com/masjid-chain/back-end/src/http/routes"
	"github.com/masjid-chain/back-end/src/repository"
	"github.com/masjid-chain/back-end/src/service"
)

func buildHandler(ctx context.Context) (http.Handler, func() error, error) {
	_ = godotenv.Load()

	db, err := config.NewDatabase(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("db: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, nil, fmt.Errorf("sql db: %w", err)
	}

	jwtSecret := []byte(config.GetEnv("JWT_SECRET", "change-me-in-production"))

	repos := repository.NewRegistry(db)
	svc := service.NewRegistry(repos, jwtSecret)

	router := routes.SetupRouter(db, repos, svc)

	return router, func() error { return sqlDB.Close() }, nil
}
