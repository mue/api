package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"quote-api/internal/models"
)

type ImageHandler struct {
	DB *sql.DB
}

func (h *ImageHandler) GetImagePhotographers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	photographers, err := models.GetImagePhotographers(ctx, h.DB)
	if err != nil {
		http.Error(w, "Failed to get photographers", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(photographers)
}

func (h *ImageHandler) GetImages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	photographer := r.URL.Query().Get("photographer")
	category := r.URL.Query().Get("category")
	images, err := models.GetImages(ctx, h.DB, photographer, category)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(images)
}

// End of code
