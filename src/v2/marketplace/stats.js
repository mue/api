/* eslint-disable indent */
import { error, json } from 'itty-router-extras';
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
		category,
		total_items: items.length,
		total_item_count: items.reduce((sum, item) => sum + (item.item_count || 0), 0),
		authors: [...new Set(items.map((item) => item.author))].length,
		languages: [...new Set(items.map((item) => item.language).filter(Boolean))],
		recent_items: items
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.slice(0, 10),
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
		.map((row) => {
			const item = manifest[row.category]?.[row.item_id];
			if (!item) return null;
			return { ...item, views: row.views };
		})
		.filter(Boolean);

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
