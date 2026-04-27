import { describe, it, expect, vi, afterEach } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import {
  applyFilters,
  applySorting,
  resolveIdentifier,
  getManifest,
  getSearchIndex,
  getStats,
} from '@/v2/marketplace/utils';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const makeItem = (overrides = {}) => ({
  id: 'default-id',
  name: 'default',
  display_name: 'Default',
  author: 'mue',
  keywords: ['keyword'],
  category_tags: ['tag'],
  language: 'English',
  item_count: 10,
  isDark: false,
  isLight: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  in_collections: [],
  ...overrides,
});

const items = [
  makeItem({
    id: 'id-1',
    name: 'coastal',
    display_name: 'Coastal',
    author: 'mue',
    keywords: ['ocean', 'beach'],
    category_tags: ['nature', 'water'],
    language: 'English',
    item_count: 15,
    isDark: false,
    isLight: true,
    created_at: '2023-06-01T00:00:00Z',
    updated_at: '2023-09-01T00:00:00Z',
    in_collections: ['mue-team'],
  }),
  makeItem({
    id: 'id-2',
    name: 'mountain',
    display_name: 'Mountain',
    author: 'contributor',
    keywords: ['peaks', 'snow'],
    category_tags: ['nature', 'mountain'],
    language: null,
    item_count: 8,
    isDark: true,
    isLight: false,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2022-06-01T00:00:00Z',
    in_collections: [],
  }),
  makeItem({
    id: 'id-3',
    name: 'abstract',
    display_name: 'Abstract',
    author: 'mue',
    keywords: ['art', 'pattern'],
    category_tags: ['abstract', 'geometric'],
    language: 'French',
    item_count: 20,
    isDark: true,
    isLight: false,
    created_at: '2023-03-01T00:00:00Z',
    updated_at: '2023-03-01T00:00:00Z',
    in_collections: ['mue-team'],
  }),
];

const mockManifest = {
  _id_index: {
    'id-1': 'photo_packs/coastal',
    'id-3': 'quote_packs/abstract',
  },
  collections: {
    'mue-team': {
      display_name: 'Mue Team',
      items: ['photo_packs/coastal'],
      in_collections: [],
    },
  },
  photo_packs: {
    coastal: { id: 'id-1', name: 'coastal', display_name: 'Coastal', in_collections: ['mue-team'] },
  },
  quote_packs: {
    abstract: { id: 'id-3', name: 'abstract', display_name: 'Abstract', in_collections: ['mue-team'] },
  },
  preset_settings: {},
};

// ---------------------------------------------------------------------------
// applyFilters
// ---------------------------------------------------------------------------

describe('applyFilters', () => {
  it('returns all items when no filters are specified', () => {
    expect(applyFilters(items, {})).toHaveLength(3);
  });

  it('does not mutate the input array', () => {
    const original = [...items];
    applyFilters(items, { author: 'mue' });
    expect(items).toEqual(original);
  });

  describe('keywords', () => {
    it('filters by a single keyword string', () => {
      const result = applyFilters(items, { keywords: 'ocean' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('coastal');
    });

    it('filters by comma-separated keywords', () => {
      const result = applyFilters(items, { keywords: 'ocean,art' });
      expect(result).toHaveLength(2);
    });

    it('filters by keywords array', () => {
      const result = applyFilters(items, { keywords: ['peaks', 'art'] });
      expect(result).toHaveLength(2);
    });

    it('returns empty when no items match keyword', () => {
      expect(applyFilters(items, { keywords: 'nonexistent' })).toHaveLength(0);
    });
  });

  describe('category_tags', () => {
    it('filters by a single tag', () => {
      const result = applyFilters(items, { category_tags: 'water' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('coastal');
    });

    it('filters by comma-separated tags (OR logic)', () => {
      const result = applyFilters(items, { category_tags: 'water,mountain' });
      expect(result).toHaveLength(2);
    });

    it('filters by tag array', () => {
      const result = applyFilters(items, { category_tags: ['abstract'] });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('abstract');
    });
  });

  describe('author', () => {
    it('filters by exact author', () => {
      const result = applyFilters(items, { author: 'mue' });
      expect(result).toHaveLength(2);
      expect(result.every((i) => i.author === 'mue')).toBe(true);
    });

    it('author filter is case-insensitive', () => {
      expect(applyFilters(items, { author: 'MUE' })).toHaveLength(2);
    });

    it('returns empty for unknown author', () => {
      expect(applyFilters(items, { author: 'unknown-author' })).toHaveLength(0);
    });
  });

  describe('language', () => {
    it('filters by language', () => {
      const result = applyFilters(items, { language: 'English' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('coastal');
    });

    it('language filter is case-insensitive', () => {
      expect(applyFilters(items, { language: 'english' })).toHaveLength(1);
    });

    it('excludes items with null language', () => {
      expect(applyFilters(items, { language: 'French' })).toHaveLength(1);
    });
  });

  describe('date range', () => {
    it('filters by date_from', () => {
      const result = applyFilters(items, { date_from: '2023-01-01' });
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.name)).toContain('coastal');
      expect(result.map((i) => i.name)).toContain('abstract');
    });

    it('filters by date_to', () => {
      const result = applyFilters(items, { date_to: '2022-12-31' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('mountain');
    });

    it('filters by both date_from and date_to', () => {
      const result = applyFilters(items, { date_from: '2023-02-01', date_to: '2023-04-01' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('abstract');
    });
  });

  describe('item_count range', () => {
    it('filters by min_items', () => {
      const result = applyFilters(items, { min_items: '10' });
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.name)).not.toContain('mountain');
    });

    it('filters by max_items', () => {
      const result = applyFilters(items, { max_items: '10' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('mountain');
    });

    it('ignores min_items when value is NaN', () => {
      expect(applyFilters(items, { min_items: 'abc' })).toHaveLength(3);
    });

    it('ignores max_items when value is NaN', () => {
      expect(applyFilters(items, { max_items: 'notanumber' })).toHaveLength(3);
    });
  });

  describe('color_theme', () => {
    it('filters dark themes', () => {
      const result = applyFilters(items, { color_theme: 'dark' });
      expect(result).toHaveLength(2);
      expect(result.every((i) => i.isDark)).toBe(true);
    });

    it('filters light themes', () => {
      const result = applyFilters(items, { color_theme: 'light' });
      expect(result).toHaveLength(1);
      expect(result[0].isLight).toBe(true);
    });

    it('ignores unknown color_theme values', () => {
      expect(applyFilters(items, { color_theme: 'purple' })).toHaveLength(3);
    });
  });

  it('combines multiple filters (AND logic)', () => {
    const result = applyFilters(items, { author: 'mue', color_theme: 'dark' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('abstract');
  });
});

// ---------------------------------------------------------------------------
// applySorting
// ---------------------------------------------------------------------------

describe('applySorting', () => {
  it('sorts by newest (default) in descending order', () => {
    const result = applySorting(items, {});
    expect(result[0].name).toBe('coastal');   // 2023-06-01
    expect(result[2].name).toBe('mountain');  // 2022-01-01
  });

  it('sorts by oldest ascending', () => {
    const result = applySorting(items, { sort: 'oldest' });
    expect(result[0].name).toBe('mountain');
    expect(result[2].name).toBe('coastal');
  });

  it('sorts by updated date descending', () => {
    const result = applySorting(items, { sort: 'updated' });
    expect(result[0].name).toBe('coastal');   // updated 2023-09-01
    expect(result[2].name).toBe('mountain');  // updated 2022-06-01
  });

  it('sorts by display_name alphabetically', () => {
    const result = applySorting(items, { sort: 'name' });
    expect(result[0].display_name).toBe('Abstract');
    expect(result[1].display_name).toBe('Coastal');
    expect(result[2].display_name).toBe('Mountain');
  });

  it('sorts by item_count descending', () => {
    const result = applySorting(items, { sort: 'item_count' });
    expect(result[0].item_count).toBe(20);
    expect(result[2].item_count).toBe(8);
  });

  it('reverses order when order=asc', () => {
    const desc = applySorting(items, { sort: 'newest', order: 'desc' });
    const asc = applySorting(items, { sort: 'newest', order: 'asc' });
    expect(desc[0].name).toBe(asc[asc.length - 1].name);
  });

  it('does not mutate the input array', () => {
    const original = [...items];
    applySorting(items, { sort: 'name' });
    expect(items).toEqual(original);
  });

  it('returns items unchanged for unknown sort field', () => {
    const result = applySorting(items, { sort: 'nonexistent' });
    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// resolveIdentifier
// ---------------------------------------------------------------------------

describe('resolveIdentifier', () => {
  it('resolves an item from _id_index', () => {
    const result = resolveIdentifier(mockManifest, 'id-1');
    expect(result).toEqual({ category: 'photo_packs', key: 'coastal', path: 'photo_packs/coastal' });
  });

  it('resolves an item when category constraint matches', () => {
    const result = resolveIdentifier(mockManifest, 'id-1', 'photo_packs');
    expect(result).not.toBeNull();
    expect(result.key).toBe('coastal');
  });

  it('returns null when category constraint does not match', () => {
    expect(resolveIdentifier(mockManifest, 'id-1', 'quote_packs')).toBeNull();
  });

  it('resolves a collection by name without _id_index', () => {
    const result = resolveIdentifier(mockManifest, 'mue-team');
    expect(result).toEqual({
      category: 'collections',
      key: 'mue-team',
      path: 'collections/mue-team',
    });
  });

  it('resolves directly from manifest[category][name] when category is provided', () => {
    const result = resolveIdentifier(mockManifest, 'coastal', 'photo_packs');
    expect(result).not.toBeNull();
    expect(result.key).toBe('coastal');
    expect(result.category).toBe('photo_packs');
  });

  it('returns null for an unknown ID', () => {
    expect(resolveIdentifier(mockManifest, 'does-not-exist')).toBeNull();
  });

  it('returns null for an unknown item in a given category', () => {
    expect(resolveIdentifier(mockManifest, 'no-such-item', 'photo_packs')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getManifest, getSearchIndex, getStats — manifest structure validation
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetchJson(body) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(body) }),
  );
}

describe('getManifest', () => {
  it('returns the manifest when structure is valid', async () => {
    stubFetchJson(mockManifest);
    const manifest = await getManifest();
    expect(manifest).toEqual(mockManifest);
  });

  it('throws HTTPException(503) when response is null', async () => {
    stubFetchJson(null);
    await expect(getManifest()).rejects.toMatchObject({ status: 503 });
  });

  it('throws HTTPException(503) when _id_index is missing', async () => {
    stubFetchJson({ collections: {}, photo_packs: {} });
    await expect(getManifest()).rejects.toMatchObject({ status: 503 });
  });

  it('throws HTTPException(503) when _id_index is not an object', async () => {
    stubFetchJson({ ...mockManifest, _id_index: 'not-an-object' });
    await expect(getManifest()).rejects.toMatchObject({ status: 503 });
  });

  it('throws HTTPException(503) when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    await expect(getManifest()).rejects.toBeInstanceOf(HTTPException);
  });
});

describe('getSearchIndex', () => {
  it('returns the index when items is a valid array', async () => {
    const validIndex = { items: [{ id: '1', display_name: 'Test' }] };
    stubFetchJson(validIndex);
    expect(await getSearchIndex()).toEqual(validIndex);
  });

  it('throws HTTPException(503) when items is missing', async () => {
    stubFetchJson({ notItems: [] });
    await expect(getSearchIndex()).rejects.toMatchObject({ status: 503 });
  });

  it('throws HTTPException(503) when items is not an array', async () => {
    stubFetchJson({ items: 'not-an-array' });
    await expect(getSearchIndex()).rejects.toMatchObject({ status: 503 });
  });
});

describe('getStats', () => {
  it('returns stats when response is a valid object', async () => {
    const stats = { total: 100, recent_items: [] };
    stubFetchJson(stats);
    expect(await getStats()).toEqual(stats);
  });

  it('throws HTTPException(503) when response is null', async () => {
    stubFetchJson(null);
    await expect(getStats()).rejects.toMatchObject({ status: 503 });
  });

  it('throws HTTPException(503) when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    await expect(getStats()).rejects.toBeInstanceOf(HTTPException);
  });
});
