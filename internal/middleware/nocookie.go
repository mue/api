package middleware

import "net/http"

func NoCookieMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if the 'no-cookie' query parameter is set to '1'
		if r.URL.Query().Get("no-cookie") == "1" {
			w = &noCookieResponseWriter{ResponseWriter: w}
			r.Header.Del("Cookie")
		}
		next.ServeHTTP(w, r)
	})
}

type noCookieResponseWriter struct {
	http.ResponseWriter
}

func (w *noCookieResponseWriter) WriteHeader(statusCode int) {
	w.ResponseWriter.Header().Del("Set-Cookie")
	w.ResponseWriter.WriteHeader(statusCode)
}
