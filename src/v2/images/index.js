import { Hono } from 'hono';
import { validator } from 'hono/validator';

import { count, desc, and, eq, inArray, notInArray, sql } from 'drizzle-orm';

import { images, imageAnalytics } from '@/db/schema';

import sizes from '@/util/sizes';

import { safeFetchJson } from '@/util/fetch';
import { CDN, UNSPLASH_API } from '@/constants';

import { getUnsplashImage, NAMED_COLLECTIONS } from '@/v2/images/unsplash';
import { incrementImageView, incrementImageDownload, incrementImageHeart, getImageStats, getImageDailyStats, getImagesTrending, upsertImageView, upsertDailyView } from '@/v2/images/analytics';

const VALID_QUALITIES = new Set(Object.keys(sizes));
const VALID_QUALITIES_STR = Object.keys(sizes).join(', ');
const CATEGORIES_KV_KEY = 'v2_image_categories';
const PHOTOGRAPHERS_KV_KEY = 'v2_image_photographers';
const KV_TTL = 86400;

async function getCachedRows(c, kvKey, queryFn) {
  let data = await c.env.cache.get(kvKey, { type: 'json' });

  if (!data) {
    data = await queryFn();
    try {
      c.executionCtx.waitUntil(
        c.env.cache.put(kvKey, JSON.stringify(data), { expirationTtl: KV_TTL }),
      );
    } catch {
      // executionCtx unavailable outside Cloudflare Workers runtime
    }
  }

  return data;
}

export default new Hono()
  .get('/trending', getImagesTrending)
  .post('/:id/view', incrementImageView)
  .post('/:id/download', incrementImageDownload)
  .post('/:id/heart', incrementImageHeart)
  .get('/:id/stats', getImageStats)
  .get('/:id/daily-stats', getImageDailyStats)
  .get('/categories', async (c) => {
    const db = c.get('db');
    const data = await getCachedRows(c, CATEGORIES_KV_KEY, () =>
      db
        .select({ count: count(), name: images.category })
        .from(images)
        .groupBy(images.category)
        .orderBy(desc(count())),
    );
    return c.json(data);
  })
  .get('/photographers', async (c) => {
    const db = c.get('db');
    const data = await getCachedRows(c, PHOTOGRAPHERS_KV_KEY, () =>
      db
        .select({ count: count(), name: images.photographer })
        .from(images)
        .groupBy(images.photographer)
        .orderBy(desc(count())),
    );
    return c.json(data);
  })
  .get(
    '/random',
    validator('query', (value, c) => {
      if (value.quality !== undefined && !VALID_QUALITIES.has(value.quality)) {
        return c.json(
          { error: `\`quality\` must be one of: ${VALID_QUALITIES_STR}` },
          400,
        );
      }

      return value;
    }),
    async (c) => {
      const db = c.get('db');

      const excludeList = c.req.query('exclude')?.split(',').map(Number).filter(Boolean) ?? [];
      const conditions = [];

      const categoriesParam = c.req.query('categories');
      if (categoriesParam) {
        const allowed = await getCachedRows(c, CATEGORIES_KV_KEY, () =>
          db
            .select({ count: count(), name: images.category })
            .from(images)
            .groupBy(images.category)
            .orderBy(desc(count())),
        );
        const allowedNames = new Set(allowed.map((row) => row.name));
        const requestedCategories = categoriesParam.split(',').filter((c) => allowedNames.has(c));
        if (requestedCategories.length > 0) {
          conditions.push(inArray(images.category, requestedCategories));
        }
      }

      if (excludeList.length > 0) {
        conditions.push(notInArray(images.pun, excludeList));
      }

      const data = await db
        .select({
          blurHash: images.blurHash,
          camera: images.camera,
          category: images.category,
          colour: images.colour,
          id: images.id,
          locationData: images.locationData,
          locationName: images.locationName,
          photographer: images.photographer,
          pun: images.pun,
          version: images.version,
          views: imageAnalytics.views,
          downloads: imageAnalytics.downloads,
          hearts: imageAnalytics.hearts,
        })
        .from(images)
        .leftJoin(imageAnalytics, eq(images.id, imageAnalytics.imageId))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sql`RANDOM()`)
        .limit(1)
        .then((rows) => rows[0]);

      if (!data) {
        return c.json({ error: 'No image found' }, 404);
      }

      try {
        c.executionCtx.waitUntil(
          Promise.all([upsertImageView(c.get('db'), data.id), upsertDailyView(c.get('db'), data.id)]),
        );
      } catch {
        // executionCtx unavailable outside Cloudflare Workers runtime
      }

      const format = c.req.header('accept')?.includes('avif') ? 'avif' : 'webp';
      const quality = sizes[c.req.query('quality')] ?? 'fhd';
      const locationData = data.locationData ? JSON.parse(data.locationData) : null;

      return c.json(
        {
          blur_hash: data.blurHash,
          camera: data.camera,
          category: data.category,
          colour: data.colour,
          downloads: data.downloads ?? 0,
          file: `${CDN}/img/${quality}/${data.id}.${format}?v=${data.version}`,
          hearts: data.hearts ?? 0,
          id: data.id,
          location: {
            latitude: locationData?.latitude ?? null,
            longitude: locationData?.longitude ?? null,
            name: data.locationName,
          },
          photographer: data.photographer,
          pun: data.pun,
          views: data.views ?? 0,
        },
        200,
        { 'Cache-Control': 'no-store' },
      );
    },
  )
  .get('/unsplash/topics', async (c) => {
    const data = await safeFetchJson(`${UNSPLASH_API}/topics?client_id=${c.env.UNSPLASH_TOKEN}`, {
      cf: { cacheTtl: 86400 },
      signal: AbortSignal.timeout(5000),
    });

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

      if (value.quality !== undefined && !VALID_QUALITIES.has(value.quality)) {
        return c.json(
          { error: `\`quality\` must be one of: ${VALID_QUALITIES_STR}` },
          400,
        );
      }

      return value;
    }),
    async (c) => {
      const { categories, collections, orientation, topics, username, exclude } = c.req.query();
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

      if (exclude !== undefined && exclude.trim?.()) {
        unsplash_query.set('exclude', exclude.trim());
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
