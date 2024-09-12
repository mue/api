package utils

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
	"github.com/sirupsen/logrus"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

func ConnectDB(dbURL string, token string) (*sql.DB, error) {
	url := dbURL + "?authToken=" + token

	db, err := sql.Open("libsql", url)
	if err != nil {
		return nil, err
	}

	// Ping the database to ensure the connection is established
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

// InitDB ensures the connection to the database is established
func InitDB(db *sql.DB) {
	// Check if the connection to the database is established
	err := db.Ping()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
}

// LoadAndConnectDB loads environment variables and connects to the database
func LoadAndConnectDB(dbURL string, token string) *sql.DB {
	log := logrus.New()

	if dbURL == "" {
		log.Fatalf("Database path is not set")
	}

	if token == "" {
		log.Fatalf("Token is not set")
	}

	db, err := ConnectDB(dbURL, token)
	if err != nil {
		log.Fatalf("Failed to connect to database %s: %v", dbURL, err)
	}

	log.WithFields(logrus.Fields{
		"dbPath": dbURL,
	}).Info("Connected to database")

	InitDB(db)
	return db
}
