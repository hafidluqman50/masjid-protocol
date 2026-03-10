package main

import (
	"context"
	"log"

	"github.com/joho/godotenv"
	"github.com/masjid-chain/back-end/src/app"
	"github.com/masjid-chain/back-end/src/config"
)

func main() {
	_ = godotenv.Load()

	ctx := context.Background()

	db, err := config.NewDatabase(ctx)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	server := app.NewServer(db)
	port := config.GetEnv("PORT", "8080")

	log.Printf("server starting on :%s", port)
	if err := server.Run(":" + port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
