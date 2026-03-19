import { getManifest, getSearchIndex } from '@/v2/marketplace/utils.js';
import { MARKETPLACE_DATA } from '@/constants.js';

export async function search(c) {
  const { q, query: queryParam } = c.req.valid('query');
  const query = q || queryParam;

  const searchIndex = await getSearchIndex();
  const searchTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  const results = searchIndex.items
    .map((item) => {
      let score = 0;

      for (const term of searchTerms) {
        if (item.display_name.toLowerCase().includes(term)) {
          score += 10;
        }

        if (item.keywords && item.keywords.some((kw) => kw.toLowerCase().includes(term))) {
          score += 8;
        }

        if (item.category_tags && item.category_tags.some((tag) => tag.includes(term))) {
          score += 6;
        }

        if (item.author.toLowerCase().includes(term)) {
          score += 5;
        }

        if (item.search_text.includes(term)) {
          score += 2;
        }
      }

      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const page = parseInt(c.req.query('page')) || 1;
  const perPage = parseInt(c.req.query('per_page')) || 20;
  const totalPages = Math.ceil(results.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedResults = results.slice(start, start + perPage);

  return c.json({
    data: paginatedResults,
    meta: {
      has_more: page < totalPages,
      page,
      per_page: perPage,
      query,
      total: results.length,
      total_pages: totalPages,
    },
  });
}

export async function batchGetItems(c) {
  const { ids } = c.req.valid('json');
  const manifest = await getManifest();

  const itemPromises = ids.map(async (id) => {
    const canonicalPath = manifest._id_index[id];
    if (!canonicalPath) {
      return { error: 'Not found', id };
    }

    const [category, name] = canonicalPath.split('/');
    const itemSummary = manifest[category][name];

    if (!itemSummary) {
      return { error: 'Not found', id };
    }

    try {
      const item = await (
        await fetch(`${MARKETPLACE_DATA}/${category}/${name}.json`, {
          cf: { cacheTtl: 3600 },
          signal: AbortSignal.timeout(5000),
        })
      ).json();

      item.in_collections = itemSummary.in_collections.map((collectionName) => {
        const collection = manifest.collections[collectionName];
        // eslint-disable-next-line no-unused-vars
        const { items, ...collectionWithoutItems } = collection;
        return collectionWithoutItems;
      });

      return { data: item, id };
    } catch {
      return { error: 'Failed to fetch', id };
    }
  });

  const items = await Promise.all(itemPromises);

  return c.json({
    data: items,
    meta: {
      errors: items.filter((i) => i.error).length,
      found: items.filter((i) => i.data).length,
      requested: ids.length,
    },
  });
}
