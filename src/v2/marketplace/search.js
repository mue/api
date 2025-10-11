/* eslint-disable indent */
import { error, json } from 'itty-router-extras';
import { getManifest, getSearchIndex } from './utils.js';

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
	const searchTerms = query
		.toLowerCase()
		.split(/\s+/)
		.filter((term) => term.length > 0);

	// Score each item based on search relevance
	const results = searchIndex.items
		.map((item) => {
			let score = 0;

			for (const term of searchTerms) {
				// Exact match in display name (highest weight)
				if (item.display_name.toLowerCase().includes(term)) {
					score += 10;
				}

				// Match in keywords (very high weight - curated content)
				if (item.keywords && item.keywords.some((kw) => kw.toLowerCase().includes(term))) {
					score += 8;
				}

				// Match in category_tags (high weight - predefined tags)
				if (item.category_tags && item.category_tags.some((tag) => tag.includes(term))) {
					score += 6;
				}

				// Match in author (high weight)
				if (item.author.toLowerCase().includes(term)) {
					score += 5;
				}

				// Match in search text (medium weight)
				if (item.search_text.includes(term)) {
					score += 2;
				}
			}

			return {
				...item,
				score,
			};
		})
		.filter((item) => item.score > 0)
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
			query,
		},
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

	// Fetch items in parallel
	const itemPromises = ids.map(async (id) => {
		const canonicalPath = manifest._id_index[id];
		if (!canonicalPath) {
			return {
				error: 'Not found',
				id,
			};
		}

		const [category, name] = canonicalPath.split('/');
		const itemSummary = manifest[category][name];

		if (!itemSummary) {
			return {
				error: 'Not found',
				id,
			};
		}

		try {
			const item = await (
				await fetch(`https://marketplace-data.muetab.com/${category}/${name}.json`, {
					cf: { cacheTtl: 3600 },
				})
			).json();

			// Add collections without mutation
			item.in_collections = itemSummary.in_collections.map((collectionName) => {
				const collection = manifest.collections[collectionName];
				// eslint-disable-next-line no-unused-vars
				const { items, ...collectionWithoutItems } = collection;
				return collectionWithoutItems;
			});

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
			found: items.filter((i) => i.data).length,
			errors: items.filter((i) => i.error).length,
		},
	});
}
