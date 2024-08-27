package main

import (
	"log"
	"net/http"
	"net/http/pprof" // Import pprof
	"os"

	"quote-api/internal/database"
	"quote-api/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		log.Fatal("DB_PATH environment variable is not set")
	}

	db, err := database.ConnectDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	database.InitDB(db)

	quoteHandler := &handlers.QuoteHandler{DB: db}

	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Routes
	r.Get("/", handlers.RootHandler)

	r.Get("/quotes", quoteHandler.GetAllQuotes)
	r.Get("/quotes/{id}", quoteHandler.GetQuoteByID)
	r.Get("/quotes/random", quoteHandler.GetRandomQuote)
	r.Get("/quotes/languages", quoteHandler.GetQuoteLanguages)

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
