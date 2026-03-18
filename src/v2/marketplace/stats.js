import { error, json } from '../../util/response.js';
import { getManifest, getStats } from './utils.js';

/**
 * Get global stats
 */
export async function getGlobalStats() {
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
		authors: [...new Set(items.map((item) => item.author))].length,
		category,
		languages: [...new Set(items.map((item) => item.language).filter(Boolean))],
		recent_items: items
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.slice(0, 10),
	};

	return json({ data: stats });
}

/**
 * Get trending items (based on weighted score of views and downloads)
 * @param {Request} req
 */
export async function getTrending(req, env, ctx) {
	const limit = parseInt(req.query.limit) || 20;
	const category = req.query.category;

	// Fetch trending from analytics DB
	let query = ctx.$supabase
		.from('marketplace_analytics')
		.select('item_id, category, views, downloads')
		.order('views', { ascending: false })
		.limit(limit * 3); // Fetch more items to ensure we have enough after weighting

	if (category) {
		query = query.eq('category', category);
	}

	const { data: analyticsData, error: dbError } = await query;

	if (dbError) {
		ctx.$logger?.error('Failed to fetch trending', { error: dbError });
		return error(500, 'Failed to fetch trending items');
	}

	// Fetch full item data and calculate weighted scores
	const manifest = await getManifest();
	const trendingItems = analyticsData
		.map((row) => {
			const item = manifest[row.category]?.[row.item_id];
			if (!item) return null;

			// Calculate weighted score: views * 0.3 + downloads * 0.7
			const views = row.views || 0;
			const downloads = row.downloads || 0;
			const weightedScore = views * 0.3 + downloads * 0.7;

			return {
				...item,
				_score: weightedScore,
				downloads,
				views,
			};
		})
		.filter(Boolean)
		.sort((a, b) => b._score - a._score) // Sort by weighted score
		.slice(0, limit) // Take only the requested limit
		// eslint-disable-next-line no-unused-vars
		.map(({ _score, ...item }) => item); // Remove internal _score field

	return json({
		data: trendingItems,
		meta: {
			total: trendingItems.length,
		},
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
		recentItems = recentItems.filter((item) => item.type === category);
	}

	return json({
		data: recentItems.slice(0, limit),
		meta: {
			total: recentItems.length,
		},
	});
}
