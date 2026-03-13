//go:build ignore

package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func check() {
	db, err := sql.Open("pgx", os.Getenv("DATABASE_URL"))
	if err != nil {
		panic(err)
	}
	rows, _ := db.Query(`SELECT table_name, constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name IN ('masjids','users','verifiers') ORDER BY table_name, constraint_type`)
	for rows.Next() {
		var t, c, ct string
		rows.Scan(&t, &c, &ct)
		fmt.Printf("%s | %s | %s\n", t, c, ct)
	}
}
