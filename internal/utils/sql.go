package utils

import (
	"fmt"
	"strings"
)

// BuildWhereClause creates a SQL where clause for requests,
// it takes the prefix (starting clause)then a list of items to iterate over and adds it to the list of args
func BuildWhereClause(prefix string, items []string, args *[]interface{}) string {
	if len(items) == 0 {
		return ""
	}
	placeholders := make([]string, len(items))
	for i, item := range items {
		placeholders[i] = "?"
		*args = append(*args, item)
	}
	return fmt.Sprintf("%s (%s)", prefix, strings.Join(placeholders, ","))
}

// CombineWhereClause combines a set of where clauses into one string
func CombineWhereClause(whereConditions []string) string {
	if len(whereConditions) == 0 {
		return ""
	}
	return "WHERE " + strings.Join(whereConditions, " AND ")
}
