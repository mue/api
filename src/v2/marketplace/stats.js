import { desc, eq, sql } from 'drizzle-orm';

import { getManifest, getStats } from '@/v2/marketplace/utils.js';

import { marketplaceAnalytics } from '@/db/schema.js';

export async function getGlobalStats(c) {
  const stats = await getStats();
  return c.json({ data: stats });
}

export async function getCategoryStats(c) {
  const category = c.req.param('category');
  if (!['preset_settings', 'photo_packs', 'quote_packs'].includes(category)) {
    return c.json({ error: 'Invalid category' }, 404);
  }

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
  const limit = parseInt(c.req.query('limit')) || 20;
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
  const limit = parseInt(c.req.query('limit')) || 20;
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
