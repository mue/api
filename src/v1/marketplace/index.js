import { Hono } from 'hono';
import { getCollection, getCollections, getFeatured } from '../../v2/marketplace/collections';
import { getItem, getItems, incrementItemView } from '../../v2/marketplace/items/basic';

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
	.get('/featured', (c) => getFeatured(r(c), c.env, x(c)))
	.get('/item/:category/:item', (c) => getItem(r(c), c.env, x(c)))
	.post('/item/:category/:item/view', (c) => incrementItemView(r(c), c.env, x(c)))
	.get('/items/:category', (c) => getItems(r(c), c.env, x(c)));
