import { Hono } from 'hono';

import { eq, sql } from 'drizzle-orm';

import { oldQuotes } from '@/db/schema.js';

export default new Hono()
  .get('/languages', async (c) => {
    const db = c.get('db');
    const rows = await db.selectDistinct({ name: oldQuotes.language }).from(oldQuotes);

    return c.json(rows.map((r) => r.name));
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
