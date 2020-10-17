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

#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```{"id":4,"author":"E.E Cummings","quote":"It takes courage to grow up and become who you really are.","language":"English"}```
Not Found | 404 | ```{"statusCode":400,"error":"Invalid ID","message":"ID Not Found"}```
<!-- tabs:end -->