import { Hono } from 'hono';
import { validator } from 'hono/validator';

import { count, desc, eq, and, notInArray, sql } from 'drizzle-orm';

import { images } from '@/db/schema';

import sizes from '@/util/sizes';

import { CDN } from '@/constants';

const VALID_QUALITIES = new Set(Object.keys(sizes));
const VALID_QUALITIES_STR = Object.keys(sizes).join(', ');
const CATEGORIES_KV_KEY = 'image_categories';
const PHOTOGRAPHERS_KV_KEY = 'v1_image_photographers';
const KV_TTL = 86400;

export default new Hono()
  .get('/categories', async (c) => {
    let data = await c.env.cache.get(CATEGORIES_KV_KEY, { type: 'json' });

    if (!data) {
      data = await c
        .get('db')
        .select({ count: count(), name: images.category })
        .from(images)
        .groupBy(images.category)
        .orderBy(desc(count()));

      try {
        c.executionCtx.waitUntil(
          c.env.cache.put(CATEGORIES_KV_KEY, JSON.stringify(data), { expirationTtl: KV_TTL }),
        );
      } catch {
        // executionCtx unavailable outside Cloudflare Workers runtime
      }
    }

    return c.json(data.map((row) => row.name));
  })
  .get('/photographers', async (c) => {
    let data = await c.env.cache.get(PHOTOGRAPHERS_KV_KEY, { type: 'json' });

    if (!data) {
      data = await c
        .get('db')
        .select({ count: count(), name: images.photographer })
        .from(images)
        .groupBy(images.photographer)
        .orderBy(desc(count()));

      try {
        c.executionCtx.waitUntil(
          c.env.cache.put(PHOTOGRAPHERS_KV_KEY, JSON.stringify(data), { expirationTtl: KV_TTL }),
        );
      } catch {
        // executionCtx unavailable outside Cloudflare Workers runtime
      }
    }

    return c.json(data.map((row) => row.name));
  })
  .get(
    '/random',
    validator('query', (value, c) => {
      if (value.quality !== undefined && !VALID_QUALITIES.has(value.quality)) {
        return c.json({ error: `\`quality\` must be one of: ${VALID_QUALITIES_STR}` }, 400);
      }

      return value;
    }),
    async (c) => {
      const db = c.get('db');

      let categories = await c.env.cache.get(CATEGORIES_KV_KEY, { type: 'json' });

      if (!categories) {
        categories = await db
          .select({
            count: count(),
            name: images.category,
          })
          .from(images)
          .groupBy(images.category)
          .orderBy(desc(count()));

        try {
          c.executionCtx.waitUntil(
            c.env.cache.put(CATEGORIES_KV_KEY, JSON.stringify(categories), {
              expirationTtl: KV_TTL,
            }),
          );
        } catch {
        // executionCtx unavailable outside Cloudflare Workers runtime
      }
      }

      const category = categories[Math.floor(Math.random() * categories.length)].name;

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

      return c.json(
        {
          camera: data.camera,
          category: data.category,
          file: `${CDN}/img/${quality}/${data.id}.${format}?v=${data.version}`,
          location: data.locationName,
          photographer: data.photographer,
        },
        200,
        { 'Cache-Control': 'no-store' },
      );
    },
  );
