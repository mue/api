package utils

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
	"github.com/sirupsen/logrus"
)

func ConnectDB(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
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

// loadAndConnectDB loads environment variables and connects to the database
func LoadAndConnectDB(dbPath string) *sql.DB {
	log := logrus.New()

	if dbPath == "" {
		log.Fatalf("Database path is not set")
	}

	db, err := ConnectDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to connect to database %s: %v", dbPath, err)
	}

	log.WithFields(logrus.Fields{
		"dbPath": dbPath,
	}).Info("Connected to database")

	InitDB(db)
	return db
}
