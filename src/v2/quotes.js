import { Hono } from 'hono';

import { validator } from 'hono/validator';

import { count, desc, eq, sql } from 'drizzle-orm';

import { quotes } from '@/db/schema';

const KV_KEY = 'v2_quote_languages';

async function getLanguages(db, c) {
  let languages = await c.env.cache.get(KV_KEY, { type: 'json' });

  if (!languages) {
    languages = await db
      .select({ count: count(), name: quotes.language })
      .from(quotes)
      .groupBy(quotes.language)
      .orderBy(desc(count()));

    c.executionCtx.waitUntil(
      c.env.cache.put(KV_KEY, JSON.stringify(languages), { expirationTtl: 86400 }),
    );
  }

  return languages;
}

export default new Hono()
  .get('/languages', async (c) => {
    const languages = await getLanguages(c.get('db'), c);
    return c.json(languages);
  })
  .get(
    '/random',
    validator('query', (value, c) => {
      if (value.language !== undefined && typeof value.language !== 'string') {
        return c.json({ error: '`language` must be a string' }, 400);
      }

      return value;
    }),
    async (c) => {
      const db = c.get('db');
      const { language = 'en' } = c.req.valid('query');

      const languages = await getLanguages(db, c);
      if (!languages.some((l) => l.name === language)) {
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
    },
  );
