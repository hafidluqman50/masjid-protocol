package main

import (
	"log"

	"github.com/masjid-chain/back-end/src/app"
)

func main() {
	if err := app.Run(); err != nil {
		log.Fatalf("fatal: %v", err)
	}
}
