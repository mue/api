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
	DB        *sql.DB
	TableName string
}

func (h *QuoteHandler) GetQuoteLanguages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	languages, err := models.GetQuoteLanguages(ctx, h.DB, h.TableName)
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
	quotes, err := models.GetAllQuotes(ctx, h.DB, h.TableName, language)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(quotes)
}

func (h *QuoteHandler) GetQuoteByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")
	quote, err := models.GetQuoteByID(ctx, h.DB, h.TableName, id)
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
	var seenQuotes = models.GetCookieValueAsList(r, "seen_quotes")

	// Fetch a random quote with fallback to reset seenList and default to english
	quote, err := models.GetRandomQuoteExcluding(ctx, h.DB, h.TableName, language, seenQuotes)
	if err != nil && strings.Contains(err.Error(), "no quotes found") {
		log.Println("No quotes found, resetting seenQuotes list")
		seenQuotes = []string{}
		quote, err = models.GetRandomQuoteExcluding(ctx, h.DB, h.TableName, language, seenQuotes)
		if err != nil {
			quote, err = models.GetRandomQuoteExcluding(ctx, h.DB, h.TableName, "en", seenQuotes)
		}
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	//Add the seen quote ID to the list of seen quotes
	seenQuotes = append(seenQuotes, quote.ID)
	seenQuotesStr := strings.Join(seenQuotes, ",")

	// Update the cookie with the new list of seen quote IDs
	models.SetCookie(w, "seen_quotes", seenQuotesStr)

	// Return the quote as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(quote); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
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
