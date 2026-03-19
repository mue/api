import { Hono } from 'hono';

import { count, desc, eq, sql } from 'drizzle-orm';

import { quotes } from '@/db/schema.js';

export default new Hono()
  .get('/languages', async (c) => {
    const db = c.get('db');
    const data = await db
      .select({
        count: count(),
        name: quotes.language,
      })
      .from(quotes)
      .groupBy(quotes.language)
      .orderBy(desc(count()));

    return c.json(data);
  })
  .get('/random', async (c) => {
    const db = c.get('db');
    const kv_id = 'v2_quote_languages';

    let allowed = await c.env.cache.get(kv_id, {
      cacheTtl: 3600,
      type: 'json',
    });

    if (!allowed) {
      allowed = await db
        .select({
          count: count(),
          name: quotes.language,
        })
        .from(quotes)
        .groupBy(quotes.language)
        .orderBy(desc(count()));

      c.executionCtx.waitUntil(
        c.env.cache.put(kv_id, JSON.stringify(allowed), { expirationTtl: 86400 }),
      );
    }

    const allowedNames = allowed.map((row) => row.name);
    const language = c.req.query('language') || 'en';
    if (!allowedNames.includes(language)) {
      return c.json({ error: 'Unsupported language' }, 400);
    }

    const data = await db
      .select()
      .from(quotes)
      .where(eq(quotes.language, language))
      .orderBy(sql`RANDOM()`)
      .limit(1)
      .then((rows) => rows[0]);

    return c.json(data, 200, { 'Cache-Control': 'no-store' });
  });
