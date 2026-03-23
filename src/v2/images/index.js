import { Hono } from 'hono';
import { validator } from 'hono/validator';

import { count, desc, eq, and, notInArray, sql } from 'drizzle-orm';

import { images } from '@/db/schema.js';
import sizes from '@/util/sizes';
import { CDN, MAPBOX, UNSPLASH_API } from '@/constants.js';

import { getUnsplashImage, NAMED_COLLECTIONS } from '@/v2/images/unsplash';

export default new Hono()
  .get('/categories', async (c) => {
    const db = c.get('db');

    const data = await db
      .select({
        count: count(),
        name: images.category,
      })
      .from(images)
      .groupBy(images.category)
      .orderBy(desc(count()));

    return c.json(data);
  })
  .get('/photographers', async (c) => {
    const db = c.get('db');

    const data = await db
      .select({
        count: count(),
        name: images.photographer,
      })
      .from(images)
      .groupBy(images.photographer)
      .orderBy(desc(count()));

    return c.json(data);
  })
  .get(
    '/random',
    validator('query', (value, c) => {
      if (value.quality !== undefined && !Object.keys(sizes).includes(value.quality)) {
        return c.json(
          { error: `\`quality\` must be one of: ${Object.keys(sizes).join(', ')}` },
          400,
        );
      }

      return value;
    }),
    async (c) => {
      const db = c.get('db');
      const kv_id = 'v2_image_categories';

      let allowed = await c.env.cache.get(kv_id, {
        cacheTtl: 3600,
        type: 'json',
      });

      if (!allowed) {
        allowed = await db
          .select({
            count: count(),
            name: images.category,
          })
          .from(images)
          .groupBy(images.category)
          .orderBy(desc(count()));

        c.executionCtx.waitUntil(
          c.env.cache.put(kv_id, JSON.stringify(allowed), { expirationTtl: 86400 }),
        );
      }

      const allowedNames = allowed.map((row) => row.name);
      let categories =
        c.req
          .query('categories')
          ?.split(',')
          ?.filter((category) => allowedNames.includes(category)) ?? [];

      if (categories.length === 0) {
        categories = allowedNames;
      }

      const category = categories[Math.floor(Math.random() * categories.length)];

      const excludeList = c.req.query('exclude')?.split(',').map(Number).filter(Boolean) ?? [];
      const conditions = [eq(images.category, category)];
      if (excludeList.length > 0) {
        conditions.push(notInArray(images.pun, excludeList));
      }

      const data = await db
        .select()
        .from(images)
        .where(and(...conditions))
        .orderBy(sql`RANDOM()`)
        .limit(1)
        .then((rows) => rows[0]);

      const format = c.req.header('accept')?.includes('avif') ? 'avif' : 'webp';
      const quality = sizes[c.req.query('quality')] ?? 'fhd';
      const coordinates = data.locationData?.split(',');

      return c.json(
        {
          blur_hash: data.blurHash,
          camera: data.camera,
          category: data.category,
          colour: data.colour,
          file: `${CDN}/img/${quality}/${data.id}.${format}?v=${data.version}`,
          id: data.id,
          location: {
            latitude: coordinates?.[0] ?? null,
            longitude: coordinates?.[1] ?? null,
            name: data.locationName,
          },
          photographer: data.photographer,
          pun: data.pun,
        },
        200,
        { 'Cache-Control': 'no-store' },
      );
    },
  )
  .get(
    '/map',
    validator('query', (value, c) => {
      if (!value.latitude || !value.longitude) {
        return c.json({ error: '`latitude` and `longitude` params are required' }, 400);
      }

      return value;
    }),
    async (c) => {
      const { latitude, longitude } = c.req.valid('query');
      const url = `${MAPBOX}/styles/v1/mapbox/streets-v11/static/pin-s+555555(${longitude},${latitude})/${longitude},${latitude},9},0/450x200?access_token=${c.env.MAPBOX_TOKEN}`;
      const res = await fetch(url, { cf: { cacheTtl: 31536000 }, signal: AbortSignal.timeout(5000) });

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries([...res.headers, ['Cross-Origin-Resource-Policy', 'cross-origin']]),
      });
    },
  )
  .get('/unsplash/topics', async (c) => {
    const data = await (
      await fetch(`${UNSPLASH_API}/topics?client_id=${c.env.UNSPLASH_TOKEN}`, {
        cf: { cacheTtl: 86400 },
        signal: AbortSignal.timeout(5000),
      })
    ).json();

    return c.json(data, 200, {
      'Cache-Control': 'public, s-max-age=604800, max-age=86400, stale-while-revalidate=86400',
    });
  })
  .get(
    '/unsplash',
    validator('query', (value, c) => {
      const validOrientations = ['landscape', 'portrait', 'squarish'];
      if (value.orientation !== undefined && !validOrientations.includes(value.orientation)) {
        return c.json(
          { error: `\`orientation\` must be one of: ${validOrientations.join(', ')}` },
          400,
        );
      }

      if (value.quality !== undefined && !Object.keys(sizes).includes(value.quality)) {
        return c.json(
          { error: `\`quality\` must be one of: ${Object.keys(sizes).join(', ')}` },
          400,
        );
      }

      return value;
    }),
    async (c) => {
      const { categories, collections, orientation, topics, username } = c.req.query();
      const unsplash_query = new URLSearchParams({ orientation: orientation ?? 'landscape' });

      if (categories && categories.length > 0) {
        unsplash_query.set(
          'collections',
          categories
            .split(',')
            .map((category) => NAMED_COLLECTIONS[category])
            .join(','),
        );
      }

      if (collections !== undefined && collections.trim?.()) {
        unsplash_query.set('collections', collections.trim());
      }

      if (topics !== undefined) {
        unsplash_query.set('topics', topics);
      }

      if (username !== undefined) {
        unsplash_query.set('username', username);
      }

      if (!unsplash_query.get('collections')) {
        unsplash_query.set('collections', Object.values(NAMED_COLLECTIONS).join(','));
      }

      const data = await getUnsplashImage(
        unsplash_query,
        c.req.query('quality') ?? 'normal',
        c.env,
      );

      return c.json(data, 200, { 'Cache-Control': 'no-store' });
    },
  );
