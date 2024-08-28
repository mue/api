package models

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"strings"
	"time"
)

// Quote represents a quote with its details.
type Quote struct {
	ID         string
	Quote      string
	Author     *string
	Occupation *string
}

// LanguageCount represents a language and its quote count.
type LanguageCount struct {
	Language string
	Count    int
}

var rng *rand.Rand

// Initialize the random generator once at package initialization.
func init() {
	rng = rand.New(rand.NewSource(time.Now().UnixNano()))
}

// GetQuoteLanguages returns the available languages and the count of quotes for each language.
func GetQuoteLanguages(ctx context.Context, db *sql.DB) ([]LanguageCount, error) {
	query := `
        SELECT language, COUNT(*) as count
        FROM quotes_rows
        GROUP BY language
    `

	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		log.Printf("Error querying quote languages: %v", err)
		return nil, err
	}
	defer rows.Close()

	var languages []LanguageCount
	for rows.Next() {
		var lc LanguageCount
		if err := rows.Scan(&lc.Language, &lc.Count); err != nil {
			log.Printf("Error scanning language count: %v", err)
			return nil, err
		}
		languages = append(languages, lc)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		return nil, err
	}

	return languages, nil
}

// GetAllQuotes fetches all quotes in the specified language.
func GetAllQuotes(ctx context.Context, db *sql.DB, language string) ([]Quote, error) {
	if language == "" {
		language = "en"
	}

	query := "SELECT id, quote, author, author_occupation FROM quotes_rows WHERE language = ?"
	rows, err := db.QueryContext(ctx, query, language)
	if err != nil {
		log.Printf("Error querying all quotes: %v", err)
		return nil, err
	}
	defer rows.Close()

	var quotes []Quote
	for rows.Next() {
		var q Quote
		if err := rows.Scan(&q.ID, &q.Quote, &q.Author, &q.Occupation); err != nil {
			log.Printf("Error scanning quote: %v", err)
			return nil, err
		}
		quotes = append(quotes, q)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		return nil, err
	}

	return quotes, nil
}

// GetQuoteByID fetches a quote by its ID in the specified language.
func GetQuoteByID(ctx context.Context, db *sql.DB, id string) (Quote, error) {
	var quote Quote
	query := "SELECT id, quote, author, author_occupation FROM quotes_rows WHERE id = ?"
	err := db.QueryRowContext(ctx, query, id).Scan(&quote.ID, &quote.Quote, &quote.Author, &quote.Occupation)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("No quote found with id %s", id)
			return quote, errors.New("no quote found")
		}
		log.Printf("Error querying quote by ID: %v", err)
		return quote, err
	}

	return quote, nil
}

// GetRandomQuote fetches a random quote in the specified language.
func GetRandomQuote(ctx context.Context, db *sql.DB, language string) (Quote, error) {
	if language == "" {
		language = "en"
	}

	var quote Quote
	query := "SELECT id, quote, author, author_occupation FROM quotes_rows WHERE language = ? ORDER BY RANDOM() LIMIT 1"
	err := db.QueryRowContext(ctx, query, language).Scan(&quote.ID, &quote.Quote, &quote.Author, &quote.Occupation)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("No quotes found for language %s", language)
			return quote, errors.New("no quotes found")
		}
		log.Printf("Error querying random quote: %v", err)
		return quote, err
	}

	return quote, nil
}

func GetRandomQuoteExcluding(ctx context.Context, db *sql.DB, language string, exclude []string) (*Quote, error) {
	excludeClause := ""
	if len(exclude) > 0 {
		placeholders := strings.Repeat("?,", len(exclude)-1) + "?"
		excludeClause = fmt.Sprintf("AND id NOT IN (%s)", placeholders)
	}

	query := fmt.Sprintf(`
        SELECT id, quote, author, author_occupation
        FROM quotes_rows
        WHERE language = ? %s
        ORDER BY RANDOM()
        LIMIT 1
    `, excludeClause)

	args := make([]interface{}, len(exclude)+1)
	args[0] = language
	for i, id := range exclude {
		args[i+1] = id
	}

	row := db.QueryRowContext(ctx, query, args...)
	var quote Quote
	if err := row.Scan(&quote.ID, &quote.Quote, &quote.Author, &quote.Occupation); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("no quotes found for language %s excluding provided IDs", language)
		}
		return nil, err
	}

	return &quote, nil
}
