import { Router } from 'itty-router';
import {
	json,
	error,
} from 'itty-router-extras';
import Umami from '../umami';
import sizes from '../sizes';
import news from '../../news';
import { getStats } from '../stats';
import { getVersions } from '../versions';

export default new Router({ base: '/v2' })
	.get('/gps', async req => json(null, { headers: { 'Cache-Control': 'private, max-age=86400' } }))
	.get('/images/categories', async req => {
		const { data } = await req.supabase.rpc('get_image_categories');
		return json(data, { headers: { 'Cache-Control': 'max-age=3600' } });
	})
	.get('/images/pexels')
	.get('/images/photographers', async req => {
		const { data } = await req.supabase.rpc('get_image_photographers');
		return json(data, { headers: { 'Cache-Control': 'max-age=3600' } });
	})
	.get('/images/random', async req => {
		let { data: allowed } = await req.supabase.rpc('get_image_categories');
		allowed = allowed.map(row => row.name);
		let categories = req.query.categories?.split(',') ?? [];
		if (categories.length === 0) categories = allowed;
		else categories = categories.filter(category => allowed.includes(category));
		const category = categories[Math.floor(Math.random() * categories.length)];
		const { data } = await req.supabase.rpc('get_random_image', { _category: category }).single();
		const format = req.headers.get('accept')?.includes('avif') ? 'avif' : 'webp';
		const quality = sizes[req.query?.quality] ?? 'fhd';
		const coordinates = data.location_data?.split(',');
		return json({
			camera: data.camera,
			category: data.category,
			file: `https://cdn.muetab.com/img/${quality}/${data.id}.${format}`,
			location: {
				latitude: coordinates?.[0] ?? null,
				longitude: coordinates?.[1] ?? null,
				name: data.location_name,
			},
			photographer: data.photographer,
		});
	})
	.get('/images/unsplash')
	.get('/quotes/languages', async req => {
		const { data } = await req.supabase.rpc('get_quote_languages');
		return json(data, { headers: { 'Cache-Control': 'max-age=3600' } });
	})
	.get('/map', async (req, env) => {
		const { latitude, longitude } = req.query;
		if (!latitude) return error(400, 'latitude is required');
		if (!longitude) return error(400, 'longitude is required');
		const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+555555(${longitude},${latitude})/${longitude},${latitude},9},0/300x150?access_token=${env.MAPBOX_TOKEN}`;
		const res = await fetch(url, {
			cf: {
				cacheEverything: true,
				cacheTtl: 86400,
			},
		});
		return new Response(res.body, res);
	})
	.get('/news', () => json(news, { headers: { 'Cache-Control': 'max-age=3600' } }))
	.get('/quotes/random', async (req, env, ctx) => {
		let { data: allowed } = await req.supabase.rpc('get_quote_languages');
		allowed = allowed.map(row => row.name);
		const language = req.query.language || 'en';
		if (!allowed.includes(language)) {
			ctx.waitUntil(Umami.error(req, env, 'unsupported-language'));
			return error(400, 'Unsupported language');
		}
		const { data } = await req.supabase.rpc('get_random_quote', { _language: language }).single();
		return json(data);
	})
	.get('/stats', async () => json(await getStats(), { headers: { 'Cache-Control': 'max-age=86400' } }))
	.get('/versions', async () => {
		const browsers = await getVersions();
		return json({ browsers }, { headers: { 'Cache-Control': 'max-age=86400' } });
	})
	.get('/weather');