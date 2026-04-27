import { desc, eq, sql } from 'drizzle-orm';

import { getManifest, getStats, resolveIdentifier } from '@/v2/marketplace/utils';

import { marketplaceAnalytics } from '@/db/schema';

export async function incrementItemView(c) {
  const manifest = await getManifest();
  const db = c.get('db');

  const category = c.req.param('category');
  const resolved = category
    ? resolveIdentifier(manifest, c.req.param('item'), category)
    : resolveIdentifier(manifest, c.req.param('item'));

  if (!resolved) {
    return c.json({ error: 'Item Not Found' }, 404);
  }

  const { key: itemKey, category: resolvedCategory } = resolved;

  if (!manifest[resolvedCategory]) {
    return c.json({ error: 'Category Not Found' }, 404);
  }

  if (manifest[resolvedCategory][itemKey] === undefined) {
    return c.json({ error: 'Item Not Found' }, 404);
  }

  const [analyticsData] = await db
    .insert(marketplaceAnalytics)
    .values({
      category: resolvedCategory,
      itemId: itemKey,
      updatedAt: sql`CURRENT_TIMESTAMP`,
      views: 1,
    })
    .onConflictDoUpdate({
      set: { updatedAt: sql`CURRENT_TIMESTAMP`, views: sql`${marketplaceAnalytics.views} + 1` },
      target: [marketplaceAnalytics.itemId, marketplaceAnalytics.category],
    })
    .returning({ downloads: marketplaceAnalytics.downloads, views: marketplaceAnalytics.views });

  return c.json(
    {
      downloads: analyticsData?.downloads || 0,
      views: analyticsData?.views || 1,
    },
    200,
    { 'Cache-Control': 'no-store' },
  );
}

export async function incrementItemDownload(c) {
  const manifest = await getManifest();
  const db = c.get('db');

  const category = c.req.param('category');
  const resolved = category
    ? resolveIdentifier(manifest, c.req.param('item'), category)
    : resolveIdentifier(manifest, c.req.param('item'));

  if (!resolved) {
    return c.json({ error: 'Item Not Found' }, 404);
  }

  const { key: itemKey, category: resolvedCategory } = resolved;

  if (!manifest[resolvedCategory]) {
    return c.json({ error: 'Category Not Found' }, 404);
  }

  if (manifest[resolvedCategory][itemKey] === undefined) {
    return c.json({ error: 'Item Not Found' }, 404);
  }

  const [analyticsData] = await db
    .insert(marketplaceAnalytics)
    .values({
      category: resolvedCategory,
      downloads: 1,
      itemId: itemKey,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .onConflictDoUpdate({
      set: {
        downloads: sql`${marketplaceAnalytics.downloads} + 1`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
      target: [marketplaceAnalytics.itemId, marketplaceAnalytics.category],
    })
    .returning({ downloads: marketplaceAnalytics.downloads });

  return c.json(
    {
      downloads: analyticsData?.downloads || 1,
    },
    200,
    { 'Cache-Control': 'no-store' },
  );
}

export async function getGlobalStats(c) {
  const stats = await getStats();
  return c.json({ data: stats });
}

export async function getCategoryStats(c) {
  const { category } = c.req.valid('param');
  const manifest = await getManifest();
  const items = Object.values(manifest[category]);

  const stats = {
    authors: [...new Set(items.map((item) => item.author))].length,
    category,
    languages: [...new Set(items.map((item) => item.language).filter(Boolean))],
    recent_items: items
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10),
  };

  return c.json({ data: stats });
}

export async function getTrending(c) {
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit')) || 20));
  const category = c.req.query('category');
  const db = c.get('db');

  const weightedScore = sql`(${marketplaceAnalytics.views} * 0.3 + ${marketplaceAnalytics.downloads} * 0.7)`;

  let analyticsData;
  try {
    const query = db
      .select({
        category: marketplaceAnalytics.category,
        downloads: marketplaceAnalytics.downloads,
        item_id: marketplaceAnalytics.itemId,
        views: marketplaceAnalytics.views,
      })
      .from(marketplaceAnalytics)
      .orderBy(desc(weightedScore))
      .limit(limit);

    analyticsData = await (category
      ? query.where(eq(marketplaceAnalytics.category, category))
      : query);
  } catch {
    return c.json({ error: 'Failed to fetch trending items' }, 500);
  }

  const manifest = await getManifest();
  const trendingItems = analyticsData
    .map((row) => {
      const item = manifest[row.category]?.[row.item_id];
      if (!item) {
        return null;
      }

      return { ...item, downloads: row.downloads || 0, views: row.views || 0 };
    })
    .filter(Boolean);

  return c.json({
    data: trendingItems,
    meta: { total: trendingItems.length },
  });
}

export async function getRecent(c) {
  const stats = await getStats();
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit')) || 20));
  const category = c.req.query('category');

  let recentItems = stats.recent_items;

  if (category) {
    recentItems = recentItems.filter((item) => item.type === category);
  }

  return c.json({
    data: recentItems.slice(0, limit),
    meta: { total: recentItems.length },
  });
}
