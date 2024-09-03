package handlers

import (
	"encoding/json"
	"net/http"
)

type Endpoint struct {
	Method      string `json:"method"`
	Path        string `json:"path"`
	Description string `json:"description"`
}

type ApiInfo struct {
	Name             string     `json:"name"`
	Version          string     `json:"version"`
	Description      string     `json:"description"`
	QuoteEndpoints   []Endpoint `json:"quote_endpoints"`
	ImageEndpoints   []Endpoint `json:"image_endpoints"`
	WeatherEndpoints []Endpoint `json:"weather_endpoints"`
	DocumentationURL string     `json:"documentation_url"`
}

// rootHandler handles requests to the root endpoint.
func RootHandler(w http.ResponseWriter, r *http.Request) {
	apiInfo := ApiInfo{
		Name:        "Mue API",
		Version:     "0.0.1",
		Description: "This API provides quotes and images for the Mue Tab browser extension.",
		QuoteEndpoints: []Endpoint{
			{Method: "GET", Path: "/quotes", Description: "Retrieve all quotes."},
			{Method: "GET", Path: "/quotes/{id}", Description: "Retrieve a specific quote by ID."},
			{Method: "GET", Path: "/quotes/random", Description: "Retrieve a random quote."},
			{Method: "GET", Path: "/quotes/language", Description: "Retrieve all available languages and the count of quotes in each."},
		},
		ImageEndpoints: []Endpoint{
			{Method: "GET", Path: "/images", Description: "Retrieve all images."},
			{Method: "GET", Path: "/images/{id}", Description: "Retrieve a specific image by ID."},
			{Method: "GET", Path: "/images/random", Description: "Retrieve a random image."},
			{Method: "GET", Path: "/images/photographers", Description: "Retrieve all photographers and the count of images by each."},
			{Method: "GET", Path: "/images/categories", Description: "Retrieve all image categories."},
			{Method: "GET", Path: "/images/sizes", Description: "Retrieve all image sizes."},
		},
		WeatherEndpoints: []Endpoint{
			{Method: "GET", Path: "/weather", Description: "Retrieve the weather for a specific location."},
			{Method: "GET", Path: "/weather/autolocation", Description: "Retrieve the city for the user's current location."},
		},
		DocumentationURL: "https://docs.muetab.com/",
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(apiInfo); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}
