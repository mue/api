package utils

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/tursodatabase/go-libsql"
)

func ConnectDB(localFile string, dbURL string, token string) (*sql.DB, error) {
	primaryUrl := dbURL + "?authToken=" + token

	connector, err := libsql.NewEmbeddedReplicaConnector(
		localFile,
		primaryUrl,
		libsql.WithAuthToken(token),
		libsql.WithSyncInterval(time.Minute),
	)
	if err != nil {
		fmt.Println("Error creating connector:", err)
		os.Exit(1)
	}
	defer connector.Close()

	db := sql.OpenDB(connector)
	defer db.Close()

	// db, err := sql.Open("libsql", url)
	// if err != nil {
	// 	return nil, err
	// }

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
func LoadAndConnectDB(localFile string, dbURL string, token string) *sql.DB {
	log := logrus.New()

	if dbURL == "" {
		log.Fatalf("Database path is not set")
	}

	if token == "" {
		log.Fatalf("Token is not set")
	}

	db, err := ConnectDB(localFile, dbURL, token)
	if err != nil {
		log.Fatalf("Failed to connect to database %s: %v", dbURL, err)
	}

	log.WithFields(logrus.Fields{
		"dbPath": dbURL,
	}).Info("Connected to database")

	InitDB(db)
	return db
}
