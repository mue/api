import { Router } from 'itty-router';
import { json, error } from 'itty-router-extras';
import sizes from '../sizes';
import news from '../../news';
import { getUnsplashImage } from './unsplash';
import { getPexelsImage } from './pexels';
import { withWeatherLanguage } from './weather';
import {
	getCollection,
	getCollections,
	getCurator,
	getCurators,
	getFeatured,
	getItem,
	getItems,
} from './marketplace';

export default Router({ base: '/v2' })
	.get('/marketplace/collection/:collection', getCollection)
	.get('/marketplace/collections', getCollections)
	.get('/marketplace/curator/:curator', getCurator)
	.get('/marketplace/curators', getCurators)
	.get('/marketplace/featured', getFeatured)
	.get('/marketplace/item/:category/:item', getItem)
	.get('/marketplace/items/:category', getItems)
	.get('/gps', withWeatherLanguage, async (req, env, ctx) => {
		const { latitude, longitude } = req.query;
		if (!latitude || !longitude) {
			return error(400, '`latitude` and `longitude` params are required');
		}
		const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${env.OPENWEATHER_TOKEN}&lang=${ctx.$language}`;
		const data = await (await fetch(url)).json();
		return json(data, {
			headers: {
				// 1w, stale 1d, no revalidate
				'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400, immutable',
			},
		});
	})
	.get('/images/categories', async (req, env, ctx) => {
		const { data } = await ctx.$supabase.rpc('get_image_categories');
		return data;
	})
	.get('/images/pexels', async (req, ...rest) => {
		const data = await getPexelsImage(req.query.quality ?? 'normal', ...rest);
		return json(data, { headers: { 'Cache-Control': 'no-store' } });
	})
	.get('/images/photographers', async (req, env, ctx) => {
		const { data } = await ctx.$supabase.rpc('get_image_photographers');
		return data;
	})
	.get('/images/random', async (req, env, ctx) => {
		// TODO: KV cache
		let { data: allowed } = await ctx.$supabase.rpc('get_image_categories');
		allowed = allowed.map((row) => row.name);
		let categories =
			req.query.categories?.split(',')?.filter((category) => allowed.includes(category)) ?? [];
		if (categories.length === 0) categories = allowed;
		const category = categories[Math.floor(Math.random() * categories.length)];
		const { data } = await ctx.$supabase
			.rpc('get_random_image', {
				_category: category,
				_exclude: req.query.exclude,
			})
			.single();
		const format = req.headers.get('accept')?.includes('avif') ? 'avif' : 'webp';
		const quality = sizes[req.query?.quality] ?? 'fhd';
		const coordinates = data.location_data?.split(',');
		return json(
			{
				blur_hash: data.blur_hash,
				camera: data.camera,
				category: data.category,
				colour: data.colour,
				file: `https://cdn.muetab.com/img/${quality}/${data.id}.${format}?v=${data.version}`,
				id: data.id,
				location: {
					latitude: coordinates?.[0] ?? null,
					longitude: coordinates?.[1] ?? null,
					name: data.location_name,
				},
				photographer: data.photographer,
				pun: data.pun,
			},
			{ headers: { 'Cache-Control': 'no-store' } },
		);
	})
	.get('/images/unsplash', async (req, ...rest) => {
		const named_collections = {
			animals: 'nJDnd_8TN_g',
			architecture: 'e9-QAhrwZ5Q',
			landscapes: 'SxeKQtPuR0U',
			plants: 'y15m5OvaD98',
		};
		let { categories, collections, orientation, topics, username } = req.query;
		const unsplash_query = new URLSearchParams({ orientation: orientation ?? 'landscape' });
		if (categories && categories.length > 0) {
			collections = categories
				.split(',')
				.map((category) => named_collections[category])
				.join(',');
		}
		if (collections !== undefined) unsplash_query.set('collections', collections);
		if (topics !== undefined) unsplash_query.set('topics', topics);
		if (username !== undefined) unsplash_query.set('username', username);
		const data = await getUnsplashImage(unsplash_query, req.query.quality ?? 'normal', ...rest);
		return json(data, { headers: { 'Cache-Control': 'no-store' } });
	})
	.get('/images/unsplash/topics', async (req, env) => {
		const data = await (
			await fetch(`https://api.unsplash.com/topics?client_id=${env.UNSPLASH_TOKEN}`, {
				cf: { cacheTtl: 86400 },
			})
		).json();
		return json(data, {
			// cdn 1w, client 1d, stale 1d
			headers: { 'Cache-Control': 'public, s-max-age=604800, max-age=86400, stale-while-revalidate=86400' },
		});
	})
	.get('/quotes/languages', async (req, env, ctx) => {
		const { data } = await ctx.$supabase.rpc('get_quote_languages');
		return data;
	})
	.get('/map', async (req, env) => {
		const { latitude, longitude } = req.query;
		if (!latitude) return error(400, 'latitude is required');
		if (!longitude) return error(400, 'longitude is required');
		const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+555555(${longitude},${latitude})/${longitude},${latitude},9},0/450x200?access_token=${env.MAPBOX_TOKEN}`;
		const res = await fetch(url, { cf: { cacheTtl: 31536000 } }); // 1 year
		return new Response(res.body, res);
	})
	.get('/news', () => news)
	.get('/quotes/random', async (req, env, ctx) => {
		let { data: allowed } = await ctx.$supabase.rpc('get_quote_languages');
		allowed = allowed.map((row) => row.name);
		const language = req.query.language || 'en';
		if (!allowed.includes(language)) return error(400, 'Unsupported language');
		const { data } = await ctx.$supabase.rpc('get_random_quote', { _language: language }).single();
		return json(data, { headers: { 'Cache-Control': 'no-store' } });
	})
	.get('/stats', async (req, env) => {
		const res = await env.WEBSTORES.fetch(req);
		return new Response(res.body, res);
	})
	.get('/versions', async (req, env) => {
		const res = await env.WEBSTORES.fetch(req);
		return new Response(res.body, res);
	})
	.get('/weather', withWeatherLanguage, async (req, env, ctx) => {
		const { city } = req.query;
		if (!city) return error(400, '`city` param is required');
		const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${env.OPENWEATHER_TOKEN}&lang=${ctx.$language}`;
		const data = await (await fetch(url)).json();
		if (data.cod === '404') return error(404, 'No data. Try another city?');
		// cdn 10m, client 5m, stale 5m
		return json(data, { headers: { 'Cache-Control': 'public, s-max-age=600, max-age=300, stale-while-revalidate=300' } });
	});
