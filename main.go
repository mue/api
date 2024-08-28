package main

import (
	"database/sql"
	"log"
	"net/http"
	"net/http/pprof"
	"os"

	"mue-api/internal/database"
	"mue-api/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
)

// loadAndConnectDB loads environment variables and connects to the database
func loadAndConnectDB(envVar string) *sql.DB {
	dbPath := os.Getenv(envVar)
	if dbPath == "" {
		log.Fatalf("%s environment variable is not set", envVar)
	}

	db, err := database.ConnectDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	database.InitDB(db)
	return db
}

func main() {
	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// Connect to quotes_db
	quotesDB := loadAndConnectDB("QUOTES_DB_PATH")
	log.Println("Connected to quotes_db")
	defer quotesDB.Close()

	// Connect to images_db
	imagesDB := loadAndConnectDB("IMAGES_DB_PATH")
	log.Println("Connected to images_db")
	defer imagesDB.Close()

	quoteHandler := &handlers.QuoteHandler{DB: quotesDB}
	imageHandler := &handlers.ImageHandler{DB: imagesDB}

	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Routes
	r.Get("/", handlers.RootHandler)

	// Quote routes
	r.Get("/quotes", quoteHandler.GetAllQuotes)
	r.Get("/quotes/{id}", quoteHandler.GetQuoteByID)
	r.Get("/quotes/random", quoteHandler.GetRandomQuote)
	r.Get("/quotes/languages", quoteHandler.GetQuoteLanguages)

	// Image routes
	r.Get("/images", imageHandler.GetImages)
	r.Get("/images/{id}", imageHandler.GetImageByID)
	// r.Get("/images/random", imageHandler.GetRandomImage)
	r.Get("/images/photographers", imageHandler.GetImagePhotographers)

	// pprof routes
	r.HandleFunc("/debug/pprof/*", pprof.Index)
	r.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
	r.HandleFunc("/debug/pprof/profile", pprof.Profile)
	r.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
	r.HandleFunc("/debug/pprof/trace", pprof.Trace)

	log.Println("Starting server on :8080")
	err = http.ListenAndServe(":8080", r)
	if err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
