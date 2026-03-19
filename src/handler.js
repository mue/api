import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';

import { getDB } from './db/index.js';

import v1 from './v1';
import v2 from './v2';

const app = new Hono();

app.use('*', cors({ origin: '*' }));

app.use('*', async (c, next) => {
	c.set('db', getDB(c.env));
	await next();
});

app.use('*', cache({
	cacheControl: 'public, s-max-age=86400, max-age=3600, stale-while-revalidate=3600',
	cacheName: 'api',
	wait: true,
}));

app.route('/', v1);
app.route('/v2', v2);

app.onError((err, c) => c.json(
	{ error: err?.message,
		message: 'Internal Serverless Error',
		stack: err?.stack },
	500,
));

export default app;
