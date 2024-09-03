package models

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type Weather struct {
	Weather []struct {
		Main        string `json:"main"`
		Description string `json:"description"`
		Icon        string `json:"icon"`
	} `json:"weather"`
	Main struct {
		Temp      float64 `json:"temp"`
		TempMin   float64 `json:"temp_min"`
		TempMax   float64 `json:"temp_max"`
		FeelsLike float64 `json:"feels_like"`
		Pressure  int     `json:"pressure"`
		Humidity  int     `json:"humidity"`
	} `json:"main"`
	Visibility int `json:"visibility"`
	Wind       struct {
		Speed float64 `json:"speed"`
		Deg   int     `json:"deg"`
	} `json:"wind"`
	Clouds struct {
		All int `json:"all"`
	} `json:"clouds"`
	ID int `json:"id"`
}

type WeatherLocation struct {
}

// get api token
var apiToken string = "c1b3b3b"

// get weather data
func GetLocationWeather(ctx context.Context, lat, lon string) (*Weather, error) {
	// build url
	url := fmt.Sprintf("https://api.openweathermap.org/data/2.5/weather?lat=%s&lon=%s&appid=%s", lat, lon, apiToken)

	// create request
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)

	if err != nil {
		log.Printf("Error creating request: %v", err)
		return nil, err
	}

	// send request
	client := &http.Client{}

	resp, err := client.Do(req)

	if err != nil {
		log.Printf("Error sending request: %v", err)
		return nil, err
	}

	// check response
	if resp.StatusCode != http.StatusOK {
		log.Printf("Error response: %v", resp.Status)
		return nil, err
	}

	// read response
	defer resp.Body.Close()

	// parse response
	var weather Weather

	if err := json.NewDecoder(resp.Body).Decode(&weather); err != nil {
		log.Printf("Error decoding response: %v", err)
		return nil, err
	}

	return &weather, nil
}

func GetWeather(ctx context.Context, city string) (*Weather, error) {
	// build url
	url := fmt.Sprintf("https://api.openweathermap.org/data/2.5/weather?q=%s&appid=%s", city, apiToken)

	// create request
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)

	if err != nil {
		log.Printf("Error creating request: %v", err)
		return nil, err
	}

	// send request
	client := &http.Client{}

	resp, err := client.Do(req)

	if err != nil {
		log.Printf("Error sending request: %v", err)
		return nil, err
	}

	// check response
	if resp.StatusCode != http.StatusOK {
		log.Printf("Error response: %v", resp.Status)
		return nil, err
	}

	// read response
	defer resp.Body.Close()

	// parse response
	var weather Weather

	if err := json.NewDecoder(resp.Body).Decode(&weather); err != nil {
		log.Printf("Error decoding response: %v", err)
		return nil, err
	}

	/*
			      weather: [{
		        main: data.weather[0].main,
		        description: data.weather[0].description,
		        icon: data.weather[0].icon
		      }],
		      main: {
		        temp: data.main.temp,
		        temp_min: data.main.temp_min,
		        temp_max: data.main.temp_max,
		        temp_feels_like: data.main.feels_like,
		        pressure: data.main.pressure,
		        humidity: data.main.humidity
		      },
		      visibility: data.visibility,
		      wind: {
		        speed: data.wind.speed,
		        deg: data.wind.deg
		      },
		      clouds: {
		        all: data.clouds.all
		      },
		      id: data.id
	*/

	return &weather, nil
}
