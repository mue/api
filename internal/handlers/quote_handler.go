package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"mue-api/internal/models"

	"github.com/go-chi/chi/v5"
)

type QuoteHandler struct {
	DB *sql.DB
}

func (h *QuoteHandler) GetQuoteLanguages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	languages, err := models.GetQuoteLanguages(ctx, h.DB)
	if err != nil {
		http.Error(w, "Failed to get quote languages", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(languages)
}

func (h *QuoteHandler) GetAllQuotes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	language := r.URL.Query().Get("language")
	quotes, err := models.GetAllQuotes(ctx, h.DB, language)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(quotes)
}

func (h *QuoteHandler) GetQuoteByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")
	quote, err := models.GetQuoteByID(ctx, h.DB, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(quote)
}

func (h *QuoteHandler) GetRandomQuote(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	language := r.URL.Query().Get("language")

	// If no language query parameter is provided, use the Accept-Language header
	if language == "" {
		language = parseAcceptLanguage(r.Header.Get("Accept-Language"))
		if language == "" {
			language = "en" // Default to English if no Accept-Language header is present
		}
	}

	// Retrieve the list of quote IDs from the client's cookies
	cookie, err := r.Cookie("seen_quotes")
	var seenQuotes []string
	if err == nil {
		seenQuotes = strings.Split(cookie.Value, ",")
	} else {
		// If the cookie does not exist, start with an empty list
		seenQuotes = []string{}
		log.Println("No seen_quotes cookie found, starting with an empty list")
	}

	// Function to fetch a random quote with fallback to English
	fetchQuote := func(language string) (*models.Quote, error) {
		quote, err := models.GetRandomQuoteExcluding(ctx, h.DB, language, seenQuotes)
		if err != nil && strings.Contains(err.Error(), "no quotes found") {
			// If no quotes are found, reset the seenQuotes list and try again
			log.Println("No quotes found, resetting seenQuotes list")
			seenQuotes = []string{}
			quote, err = models.GetRandomQuoteExcluding(ctx, h.DB, language, seenQuotes)
		}
		return quote, err
	}

	// Try to fetch a quote in the requested language
	quote, err := fetchQuote(language)
	if err != nil {
		// If no quotes found, default to English
		quote, err = fetchQuote("en")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Add the new quote ID to the seenQuotes list if it’s not already there
	if !contains(seenQuotes, quote.ID) {
		seenQuotes = append(seenQuotes, quote.ID)
	}

	// Debugging: Log the updated list of seen quotes
	log.Printf("Selected quote ID: %s", quote.ID)
	log.Printf("Updated seen quotes list: %s", strings.Join(seenQuotes, ","))

	// Update the cookie with the new list of seen quote IDs
	seenQuotesStr := strings.Join(seenQuotes, ",")
	newCookie := &http.Cookie{
		Name:  "seen_quotes",
		Value: seenQuotesStr,
		Path:  "/",
		// Consider setting MaxAge or Expires if you want the cookie to persist across sessions
	}

	// Debugging: Log the cookie value before setting it
	log.Printf("Setting seen_quotes cookie with value: %s", seenQuotesStr)

	http.SetCookie(w, newCookie)

	// Return the quote as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(quote); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// Helper function to check if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// parseAcceptLanguage simplifies the Accept-Language header to a basic language code
func parseAcceptLanguage(header string) string {
	if header == "" {
		return ""
	}

	// Split the header by commas to handle multiple languages
	parts := strings.Split(header, ",")
	if len(parts) > 0 {
		// The first part should be the most preferred language
		lang := strings.TrimSpace(parts[0])

		// Split by ';' to remove any quality value (q=...)
		if semicolonIdx := strings.Index(lang, ";"); semicolonIdx != -1 {
			lang = lang[:semicolonIdx]
		}

		// Return only the first 2 characters (e.g., "en-US" -> "en")
		if len(lang) >= 2 {
			return lang[:2]
		}
	}
	return ""
}
