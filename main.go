package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"net/http/pprof"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"

	"mue-api/internal/database"
	"mue-api/internal/handlers"
)

// Config holds the application configuration
type Config struct {
	QuotesDBPath string
	ImagesDBPath string
	ServerPort   string
}

// loadConfig loads configuration from environment variables
func loadConfig() *Config {
	return &Config{
		QuotesDBPath: getEnv("QUOTES_DB_PATH", "default_quotes_db_path"),
		ImagesDBPath: getEnv("IMAGES_DB_PATH", "default_images_db_path"),
		ServerPort:   getEnv("SERVER_PORT", "8080"),
	}
}

// getEnv retrieves an environment variable or returns a fallback value
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// loadAndConnectDB loads environment variables and connects to the database
func loadAndConnectDB(dbPath string) *sql.DB {
	log := logrus.New()

	if dbPath == "" {
		log.Fatalf("Database path is not set")
	}

	db, err := database.ConnectDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to connect to database %s: %v", dbPath, err)
	}

	log.WithFields(logrus.Fields{
		"dbPath": dbPath,
	}).Info("Connected to database")

	database.InitDB(db)
	return db
}

// main is the entry point of the application
func main() {
	// Load environment variables from .env file
	err := godotenv.Load()
	checkErr(err, "Error loading .env file")

	// Load the configuration
	config := loadConfig()

	// Connect to quotes_db
	quotesDB := loadAndConnectDB(config.QuotesDBPath)
	defer quotesDB.Close()

	// Connect to images_db
	imagesDB := loadAndConnectDB(config.ImagesDBPath)
	defer imagesDB.Close()

	// Initialize handlers
	quoteHandler := &handlers.QuoteHandler{DB: quotesDB}
	imageHandler := &handlers.ImageHandler{DB: imagesDB}

	// Setup router and middleware
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Define routes
	r.Get("/", handlers.RootHandler)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Quote routes
	r.Get("/quotes", quoteHandler.GetAllQuotes)
	r.Get("/quotes/{id}", quoteHandler.GetQuoteByID)
	r.Get("/quotes/random", quoteHandler.GetRandomQuote)
	r.Get("/quotes/languages", quoteHandler.GetQuoteLanguages)

	// Image routes
	r.Get("/images", imageHandler.GetImages)
	r.Get("/images/{id}", imageHandler.GetImageByID)
	r.Get("/images/photographers", imageHandler.GetImagePhotographers)
	//r.Get("/images/random", imageHandler.GetRandomImage)
	r.Get("/images/sizes", imageHandler.GetImageSizes)
	r.Get("/images/categories", imageHandler.GetImageCategories)

	// pprof routes
	r.HandleFunc("/debug/pprof/", pprof.Index)
	r.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
	r.HandleFunc("/debug/pprof/profile", pprof.Profile)
	r.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
	r.HandleFunc("/debug/pprof/trace", pprof.Trace)

	// Set up the server
	srv := &http.Server{
		Addr:    ":" + config.ServerPort,
		Handler: r,
	}

	// Graceful shutdown
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()
	log.Printf("Server started on :%s", config.ServerPort)

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}

// checkErr logs a fatal error if err is non-nil
func checkErr(err error, message string) {
	if err != nil {
		log.Fatalf("%s: %v", message, err)
	}
}
