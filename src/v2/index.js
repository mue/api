import { Router } from 'itty-router';
import { json, error } from 'itty-router-extras';
import sizes from '../sizes';
import news from '../../news';
import { getUnsplashImage } from './unsplash';
import { getPexelsImage } from './pexels';
import { withWeatherLanguage } from './weather';
import {
	batchGetItems,
	getCategoryStats,
	getCollection,
	getCollections,
	getCurator,
	getCurators,
	getFeatured,
	getGlobalStats,
	getItem,
	getItems,
	getRandom,
	getRecent,
	getRelatedItems,
	getTrending,
	incrementItemView,
	search,
} from './marketplace';

export default Router({ base: '/v2' })
	.get('/marketplace/collection/:collection', getCollection)
	.get('/marketplace/collections', getCollections)
	.get('/marketplace/curator/:curator', getCurator)
	.get('/marketplace/curators', getCurators)
	.get('/marketplace/featured', getFeatured)
	.get('/marketplace/item/:item/related', getRelatedItems)
	.get('/marketplace/item/:category/:item/related', getRelatedItems)
	.get('/marketplace/item/:item', getItem)
	.get('/marketplace/item/:category/:item', getItem)
	.post('/marketplace/item/:item/view', incrementItemView)
	.post('/marketplace/item/:category/:item/view', incrementItemView)
	.get('/marketplace/items/:category', getItems)
	.get('/marketplace/random/:category', getRandom)
	.get('/marketplace/random', getRandom)
	.get('/marketplace/search', search)
	.post('/marketplace/batch', batchGetItems)
	.get('/marketplace/stats/global', getGlobalStats)
	.get('/marketplace/stats/category/:category', getCategoryStats)
	.get('/marketplace/trending', getTrending)
	.get('/marketplace/recent', getRecent)
	.get('/gps', withWeatherLanguage, async (req, env, ctx) => {
		const { latitude, longitude } = req.query;
		if (!latitude || !longitude) {
			return error(400, '`latitude` and `longitude` params are required');
		}
		const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${env.OPENWEATHER_TOKEN}&lang=${ctx.$language}`;
		const data = await (await fetch(url)).json();
		return json(data, {
			headers: {
				// 1w, stale 1d
				'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400, immutable',
			},
		});
	})
	.get('/geocode', withWeatherLanguage, async (req, env, ctx) => {
		const { q, limit = 5 } = req.query;
		if (!q) return error(400, '`q` param is required');
		if (q.length < 2) return error(400, '`q` must be at least 2 characters');

		const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=${limit}&appid=${env.OPENWEATHER_TOKEN}`;
		const data = await (await fetch(url)).json();

		const locations = data.map((loc) => ({
			name: loc.name,
			state: loc.state || null,
			country: loc.country,
			lat: loc.lat,
			lon: loc.lon,
			displayName: [loc.name, loc.state, loc.country].filter(Boolean).join(', '),
		}));

		return json(locations, {
			headers: {
				// 1w, stale 1d
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
		const kv_id = 'v2_image_categories';
		let allowed = await env.cache.get(kv_id, {
			cacheTtl: 3600, // cache at this location for an hour
			type: 'json',
		});
		if (!allowed) {
			const { data } = await ctx.$supabase.rpc('get_image_categories');
			// save for 1 day
			ctx.waitUntil(env.cache.put(kv_id, JSON.stringify(data), { expirationTtl: 86400 }));
			allowed = data;
		}
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
		const { categories, collections, orientation, topics, username } = req.query;
		const unsplash_query = new URLSearchParams({ orientation: orientation ?? 'landscape' });
		if (categories && categories.length > 0) {
			unsplash_query.set(
				'collections',
				categories
					.split(',')
					.map((category) => named_collections[category])
					.join(','),
			);
		}
		// collections overwrites categories
		if (collections !== undefined) unsplash_query.set('collections', collections);
		if (topics !== undefined) unsplash_query.set('topics', topics);
		if (username !== undefined) unsplash_query.set('username', username);
		if (unsplash_query.get('collections') === null)
			unsplash_query.set('collections', Object.values(named_collections).join(','));
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
			headers: {
				'Cache-Control': 'public, s-max-age=604800, max-age=86400, stale-while-revalidate=86400',
			},
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
		const kv_id = 'v2_quote_languages';
		let allowed = await env.cache.get(kv_id, {
			cacheTtl: 3600, // cache at this location for an hour
			type: 'json',
		});
		if (!allowed) {
			const { data } = await ctx.$supabase.rpc('get_quote_languages');
			// save for 1 day
			ctx.waitUntil(env.cache.put(kv_id, JSON.stringify(data), { expirationTtl: 86400 }));
			allowed = data;
		}
		allowed = allowed.map((row) => row.name);
		const language = req.query.language || 'en';
		if (!allowed.includes(language)) return error(400, 'Unsupported language');
		const { data } = await ctx.$supabase.rpc('get_random_quote', { _language: language }).single();
		return json(data, { headers: { 'Cache-Control': 'no-store' } });
	})
	.get('/search/autocomplete', async (req) => {
		const search = new URLSearchParams(req.query).toString();
		const url = 'https://ac.ecosia.org/?' + search;
		const headers = new Headers(req.headers);
		headers.append('x-forwarded-for', req.headers.get('cf-connecting-ip'));
		const res = await fetch(new Request(url, { headers }));
		return json(await res.json());
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
		const { city, lat, lon } = req.query;

		let url;
		if (lat && lon) {
			// Coordinate-based lookup (preferred)
			const latitude = parseFloat(lat);
			const longitude = parseFloat(lon);
			if (isNaN(latitude) || isNaN(longitude)) {
				return error(400, 'Invalid coordinates: `lat` and `lon` must be numbers');
			}
			if (latitude < -90 || latitude > 90) {
				return error(400, 'Invalid latitude: must be between -90 and 90');
			}
			if (longitude < -180 || longitude > 180) {
				return error(400, 'Invalid longitude: must be between -180 and 180');
			}
			url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${env.OPENWEATHER_TOKEN}&lang=${ctx.$language}`;
		} else if (city) {
			// Backwards compatible: city name lookup
			url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${env.OPENWEATHER_TOKEN}&lang=${ctx.$language}`;
		} else {
			return error(400, 'Either `city` param or `lat` and `lon` params are required');
		}

		const data = await (await fetch(url)).json();
		if (data.cod === '404') return error(404, 'No data. Try another city?');
		// 10m (too short for cf), stale 5m
		return json(data, {
			headers: { 'Cache-Control': 'private, max-age=600, stale-while-revalidate=300' },
		});
	});
