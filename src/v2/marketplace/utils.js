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

export function getVersion(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  let version = path.split('/')[1];
  if (!version.startsWith('v')) {
    version = 1;
  } else {
    version = parseInt(version.slice(1));
  }

  return version;
}

export async function getManifest(lite = false) {
  const url = lite
    ? 'https://marketplace-data.muetab.com/manifest-lite.json'
    : 'https://marketplace-data.muetab.com/manifest.json?v=2';
  const manifest = await (
    await fetch(url, { cf: lite ? CACHE_CONFIG.lite : CACHE_CONFIG.full })
  ).json();
  return manifest;
}

export async function getSearchIndex() {
  const index = await (
    await fetch('https://marketplace-data.muetab.com/search-index.json', {
      cf: CACHE_CONFIG.search,
    })
  ).json();
  return index;
}

export async function getStats() {
  const stats = await (
    await fetch('https://marketplace-data.muetab.com/stats.json', { cf: CACHE_CONFIG.stats })
  ).json();
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
    const fromDate = new Date(query.date_from);
    filtered = filtered.filter((item) => new Date(item.created_at) >= fromDate);
  }

  if (query.date_to) {
    const toDate = new Date(query.date_to);
    filtered = filtered.filter((item) => new Date(item.created_at) <= toDate);
  }

  if (query.min_items) {
    const min = parseInt(query.min_items);
    filtered = filtered.filter((item) => item.item_count >= min);
  }

  if (query.max_items) {
    const max = parseInt(query.max_items);
    filtered = filtered.filter((item) => item.item_count <= max);
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

  const sorted = [...items].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'newest':
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        break;
      case 'oldest':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'updated':
        comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        break;
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
