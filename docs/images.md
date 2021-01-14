# Images
Image-related endpoints

#### Get Image

```https://api.muetab.com/getImage```

This endpoint allows you to get an image. If ID or category aren't specified it will return a random image from all categories.

<!-- tabs:start -->
#### ** Request **
Parameter | Type | Info
--- | --- | ---
id (optional) | number | Returns information for specific image id
category (optional) | string | Returns random image from specific category

#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```{"id":186,"category":"Outdoors","file":"https://cdn.derpyenterprises.org/mue/78ff331a7aa4bda3.jpg","photographer":"David Ralph","location":"Cotswold Wildlife Park", "camera": "Samsung Galaxy S8", "resolution": null}```
Not Found | 404 | ```{"message":"Category not found."}```
<!-- tabs:end -->

### Get Categories

```https://api.muetab.com/getCategories```

This endpoint returns all categories in an array.

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```["Outdoors"]```
<!-- tabs:end -->

### Get Photographers

```https://api.muetab.com/getPhotographers```

This endpoint returns all photographers in an array.

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```["photographer1", "photographer2"]```
<!-- tabs:end -->

### Get Unsplash

```https://api.muetab.com/getUnsplash```

This endpoint is similar to /getImage, but it uses Unsplash instead. There are no options for this as it's specifically designed for usage in the Mue tab.

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```{"file":"https://images.unsplash.com/photo-1610444668861-82abcc7f8598?crop=entropy&cs=srgb&fm=jpg&ixid=MXwxNTAzNzR8MHwxfHJhbmRvbXx8fHx8fHx8&ixlib=rb-1.2.1&q=85&w=1920","photographer":"Peter Luo","location":"null null","photographer_page":"https://unsplash.com/@peterluo0113?utm_source=mue&utm_medium=referral"}```
<!-- tabs:end -->