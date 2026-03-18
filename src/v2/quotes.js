import { Hono } from 'hono';

export default new Hono()
	.get('/languages', async (c) => {
		const { data } = await c.get('supabase').rpc('get_quote_languages');

		return c.json(data);
	})
	.get('/random', async (c) => {
		const kv_id = 'v2_quote_languages';

		let allowed = await c.env.cache.get(kv_id, {
			cacheTtl: 3600,
			type: 'json',
		});

		if (!allowed) {
			const { data } = await c.get('supabase').rpc('get_quote_languages');
			c.executionCtx.waitUntil(
				c.env.cache.put(kv_id, JSON.stringify(data), { expirationTtl: 86400 }),
			);

			allowed = data;
		}

		allowed = allowed.map((row) => row.name);
		const language = c.req.query('language') || 'en';
		if (!allowed.includes(language)) {
			return c.json({ error: 'Unsupported language' }, 400);
		}

		const { data } = await c
			.get('supabase')
			.rpc('get_random_quote', { _language: language })
			.single();

		return c.json(data, 200, { 'Cache-Control': 'no-store' });
	});
