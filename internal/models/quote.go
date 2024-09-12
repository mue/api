package models

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"mue-api/internal/utils"
)

// Quote represents a quote with its details.
type Quote struct {
	ID         string  `json:"id"`
	Quote      string  `json:"quote"`
	Author     *string `json:"author,omitempty"`
	Occupation *string `json:"occupation,omitempty"`
}

// LanguageCount represents a language and its quote count.
type LanguageCount struct {
	Language string
	Count    int
}

// GetQuoteLanguages returns the available languages and the count of quotes for each language.
func GetQuoteLanguages(ctx context.Context, db *sql.DB, tableName string) ([]LanguageCount, error) {
	query := fmt.Sprintf(`
        SELECT language, COUNT(*) as count
        FROM %s
        GROUP BY language
    `, tableName)

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
func GetAllQuotes(ctx context.Context, db *sql.DB, tableName string, language string) ([]Quote, error) {
	if language == "" {
		language = "en"
	}

	query := fmt.Sprintf("SELECT id, quote, author, author_occupation FROM %s WHERE language = ?", tableName)
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
func GetQuoteByID(ctx context.Context, db *sql.DB, tableName string, id string) (Quote, error) {
	var quote Quote
	query := fmt.Sprintf("SELECT id, quote, author, author_occupation FROM %s WHERE id = ?", tableName)
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

func GetRandomQuoteExcluding(ctx context.Context, db *sql.DB, tableName string, excludeIDs []string, includeLanguages []string, includeAuthours []string) (*Quote, error) {
	//Creates an interface which is filled with the excluded values and a placeholder for whereConditions

	var args []interface{}
	var whereConditions []string

	//Builds the where clause dependent on what exclusions and inclusions apply
	if len(excludeIDs) > 0 {
		excludeClause := utils.BuildWhereClause("id NOT IN", excludeIDs, &args)
		if excludeClause != "" {
			whereConditions = append(whereConditions, excludeClause)
		}
	}
	if len(includeLanguages) > 0 {
		languagesClause := utils.BuildWhereClause("language IN", includeLanguages, &args)
		if languagesClause != "" {
			whereConditions = append(whereConditions, languagesClause)
		}
	}
	if len(includeAuthours) > 0 {
		authoursClause := utils.BuildWhereClause("author IN", includeAuthours, &args)
		if authoursClause != "" {
			whereConditions = append(whereConditions, authoursClause)
		}
	}

	whereClause := utils.CombineWhereClause(whereConditions)

	query := fmt.Sprintf(`
        SELECT id, quote, author, author_occupation
        FROM %s
        %s
        ORDER BY RANDOM()
        LIMIT 1
    `, tableName, whereClause)

	row := db.QueryRowContext(ctx, query, args...)
	var quote Quote
	if err := row.Scan(&quote.ID, &quote.Quote, &quote.Author, &quote.Occupation); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("no quote found")
		}
		return nil, err
	}

	return &quote, nil
}
