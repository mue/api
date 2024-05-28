import router from './router';
import { json, error } from 'itty-router-extras';
import { trace } from '@opentelemetry/api';
import { BaselimeLogger } from '@baselime/edge-logger';
import { createClient } from '@supabase/supabase-js';

export default {
	/**
	 * @param {Request} req
	 */
	async fetch(req, env, ctx) {
		const requestId = req.headers.get('cf-ray') || crypto.randomUUID();
		const span = trace.getActiveSpan();
		span?.setAttribute('cf-ray', requestId);
		const logger = new BaselimeLogger({
			apiKey: env.BASELIME_API_KEY,
			ctx,
			dataset: 'cloudflare',
			// isLocalDev: env.IS_LOCAL_MODE,
			namespace: 'api',
			requestId,
			service: 'mue',
		});
		ctx.$logger = logger;
		ctx.$supabase = createClient(env.SUPABASE_URL, env.SUPABASE_TOKEN);
		logger.info('Request', {
			method: req.method,
			origin: req.headers.get('origin'),
			query: req.query,
			requestId,
			url: req.url,
		});
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
					// cdn 1d, client 1h
					headers: { 'Cache-Control': 'public, s-max-age=86400, max-age=3600' }, // stale-while-revalidate=3600
				});
			}

			res.headers.set('Access-Control-Allow-Origin', '*');

			if (res.status > 399) {
				// !res.ok
				logger.warn('Non-ok response', {
					request: {
						method: req.method,
						query: req.query,
						url: req.url,
					},
					response: {
						body: await res.clone().text(),
						status: res.status,
					},
				});
			}


			if (res.headers.has('Cache-Control') && res.headers.get('Cache-Control') !== 'no-store') {
				ctx.waitUntil(cache.put(cacheKey, res.clone()));
			}

			return res;
		} catch (err) {
			logger.error('Internal Serverless Error', { error: JSON.stringify(err) });
			const res = error(500, {
				error: err?.message,
				message: 'Internal Serverless Error',
				stack: err?.stack,
			});
			res.headers.set('Access-Control-Allow-Origin', '*');
			return res;
		} finally {
			ctx.waitUntil(logger.flush());
		}
	},
};