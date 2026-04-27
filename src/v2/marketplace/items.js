import { inArray } from 'drizzle-orm';

import paginate from '@/util/pagination';
import { safeFetchJson } from '@/util/fetch';
import { MARKETPLACE_DATA } from '@/constants';

import { getManifest, resolveIdentifier, applyFilters, applySorting } from '@/v2/marketplace/utils';

import { marketplaceAnalytics } from '@/db/schema';

export async function getItem(c) {
  const manifest = await getManifest();

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

  let item = await safeFetchJson(`${MARKETPLACE_DATA}/${resolvedCategory}/${itemKey}.json`, {
    cf: { cacheTtl: 3600 },
    signal: AbortSignal.timeout(5000),
  });

  item.in_collections = manifest[resolvedCategory][itemKey].in_collections.map((name) => {
    const collection = manifest.collections[name];
    // eslint-disable-next-line no-unused-vars
    const { items, ...collectionWithoutItems } = collection;
    return collectionWithoutItems;
  });

  const version = c.get('version');
  if (version === 2) {
    item = {
      display_name: item.name,
      ...item,
      name: itemKey,
    };
  }

  return c.json({ data: item, updated: item.updated_at });
}

export async function getItems(c) {
  let data;

  const manifest = await getManifest();
  const db = c.get('db');
  const query = c.req.query();

  if (c.req.param('category') === 'all') {
    data = [
      ...Object.values(manifest.preset_settings).map((item) => ({
        ...item,
        type: 'preset_settings',
      })),
      ...Object.values(manifest.photo_packs).map((item) => ({ ...item, type: 'photo_packs' })),
      ...Object.values(manifest.quote_packs).map((item) => ({ ...item, type: 'quote_packs' })),
    ];
  } else {
    const category = manifest[c.req.param('category')];
    if (!category) {
      return c.json({ error: 'Not Found' }, 404);
    }

    data = Object.values(category);
    const version = c.get('version');

    if (version === 1) {
      data = data.map((item) => ({ ...item, type: c.req.param('category') }));
    }
  }

  if (query.include_analytics === 'true') {
    try {
      const itemIds = data.map((item) => item.name || item.id);
      if (itemIds.length > 0) {
        const analyticsData = await db
          .select({
            downloads: marketplaceAnalytics.downloads,
            item_id: marketplaceAnalytics.itemId,
            views: marketplaceAnalytics.views,
          })
          .from(marketplaceAnalytics)
          .where(inArray(marketplaceAnalytics.itemId, itemIds));

        if (analyticsData) {
          const analyticsMap = new Map(
            analyticsData.map((row) => [
              row.item_id,
              { downloads: row.downloads || 0, views: row.views || 0 },
            ]),
          );

          data = data.map((item) => {
            const itemKey = item.name || item.id;
            const analytics = analyticsMap.get(itemKey);
            return analytics ? { ...item, ...analytics } : { ...item, downloads: 0, views: 0 };
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch analytics data', err);
    }
  }

  data = applyFilters(data, query);
  data = applySorting(data, query);

  const paginatedData = paginate(data, query);
  const page = Math.max(1, parseInt(query.page) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page) || 20));
  const totalPages = Math.ceil(data.length / perPage);

  return c.json({
    data: paginatedData,
    meta: {
      has_more: page < totalPages,
      page,
      per_page: perPage,
      total: data.length,
      total_pages: totalPages,
    },
  });
}

export async function getRelatedItems(c) {
  const manifest = await getManifest();

  const category = c.req.param('category');
  const resolved = category
    ? resolveIdentifier(manifest, c.req.param('item'), category)
    : resolveIdentifier(manifest, c.req.param('item'));

  if (!resolved) {
    return c.json({ error: 'Item Not Found' }, 404);
  }

  const { key: itemKey, category: resolvedCategory } = resolved;
  const item = manifest[resolvedCategory][itemKey];

  if (!item) {
    return c.json({ error: 'Item Not Found' }, 404);
  }

  const relatedByCollection = new Set();
  const relatedByAuthor = new Set();
  const relatedByCategory = new Set();

  for (const collectionName of item.in_collections) {
    const collection = manifest.collections[collectionName];

    if (collection.items) {
      for (const collectionItem of collection.items) {
        const [type, name] = collectionItem.split('/');

        if (name !== itemKey) {
          relatedByCollection.add(manifest[type][name].id);
        }
      }
    }
  }

  const authorItems = Object.values(manifest.preset_settings)
    .concat(Object.values(manifest.photo_packs))
    .concat(Object.values(manifest.quote_packs))
    .filter((i) => i.author === item.author && i.id !== item.id);

  for (const authorItem of authorItems) {
    relatedByAuthor.add(authorItem.id);
  }

  const categoryItems = Object.values(manifest[resolvedCategory]).filter((i) => i.id !== item.id);

  for (const categoryItem of categoryItems) {
    relatedByCategory.add(categoryItem.id);
  }

  const scoredRelated = new Map();

  for (const id of relatedByCollection) {
    scoredRelated.set(id, (scoredRelated.get(id) || 0) + 10);
  }

  for (const id of relatedByAuthor) {
    scoredRelated.set(id, (scoredRelated.get(id) || 0) + 5);
  }

  for (const id of relatedByCategory) {
    scoredRelated.set(id, (scoredRelated.get(id) || 0) + 2);
  }

  const sortedRelated = Array.from(scoredRelated.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const relatedItems = sortedRelated.map(([id, score]) => {
    const canonicalPath = manifest._id_index[id];
    const [cat, name] = canonicalPath.split('/');
    return { ...manifest[cat][name], relevance_score: score };
  });

  return c.json({
    data: { item, related: relatedItems },
    meta: { total_related: relatedItems.length },
  });
}

export async function getRandom(c) {
  const manifest = await getManifest();
  const category = c.req.param('category') || 'all';
  const count = Math.min(parseInt(c.req.query('count')) || 1, 10);

  let items;
  if (category === 'all') {
    items = [
      ...Object.values(manifest.preset_settings),
      ...Object.values(manifest.photo_packs),
      ...Object.values(manifest.quote_packs),
    ];
  } else {
    if (!manifest[category]) {
      return c.json({ error: 'Category not found' }, 404);
    }

    items = Object.values(manifest[category]);
  }

  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return c.json({ data: count === 1 ? shuffled[0] : shuffled.slice(0, count) });
}
