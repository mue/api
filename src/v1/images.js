import { Hono } from 'hono';
import sizes from '../util/sizes';

export default new Hono()
	.get('/categories', async (c) => {
		const { data } = await c.get('supabase').rpc('get_image_categories');

		return c.json(data.map((row) => row.name));
	})
	.get('/photographers', async (c) => {
		const { data } = await c.get('supabase').rpc('get_image_photographers');

		return c.json(data.map((row) => row.name));
	})
	.get('/random', async (c) => {
		const kv_id = 'image_categories';
		let categories = await c.env.cache.get(kv_id, {
			cacheTtl: 3600,
			type: 'json',
		});

		if (!categories) {
			const { data } = await c.get('supabase').rpc('get_image_categories');
			c.executionCtx.waitUntil(
				c.env.cache.put(kv_id, JSON.stringify(data), { expirationTtl: 86400 }),
			);
			categories = data;
		}

		const category = categories[Math.floor(Math.random() * categories.length)].name;
		const { data } = await c
			.get('supabase')
			.rpc('get_random_image', { _category: category })
			.single();

		const format = c.req.header('accept')?.includes('avif') ? 'avif' : 'webp';
		const quality = sizes[c.req.query('quality')] ?? 'fhd';

		return Response.json(
			{
				camera: data.camera,
				category: data.category,
				file: `https://cdn.muetab.com/img/${quality}/${data.id}.${format}?v=${data.version}`,
				location: data.location_name,
				photographer: data.photographer,
			},
			{ headers: { 'Cache-Control': 'no-store' } },
		);
	});
