import { Hono } from 'hono';
import { validator } from 'hono/validator';

import { MAPBOX } from '@/constants';
import { HTTPException } from 'hono/http-exception';

export default new Hono().get(
  '/',
  validator('query', (value, c) => {
    const lat = Number(value.latitude);
    const lon = Number(value.longitude);

    if (!value.latitude || !value.longitude) {
      return c.json({ error: '`latitude` and `longitude` params are required' }, 400);
    }

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return c.json({ error: '`latitude` must be -90–90 and `longitude` must be -180–180' }, 400);
    }

    return { latitude: lat, longitude: lon };
  }),
  async (c) => {
    const { latitude, longitude } = c.req.valid('query');
    const url = `${MAPBOX}/styles/v1/mapbox/streets-v11/static/pin-s+555555(${longitude},${latitude})/${longitude},${latitude},9,0/450x200?access_token=${c.env.MAPBOX_TOKEN}`;

    let res;
    try {
      res = await fetch(url, { cf: { cacheTtl: 31536000 }, signal: AbortSignal.timeout(5000) });
    } catch {
      throw new HTTPException(503, { message: 'Map service unavailable' });
    }

    if (!res.ok) {
      throw new HTTPException(503, { message: 'Map service unavailable' });
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  },
);
