# Mue API
Source code for the Mue API. This API is the default for random images and quotes in Mue.

## Installation
See the [documentation](https://docs.muetab.com/development#api).

## Environment

Non-secret variables are in `wrangler.toml`.
Secrets are deployed with Wrangler but a `.dev.vars` file can be used in development:

```sh
IS_LOCAL_MODE=1
BASELIME_API_KEY=
MAPBOX_TOKEN=
OPENWEATHER_TOKEN=
PEXELS_TOKEN=
SUPABASE_TOKEN=
SUPABASE_URL=
UNSPLASH_TOKEN=
```

## License
[MIT](LICENSE)
