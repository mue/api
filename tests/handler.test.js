import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/db', () => ({
  getDB: vi.fn(() => ({})),
}));

const { default: app } = await import('@/handler');

const mockEnv = {
  OPENWEATHER_TOKEN: 'test-token',
  UNSPLASH_TOKEN: 'test-token',
  MAPBOX_TOKEN: 'test-token',
  PEXELS_TOKEN: 'test-token',
  SPONSORS_NAME: 'mue',
  UNSPLASH_REFERRAL: 'mue',
  PEXELS_COLLECTION: 'test',
  cache: {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
  },
  DB: {},
};

afterEach(() => {
  vi.unstubAllGlobals();
  mockEnv.cache.get.mockReset().mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// Global error handlers
// ---------------------------------------------------------------------------

describe('404 handler', () => {
  it('returns 404 JSON for unknown routes', async () => {
    const res = await app.request('/this-route-does-not-exist', {}, mockEnv);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 404 JSON for unknown v2 routes', async () => {
    const res = await app.request('/v2/not-a-real-endpoint', {}, mockEnv);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Weather — /v2/weather
// ---------------------------------------------------------------------------

describe('GET /v2/weather — validation', () => {
  it('returns 400 when no params are provided', async () => {
    const res = await app.request('/v2/weather', {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });

  it('returns 400 when lat/lon are out of range', async () => {
    const res = await app.request('/v2/weather?lat=999&lon=999', {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });

  it('returns 400 when latitude is out of range', async () => {
    const res = await app.request('/v2/weather?lat=91&lon=0', {}, mockEnv);
    expect(res.status).toBe(400);
  });

  it('returns 400 when longitude is out of range', async () => {
    const res = await app.request('/v2/weather?lat=0&lon=181', {}, mockEnv);
    expect(res.status).toBe(400);
  });

  it('returns 400 when lat/lon are non-numeric', async () => {
    const res = await app.request('/v2/weather?lat=abc&lon=def', {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Geocode — /v2/geocode
// ---------------------------------------------------------------------------

describe('GET /v2/geocode — validation', () => {
  it('returns 400 when q is missing', async () => {
    const res = await app.request('/v2/geocode', {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });

  it('returns 400 when q is a single character', async () => {
    const res = await app.request('/v2/geocode?q=a', {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });

  it('returns 400 when q exceeds 200 characters', async () => {
    const longQ = 'a'.repeat(201);
    const res = await app.request(`/v2/geocode?q=${longQ}`, {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });

  it('accepts q at exactly 2 characters (calls upstream)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([]) }),
    );
    const res = await app.request('/v2/geocode?q=ab', {}, mockEnv);
    expect(res.status).toBe(200);
  });

  it('accepts q at exactly 200 characters (calls upstream)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([]) }),
    );
    const res = await app.request(`/v2/geocode?q=${'a'.repeat(200)}`, {}, mockEnv);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GPS reverse geocode — /v2/gps
// ---------------------------------------------------------------------------

describe('GET /v2/gps — validation', () => {
  it('returns 400 when latitude and longitude are missing', async () => {
    const res = await app.request('/v2/gps', {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });

  it('returns 400 when only latitude is provided', async () => {
    const res = await app.request('/v2/gps?latitude=51.5', {}, mockEnv);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Map — /v2/map
// ---------------------------------------------------------------------------

describe('GET /v2/map — validation', () => {
  it('returns 400 when latitude and longitude are missing', async () => {
    const res = await app.request('/v2/map', {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });

  it('returns 400 when only longitude is provided', async () => {
    const res = await app.request('/v2/map?longitude=-0.1278', {}, mockEnv);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Images — /v2/images
// ---------------------------------------------------------------------------

describe('GET /v2/images/random — validation', () => {
  it('returns 400 for an invalid quality value', async () => {
    const res = await app.request('/v2/images/random?quality=invalid', {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });
});

describe('GET /v2/images/unsplash — validation', () => {
  it('returns 400 for an invalid orientation value', async () => {
    const res = await app.request('/v2/images/unsplash?orientation=invalid', {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });

  it('returns 400 for an invalid quality value', async () => {
    const res = await app.request('/v2/images/unsplash?quality=invalid', {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Marketplace items — /v2/marketplace/items/:category
// ---------------------------------------------------------------------------

const validManifest = {
  _id_index: {},
  collections: {},
  preset_settings: {},
  photo_packs: {},
  quote_packs: {},
};

describe('GET /v2/marketplace/items/:category', () => {
  it('returns 404 for an unknown category', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(validManifest) }),
    );
    const res = await app.request('/v2/marketplace/items/unknown_category', {}, mockEnv);
    expect(res.status).toBe(404);
    expect(await res.json()).toHaveProperty('error');
  });

  it('returns 200 for photo_packs category', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(validManifest) }),
    );
    const res = await app.request('/v2/marketplace/items/photo_packs', {}, mockEnv);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
  });

  it('per_page is clamped to 100 in meta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(validManifest) }),
    );
    const res = await app.request(
      '/v2/marketplace/items/photo_packs?per_page=9999',
      {},
      mockEnv,
    );
    const body = await res.json();
    expect(body.meta.per_page).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Marketplace search — /v2/marketplace/search
// ---------------------------------------------------------------------------

describe('GET /v2/marketplace/search', () => {
  it('per_page is clamped to 100 in meta', async () => {
    const validSearchIndex = { items: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(validSearchIndex) }),
    );
    const res = await app.request('/v2/marketplace/search?q=test&per_page=9999', {}, mockEnv);
    const body = await res.json();
    expect(body.meta.per_page).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Image categories/photographers — KV caching
// ---------------------------------------------------------------------------

describe('GET /v2/images/categories', () => {
  it('returns cached data from KV without hitting the DB', async () => {
    const cached = [
      { count: 10, name: 'nature' },
      { count: 5, name: 'architecture' },
    ];
    mockEnv.cache.get.mockResolvedValueOnce(cached);
    const res = await app.request('/v2/images/categories', {}, mockEnv);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(cached);
  });

  it('checks KV with the correct key', async () => {
    const cached = [{ count: 3, name: 'urban' }];
    mockEnv.cache.get.mockResolvedValueOnce(cached);
    await app.request('/v2/images/categories', {}, mockEnv);
    expect(mockEnv.cache.get).toHaveBeenCalledWith('v2_image_categories', { type: 'json' });
  });
});

describe('GET /v2/images/photographers', () => {
  it('returns cached data from KV without hitting the DB', async () => {
    const cached = [
      { count: 8, name: 'Alex' },
      { count: 2, name: 'Jordan' },
    ];
    mockEnv.cache.get.mockResolvedValueOnce(cached);
    const res = await app.request('/v2/images/photographers', {}, mockEnv);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(cached);
  });

  it('checks KV with the correct key', async () => {
    const cached = [{ count: 1, name: 'Sam' }];
    mockEnv.cache.get.mockResolvedValueOnce(cached);
    await app.request('/v2/images/photographers', {}, mockEnv);
    expect(mockEnv.cache.get).toHaveBeenCalledWith('v2_image_photographers', { type: 'json' });
  });
});

describe('GET /images/categories (v1)', () => {
  it('returns name-only list from KV cache', async () => {
    const cached = [
      { count: 10, name: 'nature' },
      { count: 5, name: 'architecture' },
    ];
    mockEnv.cache.get.mockResolvedValueOnce(cached);
    const res = await app.request('/images/categories', {}, mockEnv);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(['nature', 'architecture']);
  });

  it('checks KV with the correct key', async () => {
    mockEnv.cache.get.mockResolvedValueOnce([{ count: 5, name: 'nature' }]);
    await app.request('/images/categories', {}, mockEnv);
    expect(mockEnv.cache.get).toHaveBeenCalledWith('image_categories', { type: 'json' });
  });
});

describe('GET /images/photographers (v1)', () => {
  it('returns name-only list from KV cache', async () => {
    const cached = [
      { count: 4, name: 'Alice' },
      { count: 2, name: 'Bob' },
    ];
    mockEnv.cache.get.mockResolvedValueOnce(cached);
    const res = await app.request('/images/photographers', {}, mockEnv);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(['Alice', 'Bob']);
  });
});

// ---------------------------------------------------------------------------
// v1 quotes — /quotes/languages KV caching
// ---------------------------------------------------------------------------

describe('GET /quotes/languages (v1)', () => {
  it('returns cached language list from KV', async () => {
    const cached = ['English', 'French', 'German'];
    mockEnv.cache.get.mockResolvedValueOnce(cached);
    const res = await app.request('/quotes/languages', {}, mockEnv);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(cached);
  });

  it('checks KV with the correct key', async () => {
    mockEnv.cache.get.mockResolvedValueOnce(['English']);
    await app.request('/quotes/languages', {}, mockEnv);
    expect(mockEnv.cache.get).toHaveBeenCalledWith('v1_quote_languages', { type: 'json' });
  });
});

// ---------------------------------------------------------------------------
// v2 quotes language validation — .some() correctness
// ---------------------------------------------------------------------------

describe('GET /v2/quotes/random — language validation', () => {
  it('rejects an unsupported language', async () => {
    const languages = [{ count: 5, name: 'en' }, { count: 3, name: 'fr' }];
    mockEnv.cache.get.mockResolvedValue(languages);
    const res = await app.request('/v2/quotes/random?language=zz', {}, mockEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Marketplace collection — no manifest mutation
// ---------------------------------------------------------------------------

const collectionManifest = {
  _id_index: { 'id-1': 'photo_packs/coastal' },
  collections: {
    'mue-picks': {
      display_name: 'Mue Picks',
      items: ['photo_packs/coastal'],
      in_collections: [],
    },
  },
  photo_packs: {
    coastal: { id: 'id-1', name: 'coastal', display_name: 'Coastal', in_collections: ['mue-picks'], author: 'mue' },
  },
  preset_settings: {},
  quote_packs: {},
  curators: {},
};

describe('GET /v2/marketplace/collection/:collection', () => {
  it('resolves collection items in the response', async () => {
    mockEnv.cache.get.mockImplementation((key) =>
      Promise.resolve(key === 'v2_manifest' ? collectionManifest : null),
    );
    const res = await app.request('/v2/marketplace/collection/mue-picks', {}, mockEnv);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items[0]).toMatchObject({ name: 'coastal' });
  });

  it('does not mutate the cached manifest object', async () => {
    // Return the SAME object reference both times so mutations would be visible
    mockEnv.cache.get.mockImplementation((key) =>
      Promise.resolve(key === 'v2_manifest' ? collectionManifest : null),
    );

    await app.request('/v2/marketplace/collection/mue-picks', {}, mockEnv);

    // The original manifest must still have string items, not resolved objects
    expect(collectionManifest.collections['mue-picks'].items).toEqual(['photo_packs/coastal']);
  });

  it('returns 404 for unknown collection', async () => {
    mockEnv.cache.get.mockImplementation((key) =>
      Promise.resolve(key === 'v2_manifest' ? collectionManifest : null),
    );
    const res = await app.request('/v2/marketplace/collection/no-such-collection', {}, mockEnv);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Marketplace related items — author loop correctness
// ---------------------------------------------------------------------------

const relatedManifest = {
  _id_index: {
    'id-coastal': 'photo_packs/coastal',
    'id-mountain': 'photo_packs/mountain',
    'id-haiku': 'quote_packs/haiku',
    'id-dark': 'preset_settings/dark',
  },
  collections: {},
  photo_packs: {
    coastal: { id: 'id-coastal', name: 'coastal', display_name: 'Coastal', author: 'mue', in_collections: [] },
    mountain: { id: 'id-mountain', name: 'mountain', display_name: 'Mountain', author: 'other', in_collections: [] },
  },
  quote_packs: {
    haiku: { id: 'id-haiku', name: 'haiku', display_name: 'Haiku', author: 'mue', in_collections: [] },
  },
  preset_settings: {
    dark: { id: 'id-dark', name: 'dark', display_name: 'Dark', author: 'mue', in_collections: [] },
  },
  curators: {},
};

describe('GET /v2/marketplace/item/:category/:item/related', () => {
  it('finds related items by same author across all categories', async () => {
    mockEnv.cache.get.mockImplementation((key) =>
      Promise.resolve(key === 'v2_manifest' ? relatedManifest : null),
    );
    const res = await app.request(
      '/v2/marketplace/item/photo_packs/coastal/related',
      {},
      mockEnv,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const relatedIds = body.data.related.map((r) => r.id);
    // haiku (quote_packs) and dark (preset_settings) are by 'mue' — found across categories
    expect(relatedIds).toContain('id-haiku');
    expect(relatedIds).toContain('id-dark');
    // mountain is 'other' author — only appears via category (score 2), not author (score 5)
    const haiku = body.data.related.find((r) => r.id === 'id-haiku');
    const mountain = body.data.related.find((r) => r.id === 'id-mountain');
    expect(haiku.relevance_score).toBeGreaterThan(mountain.relevance_score);
  });

  it('excludes the requested item itself from related', async () => {
    mockEnv.cache.get.mockImplementation((key) =>
      Promise.resolve(key === 'v2_manifest' ? relatedManifest : null),
    );
    const res = await app.request(
      '/v2/marketplace/item/photo_packs/coastal/related',
      {},
      mockEnv,
    );
    const body = await res.json();
    const relatedIds = body.data.related.map((r) => r.id);
    expect(relatedIds).not.toContain('id-coastal');
  });

  it('returns 404 for unknown item', async () => {
    mockEnv.cache.get.mockImplementation((key) =>
      Promise.resolve(key === 'v2_manifest' ? relatedManifest : null),
    );
    const res = await app.request(
      '/v2/marketplace/item/photo_packs/unknown/related',
      {},
      mockEnv,
    );
    expect(res.status).toBe(404);
  });
});
