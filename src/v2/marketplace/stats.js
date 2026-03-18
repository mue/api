import { getManifest, getStats } from './utils.js';

export async function getGlobalStats(c) {
	const stats = await getStats();
	return c.json({ data: stats });
}

export async function getCategoryStats(c) {
	const category = c.req.param('category');
	if (!['preset_settings', 'photo_packs', 'quote_packs'].includes(category)) {
		return c.json({ error: 'Invalid category' }, 404);
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

	return c.json({ data: stats });
}

export async function getTrending(c) {
	const limit = parseInt(c.req.query('limit')) || 20;
	const category = c.req.query('category');
	const supabase = c.get('supabase');

	let query = supabase
		.from('marketplace_analytics')
		.select('item_id, category, views, downloads')
		.order('views', { ascending: false })
		.limit(limit * 3);

	if (category) {
		query = query.eq('category', category);
	}

	const { data: analyticsData, error: dbError } = await query;

	if (dbError) {
		return c.json({ error: 'Failed to fetch trending items' }, 500);
	}

	const manifest = await getManifest();
	const trendingItems = analyticsData
		.map((row) => {
			const item = manifest[row.category]?.[row.item_id];
			if (!item) return null;

			const views = row.views || 0;
			const downloads = row.downloads || 0;
			const weightedScore = views * 0.3 + downloads * 0.7;

			return { ...item, _score: weightedScore, downloads, views };
		})
		.filter(Boolean)
		.sort((a, b) => b._score - a._score)
		.slice(0, limit)
		// eslint-disable-next-line no-unused-vars
		.map(({ _score, ...item }) => item);

	return c.json({
		data: trendingItems,
		meta: { total: trendingItems.length },
	});
}

export async function getRecent(c) {
	const stats = await getStats();
	const limit = parseInt(c.req.query('limit')) || 20;
	const category = c.req.query('category');

	let recentItems = stats.recent_items;

	if (category) {
		recentItems = recentItems.filter((item) => item.type === category);
	}

	return c.json({
		data: recentItems.slice(0, limit),
		meta: { total: recentItems.length },
	});
}
