import { Router } from 'itty-router';
import { json, error } from 'itty-router-extras';
import sizes from '../sizes';
import news from '../../news';
import { getStats } from '../stats';
import { getVersions } from '../versions';
import { getUnsplashImage } from './unsplash';
import { getPexelsImage } from './pexels';
import { withWeatherLanguage } from './weather';
import {
	getCollection,
	getCollections,
	getFeatured,
	getItem,
	getItems,
} from './marketplace';

export default new Router({ base: '/v2' })
	.get('/collection/:collection', getCollection)
	.get('/collections', getCollections)
	.get('/featured', getFeatured)
	.get('/gps', withWeatherLanguage, async (req, env) => {
		const { latitude, longitude } = req.query;
		if (!latitude || !longitude) {
			if (req.$umami) req.$umami.error(req, 'missing-params');
			return error(400, '`latitude` and `longitude` params are required');
		}
		const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${env.OPENWEATHER_TOKEN}&lang=${req.$language}`;
		const data = await (await fetch(url)).json();
		return json(data, { headers: { 'Cache-Control': 'max-age=604800, stale-while-revalidate=86400, immutable' } });
	})
	.get('/images/categories', async (req) => {
		const { data } = await req.$supabase.rpc('get_image_categories');
		return json(data, { headers: { 'Cache-Control': 'max-age=3600' } });
	})
	.get('/images/pexels', async (req, ...rest) =>
		json(await getPexelsImage(req.query.quality ?? 'normal', ...rest), { headers: { 'Cache-Control': 'no-cache' } }),
	)
	.get('/images/photographers', async (req) => {
		const { data } = await req.$supabase.rpc('get_image_photographers');
		return json(data, { headers: { 'Cache-Control': 'max-age=3600' } });
	})
	.get('/images/random', async (req) => {
		let { data: allowed } = await req.$supabase.rpc('get_image_categories');
		allowed = allowed.map((row) => row.name);
		let categories =
			req.query.categories?.split(',')?.filter((category) => allowed.includes(category)) ?? [];
		if (categories.length === 0) categories = allowed;
		const category = categories[Math.floor(Math.random() * categories.length)];
		const { data } = await req.$supabase
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
			{ headers: { 'Cache-Control': 'no-cache' } },
		);
	})
	.get('/images/unsplash', async (req, ...rest) => {
		let { data: allowed } = await req.$supabase.rpc('get_image_categories');
		allowed = allowed.map((row) => row.name);
		let categories =
			req.query.categories?.split(',')?.filter((category) => allowed.includes(category)) ?? [];
		if (categories.length === 0) categories = allowed;
		const category = categories[Math.floor(Math.random() * categories.length)];
		return json(await getUnsplashImage(category, req.query.quality ?? 'normal', ...rest), { headers: { 'Cache-Control': 'no-cache' } });
	})
	.get('/item/:category/:item', getItem)
	.get('/items/:category', getItems)
	.get('/quotes/languages', async (req) => {
		const { data } = await req.$supabase.rpc('get_quote_languages');
		return json(data, { headers: { 'Cache-Control': 'max-age=3600' } });
	})
	.get('/map', async (req, env) => {
		const { latitude, longitude } = req.query;
		if (!latitude) return error(400, 'latitude is required');
		if (!longitude) return error(400, 'longitude is required');
		const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+555555(${longitude},${latitude})/${longitude},${latitude},9},0/300x200?access_token=${env.MAPBOX_TOKEN}`;
		const res = await fetch(url, { cf: { cacheTtl: 31536000 } });
		return new Response(res.body, res);
	})
	.get('/news', () => json(news, { headers: { 'Cache-Control': 'max-age=3600' } }))
	.get('/quotes/random', async (req) => {
		let { data: allowed } = await req.$supabase.rpc('get_quote_languages');
		allowed = allowed.map((row) => row.name);
		const language = req.query.language || 'en';
		if (!allowed.includes(language)) {
			if (req.$umami) req.$umami.error(req, 'unsupported-language');
			return error(400, 'Unsupported language');
		}
		const { data } = await req.$supabase.rpc('get_random_quote', { _language: language }).single();
		return json(data, { headers: { 'Cache-Control': 'no-cache' } });
	})
	.get('/stats', async () =>
		json(await getStats(), { headers: { 'Cache-Control': 'max-age=86400' } }),
	)
	.get('/versions', async () => {
		const browsers = await getVersions();
		return json({ browsers }, { headers: { 'Cache-Control': 'max-age=86400' } });
	})
	.get('/weather', withWeatherLanguage, async (req, env) => {
		const { city } = req.query;
		if (!city) {
			if (req.$umami) req.$umami.error(req, 'missing-params');
			return error(400, '`city` param is required');
		}
		const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${env.OPENWEATHER_TOKEN}&lang=${req.$language}`;
		const data = await (await fetch(url)).json();
		if (data.cod === '404') {
			if (req.$umami) req.$umami.error(req, 'data-no-found');
			return error(404, 'No data. Try another city?');
		}
		return json(data, { headers: { 'Cache-Control': 'max-age=900' } });
	});
