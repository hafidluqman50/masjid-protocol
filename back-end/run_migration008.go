package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
)

func main() {
	dbURL := "postgresql://postgres.amxkzxzcfvzgoznuzqhu:masjidChain_123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
	// if dbURL == "" {
	// 	log.Fatal("DATABASE_URL not set")
	// }

	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer conn.Close(ctx)

	sql, err := os.ReadFile("/home/hafidlh/masjid-protocol/back-end/migrations/008_schema_rework.sql")
	if err != nil {
		log.Fatalf("read file: %v", err)
	}

	// Split on semicolons and execute each statement individually
	// to avoid transaction issues with ALTER TYPE ADD VALUE
	statements := strings.Split(string(sql), ";")
	for i, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		// Collect non-comment lines to check if there's actual SQL
		lines := strings.Split(stmt, "\n")
		var nonComment []string
		for _, l := range lines {
			l = strings.TrimSpace(l)
			if l != "" && !strings.HasPrefix(l, "--") {
				nonComment = append(nonComment, l)
			}
		}
		if len(nonComment) == 0 {
			continue
		}

		first := nonComment[0]
		if len(first) > 60 {
			first = first[:60]
		}
		fmt.Printf("[%d] Executing: %s...\n", i+1, first)
		_, err := conn.Exec(ctx, stmt)
		if err != nil {
			log.Fatalf("statement %d failed:\n%s\nError: %v", i+1, stmt, err)
		}
	}

	fmt.Println("Migration 008 completed successfully!")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
