# Other
Other endpoints on the Mue API

#### /

```https://api.muetab.xyz```

Returns hello world message.

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```Hello world! Documentation can be found at https://apidocs.muetab.xyz```
<!-- tabs:end -->

#### Get Update Changelog

```https://api.muetab.xyz/getUpdate```

This endpoint allows you to get the most recent update changelog from the [blog](https://blog.muetab.xyz).

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```{"title":"Version 4.0 - Changelog","content":"<p>Changes in version 4.0 of Mue Tab:</p>removed","published":"31st Aug 2020","author":"Alex Sparkes"}```
<!-- tabs:end -->