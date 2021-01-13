# Other
Other endpoints on the Mue API

#### /

```https://api.muetab.com```

Returns hello world message.

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```Hello world! Documentation can be found at https://apidocs.muetab.com```
<!-- tabs:end -->

#### Get Update Changelog

```https://api.muetab.com/getUpdate```

This endpoint allows you to get the most recent update changelog from the [blog](https://blog.muetab.com).

<!-- tabs:start -->
#### ** Response **
Type | Code | Response
--- | --- | ---
OK | 200 | ```{"title":"Version 4.0 - Changelog","content":"<p>Changes in version 4.0 of Mue Tab:</p>removed","published":"31st Aug 2020","author":"Alex Sparkes"}```
<!-- tabs:end -->