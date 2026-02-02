/* eslint-disable indent */
import { error, json } from 'itty-router-extras';
import paginate from '../../pagination.js';
import { getManifest, getVersion, resolveIdentifier, applyFilters, applySorting } from './utils.js';

/**
 * @param {Request} req
 */
export async function getItem(req) {
	const manifest = await getManifest();

	// If category is not provided, treat item as an ID and resolve it
	const category = req.params.category;
	const resolved = category
		? resolveIdentifier(manifest, req.params.item, category)
		: resolveIdentifier(manifest, req.params.item);

	if (!resolved) {
		return error(404, 'Item Not Found');
	}

	const { key: itemKey, category: resolvedCategory } = resolved;

	if (!manifest[resolvedCategory]) {
		return error(404, 'Category Not Found');
	}

	if (manifest[resolvedCategory][itemKey] === undefined) {
		return error(404, 'Item Not Found');
	}

	let item = await (
		await fetch(`https://marketplace-data.muetab.com/${resolvedCategory}/${itemKey}.json`, {
			cf: { cacheTtl: 3600 },
		})
	).json();

	// Clone collections to avoid mutation
	item.in_collections = manifest[resolvedCategory][itemKey].in_collections.map((name) => {
		const collection = manifest.collections[name];
		// eslint-disable-next-line no-unused-vars
		const { items, ...collectionWithoutItems } = collection;
		return collectionWithoutItems;
	});

	const version = getVersion(req);
	if (version === 2) {
		item = {
			display_name: item.name,
			...item,
			name: itemKey,
		};
	}

	return json({
		data: item,
		updated: item.updated_at,
	});
}

/**
 * @param {Request} req
 */
export async function incrementItemView(req, env, ctx) {
	const manifest = await getManifest();

	// If category is not provided, treat item as an ID and resolve it
	const category = req.params.category;
	const resolved = category
		? resolveIdentifier(manifest, req.params.item, category)
		: resolveIdentifier(manifest, req.params.item);

	if (!resolved) {
		return error(404, 'Item Not Found');
	}

	const { key: itemKey, category: resolvedCategory } = resolved;

	if (!manifest[resolvedCategory]) {
		return error(404, 'Category Not Found');
	}

	if (manifest[resolvedCategory][itemKey] === undefined) {
		return error(404, 'Item Not Found');
	}

	// Increment view count
	const { error: rpcError } = await ctx.$supabase.rpc('increment_marketplace_views', {
		_category: resolvedCategory,
		_item_id: itemKey,
	});

	if (rpcError) {
		ctx.$logger?.error('Failed to increment views', {
			category: resolvedCategory,
			error: rpcError,
			item_id: itemKey,
		});
	}

	// Fetch updated view count and download count
	const { data: analyticsData, error: fetchError } = await ctx.$supabase
		.from('marketplace_analytics')
		.select('views, downloads')
		.eq('item_id', itemKey)
		.eq('category', resolvedCategory)
		.single();

	if (fetchError) {
		ctx.$logger?.error('Failed to fetch views', {
			category: resolvedCategory,
			error: fetchError,
			item_id: itemKey,
		});
	}

	return json(
		{
			debug: {
				fetchError,
				rpcError,
			}, // Temporary debug info
			views: analyticsData?.views || 1,
			downloads: analyticsData?.downloads || 0,
		},
		{
			headers: { 'Cache-Control': 'no-store' },
		},
	);
}

/**
 * @param {Request} req
 */
export async function incrementItemDownload(req, env, ctx) {
	const manifest = await getManifest();

	// If category is not provided, treat item as an ID and resolve it
	const category = req.params.category;
	const resolved = category
		? resolveIdentifier(manifest, req.params.item, category)
		: resolveIdentifier(manifest, req.params.item);

	if (!resolved) {
		return error(404, 'Item Not Found');
	}

	const { key: itemKey, category: resolvedCategory } = resolved;

	if (!manifest[resolvedCategory]) {
		return error(404, 'Category Not Found');
	}

	if (manifest[resolvedCategory][itemKey] === undefined) {
		return error(404, 'Item Not Found');
	}

	// Increment download count
	const { error: rpcError } = await ctx.$supabase.rpc('increment_marketplace_downloads', {
		_category: resolvedCategory,
		_item_id: itemKey,
	});

	if (rpcError) {
		ctx.$logger?.error('Failed to increment downloads', {
			category: resolvedCategory,
			error: rpcError,
			item_id: itemKey,
		});
	}

	// Fetch updated download count
	const { data: analyticsData, error: fetchError } = await ctx.$supabase
		.from('marketplace_analytics')
		.select('downloads')
		.eq('item_id', itemKey)
		.eq('category', resolvedCategory)
		.single();

	if (fetchError) {
		ctx.$logger?.error('Failed to fetch downloads', {
			category: resolvedCategory,
			error: fetchError,
			item_id: itemKey,
		});
	}

	return json(
		{
			debug: {
				fetchError,
				rpcError,
			}, // Temporary debug info
			downloads: analyticsData?.downloads || 1,
		},
		{
			headers: { 'Cache-Control': 'no-store' },
		},
	);
}

/**
 * @param {Request} req
 * @param {Object} env
 * @param {Object} ctx
 */
export async function getItems(req, env, ctx) {
	let data;
	const manifest = await getManifest();
	if (req.params.category === 'all') {
		data = [
			...Object.values(manifest.preset_settings).map((item) => ({
				...item,
				type: 'preset_settings',
			})),
			...Object.values(manifest.photo_packs).map((item) => ({
				...item,
				type: 'photo_packs',
			})),
			...Object.values(manifest.quote_packs).map((item) => ({
				...item,
				type: 'quote_packs',
			})),
		];
	} else {
		const category = manifest[req.params.category];
		if (!category) {
			return error(404, 'Not Found');
		}
		data = Object.values(category);
		const version = getVersion(req);
		if (version === 1) {
			data = data.map((item) => ({
				...item,
				type: req.params.category,
			}));
		}
	}

	// Conditionally fetch and merge analytics data
	const includeAnalytics = req.query.include_analytics === 'true';
	if (includeAnalytics && ctx.$supabase) {
		try {
			// Get item identifiers
			const itemIds = data.map(item => item.name || item.id);

			// Fetch analytics for all items in single query
			const { data: analyticsData, error: dbError } = await ctx.$supabase
				.from('marketplace_analytics')
				.select('item_id, views, downloads')
				.in('item_id', itemIds);

			if (!dbError && analyticsData) {
				// Create lookup map for O(1) access
				const analyticsMap = new Map(
					analyticsData.map(row => [
						row.item_id,
						{ views: row.views || 0, downloads: row.downloads || 0 }
					])
				);

				// Merge analytics into items
				data = data.map(item => {
					const itemKey = item.name || item.id;
					const analytics = analyticsMap.get(itemKey);
					if (analytics) {
						return { ...item, downloads: analytics.downloads, views: analytics.views };
					}
					return { ...item, downloads: 0, views: 0 };
				});
			}
		} catch (error) {
			// Graceful degradation - log but don't fail the request
			ctx.$logger?.warn('Failed to fetch analytics data', { error });
		}
	}

	// Apply filters
	data = applyFilters(data, req.query);

	// Apply sorting
	data = applySorting(data, req.query);

	// Apply pagination
	const paginatedData = paginate(data, req.query);

	// Enhanced pagination metadata
	const page = parseInt(req.query.page) || 1;
	const perPage = parseInt(req.query.per_page) || 20;
	const totalPages = Math.ceil(data.length / perPage);

	return json({
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
