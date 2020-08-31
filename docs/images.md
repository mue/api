# Images
Image-related endpoints

#### Get Image

```https://api.muetab.xyz/getImage```

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

```https://api.muetab.xyz/getCategories```

This endpoint returns all categories in an array.

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```["Outdoors"]```
<!-- tabs:end -->

### Get Photographers

```https://api.muetab.xyz/getPhotographers```

This endpoint returns all photographers in an array.

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```["photographer1", "photographer2"]```
<!-- tabs:end -->