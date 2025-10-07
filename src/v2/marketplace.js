import { error, json } from 'itty-router-extras';
import paginate from '../pagination.js';

/**
 * @param {Request} req
 */
function getVersion(req) {
	const url = new URL(req.url);
	const path = url.pathname;
	let version = path.split('/')[1];
	if (!version.startsWith('v')) version = 1;
	else version = parseInt(version.slice(1));
	return version;
}

// Cache strategy: use stale-while-revalidate
const CACHE_CONFIG = {
	full: { cacheTtl: 3600, cacheEverything: true },
	lite: { cacheTtl: 1800, cacheEverything: true },
	search: { cacheTtl: 3600, cacheEverything: true },
	stats: { cacheTtl: 1800, cacheEverything: true }
};

async function getManifest(lite = false) {
	const url = lite
		? 'https://marketplace-data.muetab.com/manifest-lite.json'
		: 'https://marketplace-data.muetab.com/manifest.json?v=2';
	const manifest = await (
		await fetch(url, { cf: lite ? CACHE_CONFIG.lite : CACHE_CONFIG.full })
	).json();
	return manifest;
}

async function getSearchIndex() {
	const index = await (
		await fetch('https://marketplace-data.muetab.com/search-index.json', { cf: CACHE_CONFIG.search })
	).json();
	return index;
}

async function getStats() {
	const stats = await (
		await fetch('https://marketplace-data.muetab.com/stats.json', { cf: CACHE_CONFIG.stats })
	).json();
	return stats;
}

/**
 * Resolve an identifier (name or stable ID) to a canonical path and object key
 * @param {Object} manifest - The marketplace manifest
 * @param {string} identifier - Either a name or stable ID
 * @param {string} category - The category to search in (optional)
 * @returns {Object|null} - { path: string, key: string } or null if not found
 */
function resolveIdentifier(manifest, identifier, category = null) {
	// First check if it's a stable ID
	if (manifest._id_index && manifest._id_index[identifier]) {
		const canonicalPath = manifest._id_index[identifier];
		const [pathCategory, name] = canonicalPath.split('/');
		
		// If category is specified, ensure it matches
		if (category && pathCategory !== category) {
			return null;
		}
		
		return { path: canonicalPath, key: name, category: pathCategory };
	}
	
	// Otherwise treat it as a name
	if (category) {
		// For items, check if the name exists in the specified category
		if (manifest[category] && manifest[category][identifier]) {
			return { path: `${category}/${identifier}`, key: identifier, category };
		}
	} else {
		// For collections, check if the name exists
		if (manifest.collections && manifest.collections[identifier]) {
			return { path: `collections/${identifier}`, key: identifier, category: 'collections' };
		}
	}
	
	return null;
}

/**
 * @param {Request} req
 */
export async function getCollection(req) {
	const manifest = await getManifest();
	
	// Resolve the collection identifier (could be name or stable ID)
	const resolved = resolveIdentifier(manifest, req.params.collection);
	if (!resolved || resolved.category !== 'collections') {
		return error(404, 'Not Found');
	}
	
	const { key: collectionKey } = resolved;
	const collection = manifest.collections[collectionKey];
	
	if (collection === undefined) {
		return error(404, 'Not Found');
	}
	
	// Handle collections with items (news collections have items: null)
	if (collection.items) {
		const unresolved_items = collection.items;
		collection.items = unresolved_items.map((item) => {
			const [type, name] = item.split('/');
			return {
				...manifest[type][name],
				type,
			};
		});
	}

	const version = getVersion(req);
	if (version === 1) {
		collection.name = collection.display_name;
		delete collection.display_name;
	}

	return json({ data: collection });
}

export async function getCollections(req) {
	const manifest = await getManifest();
	// Clone collections to avoid mutation
	const collections = Object.values(manifest.collections).map((collection) => {
		const { items, ...collectionWithoutItems } = collection;
		return collectionWithoutItems;
	});
	return json({ data: paginate(collections, req.query) });
}

/**
 * @param {Request} req
 */
export async function getCurator(req) {
	const manifest = await getManifest();
	const curatorName = decodeURIComponent(req.params.curator);
	const curator = manifest.curators[curatorName];
	
	if (curator === undefined) {
		return error(404, 'Not Found');
	}
	
	const items = curator.map((item) => {
		const [type, name] = item.split('/');
		return {
			...manifest[type][name],
			type,
		};
	});
	
	return json({ data: { items } });
}

export async function getCurators(req) {
	const manifest = await getManifest();
	const curators = Object.keys(manifest.curators);
	return json({ data: paginate(curators, req.query) });
}

export async function getFeatured() {
	return json({
		data: await (
			await fetch('https://marketplace-data.muetab.com/featured.json', { cf: { cacheTtl: 3600 } })
		).json(),
	});
}

/**
 * @param {Request} req
 */
export async function getItem(req, env, ctx) {
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
		await fetch(
			`https://marketplace-data.muetab.com/${resolvedCategory}/${itemKey}.json`,
			{ cf: { cacheTtl: 3600 } },
		)
	).json();

	// Clone collections to avoid mutation
	item.in_collections = manifest[resolvedCategory][itemKey].in_collections.map(
		(name) => {
			const collection = manifest.collections[name];
			const { items, ...collectionWithoutItems } = collection;
			return collectionWithoutItems;
		},
	);

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
		_item_id: itemKey,
		_category: resolvedCategory,
	});

	if (rpcError) {
		ctx.$logger?.error('Failed to increment views', { error: rpcError, item_id: itemKey, category: resolvedCategory });
	}

	// Fetch updated view count
	const { data: analyticsData, error: fetchError } = await ctx.$supabase
		.from('marketplace_analytics')
		.select('views')
		.eq('item_id', itemKey)
		.eq('category', resolvedCategory)
		.single();

	if (fetchError) {
		ctx.$logger?.error('Failed to fetch views', { error: fetchError, item_id: itemKey, category: resolvedCategory });
	}

	return json(
		{
			views: analyticsData?.views || 1,
			debug: { rpcError, fetchError }, // Temporary debug info
		},
		{
			headers: { 'Cache-Control': 'no-store' },
		}
	);
}

/**
 * Apply filters to items
 */
function applyFilters(items, query) {
	let filtered = [...items];

	// Filter by tags
	if (query.tags) {
		const tags = Array.isArray(query.tags) ? query.tags : query.tags.split(',');
		filtered = filtered.filter(item =>
			item.tags && tags.some(tag => item.tags.includes(tag.toLowerCase()))
		);
	}

	// Filter by author
	if (query.author) {
		filtered = filtered.filter(item =>
			item.author.toLowerCase() === query.author.toLowerCase()
		);
	}

	// Filter by language
	if (query.language) {
		filtered = filtered.filter(item =>
			item.language && item.language.toLowerCase() === query.language.toLowerCase()
		);
	}

	// Filter by date range
	if (query.date_from) {
		const fromDate = new Date(query.date_from);
		filtered = filtered.filter(item =>
			new Date(item.created_at) >= fromDate
		);
	}

	if (query.date_to) {
		const toDate = new Date(query.date_to);
		filtered = filtered.filter(item =>
			new Date(item.created_at) <= toDate
		);
	}

	// Filter by item count range
	if (query.min_items) {
		const min = parseInt(query.min_items);
		filtered = filtered.filter(item => item.item_count >= min);
	}

	if (query.max_items) {
		const max = parseInt(query.max_items);
		filtered = filtered.filter(item => item.item_count <= max);
	}

	// Filter by color (isDark/isLight)
	if (query.color_theme === 'dark') {
		filtered = filtered.filter(item => item.isDark === true);
	} else if (query.color_theme === 'light') {
		filtered = filtered.filter(item => item.isLight === true);
	}

	return filtered;
}

/**
 * Apply sorting to items
 */
function applySorting(items, query) {
	const sortField = query.sort || 'newest';
	const sortOrder = query.order || 'desc';

	const sorted = [...items].sort((a, b) => {
		let comparison = 0;

		switch (sortField) {
			case 'newest':
				comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
				break;
			case 'oldest':
				comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
				break;
			case 'updated':
				comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
				break;
			case 'name':
				comparison = a.display_name.localeCompare(b.display_name);
				break;
			case 'item_count':
				comparison = b.item_count - a.item_count;
				break;
			case 'popular':
				// Use collection membership as popularity metric
				comparison = b.in_collections.length - a.in_collections.length;
				break;
			default:
				comparison = 0;
		}

		return sortOrder === 'asc' ? -comparison : comparison;
	});

	return sorted;
}

/**
 * @param {Request} req
 */
export async function getItems(req) {
	let data;
	const manifest = await getManifest();
	if (req.params.category === 'all') {
		data = [
			...Object.values(manifest.preset_settings).map((item) => ({
				...item,
				type: 'preset_settings'
			})),
			...Object.values(manifest.photo_packs).map((item) => ({
				...item,
				type: 'photo_packs'
			})),
			...Object.values(manifest.quote_packs).map((item) => ({
				...item,
				type: 'quote_packs'
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
				type: req.params.category
			}));
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
			total: data.length,
			page,
			per_page: perPage,
			total_pages: totalPages,
			has_more: page < totalPages
		}
	});
}

/**
 * Search endpoint - full-text search with relevance scoring
 * @param {Request} req
 */
export async function search(req) {
	const query = req.query.q || req.query.query;
	if (!query) {
		return error(400, 'Missing search query parameter (q or query)');
	}

	const searchIndex = await getSearchIndex();
	const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);

	// Score each item based on search relevance
	const results = searchIndex.items.map(item => {
		let score = 0;

		for (const term of searchTerms) {
			// Exact match in display name (highest weight)
			if (item.display_name.toLowerCase().includes(term)) {
				score += 10;
			}

			// Match in tags (high weight)
			if (item.tags.some(tag => tag.includes(term))) {
				score += 5;
			}

			// Match in author (medium weight)
			if (item.author.toLowerCase().includes(term)) {
				score += 3;
			}

			// Match in search text (low weight)
			if (item.search_text.includes(term)) {
				score += 1;
			}
		}

		return { ...item, score };
	}).filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score);

	// Apply pagination
	const page = parseInt(req.query.page) || 1;
	const perPage = parseInt(req.query.per_page) || 20;
	const totalPages = Math.ceil(results.length / perPage);
	const start = (page - 1) * perPage;
	const paginatedResults = results.slice(start, start + perPage);

	return json({
		data: paginatedResults,
		meta: {
			total: results.length,
			page,
			per_page: perPage,
			total_pages: totalPages,
			has_more: page < totalPages,
			query
		}
	});
}

/**
 * Batch operations - fetch multiple items by IDs
 * @param {Request} req
 */
export async function batchGetItems(req) {
	let ids;

	// Support both POST body and GET query params
	if (req.method === 'POST') {
		const body = await req.json();
		ids = body.ids;
	} else {
		ids = req.query.ids ? req.query.ids.split(',') : [];
	}

	if (!ids || ids.length === 0) {
		return error(400, 'Missing ids parameter');
	}

	if (ids.length > 100) {
		return error(400, 'Maximum 100 items per batch request');
	}

	const manifest = await getManifest();
	const results = [];

	// Fetch items in parallel
	const itemPromises = ids.map(async (id) => {
		const canonicalPath = manifest._id_index[id];
		if (!canonicalPath) {
			return { id, error: 'Not found' };
		}

		const [category, name] = canonicalPath.split('/');
		const itemSummary = manifest[category][name];

		if (!itemSummary) {
			return { id, error: 'Not found' };
		}

		try {
			const item = await (
				await fetch(
					`https://marketplace-data.muetab.com/${category}/${name}.json`,
					{ cf: { cacheTtl: 3600 } }
				)
			).json();

			// Add collections without mutation
			item.in_collections = itemSummary.in_collections.map(
				(collectionName) => {
					const collection = manifest.collections[collectionName];
					const { items, ...collectionWithoutItems } = collection;
					return collectionWithoutItems;
				}
			);

			return { id, data: item };
		} catch (err) {
			return { id, error: 'Failed to fetch' };
		}
	});

	const items = await Promise.all(itemPromises);

	return json({
		data: items,
		meta: {
			requested: ids.length,
			found: items.filter(i => i.data).length,
			errors: items.filter(i => i.error).length
		}
	});
}

/**
 * Get related items
 * @param {Request} req
 */
export async function getRelatedItems(req) {
	const manifest = await getManifest();

	// Resolve the item identifier
	const category = req.params.category;
	const resolved = category
		? resolveIdentifier(manifest, req.params.item, category)
		: resolveIdentifier(manifest, req.params.item);

	if (!resolved) {
		return error(404, 'Item Not Found');
	}

	const { key: itemKey, category: resolvedCategory } = resolved;
	const item = manifest[resolvedCategory][itemKey];

	if (!item) {
		return error(404, 'Item Not Found');
	}

	// Find related items based on:
	// 1. Same collections
	// 2. Same author
	// 3. Similar tags
	const relatedByCollection = new Set();
	const relatedByAuthor = new Set();
	const relatedByTags = new Set();

	// Items in same collections
	for (const collectionName of item.in_collections) {
		const collection = manifest.collections[collectionName];
		if (collection.items) {
			for (const collectionItem of collection.items) {
				const [type, name] = collectionItem.split('/');
				if (name !== itemKey) {
					relatedByCollection.add(manifest[type][name].id);
				}
			}
		}
	}

	// Items by same author
	const authorItems = Object.values(manifest.preset_settings)
		.concat(Object.values(manifest.photo_packs))
		.concat(Object.values(manifest.quote_packs))
		.filter(i => i.author === item.author && i.id !== item.id);

	for (const authorItem of authorItems) {
		relatedByAuthor.add(authorItem.id);
	}

	// Items with similar tags
	if (item.tags && item.tags.length > 0) {
		const allItems = Object.values(manifest.preset_settings)
			.concat(Object.values(manifest.photo_packs))
			.concat(Object.values(manifest.quote_packs));

		for (const otherItem of allItems) {
			if (otherItem.id !== item.id && otherItem.tags) {
				const commonTags = otherItem.tags.filter(tag => item.tags.includes(tag));
				if (commonTags.length > 0) {
					relatedByTags.add(otherItem.id);
				}
			}
		}
	}

	// Combine and score related items
	const scoredRelated = new Map();

	for (const id of relatedByCollection) {
		scoredRelated.set(id, (scoredRelated.get(id) || 0) + 10);
	}

	for (const id of relatedByAuthor) {
		scoredRelated.set(id, (scoredRelated.get(id) || 0) + 5);
	}

	for (const id of relatedByTags) {
		scoredRelated.set(id, (scoredRelated.get(id) || 0) + 3);
	}

	// Get top related items
	const sortedRelated = Array.from(scoredRelated.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10);

	// Fetch full item data for related items
	const relatedItems = sortedRelated.map(([id, score]) => {
		const canonicalPath = manifest._id_index[id];
		const [cat, name] = canonicalPath.split('/');
		return { ...manifest[cat][name], relevance_score: score };
	});

	return json({
		data: {
			item,
			related: relatedItems
		},
		meta: {
			total_related: relatedItems.length
		}
	});
}

/**
 * Get global stats
 * @param {Request} req
 */
export async function getGlobalStats(req) {
	const stats = await getStats();
	return json({ data: stats });
}

/**
 * Get category stats
 * @param {Request} req
 */
export async function getCategoryStats(req) {
	const category = req.params.category;
	if (!['preset_settings', 'photo_packs', 'quote_packs'].includes(category)) {
		return error(404, 'Invalid category');
	}

	const manifest = await getManifest();
	const items = Object.values(manifest[category]);

	const stats = {
		category,
		total_items: items.length,
		total_item_count: items.reduce((sum, item) => sum + (item.item_count || 0), 0),
		authors: [...new Set(items.map(item => item.author))].length,
		languages: [...new Set(items.map(item => item.language).filter(Boolean))],
		recent_items: items
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.slice(0, 10)
	};

	return json({ data: stats });
}

/**
 * Get trending items (based on view counts)
 * @param {Request} req
 */
export async function getTrending(req, env, ctx) {
	const limit = parseInt(req.query.limit) || 20;
	const category = req.query.category;

	// Fetch trending from analytics DB
	let query = ctx.$supabase
		.from('marketplace_analytics')
		.select('item_id, category, views')
		.order('views', { ascending: false })
		.limit(limit);

	if (category) {
		query = query.eq('category', category);
	}

	const { data: analyticsData, error: dbError } = await query;

	if (dbError) {
		ctx.$logger?.error('Failed to fetch trending', { error: dbError });
		return error(500, 'Failed to fetch trending items');
	}

	// Fetch full item data
	const manifest = await getManifest();
	const trendingItems = analyticsData
		.map(row => {
			const item = manifest[row.category]?.[row.item_id];
			if (!item) return null;
			return { ...item, views: row.views };
		})
		.filter(Boolean);

	return json({
		data: trendingItems,
		meta: {
			total: trendingItems.length
		}
	});
}

/**
 * Get recent items
 * @param {Request} req
 */
export async function getRecent(req) {
	const stats = await getStats();
	const limit = parseInt(req.query.limit) || 20;
	const category = req.query.category;

	let recentItems = stats.recent_items;

	if (category) {
		recentItems = recentItems.filter(item => item.type === category);
	}

	return json({
		data: recentItems.slice(0, limit),
		meta: {
			total: recentItems.length
		}
	});
}

/**
 * Get random item(s)
 * @param {Request} req
 */
export async function getRandom(req) {
	const manifest = await getManifest();
	const category = req.params.category || 'all';
	const count = Math.min(parseInt(req.query.count) || 1, 10);

	let items;
	if (category === 'all') {
		items = [
			...Object.values(manifest.preset_settings),
			...Object.values(manifest.photo_packs),
			...Object.values(manifest.quote_packs)
		];
	} else {
		if (!manifest[category]) {
			return error(404, 'Category not found');
		}
		items = Object.values(manifest[category]);
	}

	// Fisher-Yates shuffle and take first 'count' items
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	const randomItems = shuffled.slice(0, count);

	return json({
		data: count === 1 ? randomItems[0] : randomItems
	});
}
