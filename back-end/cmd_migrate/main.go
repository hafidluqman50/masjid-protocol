package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		fmt.Println("open:", err)
		os.Exit(1)
	}
	defer db.Close()

	if len(os.Args) >= 2 && os.Args[1] == "info" {
		rows, _ := db.Query(`SELECT table_name, constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name IN ('masjids','users','verifiers') ORDER BY table_name, constraint_type`)
		for rows.Next() {
			var t, c, ct string
			rows.Scan(&t, &c, &ct)
			fmt.Printf("%s | %s | %s\n", t, c, ct)
		}
		return
	}

	if len(os.Args) < 2 {
		fmt.Println("usage: migrate <sql_file> | info")
		os.Exit(1)
	}
	sqlBytes, err := os.ReadFile(os.Args[1])
	if err != nil {
		fmt.Println("read:", err)
		os.Exit(1)
	}
	if _, err := db.Exec(string(sqlBytes)); err != nil {
		fmt.Println("exec:", err)
		os.Exit(1)
	}
	fmt.Println("OK")
}
