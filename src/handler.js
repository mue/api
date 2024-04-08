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
			origin: req.headers.get('origin'),
			requestId,
			url: req.url,
		});

		try {
			// if (req.method === 'GET') {
			// 	const cache = caches.default;
			// 	const cacheKey = new Request(new URL(req.url).toString(), req);
			// 	await cache.match(cacheKey);
			// }
			/** @type {Response} */
			let res = await router.handle(req, env, ctx);
			if (!(res instanceof Response)) {
				// json, 1 day (+ 1 hour) default
				res = json(res, {
					headers: { 'Cache-Control': 'public, s-max-age=86400, max-age=3600, stale-while-revalidate=3600' },
				});
			}
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
			res.headers.set('Access-Control-Allow-Origin', '*');
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