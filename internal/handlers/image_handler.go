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

type ImageHandler struct {
	DB        *sql.DB
	TableName string
}

type Sizes struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

func (h *ImageHandler) GetImagePhotographers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	photographers, err := models.GetImagePhotographers(ctx, h.DB, h.TableName)
	if err != nil {
		http.Error(w, "Failed to get photographers", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(photographers)
}

func (h *ImageHandler) GetImageByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")
	image, err := models.GetImageByID(ctx, h.DB, h.TableName, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(image)
}

func (h *ImageHandler) GetImages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	photographer := r.URL.Query().Get("photographer")
	category := r.URL.Query().Get("category")
	images, err := models.GetImages(ctx, h.DB, h.TableName, photographer, category)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(images)
}

func (h *ImageHandler) GetImageCategories(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	categories, err := models.GetImageCategories(ctx, h.DB, h.TableName)
	if err != nil {
		http.Error(w, "Failed to get categories", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

func (h *ImageHandler) GetImageSizes(w http.ResponseWriter, r *http.Request) {
	sizes := []Sizes{
		{ID: "original", Label: "original"},
		{ID: "qhd", Label: "high"},
		{ID: "fhd", Label: "normal"},
		{ID: "hd", Label: "datasaver"},
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(sizes); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

func (h *ImageHandler) GetRandomImage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	queryParams := r.URL.Query()

	// Get categories from the query parameters
	categories := queryParams["categories"]
	photographers := queryParams["photographers"]

	var seenImages = models.GetCookieValueAsList(r, "seen_images")

	image, err := models.GetRandomImageExcluding(ctx, h.DB, h.TableName, seenImages, categories, photographers)
	if err != nil && strings.Contains(err.Error(), "no image found") {
		// If no quotes are found, reset the seenQuotes list and try again
		log.Println("No images found, resetting seenImages list")
		seenImages = []string{}
		models.SetCookie(w, "seen_images", "")
		image, err = models.GetRandomImageExcluding(ctx, h.DB, h.TableName, seenImages, categories, photographers)
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	seenImages = append(seenImages, image.ID)
	seenImagesStr := strings.Join(seenImages, ",")

	models.SetCookie(w, "seen_images", seenImagesStr)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(image); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// End of code
