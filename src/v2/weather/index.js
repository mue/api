import { Hono } from 'hono';

import { validator } from 'hono/validator';

import { withWeatherLanguage } from '@/v2/weather/middleware';
import { OPENWEATHER } from '@/v2/weather/constants';
import { safeFetchJson } from '@/util/fetch';

const requireCoords = validator('query', (value, c) => {
  if (!value.latitude || !value.longitude) {
    return c.json({ error: '`latitude` and `longitude` params are required' }, 400);
  }

  return value;
});

export default new Hono()
  .get('/gps', withWeatherLanguage, requireCoords, async (c) => {
    const { latitude, longitude } = c.req.valid('query');
    const url = `${OPENWEATHER}/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${c.env.OPENWEATHER_TOKEN}&lang=${c.get('language')}`;
    const data = await safeFetchJson(url, { signal: AbortSignal.timeout(5000) });

    return c.json(data, 200, {
      'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400, immutable',
    });
  })
  .get(
    '/geocode',
    withWeatherLanguage,
    validator('query', (value, c) => {
      if (!value.q) {
        return c.json({ error: '`q` param is required' }, 400);
      }

      if (value.q.length < 2) {
        return c.json({ error: '`q` must be at least 2 characters' }, 400);
      }

      if (value.q.length > 200) {
        return c.json({ error: '`q` must be at most 200 characters' }, 400);
      }

      return value;
    }),
    async (c) => {
      const { q, limit = 5 } = c.req.valid('query');
      const url = `${OPENWEATHER}/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=${limit}&appid=${c.env.OPENWEATHER_TOKEN}`;
      const data = await safeFetchJson(url, { signal: AbortSignal.timeout(5000) });

      const locations = data.map((loc) => ({
        country: loc.country,
        displayName: [loc.name, loc.state, loc.country].filter(Boolean).join(', '),
        lat: loc.lat,
        lon: loc.lon,
        name: loc.name,
        state: loc.state || null,
      }));

      return c.json(locations, 200, {
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400, immutable',
      });
    },
  )
  .get(
    '/weather',
    withWeatherLanguage,
    validator('query', (value, c) => {
      if (value.lat && value.lon) {
        const latitude = parseFloat(value.lat);
        const longitude = parseFloat(value.lon);

        if (isNaN(latitude) || isNaN(longitude)) {
          return c.json({ error: 'Invalid coordinates: `lat` and `lon` must be numbers' }, 400);
        }

        if (latitude < -90 || latitude > 90) {
          return c.json({ error: 'Invalid latitude: must be between -90 and 90' }, 400);
        }

        if (longitude < -180 || longitude > 180) {
          return c.json({ error: 'Invalid longitude: must be between -180 and 180' }, 400);
        }

        return { ...value, lat: latitude, lon: longitude };
      }

      if (!value.city) {
        return c.json({ error: 'Either `city` param or `lat` and `lon` params are required' }, 400);
      }

      return value;
    }),
    async (c) => {
      const { city, lat, lon } = c.req.valid('query');
      const url =
        lat && lon
          ? `${OPENWEATHER}/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${c.env.OPENWEATHER_TOKEN}&lang=${c.get('language')}`
          : `${OPENWEATHER}/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${c.env.OPENWEATHER_TOKEN}&lang=${c.get('language')}`;

      const data = await safeFetchJson(url, { signal: AbortSignal.timeout(5000) });
      if (data.cod === '404') {
        return c.json({ error: 'No data. Try another city?' }, 404);
      }

      return c.json(data, 200, {
        'Cache-Control': 'private, max-age=600, stale-while-revalidate=300',
      });
    },
  );
