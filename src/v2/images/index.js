import { Hono } from 'hono';
import { json } from '../../util/response';
import sizes from '../../util/sizes';
import { getUnsplashImage } from './unsplash';

export default new Hono()
	.get('/categories', async (c) => {
		const { data } = await c.get('supabase').rpc('get_image_categories');

		return c.json(data);
	})
	.get('/photographers', async (c) => {
		const { data } = await c.get('supabase').rpc('get_image_photographers');

		return c.json(data);
	})
	.get('/random', async (c) => {
		const kv_id = 'v2_image_categories';
		let allowed = await c.env.cache.get(kv_id, {
			cacheTtl: 3600,
			type: 'json',
		});

		if (!allowed) {
			const { data } = await c.get('supabase').rpc('get_image_categories');
			c.executionCtx.waitUntil(
				c.env.cache.put(kv_id, JSON.stringify(data), { expirationTtl: 86400 }),
			);
			allowed = data;
		}

		allowed = allowed.map((row) => row.name);
		let categories =
			c.req
				.query('categories')
				?.split(',')
				?.filter((category) => allowed.includes(category)) ?? [];

		if (categories.length === 0) {
			categories = allowed;
		}

		const category = categories[Math.floor(Math.random() * categories.length)];
		const { data } = await c
			.get('supabase')
			.rpc('get_random_image', {
				_category: category,
				_exclude: c.req.query('exclude'),
			})
			.single();

		const format = c.req.header('accept')?.includes('avif') ? 'avif' : 'webp';
		const quality = sizes[c.req.query('quality')] ?? 'fhd';
		const coordinates = data.location_data?.split(',');

		return Response.json(
			{
				blur_hash: data.blur_hash,
				camera: data.camera,
				category: data.category,
				colour: data.colour,
				file: `https://cdn.muetab.com/img/${quality}/${data.id}.${format}?v=${data.version}`,
				id: data.id,
				location: {
					latitude: coordinates?.[0] ?? null,
					longitude: coordinates?.[1] ?? null,
					name: data.location_name,
				},
				photographer: data.photographer,
				pun: data.pun,
			},
			{ headers: { 'Cache-Control': 'no-store' } },
		);
	})
	.get('/unsplash/topics', async (c) => {
		const data = await (
			await fetch(`https://api.unsplash.com/topics?client_id=${c.env.UNSPLASH_TOKEN}`, {
				cf: { cacheTtl: 86400 },
			})
		).json();

		return json(data, {
			headers: {
				'Cache-Control':
					'public, s-max-age=604800, max-age=86400, stale-while-revalidate=86400',
			},
		});
	})
	.get('/unsplash', async (c) => {
		const named_collections = {
			animals: 'nJDnd_8TN_g',
			architecture: 'e9-QAhrwZ5Q',
			landscapes: 'SxeKQtPuR0U',
			plants: 'y15m5OvaD98',
		};

		const { categories, collections, orientation, topics, username } = c.req.query();
		const unsplash_query = new URLSearchParams({ orientation: orientation ?? 'landscape' });

		if (categories && categories.length > 0) {
			unsplash_query.set(
				'collections',
				categories
					.split(',')
					.map((category) => named_collections[category])
					.join(','),
			);
		}

		if (collections !== undefined && collections.trim?.()) {
			unsplash_query.set('collections', collections.trim());
		}

		if (topics !== undefined) {
			unsplash_query.set('topics', topics);
		}

		if (username !== undefined) {
			unsplash_query.set('username', username);
		}

		if (!unsplash_query.get('collections')) {
			unsplash_query.set('collections', Object.values(named_collections).join(','));
		}

		const data = await getUnsplashImage(
			unsplash_query,
			c.req.query('quality') ?? 'normal',
			c.env,
		);

		return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
	});
