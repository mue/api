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
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
)

// Config holds the application configuration
type Config struct {
	DatabaseURL    string `validate:"required,url"`
	TursoAuthToken string `validate:"required"`
	ServerPort     string `validate:"required,numeric"`
	QuotesTable    string `validate:"required"`
	ImagesTable    string `validate:"required"`
}

// loadConfig loads configuration from environment variables
func loadConfig() (*Config, error) {
	config := &Config{
		DatabaseURL:    utils.GetEnv("TURSO_DATABASE_URL", ""),
		TursoAuthToken: utils.GetEnv("TURSO_AUTH_TOKEN", ""),
		ServerPort:     utils.GetEnv("SERVER_PORT", "8080"),
		QuotesTable:    utils.GetEnv("QUOTES_TABLE", "quotes"),
		ImagesTable:    utils.GetEnv("IMAGES_TABLE", "images"),
	}

	// Validate configuration
	if err := validator.New().Struct(config); err != nil {
		return nil, err
	}

	return config, nil
}

// main is the entry point of the application
func main() {
	// Load environment variables from .env file
	err := godotenv.Load()
	checkErr(err, "Error loading .env file")

	// Load the configuration
	config, err := loadConfig()
	checkErr(err, "Invalid configuration")

	// Connect to db
	db := utils.LoadAndConnectDB(config.DatabaseURL, config.TursoAuthToken)
	//checkErr(err, "Failed to connect to database")
	defer db.Close()

	// Initialize handlers
	quoteHandler := &handlers.QuoteHandler{DB: db, TableName: config.QuotesTable}
	imageHandler := &handlers.ImageHandler{DB: db, TableName: config.ImagesTable}

	// Setup router and middleware
	r := setupRouter(quoteHandler, imageHandler)

	// Start the server with graceful shutdown
	startServer(r, config.ServerPort)
}

// setupRouter configures the router and sub-routers
func setupRouter(quoteHandler *handlers.QuoteHandler, imageHandler *handlers.ImageHandler) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(local_middleware.NoCookieMiddleware)

	// Root and health check routes
	r.Get("/", handlers.RootHandler)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Mount sub-routers
	r.Mount("/quotes", quotesRouter(quoteHandler))
	r.Mount("/images", imagesRouter(imageHandler))
	r.Mount("/debug", debugRouter())

	return r
}

// quotesRouter creates a sub-router for quote-related routes
func quotesRouter(handler *handlers.QuoteHandler) chi.Router {
	r := chi.NewRouter()
	r.Get("/", handler.GetAllQuotes)
	r.Get("/random", handler.GetRandomQuote)
	r.Get("/languages", handler.GetQuoteLanguages)
	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", handler.GetQuoteByID)
		// Add more quote-specific routes here (e.g., PUT, DELETE)
	})
	return r
}

// imagesRouter creates a sub-router for image-related routes
func imagesRouter(handler *handlers.ImageHandler) chi.Router {
	r := chi.NewRouter()
	r.Get("/", handler.GetImages)
	r.Get("/photographers", handler.GetImagePhotographers)
	//r.Get("/random", handler.GetRandomImage)
	r.Get("/sizes", handler.GetImageSizes)
	r.Get("/categories", handler.GetImageCategories)
	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", handler.GetImageByID)
		// Add more image-specific routes here (e.g., PUT, DELETE)
	})
	return r
}

// debugRouter creates a sub-router for debugging routes like pprof
func debugRouter() chi.Router {
	r := chi.NewRouter()
	r.HandleFunc("/pprof/", pprof.Index)
	r.HandleFunc("/pprof/cmdline", pprof.Cmdline)
	r.HandleFunc("/pprof/profile", pprof.Profile)
	r.HandleFunc("/pprof/symbol", pprof.Symbol)
	r.HandleFunc("/pprof/trace", pprof.Trace)
	return r
}

// startServer initializes and starts the server with graceful shutdown
func startServer(handler http.Handler, port string) {
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: handler,
	}

	// Start server in a goroutine
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()
	log.Printf("Server started on :%s", port)

	// Graceful shutdown on interrupt signal
	waitForShutdown(srv)
}

// waitForShutdown handles graceful shutdown
func waitForShutdown(srv *http.Server) {
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
