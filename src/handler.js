import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';
import v1 from './v1';
import v2 from './v2';

const app = new Hono();

app.use('*', cors({ origin: '*' }));

app.use('*', async (c, next) => {
	c.set('supabase', createClient(c.env.SUPABASE_URL, c.env.SUPABASE_TOKEN));
	await next();
});

app.use('*', async (c, next) => {
	const cache = caches.default;
	const cacheKey = new Request(c.req.url);

	if (c.req.method === 'GET') {
		const cached = await cache.match(cacheKey);
		if (cached) return cached;
	}

	await next();

	const res = c.res;
	if (!res.headers.has('Cache-Control')) {
		const newHeaders = new Headers(res.headers);
		newHeaders.set(
			'Cache-Control',
			'public, s-max-age=86400, max-age=3600, stale-while-revalidate=3600',
		);
		c.res = new Response(res.body, { headers: newHeaders,
			status: res.status,
			statusText: res.statusText });
	}

	if (c.res.headers.get('Cache-Control') !== 'no-store') {
		c.executionCtx.waitUntil(cache.put(cacheKey, c.res.clone()));
	}
});

app.route('/', v1);
app.route('/v2', v2);

app.onError((err, c) => c.json(
	{ error: err?.message,
		message: 'Internal Serverless Error',
		stack: err?.stack },
	500,
));

export default app;
