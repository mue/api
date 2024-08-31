package models

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
)

type Image struct {
	ID               string
	Camera           *string
	CreatedAt        *string
	LocationData     *string
	Photographer     string
	Category         string
	OriginalFileName string
	Colour           string
	PUN              int
	Version          int
	BlurHash         string
}

type PhotographerCount struct {
	Photographer string
	Count        int
}

type CategoryCount struct {
	Category string
	Count    int
}

func GetImagePhotographers(ctx context.Context, db *sql.DB, tableName string) ([]PhotographerCount, error) {
	query := fmt.Sprintf(`
        SELECT photographer, COUNT(*) as count
        FROM %s
        GROUP BY photographer
    `, tableName)

	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		log.Printf("Error querying image photographers: %v", err)
		return nil, err
	}
	defer rows.Close()

	var photographers []PhotographerCount
	for rows.Next() {
		var lc PhotographerCount
		if err := rows.Scan(&lc.Photographer, &lc.Count); err != nil {
			log.Printf("Error scanning photographer count: %v", err)
			return nil, err
		}
		photographers = append(photographers, lc)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		return nil, err
	}

	return photographers, nil
}

func GetImageCategories(ctx context.Context, db *sql.DB, tableName string) ([]CategoryCount, error) {
	query := fmt.Sprintf(`
	SELECT category, COUNT(*) as count
	FROM %s
	GROUP BY category
`, tableName)

	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		log.Printf("Error querying image categories: %v", err)
		return nil, err
	}
	defer rows.Close()

	var categories []CategoryCount
	for rows.Next() {
		var lc CategoryCount
		if err := rows.Scan(&lc.Category, &lc.Count); err != nil {
			log.Printf("Error scanning category count: %v", err)
			return nil, err
		}
		categories = append(categories, lc)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		return nil, err
	}

	return categories, nil
}

func GetImageByID(ctx context.Context, db *sql.DB, tableName, id string) (Image, error) {
	var image Image
	query := fmt.Sprintf("SELECT id, camera, created_at, location_data, photographer, category, original_file_name, colour, pun, version, blur_hash FROM %s WHERE id = ?", tableName)
	err := db.QueryRowContext(ctx, query, id).Scan(&image.ID, &image.Camera, &image.CreatedAt, &image.LocationData, &image.Photographer, &image.Category, &image.OriginalFileName, &image.Colour, &image.PUN, &image.Version, &image.BlurHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("No image found with id %s", id)
			return image, errors.New("no image found")
		}
		log.Printf("Error querying imag by ID: %v", err)
		return image, err
	}

	return image, nil
}

func GetImages(ctx context.Context, db *sql.DB, tableName, photographer, category string) ([]Image, error) {
	query := fmt.Sprintf(`
        SELECT id, camera, created_at, location_data, photographer, category, original_file_name, colour, pun, version, blur_hash
        FROM %s
    `, tableName)
	var args []interface{}
	var conditions []string

	if photographer != "" {
		conditions = append(conditions, "photographer = ?")
		args = append(args, photographer)
	}
	if category != "" {
		conditions = append(conditions, "category = ?")
		args = append(args, category)
	}

	if len(conditions) > 0 {
		query += " WHERE " + conditions[0]
		for i := 1; i < len(conditions); i++ {
			query += " AND " + conditions[i]
		}
	}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		log.Printf("Error querying images: %v", err)
		return nil, err
	}
	defer rows.Close()

	var images []Image
	for rows.Next() {
		var image Image
		if err := rows.Scan(&image.ID, &image.Camera, &image.CreatedAt, &image.LocationData, &image.Photographer, &image.Category, &image.OriginalFileName, &image.Colour, &image.PUN, &image.Version, &image.BlurHash); err != nil {
			log.Printf("Error scanning image: %v", err)
			return nil, err
		}
		images = append(images, image)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating over rows: %v", err)
		return nil, err
	}

	return images, nil
}
