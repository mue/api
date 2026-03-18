import { Hono } from 'hono';
import { withWeatherLanguage } from './middleware';

export default new Hono()
	.get('/gps', withWeatherLanguage, async (c) => {
		const { latitude, longitude } = c.req.query();

		if (!latitude || !longitude) {
			return c.json({ error: '`latitude` and `longitude` params are required' }, 400);
		}

		const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${c.env.OPENWEATHER_TOKEN}&lang=${c.get('language')}`;
		const data = await (await fetch(url)).json();

		return c.json(data, 200, { 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400, immutable' });
	})
	.get('/geocode', withWeatherLanguage, async (c) => {
		const { q, limit = 5 } = c.req.query();
		if (!q) {
			return c.json({ error: '`q` param is required' }, 400);
		}

		if (q.length < 2) {
			return c.json({ error: '`q` must be at least 2 characters' }, 400);
		}

		const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=${limit}&appid=${c.env.OPENWEATHER_TOKEN}`;
		const data = await (await fetch(url)).json();

		const locations = data.map((loc) => ({
			country: loc.country,
			displayName: [loc.name, loc.state, loc.country].filter(Boolean).join(', '),
			lat: loc.lat,
			lon: loc.lon,
			name: loc.name,
			state: loc.state || null,
		}));

		return c.json(locations, 200, { 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400, immutable' });
	})
	.get('/map', async (c) => {
		const { latitude, longitude } = c.req.query();
		if (!latitude) {
			return c.json({ error: 'latitude is required' }, 400);
		}

		if (!longitude) {
			return c.json({ error: 'longitude is required' }, 400);
		}

		const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+555555(${longitude},${latitude})/${longitude},${latitude},9},0/450x200?access_token=${c.env.MAPBOX_TOKEN}`;
		const res = await fetch(url, { cf: { cacheTtl: 31536000 } });

		return new Response(res.body, res);
	})
	.get('/weather', withWeatherLanguage, async (c) => {
		const { city, lat, lon } = c.req.query();

		let url;
		if (lat && lon) {
			const latitude = parseFloat(lat);
			const longitude = parseFloat(lon);

			if (isNaN(latitude) || isNaN(longitude)) {
				return c.json({ error: 'Invalid coordinates: `lat` and `lon` must be numbers' }, 400);
			}

			if (latitude < -90 || latitude > 90) {
				return c.json({ error: 'Invalid latitude: must be between -90 and 90' }, 400);
			}

			if (longitude < -180 || longitude > 180) {
				return c.json({ error: 'Invalid longitude: must be between -180 and 180' }, 400);
			}
			url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${c.env.OPENWEATHER_TOKEN}&lang=${c.get('language')}`;
		} else if (city) {
			url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${c.env.OPENWEATHER_TOKEN}&lang=${c.get('language')}`;
		} else {
			return c.json({ error: 'Either `city` param or `lat` and `lon` params are required' }, 400);
		}

		const data = await (await fetch(url)).json();
		if (data.cod === '404') {
			return c.json({ error: 'No data. Try another city?' }, 404);
		}

		return c.json(data, 200, { 'Cache-Control': 'private, max-age=600, stale-while-revalidate=300' });
	});
