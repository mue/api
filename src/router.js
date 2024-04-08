import { Router } from 'itty-router';
import { json, error } from 'itty-router-extras';
import v2 from './v2';
import sizes from './sizes';
import news from '../news';
import { getCollection, getCollections, getFeatured, getItem, getItems } from './v2/marketplace';

export default Router()
	.get('/', () => 'Hello World! API docs: https://docs.muetab.com/api/introduction')
	.get('/collection/:collection', getCollection)
	.get('/collections', getCollections)
	.get('/featured', getFeatured)
	.get('/images/categories', async (req, env, ctx) => {
		const { data } = await ctx.$supabase.rpc('get_image_categories');
		return data.map((row) => row.name);
	})
	.get('/images/photographers', async (req, env, ctx) => {
		const { data } = await ctx.$supabase.rpc('get_image_photographers');
		return data.map((row) => row.name);
	})
	.get('/images/random', async (req, env, ctx) => {
		const kv_id = 'image_categories';
		let categories = await env.cache.get(kv_id, {
			cacheTtl: 3600, // cache at this location for an hour
			type: 'json',
		});
		if (!categories) {
			const { data } = await ctx.$supabase.rpc('get_image_categories');
			// save for 1 day
			ctx.waitUntil(env.cache.put(kv_id, data, { expirationTtl: 86400 }));
			categories = data;
		}
		const category = categories[Math.floor(Math.random() * categories.length)].name;
		const { data } = await ctx.$supabase.rpc('get_random_image', { _category: category }).single();
		const format = req.headers.get('accept')?.includes('avif') ? 'avif' : 'webp';
		const quality = sizes[req.query?.quality] ?? 'fhd';
		return json(
			{
				camera: data.camera,
				category: data.category,
				file: `https://cdn.muetab.com/img/${quality}/${data.id}.${format}?v=${data.version}`,
				location: data.location_name,
				photographer: data.photographer,
			},
			{ headers: { 'Cache-Control': 'no-store' } },
		);
	})
	.get('/item/:category/:item', getItem)
	.get('/items/:category', getItems)
	.get('/news', () => ({ news }))
	.get('/quotes/languages', () => ['English', 'French'])
	.get('/quotes/random', async (req, env, ctx) => {
		const language = req.query.language?.replace('French', 'Français') || 'English';
		const { data } = await ctx.$supabase
			.rpc('get_random_old_quote', { _language: language })
			.single();
		return data;
	})
	.get('/stats', async (req, env) => {
		const res = await env.WEBSTORES.fetch(req);
		return new Response(res.body, res);
	})
	.get('/versions', async (req, env) => {
		const res = await env.WEBSTORES.fetch(req);
		return new Response(res.body, res);
	})
	.all('/v2/*', v2.handle)
	.all('*', () => error(404, 'Not Found'));
