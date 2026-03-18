import paginate from '../../../util/pagination.js';
import { getManifest, getVersion, resolveIdentifier, applyFilters, applySorting } from '../utils.js';

export async function getItem(c) {
	const manifest = await getManifest();

	const category = c.req.param('category');
	const resolved = category
		? resolveIdentifier(manifest, c.req.param('item'), category)
		: resolveIdentifier(manifest, c.req.param('item'));

	if (!resolved) {
		return c.json({ error: 'Item Not Found' }, 404);
	}

	const { key: itemKey, category: resolvedCategory } = resolved;

	if (!manifest[resolvedCategory]) {
		return c.json({ error: 'Category Not Found' }, 404);
	}

	if (manifest[resolvedCategory][itemKey] === undefined) {
		return c.json({ error: 'Item Not Found' }, 404);
	}

	let item = await (
		await fetch(`https://marketplace-data.muetab.com/${resolvedCategory}/${itemKey}.json`, {
			cf: { cacheTtl: 3600 },
		})
	).json();

	item.in_collections = manifest[resolvedCategory][itemKey].in_collections.map((name) => {
		const collection = manifest.collections[name];
		// eslint-disable-next-line no-unused-vars
		const { items, ...collectionWithoutItems } = collection;
		return collectionWithoutItems;
	});

	const version = getVersion(c.req);
	if (version === 2) {
		item = {
			display_name: item.name,
			...item,
			name: itemKey,
		};
	}

	return c.json({ data: item,
		updated: item.updated_at });
}

export async function incrementItemView(c) {
	const manifest = await getManifest();
	const supabase = c.get('supabase');

	const category = c.req.param('category');
	const resolved = category
		? resolveIdentifier(manifest, c.req.param('item'), category)
		: resolveIdentifier(manifest, c.req.param('item'));

	if (!resolved) {
		return c.json({ error: 'Item Not Found' }, 404);
	}

	const { key: itemKey, category: resolvedCategory } = resolved;

	if (!manifest[resolvedCategory]) {
		return c.json({ error: 'Category Not Found' }, 404);
	}

	if (manifest[resolvedCategory][itemKey] === undefined) {
		return c.json({ error: 'Item Not Found' }, 404);
	}

	const { error: rpcError } = await supabase.rpc('increment_marketplace_views', {
		_category: resolvedCategory,
		_item_id: itemKey,
	});

	const { data: analyticsData, error: fetchError } = await supabase
		.from('marketplace_analytics')
		.select('views, downloads')
		.eq('item_id', itemKey)
		.eq('category', resolvedCategory)
		.single();

	return c.json(
		{
			debug: { fetchError,
				rpcError },
			downloads: analyticsData?.downloads || 0,
			views: analyticsData?.views || 1,
		},
		200,
		{ 'Cache-Control': 'no-store' },
	);
}

export async function incrementItemDownload(c) {
	const manifest = await getManifest();
	const supabase = c.get('supabase');

	const category = c.req.param('category');
	const resolved = category
		? resolveIdentifier(manifest, c.req.param('item'), category)
		: resolveIdentifier(manifest, c.req.param('item'));

	if (!resolved) {
		return c.json({ error: 'Item Not Found' }, 404);
	}

	const { key: itemKey, category: resolvedCategory } = resolved;

	if (!manifest[resolvedCategory]) {
		return c.json({ error: 'Category Not Found' }, 404);
	}

	if (manifest[resolvedCategory][itemKey] === undefined) {
		return c.json({ error: 'Item Not Found' }, 404);
	}

	const { error: rpcError } = await supabase.rpc('increment_marketplace_downloads', {
		_category: resolvedCategory,
		_item_id: itemKey,
	});

	const { data: analyticsData, error: fetchError } = await supabase
		.from('marketplace_analytics')
		.select('downloads')
		.eq('item_id', itemKey)
		.eq('category', resolvedCategory)
		.single();

	return c.json(
		{
			debug: { fetchError,
				rpcError },
			downloads: analyticsData?.downloads || 1,
		},
		200,
		{ 'Cache-Control': 'no-store' },
	);
}

export async function getItems(c) {
	let data;
	const manifest = await getManifest();
	const supabase = c.get('supabase');
	const query = c.req.query();

	if (c.req.param('category') === 'all') {
		data = [
			...Object.values(manifest.preset_settings).map((item) => ({ ...item,
				type: 'preset_settings' })),
			...Object.values(manifest.photo_packs).map((item) => ({ ...item,
				type: 'photo_packs' })),
			...Object.values(manifest.quote_packs).map((item) => ({ ...item,
				type: 'quote_packs' })),
		];
	} else {
		const category = manifest[c.req.param('category')];
		if (!category) {
			return c.json({ error: 'Not Found' }, 404);
		}

		data = Object.values(category);
		const version = getVersion(c.req);

		if (version === 1) {
			data = data.map((item) => ({ ...item,
				type: c.req.param('category') }));
		}
	}

	if (query.include_analytics === 'true' && supabase) {
		try {
			const itemIds = data.map((item) => item.name || item.id);
			const { data: analyticsData, error: dbError } = await supabase
				.from('marketplace_analytics')
				.select('item_id, views, downloads')
				.in('item_id', itemIds);

			if (!dbError && analyticsData) {
				const analyticsMap = new Map(
					analyticsData.map((row) => [
						row.item_id,
						{ downloads: row.downloads || 0,
							views: row.views || 0 },
					]),
				);

				data = data.map((item) => {
					const itemKey = item.name || item.id;
					const analytics = analyticsMap.get(itemKey);
					return analytics ? { ...item,
						...analytics } : { ...item,
						downloads: 0,
						views: 0 };
				});
			}
		} catch (err) {
			console.warn('Failed to fetch analytics data', err);
		}
	}

	data = applyFilters(data, query);
	data = applySorting(data, query);

	const paginatedData = paginate(data, query);
	const page = parseInt(query.page) || 1;
	const perPage = parseInt(query.per_page) || 20;
	const totalPages = Math.ceil(data.length / perPage);

	return c.json({
		data: paginatedData,
		meta: {
			has_more: page < totalPages,
			page,
			per_page: perPage,
			total: data.length,
			total_pages: totalPages,
		},
	});
}
