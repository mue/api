// import { instrument } from '@microlabs/otel-cf-workers';

// const config = (env) => ({
// 	exporter: {
// 		headers: { 'x-api-key': env.BASELIME_API_KEY },
// 		url: 'https://otel.baselime.io/v1',
// 	},
// 	service: { name: 'mue' },
// });

// export default instrument(router, config);

import router from './router.js';
import { json, error } from 'itty-router-extras';
import { BaselimeLogger } from '@baselime/edge-logger';
import { createClient } from '@supabase/supabase-js';

export default {
	async fetch(req, env, ctx) {
		const logger = new BaselimeLogger({
			apiKey: env.BASELIME_API_KEY,
			ctx,
			dataset: 'cloudflare',
			isLocalDev: env.IS_LOCAL_MODE,
			namespace: 'api',
			requestId: crypto.randomUUID(),
			service: 'mue',
		});
		ctx.$logger = logger;
		ctx.$supabase = createClient(env.SUPABASE_URL, env.SUPABASE_TOKEN);
		try {
			/** @type {Response} */
			let res = await router.handle(req, env, ctx);
			if (!(res instanceof Response)) {
				// json, 1 day (+ 1 hour) default
				res = json(res, {
					headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' },
				});
			}
			if (res.status > 399) {
				// !res.ok
				logger.warn('Non-ok response', {
					request: JSON.stringify(req),
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
