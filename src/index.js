import { Router } from 'itty-router';
import {
	json,
	missing,
	error,
} from 'itty-router-extras';
import limiterFactory  from 'lambda-rate-limiter';
import ms from 'ms';
import Umami from './umami';
import { createClient } from '@supabase/supabase-js';
import v2 from './v2';
import sizes from './sizes';
import news from '../news';
import { getVersions } from './versions';
import { getStats } from './stats';

const limiter = limiterFactory({ interval: ms('1m') });

const router = Router();
router
	// global middleware for decorating and tracking the request
	.all('*', async (req, env, ctx) => {
		req.$supabase = createClient(env.SUPABASE_URL, env.SUPABASE_TOKEN);
		if (env.UMAMI_URL) {
			req.$umami = new Umami(env.UMAMI_URL, env.UMAMI_ID, ctx);
			ctx.waitUntil(req.$umami.request(req));
		}
		// handle rate limits
		try {
			await limiter.check(100, req.headers.get('CF-Connecting-IP'));
		} catch {
			if (env.UMAMI_URL) req.$umami.error(req, 'ratelimit');
			return error(429, 'Too Many Requests');
		}
	})
	.get('/', () => json('Hello World! API docs: https://docs.muetab.com/api/introduction'))
	.get('/images/categories', async req => {
		const { data } = await req.$supabase.rpc('get_image_categories');
		return json(data.map(row => row.name), { headers: { 'Cache-Control': 'max-age=3600' } });
	})
	.get('/images/photographers', async req => {
		const { data } = await req.$supabase.rpc('get_image_photographers');
		return json(data.map(row => row.name), { headers: { 'Cache-Control': 'max-age=3600' } });
	})
	.get('/images/random', async req => {
		const { data: categories } = await req.$supabase.rpc('get_image_categories');
		const category = categories[Math.floor(Math.random() * categories.length)].name;
		const { data } = await req.$supabase.rpc('get_random_image', { _category: category }).single();
		const format = req.headers.get('accept')?.includes('avif') ? 'avif' : 'webp';
		const quality = sizes[req.query?.quality] ?? 'fhd';
		return json({
			camera: data.camera,
			category: data.category,
			file: `https://cdn.muetab.com/img/${quality}/${data.id}.${format}?v=${data.version}`,
			location: data.location_name,
			photographer: data.photographer,
		}, { headers: { 'Cache-Control': 'no-cache' } });
	})
	.get('/news', () => json(news, { headers: { 'Cache-Control': 'max-age=3600' } }))
	.get('/quotes/languages', async req => {
		const { data } = await req.$supabase.rpc('get_quote_languages');
		return json(data.map(row => row.name), { headers: { 'Cache-Control': 'max-age=3600' } });
	})
	.get('/quotes/random', async req => {
		const { data } = await req.$supabase.rpc('get_random_old_quote', { _language: req.query.language }).single();
		return json(data, { headers: { 'Cache-Control': 'no-cache' } });
	})
	.get('/stats', async () => json(await getStats(), { headers: { 'Cache-Control': 'max-age=86400' } }))
	.get('/versions', async () => {
		const browsers = await getVersions();
		return json({ browsers }, { headers: { 'Cache-Control': 'max-age=86400' } });
	})
	.all('/v2/*', v2.handle)
	.all('*', () => missing('Not Found'));

export default {
	async fetch(req, env, ctx) {
		try {
			/** @type {Response} */
			const res = await router.handle(req, env, ctx);
			res.headers.set('Access-Control-Allow-Origin', '*');
			return res;
		} catch (err) {
			console.error('ERROR:', {
				err,
				req,
			});
			if (env.UMAMI_URL) req.$umami.error(req, 'unknown');
			return error(500, {
				error: err.message,
				message: 'Internal Serverless Error',
				stack: err.stack,
			});
		}
	},
};
