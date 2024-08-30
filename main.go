package main

import (
	"context"
	"log"
	"net/http"
	"net/http/pprof"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mue-api/internal/handlers"
	local_middleware "mue-api/internal/middleware"
	"mue-api/internal/utils"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
)

// Config holds the application configuration
type Config struct {
	DatabaseURL    string
	TursoAuthToken string
	ServerPort     string
}

// loadConfig loads configuration from environment variables
func loadConfig() *Config {
	return &Config{
		DatabaseURL:    utils.GetEnv("TURSO_DATABASE_URL", ""),
		TursoAuthToken: utils.GetEnv("TURSO_AUTH_TOKEN", ""),
		ServerPort:     utils.GetEnv("SERVER_PORT", "8080"),
	}
}

// main is the entry point of the application
func main() {
	// Load environment variables from .env file
	err := godotenv.Load()
	checkErr(err, "Error loading .env file")

	// Load the configuration
	config := loadConfig()

	// Connect to quotes_db
	db := utils.LoadAndConnectDB(config.DatabaseURL, config.TursoAuthToken)
	defer db.Close()
	// Initialize handlers
	quoteHandler := &handlers.QuoteHandler{DB: db}
	imageHandler := &handlers.ImageHandler{DB: db}

	// Setup router and middleware
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(local_middleware.NoCookieMiddleware)

	// Define routes
	r.Get("/", handlers.RootHandler)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Quote routes
	r.Route("/quotes", func(r chi.Router) {
		r.Get("/", quoteHandler.GetAllQuotes)
		r.Get("/random", quoteHandler.GetRandomQuote)
		r.Get("/languages", quoteHandler.GetQuoteLanguages)

		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", quoteHandler.GetQuoteByID)
			// r.Put("/", quoteHandler.UpdateQuote)
			// r.Delete("/", quoteHandler.DeleteQuote)
		})
	})

	// Image routes
	r.Route("/images", func(r chi.Router) {
		r.Get("/", imageHandler.GetImages)
		r.Get("/photographers", imageHandler.GetImagePhotographers)
		//r.Get("/random", imageHandler.GetRandomImage)
		r.Get("/sizes", imageHandler.GetImageSizes)
		r.Get("/categories", imageHandler.GetImageCategories)
		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", imageHandler.GetImageByID)
			// r.Put("/", imageHandler.UpdateImage)
			// r.Delete("/", imageHandler.DeleteImage)
		})
	})
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
