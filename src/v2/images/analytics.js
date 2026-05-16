import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { imageAnalytics, imageAnalyticsDaily, images } from '@/db/schema';

async function findImage(db, id) {
  return db
    .select({ id: images.id })
    .from(images)
    .where(eq(images.id, id))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function upsertImageView(db, id) {
  return db
    .insert(imageAnalytics)
    .values({ imageId: id, updatedAt: sql`CURRENT_TIMESTAMP`, views: 1 })
    .onConflictDoUpdate({
      set: { updatedAt: sql`CURRENT_TIMESTAMP`, views: sql`${imageAnalytics.views} + 1` },
      target: [imageAnalytics.imageId],
    })
    .returning({ downloads: imageAnalytics.downloads, views: imageAnalytics.views });
}

export async function upsertDailyView(db, id) {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .insert(imageAnalyticsDaily)
    .values({ imageId: id, date: today, views: 1 })
    .onConflictDoUpdate({
      set: { views: sql`${imageAnalyticsDaily.views} + 1` },
      target: [imageAnalyticsDaily.imageId, imageAnalyticsDaily.date],
    });
}

export async function incrementImageView(c) {
  const db = c.get('db');
  const id = c.req.param('id');

  if (!(await findImage(db, id))) {
    return c.json({ error: 'Image Not Found' }, 404);
  }

  const [rows] = await Promise.all([upsertImageView(db, id), upsertDailyView(db, id)]);

  const data = rows[0];
  return c.json(
    { downloads: data?.downloads || 0, views: data?.views || 1 },
    200,
    { 'Cache-Control': 'no-store' },
  );
}

export async function incrementImageDownload(c) {
  const db = c.get('db');
  const id = c.req.param('id');

  if (!(await findImage(db, id))) {
    return c.json({ error: 'Image Not Found' }, 404);
  }

  const today = new Date().toISOString().slice(0, 10);
  const [aggregate] = await Promise.all([
    db
      .insert(imageAnalytics)
      .values({ downloads: 1, imageId: id, updatedAt: sql`CURRENT_TIMESTAMP` })
      .onConflictDoUpdate({
        set: { downloads: sql`${imageAnalytics.downloads} + 1`, updatedAt: sql`CURRENT_TIMESTAMP` },
        target: [imageAnalytics.imageId],
      })
      .returning({ downloads: imageAnalytics.downloads }),
    db
      .insert(imageAnalyticsDaily)
      .values({ imageId: id, date: today, downloads: 1 })
      .onConflictDoUpdate({
        set: { downloads: sql`${imageAnalyticsDaily.downloads} + 1` },
        target: [imageAnalyticsDaily.imageId, imageAnalyticsDaily.date],
      }),
  ]);

  return c.json(
    { downloads: aggregate[0]?.downloads || 1 },
    200,
    { 'Cache-Control': 'no-store' },
  );
}

export async function incrementImageHeart(c) {
  const db = c.get('db');
  const id = c.req.param('id');

  if (!(await findImage(db, id))) {
    return c.json({ error: 'Image Not Found' }, 404);
  }

  const today = new Date().toISOString().slice(0, 10);
  const [aggregate] = await Promise.all([
    db
      .insert(imageAnalytics)
      .values({ imageId: id, hearts: 1, updatedAt: sql`CURRENT_TIMESTAMP` })
      .onConflictDoUpdate({
        set: { hearts: sql`${imageAnalytics.hearts} + 1`, updatedAt: sql`CURRENT_TIMESTAMP` },
        target: [imageAnalytics.imageId],
      })
      .returning({ hearts: imageAnalytics.hearts }),
    db
      .insert(imageAnalyticsDaily)
      .values({ imageId: id, date: today, hearts: 1 })
      .onConflictDoUpdate({
        set: { hearts: sql`${imageAnalyticsDaily.hearts} + 1` },
        target: [imageAnalyticsDaily.imageId, imageAnalyticsDaily.date],
      }),
  ]);

  return c.json(
    { hearts: aggregate[0]?.hearts || 1 },
    200,
    { 'Cache-Control': 'no-store' },
  );
}

export async function getImagesTrending(c) {
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit')) || 20));
  const db = c.get('db');

  const weightedScore = sql`(${imageAnalytics.views} * 0.3 + ${imageAnalytics.downloads} * 0.5 + ${imageAnalytics.hearts} * 0.2)`;

  const analyticsRows = await db
    .select({
      downloads: imageAnalytics.downloads,
      hearts: imageAnalytics.hearts,
      imageId: imageAnalytics.imageId,
      views: imageAnalytics.views,
    })
    .from(imageAnalytics)
    .orderBy(desc(weightedScore))
    .limit(limit);

  if (analyticsRows.length === 0) {
    return c.json({ data: [], meta: { total: 0 } }, 200, { 'Cache-Control': 'no-store' });
  }

  const ids = analyticsRows.map((r) => r.imageId);
  const imageRows = await db.select().from(images).where(inArray(images.id, ids));
  const imageMap = Object.fromEntries(imageRows.map((img) => [img.id, img]));

  const trendingImages = analyticsRows
    .map((row) => {
      const img = imageMap[row.imageId];
      if (!img) return null;
      return { ...img, downloads: row.downloads || 0, hearts: row.hearts || 0, views: row.views || 0 };
    })
    .filter(Boolean);

  return c.json(
    { data: trendingImages, meta: { total: trendingImages.length } },
    200,
    { 'Cache-Control': 'no-store' },
  );
}

export async function getImageStats(c) {
  const db = c.get('db');
  const id = c.req.param('id');

  const data = await db
    .select({
      downloads: imageAnalytics.downloads,
      hearts: imageAnalytics.hearts,
      views: imageAnalytics.views,
    })
    .from(imageAnalytics)
    .where(eq(imageAnalytics.imageId, id))
    .limit(1)
    .then((rows) => rows[0]);

  return c.json(
    { downloads: data?.downloads || 0, hearts: data?.hearts || 0, views: data?.views || 0 },
    200,
    { 'Cache-Control': 'no-store' },
  );
}

export async function getImageDailyStats(c) {
  const db = c.get('db');
  const id = c.req.param('id');

  const rows = await db
    .select({
      date: imageAnalyticsDaily.date,
      downloads: imageAnalyticsDaily.downloads,
      hearts: imageAnalyticsDaily.hearts,
      views: imageAnalyticsDaily.views,
    })
    .from(imageAnalyticsDaily)
    .where(
      and(
        eq(imageAnalyticsDaily.imageId, id),
        sql`${imageAnalyticsDaily.date} >= date('now', '-29 days')`,
      ),
    )
    .orderBy(imageAnalyticsDaily.date);

  return c.json(rows, 200, { 'Cache-Control': 'no-store' });
}
