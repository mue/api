package models

import (
	"log"
	"net/http"
	"strings"
)

// Cookie Custom type to allow for defaults
type Cookie struct {
	Name   string
	Value  string
	Path   string `default:"/"`
	MaxAge int    `default:"0"`
}

// Option allows for options when making cookies
type Option func(*Cookie)

func SetCookie(w http.ResponseWriter, name string, value string, options ...Option) {

	//Creates a cookie with required and defaulted values
	newCookie := &Cookie{
		Name:  name,
		Value: value,
	}

	//Goes through the list of options inputted if any and changes the value
	for _, option := range options {
		option(newCookie)
	}

	httpCookie := &http.Cookie{
		Name:   newCookie.Name,
		Value:  newCookie.Value,
		Path:   newCookie.Path,
		MaxAge: newCookie.MaxAge,
	}

	http.SetCookie(w, httpCookie)
}

//List of options that could be added
//Example use: models.SetCookie(w, "seen_quotes", seenQuotesStr, models.WithMaxAge(30))

func WithMaxAge(age int) Option {
	return func(cookie *Cookie) {
		cookie.MaxAge = age
	}
}

func WithPath(path string) Option {
	return func(cookie *Cookie) {
		cookie.Path = path
	}
}

func GetCookieValueAsList(r *http.Request, name string) []string {
	cookie, err := r.Cookie(name)

	var returnString []string
	if err == nil {
		returnString = strings.Split(cookie.Value, ",")
	} else {
		// If the cookie does not exist, start with an empty list
		returnString = []string{}
		log.Println("No cookie found, starting with an empty list")
	}
	return returnString
}
