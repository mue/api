import router from './v1';
import { json, error } from 'itty-router-extras';
import { createClient } from '@supabase/supabase-js';

export default {
	/**
	 * @param {Request} req
	 */
	async fetch(req, env, ctx) {
		ctx.$supabase = createClient(env.SUPABASE_URL, env.SUPABASE_TOKEN);
		try {
			const cache = caches.default;
			const cacheKey = new Request(new URL(req.url).toString(), req);

			// attempt to serve from cache
			if (req.method === 'GET') {
				const res = await cache.match(cacheKey);
				if (res) return res;
			}

			// if not cached

			/** @type {Response} */
			let res = await router.handle(req, env, ctx);

			if (!(res instanceof Response)) {
				res = json(res, {
					// cdn 1d, client 1h, stale 1h
					headers: {
						'Cache-Control': 'public, s-max-age=86400, max-age=3600, stale-while-revalidate=3600',
					},
				});
			}

			res.headers.set('Access-Control-Allow-Origin', '*');

			if (res.headers.has('Cache-Control') && res.headers.get('Cache-Control') !== 'no-store') {
				ctx.waitUntil(cache.put(cacheKey, res.clone()));
			}

			return res;
		} catch (err) {
			const res = error(500, {
				error: err?.message,
				message: 'Internal Serverless Error',
				stack: err?.stack,
			});
			res.headers.set('Access-Control-Allow-Origin', '*');
			return res;
		}
	},
};
