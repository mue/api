import { Hono } from 'hono';
import { validator } from 'hono/validator';

import { HTTPException } from 'hono/http-exception';

const STATICMAP = 'https://staticmap.openstreetmap.de/staticmap.php';

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
    const url = `${STATICMAP}?center=${latitude},${longitude}&zoom=9&size=450x200&markers=${latitude},${longitude},ol-marker`;

    let res;
    try {
      res = await fetch(url, { cf: { cacheTtl: 31536000 }, signal: AbortSignal.timeout(5000) });
    } catch {
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
