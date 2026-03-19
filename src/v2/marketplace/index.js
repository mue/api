import { Hono } from 'hono';
import { validator } from 'hono/validator';

import {
  getCollection,
  getCollections,
  getCurator,
  getCurators,
  getFeatured,
} from '@/v2/marketplace/collections';
import { getItem, getItems, getRelatedItems, getRandom } from '@/v2/marketplace/items';
import {
  incrementItemView,
  incrementItemDownload,
  getGlobalStats,
  getCategoryStats,
  getTrending,
  getRecent,
} from '@/v2/marketplace/analytics';
import { search, batchGetItems } from '@/v2/marketplace/search';

const VALID_CATEGORIES = ['preset_settings', 'photo_packs', 'quote_packs'];

const validateLimit = validator('query', (value, c) => {
  if (value.limit !== undefined && (isNaN(parseInt(value.limit)) || parseInt(value.limit) < 1)) {
    return c.json({ error: '`limit` must be a positive integer' }, 400);
  }

  return value;
});

export default new Hono()
  .get('/collection/:collection', (c) => getCollection(c))
  .get('/collections', (c) => getCollections(c))
  .get('/curator/:curator', (c) => getCurator(c))
  .get('/curators', (c) => getCurators(c))
  .get('/featured', (c) => getFeatured(c))
  .get('/item/:item/related', (c) => getRelatedItems(c))
  .get('/item/:category/:item/related', (c) => getRelatedItems(c))
  .get('/item/:item', (c) => getItem(c))
  .get('/item/:category/:item', (c) => getItem(c))
  .post('/item/:item/view', (c) => incrementItemView(c))
  .post('/item/:category/:item/view', (c) => incrementItemView(c))
  .post('/item/:item/download', (c) => incrementItemDownload(c))
  .post('/item/:category/:item/download', (c) => incrementItemDownload(c))
  .get('/items/:category', (c) => getItems(c))
  .get(
    '/random/:category',
    validator('query', (value, c) => {
      if (
        value.count !== undefined &&
        (isNaN(parseInt(value.count)) || parseInt(value.count) < 1)
      ) {
        return c.json({ error: '`count` must be a positive integer' }, 400);
      }

      return value;
    }),
    (c) => getRandom(c),
  )
  .get('/random', (c) => getRandom(c))
  .get(
    '/search',
    validator('query', (value, c) => {
      if (!value.q && !value.query) {
        return c.json({ error: 'Missing search query parameter (q or query)' }, 400);
      }

      return value;
    }),
    (c) => search(c),
  )
  .post(
    '/batch',
    validator('json', (value, c) => {
      if (!Array.isArray(value.ids) || value.ids.length === 0) {
        return c.json({ error: 'Missing ids parameter' }, 400);
      }

      if (value.ids.length > 100) {
        return c.json({ error: 'Maximum 100 items per batch request' }, 400);
      }

      return value;
    }),
    (c) => batchGetItems(c),
  )
  .get('/stats/global', (c) => getGlobalStats(c))
  .get(
    '/stats/category/:category',
    validator('param', (value, c) => {
      if (!VALID_CATEGORIES.includes(value.category)) {
        return c.json({ error: 'Invalid category' }, 404);
      }

      return value;
    }),
    (c) => getCategoryStats(c),
  )
  .get('/trending', validateLimit, (c) => getTrending(c))
  .get('/recent', validateLimit, (c) => getRecent(c));
