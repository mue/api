# Quotes
Quote-related endpoints

#### Get Quote

```https://api.muetab.com/getQuote```

This endpoint allows you to get a quote. If ID isn't specified it will return a random quote.

<!-- tabs:start -->
#### ** Request **
Parameter | Type | Info
--- | --- | ---
id (optional) | number | Returns information for specific quote id
language (optional) | string | Get a random quote in a specific language

#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```{"id":4,"author":"E.E Cummings","quote":"It takes courage to grow up and become who you really are.","language":"English"}```
Not Found | 404 | ```{"statusCode":400,"error":"Invalid ID","message":"ID Not Found"}```
<!-- tabs:end -->

### Get Quote Languages

```https://api.muetab.com/getQuoteLanguages```

This endpoint returns all quote languages in an array.

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```["English", "French"]```
<!-- tabs:end -->