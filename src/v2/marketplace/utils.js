import { HTTPException } from 'hono/http-exception';

import { safeFetchJson } from '@/util/fetch';
import { MARKETPLACE_DATA } from '@/constants';

const MANIFEST_KV_KEY = 'v2_manifest';
const MANIFEST_KV_TTL = 3600;

const CACHE_CONFIG = {
  full: {
    cacheEverything: true,
    cacheTtl: 3600,
  },
  lite: {
    cacheEverything: true,
    cacheTtl: 1800,
  },
  search: {
    cacheEverything: true,
    cacheTtl: 3600,
  },
  stats: {
    cacheEverything: true,
    cacheTtl: 1800,
  },
};

export async function getManifest(lite = false) {
  const url = lite
    ? `${MARKETPLACE_DATA}/manifest-lite.json`
    : `${MARKETPLACE_DATA}/manifest.json?v=2`;

  const manifest = await safeFetchJson(url, {
    cf: lite ? CACHE_CONFIG.lite : CACHE_CONFIG.full,
    signal: AbortSignal.timeout(5000),
  });

  if (!manifest || typeof manifest !== 'object' || typeof manifest._id_index !== 'object') {
    throw new HTTPException(503, { message: 'Marketplace data is currently unavailable' });
  }

  return manifest;
}

export async function getManifestCached(c) {
  const inContext = c.get('manifest');
  if (inContext) return inContext;

  if (c.env?.cache) {
    const kvCached = await c.env.cache.get(MANIFEST_KV_KEY, { type: 'json' });
    if (kvCached) {
      c.set('manifest', kvCached);
      return kvCached;
    }
  }

  const manifest = await getManifest();
  c.set('manifest', manifest);

  if (c.env?.cache) {
    try {
      c.executionCtx.waitUntil(
        c.env.cache.put(MANIFEST_KV_KEY, JSON.stringify(manifest), {
          expirationTtl: MANIFEST_KV_TTL,
        }),
      );
    } catch {
      // executionCtx unavailable outside Cloudflare Workers runtime
    }
  }

  return manifest;
}

export async function getSearchIndex() {
  const index = await safeFetchJson(`${MARKETPLACE_DATA}/search-index.json`, {
    cf: CACHE_CONFIG.search,
    signal: AbortSignal.timeout(5000),
  });

  if (!index || !Array.isArray(index.items)) {
    throw new HTTPException(503, { message: 'Search index is currently unavailable' });
  }

  return index;
}

export async function getStats() {
  const stats = await safeFetchJson(`${MARKETPLACE_DATA}/stats.json`, {
    cf: CACHE_CONFIG.stats,
    signal: AbortSignal.timeout(5000),
  });

  if (!stats || typeof stats !== 'object') {
    throw new HTTPException(503, { message: 'Stats data is currently unavailable' });
  }

  return stats;
}

export function resolveIdentifier(manifest, identifier, category = null) {
  if (manifest._id_index && manifest._id_index[identifier]) {
    const canonicalPath = manifest._id_index[identifier];
    const [pathCategory, name] = canonicalPath.split('/');

    if (category && pathCategory !== category) {
      return null;
    }

    return {
      category: pathCategory,
      key: name,
      path: canonicalPath,
    };
  }

  if (category) {
    if (manifest[category] && manifest[category][identifier]) {
      return {
        category,
        key: identifier,
        path: `${category}/${identifier}`,
      };
    }
  } else {
    if (manifest.collections && manifest.collections[identifier]) {
      return {
        category: 'collections',
        key: identifier,
        path: `collections/${identifier}`,
      };
    }
  }

  return null;
}

export function applyFilters(items, query) {
  let filtered = [...items];

  if (query.tags) {
    console.warn('Tag filtering is deprecated and will be ignored (schema v3.0)');
  }

  if (query.keywords) {
    const keywords = Array.isArray(query.keywords) ? query.keywords : query.keywords.split(',');

    filtered = filtered.filter(
      (item) => item.keywords && keywords.some((kw) => item.keywords.includes(kw.toLowerCase())),
    );
  }

  if (query.category_tags) {
    const tags = Array.isArray(query.category_tags)
      ? query.category_tags
      : query.category_tags.split(',');
    filtered = filtered.filter(
      (item) => item.category_tags && tags.some((tag) => item.category_tags.includes(tag)),
    );
  }

  if (query.author) {
    filtered = filtered.filter((item) => item.author.toLowerCase() === query.author.toLowerCase());
  }

  if (query.language) {
    filtered = filtered.filter(
      (item) => item.language && item.language.toLowerCase() === query.language.toLowerCase(),
    );
  }

  if (query.date_from) {
    const fromTs = new Date(query.date_from).getTime();
    filtered = filtered.filter((item) => Date.parse(item.created_at) >= fromTs);
  }

  if (query.date_to) {
    const toTs = new Date(query.date_to).getTime();
    filtered = filtered.filter((item) => Date.parse(item.created_at) <= toTs);
  }

  if (query.min_items) {
    const min = parseInt(query.min_items);
    if (!Number.isNaN(min)) {
      filtered = filtered.filter((item) => item.item_count >= min);
    }
  }

  if (query.max_items) {
    const max = parseInt(query.max_items);
    if (!Number.isNaN(max)) {
      filtered = filtered.filter((item) => item.item_count <= max);
    }
  }

  if (query.color_theme === 'dark') {
    filtered = filtered.filter((item) => item.isDark === true);
  } else if (query.color_theme === 'light') {
    filtered = filtered.filter((item) => item.isLight === true);
  }

  return filtered;
}

export function applySorting(items, query) {
  const sortField = query.sort || 'newest';
  const sortOrder = query.order || 'desc';

  // Pre-compute date keys once (O(n)) so the comparator runs on plain numbers (O(n log n))
  // instead of allocating a new Date object on every comparison.
  if (['newest', 'oldest', 'updated'].includes(sortField)) {
    const dateField = sortField === 'updated' ? 'updated_at' : 'created_at';
    const keyed = items.map((item) => [item, Date.parse(item[dateField])]);
    keyed.sort(([, aTs], [, bTs]) => {
      const comparison = sortField === 'oldest' ? aTs - bTs : bTs - aTs;
      return sortOrder === 'asc' ? -comparison : comparison;
    });
    return keyed.map(([item]) => item);
  }

  const sorted = [...items].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.display_name.localeCompare(b.display_name);
        break;
      case 'item_count':
        comparison = b.item_count - a.item_count;
        break;
      case 'popular':
        comparison = b.in_collections.length - a.in_collections.length;
        break;
      default:
        break;
    }
    return sortOrder === 'asc' ? -comparison : comparison;
  });

  return sorted;
}
