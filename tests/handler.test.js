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
