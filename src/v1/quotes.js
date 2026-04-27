import { Hono } from 'hono';

import { eq, sql } from 'drizzle-orm';

import { oldQuotes } from '@/db/schema';

const LANGUAGES_KV_KEY = 'v1_quote_languages';
const KV_TTL = 86400;

export default new Hono()
  .get('/languages', async (c) => {
    let languages = await c.env.cache.get(LANGUAGES_KV_KEY, { type: 'json' });

    if (!languages) {
      const rows = await c.get('db').selectDistinct({ name: oldQuotes.language }).from(oldQuotes);
      languages = rows.map((r) => r.name);

      try {
        c.executionCtx.waitUntil(
          c.env.cache.put(LANGUAGES_KV_KEY, JSON.stringify(languages), {
            expirationTtl: KV_TTL,
          }),
        );
      } catch {
        // executionCtx unavailable outside Cloudflare Workers runtime
      }
    }

    return c.json(languages);
  })
  .get('/random', async (c) => {
    const db = c.get('db');
    const language = c.req.query('language')?.replace('French', 'Français') || 'English';

    const data = await db
      .select()
      .from(oldQuotes)
      .where(eq(oldQuotes.language, language))
      .orderBy(sql`RANDOM()`)
      .limit(1)
      .then((rows) => rows[0]);

    return c.json(data);
  });
