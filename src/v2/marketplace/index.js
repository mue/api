import { Hono } from 'hono';

import { getCollection, getCollections, getCurator, getCurators, getFeatured } from '@/v2/marketplace/collections';

import { getItem, getItems, incrementItemView, incrementItemDownload } from '@/v2/marketplace/items/basic';
import { getRelatedItems, getRandom } from '@/v2/marketplace/items/advanced';

import { search, batchGetItems } from '@/v2/marketplace/search';
import { getGlobalStats, getCategoryStats, getTrending, getRecent } from '@/v2/marketplace/stats';

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
  .get('/random/:category', (c) => getRandom(c))
  .get('/random', (c) => getRandom(c))
  .get('/search', (c) => search(c))
  .post('/batch', (c) => batchGetItems(c))
  .get('/stats/global', (c) => getGlobalStats(c))
  .get('/stats/category/:category', (c) => getCategoryStats(c))
  .get('/trending', (c) => getTrending(c))
  .get('/recent', (c) => getRecent(c));
