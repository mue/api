import { Hono } from 'hono';
import { getCollection, getCollections, getFeatured } from '../../v2/marketplace/collections';
import { getItem, getItems, incrementItemView } from '../../v2/marketplace/items/basic';

export default new Hono()
	.get('/collection/:collection', (c) => getCollection(c))
	.get('/collections', (c) => getCollections(c))
	.get('/featured', (c) => getFeatured(c))
	.get('/item/:category/:item', (c) => getItem(c))
	.post('/item/:category/:item/view', (c) => incrementItemView(c))
	.get('/items/:category', (c) => getItems(c));
