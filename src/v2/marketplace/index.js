import { Hono } from 'hono';
import { getCollection, getCollections, getCurator, getCurators, getFeatured } from './collections';
import { getItem, getItems, incrementItemView, incrementItemDownload } from './items/basic';
import { getRelatedItems, getRandom } from './items/advanced';
import { search, batchGetItems } from './search';
import { getGlobalStats, getCategoryStats, getTrending, getRecent } from './stats';

const r = (c) => ({
	headers: { get: (n) => c.req.header(n) },
	json: () => c.req.json(),
	method: c.req.method,
	params: c.req.param(),
	query: c.req.query(),
	url: c.req.url,
});
const x = (c) => ({
	$supabase: c.get('supabase'),
	waitUntil: (...a) => c.executionCtx.waitUntil(...a),
});

export default new Hono()
	.get('/collection/:collection', (c) => getCollection(r(c), c.env, x(c)))
	.get('/collections', (c) => getCollections(r(c), c.env, x(c)))
	.get('/curator/:curator', (c) => getCurator(r(c), c.env, x(c)))
	.get('/curators', (c) => getCurators(r(c), c.env, x(c)))
	.get('/featured', (c) => getFeatured(r(c), c.env, x(c)))
	.get('/item/:item/related', (c) => getRelatedItems(r(c), c.env, x(c)))
	.get('/item/:category/:item/related', (c) => getRelatedItems(r(c), c.env, x(c)))
	.get('/item/:item', (c) => getItem(r(c), c.env, x(c)))
	.get('/item/:category/:item', (c) => getItem(r(c), c.env, x(c)))
	.post('/item/:item/view', (c) => incrementItemView(r(c), c.env, x(c)))
	.post('/item/:category/:item/view', (c) => incrementItemView(r(c), c.env, x(c)))
	.post('/item/:item/download', (c) => incrementItemDownload(r(c), c.env, x(c)))
	.post('/item/:category/:item/download', (c) => incrementItemDownload(r(c), c.env, x(c)))
	.get('/items/:category', (c) => getItems(r(c), c.env, x(c)))
	.get('/random/:category', (c) => getRandom(r(c), c.env, x(c)))
	.get('/random', (c) => getRandom(r(c), c.env, x(c)))
	.get('/search', (c) => search(r(c), c.env, x(c)))
	.post('/batch', (c) => batchGetItems(r(c), c.env, x(c)))
	.get('/stats/global', (c) => getGlobalStats(r(c), c.env, x(c)))
	.get('/stats/category/:category', (c) => getCategoryStats(r(c), c.env, x(c)))
	.get('/trending', (c) => getTrending(r(c), c.env, x(c)))
	.get('/recent', (c) => getRecent(r(c), c.env, x(c)));
