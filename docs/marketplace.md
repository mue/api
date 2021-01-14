# Marketplace
Marketplace-related endpoints

Unlike the rest of the endpoints, the Marketplace runs on its own instance at https://marketplace.muetab.com with source code available at https://github.com/mue/marketplace.

#### /

```https://marketplace.muetab.com```

Returns hello world message.

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```{"message":"Hello World"}```
<!-- tabs:end -->

### Get All Items

```https://marketplace.muetab.com/all```

This endpoint returns all marketplace items with description etc removed. The information is used by the marketplace homepage so there is only data it requires in this endpoint.

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```{"data":{"settings":[],"photo_packs":[{"name":"crunchyroll_hime","display_name":"Crunchyroll Hime","icon_url":"https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Crunchyroll_Logo.svg/1200px-Crunchyroll_Logo.svg.png","author":"ohlookitsderpy"},{"name":"halloween","display_name":"Halloween","icon_url":"https://publicdomainvectors.org/photos/hattedpumpkin-tkuczamix.png","author":"ohlookitsderpy"},{"name":"low_poly","display_name":"Low Poly Pack","icon_url":"https://i.ibb.co/4J3zrnd/polypacklogo.png","author":"Jack Shanks"},{"name":"winter","display_name":"Winter","icon_url":"https://i.imgur.com/wDMOsaP.png","author":"eartharoid"}],"quote_packs":[],"themes":[]}}```
<!-- tabs:end -->

### Get Featured

```https://marketplace.muetab.com/featured```

This endpoint returns the featured information for the section on the marketplace screen.

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```{"data":{"title":"FEATURE CHANGELOG","name":"MUE MARKETPLACE","buttonText":"READ BLOG","buttonLink":"","colour":"#ff7f50"}}```
<!-- tabs:end -->

#### Get Item

```https://marketplace.muetab.com/item```

This endpoint allows you to get an image. If ID or category aren't specified it will return a random image from all categories.

<!-- tabs:start -->
#### ** Request **
Parameter | Type | Info
--- | --- | ---
name | string | Name of item to search for
category | string | Category to search in

#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```{"updated":"12th Dec 2020","data":{"name":"Crunchyroll Hime","description":"Official wallpapers brought to you by Crunchyroll\n Read more here: https://www.crunchyroll.com/anime-news/2020/05/07/let-hime-spice-up-your-virtual-backgrounds-with-some-free-wallpapers\n Please note that ohlookitsderpy and Mue are not affiliated with Crunchyroll.","icon_url":"https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Crunchyroll_Logo.svg/1200px-Crunchyroll_Logo.svg.png","screenshot_url":"https://u.derpyenterprises.org/CcNj","type":"photos","verified":false,"version":"1.0.0","author":"ohlookitsderpy","photos":[{}]}}```
<!-- tabs:end -->