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
	Endpoints        []Endpoint `json:"endpoints"`
	DocumentationURL string     `json:"documentation_url"`
}

// rootHandler handles requests to the root endpoint.
func RootHandler(w http.ResponseWriter, r *http.Request) {
	apiInfo := ApiInfo{
		Name:        "Quote API",
		Version:     "1.0.0",
		Description: "A simple API for fetching inspirational quotes.",
		Endpoints: []Endpoint{
			{Method: "GET", Path: "/quotes", Description: "Retrieve a list of all quotes"},
			{Method: "GET", Path: "/quotes/{id}", Description: "Retrieve a quote by its ID"},
			{Method: "GET", Path: "/quotes/random", Description: "Retrieve a random quote"},
		},
		DocumentationURL: "https://docs.muetab.com/",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(apiInfo)
}
