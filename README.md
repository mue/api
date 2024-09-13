![mue-api-logo-banner](https://github.com/user-attachments/assets/e3747494-4034-41a2-b632-c4a7083b4585)

## Table Of Contents


1. What is this API?
2. Installation
3. Env Variables
4. License

## What is this API?

The Mue API is created to serve HTTP requests for photos, quotes, weather and marketplace data to users.

This API is used by the **[Mue Tab](https://github.com/mue/mue)** browser extension.

## Installation

To install this project, you will need the following on your machine:

![Go](https://img.shields.io/badge/Go-00ADD8?logo=Go&logoColor=white&style=for-the-badge)

Then run the commands:

```bash
go get

go run .
```

## Env Variables

|         Name          |                  Description                  | Required | Default value |                   Limitations                    |
| :-------------------: | :-------------------------------------------: | :------: | :-----------: | :----------------------------------------------: |
| `DATABASE_CACHE_FILE` |         Local Cache Database Replica          |    ✅    | `replica.db`  |        Must be a string, must end in .db         |
| `TURSO_DATABASE_URL`  |       The primary external database URL       |    ✅    |      ❌       |                 Cannot be empty                  |
|  `TURSO_AUTH_TOKEN`   | Authentication token required to use Turso DB |    ✅    |      ❌       |                 Cannot be empty                  |
|     `SERVER_PORT`     |       Default Server Port API hosted on       |    ❌    |    `8080`     | If set, must be a number between `0` and `65535` |
|    `QUOTES_TABLE`     |             Name of Quotes Table              |    ❌    |   `quotes`    |                 Must be a string                 |
|    `IMAGES_TABLE`     |             Name of Images Table              |    ❌    |   `images`    |                 Must be a string                 |
|  `WEATHER_API_TOKEN`  |             OpenWeather API Token             |    ✅    |      ❌       |              Can't be empty string               |

## License

This project is licensed under the [MIT License](http://opensource.org/licenses/MIT).
