import { Hono } from 'hono';
import { count, desc, eq, and, notInArray, sql } from 'drizzle-orm';
import { images } from '../db/schema.js';
import sizes from '../util/sizes';

export default new Hono()
	.get('/categories', async (c) => {
		const db = c.get('db');
		const data = await db
			.select({ count: count(),
				name: images.category })
			.from(images)
			.groupBy(images.category)
			.orderBy(desc(count()));

		return c.json(data.map((row) => row.name));
	})
	.get('/photographers', async (c) => {
		const db = c.get('db');
		const data = await db
			.select({ count: count(),
				name: images.photographer })
			.from(images)
			.groupBy(images.photographer)
			.orderBy(desc(count()));

		return c.json(data.map((row) => row.name));
	})
	.get('/random', async (c) => {
		const db = c.get('db');
		const kv_id = 'image_categories';

		let categories = await c.env.cache.get(kv_id, {
			cacheTtl: 3600,
			type: 'json',
		});

		if (!categories) {
			categories = await db
				.select({ count: count(),
					name: images.category })
				.from(images)
				.groupBy(images.category)
				.orderBy(desc(count()));

			c.executionCtx.waitUntil(
				c.env.cache.put(kv_id, JSON.stringify(categories), { expirationTtl: 86400 }),
			);
		}

		const category = categories[Math.floor(Math.random() * categories.length)].name;

		const excludeList = c.req.query('exclude')?.split(',').map(Number).filter(Boolean) ?? [];
		const conditions = [eq(images.category, category)];
		if (excludeList.length > 0) {
			conditions.push(notInArray(images.pun, excludeList));
		}

		const data = await db
			.select()
			.from(images)
			.where(and(...conditions))
			.orderBy(sql`RANDOM()`)
			.limit(1)
			.then((rows) => rows[0]);

		const format = c.req.header('accept')?.includes('avif') ? 'avif' : 'webp';
		const quality = sizes[c.req.query('quality')] ?? 'fhd';

		return c.json(
			{
				camera: data.camera,
				category: data.category,
				file: `https://cdn.muetab.com/img/${quality}/${data.id}.${format}?v=${data.version}`,
				location: data.locationName,
				photographer: data.photographer,
			},
			200,
			{ 'Cache-Control': 'no-store' },
		);
	});
